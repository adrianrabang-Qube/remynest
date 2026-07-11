> DRAFT — documents RemyNest's actual implementation as of 2026-07-11. Internal operational record; the legally-operative version requires review/approval by qualified data-protection counsel. [CONFIRM] markers need operator input.

# Data Retention Policy

**Effective date:** 2026-07-11
**Owner:** RemyNest ([CONFIRM: registered legal entity + address])
**Contact:** admin@remynest.com ([CONFIRM: privacy@remynest.com provisioned])
**Data Protection Officer:** [CONFIRM if appointed]

---

## 1. Purpose and scope

This policy sets out how long RemyNest retains each category of personal data it processes, and the event or trigger that causes that data to be deleted or anonymised. It reflects the app's **actual implementation** as of the effective date, including known limitations. It applies to all personal data processed through the RemyNest application (a Next.js application on Supabase and Vercel, with a Capacitor iOS wrapper that loads the live site).

RemyNest processes health-adjacent and potentially special-category (GDPR Art 9) personal data. Retention is therefore governed by data-minimisation and storage-limitation principles (Art 5(1)(c), 5(1)(e)): personal data is kept only while it is needed to provide the service, and is erased or anonymised when that need ends — subject to the known gaps documented in Section 5.

---

## 2. Governing principle

**Personal data is retained while the account is active.** When an account holder deletes their account, their personal data is erased or anonymised through the transactional deletion process described in Section 4. RemyNest does not operate a fixed calendar-based retention window for active accounts; retention is keyed to account lifecycle and to the specific triggers in the schedule below.

Certain subprocessors retain limited data independently to meet their own legal obligations — most notably **Stripe**, which retains billing and transaction records as a regulated payment processor. Those processor-side retention periods are outside RemyNest's direct control (see Section 3, billing metadata row, and Section 5).

---

## 3. Retention schedule

| Data category | Retention | Deletion / anonymisation trigger |
|---|---|---|
| **Account data** (email, name, preferred name, date_of_birth, country) | While account is active | Account deletion → transactional `delete_user_account` RPC + Supabase auth-user deletion |
| **Memory content** (free-text; may be special-category Art 9 health data) | While account is active | Account deletion (erased); individual memory delete (row removed). **Note:** memory-delete removes the row but orphans its storage bytes until account deletion — see Section 5 |
| **Media** (photos/videos in the private bucket; PHI-adjacent; may depict third parties; may carry EXIF geolocation) | While account is active | Account deletion → recursive private-bucket storage cleanup (`users/{userId}/…`). Per-memory or edit-removed media orphans bytes until account deletion — see Section 5 |
| **Reminders** (titles may be health-related) | While account is active | Account deletion → transactional RPC. `reminder_local_confirmations` rows are **not yet** enrolled in the deletion RPC — see Section 5 |
| **People** (names/aliases/roles of relatives and care recipients) | While account is active | Account deletion → transactional RPC |
| **Caregiver relationships + invites** | While the relationship/invite exists, or while account is active | Owner revokes caregiver access (relationship row deleted); account deletion → transactional RPC |
| **Push device tokens** (device registrations; account identifier `external_id`) | While account is active | Account deletion removes `device_registrations` rows locally. **The OneSignal player/device is NOT yet deleted at the processor** — see Section 5 |
| **Billing metadata** (email, payment/transaction/subscription data — held via Stripe) | While account is active, in-app | Account deletion removes local billing references. **Stripe retains billing/transaction records for its own legal (e.g. tax, anti-fraud, PCI-DSS) obligations**, and the **Stripe subscription/customer is NOT yet cancelled/deleted at the processor on account deletion** — see Section 5 |
| **AI usage metadata** (provider/model/token-counts/cost/latency/status — **no prompt or content**) | While account is active | Account deletion removes `ai_usage` rows. **No purge/rollup TTL yet** — see Section 5 |
| **Memory intelligence** (cached classification/cluster, recall counters — 1:1 with memories) | While account is active | Cascade-deleted with the parent memory; account deletion → transactional RPC |
| **Storage-accounting ledger** (file sizes) | While account is active | Maintained incrementally by trigger; removed on account deletion → transactional RPC |
| **Error diagnostics** (Sentry error messages/stack traces/diagnostic context; PII-scrubbed) | Per Sentry's configured retention window | Governed by Sentry's retention configuration; PII scrubbed at source (`sendDefaultPii=false` + `beforeSend` strips cookies/headers/body and redacts emails; Session Replay disabled) [CONFIRM: exact Sentry retention window] |
| **Backups** (daily database backups — the recovery baseline) | Per backup rotation | Aged out per backup rotation. Point-in-time recovery is deferred post-launch on cost; daily backups are the recovery baseline [CONFIRM: exact backup rotation period] |

