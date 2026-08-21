import { getPasswordStrength } from "@/lib/password";
import { cn } from "@/lib/utils";

const barColors = ["bg-border", "bg-danger", "bg-warning", "bg-success"];

export function PasswordStrengthMeter({ password }: { password: string }) {
  const { score, label } = getPasswordStrength(password);
  if (password.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
      <div className="flex flex-1 gap-1" aria-hidden="true">
        {[1, 2, 3].map((bar) => (
          <div
            key={bar}
            className={cn(
              "h-1.5 flex-1 rounded-full bg-border",
              bar <= score && barColors[score]
            )}
          />
        ))}
      </div>
      <span className="text-xs font-medium text-fg-secondary">{label}</span>
    </div>
  );
}
