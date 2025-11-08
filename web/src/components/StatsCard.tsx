// Trace: SPEC-homepage-modernization-1, TASK-homepage-001

import { Card, CardContent } from "./ui/card";

interface StatsCardProps {
  label: string;
  value: number;
  icon?: React.ReactNode;
  delay?: number;
}

export function StatsCard({ label, value, icon, delay = 0 }: StatsCardProps) {
  return (
    <Card
      className="backdrop-blur-sm bg-white/10 border-white/20 transition-all duration-300 hover:bg-white/20"
      style={{
        animation: `fadeInLeft 0.4s ease-out ${delay}s both`
      }}
    >
      <CardContent className="p-6 flex items-center gap-4">
        {icon && (
          <div className="text-white/80 text-3xl">
            {icon}
          </div>
        )}
        <div>
          <p className="text-sm text-white/70 font-medium">{label}</p>
          <p className="text-3xl font-bold text-white">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
