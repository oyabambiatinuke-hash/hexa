import { createClient } from "@supabase/supabase-js";

const PLANS = {
  plus: {
    name: "HEXA Plus",
    prices: {
      ngn: {
        monthly: "STRIPE_PLUS_NGN_MONTHLY",
        yearly: "STRIPE_PLUS_NGN_YEARLY",
      },
      usd: {
        monthly: "STRIPE_PLUS_USD_MONTHLY",
        yearly: "STRIPE_PLUS_USD_YEARLY",
      },
    },
  },

  pro: {
    name: "HEXA Pro",
    prices: {
      ngn: {
        monthly: "STRIPE_PRO_NGN_MONTHLY",
        yearly: "STRIPE_PRO_NGN_YEARLY",
      },
      usd: {
        monthly: "STRIPE_PRO_USD_MONTHLY",
        yearly: "STRIPE_PRO_USD_YEARLY",
      },
    },
  },

  ultra: {
    name: "HEXA Ultra",
    prices: {
      ngn: {
        monthly: "STRIPE_ULTRA_NGN_MONTHLY",
        yearly: "STRIPE_ULTRA_NGN_YEARLY",
      },
      usd: {
        monthly: "STRIPE_ULTRA_USD_MONTHLY",
        yearly: "STRIPE_ULTRA_USD_YEARLY",
      },
    },
  },
};

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL;

const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

const STRIPE_SECRET_KEY =
  process.env.STRIPE_SECRET_KEY;

const PUBLIC_APP_URL =
  process.env.PUBLIC_APP_URL ||
  "https://hexa-chi.vercel.app";

const supabaseAdmin =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
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
    "POST, OPTIONS"
  );

  res.setHeader(
    "Access-Control-Allow-Headers",
    "Authorization, Content-Type"
  );

  return res.status(status).json(body);
}

async function getAuthenticatedUser(req) {
  if (!supabaseAdmin) {
    return {
      user: null,
      error:
        "Supabase server credentials are not configured.",
    };
  }

  const authorization =
    String(
      req.headers.authorization || ""
    );

  const token =
    authorization.startsWith("Bearer ")
      ? authorization.slice(7).trim()
      : "";

  if (!token) {
    return {
      user: null,
      error:
        "Missing Supabase access token. Please sign in again.",
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
      error:
        "Invalid or expired Supabase session.",
    };
  }

  return {
    user: data.user,
    error: null,
  };
}

