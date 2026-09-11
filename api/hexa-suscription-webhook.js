// api/hexa-subscription-webhook.js

import crypto from "node:crypto";

export const config = {
  api: {
    bodyParser: false,
  },
};

function timingSafeEqualHex(a, b) {
  try {
    const aa = Buffer.from(String(a), "utf8");
    const bb = Buffer.from(String(b), "utf8");

    if (aa.length !== bb.length) {
      return false;
    }

    return crypto.timingSafeEqual(aa, bb);
  } catch {
    return false;
  }
}

function verifyStripeSignature(payload, signature, secret) {
  if (!payload || !signature || !secret) {
    return false;
  }

  const pieces = String(signature)
    .split(",")
    .map((item) => item.trim());

  let timestamp = null;
  const signatures = [];

  for (const piece of pieces) {
    const separator = piece.indexOf("=");

    if (separator === -1) {
      continue;
    }

    const key = piece.slice(0, separator);
    const value = piece.slice(separator + 1);

    if (key === "t") {
      timestamp = value;
    }

    if (key === "v1") {
      signatures.push(value);
    }
  }

  if (!timestamp || !signatures.length) {
    return false;
  }

  const timestampNumber = Number(timestamp);

  if (!Number.isFinite(timestampNumber)) {
    return false;
  }

  /*
    Reject signatures that are more than five minutes old.
  */
  const age = Math.abs(
    Math.floor(Date.now() / 1000) - timestampNumber
  );

  if (age > 300) {
    return false;
  }

  const signedPayload = `${timestamp}.${payload}`;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(signedPayload, "utf8")
    .digest("hex");

  return signatures.some((signatureValue) =>
    timingSafeEqualHex(expected, signatureValue)
  );
}

async function readRawBody(req) {
  const chunks = [];

  for await (const chunk of req) {
    chunks.push(
      Buffer.isBuffer(chunk)
        ? chunk
        : Buffer.from(chunk)
    );
  }

  return Buffer.concat(chunks).toString("utf8");
}

async function supabaseRequest(path, options = {}) {
  const base = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!base || !key) {
    throw new Error(
      "SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing on Vercel."
    );
  }

  const response = await fetch(
    `${base}/rest/v1/${path}`,
    {
      ...options,
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
        ...(options.headers || {}),
      },
    }
  );

  const text = await response.text();

  if (!response.ok) {
    throw new Error(
      text ||
        `Supabase request failed with status ${response.status}`
    );
  }

  return text ? JSON.parse(text) : null;
}

function toISOStringFromUnix(seconds) {
  if (!seconds) {
    return null;
  }

  return new Date(
    Number(seconds) * 1000
  ).toISOString();
}

function normalizeSubscriptionStatus(status) {
  const allowed = [
    "incomplete",
    "trialing",
    "active",
    "past_due",
    "canceled",
    "unpaid",
  ];

  return allowed.includes(status)
    ? status
    : "incomplete";
}

function getSubscriptionMetadata(object) {
  return object?.metadata || {};
}

