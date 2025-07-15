import { createClient } from "@/utils/supabase/server";
import { NextResponse, NextRequest } from "next/server";

async function checkAdmin(supabase: any) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: userDetails } = await supabase
    .from("users")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  return userDetails?.is_admin || false;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createClient();
  if (!(await checkAdmin(supabase))) {
    return NextResponse.json(
      { error: "Forbidden: Not an admin" },
      { status: 403 }
    );
  }

  const { data: rental, error: rentalError } = await supabase
    .from("rentals")
    .select("due_date")
    .eq("id", id)
    .single();

  if (rentalError) {
    return NextResponse.json({ error: rentalError.message }, { status: 404 });
  }

  const newDueDate = new Date(rental.due_date);
  newDueDate.setDate(newDueDate.getDate() + 14);

  const { data, error } = await supabase
    .from("rentals")
    .update({ due_date: newDueDate.toISOString().split("T")[0] })
    .eq("id", id)
    .select();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
