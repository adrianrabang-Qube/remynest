import { NextResponse } from "next/server";

/**
 * Authorize a request to a cron / internal notification endpoint.
 *
 * Compatible with Vercel Cron: when CRON_SECRET is set in the project env,
 * Vercel automatically sends `Authorization: Bearer <CRON_SECRET>` with each
 * scheduled invocation.
 *
 * Fails CLOSED: if CRON_SECRET is unset, or the header is missing/incorrect,
 * the request is rejected with 401. (Deploys must configure CRON_SECRET.)
 *
 * @returns a 401 NextResponse when unauthorized, or null when authorized.
 */
export function authorizeCronRequest(
  req: Request
): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  const provided = req.headers.get("authorization");

  if (!secret || provided !== `Bearer ${secret}`) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  return null;
}
