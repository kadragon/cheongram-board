import { createServerComponentClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";

export default async function GameDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createServerComponentClient({ cookies });
  const { data: game } = await supabase
    .from("games")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!game) {
    notFound();
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-2">{game.name}</h1>
      <p className="text-lg text-gray-600 mb-4">
        플레이 인원: {game.min_players}-{game.max_players}명
      </p>
      {/* Add more game details here */}
      <div className="prose max-w-none">
        <p>{game.description || "게임 설명이 없습니다."}</p>
      </div>
    </div>
  );
}
