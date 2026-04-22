import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const body = await req.json()
    const onesignal_id = body.onesignal_id
    const email = body.email

    if (!onesignal_id || !email) {
      return NextResponse.json(
        { error: 'Missing onesignal_id or email' },
        { status: 400 }
      )
    }

    const { data: user, error: userError } = await supabase
      .from('users')
      .upsert([{ email }], { onConflict: 'email' })
      .select()
      .single()

    if (userError) {
      return NextResponse.json(
        { error: userError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      user
    })

  } catch {
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    )
  }
}