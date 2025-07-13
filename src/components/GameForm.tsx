"use client";

import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

export function GameForm({
  initialData,
  onSubmit,
  isSubmitting,
}: {
  initialData?: any;
  onSubmit: (data: any) => void;
  isSubmitting?: boolean;
}) {
  const [formData, setFormData] = useState({
    title: "",
    min_players: "",
    max_players: "",
    play_time: "",
    koreaboardgames_url: "",
    image_url: "",
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title || "",
        min_players: initialData.min_players || "",
        max_players: initialData.max_players || "",
        play_time: initialData.play_time || "",
        koreaboardgames_url: initialData.koreaboardgames_url || "",
        image_url: initialData.image_url || "",
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
       <div>
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={handleChange}
          disabled={isSubmitting}
        />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="min_players">Min Players</Label>
          <Input
            id="min_players"
            type="number"
            value={formData.min_players}
            onChange={handleChange}
            disabled={isSubmitting}
          />
        </div>
        <div>
          <Label htmlFor="max_players">Max Players</Label>
          <Input
            id="max_players"
            type="number"
            value={formData.max_players}
            onChange={handleChange}
            disabled={isSubmitting}
          />
        </div>
        <div>
          <Label htmlFor="play_time">Play Time (min)</Label>
          <Input
            id="play_time"
            type="number"
            value={formData.play_time}
            onChange={handleChange}
            disabled={isSubmitting}
          />
        </div>
      </div>
      <div>
        <Label htmlFor="koreaboardgames_url">URL</Label>
        <Input
          id="koreaboardgames_url"
          value={formData.koreaboardgames_url}
          onChange={handleChange}
          disabled={isSubmitting}
        />
      </div>
      <div>
        <Label htmlFor="image_url">Image URL</Label>
        <Input
          id="image_url"
          value={formData.image_url}
          onChange={handleChange}
          disabled={isSubmitting}
        />
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Save Game"}
        </Button>
      </div>
    </form>
  );
}