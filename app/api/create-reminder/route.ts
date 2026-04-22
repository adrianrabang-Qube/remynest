import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const { email, title, message, remind_at } = body

    console.log('Creating reminder:', body)

    // 1. Get user
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single()

    if (userError || !user) {
      console.error('User fetch error:', userError)
      return NextResponse.json({ error: 'User not found' }, { status: 400 })
    }

    // 2. Insert reminder
    const { error: reminderError } = await supabase
      .from('reminders')
      .insert([
        {
          user_id: user.id,
          title,
          message,
          remind_at,
        },
      ])

    if (reminderError) {
      console.error('Reminder insert error:', reminderError)
      return NextResponse.json(
        { error: reminderError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('REMINDER ERROR:', err)
    return NextResponse.json(
      { error: 'Failed to create reminder' },
      { status: 500 }
    )
  }
}