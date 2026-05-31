export type ProfilePlan =
  | "free"
  | "premium"
  | "caregiver"
  | "admin";

export type UserRole =
  | "user"
  | "caregiver"
  | "admin";

export interface ProfileSummary {
  fullName: string;
  email: string;

  plan: ProfilePlan;
  role: UserRole;

  storageUsed?: string;
  storageLimit?: string;

  avatarUrl?: string | null;

  isPremium?: boolean;
}