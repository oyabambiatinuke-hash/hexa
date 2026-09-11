// api/hexa-subscription-checkout.js

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  const secret = process.env.STRIPE_SECRET_KEY;

  if (!secret) {
    return res.status(500).json({
      error: "STRIPE_SECRET_KEY is not configured on Vercel.",
    });
  }

  try {
    const {
      plan_id,
      user_id,
      email,
      billing_cycle = "monthly",
      currency = "USD",
    } = req.body || {};

    const plan = String(plan_id || "").toLowerCase();
    const cycle = String(billing_cycle || "monthly").toLowerCase();
    const curr = String(currency || "USD").toUpperCase();

    const allowedPlans = ["plus", "pro", "ultra"];
    const allowedCycles = ["monthly", "yearly"];
    const allowedCurrencies = ["USD", "NGN"];

    if (!allowedPlans.includes(plan)) {
      return res.status(400).json({
        error: "Invalid HEXA subscription plan.",
      });
    }

    if (!allowedCycles.includes(cycle)) {
      return res.status(400).json({
        error: "Invalid billing cycle.",
      });
    }

    if (!allowedCurrencies.includes(curr)) {
      return res.status(400).json({
        error: "Invalid currency.",
      });
    }

    if (!user_id) {
      return res.status(400).json({
        error: "Missing HEXA user ID.",
      });
    }

    /*
      Recommended Vercel environment variables:

      STRIPE_PRICE_HEXA_PLUS_MONTHLY_USD
      STRIPE_PRICE_HEXA_PLUS_YEARLY_USD
      STRIPE_PRICE_HEXA_PLUS_MONTHLY_NGN
      STRIPE_PRICE_HEXA_PLUS_YEARLY_NGN

      STRIPE_PRICE_HEXA_PRO_MONTHLY_USD
      STRIPE_PRICE_HEXA_PRO_YEARLY_USD
      STRIPE_PRICE_HEXA_PRO_MONTHLY_NGN
      STRIPE_PRICE_HEXA_PRO_YEARLY_NGN

      STRIPE_PRICE_HEXA_ULTRA_MONTHLY_USD
      STRIPE_PRICE_HEXA_ULTRA_YEARLY_USD
      STRIPE_PRICE_HEXA_ULTRA_MONTHLY_NGN
      STRIPE_PRICE_HEXA_ULTRA_YEARLY_NGN
    */

    const priceKey =
      `STRIPE_PRICE_HEXA_${plan.toUpperCase()}_${cycle.toUpperCase()}_${curr}`;

    const price = process.env[priceKey];

    /*
      Backward compatibility with your older setup.
      If you have only one price environment variable for a plan,
      this lets that continue working.
    */
    const fallbackPrice =
      process.env[`STRIPE_PRICE_HEXA_${plan.toUpperCase()}`];

    const selectedPrice = price || fallbackPrice;

    if (!selectedPrice) {
      return res.status(500).json({
        error: `Stripe price is not configured for ${plan} ${cycle} ${curr}.`,
        missing_variable: priceKey,
      });
    }

    const origin =
      process.env.PUBLIC_APP_URL ||
      req.headers.origin ||
      "https://hexa-chi.vercel.app";

    /*
      Never trust a browser-supplied redirect domain.
      Restrict production redirects to your known HEXA domain.
    */
    const safeOrigin =
      origin === "https://hexa-chi.vercel.app"
        ? origin
        : process.env.PUBLIC_APP_URL || "https://hexa-chi.vercel.app";

    const body = new URLSearchParams();

    body.set("mode", "subscription");

    body.set("line_items[0][price]", selectedPrice);
    body.set("line_items[0][quantity]", "1");

    body.set(
      "success_url",
      `${safeOrigin}/?subscription=success&session_id={CHECKOUT_SESSION_ID}`
    );

    body.set(
      "cancel_url",
      `${safeOrigin}/?subscription=cancelled`
    );

    body.set("client_reference_id", String(user_id));

    if (email) {
      body.set("customer_email", String(email));
    }

    /*
      Metadata on the Checkout Session.
    */
    body.set("metadata[user_id]", String(user_id));
    body.set("metadata[plan_id]", plan);
    body.set("metadata[billing_cycle]", cycle);
    body.set("metadata[currency]", curr);

    /*
      CRITICAL:
      Copy metadata to the Stripe Subscription so that
      customer.subscription.created / updated / deleted
      events can identify the HEXA account.
    */
    body.set(
      "subscription_data[metadata][user_id]",
      String(user_id)
    );

    body.set(
      "subscription_data[metadata][plan_id]",
      plan
    );

    body.set(
      "subscription_data[metadata][billing_cycle]",
      cycle
    );

    body.set(
      "subscription_data[metadata][currency]",
      curr
    );

    body.set("subscription_data[metadata][app]", "HEXA");

    body.set("allow_promotion_codes", "true");

    const stripeResponse = await fetch(
      "https://api.stripe.com/v1/checkout/sessions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secret}`,
          "Content-Type":
            "application/x-www-form-urlencoded",
        },
        body,
      }
    );

    const data = await stripeResponse.json();

    if (!stripeResponse.ok) {
      return res.status(stripeResponse.status).json({
        error:
          data?.error?.message ||
          "Stripe Checkout could not be created.",
      });
    }

    if (!data?.url) {
      return res.status(500).json({
        error: "Stripe did not return a Checkout URL.",
      });
    }

    return res.status(200).json({
      ok: true,
      url: data.url,
      session_id: data.id,
      plan_id: plan,
      billing_cycle: cycle,
      currency: curr,
    });
  } catch (error) {
    console.error("HEXA Stripe Checkout error:", error);

    return res.status(500).json({
      error:
        error?.message ||
        "Unable to create Stripe Checkout session.",
    });
  }
}