import Link from "next/link";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";

interface Game {
  id: number;
  title: string;
  image_url: string;
  koreaboardgames_url: string;
  is_rented: boolean;
  return_date: string | null;
  min_players: number;
  max_players: number;
  play_time: number;
}

export function GameCard({ game }: { game: Game }) {
  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-shadow-md">{game.title}</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow">
        <Link href={game.koreaboardgames_url || '#'} target="_blank" rel="noopener noreferrer">
            <img src={game.image_url || '/placeholder.png'} alt={game.title} className="rounded-md object-cover h-48 w-full" />
        </Link>
      </CardContent>
      <CardFooter className="flex justify-between items-center text-sm text-gray-500">
        {game.is_rented ? (
          <Badge variant="destructive">대여중 (~{new Date(game.return_date!).toLocaleDateString()})</Badge>
        ) : (
          <Badge variant="secondary">대여 가능</Badge>
        )}
        <div className="flex items-center">
          <span>{game.min_players}-{game.max_players}인</span>
          <span className="mx-1">·</span>
          <span>{game.play_time}분</span>
        </div>
      </CardFooter>
    </Card>
  );
}
