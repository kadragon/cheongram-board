import { NextResponse, NextRequest } from "next/server";
import { checkCloudflareAccessAdmin, getAuthenticatedUserEmail } from "@/utils/auth";
import { handleAPIError, createSuccessResponse } from "@/lib/api-error-handler";
import { createAuthError, AppError, ErrorCode } from "@/lib/errors";
import { rentalCreateSchema, rentalSearchSchema } from "@/lib/validation/schemas";
import { validateRequestBody, validateSearchParams } from "@/lib/validation/middleware";
import { apiLogger } from "@/lib/logging/logger";
import { performanceMonitor } from "@/lib/monitoring/performance";
import { auditLogger } from "@/lib/logging/audit";
import { extractRequestContext, dataEventLogger } from "@/lib/logging/integration";
import { getD1Adapter } from "@/utils/d1/server";
import type { RentalFilters } from "@/lib/db/types";

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const userEmail = getAuthenticatedUserEmail(request) || 'unknown';
  const context = extractRequestContext(request, userEmail);

  try {
    apiLogger.apiRequest('GET', '/api/rentals', { requestId: context.requestId });

    const isAdmin = checkCloudflareAccessAdmin(request);
    if (!isAdmin) {
      auditLogger.logAccessDenied(userEmail, 'rentals', 'list', {
        ipAddress: context.ipAddress,
        requestId: context.requestId,
      });
      throw createAuthError(ErrorCode.FORBIDDEN, "Admin access required");
    }

    const adapter = getD1Adapter();

    // Validate search parameters
    const searchParams = validateSearchParams(request, rentalSearchSchema);

    // Convert search params to RentalFilters format
    const filters: RentalFilters = {
      query: searchParams.query,
      game_id: searchParams.game_id,
      // Filter out 'all' as it means no filter
      status: searchParams.status === 'all' ? undefined : searchParams.status,
      date_from: searchParams.date_from,
      date_to: searchParams.date_to,
      sort_by: searchParams.sort_by,
      sort_order: searchParams.sort_order,
      page: searchParams.page || 1,
      limit: searchParams.limit || 20,
    };

    // Measure database query performance
    const result = await performanceMonitor.measureAsync(
      'rentals_list_query',
      async () => {
        return await adapter.listRentals(filters);
      },
      'api',
      {
        filters: searchParams,
        requestId: context.requestId,
        page: filters.page,
        limit: filters.limit
      }
    );

    const duration = Date.now() - startTime;
    apiLogger.apiResponse('GET', '/api/rentals', 200, duration);

    return createSuccessResponse(result.data, {
      pagination: result.pagination,
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
  const userEmail = getAuthenticatedUserEmail(request) || 'unknown';
  const context = extractRequestContext(request, userEmail);

  try {
    apiLogger.apiRequest('POST', '/api/rentals', { requestId: context.requestId });

    const isAdmin = checkCloudflareAccessAdmin(request);
    if (!isAdmin) {
      auditLogger.logAccessDenied(userEmail, 'rental', 'create', {
        ipAddress: context.ipAddress,
        requestId: context.requestId,
      });
      throw createAuthError(ErrorCode.FORBIDDEN, "Admin access required");
    }

    const adapter = getD1Adapter();

    // Validate request body with schema
    const validatedData = await validateRequestBody(request, rentalCreateSchema);

    // Create rental with performance monitoring (availability check is done in adapter)
    const newRental = await performanceMonitor.measureAsync(
      'rental_create_query',
      async () => {
        return await adapter.createRental(validatedData);
      },
      'api',
      {
        renterName: validatedData.name,
        gameId: validatedData.game_id,
        requestId: context.requestId
      }
    );

    // Log successful rental creation
    dataEventLogger.rentalCreated(
      userEmail,
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

    return createSuccessResponse(newRental, { timestamp: new Date().toISOString() });
  } catch (error) {
    const duration = Date.now() - startTime;
    apiLogger.apiResponse('POST', '/api/rentals', 500, duration);
    apiLogger.error('Rental creation API error', error as Error, {
      requestId: context.requestId,
    });
    return handleAPIError(error);
  }
}
