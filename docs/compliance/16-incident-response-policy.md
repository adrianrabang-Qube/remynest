> DRAFT — documents RemyNest's actual implementation as of 2026-07-11. Internal operational record; the legally-operative version requires review/approval by qualified data-protection counsel. [CONFIRM] markers need operator input.

# Incident Response & Data-Breach Policy

**Controller:** RemyNest — [CONFIRM: registered legal entity + address]
**Effective date:** 2026-07-11
**Owner:** [CONFIRM: incident owner / DPO if appointed]
**Primary intake:** security@remynest.com [CONFIRM provisioned] · fallback admin@remynest.com
**Scope:** All production systems processing personal data — the Next.js 14 app (Vercel), Supabase (database, auth, storage), the Capacitor iOS wrapper (loads the live site), and all subprocessors (OpenAI, OneSignal, Stripe, Sentry, Vercel, Supabase).

---

## 1. Purpose & scope

This policy is RemyNest's operational runbook for **security incidents** and **personal-data breaches** under **GDPR Art 33** (notification to the supervisory authority) and **Art 34** (communication to data subjects). It defines what qualifies, who does what, and the end-to-end lifecycle from detection to post-incident review.

RemyNest processes **special-category (Art 9) health-adjacent data** (free-text memory content, media that may depict third parties, reminder titles that may be health-related) and data about **vulnerable care recipients** who are third parties and may lack capacity or be unreachable in-app. This raises the likelihood that a breach affects **"high risk to the rights and freedoms of natural persons"**, so the Art 34 threshold must be assessed carefully in every case.

---

## 2. Definitions

| Term | Definition |
|---|---|
| **Security incident** | Any event that may compromise the confidentiality, integrity, or availability of RemyNest systems or data (e.g. suspicious login, misconfiguration, dependency vulnerability, service outage). Not every incident is a personal-data breach. |
| **Personal-data breach** | (GDPR Art 4(12)) A breach of security leading to the accidental or unlawful **destruction, loss, alteration, unauthorised disclosure of, or access to** personal data. A subset of security incidents. |
| **Confidentiality breach** | Unauthorised or accidental **disclosure of / access to** personal data (e.g. leaked signed URL, IDOR, subprocessor exposure). |
| **Integrity breach** | Unauthorised or accidental **alteration** of personal data. |
| **Availability breach** | Accidental or unlawful **loss of access to / destruction of** personal data (e.g. data-loss event, unrecoverable deletion, prolonged outage of a critical store). |
| **Special-category breach** | Any breach involving Art 9 data — for RemyNest, health-adjacent memory content/media/reminder titles. Treated as elevated severity by default. |

**Rule of thumb:** if personal data was, or may have been, accessed/disclosed/altered/lost by someone who should not have it, or made unrecoverable, treat it as a **personal-data breach** and start the Art 33 clock (see §6).

---

## 3. Roles & responsibilities

Small-team model — one person may hold several roles; document who holds each at incident time.

| Role | Responsibility |
|---|---|
| **Incident Lead** | Owns the incident end-to-end: declares severity, coordinates response, makes the containment call, owns the timeline. Default: operator ([CONFIRM]). |
| **Data Protection lead / DPO** | Assesses Art 33/34 applicability, drafts/approves regulator + data-subject notifications, owns the breach register. [CONFIRM: DPO appointed?] If no DPO, this sits with the operator with counsel review. |
| **Technical responder** | Investigates, contains, eradicates, recovers; pulls evidence from Sentry, Supabase, Vercel logs; coordinates with subprocessors. |
| **Communications** | Drafts data-subject and (if needed) public/App-Store communications; single point for inbound queries. |
| **Legal counsel** | External data-protection counsel — reviews the Art 34 high-risk determination and regulator notification before submission. [CONFIRM: retained counsel]. |

**Reporting a suspected incident:** anyone (operator, contractor, user, security researcher) reports to **security@remynest.com** [CONFIRM provisioned]. No `/.well-known/security.txt` is published yet (middleware allowlist entry is on the roadmap), so the intake address must be discoverable via the privacy notice.

---

## 4. Incident lifecycle

```
Detect → Triage & Severity → Contain → Eradicate → Recover → Notify → Post-incident review
```

### 4.1 Detect
Sources of signal:
- **Sentry** — error/crash spikes, new exception classes, auth/permission errors (PII-scrubbed: `sendDefaultPii=false`, `beforeSend` strips cookies/headers/body and redacts emails; Session Replay disabled).
- **Supabase** — auth logs, Postgres logs, storage access, RLS-denied patterns, unexpected service-role activity.
- **Vercel** — function logs, traffic anomalies, rate-limit 429 patterns (`lib/security/rate-limit.ts`).
- **Subprocessor notifications** — a breach notice from Supabase, OpenAI, OneSignal, Stripe, Sentry, or Vercel.
- **External report** — a user or security researcher emailing security@.

