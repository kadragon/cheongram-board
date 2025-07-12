import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { GameCard } from "@/components/GameCard";
import { GameFilter } from "@/components/GameFilter";

export default async function HomePage({
  searchParams,
}: {
  searchParams: { players?: string; search?: string };
}) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
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
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {games?.map((game) => (
          <GameCard key={game.id} game={game} />
        ))}
      </div>
    </div>
  );
}


