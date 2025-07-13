import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: rentals, error } = await supabase.from("rentals").select(`
    *,
    games (*)
  `);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(rentals);
}

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { renter_name, rental_date, game_id } = await request.json();

  if (!renter_name || !rental_date || !game_id) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const { data: existingRental, error: existingRentalError } = await supabase
    .from("rentals")
    .select("id")
    .eq("game_id", game_id)
    .is("returned_at", null)
    .single();

  if (existingRentalError && existingRentalError.code !== 'PGRST116') { // PGRST116: no rows found
    return NextResponse.json({ error: existingRentalError.message }, { status: 500 });
  }

  if (existingRental) {
    return NextResponse.json({ error: "Game is not available for rent" }, { status: 409 });
  }

  const dueDate = new Date(rental_date);
  dueDate.setDate(dueDate.getDate() + 14);

  const { data, error } = await supabase
    .from("rentals")
    .insert({
      name: renter_name,
      rented_at: rental_date,
      due_date: dueDate.toISOString().split("T")[0],
      game_id: game_id,
    })
    .select();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
