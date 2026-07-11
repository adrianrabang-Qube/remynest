> DRAFT — documents RemyNest's actual implementation as of 2026-07-11. Internal operational record; the legally-operative version requires review/approval by qualified data-protection counsel. [CONFIRM] markers need operator input.

# Subprocessor List

**Effective date:** 2026-07-11

This is the authoritative, standalone register of the subprocessors RemyNest engages to
provide its service. It is the canonical source for Privacy Policy §13 (Subprocessors); if
the Privacy Policy and this register diverge, this register governs and must be reconciled.

**Controller:** RemyNest — [CONFIRM: registered legal entity + registered address].
**Contact:** admin@remynest.com (privacy@ / dpo@remynest.com are referenced aspirationally
elsewhere — [CONFIRM: provisioned]).

A "subprocessor" here means a third party engaged by RemyNest that processes personal data
of our data subjects (account holders, invited caregivers, and recorded care recipients) on
our behalf.

---

## Current subprocessors

The following six processors — and only these six — are engaged as of the effective date.

| Subprocessor | Function | Personal data processed | Location / transfer safeguard | DPA |
|---|---|---|---|---|
| **Supabase** | Managed Postgres database, authentication, and cloud object storage (incl. auth/transactional email) | Account data (email, name, preferred name, date of birth, country); memory content (free-text, may include Art 9 health data); media (photos/videos, may carry EXIF geolocation); reminders; people records; caregiver relationships and invites; and all other application tables | Cloud hosting. Encryption at rest; TLS in transit. Standard Contractual Clauses where applicable | [CONFIRM: Supabase DPA executed] |
| **OpenAI** | AI categorisation, summaries, embeddings, Ask Remy chat, and story narration | Content submitted to AI features (memory titles/summaries, people names) and derived embeddings. No prompt/content is retained in RemyNest's own AI logs — only usage metadata (provider/model/token counts/cost/latency/status) | United States. Standard Contractual Clauses. Contractually no model training on API content. **Note:** OpenAI's default API retention is up to 30 days unless Zero-Data-Retention is enabled — [CONFIRM: ZDR status] | [CONFIRM: OpenAI DPA executed] |
| **OneSignal** | Push notification delivery | Push/device tokens; the account identifier (`external_id`); and notification **content** (e.g. reminder titles set by the user, which may be health-related) | United States. Standard Contractual Clauses | [CONFIRM: OneSignal DPA executed] |
| **Stripe** | Subscription billing (web checkout only; no native/in-app purchase UI, per Apple 3.1.1) | Email; payment, transaction, and subscription data | Standard Contractual Clauses. Stripe is a PCI-DSS Level 1 payment processor | [CONFIRM: Stripe DPA executed] |
| **Sentry** | Error and crash diagnostics | Error messages, stack traces, and diagnostic context. PII-scrubbed: `sendDefaultPii=false` plus a `beforeSend` that strips cookies/headers/body and redacts emails; Session Replay disabled | United States / EU. Standard Contractual Clauses | [CONFIRM: Sentry DPA executed] |
| **Vercel** | Application hosting and delivery | Technical/log data and IP address | Cloud hosting. Standard Contractual Clauses | [CONFIRM: Vercel DPA executed] |

---

## What is NOT engaged

For accuracy and to avoid over-stating our data-sharing footprint, we record the following
explicit exclusions as of the effective date:

- **No analytics or advertising processor.** RemyNest does not use Google Analytics,
  PostHog, or any comparable product analytics / advertising / attribution service.
- **No standalone transactional-email subprocessor.** RemyNest does not use Resend,
  SendGrid, Postmark, or any dedicated email vendor. Authentication and transactional email
  is sent by **Supabase** (listed above); no separate email processor is engaged.

If either of these categories changes, the processor will be added to the table above under
the change-notification process below.

---

## International transfers

Processing by OpenAI, OneSignal, Sentry, Vercel, and Stripe involves personal data being
processed in the United States. Each transfer relies on the EU Standard Contractual Clauses
(and the UK International Data Transfer Addendum / IDTA, or an adequacy decision, where
applicable). See the "Location / transfer safeguard" column above.

---

## How we notify of changes

RemyNest maintains this register as the authoritative record. When we intend to add or
replace a subprocessor, we will update this document (with a new effective date) and, where
required, provide advance notice through the channels described in our Privacy Policy and
Data Processing Agreement so that objections can be raised before the change takes effect.
[CONFIRM: notice mechanism and notice period once the DPA is finalised.]

## Requesting our DPA

Customers and data subjects may request RemyNest's Data Processing Agreement, or ask
questions about these subprocessors, by contacting **admin@remynest.com**
([CONFIRM: dedicated privacy@remynest.com intake if provisioned]).

---

*Internal accountability note: executed DPAs with each subprocessor should be confirmed and
linked from this register. The [CONFIRM: DPA] markers above indicate where that confirmation
is still outstanding.*
