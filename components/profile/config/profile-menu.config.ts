export interface ProfileMenuItem {
  label: string;
  href: string;
  icon: string;

  requiresAuth?: boolean;
  requiresPremium?: boolean;
}

export const PROFILE_MENU_ITEMS: ProfileMenuItem[] = [
  {
    label: "My Nest",
    href: "/dashboard?context=my-nest",
    icon: "🏡",
    requiresAuth: true,
  },
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