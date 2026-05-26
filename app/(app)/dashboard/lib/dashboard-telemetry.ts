import {
  DashboardTelemetryEvent,
  DashboardTelemetryPayload,
} from "../types";

export function logDashboardEvent(
  event: DashboardTelemetryEvent,
  payload?: DashboardTelemetryPayload
) {
  console.log(
    `[dashboard] ${event}`,
    {
      timestamp:
        new Date().toISOString(),

      ...payload,
    }
  );
}

export function logDashboardLoad(
  payload?: DashboardTelemetryPayload
) {
  logDashboardEvent(
    "dashboard_loaded",
    payload
  );
}

export function logProfileSwitch(
  payload?: DashboardTelemetryPayload
) {
  logDashboardEvent(
    "profile_switched",
    payload
  );
}

export function logMemoryCreation(
  payload?: DashboardTelemetryPayload
) {
  logDashboardEvent(
    "memory_created",
    payload
  );
}

export function logProfileCreation(
  payload?: DashboardTelemetryPayload
) {
  logDashboardEvent(
    "profile_created",
    payload
  );
}