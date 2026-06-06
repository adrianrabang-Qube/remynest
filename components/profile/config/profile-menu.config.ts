export interface ProfileMenuItem {
  label: string;
  href: string;
  icon: string;

  requiresAuth?: boolean;
  requiresPremium?: boolean;
}

export const PROFILE_MENU_ITEMS: ProfileMenuItem[] = [
  // "My Nest" is rendered as an action button in ProfileMenuItems that calls the
  // setPersonalWorkspace server action (writes remynest-active-context) — not a
  // URL ?context= link. Single source of truth = the cookie.
  //
  // NOTE: "Billing" was removed — it pointed at /dashboard (duplicate nav that
  // redirected users to the dashboard) and subscription management already lives
  // in Settings (BillingSection). Slot reserved for a future Vault entry.
  {
    label: "Settings",
    href: "/settings",
    icon: "⚙️",
    requiresAuth: true,
  },
];