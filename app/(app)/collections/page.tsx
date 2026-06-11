import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getRemyCollections } from "@/lib/remy/collections";
import CollectionCard from "@/components/remy/CollectionCard";

export const dynamic = "force-dynamic";

export default async function CollectionsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const collections = await getRemyCollections(supabase, user.id, {
    includeDetails: true,
  });

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-8">
        <h1 className="text-4xl font-semibold text-charcoal">Collections</h1>
        <p className="mt-2 text-charcoal-soft">
          Memories Remy has gathered into meaningful collections.
        </p>
      </header>

      {collections.length === 0 ? (
        <div className="rounded-3xl border border-sand-deep/70 bg-white p-8 text-charcoal-soft shadow-soft">
          Remy hasn&apos;t organized any collections yet. As more memories are
          added, related ones will be gathered here.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {collections.map((collection) => (
            <CollectionCard
              key={collection.id}
              collection={collection}
            />
          ))}
        </div>
      )}
    </main>
  );
}
