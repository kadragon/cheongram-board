"use client";

import Link from "next/link";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { X } from "lucide-react"; // Import the X icon

interface Game {
  id: number;
  title: string;
  image_url: string;
  koreaboardgames_url: string;
  is_rented: boolean;
  due_date: string | null;
  min_players: number;
  max_players: number;
  play_time: number;
}

export function GameCard({ game, isAdmin }: { game: Game, isAdmin: boolean }) {
  const getReturnDateString = () => {
    if (!game.due_date) {
      return null;
    }

    const date = new Date(game.due_date);
    if (isNaN(date.getTime())) {
      return null;
    }
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `(~${month}-${day})`;
  };

  const returnDateDisplay = getReturnDateString();

  const handleDelete = async () => {
    if (confirm(`'${game.title}' 게임을 삭제하시겠습니까?`)) {
      const response = await fetch(`/api/games/${game.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        window.location.reload();
      } else {
        alert("게임 삭제에 실패했습니다.");
      }
    }
  };

  return (
    <Card className="flex flex-col relative">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-xl font-bold text-shadow-md">{game.title}</CardTitle>
        {isAdmin && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDelete}
            className="absolute top-2 right-2 h-6 w-6 text-gray-500 hover:text-red-500"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent className="flex-grow">
        <Link href={game.koreaboardgames_url || '#'} target="_blank" rel="noopener noreferrer">
            <img src={game.image_url || '/placeholder.png'} alt={game.title} className="rounded-md object-cover h-48 w-full" />
        </Link>
      </CardContent>
      <CardFooter className="flex justify-between items-center text-sm text-gray-500">
        {game.is_rented ? (
          <Badge variant="destructive">대여중 {returnDateDisplay}</Badge>
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
