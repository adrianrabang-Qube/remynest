import { createClient } from '@supabase/supabase-js'

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const now = new Date().toISOString()
    console.log('NOW:', now)

    const { data: reminders, error } = await supabase
      .from('reminders')
      .select('*')
      .eq('sent', false)
      .lte('remind_at', now)

    if (error) {
      console.log('ERROR:', error)
      return Response.json({ success: false, error })
    }

    console.log('REMINDERS FOUND:', reminders)

    if (!reminders || reminders.length === 0) {
      return Response.json({
        success: true,
        message: 'No reminders found',
      })
    }

    for (const reminder of reminders) {
      console.log('PROCESSING:', reminder.id)

      // 🔔 SEND REAL NOTIFICATION (OneSignal)
      const response = await fetch('https://onesignal.com/api/v1/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${process.env.ONESIGNAL_API_KEY}`,
        },
        body: JSON.stringify({
          app_id: process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID,
          included_segments: ['All'],
          contents: {
            en: reminder.message || 'Reminder',
          },
        }),
      })

      const data = await response.json()
      console.log('ONESIGNAL RESPONSE:', data)

      // ✅ mark as sent
      await supabase
        .from('reminders')
        .update({ sent: true })
        .eq('id', reminder.id)

      console.log('UPDATED TO TRUE:', reminder.id)
    }

    return Response.json({ success: true })
  } catch (err) {
    console.log('CRASH:', err)
    return Response.json({ success: false, error: err })
  }
}