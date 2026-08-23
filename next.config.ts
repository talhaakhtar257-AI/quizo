import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Lets phones/other devices on the same WiFi load the dev server's JS
  // during local testing (Next.js blocks cross-origin dev assets by default).
  allowedDevOrigins: ["192.168.1.105"],
};

export default nextConfig;
