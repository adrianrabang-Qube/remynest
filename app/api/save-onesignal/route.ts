import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // IMPORTANT: service role
)

export async function POST(req: Request) {
  try {
    const { user_id, onesignal_id } = await req.json()

    if (!user_id || !onesignal_id) {
      return NextResponse.json({ error: 'Missing data' }, { status: 400 })
    }

    // 🔥 THIS IS THE FIX → UPDATE, NOT INSERT
    const { error } = await supabase
      .from('users')
      .update({ onesignal_id })
      .eq('id', user_id)

    if (error) {
      console.error('SAVE ERROR:', error)
      return NextResponse.json({ error }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('SERVER ERROR:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}