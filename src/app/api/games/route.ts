import { NextResponse, NextRequest } from "next/server";
import { checkCloudflareAccessAdmin, getAuthenticatedUserEmail } from "@/utils/auth";
import { handleAPIError, createSuccessResponse } from "@/lib/api-error-handler";
import { createAuthError, ErrorCode } from "@/lib/errors";
import { gameCreateSchema, gameSearchSchema } from "@/lib/validation/schemas";
import { validateRequestBody, validateSearchParams } from "@/lib/validation/middleware";
import { apiLogger } from "@/lib/logging/logger";
import { performanceMonitor } from "@/lib/monitoring/performance";
import { auditLogger } from "@/lib/logging/audit";
import { getD1Adapter } from "@/utils/d1/server";
import type { GameFilters } from "@/lib/db/types";

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    apiLogger.apiRequest('GET', '/api/games');

    // Validate search parameters
    const searchParams = validateSearchParams(request, gameSearchSchema);

    const adapter = getD1Adapter();

    // Convert search params to GameFilters format
    const filters: GameFilters = {
      query: searchParams.query,
      min_players: searchParams.min_players,
      max_players: searchParams.max_players,
      min_play_time: searchParams.min_play_time,
      max_play_time: searchParams.max_play_time,
      complexity: searchParams.complexity,
      // Filter out 'all' as it means no filter
      availability: searchParams.availability === 'all' ? undefined : searchParams.availability,
      sort_by: searchParams.sort_by,
      sort_order: searchParams.sort_order,
      page: searchParams.page || 1,
      limit: searchParams.limit || 20,
    };

    // Measure database query performance
    const result = await performanceMonitor.measureAsync(
      'games_list_query',
      async () => {
        return await adapter.listGames(filters);
      },
      'api',
      {
        filters: searchParams,
        page: filters.page,
        limit: filters.limit
      }
    );

    const duration = Date.now() - startTime;
    apiLogger.apiResponse('GET', '/api/games', 200, duration);

    return createSuccessResponse(result.data, {
      pagination: result.pagination,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    apiLogger.apiResponse('GET', '/api/games', 500, duration);
    apiLogger.error('Games list API error', error as Error, { searchParams: request.url });
    return handleAPIError(error);
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    apiLogger.apiRequest('POST', '/api/games');

    // Check admin authentication via Cloudflare Access
    const isAdmin = checkCloudflareAccessAdmin(request);
    if (!isAdmin) {
      const userEmail = getAuthenticatedUserEmail(request);
      auditLogger.logAccessDenied(userEmail || 'unknown', 'game', 'create');
      throw createAuthError(ErrorCode.FORBIDDEN, "Admin access required");
    }

    const adapter = getD1Adapter();
    const userEmail = getAuthenticatedUserEmail(request)!; // Safe: isAdmin check ensures email exists

    // Validate request body with schema
    const validatedData = await validateRequestBody(request, gameCreateSchema);

    // Measure database insert performance
    const newGame = await performanceMonitor.measureAsync(
      'game_create_query',
      async () => {
        return await adapter.createGame(validatedData);
      },
      'api',
      { gameTitle: validatedData.title }
    );

    // Log successful game creation
    auditLogger.logGameCreated(
      userEmail,
      newGame.id,
      newGame.title,
      validatedData
    );

    const duration = Date.now() - startTime;
    apiLogger.apiResponse('POST', '/api/games', 201, duration);
    apiLogger.info('Game created successfully', {
      gameId: newGame.id,
      gameTitle: newGame.title,
      duration
    });

    return createSuccessResponse(newGame, { timestamp: new Date().toISOString() });
  } catch (error) {
    const duration = Date.now() - startTime;
    apiLogger.apiResponse('POST', '/api/games', 500, duration);
    apiLogger.error('Game creation API error', error as Error);
    return handleAPIError(error);
  }
}
