import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { ToastProvider } from "@/components/ui";
import { getSiteUrl } from "@/lib/site-url";
import "./globals.css";
import { cn } from "@/lib/utils";

// CLAUDE.md specifies Inter as the one app-wide font. `shadcn init`'s Nova
// preset defaults to Geist and injects it automatically — removed here so
// there's a single font system, not two competing --font-sans sources.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const description =
  "Quizo turns study material into scenario-based quizzes that adapt to each student's answers in real time.";

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: { template: "%s | Quizo", default: "Quizo — Adaptive Quiz Platform" },
  description,
  openGraph: {
    title: "Quizo — Adaptive Quiz Platform",
    description,
    siteName: "Quizo",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Quizo — Adaptive Quiz Platform",
    description,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={cn("h-full", "antialiased", inter.variable, "font-sans")}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-background text-fg">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ToastProvider>{children}</ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
