import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CLOUDFLARE_TURN_KEY_ID = process.env.CLOUDFLARE_TURN_KEY_ID;
const CLOUDFLARE_TURN_KEY = process.env.CLOUDFLARE_TURN_KEY;
const TURN_TTL_SECONDS = 86400;

const supabaseAdmin =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    : null;

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!supabaseAdmin || !CLOUDFLARE_TURN_KEY_ID || !CLOUDFLARE_TURN_KEY) {
    return res.status(500).json({ error: "TURN server configuration is incomplete" });
  }

  const authorization = req.headers?.authorization || "";
  if (!authorization.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing authentication token" });
  }

  try {
    const accessToken = authorization.slice("Bearer ".length);
    const { data, error } = await supabaseAdmin.auth.getUser(accessToken);
    if (error || !data?.user) {
      return res.status(401).json({ error: "Invalid authentication session" });
    }

    const cloudflareResponse = await fetch(
      `https://rtc.live.cloudflare.com/v1/turn/keys/${encodeURIComponent(CLOUDFLARE_TURN_KEY_ID)}/credentials/generate-ice-servers`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${CLOUDFLARE_TURN_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ttl: TURN_TTL_SECONDS }),
      }
    );

    const cloudflareData = await cloudflareResponse.json();
    if (!cloudflareResponse.ok) {
      console.error("Cloudflare TURN error:", cloudflareData);
      return res.status(502).json({ error: "Unable to obtain TURN credentials" });
    }

    if (!Array.isArray(cloudflareData?.iceServers) || !cloudflareData.iceServers.length) {
      return res.status(502).json({ error: "Cloudflare returned invalid TURN credentials" });
    }

    return res.status(200).json({
      iceServers: cloudflareData.iceServers,
      expiresIn: TURN_TTL_SECONDS,
    });
  } catch (error) {
    console.error("HEXA TURN endpoint error:", error);
    return res.status(500).json({ error: "TURN service temporarily unavailable" });
  }
}
