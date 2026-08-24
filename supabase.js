import { supabase, supabaseConfigured } from "./lib/supabase";

export async function checkSupabaseConnection() {
  if (!supabaseConfigured || !supabase) {
    return {
      connected: false,
      message: "Supabase is not configured",
    };
  }

  const { error } = await supabase
    .from("profiles")
    .select("id")
    .limit(1);

  if (error) {
    return {
      connected: false,
      message: error.message,
    };
  }

  return {
    connected: true,
    message: "Supabase connected",
  };
}