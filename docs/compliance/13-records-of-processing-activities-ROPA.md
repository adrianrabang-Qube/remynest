> DRAFT — documents RemyNest's actual implementation as of 2026-07-11. Internal operational record; the legally-operative version requires review/approval by qualified data-protection counsel. [CONFIRM] markers need operator input.

# Records of Processing Activities (ROPA) — Article 30

**Effective date:** 2026-07-11
**Document type:** Internal accountability record — GDPR Article 30(1) (controller ROPA)
**Status:** Draft for counsel review

---

## 1. Controller identity & contacts

| Field | Value |
|---|---|
| Controller (legal entity) | RemyNest — [CONFIRM: registered legal entity name] |
| Registered address | [CONFIRM: registered address] |
| General / primary contact | admin@remynest.com |
| Privacy contact | privacy@remynest.com — [CONFIRM provisioned] |
| Data Protection Officer | [CONFIRM: DPO name/contact if appointed]; dpo@remynest.com — [CONFIRM provisioned] |
| Security intake | security@remynest.com — [CONFIRM provisioned] |
| EU/UK Article 27 representative | [CONFIRM if applicable] |

**Nature of processing:** RemyNest is a family-memory and caregiving application. It handles health-adjacent, potentially special-category (Article 9) personal data — memory content, media, and reminders may relate to a person's health. It is a Next.js 14 application on Supabase and Vercel, with a Capacitor iOS wrapper that loads the live site.

**Categories of data subjects across all activities:**
- **(a) Account holders** — adults who register and operate an account.
- **(b) Invited caregivers** — adults granted access to a care workspace.
- **(c) Care recipients** — third parties whose data an account holder records; **may be vulnerable, may lack capacity, and may not be reachable in-app**. Their Article 9 basis currently rests on the uploader's attestation of authority (a known gap — see §10).

**Processors (subprocessors) referenced below** — the complete, accurate list. There is **no analytics processor** and **no standalone email subprocessor** (Supabase sends authentication email):

| Processor | Role | Location / transfer safeguard |
|---|---|---|
| Supabase | Database, authentication, cloud storage | Cloud hosting; encryption at rest; SCCs where applicable |
| OpenAI | AI categorisation, summaries, embeddings, Ask Remy, story narration | US; SCCs; no model training on API content; default API retention up to 30 days unless ZDR enabled [CONFIRM ZDR] |
| OneSignal | Push notifications | US; SCCs |
| Stripe | Subscription billing (web checkout only) | SCCs; PCI-DSS payment processor |
| Sentry | Error/crash diagnostics | US/EU; SCCs |
| Vercel | Application hosting / delivery | Cloud hosting; SCCs |

**Common Article 32 security baseline** (applies to every activity; see §9 for the reference set): Postgres Row-Level Security; protect-by-default middleware that fails closed to `/login`; private media bucket served only via short-lived signed URLs; server-generated owner-scoped storage paths; service-role database access always scoped by session-derived user id; API rate limiting on sensitive endpoints; HTTP security headers (CSP, HSTS 2y preload, X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy, COOP); re-authentication before account deletion; Sentry PII scrubbing with Session Replay disabled; TLS in transit; Supabase encryption at rest; PHI/PII kept out of application logs.

---

## 2. Activity — Account management & authentication

| Field | Detail |
|---|---|
| **Purpose(s)** | Create and manage user accounts; authenticate users; provide and maintain the service under the terms of use. |
| **Lawful basis** | **Contract** (Art 6(1)(b)) for account provision and authentication; **legitimate interests** (Art 6(1)(f)) for account security. |
| **Art 9 condition** | Not applicable (account identity data is not special-category). |
| **Data subjects** | Account holders; invited caregivers. |
| **Personal data** | Email, name, preferred name, date of birth, country; authentication data (credentials/session managed by Supabase Auth). |
| **Recipients / processors** | Supabase (database, authentication — including authentication email); Vercel (hosting); Sentry (diagnostics, PII-scrubbed). |
| **International transfers** | Supabase, Vercel, Sentry — US processing under SCCs (UK IDTA / adequacy where applicable). |
| **Retention** | Retained while the account is active; deleted/anonymised on account deletion (self-service Delete → transactional `delete_user_account` RPC + Supabase auth-user deletion). Daily backups are the recovery baseline. |
| **Security (Art 32)** | Full baseline (§9); notably protect-by-default middleware, RLS, re-authentication before deletion. |

