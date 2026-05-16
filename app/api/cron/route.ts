import { NextResponse } from "next/server";

export async function GET() {
  try {
    // ✅ Forward cron request
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SITE_URL}/api/cron/send-due-reminders`,
      {
        method: "GET",
        cache: "no-store",
      }
    );

    const data = await response.json();

    return NextResponse.json(data);

  } catch (err) {
    console.log("❌ CRON ROUTE ERROR:");
    console.log(err);

    return NextResponse.json({
      success: false,
    });
  }
}