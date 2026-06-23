import type { LucideIcon } from "lucide-react";
import {
  Home,
  LayoutDashboard,
  BookHeart,
  MessageCircle,
  Plus,
  Clock,
  Bell,
  Sparkles,
  Library,
  Search,
  Users,
} from "lucide-react";

/** Where an item sits in the mobile hybrid nav. */
export type MobilePlacement = "primary" | "new" | "drawer";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  mobile: MobilePlacement;
}

/**
 * Single source of truth for primary app navigation.
 *
 * The order here IS the desktop top-nav order (unchanged from the previous
 * hardcoded list). The `mobile` field assigns each route a slot in the mobile
 * hybrid nav so desktop and mobile never drift apart:
 *   • primary → a bottom-nav tab
 *   • new     → the center "New" action
 *   • drawer  → the "More" drawer
 */
export const NAV_ITEMS: NavItem[] = [
  { href: "/home", label: "Home", icon: Home, mobile: "primary" },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, mobile: "primary" },
  { href: "/memories", label: "Memories", icon: BookHeart, mobile: "primary" },
  { href: "/profiles", label: "People", icon: Users, mobile: "drawer" },
  { href: "/search", label: "Search", icon: Search, mobile: "drawer" },
  { href: "/remy", label: "Ask Remy", icon: MessageCircle, mobile: "drawer" },
  { href: "/memories/new", label: "New", icon: Plus, mobile: "new" },
  { href: "/timeline", label: "Timeline", icon: Clock, mobile: "drawer" },
  { href: "/library", label: "Library", icon: Library, mobile: "drawer" },
  { href: "/reminders", label: "Reminders", icon: Bell, mobile: "drawer" },
  { href: "/insights", label: "Insights", icon: Sparkles, mobile: "drawer" },
];

/** Bottom-nav tabs (Home, Dashboard, Memories) — derived, never duplicated. */
export const MOBILE_PRIMARY_NAV: NavItem[] = NAV_ITEMS.filter(
  (i) => i.mobile === "primary",
);

/** Center "New" action. */
export const MOBILE_NEW_ACTION: NavItem =
  NAV_ITEMS.find((i) => i.mobile === "new") ?? NAV_ITEMS[0];

/** Drawer ("More") links (Ask Remy, Reminders, Insights). */
export const MOBILE_DRAWER_NAV: NavItem[] = NAV_ITEMS.filter(
  (i) => i.mobile === "drawer",
);

/**
 * Shared active-route test — preserves the existing subpath-matching behavior
 * (a route is active on its own path and any nested path).
 */
export function isNavItemActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
