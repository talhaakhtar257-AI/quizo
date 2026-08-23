import type { Metadata } from "next";

export const metadata: Metadata = { title: "Style Guide" };

export default function StyleGuideLayout({ children }: { children: React.ReactNode }) {
  return children;
}
