"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import LegalLinks from "@/components/legal/LegalLinks";

export default function SignupPage() {
  const supabase = createClient();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [confirmEmail, setConfirmEmail] = useState(false);

  async function handleSignup(event: React.FormEvent) {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setError("");

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setLoading(false);
      setError(error.message);
      return;
    }

    // With email confirmation enabled there is no session yet — prompt the user to
    // confirm via the emailed link instead of routing into the app.
    if (data.session) {
      router.push("/memories");
      router.refresh();
      return;
    }

    setLoading(false);
    setConfirmEmail(true);
  }

  if (confirmEmail) {
    return (
      <div className="p-6 max-w-md mx-auto">
        <h1 className="text-2xl font-semibold mb-3 text-center">Check your email</h1>
        <p className="text-center text-sm text-charcoal-soft">
          We sent a confirmation link to <strong>{email}</strong>. Tap it to finish
          creating your account, then sign in.
        </p>
        <div className="mt-6 text-center text-sm">
          <Link
            href="/login"
            className="font-medium text-sage hover:text-sage-deep"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-md mx-auto">
      <h1 className="text-2xl font-semibold mb-4 text-center">
        Create your account
      </h1>

      <form onSubmit={handleSignup}>
        <input
          className="border p-2 w-full mb-3 rounded-lg"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          autoCorrect="off"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          className="border p-2 w-full mb-3 rounded-lg"
          type="password"
          autoComplete="new-password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && <p className="text-red-500 mb-3">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-sage px-4 py-2.5 font-medium text-white transition hover:bg-sage-deep disabled:opacity-70"
        >
          {loading && (
            <span
              className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
              aria-hidden
            />
          )}
          {loading ? "Creating account…" : "Sign up"}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-charcoal-soft">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-sage hover:text-sage-deep">
          Sign in
        </Link>
      </p>

      <p className="mt-4 text-xs text-neutral-500">
        By creating an account you agree to our Terms of Service and Privacy Policy.
      </p>

      <LegalLinks className="mt-3 justify-center" />
    </div>
  );
}
