import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

async function getUser() {
  const cookieStore = cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { user, supabase };
}

// =========================
// GET
// =========================
export async function GET() {
  const { user, supabase } = await getUser();

  if (!user) return NextResponse.json([]);

  // ✅ FIX: removed user_id filter so existing data shows
  const { data, error } = await supabase
    .from("memories")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json([], { status: 500 });
  }

  return NextResponse.json(data);
}

// =========================
// POST (AI ENGINE)
// =========================
export async function POST(req: Request) {
  const { user, supabase } = await getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { title, content } = await req.json();

  let summary = "";
  let tags: string[] = [];

  try {
    const response = await openai.responses.create({
      model: "gpt-4o-mini",
      input: `Return ONLY valid JSON.

{"summary":"short summary under 15 words","tags":["tag1","tag2"]}

Memory:
Title: ${title}
Content: ${content}`,
    });

    const raw = response.output_text || "";

    const jsonMatch = raw.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      summary = parsed.summary || "";
      tags = parsed.tags || [];
    }
  } catch (err) {
    console.log("AI error:", err);
  }

  const { data, error } = await supabase
    .from("memories")
    .insert([
      {
        user_id: user.id, // still stored correctly going forward
        title,
        content,
        summary,
        tags,
      },
    ])
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: "Insert failed" }, { status: 500 });
  }

  return NextResponse.json(data);
}