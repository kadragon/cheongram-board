import { createClient } from "@/utils/supabase/server";
import { NextResponse, NextRequest } from "next/server";
import { checkAdmin } from "@/utils/auth";
import { handleAPIError, createSuccessResponse } from "@/lib/api-error-handler";
import { handleSupabaseError, createAuthError, createNotFoundError, createValidationError, ErrorCode } from "@/lib/errors";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    
    if (!id || isNaN(Number(id))) {
      throw createValidationError("Invalid rental ID", "id", id);
    }

    const supabase = createClient();
    
    if (!await checkAdmin(supabase)) {
      throw createAuthError(ErrorCode.FORBIDDEN, "Admin access required");
    }

    // Check if rental exists and is not already returned
    const { data: existingRental, error: checkError } = await supabase
      .from("rentals")
      .select("id, returned_at")
      .eq("id", id)
      .single();

    if (checkError) {
      if (checkError.code === 'PGRST116') {
        throw createNotFoundError("Rental", id);
      }
      throw handleSupabaseError(checkError);
    }

    if (existingRental.returned_at) {
      throw createValidationError("Rental is already returned", "rental_status");
    }

    const { data, error } = await supabase
      .from("rentals")
      .update({ returned_at: new Date().toISOString() })
      .eq("id", id)
      .select();

    if (error) {
      throw handleSupabaseError(error);
    }

    return createSuccessResponse(data, { 
      timestamp: new Date().toISOString(),
      message: "Rental returned successfully"
    });
  } catch (error) {
    return handleAPIError(error);
  }
}
