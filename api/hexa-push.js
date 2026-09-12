// api/hexa-push.js
//
// HEXACHI PUSH NOTIFICATION API
// Vercel Serverless Function + Supabase + Web Push
//
// Required Vercel environment variables:
//
// SUPABASE_URL
// SUPABASE_SERVICE_ROLE_KEY
// VAPID_PUBLIC_KEY
// VAPID_PRIVATE_KEY
// VAPID_SUBJECT
//
// The endpoint supports:
//
// GET  /api/hexa-push
//      Health check
//
// POST /api/hexa-push
//      Send push notifications
//
// Message example:
// {
//   "kind": "message",
//   "conversation_id": "...",
//   "message_id": "...",
//   "actor_id": "...",
//   "title": "New message",
//   "body": "Hello",
//   "url": "https://your-app.vercel.app/?conversation=..."
// }
//
// Call example:
// {
//   "kind": "call",
//   "callee_id": "...",
//   "call_id": "...",
//   "title": "Incoming call",
//   "body": "Someone is calling you",
//   "url": "https://your-app.vercel.app/"
// }

import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL;

const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

const VAPID_PUBLIC_KEY =
  process.env.VAPID_PUBLIC_KEY;

const VAPID_PRIVATE_KEY =
  process.env.VAPID_PRIVATE_KEY;

const VAPID_SUBJECT =
  process.env.VAPID_SUBJECT ||
  "mailto:admin@hexachi.app";


// ------------------------------------------------------------
// ENVIRONMENT CHECK
// ------------------------------------------------------------

function getMissingEnvironmentVariables() {
  const missing = [];

  if (!SUPABASE_URL) {
    missing.push("SUPABASE_URL");
  }

  if (!SUPABASE_SERVICE_ROLE_KEY) {
    missing.push("SUPABASE_SERVICE_ROLE_KEY");
  }

  if (!VAPID_PUBLIC_KEY) {
    missing.push("VAPID_PUBLIC_KEY");
  }

  if (!VAPID_PRIVATE_KEY) {
    missing.push("VAPID_PRIVATE_KEY");
  }

  return missing;
}


// ------------------------------------------------------------
// SUPABASE ADMIN CLIENT
// ------------------------------------------------------------

const supabase =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(
        SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        }
      )
    : null;


// ------------------------------------------------------------
// WEB PUSH CONFIGURATION
// ------------------------------------------------------------

