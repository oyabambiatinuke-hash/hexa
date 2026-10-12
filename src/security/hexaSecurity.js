// HEXA client-side security helpers.
// IMPORTANT: this file never contains Cloudflare's secret key.

const LOCAL_SECURITY_KEY = "hexa-security-client-v1";
const CLIENT_LIMITS = {
  oauth: { windowMs: 60_000, max: 8 },
  message: { windowMs: 10_000, max: 20 },
  upload: { windowMs: 60_000, max: 30 },
};

function readState() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_SECURITY_KEY) || "{}");
  } catch {
    return {};
  }
}

function writeState(value) {
  try { localStorage.setItem(LOCAL_SECURITY_KEY, JSON.stringify(value)); } catch {}
}

export function clientRateLimit(bucket = "oauth") {
  const rule = CLIENT_LIMITS[bucket] || CLIENT_LIMITS.oauth;
  const now = Date.now();
  const state = readState();
  const current = state[bucket] || { started: now, count: 0 };

  if (now - current.started >= rule.windowMs) {
    state[bucket] = { started: now, count: 1 };
    writeState(state);
    return { allowed: true, remaining: rule.max - 1 };
  }

  if (current.count >= rule.max) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: Math.max(1000, rule.windowMs - (now - current.started)),
    };
  }

  current.count += 1;
  state[bucket] = current;
  writeState(state);
  return { allowed: true, remaining: rule.max - current.count };
}

export function getSecuritySiteKey() {
  return String(import.meta.env.VITE_TURNSTILE_SITE_KEY || "").trim();
}

export function isSecurityConfigured() {
  return Boolean(getSecuritySiteKey());
}

export async function verifyHexaSecurity(supabase, {
  turnstileToken,
  action = "oauth",
  metadata = {},
} = {}) {
  const result = clientRateLimit("oauth");
  if (!result.allowed) {
    return {
      ok: false,
      code: "client-rate-limit",
      message: `Too many attempts. Please wait ${Math.ceil(result.retryAfterMs / 1000)} seconds.`,
    };
  }

  if (!turnstileToken) {
    return {
      ok: false,
      code: "missing-turnstile",
      message: "Security verification is still loading. Please wait a moment and try again.",
    };
  }

  const { data, error } = await supabase.functions.invoke("hexa-security-check", {
    body: {
      turnstileToken,
      action,
      metadata,
    },
  });

  if (error) {
    console.error("HEXA security function error:", error);
    return {
      ok: false,
      code: "security-service-error",
      message: "Security verification could not be completed. Please try again.",
    };
  }

  if (!data?.ok) {
    return {
      ok: false,
      code: data?.code || "blocked",
      message: data?.message || "Security verification failed. Please try again.",
    };
  }

  return data;
}
