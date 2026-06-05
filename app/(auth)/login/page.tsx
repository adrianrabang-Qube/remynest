import type { Metadata } from "next";
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
      <div className="mx-auto max-w-md px-6 pb-8">
        <LegalLinks className="justify-center" />
      </div>
    </>
  );
}