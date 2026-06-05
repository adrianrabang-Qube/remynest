# Google Play — Rejection / Policy Risk Audit

Severity key: **🔴 High** · **🟠 Medium** · **🟡 Low**. Mapped to Google Play policy areas.

| # | Risk | Policy area | Severity | Mitigation |
|---|---|---|---|---|
| 1 | **Data safety form inaccurate / inconsistent** with app behaviour or privacy policy | Data safety | 🔴 | Use `06-google-play-data-safety.md`; keep consistent with manifest, Privacy Policy, and actual SDKs; never mark processors as "Shared." |
| 2 | **Health/medical misrepresentation** ("dementia"/"memory loss" implying treatment or diagnosis) | Health content & services; Misrepresentation | 🔴 | Non-medical disclaimers in app + listing + Terms; AI Transparency Statement; avoid clinical terms; describe non-clinical support only. |
| 3 | **No account/data deletion** (in-app + web URL) | Account deletion policy | 🔴 | In-app **Delete my account** + public https://www.remynest.com/account-deletion declared in Play Console. |
| 4 | **Privacy Policy** missing/insufficient or not linked in Console + app | User Data | 🔴 | Publish https://www.remynest.com/privacy; add to Play Console app content + in-app. |
| 5 | **Sensitive/permission overreach** — broad storage (All files access) or unjustified permissions | Permissions & APIs; Photo/Video permissions | 🟠 | Use Photo Picker + scoped media; avoid `MANAGE_EXTERNAL_STORAGE`; declare `POST_NOTIFICATIONS`; justify each permission (`07-app-permissions-inventory.md`). |
| 6 | **Target API level** below current requirement | Target API level policy | 🟠 | Build against the latest required `targetSdkVersion`; keep current. |
| 7 | **UGC policy** — no moderation/report/block for shared content | User-generated content | 🟠 | Provide report/block, content policy in EULA, moderation contact, and removal process. |
| 8 | **Subscriptions via non-Play billing** for digital goods | Payments | 🟠 | Use Google Play Billing for in-app digital subscriptions; show terms; support cancellation. |
| 9 | **Background/foreground service or data use** undisclosed | Data safety; Foreground services | 🟡 | No undisclosed background data collection; declare any foreground service use. |
| 10 | **Push notifications as spam/ads** | Notifications; Disruptive Ads | 🟡 | Opt-in only; no ad/spam notifications; user can disable. |
| 11 | **Families/child-safety** misclassification | Families policy | 🟡 | Not child-directed; set content rating & target audience accordingly; do not opt into Families. |
| 12 | **Deceptive behaviour / web-only feel** | Minimum functionality; Misrepresentation | 🟡 | Native push + media capture; functional, stable app; accurate store listing. |
| 13 | **Placeholder assets / instability on review** | App quality | 🟡 | Replace placeholder icons; QA on devices; pre-launch report in Play Console. |
| 14 | **Data deletion not reachable without login** | Account deletion | 🟡 | Public /account-deletion page reachable without app + email channel. |
| 15 | **AI-generated content safety** | AI-Generated Content policy | 🟠 | Disclaimers; AI operates on user's own content; provide reporting for offensive AI output; no unrestricted public generation. |
| 16 | **Encryption/security answers** inconsistent | Data safety security section | 🟡 | Confirm TLS in transit (Yes) and document at-rest encryption; deletion + export available. |

## Pre-submission "must-pass" gate (the 🔴 items)
1. Accurate Data Safety form. 2. No medical/health misrepresentation. 3. Working account
deletion (in-app + web). 4. Published, linked Privacy Policy. Do not submit until all
four are true. Then use **Internal Testing** + **Pre-launch report** before production.
