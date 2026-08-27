
import "dotenv/config";

import express from "express";
import cors from "cors";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const app = express();
const PORT = process.env.PORT || 4242;

// =========================================================
// ENVIRONMENT
// =========================================================

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL;

const SUPABASE_KEY =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY;

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

const STRIPE_WEBHOOK_SECRET =
  process.env.STRIPE_WEBHOOK_SECRET;

const FRONTEND_URL =
  process.env.FRONTEND_URL ||
  "http://localhost:5173";

// =========================================================
// VALIDATION
// =========================================================

if (!SUPABASE_URL) {
  throw new Error(
    "Missing Supabase URL. Add SUPABASE_URL or VITE_SUPABASE_URL to .env"
  );
}

if (!SUPABASE_KEY) {
  throw new Error(
    "Missing Supabase server key. Add SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY to .env"
  );
}

if (!STRIPE_SECRET_KEY) {
  throw new Error(
    "Missing STRIPE_SECRET_KEY in .env"
  );
}

// =========================================================
// CLIENTS
// =========================================================

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

// =========================================================
// ENV CHECK
// =========================================================

console.log("");
console.log("======================================");
console.log("HEXA BILLING ENVIRONMENT");
console.log("======================================");
console.log("Supabase URL:", Boolean(SUPABASE_URL));
console.log("Supabase server key:", Boolean(SUPABASE_KEY));
console.log("Stripe secret key:", Boolean(STRIPE_SECRET_KEY));
console.log(
  "Stripe webhook secret:",
  Boolean(STRIPE_WEBHOOK_SECRET)
);
console.log("======================================");
console.log("");

// =========================================================
// CORS
// =========================================================

app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true,
  })
);

// =========================================================
// STRIPE WEBHOOK
//
// IMPORTANT:
// Stripe webhook must receive the RAW request body.
// This route must come BEFORE express.json().
// =========================================================

app.post(
  "/api/stripe/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    if (!STRIPE_WEBHOOK_SECRET) {
      console.error(
        "STRIPE_WEBHOOK_SECRET is missing."
      );

      return res.status(500).json({
        error: "Stripe webhook secret is not configured",
      });
    }

    const signature =
      req.headers["stripe-signature"];

    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        signature,
        STRIPE_WEBHOOK_SECRET
      );
    } catch (error) {
      console.error(
        "Stripe webhook signature verification failed:",
        error.message
      );

      return res.status(400).send(
        `Webhook Error: ${error.message}`
      );
    }

    try {
      console.log(
        "Stripe event:",
        event.type
      );

      // -----------------------------------------------------
      // CHECKOUT COMPLETED
      // -----------------------------------------------------

      if (
        event.type ===
        "checkout.session.completed"
      ) {
        const session = event.data.object;

        const userId =
          session.metadata?.user_id;

        const subscriptionId =
          session.subscription;

        const customerId =
          session.customer;

        if (!userId) {
          console.warn(
            "Checkout completed without user_id metadata."
          );
        } else if (subscriptionId) {
          const subscription =
            await stripe.subscriptions.retrieve(
              subscriptionId
            );

          await syncSubscription(
            subscription,
            userId,
            customerId
          );
        }
      }

      // -----------------------------------------------------
      // SUBSCRIPTION CREATED / UPDATED
      // -----------------------------------------------------

      if (
        event.type ===
          "customer.subscription.created" ||
        event.type ===
          "customer.subscription.updated"
      ) {
        const subscription =
          event.data.object;

        let userId =
          subscription.metadata?.user_id;

        const customerId =
          subscription.customer;

        // If metadata is missing, try finding
        // the subscription using Stripe customer ID.
        if (!userId && customerId) {
          const { data } =
            await supabaseAdmin
              .from("subscriptions")
              .select("user_id")
              .eq(
                "stripe_customer_id",
                customerId
              )
              .maybeSingle();

          userId = data?.user_id;
        }

        if (userId) {
          await syncSubscription(
            subscription,
            userId,
            customerId
          );
        } else {
          console.warn(
            "Could not determine HEXA user for subscription:",
            subscription.id
          );
        }
      }

      // -----------------------------------------------------
      // SUBSCRIPTION DELETED
      // -----------------------------------------------------

      if (
        event.type ===
        "customer.subscription.deleted"
      ) {
        const subscription =
          event.data.object;

        const customerId =
          subscription.customer;

        const { data } =
          await supabaseAdmin
            .from("subscriptions")
            .select("user_id")
            .eq(
              "stripe_customer_id",
              customerId
            )
            .maybeSingle();

        if (data?.user_id) {
          await supabaseAdmin
            .from("subscriptions")
            .update({
              plan: "free",
              status: "canceled",
              stripe_subscription_id: null,
              stripe_price_id: null,
              current_period_start: null,
              current_period_end: null,
              cancel_at_period_end: false,
              kora_monthly_credits: 500,
              kora_used_credits: 0,
              updated_at: new Date().toISOString(),
            })
            .eq(
              "user_id",
              data.user_id
            );
        }
      }

      // -----------------------------------------------------
      // INVOICE PAYMENT FAILED
      // -----------------------------------------------------

      if (
        event.type ===
        "invoice.payment_failed"
      ) {
        const invoice =
          event.data.object;

        const customerId =
          invoice.customer;

        await supabaseAdmin
          .from("subscriptions")
          .update({
            status: "past_due",
            updated_at:
              new Date().toISOString(),
          })
          .eq(
            "stripe_customer_id",
            customerId
          );
      }

      return res.json({});
    } catch (error) {
      console.error(
        "Error handling Stripe webhook:",
        error
      );
      return res.status(500).json({ error: "Internal Server Error" });
    }})
    app.listen(PORT, "0.0.0.0", () => {
  console.log(
    `HEXA billing server running on port ${PORT}`
  );
});