---

## 3. Activity — Memory & media storage

| Field | Detail |
|---|---|
| **Purpose(s)** | Allow account holders to record, store, organise, view, and edit memories (free text) and media (photos/videos); organise memories into people and clusters. |
| **Lawful basis** | **Contract** (Art 6(1)(b)) for storage/retrieval; **consent** (Art 6(1)(a)) where content is health-related; **legitimate interests** (Art 6(1)(f)) for service operation. |
| **Art 9 condition** | **Explicit consent** (Art 9(2)(a)) of the uploading account holder, where memory content / media / people data constitutes special-category health data. The care recipient's own Art 9 basis currently rests on the uploader's attestation of authority (ToS §3.3; RC3 added an in-form authority note) — a known gap (§10). |
| **Data subjects** | Account holders; care recipients; other third parties who may appear in memory content or media. |
| **Personal data** | Memory content (free text, **may be special-category health data**); media (photos/videos — PHI-adjacent, may depict third parties, may carry EXIF geolocation lat/long/placeName); people (names/aliases/roles of relatives/care recipients); memory clusters; storage-accounting ledger (file sizes). |
| **Recipients / processors** | Supabase (database + private storage bucket); Vercel (hosting/delivery). |
| **International transfers** | Supabase, Vercel — US processing under SCCs (UK IDTA / adequacy where applicable). |
| **Retention** | Retained while the account is active; deleted on account deletion (transactional RPC + recursive private-bucket storage cleanup + ownership transfer/tombstone of cross-contributed memories). **Known gaps:** per-memory delete and edit-removed attachments orphan their storage bytes until account deletion; uploaded-but-unattached objects have no orphan-sweeper (§10). |
| **Security (Art 32)** | Full baseline (§9); notably private bucket + short-lived signed URLs, server-generated owner-scoped storage paths, RLS. |

---

## 4. Activity — AI features (categorisation / summaries / embeddings / Ask Remy / story)

| Field | Detail |
|---|---|
| **Purpose(s)** | AI-assisted categorisation, summaries, semantic embeddings, the Ask Remy chat, and story narration over the account holder's own memory data. |
| **Lawful basis** | **Consent** (Art 6(1)(a)) for AI processing of content; **legitimate interests** (Art 6(1)(f)) for service operation/improvement; **contract** (Art 6(1)(b)) where AI features are part of the service. |
| **Art 9 condition** | **Explicit consent** (Art 9(2)(a)) of the account holder, where content submitted to AI features is special-category health data. Note: there is **no granular AI opt-out toggle yet** (§10). |
| **Data subjects** | Account holders; care recipients and third parties named in the content submitted. |
| **Personal data** | Content submitted to AI features (memory titles/summaries/people names) and embeddings. **AI usage metadata only** is persisted internally (provider/model/token-counts/cost/latency/status — **no prompt or content**). |
| **Recipients / processors** | OpenAI (AI processing); Supabase (stores embeddings + AI-usage metadata); Vercel (hosting). |
| **International transfers** | OpenAI — US processing under SCCs. Supabase/Vercel as above. |
| **Retention** | Embeddings and AI-usage metadata retained while the account is active; deleted on account deletion (`ai_usage` is included in export/delete). **Processor-side:** OpenAI default API retention is **up to 30 days** unless Zero-Data-Retention is enabled [CONFIRM ZDR status]; contractually no model training on API content. **Known gap:** `ai_usage` has no purge/rollup TTL yet (§10). |
| **Security (Art 32)** | Full baseline (§9); prompt/content excluded from logs; only metadata persisted internally. |

---

## 5. Activity — Reminders & push notifications

| Field | Detail |
|---|---|
| **Purpose(s)** | Schedule and deliver reminders (device-local on iOS, server-cron fallback on web) and push notifications to the account holder. |
| **Lawful basis** | **Contract** (Art 6(1)(b)) for reminder delivery; **consent** (Art 6(1)(a)) for notifications. |
| **Art 9 condition** | **Explicit consent** (Art 9(2)(a)) where a reminder title is health-related. |
| **Data subjects** | Account holders. |
| **Personal data** | Reminder titles (**may be health-related**); push/device tokens; the account identifier (`external_id`); notification **content** delivered via the push provider (e.g. reminder titles). |
| **Recipients / processors** | OneSignal (push notifications — processes device tokens, the account identifier, **and notification content**); Supabase (reminder + device data); Vercel (cron/delivery). |
| **International transfers** | OneSignal — US processing under SCCs. Supabase/Vercel as above. |
| **Retention** | Reminder and device data retained while the account is active; deleted on account deletion. **Known gaps:** on account deletion the app does **not yet delete the OneSignal player/device at the processor**; `reminder_local_confirmations` rows are not yet enrolled in the deletion RPC (§10). |
| **Security (Art 32)** | Full baseline (§9); device tokens scoped to the owning account. |

