"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button, Card, Input } from "@/components/ui";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);

    const supabase = createClient();
    // Always shows the same success state whether or not the email is
    // registered, so nobody can use this form to discover registered emails.
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setLoading(false);
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <Card className="p-6 text-center">
        <h1 className="text-2xl font-semibold text-fg">Check your email</h1>
        <p className="mt-2 text-sm text-fg-secondary">
          If an account exists for that email, we&apos;ve sent a link to
          reset your password.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-block text-sm font-medium text-secondary hover:underline"
        >
          Back to log in
        </Link>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h1 className="text-2xl font-semibold text-fg">Reset your password</h1>
      <p className="mt-1 text-sm text-fg-secondary">
        Enter your email and we&apos;ll send you a reset link.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <Input
          label="Email"
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <Button type="submit" className="w-full" loading={loading}>
          Send reset link
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-fg-secondary">
        <Link href="/login" className="font-medium text-secondary hover:underline">
          Back to log in
        </Link>
      </p>
    </Card>
  );
}
