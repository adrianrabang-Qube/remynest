import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const now = new Date().toISOString()

    // 1. Fetch due reminders from Supabase
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/reminders?sent=eq.false&remind_at=lte.${now}`,
      {
        headers: {
          apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
      }
    )

    const reminders = await res.json()

    // 2. Loop through reminders
    for (const reminder of reminders) {
      // 3. Send notification via OneSignal
      await fetch('https://onesignal.com/api/v1/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Key ${process.env.ONESIGNAL_API_KEY}`,
        },
        body: JSON.stringify({
          app_id: process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID,
          included_segments: ['All'],
          contents: {
            en: reminder.message || 'Reminder',
          },
        }),
      })

      // 4. Mark as sent in Supabase
      await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/reminders?id=eq.${reminder.id}`,
        {
          method: 'PATCH',
          headers: {
            apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
            Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ sent: true }),
        }
      )
    }

    return NextResponse.json({
      success: true,
      processed: reminders.length,
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json(
      { error: 'Cron failed', details: err },
      { status: 500 }
    )
  }
}