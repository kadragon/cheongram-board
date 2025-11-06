import { createClient } from "@/utils/supabase/server";
import { NextResponse, NextRequest } from "next/server";
import { checkAdmin } from "@/utils/auth";
import { handleAPIError, createSuccessResponse } from "@/lib/api-error-handler";
import { handleSupabaseError, createAuthError, ErrorCode } from "@/lib/errors";
import { gameCreateSchema, gameSearchSchema } from "@/lib/validation/schemas";
import { validateRequestBody, validateSearchParams } from "@/lib/validation/middleware";
import { apiLogger } from "@/lib/logging/logger";
import { performanceMonitor } from "@/lib/monitoring/performance";
import { auditLogger } from "@/lib/logging/audit";

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    apiLogger.apiRequest('GET', '/api/games');
    
    // Validate search parameters
    const searchParams = validateSearchParams(request, gameSearchSchema);
    
    const supabase = createClient();
    
    // Measure database query performance
    const queryResult = await performanceMonitor.measureAsync(
      'games_list_query',
      async () => {
        let query = supabase
          .from("games")
          .select("*, rentals(returned_at, due_date)", { count: 'exact' });

        // Apply search filters
        if (searchParams.query) {
          query = query.ilike('title', `%${searchParams.query}%`);
        }

        if (searchParams.min_players) {
          query = query.gte('min_players', searchParams.min_players);
        }

        if (searchParams.max_players) {
          query = query.lte('max_players', searchParams.max_players);
        }

        if (searchParams.min_play_time) {
          query = query.gte('play_time', searchParams.min_play_time);
        }

        if (searchParams.max_play_time) {
          query = query.lte('play_time', searchParams.max_play_time);
        }

        if (searchParams.complexity) {
          query = query.eq('complexity', searchParams.complexity);
        }

        // Apply sorting
        if (searchParams.sort_by) {
          query = query.order(searchParams.sort_by, { 
            ascending: searchParams.sort_order === 'asc' 
          });
        } else {
          query = query.order('created_at', { ascending: false });
        }

        // Apply pagination
        const page = searchParams.page || 1;
        const limit = searchParams.limit || 20;
        const offset = (page - 1) * limit;
        
        query = query.range(offset, offset + limit - 1);

        const result = await query;
        return result;
      },
      'api',
      {
        filters: searchParams,
        page: searchParams.page || 1,
        limit: searchParams.limit || 20
      }
    );

    const { data: games, error, count } = queryResult;

    if (error) {
      throw handleSupabaseError(error);
    }

    const gamesWithStatus = games.map((game) => {
      const activeRental = game.rentals.find(
        (rental: { returned_at: string | null }) => rental.returned_at === null
      );
      const is_rented = !!activeRental;
      const return_date = activeRental ? activeRental.due_date : null;

      const { rentals, ...rest } = game;
      return { ...rest, is_rented, return_date };
    });

    // Filter by availability if specified
    let filteredGames = gamesWithStatus;
    if (searchParams.availability === 'available') {
      filteredGames = gamesWithStatus.filter(game => !game.is_rented);
    } else if (searchParams.availability === 'rented') {
      filteredGames = gamesWithStatus.filter(game => game.is_rented);
    }

    const duration = Date.now() - startTime;
    apiLogger.apiResponse('GET', '/api/games', 200, duration);

    return createSuccessResponse(filteredGames, {
      pagination: {
        page: searchParams.page || 1,
        limit: searchParams.limit || 20,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / (searchParams.limit || 20)),
      },
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
    
    const supabase = createClient();
    
    if (!await checkAdmin(supabase)) {
      auditLogger.logAccessDenied('unknown', 'game', 'create');
      throw createAuthError(ErrorCode.FORBIDDEN, "Admin access required");
    }

    // Validate request body with schema
    const validatedData = await validateRequestBody(request, gameCreateSchema);

    // Measure database insert performance
    const insertResult = await performanceMonitor.measureAsync(
      'game_create_query',
      async () => {
        const result = await supabase
          .from("games")
          .insert(validatedData)
          .select()
          .single();
        return result;
      },
      'api',
      { gameTitle: validatedData.title }
    );

    const { data: newGame, error } = insertResult;

    if (error) {
      throw handleSupabaseError(error);
    }

    // Log successful game creation
    auditLogger.logGameCreated(
      'admin', // In a real app, you'd get this from the authenticated user
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
