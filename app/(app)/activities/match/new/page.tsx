import type { Metadata } from "next";

import MatchWizard from "@/components/memory-match/MatchWizard";

export const metadata: Metadata = { title: "Create a match game" };
export const dynamic = "force-dynamic";

/** Create-a-game wizard shell (auth via protect-by-default). */
export default function NewMatchGamePage() {
  return <MatchWizard />;
}
