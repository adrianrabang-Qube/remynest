/**
 * Music Memories — shared types + limits (single source of truth).
 * Pure data: no React/DOM/DB. A song memory is user-typed song METADATA plus
 * an ORDERED, OPTIONAL set of linked existing memories. No audio in v1.
 */

export const SONG_TITLE_MAX = 120;
export const SONG_ARTIST_MAX = 120;
export const SONG_ERA_MAX = 40;
export const SONG_NOTE_MAX = 1000;
export const SONG_MAX_LINKS = 12;

export interface SongMemoryRecord {
  id: string;
  user_id: string;
  memory_profile_id: string | null;
  title: string;
  artist: string;
  era: string;
  note: string;
  /** Ordered linked memory uuids (may be empty — links are optional). */
  memory_ids: string[];
  /** Canonical Spotify track URL when imported ("" = manual entry; column is
   *  probe-gated — absent pre-migration, normalized to ""). Never rendered as
   *  a link/player — a text-only source indicator only. */
  spotify_url: string;
  created_at: string;
  updated_at: string;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Normalize untrusted linked-memory ids: uuid-shaped, unique, order kept, capped. */
export function normalizeLinkedMemoryIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of value) {
    if (typeof v !== "string" || !UUID_RE.test(v) || seen.has(v)) continue;
    seen.add(v);
    out.push(v);
    if (out.length >= SONG_MAX_LINKS) break;
  }
  return out;
}

function trimmed(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

export function normalizeSongFields(input: {
  title: unknown;
  artist: unknown;
  era: unknown;
  note: unknown;
}): { title: string; artist: string; era: string; note: string } {
  return {
    title: trimmed(input.title, SONG_TITLE_MAX),
    artist: trimmed(input.artist, SONG_ARTIST_MAX),
    era: trimmed(input.era, SONG_ERA_MAX),
    note: trimmed(input.note, SONG_NOTE_MAX),
  };
}
