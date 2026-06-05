# Apple Privacy Nutrition Label Assessment (App Store Connect → App Privacy)

This is the completed set of answers to enter in App Store Connect → **App Privacy**.
Apple groups disclosures by **data type** and, for each, asks whether it is **Collected**,
and if so the **purpose(s)**, whether it is **Linked to the user's identity**, and whether
it is **Used for Tracking**. RemyNest performs **no tracking** (no cross-app/website
tracking, no data shared with data brokers, no third-party advertising), so the
"Used for Tracking" answer is **No** for every type, and the app should declare
**"Data Not Used to Track You."**

## Master summary table

| Apple data type | Collected? | Linked to user? | Used for tracking? | Shared with third parties?¹ | Purpose(s) |
|---|---|---|---|---|---|
| **Contact Info — Name** | Yes | Yes | No | Processors only | App Functionality |
| **Contact Info — Email Address** | Yes | Yes | No | Processors only | App Functionality; (optional) Product Personalization/Comms |
| **User Content — Photos or Videos** | Yes | Yes | No | Processors only | App Functionality |
| **User Content — Other User Content** (notes, memories; future: audio) | Yes | Yes | No | Processors only | App Functionality |
| **User Content — Customer Support** | Yes | Yes | No | Processors only | App Functionality (Support) |
| **Identifiers — User ID** | Yes | Yes | No | Processors only | App Functionality |
| **Identifiers — Device ID** (push token/device id) | Yes | Yes | No | Processors only | App Functionality |
| **Identifiers — Advertising ID (IDFA)** | No | — | — | — | Not collected |
| **Diagnostics — Crash Data** | Yes | No² | No | Processors only | App Functionality; Analytics (diagnostics) |
| **Diagnostics — Performance Data** | Yes | No² | No | Processors only | App Functionality; Analytics (diagnostics) |
| **Diagnostics — Other Diagnostic Data** (error logs) | Yes | No² | No | Processors only | App Functionality |
| **Usage Data — Product Interaction** | Yes³ | Yes³ | No | Processors only | Analytics; App Functionality |
| **Identifiers/Usage for advertising** | No | — | — | — | Not collected |
| **Financial Info — Payment Info** | No⁴ | — | — | — | Handled by App Store / payment processor |
| **Location** | No | — | — | — | Not collected |
| **Contacts (address book)** | No | — | — | — | Not collected |
| **Health & Fitness** | No | — | — | — | Not collected (RemyNest is not a health app) |

¹ "Shared with third parties" in Apple's sense generally **excludes service providers
(processors)** acting on RemyNest's behalf. RemyNest does **not** share data with third
parties for their own use, and does not sell data. Therefore answer **No** to "shared
for third-party use."
² Diagnostics are not tied to user identity where technically feasible; if your crash
tool associates an account/user ID, mark Crash/Performance/Other Diagnostics as
**Linked = Yes**.
³ Usage Data (Product Interaction) applies **only if** Google Analytics/PostHog
analytics is enabled. If you launch **without** analytics, set Usage Data → Collected =
**No**. If enabled, it is consent-gated on web; mark Collected = **Yes**, Linked = Yes,
Tracking = No.
⁴ If you sell subscriptions via Apple IAP, Apple processes payment; you typically do not
declare Financial Info as collected by your app. If you process card payments directly
via a payment processor outside IAP, set Financial Info → Payment Info → Collected = Yes
(purpose: App Functionality), Linked = Yes, Tracking = No.

## Per-category detail (as Apple presents it)

### Contact Information
- **Name** — Collected: **Yes**. Purposes: **App Functionality**. Linked: **Yes**.
  Tracking: **No**.
- **Email Address** — Collected: **Yes**. Purposes: **App Functionality**; optionally
  **Product Personalization** and **Developer's Communications** (service/account emails).
  Linked: **Yes**. Tracking: **No**.

### User Content
- **Photos or Videos** — Collected: **Yes**. Purpose: **App Functionality**. Linked:
  **Yes**. Tracking: **No**.
- **Other User Content** (notes, memories, and future voice recordings/transcriptions) —
  Collected: **Yes**. Purpose: **App Functionality**. Linked: **Yes**. Tracking: **No**.
- **Customer Support** — Collected: **Yes**. Purpose: **App Functionality**. Linked:
  **Yes**. Tracking: **No**.

### Identifiers
- **User ID** — Collected: **Yes**. Purpose: **App Functionality**. Linked: **Yes**.
  Tracking: **No**.
- **Device ID** (push token / device registration) — Collected: **Yes**. Purpose:
  **App Functionality** (push notifications). Linked: **Yes**. Tracking: **No**.
- **Advertising Identifier (IDFA)** — **Not collected.** (No ATT prompt required.)

### Diagnostics
- **Crash Data** — Collected: **Yes**. Purpose: **App Functionality**, **Analytics**.
  Linked: **No** (unless tied to user ID). Tracking: **No**.
- **Performance Data** — Collected: **Yes**. Purpose: **App Functionality**,
  **Analytics**. Linked: **No** (unless tied to user ID). Tracking: **No**.
- **Other Diagnostic Data** (error logs) — Collected: **Yes**. Purpose:
  **App Functionality**. Linked: **No** (unless tied to user ID). Tracking: **No**.

### Usage Data
- **Product Interaction** — Collected: **Yes only if analytics enabled**. Purpose:
  **Analytics**, **App Functionality**. Linked: **Yes**. Tracking: **No**.
- If no analytics SDK ships at launch: **Not collected.**

## Tracking declaration
RemyNest displays **"Data Not Used to Track You."** Do **not** integrate the App
Tracking Transparency framework for advertising/tracking, because no tracking occurs. If
analytics is later configured in a way that constitutes "tracking" under Apple's
definition (e.g., sharing with a data broker or linking to third-party data for ads),
the labels and ATT posture must be revised before that change ships.
