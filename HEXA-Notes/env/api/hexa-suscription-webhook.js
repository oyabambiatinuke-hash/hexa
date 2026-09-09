import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(
  process.env.STRIPE_SECRET_KEY
);

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

function planFromPriceId(priceId) {
  if (
    priceId ===
    process.env.STRIPE_PRICE_PLUS
  ) {
    return "plus";
  }

  if (
    priceId ===
    process.env.STRIPE_PRICE_PRO
  ) {
    return "pro";
  }

  if (
    priceId ===
    process.env.STRIPE_PRICE_ULTRA
  ) {
    return "ultra";
  }

  return null;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  const signature =
    req.headers["stripe-signature"];

  if (!signature) {
    return res.status(400).json({
      error: "Missing Stripe signature.",
    });
  }

  let event;

  try {
    event =
      stripe.webhooks.constructEvent(
        req.body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
  } catch (error) {
    console.error(
      "Stripe webhook verification failed:",
      error
    );

    return res.status(400).send(
      `Webhook Error: ${error.message}`
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;

        const subscriptionId =
          typeof session.subscription ===
          "string"
            ? session.subscription
            : session.subscription?.id;

        const userId =
          session.metadata?.hexaUserId;

        const plan =
          session.metadata?.hexaPlan ||
          "plus";

        if (
          userId &&
          subscriptionId
        ) {
          const subscription =
            await stripe.subscriptions.retrieve(
              subscriptionId
            );

          const item =
            subscription.items?.data?.[0];

          const priceId =
            item?.price?.id;

          const resolvedPlan =
            planFromPriceId(priceId) ||
            plan;

          const { error } =
            await supabase
              .from("subscriptions")
              .upsert(
                {
                  user_id: userId,
                  provider: "stripe",
                  provider_subscription_id:
                    subscription.id,
                  plan: resolvedPlan,
                  status:
                    subscription.status,
                  current_period_start:
                    subscription.current_period_start
                      ? new Date(
                          subscription
                            .current_period_start *
                            1000
                        ).toISOString()
                      : null,
                  current_period_end:
                    subscription.current_period_end
                      ? new Date(
                          subscription
                            .current_period_end *
                            1000
                        ).toISOString()
                      : null,
                },
                {
                  onConflict:
                    "provider_subscription_id",
                }
              );

          if (error) {
            throw error;
          }
        }

        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription =
          event.data.object;

        const status =
          event.type ===
          "customer.subscription.deleted"
            ? "canceled"
            : subscription.status;

        const item =
          subscription.items?.data?.[0];

        const priceId =
          item?.price?.id;

        const plan =
          planFromPriceId(priceId);

        const patch = {
          status,
        };

        if (plan) {
          patch.plan = plan;
        }

        if (
          subscription.current_period_start
        ) {
          patch.current_period_start =
            new Date(
              subscription.current_period_start *
                1000
            ).toISOString();
        }

        if (
          subscription.current_period_end
        ) {
          patch.current_period_end =
            new Date(
              subscription.current_period_end *
                1000
            ).toISOString();
        }

        const { error } =
          await supabase
            .from("subscriptions")
            .update(patch)
            .eq(
              "provider",
              "stripe"
            )
            .eq(
              "provider_subscription_id",
              subscription.id
            );

        if (error) {
          throw error;
        }

        break;
      }

      default:
        break;
    }

    return res.status(200).json({
      received: true,
    });
  } catch (error) {
    console.error(
      "HEXA subscription webhook processing error:",
      error
    );

    return res.status(500).json({
      error:
        error?.message ||
        "Webhook processing failed.",
    });
  }
}