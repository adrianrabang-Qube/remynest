import type { Metadata } from "next";

import ForgotPasswordClient from "./ForgotPasswordClient";
import LegalLinks from "@/components/legal/LegalLinks";

export const metadata: Metadata = {
  title: "Forgot Password",
  description: "Reset your RemyNest password.",
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <>
      <ForgotPasswordClient />
      <div className="mx-auto max-w-md px-6 pb-8">
        <LegalLinks className="justify-center" />
      </div>
    </>
  );
}
