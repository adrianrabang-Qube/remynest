# Data Protection Impact Assessment (DPIA) — Article 35

> DRAFT — documents RemyNest's actual implementation as of 2026-07-11. Internal operational record; the legally-operative version requires review/approval by qualified data-protection counsel. [CONFIRM] markers need operator input.

**Effective date:** 2026-07-11
**Controller:** RemyNest — [CONFIRM: registered legal entity + address]
**Primary contact:** admin@remynest.com
**Data Protection Officer:** [CONFIRM if appointed]
**EU/UK Article 27 representative:** [CONFIRM if applicable]
**Assessment reference:** RemyNest DPIA v1 (informed by the RC3 compliance audit)

---

## 1. Screening — why a DPIA is required

Under GDPR Article 35(1) a DPIA is mandatory where processing is "likely to result in a high risk to the rights and freedoms of natural persons." RemyNest's processing meets several of the Article 35(3) / EDPB WP248 high-risk triggers, so a DPIA is required rather than optional.

| Trigger | Present in RemyNest? | Basis |
|---|---|---|
| Special-category / Article 9 data at scale | **Yes** | Free-text memory content, media, and reminder titles MAY constitute health data. It is processed for every account holder using those features. |
| Data concerning vulnerable data subjects | **Yes** | **Care recipients** are third parties whose data is recorded by the account holder; they may lack capacity, be vulnerable, and may not be reachable in-app. |
| Innovative use / AI processing of personal data | **Yes** | Health-adjacent content is submitted to OpenAI for categorisation, summaries, embeddings, Ask Remy chat, and story narration (a RAG flow). |
| Matching / combining datasets | **Partial** | People, memories, reminders, and caregiver relationships are linked into a per-workspace graph. |
| Data processed about individuals who did not provide it themselves | **Yes** | Care-recipient data is supplied by the account holder, not the data subject. |
| International transfers of the above to a third country | **Yes** | AI content, push content, diagnostics, and hosting involve US processing. |

**Conclusion of screening:** Three independent high-risk factors (special-category health-adjacent content at scale; AI processing of that content; data about third-party, potentially-vulnerable care recipients) each independently justify a DPIA. This assessment proceeds on that basis.

---

## 2. Systematic description of the processing (Article 35(7)(a))

### 2.1 Nature and context

RemyNest is a family-memory and caregiving application (Next.js 14 on Supabase + Vercel, with a Capacitor iOS wrapper that loads the live site). Account holders record memories, media, reminders, and people for themselves or for a **care recipient**, and may invite caregivers into a shared care workspace.

### 2.2 Data subjects

- **(a) Account holders** — adults who create and control an account.
- **(b) Invited caregivers** — adults granted scoped access to a care workspace.
- **(c) Care recipients** — third parties whose data the account holder records; **may be vulnerable, may lack capacity, and may not be reachable within the app.**

### 2.3 Data categories

| Category | Examples | Sensitivity |
|---|---|---|
| Account data | email, name, preferred name, `date_of_birth`, country | Personal |
| Memory content | free-text narratives | **May be Art 9 health data** |
| Media | photos/videos; may depict third parties; may carry **EXIF geolocation** (lat/long/placeName) | PHI-adjacent, location |
| Reminders | titles set by the user | **May be health-related** |
| People | names/aliases/roles of relatives and care recipients | Personal (third-party) |
| Caregiver relationships + invites | who has access to which workspace | Personal |
| Push device tokens | device/push tokens, `external_id` | Personal (identifier) |
| Billing metadata | via Stripe (email, transaction/subscription data) | Personal / financial |
| AI usage metadata | provider/model/token-counts/cost/latency/status — **no prompt or content** | Operational metadata |
| Error diagnostics | error messages/stack traces (PII-scrubbed) | Operational |
| Storage-accounting ledger | file sizes | Operational |

### 2.4 Processors (subprocessors) and data flows

The complete and accurate subprocessor list. **There is no analytics processor and no standalone email subprocessor — Supabase sends authentication email.**

