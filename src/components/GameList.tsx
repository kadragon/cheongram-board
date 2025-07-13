import { GameCard } from "@/components/GameCard";

// Assuming GameCard expects a 'game' prop with at least an 'id'.
// You can expand this type based on your actual 'games' table schema.
type Game = {
  id: number;
  [key: string]: any;
};

export function GameList({ games }: { games: Game[] | null }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {games?.map((game) => (
        <GameCard key={game.id} game={game} />
      ))}
    </div>
  );
}
