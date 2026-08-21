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
