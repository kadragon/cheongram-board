import { createClient } from "@/utils/supabase/server";
import { NextResponse, NextRequest } from "next/server";
import { checkAdmin } from "@/utils/auth";



export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const supabase = createClient();
  if (!await checkAdmin(supabase)) {
    return NextResponse.json({ error: "Forbidden: Not an admin" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("rentals")
    .update({ returned_at: new Date().toISOString() })
    .eq("id", id)
    .select();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
