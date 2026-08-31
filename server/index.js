import "dotenv/config";
import express from "express";
import cors from "cors";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const app = express();
const PORT = process.env.PORT || 4242;

/* ========================================================
   ENVIRONMENT
   ======================================================== */

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL;

const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SECRET_KEY;

const STRIPE_SECRET_KEY =
  process.env.STRIPE_SECRET_KEY;

const STRIPE_WEBHOOK_SECRET =
  process.env.STRIPE_WEBHOOK_SECRET;

const FRONTEND_URL =
  process.env.FRONTEND_URL ||
  "https://hexa-nfdjqsjh6-hexa24.vercel.app";

/* ========================================================
   STRIPE PRICE MAP

   IMPORTANT:
   These IDs follow the order you supplied from Stripe.
   ======================================================== */

const STRIPE_PRICES = {
  plus: {
    ngn: {
      monthly: "price_1UAZwkB6RxaFC26qMui5gRBO",
      yearly: "price_1UAZoOB6RxaFC26qaRSzm7Hj",
    },
    usd: {
      monthly: "price_1UAZvdB6RxaFC26qJy3L1IMF",
      yearly: "price_1UAZnoB6RxaFC26qNrJMybGu",
    },
  },

  pro: {
    ngn: {
      monthly: "price_1UAZtwB6RxaFC26qcBZ8ltsY",
      yearly: "price_1UAZn6B6RxaFC26qIBFtL7e0",
    },
    usd: {
      monthly: "price_1UAZuaB6RxaFC26qf2cuu4xH",
      yearly: "price_1UAZmHB6RxaFC26qpJ8Izod8",
    },
  },

  ultra: {
    ngn: {
      monthly: "price_1UAZqnB6RxaFC26qCjELRzXs",
      yearly: "price_1UAZkuB6RxaFC26qq0AkCkaQ",
    },
    usd: {
      monthly: "price_1UAZrrB6RxaFC26qhruqMGjm",
      yearly: "price_1UAZjcB6RxaFC26qCms49NVm",
    },
  },
};

/* ========================================================
   PLAN LIMITS
   ======================================================== */

const PLAN_LIMITS = {
  free: {
    koraCredits: 500,
    storageGb: 2,
  },

  plus: {
    koraCredits: 5000,
    storageGb: 50,
  },

  pro: {
    koraCredits: 20000,
    storageGb: 250,
  },

  ultra: {
    koraCredits: 100000,
    storageGb: 1024,
  },
};

/* ========================================================
   VALIDATION
   ======================================================== */

if (!SUPABASE_URL) {
  throw new Error(
    "Missing SUPABASE_URL or VITE_SUPABASE_URL"
  );
}

if (!SUPABASE_KEY) {
  throw new Error(
    "Missing SUPABASE_SERVICE_ROLE_KEY"
  );
}

if (!STRIPE_SECRET_KEY) {
  throw new Error(
    "Missing STRIPE_SECRET_KEY"
  );
}

const stripe = new Stripe(STRIPE_SECRET_KEY);

const supabaseAdmin = createClient(
  SUPABASE_URL,
  SUPABASE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

/* ========================================================
   LOGGING
   ======================================================== */

console.log("======================================");
console.log("HEXA BILLING SERVER");
console.log("======================================");
console.log("Supabase:", Boolean(SUPABASE_URL));
console.log("Supabase server key:", Boolean(SUPABASE_KEY));
console.log("Stripe:", Boolean(STRIPE_SECRET_KEY));
console.log("Webhook secret:", Boolean(STRIPE_WEBHOOK_SECRET));
console.log("Frontend:", FRONTEND_URL);
console.log("======================================");

/* ========================================================
   CORS
   ======================================================== */

app.use(
  cors({
    origin: true,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Stripe-Signature",
    ],
  })
);

/* ========================================================
   STRIPE WEBHOOK
   MUST COME BEFORE express.json()
   ======================================================== */

