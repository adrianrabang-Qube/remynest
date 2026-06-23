import type { Metadata } from "next";
import Link from "next/link";
import LoginClient from "./LoginClient";
import LegalLinks from "@/components/legal/LegalLinks";

export const metadata: Metadata = {
  alternates: {
    canonical: "/login",
  },
};

export default function Page() {
  return (
    <>
      <LoginClient />
      <div className="mx-auto max-w-md px-6">
        <Link
          href="/forgot-password"
          className="text-sm font-medium text-sage hover:text-sage-deep"
        >
          Forgot your password?
        </Link>
      </div>
      <div className="mx-auto max-w-md px-6 pt-3 text-sm text-charcoal-soft">
        New to RemyNest?{" "}
        <Link
          href="/signup"
          className="font-medium text-sage hover:text-sage-deep"
        >
          Create an account
        </Link>
      </div>
      <div className="mx-auto max-w-md px-6 pb-8 pt-6">
        <LegalLinks className="justify-center" />
      </div>
    </>
  );
}