import { supabase as defaultSupabase } from "../lib/supabase.js";

const DEFAULT_ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

/** Fetch short-lived TURN credentials without exposing the Cloudflare key. */
export async function getIceServers(
  supabaseClient = defaultSupabase,
  endpoint = "/api/hexa-turn"
) {
  if (!supabaseClient?.auth) return DEFAULT_ICE_SERVERS;

  try {
    const { data, error } = await supabaseClient.auth.getSession();
    const accessToken = data?.session?.access_token;
    if (error || !accessToken) return DEFAULT_ICE_SERVERS;

    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`TURN credentials request failed (${response.status}).`);
    }

    const payload = await response.json();
    const iceServers = payload.iceServers || payload.ice_servers;
    if (!Array.isArray(iceServers) || iceServers.length === 0) {
      throw new Error("TURN service returned no ICE servers.");
    }

    return iceServers;
  } catch (error) {
    console.warn("HEXA TURN unavailable; using STUN fallback:", error);
    return DEFAULT_ICE_SERVERS;
  }
}
