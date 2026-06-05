# Feature: Caregiver Sharing

## Current implementation
Shared access to a `memory_profile` via `profile_relationships`. An owner invites
others (`caregiver_invites`, keyed by email); accepted relationships grant access
at `admin` or `read` level.

## Architecture
- `lib/profile-access.ts`, `lib/active-profile.ts`, `lib/context-resolver.ts`,
  `lib/workspace-context.ts` resolve which profile/context the user operates in.
- `lib/build-relationships.ts` + `/api/build-relationships` derive/build
  relationships.
- Access enforced by RLS + app logic.

## Database dependencies
- `profile_relationships(id, created_at, memory_profile_id [FK→memory_profiles],
  caregiver_account_id, relationship_type [owner|caregiver],
  access_level [admin|read], invite_status [accepted], invited_by_account_id)`.
- `caregiver_invites(invited_by_account_id, email, …)`.
- `memory_profiles(created_by_account_id)` = owner.

## API routes
`/api/active-profile` (GET/POST), `/api/build-relationships` (POST).

## UI components
`components/ProfileSwitcher.tsx`, `components/CreateProfileForm.tsx`,
dashboard profile panels (`app/(app)/dashboard/components/*`),
`components/profile/sections/CaregivingSection.tsx` (currently placeholder text).

## Limitations
- Caregiving settings UI is a placeholder (no in-app role management yet).
- `caregiver_account_id` has no public FK to `profiles` (account-id space).
- Invite acceptance flow details _(verify)_.

## Future enhancements
Full caregiver management UI; granular permissions; ownership-transfer surfaced
in UI (already implemented for deletion — see gdpr-delete-account).
