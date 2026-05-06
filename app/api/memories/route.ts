import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export { POST } from "./create/route";

export async function GET() {
  try {
    const supabase = createClient();

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

    const { data, error } = await supabase
      .from("memories")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.log(error);

      return NextResponse.json(
        {
          error: "Failed to fetch memories",
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.log(error);

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