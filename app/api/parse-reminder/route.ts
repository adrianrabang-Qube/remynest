import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { input } = await req.json()

    if (!input) {
      return NextResponse.json({ error: 'No input provided' }, { status: 400 })
    }

    // ✅ Get today's date (for correct AI parsing)
    const today = new Date().toISOString()

    // ✅ Call OpenAI
    const aiRes = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        input: `
You are a strict JSON generator.

Today's date is: ${today}

Convert the user's reminder into JSON.

Rules:
- Always return ONLY valid JSON
- No backticks
- No explanations
- No extra text
- ISO date format

Format:
{
  "title": "...",
  "message": "...",
  "remind_at": "...",
  "repeat": null
}

User input:
"${input}"
        `,
      }),
    })

    const aiData = await aiRes.json()

    const rawText = aiData.output?.[0]?.content?.[0]?.text

    if (!rawText) {
      return NextResponse.json({ error: 'AI returned empty' }, { status: 500 })
    }

    // ✅ CLEAN JSON (handles ```json etc)
    const cleaned = rawText
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim()

    let parsed
    try {
      parsed = JSON.parse(cleaned)
    } catch {
      return NextResponse.json({ error: 'Invalid JSON from AI' }, { status: 500 })
    }

    // ✅ Save to Supabase
    const supabaseRes = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/reminders`,
      {
        method: 'POST',
        headers: {
          apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        },
        body: JSON.stringify({
          user_id: crypto.randomUUID(), // temp until auth
          message: parsed.message,
          remind_at: parsed.remind_at,
          sent: false,
        }),
      }
    )

    if (!supabaseRes.ok) {
      const err = await supabaseRes.text()
      return NextResponse.json({ error: 'DB save failed', details: err }, { status: 500 })
    }

    const saved = await supabaseRes.json()

    // ✅ OPTIONAL: trigger notification immediately
    await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/send-notification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: parsed.message,
      }),
    })

    return NextResponse.json({
      success: true,
      saved: true,
      data: parsed,
      db: saved,
    })
  } catch (err) {
    return NextResponse.json({ error: 'Server crash' }, { status: 500 })
  }
}