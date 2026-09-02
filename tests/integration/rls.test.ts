import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import {
  TEST_PASSWORD,
  createTestAcademy,
  createTestStudent,
  destroyAllTestAcademies,
  hasSupabase,
  serviceClient,
  signIn,
  type TestOrg,
  type TestUser,
} from "../support/fixtures";

// "Academy A must never see academy B's anything" is the single most
// important rule in this project (CLAUDE.md), and it is enforced only by
// database policies — nothing in the application code would stop a leak.
// These tests sign in as real users and ask the database directly, which is
// exactly what a determined customer could do with their own browser token.
//
// The second half covers the same-org-lesser-role case: a student or
// sub-admin inside the RIGHT organization asking for things above their
// level. That is the hole this project has already been bitten by twice,
// because org-scoped policies look correct until you notice they never
// checked the role.

const describeIf = hasSupabase ? describe : describe.skip;

describeIf("Row Level Security", () => {
  let service: SupabaseClient<Database>;
  let orgA: TestOrg;
  let orgB: TestOrg;
  let studentA: TestUser;
  let adminAClient: SupabaseClient<Database>;
  let adminBClient: SupabaseClient<Database>;
  let studentAClient: SupabaseClient<Database>;

  beforeAll(async () => {
    service = serviceClient();
    orgA = await createTestAcademy(service);
    orgB = await createTestAcademy(service);
    studentA = await createTestStudent(service, orgA.inviteCode);

    [adminAClient, adminBClient, studentAClient] = await Promise.all([
      signIn(orgA.admin.email, TEST_PASSWORD),
      signIn(orgB.admin.email, TEST_PASSWORD),
      signIn(studentA.email, TEST_PASSWORD),
    ]);
  });

  afterAll(async () => {
    if (service) await destroyAllTestAcademies(service);
  });

  describe("across academies", () => {
    it("the second academy sees only its own courses", async () => {
      const { data } = await adminBClient.from("courses").select("id, organization_id");
      expect(data).not.toBeNull();
      expect(data!.some((row) => row.id === orgA.courseId)).toBe(false);
      expect(data!.every((row) => row.organization_id === orgB.orgId)).toBe(true);
    });

    it("another academy cannot read a course even by its exact id", async () => {
      const { data } = await adminBClient.from("courses").select("id").eq("id", orgA.courseId);
      expect(data).toEqual([]);
    });

    it("another academy cannot read the organization row", async () => {
      const { data } = await adminBClient.from("organizations").select("id").eq("id", orgA.orgId);
      expect(data).toEqual([]);
    });

    it("another academy cannot read the saved API key", async () => {
      // organization_settings holds the encrypted Gemini key. Even encrypted,
      // it must never be readable by a different academy.
      const { data } = await adminBClient
        .from("organization_settings")
        .select("organization_id, gemini_api_key")
        .eq("organization_id", orgA.orgId);
      expect(data).toEqual([]);
    });

    it("another academy cannot see the students", async () => {
      const { data } = await adminBClient.from("profiles").select("id").eq("id", studentA.id);
      expect(data).toEqual([]);
    });

    it("another academy cannot rename a course", async () => {
      const { data } = await adminBClient
        .from("courses")
        .update({ name: "hijacked" })
        .eq("id", orgA.courseId)
        .select("id");
      expect(data ?? []).toEqual([]);

      const { data: after } = await service
        .from("courses")
        .select("name")
        .eq("id", orgA.courseId)
        .single();
      expect(after!.name).not.toBe("hijacked");
    });

    it("another academy cannot delete a course", async () => {
      const { data } = await adminBClient.from("courses").delete().eq("id", orgA.courseId).select("id");
      expect(data ?? []).toEqual([]);

      const { count } = await service
        .from("courses")
        .select("id", { count: "exact", head: true })
        .eq("id", orgA.courseId);
      expect(count).toBe(1);
    });

    it("another academy cannot plant a row inside this one", async () => {
      const { error } = await adminBClient
        .from("courses")
        .insert({
          organization_id: orgA.orgId,
          name: "planted",
          created_by: orgB.admin.id,
          invite_code: "ZZTEST-PLANT",
        });
      expect(error).not.toBeNull();
    });

    it("enrollments never cross academies", async () => {
      const { data } = await adminAClient.from("enrollments").select("id, organization_id");
      expect((data ?? []).every((row) => row.organization_id === orgA.orgId)).toBe(true);
    });
  });

  describe("inside the same academy, at a lower role", () => {
    it("a student cannot read the question bank", async () => {
      // pool_questions carries is_correct. A student reading this table
      // directly would see every answer before answering.
      const { data } = await studentAClient.from("pool_questions").select("id");
      expect(data ?? []).toEqual([]);
    });

    it("a student cannot read the academy's saved API key", async () => {
      const { data } = await studentAClient
        .from("organization_settings")
        .select("gemini_api_key")
        .eq("organization_id", orgA.orgId);
      expect(data ?? []).toEqual([]);
    });

    it("a student cannot list the other students", async () => {
      const { data } = await studentAClient.from("profiles").select("id");
      expect(data).not.toBeNull();
      // Their own row and nothing else.
      expect(data!.map((row) => row.id)).toEqual([studentA.id]);
    });

    it("a student cannot promote themselves to admin", async () => {
      // The UPDATE policy lets a student edit their OWN profile row, so the
      // role column is guarded by a trigger instead — row-level security is
      // not column-level security.
      const { error } = await studentAClient
        .from("profiles")
        .update({ role: "admin" })
        .eq("id", studentA.id);
      expect(error).not.toBeNull();

      const { data: after } = await service
        .from("profiles")
        .select("role")
        .eq("id", studentA.id)
        .single();
      expect(after!.role).toBe("student");
    });

    it("a student cannot move themselves into another academy", async () => {
      const { error } = await studentAClient
        .from("profiles")
        .update({ organization_id: orgB.orgId })
        .eq("id", studentA.id);
      expect(error).not.toBeNull();
    });

    it("a student cannot approve their own enrollment", async () => {
      const { data: enrollment } = await service
        .from("enrollments")
        .select("id, status")
        .eq("student_id", studentA.id)
        .single();
      expect(enrollment!.status).toBe("pending");

      const { data } = await studentAClient
        .from("enrollments")
        .update({ status: "approved" })
        .eq("id", enrollment!.id)
        .select("id");
      expect(data ?? []).toEqual([]);

      const { data: after } = await service
        .from("enrollments")
        .select("status")
        .eq("id", enrollment!.id)
        .single();
      expect(after!.status).toBe("pending");
    });

    it("a student cannot write a quiz attempt, so a score cannot be forged", async () => {
      // quiz_attempts deliberately has SELECT policies only — every write
      // goes through the server-side quiz engine.
      const { error } = await studentAClient.from("quiz_attempts").insert({
        organization_id: orgA.orgId,
        quiz_id: crypto.randomUUID(),
        student_id: studentA.id,
        attempt_number: 1,
        total_questions: 10,
        score: 100,
      });
      expect(error).not.toBeNull();
    });

    it("an academy owner cannot upgrade their own plan for free", async () => {
      // The UPDATE policy lets an owner edit their organization row (name,
      // logo), so plan, suspension and ownership are guarded by a trigger.
      const { error } = await adminAClient
        .from("organizations")
        .update({ plan: "institution" })
        .eq("id", orgA.orgId);
      expect(error).not.toBeNull();

      const { data: after } = await service
        .from("organizations")
        .select("plan")
        .eq("id", orgA.orgId)
        .single();
      expect(after!.plan).toBe("free");
    });

    it("an academy owner cannot lift their own suspension", async () => {
      await service.from("organizations").update({ is_suspended: true }).eq("id", orgA.orgId);

      const { error } = await adminAClient
        .from("organizations")
        .update({ is_suspended: false })
        .eq("id", orgA.orgId);
      expect(error).not.toBeNull();

      const { data: after } = await service
        .from("organizations")
        .select("is_suspended")
        .eq("id", orgA.orgId)
        .single();
      expect(after!.is_suspended).toBe(true);

      await service.from("organizations").update({ is_suspended: false }).eq("id", orgA.orgId);
    });

    it("an academy owner can still edit the things they do own", async () => {
      // The guards above must not have made the row read-only by accident.
      const { error } = await adminAClient
        .from("organizations")
        .update({ name: "zztest Renamed" })
        .eq("id", orgA.orgId);
      expect(error).toBeNull();

      const { data: after } = await service
        .from("organizations")
        .select("name")
        .eq("id", orgA.orgId)
        .single();
      expect(after!.name).toBe("zztest Renamed");
    });
  });
});
