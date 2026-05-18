import { NextResponse } from "next/server";

export async function GET() {
  try {
    // ✅ Directly call internal route
    const response = await fetch(
      "https://www.remynest.com/api/cron/send-due-reminders",
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