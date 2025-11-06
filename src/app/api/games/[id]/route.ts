import { NextResponse, NextRequest } from "next/server";
import { checkAdmin } from "@/utils/auth";
import { handleAPIError, createSuccessResponse } from "@/lib/api-error-handler";
import { createAuthError, createNotFoundError, AppError, ErrorCode } from "@/lib/errors";
import { gameUpdateSchema } from "@/lib/validation/schemas";
import { validateRequestBody, validateRouteParams } from "@/lib/validation/middleware";
import { z } from "zod";
import { getD1Adapter } from "@/utils/d1/server";

const gameIdSchema = z.object({
  id: z.string().regex(/^\d+$/, "Game ID must be a number").transform(Number),
});

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const { id } = validateRouteParams(params, gameIdSchema);

    const adapter = getD1Adapter();
    const game = await adapter.getGame(id);

    if (!game) {
      throw createNotFoundError("Game", id.toString());
    }

    return createSuccessResponse(game);
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
    const { id } = validateRouteParams(params, gameIdSchema);

    // TODO: Implement Cloudflare Access authentication in Phase 4 (TASK-migration-010)
    // const isAdmin = await checkCloudflareAccessAdmin(request);
    // if (!isAdmin) {
    //   throw createAuthError(ErrorCode.FORBIDDEN, "Admin access required");
    // }

    const adapter = getD1Adapter();

    // Validate request body with schema
    const validatedData = await validateRequestBody(request, gameUpdateSchema);

    const updatedGame = await adapter.updateGame(id, validatedData);

    if (!updatedGame) {
      throw createNotFoundError("Game", id.toString());
    }

    return createSuccessResponse(updatedGame);
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
    const { id } = validateRouteParams(params, gameIdSchema);

    // TODO: Implement Cloudflare Access authentication in Phase 4 (TASK-migration-010)
    // const isAdmin = await checkCloudflareAccessAdmin(request);
    // if (!isAdmin) {
    //   throw createAuthError(ErrorCode.FORBIDDEN, "Admin access required");
    // }

    const adapter = getD1Adapter();

    // deleteGame already checks for active rentals and throws appropriate errors
    const deleted = await adapter.deleteGame(id);

    if (!deleted) {
      throw createNotFoundError("Game", id.toString());
    }

    return new Response(null, { status: 204 });
  } catch (error) {
    return handleAPIError(error);
  }
}

