import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

const CLOUDFLARE_TURN_KEY_ID =
  process.env.CLOUDFLARE_TURN_KEY_ID;

const CLOUDFLARE_TURN_KEY =
  process.env.CLOUDFLARE_TURN_KEY;

const supabaseAdmin = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  try {
    if (
      !SUPABASE_URL ||
      !SUPABASE_SERVICE_ROLE_KEY ||
      !CLOUDFLARE_TURN_KEY_ID ||
      !CLOUDFLARE_TURN_KEY
    ) {
      return res.status(500).json({
        error: "TURN server configuration is incomplete",
      });
    }

    const authHeader =
      req.headers.authorization || "";

    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "Missing authentication token",
      });
    }

    const accessToken =
      authHeader.substring("Bearer ".length);

    const {
      data: {
        user,
      },
      error: userError,
    } = await supabaseAdmin.auth.getUser(accessToken);

    if (userError || !user) {
      return res.status(401).json({
        error: "Invalid authentication session",
      });
    }

    /*
     * Check the user's HEXA subscription.
     *
     * Calling itself does not require Plus/Pro/Ultra here.
     * Change this rule later if you want calling to be
     * subscription restricted.
     */
    const { data: subscription } =
      await supabaseAdmin
        .from("subscriptions")
        .select(
          "plan,status"
        )
        .eq("user_id", user.id)
        .maybeSingle();

    if (
      subscription &&
      subscription.status &&
      ![
        "active",
        "trialing",
      ].includes(subscription.status)
    ) {
      return res.status(403).json({
        error:
          "Your HEXA subscription is not active.",
      });
    }

    /*
     * Cloudflare recommends short-lived credentials.
     * 24 hours is suitable for normal HEXA calls.
     */
    const ttl = 86400;

    const cloudflareResponse =
      await fetch(
        `https://rtc.live.cloudflare.com/v1/turn/keys/${encodeURIComponent(
          CLOUDFLARE_TURN_KEY_ID
        )}/credentials/generate-ice-servers`,
        {
          method: "POST",
          headers: {
            Authorization:
              `Bearer ${CLOUDFLARE_TURN_KEY}`,
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            ttl,
          }),
        }
      );

    const cloudflareData =
      await cloudflareResponse.json();

    if (!cloudflareResponse.ok) {
      console.error(
        "Cloudflare TURN error:",
        cloudflareData
      );

      return res.status(502).json({
        error:
          "Unable to obtain TURN credentials",
      });
    }

    if (
      !cloudflareData ||
      !cloudflareData.iceServers
    ) {
      return res.status(502).json({
        error:
          "Cloudflare returned invalid TURN credentials",
      });
    }

    return res.status(200).json({
      iceServers:
        cloudflareData.iceServers,
      expiresIn: ttl,
    });
  } catch (error) {
    console.error(
      "TURN endpoint error:",
      error
    );

    return res.status(500).json({
      error:
        "TURN service temporarily unavailable",
    });
  }
}