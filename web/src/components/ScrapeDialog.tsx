"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { GameForm } from "./GameForm";
import { apiClient } from "@/lib/api-client";

export function ScrapeDialog({ onGameAdded }: { onGameAdded: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [scrapedData, setScrapedData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleScrape = async () => {
    if (!url) return;
    setIsLoading(true);
    setError(null);
    setScrapedData(null);

    try {
      const result = await apiClient.scrapeGameInfo(url);
      setScrapedData(result.data);
    } catch (err: any) {
      const errorMessage = err?.error?.userMessage || err?.error?.message || "Failed to scrape the URL.";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (formData: any) => {
    setIsLoading(true);
    setError(null);
    try {
      const processedData = {
        ...formData,
        min_players: formData.min_players ? parseInt(formData.min_players, 10) : null,
        max_players: formData.max_players ? parseInt(formData.max_players, 10) : null,
        play_time: formData.play_time ? parseInt(formData.play_time, 10) : null,
      };

      // Remove NaN values if parsing fails
      if (isNaN(processedData.min_players)) processedData.min_players = null;
      if (isNaN(processedData.max_players)) processedData.max_players = null;
      if (isNaN(processedData.play_time)) processedData.play_time = null;

      await apiClient.createGame(processedData);

      // Success
      onGameAdded();
      setIsOpen(false);
      resetState();

    } catch (err: any) {
      const errorMessage = err?.error?.userMessage || err?.error?.message || "An unknown error occurred.";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const resetState = () => {
    setUrl("");
    setScrapedData(null);
    setIsLoading(false);
    setError(null);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetState();
    }
    setIsOpen(open);
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>Add New Game from URL</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Scrape and Add New Game</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex items-center gap-2">
            <Input
              id="url"
              placeholder="Enter koreaboardgames.com URL"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={isLoading}
            />
            <Button onClick={handleScrape} disabled={isLoading || !url}>
              {isLoading && !scrapedData ? "Scraping..." : "Scrape"}
            </Button>
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
        </div>

        {scrapedData && (
          <GameForm
            initialData={scrapedData}
            onSubmit={handleSave}
            isSubmitting={isLoading}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
