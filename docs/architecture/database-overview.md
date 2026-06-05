# Database Overview

Postgres via Supabase. **Schema is dashboard-managed** — there are no repo
migrations except `supabase/migrations/*_delete_account.sql` (delete-account
infra, **not yet applied**). Column lists below are code-confirmed where noted;
others marked _(verify)_. RLS is **enabled and enforcing** on all core tables.

## FK reality (probed live)
- ✅ `profile_relationships.memory_profile_id → memory_profiles`
- ✅ `reminders.* → memory_profiles`
- ❌ `memories.user_id` / `memories.memory_profile_id` — **no declared FK** in
  `public` (either → `auth.users`, invisible to REST, or none).
- ❌ Account-id columns (`memory_profiles.created_by_account_id`,
  `profile_relationships.caregiver_account_id`) — no FK to `public.profiles`.
- `auth.users` has **no cascade** → all app data must be deleted explicitly.

---

## profiles
- **Purpose:** one row per account (account-level profile + subscription).
- **Key columns (confirmed):** `id` (=auth user id, PK), `email`, `first_name`,
  `preferred_name`, `profile_name`, `onboarding_completed`, `is_premium`,
  `subscription_plan`, `subscription_status`, `current_period_end`,
  `stripe_customer_id`, `stripe_subscription_id`. **No `avatar_url`.**
- **Ownership:** self (id = auth uid).
- **Relationships:** id used as account id across other tables.
- **Deletion:** explicit `delete where id = user` (step 8); not auto-removed by
  auth deletion.

## memory_profiles
- **Purpose:** a person whose memories are kept (the care recipient / subject).
- **Key columns (confirmed):** `id`, `created_at`, `profile_name`,
  `preferred_name`, `date_of_birth`, `profile_photo`, `created_by_account_id`
  (owner), `subscription_status`.
- **Ownership:** `created_by_account_id`. Shareable via `profile_relationships`.
- **Deletion:** transferred to a successor caregiver if shared; else deleted
  (step 7). Children (memories/reminders/relationships) handled first.

## memories
- **Purpose:** the memory content (notes/photos/videos + AI enrichment).
- **Key columns (confirmed):** `id`, `created_at`, `title`, `user_id` (author),
  `content`, `summary`, `tags`, `ai_summary`, `ai_tags`, `ai_title`,
  `ai_category`, `ai_mood`, `ai_importance`, `ai_confidence`, `ai_sentiment`,
  `ai_emotional_weight`, `embedding` (pgvector), `memory_profile_id`,
  `importance_score`, `emotional_score`, `retrieval_count`, `last_accessed_at`,
  `workspace_type`, `attachments` (jsonb), `cover_image_url`.
- **Ownership:** `user_id` (author); belongs to `memory_profile_id`.
- **Deletion:** own memories deleted by `user_id`; cross-contributed (in others'
  profiles) anonymised to tombstone or deleted by choice.

## reminders
- **Purpose:** scheduled prompts tied to a memory profile.
- **Key columns:** `user_id`, `memory_profile_id` (**FK → memory_profiles**),
  schedule/content fields _(verify exact names)_.
- **Ownership:** `user_id`.
- **Deletion:** by `user_id` (step 3); FK to memory_profiles means profile
  deletion requires reminders cleared first.

## profile_relationships
- **Purpose:** caregiver sharing / access grants.
- **Key columns (confirmed):** `id`, `created_at`, `memory_profile_id`
  (**FK → memory_profiles**), `caregiver_account_id`, `relationship_type`
  (`owner`|`caregiver`), `access_level` (`admin`|`read`), `invite_status`
  (`accepted` …), `invited_by_account_id`.
- **Ownership:** links a caregiver account to a profile.
- **Deletion:** rows for the deleting caregiver removed (step 4); successor
  selection for transfers reads accepted rows (admin preferred, earliest tie).

## caregiver_invites
- **Purpose:** pending/accepted caregiver invitations.
- **Key columns:** `invited_by_account_id`, `email` (invitee) _(others verify)_.
- **Ownership:** sender (`invited_by_account_id`).
- **Deletion:** by `invited_by_account_id` OR `email` = user email (step 5).

## memory_clusters
- **Purpose:** AI grouping of related memories (`lib/build-clusters.ts`).
- **Key columns:** `user_id`, cluster fields _(verify)_.
- **Ownership:** `user_id`.
- **Deletion:** by `user_id` (step 1).

## device_registrations
- **Purpose:** push notification device/token registry (OneSignal).
- **Key columns:** `user_id`, token/device fields _(verify)_.
- **Ownership:** `user_id`.
- **Deletion:** by `user_id` (step 6).

## pending_account_deletions (new; migration not yet applied)
- **Purpose:** resumable recovery if auth-user deletion fails after data/storage
  deletion.
- **Columns:** `user_id` (PK), `email`, `requested_at`, `data_deleted_at`,
  `storage_deleted_at`, `status`, `last_error`, `attempts`, `updated_at`.
- **Access:** RLS on, **service-role only** (no policies).

## users  ⚠️ DOES NOT EXIST
Referenced by `/api/save-onesignal` and `/api/save-subscription` (`from('users')`)
but **absent from the schema** ("table not found"). Those endpoints are broken.
Real push registry is `device_registrations`.

## Tombstone account (new; migration)
Fixed id `00000000-0000-0000-0000-000000000001` ("Deleted Contributor"), used as
the anonymised author for retained cross-contributed memories. Strategy pending
FK confirmation of `memories.user_id` (recommended: **sentinel UUID** if no FK;
Admin-API-created auth user if FK→auth.users — NOT raw SQL insert).
