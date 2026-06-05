# RemyNest Project State

## Mission

RemyNest is a healthcare-focused memory platform helping individuals, families, and caregivers preserve memories, improve communication, and support people affected by dementia, Alzheimer's disease, memory loss, and cognitive decline.

---

## Current Status

Phase: Launch Readiness

Last Updated: 2026-06-05

Build Status: PASSING
Lint Status: PASSING
Production Deployment: PASSING

Estimated Completion:
90-93% toward V1 launch

---

## Core Features Completed

- Authentication
- User onboarding
- Memory creation
- Photo attachments
- Timeline
- Memory search
- Memory Chat
- AI Insights
- Caregiver invitations
- Shared profiles
- Profile switching
- Reminder system
- OneSignal notifications
- Stripe billing
- Subscription plans
- Dashboard
- Vercel deployment

---

## Testing & QA Status

QA Phase: Active (manual)

- All core features listed above are verified present in the codebase
- No automated test suite is currently configured
  (package.json scripts: dev, build, start, lint only)
- QA is currently performed manually for the launch sprint
- Recommended next step: add a smoke-level E2E suite for P0 flows
  (auth, memory creation, profile-switch isolation, checkout)

---

## Current Priorities

1. QA testing (active)
2. GDPR package
3. Privacy Policy
4. Terms & Conditions
5. App Store submission
6. Play Store submission
7. Launch assets
8. Production monitoring

---

## Not Currently Prioritized

- Major feature expansion
- Database redesign
- Billing redesign
- Architecture rewrites

Focus on launch readiness and stability.