Log the report immediately in the **breach register** (§9) with a timestamp — this timestamp anchors the Art 33 "became aware" assessment.

### 4.2 Triage & severity
The Incident Lead + DP lead classify within **hours, not days**:

| Severity | Criteria | Example |
|---|---|---|
| **SEV-1 (Critical)** | Confirmed breach of special-category data, large-scale exposure, or unrecoverable data loss; likely **high risk** → Art 34 territory. | Care-recipient health memories exposed via broken authorization; unrecoverable loss of the `memories` store. |
| **SEV-2 (High)** | Confirmed or probable personal-data breach, limited scope, unlikely to be "high risk" but Art 33-notifiable. | Signed-URL leak affecting a small number of media objects; a single-account unauthorised access. |
| **SEV-3 (Medium)** | Security incident with **no** confirmed personal-data impact. | Contained misconfiguration caught before exposure; dependency CVE with no evidence of exploitation. |
| **SEV-4 (Low)** | Minor security event, no data impact, informational. | Blocked automated scan; rate-limited abuse. |

Assess and record: **what data categories** (account / memory content [possible Art 9] / media [possible Art 9 + third parties + EXIF geo] / reminders / people / caregiver relationships / push tokens / billing metadata / AI usage metadata / error diagnostics / storage ledger), **whose** (account holders / caregivers / **care recipients — third parties, possibly vulnerable**), **how many**, and **whether special-category**.

### 4.3 Contain
Stop the bleeding. Stack-specific containment options:
- **Supabase** — rotate `SUPABASE_SERVICE_ROLE_KEY` and anon/JWT secrets; revoke sessions; tighten/patch RLS; disable an affected table/endpoint; revoke exposed signed URLs by rotating the storage signing key (media bucket is **private**, served only via short-lived signed URLs).
- **Vercel** — rotate environment secrets; roll back to a known-good deployment; disable an affected route.
- **App-layer** — the protect-by-default middleware fails closed to `/login`; force re-auth; block an abused user id via the rate limiter.
- **OpenAI** — rotate `OPENAI_API_KEY`; if content exposure via AI features is suspected, pause the AI execution path (single execution seam) and contact OpenAI.
- **OneSignal** — rotate the API key; if push tokens or notification content are exposed, suspend sends and contact OneSignal.
- **Stripe** — rotate keys; Stripe is a PCI-DSS processor holding card data (RemyNest sees only email + transaction/subscription metadata).
- **Sentry** — rotate DSN/tokens if diagnostic data is implicated.

Preserve evidence **before** destructive containment (snapshot logs — see §7).

### 4.4 Eradicate
Remove the root cause: patch the vulnerable code path, fix the misconfiguration, revoke compromised credentials fully, confirm no persistence/backdoor. Track the fix as a code change with review.

### 4.5 Recover
Restore normal service and verify integrity: redeploy the fix, confirm from logs that the vector is closed, restore data from **daily backups** if needed (note: **point-in-time recovery is deferred post-launch on cost**, so the recovery point objective is coarser — up to ~24h — for availability/integrity breaches). Monitor Sentry/Supabase/Vercel for recurrence.

### 4.6 Notify
Execute the Art 33 / Art 34 decisions from §5–6. Do **not** delay containment/eradication waiting on notification, and do not delay the Art 33 clock waiting for a complete picture (Art 33 allows phased notification).

### 4.7 Post-incident review
Within **10 business days** of closure, conduct a blameless review: timeline, root cause, what detection/containment worked, corrective actions with owners + dates, and whether a policy/register update is needed. File the review with the register entry.

---

## 5. When to notify — decision criteria

### 5.1 Art 33 — supervisory authority (the 72-hour rule)
Notify the competent supervisory authority **without undue delay and, where feasible, not later than 72 hours after becoming aware** of a personal-data breach, **unless** the breach is **unlikely to result in a risk** to the rights and freedoms of natural persons.

- **"Became aware"** = when RemyNest has a reasonable degree of certainty that a security incident led to personal data being compromised. Record this timestamp precisely.
- If the risk is genuinely negligible (e.g. exposure of properly encrypted data with no key compromise, or no personal data actually affected), notification may be **omitted** — but the reasoning **must be documented** in the register.
- If the full facts are not yet known at 72 hours, submit an **initial notification** and follow up in phases (Art 33(4)).
- [CONFIRM: identity of the competent lead supervisory authority — depends on the establishment / main-establishment and the Art 27 representative question below.]
- [CONFIRM: whether an EU/UK Art 27 representative is appointed and thus which authorities are in scope.]