app.post(
  "/api/stripe/webhook",
  express.raw({
    type: "application/json",
  }),
  async (req, res) => {
    try {
      if (!STRIPE_WEBHOOK_SECRET) {
        console.error(
          "STRIPE_WEBHOOK_SECRET is missing"
        );

        return res.status(500).json({
          error:
            "Stripe webhook is not configured",
        });
      }

      const signature =
        req.headers["stripe-signature"];

      if (!signature) {
        return res.status(400).json({
          error:
            "Missing Stripe signature",
        });
      }

      const event =
        stripe.webhooks.constructEvent(
          req.body,
          signature,
          STRIPE_WEBHOOK_SECRET
        );

      console.log(
        "Stripe webhook:",
        event.type
      );

      switch (event.type) {
        /* ------------------------------------------------
           CHECKOUT COMPLETED
           ------------------------------------------------ */

        case "checkout.session.completed": {
          const session = event.data.object;

          await handleCheckoutCompleted(
            session
          );

          break;
        }

        /* ------------------------------------------------
           SUBSCRIPTION CREATED
           ------------------------------------------------ */

        case "customer.subscription.created": {
          const subscription =
            event.data.object;

          await syncStripeSubscription(
            subscription
          );

          break;
        }

        /* ------------------------------------------------
           SUBSCRIPTION UPDATED
           ------------------------------------------------ */

        case "customer.subscription.updated": {
          const subscription =
            event.data.object;

          await syncStripeSubscription(
            subscription
          );

          break;
        }

        /* ------------------------------------------------
           SUBSCRIPTION DELETED
           ------------------------------------------------ */

        case "customer.subscription.deleted": {
          const subscription =
            event.data.object;

          await markSubscriptionCanceled(
            subscription
          );

          break;
        }

        /* ------------------------------------------------
           PAYMENT SUCCESS
           ------------------------------------------------ */

        case "invoice.paid": {
          const invoice =
            event.data.object;

          await handleInvoicePaid(
            invoice
          );

          break;
        }

        /* ------------------------------------------------
           PAYMENT FAILED
           ------------------------------------------------ */

        case "invoice.payment_failed": {
          const invoice =
            event.data.object;

          await handleInvoiceFailed(
            invoice
          );

          break;
        }

        default:
          console.log(
            "Unhandled Stripe event:",
            event.type
          );
      }

      return res.json({
        received: true,
      });
    } catch (error) {
      console.error(
        "Stripe webhook error:",
        error
      );

      return res.status(400).json({
        error:
          error.message ||
          "Webhook processing failed",
      });
    }
  }
);

/* ========================================================
   JSON PARSER
   ======================================================== */

app.use(express.json());

/* ========================================================
   HELPERS
   ======================================================== */

function normalizePlan(value) {
  const plan =
    String(value || "")
      .trim()
      .toLowerCase();

  if (
    ["plus", "pro", "ultra"].includes(plan)
  ) {
    return plan;
  }

  return null;
}

function normalizeCurrency(value) {
  const currency =
    String(value || "")
      .trim()
      .toLowerCase();

  if (currency === "ngn") {
    return "ngn";
  }

  if (currency === "usd") {
    return "usd";
  }

  return null;
}

function normalizeCycle(value) {
  const cycle =
    String(value || "")
      .trim()
      .toLowerCase();

  if (cycle === "yearly") {
    return "yearly";
  }

  return "monthly";
}

function getPriceId(
  plan,
  currency,
  billingCycle
) {
  const normalizedPlan =
    normalizePlan(plan);

  const normalizedCurrency =
    normalizeCurrency(currency);

  const normalizedCycle =
    normalizeCycle(billingCycle);

  if (
    !normalizedPlan ||
    !normalizedCurrency
  ) {
    return null;
  }

  return (
    STRIPE_PRICES[
      normalizedPlan
    ]?.[
      normalizedCurrency
    ]?.[
      normalizedCycle
    ] || null
  );
}

function planFromPriceId(priceId) {
  for (
    const plan of Object.keys(
      STRIPE_PRICES
    )
  ) {
    for (
      const currency of ["ngn", "usd"]
    ) {
      for (
        const cycle of [
          "monthly",
          "yearly",
        ]
      ) {
        if (
          STRIPE_PRICES[plan][
            currency
          ][cycle] === priceId
        ) {
          return {
            plan,
            currency,
            billingCycle: cycle,
          };
        }
      }
    }
  }

  return null;
}

function unixToIso(value) {
  if (!value) {
    return null;
  }

  return new Date(
    value * 1000
  ).toISOString();
}

/* ========================================================
   GET AUTH USER
   ======================================================== */

async function getAuthenticatedUser(
  req
) {
  const authorization =
    req.headers.authorization;

  if (
    !authorization ||
    !authorization.startsWith(
      "Bearer "
    )
  ) {
    throw new Error(
      "Missing authentication token"
    );
  }

  const token =
    authorization.substring(7);

  const {
    data,
    error,
  } =
    await supabaseAdmin.auth.getUser(
      token
    );

  if (error || !data?.user) {
    throw new Error(
      "Invalid authentication token"
    );
  }

  return data.user;
}

/* ========================================================
   UPSERT SUBSCRIPTION
   ======================================================== */

