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
      .order('remind_at', { ascending: true })

    if (error) {
      console.log('SUPABASE ERROR:', error)

      return Response.json({
        success: false,
        error,
      })
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

      console.log('REMINDER DATA:', reminder)

      // 🔔 SEND PUSH NOTIFICATION
      const response = await fetch(
        'https://onesignal.com/api/v1/notifications',
        {
          method: 'POST',

          headers: {
            'Content-Type': 'application/json',

            Authorization: `Basic ${process.env.ONESIGNAL_API_KEY}`,
          },

          body: JSON.stringify({
            app_id:
              process.env
                .NEXT_PUBLIC_ONESIGNAL_APP_ID,

            include_external_user_ids: [
              reminder.user_id,
            ],

            headings: {
              en: 'RemyNest Reminder',
            },

            contents: {
              en:
                reminder.title ||
                'Reminder',
            },
          }),
        }
      )

      const data = await response.json()

      console.log(
        'ONESIGNAL RESPONSE:',
        data
      )

      // ✅ ONLY MARK SENT IF SUCCESS
      if (response.ok) {
        const { error: updateError } =
          await supabase
            .from('reminders')
            .update({
              sent: true,
            })
            .eq('id', reminder.id)

        if (updateError) {
          console.log(
            'UPDATE ERROR:',
            updateError
          )
        } else {
          console.log(
            'UPDATED TO TRUE:',
            reminder.id
          )
        }
      } else {
        console.log(
          'FAILED TO SEND:',
          data
        )
      }
    }

    return Response.json({
      success: true,
    })
  } catch (err) {
    console.log('CRASH:', err)

    return Response.json({
      success: false,
      error: err,
    })
  }
}