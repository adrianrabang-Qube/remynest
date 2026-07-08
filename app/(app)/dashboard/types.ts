export type DashboardTelemetryEvent =
  | "dashboard_loaded"
  | "profile_switched"
  | "memory_created"
  | "profile_created"
  | "invite_sent"
  | "caregiver_revoked";

export interface DashboardTelemetryPayload {
  requestId?: string;
  userId?: string;
  profileId?: string;
  metadata?: Record<
    string,
    unknown
  >;
}

export interface DashboardStats {
  memoryCount: number;
  profileCount: number;
  reminderCount: number;
}

export interface DashboardProfile {
  id: string;
  preferred_name?: string | null;
  created_at?: string | null;
}

export interface DashboardAccountStatus {
  authenticated: boolean;
  subscriptionTier?: string;
  onboardingCompleted?: boolean;
}

export interface DashboardCreateMemoryInput {
  title: string;
  content: string;
}

export interface DashboardCreateProfileInput {
  preferredName: string;
}