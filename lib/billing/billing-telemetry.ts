import {
  BillingPlan,
  BillingInterval,
} from "./plans";

interface BillingTelemetryPayload {
  userId?: string;

  plan?: BillingPlan;

  interval?: BillingInterval;

  metadata?: Record<
    string,
    unknown
  >;
}

export function logBillingEvent(
  event: string,
  payload?: BillingTelemetryPayload
) {
  console.log(
    `[billing] ${event}`,
    {
      timestamp:
        new Date().toISOString(),

      ...payload,
    }
  );
}

export function logCheckoutStarted(
  payload?: BillingTelemetryPayload
) {
  logBillingEvent(
    "checkout_started",
    payload
  );
}

export function logCheckoutCompleted(
  payload?: BillingTelemetryPayload
) {
  logBillingEvent(
    "checkout_completed",
    payload
  );
}

export function logSubscriptionChanged(
  payload?: BillingTelemetryPayload
) {
  logBillingEvent(
    "subscription_changed",
    payload
  );
}

export function logSubscriptionCancelled(
  payload?: BillingTelemetryPayload
) {
  logBillingEvent(
    "subscription_cancelled",
    payload
  );
}

export function logUsageLimitHit(
  payload?: BillingTelemetryPayload
) {
  logBillingEvent(
    "usage_limit_hit",
    payload
  );
}