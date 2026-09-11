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

function json(res, status, body) {
  res.setHeader(
    "Content-Type",
    "application/json; charset=utf-8"
  );

  res.setHeader(
    "Access-Control-Allow-Origin",
    "*"
  );

  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, OPTIONS"
  );

  res.setHeader(
    "Access-Control-Allow-Headers",
    "Authorization, Content-Type"
  );

  return res.status(status).json(body);
}

function cleanText(value, fallback) {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function getConfigError() {
  if (!SUPABASE_URL) {
    return "Missing SUPABASE_URL or VITE_SUPABASE_URL";
  }

  if (!SUPABASE_SERVICE_ROLE_KEY) {
    return "Missing SUPABASE_SERVICE_ROLE_KEY";
  }

  if (!VAPID_PUBLIC_KEY) {
    return "Missing VAPID_PUBLIC_KEY";
  }

  if (!VAPID_PRIVATE_KEY) {
    return "Missing VAPID_PRIVATE_KEY";
  }

  return null;
}

const configError = getConfigError();

const supabaseAdmin = !configError
  ? createClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    )
  : null;

if (!configError) {
  webpush.setVapidDetails(
    VAPID_SUBJECT,
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
}

async function getAuthenticatedUser(req) {
  const authHeader = String(
    req.headers.authorization || ""
  );

  const token =
    authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : "";

  if (!token) {
    return {
      user: null,
      error: "Missing Supabase access token",
    };
  }

  const {
    data,
    error,
  } = await supabaseAdmin.auth.getUser(token);

  if (error || !data?.user?.id) {
    return {
      user: null,
      error: "Invalid Supabase session",
    };
  }

  return {
    user: data.user,
    error: null,
  };
}

export default async function handler(req, res) {
  /*
   * OPTIONS
   */
  if (req.method === "OPTIONS") {
    return json(res, 204, null);
  }

  /*
   * GET HEALTH CHECK
   */
  if (req.method === "GET") {
    return json(
      res,
      configError ? 500 : 200,
      {
        ok: !configError,
        service: "hexachi-push",
        message: configError
          ? "Push endpoint configuration is incomplete."
          : "Push endpoint is online. Use POST to send a notification.",
        error:
          configError || undefined,
      }
    );
  }

  /*
   * ONLY POST SENDS PUSH
   */
  if (req.method !== "POST") {
    return json(res, 405, {
      error: "Method not allowed",
      allowed: [
        "GET",
        "POST",
        "OPTIONS",
      ],
    });
  }

  /*
   * SERVER CONFIGURATION
   */
  if (configError) {
    console.error(
      "hexachi push configuration error:",
      configError
    );

    return json(res, 500, {
      error: configError,
    });
  }

  try {
    /*
     * AUTH
     */
    const {
      user: actor,
      error: authError,
    } = await getAuthenticatedUser(req);

    if (authError) {
      return json(res, 401, {
        error: authError,
      });
    }

    const actorId = actor.id;
    const body = req.body || {};

    const kind =
      body.kind === "call"
        ? "call"
        : "message";

    /*
     * RECIPIENTS
     */
    let recipientIds = [];

    if (kind === "call") {
      if (body.callee_id) {
        recipientIds = [
          String(body.callee_id),
        ];
      }
    } else {
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

      recipientIds =
        (members || [])
          .map(
            (row) => row.user_id
          )
          .filter(Boolean);
    }

    /*
     * Remove duplicates and
     * never notify the sender.
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

    if (!recipientIds.length) {
      return json(res, 200, {
        ok: true,
        sent: 0,
        removed: 0,
        recipients: 0,
      });
    }

    /*
     * SENDER PROFILE
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
     * NOTIFICATION TEXT
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
        ? body.call_type ===
          "video"
          ? "📹 Incoming video call"
          : "📞 Incoming voice call"
        : "You have a new message."
    );

    /*
     * DEVICE SUBSCRIPTIONS
     */
    const {
      data: subscriptions,
      error:
        subscriptionError,
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
     * PUSH PAYLOAD
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

        requireInteraction:
          kind === "call",

        kind,

        data: {
          kind,

          url:
            body.url ||
            "/",

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
     * SEND
     */
    let sent = 0;
    let removed = 0;

    for (
      const item of
        subscriptions || []
    ) {
      if (
        !item?.subscription
      ) {
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
            error?.statusCode ||
              0
          );

        /*
         * Browser subscription
         * expired or was removed.
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

    return json(res, 200, {
      ok: true,
      sent,
      removed,
      recipients:
        recipientIds.length,
    });
  } catch (error) {
    console.error(
      "hexachi push API error:",
      error
    );

    return json(res, 500, {
      error:
        error?.message ||
        "Unable to send push notification.",
    });
  }
}