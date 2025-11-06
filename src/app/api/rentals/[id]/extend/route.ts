import { createClient } from "@/utils/supabase/server";
import { NextResponse, NextRequest } from "next/server";
import { checkAdmin } from "@/utils/auth";
import { handleAPIError, createSuccessResponse } from "@/lib/api-error-handler";
import { handleSupabaseError, createAuthError, createNotFoundError, createValidationError, ErrorCode } from "@/lib/errors";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    if (!id || isNaN(Number(id))) {
      throw createValidationError("Invalid rental ID", "id", id);
    }

    const supabase = createClient();
    
    if (!(await checkAdmin(supabase))) {
      throw createAuthError(ErrorCode.FORBIDDEN, "Admin access required");
    }

    // Get current rental information
    const { data: rental, error: rentalError } = await supabase
      .from("rentals")
      .select("due_date, returned_at")
      .eq("id", id)
      .single();

    if (rentalError) {
      if (rentalError.code === 'PGRST116') {
        throw createNotFoundError("Rental", id);
      }
      throw handleSupabaseError(rentalError);
    }

    // Check if rental is already returned
    if (rental.returned_at) {
      throw createValidationError("Cannot extend a returned rental", "rental_status");
    }

    // Extend due date by 14 days
    const newDueDate = new Date(rental.due_date);
    newDueDate.setDate(newDueDate.getDate() + 14);

    const { data, error } = await supabase
      .from("rentals")
      .update({ 
        due_date: newDueDate.toISOString().split("T")[0],
        extended_count: supabase.sql`extended_count + 1`
      })
      .eq("id", id)
      .select();

    if (error) {
      throw handleSupabaseError(error);
    }

    return createSuccessResponse(data, { 
      timestamp: new Date().toISOString(),
      message: "Rental extended successfully"
    });
  } catch (error) {
    return handleAPIError(error);
  }
}
