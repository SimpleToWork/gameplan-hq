"use client";
// The shared header/tab shell — same markup + class vocabulary as the legacy SPA so the ported
// globals.css applies unchanged. Migrated tabs navigate to Next routes; the rest hard-jump back
// into the legacy SPA at "/?page=<legacyId>" (its init() shim reads the param). Full page loads
// between the two worlds are deliberate (internal tool, strangler migration).
import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth, useToast, ToastBanner } from "@/app/providers";
import { doSignOut } from "@/lib/auth";
import { useIdentity } from "@/lib/identity";
import { resyncAll } from "@/lib/store";
import { ALLOWED_DOMAIN } from "@/lib/auth";
import { TABS } from "@/lib/tabs";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, status } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const { identity, identityUnknown } = useIdentity(user);

  // Legacy startApp() parity: warn once when the login isn't on the roster (attribution fallback).
  const warned = useRef(false);
  useEffect(() => {
    if (status === "in" && identityUnknown && user && !warned.current) {
      warned.current = true;
      toast(
        "Your login (" + user.email + ") isn't on the roster — actions are tagged to your account name. Add your @" + ALLOWED_DOMAIN + " email to the team roster to fix attribution.",
        "err"
      );
    }
  }, [status, identityUnknown, user, toast]);

  const signedIn = status === "in";
  return (
    <div className="app">
      <header>
        <div className="brandrow">
          <div className="brand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="brandlogo" src="/mbi-logo.png" alt="MerchantsBI" />
            <span className="brandtext">
              <b>MerchantsBI</b>
            </span>
          </div>
          {signedIn && (
            <div className="hctrl">
              <button className="btn sm" title="Re-sync live data — recover a stalled connection and fetch the latest" onClick={resyncAll}>
                ↻ Sync
              </button>
              You are <span style={{ fontWeight: 600 }}>{identity}</span>
              <button className="btn" title={user ? "Signed in as " + user.email : undefined} onClick={() => doSignOut()}>
                Sign out
              </button>
            </div>
          )}
        </div>
        {signedIn && (
          <div className="tabs">
            {TABS.map((t) =>
              t.migrated ? (
                <button key={t.id} className={pathname === "/" + t.id ? "on" : ""} onClick={() => router.push("/" + t.id)}>
                  {t.label}
                </button>
              ) : (
                <button
                  key={t.id}
                  onClick={() => {
                    window.location.href = "/?page=" + t.legacyId;
                  }}
                >
                  {t.label}
                </button>
              )
            )}
          </div>
        )}
      </header>
      <ToastBanner />
      <div id="main">{children}</div>
    </div>
  );
}
