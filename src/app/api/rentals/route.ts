import { createClient } from "@/utils/supabase/server";
import { NextResponse, NextRequest } from "next/server";
import { checkAdmin } from "@/utils/auth";
import { handleAPIError, createSuccessResponse } from "@/lib/api-error-handler";
import { handleSupabaseError, createAuthError, AppError, ErrorCode } from "@/lib/errors";
import { rentalCreateSchema, rentalSearchSchema } from "@/lib/validation/schemas";
import { validateRequestBody, validateSearchParams } from "@/lib/validation/middleware";
import { apiLogger } from "@/lib/logging/logger";
import { performanceMonitor } from "@/lib/monitoring/performance";
import { auditLogger } from "@/lib/logging/audit";
import { extractRequestContext, dataEventLogger } from "@/lib/logging/integration";

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const context = extractRequestContext(request, 'admin'); // In real app, get from auth
  
  try {
    apiLogger.apiRequest('GET', '/api/rentals', { requestId: context.requestId });
    
    const supabase = createClient();
    
    if (!await checkAdmin(supabase)) {
      auditLogger.logAccessDenied('admin', 'rentals', 'list', {
        ipAddress: context.ipAddress,
        requestId: context.requestId,
      });
      throw createAuthError(ErrorCode.FORBIDDEN, "Admin access required");
    }

    // Validate search parameters
    const searchParams = validateSearchParams(request, rentalSearchSchema);

    // Measure database query performance
    const queryResult = await performanceMonitor.measureAsync(
      'rentals_list_query',
      async () => {
        let query = supabase
          .from("rentals")
          .select("*, games (*)", { count: "exact" });

        // Apply search filters
        if (searchParams.query) {
          query = query.ilike('name', `%${searchParams.query}%`);
        }

        if (searchParams.game_id) {
          query = query.eq('game_id', searchParams.game_id);
        }

        if (searchParams.status) {
          switch (searchParams.status) {
            case 'active':
              query = query.is('returned_at', null);
              break;
            case 'returned':
              query = query.not('returned_at', 'is', null);
              break;
            case 'overdue':
              query = query.is('returned_at', null).lt('due_date', new Date().toISOString().split('T')[0]);
              break;
          }
        }

        if (searchParams.date_from) {
          query = query.gte('rented_at', searchParams.date_from);
        }

        if (searchParams.date_to) {
          query = query.lte('rented_at', searchParams.date_to);
        }

        // Apply sorting
        if (searchParams.sort_by) {
          query = query.order(searchParams.sort_by, { 
            ascending: searchParams.sort_order === 'asc' 
          });
        } else {
          query = query.order('rented_at', { ascending: false });
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
        requestId: context.requestId,
        page: searchParams.page || 1,
        limit: searchParams.limit || 20
      }
    );

    const { data: rentals, error, count } = queryResult;

    if (error) {
      throw handleSupabaseError(error);
    }

    const duration = Date.now() - startTime;
    apiLogger.apiResponse('GET', '/api/rentals', 200, duration);

    return createSuccessResponse(rentals, {
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
    apiLogger.apiResponse('GET', '/api/rentals', 500, duration);
    apiLogger.error('Rentals list API error', error as Error, { 
      requestId: context.requestId,
      searchParams: request.url 
    });
    return handleAPIError(error);
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const context = extractRequestContext(request, 'admin'); // In real app, get from auth
  
  try {
    apiLogger.apiRequest('POST', '/api/rentals', { requestId: context.requestId });
    
    const supabase = createClient();
    
    if (!await checkAdmin(supabase)) {
      auditLogger.logAccessDenied('admin', 'rental', 'create', {
        ipAddress: context.ipAddress,
        requestId: context.requestId,
      });
      throw createAuthError(ErrorCode.FORBIDDEN, "Admin access required");
    }

    // Validate request body with schema
    const validatedData = await validateRequestBody(request, rentalCreateSchema);

    // Check if game is already rented with performance monitoring
    const existingRentalResult = await performanceMonitor.measureAsync(
      'rental_availability_check',
      async () => {
        const result = await supabase
          .from("rentals")
          .select("id")
          .eq("game_id", validatedData.game_id)
          .is("returned_at", null)
          .single();
        return result;
      },
      'api',
      { 
        gameId: validatedData.game_id,
        requestId: context.requestId 
      }
    );

    const { data: existingRental, error: existingRentalError } = existingRentalResult;

    if (existingRentalError && existingRentalError.code !== 'PGRST116') {
      throw handleSupabaseError(existingRentalError);
    }

    if (existingRental) {
      apiLogger.warn('Rental creation failed - game already rented', {
        gameId: validatedData.game_id,
        requestId: context.requestId,
      });
      throw new AppError(
        ErrorCode.GAME_ALREADY_RENTED,
        "Game is already rented",
        "이 게임은 이미 대여 중입니다.",
        409,
        { context: { game_id: validatedData.game_id } }
      );
    }

    // Calculate due date (14 days from rental date) if not provided
    let dueDate = validatedData.due_date;
    if (!dueDate) {
      const rentalDate = new Date(validatedData.rented_at);
      rentalDate.setDate(rentalDate.getDate() + 14);
      dueDate = rentalDate.toISOString().split("T")[0];
    }

    // Create rental with performance monitoring
    const insertResult = await performanceMonitor.measureAsync(
      'rental_create_query',
      async () => {
        const result = await supabase
          .from("rentals")
          .insert({
            name: validatedData.name,
            email: validatedData.email,
            phone: validatedData.phone,
            rented_at: validatedData.rented_at,
            due_date: dueDate,
            game_id: validatedData.game_id,
            notes: validatedData.notes,
          })
          .select("*, games (*)");
        return result;
      },
      'api',
      { 
        renterName: validatedData.name,
        gameId: validatedData.game_id,
        requestId: context.requestId 
      }
    );

    const { data, error } = insertResult;

    if (error) {
      throw handleSupabaseError(error);
    }

    const newRental = Array.isArray(data) ? data[0] : data;

    // Log successful rental creation
    dataEventLogger.rentalCreated(
      'admin', // In a real app, you'd get this from the authenticated user
      newRental.id,
      newRental.games?.title || 'Unknown Game',
      newRental.name,
      validatedData,
      context
    );

    const duration = Date.now() - startTime;
    apiLogger.apiResponse('POST', '/api/rentals', 201, duration);
    apiLogger.info('Rental created successfully', { 
      rentalId: newRental.id, 
      gameTitle: newRental.games?.title,
      renterName: newRental.name,
      duration,
      requestId: context.requestId
    });

    return createSuccessResponse(data, { timestamp: new Date().toISOString() });
  } catch (error) {
    const duration = Date.now() - startTime;
    apiLogger.apiResponse('POST', '/api/rentals', 500, duration);
    apiLogger.error('Rental creation API error', error as Error, {
      requestId: context.requestId,
    });
    return handleAPIError(error);
  }
}
