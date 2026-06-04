<!-- END:nextjs-agent-rules -->

# RemyNest Project Instructions

Read before making changes:

- docs/PROJECT_STATE.md
- docs/ROADMAP.md
- docs/ARCHITECTURE.md
- docs/REMYNEST_RULES.md
- docs/LAUNCH_CHECKLIST.md

Use these documents as source of truth.

## Current Phase

Launch Preparation

Priority order:

1. QA
2. Stability
3. GDPR Compliance
4. Healthcare Readiness
5. App Store Readiness
6. Play Store Readiness

## Critical Systems

Do not remove or break:

- Authentication
- Supabase architecture
- Stripe billing
- OneSignal notifications
- Memory creation
- Media uploads
- Timeline
- Search
- Memory Chat
- AI Insights
- Profile switching
- Caregiver workflows

## Before Implementation

Always explain:

- Files affected
- Risks
- Database changes
- Migration requirements
- Testing requirements

## After Implementation

Always run:

npm run lint
npm run build

and report results.