-- Music Memories — Spotify link import source metadata (2026-07-15).
-- ADDITIVE + REVERSIBLE + probe-gated. OPERATOR STEP: apply in the SQL editor.
--
-- Stores ONLY the canonical validated track URL
-- (https://open.spotify.com/track/<id>) when a song card was prefilled via
-- the import-only oEmbed flow. Empty string = manually entered song.
-- No oEmbed HTML, no artwork, no tokens, no account linkage — ever.
--
-- Pre-application behavior: the app runs fully without this column — song
-- create/edit RETRY without the field when the column is missing (import
-- simply isn't persisted), and reads treat the field as absent.

alter table public.song_memories
  add column if not exists spotify_url text not null default '';

-- ROLLBACK
-- alter table public.song_memories drop column if exists spotify_url;
