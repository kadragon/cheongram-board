import { createClient } from "@/utils/supabase/server";
import { NextResponse, NextRequest } from "next/server";
import { checkAdmin } from "@/utils/auth";
import { handleAPIError, createSuccessResponse } from "@/lib/api-error-handler";
import { handleSupabaseError, createAuthError, createNotFoundError, createValidationError, ErrorCode } from "@/lib/errors";

export async function GET(
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

    const { data, error } = await supabase
      .from("rentals")
      .select(`
        *,
        games (*)
      `)
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw createNotFoundError("Rental", id);
      }
      throw handleSupabaseError(error);
    }

    return createSuccessResponse(data);
  } catch (error) {
    return handleAPIError(error);
  }
}

export async function PUT(
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

    const body = await request.json();
    
    // Validate required fields if they are being updated
    if (body.name !== undefined && !body.name) {
      throw createValidationError("Renter name cannot be empty", "name");
    }

    const { data, error } = await supabase
      .from("rentals")
      .update(body)
      .eq("id", id)
      .select();

    if (error) {
      if (error.code === 'PGRST116') {
        throw createNotFoundError("Rental", id);
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
    const { id } = await context.params;
    
    if (!id || isNaN(Number(id))) {
      throw createValidationError("Invalid rental ID", "id", id);
    }

    const supabase = createClient();
    
    if (!await checkAdmin(supabase)) {
      throw createAuthError(ErrorCode.FORBIDDEN, "Admin access required");
    }

    // Check if rental exists first
    const { data: existingRental, error: checkError } = await supabase
      .from("rentals")
      .select("id")
      .eq("id", id)
      .single();

    if (checkError) {
      if (checkError.code === 'PGRST116') {
        throw createNotFoundError("Rental", id);
      }
      throw handleSupabaseError(checkError);
    }

    const { error } = await supabase.from("rentals").delete().eq("id", id);

    if (error) {
      throw handleSupabaseError(error);
    }

    return new Response(null, { status: 204 });
  } catch (error) {
    return handleAPIError(error);
  }
}