# GDPR Export Report (Launch Blocker #1)

**Date:** 2026-06-05
**Scope:** Export only. No deletion. No schema changes. No production data changes.

---

## 1. User-owned data sources (audit)

Every table keyed to a single user, and the ownership column used to scope it:

> **RC3 update (2026-07-11, schemaVersion 1.1):** the collector was widened to
> include `people`, `ai_usage`, `memory_intelligence`, and `storage_ledger`
> (previously omitted). See the refreshed table below.

| Source | Ownership key | In export |
|---|---|---|
| `profiles` (account profile) | `id = user.id` | ✅ `profile` |
| `memory_profiles` | `created_by_account_id = user.id` | ✅ `memoryProfiles` |
| `memories` | `user_id = user.id` | ✅ `memories` |
| `reminders` | `user_id = user.id` | ✅ `reminders` |
| `profile_relationships` | `caregiver_account_id = user.id` | ✅ `caregiverRelationships` |
| `caregiver_invites` (sent) | `invited_by_account_id = user.id` | ✅ `caregiverInvitesSent` |
| `caregiver_invites` (received) | `email = user.email` | ✅ `caregiverInvitesReceived` |
| `memory_clusters` | `user_id = user.id` | ✅ `memoryClusters` |
| `device_registrations` | `user_id = user.id` | ✅ `deviceRegistrations` |
| `people` (names/aliases/roles) | `created_by_account_id = user.id` | ✅ `people` (RC3) |
| `ai_usage` (AI usage metadata) | `user_id = user.id` | ✅ `aiUsage` (RC3; operator-gated table) |
| `memory_intelligence` (per-memory signals) | `user_id = user.id` | ✅ `memoryIntelligence` (RC3; operator-gated table) |
| `storage_ledger` (file-size accounting) | `user_id = user.id` | ✅ `storageLedger` (RC3; operator-gated table) |
| Media (Storage) | from `memories.cover_image_url` + `memories.attachments[]` | ✅ `mediaReferences` (URLs/paths, not binaries — Art 20 binary-delivery is a tracked enhancement) |
| `memory_person_links` | join of exported `people` × `memories` | ⚪ omitted — reconstructable from `people` + `memories` |

`auth.users` itself is not duplicated; the account identity is captured under
`account` (`userId`, `email`). Operator-gated tables (`ai_usage`,
`memory_intelligence`, `storage_ledger`) degrade to an empty array if their
migration is not yet applied (the read resolves to `{ data: null }`, never throws).

---

## 2. Implementation

### Endpoint
`GET /api/gdpr/export` — [app/api/gdpr/export/route.ts](../app/api/gdpr/export/route.ts)
- Authenticates via the RLS-bound server client (`getUser`); returns **401** if
  unauthenticated.
- Returns the payload as a **downloadable JSON file**:
  `Content-Type: application/json`,
  `Content-Disposition: attachment; filename="remynest-data-export-YYYY-MM-DD.json"`,
  `Cache-Control: no-store`.

### Collector
[lib/gdpr/collect-user-data.ts](../lib/gdpr/collect-user-data.ts)
- Gathers all sources above, each scoped strictly by the authenticated user's
  `id` / `email`.
- Uses the **service-role client for reads only** (never writes), so
  data-portability is complete even where RLS would otherwise hide rows. The
  route authenticates the user before the collector is called.
- Extracts `mediaReferences` (memory id, URL, kind, name, mime) from each
  memory's `cover_image_url` and `attachments[]`.
- Adds `exportedAt`, `schemaVersion`, and per-source `counts`.

### UI
[components/profile/sections/GDPRSection.tsx](../components/profile/sections/GDPRSection.tsx)
- Converted from placeholder copy to a client component with a working
  **"Download my data"** button that fetches the endpoint and triggers a
  client-side file download. Export-only (no deletion UI).

---

## 3. Payload shape

```json
{
  "exportedAt": "ISO-8601",
  "schemaVersion": "1.0",
  "account": { "userId": "...", "email": "..." },
  "profile": { ... } | null,
  "memoryProfiles": [...],
  "memories": [...],
  "reminders": [...],
  "caregiverRelationships": [...],
  "caregiverInvitesSent": [...],
  "caregiverInvitesReceived": [...],
  "memoryClusters": [...],
  "deviceRegistrations": [...],
  "mediaReferences": [{ "memoryId", "url", "kind", "name?", "mimeType?" }],
  "counts": { ... }
}
```

---

## 4. Tests

[e2e/gdpr-export.spec.ts](../e2e/gdpr-export.spec.ts) (project `gdpr-export`):

| Test | Result |
|---|---|
| Authenticated → 200, `application/json`, `attachment` disposition, all expected keys, scoped to account | ✅ |
| Unauthenticated → 401 / redirect to `/login`, no data leaked | ✅ |

**4 passed** (incl. setup). `npm run lint` ✅ · `npm run build` ✅.

---

## 5. Files created / modified

**Created:** `lib/gdpr/collect-user-data.ts`, `app/api/gdpr/export/route.ts`,
`e2e/gdpr-export.spec.ts`, `docs/GDPR_EXPORT_REPORT.md`.
**Modified:** `components/profile/sections/GDPRSection.tsx`, `playwright.config.ts`.

No schema, billing, or production data changes. Deletion intentionally excluded.

---

## 6. Remaining risks / follow-up

- **Media is referenced, not bundled.** The export lists media URLs/paths, not the
  binary files. A future enhancement could produce a ZIP including downloaded
  media (signed URLs may expire).
- **Service-role reads:** the collector uses the service-role key and is safe only
  because every query is scoped to the authenticated user's id/email and the
  route authenticates first. Any new query added here must preserve that scoping.
- **Large accounts:** the payload is assembled in memory and returned in one
  response. For very large accounts, consider streaming or async export later.
- **Verification depth:** the test account has no memories, so array population is
  covered structurally; a richer fixture would assert non-empty contents.
- **GDPR Deletion (Blocker #2)** is the natural next step and remains unbuilt.
