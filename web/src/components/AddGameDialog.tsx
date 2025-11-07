"use client";

import { useState } from 'react';
import {
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
export function AddGameDialog() {
  const [url, setUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [open, setOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // 1. Scrape game data from the provided URL
      const scrapeResponse = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      if (!scrapeResponse.ok) {
        throw new Error('게임 정보 가져오기에 실패했습니다.');
      }

      const gameData = await scrapeResponse.json();

      // 2. Add the scraped game to the database
      const addGameResponse = await fetch('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(gameData),
      });

      if (!addGameResponse.ok) {
        const errorData = await addGameResponse.json();
        throw new Error(errorData.error || '게임 추가에 실패했습니다.');
      }

      // Success
      alert('게임이 성공적으로 추가되었습니다.');
      setOpen(false); // Close the dialog
      window.location.reload(); // Refresh the page to show the new game

    } catch (error: any) {
      console.error(error);
      alert(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>게임 추가</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>URL로 새 게임 추가</DialogTitle>
          <DialogDescription>
            코리아보드게임즈 상품 페이지 URL을 입력하여 게임을 추가합니다.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="url">게임 정보 URL</Label>
            <Input
              id="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://koreaboardgames.com/goods/goods_view.php?goodsNo=..."
              disabled={isSubmitting}
            />
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting || !url.trim()}>
              {isSubmitting ? '추가하는 중...' : '가져오기 및 추가'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