---

## 6. Activity — Subscription billing

| Field | Detail |
|---|---|
| **Purpose(s)** | Process subscription payments and manage subscription state (web checkout only; no native purchase UI, per Apple 3.1.1). |
| **Lawful basis** | **Contract** (Art 6(1)(b)) for billing the subscription; **legal obligation** (Art 6(1)(c)) for financial/tax record-keeping. |
| **Art 9 condition** | Not applicable (billing data is not special-category). |
| **Data subjects** | Account holders. |
| **Personal data** | Email; payment/transaction/subscription data (billing metadata); handled by Stripe as a PCI-DSS payment processor. |
| **Recipients / processors** | Stripe (billing); Supabase (subscription-state metadata); Vercel (webhook handling). |
| **International transfers** | Stripe — processing under SCCs (UK IDTA / adequacy where applicable). |
| **Retention** | Subscription metadata retained while the account is active. **Known gap:** on account deletion the app does **not yet cancel the Stripe subscription or delete the Stripe customer** at the processor (§10). Stripe retains transaction records per its own obligations. |
| **Security (Art 32)** | Full baseline (§9); card data handled by Stripe (not stored by RemyNest); Stripe endpoints rate-limited. |

---

## 7. Activity — Caregiver collaboration

| Field | Detail |
|---|---|
| **Purpose(s)** | Allow an account holder to invite caregivers, grant access-level-scoped access to a care workspace, and manage/revoke that access. |
| **Lawful basis** | **Contract** (Art 6(1)(b)) for the collaboration feature; **consent** (Art 6(1)(a)) where shared content is health-related; **legitimate interests** (Art 6(1)(f)) for managing access. |
| **Art 9 condition** | **Explicit consent** (Art 9(2)(a)) of the account holder for special-category content shared into a care workspace. Care-recipient basis rests on the uploader's attestation (§10). |
| **Data subjects** | Account holders (owners); invited caregivers; care recipients. |
| **Personal data** | Caregiver relationships and invites (invitee email, relationship type, access level, invite status); the shared memory/media/reminder/people data of the care workspace (see §3/§5). |
| **Recipients / processors** | Supabase (relationships, invites, workspace data); Vercel (hosting). |
| **International transfers** | Supabase, Vercel — US processing under SCCs. |
| **Retention** | Retained while the relationship/account is active; owner-only revoke immediately withdraws access; deleted on account deletion. |
| **Security (Art 32)** | Full baseline (§9); owner-only invite/revoke, access-level write enforcement, RLS-scoped workspace isolation, target-profile authorization before workspace switch. |

---

## 8. Activity — Error / crash monitoring

| Field | Detail |
|---|---|
| **Purpose(s)** | Diagnose and resolve errors and crashes to maintain service reliability and security. |
| **Lawful basis** | **Legitimate interests** (Art 6(1)(f)) — securing and maintaining the service. |
| **Art 9 condition** | Not intended to process special-category data; diagnostic payloads are PII-scrubbed (see below). |
| **Data subjects** | Account holders; invited caregivers (as incidental subjects of technical diagnostics). |
| **Personal data** | Error messages / stack traces / diagnostic context; technical/log data and IP (via hosting). **PII-scrubbed:** `sendDefaultPii=false` + a `beforeSend` that strips cookies/headers/body and redacts emails; Session Replay disabled. |
| **Recipients / processors** | Sentry (error/crash diagnostics); Vercel (technical/log data, IP). |
| **International transfers** | Sentry — US/EU processing under SCCs; Vercel — US under SCCs. |
| **Retention** | Per processor diagnostic-retention configuration [CONFIRM Sentry retention window]; kept only as needed for diagnostics. |
| **Security (Art 32)** | Full baseline (§9); PII scrubbing at source, Session Replay disabled, PHI/PII excluded from logs. |

---

## 9. Reference — Article 32 security measures

