import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPermissionFlags } from "@/lib/permissions";

// CSV export is sold on the Pro and Institution cards and has a
// `plan_limits.has_csv_export` flag, but the feature itself was deleted in
// Phase L and never rebuilt — the pricing page has been advertising something
// that didn't exist. This is the smallest honest version: the same
// per-student performance data the Reports page already shows, streamed as a
// real .csv file, gated on the plan flag that was already there.

function csvCell(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  // Quote anything that could break a row, and double up embedded quotes.
  // A leading =, +, - or @ is prefixed with ' so spreadsheet software treats
  // it as text rather than a formula (CSV injection).
  const escaped = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return /[",\n\r]/.test(escaped) ? `"${escaped.replace(/"/g, '""')}"` : escaped;
}

function toISODate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export async function GET(request: Request) {
  const flags = await getPermissionFlags();
  if (!flags.view_analytics) {
    return NextResponse.json({ error: "You do not have permission to view analytics." }, { status: 403 });
  }

  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .maybeSingle();
  if (!profile) {
    return NextResponse.json({ error: "You must be logged in." }, { status: 401 });
  }

  const { data: org } = await supabase
    .from("organizations")
    .select("plan")
    .eq("id", profile.organization_id)
    .single();
  const { data: limits } = await supabase
    .from("plan_limits")
    .select("has_csv_export")
    .eq("plan", org?.plan ?? "free")
    .single();

  if (!limits?.has_csv_export) {
    return NextResponse.json(
      { error: "CSV export is a Pro and Institution feature." },
      { status: 403 }
    );
  }

  const url = new URL(request.url);
  const today = new Date();
  const from = url.searchParams.get("from") || toISODate(new Date(today.getTime() - 29 * 86400000));
  const to = url.searchParams.get("to") || toISODate(today);
  const course = url.searchParams.get("course");
  const quiz = url.searchParams.get("quiz");

  // Reuses the same RLS-scoped SQL function the Reports page renders from, so
  // the download can never contain a row the viewer couldn't already see.
  const { data: rows, error } = await supabase.rpc("dashboard_student_performance", {
    p_from: from,
    p_to: to,
    p_course_id: course && course !== "all" ? course : undefined,
    p_quiz_id: quiz && quiz !== "all" ? quiz : undefined,
  });

  if (error) {
    return NextResponse.json({ error: "Could not build the export." }, { status: 500 });
  }

  const header = ["Student", "Email", "Attempts", "Average score (%)", "Latest attempt passed"];
  const body = (rows ?? []).map((row) =>
    [
      row.full_name,
      row.email,
      row.attempt_count,
      row.avg_percentage,
      row.latest_passed ? "Yes" : "No",
    ]
      .map(csvCell)
      .join(",")
  );

  // ﻿ so Excel opens UTF-8 names correctly instead of mojibake.
  const csv = `﻿${[header.map(csvCell).join(","), ...body].join("\r\n")}\r\n`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="quizo-students-${from}-to-${to}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
