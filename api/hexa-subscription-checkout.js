import { createClient } from "@supabase/supabase-js";

/*
|--------------------------------------------------------------------------
| HEXA / Stripe configuration
|--------------------------------------------------------------------------
*/

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

/*
|--------------------------------------------------------------------------
| EXACT STRIPE PRICE IDS
|--------------------------------------------------------------------------
| These are the 12 prices from your Stripe catalog.
*/

const STRIPE_PRICES = {
  plus: {
    ngn: {
      monthly: "price_1UAZwkB6RxaFC26qMui5gRBO", // ₦3,500
      yearly: "price_1UAZoOB6RxaFC26qaRSzm7Hj",  // ₦33,600
    },
    usd: {
      monthly: "price_1UAZvdB6RxaFC26qJy3L1IMF", // $2.99
      yearly: "price_1UAZnoB6RxaFC26qNrJMybGu",  // $28.70
    },
  },

  pro: {
    ngn: {
      monthly: "price_1UAZtwB6RxaFC26qcBZ8ltsY", // ₦8,000
      yearly: "price_1UAZn6B6RxaFC26qIBFtL7e0",  // ₦76,800
    },
    usd: {
      monthly: "price_1UAZuaB6RxaFC26qf2cuu4xH", // $6.99
      yearly: "price_1UAZmHB6RxaFC26qpJ8Izod8",  // $67.10
    },
  },

  ultra: {
    ngn: {
      monthly: "price_1UAZqnB6RxaFC26qCjELRzXs", // ₦18,000
      yearly: "price_1UAZkuB6RxaFC26qq0AkCkaQ",  // ₦172,800
    },
    usd: {
      monthly: "price_1UAZrrB6RxaFC26qhruqMGjm", // $14.99
      yearly: "price_1UAZjcB6RxaFC26qCms49NVm",  // $143.90
    },
  },
};

const PLAN_NAMES = {
  plus: "HEXA Plus",
  pro: "HEXA Pro",
  ultra: "HEXA Ultra",
};

const ALLOWED_CURRENCIES = ["ngn", "usd"];
const ALLOWED_CYCLES = ["monthly", "yearly"];

/*
|--------------------------------------------------------------------------
| Supabase admin client
|--------------------------------------------------------------------------
*/

const supabaseAdmin =
  SUPABASE_URL &&
  SUPABASE_SERVICE_ROLE_KEY
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

/*
|--------------------------------------------------------------------------
| JSON response helper
|--------------------------------------------------------------------------
*/

function sendJson(res, status, body) {
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

/*
|--------------------------------------------------------------------------
| Authenticate the Supabase user
|--------------------------------------------------------------------------
*/

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
    ).trim();

  if (!authorization.startsWith("Bearer ")) {
    return {
      user: null,
      error:
        "Missing Supabase access token. Please sign in again.",
    };
  }

  const accessToken =
    authorization
      .slice(7)
      .trim();

  if (!accessToken) {
    return {
      user: null,
      error:
        "Missing Supabase access token. Please sign in again.",
    };
  }

  const {
    data,
    error,
  } =
    await supabaseAdmin.auth.getUser(
      accessToken
    );

  if (
    error ||
    !data?.user?.id
  ) {
    return {
      user: null,
      error:
        "Your HEXA session is invalid or expired. Please sign in again.",
    };
  }

  return {
    user: data.user,
    error: null,
  };
}

/*
|--------------------------------------------------------------------------
| Main Vercel function
|--------------------------------------------------------------------------
*/

