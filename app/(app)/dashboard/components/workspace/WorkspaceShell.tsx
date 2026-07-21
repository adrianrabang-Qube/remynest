import type { ReactNode } from "react";

// The (app) shell (app/(app)/layout.tsx) already provides the sand canvas (bg-sand) and the
// horizontal gutter (<main> px-4 md:px-6) for every authenticated route. This wrapper used to
// re-apply BOTH (its own bg-[#f5f1ea] + its own px-4 md:px-6) — a second, differently-toned,
// differently-padded panel nested inside the shell that read as an unwanted inset frame and
// narrowed dashboard cards relative to every other page. It is now a pure max-width/vertical-
// rhythm wrapper: no background, no horizontal padding, so the app's own sand canvas and gutter
// show through edge-to-edge exactly as they do on Home / New Memory / everywhere else.
export function WorkspaceShell({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <section className="mx-auto w-full max-w-7xl space-y-6 py-6">
      {children}
    </section>
  );
}