import Stripe from "stripe";

const stripe = new Stripe(
  process.env.STRIPE_SECRET_KEY
);

const PLANS = {
  plus: {
    name: "HEXA Plus",
    priceId: process.env.STRIPE_PRICE_PLUS,
  },
  pro: {
    name: "HEXA Pro",
    priceId: process.env.STRIPE_PRICE_PRO,
  },
  ultra: {
    name: "HEXA Ultra",
    priceId: process.env.STRIPE_PRICE_ULTRA,
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  try {
    const {
      plan,
      userId,
      email,
    } = req.body || {};

    const normalizedPlan =
      String(plan || "").toLowerCase();

    const selectedPlan =
      PLANS[normalizedPlan];

    if (!selectedPlan) {
      return res.status(400).json({
        error: "Invalid HEXA subscription plan.",
      });
    }

    if (!selectedPlan.priceId) {
      return res.status(500).json({
        error:
          `Stripe price is not configured for ${selectedPlan.name}.`,
      });
    }

    const origin =
      req.headers.origin ||
      process.env.APP_URL ||
      "http://localhost:5173";

    const session =
      await stripe.checkout.sessions.create({
        mode: "subscription",

        customer_email:
          email || undefined,

        line_items: [
          {
            price: selectedPlan.priceId,
            quantity: 1,
          },
        ],

        metadata: {
          hexaUserId:
            userId ? String(userId) : "",
          hexaPlan:
            normalizedPlan,
        },

        subscription_data: {
          metadata: {
            hexaUserId:
              userId ? String(userId) : "",
          },
        },

        success_url:
          `${origin}/?subscription=success`,

        cancel_url:
          `${origin}/?subscription=cancelled`,

        allow_promotion_codes: true,
      });

    return res.status(200).json({
      ok: true,
      url: session.url,
      sessionId: session.id,
    });
  } catch (error) {
    console.error(
      "HEXA subscription checkout error:",
      error
    );

    return res.status(500).json({
      error:
        error?.message ||
        "Unable to create checkout session.",
    });
  }
}