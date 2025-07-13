import { GameList } from "@/components/GameList";
import { createClient } from "@/utils/supabase/server";
import { AuthButton } from "@/components/AuthButton";

export const dynamic = 'force-dynamic';
export const revalidate = 60;

export default async function HomePage() {
  const supabase = createClient();
  const { data, error } = await supabase.from("games").select("*, rentals(returned_at)");

  if (error) {
    console.error("Error fetching games:", error);
    // Optionally, render an error state
    return <div>Error loading games.</div>;
  }

  const gamesWithStatus = data.map((game) => {
    const is_rented = game.rentals.some((rental: { returned_at: string | null }) => rental.returned_at === null);
    // eslint-disable-next-line no-unused-vars
    const { rentals, ...rest } = game;
    return { ...rest, is_rented };
  });

  return (
    <div className="container mx-auto p-4">
      <div className="text-center my-8">
        <h1 className="text-5xl font-extrabold tracking-tight bg-gradient-to-r from-blue-500 to-teal-400 bg-clip-text text-transparent">
          청람보드
        </h1>
      </div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">게임 목록</h2>
        <AuthButton />
      </div>
      <GameList games={gamesWithStatus} />
    </div>
  );
}


