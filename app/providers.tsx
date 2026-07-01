"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { allowed, ALLOWED_DOMAIN } from "@/lib/auth";
import { APP_VARIANTS } from "@/lib/constants";
import { teardownAll } from "@/lib/store";

/* ---------- Auth ---------- */
export type AuthStatus = "loading" | "in" | "out";
interface AuthState {
  user: User | null;
  status: AuthStatus;
  deniedMsg: string; // legacy pendingAuthMsg: shown on the sign-in screen after a wrong-domain attempt
}
const AuthCtx = createContext<AuthState>({ user: null, status: "loading", deniedMsg: "" });
export const useAuth = () => useContext(AuthCtx);

function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, status: "loading", deniedMsg: "" });
  useEffect(
    () =>
      onAuthStateChanged(auth, (user) => {
        if (user && allowed(user)) {
          setState({ user, status: "in", deniedMsg: "" });
        } else if (user) {
          // Wrong domain: mirror legacy — record the message, sign the account straight back out.
          setState({
            user: null,
            status: "out",
            deniedMsg: (user.email || "That account") + " is not a @" + ALLOWED_DOMAIN + " account — sign in with your company Google login.",
          });
          signOut(auth);
        } else {
          teardownAll(); // drop live listeners + cached data on sign-out
          setState((s) => ({ user: null, status: "out", deniedMsg: s.deniedMsg }));
        }
      }),
    []
  );
  return <AuthCtx.Provider value={state}>{children}</AuthCtx.Provider>;
}

/* ---------- Toast (legacy banner()) ---------- */
type ToastKind = "ok" | "err";
interface ToastState {
  msg: string;
  kind: ToastKind;
}
const ToastCtx = createContext<{ toast: (msg: string, kind?: ToastKind) => void; current: ToastState | null }>({
  toast: () => {},
  current: null,
});
export const useToast = () => useContext(ToastCtx);

function ToastProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<ToastState | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toast = useCallback((msg: string, kind: ToastKind = "ok") => {
    if (timer.current) clearTimeout(timer.current);
    setCurrent({ msg, kind });
    if (kind === "ok") timer.current = setTimeout(() => setCurrent(null), 3500); // errs persist, like banner()
  }, []);
  return <ToastCtx.Provider value={{ toast, current }}>{children}</ToastCtx.Provider>;
}

/** The banner mount — same classes/placement as the legacy #banner div. */
export function ToastBanner() {
  const { current } = useToast();
  return <div className={current ? "banner show " + current.kind : "banner"}>{current?.msg}</div>;
}

/* ---------- Theme (legacy applyAppVariant) ---------- */
function ThemeProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    let key = "gameplan";
    try {
      const v = localStorage.getItem("gp_app");
      if (v && APP_VARIANTS[v]) key = v;
    } catch {}
    const v = APP_VARIANTS[key];
    const r = document.documentElement;
    r.style.setProperty("--accent", v.color);
    r.style.setProperty("--accent-soft", v.soft);
    r.style.setProperty("--app-accent", v.color);
  }, []);
  return <>{children}</>;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <ToastProvider>
        <ThemeProvider>{children}</ThemeProvider>
      </ToastProvider>
    </AuthProvider>
  );
}
