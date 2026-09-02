"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button, Card, Input } from "@/components/ui";

// useSearchParams() opts the page out of static prerendering unless
// wrapped in Suspense — Next.js fails the production build otherwise.
export default function LoginPage() {
  return (
    <Suspense fallback={<Card className="p-6" />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(
    searchParams.get("suspended")
      ? "This academy's account is suspended. Contact support."
      : searchParams.get("deactivated")
        ? "Your account has been deactivated. Contact your academy admin."
        : null
  );
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError || !data.user) {
      setLoading(false);
      setError("Incorrect email or password.");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, is_active, organizations!profiles_organization_id_fkey(is_suspended)")
      .eq("id", data.user.id)
      .maybeSingle();

    // No profile row at all is NOT the same as deactivated — it means this
    // login has no academy membership (e.g. a platform-owner-only account,
    // gated separately by an env allowlist and never needing a profile).
    // Only a real profile with is_active = false is an actual deactivation.
    if (!profile) {
      router.push("/");
      router.refresh();
      return;
    }

    if (!profile.is_active) {
      await supabase.auth.signOut();
      setLoading(false);
      setError("This account has been deactivated. Contact your academy admin.");
      return;
    }

    const org = profile.organizations as unknown as { is_suspended: boolean } | null;
    if (org?.is_suspended) {
      await supabase.auth.signOut();
      setLoading(false);
      setError("This academy's account is suspended. Contact support.");
      return;
    }

    const isAdminOrSubAdmin = profile.role === "admin" || profile.role === "sub_admin";
    router.push(isAdminOrSubAdmin ? "/dashboard" : "/student");
    router.refresh();
  }

  return (
    <Card className="p-6">
      <h1 className="text-2xl font-semibold text-fg">Log in</h1>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <Input
          label="Email"
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <Input
          label="Password"
          type="password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex justify-end">
          <Link
            href="/forgot-password"
            className="text-sm font-medium text-secondary hover:underline"
          >
            Forgot password?
          </Link>
        </div>

        <Button type="submit" className="w-full" loading={loading}>
          Log in
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-fg-secondary">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="font-medium text-secondary hover:underline">
          Create your academy
        </Link>{" "}
        or{" "}
        <Link href="/signup/student" className="font-medium text-secondary hover:underline">
          join with an invite code
        </Link>
      </p>
    </Card>
  );
}
