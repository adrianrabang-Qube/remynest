"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import LegalLinks from "@/components/legal/LegalLinks";

export default function SignupPage() {
  const supabase = createClient();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSignup = async () => {
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    router.push("/memories");
    router.refresh();
  };

  return (
    <div className="p-6 max-w-md mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Create your account</h1>

      <input
        className="border p-2 w-full mb-3"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <input
        className="border p-2 w-full mb-3"
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      {error && <p className="text-red-500 mb-3">{error}</p>}

      <button
        onClick={handleSignup}
        disabled={loading}
        className="rounded-lg bg-sage px-4 py-2.5 w-full font-medium text-white transition hover:bg-sage-deep disabled:opacity-70"
      >
        {loading ? "Creating account..." : "Sign up"}
      </button>

      <p className="mt-4 text-xs text-neutral-500">
        By creating an account you agree to our Terms of Service and
        Privacy Policy.
      </p>

      <LegalLinks className="mt-3 justify-center" />
    </div>
  );
}