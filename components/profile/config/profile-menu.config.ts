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
  {
    label: "Billing",
    href: "/dashboard",
    icon: "💳",
    requiresAuth: true,
  },
  {
    label: "Settings",
    href: "/settings",
    icon: "⚙️",
    requiresAuth: true,
  },
];