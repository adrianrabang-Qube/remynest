import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { message } = await req.json()

    if (!message) {
      return NextResponse.json({ error: 'No message provided' }, { status: 400 })
    }

    const res = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${process.env.ONESIGNAL_API_KEY}`,
      },
      body: JSON.stringify({
        app_id: process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID,
        included_segments: ['All'], // send to all subscribed users
        contents: { en: message },
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      console.error('ONESIGNAL ERROR:', data)
      return NextResponse.json({ error: 'Notification failed' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (err) {
    return NextResponse.json({ error: 'Server crash' }, { status: 500 })
  }
}