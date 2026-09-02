import { Check, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface Row {
  label: string;
  free: string | boolean;
  pro: string | boolean;
  institution: string | boolean;
}

const rows: Row[] = [
  { label: "AI question generation", free: "Your own free key", pro: "Included", institution: "Included" },
  { label: "Courses", free: "3", pro: "Unlimited", institution: "Unlimited" },
  { label: "Students per course", free: "25", pro: "100", institution: "500" },
  { label: "AI questions / day / course", free: "15", pro: "50", institution: "200" },
  { label: "Question pool", free: "1× (same set, reshuffled)", pro: "3× (fresh each attempt)", institution: "3× (fresh each attempt)" },
  { label: "Quiz attempts per student", free: "2", pro: "5", institution: "Unlimited" },
  { label: "Sub-admins", free: "0", pro: "3", institution: "10" },
  { label: "Question + option shuffle", free: true, pro: true, institution: true },
  { label: "Tab-switch detection", free: true, pro: true, institution: true },
  { label: "Fullscreen lock", free: false, pro: true, institution: true },
  { label: "Response-time flagging", free: false, pro: true, institution: true },
  { label: "Copy/paste disable", free: false, pro: true, institution: true },
  { label: "Certificates", free: "Basic (Quizo badge)", pro: "Custom branded", institution: "Full white-label" },
  { label: "CSV export", free: false, pro: true, institution: true },
  { label: 'Remove "Powered by Quizo"', free: false, pro: true, institution: true },
  { label: "Priority support (24hr)", free: false, pro: false, institution: true },
];

function Cell({ value }: { value: string | boolean }) {
  if (typeof value === "boolean") {
    return value ? (
      <Check className="mx-auto size-4 text-success" aria-hidden="true" />
    ) : (
      <Minus className="mx-auto size-4 text-fg-muted" aria-hidden="true" />
    );
  }
  return <span className="text-sm text-fg">{value}</span>;
}

export function ComparisonTable() {
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-border bg-surface-raised text-left uppercase tracking-wider text-fg-secondary">
            <th className="px-4 py-3 font-medium">Feature</th>
            <th className="px-4 py-3 text-center font-medium">Free</th>
            <th className="px-4 py-3 text-center font-medium text-secondary">Pro</th>
            <th className="px-4 py-3 text-center font-medium">Institution</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={row.label}
              className={cn("border-b border-border", i % 2 === 1 && "bg-surface-raised/50")}
            >
              <td className="px-4 py-3 font-medium text-fg">{row.label}</td>
              <td className="px-4 py-3 text-center">
                <Cell value={row.free} />
              </td>
              <td className="px-4 py-3 text-center">
                <Cell value={row.pro} />
              </td>
              <td className="px-4 py-3 text-center">
                <Cell value={row.institution} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
