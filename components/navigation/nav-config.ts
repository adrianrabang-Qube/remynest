import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  BookHeart,
  MessageCircle,
  Plus,
  Clock,
  Bell,
  Sparkles,
  Library,
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
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, mobile: "primary" },
  { href: "/memories", label: "Memories", icon: BookHeart, mobile: "primary" },
  { href: "/memory-chat", label: "Memory Chat", icon: MessageCircle, mobile: "drawer" },
  { href: "/memories/new", label: "New", icon: Plus, mobile: "new" },
  { href: "/timeline", label: "Timeline", icon: Clock, mobile: "primary" },
  { href: "/library", label: "Library", icon: Library, mobile: "drawer" },
  { href: "/reminders", label: "Reminders", icon: Bell, mobile: "drawer" },
  { href: "/insights", label: "Insights", icon: Sparkles, mobile: "drawer" },
];

/** Bottom-nav tabs (Dashboard, Memories, Timeline) — derived, never duplicated. */
export const MOBILE_PRIMARY_NAV: NavItem[] = NAV_ITEMS.filter(
  (i) => i.mobile === "primary",
);

/** Center "New" action. */
export const MOBILE_NEW_ACTION: NavItem =
  NAV_ITEMS.find((i) => i.mobile === "new") ?? NAV_ITEMS[0];

/** Drawer ("More") links (Memory Chat, Reminders, Insights). */
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
