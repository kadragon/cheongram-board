import { createClient } from "@/utils/supabase/server";
import { NextResponse, NextRequest } from "next/server";
import { scrapeGame } from "@/utils/scraper";

async function checkAdmin(supabase: any) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: userDetails } = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  return userDetails?.is_admin || false;
}

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
