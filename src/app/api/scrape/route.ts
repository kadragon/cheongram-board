import { createClient } from "@/utils/supabase/server";
import { NextResponse, NextRequest } from "next/server";
import { scrapeGame } from "@/utils/scraper";
import { checkAdmin } from "@/utils/auth";



export async function POST(request: NextRequest) {
  const supabase = createClient();
  if (!await checkAdmin(supabase)) {
    return NextResponse.json({ error: "Forbidden: Not an admin" }, { status: 403 });
  }

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
