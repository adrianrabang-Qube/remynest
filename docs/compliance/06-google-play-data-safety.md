# Google Play Data Safety Form — Completed Disclosures

Enter these answers in Play Console → **App content → Data safety**. Google asks, for
each data type, whether it is **Collected** and/or **Shared**, whether it is
**processed ephemerally**, whether collection is **required or optional**, and the
**purposes**. It also asks security questions (encryption in transit, deletion, etc.).

## Section 1 — Overview answers

| Play Console question | Answer |
|---|---|
| Does your app collect or share any of the required user data types? | **Yes** |
| Is all user data encrypted in transit? | **Yes** (TLS) |
| Do you provide a way for users to request that their data be deleted? | **Yes** — in-app account deletion **and** https://www.remynest.com/account-deletion |
| Have you committed to follow the Play Families Policy? | **No** (app is not directed to children) — set appropriate content rating/target age |
| Do you share data with third parties? | **No** for third-party/independent use. Data goes only to **service providers (processors)**, which Google treats as "collection," not "sharing." |
| Is any collected data "sold"? | **No** |

## Section 2 — Data types: Collected / Shared / Purpose / Optionality

> "Shared" = transfer to a third party for their own use → **No** for all types.
> Service providers (Supabase, OpenAI, OneSignal, Vercel, payment processor, diagnostics,
> optional analytics) = **Collected**, not Shared.

| Data category | Data type | Collected | Shared | Processed ephemerally | Required/Optional | Purposes |
|---|---|---|---|---|---|---|
| **Personal info** | Name | Yes | No | No | Required | App functionality; Account management |
| **Personal info** | Email address | Yes | No | No | Required | App functionality; Account management; (optional) Communications |
| **Personal info** | User IDs | Yes | No | No | Required | App functionality; Account management |
| **Photos and videos** | Photos | Yes | No | No | Optional | App functionality |
| **Photos and videos** | Videos | Yes | No | No | Optional | App functionality |
| **Files and docs** | Files/documents (user content/notes) | Yes | No | No | Optional | App functionality |
| **Audio** (future) | Voice/sound recordings | Yes (future) | No | No | Optional | App functionality |
| **App activity** | App interactions (usage/analytics) | Yes¹ | No | No | Optional | Analytics; App functionality |
| **App info & performance** | Crash logs | Yes | No | No | Required | App functionality; Diagnostics |
| **App info & performance** | Diagnostics/performance | Yes | No | No | Required | App functionality; Diagnostics |
| **App info & performance** | Other app performance data (error logs) | Yes | No | No | Required | App functionality |
| **Device or other IDs** | Device or other IDs (push token/device id) | Yes | No | No | Required | App functionality (push notifications) |
| **Financial info** | Purchase history | Yes² | No | No | Optional | App functionality; Account management |
| **Location** | — | No | — | — | — | Not collected |
| **Health and fitness** | — | No | — | — | — | Not collected |
| **Contacts** | — | No | — | — | — | Not collected |
| **Messages** | — | No | — | — | — | Not collected |

¹ App activity (usage/analytics): declare **Collected = Yes** only if Google
Analytics/PostHog ships and is enabled (consent-gated). If launching without analytics,
set **Collected = No**.
² Purchase history: declare if you record subscription/transaction status. If billing is
entirely via Google Play and you keep only entitlement status, you may still disclose
"Purchase history → App functionality/Account management."

## Section 3 — Security practices (as asked by Play)

| Question | Answer |
|---|---|
| Is data encrypted in transit? | **Yes** — all traffic over TLS/HTTPS. |
| Is data encrypted at rest? | **Yes** — database and stored media encrypted at rest. *(Note: Play's form primarily asks about in-transit; document at-rest in the listing/privacy policy.)* |
| Can users request deletion of their data? | **Yes** — in-app **Delete my account** and email privacy@remynest.com; public page at /account-deletion. |
| Do you follow a documented data-deletion process? | **Yes** — see Data Deletion Policy. |
| Is there a way for users to request data export? | **Yes** — in-app **Export my data**. |
| Has the app been independently reviewed against a security standard? | **Optional** — answer **No** unless/until you complete one (e.g., SOC 2). |
| Committed to Play's Families Policy? | **No** — not a child-directed app. |

## Section 4 — User controls to declare

- Users can **edit and delete individual content**.
- Users can **export all their data** (portability).
- Users can **delete their account and all associated data** in-app and via the web.
- Users can **manage notification permissions** in-app and in device settings.
- Users can **withdraw analytics consent** (where analytics is enabled).

## Section 5 — Consistency requirements (must match)
Your Data Safety answers must be consistent with: the in-app behaviour, the **Privacy
Policy** at https://www.remynest.com/privacy, the **manifest permissions**
(`07-app-permissions-inventory.md`), and the **Apple Privacy Labels**
(`05-apple-privacy-nutrition-labels.md`). Update all four together if data practices
change. Declaring analytics only if shipped, and never declaring "Shared = Yes" for
processors, keeps the disclosures accurate.
