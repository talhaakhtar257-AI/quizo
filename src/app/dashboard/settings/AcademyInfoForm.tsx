"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, useToast } from "@/components/ui";
import { updateAcademyInfo } from "./actions";

export function AcademyInfoForm({
  name,
  logoUrl,
  accentColor,
  hasCustomBranding,
}: {
  name: string;
  logoUrl: string | null;
  accentColor: string | null;
  hasCustomBranding: boolean;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    try {
      await updateAcademyInfo(new FormData(event.currentTarget));
      showToast("Academy info saved", "success");
      router.refresh();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Could not save.", "danger");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold text-fg">Academy</h2>
      <p className="mt-1 text-sm text-fg-secondary">
        Your academy&apos;s name, logo, and brand color, shown to students and on certificates.
      </p>

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <Input label="Academy name" name="name" required defaultValue={name} />
        <Input
          label="Logo URL"
          name="logoUrl"
          type="url"
          placeholder="https://…"
          defaultValue={logoUrl ?? ""}
        />
        <div className="space-y-2">
          <label htmlFor="accentColor" className="text-sm font-medium text-fg">
            Certificate brand color
          </label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              id="accentColor-picker"
              value={accentColor ?? "#1B4D3E"}
              onChange={(event) => {
                const hidden = document.getElementById("accentColor") as HTMLInputElement | null;
                if (hidden) hidden.value = event.target.value;
              }}
              className="h-11 w-14 shrink-0 cursor-pointer rounded-md border border-border bg-surface"
              aria-label="Pick certificate brand color"
            />
            <Input id="accentColor" name="accentColor" defaultValue={accentColor ?? ""} placeholder="#1B4D3E" />
          </div>
          {!hasCustomBranding && (
            <p className="text-xs text-fg-muted">
              Logo and brand color appear on certificates for Pro and Institution plans. On Free,
              certificates use the default Quizo look.
            </p>
          )}
        </div>
        <Button type="submit" loading={loading}>
          Save
        </Button>
      </form>
    </Card>
  );
}
