# AI Compliance Package

Contains: (A) the public **AI Transparency Statement**, and (B) **App Store reviewer
notes** explaining RemyNest's AI for App Review and Play Policy review.

---

## A. AI Transparency Statement (public)

**RemyNest and Artificial Intelligence — How we use AI, and what it does not do**

RemyNest uses artificial intelligence to help you preserve and make sense of your
memories. We believe you should always understand how that works.

### What our AI does
- **Organises and categorises** your memories, notes, photos and videos so they're
  easier to revisit.
- **Generates summaries** of content you've created, to give you a quick overview.
- **Improves search**, so you can find memories by meaning, not just exact words.
- **Assists organisation** with helpful suggestions and groupings.

To provide these features, content you choose to process is sent securely to our AI
provider (**OpenAI**) via its API, under a data processing agreement and appropriate
international-transfer safeguards. **Your content is not used to train AI models.**

### What our AI does NOT do
- It is **not a medical device** and provides **no medical advice**.
- It does **not diagnose** any condition, including dementia or memory-loss conditions.
- It does **not provide treatment recommendations** or clinical, cognitive or health
  assessments.
- It does **not make automated decisions** that have legal or similarly significant
  effects about you (no Article 22 GDPR automated decision-making).
- It does **not profile you for advertising**, and we do **not sell your data**.

### Accuracy and your control
AI output can be **inaccurate or incomplete** and is provided for convenience only.
Please review AI-generated summaries and categories, and never rely on them for medical,
legal, financial or other important decisions — consult a qualified professional. You
remain in control of your content and can edit or delete it, and AI features operate only
on the content you provide.

### Questions
Contact **privacy@remynest.com**. See our Privacy Policy for details on AI processing,
legal bases and sub-processors.

---

## B. App Store / Play reviewer notes (paste into "Notes for Review")

> **What RemyNest is:** RemyNest is a personal **memory-preservation and organisation**
> app for individuals, families and caregivers. Users store notes, photos and videos and
> organise them into personal memory timelines, with reminders and family/caregiver
> sharing.
>
> **AI features:** The app uses OpenAI's API to (1) categorise/organise memories,
> (2) generate summaries of user-created content, and (3) improve search. AI output is
> clearly presented as assistive and may be imperfect.
>
> **Important — no medical claims:** RemyNest is **not** a medical, diagnostic,
> telehealth or healthcare app and is **not** a medical device. It does **not** diagnose,
> assess, treat, or give medical advice for dementia, memory loss, or any condition. In
> the UI, store listing, and Terms, we explicitly disclaim medical use. References to
> "dementia support" or "memory-loss support" describe **general, non-clinical emotional
> and organisational support** (e.g., helping families preserve memories), not treatment.
>
> **Privacy & data:** We collect account data (name, email), user content, device/log
> data, and push tokens. We do **not** track users across apps/websites, show no ads,
> use no advertising identifier, and do **not** sell data. The app shows "Data Not Used
> to Track You." Content is encrypted in transit and at rest, isolated per account.
> Users can **export their data** and **delete their account** in-app
> (and at https://www.remynest.com/account-deletion).
>
> **Demo account:** A reviewer test account is provided in App Store Connect / Play
> Console review credentials: username **[reviewer@remynest.com]**, password
> **[provide]**, pre-populated with sample memories so all features (including AI
> organisation, search, sharing, export and account deletion) can be exercised.
>
> **Permissions:** Camera and Photo Library (add media to memories), Notifications
> (opt-in reminders), Files (handle/export user content). All requested just-in-time with
> clear purpose strings. Microphone is **not** used in this version.
>
> **Subscriptions:** Premium storage is sold **web-only via Stripe** (no Apple IAP / no
> in-app purchase). On native, the app shows a neutral Premium state with **no purchase
> UI, no checkout, and no external payment links** (Apple 3.1.1/3.1.3 gating). Restore
> Purchases is N/A (no native purchases). Privacy Policy + Terms links are in-app and in
> the listing.
>
> **Architecture note (for completeness):** The mobile app is a Capacitor wrapper that
> renders RemyNest's responsive web experience and adds native capabilities (push
> notifications, camera/photo capture, native navigation, splash/launch). It is a single
> integrated product, not a generic web browser, and delivers the full RemyNest feature
> set with native integration.

## C. EU AI Act note (forward-looking, internal)
RemyNest's AI features are **limited-risk** (content organisation/summarisation), not
high-risk under the EU AI Act, and are not prohibited uses. The principal obligation is
**transparency** — users are clearly informed they are interacting with AI-generated
output — which the AI Transparency Statement and in-app disclaimers satisfy. Re-assess if
features expand toward any health-decision support (which RemyNest does not provide).