| Processor | Purpose | Data processed | Location / transfer |
|---|---|---|---|
| **Supabase** | Database, authentication, cloud storage, auth email | Account data, memory content, media, auth data, all app tables | Cloud hosting; encryption at rest; SCCs where applicable |
| **OpenAI** | AI categorisation, summaries, embeddings, Ask Remy chat, story narration | Content submitted to AI features (memory titles/summaries/people names) + embeddings | US; SCCs; contractually no model training on API content |
| **OneSignal** | Push notifications | Push/device tokens, account identifier (`external_id`), **notification content** (e.g. reminder titles, which may be health-related) | US; SCCs |
| **Stripe** | Subscription billing (**web checkout only**; no native purchase UI per Apple 3.1.1) | Email, payment/transaction/subscription data | SCCs; PCI-DSS payment processor |
| **Sentry** | Error/crash diagnostics | Error messages/stack traces/diagnostic context, **PII-scrubbed** (`sendDefaultPii=false`; `beforeSend` strips cookies/headers/body and redacts emails; Session Replay disabled) | US/EU; SCCs |
| **Vercel** | Application hosting/delivery | Technical/log data, IP | Cloud hosting; SCCs |

### 2.5 The AI (RAG) flow to OpenAI — described explicitly

1. A user creates or edits a memory, reminder, or person, or asks a question via Ask Remy / requests story narration.
2. Relevant content (memory titles/summaries, people names, and embeddings) is submitted to **OpenAI** for categorisation, summarisation, embedding generation, chat answering, or narration.
3. Responses are returned to the app; **only AI usage metadata** (provider/model/token-counts/cost/latency/status) is retained by RemyNest — **not the prompt or content**.
4. OpenAI processes this content in the **US** under SCCs, contractually **not** used for model training.

> **Retention note:** OpenAI's default API retention is **up to 30 days** unless Zero-Data-Retention (ZDR) is enabled. **[CONFIRM: ZDR status]** — until confirmed, this DPIA assumes up-to-30-day processor-side retention of submitted content.

---

## 3. Necessity & proportionality assessment (Article 35(7)(b))

For each purpose, the processing is assessed against necessity, the lawful basis, and proportionality (data minimisation / least-intrusive means).

### 3.1 Lawful bases

- **Contract** — service provision (accounts, memories, reminders, caregiver workspaces, billing).
- **Consent** — especially for special-category health content and notifications.
- **Legitimate interests** — security, service operation and improvement.
- **Legal obligation** — where applicable (e.g. responding to rights requests).
- **Special-category (Art 9) basis = explicit consent of the uploading account holder.**

### 3.2 Purpose-by-purpose

| Purpose | Necessary? | Lawful basis | Proportionality |
|---|---|---|---|
| Store & display memories/media | Yes — core service | Contract; explicit consent for Art 9 content | User controls what is uploaded; private bucket; per-workspace isolation |
| Reminders + push delivery | Yes — core caregiving function | Contract; consent for notifications | Only reminder title/token/`external_id` sent to OneSignal |
| AI categorisation/summaries/embeddings/chat/narration | Yes — for the intelligent-memory features the user opts into | Consent; legitimate interests | Only titles/summaries/people names + embeddings sent; no training; metadata-only retention. **Gap: no granular AI opt-out toggle yet (§6).** |
| Caregiver collaboration | Yes — core caregiving function | Contract; consent | Access is scoped by `access_level`; owner-only invite/revoke |
| Billing | Yes — paid tiers | Contract | Web-only Stripe checkout; RemyNest stores billing metadata only |
| Error diagnostics | Yes — security & reliability | Legitimate interests | PII-scrubbed; Session Replay disabled |
| Storage accounting | Yes — quota enforcement | Legitimate interests; contract | File sizes only |

### 3.3 The care-recipient necessity concern

Processing care-recipient data is **necessary** to deliver caregiving functionality, but the care recipient does **not** provide their own consent. The Art 9 basis currently rests on the **uploading account holder**, who is required by **ToS §3.3** to attest authority; RC3 added an in-form authority note. This is a **known proportionality gap** carried to §6.

---

## 4. Risks to data subjects (Article 35(7)(c))

Likelihood and severity are each scored **Low / Medium / High**; the combined rating reflects both before mitigation.