async function upsertHexaSubscription({
  userId,
  planId,
  status,
  customerId,
  subscriptionId,
  currentPeriodStart,
  currentPeriodEnd,
  cancelAtPeriodEnd,
}) {
  const planNames = {
    plus: "HEXA Plus",
    pro: "HEXA Pro",
    ultra: "HEXA Ultra",
  };

  if (!userId || !planNames[planId]) {
    return;
  }

  await supabaseRequest(
    "hexa_subscriptions?on_conflict=user_id",
    {
      method: "POST",
      headers: {
        Prefer:
          "resolution=merge-duplicates,return=representation",
      },
      body: JSON.stringify([
        {
          user_id: userId,
          plan_id: planId,
          plan_name: planNames[planId],
          status: normalizeSubscriptionStatus(status),
          provider: "stripe",
          provider_customer_id: customerId || null,
          provider_subscription_id:
            subscriptionId || null,
          current_period_start:
            currentPeriodStart || null,
          current_period_end:
            currentPeriodEnd || null,
          cancel_at_period_end:
            Boolean(cancelAtPeriodEnd),
          updated_at: new Date().toISOString(),
        },
      ]),
    }
  );
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  const webhookSecret =
    process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error(
      "STRIPE_WEBHOOK_SECRET is missing."
    );

    return res.status(500).json({
      error:
        "STRIPE_WEBHOOK_SECRET is not configured on Vercel.",
    });
  }

  try {
    /*
      Stripe signature verification MUST use the raw request body.
    */
    const rawBody = await readRawBody(req);

    const signature =
      req.headers["stripe-signature"];

    const valid = verifyStripeSignature(
      rawBody,
      signature,
      webhookSecret
    );

    if (!valid) {
      return res.status(400).json({
        error: "Invalid Stripe signature.",
      });
    }

    const event = JSON.parse(rawBody);

    const object =
      event?.data?.object || {};

    const now = new Date().toISOString();

    /*
      --------------------------------------------------------
      CHECKOUT COMPLETED
      --------------------------------------------------------
    */
    if (
      event.type ===
      "checkout.session.completed"
    ) {
      const metadata =
        getSubscriptionMetadata(object);

      const userId =
        metadata.user_id ||
        object.client_reference_id ||
        null;

      const planId =
        metadata.plan_id || null;

      const customerId =
        object.customer || null;

      const subscriptionId =
        object.subscription || null;

      if (
        userId &&
        planId &&
        ["plus", "pro", "ultra"].includes(planId)
      ) {
        await upsertHexaSubscription({
          userId,
          planId,
          status: "active",
          customerId,
          subscriptionId,
          currentPeriodStart: null,
          currentPeriodEnd: null,
          cancelAtPeriodEnd: false,
        });
      }
    }

    /*
      --------------------------------------------------------
      SUBSCRIPTION CREATED / UPDATED
      --------------------------------------------------------
    */
    if (
      event.type ===
        "customer.subscription.created" ||
      event.type ===
        "customer.subscription.updated"
    ) {
      const metadata =
        getSubscriptionMetadata(object);

      const userId =
        metadata.user_id || null;

      const planId =
        metadata.plan_id || null;

      /*
        The subscription metadata should now contain
        the user and plan because Checkout writes
        subscription_data.metadata.
      */
      if (
        userId &&
        planId &&
        ["plus", "pro", "ultra"].includes(planId)
      ) {
        await upsertHexaSubscription({
          userId,
          planId,
          status: object.status,
          customerId: object.customer,
          subscriptionId: object.id,
          currentPeriodStart:
            toISOStringFromUnix(
              object.current_period_start
            ),
          currentPeriodEnd:
            toISOStringFromUnix(
              object.current_period_end
            ),
          cancelAtPeriodEnd:
            object.cancel_at_period_end,
        });
      } else {
        /*
          Compatibility fallback:
          find the HEXA subscription by Stripe subscription ID.
        */
        const existing =
          object.id
            ? await supabaseRequest(
                `hexa_subscriptions?provider_subscription_id=eq.${encodeURIComponent(
                  object.id
                )}&select=id,user_id`,
                {
                  method: "GET",
                }
              )
            : [];

        if (existing?.length) {
          await supabaseRequest(
            `hexa_subscriptions?id=eq.${encodeURIComponent(
              existing[0].id
            )}`,
            {
              method: "PATCH",
              body: JSON.stringify({
                status:
                  normalizeSubscriptionStatus(
                    object.status
                  ),
                provider_customer_id:
                  object.customer || null,
                current_period_start:
                  toISOStringFromUnix(
                    object.current_period_start
                  ),
                current_period_end:
                  toISOStringFromUnix(
                    object.current_period_end
                  ),
                cancel_at_period_end:
                  Boolean(
                    object.cancel_at_period_end
                  ),
                updated_at: now,
              }),
            }
          );
        }
      }
    }

    /*
      --------------------------------------------------------
      SUBSCRIPTION DELETED / CANCELLED
      --------------------------------------------------------
    */
    if (
      event.type ===
      "customer.subscription.deleted"
    ) {
      const subscriptionId = object.id;

      if (subscriptionId) {
        const rows =
          await supabaseRequest(
            `hexa_subscriptions?provider_subscription_id=eq.${encodeURIComponent(
              subscriptionId
            )}&select=id`,
            {
              method: "GET",
            }
          );

        if (rows?.length) {
          await supabaseRequest(
            `hexa_subscriptions?id=eq.${encodeURIComponent(
              rows[0].id
            )}`,
            {
              method: "PATCH",
              body: JSON.stringify({
                status: "canceled",
                cancel_at_period_end: false,
                current_period_end:
                  toISOStringFromUnix(
                    object.current_period_end
                  ),
                updated_at: now,
              }),
            }
          );
        }
      }
    }

    /*
      Stripe only needs a successful 2xx response.
    */
    return res.status(200).json({
      received: true,
      event_id: event.id || null,
      event_type: event.type || null,
    });
  } catch (error) {
    console.error(
      "HEXA Stripe webhook error:",
      error
    );

    return res.status(500).json({
      error:
        error?.message ||
        "Webhook processing failed.",
    });
  }
}