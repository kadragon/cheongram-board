import { createClient } from "@/utils/supabase/server";
import { NextResponse, NextRequest } from "next/server";

export async function PUT(
  request: NextRequest,
  context: any
) {
  const { params } = context;
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("rentals")
    .update({ returned_at: new Date().toISOString(), status: "returned" })
    .eq("id", params.id)
    .select()
    .single();

  // TODO: Add logic to update the game's status back to 'available'

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
