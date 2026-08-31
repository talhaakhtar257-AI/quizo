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
export default function StudentSignupPage() {
  return (
    <Suspense fallback={<Card className="p-6" />}>
      <StudentSignupForm />
    </Suspense>
  );
}

function StudentSignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [inviteCode, setInviteCode] = useState(searchParams.get("code") ?? "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

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
    if (inviteCode.trim().length === 0) {
      setError("Enter the invite code your instructor gave you.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, invite_code: inviteCode.trim().toUpperCase() },
      },
    });
    setLoading(false);

    if (signUpError) {
      // The trigger deliberately gives the same message whether the code is
      // wrong, expired, or full (see handle_new_user_signup) — don't let a
      // guess distinguish which. Strip the exception's code prefix either way.
      const message = signUpError.message.includes(":")
        ? signUpError.message.split(":").slice(1).join(":").trim()
        : null;
      setError(
        message ||
          "This invite code is invalid or no longer accepts new students."
      );
      return;
    }

    router.push("/student");
    router.refresh();
  }

  return (
    <Card className="p-6">
      <h1 className="text-2xl font-semibold text-fg">Join your course</h1>
      <p className="mt-1 text-sm text-fg-secondary">
        Your instructor approves new students before you can take a quiz.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <Input
          label="Full name"
          required
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
        />
        <Input
          label="Invite code"
          required
          placeholder="AB3F-K9YZ"
          value={inviteCode}
          onChange={(event) => setInviteCode(event.target.value)}
          className="uppercase"
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

        <Button type="submit" className="w-full" loading={loading}>
          Join course
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-fg-secondary">
        Running an academy instead?{" "}
        <Link href="/signup" className="font-medium text-primary hover:underline">
          Create your academy
        </Link>
      </p>
      <p className="mt-2 text-center text-sm text-fg-secondary">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Log in
        </Link>
      </p>
    </Card>
  );
}
