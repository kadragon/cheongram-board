"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { useDebouncedCallback } from "use-debounce";

export function GameFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleFilterChange = useDebouncedCallback((key: string, value: string) => {
    const current = new URLSearchParams(Array.from(searchParams.entries()));

    if (!value) {
      current.delete(key);
    } else {
      current.set(key, value);
    }

    const search = current.toString();
    const query = search ? `?${search}` : "";

    router.push(`${pathname}${query}`);
  }, 300);

  return (
    <div className="flex items-center space-x-4 mb-4">
      <div>
        <Label htmlFor="search">게임 검색</Label>
        <Input
          id="search"
          placeholder="게임 이름..."
          onChange={(e) => handleFilterChange("search", e.target.value)}
          defaultValue={searchParams.get("search") || ""}
        />
      </div>
      <div>
        <Label htmlFor="players">플레이어 수</Label>
        <Input
          id="players"
          type="number"
          placeholder="예: 4"
          onChange={(e) => handleFilterChange("players", e.target.value)}
          defaultValue={searchParams.get("players") || ""}
        />
      </div>
      {/* Add availability filter later */}
    </div>
  );
}