### 5.2 Art 34 — affected data subjects
Communicate to the affected data subjects **without undue delay** when the breach is likely to result in a **high risk** to their rights and freedoms.

RemyNest-specific high-risk indicators (any one pushes toward notification):
- Exposure/alteration of **special-category health-adjacent** memory content, media, or reminder titles.
- Data about **care recipients** who are vulnerable / lack capacity / are not reachable in-app (raises severity and complicates who is notified — the account holder is the reachable contact).
- Media EXIF **geolocation** disclosure (physical-safety dimension).
- Credential/session compromise enabling account takeover.

If notifying individuals directly is a disproportionate effort, a **public communication** or equivalent measure may substitute (Art 34(3)(c)) — decision + rationale recorded in the register. Exemptions (Art 34(3)) — e.g. the data was rendered unintelligible via encryption, or subsequent measures ensure the high risk is no longer likely — may apply and **must be documented**.

**Note on care recipients:** because the care recipient is a third party recorded by the account holder, their Art 9 basis currently rests on the uploader (a **known gap**; ToS §3.3 requires the uploader to attest authority). In a breach affecting care-recipient data, the **account holder** is normally the reachable data subject to notify; the DP lead should document whether and how the care recipient themselves can/should be informed.

---

## 6. Notification contents

### 6.1 Art 33 notification to the supervisory authority must include
1. **Nature of the breach** — including, where possible, categories and approximate **number of data subjects** and **number of personal-data records** concerned.
2. **Contact point** — name and contact details of the DPO or other contact where more information can be obtained ([CONFIRM: dpo@remynest.com / DPO name]).
3. **Likely consequences** of the breach.
4. **Measures taken or proposed** to address the breach and mitigate possible adverse effects.
5. (If phased) a statement that information will follow.

### 6.2 Art 34 communication to data subjects must
- Be in **clear and plain language**.
- Describe the **nature** of the breach.
- Include items 2–4 above (contact point, likely consequences, measures taken/proposed).
- Provide **practical guidance** to the individual (e.g. reset password, review recent activity, be alert to misuse).

Draft notifications are reviewed by the DP lead and [CONFIRM: external counsel] before submission/sending.

---

## 7. Evidence & logging

Preserve evidence for the investigation, the register, and any regulator interaction:

| Source | Evidence captured | Cautions |
|---|---|---|
| **Sentry** | Error messages, stack traces, diagnostic context, timeline of exception onset. | PII-scrubbed by design (no cookies/headers/body; emails redacted; Replay disabled) — do **not** re-enable PII capture to investigate; correlate by timestamp instead. |
| **Supabase** | Auth logs (logins, token issuance), Postgres logs, storage access, RLS-denied events, service-role activity. | Snapshot before rotating keys. |
| **Vercel** | Function logs, request/traffic patterns, rate-limit 429s, deployment history. | Logs are retention-limited — export promptly. |
| **Subprocessor** | Any breach notice / logs provided by OpenAI, OneSignal, Stripe, Sentry, Vercel. | Request in writing; record receipt time. |
| **App data layer** | `ai_usage` (metadata only — provider/model/token-counts/cost/latency/status; **no prompt or content**), `storage_ledger`, `pending_account_deletions`, relevant table rows. | Handle any exported PII per this policy; do not paste PHI/PII into the register or tickets. |

**Evidence hygiene:** the register and incident tickets must **not** contain PHI/PII (memory content, names, emails, media). Reference records by id, not by content. This mirrors the app's logging posture (logger dev-gates `debug`/`info`; errors logged as messages only; PHI/PII kept out of logs).

---

## 8. Subprocessor breach coordination

If a breach originates at or involves a subprocessor, the subprocessor's own notification duty to RemyNest (as controller) triggers RemyNest's Art 33 clock upon becoming aware. Contacts to engage:

| Subprocessor | Data at stake | On breach |
|---|---|---|
| **Supabase** | Account, memory content, media, auth, all app tables | Engage support/security; rotate service-role + JWT; assess RLS/storage exposure. |
| **OpenAI** | Content submitted to AI features (titles/summaries/people names) + embeddings | Rotate key; confirm no-training-on-API-content term held; [CONFIRM Zero-Data-Retention status — default API retention up to 30 days if ZDR not enabled]. |
| **OneSignal** | Push/device tokens, external_id, **notification content** (health-related reminder titles) | Rotate key; suspend sends; assess token + content exposure. |
| **Stripe** | Email, payment/transaction/subscription data | PCI-DSS processor; engage Stripe; note RemyNest holds no card numbers. |
| **Sentry** | Error messages/traces/diagnostic context (PII-scrubbed) | Rotate DSN; assess diagnostic exposure. |
| **Vercel** | Technical/log data, IP | Rotate secrets; roll back; assess log exposure. |

