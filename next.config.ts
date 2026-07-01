import type { NextConfig } from "next";

// STRANGLER MIGRATION: the legacy single-file SPA (public/index.html) keeps serving "/" via this
// afterFiles rewrite. Migrated tabs are ordinary App Router routes (app/tasks/page.tsx → /tasks)
// which are matched BEFORE the rewrite, so they never hit it. Do NOT add app/page.tsx until the
// final cutover — when it exists it wins over the rewrite automatically.
const nextConfig: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return {
      afterFiles: [{ source: "/", destination: "/index.html" }],
    };
  },
};

export default nextConfig;
