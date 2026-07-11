> DRAFT — documents RemyNest's actual implementation as of 2026-07-11. Internal operational record; the legally-operative version requires review/approval by qualified data-protection counsel. [CONFIRM] markers need operator input.

# Responsible Disclosure (Vulnerability Disclosure) Policy

**Effective date:** 2026-07-11

RemyNest handles sensitive, health-adjacent family and caregiving data. We take the security of our systems and the privacy of our users seriously, and we welcome reports from security researchers who help us keep that data safe. This policy explains how to report a vulnerability to us, what you can expect in return, and the good-faith commitments we make to researchers who follow it.

If you believe you have found a security vulnerability in RemyNest, we want to hear from you.

---

## 1. Our commitment to researchers (safe harbour / good faith)

If you make a good-faith effort to comply with this policy during your security research, we commit to the following:

- We will **not pursue or support legal action** against you for accidental, good-faith violations of this policy, including under applicable computer-misuse or anti-hacking laws.
- We will treat your research as **authorised** conduct with respect to the in-scope systems below, provided you stay within the rules of this policy.
- We will work with you to **understand and resolve** the issue quickly, and we will not ask law enforcement to investigate you for a report submitted in good faith.

"Good faith" means: you make a genuine effort to avoid privacy violations, data destruction, service degradation, and interruption to other users; you stop and report as soon as you encounter user data; and you give us a reasonable opportunity to remediate before any public disclosure.

This safe-harbour statement is our undertaking and does not bind any third party. Research against **third-party services** we rely on (see out-of-scope below) is governed by those third parties' own policies, not ours.

---

## 2. Scope

### In scope

- The RemyNest web application and its API (the production domain and its subdomains — [CONFIRM: exact in-scope domain(s), e.g. `app.remynest.com`, `remynest.com`]).
- The RemyNest iOS application (a Capacitor wrapper that loads the live site).
- Authentication, authorisation, and access-control logic (e.g. cross-account data access / IDOR, workspace/caregiver isolation, signed-URL handling for private media).
- Server-side application logic, API endpoints, and data-handling flows operated by RemyNest.

### Out of scope

The following are **not** in scope and should **not** be tested:

- **Denial-of-service (DoS/DDoS)**, volumetric testing, resource-exhaustion, or brute-force/credential-stuffing at scale.
- **Social engineering** of RemyNest staff, users, caregivers, or contractors (including phishing, vishing, and pretexting).
- **Physical attacks** against offices, staff, or infrastructure.
- **Third-party services and subprocessors** we use — including Supabase, OpenAI, OneSignal, Stripe, Sentry, and Vercel. Report issues in those platforms to the respective vendor under their own disclosure programme. (We are happy to help route a report if you are unsure.)
- Findings that require a **rooted/jailbroken device**, a compromised endpoint, or a physically-present attacker with an unlocked device.
- Reports from **automated scanners** with no demonstrated, exploitable impact.
- **Best-practice / hardening suggestions with no security impact** (e.g. missing security headers on a static asset, cosmetic issues, self-XSS, missing SPF/DMARC on non-mailing domains, disclosure of non-sensitive software versions).
- **Clickjacking** on pages with no sensitive state-changing action, and issues requiring highly unlikely user interaction.
- Rate-limiting nuances that do not lead to a concrete security impact. (Note: our API rate limiting is an in-memory, per-instance, **fail-open** baseline by design; reports of it being bypassable across instances are known and out of scope unless you can show real harm.)

### Rules of engagement

- **Only test against your own account and data.** Do not access, modify, or delete data belonging to other users, caregivers, or care recipients.
- If you inadvertently access another party's data (including special-category health content, media, or care-recipient information), **stop immediately, do not save or share it, and report it** — describe what you accessed only to the extent needed to demonstrate the issue.
- Do not run tests that degrade service for other users.
- Do not use, exfiltrate, or retain any personal data encountered during testing.

---

## 3. How to report

Please email your report to **security@remynest.com** [CONFIRM: mailbox provisioned]. If that address is not yet reachable, use **admin@remynest.com**.

Reports may be sent in English. Where possible, please encrypt sensitive details [CONFIRM: PGP key / secure intake channel if provided].

> A machine-readable **`/.well-known/security.txt`** endpoint is **planned** but not yet published. Implementing it requires a one-line entry adding the path to the public-route allowlist in `middleware.ts` (the app is protect-by-default and would otherwise gate the file behind login). Until then, use the email address above.

### What to include

To help us triage quickly, please provide:

- A clear description of the vulnerability and its **security impact**.
- The **affected component / URL / endpoint** (and platform: web or iOS).
- **Step-by-step reproduction instructions**, including any request/response samples, payloads, or proof-of-concept code.
- Any **prerequisites** (account role, workspace/caregiver setup, device state).
- Screenshots or a short screen recording, if helpful.
- Your assessment of severity and any suggested remediation (optional but appreciated).
- How you would like to be **credited** (or if you prefer to remain anonymous).

Please do **not** include live personal data of third parties in your report.

---

## 4. Our response and service-level targets

We aim to respond promptly and to keep you informed. These are our **targets** (business days, best-effort — not contractual guarantees):

| Stage | Target |
| --- | --- |
| **Acknowledge** receipt of your report | Within **3 business days** |
| **Triage** — validate and assign a severity | Within **10 business days** |
| **Status updates** while we work on a fix | At least every **14 days** until resolved |
| **Remediation** target — Critical / High severity | As soon as practicable; we prioritise these urgently |
| **Remediation** target — Medium / Low severity | Scheduled into normal maintenance |

We will let you know when the issue is resolved and, where appropriate, confirm the fix with you.

If your report indicates a **personal-data breach**, it also feeds our internal breach-response runbook, under which we operate a **72-hour supervisory-authority notification** commitment (GDPR Art 33) where the threshold is met. Prompt, detailed reports directly help us meet that obligation.

---

## 5. Coordinated disclosure expectations

- Please give us a **reasonable opportunity to remediate before any public disclosure**. As a default, we ask for up to **90 days** from acknowledgement, and we will work with you if a fix legitimately needs longer (or can be done faster).
- Please **coordinate any public disclosure with us**, and do not disclose details that would put users at risk while a fix is pending.
- We are happy to **publicly credit** researchers who report valid issues and follow this policy, unless you prefer to remain anonymous.
- We do not currently maintain a formal public disclosure timeline or hall of fame [CONFIRM if one is established].

---

## 6. No bounty

RemyNest does **not currently operate a paid bug-bounty programme**, and reports under this policy are **not eligible for monetary reward** [CONFIRM if a bounty programme is later introduced]. We deeply value the contribution of security researchers and will acknowledge and credit valid reports as described above.

---

## 7. Questions

For questions about this policy, or if you are unsure whether something is in scope, contact **security@remynest.com** [CONFIRM] (or **admin@remynest.com**). When in doubt, err on the side of asking before testing.

Thank you for helping keep RemyNest and the families who trust us safe.

---

*This is an internal operational record. The legally-operative, publicly-published version requires review/approval by qualified counsel, and all [CONFIRM] markers must be resolved by the operator before publication.*
