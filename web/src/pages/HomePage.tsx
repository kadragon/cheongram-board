// Trace: SPEC-homepage-modernization-1, TASK-homepage-001, TASK-homepage-002

import { useEffect, useState, useMemo } from 'react';
import { GameList } from '@/components/GameList';
import { AuthButton } from '@/components/AuthButton';
import { HeroSection } from '@/components/HeroSection';
import { Header } from '@/components/Header';
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

        // API already provides is_rented and return_date
        setGames(result.data);
      } catch (err: any) {
        console.error('Error fetching games:', err);
        setError(err?.error?.userMessage || err?.error?.message || 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    }

    fetchGames();
  }, []);

  // Calculate statistics
  const stats = useMemo(() => {
    const total = games.length;
    const available = games.filter(game => !game.is_rented).length;
    return { total, available };
  }, [games]);

  if (isLoading) {
    return (
      <>
        <Header />
        <div className="container mx-auto p-4">
          <HeroSection totalGames={0} availableGames={0} />

          <div className="flex justify-between items-center mb-6 mt-8">
            <div>
              <h2 className="text-3xl font-bold mb-1">전체 게임</h2>
              <p className="text-sm text-muted-foreground">로딩 중...</p>
            </div>
            <AuthButton />
          </div>

          <GameList games={null} isAdmin={false} isLoading={true} />
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Header />
        <div className="container mx-auto p-4">
          <HeroSection totalGames={0} availableGames={0} />
          <div className="text-center py-8">
            <div className="text-red-500 text-lg">⚠️ 오류 발생</div>
            <p className="text-muted-foreground mt-2">{error}</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="container mx-auto p-4">
        <HeroSection totalGames={stats.total} availableGames={stats.available} />

        {/* Section Header */}
        <div className="flex justify-between items-center mb-6 mt-8">
          <div>
            <h2 className="text-3xl font-bold mb-1">전체 게임</h2>
            <p className="text-sm text-muted-foreground">
              총 {stats.total}개의 게임 · {stats.available}개 대여 가능
            </p>
          </div>
          <AuthButton />
        </div>

        {/* Game List */}
        <GameList games={games} isAdmin={false} />
      </div>
    </>
  );
}
