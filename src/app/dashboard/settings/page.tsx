import type { Metadata } from "next";
import { BookOpen, Users, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/get-current-user";
import { decrypt, maskApiKey } from "@/lib/crypto";
import { Card, UpgradePrompt } from "@/components/ui";
import { cn } from "@/lib/utils";
import { AcademyInfoForm } from "./AcademyInfoForm";
import { GeminiKeyForm } from "./GeminiKeyForm";
import { SubAdminsCard, type SubAdminRow, type PendingInviteRow } from "./sub-admins/SubAdminsCard";
import { PERMISSION_KEYS, type SubAdminPermission } from "@/lib/permissions";

export const metadata: Metadata = { title: "Settings" };

const PLAN_BADGE_STYLES: Record<string, string> = {
  free: "bg-surface-raised text-fg-secondary",
  pro: "bg-primary-subtle text-primary-hover border border-primary/30",
  institution: "bg-secondary-faint text-secondary border border-secondary/30",
};

function UsageBar({
  icon: Icon,
  label,
  used,
  limit,
}: {
  icon: typeof BookOpen;
  label: string;
  used: number;
  limit: number; // -1 = unlimited
}) {
  const unlimited = limit === -1;
  const pct = unlimited ? 0 : Math.min(100, Math.round((used / Math.max(limit, 1)) * 100));
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-2 text-fg">
          <Icon className="size-4 text-fg-secondary" aria-hidden="true" />
          {label}
        </span>
        <span className="text-fg-secondary">{unlimited ? `${used} used` : `${used} / ${limit}`}</span>
      </div>
      {!unlimited && (
        <div className="mt-1.5 h-1.5 w-full rounded-full bg-surface-raised">
          <div
            className={cn("h-1.5 rounded-full", pct >= 100 ? "bg-danger" : "bg-primary")}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}

export default async function SettingsPage() {
  const currentUser = await getCurrentUser();
  const supabase = await createClient();
  const orgId = currentUser!.profile.organization_id;

  const [{ data: org }, { data: settings }, { count: courseCount }, { count: studentCount }] =
    await Promise.all([
      supabase.from("organizations").select("name, logo_url, plan, owner_id").eq("id", orgId).single(),
      supabase
        .from("organization_settings")
        .select("gemini_api_key, branding")
        .eq("organization_id", orgId)
        .single(),
      supabase.from("courses").select("id", { count: "exact", head: true }),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "student"),
    ]);

  const { data: limits } = await supabase
    .from("plan_limits")
    .select("*")
    .eq("plan", org?.plan ?? "free")
    .single();

  const isOwner = currentUser!.profile.role === "admin" && org?.owner_id === currentUser!.id;
  const maxSubAdmins = limits?.max_sub_admins ?? 0;

  const [{ data: subAdminProfiles }, { data: permissionRows }, { data: inviteRows }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, email, is_active").eq("organization_id", orgId).eq("role", "sub_admin"),
    supabase.from("sub_admin_permissions").select("*").eq("organization_id", orgId),
    supabase
      .from("sub_admin_invites")
      .select("id, email, expires_at")
      .eq("organization_id", orgId)
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString()),
  ]);

  const permissionsByUser = new Map((permissionRows ?? []).map((row) => [row.user_id, row]));
  const subAdmins: SubAdminRow[] = (subAdminProfiles ?? []).map((profile) => {
    const row = permissionsByUser.get(profile.id);
    const permissions = Object.fromEntries(
      PERMISSION_KEYS.map((key) => [key, Boolean(row?.[key])])
    ) as Record<SubAdminPermission, boolean>;
    return {
      id: profile.id,
      fullName: profile.full_name,
      email: profile.email,
      isActive: profile.is_active ?? true,
      permissions,
    };
  });
  const invites: PendingInviteRow[] = (inviteRows ?? []).map((row) => ({
    id: row.id,
    email: row.email,
    expiresAt: row.expires_at,
  }));

  const maskedKey = settings?.gemini_api_key ? maskApiKey(decrypt(settings.gemini_api_key)) : null;
  const branding = (settings?.branding ?? {}) as { accentColor?: string | null };

  // AI usage isn't tracked yet — ai_usage_log only gets rows once
  // generation (Phase H) exists. Shown as 0 used until then, not hidden,
  // so the bar's shape is already right when generation ships.
  const aiUsedToday = 0;

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6 sm:p-8">
      <div>
        <h1 className="text-3xl font-bold text-fg">Settings</h1>
        <p className="mt-1 text-sm text-fg-secondary">
          Your academy, your AI key, and your plan.
        </p>
      </div>

      <AcademyInfoForm
        name={org?.name ?? ""}
        logoUrl={org?.logo_url ?? null}
        accentColor={branding.accentColor ?? null}
        hasCustomBranding={limits?.has_custom_branding ?? false}
      />

      <GeminiKeyForm maskedKey={maskedKey} aiIncluded={(org?.plan ?? "free") !== "free"} />

      <Card className="p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-fg">Plan</h2>
          <span
            className={cn(
              "rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide",
              PLAN_BADGE_STYLES[org?.plan ?? "free"]
            )}
          >
            {org?.plan ?? "free"}
          </span>
        </div>

        {limits && (
          <div className="mt-4 space-y-4">
            <UsageBar icon={BookOpen} label="Courses" used={courseCount ?? 0} limit={limits.max_courses} />
            {/* This counts students across the whole academy, so it can't be
                compared against a PER-COURSE limit — it used to be, which made
                the bar read as "18 / 25" against a number it had nothing to do
                with. Shown as a plain total, with the real per-course cap
                stated alongside it. */}
            <UsageBar
              icon={Users}
              label={`Students (all courses) — limit is ${
                limits.max_students_per_course === -1
                  ? "unlimited"
                  : `${limits.max_students_per_course} per course`
              }`}
              used={studentCount ?? 0}
              limit={-1}
            />
            <UsageBar
              icon={Sparkles}
              label="AI questions today"
              used={aiUsedToday}
              limit={limits.max_ai_questions_per_day}
            />
          </div>
        )}

        {(org?.plan ?? "free") === "free" && (
          <div className="mt-4">
            <UpgradePrompt
              message="You're on the Free plan."
              benefits="Unlimited courses, 100 students per course, 3× question pools, and the full anti-cheating suite."
            />
          </div>
        )}
      </Card>

      <SubAdminsCard
        isOwner={isOwner}
        hasSubAdminPlan={maxSubAdmins > 0}
        maxSubAdmins={maxSubAdmins}
        subAdmins={subAdmins}
        invites={invites}
      />
    </div>
  );
}
