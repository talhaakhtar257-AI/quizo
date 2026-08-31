// Central source of truth for the site's public base URL — used by
// metadataBase, sitemap.ts, robots.ts, and the OG image route. Needs zero
// manual configuration on Vercel: VERCEL_PROJECT_PRODUCTION_URL is injected
// automatically by Vercel at build time for every project, no env var to
// remember to set. Falls back to localhost for local dev.
export function getSiteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  return "http://localhost:3000";
}
