import type { ComponentType } from "react";

import ProfileMenuItems from "@/components/navigation/ProfileMenuItems";
import GDPRSection from "../sections/GDPRSection";

export type ProfileSectionAccess =
  | "vault"
  | "caregiving";

export interface ProfileSectionConfig {
  title: string;
  component: ComponentType;
  access?: ProfileSectionAccess;
}

// Reviewer-experience fix (Apple 2.1): the "Security", "Notifications", "Vault", and
// "Caregiving" sections were informational PLACEHOLDERS with no working controls — they
// were removed from the profile dropdown. The real, functional settings live at the
// `/settings` page (Account Information, Storage, Export, Privacy links, Delete Account),
// reachable via the "Settings" link in the Account section below. "Billing" was already
// retired in favour of the canonical /account/subscription page.
export const PROFILE_SECTIONS: readonly ProfileSectionConfig[] = [
  {
    title: "Account",
    component: ProfileMenuItems,
  },

  {
    title: "Privacy & GDPR",
    component: GDPRSection,
  },
];
