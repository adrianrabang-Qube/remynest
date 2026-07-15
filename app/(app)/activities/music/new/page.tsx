import type { Metadata } from "next";

import SongWizard from "@/components/music-memories/SongWizard";

export const metadata: Metadata = { title: "Add a song" };
export const dynamic = "force-dynamic";

/** Add-a-song wizard shell (auth via protect-by-default). */
export default function NewSongPage() {
  return <SongWizard />;
}