export default async function handler(
  req,
  res
) {
  /*
  |--------------------------------------------------------------------------
  | CORS preflight
  |--------------------------------------------------------------------------
  */

  if (req.method === "OPTIONS") {
    return sendJson(res, 204, {});
  }

  /*
  |--------------------------------------------------------------------------
  | Only POST is allowed
  |--------------------------------------------------------------------------
  */

  if (req.method !== "POST") {
    return sendJson(res, 405, {
      error: "Method not allowed.",
    });
  }

  /*
  |--------------------------------------------------------------------------
  | Required environment variables
  |--------------------------------------------------------------------------
  */

  if (!STRIPE_SECRET_KEY) {
    return sendJson(res, 500, {
      error:
        "STRIPE_SECRET_KEY is not configured.",
    });
  }

  if (
    !SUPABASE_URL ||
    !SUPABASE_SERVICE_ROLE_KEY
  ) {
    return sendJson(res, 500, {
      error:
        "Supabase server credentials are not configured.",
    });
  }

  try {
    /*
    |--------------------------------------------------------------------------
    | Verify the signed-in Supabase user.
    |--------------------------------------------------------------------------
    */

    const {
      user,
      error: authError,
    } =
      await getAuthenticatedUser(req);

    if (authError) {
      return sendJson(res, 401, {
        error: authError,
      });
    }

    const hexaUserId =
      user.id;

    if (!hexaUserId) {
      return sendJson(res, 401, {
        error:
          "Missing HEXA user ID.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Read request
    |--------------------------------------------------------------------------
    */

    const body =
      req.body || {};

    const planId =
      String(
        body.plan_id ||
          body.plan ||
          ""
      )
        .trim()
        .toLowerCase();

    const currency =
      String(
        body.currency ||
          "ngn"
      )
        .trim()
        .toLowerCase();

    const billingCycle =
      String(
        body.billingCycle ||
          body.billing_cycle ||
          "monthly"
      )
        .trim()
        .toLowerCase();

    /*
    |--------------------------------------------------------------------------
    | Validate plan
    |--------------------------------------------------------------------------
    */

    if (
      !Object.prototype.hasOwnProperty.call(
        STRIPE_PRICES,
        planId
      )
    ) {
      return sendJson(res, 400, {
        error:
          "Invalid HEXA plan. Use plus, pro or ultra.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Validate currency
    |--------------------------------------------------------------------------
    */

    if (
      !ALLOWED_CURRENCIES.includes(
        currency
      )
    ) {
      return sendJson(res, 400, {
        error:
          "Invalid currency. Use ngn or usd.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Validate billing cycle
    |--------------------------------------------------------------------------
    */

    if (
      !ALLOWED_CYCLES.includes(
        billingCycle
      )
    ) {
      return sendJson(res, 400, {
        error:
          "Invalid billing cycle. Use monthly or yearly.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Get exact Stripe Price ID
    |--------------------------------------------------------------------------
    */

    const priceId =
      STRIPE_PRICES?.[
        planId
      ]?.[
        currency
      ]?.[
        billingCycle
      ];

    if (!priceId) {
      return sendJson(res, 500, {
        error:
          "No Stripe Price ID is configured for this plan, currency and billing cycle.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Determine public application URL
    |--------------------------------------------------------------------------
    */

    const appUrl =
      String(
        PUBLIC_APP_URL ||
          req.headers.origin ||
          "https://hexa-chi.vercel.app"
      )
        .replace(/\/+$/, "");

    /*
    |--------------------------------------------------------------------------
    | Create Stripe Checkout Session
    |--------------------------------------------------------------------------
    */

    const stripeBody =
      new URLSearchParams();

    stripeBody.set(
      "mode",
      "subscription"
    );

    stripeBody.set(
      "line_items[0][price]",
      priceId
    );

    stripeBody.set(
      "line_items[0][quantity]",
      "1"
    );

    /*
    |--------------------------------------------------------------------------
    | Managed Payments is already configured on the products.
    |
    | Keep it enabled so Stripe uses the SaaS business-use
    | tax category you configured on the products.
    |--------------------------------------------------------------------------
    */

    stripeBody.set(
      "managed_payments[enabled]",
      "true"
    );

    /*
    |--------------------------------------------------------------------------
    | Stripe redirect URLs
    |--------------------------------------------------------------------------
    */

    stripeBody.set(
      "success_url",
      `${appUrl}/?subscription=success&session_id={CHECKOUT_SESSION_ID}`
    );

    stripeBody.set(
      "cancel_url",
      `${appUrl}/?subscription=cancelled`
    );

    /*
    |--------------------------------------------------------------------------
    | Stripe customer/account identification
    |--------------------------------------------------------------------------
    */

    stripeBody.set(
      "client_reference_id",
      hexaUserId
    );

    if (user.email) {
      stripeBody.set(
        "customer_email",
        user.email
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Checkout metadata
    |--------------------------------------------------------------------------
    */

    stripeBody.set(
      "metadata[hexa_user_id]",
      hexaUserId
    );

    stripeBody.set(
      "metadata[plan_id]",
      planId
    );

    stripeBody.set(
      "metadata[plan_name]",
      PLAN_NAMES[planId]
    );

    stripeBody.set(
      "metadata[currency]",
      currency
    );

    stripeBody.set(
      "metadata[billing_cycle]",
      billingCycle
    );

    /*
    |--------------------------------------------------------------------------
    | Subscription metadata
    |--------------------------------------------------------------------------
    */

    stripeBody.set(
      "subscription_data[metadata][hexa_user_id]",
      hexaUserId
    );

    stripeBody.set(
      "subscription_data[metadata][plan_id]",
      planId
    );

    stripeBody.set(
      "subscription_data[metadata][plan_name]",
      PLAN_NAMES[planId]
    );

    stripeBody.set(
      "subscription_data[metadata][currency]",
      currency
    );

    stripeBody.set(
      "subscription_data[metadata][billing_cycle]",
      billingCycle
    );

    /*
    |--------------------------------------------------------------------------
    | Create Stripe session
    |--------------------------------------------------------------------------
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

          body: stripeBody,
        }
      );

    const stripeData =
      await stripeResponse
        .json()
        .catch(() => ({}));

    /*
    |--------------------------------------------------------------------------
    | Stripe error
    |--------------------------------------------------------------------------
    */

    if (!stripeResponse.ok) {
      console.error(
        "HEXA Stripe Checkout error:",
        stripeData
      );

      return sendJson(
        res,
        stripeResponse.status,
        {
          error:
            stripeData?.error?.message ||
            "Stripe Checkout could not be created.",

          stripe_error:
            stripeData?.error?.type ||
            null,

          stripe_code:
            stripeData?.error?.code ||
            null,
        }
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Confirm Checkout URL
    |--------------------------------------------------------------------------
    */

    if (!stripeData?.url) {
      return sendJson(res, 500, {
        error:
          "Stripe created the session but did not return a Checkout URL.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Success
    |--------------------------------------------------------------------------
    */

    return sendJson(res, 200, {
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
        PLAN_NAMES[planId],

      currency,

      billing_cycle:
        billingCycle,

      stripe_price_id:
        priceId,
    });
  } catch (error) {
    console.error(
      "HEXA subscription checkout exception:",
      error
    );

    return sendJson(res, 500, {
      error:
        error?.message ||
        "Unable to create HEXA Stripe Checkout.",
    });
  }
}
