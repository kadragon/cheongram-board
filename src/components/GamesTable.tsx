"use client";

import { useState, useEffect } from "react";
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
  const [games, setGames] = useState<any[]>([]);
  const [selectedGame, setSelectedGame] = useState<any | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedGames, setSelectedGames] = useState<number[]>([]);

  async function fetchGames() {
    try {
      const response = await fetch("/api/games");
      if (response.ok) {
        const result = await response.json();
        setGames(result.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch games:", error);
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
    try {
      const response = await fetch(`/api/games/${id}`, {
        method: "DELETE",
      });
      if (response.ok || response.status === 204) {
        fetchGames();
      } else {
        const error = await response.json();
        alert(`Failed to delete game: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error("Failed to delete game:", error);
      alert("Failed to delete game");
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedGames.length} games?`)) {
      return;
    }

    try {
      // Delete games sequentially
      for (const id of selectedGames) {
        await fetch(`/api/games/${id}`, {
          method: "DELETE",
        });
      }
      setSelectedGames([]);
      fetchGames();
    } catch (error) {
      console.error("Failed to delete games:", error);
      alert("Failed to delete some games");
    }
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
      + ["ID", "Title", "Min Players", "Max Players", "Play Time", "Complexity", "Description"].join(",") + "\n"
      + games.map(e => [
          e.id,
          `"${e.title}"`,
          e.min_players,
          e.max_players,
          e.play_time,
          e.complexity,
          `"${e.description || ''}"`
        ].join(",")).join("\n");
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
            <th className="py-2 px-4 border-b text-center">Complexity</th>
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
              <td className="py-2 px-4 border-b text-center">{game.complexity || '-'}</td>
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
