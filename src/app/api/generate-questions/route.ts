import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@/lib/supabase/server";
import { buildPrompt, parseGeneratedQuestions, type Difficulty } from "./prompt";

// 100 questions in one Gemini call can take close to a minute — give this
// route the maximum duration Vercel's free tier allows.
export const maxDuration = 60;

interface RequestBody {
  contentId?: string;
  quizId?: string;
  questionCount?: number;
  difficulty?: Difficulty;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "You must be logged in." }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, status")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.role !== "admin" || profile.status !== "active") {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  let body: RequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { contentId, quizId, questionCount, difficulty } = body;

  if (!contentId || !quizId || !questionCount || !difficulty) {
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

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "The AI service isn't configured yet. Contact your developer." },
      { status: 500 }
    );
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    // gemini-2.0-flash was retired by Google (404 "no longer available");
    // this is their own suggested replacement, confirmed working.
    model: "gemini-3.6-flash",
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

  const { data: insertedQuestions, error: insertError } = await supabase
    .from("questions")
    .insert(
      rows.map((question) => ({
        quiz_id: quizId,
        difficulty,
        question_type: "scenario" as const,
        scenario_text: question.scenario_text,
        question_text: question.question_text,
        explanation: question.explanation,
        is_approved: false,
        generated_by_ai: true,
      }))
    )
    .select("id");

  if (insertError || !insertedQuestions) {
    return NextResponse.json(
      { error: "Questions were generated but could not be saved. Please try again." },
      { status: 500 }
    );
  }

  const optionRows = insertedQuestions.flatMap((question, index) =>
    rows[index].options.map((option, optionIndex) => ({
      question_id: question.id,
      option_text: option.option_text,
      is_correct: option.is_correct,
      option_order: optionIndex + 1,
    }))
  );

  const { error: optionsError } = await supabase.from("options").insert(optionRows);
  if (optionsError) {
    return NextResponse.json(
      {
        error:
          "Questions were saved but their answer options could not be saved. Please try again.",
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ count: insertedQuestions.length, requested: questionCount });
}

function describeGeminiError(error: unknown): string {
  if (error && typeof error === "object" && "status" in error) {
    const status = (error as { status?: number }).status;
    if (status === 429) {
      return "The daily AI quota has been used up. Try again tomorrow.";
    }
    if (status === 400 || status === 401 || status === 403) {
      return "The AI service rejected the request. Check that the Gemini API key is set correctly.";
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
