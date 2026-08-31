import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-url";

// Every private area is disallowed — an academy's dashboard, a student's
// quizzes, the platform-owner area, the quiz-taking flow itself, and the
// API. None of that should ever show up in search results; auth already
// blocks a crawler from reading it anyway, this just keeps it out of the
// index and out of crawl budget.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/dashboard",
        "/student",
        "/platform",
        "/quiz",
        "/certificates",
        "/api",
        "/signup/sub-admin",
      ],
    },
    sitemap: `${getSiteUrl()}/sitemap.xml`,
  };
}
