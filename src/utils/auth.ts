import { createClient } from "@/utils/supabase/server";

export async function checkAdmin(supabase: any) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: userDetails } = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  return userDetails?.is_admin || false;
}
