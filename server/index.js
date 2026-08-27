
import "dotenv/config";
import express from "express";
import cors from "cors";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

/* =========================================================
   HEXA BILLING SERVER
   Render + Stripe + Supabase
   ========================================================= */

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

/* =========================================================
   ENVIRONMENT CHECK
   ========================================================= */

console.log("======================================");
console.log("HEXA BILLING ENVIRONMENT");
console.log("======================================");
console.log("Supabase URL:", Boolean(SUPABASE_URL));
console.log("Supabase server key:", Boolean(SUPABASE_KEY));
console.log("Stripe secret key:", Boolean(STRIPE_SECRET_KEY));
console.log("Stripe webhook secret:", Boolean(STRIPE_WEBHOOK_SECRET));
console.log("Plus price:", Boolean(PLUS_PRICE_ID));
console.log("Pro price:", Boolean(PRO_PRICE_ID));
console.log("Ultra price:", Boolean(ULTRA_PRICE_ID));
console.log("======================================");

/* =========================================================
   VALIDATION
   ========================================================= */

if (!SUPABASE_URL) {
  throw new Error(
    "Missing Supabase URL. Add SUPABASE_URL or VITE_SUPABASE_URL."
  );
}

if (!SUPABASE_KEY) {
  throw new Error(
    "Missing Supabase server key. Add SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY."
  );
}

if (!STRIPE_SECRET_KEY) {
  throw new Error(
    "Missing STRIPE_SECRET_KEY."
  );
}

/* =========================================================
   CLIENTS
   ========================================================= */

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

/* =========================================================
   CORS
   ========================================================= */

app.use(
  cors({
    origin: [
      FRONTEND_URL,
      "http://localhost:5173",
      "http://localhost:4173",
    ],
    methods: [
      "GET",
      "POST",
      "OPTIONS",
    ],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Stripe-Signature",
    ],
  })
);