async function upsertSubscription(
  values
) {
  const {
    data,
    error,
  } =
    await supabaseAdmin
      .from("subscriptions")
      .upsert(
        values,
        {
          onConflict:
            "user_id",
        }
      )
      .select()
      .single();

  if (error) {
    console.error(
      "Supabase subscription error:",
      error
    );

    throw error;
  }

  return data;
}

/* ========================================================
   CHECKOUT COMPLETED
   ======================================================== */

async function handleCheckoutCompleted(
  session
) {
  const userId =
    session.metadata?.user_id ||
    session.client_reference_id;

  if (!userId) {
    console.error(
      "Checkout has no HEXA user ID:",
      session.id
    );

    return;
  }

  const subscriptionId =
    session.subscription;

  const customerId =
    session.customer;

  if (!subscriptionId) {
    console.log(
      "Checkout has no subscription yet:",
      session.id
    );

    return;
  }

  const subscription =
    await stripe.subscriptions.retrieve(
      subscriptionId
    );

  await syncStripeSubscription(
    subscription,
    {
      forcedUserId: userId,
      forcedCustomerId:
        customerId,
    }
  );
}

/* ========================================================
   SYNC STRIPE SUBSCRIPTION
   ======================================================== */

async function syncStripeSubscription(
  subscription,
  options = {}
) {
  const price =
    subscription.items?.data?.[0]
      ?.price;

  const priceId =
    price?.id;

  const mapped =
    planFromPriceId(
      priceId
    );

  const userId =
    options.forcedUserId ||
    subscription.metadata?.user_id;

  const customerId =
    options.forcedCustomerId ||
    subscription.customer;

  if (!userId) {
    console.error(
      "Cannot sync subscription: missing user_id",
      subscription.id
    );

    return;
  }

  if (!mapped) {
    console.error(
      "Unknown HEXA Stripe Price ID:",
      priceId
    );

    return;
  }

  const planLimits =
    PLAN_LIMITS[
      mapped.plan
    ];

  const status =
    subscription.status;

  const isActive =
    [
      "active",
      "trialing",
    ].includes(status);

  const values = {
    user_id: userId,

    stripe_customer_id:
      customerId
        ? String(customerId)
        : null,

    stripe_subscription_id:
      subscription.id,

    plan:
      isActive
        ? mapped.plan
        : "free",

    currency:
      mapped.currency,

    billing_cycle:
      mapped.billingCycle,

    status:
      status,

    current_period_start:
      unixToIso(
        subscription.current_period_start
      ),

    current_period_end:
      unixToIso(
        subscription.current_period_end
      ),

    cancel_at_period_end:
      Boolean(
        subscription.cancel_at_period_end
      ),

    kora_monthly_credits:
      isActive
        ? planLimits.koraCredits
        : PLAN_LIMITS.free.koraCredits,

    kora_used_credits:
      0,

    storage_gb:
      isActive
        ? planLimits.storageGb
        : PLAN_LIMITS.free.storageGb,

    updated_at:
      new Date().toISOString(),
  };

  await upsertSubscription(
    values
  );

  console.log(
    `HEXA subscription synced: ${userId} → ${mapped.plan} ${mapped.currency} ${mapped.billingCycle}`
  );
}

/* ========================================================
   MARK CANCELED
   ======================================================== */

async function markSubscriptionCanceled(
  subscription
) {
  const userId =
    subscription.metadata?.user_id;

  if (!userId) {
    console.error(
      "Canceled subscription has no user_id:",
      subscription.id
    );

    return;
  }

  await upsertSubscription({
    user_id: userId,

    stripe_customer_id:
      subscription.customer
        ? String(
            subscription.customer
          )
        : null,

    stripe_subscription_id:
      subscription.id,

    plan: "free",

    status: "canceled",

    currency:
      null,

    billing_cycle:
      null,

    current_period_start:
      unixToIso(
        subscription.current_period_start
      ),

    current_period_end:
      unixToIso(
        subscription.current_period_end
      ),

    cancel_at_period_end:
      false,

    kora_monthly_credits:
      PLAN_LIMITS.free.koraCredits,

    kora_used_credits:
      0,

    storage_gb:
      PLAN_LIMITS.free.storageGb,

    updated_at:
      new Date().toISOString(),
  });

  console.log(
    `HEXA subscription canceled: ${userId}`
  );
}

/* ========================================================
   INVOICE PAID
   ======================================================== */

async function handleInvoicePaid(
  invoice
) {
  const subscriptionId =
    invoice.subscription;

  if (!subscriptionId) {
    return;
  }

  const subscription =
    await stripe.subscriptions.retrieve(
      subscriptionId
    );

  await syncStripeSubscription(
    subscription
  );
}

