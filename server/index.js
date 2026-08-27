import "dotenv/config";
import express from "express";
import cors from "cors";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const app = express();

const PORT = process.env.PORT || 4242;

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL;

const SUPABASE_KEY =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY;

const STRIPE_SECRET_KEY =
  process.env.STRIPE_SECRET_KEY;

const STRIPE_WEBHOOK_SECRET =
  process.env.STRIPE_WEBHOOK_SECRET;

const FRONTEND_URL =
  process.env.FRONTEND_URL ||
  "https://hexa-nfdjqsjh6-hexa24.vercel.app";

const PLUS_PRICE_ID =
  process.env.STRIPE_PLUS_PRICE_ID;

const PRO_PRICE_ID =
  process.env.STRIPE_PRO_PRICE_ID;

const ULTRA_PRICE_ID =
  process.env.STRIPE_ULTRA_PRICE_ID;


/* ========================================================
   ENVIRONMENT CHECK
   ======================================================== */

console.log("======================================");
console.log("HEXA BILLING SERVER");
console.log("======================================");

console.log("Supabase URL:", Boolean(SUPABASE_URL));
console.log("Supabase server key:", Boolean(SUPABASE_KEY));
console.log("Stripe secret key:", Boolean(STRIPE_SECRET_KEY));
console.log(
  "Stripe webhook secret:",
  Boolean(STRIPE_WEBHOOK_SECRET)
);
console.log("Plus price:", Boolean(PLUS_PRICE_ID));
console.log("Pro price:", Boolean(PRO_PRICE_ID));
console.log("Ultra price:", Boolean(ULTRA_PRICE_ID));

console.log("======================================");


/* ========================================================
   VALIDATE ENVIRONMENT
   ======================================================== */

if (!SUPABASE_URL) {
  throw new Error(
    "Missing SUPABASE_URL or VITE_SUPABASE_URL"
  );
}

if (!SUPABASE_KEY) {
  throw new Error(
    "Missing SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY"
  );
}

if (!STRIPE_SECRET_KEY) {
  throw new Error(
    "Missing STRIPE_SECRET_KEY"
  );
}


/* ========================================================
   CLIENTS
   ======================================================== */

const stripe = new Stripe(
  STRIPE_SECRET_KEY
);

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
   IMPORTANT:
   express.raw() MUST come before express.json()
   ======================================================== */

app.post(
  "/api/stripe/webhook",
  express.raw({
    type: "application/json",
  }),
  async (req, res) => {
    try {
      if (!STRIPE_WEBHOOK_SECRET) {
        return res.status(500).json({
          error:
            "STRIPE_WEBHOOK_SECRET is missing",
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
        "Stripe event:",
        event.type
      );

      return res.json({
        received: true,
      });
    } catch (error) {
      console.error(
        "Stripe webhook error:",
        error.message
      );

      return res.status(400).json({
        error:
          error.message,
      });
    }
  }
);


/* ========================================================
   JSON PARSER
   ======================================================== */

app.use(
  express.json()
);


/* ========================================================
   HEALTH CHECK
   ======================================================== */

app.get(
  "/api/health",
  (req, res) => {
    res.json({
      ok: true,
      service: "HEXA billing",
      stripe: Boolean(
        STRIPE_SECRET_KEY
      ),
      supabase: Boolean(
        SUPABASE_KEY
      ),
      prices: {
        plus: Boolean(
          PLUS_PRICE_ID
        ),
        pro: Boolean(
          PRO_PRICE_ID
        ),
        ultra: Boolean(
          ULTRA_PRICE_ID
        ),
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
      name: "HEXA Billing API",
      status: "online",
    });
  }
);


/* ========================================================
   CREATE STRIPE CHECKOUT SESSION
   ======================================================== */

app.post(
  "/api/stripe/create-checkout-session",
  async (req, res) => {
    try {
      const {
        userId,
        email,
        plan,
      } = req.body;

      if (!userId) {
        return res.status(400).json({
          error:
            "userId is required",
        });
      }

      if (!plan) {
        return res.status(400).json({
          error:
            "plan is required",
        });
      }

      const prices = {
        plus: PLUS_PRICE_ID,
        pro: PRO_PRICE_ID,
        ultra: ULTRA_PRICE_ID,
      };

      const priceId =
        prices[plan];

      if (!priceId) {
        return res.status(400).json({
          error:
            "Invalid plan. Use plus, pro, or ultra.",
        });
      }


      /* --------------------------------------------------
         Create Stripe customer
         -------------------------------------------------- */

      const customer =
        await stripe.customers.create({
          email:
            email || undefined,

          metadata: {
            user_id:
              userId,
          },
        });


      /* --------------------------------------------------
         Create Checkout Session
         -------------------------------------------------- */

      const session =
        await stripe.checkout.sessions.create(
          {
            mode:
              "subscription",

            customer:
              customer.id,

            line_items: [
              {
                price:
                  priceId,

                quantity: 1,
              },
            ],

            client_reference_id:
              userId,

            metadata: {
              user_id:
                userId,

              plan:
                plan,
            },

            subscription_data: {
              metadata: {
                user_id:
                  userId,

                plan:
                  plan,
              },
            },

            success_url:
              `${FRONTEND_URL}/?subscription=success`,

            cancel_url:
              `${FRONTEND_URL}/?subscription=canceled`,
          }
        );


      /* --------------------------------------------------
         Return Checkout URL
         -------------------------------------------------- */

      return res.json({
        ok: true,

        url:
          session.url,

        sessionId:
          session.id,
      });
    } catch (error) {
      console.error(
        "Checkout error:",
        error
      );

      return res.status(500).json({
        error:
          error.message ||
          "Unable to create checkout session",
      });
    }
  }
);


/* ========================================================
   GET USER SUBSCRIPTION
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
            "userId is required",
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


      /* --------------------------------------------------
         No subscription = FREE plan
         -------------------------------------------------- */

      if (!data) {
        return res.json({
          ok: true,

          subscription: {
            plan:
              "free",

            status:
              "active",

            provider:
              "hexa",

            kora_monthly_credits:
              100,

            kora_used_credits:
              0,
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

      return res.status(500).json({
        error:
          error.message ||
          "Unable to retrieve subscription",
      });
    }
  }
);


/* ========================================================
   404 HANDLER
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
   GLOBAL ERROR HANDLER
   ======================================================== */

app.use(
  (error, req, res, next) => {
    console.error(
      "Unhandled server error:",
      error
    );

    res.status(500).json({
      error:
        "Internal Server Error",
    });
  }
);


/* ========================================================
   START SERVER
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
