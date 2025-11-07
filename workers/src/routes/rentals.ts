// Trace: SPEC-migration-workers-1, TASK-workers-001.6

/**
 * Rentals API Routes
 *
 * Endpoints for managing game rentals.
 * All endpoints require admin authentication.
 *
 * Routes:
 * - GET    /api/rentals           - List rentals with filters (admin)
 * - POST   /api/rentals           - Create new rental (admin)
 * - GET    /api/rentals/:id       - Get single rental (admin)
 * - PUT    /api/rentals/:id       - Update rental (admin)
 * - DELETE /api/rentals/:id       - Delete rental (admin)
 * - POST   /api/rentals/:id/return - Mark rental as returned (admin)
 * - POST   /api/rentals/:id/extend - Extend rental due date (admin)
 */

import { Hono } from 'hono';
import { D1Adapter } from '../lib/db';
import { requireAdmin } from '../lib/auth';
import {
  validateBody,
  validateQuery,
  rentalCreateSchema,
  rentalUpdateSchema,
  rentalSearchSchema,
  rentalExtendSchema,
} from '../lib/validation';
import { createNotFoundError, handleDatabaseError, ErrorCode, createBusinessLogicError } from '../lib/errors';
import { createSuccessResponse, logRequest, logResponse, logError } from '../lib/utils/response';
import type { Env, Variables } from '../types/env';
import type { RentalFilters } from '../lib/db/types';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// All rentals endpoints require admin access
app.use('*', requireAdmin);

/**
 * GET /api/rentals
 *
 * List rentals with optional filters and pagination.
 * Admin only.
 */
