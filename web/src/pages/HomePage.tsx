import { useEffect, useState } from 'react';
import { GameList } from '@/components/GameList';
import { AuthButton } from '@/components/AuthButton';
import { apiClient } from '@/lib/api-client';

export default function HomePage() {
  const [games, setGames] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchGames() {
      try {
        setIsLoading(true);
        const result = await apiClient.listGames();

        // Transform API response to match expected format
        const gamesWithStatus = result.data.map((game: any) => ({
          ...game,
          is_rented: game.rentals?.some((rental: any) => !rental.returned_at) || false,
          due_date: game.rentals?.find((rental: any) => !rental.returned_at)?.due_date || null,
        }));

        setGames(gamesWithStatus);
      } catch (err: any) {
        console.error('Error fetching games:', err);
        setError(err?.error?.userMessage || err?.error?.message || 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    }

    fetchGames();
  }, []);

  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <div className="text-center my-8">
          <h1 className="text-5xl font-extrabold tracking-tight bg-gradient-to-r from-blue-500 to-teal-400 bg-clip-text text-transparent">
            청람보드
          </h1>
        </div>
        <div className="text-center">로딩 중...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <div className="text-center my-8">
          <h1 className="text-5xl font-extrabold tracking-tight bg-gradient-to-r from-blue-500 to-teal-400 bg-clip-text text-transparent">
            청람보드
          </h1>
        </div>
        <div className="text-center text-red-500">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="text-center my-8">
        <h1 className="text-5xl font-extrabold tracking-tight bg-gradient-to-r from-blue-500 to-teal-400 bg-clip-text text-transparent">
          청람보드
        </h1>
      </div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">보유 게임 정보</h2>
        <AuthButton />
      </div>
      <GameList games={games} isAdmin={false} />
    </div>
  );
}
