"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { isPasswordValid } from "@/lib/password";
import { PasswordStrengthMeter } from "@/components/auth/PasswordStrengthMeter";
import { Button, Card, Input } from "@/components/ui";

// This is the ACADEMY OWNER signup — it creates a brand new organization
// with the signer-upper as its admin. A student never lands here; they use
// /signup/student with an invite code instead (see docs/FEATURES.md §1).
export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [academyName, setAcademyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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
    if (academyName.trim().length < 2) {
      setError("Enter your academy's name.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, academy_name: academyName.trim() },
      },
    });
    setLoading(false);

    if (signUpError) {
      // The signup trigger raises plain Postgres exceptions (see
      // handle_new_user_signup) — strip the SQLSTATE/code noise, keep the
      // message. Anything unexpected falls back to a generic message
      // rather than showing raw error internals.
      const message = signUpError.message.includes(":")
        ? signUpError.message.split(":").slice(1).join(":").trim()
        : null;
      setError(message || "Something went wrong creating your account. Please try again.");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <Card className="p-6">
      <h1 className="text-2xl font-semibold text-fg">Create your academy</h1>
      <p className="mt-1 text-sm text-fg-secondary">
        Free forever for up to 3 courses. No credit card needed.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <Input
          label="Your full name"
          required
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
        />
        <Input
          label="Academy name"
          required
          placeholder="e.g. Khan Academy Prep"
          value={academyName}
          onChange={(event) => setAcademyName(event.target.value)}
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
          Create academy — Start Free
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-fg-secondary">
        Joining as a student instead?{" "}
        <Link href="/signup/student" className="font-medium text-primary hover:underline">
          Use your invite code
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
