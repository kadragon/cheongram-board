import { NextResponse, NextRequest } from "next/server";
import { checkCloudflareAccessAdmin } from "@/utils/auth";
import { handleAPIError, createSuccessResponse } from "@/lib/api-error-handler";
import { createAuthError, createNotFoundError, createValidationError, ErrorCode } from "@/lib/errors";
import { getD1Adapter } from "@/utils/d1/server";
import { z } from "zod";
import { validateRouteParams, validateRequestBody } from "@/lib/validation/middleware";
import { rentalUpdateSchema } from "@/lib/validation/schemas";

const rentalIdSchema = z.object({
  id: z.string().regex(/^\d+$/, "Rental ID must be a number").transform(Number),
});

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const { id } = validateRouteParams(params, rentalIdSchema);

    const isAdmin = checkCloudflareAccessAdmin(request);
    if (!isAdmin) {
      throw createAuthError(ErrorCode.FORBIDDEN, "Admin access required");
    }

    const adapter = getD1Adapter();
    const rental = await adapter.getRental(id);

    if (!rental) {
      throw createNotFoundError("Rental", id.toString());
    }

    return createSuccessResponse(rental);
  } catch (error) {
    return handleAPIError(error);
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const { id } = validateRouteParams(params, rentalIdSchema);

    const isAdmin = checkCloudflareAccessAdmin(request);
    if (!isAdmin) {
      throw createAuthError(ErrorCode.FORBIDDEN, "Admin access required");
    }

    const adapter = getD1Adapter();

    // Validate request body with schema
    const validatedData = await validateRequestBody(request, rentalUpdateSchema);

    const updatedRental = await adapter.updateRental(id, validatedData);

    if (!updatedRental) {
      throw createNotFoundError("Rental", id.toString());
    }

    return createSuccessResponse(updatedRental);
  } catch (error) {
    return handleAPIError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const { id } = validateRouteParams(params, rentalIdSchema);

    const isAdmin = checkCloudflareAccessAdmin(request);
    if (!isAdmin) {
      throw createAuthError(ErrorCode.FORBIDDEN, "Admin access required");
    }

    const adapter = getD1Adapter();

    const deleted = await adapter.deleteRental(id);

    if (!deleted) {
      throw createNotFoundError("Rental", id.toString());
    }

    return new Response(null, { status: 204 });
  } catch (error) {
    return handleAPIError(error);
  }
}