| # | Risk | Affected subjects | Likelihood | Severity | Inherent rating |
|---|---|---|---|---|---|
| R1 | Unauthorised access to health-adjacent memory content/media | All | Medium | High | **High** |
| R2 | Care-recipient data processed without the care recipient's own lawful basis / knowledge | Care recipients | High | High | **High** |
| R3 | Cross-workspace leakage (a caregiver or user seeing another workspace's data) | All | Low–Medium | High | **Medium–High** |
| R4 | AI transfer of health-adjacent content to the US (OpenAI) | Account holders, care recipients | Medium | Medium–High | **Medium–High** |
| R5 | Processor-side non-erasure after account deletion (Stripe customer/subscription; OneSignal device) | Account holders | High | Medium | **Medium–High** |
| R6 | EXIF geolocation exposure revealing home/care locations of vulnerable people | Care recipients, account holders | Medium | Medium–High | **Medium–High** |
| R7 | Notification content (health-related reminder titles) exposed on device lock screen or at OneSignal | Account holders, care recipients | Medium | Medium | **Medium** |
| R8 | Storage-orphan / TTL gaps leaving data beyond need (ai_usage, orphaned media, local confirmations) | All | Medium | Low–Medium | **Medium** |
| R9 | Rights not fully self-service (rectification of care-profile name / DOB / country; no AI opt-out) | All | Medium | Low–Medium | **Medium** |
| R10 | Failed final auth-user deletion leaving a residual auth record (`auth_pending`, no retry cron) | Account holders | Low | Medium | **Medium** |

---

## 5. Measures & mitigations already in place (Article 35(7)(d))

These map to the Article 32 controls and the RC1/RC2/RC3 hardening work.

### 5.1 Technical security (Art 32)

- **Postgres RLS** on all tables; **service-role client always scoped by session-derived user id** (mitigates R1, R3).
- **Protect-by-default middleware** that **fails closed to `/login`** for non-public routes (R1, R3).
- **Private media bucket** served only via **short-lived signed URLs**; **server-generated owner-scoped storage paths** (`users/{userId}/…`) (R1, R6).
- **Re-authentication before account deletion** (password for email users; recent-login for OAuth) (R1).
- **Dependency-free API rate limiting** on sensitive endpoints; **HTTP security headers** (CSP, HSTS 2y preload, `X-Frame-Options: DENY`, nosniff, `Referrer-Policy`, `Permissions-Policy`, COOP) (R1).
- **TLS in transit; Supabase encryption at rest** (R1, R4).
- **Sentry PII scrubbing** (`sendDefaultPii=false`, `beforeSend` strips cookies/headers/body, redacts emails) + **Session Replay disabled**; **PHI/PII kept out of logs** (debug/info dev-gated; errors logged as messages only) (R1, R4).

### 5.2 AI-specific mitigations (R4)

- Only **titles/summaries/people names + embeddings** are sent to OpenAI — not full raw records where avoidable.
- **Contractually no model training** on API content; **US processing under SCCs**.
- RemyNest retains **AI usage metadata only** (no prompt/content).

### 5.3 Data-subject rights implemented (Arts 15–20)

- **Access + Portability** — in-app self-service **Export** (Profile → Settings → Export my data) producing complete JSON including profile, memories, memory_profiles, reminders, people, caregiver relationships/invites, memory_clusters, device_registrations, ai_usage, memory_intelligence, storage_ledger, and media references (RC3 widened coverage).
- **Erasure** — in-app self-service **Delete account** (reauth-gated) → transactional `delete_user_account` RPC (ordered deletes + ownership transfer/tombstone of cross-contributed memories) + recursive private-bucket storage cleanup + Supabase auth-user deletion, resumable via `pending_account_deletions`.
- **Rectification** — partial: `first_name`/`preferred_name` via `PATCH /api/profile`; memory edit via `PUT` (gap noted in §6).

### 5.4 Governance & organisational

- **ToS §3.3** requires the uploader to attest authority over care-recipient data; **RC3 added an in-form authority note** (partial mitigation of R2).
- **72-hour supervisory-authority breach notification** commitment (Art 33); this DPIA formalises the runbook.
- Web-only billing (Stripe), keeping payment-card handling entirely within a PCI-DSS processor (R1).

---

## 6. Residual risks & planned remediations (Article 35(7)(d))

Honest accounting of the gaps that remain **after** the §5 mitigations. These are open items, not resolved controls.

| Ref | Residual risk | Residual rating | Planned remediation | Owner / status |
|---|---|---|---|---|
| R2 | Care recipient's **own** Art 9 basis rests on the uploader; the care recipient may be unaware and unreachable | **High** | Strengthen authority attestation; explore care-recipient transparency/notice mechanisms; legal review of the reliance-on-uploader model | [CONFIRM owner] — open |
| R4 | OpenAI processes submitted content in the US; **ZDR status unconfirmed** (default retention up to 30 days) | **Medium–High** | **[CONFIRM: enable/verify OpenAI Zero-Data-Retention]**; document ZDR in the subprocessor register | [CONFIRM owner] — open |
| R5 | On deletion the app deletes local rows + storage + Supabase auth user but does **not** yet (a) cancel the **Stripe** subscription / delete the Stripe customer, nor (b) delete the **OneSignal** player/device | **Medium–High** | Add processor-side erasure calls to the deletion flow | Tracked follow-up |
| R6 | **EXIF geolocation** in uploaded media may expose vulnerable people's locations | **Medium–High** | Server-side EXIF stripping on upload (roadmap) | Open |
| R8 | TTL/erasure gaps: `ai_usage` has no purge/rollup TTL; **no orphan-sweeper** for unattached storage objects; per-memory delete + edit-removed attachments orphan bytes until account deletion; `reminder_local_confirmations` not yet in the deletion RPC | **Medium** | Add retention TTL/rollup for `ai_usage`; build orphan-sweep cron; enrol `reminder_local_confirmations` in deletion RPC | Tracked follow-ups |
| R9 | **Rectification partial** — care-profile name and own DOB/country not self-editable; **no granular AI opt-out toggle**; Restriction/Objection only via contact | **Medium** | Extend self-service rectification; add AI opt-out; add self-service restriction/objection | Open |
| R10 | A failed final auth-user deletion (`auth_pending`) has **no unattended retry cron** | **Medium** | Add a retry cron for stalled deletions | Open |
| Infra | **Point-in-time recovery deferred** post-launch on cost; daily backups are the recovery baseline (accepted coarser-RPO risk) | **Low–Medium** | Enable PITR at scale | Decided-deferred |
| Governance | **No `/.well-known/security.txt`** yet; `security@`/`privacy@`/`dpo@` intake addresses referenced aspirationally | **Low** | Provision intake mailboxes; add a one-line middleware allowlist for `security.txt` | Roadmap |

**Aspirational contacts:** documents reference `privacy@remynest.com`, `dpo@remynest.com`, and `security@remynest.com`. **[CONFIRM: which of these mailboxes are provisioned]**; until then `admin@remynest.com` is the operative contact.

---

## 7. Conclusion & sign-off

**Assessment outcome:** The processing carries genuine high-risk factors (health-adjacent special-category content at scale, AI processing of that content, and data about third-party potentially-vulnerable care recipients). A substantial set of Article 32 technical and organisational measures (RLS, protect-by-default auth, private signed-URL media, scoped service-role access, rate limiting, security headers, PII-scrubbed diagnostics, reauth-gated self-service export/erasure) reduce several inherent high risks to medium or lower.

**Material residual risks remain** — notably the care-recipient lawful-basis reliance model (R2), the unconfirmed OpenAI ZDR status (R4), and processor-side non-erasure of Stripe/OneSignal records (R5). These are **not yet fully mitigated** and are tracked as open remediation items.

**Consultation:** Where residual high risk cannot be sufficiently mitigated, Article 36 **prior consultation** with the supervisory authority must be considered before/for the affected processing. **[CONFIRM: whether prior consultation is required]** following counsel review — this is flagged specifically for R2.

**Recommendation:** Proceed with the documented remediation plan; re-score R2, R4, and R5 once remediated. This DPIA must be reviewed by qualified data-protection counsel before it is treated as legally operative.

### Sign-off

| Role | Name | Signature | Date |
|---|---|---|---|
| Preparer | [CONFIRM] | | 2026-07-11 |
| Data Protection Officer (or accountable owner) | [CONFIRM if appointed] | | [CONFIRM] |
| Controller representative | [CONFIRM: legal entity signatory] | | [CONFIRM] |
| Data-protection counsel review | [CONFIRM] | | [CONFIRM] |

**Next review date:** 2027-07-11, or earlier upon any material change to processing, processors, the AI flow, or the care-recipient basis model (whichever is sooner).

---

*Related documentation:* RC3 compliance audit; RemyNest subprocessor register; Article 30 records of processing; breach-response runbook (Art 33).
