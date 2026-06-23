import type { ComponentType } from "react";

import ProfileMenuItems from "@/components/navigation/ProfileMenuItems";
import SecuritySection from "../sections/SecuritySection";
import NotificationsSection from "../sections/NotificationsSection";
import VaultSection from "../sections/VaultSection";
import CaregivingSection from "../sections/CaregivingSection";
import GDPRSection from "../sections/GDPRSection";

export type ProfileSectionAccess =
  | "vault"
  | "caregiving";

export interface ProfileSectionConfig {
  title: string;
  component: ComponentType;
  access?: ProfileSectionAccess;
}

export const PROFILE_SECTIONS: readonly ProfileSectionConfig[] = [
  {
    title: "Account",
    component: ProfileMenuItems,
  },

  {
    title: "Security",
    component: SecuritySection,
  },

  {
    title: "Notifications",
    component: NotificationsSection,
  },

  // "Billing" section retired — subscription management is consolidated onto the
  // canonical /account/subscription page (reachable via the profile menu), which
  // renders BillingSection alongside StorageUsageCard. Avoids the duplicate surface.

  {
    title: "Vault",
    component: VaultSection,
    access: "vault",
  },

  {
    title: "Caregiving",
    component: CaregivingSection,
    access: "caregiving",
  },

  {
    title: "Privacy & GDPR",
    component: GDPRSection,
  },
];