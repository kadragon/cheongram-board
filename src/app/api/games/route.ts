import { createClient } from "@/utils/supabase/server";
import { NextResponse, NextRequest } from "next/server";
import { checkAdmin } from "@/utils/auth";

export async function GET() {
  const supabase = createClient();
  const { data: games, error } = await supabase
    .from("games")
    .select("*, rentals(returned_at, due_date)");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const gamesWithStatus = games.map((game) => {
    const activeRental = game.rentals.find(
      (rental: { returned_at: string | null }) => rental.returned_at === null
    );
    const is_rented = !!activeRental;
    const return_date = activeRental ? activeRental.due_date : null;

    const { rentals, ...rest } = game;
    return { ...rest, is_rented, return_date };
  });

  return NextResponse.json(gamesWithStatus);
}

export async function POST(request: NextRequest) {
  const supabase = createClient();
  if (!await checkAdmin(supabase)) {
    return NextResponse.json({ error: "Forbidden: Not an admin" }, { status: 403 });
  }

  const body = await request.json();
  const { data: newGame, error } = await supabase
    .from("games")
    .insert(body)
    .select()
    .single();

  if (error) {
    console.error("Supabase insert error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(newGame, { status: 201 });
}
