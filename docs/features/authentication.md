# Feature: Authentication

## Current implementation
Supabase Auth with cookie-based SSR sessions. Email/password confirmed
(`signInWithPassword` in `app/(auth)/login/LoginClient.tsx`); OAuth (Google/Apple)
supported via `signInWithOAuth` (used in login + delete-account re-auth)
_(verify provider config in Supabase dashboard)_.

## Architecture
- Middleware (`middleware.ts`) classifies routes and fetches the session for
  protected/auth routes; unclassified routes fail closed → `/login`.
- SSR clients: `lib/supabase/server.ts`, `utils/supabase/server.ts`.
- Browser client: `lib/supabase/client.ts`, `utils/supabase/client.ts`.
- Logout: `app/auth/logout/route.ts`.
- Onboarding: `app/(app)/onboarding/page.tsx` upserts the `profiles` row
  (`first_name`, `preferred_name`, `onboarding_completed`).

## Database dependencies
`auth.users` (Supabase-managed) + `profiles` (id = auth uid).

## API routes
No dedicated auth API (handled by Supabase SDK + middleware); `logout` route.

## UI components
`app/(auth)/login`, `signup`, `register`; `LoginClient.tsx`; `LogoutButton.tsx`.

## Limitations
- OAuth provider set not code-confirmed here (dashboard).
- No in-app password/email change or MFA (Settings Security is placeholder).
- **Apple Sign In** is required by App Store if Google login is offered — verify
  it is enabled before iOS submission.

## Future enhancements
Security settings (password/email change, sign-out-all, MFA); session recency
hardening; account recovery flows.
