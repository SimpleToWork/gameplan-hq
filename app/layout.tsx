import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { AppShell } from "@/components/AppShell";
import { AuthGate } from "@/components/AuthGate";

export const metadata: Metadata = {
  title: "MerchantsBI",
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }, { url: "/mbi-logo.png", type: "image/png" }],
    apple: "/mbi-logo.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <AppShell>
            <AuthGate>{children}</AuthGate>
          </AppShell>
        </Providers>
      </body>
    </html>
  );
}
