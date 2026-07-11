# RemyNest Data Deletion Policy

**Effective date:** 5 June 2026
**Last updated:** 5 June 2026

This Data Deletion Policy explains how RemyNest enables you to delete your data and your
account, what happens when you do, how long deletion takes, and how deletion propagates
to backups and third parties. It is designed to satisfy Apple App Store Guideline 5.1.1(v)
(account deletion), Google Play's account/data deletion requirements, and the erasure
right under GDPR/UK GDPR (Article 17). A public-facing summary and an account-deletion
URL are published at https://www.remynest.com (see the Support page content).

## 1. Your deletion options at a glance

| You want to… | How | Where |
|---|---|---|
| Delete a single memory, note, photo or video | Delete the item | In the app, per item |
| Export a copy of all your data first | Use "Export my data" | In-app Privacy/Profile section |
| Delete your entire account and all associated data | Use "Delete my account" | In-app Privacy/Profile section |
| Request deletion without app access | Email us | privacy@remynest.com |

You do **not** need to contact support to delete your account — in-app self-service
deletion is provided, as required by Apple and Google.

## 2. User-initiated deletion (in-app)

### 2.1 Deleting individual content
You can delete any individual memory, note, photo or video at any time. Deleted items
are removed from your live account immediately and become unrecoverable after the backup
cycle described in Section 5.

### 2.2 Account deletion workflow
1. Open RemyNest → **Profile / Settings → Privacy → Delete my account**.
2. The app explains what will be deleted and offers a **data export** first.
3. You confirm the action (re-authentication may be required to protect you).
4. Your account is **immediately deactivated** and queued for permanent deletion.
5. We send a confirmation to your registered email when permanent deletion completes.

### 2.3 What is deleted
Permanent account deletion removes, in dependency order:

- stored media (photos/videos and, in future, voice recordings/transcriptions);
- memories and memory clusters;
- notes and reminders;
- profile relationships, family/caregiver links and pending invitations;
- device/notification registrations and push tokens;
- memory profiles; and
- your account profile and authentication identity (email/password and OAuth links).

After completion, you can no longer sign in, and your content cannot be recovered.

## 3. Deletion requested by email or support

If you cannot access the app, email **privacy@remynest.com** from your registered
address (or otherwise allow us to verify your identity). We will:

1. verify your identity to prevent unauthorised deletion;
2. action the deletion; and
3. confirm completion in writing.

We respond to erasure requests within **one month**, extendable by up to two further
months for complex requests, with notice (GDPR Article 12(3)).

## 4. Timing

| Stage | Timeframe |
|---|---|
| Account deactivation (no further sign-in) | Immediate |
| Permanent deletion from live/production systems | Within **30 days** (typically much sooner) |
| Deletion from rolling backups | Within **30 days** of deletion from production |
| Confirmation to user | On completion |

## 5. Backups

Encrypted backups are retained on a rolling cycle for disaster-recovery purposes. When
you delete content or your account, the data is removed from live systems first and then
ages out of backups within **30 days**. We do not restore deleted personal data from
backups except where necessary to recover the Service from an incident, in which case any
re-introduced data scheduled for deletion is re-deleted promptly.

## 6. Third-party processors

On account deletion we also issue deletion to, or rely on data-processing terms with,
our sub-processors that hold related data, including:

- **Supabase** (database, authentication, storage) — deletion of the database records
  and stored media, and deletion of the Supabase auth user;
- **OpenAI** — API content is not retained for model training; transient processing
  data is handled per OpenAI's retention terms for API data;
- **OneSignal** — the local device/registration records are deleted from our database.
  NOTE (accuracy): deletion of the device at OneSignal itself is a tracked follow-up
  — until it ships, the push identifier may persist at OneSignal per its retention terms;
- **Stripe** (payment processor) — billing records are retained by Stripe only as
  legally required (see Section 7). NOTE: automatic subscription cancellation / Stripe
  customer deletion on account deletion is a tracked follow-up; **cancel any active
  subscription before deleting your account** to stop future charges;
- **error/diagnostics provider (Sentry)** — diagnostics are PII-scrubbed and age out per
  the provider's log-retention window.

## 7. Data we may retain after deletion (and why)

We may retain limited data where the law requires or permits, strictly for the stated
purpose and for no longer than necessary:

| Retained data | Reason | Period |
|---|---|---|
| Billing/transaction and tax records | Legal/accounting obligations | Typically 6–7 years |
| Records of the deletion request/consent | Demonstrate compliance | Up to 6 years |
| Minimal abuse/security records | Fraud and safety; legal claims | As necessary, then deleted |

Retained records are minimised, access-controlled, and not used to re-identify you for
any other purpose.

## 7a. Shared care profiles — ownership transfer

If you delete your account while you **own** a care profile (`memory_profile`)
that other **accepted** caregivers also use, ownership of that profile is
**transferred** to another accepted caregiver so the shared care record is
preserved for everyone who depends on it. The successor is chosen
deterministically: an accepted caregiver with **admin** access is preferred,
with ties broken by the **earliest** relationship. Your own relationship to that
profile is then removed. If **no** accepted successor exists, the profile is
deleted together with your account.

## 7b. Memories contributed to other people's profiles

Memories you authored inside **someone else's** care profile are, by default,
**retained** as part of that person's record with your **authorship anonymised**
(attributed to a non-identifying "Deleted Contributor" placeholder). We never
re-attribute your entries to another real person, because doing so would create
an inaccurate care/memory record. The content, timestamps and chronology are
preserved; your identity link is removed (so the retained data is no longer your
personal data). During deletion you may instead choose to **permanently delete**
these contributed memories.

## 8. Effect on shared content

If you shared content with family members or caregivers, deleting your account removes
content you own. Content that another account holder created or independently saved
within their own account remains theirs. We provide controls to manage shared access;
you remain responsible for content you have chosen to share.

## 9. Contact

- Privacy / deletion: **privacy@remynest.com**
- Data Protection Officer: **dpo@remynest.com**
- Public account-deletion information page:
  **https://www.remynest.com/account-deletion** *(publish this URL; required by Apple
  and Google as the externally reachable deletion instruction page).*
