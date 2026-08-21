import { cn } from "@/lib/utils";

export type Difficulty = "easy" | "medium" | "hard";

const filledBars: Record<Difficulty, number> = { easy: 1, medium: 2, hard: 3 };
const labels: Record<Difficulty, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

export interface DifficultyIndicatorProps {
  difficulty: Difficulty;
  className?: string;
}

// Three slate bars + the word — never traffic-light colours. Fill count
// carries the meaning so it stays colourblind-safe and never reads as
// a correct/wrong verdict. See docs/DESIGN-SYSTEM.md.
export function DifficultyIndicator({
  difficulty,
  className,
}: DifficultyIndicatorProps) {
  const filled = filledBars[difficulty];

  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span className="flex items-end gap-0.5" aria-hidden="true">
        {[1, 2, 3].map((bar) => (
          <span
            key={bar}
            className={cn(
              "w-1.5 rounded-full bg-[#64748B]",
              bar === 1 && "h-2",
              bar === 2 && "h-3",
              bar === 3 && "h-4",
              bar > filled && "opacity-25"
            )}
          />
        ))}
      </span>
      <span className="text-sm font-medium text-fg">{labels[difficulty]}</span>
    </span>
  );
}
