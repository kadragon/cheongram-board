// Trace: SPEC-homepage-modernization-1, TASK-homepage-001

import { motion } from "framer-motion";
import { StatsCard } from "./StatsCard";

interface HeroSectionProps {
  totalGames: number;
  availableGames: number;
  isLoading?: boolean;
}

export function HeroSection({ totalGames, availableGames, isLoading = false }: HeroSectionProps) {
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-blue-500 via-blue-600 to-teal-400 rounded-2xl shadow-2xl mb-8">
      {/* Animated background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl animate-blob"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl animate-blob [animation-delay:2s]"></div>
        <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-white rounded-full blur-3xl animate-blob [animation-delay:4s]"></div>
      </div>

      {/* Content */}
      <div className="relative px-6 py-12 md:px-12 md:py-16">
        {/* Title Section */}
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold text-white mb-4 tracking-tight">
            🎲 청람보드
          </h1>
          <p className="text-lg md:text-xl text-white/90 font-medium max-w-2xl mx-auto">
            청람교회 보드게임 대여 서비스
          </p>
          <p className="text-sm md:text-base text-white/70 mt-2 max-w-xl mx-auto">
            다양한 보드게임을 무료로 대여하고 즐거운 시간을 보내세요
          </p>
        </motion.div>

        {/* Statistics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
          <StatsCard
            label="총 게임 수"
            value={totalGames}
            icon="📦"
            delay={0.1}
            isLoading={isLoading}
          />
          <StatsCard
            label="대여 가능"
            value={availableGames}
            icon="✅"
            delay={0.2}
            isLoading={isLoading}
          />
        </div>

        {/* Search Preview (Future) */}
        <motion.div
          className="mt-8 max-w-2xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut', delay: 0.3 }}
        >
          <div className="relative">
            <input
              type="text"
              placeholder="게임 이름으로 검색... (준비 중)"
              disabled
              className="w-full px-6 py-4 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50 transition-all cursor-not-allowed"
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-white/60">
              🔍
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