All above involve **US processing under Standard Contractual Clauses** (and UK IDTA / adequacy where applicable) — a transfer dimension to note in any cross-border-relevant breach.

---

## 9. Breach register template

A running register of **all** personal-data breaches (and near-misses / notable security incidents) is maintained per Art 33(5) — including those **not** notified, with the reasoning. Store securely; **no PHI/PII in free-text fields** (reference by id).

| Field | Value |
|---|---|
| **Incident ID** | INC-YYYY-NNN |
| **Date/time detected (UTC)** | |
| **Date/time "became aware" (UTC)** | (anchors the Art 33 72h clock) |
| **Reported by / detection source** | Sentry / Supabase / Vercel / subprocessor / external report |
| **Incident Lead** | |
| **Severity** | SEV-1 / 2 / 3 / 4 |
| **Personal-data breach?** | Yes / No / Under assessment |
| **Breach type** | Confidentiality / Integrity / Availability |
| **Data categories affected** | account / memory content (Art 9?) / media (Art 9?, EXIF geo?) / reminders / people / caregiver relationships / push tokens / billing metadata / AI usage metadata / diagnostics / storage ledger |
| **Special-category (Art 9) involved?** | Yes / No |
| **Data subjects affected** | account holders / caregivers / **care recipients (vulnerable third parties)** — approx. count |
| **Records affected** | approx. count |
| **Subprocessor involved** | Supabase / OpenAI / OneSignal / Stripe / Sentry / Vercel / none |
| **Root cause** | |
| **Containment actions + timestamps** | |
| **Eradication / fix (code ref)** | |
| **Recovery actions** | (incl. backup restore + RPO note if availability) |
| **Art 33 notification?** | Yes (date/time, authority, ref) / No (documented reason) |
| **Art 34 notification?** | Yes (date/time, method) / No (documented reason, incl. any Art 34(3) exemption) |
| **Post-incident review** | Link/date |
| **Corrective actions (owner, due date)** | |
| **Status** | Open / Contained / Closed |

---

## 10. Contacts

| Purpose | Contact |
|---|---|
| Incident intake / security reports | security@remynest.com [CONFIRM provisioned] |
| Data-protection / DPO | dpo@remynest.com [CONFIRM provisioned] · [CONFIRM: DPO name if appointed] |
| Privacy inquiries | privacy@remynest.com [CONFIRM provisioned] |
| Operator / fallback | admin@remynest.com |
| External data-protection counsel | [CONFIRM: retained counsel] |
| Competent supervisory authority | [CONFIRM: lead authority] |
| EU/UK Art 27 representative | [CONFIRM if applicable] |

---

## 11. Residual risks & open items

This is an internal accountability record — the following gaps affect breach handling and are tracked:

- **Intake not yet provisioned** — security@ / dpo@ / privacy@ addresses are referenced aspirationally; confirm they route to a monitored inbox. No `/.well-known/security.txt` published (middleware allowlist entry on the roadmap) → external reporters may struggle to find the intake.
- **Governance placeholders** — legal entity/address, DPO appointment, competent supervisory authority, and EU/UK Art 27 representative are unconfirmed; these are prerequisites for a valid Art 33 filing.
- **Processor-side erasure gaps** (relevant if a breach compels full deletion): account deletion does **not** yet (a) cancel the Stripe subscription / delete the Stripe customer, nor (b) delete the OneSignal player/device at the processor.
- **Retention/TTL gaps** affecting evidence + data minimisation: `ai_usage` has no purge/rollup TTL; no orphan-sweeper for unattached storage objects; per-memory delete + edit-removed attachments orphan storage bytes until account deletion; `reminder_local_confirmations` not enrolled in the deletion RPC; a failed final auth-user deletion (`auth_pending`) has no unattended retry cron.
- **Recovery point objective** — daily backups only (PITR deferred on cost) → availability/integrity breaches may lose up to ~24h of data.
- **OpenAI retention** — default API retention up to 30 days unless Zero-Data-Retention is enabled [CONFIRM ZDR status]; affects exposure scope of AI-submitted content in an OpenAI-side incident.
- **Care-recipient notification** — no in-app channel to the care recipient themselves; their Art 9 basis rests on the uploader (known gap; ToS §3.3 attestation) → Art 34 notification in practice reaches the account holder, not necessarily the care recipient.

---

*This runbook is reviewed at least annually and after any SEV-1/SEV-2 incident. Legally-operative use requires review/approval by qualified data-protection counsel.*
