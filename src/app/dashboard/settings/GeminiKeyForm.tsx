"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Trash2 } from "lucide-react";
import { Button, Card, Input, useToast } from "@/components/ui";
import { saveGeminiKey, removeGeminiKey } from "./actions";

export function GeminiKeyForm({
  maskedKey,
  aiIncluded,
}: {
  maskedKey: string | null;
  aiIncluded: boolean;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [editing, setEditing] = useState(!maskedKey);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      await saveGeminiKey(new FormData(event.currentTarget));
      showToast("Gemini key saved", "success");
      setEditing(false);
      router.refresh();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Could not save.", "danger");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove() {
    setRemoving(true);
    try {
      await removeGeminiKey();
      showToast("Key removed", "success");
      setEditing(true);
      router.refresh();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Could not remove.", "danger");
    } finally {
      setRemoving(false);
    }
  }

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2">
        <KeyRound className="size-5 text-secondary" aria-hidden="true" />
        <h2 className="text-lg font-semibold text-fg">Gemini API Key</h2>
      </div>
      {aiIncluded ? (
        <p className="mt-1 text-sm text-fg-secondary">
          <span className="font-medium text-fg">AI is included on your plan</span> — question
          generation works out of the box, nothing to set up. Add your own Google Gemini key below
          only if you&apos;d rather your material went through your own Google account.
        </p>
      ) : (
        <p className="mt-1 text-sm text-fg-secondary">
          On the Free plan you bring your own free Google Gemini key to power question generation.
          Paid plans include AI with no setup.{" "}
          <a
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-secondary hover:underline"
          >
            Get a free key from Google AI Studio ↗
          </a>
        </p>
      )}

      {!editing && maskedKey ? (
        <div className="mt-4 flex items-center justify-between rounded-md border border-border bg-surface-raised px-3 py-2.5">
          <span className="font-mono text-sm text-fg">{maskedKey}</span>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(true)}>
              Replace
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRemove}
              loading={removing}
            >
              <Trash2 className="size-4 text-danger" />
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <Input
            label="API key"
            name="apiKey"
            type="password"
            required
            placeholder="AIza…"
            autoComplete="off"
          />
          <div className="flex gap-2">
            <Button type="submit" loading={saving}>
              Save key
            </Button>
            {maskedKey && (
              <Button type="button" variant="secondary" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      )}
    </Card>
  );
}