/* ========================================================
   INVOICE PAYMENT FAILED
   ======================================================== */

async function handleInvoiceFailed(
  invoice
) {
  const subscriptionId =
    invoice.subscription;

  if (!subscriptionId) {
    return;
  }

  console.warn(
    "HEXA Stripe payment failed:",
    subscriptionId
  );

  const subscription =
    await stripe.subscriptions.retrieve(
      subscriptionId
    );

  const userId =
    subscription.metadata?.user_id;

  if (!userId) {
    return;
  }

  await supabaseAdmin
    .from("subscriptions")
    .update({
      status:
        "past_due",

      updated_at:
        new Date().toISOString(),
    })
    .eq(
      "user_id",
      userId
    );
}

/* ========================================================
   HEALTH
   ======================================================== */

app.get(
  "/api/health",
  (req, res) => {
    res.json({
      ok: true,

      service:
        "HEXA billing",

      stripe:
        Boolean(
          STRIPE_SECRET_KEY
        ),

      webhook:
        Boolean(
          STRIPE_WEBHOOK_SECRET
        ),

      supabase:
        Boolean(
          SUPABASE_KEY
        ),

      prices: {
        plus: {
          ngnMonthly:
            Boolean(
              STRIPE_PRICES.plus.ngn
                .monthly
            ),

          ngnYearly:
            Boolean(
              STRIPE_PRICES.plus.ngn
                .yearly
            ),

          usdMonthly:
            Boolean(
              STRIPE_PRICES.plus.usd
                .monthly
            ),

          usdYearly:
            Boolean(
              STRIPE_PRICES.plus.usd
                .yearly
            ),
        },

        pro: {
          ngnMonthly:
            Boolean(
              STRIPE_PRICES.pro.ngn
                .monthly
            ),

          ngnYearly:
            Boolean(
              STRIPE_PRICES.pro.ngn
                .yearly
            ),

          usdMonthly:
            Boolean(
              STRIPE_PRICES.pro.usd
                .monthly
            ),

          usdYearly:
            Boolean(
              STRIPE_PRICES.pro.usd
                .yearly
            ),
        },

        ultra: {
          ngnMonthly:
            Boolean(
              STRIPE_PRICES.ultra.ngn
                .monthly
            ),

          ngnYearly:
            Boolean(
              STRIPE_PRICES.ultra.ngn
                .yearly
            ),

          usdMonthly:
            Boolean(
              STRIPE_PRICES.ultra.usd
                .monthly
            ),

          usdYearly:
            Boolean(
              STRIPE_PRICES.ultra.usd
                .yearly
            ),
        },
      },

      timestamp:
        new Date().toISOString(),
    });
  }
);

/* ========================================================
   ROOT
   ======================================================== */

app.get(
  "/",
  (req, res) => {
    res.json({
      name:
        "HEXA Billing API",

      status:
        "online",
    });
  }
);

/* ========================================================
   CREATE CHECKOUT SESSION
   ======================================================== */

app.post(
  "/api/stripe/create-checkout-session",
  async (req, res) => {
    try {
      const user =
        await getAuthenticatedUser(
          req
        );

      const {
        plan,
        currency,
        billingCycle,
      } = req.body;

      const normalizedPlan =
        normalizePlan(plan);

      const normalizedCurrency =
        normalizeCurrency(
          currency
        );

      const normalizedCycle =
        normalizeCycle(
          billingCycle
        );

      if (!normalizedPlan) {
        return res.status(400).json({
          error:
            "Invalid plan.",
        });
      }

      if (!normalizedCurrency) {
        return res.status(400).json({
          error:
            "Currency must be NGN or USD.",
        });
      }

      const priceId =
        getPriceId(
          normalizedPlan,
          normalizedCurrency,
          normalizedCycle
        );

      if (!priceId) {
        return res.status(400).json({
          error:
            "Stripe price is not configured.",
        });
      }

      /* -----------------------------------------------
         Prevent duplicate active subscriptions
         ----------------------------------------------- */

      const {
        data:
          existingSubscription,
      } =
        await supabaseAdmin
          .from("subscriptions")
          .select("*")
          .eq(
            "user_id",
            user.id
          )
          .maybeSingle();

      if (
        existingSubscription &&
        [
          "active",
          "trialing",
        ].includes(
          existingSubscription.status
        )
      ) {
        return res.status(409).json({
          error:
            "You already have an active HEXA subscription.",
          currentPlan:
            existingSubscription.plan,
        });
      }

      /* -----------------------------------------------
         Reuse Stripe customer
         ----------------------------------------------- */

      let customerId =
        existingSubscription
          ?.stripe_customer_id;

      if (!customerId) {
        const customer =
          await stripe.customers.create(
            {
              email:
                user.email ||
                undefined,

              metadata: {
                user_id:
                  user.id,
              },
            }
          );

        customerId =
          customer.id;
      }

      /* -----------------------------------------------
         Checkout
         ----------------------------------------------- */

      const session =
        await stripe.checkout.sessions.create(
          {
            mode:
              "subscription",

            customer:
              customerId,

            line_items: [
              {
                price:
                  priceId,

                quantity:
                  1,
              },
            ],

            client_reference_id:
              user.id,

            metadata: {
              user_id:
                user.id,

              plan:
                normalizedPlan,

              currency:
                normalizedCurrency,

              billingCycle:
                normalizedCycle,
            },

            subscription_data: {
              metadata: {
                user_id:
                  user.id,

                plan:
                  normalizedPlan,

                currency:
                  normalizedCurrency,

                billingCycle:
                  normalizedCycle,
              },
            },

            success_url:
              `${FRONTEND_URL}/?subscription=success`,

            cancel_url:
              `${FRONTEND_URL}/?subscription=canceled`,

            allow_promotion_codes:
              true,
          }
        );

      return res.json({
        ok: true,

        url:
          session.url,

        sessionId:
          session.id,

        plan:
          normalizedPlan,

        currency:
          normalizedCurrency,

        billingCycle:
          normalizedCycle,
      });
    } catch (error) {
      console.error(
        "Checkout error:",
        error
      );

      return res.status(500).json({
        error:
          error.message ||
          "Unable to create checkout session.",
      });
    }
  }
);