The following technical and organisational measures apply across all activities above:

- **Access control:** Postgres Row-Level Security on all tables; protect-by-default middleware that fails closed (redirect to `/login`) for non-public routes; service-role database access always scoped by session-derived user id.
- **Storage confidentiality:** private media bucket served only via short-lived signed URLs; server-generated owner-scoped storage paths (`users/{userId}/…`); a kept-attachment size re-derivation guard against quota bypass.
- **Transport & at-rest:** TLS in transit; Supabase encryption at rest.
- **Application hardening:** dependency-free API rate limiting on sensitive endpoints; HTTP security headers (CSP, HSTS 2-year preload, X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy, COOP); re-authentication before account deletion.
- **Data minimisation in telemetry:** Sentry PII scrubbing with Session Replay disabled; PHI/PII kept out of application logs (logger dev-gates `debug`/`info`; errors logged as messages only).
- **Recoverability:** daily backups as the recovery baseline (point-in-time recovery deferred post-launch on cost).

---

## 10. Data-subject rights (implementation status)

| Right | Status | Mechanism |
|---|---|---|
| Access + Portability | **Implemented** | In-app self-service Export (Profile → Settings → Export my data) → complete JSON incl. profile, memories, memory_profiles, reminders, people, caregiver relationships/invites, memory_clusters, device_registrations, ai_usage, memory_intelligence, storage_ledger, media references (RC3 widened coverage). |
| Erasure | **Implemented** | In-app self-service Delete account (reauth-gated: password for email users / recent-login for OAuth) → transactional `delete_user_account` RPC (ordered deletes + ownership transfer/tombstone of cross-contributed memories) + recursive private-bucket storage cleanup + Supabase auth-user deletion; resumable via `pending_account_deletions`. |
| Rectification | **Partial (GAP)** | first_name / preferred_name via `PATCH /api/profile`; memory edit via `PUT`. Care-profile name and own DOB/country are **not yet self-editable**. |
| Restriction / Objection | **Partial (GAP)** | Via contact; **no granular AI opt-out toggle yet**. |

---

## 11. Open items / [CONFIRM]

**Placeholders requiring operator input:**
- **[CONFIRM]** Registered legal entity name and address of the controller.
- **[CONFIRM]** Whether privacy@ / dpo@ / security@remynest.com are provisioned (currently aspirational; admin@remynest.com is the operative contact).
- **[CONFIRM]** DPO appointment and contact details (if a DPO is appointed).
- **[CONFIRM]** EU/UK Article 27 representative (if applicable).
- **[CONFIRM]** OpenAI Zero-Data-Retention (ZDR) status — default API retention is otherwise up to 30 days.
- **[CONFIRM]** Sentry diagnostic-retention window.
- **[CONFIRM]** Exact retention periods (days) for each data category where "while account is active" is not the operative rule.

**Known residual risks / gaps (honest accountability record):**
- **Care-recipient Art 9 basis:** rests on the uploading account holder's attestation of authority (ToS §3.3; RC3 in-form authority note). Care recipients may be vulnerable, may lack capacity, and may be unreachable in-app.
- **No granular AI opt-out toggle** for content processed by AI features.
- **Rectification is partial** — care-profile name and own DOB/country are not yet self-editable.
- **Retention / erasure TTL gaps:** `ai_usage` has no purge/rollup TTL; uploaded-but-unattached storage objects have no orphan-sweeper; per-memory delete and edit-removed attachments orphan their storage bytes until account deletion; `reminder_local_confirmations` rows are not yet enrolled in the deletion RPC; a failed final auth-user deletion (`auth_pending`) has no unattended retry cron.
- **Processor-side erasure gaps:** on account deletion the app does **not yet** (a) cancel the Stripe subscription / delete the Stripe customer, nor (b) delete the OneSignal player/device at the processor. Both are tracked follow-ups.
- **Recovery:** point-in-time recovery deferred post-launch (cost); daily backups are the current baseline (accepted coarser-RPO risk).
- **Breach process:** a 72-hour supervisory-authority notification commitment (Art 33) exists; the runbook is being formalised. security@remynest.com is the intended intake **[CONFIRM provisioned]**. No `/.well-known/security.txt` yet (middleware allowlist on the roadmap).

---

*End of ROPA. This internal record must be kept up to date as processing activities, processors, or transfer mechanisms change (Art 30 is a living record).*