app.get('/', validateQuery(rentalSearchSchema), async (c) => {
  const startTime = Date.now();

  try {
    logRequest('GET', '/api/rentals');

    const searchParams = c.get('validatedQuery' as any) as any;
    const adapter = new D1Adapter(c.env.DB);

    // Convert search params to RentalFilters format
    const filters: RentalFilters = {
      query: searchParams.query,
      game_id: searchParams.game_id,
      status: searchParams.status,
      date_from: searchParams.date_from,
      date_to: searchParams.date_to,
      sort_by: searchParams.sort_by,
      sort_order: searchParams.sort_order,
      page: searchParams.page || 1,
      limit: searchParams.limit || 20,
    };

    const result = await adapter.listRentals(filters);

    const duration = Date.now() - startTime;
    logResponse('GET', '/api/rentals', 200, duration, {
      count: result.data.length,
      total: result.pagination.total,
    });

    return createSuccessResponse(c, result.data, {
      pagination: result.pagination,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    logResponse('GET', '/api/rentals', 500, duration);
    logError('Rentals list error', error as Error);
    throw handleDatabaseError(error);
  }
});

/**
 * POST /api/rentals
 *
 * Create a new rental.
 * Admin only.
 */
app.post('/', validateBody(rentalCreateSchema), async (c) => {
  const startTime = Date.now();

  try {
    logRequest('POST', '/api/rentals');

    const validatedData = c.get('validatedBody' as any) as any;
    const adapter = new D1Adapter(c.env.DB);
    const userEmail = c.get('userEmail');

    const newRental = await adapter.createRental(validatedData);

    const duration = Date.now() - startTime;
    logResponse('POST', '/api/rentals', 201, duration, {
      rentalId: newRental.id,
      gameId: newRental.game_id,
      renterName: newRental.name,
      createdBy: userEmail,
    });

    return createSuccessResponse(c, newRental, {}, 201);
  } catch (error) {
    const duration = Date.now() - startTime;
    logResponse('POST', '/api/rentals', 500, duration);
    logError('Rental creation error', error as Error);

    // Handle "Game is already rented" error specifically
    if (error instanceof Error && error.message.includes('already rented')) {
      throw createBusinessLogicError(
        ErrorCode.GAME_ALREADY_RENTED,
        error.message,
        '이미 대여 중인 게임입니다.',
        409
      );
    }

    throw handleDatabaseError(error);
  }
});

/**
 * GET /api/rentals/:id
 *
 * Get a single rental by ID.
 * Admin only.
 */
app.get('/:id', async (c) => {
  const startTime = Date.now();

  try {
    const idParam = c.req.param('id');
    const id = parseInt(idParam, 10);

    if (isNaN(id)) {
      throw createBusinessLogicError(
        ErrorCode.INVALID_OPERATION,
        'Invalid rental ID',
        '유효하지 않은 대여 ID입니다.'
      );
    }

    logRequest('GET', `/api/rentals/${id}`);

    const adapter = new D1Adapter(c.env.DB);
    const rental = await adapter.getRental(id);

    if (!rental) {
      throw createNotFoundError('Rental', id);
    }

    const duration = Date.now() - startTime;
    logResponse('GET', `/api/rentals/${id}`, 200, duration);

    return createSuccessResponse(c, rental);
  } catch (error) {
    const duration = Date.now() - startTime;
    logResponse('GET', `/api/rentals/:id`, 500, duration);
    logError('Rental get error', error as Error);
    throw error;
  }
});

/**
 * PUT /api/rentals/:id
 *
 * Update a rental.
 * Admin only.
 */
app.put('/:id', validateBody(rentalUpdateSchema), async (c) => {
  const startTime = Date.now();

  try {
    const idParam = c.req.param('id');
    const id = parseInt(idParam, 10);

    if (isNaN(id)) {
      throw createBusinessLogicError(
        ErrorCode.INVALID_OPERATION,
        'Invalid rental ID',
        '유효하지 않은 대여 ID입니다.'
      );
    }

    logRequest('PUT', `/api/rentals/${id}`);

    const validatedData = c.get('validatedBody' as any) as any;
    const adapter = new D1Adapter(c.env.DB);
    const userEmail = c.get('userEmail');

    const updatedRental = await adapter.updateRental(id, validatedData);

    if (!updatedRental) {
      throw createNotFoundError('Rental', id);
    }

    const duration = Date.now() - startTime;
    logResponse('PUT', `/api/rentals/${id}`, 200, duration, {
      rentalId: id,
      updatedBy: userEmail,
    });

    return createSuccessResponse(c, updatedRental);
  } catch (error) {
    const duration = Date.now() - startTime;
    logResponse('PUT', `/api/rentals/:id`, 500, duration);
    logError('Rental update error', error as Error);
    throw handleDatabaseError(error);
  }
});

/**
 * DELETE /api/rentals/:id
 *
 * Delete a rental.
 * Admin only.
 */
app.delete('/:id', async (c) => {
  const startTime = Date.now();

  try {
    const idParam = c.req.param('id');
    const id = parseInt(idParam, 10);

    if (isNaN(id)) {
      throw createBusinessLogicError(
        ErrorCode.INVALID_OPERATION,
        'Invalid rental ID',
        '유효하지 않은 대여 ID입니다.'
      );
    }

    logRequest('DELETE', `/api/rentals/${id}`);

    const adapter = new D1Adapter(c.env.DB);
    const userEmail = c.get('userEmail');

    const deleted = await adapter.deleteRental(id);

    if (!deleted) {
      throw createNotFoundError('Rental', id);
    }

    const duration = Date.now() - startTime;
    logResponse('DELETE', `/api/rentals/${id}`, 204, duration, {
      rentalId: id,
      deletedBy: userEmail,
    });

    return c.body(null, 204);
  } catch (error) {
    const duration = Date.now() - startTime;
    logResponse('DELETE', `/api/rentals/:id`, 500, duration);
    logError('Rental delete error', error as Error);
    throw error;
  }
});

/**
 * POST /api/rentals/:id/return
 *
 * Mark a rental as returned.
 * Admin only.
 */
app.post('/:id/return', async (c) => {
  const startTime = Date.now();

  try {
    const idParam = c.req.param('id');
    const id = parseInt(idParam, 10);

    if (isNaN(id)) {
      throw createBusinessLogicError(
        ErrorCode.INVALID_OPERATION,
        'Invalid rental ID',
        '유효하지 않은 대여 ID입니다.'
      );
    }

    logRequest('POST', `/api/rentals/${id}/return`);

    const adapter = new D1Adapter(c.env.DB);
    const userEmail = c.get('userEmail');

    const returnedRental = await adapter.returnRental(id);

    if (!returnedRental) {
      throw createNotFoundError('Rental', id);
    }

    const duration = Date.now() - startTime;
    logResponse('POST', `/api/rentals/${id}/return`, 200, duration, {
      rentalId: id,
      returnedBy: userEmail,
    });

    return createSuccessResponse(c, returnedRental);
  } catch (error) {
    const duration = Date.now() - startTime;
    logResponse('POST', `/api/rentals/:id/return`, 500, duration);
    logError('Rental return error', error as Error);
    throw error;
  }
});

/**
 * POST /api/rentals/:id/extend
 *
 * Extend rental due date by 14 days.
 * Admin only.
 */
app.post('/:id/extend', validateBody(rentalExtendSchema), async (c) => {
  const startTime = Date.now();

  try {
    const idParam = c.req.param('id');
    const id = parseInt(idParam, 10);

    if (isNaN(id)) {
      throw createBusinessLogicError(
        ErrorCode.INVALID_OPERATION,
        'Invalid rental ID',
        '유효하지 않은 대여 ID입니다.'
      );
    }

    logRequest('POST', `/api/rentals/${id}/extend`);

    const adapter = new D1Adapter(c.env.DB);
    const userEmail = c.get('userEmail');

    // Get current rental
    const currentRental = await adapter.getRental(id);
    if (!currentRental) {
      throw createNotFoundError('Rental', id);
    }

    if (currentRental.returned_at) {
      throw createBusinessLogicError(
        ErrorCode.INVALID_OPERATION,
        'Cannot extend a returned rental',
        '반납된 대여는 연장할 수 없습니다.'
      );
    }

    const { new_due_date: requestedDueDate } = c.get('validatedBody' as any) as {
      new_due_date: string;
    };

    // Ensure the newly requested due date is not earlier than the current due date
    const currentDueDate = new Date(currentRental.due_date);
    const desiredDueDate = new Date(requestedDueDate);

    if (desiredDueDate.getTime() <= currentDueDate.getTime()) {
      throw createBusinessLogicError(
        ErrorCode.INVALID_OPERATION,
        'New due date must be after the current due date',
        '새로운 반납 예정일은 현재 예정일 이후여야 합니다.'
      );
    }

    const formattedDueDate = requestedDueDate;
    const extendedRental = await adapter.extendRental(id, formattedDueDate);

    const duration = Date.now() - startTime;
    logResponse('POST', `/api/rentals/${id}/extend`, 200, duration, {
      rentalId: id,
      newDueDate: formattedDueDate,
      extendedBy: userEmail,
    });

    return createSuccessResponse(c, extendedRental);
  } catch (error) {
    const duration = Date.now() - startTime;
    logResponse('POST', `/api/rentals/:id/extend`, 500, duration);
    logError('Rental extend error', error as Error);
    throw error;
  }
});

export default app;