if (
  VAPID_PUBLIC_KEY &&
  VAPID_PRIVATE_KEY &&
  VAPID_SUBJECT
) {
  webpush.setVapidDetails(
    VAPID_SUBJECT,
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
}


// ------------------------------------------------------------
// BASIC RESPONSE HELPERS
// ------------------------------------------------------------

function json(res, status, data) {
  res.status(status);

  res.setHeader(
    "Content-Type",
    "application/json; charset=utf-8"
  );

  res.setHeader(
    "Cache-Control",
    "no-store, no-cache, must-revalidate"
  );

  return res.end(JSON.stringify(data));
}


function methodNotAllowed(res) {
  res.setHeader("Allow", "GET, POST");

  return json(res, 405, {
    ok: false,
    error: "Method not allowed",
  });
}


// ------------------------------------------------------------
// AUTHENTICATION
// ------------------------------------------------------------
//
// HEXACHI sends the authenticated user's Supabase access token:
//
// Authorization: Bearer <supabase-access-token>
//
// We verify that token using Supabase Auth before allowing
// the server to send notifications.
// ------------------------------------------------------------

async function getAuthenticatedUser(req) {
  const authorization =
    req.headers?.authorization ||
    req.headers?.Authorization;

  if (!authorization) {
    return {
      user: null,
      error: "Missing Authorization header",
    };
  }

  if (
    typeof authorization !== "string" ||
    !authorization.toLowerCase().startsWith("bearer ")
  ) {
    return {
      user: null,
      error: "Invalid Authorization header",
    };
  }

  const token =
    authorization.slice(7).trim();

  if (!token) {
    return {
      user: null,
      error: "Missing bearer token",
    };
  }

  if (!supabase) {
    return {
      user: null,
      error: "Supabase server configuration is missing",
    };
  }

  const {
    data,
    error,
  } = await supabase.auth.getUser(token);

  if (error || !data?.user) {
    return {
      user: null,
      error: "Invalid or expired authentication token",
    };
  }

  return {
    user: data.user,
    error: null,
  };
}


// ------------------------------------------------------------
// NORMALIZE PUSH SUBSCRIPTION
// ------------------------------------------------------------

function normalizeSubscription(row) {
  if (!row) {
    return null;
  }

  if (!row.endpoint) {
    return null;
  }

  if (!row.p256dh || !row.auth) {
    return null;
  }

  return {
    endpoint: row.endpoint,
    expirationTime:
      row.expiration_time ??
      row.expirationTime ??
      null,

    keys: {
      p256dh: row.p256dh,
      auth: row.auth,
    },
  };
}


// ------------------------------------------------------------
// FIND RECIPIENT USER IDS
// ------------------------------------------------------------

async function resolveRecipientUserIds({
  kind,
  actorId,
  conversationId,
  calleeId,
  recipientIds,
}) {
  // Explicit recipients take priority.
  if (Array.isArray(recipientIds)) {
    return [
      ...new Set(
        recipientIds
          .filter(Boolean)
          .map(String)
      ),
    ];
  }

  // Incoming calls are delivered directly to callee.
  if (kind === "call") {
    if (!calleeId) {
      return [];
    }

    return [String(calleeId)];
  }

  // Message notifications are delivered to members
  // of the conversation except the sender.
  if (conversationId) {
    const {
      data,
      error,
    } = await supabase
      .from("conversation_members")
      .select("user_id")
      .eq(
        "conversation_id",
        conversationId
      );

    if (error) {
      throw new Error(
        `Could not load conversation members: ${error.message}`
      );
    }

    return [
      ...new Set(
        (data || [])
          .map((member) =>
            member.user_id
              ? String(member.user_id)
              : null
          )
          .filter(Boolean)
          .filter(
            (id) =>
              !actorId ||
              id !== String(actorId)
          )
      ),
    ];
  }

  return [];
}


// ------------------------------------------------------------
// LOAD PUSH SUBSCRIPTIONS
// ------------------------------------------------------------

async function loadPushSubscriptions(userIds) {
  if (!userIds.length) {
    return [];
  }

  const {
    data,
    error,
  } = await supabase
    .from("push_subscriptions")
    .select(
      [
        "id",
        "user_id",
        "endpoint",
        "p256dh",
        "auth",
        "expiration_time",
      ].join(",")
    )
    .in("user_id", userIds);

  if (error) {
    throw new Error(
      `Could not load push subscriptions: ${error.message}`
    );
  }

  return data || [];
}


// ------------------------------------------------------------
// BUILD NOTIFICATION PAYLOAD
// ------------------------------------------------------------

function buildNotificationPayload(body) {
  const {
    kind = "message",
    title,
    body: notificationBody,
    message_id,
    call_id,
    conversation_id,
    url,
    icon,
    badge,
    tag,
    image,
  } = body;

  const notificationTitle =
    title ||
    (
      kind === "call"
        ? "Incoming call"
        : "New message"
    );

  const notificationText =
    notificationBody ||
    (
      kind === "call"
        ? "You have an incoming call"
        : "You have a new message"
    );

  return JSON.stringify({
    type: "hexachi-push",

    kind,

    title: notificationTitle,

    body: notificationText,

    message_id:
      message_id || null,

    call_id:
      call_id || null,

    conversation_id:
      conversation_id || null,

    url:
      url ||
      "/",

    icon:
      icon ||
      "/pwa-192x192.png",

    badge:
      badge ||
      "/pwa-192x192.png",

    tag:
      tag ||
      (
        kind === "call"
          ? `hexachi-call-${call_id || "incoming"}`
          : `hexachi-message-${conversation_id || "general"}`
      ),

    image:
      image || null,

    timestamp:
      Date.now(),

    requireInteraction:
      kind === "call",

    renotify:
      true,

    silent:
      false,
  });
}


// ------------------------------------------------------------
// SEND ONE PUSH
// ------------------------------------------------------------

async function sendOnePush(subscription, payload) {
  return webpush.sendNotification(
    subscription,
    payload,
    {
      TTL: 60 * 60,
      urgency: "high",
    }
  );
}


// ------------------------------------------------------------
// DELETE STALE SUBSCRIPTION
// ------------------------------------------------------------

async function deleteSubscription(subscriptionId) {
  if (!subscriptionId) {
    return;
  }

  const {
    error,
  } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("id", subscriptionId);

  if (error) {
    console.error(
      "HEXA PUSH: failed to remove stale subscription:",
      error.message
    );
  }
}


// ------------------------------------------------------------
// SEND TO ALL USER SUBSCRIPTIONS
// ------------------------------------------------------------

async function sendPushToSubscriptions(
  subscriptions,
  payload
) {
  let sent = 0;
  let failed = 0;
  let removed = 0;

  const results = [];

  for (const row of subscriptions) {
    const subscription =
      normalizeSubscription(row);

    if (!subscription) {
      failed += 1;

      results.push({
        id: row.id,
        ok: false,
        error: "Invalid push subscription",
      });

      continue;
    }

    try {
      await sendOnePush(
        subscription,
        payload
      );

      sent += 1;

      results.push({
        id: row.id,
        ok: true,
      });
    } catch (error) {
      failed += 1;

      const statusCode =
        Number(
          error?.statusCode ||
          error?.status ||
          0
        );

      const isGone =
        statusCode === 404 ||
        statusCode === 410;

      if (isGone) {
        await deleteSubscription(
          row.id
        );

        removed += 1;
      }

      console.error(
        "HEXA PUSH: send failed:",
        {
          subscriptionId: row.id,
          statusCode,
          message:
            error?.message ||
            String(error),
        }
      );

      results.push({
        id: row.id,
        ok: false,
        removed: isGone,
        statusCode,
        error:
          error?.message ||
          String(error),
      });
    }
  }

  return {
    sent,
    failed,
    removed,
    results,
  };
}


// ------------------------------------------------------------
// MAIN HANDLER
// ------------------------------------------------------------

export default async function handler(
  req,
  res
) {
  // ----------------------------------------------------------
  // HEALTH CHECK
  // ----------------------------------------------------------

  if (req.method === "GET") {
    const missing =
      getMissingEnvironmentVariables();

    return json(res, 200, {
      ok: missing.length === 0,

      service:
        "hexachi-push",

      message:
        missing.length === 0
          ? "Push endpoint is online."
          : "Push endpoint is online but server configuration is incomplete.",

      configured:
        missing.length === 0,

      missing,
    });
  }


  // ----------------------------------------------------------
  // ONLY GET + POST ARE SUPPORTED
  // ----------------------------------------------------------

  if (req.method !== "POST") {
    return methodNotAllowed(res);
  }


  // ----------------------------------------------------------
  // ENVIRONMENT CHECK
  // ----------------------------------------------------------

  const missing =
    getMissingEnvironmentVariables();

  if (missing.length) {
    console.error(
      "HEXA PUSH: missing environment variables:",
      missing
    );

    return json(res, 500, {
      ok: false,
      error:
        "HEXA Push server configuration is incomplete.",
      missing,
    });
  }


  // ----------------------------------------------------------
  // AUTHENTICATE REQUEST
  // ----------------------------------------------------------

  const {
    user,
    error: authError,
  } = await getAuthenticatedUser(req);

  if (authError || !user) {
    return json(res, 401, {
      ok: false,
      error:
        authError ||
        "Unauthorized",
    });
  }


  // ----------------------------------------------------------
  // READ REQUEST BODY
  // ----------------------------------------------------------

  let body = req.body;

  if (
    typeof body === "string"
  ) {
    try {
      body =
        JSON.parse(body);
    } catch {
      return json(res, 400, {
        ok: false,
        error:
          "Invalid JSON body",
      });
    }
  }

  if (
    !body ||
    typeof body !== "object"
  ) {
    return json(res, 400, {
      ok: false,
      error:
        "Request body is required",
    });
  }


  // ----------------------------------------------------------
  // REQUEST VALUES
  // ----------------------------------------------------------

  const {
    kind = "message",

    conversation_id:
      conversationId,

    callee_id:
      calleeId,

    actor_id:
      actorId,

    recipient_ids:
      recipientIds,
  } = body;


  // ----------------------------------------------------------
  // SECURITY:
  // The authenticated user is normally the actor.
  //
  // We don't allow a client to impersonate another user.
  // ----------------------------------------------------------

  const authenticatedUserId =
    String(user.id);

  const effectiveActorId =
    actorId
      ? String(actorId) ===
        authenticatedUserId
        ? authenticatedUserId
        : authenticatedUserId
      : authenticatedUserId;


  // ----------------------------------------------------------
  // RESOLVE RECIPIENTS
  // ----------------------------------------------------------

  let recipientUserIds;

  try {
    recipientUserIds =
      await resolveRecipientUserIds({
        kind,
        actorId:
          effectiveActorId,
        conversationId,
        calleeId,
        recipientIds,
      });
  } catch (error) {
    console.error(
      "HEXA PUSH: recipient resolution failed:",
      error
    );

    return json(res, 500, {
      ok: false,
      error:
        error?.message ||
        "Could not resolve notification recipients",
    });
  }


  // ----------------------------------------------------------
  // NEVER SEND A NOTIFICATION BACK TO THE SENDER
  // ----------------------------------------------------------

  recipientUserIds =
    recipientUserIds.filter(
      (id) =>
        id !== authenticatedUserId
    );


  if (!recipientUserIds.length) {
    return json(res, 200, {
      ok: true,

      sent: 0,

      failed: 0,

      removed: 0,

      recipients: 0,

      subscriptions: 0,

      message:
        "No notification recipients found.",
    });
  }


  // ----------------------------------------------------------
  // LOAD SUBSCRIPTIONS
  // ----------------------------------------------------------

  let subscriptions;

  try {
    subscriptions =
      await loadPushSubscriptions(
        recipientUserIds
      );
  } catch (error) {
    console.error(
      "HEXA PUSH: subscription lookup failed:",
      error
    );

    return json(res, 500, {
      ok: false,
      error:
        error?.message ||
        "Could not load push subscriptions",
    });
  }


  if (!subscriptions.length) {
    return json(res, 200, {
      ok: true,

      sent: 0,

      failed: 0,

      removed: 0,

      recipients:
        recipientUserIds.length,

      subscriptions: 0,

      message:
        "Recipients have no registered push subscriptions.",
    });
  }


  // ----------------------------------------------------------
  // BUILD PUSH PAYLOAD
  // ----------------------------------------------------------

  const payload =
    buildNotificationPayload(body);


  // ----------------------------------------------------------
  // SEND PUSH
  // ----------------------------------------------------------

  const result =
    await sendPushToSubscriptions(
      subscriptions,
      payload
    );


  // ----------------------------------------------------------
  // LOG RESULT
  // ----------------------------------------------------------

  console.log(
    "HEXA PUSH:",
    {
      kind,
      authenticatedUserId,
      recipients:
        recipientUserIds.length,
      subscriptions:
        subscriptions.length,
      sent:
        result.sent,
      failed:
        result.failed,
      removed:
        result.removed,
    }
  );


  // ----------------------------------------------------------
  // RESPONSE
  // ----------------------------------------------------------

  return json(res, 200, {
    ok:
      result.sent > 0 ||
      result.failed === 0,

    service:
      "hexachi-push",

    kind,

    sent:
      result.sent,

    failed:
      result.failed,

    removed:
      result.removed,

    recipients:
      recipientUserIds.length,

    subscriptions:
      subscriptions.length,

    results:
      result.results,
  });
}