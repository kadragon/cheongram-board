"use client";

import { useRouter } from "next/navigation";
import { GamesTable } from "@/components/GamesTable";
import { ScrapeDialog } from "@/components/ScrapeDialog";

export default function AdminGamesPage() {
  const router = useRouter();

  const handleGameAdded = () => {
    // Refresh the page to show the new game in the table
    router.refresh();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Game Management</h1>
        <ScrapeDialog onGameAdded={handleGameAdded} />
      </div>
      <GamesTable />
    </div>
  );
}