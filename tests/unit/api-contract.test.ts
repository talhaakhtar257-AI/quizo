import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// CLAUDE.md rule 5: "is_correct never reaches the browser before submission.
// Strip it server-side from every question response."
//
// This is checked by reading the route source rather than by calling the
// running server, because the leak this guards against is a one-word edit —
// someone widening a `select(...)` to `select("*")` — and that edit would
// pass every behavioural test while quietly handing students the answer key.
// Reading the source catches it the moment it is written.

const STUDENT_API_DIR = path.join(process.cwd(), "src/app/api/student");
const ANSWER_COLUMNS = ["correct_option", "is_correct"];

function routeFiles(dir: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) found.push(...routeFiles(full));
    else if (entry === "route.ts") found.push(full);
  }
  return found;
}

// Pulls out everything inside each NextResponse.json( ... ) call, by
// matching brackets rather than guessing at line endings.
function responseBodies(source: string): string[] {
  const bodies: string[] = [];
  const marker = "NextResponse.json(";
  let from = 0;
  for (;;) {
    const start = source.indexOf(marker, from);
    if (start === -1) break;
    let depth = 0;
    let index = start + marker.length - 1;
    for (; index < source.length; index++) {
      if (source[index] === "(") depth += 1;
      else if (source[index] === ")") {
        depth -= 1;
        if (depth === 0) break;
      }
    }
    bodies.push(source.slice(start + marker.length, index));
    from = index + 1;
  }
  return bodies;
}

const files = routeFiles(STUDENT_API_DIR);

describe("student API responses never carry the answer key", () => {
  it("finds the student quiz routes to check", () => {
    // Guards the test itself: if the routes move, this fails loudly rather
    // than passing because it checked nothing.
    expect(files.length).toBeGreaterThanOrEqual(4);
  });

  it.each(files.map((file) => path.relative(process.cwd(), file)))("%s", (relative) => {
    const source = readFileSync(path.join(process.cwd(), relative), "utf8");
    for (const body of responseBodies(source)) {
      for (const column of ANSWER_COLUMNS) {
        expect(body, `${relative} returns ${column} to the browser`).not.toContain(column);
      }
    }
  });

  it("never selects every column from the question table", () => {
    // select("*") on pool_questions would include correct_option even if the
    // response only spreads part of the row later.
    for (const file of files) {
      const source = readFileSync(file, "utf8");
      expect(source).not.toMatch(/from\("pool_questions"\)[\s\S]{0,80}?\.select\(\s*["'`]\*/);
    }
  });
});
