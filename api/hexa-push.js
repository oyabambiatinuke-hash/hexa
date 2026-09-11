const webpush = require("web-push");
const { createClient } = require("@supabase/supabase-js");

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || "mailto:admin@hexachi.app",
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

function json(res, status, body) {
  res.setHeader(
    "Content-Type",
    "application/json; charset=utf-8"
  );

  res.status(status).json(body);
}

function cleanText(value, fallback) {
  const text = String(value ?? "").trim();
  return text || fallback;
}

async function handler(req, res) {
  /*
   * ============================================================
   * CORS / PREFLIGHT
   * ============================================================
   */

  if (req.method === "OPTIONS") {
    res.setHeader(
      "Access-Control-Allow-Origin",
      "*"
    );

    res.setHeader(
      "Access-Control-Allow-Methods",
      "POST, OPTIONS, GET"
    );

    res.setHeader(
      "Access-Control-Allow-Headers",
      "Authorization, Content-Type"
    );

    return res.status(204).end();
  }

  /*
   * ============================================================
   * HEALTH CHECK
   * ============================================================
   *
   * Visiting:
   *
   * /api/hexa-push
   *
   * should now return a normal response instead of 405.
   */

  if (req.method === "GET") {
    return json(res, 200, {
      ok: true,
      service: "hexachi-push",
      message:
        "Push endpoint is online. Use POST to send a notification.",
    });
  }

  /*
   * ============================================================
   * ONLY POST MAY SEND NOTIFICATIONS
   * ============================================================
   */

  if (req.method !== "POST") {
    return json(res, 405, {
      error: "Method not allowed",
      allowed: [
        "POST",
        "OPTIONS",
        "GET",
      ],
    });
  }

  /*
   * ============================================================
   * AUTHENTICATE THE HEXACHI USER
   * ============================================================
   */

  const authHeader = String(
    req.headers.authorization || ""
  );

  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : "";

  if (!token) {
    return json(res, 401, {
      error:
        "Missing Supabase access token",
    });
  }

  const {
    data: authData,
    error: authError,
  } = await supabaseAdmin.auth.getUser(
    token
  );

  if (
    authError ||
    !authData?.user?.id
  ) {
    return json(res, 401, {
      error:
        "Invalid Supabase session",
    });
  }

  const actorId =
    authData.user.id;

  const body =
    req.body || {};

  const kind =
    body.kind === "call"
      ? "call"
      : "message";

  /*
   * ============================================================
   * FIND RECIPIENTS
   * ============================================================
   */

  let recipientIds = [];

  /*
   * INCOMING CALL
   */

  if (kind === "call") {
    if (body.callee_id) {
      recipientIds = [
        String(body.callee_id),
      ];
    }
  }

  /*
   * MESSAGE
   */

  else {
    if (!body.conversation_id) {
      return json(res, 400, {
        error:
          "conversation_id is required",
      });
    }

    const {
      data: members,
      error: memberError,
    } = await supabaseAdmin
      .from("conversation_members")
      .select("user_id")
      .eq(
        "conversation_id",
        body.conversation_id
      )
      .neq(
        "user_id",
        actorId
      );

    if (memberError) {
      return json(res, 500, {
        error:
          memberError.message,
      });
    }

    recipientIds = (
      members || []
    )
      .map(
        (row) => row.user_id
      )
      .filter(Boolean);
  }

  /*
   * Remove duplicates.
   * Never send a notification back
   * to the person who triggered it.
   */

  recipientIds = [
    ...new Set(
      recipientIds.filter(
        (id) =>
          String(id) !==
          String(actorId)
      )
    ),
  ];

  /*
   * Nobody to notify.
   */

  if (!recipientIds.length) {
    return json(res, 200, {
      ok: true,
      sent: 0,
      recipients: 0,
    });
  }

  /*
   * ============================================================
   * LOAD SENDER PROFILE
   * ============================================================
   */

  const {
    data: senderProfile,
  } = await supabaseAdmin
    .from("profiles")
    .select(
      "id,username,full_name,avatar_url"
    )
    .eq(
      "id",
      actorId
    )
    .maybeSingle();

  /*
   * ============================================================
   * BUILD NOTIFICATION TEXT
   * ============================================================
   */

  const title = cleanText(
    body.title,
    senderProfile?.full_name ||
      senderProfile?.username ||
      "hexachi"
  );

  const textBody = cleanText(
    body.body,

    kind === "call"
      ? body.call_type === "video"
        ? "📹 Incoming video call"
        : "📞 Incoming voice call"
      : "You have a new message."
  );

  /*
   * ============================================================
   * LOAD DEVICE PUSH SUBSCRIPTIONS
   * ============================================================
   */

  const {
    data: subscriptions,
    error: subscriptionError,
  } = await supabaseAdmin
    .from("push_subscriptions")
    .select(
      "id,user_id,subscription"
    )
    .in(
      "user_id",
      recipientIds
    );

  if (subscriptionError) {
    return json(res, 500, {
      error:
        subscriptionError.message,
    });
  }

  /*
   * ============================================================
   * CREATE PUSH PAYLOAD
   * ============================================================
   */

  const payload =
    JSON.stringify({
      title,

      body: textBody,

      icon:
        "/favicon.ico",

      badge:
        "/favicon.ico",

      tag:
        kind === "call"
          ? `call-${
              body.call_id ||
              Date.now()
            }`
          : `message-${
              body.conversation_id
            }`,

      /*
       * Calls stay visible until
       * the user interacts with them.
       */

      requireInteraction:
        kind === "call",

      /*
       * Used by hexa-sw.js
       */

      kind,

      data: {
        kind,

        url:
          body.url || "/",

        conversation_id:
          body.conversation_id ||
          null,

        message_id:
          body.message_id ||
          null,

        call_id:
          body.call_id ||
          null,

        call_type:
          body.call_type ||
          null,
      },
    });

  /*
   * ============================================================
   * SEND PUSH TO EVERY DEVICE
   * ============================================================
   */

  let sent = 0;
  let removed = 0;

  for (
    const item of subscriptions || []
  ) {
    if (!item?.subscription) {
      continue;
    }

    try {
      await webpush.sendNotification(
        item.subscription,
        payload
      );

      sent += 1;
    } catch (error) {
      const status =
        Number(
          error?.statusCode || 0
        );

      /*
       * 404 / 410 means that
       * the browser subscription
       * has expired or disappeared.
       */

      if (
        status === 404 ||
        status === 410
      ) {
        await supabaseAdmin
          .from(
            "push_subscriptions"
          )
          .delete()
          .eq(
            "id",
            item.id
          );

        removed += 1;
      } else {
        console.warn(
          "hexachi web push delivery failed:",
          status,
          error?.message ||
            error
        );
      }
    }
  }

  /*
   * ============================================================
   * RESPONSE
   * ============================================================
   */

  return json(res, 200, {
    ok: true,

    sent,

    removed,

    recipients:
      recipientIds.length,
  });
}

module.exports = handler;