import { Sparkles } from "lucide-react";
import { Button } from "./Button";

// The blocking version of docs/FEATURES.md §11's upgrade-prompt mockup —
// shown in place of a raw error whenever a plan limit stops an action
// (course creation, a quiz's max-attempts setting, etc.). Not clickable to
// an actual purchase: taking payment is out of scope for now (CLAUDE.md),
// same "coming soon" honesty as the identical card on /dashboard/settings.
export function UpgradePrompt({
  message,
  benefits,
  onDismiss,
}: {
  message: string;
  benefits?: string;
  onDismiss?: () => void;
}) {
  return (
    <div className="rounded-lg border border-primary/30 bg-primary-faint p-4">
      <div className="flex items-start gap-3">
        <Sparkles className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-fg">Upgrade to Pro</p>
          <p className="mt-1 text-sm text-fg-secondary">{message}</p>
          {benefits && <p className="mt-1 text-sm text-fg-secondary">{benefits}</p>}
          <div className="mt-3 flex items-center gap-3">
            <Button type="button" size="sm" disabled>
              Upgrade — $19/month
            </Button>
            {onDismiss && (
              <button
                type="button"
                onClick={onDismiss}
                className="text-sm font-medium text-fg-secondary hover:text-fg"
              >
                Maybe later
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
