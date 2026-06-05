# Launch Compliance Checklist

Five sequential checklists. Each item is binary (done / not done). Do not advance a stage
until its blockers (🔴) are complete.

---

## 1. Pre-TestFlight checklist (internal build → testers)

**Build & native**
- [ ] iOS build succeeds and runs on a physical device (not just simulator)
- [ ] Final app icon (opaque, all sizes) replaces Capacitor placeholder
- [ ] Splash/launch screen finalised
- [ ] Camera, Photo Library, Notifications work on device
- [ ] Push notifications deliver via OneSignal (APNs key configured)
- [ ] **Sign in with Apple** works (required because Google login is offered) 🔴
- [ ] Supabase **session persists** across app restarts in the WebView wrapper
- [ ] Uploads (photo/video) work from a real device

**Compliance basics**
- [ ] Privacy Policy live at /privacy and linked in-app
- [ ] In-app **account deletion** works end-to-end 🔴
- [ ] In-app **data export** works
- [ ] No medical/clinical claims in UI 🔴
- [ ] AI disclaimers visible where AI output appears
- [ ] Permission purpose strings present and specific (no microphone string yet)

**Apple Developer setup**
- [ ] Apple Developer Program membership active
- [ ] Bundle ID `com.remynest.app` registered; APNs key created
- [ ] App record created in App Store Connect
- [ ] Internal testers added in TestFlight

---

## 2. Pre-App Store (submission) checklist

**Account & data**
- [ ] Reviewer **demo account** + sample data provided in App Review notes 🔴
- [ ] App Review notes pasted (from `08-ai-compliance-package.md` §B) 🔴
- [ ] Account deletion verified by a fresh tester end-to-end 🔴

**Privacy & policy**
- [ ] **App Privacy nutrition labels** completed (`05-...md`) and consistent 🔴
- [ ] "Data Not Used to Track You" declared; no IDFA/ATT needed
- [ ] Privacy Policy + Terms (EULA) links set in App Store Connect and in-app

**Listing & assets**
- [ ] App name, subtitle, promo text, description, keywords entered (`11-...md`)
- [ ] No medical claims in any listing field 🔴
- [ ] Screenshots (6.7" required) + final icon uploaded
- [ ] Category = Lifestyle (not Medical); age rating questionnaire completed
- [ ] Support URL + email live and reachable

**Subscriptions (if applicable)**
- [ ] IAP products configured; price/period/auto-renew disclosed
- [ ] Restore Purchases implemented; no external payment links for digital goods

**Anti-rejection gate (from `09-...md`)**
- [ ] Native value demonstrated (anti-4.2) 🔴
- [ ] UGC report/block + EULA anti-abuse clause present
- [ ] Build stable on current iOS; no placeholders

---

## 3. Pre-Google Play checklist

**Build & native**
- [ ] **Android SDK installed**; signed **AAB** builds (`bundleRelease`) 🔴
- [ ] Upload keystore created/secured; signing configured (or Play App Signing) 🔴
- [ ] SHA-256 fingerprint captured → `assetlinks.json` (deep links)
- [ ] `targetSdkVersion` meets current Play requirement 🔴
- [ ] `POST_NOTIFICATIONS` requested in-context; Photo Picker/scoped media (no all-files)
- [ ] FCM `google-services.json` configured for OneSignal native push
- [ ] Final icon/adaptive icon + splash (replace placeholders)

**Console & policy**
- [ ] Google Play Console account active
- [ ] **Data safety form** completed (`06-...md`) and consistent 🔴
- [ ] Privacy Policy URL set in Play Console 🔴
- [ ] **Account deletion** declared (in-app + /account-deletion URL) 🔴
- [ ] Content rating questionnaire completed; target audience set (not Families)
- [ ] No medical/health misrepresentation in listing 🔴
- [ ] Store listing assets (feature graphic 1024×500, screenshots) uploaded
- [ ] Internal Testing track created; testers added; **Pre-launch report** reviewed

---

## 4. Production launch checklist (web + mobile go-live)

- [ ] Web production healthy (`/api/health` 200) and smoke tests pass
- [ ] /privacy, /terms, /cookies, /support, /account-deletion all live (200)
- [ ] Mailboxes live: support@, privacy@, dpo@, security@
- [ ] Company Particulars confirmed in `00-...md` (entity, number, address) 🔴
- [ ] Error monitoring active (Sentry env set) for post-launch visibility
- [ ] Cookie consent banner live for EU/UK (analytics gated on consent)
- [ ] Sub-processor list current; DPAs in place (Supabase, OpenAI, OneSignal, etc.)
- [ ] International transfer safeguards (SCCs/UK IDTA) documented
- [ ] Backups verified (Pro plan; daily backups; restore tested) — PITR decision recorded
- [ ] iOS app **Approved**; Android app **Approved** (or in chosen test track)
- [ ] Rollback plan ready (Vercel rollback / revert; store phased release)

---

## 5. Post-launch compliance checklist (ongoing)

**First 30 days**
- [ ] Monitor crash/error rates and store reviews; triage issues
- [ ] Confirm DSAR/deletion/export requests are handled within statutory timeframes
- [ ] Verify analytics consent honoured (if analytics enabled)
- [ ] Watch for store policy messages; respond promptly

**Recurring**
- [ ] Quarterly: review Privacy Policy, Data Safety form & Apple labels for accuracy
- [ ] Quarterly: review sub-processor list; notify users of material changes
- [ ] Maintain **Records of Processing Activities** (GDPR Art. 30)
- [ ] Keep a **breach response** runbook; 72-hour notification readiness
- [ ] Re-confirm target API level / OS compatibility each platform cycle
- [ ] Before shipping **microphone/voice** features: add permission strings, update
      Privacy Policy, Apple labels, Play Data Safety, and AI Transparency Statement
- [ ] Re-assess EU AI Act transparency obligations if AI scope expands
- [ ] Annual: counsel review of §1–§3 documents for each launch market (IE/UK/US/CA/AU)
- [ ] Renew Apple membership; maintain signing keys/certs; rotate secrets