export default async function handler(
  req,
  res
) {
  if (req.method === "OPTIONS") {
    return json(res, 204, null);
  }

  if (req.method !== "POST") {
    return json(res, 405, {
      error: "Method not allowed.",
    });
  }

  if (!STRIPE_SECRET_KEY) {
    return json(res, 500, {
      error:
        "STRIPE_SECRET_KEY is not configured in Vercel.",
    });
  }

  if (
    !SUPABASE_URL ||
    !SUPABASE_SERVICE_ROLE_KEY
  ) {
    return json(res, 500, {
      error:
        "Supabase server credentials are not configured.",
    });
  }

  try {
    /*
     * IMPORTANT:
     * Never trust the HEXA user ID supplied by the browser.
     * The authenticated Supabase user's UUID is the source of truth.
     */
    const {
      user,
      error: authError,
    } = await getAuthenticatedUser(req);

    if (authError) {
      return json(res, 401, {
        error: authError,
      });
    }

    const hexaUserId = user.id;

    if (!hexaUserId) {
      return json(res, 401, {
        error:
          "Missing HEXA user ID. Please sign in again.",
      });
    }

    /*
     * Optional client-supplied ID.
     * If the frontend sends one, verify it matches
     * the authenticated Supabase account.
     */
    const requestedHexaUserId =
      String(
        req.body?.hexa_user_id || ""
      ).trim();

    if (
      requestedHexaUserId &&
      requestedHexaUserId !== hexaUserId
    ) {
      return json(res, 403, {
        error:
          "The HEXA user ID does not match the signed-in account.",
      });
    }

    const planId =
      String(
        req.body?.plan_id || ""
      )
        .trim()
        .toLowerCase();

    const plan =
      PLANS[planId];

    if (!plan) {
      return json(res, 400, {
        error:
          "Choose a valid HEXA plan: plus, pro or ultra.",
      });
    }

    const currency =
      String(
        req.body?.currency || "ngn"
      )
        .trim()
        .toLowerCase();

    const billingCycle =
      String(
        req.body?.billingCycle ||
          req.body?.billing_cycle ||
          "monthly"
      )
        .trim()
        .toLowerCase();

    if (
      !["ngn", "usd"].includes(
        currency
      )
    ) {
      return json(res, 400, {
        error:
          "Currency must be NGN or USD.",
      });
    }

    if (
      !["monthly", "yearly"].includes(
        billingCycle
      )
    ) {
      return json(res, 400, {
        error:
          "Billing cycle must be monthly or yearly.",
      });
    }

    const priceEnv =
      plan.prices?.[
        currency
      ]?.[
        billingCycle
      ];

    const priceId =
      priceEnv
        ? process.env[priceEnv]
        : "";

    if (!priceId) {
      return json(res, 500, {
        error:
          `${
            priceEnv || "Stripe price"
          } is not configured in Vercel.`,
      });
    }

    /*
     * Stripe success/cancel URLs.
     */
    const origin =
      String(
        PUBLIC_APP_URL ||
          req.headers.origin ||
          "https://hexa-chi.vercel.app"
      ).replace(/\/$/, "");

    /*
     * Create Stripe Checkout Session.
     *
     * Stripe expects application/x-www-form-urlencoded
     * for this endpoint.
     */
    const body =
      new URLSearchParams();

    body.set(
      "mode",
      "subscription"
    );

    body.set(
      "line_items[0][price]",
      priceId
    );

    body.set(
      "line_items[0][quantity]",
      "1"
    );

    body.set(
      "success_url",
      `${origin}/?subscription=success&session_id={CHECKOUT_SESSION_ID}`
    );

    body.set(
      "cancel_url",
      `${origin}/?subscription=cancelled`
    );

    /*
     * Store HEXA's authenticated UUID
     * directly on the Checkout Session.
     */
    body.set(
      "client_reference_id",
      hexaUserId
    );

    /*
     * Pre-fill Stripe Checkout with the
     * authenticated user's email.
     */
    if (user.email) {
      body.set(
        "customer_email",
        user.email
      );
    }

    /*
     * Checkout Session metadata.
     */
    body.set(
      "metadata[user_id]",
      hexaUserId
    );

    body.set(
      "metadata[plan_id]",
      planId
    );

    body.set(
      "metadata[currency]",
      currency
    );

    body.set(
      "metadata[billing_cycle]",
      billingCycle
    );

    /*
     * Subscription metadata.
     *
     * This is important because later Stripe
     * subscription.updated / subscription.deleted
     * webhooks operate on the Subscription object.
     */
    body.set(
      "subscription_data[metadata][user_id]",
      hexaUserId
    );

    body.set(
      "subscription_data[metadata][plan_id]",
      planId
    );

    body.set(
      "subscription_data[metadata][currency]",
      currency
    );

    body.set(
      "subscription_data[metadata][billing_cycle]",
      billingCycle
    );

    /*
     * Create Checkout Session.
     */
    const stripeResponse =
      await fetch(
        "https://api.stripe.com/v1/checkout/sessions",
        {
          method: "POST",

          headers: {
            Authorization:
              `Bearer ${STRIPE_SECRET_KEY}`,

            "Content-Type":
              "application/x-www-form-urlencoded",
          },

          body,
        }
      );

    const stripeData =
      await stripeResponse
        .json()
        .catch(() => ({}));

    if (!stripeResponse.ok) {
      console.error(
        "Stripe Checkout error:",
        stripeData
      );

      return json(
        res,
        stripeResponse.status,
        {
          error:
            stripeData?.error?.message ||
            "Stripe checkout creation failed.",
        }
      );
    }

    if (!stripeData?.url) {
      return json(res, 500, {
        error:
          "Stripe created the checkout session but did not return a checkout URL.",
      });
    }

    return json(res, 200, {
      ok: true,

      url:
        stripeData.url,

      session_id:
        stripeData.id,

      hexa_user_id:
        hexaUserId,

      plan_id:
        planId,

      plan_name:
        plan.name,

      currency,

      billing_cycle:
        billingCycle,
    });
  } catch (error) {
    console.error(
      "HEXACHI Stripe checkout error:",
      error
    );

    return json(res, 500, {
      error:
        error?.message ||
        "Unable to create Stripe checkout.",
    });
  }
}
