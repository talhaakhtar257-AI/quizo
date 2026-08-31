const stats = [
  { icon: "📝", label: "500+ Quizzes Created" },
  { icon: "👨‍🎓", label: "10,000+ Students Tested" },
  { icon: "⭐", label: "4.8/5 Rating" },
];

export function SocialProof() {
  return (
    <div className="border-y border-border bg-surface-raised px-4 py-6 md:px-8">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-10 gap-y-3">
        {stats.map((stat) => (
          <span key={stat.label} className="text-sm font-medium text-fg-secondary">
            {stat.icon} {stat.label}
          </span>
        ))}
      </div>
    </div>
  );
}
