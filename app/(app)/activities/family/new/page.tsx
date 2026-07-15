import type { Metadata } from "next";

import TogetherTimeWizard from "@/components/together-time/TogetherTimeWizard";

export const metadata: Metadata = { title: "Create a together time" };
export const dynamic = "force-dynamic";

/** Create-a-together-time wizard shell (auth via protect-by-default). */
export default function NewTogetherTimePage() {
  return <TogetherTimeWizard />;
}
