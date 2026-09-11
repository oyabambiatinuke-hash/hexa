const webpush = require("web-push");
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL =
  process.env.SUPABASE_URL;

const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

const VAPID_PUBLIC_KEY =
  process.env.VAPID_PUBLIC_KEY;

const VAPID_PRIVATE_KEY =
  process.env.VAPID_PRIVATE_KEY;

const VAPID_SUBJECT =
  process.env.VAPID_SUBJECT ||
  "mailto:admin@hexachi.app";

const supabaseAdmin = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

webpush.setVapidDetails(
  VAPID_SUBJECT,
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

function json(res, status, body) {
  return res.status(status).json(body);
}

function cleanText(value, fallback) {
  const text = String(value ?? "").trim();

  return text || fallback;
}

async function getAuthenticatedUser(req) {
  const authHeader =
    String(
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

  if (
    error ||
    !data?.user?.id
  ) {
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

async function getMessageRecipients(
  conversationId,
  actorId
) {
  const {
    data: members,
    error,
  } = await supabaseAdmin
    .from("conversation_members")
    .select("user_id")
    .eq(
      "conversation_id",
      conversationId
    )
    .neq(
      "user_id",
      actorId
    );

  if (error) {
    throw new Error(
      error.message
    );
  }

  return [
    ...new Set(
      (members || [])
        .map((row) => row.user_id)
        .filter(Boolean)
        .filter(
          (id) =>
            String(id) !==
            String(actorId)
        )
    ),
  ];
}

async function getCallRecipients(
  calleeId,
  actorId
) {
  if (!calleeId) return [];

  if (
    String(calleeId) ===
    String(actorId)
  ) {
    return [];
  }

  return [calleeId];
}

async function loadSenderProfile(
  actorId
) {
  const {
    data,
  } = await supabaseAdmin
    .from("profiles")
    .select(
      "id,username,full_name,avatar_url"
    )
    .eq("id", actorId)
    .maybeSingle();

  return data || null;
}

async function loadSubscriptions(
  recipientIds
) {
  if (!recipientIds.length) {
    return [];
  }

  const {
    data,
    error,
  } = await supabaseAdmin
    .from("push_subscriptions")
    .select(
      "id,user_id,subscription"
    )
    .in(
      "user_id",
      recipientIds
    );

  if (error) {
    throw new Error(
      error.message
    );
  }

  return data || [];
}

function buildPayload({
  kind,
  body,
  senderProfile,
  conversationId,
  messageId,
  callId,
  callType,
  url,
}) {
  const isCall =
    kind === "call";

  const title = cleanText(
    body.title,
    senderProfile?.full_name ||
      senderProfile?.username ||
      "hexachi"
  );

  const textBody = cleanText(
    body.body,
    isCall
      ? callType === "video"
        ? "📹 Incoming video call"
        : "📞 Incoming voice call"
      : "You have a new message."
  );

  return JSON.stringify({
    title,
    body: textBody,

    icon:
      "/favicon.ico",

    badge:
      "/favicon.ico",

    tag: isCall
      ? `call-${callId || Date.now()}`
      : `message-${conversationId}`,

    requireInteraction:
      isCall,

    vibrate:
      isCall
        ? [250, 100, 250, 100, 400]
        : [120, 60, 120],

    kind,

    data: {
      kind,

      url:
        url ||
        "/",

      conversation_id:
        conversationId ||
        null,

      message_id:
        messageId ||
        null,

      call_id:
        callId ||
        null,

      call_type:
        callType ||
        null,
    },
  });
}

async function sendPushes(
  subscriptions,
  payload
) {
  let sent = 0;
  let removed = 0;

  for (
    const item of subscriptions
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
          error?.statusCode || 0
        );

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

  return {
    sent,
    removed,
  };
}

async function handler(
  req,
  res
) {
  if (
    req.method !== "POST"
  ) {
    return json(
      res,
      405,
      {
        error:
          "Method not allowed",
      }
    );
  }

  try {
    if (
      !SUPABASE_URL ||
      !SUPABASE_SERVICE_ROLE_KEY
    ) {
      return json(
        res,
        500,
        {
          error:
            "Supabase server environment variables are missing.",
        }
      );
    }

    if (
      !VAPID_PUBLIC_KEY ||
      !VAPID_PRIVATE_KEY
    ) {
      return json(
        res,
        500,
        {
          error:
            "VAPID environment variables are missing.",
        }
      );
    }

    const {
      user: actor,
      error: authError,
    } = await getAuthenticatedUser(
      req
    );

    if (authError) {
      return json(
        res,
        401,
        {
          error:
            authError,
        }
      );
    }

    const actorId =
      actor.id;

    const body =
      req.body || {};

    const kind =
      body.kind === "call"
        ? "call"
        : "message";

    let recipientIds = [];

    if (kind === "call") {
      recipientIds =
        await getCallRecipients(
          body.callee_id,
          actorId
        );

      if (
        !recipientIds.length
      ) {
        return json(
          res,
          400,
          {
            error:
              "callee_id is required for call notifications.",
          }
        );
      }
    } else {
      if (
        !body.conversation_id
      ) {
        return json(
          res,
          400,
          {
            error:
              "conversation_id is required.",
          }
        );
      }

      recipientIds =
        await getMessageRecipients(
          body.conversation_id,
          actorId
        );
    }

    if (
      !recipientIds.length
    ) {
      return json(
        res,
        200,
        {
          ok: true,
          sent: 0,
          removed: 0,
          recipients: 0,
        }
      );
    }

    const senderProfile =
      await loadSenderProfile(
        actorId
      );

    const subscriptions =
      await loadSubscriptions(
        recipientIds
      );

    if (
      !subscriptions.length
    ) {
      return json(
        res,
        200,
        {
          ok: true,
          sent: 0,
          removed: 0,
          recipients:
            recipientIds.length,
          reason:
            "No active push subscriptions.",
        }
      );
    }

    const payload =
      buildPayload({
        kind,
        body,
        senderProfile,
        conversationId:
          body.conversation_id,
        messageId:
          body.message_id,
        callId:
          body.call_id,
        callType:
          body.call_type,
        url:
          body.url,
      });

    const result =
      await sendPushes(
        subscriptions,
        payload
      );

    return json(
      res,
      200,
      {
        ok: true,

        sent:
          result.sent,

        removed:
          result.removed,

        recipients:
          recipientIds.length,

        subscriptions:
          subscriptions.length,
      }
    );
  } catch (error) {
    console.error(
      "hexachi push API error:",
      error
    );

    return json(
      res,
      500,
      {
        error:
          error?.message ||
          "Unable to send push notification.",
      }
    );
  }
}

module.exports = handler;