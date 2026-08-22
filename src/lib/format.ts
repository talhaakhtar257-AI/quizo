// Always pass an explicit locale to date formatting. Without one,
// `toLocaleDateString()` uses the server's locale during SSR and the
// browser's locale on the client — when they differ, React throws a
// hydration mismatch.
export function formatDate(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// mm:ss under an hour, h:mm:ss beyond it — quiz timers can run up to 300 min.
export function formatDuration(totalSeconds: number) {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(secs)}` : `${minutes}:${pad(secs)}`;
}

// Same fixed-locale reasoning as formatDate — always pass "en-US" explicitly.
export function formatDateTime(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// "5 min ago", "2 hours ago" — for flagging how long an in-progress attempt
// has been running. Only ever rendered client-side (relative to "now"), so
// there is no server/client hydration mismatch to guard against here.
export function formatRelativeTime(value: string | Date, now: Date = new Date()) {
  const date = typeof value === "string" ? new Date(value) : value;
  const seconds = Math.max(0, Math.round((now.getTime() - date.getTime()) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}
