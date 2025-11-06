import { NextResponse, NextRequest } from "next/server";
import { checkCloudflareAccessAdmin } from "@/utils/auth";
import { handleAPIError, createSuccessResponse } from "@/lib/api-error-handler";
import { createAuthError, createNotFoundError, createValidationError, ErrorCode } from "@/lib/errors";
import { getD1Adapter } from "@/utils/d1/server";
import { z } from "zod";
import { validateRouteParams } from "@/lib/validation/middleware";

const rentalIdSchema = z.object({
  id: z.string().regex(/^\d+$/, "Rental ID must be a number").transform(Number),
});

export async function POST(
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

    // returnRental already checks if rental exists and is not returned
    const returnedRental = await adapter.returnRental(id);

    if (!returnedRental) {
      throw createNotFoundError("Rental", id.toString());
    }

    return createSuccessResponse(returnedRental, {
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return handleAPIError(error);
  }
}
