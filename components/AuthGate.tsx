"use client";
// Replica of the legacy renderSignIn() screen: gates all page content on an allowed sign-in.
import { useState } from "react";
import { useAuth } from "@/app/providers";
import { ALLOWED_DOMAIN, doSignIn } from "@/lib/auth";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { status, deniedMsg } = useAuth();
  const [errMsg, setErrMsg] = useState("");

  if (status === "loading") return null;
  if (status === "in") return <>{children}</>;

  const msg = errMsg || deniedMsg;
  return (
    <div className="hero" style={{ maxWidth: 420, margin: "48px auto", textAlign: "center" }}>
      <h2 style={{ fontSize: 20 }}>Sign in to MerchantsBI</h2>
      <p style={{ margin: "6px auto 16px" }}>
        Use your <b>@{ALLOWED_DOMAIN}</b> Google account.
      </p>
      {msg && (
        <div className="banner err show" style={{ margin: "0 0 14px", textAlign: "left" }}>
          {msg}
        </div>
      )}
      <button
        className="btn primary"
        onClick={async () => {
          try {
            setErrMsg("");
            await doSignIn();
          } catch (e) {
            const err = e as { message?: string; code?: string };
            setErrMsg("Sign-in failed: " + (err.message || err.code || "error"));
          }
        }}
      >
        Sign in with Google
      </button>
    </div>
  );
}
