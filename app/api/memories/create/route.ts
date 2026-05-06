import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const supabase = createClient();

    // 🔐 Get logged in user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        {
          status: 401,
        }
      );
    }

    // 📦 Get request body
    const body = await req.json();

    const { title, content } = body;

    // 🚫 Validation
    if (!content) {
      return NextResponse.json(
        {
          error: "Content required",
        },
        {
          status: 400,
        }
      );
    }

    // 💾 Save memory
    const { data, error } = await supabase
      .from("memories")
      .insert([
        {
          user_id: user.id,
          title,
          content,
        },
      ])
      .select()
      .single();

    if (error) {
      console.log("MEMORY CREATE ERROR:", error);

      return NextResponse.json(
        {
          error: "Failed to create memory",
        },
        {
          status: 500,
        }
      );
    }

    console.log("✅ Memory created:", data.id);

    return NextResponse.json(data);
  } catch (error) {
    console.log("CREATE MEMORY ERROR:", error);

    return NextResponse.json(
      {
        error: "Server error",
      },
      {
        status: 500,
      }
    );
  }
}