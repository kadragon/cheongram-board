import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  const supabase = createClient();
  const { data: games, error } = await supabase
    .from("games")
    .select("*, rentals(returned_at)");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const gamesWithStatus = games.map((game) => {
    const is_rented = game.rentals.some((rental: { returned_at: string | null }) => rental.returned_at === null);
    // eslint-disable-next-line no-unused-vars
    const { rentals, ...rest } = game;
    return { ...rest, is_rented };
  });

  return NextResponse.json(gamesWithStatus);
}

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { error } = await supabase.from("games").insert(body);

  if (error) {
    console.error("Supabase insert error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return new NextResponse(null, { status: 204 });
}
