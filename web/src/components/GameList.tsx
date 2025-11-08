// Trace: SPEC-homepage-modernization-1, TASK-homepage-004

import { motion } from "framer-motion";
import { GameCard } from "@/components/GameCard";
import { SkeletonCard } from "@/components/SkeletonCard";

type Game = {
  id: number;
  title: string;
  image_url: string;
  koreaboardgames_url: string;
  is_rented: boolean;
  due_date: string | null;
  min_players: number;
  max_players: number;
  play_time: number;
};

interface GameListProps {
  games: Game[] | null;
  isAdmin: boolean;
  isLoading?: boolean;
}

export function GameList({ games, isAdmin, isLoading = false }: GameListProps) {
  // Show skeleton cards while loading
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  // Animation variants
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  };

  const item = {
    hidden: { opacity: 0, scale: 0.95 },
    show: { opacity: 1, scale: 1 },
  };

  return (
    <motion.div
      className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
      variants={container}
      initial="hidden"
      animate="show"
    >
      {games?.map((game) => (
        <motion.div key={game.id} variants={item}>
          <GameCard game={game} isAdmin={isAdmin} />
        </motion.div>
      ))}
    </motion.div>
  );
}
