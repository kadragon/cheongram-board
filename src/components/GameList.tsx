import { GameCard } from "@/components/GameCard";

type Game = {
  id: number;
  title: string;
  image_url: string;
  koreaboardgames_url: string;
  is_rented: boolean;
  due_date: string | null;
  min_players: number;
  max_players: number;
  play_time: number;
};

export function GameList({ games, isAdmin }: { games: Game[] | null, isAdmin: boolean }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {games?.map((game) => (
        <GameCard key={game.id} game={game} isAdmin={isAdmin} />
      ))}
    </div>
  );
}
