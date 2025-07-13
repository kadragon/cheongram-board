import { NextResponse } from "next/server";
import { scrapeGame } from "@/utils/scraper";

export async function POST(request: Request) {
  const { url } = await request.json();
  if (!url) {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }

  try {
    const gameData = await scrapeGame(url);
    return NextResponse.json(gameData);
  } catch (error: any) {
    console.error("Scrape API Error:", error);
    return NextResponse.json(
      { error: "Failed to scrape game data.", details: error.message },
      { status: 500 }
    );
  }
}