/* ========================================================
   GET SUBSCRIPTION
   ======================================================== */

app.get(
  "/api/subscription",
  async (req, res) => {
    try {
      const user =
        await getAuthenticatedUser(
          req
        );

      const {
        data,
        error,
      } =
        await supabaseAdmin
          .from("subscriptions")
          .select("*")
          .eq(
            "user_id",
            user.id
          )
          .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) {
        return res.json({
          ok: true,

          subscription: {
            plan:
              "free",

            status:
              "active",

            currency:
              null,

            billing_cycle:
              null,

            kora_monthly_credits:
              PLAN_LIMITS.free
                .koraCredits,

            kora_used_credits:
              0,

            storage_gb:
              PLAN_LIMITS.free
                .storageGb,
          },
        });
      }

      return res.json({
        ok: true,

        subscription:
          data,
      });
    } catch (error) {
      console.error(
        "Subscription lookup error:",
        error
      );

      return res.status(401).json({
        error:
          error.message ||
          "Unable to retrieve subscription.",
      });
    }
  }
);

/* ========================================================
   LEGACY SUBSCRIPTION ROUTE
   Kept for compatibility with older HEXA builds.
   ======================================================== */

app.get(
  "/api/subscription/:userId",
  async (req, res) => {
    try {
      const {
        userId,
      } = req.params;

      if (!userId) {
        return res.status(400).json({
          error:
            "userId is required.",
        });
      }

      const {
        data,
        error,
      } =
        await supabaseAdmin
          .from("subscriptions")
          .select("*")
          .eq(
            "user_id",
            userId
          )
          .maybeSingle();

      if (error) {
        throw error;
      }

      return res.json({
        ok: true,

        subscription:
          data || {
            plan:
              "free",

            status:
              "active",

            kora_monthly_credits:
              PLAN_LIMITS.free
                .koraCredits,

            kora_used_credits:
              0,

            storage_gb:
              PLAN_LIMITS.free
                .storageGb,
          },
      });
    } catch (error) {
      console.error(
        "Legacy subscription error:",
        error
      );

      return res.status(500).json({
        error:
          error.message ||
          "Unable to retrieve subscription.",
      });
    }
  }
);

/* ========================================================
   404
   ======================================================== */

app.use(
  (req, res) => {
    res.status(404).json({
      error:
        "Route not found",

      path:
        req.path,
    });
  }
);

/* ========================================================
   ERROR HANDLER
   ======================================================== */

app.use(
  (
    error,
    req,
    res,
    next
  ) => {
    console.error(
      "Unhandled server error:",
      error
    );

    if (res.headersSent) {
      return next(error);
    }

    res.status(500).json({
      error:
        "Internal Server Error",
    });
  }
);

/* ========================================================
   START
   ======================================================== */

app.listen(
  PORT,
  "0.0.0.0",
  () => {
    console.log(
      "======================================"
    );

    console.log(
      `HEXA billing server running on port ${PORT}`
    );

    console.log(
      `Frontend: ${FRONTEND_URL}`
    );

    console.log(
      "======================================"
    );
  }
);
