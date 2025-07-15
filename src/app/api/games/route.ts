import { createClient } from "@/utils/supabase/server";
import { NextResponse, NextRequest } from "next/server";

export async function GET() {
  const supabase = createClient();
  const { data: games, error } = await supabase
    .from("games")
    .select("*, rentals(returned_at, due_date)");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const gamesWithStatus = games.map((game) => {
    const activeRental = game.rentals.find((rental: { returned_at: string | null }) => rental.returned_at === null);
    const is_rented = !!activeRental;
    const return_date = activeRental ? activeRental.due_date : null;
    // eslint-disable-next-line no-unused-vars
    const { rentals, ...rest } = game;
    return { ...rest, is_rented, return_date };
  });

  return NextResponse.json(gamesWithStatus);
}

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: userDetails } = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (!userDetails?.is_admin) {
    return NextResponse.json({ error: "Forbidden: Not an admin" }, { status: 403 });
  }

  const body = await request.json();
  const { error } = await supabase.from("games").insert(body);

  if (error) {
    console.error("Supabase insert error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Return the created game data
  const { data: newGame } = await supabase.from('games').select('*').eq('koreaboardgames_url', body.koreaboardgames_url).single();

  return NextResponse.json(newGame, { status: 201 });
}
