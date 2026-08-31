import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { requirePermission } from "@/lib/permissions";
import { decrypt } from "@/lib/crypto";
import { GEMINI_MODEL } from "@/lib/gemini";
import { buildPrompt, parseGeneratedQuestions, type Difficulty } from "./prompt";

// 100 questions in one Gemini call can take close to a minute — give this
// route the maximum duration Vercel's free tier allows.
export const maxDuration = 60;

interface RequestBody {
  contentId?: string;
  poolId?: string;
  questionCount?: number;
  difficulty?: Difficulty;
}

export async function POST(request: Request) {
  let supabase: Awaited<ReturnType<typeof requirePermission>>["supabase"];
  let organizationId: string;
  try {
    const ctx = await requirePermission("create_quiz");
    supabase = ctx.supabase;
    organizationId = ctx.orgId;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Admin access required.";
    return NextResponse.json({ error: message }, { status: message.includes("logged in") ? 401 : 403 });
  }

  let body: RequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { contentId, poolId, questionCount, difficulty } = body;

  if (!contentId || !poolId || !questionCount || !difficulty) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }
  if (!["easy", "medium", "hard"].includes(difficulty)) {
    return NextResponse.json({ error: "Invalid difficulty." }, { status: 400 });
  }
  if (questionCount < 1 || questionCount > 100) {
    return NextResponse.json(
      { error: "Question count must be between 1 and 100." },
      { status: 400 }
    );
  }

  // The pool ties this generation call back to its quiz + course, needed
  // for the daily limit check (per-course, per docs/FEATURES.md §4) and to
  // log usage against the right course.
  const { data: pool } = await supabase
    .from("quiz_pools")
    .select("quiz_id, quizzes(course_id)")
    .eq("id", poolId)
    .maybeSingle();
  if (!pool) {
    return NextResponse.json({ error: "Quiz pool not found." }, { status: 404 });
  }
  const courseId = (pool.quizzes as unknown as { course_id: string } | null)?.course_id;
  if (!courseId) {
    return NextResponse.json({ error: "Quiz pool not found." }, { status: 404 });
  }

  const { data: content } = await supabase
    .from("content_uploads")
    .select("raw_text")
    .eq("id", contentId)
    .maybeSingle();

  const contentText = content?.raw_text?.trim() ?? "";
  if (contentText.length < 50) {
    return NextResponse.json(
      {
        error:
          "This content is too short to generate good questions from. Add more material first.",
      },
      { status: 400 }
    );
  }

  // AI is included on paid plans (the subscription pays for it) and BYOK on
  // Free (so a non-paying academy still costs the platform nothing). An
  // academy that sets its own key always uses it, on any plan — some
  // institutions prefer their content to go through their own Google account.
  const { data: org } = await supabase.from("organizations").select("plan").eq("id", organizationId).single();
  const { data: settings } = await supabase
    .from("organization_settings")
    .select("gemini_api_key")
    .eq("organization_id", organizationId)
    .single();

  const plan = org?.plan ?? "free";
  const platformKey = process.env.PLATFORM_GEMINI_API_KEY?.trim();
  const aiIncluded = plan !== "free";

  if (!settings?.gemini_api_key && !(aiIncluded && platformKey)) {
    return NextResponse.json(
      {
        error: aiIncluded
          ? "AI is included on your plan, but it isn't configured yet. Contact support."
          : "Add your Gemini API key in Settings before generating questions.",
      },
      { status: 400 }
    );
  }

  const { data: limits } = await supabase
    .from("plan_limits")
    .select("max_ai_questions_per_day")
    .eq("plan", org?.plan ?? "free")
    .single();
  const dailyLimit = limits?.max_ai_questions_per_day ?? 15;

  if (dailyLimit !== -1) {
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);
    const { data: usageRows } = await supabase
      .from("ai_usage_log")
      .select("questions_generated")
      .eq("course_id", courseId)
      .gte("created_at", startOfDay.toISOString());
    const usedToday = (usageRows ?? []).reduce((sum, row) => sum + row.questions_generated, 0);

    if (usedToday + questionCount > dailyLimit) {
      const remaining = Math.max(0, dailyLimit - usedToday);
      return NextResponse.json(
        {
          error: `Daily AI limit reached for this course (${dailyLimit}/day on the ${org?.plan ?? "free"} plan). ${remaining} question(s) remaining today.`,
        },
        { status: 429 }
      );
    }
  }

  let apiKey: string;
  if (settings?.gemini_api_key) {
    try {
      apiKey = decrypt(settings.gemini_api_key);
    } catch {
      // A paid academy shouldn't be dead in the water because its own saved
      // key became unreadable (e.g. ENCRYPTION_KEY rotated) — fall back to the
      // included platform key and let them re-enter theirs at their leisure.
      if (aiIncluded && platformKey) {
        apiKey = platformKey;
      } else {
        return NextResponse.json(
          { error: "Your saved Gemini key could not be read. Please re-enter it in Settings." },
          { status: 500 }
        );
      }
    }
  } else {
    apiKey = platformKey as string;
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    generationConfig: { responseMimeType: "application/json" },
  });

  const prompt = buildPrompt(contentText, difficulty, questionCount);

  let generated: ReturnType<typeof parseGeneratedQuestions> | undefined;
  let lastError: unknown;

  // Try once, retry once more if it fails (bad JSON, network, etc.) or if
  // Gemini returned fewer questions than asked for. Keep whichever attempt
  // produced the most questions.
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const result = await model.generateContent(prompt);
      const parsed = parseGeneratedQuestions(result.response.text());
      if (!generated || parsed.length > generated.length) generated = parsed;
      if (parsed.length >= questionCount) break;
    } catch (error) {
      lastError = error;
    }
  }

  if (!generated) {
    return NextResponse.json({ error: describeGeminiError(lastError) }, { status: 502 });
  }

  const rows = generated.slice(0, questionCount);
  const letters = ["a", "b", "c", "d"] as const;

  const { data: insertedQuestions, error: insertError } = await supabase
    .from("pool_questions")
    .insert(
      rows.map((question) => {
        const correctIndex = question.options.findIndex((option) => option.is_correct);
        return {
          organization_id: organizationId,
          pool_id: poolId,
          difficulty,
          question_text: `${question.scenario_text}\n\n${question.question_text}`,
          option_a: question.options[0]?.option_text ?? "",
          option_b: question.options[1]?.option_text ?? "",
          option_c: question.options[2]?.option_text ?? "",
          option_d: question.options[3]?.option_text ?? "",
          correct_option: letters[correctIndex] ?? "a",
          explanation: question.explanation,
          is_approved: false,
          generated_by_ai: true,
        };
      })
    )
    .select("id");

  if (insertError || !insertedQuestions) {
    return NextResponse.json(
      { error: "Questions were generated but could not be saved. Please try again." },
      { status: 500 }
    );
  }

  await supabase.from("ai_usage_log").insert({
    organization_id: organizationId,
    course_id: courseId,
    quiz_id: pool.quiz_id,
    questions_generated: insertedQuestions.length,
  });

  return NextResponse.json({ count: insertedQuestions.length, requested: questionCount });
}

function describeGeminiError(error: unknown): string {
  if (error && typeof error === "object" && "status" in error) {
    const status = (error as { status?: number }).status;
    if (status === 429) {
      return "The daily AI quota has been used up. Try again tomorrow.";
    }
    if (status === 400 || status === 401 || status === 403) {
      return "The AI service rejected the request. Check that your Gemini API key is set correctly in Settings.";
    }
  }
  if (error instanceof SyntaxError) {
    return "The AI returned an unexpected response after two tries. Try again with fewer questions.";
  }
  if (error instanceof Error && /timeout|aborted|network/i.test(error.message)) {
    return "The AI service took too long to respond. Please try again.";
  }
  return "The AI service did not respond correctly. Please try again.";
}
