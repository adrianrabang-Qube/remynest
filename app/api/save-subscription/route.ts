import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const onesignal_id = body.onesignal_id
    const email = body.email

    // 🚨 Validate input (this is what was breaking you)
    if (!onesignal_id || !email) {
      return NextResponse.json(
        { error: 'Missing onesignal_id or email' },
        { status: 400 }
      )
    }

    console.log('Saving:', { email, onesignal_id })

    // 1. Upsert user
    const { data: user, error: userError } = await supabase
      .from('users')
      .upsert([{ email }], { onConflict: 'email' })
      .select()
      .single()

    if (userError) {
      console.error('User error:', userError)
      throw userError
    }

    // 2. Save subscription
    const { error: subError } = await supabase
      .from('subscriptions')
      .insert([
        {
          user_id: user.id,
          onesignal_id,
        },
      ])

    if (subError) {
      console.error('Subscription error:', subError)
      throw subError
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('SAVE ERROR:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}