import { GameFilter } from "@/components/GameFilter";
import { GameList } from "@/components/GameList";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";

export const revalidate = 60;

export default async function HomePage({
  searchParams,
}: {
  searchParams: { players?: string; search?: string };
}) {
  const supabase = createClient();
  let query = supabase.from("games").select("*");

  if (searchParams.search) {
    query = query.ilike("name", `%${searchParams.search}%`);
  }

  if (searchParams.players) {
    const playerCount = parseInt(searchParams.players, 10);
    if (!isNaN(playerCount)) {
      query = query
        .lte("min_players", playerCount)
        .gte("max_players", playerCount);
    }
  }

  const { data: games } = await query;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">게임 목록</h1>
      <GameFilter />
      <GameList games={games} />
    </div>
  );
}


