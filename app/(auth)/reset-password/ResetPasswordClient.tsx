"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const MIN_PASSWORD_LENGTH = 8;

const LINK_INVALID_MSG =
  "This password reset link is invalid or has expired. Please request a new one.";

type Phase = "verifying" | "ready" | "link-error" | "done";

export default function ResetPasswordClient() {
  const [supabase] = useState(() => createClient());
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>("verifying");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Establish the recovery session from the email link. Supports both the PKCE
  // (?code=) flow and the implicit/hash (#access_token…&type=recovery) flow that
  // `detectSessionInUrl` handles, plus the canonical PASSWORD_RECOVERY event.
  useEffect(() => {
    let active = true;

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" && active) {
        setPhase("ready");
      }
    });

    async function establishSession() {
      // 1) A recovery session may already exist (hash flow auto-detected).
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!active) return;
      if (session) {
        setPhase("ready");
        return;
      }

      // 2) PKCE flow — exchange the code for a session.
      const code = new URLSearchParams(window.location.search).get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!active) return;
        setPhase(error ? "link-error" : "ready");
        return;
      }

      // 3) Give detectSessionInUrl a beat to finish, then decide.
      setTimeout(async () => {
        const {
          data: { session: late },
        } = await supabase.auth.getSession();
        if (!active) return;
        setPhase(late ? "ready" : "link-error");
      }, 1000);
    }

    establishSession();

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Use at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (password !== confirm) {
      setError("Those passwords don't match.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setPhase("done");
    // The user is now signed in via the recovery session — send them into the app.
    setTimeout(() => {
      router.push("/memories");
      router.refresh();
    }, 1500);
  }

  return (
    <div className="mx-auto max-w-md px-6 py-12">
      <div className="rounded-3xl border border-sand-deep/70 bg-white p-8 shadow-soft">
        <h1 className="text-2xl font-semibold text-charcoal">
          Set a new password
        </h1>

        {phase === "verifying" && (
          <p className="mt-4 text-sm text-charcoal-soft">
            Verifying your reset link…
          </p>
        )}

        {phase === "link-error" && (
          <div className="mt-4 space-y-4">
            <p className="text-sm text-rose-600" role="alert">
              {LINK_INVALID_MSG}
            </p>
            <Link
              href="/forgot-password"
              className="inline-block rounded-full bg-sage px-4 py-2 text-sm font-semibold text-white shadow-soft transition hover:bg-sage-deep"
            >
              Request a new link
            </Link>
          </div>
        )}

        {phase === "done" && (
          <p className="mt-4 text-sm text-sage-deep">
            ✅ Your password has been updated. Redirecting you to RemyNest…
          </p>
        )}

        {phase === "ready" && (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <p className="text-sm text-charcoal-soft">
              Choose a new password for your account.
            </p>

            <input
              type="password"
              name="new-password"
              autoComplete="new-password"
              required
              placeholder="New password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-sand-deep px-4 py-3 outline-none transition focus:border-sage focus:ring-2 focus:ring-sage/40"
            />

            <input
              type="password"
              name="confirm-password"
              autoComplete="new-password"
              required
              placeholder="Confirm new password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full rounded-xl border border-sand-deep px-4 py-3 outline-none transition focus:border-sage focus:ring-2 focus:ring-sage/40"
            />

            {error && (
              <p className="text-sm text-rose-600" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !password || !confirm}
              className="w-full rounded-full bg-sage px-4 py-3 font-semibold text-white shadow-soft transition hover:bg-sage-deep disabled:opacity-50"
            >
              {loading ? "Updating…" : "Update password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
