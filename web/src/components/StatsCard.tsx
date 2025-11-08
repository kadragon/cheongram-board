// Trace: SPEC-homepage-modernization-1, TASK-homepage-001

import { motion } from "framer-motion";
import { Card, CardContent } from "./ui/card";

interface StatsCardProps {
  label: string;
  value: number;
  icon?: React.ReactNode;
  delay?: number;
  isLoading?: boolean;
}

export function StatsCard({ label, value, icon, delay = 0, isLoading = false }: StatsCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut', delay }}
    >
      <Card className="backdrop-blur-sm bg-white/10 border-white/20 transition-all duration-300 hover:bg-white/20">
      <CardContent className="p-6 flex items-center gap-4">
        {icon && (
          <div className="text-white/80 text-3xl">
            {icon}
          </div>
        )}
        <div>
          <p className="text-sm text-white/70 font-medium">{label}</p>
          {isLoading ? (
            <div className="h-9 w-16 bg-white/20 rounded skeleton"></div>
          ) : (
            <p className="text-3xl font-bold text-white">{value}</p>
          )}
        </div>
      </CardContent>
      </Card>
    </motion.div>
  );
}
