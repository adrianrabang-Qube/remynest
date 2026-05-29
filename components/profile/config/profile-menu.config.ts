export interface ProfileMenuItem {
  label: string;
  href: string;
  icon: string;

  requiresAuth?: boolean;
  requiresPremium?: boolean;
}

export const PROFILE_MENU_ITEMS: ProfileMenuItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: "🏠",
    requiresAuth: true,
  },
  {
    label: "Billing",
    href: "/dashboard",
    icon: "💳",
    requiresAuth: true,
  },
  {
    label: "Vault",
    href: "/vault",
    icon: "🔐",
    requiresAuth: true,
    requiresPremium: true,
  },
  {
    label: "Settings",
    href: "/settings",
    icon: "⚙️",
    requiresAuth: true,
  },
];