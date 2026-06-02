import type { ReactNode } from "react";

export function WorkspaceShell({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#f5f1ea]">
      <section className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 md:px-6">
        {children}
      </section>
    </div>
  );
}