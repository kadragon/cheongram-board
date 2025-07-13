"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { GameForm } from "./GameForm";
import { Checkbox } from "./ui/checkbox";

export function GamesTable() {
  const supabase = createClient();
  const [games, setGames] = useState<any[]>([]);
  const [selectedGame, setSelectedGame] = useState<any | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedGames, setSelectedGames] = useState<number[]>([]);

  async function fetchGames() {
    const { data } = await supabase.from("games").select("*");
    if (data) {
      setGames(data);
    }
  }

  useEffect(() => {
    fetchGames();
  }, []);

  const handleSave = () => {
    setIsDialogOpen(false);
    fetchGames();
  };

  const handleDelete = async (id: number) => {
    await supabase.from("games").delete().eq("id", id);
    fetchGames();
  };

  const handleBulkDelete = async () => {
    await supabase.from("games").delete().in("id", selectedGames);
    setSelectedGames([]);
    fetchGames();
  };

  const handleSelectGame = (id: number) => {
    if (selectedGames.includes(id)) {
      setSelectedGames(selectedGames.filter((gameId) => gameId !== id));
    } else {
      setSelectedGames([...selectedGames, id]);
    }
  };

  const handleExport = () => {
    const csvContent = "data:text/csv;charset=utf-8,"
      + ["ID", "Title", "Min Players", "Max Players", "Play Time", "URL"].join(",") + "\n"
      + games.map(e => [e.id, e.title, e.min_players, e.max_players, e.play_time, e.koreaboardgames_url].join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "games.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button onClick={handleExport} className="mr-2">Export to CSV</Button>
        {selectedGames.length > 0 && (
          <Button variant="destructive" onClick={handleBulkDelete} className="mr-2">
            Delete Selected ({selectedGames.length})
          </Button>
        )}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setSelectedGame(null)}>Add Game</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{selectedGame ? "Edit Game" : "Add Game"}</DialogTitle>
            </DialogHeader>
            <GameForm initialData={selectedGame} onSubmit={handleSave} />
          </DialogContent>
        </Dialog>
      </div>
      <div className="overflow-x-auto">
      <table className="min-w-full bg-white">
        <thead>
          <tr>
            <th className="py-2 px-4 border-b text-center">
              <Checkbox
                checked={selectedGames.length === games.length && games.length > 0}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setSelectedGames(games.map((game) => game.id));
                  } else {
                    setSelectedGames([]);
                  }
                }}
              />
            </th>
            <th className="py-2 px-4 border-b">Title</th>
            <th className="py-2 px-4 border-b text-center">Players</th>
            <th className="py-2 px-4 border-b text-center">Play Time (min)</th>
            <th className="py-2 px-4 border-b text-center">URL</th>
            <th className="py-2 px-4 border-b text-center">Actions</th>
          </tr>
        </thead>
        <tbody>
          {games.map((game) => (
            <tr key={game.id}>
              <td className="py-2 px-4 border-b text-center">
                <Checkbox
                  checked={selectedGames.includes(game.id)}
                  onCheckedChange={() => handleSelectGame(game.id)}
                />
              </td>
              <td className="py-2 px-4 border-b">{game.title}</td>
              <td className="py-2 px-4 border-b text-center">{game.min_players}-{game.max_players}</td>
              <td className="py-2 px-4 border-b text-center">{game.play_time}</td>
              <td className="py-2 px-4 border-b text-center">
                <a href={game.koreaboardgames_url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                  Link
                </a>
              </td>
              <td className="py-2 px-4 border-b text-center">
                <Dialog open={isDialogOpen && selectedGame?.id === game.id} onOpenChange={(open) => {
                  if (!open) {
                    setSelectedGame(null);
                  }
                  setIsDialogOpen(open);
                }}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="mr-2" onClick={() => {
                      setSelectedGame(game);
                      setIsDialogOpen(true);
                    }}>Edit</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Edit Game</DialogTitle>
                    </DialogHeader>
                    <GameForm initialData={selectedGame} onSubmit={handleSave} />
                  </DialogContent>
                </Dialog>
                <Button variant="destructive" size="sm" onClick={() => handleDelete(game.id)}>Delete</Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}