"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordClient() {
  const [supabase] = useState(() => createClient());

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.resetPasswordForEmail(
      email.trim(),
      {
        redirectTo: `${window.location.origin}/reset-password`,
      }
    );

    setLoading(false);

    if (error) {
      // Generic message — never reveal whether an account exists (anti-enumeration).
      setError(
        "We couldn't start the reset right now. Please try again in a moment."
      );
      return;
    }

    setSent(true);
  }

  return (
    <div className="mx-auto max-w-md px-6 py-12">
      <div className="rounded-3xl border border-sand-deep/70 bg-white p-8 shadow-soft">
        <h1 className="text-2xl font-semibold text-charcoal">
          Forgot your password?
        </h1>

        {sent ? (
          <div className="mt-4 space-y-4">
            <p className="text-sm text-charcoal-soft">
              If an account exists for{" "}
              <span className="font-medium text-charcoal">{email}</span>, we&apos;ve
              sent a link to reset your password. Please check your inbox (and spam
              folder).
            </p>
            <Link
              href="/login"
              className="inline-block text-sm font-medium text-primary hover:text-primary-deep"
            >
              ← Back to login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <p className="text-sm text-charcoal-soft">
              Enter your email and we&apos;ll send you a link to set a new password.
            </p>

            <input
              type="email"
              name="email"
              autoComplete="email"
              required
              aria-label="Email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-sand-deep px-4 py-3 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/40"
            />

            {error && (
              <p className="text-sm text-rose-600" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full rounded-full bg-primary px-4 py-3 font-semibold text-white shadow-soft transition hover:bg-primary-deep disabled:opacity-50"
            >
              {loading ? "Sending…" : "Send reset link"}
            </button>

            <Link
              href="/login"
              className="block text-center text-sm font-medium text-primary hover:text-primary-deep"
            >
              ← Back to login
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
