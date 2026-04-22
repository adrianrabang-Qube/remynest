import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // 1. Get current time
    const now = new Date().toISOString()

    // 2. Fetch due reminders (not yet sent)
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

    // 3. Loop through reminders
    for (const reminder of reminders) {
      // 4. Send push notification
      await fetch('http://localhost:3000/api/send-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: reminder.message }),
      })

      // 5. Mark as sent in DB
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

    // 6. Return success
    return NextResponse.json({
      success: true,
      processed: reminders.length,
    })
  } catch (err) {
    console.error('CRON ERROR:', err)

    return NextResponse.json(
      { error: 'Cron failed' },
      { status: 500 }
    )
  }
}