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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const { id } = validateRouteParams(resolvedParams, rentalIdSchema);

    const isAdmin = checkCloudflareAccessAdmin(request);
    if (!isAdmin) {
      throw createAuthError(ErrorCode.FORBIDDEN, "Admin access required");
    }

    const adapter = getD1Adapter();

    // Get current rental to calculate new due date
    const currentRental = await adapter.getRental(id);
    if (!currentRental) {
      throw createNotFoundError("Rental", id.toString());
    }

    if (currentRental.returned_at) {
      throw createValidationError("Cannot extend a returned rental", "rental_status");
    }

    // Extend due date by 14 days
    const newDueDate = new Date(currentRental.due_date);
    newDueDate.setDate(newDueDate.getDate() + 14);
    const formattedDueDate = newDueDate.toISOString().split("T")[0];

    const extendedRental = await adapter.extendRental(id, formattedDueDate);

    return createSuccessResponse(extendedRental, {
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return handleAPIError(error);
  }
}
