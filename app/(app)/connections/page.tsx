import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getRemyConnections } from "@/lib/remy/connections";

export const dynamic = "force-dynamic";

export default async function ConnectionsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const connections = await getRemyConnections(supabase, user.id);

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-8">
        <h1 className="text-4xl font-semibold text-charcoal">Connections</h1>
        <p className="mt-2 text-charcoal-soft">
          Memories Remy noticed that may be part of the same story.
        </p>
      </header>

      {connections.length === 0 ? (
        <div className="rounded-3xl border border-sand-deep/70 bg-white p-8 text-charcoal-soft shadow-soft">
          Remy hasn&apos;t found any connections yet. As more memories are added,
          related moments will be gathered here.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {connections.map((c) => (
            <Link
              key={c.id}
              href={`/connections/${c.id}`}
              className="block rounded-3xl border border-sand-deep/70 bg-white p-6 shadow-soft transition hover:-translate-y-0.5 hover:shadow-soft-lg"
            >
              <h2 className="text-lg font-semibold text-charcoal break-words">
                {c.title}
              </h2>
              <p className="mt-1 text-sm text-charcoal-soft">
                {c.connectedCount} connected{" "}
                {c.connectedCount === 1 ? "moment" : "moments"}
              </p>
              {c.theme && (
                <p className="mt-3 text-xs text-charcoal-muted">
                  Connected to {c.theme}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
