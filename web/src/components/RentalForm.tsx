"use client";

import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { apiClient } from "@/lib/api-client";

export function RentalForm({
  initialData,
  onSubmit,
  isSubmitting,
}: {
  initialData?: any;
  onSubmit: (data: any) => void;
  isSubmitting?: boolean;
}) {
  const [formData, setFormData] = useState({
    renter_name: "",
    rental_date: new Date().toISOString().split("T")[0],
    game_id: "",
  });
  const [games, setGames] = useState<any[]>([]);
  const [isLoadingGames, setIsLoadingGames] = useState(true);
  const [gamesError, setGamesError] = useState<string | null>(null);

  const fetchGames = async () => {
    setIsLoadingGames(true);
    setGamesError(null);
    try {
      const result = await apiClient.listGames();
      setGames(result.data);
    } catch (error: any) {
      console.error('Failed to fetch games:', error);
      const errorMessage = error?.error?.userMessage || error?.error?.message || 'Failed to load games';
      setGamesError(errorMessage);
    } finally {
      setIsLoadingGames(false);
    }
  };

  useEffect(() => {
    fetchGames();
  }, []);

  useEffect(() => {
    if (initialData) {
      setFormData({
        renter_name: initialData.renter_name || "",
        rental_date: initialData.rental_date || new Date().toISOString().split("T")[0],
        game_id: initialData.game_id || "",
      });
    }
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [id]: value,
    }));
  };

  const handleSelectChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      game_id: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="renter_name">Renter Name</Label>
        <Input
          id="renter_name"
          value={formData.renter_name}
          onChange={handleChange}
          disabled={isSubmitting}
        />
      </div>
      <div>
        <Label htmlFor="rental_date">Rental Date</Label>
        <Input
          id="rental_date"
          type="date"
          value={formData.rental_date}
          onChange={handleChange}
          disabled={isSubmitting}
        />
      </div>
      <div>
        <Label htmlFor="game_id">Game</Label>
        {isLoadingGames ? (
          <div className="flex items-center justify-center p-3 border rounded-md bg-muted/50">
            <span className="text-sm text-muted-foreground">Loading games...</span>
          </div>
        ) : gamesError ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 border border-destructive/50 rounded-md bg-destructive/10">
              <span className="text-sm text-destructive">{gamesError}</span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={fetchGames}
              className="w-full"
            >
              Retry
            </Button>
          </div>
        ) : (
          <Select onValueChange={handleSelectChange} value={formData.game_id}>
            <SelectTrigger>
              <SelectValue placeholder="Select a game" />
            </SelectTrigger>
            <SelectContent>
              {games.length === 0 ? (
                <div className="p-2 text-sm text-muted-foreground text-center">
                  No games available
                </div>
              ) : (
                games.map((game) => (
                  <SelectItem key={game.id} value={game.id.toString()}>
                    {game.title}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        )}
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Save Rental"}
        </Button>
      </div>
    </form>
  );
}
