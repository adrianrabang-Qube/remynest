"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { haptic, hapticWarning } from "@/lib/haptics";

export default function LoginClient() {
  const supabase = createClient();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault();
    if (loading) return;
    void haptic("light"); // immediate tactile acknowledgement of the tap
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setLoading(false);
      void hapticWarning();
      setError(error.message);
      return;
    }

    // Keep the button in its loading state through the navigation (no flash back).
    router.push("/home");
    router.refresh();
  }

  return (
    <div className="p-6 max-w-md mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Welcome back</h1>

      <form onSubmit={handleLogin}>
        <input
          className="border p-2 w-full mb-3 rounded-lg"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          autoCorrect="off"
          aria-label="Email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          className="border p-2 w-full mb-3 rounded-lg"
          type="password"
          autoComplete="current-password"
          aria-label="Password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && <p className="text-red-500 mb-3">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-sage px-4 py-2.5 font-medium text-white transition hover:bg-sage-deep active:scale-[.98] active:opacity-90 disabled:opacity-70 disabled:active:scale-100"
        >
          {loading && (
            <span
              className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
              aria-hidden
            />
          )}
          {loading ? "Signing in…" : "Login"}
        </button>
      </form>
    </div>
  );
}