---

## 4. Account-deletion behaviour

Account holders can delete their account via in-app self-service (Profile → Settings → Delete account). The flow is **re-authentication-gated** (password for email users; recent-login/OAuth reauth for OAuth users). On confirmation:

- A **transactional `delete_user_account` RPC** performs ordered deletes across the account's tables.
- **Cross-contributed memories** (memories the deleting user contributed to another workspace) are **transferred in ownership or tombstoned/anonymised** rather than destroyed, so co-owned records are not lost for other members.
- **Recursive private-bucket storage cleanup** removes the account's media under `users/{userId}/…`.
- The **Supabase auth user is deleted**.
- The process is **resumable** via a `pending_account_deletions` record if it is interrupted.

Data erasure at RemyNest's own infrastructure is therefore transactional and near-complete at the point of account deletion, subject to the processor-side and gap items in Section 5.

---

## 5. Known retention gaps (remediation planned)

The following are **honestly acknowledged limitations** in current retention/erasure coverage. They are tracked follow-ups, not accepted permanent states.

**RemyNest-side (data model / TTL):**

- **`ai_usage` metadata TTL** — the `ai_usage` table has **no purge or rollup TTL**. Rows accumulate for the life of the account. (No prompt or memory content is stored in this table — metadata only.)
- **Orphan storage objects** — files uploaded but never attached to a memory have **no orphan-sweeper**; they remain in the private bucket, uncounted, until account deletion.
- **Per-memory / edit-orphaned bytes** — deleting a single memory, or removing an attachment during a memory edit, **orphans the underlying storage bytes** until account deletion (the row/reference is removed, but the object is not swept).
- **`reminder_local_confirmations`** — these rows are **not yet enrolled in the `delete_user_account` RPC** and are not cleaned up on account deletion.
- **`auth_pending` / failed final deletion** — if the final Supabase auth-user deletion fails, the deletion is marked pending but there is **no unattended retry cron**; recovery currently depends on the resumable `pending_account_deletions` mechanism being re-triggered.

**Processor-side erasure gaps (subprocessors):**

- **Stripe** — on account deletion, RemyNest does **not** yet cancel the subscription or delete the Stripe customer at the processor. Stripe additionally retains billing/transaction records for its own legal obligations regardless.
- **OneSignal** — on account deletion, the **OneSignal player/device record is not yet deleted** at the processor (local `device_registrations` rows are removed).

Both processor-side items are tracked follow-ups.

---

## 6. Backups and recovery

Daily database backups are the recovery baseline. **Point-in-time recovery is deferred post-launch on cost grounds.** Personal data present in a backup persists for the duration of the backup rotation and cannot be selectively erased from an individual backup snapshot ahead of that rotation; erasure requests are satisfied against live systems, with backup copies aging out on the normal cycle. [CONFIRM: exact backup rotation period]

---

## 7. Review

This policy should be reviewed at least annually and whenever a retention-affecting change is made (new subprocessor, new data category, new TTL/sweeper, schema change). Material changes should be reflected here and in the associated subprocessor and privacy records in the same change.

---

### Open items requiring operator confirmation

- [CONFIRM: registered legal entity + address]
- [CONFIRM: privacy@remynest.com / dpo@remynest.com provisioned]
- [CONFIRM: DPO appointed]
- [CONFIRM: exact Sentry retention window]
- [CONFIRM: exact backup rotation period]
