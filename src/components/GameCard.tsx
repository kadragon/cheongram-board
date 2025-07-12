import Link from "next/link";

interface Game {
  id: number;
  name: string;
  min_players: number;
  max_players: number;
  // Add other game properties as needed
}

export function GameCard({ game }: { game: Game }) {
  return (
    <Link href={`/games/${game.id}`}>
      <div className="border p-4 rounded-lg hover:shadow-lg transition-shadow">
        <h2 className="text-lg font-bold">{game.name}</h2>
        <p className="text-sm text-gray-500">
          {game.min_players}-{game.max_players}인
        </p>
      </div>
    </Link>
  );
}
