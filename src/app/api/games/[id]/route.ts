import { createClient } from "@/utils/supabase/server";
import { NextResponse, NextRequest } from "next/server";
import { checkAdmin } from "@/utils/auth";
import { handleAPIError, createSuccessResponse } from "@/lib/api-error-handler";
import { handleSupabaseError, createAuthError, createNotFoundError, AppError, ErrorCode } from "@/lib/errors";
import { gameUpdateSchema } from "@/lib/validation/schemas";
import { validateRequestBody, validateRouteParams } from "@/lib/validation/middleware";
import { z } from "zod";

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

    const supabase = createClient();
    const { data, error } = await supabase
      .from("games")
      .select("*, rentals(returned_at, due_date)")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw createNotFoundError("Game", id.toString());
      }
      throw handleSupabaseError(error);
    }

    // Add rental status information
    const activeRental = data.rentals.find(
      (rental: { returned_at: string | null }) => rental.returned_at === null
    );
    const is_rented = !!activeRental;
    const return_date = activeRental ? activeRental.due_date : null;

    const { rentals, ...gameData } = data;
    const gameWithStatus = { ...gameData, is_rented, return_date };

    return createSuccessResponse(gameWithStatus);
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

    const supabase = createClient();
    
    if (!await checkAdmin(supabase)) {
      throw createAuthError(ErrorCode.FORBIDDEN, "Admin access required");
    }

    // Validate request body with schema
    const validatedData = await validateRequestBody(request, gameUpdateSchema);

    const { data, error } = await supabase
      .from("games")
      .update(validatedData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw createNotFoundError("Game", id.toString());
      }
      throw handleSupabaseError(error);
    }

    return createSuccessResponse(data);
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

    const supabase = createClient();

    if (!await checkAdmin(supabase)) {
      throw createAuthError(ErrorCode.FORBIDDEN, "Admin access required");
    }

    // Check if game has active rentals
    const { data: activeRentals, error: rentalCheckError } = await supabase
      .from("rentals")
      .select("id")
      .eq("game_id", id)
      .is("returned_at", null);

    if (rentalCheckError) {
      throw handleSupabaseError(rentalCheckError);
    }

    if (activeRentals && activeRentals.length > 0) {
      throw new AppError(
        ErrorCode.INVALID_OPERATION,
        "Cannot delete game with active rentals",
        "활성 대여가 있는 게임은 삭제할 수 없습니다.",
        400,
        { context: { activeRentals: activeRentals.length } }
      );
    }

    // Check if game exists first
    const { data: existingGame, error: checkError } = await supabase
      .from("games")
      .select("id")
      .eq("id", id)
      .single();

    if (checkError) {
      if (checkError.code === 'PGRST116') {
        throw createNotFoundError("Game", id.toString());
      }
      throw handleSupabaseError(checkError);
    }

    const { error } = await supabase.from("games").delete().eq("id", id);

    if (error) {
      throw handleSupabaseError(error);
    }

    return new Response(null, { status: 204 });
  } catch (error) {
    return handleAPIError(error);
  }
}

