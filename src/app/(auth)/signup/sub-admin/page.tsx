"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { isPasswordValid } from "@/lib/password";
import { PasswordStrengthMeter } from "@/components/auth/PasswordStrengthMeter";
import { Button, Card, Input } from "@/components/ui";

// useSearchParams() opts the page out of static prerendering unless
// wrapped in Suspense — Next.js fails the production build otherwise.
export default function SubAdminSignupPage() {
  return (
    <Suspense fallback={<Card className="p-6" />}>
      <SubAdminSignupForm />
    </Suspense>
  );
}

function SubAdminSignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(
    token ? null : "This invite link is missing its token. Ask your academy owner to resend it."
  );
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!token) {
      setError("This invite link is missing its token. Ask your academy owner to resend it.");
      return;
    }
    if (!isPasswordValid(password)) {
      setError(
        "Password must be at least 8 characters and include a letter and a number."
      );
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, sub_admin_token: token },
      },
    });
    setLoading(false);

    if (signUpError) {
      // The trigger's error message is already plain English and safe to
      // show as-is (see handle_new_user_signup) — strip only its code prefix.
      const message = signUpError.message.includes(":")
        ? signUpError.message.split(":").slice(1).join(":").trim()
        : null;
      setError(message || "Could not create your account. Please try again.");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <Card className="p-6">
      <h1 className="text-2xl font-semibold text-fg">Accept your invite</h1>
      <p className="mt-1 text-sm text-fg-secondary">
        Create your account to help run this academy. The owner turns on your permissions
        afterward.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <Input
          label="Full name"
          required
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
        />
        <Input
          label="Email"
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <div>
          <Input
            label="Password"
            type="password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <div className="mt-2">
            <PasswordStrengthMeter password={password} />
          </div>
        </div>
        <Input
          label="Confirm password"
          type="password"
          required
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
        />

        {error && <p className="text-sm text-danger">{error}</p>}

        <Button type="submit" className="w-full" loading={loading} disabled={!token}>
          Create account
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-fg-secondary">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Log in
        </Link>
      </p>
    </Card>
  );
}
