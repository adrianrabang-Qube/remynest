import type { Metadata } from "next";

import ResetPasswordClient from "./ResetPasswordClient";
import LegalLinks from "@/components/legal/LegalLinks";

export const metadata: Metadata = {
  title: "Reset Password",
  description: "Set a new password for your RemyNest account.",
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <>
      <ResetPasswordClient />
      <div className="mx-auto max-w-md px-6 pb-8">
        <LegalLinks className="justify-center" />
      </div>
    </>
  );
}
