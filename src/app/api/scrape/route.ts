import { createClient } from "@/utils/supabase/server";
import { NextResponse, NextRequest } from "next/server";
import { scrapeGame } from "@/utils/scraper";
import { checkAdmin } from "@/utils/auth";
import { handleAPIError, createSuccessResponse } from "@/lib/api-error-handler";
import { createAuthError, createValidationError, AppError, ErrorCode } from "@/lib/errors";

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    
    if (!await checkAdmin(supabase)) {
      throw createAuthError(ErrorCode.FORBIDDEN, "Admin access required");
    }

    const { url } = await request.json();
    
    if (!url) {
      throw createValidationError("URL is required", "url");
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      throw createValidationError("Invalid URL format", "url", url);
    }

    const gameData = await scrapeGame(url);
    
    if (!gameData) {
      throw new AppError(
        ErrorCode.INTERNAL_ERROR,
        "Failed to scrape game data",
        "게임 정보를 가져올 수 없습니다. URL을 확인해주세요.",
        500
      );
    }

    return createSuccessResponse(gameData, {
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    // Handle scraping-specific errors
    if (error instanceof Error && error.message.includes('scrape')) {
      const scrapingError = new AppError(
        ErrorCode.INTERNAL_ERROR,
        error.message,
        "웹사이트에서 게임 정보를 가져오는 중 오류가 발생했습니다.",
        500,
        { context: { originalError: error.message } }
      );
      return handleAPIError(scrapingError);
    }
    
    return handleAPIError(error);
  }
}
