export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  try {
    // ✅ Get message from URL query
    const { searchParams } = new URL(req.url)
    const message = searchParams.get('message')

    // ❌ If missing message
    if (!message) {
      return NextResponse.json(
        { error: 'No message provided' },
        { status: 400 }
      )
    }

    // ✅ Send notification to OneSignal
    const res = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Key ${process.env.ONESIGNAL_API_KEY}`, // ✅ FIXED
      },
      body: JSON.stringify({
        app_id: process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID,
        included_segments: ['All'],
        contents: { en: message },
      }),
    })

    const data = await res.json()

    // ✅ Return response
    return NextResponse.json({
      success: true,
      onesignal: data,
    })

  } catch (err) {
    console.error(err)

    return NextResponse.json(
      {
        error: 'Server crash',
        details: err,
      },
      { status: 500 }
    )
  }
}