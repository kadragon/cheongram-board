import { createClient } from "@/utils/supabase/server";
import { NextResponse, NextRequest } from "next/server";

async function checkAdmin(supabase: any) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: userDetails } = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  return userDetails?.is_admin || false;
}

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
