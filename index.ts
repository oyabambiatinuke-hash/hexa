import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, code: "method-not-allowed", message: "POST required." }, 405);

  const TURNSTILE_SECRET_KEY = Deno.env.get("TURNSTILE_SECRET_KEY") || "";
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
  const SUPABASE_SECRET_KEYS = Deno.env.get("SUPABASE_SECRET_KEYS") || "";

  if (!TURNSTILE_SECRET_KEY || !SUPABASE_URL || !SUPABASE_SECRET_KEYS) {
    console.error("HEXA security function is missing required secrets.");
    return json({ ok: false, code: "server-not-configured", message: "Security service is not configured." }, 500);
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, code: "bad-json", message: "Invalid request." }, 400);
  }

  const turnstileToken = typeof body?.turnstileToken === "string" ? body.turnstileToken : "";
  const action = typeof body?.action === "string" ? body.action.slice(0, 50) : "unknown";
  const metadata = body?.metadata && typeof body.metadata === "object" ? body.metadata : {};

  if (!turnstileToken || turnstileToken.length > 2048) {
    return json({ ok: false, code: "invalid-token", message: "Security verification failed." }, 400);
  }

  const ip = req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const userAgent = req.headers.get("user-agent") || "unknown";
  const ipHash = await sha256(ip);
  const userAgentHash = await sha256(userAgent);

  const serviceKeyObject = JSON.parse(SUPABASE_SECRET_KEYS);
  const secretKey = serviceKeyObject.default || Object.values(serviceKeyObject)[0];
  const admin = createClient(SUPABASE_URL, secretKey as string, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const bucket = `turnstile:${ipHash.slice(0, 32)}:${action}`;
  const { data: allowed, error: limitError } = await admin.rpc("hexa_security_allow_request", {
    p_bucket: bucket,
    p_window_seconds: 60,
    p_max_requests: 8,
  });

  if (limitError || allowed !== true) {
    await admin.from("hexa_security_events").insert({
      event_type: "rate_limited",
      action,
      ip_hash: ipHash,
      user_agent_hash: userAgentHash,
      metadata,
    });
    return json({ ok: false, code: "rate-limited", message: "Too many attempts. Please wait a minute and try again." }, 429);
  }

  const verification = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      secret: TURNSTILE_SECRET_KEY,
      response: turnstileToken,
      remoteip: ip,
    }),
  });

  const result = await verification.json();

  if (!result?.success) {
    await admin.from("hexa_security_events").insert({
      event_type: "turnstile_failed",
      action,
      ip_hash: ipHash,
      user_agent_hash: userAgentHash,
      metadata: { ...metadata, error_codes: result?.["error-codes"] || [] },
    });

    return json({ ok: false, code: "turnstile-failed", message: "Security verification failed. Please try again." }, 403);
  }

  if (result.action && result.action !== action) {
    await admin.from("hexa_security_events").insert({
      event_type: "turnstile_action_mismatch",
      action,
      ip_hash: ipHash,
      user_agent_hash: userAgentHash,
      metadata: { ...metadata, returned_action: result.action },
    });
    return json({ ok: false, code: "action-mismatch", message: "Security verification failed." }, 403);
  }

  await admin.from("hexa_security_events").insert({
    event_type: "turnstile_success",
    action,
    ip_hash: ipHash,
    user_agent_hash: userAgentHash,
    metadata: { ...metadata, hostname: result.hostname || null },
  });

  return json({ ok: true, action });
});
