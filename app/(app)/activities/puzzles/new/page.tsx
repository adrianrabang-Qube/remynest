import type { Metadata } from "next";

import CreatePuzzleWizard from "@/components/puzzles/create/CreatePuzzleWizard";

export const metadata: Metadata = { title: "Create a puzzle" };
export const dynamic = "force-dynamic";

/** Create-a-puzzle wizard shell (auth via protect-by-default). */
export default function NewPuzzlePage() {
  return <CreatePuzzleWizard />;
}
