export interface ProfileMenuItem {
  label: string;
  href: string;
  icon: string;

  requiresAuth?: boolean;
  requiresPremium?: boolean;
}

export const PROFILE_MENU_ITEMS: ProfileMenuItem[] = [
  // "My Nest" is rendered at the TOP of ProfileHub (not here): it closes the menu,
  // calls the setPersonalWorkspace server action (writes remynest-active-context —
  // not a URL ?context= link; single source of truth = the cookie), then navigates
  // to /home. Care-profile switching/management lives in the workspace drawer.
  //
  // Subscription management is the canonical /account/subscription page (plan +
  // storage + BillingSection). This is the single entry point — the former inline
  // ProfileHub "Billing" section was retired to remove the duplicate surface.
  {
    label: "Subscription",
    href: "/account/subscription",
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