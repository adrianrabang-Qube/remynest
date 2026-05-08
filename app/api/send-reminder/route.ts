import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      title,
      message,
      external_user_id,
    } = body;

    const response = await fetch(
      "https://onesignal.com/api/v1/notifications",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${process.env.ONESIGNAL_API_KEY}`,
        },

        body: JSON.stringify({
          app_id: process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID,

          include_external_user_ids: [
            external_user_id,
          ],

          headings: {
            en: title,
          },

          contents: {
            en: message,
          },
        }),
      }
    );

    const data = await response.json();

    console.log("✅ OneSignal sent:");
    console.log(data);

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.log("❌ SEND REMINDER ERROR:");
    console.log(error);

    return NextResponse.json(
      {
        success: false,
      },
      {
        status: 500,
      }
    );
  }
}