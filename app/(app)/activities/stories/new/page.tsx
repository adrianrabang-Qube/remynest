import type { Metadata } from "next";

import StoryBuilderWizard from "@/components/stories/StoryBuilderWizard";

export const metadata: Metadata = { title: "Create a story" };
export const dynamic = "force-dynamic";

/** Create-a-story wizard shell (auth via protect-by-default). */
export default function NewStoryPage() {
  return <StoryBuilderWizard />;
}
