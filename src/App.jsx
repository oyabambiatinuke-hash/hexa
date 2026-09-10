import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createClient } from "@supabase/supabase-js";
import "./App.css";

/* ============================================================
   SUPABASE
============================================================ */

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL;

const SUPABASE_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error(
    "HEXA: missing VITE_SUPABASE_URL or Supabase publishable/anon key."
  );
}

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

/* ============================================================
   ENVIRONMENT
============================================================ */

const STORAGE_BUCKET =
  import.meta.env.VITE_SUPABASE_STORAGE_BUCKET ||
  "hexa-media";

const KORA_API_KEY =
  import.meta.env.VITE_KORA_API_KEY || "";

const STRIPE_CHECKOUT_URL =
  import.meta.env.VITE_STRIPE_CHECKOUT_URL || "";

const THEME_KEY = "hexa_theme";
const DRAFT_PREFIX = "hexa_draft_";

/* ============================================================
   CONSUMER PLAN CONFIGURATION
============================================================ */

const HEXA_PLANS = {
  free: {
    id: "free",
    name: "HEXA Free",
    priceNGN: 0,
    priceUSD: 0,
    yearlyNGN: 0,
    yearlyUSD: 0,

    koraMonthlyCredits: 500,

    models: [
      "gpt-5.6-luna",
    ],

    premiumThemes: false,
    webSearch: false,
    fileAnalysis: false,
    advancedReasoning: false,
    priorityKora: false,

    creatorTools: false,
    businessTools: false,
    analytics: false,
    prioritySupport: false,

    advancedCalls: false,
    priorityCalls: false,

    maxAttachmentMB: 25,
    maxStatusMediaMB: 50,
  },

  plus: {
    id: "plus",
    name: "HEXA Plus",
    priceNGN: 3500,
    priceUSD: 2.99,
    yearlyNGN: 33600,
    yearlyUSD: 28.70,

    koraMonthlyCredits: 3000,

    models: [
      "gpt-5.6-luna",
      "gpt-5.6-terra",
    ],

    premiumThemes: true,
    webSearch: false,
    fileAnalysis: true,
    advancedReasoning: true,
    priorityKora: false,

    creatorTools: true,
    businessTools: false,
    analytics: false,
    prioritySupport: false,

    advancedCalls: true,
    priorityCalls: false,

    maxAttachmentMB: 100,
    maxStatusMediaMB: 150,
  },

  pro: {
    id: "pro",
    name: "HEXA Pro",
    priceNGN: 8000,
    priceUSD: 6.99,
    yearlyNGN: 76800,
    yearlyUSD: 67.10,

    koraMonthlyCredits: 10000,

    models: [
      "gpt-5.6-luna",
      "gpt-5.6-terra",
      "gpt-5.6-sol",
    ],

    premiumThemes: true,
    webSearch: true,
    fileAnalysis: true,
    advancedReasoning: true,
    priorityKora: true,

    creatorTools: true,
    businessTools: true,
    analytics: true,
    prioritySupport: true,

    advancedCalls: true,
    priorityCalls: true,

    maxAttachmentMB: 250,
    maxStatusMediaMB: 300,
  },

  ultra: {
    id: "ultra",
    name: "HEXA Ultra",
    priceNGN: 18000,
    priceUSD: 14.99,
    yearlyNGN: 172800,
    yearlyUSD: 143.90,

    koraMonthlyCredits: 30000,

    models: [
      "gpt-5.6-luna",
      "gpt-5.6-terra",
      "gpt-5.6-sol",
      "gpt-6-astra",
    ],

    premiumThemes: true,
    webSearch: true,
    fileAnalysis: true,
    advancedReasoning: true,
    priorityKora: true,

    creatorTools: true,
    businessTools: true,
    analytics: true,
    prioritySupport: true,

    advancedCalls: true,
    priorityCalls: true,

    maxAttachmentMB: 500,
    maxStatusMediaMB: 1000,
  },
};

const PLAN_RANK = {
  free: 0,
  plus: 1,
  pro: 2,
  ultra: 3,
};

/* ============================================================
   THEMES
============================================================ */

const THEMES = [
  {
    id: "midnight",
    name: "Midnight",
    premium: false,
  },
  {
    id: "aurora",
    name: "Aurora",
    premium: true,
  },
  {
    id: "ocean",
    name: "Ocean",
    premium: true,
  },
  {
    id: "emerald",
    name: "Emerald",
    premium: true,
  },
  {
    id: "rose",
    name: "Rose",
    premium: true,
  },
  {
    id: "light",
    name: "Light",
    premium: false,
  },
  {
    id: "black",
    name: "Black",
    premium: true,
  },
];

/* ============================================================
   EMOJI
============================================================ */

const EMOJIS = [
  "😀","😃","😄","😁","😆","😅","😂","🤣",
  "😊","😇","🙂","🙃","😉","😌","😍","🥰",
  "😘","😗","😙","😚","😋","😛","😝","😜",
  "🤪","🤨","🧐","🤓","😎","🤩","🥳","😏",
  "😒","😞","😔","😟","😕","🙁","☹️","😣",
  "😖","😫","😩","🥺","😢","😭","😤","😠",
  "😡","🤬","🤯","😳","🥵","🥶","😱","😨",
  "😰","😥","😓","🤗","🤔","🤭","🤫","🤥",
  "😶","😐","😑","😬","🙄","😯","😦","😧",
  "😮","😲","🥱","😴","🤤","😪","😵","🤐",
  "🥴","🤢","🤮","🤧","😷","🤒","🤕","🤑",
  "🤠","😈","👿","👹","👺","🤡","💩","👻",
  "💀","☠️","👽","👾","🤖","🎃","😺","😸",
  "😹","😻","😼","😽","🙀","😿","😾","❤️",
  "🧡","💛","💚","💙","💜","🖤","🤍","🤎",
  "💔","❣️","💕","💞","💓","💗","💖","💘",
  "💝","💟","👍","👎","👏","🙌","🫶","🙏",
  "🤝","💪","🔥","✨","🎉","🎊","✅","❌",
  "⭐","🌟","💯","🚀","💎","👀","💡","🎯",
  "❤️‍🔥","🥹","🫡","🫠","🫣","🫢","🤭","🫨",
];

/* ============================================================
   DEFAULT CONVERSATIONS
============================================================ */

const DEFAULT_CONVERSATIONS = [
  {
    id: "hexa-group-local",
    name: "HEXA Group",
    type: "group",
    local: true,
    readOnly: true,
    preview: "Official HEXA group",
  },
  {
    id: "you-local",
    name: "YOU",
    type: "direct",
    local: true,
    preview: "Your saved messages",
  },
  {
    id: "kora-local",
    name: "Kora",
    type: "direct",
    local: true,
    preview: "Your HEXA AI assistant",
  },
];

/* ============================================================
   HELPERS
============================================================ */

const isUuid = (value) =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );

const initials = (name = "") =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "H";

const formatTime = (value) => {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatDate = (value) => {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const safeFileName = (name = "file") =>
  name
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_");

const bytesToMB = (bytes) =>
  bytes / 1024 / 1024;

const getErrorMessage = (error) =>
  error?.message ||
  error?.error_description ||
  "Something went wrong.";

const messagePreview = (message) => {
  if (!message) return "";

  switch (message.message_type) {
    case "image":
      return "📷 Photo";
    case "video":
      return "🎬 Video";
    case "voice":
      return "🎤 Voice message";
    case "audio":
      return "🎧 Audio";
    case "file":
      return "📎 File";
    case "gif":
      return "🎞️ GIF";
    case "sticker":
      return "🧩 Sticker";
    case "location":
      return "📍 Location";
    case "contact":
      return "👤 Contact";
    case "poll":
      return "📊 Poll";
    default:
      return message.content || "";
  }
};

/* ============================================================
   PROFILE
============================================================ */

async function ensureHexaProfile(user) {
  if (!user?.id) return null;

  const { data: existing } =
    await supabase
      .from("profiles")
      .select(
        "id,email,created_at,username,full_name,avatar_url,updated_at,display_name,about,phone"
      )
      .eq("id", user.id)
      .maybeSingle();

  if (existing) {
    return existing;
  }

  const email = user.email || "";

  const base =
    email
      .split("@")[0]
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "")
      .slice(0, 24) || "hexauser";

  const username =
    /^[a-z0-9_]{3,30}$/.test(base)
      ? base
      : `hexa_${user.id.slice(0, 8)}`;

  const metadata =
    user.user_metadata || {};

  const fullName =
    metadata.full_name ||
    metadata.name ||
    null;

  const avatar =
    metadata.avatar_url ||
    metadata.picture ||
    null;

  const { data, error } =
    await supabase
      .from("profiles")
      .insert({
        id: user.id,
        email,
        username,
        full_name: fullName,
        avatar_url: avatar,
      })
      .select(
        "id,email,created_at,username,full_name,avatar_url,updated_at,display_name,about,phone"
      )
      .single();

  if (error) {
    const { data: retry } =
      await supabase
        .from("profiles")
        .select(
          "id,email,created_at,username,full_name,avatar_url,updated_at,display_name,about,phone"
        )
        .eq("id", user.id)
        .maybeSingle();

    return retry || null;
  }

  return data;
}

/* ============================================================
   AVATAR
============================================================ */

function Avatar({
  url,
  name,
  size = "md",
  online = false,
}) {
  return (
    <div
      className={`avatar avatar-${size}`}
    >
      {url ? (
        <img
          src={url}
          alt={name || "Avatar"}
        />
      ) : (
        <span>
          {initials(name)}
        </span>
      )}

      {online && (
        <i className="avatar-online-dot" />
      )}
    </div>
  );
}

/* ============================================================
   AUTH
============================================================ */

function AuthScreen() {
  const [mode, setMode] =
    useState("signin");

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [fullName, setFullName] =
    useState("");

  const [notice, setNotice] =
    useState("");

  const [busy, setBusy] =
    useState(false);

  const submit = async (event) => {
    event.preventDefault();

    if (
      !email.trim() ||
      !password
    ) {
      setNotice(
        "Enter your email and password."
      );
      return;
    }

    setBusy(true);
    setNotice("");

    try {
      if (mode === "signup") {
        const { data, error } =
          await supabase.auth.signUp({
            email: email.trim(),
            password,
            options: {
              data: {
                full_name:
                  fullName.trim(),
              },
            },
          });

        if (error) {
          throw error;
        }

        if (!data.session) {
          setNotice(
            "Account created. Check your email if confirmation is enabled."
          );
        }
      } else {
        const { error } =
          await supabase.auth.signInWithPassword(
            {
              email:
                email.trim(),
              password,
            }
          );

        if (error) {
          throw error;
        }
      }
    } catch (error) {
      setNotice(
        getErrorMessage(error)
      );
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setBusy(true);

    try {
      const { error } =
        await supabase.auth.signInWithOAuth(
          {
            provider: "google",
            options: {
              redirectTo:
                window.location.origin,
            },
          }
        );

      if (error) {
        throw error;
      }
    } catch (error) {
      setNotice(
        getErrorMessage(error)
      );
      setBusy(false);
    }
  };

  const resetPassword =
    async () => {
      if (!email.trim()) {
        setNotice(
          "Enter your email address first."
        );
        return;
      }

      try {
        const { error } =
          await supabase.auth.resetPasswordForEmail(
            email.trim(),
            {
              redirectTo:
                window.location.origin,
            }
          );

        if (error) {
          throw error;
        }

        setNotice(
          "Password reset email sent."
        );
      } catch (error) {
        setNotice(
          getErrorMessage(error)
        );
      }
    };

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="auth-logo">
            H
          </div>

          <div>
            <h1>HEXA</h1>
            <p>
              Connect. Communicate. Create.
            </p>
          </div>
        </div>

        <div className="auth-heading">
          <h2>
            {mode === "signin"
              ? "Welcome back"
              : "Create your HEXA account"}
          </h2>

          <p>
            {mode === "signin"
              ? "Sign in and enter HEXA directly."
              : "Create your account and enter HEXA directly."}
          </p>
        </div>

        <form onSubmit={submit}>
          {mode === "signup" && (
            <label className="field">
              <span>
                Full name
              </span>

              <input
                value={fullName}
                onChange={(event) =>
                  setFullName(
                    event.target
                      .value
                  )
                }
                placeholder="Your name"
              />
            </label>
          )}

          <label className="field">
            <span>Email</span>

            <input
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(
                  event.target.value
                )
              }
              placeholder="you@example.com"
            />
          </label>

          <label className="field">
            <span>Password</span>

            <input
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(
                  event.target.value
                )
              }
              placeholder="••••••••"
            />
          </label>

          {notice && (
            <div className="auth-notice">
              {notice}
            </div>
          )}

          <button
            type="submit"
            className="primary-button full-width"
            disabled={busy}
          >
            {busy
              ? "Please wait…"
              : mode === "signin"
                ? "Sign in"
                : "Create account"}
          </button>
        </form>

        <div className="auth-divider">
          <span>or</span>
        </div>

        <button
          type="button"
          className="secondary-button full-width"
          onClick={google}
          disabled={busy}
        >
          Continue with Google
        </button>

        {mode === "signin" && (
          <button
            type="button"
            className="link-button"
            onClick={resetPassword}
          >
            Forgot password?
          </button>
        )}

        <div className="auth-switch">
          <span>
            {mode === "signin"
              ? "Don't have an account?"
              : "Already have an account?"}
          </span>

          <button
            type="button"
            onClick={() =>
              setMode(
                (value) =>
                  value ===
                  "signin"
                    ? "signup"
                    : "signin"
              )
            }
          >
            {mode === "signin"
              ? "Create account"
              : "Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   SIDEBAR
============================================================ */

function Sidebar({
  activePage,
  setActivePage,
  profile,
  online,
  plan,
}) {
  const nav = [
    ["chat", "Chat", "💬"],
    ["status", "Status", "◉"],
    ["groups", "Groups", "👥"],
    [
      "communities",
      "Communities",
      "◎",
    ],
    [
      "channels",
      "Channels",
      "📣",
    ],
    ["calls", "Calls", "☎"],
    ["kora", "Kora", "✦"],
  ];

  return (
    <aside className="hexa-sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-logo">
          H
        </div>

        <span>HEXA</span>
      </div>

      <div className="sidebar-profile">
        <Avatar
          url={profile?.avatar_url}
          name={
            profile?.full_name ||
            profile?.username ||
            "HEXA User"
          }
          size="lg"
          online={online}
        />

        <div className="sidebar-profile-copy">
          <strong>
            {profile?.full_name ||
              profile?.display_name ||
              "HEXA User"}
          </strong>

          <span>
            @{profile?.username ||
              "hexauser"}
          </span>

          <small className="sidebar-plan">
            {HEXA_PLANS[
              plan || "free"
            ]?.name ||
              "HEXA Free"}
          </small>
        </div>
      </div>

      <nav className="sidebar-nav">
        {nav.map(
          ([id, label, icon]) => (
            <button
              key={id}
              className={
                activePage === id
                  ? "sidebar-nav-item active"
                  : "sidebar-nav-item"
              }
              onClick={() =>
                setActivePage(id)
              }
            >
              <span>{icon}</span>
              <span>
                {label}
              </span>
            </button>
          )
        )}
      </nav>

      <div className="sidebar-bottom">
        <button
          className={
            activePage ===
            "settings"
              ? "sidebar-nav-item active"
              : "sidebar-nav-item"
          }
          onClick={() =>
            setActivePage(
              "settings"
            )
          }
        >
          <span>⚙</span>
          <span>Settings</span>
        </button>
      </div>
    </aside>
  );
}

/* ============================================================
   TOPBAR
============================================================ */

function Topbar({
  title,
  subtitle,
  onSignOut,
}) {
  return (
    <header className="hexa-topbar">
      <div>
        <h2>{title}</h2>

        {subtitle && (
          <p>{subtitle}</p>
        )}
      </div>

      <div className="topbar-actions">
        <button
          className="icon-button"
          onClick={onSignOut}
          title="Sign out"
        >
          ↪
        </button>
      </div>
    </header>
  );
}

/* ============================================================
   PRICING
============================================================ */

function PricingPage({
  plan,
  onCheckout,
}) {
  const [interval, setInterval] =
    useState("month");

  return (
    <div className="workspace-page pricing-page">
      <div className="workspace-heading">
        <div>
          <h2>
            Upgrade HEXA
          </h2>

          <p>
            More Kora, larger limits and
            advanced capabilities.
          </p>
        </div>

        <div className="pricing-toggle">
          <button
            className={
              interval === "month"
                ? "active"
                : ""
            }
            onClick={() =>
              setInterval("month")
            }
          >
            Monthly
          </button>

          <button
            className={
              interval === "year"
                ? "active"
                : ""
            }
            onClick={() =>
              setInterval("year")
            }
          >
            Yearly
          </button>
        </div>
      </div>

      <div className="pricing-grid">
        {Object.values(
          HEXA_PLANS
        ).map((item) => {
          const current =
            item.id ===
            plan;

          const price =
            interval === "month"
              ? item.priceNGN
              : item.yearlyNGN;

          const usd =
            interval === "month"
              ? item.priceUSD
              : item.yearlyUSD;

          return (
            <article
              className={
                current
                  ? "pricing-card current"
                  : "pricing-card"
              }
              key={item.id}
            >
              <div className="pricing-card-top">
                <span className="pricing-badge">
                  {item.id ===
                    "ultra" &&
                    "MOST POWERFUL"}

                  {item.id ===
                    "pro" &&
                    "POPULAR"}

                  {item.id ===
                    "plus" &&
                    "STARTER"}

                  {item.id ===
                    "free" &&
                    "FREE"}
                </span>

                <h3>
                  {item.name}
                </h3>

                <div className="pricing-price">
                  {price === 0
                    ? "Free"
                    : `₦${price.toLocaleString()}`}
                </div>

                <small>
                  {price === 0
                    ? "No subscription"
                    : `${interval === "month" ? "per month" : "per year"} · $${usd}`}
                </small>
              </div>

              <div className="pricing-credits">
                <strong>
                  {item.koraMonthlyCredits.toLocaleString()}
                </strong>{" "}
                Kora credits
              </div>

              <div className="pricing-models">
                {item.models.map(
                  (model) => (
                    <span
                      key={model}
                      className="plan-chip"
                    >
                      {model}
                    </span>
                  )
                )}
              </div>

              <div className="pricing-features">
                <span>
                  ✓{" "}
                  {item.maxAttachmentMB}
                  MB attachments
                </span>

                <span>
                  ✓{" "}
                  {item.premiumThemes
                    ? "Premium themes"
                    : "Basic themes"}
                </span>

                <span>
                  ✓{" "}
                  {item.fileAnalysis
                    ? "Kora file analysis"
                    : "Basic Kora"}
                </span>

                <span>
                  ✓{" "}
                  {item.webSearch
                    ? "Kora web search"
                    : "Standard assistance"}
                </span>

                <span>
                  ✓{" "}
                  {item.advancedCalls
                    ? "Advanced calls"
                    : "Basic calls"}
                </span>

                <span>
                  ✓{" "}
                  {item.businessTools
                    ? "Business tools"
                    : "Standard communication"}
                </span>

                <span>
                  ✓{" "}
                  {item.analytics
                    ? "Advanced analytics"
                    : "—"}
                </span>
              </div>

              <button
                className={
                  current
                    ? "secondary-button full-width"
                    : "primary-button full-width"
                }
                disabled={
                  current ||
                  item.id ===
                    "free"
                }
                onClick={() =>
                  onCheckout(
                    item.id,
                    interval
                  )
                }
              >
                {current
                  ? "Current plan"
                  : item.id ===
                      "free"
                    ? "Free"
                    : "Upgrade"}
              </button>
            </article>
          );
        })}
      </div>

      <div className="pricing-note">
        Private HEXA conversations remain
        ad-free. Promotions are reserved
        for eligible Status, Channels and
        business surfaces.
      </div>
    </div>
  );
}

/* ============================================================
   NEW CHAT
============================================================ */

function NewChatModal({
  user,
  onClose,
  onOpenConversation,
}) {
  const [query, setQuery] =
    useState("");

  const [users, setUsers] =
    useState([]);

  const [busy, setBusy] =
    useState(false);

  useEffect(() => {
    let cancelled = false;

    const search = async () => {
      if (!query.trim()) {
        setUsers([]);
        return;
      }

      setBusy(true);

      const {
        data,
        error,
      } = await supabase
        .from("profiles")
        .select(
          "id,email,username,full_name,avatar_url,display_name,about,phone"
        )
        .neq("id", user.id)
        .or(
          `username.ilike.%${query.trim()}%,full_name.ilike.%${query.trim()}%,email.ilike.%${query.trim()}%,phone.ilike.%${query.trim()}%`
        )
        .limit(15);

      if (!cancelled) {
        if (error) {
          console.error(
            "User search:",
            error
          );
        }

        setUsers(data || []);
        setBusy(false);
      }
    };

    const timer =
      setTimeout(
        search,
        250
      );

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, user.id]);

  return (
    <div className="modal-backdrop">
      <div className="modal-card medium-modal">
        <div className="modal-header">
          <div>
            <h3>
              New chat
            </h3>

            <p>
              Search HEXA users.
            </p>
          </div>

          <button
            className="icon-button"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className="modal-body">
          <input
            className="search-input full-width"
            value={query}
            onChange={(event) =>
              setQuery(
                event.target
                  .value
              )
            }
            placeholder="Username, name, email or phone"
            autoFocus
          />

          {busy && (
            <div className="empty-state compact">
              Searching…
            </div>
          )}

          {!busy &&
            query.trim() &&
            users.length === 0 && (
              <div className="empty-state compact">
                No users found.
              </div>
            )}

          <div className="search-user-list">
            {users.map(
              (person) => (
                <button
                  key={
                    person.id
                  }
                  className="search-user-item"
                  onClick={() =>
                    onOpenConversation(
                      person
                    )
                  }
                >
                  <Avatar
                    url={
                      person.avatar_url
                    }
                    name={
                      person.full_name ||
                      person.username
                    }
                  />

                  <span className="search-user-copy">
                    <strong>
                      {person.full_name ||
                        person.username ||
                        "HEXA User"}
                    </strong>

                    <small>
                      @
                      {person.username ||
                        "user"}
                    </small>
                  </span>
                </button>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   CONVERSATIONS
============================================================ */

async function findExistingConversation(
  userId,
  otherUserId
) {
  const { data: mine } =
    await supabase
      .from("conversation_members")
      .select("conversation_id")
      .eq("user_id", userId);

  const mineIds =
    (mine || []).map(
      (row) =>
        row.conversation_id
    );

  if (!mineIds.length) {
    return null;
  }

  const { data: theirs } =
    await supabase
      .from("conversation_members")
      .select("conversation_id")
      .eq(
        "user_id",
        otherUserId
      )
      .in(
        "conversation_id",
        mineIds
      );

  const common =
    (theirs || []).map(
      (row) =>
        row.conversation_id
    );

  if (!common.length) {
    return null;
  }

  const { data } =
    await supabase
      .from("conversations")
      .select("*")
      .in("id", common)
      .eq("type", "direct")
      .order("created_at", {
        ascending: true,
      })
      .limit(1)
      .maybeSingle();

  return data || null;
}

async function getOrCreateDirect(
  userId,
  otherUserId
) {
  const { data, error } =
    await supabase.rpc(
      "hexa_get_or_create_direct",
      {
        p_other_user_id:
          otherUserId,
      }
    );

  if (!error && data) {
    return Array.isArray(data)
      ? data[0]
      : data;
  }

  const existing =
    await findExistingConversation(
      userId,
      otherUserId
    );

  if (existing) {
    return existing;
  }

  const {
    data: conversation,
    error: createError,
  } = await supabase
    .from("conversations")
    .insert({
      type: "direct",
      created_by: userId,
      owner_id: userId,
      user_a: userId,
      user_b: otherUserId,
    })
    .select("*")
    .single();

  if (createError) {
    throw createError;
  }

  await supabase
    .from("conversation_members")
    .insert([
      {
        conversation_id:
          conversation.id,
        user_id:
          userId,
        is_admin: true,
      },
      {
        conversation_id:
          conversation.id,
        user_id:
          otherUserId,
        is_admin: false,
      },
    ]);

  return conversation;
}

async function loadConversations(
  userId
) {
  const { data: memberships } =
    await supabase
      .from("conversation_members")
      .select(
        "conversation_id,is_admin"
      )
      .eq(
        "user_id",
        userId
      );

  const ids =
    [
      ...new Set(
        (memberships || []).map(
          (row) =>
            row.conversation_id
        )
      ),
    ];

  if (!ids.length) {
    return DEFAULT_CONVERSATIONS;
  }

  const {
    data: conversations,
  } = await supabase
    .from("conversations")
    .select("*")
    .in("id", ids)
    .order("updated_at", {
      ascending: false,
    });

  const result = [];

  for (const conversation of
    conversations || []) {
    let name =
      conversation.name ||
      (conversation.type ===
      "group"
        ? "HEXA Group"
        : "Chat");

    let avatar_url =
      conversation.avatar_url ||
      null;

    let other_user_id =
      null;

    if (
      conversation.type ===
      "direct"
    ) {
      const {
        data: members,
      } = await supabase
        .from(
          "conversation_members"
        )
        .select("user_id")
        .eq(
          "conversation_id",
          conversation.id
        );

      other_user_id =
        (members || []).find(
          (member) =>
            member.user_id !==
            userId
        )?.user_id ||
        null;

      if (other_user_id) {
        const {
          data: person,
        } = await supabase
          .from("profiles")
          .select(
            "id,username,full_name,avatar_url,display_name"
          )
          .eq(
            "id",
            other_user_id
          )
          .maybeSingle();

        if (person) {
          name =
            person.full_name ||
            person.display_name ||
            person.username ||
            "HEXA User";

          avatar_url =
            person.avatar_url;
        }
      }
    }

    const {
      data: latest,
    } = await supabase
      .from("messages")
      .select(
        "id,content,message_type,created_at,status,sender_id"
      )
      .eq(
        "conversation_id",
        conversation.id
      )
      .order(
        "created_at",
        {
          ascending: false,
        }
      )
      .limit(1)
      .maybeSingle();

    result.push({
      ...conversation,
      name,
      avatar_url,
      other_user_id,
      preview:
        messagePreview(
          latest
        ),
      latest_message:
        latest,
    });
  }

  return result.length
    ? result
    : DEFAULT_CONVERSATIONS;
}

/* ============================================================
   ATTACHMENT PREVIEW
============================================================ */

function AttachmentPreview({
  items,
  onRemove,
  onClear,
  uploading,
  progress,
  onSend,
}) {
  if (!items.length) {
    return null;
  }

  return (
    <div className="attachment-preview-panel">
      <div className="attachment-preview-header">
        <strong>
          {items.length} attachment
          {items.length ===
          1
            ? ""
            : "s"}
        </strong>

        <button
          type="button"
          className="attachment-preview-close"
          onClick={onClear}
          disabled={uploading}
        >
          ×
        </button>
      </div>

      <div className="attachment-preview-grid">
        {items.map(
          (item) => (
            <div
              className="attachment-preview-item"
              key={item.id}
            >
              {item.type ===
                "image" &&
                item.previewUrl && (
                  <img
                    src={
                      item.previewUrl
                    }
                    alt={
                      item.file.name
                    }
                  />
                )}

              {item.type ===
                "video" &&
                item.previewUrl && (
                  <video
                    src={
                      item.previewUrl
                    }
                    controls
                    playsInline
                  />
                )}

              {item.type !==
                "image" &&
                item.type !==
                  "video" && (
                  <div className="attachment-file-preview">
                    <span>
                      {item.type ===
                      "voice"
                        ? "🎤"
                        : item.type ===
                            "audio"
                          ? "🎧"
                          : "📎"}
                    </span>

                    <strong>
                      {
                        item.file
                          .name
                      }
                    </strong>

                    <small>
                      {bytesToMB(
                        item.file
                          .size
                      ).toFixed(
                        2
                      )}{" "}
                      MB
                    </small>
                  </div>
                )}

              <button
                type="button"
                className="attachment-remove"
                onClick={() =>
                  onRemove(
                    item.id
                  )
                }
                disabled={
                  uploading
                }
              >
                ×
              </button>
            </div>
          )
        )}
      </div>

      {uploading && (
        <div className="attachment-upload-progress">
          <div
            className="attachment-upload-progress-bar"
            style={{
              width: `${progress}%`,
            }}
          />

          <span>
            Uploading{" "}
            {progress}%
          </span>
        </div>
      )}

      {!uploading && (
        <button
          className="primary-button"
          onClick={onSend}
        >
          Send{" "}
          {items.length ===
          1
            ? "attachment"
            : "attachments"}
        </button>
      )}
    </div>
  );
}

/* ============================================================
   LOCATION MODAL
============================================================ */

function LocationModal({
  onClose,
  onSendLocation,
  onStartLiveLocation,
}) {
  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    duration,
    setDuration,
  ] = useState(900);

  const getPosition =
    () =>
      new Promise(
        (resolve, reject) => {
          if (
            !navigator.geolocation
          ) {
            reject(
              new Error(
                "Geolocation is not supported."
              )
            );
            return;
          }

          navigator.geolocation.getCurrentPosition(
            resolve,
            reject,
            {
              enableHighAccuracy:
                true,
              timeout: 15000,
              maximumAge: 0,
            }
          );
        }
      );

  const sendOnce =
    async () => {
      setLoading(true);

      try {
        const position =
          await getPosition();

        await onSendLocation({
          latitude:
            position.coords
              .latitude,
          longitude:
            position.coords
              .longitude,
          accuracy:
            position.coords
              .accuracy,
        });

        onClose();
      } catch (error) {
        alert(
          getErrorMessage(
            error
          )
        );
      } finally {
        setLoading(false);
      }
    };

  const startLive =
    async () => {
      setLoading(true);

      try {
        const position =
          await getPosition();

        await onStartLiveLocation({
          latitude:
            position.coords
              .latitude,
          longitude:
            position.coords
              .longitude,
          accuracy:
            position.coords
              .accuracy,
          durationSeconds:
            duration,
        });

        onClose();
      } catch (error) {
        alert(
          getErrorMessage(
            error
          )
        );
      } finally {
        setLoading(false);
      }
    };

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <div className="modal-header">
          <div>
            <h3>
              Location
            </h3>

            <p>
              Share your position.
            </p>
          </div>

          <button
            className="icon-button"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className="modal-body modal-actions">
          <button
            className="feature-action-card"
            onClick={sendOnce}
            disabled={loading}
          >
            <span>📍</span>

            <div>
              <strong>
                Send current location
              </strong>

              <small>
                Share your location once.
              </small>
            </div>
          </button>

          <div className="live-location-card">
            <div>
              <strong>
                Live location
              </strong>

              <small>
                Share your moving position for
                a selected time.
              </small>
            </div>

            <select
              value={duration}
              onChange={(event) =>
                setDuration(
                  Number(
                    event.target
                      .value
                  )
                )
              }
            >
              <option value={900}>
                15 minutes
              </option>

              <option value={3600}>
                1 hour
              </option>

              <option value={28800}>
                8 hours
              </option>
            </select>

            <button
              className="primary-button"
              onClick={startLive}
              disabled={loading}
            >
              Start live location
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   CONTACT MODAL
============================================================ */

function ContactModal({
  user,
  onClose,
  onSend,
}) {
  const [
    query,
    setQuery,
  ] = useState("");

  const [
    users,
    setUsers,
  ] = useState([]);

  useEffect(() => {
    let cancelled = false;

    const search = async () => {
      if (!query.trim()) {
        setUsers([]);
        return;
      }

      const {
        data,
      } = await supabase
        .from("profiles")
        .select(
          "id,email,username,full_name,avatar_url,phone"
        )
        .neq("id", user.id)
        .or(
          `username.ilike.%${query.trim()}%,full_name.ilike.%${query.trim()}%,phone.ilike.%${query.trim()}%`
        )
        .limit(15);

      if (!cancelled) {
        setUsers(data || []);
      }
    };

    const timer =
      setTimeout(
        search,
        250
      );

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, user.id]);

  return (
    <div className="modal-backdrop">
      <div className="modal-card medium-modal">
        <div className="modal-header">
          <div>
            <h3>
              Share contact
            </h3>

            <p>
              Choose a HEXA contact.
            </p>
          </div>

          <button
            className="icon-button"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className="modal-body">
          <input
            className="search-input full-width"
            value={query}
            onChange={(event) =>
              setQuery(
                event.target
                  .value
              )
            }
            placeholder="Search contact"
          />

          <div className="search-user-list">
            {users.map(
              (person) => (
                <button
                  key={
                    person.id
                  }
                  className="search-user-item"
                  onClick={() => {
                    onSend(
                      person
                    );
                    onClose();
                  }}
                >
                  <Avatar
                    url={
                      person.avatar_url
                    }
                    name={
                      person.full_name ||
                      person.username
                    }
                  />

                  <span className="search-user-copy">
                    <strong>
                      {person.full_name ||
                        person.username ||
                        "HEXA User"}
                    </strong>

                    <small>
                      {person.phone ||
                        `@${person.username || "user"}`}
                    </small>
                  </span>
                </button>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   POLL MODAL
============================================================ */

function PollModal({
  onClose,
  onCreate,
}) {
  const [
    question,
    setQuestion,
  ] = useState("");

  const [
    options,
    setOptions,
  ] = useState([
    "",
    "",
  ]);

  const [
    allowMultiple,
    setAllowMultiple,
  ] = useState(false);

  const [
    allowChangeVote,
    setAllowChangeVote,
  ] = useState(true);

  const [
    busy,
    setBusy,
  ] = useState(false);

  const updateOption =
    (index, value) => {
      setOptions(
        (current) =>
          current.map(
            (
              option,
              optionIndex
            ) =>
              optionIndex ===
              index
                ? value
                : option
          )
      );
    };

  const addOption =
    () => {
      if (
        options.length >= 12
      )
        return;

      setOptions(
        (current) => [
          ...current,
          "",
        ]
      );
    };

  const removeOption =
    (index) => {
      if (
        options.length <= 2
      )
        return;

      setOptions(
        (current) =>
          current.filter(
            (
              _,
              itemIndex
            ) =>
              itemIndex !==
              index
          )
      );
    };

  const submit =
    async () => {
      const cleaned =
        options
          .map((item) =>
            item.trim()
          )
          .filter(Boolean);

      if (!question.trim()) {
        alert(
          "Poll question is required."
        );
        return;
      }

      if (
        cleaned.length <
        2
      ) {
        alert(
          "A poll needs at least two options."
        );
        return;
      }

      setBusy(true);

      try {
        await onCreate({
          question:
            question.trim(),
          options:
            cleaned,
          allowMultiple,
          allowChangeVote,
        });

        onClose();
      } catch (error) {
        alert(
          getErrorMessage(
            error
          )
        );
      } finally {
        setBusy(false);
      }
    };

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <div className="modal-header">
          <div>
            <h3>
              Create poll
            </h3>

            <p>
              Ask your chat a question.
            </p>
          </div>

          <button
            className="icon-button"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className="modal-body">
          <label className="field">
            <span>
              Question
            </span>

            <input
              value={question}
              onChange={(event) =>
                setQuestion(
                  event.target
                    .value
                )
              }
              placeholder="What should we choose?"
            />
          </label>

          <div className="poll-option-editor">
            {options.map(
              (
                option,
                index
              ) => (
                <div
                  className="poll-option-row"
                  key={index}
                >
                  <input
                    value={option}
                    onChange={(
                      event
                    ) =>
                      updateOption(
                        index,
                        event.target
                          .value
                      )
                    }
                    placeholder={`Option ${index + 1}`}
                  />

                  {options.length >
                    2 && (
                    <button
                      className="icon-button"
                      onClick={() =>
                        removeOption(
                          index
                        )
                      }
                    >
                      ×
                    </button>
                  )}
                </div>
              )
            )}
          </div>

          <button
            className="secondary-button"
            onClick={addOption}
            disabled={
              options.length >=
              12
            }
          >
            + Add option
          </button>

          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={
                allowMultiple
              }
              onChange={(
                event
              ) =>
                setAllowMultiple(
                  event.target
                    .checked
                )
              }
            />
            <span>
              Allow multiple answers
            </span>
          </label>

          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={
                allowChangeVote
              }
              onChange={(
                event
              ) =>
                setAllowChangeVote(
                  event.target
                    .checked
                )
              }
            />
            <span>
              Allow changing vote
            </span>
          </label>

          <button
            className="primary-button full-width"
            onClick={submit}
            disabled={busy}
          >
            {busy
              ? "Creating…"
              : "Create poll"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   POLL MESSAGE
============================================================ */

function PollMessage({
  message,
}) {
  const [
    poll,
    setPoll,
  ] = useState(null);

  const [
    counts,
    setCounts,
  ] = useState([]);

  const [
    selected,
    setSelected,
  ] = useState(null);

  const [
    busy,
    setBusy,
  ] = useState(false);

  const load =
    useCallback(
      async () => {
        const {
          data: pollData,
        } = await supabase
          .from(
            "message_polls"
          )
          .select("*")
          .eq(
            "message_id",
            message.id
          )
          .maybeSingle();

        if (!pollData) {
          return;
        }

        setPoll(pollData);

        const {
          data: results,
        } =
          await supabase.rpc(
            "hexa_poll_counts",
            {
              p_poll_id:
                pollData.id,
            }
          );

        setCounts(
          results || []
        );

        const mine =
          (results || []).find(
            (row) =>
              row.voted_by_me
          );

        setSelected(
          mine?.option_id ||
            null
        );
      },
      [message.id]
    );

  useEffect(() => {
    load();
  }, [load]);

  const vote = async (
    optionId
  ) => {
    if (
      !poll ||
      busy
    )
      return;

    setBusy(true);

    try {
      const {
        error,
      } = await supabase.rpc(
        "hexa_vote_poll",
        {
          p_poll_id:
            poll.id,
          p_option_id:
            optionId,
        }
      );

      if (error) {
        throw error;
      }

      setSelected(
        optionId
      );

      const {
        data,
      } = await supabase.rpc(
        "hexa_poll_counts",
        {
          p_poll_id:
            poll.id,
        }
      );

      setCounts(
        data || []
      );
    } catch (error) {
      alert(
        getErrorMessage(
          error
        )
      );
    } finally {
      setBusy(false);
    }
  };

  const totalVotes =
    counts.reduce(
      (
        total,
        row
      ) =>
        total +
        Number(
          row.vote_count ||
            0
        ),
      0
    );

  return (
    <div className="poll-message">
      <div className="poll-question">
        {poll?.question ||
          message.content}
      </div>

      <div className="poll-options">
        {counts.map(
          (option) => {
            const votes =
              Number(
                option.vote_count ||
                  0
              );

            const percent =
              totalVotes
                ? Math.round(
                    (votes /
                      totalVotes) *
                      100
                  )
                : 0;

            return (
              <button
                key={
                  option.option_id
                }
                className={
                  option.option_id ===
                  selected
                    ? "poll-option selected"
                    : "poll-option"
                }
                disabled={busy}
                onClick={() =>
                  vote(
                    option.option_id
                  )
                }
              >
                <span className="poll-option-main">
                  <span className="poll-radio">
                    {option.option_id ===
                    selected
                      ? "●"
                      : "○"}
                  </span>

                  <span>
                    {
                      option.option_text
                    }
                  </span>
                </span>

                <span className="poll-option-results">
                  <span
                    className="poll-option-bar"
                    style={{
                      width: `${percent}%`,
                    }}
                  />

                  <b>
                    {percent}%
                  </b>
                </span>
              </button>
            );
          }
        )}
      </div>

      <small className="poll-total">
        {totalVotes} vote
        {totalVotes ===
        1
          ? ""
          : "s"}
      </small>
    </div>
  );
}

/* ============================================================
   MESSAGE MEDIA
============================================================ */

function MessageMedia({
  message,
}) {
  const metadata =
    message?.metadata || {};

  const attachment =
    message
      ?.message_attachments?.[0];

  const fileUrl =
    metadata.file_url ||
    attachment?.file_url ||
    null;

  if (
    message?.message_type ===
    "location"
  ) {
    const latitude =
      Number(
        metadata.latitude
      );

    const longitude =
      Number(
        metadata.longitude
      );

    if (
      !Number.isFinite(
        latitude
      ) ||
      !Number.isFinite(
        longitude
      )
    ) {
      return null;
    }

    const mapUrl =
      `https://www.google.com/maps?q=${latitude},${longitude}`;

    return (
      <a
        className="message-location-card"
        href={mapUrl}
        target="_blank"
        rel="noreferrer"
      >
        <div className="message-location-map">
          📍
        </div>

        <div>
          <strong>
            {metadata.live_location
              ? "Live location"
              : "Location"}
          </strong>

          <small>
            {latitude.toFixed(
              5
            )}
            ,{" "}
            {longitude.toFixed(
              5
            )}
          </small>

          <span>
            Open map →
          </span>
        </div>
      </a>
    );
  }

  if (
    message?.message_type ===
    "contact"
  ) {
    return (
      <div className="message-contact-card">
        <Avatar
          url={
            metadata.avatar_url
          }
          name={
            metadata.name
          }
        />

        <div>
          <strong>
            {metadata.name ||
              "Shared contact"}
          </strong>

          <small>
            {metadata.phone ||
              "No phone number"}
          </small>
        </div>
      </div>
    );
  }

  if (
    message?.message_type ===
    "sticker"
  ) {
    const stickerUrl =
      metadata.sticker_url ||
      fileUrl;

    return stickerUrl ? (
      <img
        className="message-sticker"
        src={stickerUrl}
        alt="Sticker"
      />
    ) : null;
  }

  if (!fileUrl) {
    return null;
  }

  if (
    message?.message_type ===
    "image"
  ) {
    return (
      <a
        href={fileUrl}
        target="_blank"
        rel="noreferrer"
        className="message-image-wrap"
      >
        <img
          src={fileUrl}
          alt={
            metadata.file_name ||
            "Image"
          }
          className="message-image"
          loading="lazy"
        />
      </a>
    );
  }

  if (
    message?.message_type ===
    "video"
  ) {
    return (
      <video
        src={fileUrl}
        className="message-video"
        controls
        playsInline
        preload="metadata"
      />
    );
  }

  if (
    message?.message_type ===
      "audio" ||
    message?.message_type ===
      "voice"
  ) {
    return (
      <div className="message-audio">
        <div className="message-audio-icon">
          {message.message_type ===
          "voice"
            ? "🎤"
            : "🎧"}
        </div>

        <div className="message-audio-body">
          <audio
            src={fileUrl}
            controls
            preload="metadata"
          />

          {metadata.duration && (
            <small>
              {Number(
                metadata.duration
              ).toFixed(
                0
              )}
              s
            </small>
          )}
        </div>
      </div>
    );
  }

  if (
    message?.message_type ===
    "gif"
  ) {
    return (
      <img
        src={fileUrl}
        alt="GIF"
        className="message-gif"
      />
    );
  }

  return (
    <a
      className="message-file-card"
      href={fileUrl}
      target="_blank"
      rel="noreferrer"
      download={
        metadata.file_name ||
        true
      }
    >
      <span className="message-file-icon">
        📎
      </span>

      <span className="message-file-info">
        <strong>
          {metadata.file_name ||
            "File"}
        </strong>

        <small>
          {metadata.mime_type ||
            "Attachment"}
        </small>
      </span>

      <span className="message-file-download">
        ↓
      </span>
    </a>
  );
}

/* ============================================================
   MESSAGE MENU
============================================================ */

function MessageMenu({
  message,
  canEdit,
  onCopy,
  onReply,
  onForward,
  onEdit,
  onDeleteEveryone,
  onDeleteForMe,
  onStar,
  onPin,
  onReact,
  onClose,
}) {
  return (
    <div
      className="message-context-menu"
      onClick={(event) =>
        event.stopPropagation()
      }
    >
      <button
        onClick={onReply}
      >
        ↩ Reply
      </button>

      <button
        onClick={onCopy}
      >
        ⧉ Copy
      </button>

      <button
        onClick={onForward}
      >
        ↗ Forward
      </button>

      {canEdit &&
        message.message_type ===
          "text" && (
          <button
            onClick={onEdit}
          >
            ✎ Edit
          </button>
        )}

      <button
        onClick={onStar}
      >
        ★ Star / unstar
      </button>

      <button
        onClick={onPin}
      >
        📌 Pin / unpin
      </button>

      <button
        onClick={onReact}
      >
        🙂 React
      </button>

      {canEdit && (
        <button
          className="danger-text"
          onClick={
            onDeleteEveryone
          }
        >
          🗑 Delete for everyone
        </button>
      )}

      <button
        className="danger-text"
        onClick={onDeleteForMe}
      >
        🗑 Delete for me
      </button>

      <button
        onClick={onClose}
      >
        Close
      </button>
    </div>
  );
}

/* ============================================================
   CHAT PAGE
============================================================ */

function ChatPage({
  user,
  subscription,
  planFeatures,
  onOpenCall,
}) {
  const [conversations, setConversations] =
    useState(
      DEFAULT_CONVERSATIONS
    );

  const [
    activeConversation,
    setActiveConversation,
  ] = useState(null);

  const [
    messages,
    setMessages,
  ] = useState([]);

  const [
    composerText,
    setComposerText,
  ] = useState("");

  const [
    replyTo,
    setReplyTo,
  ] = useState(null);

  const [
    selectedMessage,
    setSelectedMessage,
  ] = useState(null);

  const [
    messageSearch,
    setMessageSearch,
  ] = useState("");

  const [
    showSearch,
    setShowSearch,
  ] = useState(false);

  const [
    showEmoji,
    setShowEmoji,
  ] = useState(false);

  const [
    newChatOpen,
    setNewChatOpen,
  ] = useState(false);

  const [
    locationOpen,
    setLocationOpen,
  ] = useState(false);

  const [
    contactOpen,
    setContactOpen,
  ] = useState(false);

  const [
    pollOpen,
    setPollOpen,
  ] = useState(false);

  const [
    attachmentMenuOpen,
    setAttachmentMenuOpen,
  ] = useState(false);

  const [
    selectedAttachments,
    setSelectedAttachments,
  ] = useState([]);

  const [
    uploadingAttachments,
    setUploadingAttachments,
  ] = useState(false);

  const [
    uploadProgress,
    setUploadProgress,
  ] = useState(0);

  const [
    recording,
    setRecording,
  ] = useState(false);

  const [
    recordingSeconds,
    setRecordingSeconds,
  ] = useState(0);

  const cameraInputRef =
    useRef(null);

  const galleryInputRef =
    useRef(null);

  const fileInputRef =
    useRef(null);

  const mediaRecorderRef =
    useRef(null);

  const recordingStreamRef =
    useRef(null);

  const recordingChunksRef =
    useRef([]);

  const recordingTimerRef =
    useRef(null);

  const messagesEndRef =
    useRef(null);

  const messagesChannelRef =
    useRef(null);

  const typingChannelRef =
    useRef(null);

  const [
    typing,
    setTyping,
  ] = useState(false);

  const [
    otherProfile,
    setOtherProfile,
  ] = useState(null);

  const loadConversationList =
    useCallback(
      async () => {
        const data =
          await loadConversations(
            user.id
          );

        setConversations(
          data
        );
      },
      [user.id]
    );

  const loadMessages =
    useCallback(
      async (
        conversationId
      ) => {
        if (
          !conversationId ||
          !isUuid(conversationId)
        ) {
          setMessages(
            []
          );
          return;
        }

        const {
          data,
          error,
        } = await supabase
          .from("messages")
          .select(
            `
              *,
              message_attachments(*),
              message_reactions(*),
              message_user_actions(*)
            `
          )
          .eq(
            "conversation_id",
            conversationId
          )
          .order(
            "created_at",
            {
              ascending: true,
            }
          );

        if (error) {
          console.error(
            "Message loading:",
            error
          );
          setMessages(
            []
          );
          return;
        }

        const visible =
          (data || []).filter(
            (message) => {
              const actions =
                message.message_user_actions ||
                [];

              const mine =
                actions.find(
                  (
                    action
                  ) =>
                    action.user_id ===
                    user.id
                );

              return !mine?.deleted_for_me;
            }
          );

        setMessages(
          visible
        );

        const unread =
          visible
            .filter(
              (message) =>
                message.sender_id !==
                  user.id &&
                message.status !==
                  "read"
            )
            .map(
              (message) =>
                message.id
            );

        if (
          unread.length
        ) {
          await supabase.rpc(
            "hexa_mark_delivered",
            {
              p_message_ids:
                unread,
            }
          );

          await supabase.rpc(
            "hexa_mark_read",
            {
              p_message_ids:
                unread,
            }
          );
        }
      },
      [user.id]
    );

  useEffect(() => {
    loadConversationList();
  }, [
    loadConversationList,
  ]);

  useEffect(() => {
    if (
      !activeConversation?.id ||
      !isUuid(
        activeConversation.id
      )
    ) {
      setMessages([]);
      return;
    }

    loadMessages(
      activeConversation.id
    );
  }, [
    activeConversation?.id,
    loadMessages,
  ]);

  useEffect(() => {
    if (
      !activeConversation?.id ||
      !isUuid(
        activeConversation.id
      )
    ) {
      return undefined;
    }

    const messageChannel =
      supabase.channel(
        `hexa-chat-${activeConversation.id}`
      );

    messagesChannelRef.current =
      messageChannel;

    messageChannel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${activeConversation.id}`,
      },
      async () => {
        await loadMessages(
          activeConversation.id
        );

        await loadConversationList();
      }
    );

    messageChannel.subscribe();

    const typingChannel =
      supabase.channel(
        `hexa-typing-${activeConversation.id}`,
        {
          config: {
            broadcast: {
              self: false,
            },
          },
        }
      );

    typingChannelRef.current =
      typingChannel;

    typingChannel.on(
      "broadcast",
      {
        event: "typing",
      },
      (payload) => {
        if (
          payload.payload
            ?.user_id ===
          user.id
        ) {
          return;
        }

        const state =
          payload.payload
            ?.state;

        setTyping(
          state ===
            "typing" ||
            state ===
              "recording"
        );

        setTimeout(
          () =>
            setTyping(false),
          3500
        );
      }
    );

    typingChannel.subscribe();

    return () => {
      supabase.removeChannel(
        messageChannel
      );

      supabase.removeChannel(
        typingChannel
      );
    };
  }, [
    activeConversation?.id,
    loadMessages,
    loadConversationList,
    user.id,
  ]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView(
      {
        behavior: "smooth",
      }
    );
  }, [messages]);

  useEffect(() => {
    if (
      !activeConversation?.id
    ) {
      return;
    }

    const saved =
      localStorage.getItem(
        `${DRAFT_PREFIX}${activeConversation.id}`
      );

    setComposerText(
      saved || ""
    );
  }, [
    activeConversation?.id,
  ]);

  useEffect(() => {
    if (
      !activeConversation?.id
    ) {
      return;
    }

    if (
      composerText.trim()
    ) {
      localStorage.setItem(
        `${DRAFT_PREFIX}${activeConversation.id}`,
        composerText
      );
    } else {
      localStorage.removeItem(
        `${DRAFT_PREFIX}${activeConversation.id}`
      );
    }
  }, [
    composerText,
    activeConversation?.id,
  ]);

  useEffect(() => {
    const loadProfile =
      async () => {
        if (
          !activeConversation?.other_user_id
        ) {
          setOtherProfile(
            null
          );
          return;
        }

        const {
          data,
        } = await supabase
          .from("profiles")
          .select(
            "id,email,username,full_name,avatar_url,display_name,about,phone"
          )
          .eq(
            "id",
            activeConversation.other_user_id
          )
          .maybeSingle();

        setOtherProfile(
          data || null
        );
      };

    loadProfile();
  }, [
    activeConversation?.other_user_id,
  ]);

  const sendTyping =
    async (state) => {
      if (
        !typingChannelRef.current
      ) {
        return;
      }

      await typingChannelRef.current.send(
        {
          type: "broadcast",
          event: "typing",
          payload: {
            user_id:
              user.id,
            state,
          },
        }
      );
    };

  const handleTyping =
    (event) => {
      setComposerText(
        event.target.value
      );

      sendTyping(
        "typing"
      ).catch(() => {});
    };

  const getActions =
    async (
      messageId
    ) => {
      const { data } =
        await supabase
          .from(
            "message_user_actions"
          )
          .select("*")
          .eq(
            "message_id",
            messageId
          )
          .eq(
            "user_id",
            user.id
          )
          .maybeSingle();

      return data;
    };

  const messageAction =
    async (
      messageId,
      action,
      enabled
    ) => {
      const {
        error,
      } = await supabase.rpc(
        "hexa_set_message_action",
        {
          p_action:
            action,
          p_enabled:
            enabled,
          p_message_id:
            messageId,
        }
      );

      if (error) {
        alert(
          getErrorMessage(
            error
          )
        );
        return;
      }

      setSelectedMessage(
        null
      );

      await loadMessages(
        activeConversation.id
      );
    };

  const react =
    async (
      messageId,
      reaction
    ) => {
      const {
        data: existing,
      } = await supabase
        .from(
          "message_reactions"
        )
        .select("*")
        .eq(
          "message_id",
          messageId
        )
        .eq(
          "user_id",
          user.id
        )
        .eq(
          "reaction",
          reaction
        )
        .maybeSingle();

      if (existing) {
        await supabase
          .from(
            "message_reactions"
          )
          .delete()
          .eq(
            "message_id",
            messageId
          )
          .eq(
            "user_id",
            user.id
          )
          .eq(
            "reaction",
            reaction
          );
      } else {
        await supabase
          .from(
            "message_reactions"
          )
          .insert({
            message_id:
              messageId,
            user_id:
              user.id,
            reaction,
          });
      }

      setSelectedMessage(
        null
      );

      await loadMessages(
        activeConversation.id
      );
    };

  const uploadAttachment =
    async (
      item,
      caption = "",
      overrideType = null,
      extraMetadata = {}
    ) => {
      const file =
        item.file;

      if (
        bytesToMB(
          file.size
        ) >
        Number(
          planFeatures?.maxAttachmentMB ||
            HEXA_PLANS.free
              .maxAttachmentMB
        )
      ) {
        throw new Error(
          `Your plan allows attachments up to ${planFeatures?.maxAttachmentMB || HEXA_PLANS.free.maxAttachmentMB} MB. Upgrade for larger files.`
        );
      }

      const type =
        overrideType ||
        (file.type.startsWith(
          "image/"
        )
          ? "image"
          : file.type.startsWith(
                "video/"
              )
            ? "video"
            : file.type.startsWith(
                  "audio/"
                )
              ? "audio"
              : "file");

      const path =
        [
          user.id,
          activeConversation.id,
          `${Date.now()}-${safeFileName(
            file.name
          )}`,
        ].join("/");

      const {
        error: uploadError,
      } =
        await supabase.storage
          .from(
            STORAGE_BUCKET
          )
          .upload(
            path,
            file,
            {
              cacheControl:
                "3600",
              upsert:
                false,
              contentType:
                file.type ||
                "application/octet-stream",
            }
          );

      if (uploadError) {
        throw uploadError;
      }

      const {
        data: publicUrl,
      } =
        supabase.storage
          .from(
            STORAGE_BUCKET
          )
          .getPublicUrl(
            path
          );

      const fileUrl =
        publicUrl?.publicUrl ||
        "";

      const metadata = {
        file_url:
          fileUrl,
        file_name:
          file.name,
        mime_type:
          file.type ||
          "application/octet-stream",
        file_size:
          file.size,
        storage_bucket:
          STORAGE_BUCKET,
        storage_path:
          path,
        ...extraMetadata,
      };

      const {
        data: message,
        error: messageError,
      } =
        await supabase
          .from("messages")
          .insert({
            sender_id:
              user.id,
            receiver_id:
              activeConversation.type ===
              "direct"
                ? activeConversation.other_user_id ||
                  null
                : null,
            conversation_id:
              activeConversation.id,
            content:
              caption?.trim() ||
              (type === "image"
                ? "Photo"
                : type ===
                    "video"
                  ? "Video"
                  : type ===
                      "voice"
                    ? "Voice message"
                    : type ===
                        "audio"
                      ? "Audio"
                      : file.name),
            message_type:
              type,
            status: "sent",
            reply_to_id:
              replyTo?.id ||
              null,
            metadata,
            view_once:
              false,
          })
          .select("*")
          .single();

      if (messageError) {
        await supabase.storage
          .from(
            STORAGE_BUCKET
          )
          .remove([
            path,
          ]);

        throw messageError;
      }

      await supabase
        .from(
          "message_attachments"
        )
        .insert({
          message_id:
            message.id,
          user_id:
            user.id,
          file_name:
            file.name,
          file_path:
            path,
          file_url:
            fileUrl,
          mime_type:
            file.type ||
            "application/octet-stream",
          file_size:
            file.size,
          width:
            metadata.width ||
            null,
          height:
            metadata.height ||
            null,
          duration:
            metadata.duration ||
            null,
          thumbnail_url:
            metadata.thumbnail_url ||
            null,
        });

      return message;
    };

  const selectAttachments =
    (event) => {
      const files =
        Array.from(
          event.target.files ||
            []
        );

      if (!files.length) {
        event.target.value =
          "";
        return;
      }

      const items =
        files.map(
          (file) => {
            const type =
              file.type.startsWith(
                "image/"
              )
                ? "image"
                : file.type.startsWith(
                      "video/"
                    )
                  ? "video"
                  : file.type.startsWith(
                        "audio/"
                      )
                    ? "audio"
                    : "file";

            return {
              id:
                crypto.randomUUID(),
              file,
              type,
              previewUrl:
                type ===
                  "image" ||
                type ===
                  "video"
                  ? URL.createObjectURL(
                      file
                    )
                  : null,
            };
          }
        );

      setSelectedAttachments(
        (current) => [
          ...current,
          ...items,
        ]
      );

      setAttachmentMenuOpen(
        false
      );

      event.target.value =
        "";
    };

  const removeAttachment =
    (id) => {
      setSelectedAttachments(
        (current) => {
          const target =
            current.find(
              (item) =>
                item.id ===
                id
            );

          if (
            target?.previewUrl
          ) {
            URL.revokeObjectURL(
              target.previewUrl
            );
          }

          return current.filter(
            (item) =>
              item.id !==
              id
          );
        }
      );
    };

  const clearAttachments =
    () => {
      selectedAttachments.forEach(
        (item) => {
          if (
            item.previewUrl
          ) {
            URL.revokeObjectURL(
              item.previewUrl
            );
          }
        }
      );

      setSelectedAttachments(
        []
      );

      setUploadProgress(
        0
      );
    };

  const sendAttachments =
    async () => {
      if (
        !selectedAttachments.length
      ) {
        return;
      }

      setUploadingAttachments(
        true
      );

      setUploadProgress(
        0
      );

      try {
        for (
          let i = 0;
          i <
          selectedAttachments.length;
          i += 1
        ) {
          await uploadAttachment(
            selectedAttachments[
              i
            ],
            i === 0
              ? composerText
              : ""
          );

          setUploadProgress(
            Math.round(
              ((i + 1) /
                selectedAttachments.length) *
                100
            )
          );
        }

        clearAttachments();

        setComposerText(
          ""
        );

        setReplyTo(
          null
        );

        await loadMessages(
          activeConversation.id
        );

        await loadConversationList();
      } catch (error) {
        alert(
          getErrorMessage(
            error
          )
        );
      } finally {
        setUploadingAttachments(
          false
        );
      }
    };

  const sendText =
    async () => {
      const text =
        composerText.trim();

      if (
        !text ||
        !activeConversation?.id
      ) {
        return;
      }

      if (
        activeConversation.readOnly
      ) {
        alert(
          "Only authorized HEXA Group admins can publish official messages."
        );
        return;
      }

      if (
        isUuid(
          activeConversation.id
        )
      ) {
        const {
          data: canSend,
        } =
          await supabase.rpc(
            "hexa_can_send_message",
            {
              p_conversation_id:
                activeConversation.id,
              p_user_id:
                user.id,
            }
          );

        if (
          canSend ===
          false
        ) {
          alert(
            "You are not allowed to send messages here."
          );
          return;
        }
      }

      const {
        error,
      } =
        await supabase
          .from("messages")
          .insert({
            sender_id:
              user.id,
            receiver_id:
              activeConversation.type ===
              "direct"
                ? activeConversation.other_user_id ||
                  null
                : null,
            conversation_id:
              activeConversation.id,
            content:
              text,
            message_type:
              "text",
            status:
              "sent",
            reply_to_id:
              replyTo?.id ||
              null,
            metadata:
              {},
            view_once:
              false,
          });

      if (error) {
        alert(
          getErrorMessage(
            error
          )
        );
        return;
      }

      setComposerText(
        ""
      );

      setReplyTo(
        null
      );

      sendTyping(
        "idle"
      ).catch(() => {});

      await loadMessages(
        activeConversation.id
      );

      await loadConversationList();
    };

  const sendMessage =
    async () => {
      if (
        selectedAttachments.length
      ) {
        await sendAttachments();
        return;
      }

      await sendText();
    };

  const stopRecorder =
    () => {
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current
          .state !==
          "inactive"
      ) {
        mediaRecorderRef.current.stop();
      }

      setRecording(
        false
      );

      clearInterval(
        recordingTimerRef.current
      );

      sendTyping(
        "idle"
      ).catch(() => {});
    };

  const startRecorder =
    async () => {
      if (
        recording ||
        !navigator.mediaDevices
          ?.getUserMedia
      ) {
        return;
      }

      if (
        !activeConversation?.id ||
        !isUuid(
          activeConversation.id
        )
      ) {
        alert(
          "Open a real chat before recording a voice message."
        );
        return;
      }

      try {
        const stream =
          await navigator.mediaDevices.getUserMedia(
            {
              audio:
                true,
            }
          );

        recordingStreamRef.current =
          stream;

        recordingChunksRef.current =
          [];

        const mime =
          MediaRecorder.isTypeSupported(
            "audio/webm;codecs=opus"
          )
            ? "audio/webm;codecs=opus"
            : "audio/webm";

        const recorder =
          new MediaRecorder(
            stream,
            {
              mimeType:
                mime,
            }
          );

        mediaRecorderRef.current =
          recorder;

        recorder.ondataavailable =
          (event) => {
            if (
              event.data
                .size >
              0
            ) {
              recordingChunksRef.current.push(
                event.data
              );
            }
          };

        recorder.onstop =
          () => {
            const blob =
              new Blob(
                recordingChunksRef.current,
                {
                  type:
                    mime,
                }
              );

            const file =
              new File(
                [blob],
                `voice-${Date.now()}.webm`,
                {
                  type:
                    mime,
                }
              );

            const item = {
              id:
                crypto.randomUUID(),
              file,
              type: "voice",
              previewUrl:
                URL.createObjectURL(
                  blob
                ),
            };

            setSelectedAttachments([
              item,
            ]);

            recordingStreamRef.current
              ?.getTracks()
              .forEach(
                (track) =>
                  track.stop()
              );

            recordingStreamRef.current =
              null;
          };

        recorder.start(
          250
        );

        setRecording(
          true
        );

        setRecordingSeconds(
          0
        );

        sendTyping(
          "recording"
        ).catch(() => {});

        recordingTimerRef.current =
          setInterval(
            () =>
              setRecordingSeconds(
                (value) =>
                  value + 1
              ),
            1000
          );
      } catch (error) {
        alert(
          getErrorMessage(
            error
          )
        );
      }
    };

  const sendLocation =
    async ({
      latitude,
      longitude,
      accuracy,
    }) => {
      if (!isUuid(
        activeConversation.id
      )) {
        throw new Error(
          "Open a real conversation."
        );
      }

      try {
        const {
          error,
        } =
          await supabase.rpc(
            "hexa_send_location",
            {
              p_conversation_id:
                activeConversation.id,
              p_latitude:
                latitude,
              p_longitude:
                longitude,
              p_accuracy:
                accuracy ||
                null,
            }
          );

        if (error) {
          throw error;
        }
      } catch {
        const {
          error,
        } =
          await supabase
            .from(
              "messages"
            )
            .insert({
              sender_id:
                user.id,
              receiver_id:
                activeConversation.type ===
                "direct"
                  ? activeConversation.other_user_id ||
                    null
                  : null,
              conversation_id:
                activeConversation.id,
              content:
                "Location",
              message_type:
                "location",
              status:
                "sent",
              metadata: {
                latitude,
                longitude,
                accuracy:
                  accuracy ||
                  null,
              },
            });

        if (error) {
          throw error;
        }
      }

      await loadMessages(
        activeConversation.id
      );
    };

  const startLiveLocation =
    async ({
      latitude,
      longitude,
      accuracy,
      durationSeconds,
    }) => {
      const expiresAt =
        new Date(
          Date.now() +
            durationSeconds *
              1000
        ).toISOString();

      const {
        error,
      } = await supabase.rpc(
        "hexa_update_live_location",
        {
          p_conversation_id:
            activeConversation.id,
          p_latitude:
            latitude,
          p_longitude:
            longitude,
          p_accuracy:
            accuracy ||
            null,
          p_expires_at:
            expiresAt,
        }
      );

      if (error) {
        throw error;
      }

      await supabase
        .from("messages")
        .insert({
          sender_id:
            user.id,
          receiver_id:
            activeConversation.type ===
            "direct"
              ? activeConversation.other_user_id ||
                null
              : null,
          conversation_id:
            activeConversation.id,
          content:
            "Live location",
          message_type:
            "location",
          status:
            "sent",
          metadata: {
            latitude,
            longitude,
            accuracy:
              accuracy ||
              null,
            live_location:
              true,
            expires_at:
              expiresAt,
          },
        });
    };

  const sendContact =
    async (contact) => {
      const {
        error,
      } =
        await supabase
          .from(
            "messages"
          )
          .insert({
            sender_id:
              user.id,
            receiver_id:
              activeConversation.type ===
              "direct"
                ? activeConversation.other_user_id ||
                  null
                : null,
            conversation_id:
              activeConversation.id,
            content:
              contact.full_name ||
              contact.username ||
              "Contact",
            message_type:
              "contact",
            status:
              "sent",
            metadata: {
              contact_id:
                contact.id,
              name:
                contact.full_name ||
                contact.username ||
                "HEXA User",
              username:
                contact.username ||
                "",
              phone:
                contact.phone ||
                "",
              avatar_url:
                contact.avatar_url ||
                null,
            },
          });

      if (error) {
        throw error;
      }

      await loadMessages(
        activeConversation.id
      );
    };

  const createPoll =
    async ({
      question,
      options,
      allowMultiple,
      allowChangeVote,
    }) => {
      const {
        error,
      } =
        await supabase.rpc(
          "hexa_create_poll",
          {
            p_conversation_id:
              activeConversation.id,
            p_question:
              question,
            p_options:
              options,
            p_allow_multiple:
              allowMultiple,
            p_allow_change_vote:
              allowChangeVote,
          }
        );

      if (error) {
        throw error;
      }

      await loadMessages(
        activeConversation.id
      );
    };

  const editMessage =
    async (message) => {
      const value =
        window.prompt(
          "Edit message:",
          message.content ||
            ""
        );

      if (
        value === null ||
        !value.trim()
      ) {
        return;
      }

      try {
        const {
          error,
        } =
          await supabase.rpc(
            "hexa_edit_message",
            {
              p_message_id:
                message.id,
              p_content:
                value.trim(),
            }
          );

        if (error) {
          throw error;
        }
      } catch {
        const {
          error,
        } =
          await supabase
            .from(
              "messages"
            )
            .update({
              content:
                value.trim(),
              edited_at:
                new Date().toISOString(),
            })
            .eq(
              "id",
              message.id
            )
            .eq(
              "sender_id",
              user.id
            );

        if (error) {
          alert(
            getErrorMessage(
              error
            )
          );
          return;
        }
      }

      setSelectedMessage(
        null
      );

      await loadMessages(
        activeConversation.id
      );
    };

  const deleteEveryone =
    async (message) => {
      if (
        !window.confirm(
          "Delete this message for everyone?"
        )
      ) {
        return;
      }

      try {
        const {
          error,
        } =
          await supabase.rpc(
            "hexa_delete_message_for_everyone",
            {
              p_message_id:
                message.id,
            }
          );

        if (error) {
          throw error;
        }
      } catch {
        const {
          error,
        } =
          await supabase
            .from(
              "messages"
            )
            .update({
              deleted_at:
                new Date().toISOString(),
              content:
                "This message was deleted",
              metadata: {
                ...(message.metadata ||
                  {}),
                deleted_for_everyone:
                  true,
              },
            })
            .eq(
              "id",
              message.id
            )
            .eq(
              "sender_id",
              user.id
            );

        if (error) {
          alert(
            getErrorMessage(
              error
            )
          );
          return;
        }
      }

      setSelectedMessage(
        null
      );

      await loadMessages(
        activeConversation.id
      );
    };

  const deleteForMe =
    async (message) => {
      await messageAction(
        message.id,
        "deleted_for_me",
        true
      );
    };

  const copyMessage =
    async (message) => {
      if (
        !navigator.clipboard
      ) {
        alert(
          "Copy is not available in this browser."
        );
        return;
      }

      await navigator.clipboard.writeText(
        message.content ||
          ""
      );

      setSelectedMessage(
        null
      );
    };

  const forwardMessage =
    async (message) => {
      const target =
        window.prompt(
          "Destination conversation UUID:"
        );

      if (
        !target ||
        !isUuid(target)
      ) {
        return;
      }

      const {
        error,
      } =
        await supabase.rpc(
          "hexa_forward_message",
          {
            p_message_id:
              message.id,
            p_conversation_id:
              target,
          }
        );

      if (error) {
        alert(
          getErrorMessage(
            error
          )
        );
        return;
      }

      setSelectedMessage(
        null
      );
    };

  const toggleStar =
    async (message) => {
      const current =
        await getActions(
          message.id
        );

      await messageAction(
        message.id,
        "starred",
        !current?.starred
      );
    };

  const togglePin =
    async (message) => {
      const current =
        await getActions(
          message.id
        );

      await messageAction(
        message.id,
        "pinned",
        !current?.pinned
      );
    };

  const openPerson =
    async (person) => {
      try {
        const conversation =
          await getOrCreateDirect(
            user.id,
            person.id
          );

        setActiveConversation(
          {
            ...conversation,
            name:
              person.full_name ||
              person.display_name ||
              person.username ||
              "HEXA User",
            avatar_url:
              person.avatar_url ||
              null,
            other_user_id:
              person.id,
            type: "direct",
          }
        );

        setNewChatOpen(
          false
        );

        await loadConversationList();
      } catch (error) {
        alert(
          getErrorMessage(
            error
          )
        );
      }
    };

  const filteredMessages =
    useMemo(() => {
      if (
        !messageSearch.trim()
      ) {
        return messages;
      }

      const needle =
        messageSearch
          .trim()
          .toLowerCase();

      return messages.filter(
        (message) =>
          String(
            message.content ||
              ""
          )
            .toLowerCase()
            .includes(
              needle
            )
      );
    }, [
      messages,
      messageSearch,
    ]);

  const renderReactions =
    (message) => {
      const reactions =
        message.message_reactions ||
        [];

      if (
        reactions.length ===
        0
      ) {
        return null;
      }

      const grouped =
        reactions.reduce(
          (
            result,
            item
          ) => {
            result[
              item.reaction
            ] =
              (result[
                item.reaction
              ] || 0) + 1;

            return result;
          },
          {}
        );

      return (
        <div className="reaction-strip">
          {Object.entries(
            grouped
          ).map(
            ([
              reaction,
              count,
            ]) => (
              <button
                key={
                  reaction
                }
                onClick={() =>
                  react(
                    message.id,
                    reaction
                  )
                }
              >
                {reaction}{" "}
                {count}
              </button>
            )
          )}
        </div>
      );
    };

  return (
    <div className="chat-page">
      <aside className="chat-sidebar">
        <div className="chat-sidebar-header">
          <div>
            <h2>
              Chats
            </h2>

            <small>
              {
                conversations.length
              }{" "}
              chats
            </small>
          </div>

          <button
            className="icon-button"
            onClick={() =>
              setNewChatOpen(
                true
              )
            }
          >
            ＋
          </button>
        </div>

        <div className="chat-search">
          <input
            className="search-input"
            placeholder="Search chats"
            onChange={async (
              event
            ) => {
              const value =
                event.target.value
                  .trim()
                  .toLowerCase();

              if (!value) {
                await loadConversationList();
                return;
              }

              setConversations(
                (current) =>
                  current.filter(
                    (
                      chat
                    ) =>
                      chat.name
                        ?.toLowerCase()
                        .includes(
                          value
                        ) ||
                      chat.preview
                        ?.toLowerCase()
                        .includes(
                          value
                        )
                  )
              );
            }}
          />
        </div>

        <div className="chat-list">
          {conversations.map(
            (chat) => (
              <button
                key={chat.id}
                className={
                  activeConversation?.id ===
                  chat.id
                    ? "chat-list-item active"
                    : "chat-list-item"
                }
                onClick={() =>
                  setActiveConversation(
                    chat
                  )
                }
              >
                <Avatar
                  url={
                    chat.avatar_url
                  }
                  name={
                    chat.name
                  }
                  size="md"
                />

                <span className="chat-list-copy">
                  <strong>
                    {
                      chat.name
                    }
                  </strong>

                  <small>
                    {chat.preview ||
                      "Start chatting"}
                  </small>
                </span>

                {chat.latest_message
                  ?.created_at && (
                  <time>
                    {formatTime(
                      chat
                        .latest_message
                        .created_at
                    )}
                  </time>
                )}
              </button>
            )
          )}
        </div>
      </aside>

      <section className="chat-main">
        {!activeConversation ? (
          <div className="chat-empty-screen">
            <div className="chat-empty-icon">
              💬
            </div>

            <h2>
              Select a chat
            </h2>

            <p>
              Open a conversation
              or start a new chat.
            </p>
          </div>
        ) : (
          <>
            <header className="chat-header">
              <div className="chat-header-person">
                <Avatar
                  url={
                    activeConversation.avatar_url
                  }
                  name={
                    activeConversation.name
                  }
                  size="md"
                />

                <div>
                  <strong>
                    {
                      activeConversation.name
                    }
                  </strong>

                  <small>
                    {typing
                      ? "typing…"
                      : activeConversation.type ===
                          "group"
                        ? "Group"
                        : "online"}
                  </small>
                </div>
              </div>

              <div className="chat-header-actions">
                {activeConversation.other_user_id && (
                  <>
                    <button
                      className="icon-button"
                      onClick={() =>
                        onOpenCall({
                          conversationId:
                            activeConversation.id,
                          calleeId:
                            activeConversation.other_user_id,
                          type: "voice",
                        })
                      }
                      title="Voice call"
                    >
                      ☎
                    </button>

                    <button
                      className="icon-button"
                      onClick={() =>
                        onOpenCall({
                          conversationId:
                            activeConversation.id,
                          calleeId:
                            activeConversation.other_user_id,
                          type: "video",
                        })
                      }
                      title="Video call"
                    >
                      📹
                    </button>
                  </>
                )}

                <button
                  className="icon-button"
                  onClick={() =>
                    setShowSearch(
                      (value) =>
                        !value
                    )
                  }
                  title="Search"
                >
                  🔎
                </button>
              </div>
            </header>

            {showSearch && (
              <div className="chat-search-bar">
                <input
                  value={
                    messageSearch
                  }
                  onChange={(
                    event
                  ) =>
                    setMessageSearch(
                      event.target
                        .value
                    )
                  }
                  placeholder="Search in this chat"
                />

                <button
                  className="icon-button"
                  onClick={() => {
                    setMessageSearch(
                      ""
                    );
                    setShowSearch(
                      false
                    );
                  }}
                >
                  ×
                </button>
              </div>
            )}

            <main className="chat-messages">
              {filteredMessages.length ===
                0 && (
                <div className="empty-state">
                  <div className="empty-state-icon">
                    💬
                  </div>

                  <strong>
                    No messages yet
                  </strong>

                  <span>
                    Send your first message.
                  </span>
                </div>
              )}

              {filteredMessages.map(
                (message) => {
                  const own =
                    message.sender_id ===
                    user.id;

                  const deleted =
                    Boolean(
                      message.deleted_at
                    );

                  const actions =
                    message.message_user_actions ||
                    [];

                  const mine =
                    actions.find(
                      (
                        action
                      ) =>
                        action.user_id ===
                        user.id
                    );

                  const reply =
                    message.reply_to_id
                      ? messages.find(
                          (
                            item
                          ) =>
                            item.id ===
                            message.reply_to_id
                        )
                      : null;

                  return (
                    <div
                      key={
                        message.id
                      }
                      className={
                        own
                          ? "message-row own"
                          : "message-row"
                      }
                    >
                      <div className="message-stack">
                        <div
                          className={
                            own
                              ? "message-bubble own"
                              : "message-bubble"
                          }
                          onContextMenu={(
                            event
                          ) => {
                            event.preventDefault();

                            setSelectedMessage(
                              message
                            );
                          }}
                        >
                          {reply && (
                            <div className="message-reply-preview">
                              <strong>
                                Reply
                              </strong>

                              <span>
                                {messagePreview(
                                  reply
                                )}
                              </span>
                            </div>
                          )}

                          {deleted ? (
                            <div className="deleted-message">
                              This message was
                              deleted
                            </div>
                          ) : message.message_type ===
                            "poll" ? (
                            <PollMessage
                              message={
                                message
                              }
                            />
                          ) : (
                            <>
                              <MessageMedia
                                message={
                                  message
                                }

                              />

                              {message.content &&
                                ![
                                  "Photo",
                                  "Video",
                                  "Audio",
                                  "Voice message",
                                  "Location",
                                  "Live location",
                                ].includes(
                                  message.content
                                ) && (
                                  <div className="message-text">
                                    {
                                      message.content
                                    }
                                  </div>
                                )}
                            </>
                          )}

                          <div className="message-meta">
                            <time>
                              {formatTime(
                                message.created_at
                              )}
                            </time>

                            {message.edited_at && (
                              <span>
                                edited
                              </span>
                            )}

                            {own && (
                              <span className={
                                message.status ===
                                "read"
                                  ? "message-read"
                                  : ""
                              }>
                                {message.status ===
                                "read"
                                  ? "✓✓"
                                  : message.status ===
                                      "delivered"
                                    ? "✓✓"
                                    : "✓"}
                              </span>
                            )}
                          </div>

                          {mine?.starred && (
                            <span className="message-star">
                              ★
                            </span>
                          )}
                        </div>

                        {renderReactions(
                          message
                        )}

                        {selectedMessage?.id ===
                          message.id && (
                          <MessageMenu
                            message={
                              message
                            }
                            canEdit={
                              own
                            }
                            onCopy={() =>
                              copyMessage(
                                message
                              )
                            }
                            onReply={() => {
                              setReplyTo(
                                message
                              );
                              setSelectedMessage(
                                null
                              );
                            }}
                            onForward={() =>
                              forwardMessage(
                                message
                              )
                            }
                            onEdit={() =>
                              editMessage(
                                message
                              )
                            }
                            onDeleteEveryone={() =>
                              deleteEveryone(
                                message
                              )
                            }
                            onDeleteForMe={() =>
                              deleteForMe(
                                message
                              )
                            }
                            onStar={() =>
                              toggleStar(
                                message
                              )
                            }
                            onPin={() =>
                              togglePin(
                                message
                              )
                            }
                            onReact={() =>
                              react(
                                message.id,
                                "❤️"
                              )
                            }
                            onClose={() =>
                              setSelectedMessage(
                                null
                              )
                            }
                          />
                        )}
                      </div>
                    </div>
                  );
                }
              )}

              <div
                ref={
                  messagesEndRef
                }
              />
            </main>

            {replyTo && (
              <div className="reply-composer">
                <div>
                  <strong>
                    Replying
                  </strong>

                  <span>
                    {messagePreview(
                      replyTo
                    )}
                  </span>
                </div>

                <button
                  className="icon-button"
                  onClick={() =>
                    setReplyTo(
                      null
                    )
                  }
                >
                  ×
                </button>
              </div>
            )}

            <AttachmentPreview
              items={
                selectedAttachments
              }
              onRemove={
                removeAttachment
              }
              onClear={
                clearAttachments
              }
              uploading={
                uploadingAttachments
              }
              progress={
                uploadProgress
              }
              onSend={
                sendAttachments
              }
            />

            {recording && (
              <div className="voice-recording-bar">
                <div className="recording-indicator">
                  <span />
                  Recording{" "}
                  {Math.floor(
                    recordingSeconds /
                      60
                  )
                    .toString()
                    .padStart(
                      2,
                      "0"
                    )}
                  :
                  {(recordingSeconds %
                    60)
                    .toString()
                    .padStart(
                      2,
                      "0"
                    )}
                </div>

                <button
                  className="secondary-button"
                  onClick={() => {
                    recordingChunksRef.current =
                      [];

                    recordingStreamRef.current
                      ?.getTracks()
                      .forEach(
                        (
                          track
                        ) =>
                          track.stop()
                      );

                    mediaRecorderRef.current?.stop();

                    setRecording(
                      false
                    );

                    clearInterval(
                      recordingTimerRef.current
                    );
                  }}
                >
                  Cancel
                </button>

                <button
                  className="primary-button"
                  onClick={
                    stopRecorder
                  }
                >
                  Stop
                </button>
              </div>
            )}

            <footer className="chat-composer">
              <div className="composer-left">
                <div className="composer-attachment-wrap">
                  <button
                    className="composer-tool"
                    type="button"
                    onClick={() =>
                      setAttachmentMenuOpen(
                        (value) =>
                          !value
                      )
                    }
                    title="Attachments"
                  >
                    ＋
                  </button>

                  {attachmentMenuOpen && (
                    <div className="attachment-menu">
                      <button
                        className="attachment-action"
                        onClick={() =>
                          cameraInputRef.current?.click()
                        }
                      >
                        <span className="attachment-action-icon">
                          📷
                        </span>

                        <span>
                          Camera
                        </span>
                      </button>

                      <button
                        className="attachment-action"
                        onClick={() =>
                          galleryInputRef.current?.click()
                        }
                      >
                        <span className="attachment-action-icon">
                          🖼️
                        </span>

                        <span>
                          Gallery
                        </span>
                      </button>

                      <button
                        className="attachment-action"
                        onClick={() =>
                          fileInputRef.current?.click()
                        }
                      >
                        <span className="attachment-action-icon">
                          📎
                        </span>

                        <span>
                          Files
                        </span>
                      </button>

                      <button
                        className="attachment-action"
                        onClick={() => {
                          setAttachmentMenuOpen(
                            false
                          );
                          setLocationOpen(
                            true
                          );
                        }}
                      >
                        <span className="attachment-action-icon">
                          📍
                        </span>

                        <span>
                          Location
                        </span>
                      </button>

                      <button
                        className="attachment-action"
                        onClick={() => {
                          setAttachmentMenuOpen(
                            false
                          );
                          setPollOpen(
                            true
                          );
                        }}
                      >
                        <span className="attachment-action-icon">
                          📊
                        </span>

                        <span>
                          Poll
                        </span>
                      </button>

                      <button
                        className="attachment-action"
                        onClick={() => {
                          setAttachmentMenuOpen(
                            false
                          );
                          setContactOpen(
                            true
                          );
                        }}
                      >
                        <span className="attachment-action-icon">
                          👤
                        </span>

                        <span>
                          Contact
                        </span>
                      </button>
                    </div>
                  )}
                </div>

                <button
                  className="composer-tool"
                  onClick={() =>
                    setShowEmoji(
                      (value) =>
                        !value
                    )
                  }
                  title="Emoji"
                >
                  ☺
                </button>
              </div>

              {showEmoji && (
                <div className="emoji-panel">
                  {EMOJIS.map(
                    (
                      emoji,
                      index
                    ) => (
                      <button
                        type="button"
                        key={`${emoji}-${index}`}
                        onClick={() => {
                          setComposerText(
                            (value) =>
                              value +
                              emoji
                          );

                          setShowEmoji(
                            false
                          );
                        }}
                      >
                        {emoji}
                      </button>
                    )
                  )}
                </div>
              )}

              <input
                ref={
                  cameraInputRef
                }
                type="file"
                accept="image/*"
                capture="environment"
                hidden
                onChange={
                  selectAttachments
                }
              />

              <input
                ref={
                  galleryInputRef
                }
                type="file"
                accept="image/*,video/*"
                multiple
                hidden
                onChange={
                  selectAttachments
                }
              />

              <input
                ref={
                  fileInputRef
                }
                type="file"
                multiple
                hidden
                onChange={
                  selectAttachments
                }
              />

              <textarea
                className="chat-input"
                value={
                  composerText
                }
                onChange={
                  handleTyping
                }
                placeholder={
                  activeConversation.readOnly
                    ? "Official HEXA Group"
                    : "Type a message"
                }
                rows={1}
                disabled={
                  recording ||
                  uploadingAttachments
                }
                onKeyDown={(
                  event
                ) => {
                  if (
                    event.key ===
                      "Enter" &&
                    !event.shiftKey
                  ) {
                    event.preventDefault();
                    sendMessage();
                  }
                }}
              />

              <div className="composer-right">
                {!composerText.trim() &&
                !selectedAttachments.length ? (
                  <button
                    className="composer-tool voice-tool"
                    onMouseDown={
                      startRecorder
                    }
                    onMouseUp={
                      stopRecorder
                    }
                    onTouchStart={
                      startRecorder
                    }
                    onTouchEnd={
                      stopRecorder
                    }
                    title="Hold to record"
                  >
                    🎙
                  </button>
                ) : (
                  <button
                    className="send-button"
                    onClick={
                      sendMessage
                    }
                    disabled={
                      uploadingAttachments
                    }
                  >
                    ➤
                  </button>
                )}
              </div>
            </footer>
          </>
        )}
      </section>

      {newChatOpen && (
        <NewChatModal
          user={user}
          onClose={() =>
            setNewChatOpen(
              false
            )
          }
          onOpenConversation={
            openPerson
          }
        />
      )}

      {locationOpen && (
        <LocationModal
          onClose={() =>
            setLocationOpen(
              false
            )
          }
          onSendLocation={
            sendLocation
          }
          onStartLiveLocation={
            startLiveLocation
          }
        />
      )}

      {contactOpen && (
        <ContactModal
          user={user}
          onClose={() =>
            setContactOpen(
              false
            )
          }
          onSend={
            sendContact
          }
        />
      )}

      {pollOpen && (
        <PollModal
          onClose={() =>
            setPollOpen(
              false
            )
          }
          onCreate={
            createPoll
          }
        />
      )}
    </div>
  );
}

/* ============================================================
   STATUS
============================================================ */

function StatusPage({
  user,
  planFeatures,
}) {
  const [
    statuses,
    setStatuses,
  ] = useState([]);

  const [
    text,
    setText,
  ] = useState("");

  const [
    statusFile,
    setStatusFile,
  ] = useState(null);

  const [
    statusPreview,
    setStatusPreview,
  ] = useState(null);

  const inputRef =
    useRef(null);

  const load =
    useCallback(
      async () => {
        const {
          data,
        } = await supabase
          .from("statuses")
          .select("*")
          .gt(
            "expires_at",
            new Date().toISOString()
          )
          .order(
            "created_at",
            {
              ascending: false,
            }
          );

        setStatuses(
          data || []
        );
      },
      []
    );

  useEffect(() => {
    load();
  }, [load]);

  const selectFile =
    (event) => {
      const file =
        event.target.files?.[0];

      if (!file) return;

      if (
        bytesToMB(
          file.size
        ) >
        Number(
          planFeatures?.maxStatusMediaMB ||
            50
        )
      ) {
        alert(
          `Your plan allows Status media up to ${planFeatures?.maxStatusMediaMB || 50} MB.`
        );
        return;
      }

      setStatusFile(
        file
      );

      if (
        file.type.startsWith(
          "image/"
        ) ||
        file.type.startsWith(
          "video/"
        )
      ) {
        setStatusPreview(
          URL.createObjectURL(
            file
          )
        );
      }
    };

  const create =
    async () => {
      if (
        !text.trim() &&
        !statusFile
      ) {
        return;
      }

      let mediaUrl =
        "";

      let mediaType =
        "";

      if (statusFile) {
        const path = [
          user.id,
          "status",
          `${Date.now()}-${safeFileName(
            statusFile.name
          )}`,
        ].join("/");

        const {
          error: uploadError,
        } =
          await supabase.storage
            .from(
              STORAGE_BUCKET
            )
            .upload(
              path,
              statusFile,
              {
                contentType:
                  statusFile.type,
                upsert:
                  false,
              }
            );

        if (
          uploadError
        ) {
          alert(
            getErrorMessage(
              uploadError
            )
          );
          return;
        }

        const {
          data,
        } =
          supabase.storage
            .from(
              STORAGE_BUCKET
            )
            .getPublicUrl(
              path
            );

        mediaUrl =
          data.publicUrl;

        mediaType =
          statusFile.type;
      }

      const expiresAt =
        new Date(
          Date.now() +
            24 *
              60 *
              60 *
              1000
        ).toISOString();

      const {
        error,
      } =
        await supabase
          .from("statuses")
          .insert({
            user_id:
              user.id,
            text:
              text.trim(),
            description:
              "",
            media_url:
              mediaUrl,
            media_type:
              mediaType,
            expires_at:
              expiresAt,
            privacy:
              "contacts",
            allow_replies:
              true,
          });

      if (error) {
        alert(
          getErrorMessage(
            error
          )
        );
        return;
      }

      setText("");
      setStatusFile(
        null
      );

      if (statusPreview) {
        URL.revokeObjectURL(
          statusPreview
        );
      }

      setStatusPreview(
        null
      );

      await load();
    };

  return (
    <div className="workspace-page">
      <div className="workspace-heading">
        <div>
          <h2>
            Status
          </h2>

          <p>
            Share updates that disappear
            after 24 hours.
          </p>
        </div>
      </div>

      <div className="status-create-card">
        {statusPreview && (
          <div className="status-upload-preview">
            {statusFile?.type.startsWith(
              "image/"
            ) ? (
              <img
                src={
                  statusPreview
                }
                alt="Status preview"
              />
            ) : (
              <video
                src={
                  statusPreview
                }
                controls
              />
            )}
          </div>
        )}

        <textarea
          value={text}
          onChange={(event) =>
            setText(
              event.target
                .value
            )
          }
          placeholder="What's happening?"
        />

        <div className="status-create-actions">
          <button
            className="secondary-button"
            onClick={() =>
              inputRef.current?.click()
            }
          >
            🖼️ Photo / Video
          </button>

          <button
            className="primary-button"
            onClick={create}
          >
            Post status
          </button>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/*,video/*"
          hidden
          onChange={
            selectFile
          }
        />
      </div>

      <div className="status-grid">
        {statuses.length ===
          0 && (
          <div className="empty-state">
            <div className="empty-state-icon">
              ◉
            </div>

            <strong>
              No active statuses
            </strong>

            <span>
              Create the first one.
            </span>
          </div>
        )}

        {statuses.map(
          (status) => (
            <article
              key={
                status.id
              }
              className="status-card"
            >
              {status.media_url && (
                <>
                  {status.media_type?.startsWith(
                    "video/"
                  ) ? (
                    <video
                      src={
                        status.media_url
                      }
                      controls
                      playsInline
                    />
                  ) : (
                    <img
                      src={
                        status.media_url
                      }
                      alt="Status"
                    />
                  )}
                </>
              )}

              <div>
                <strong>
                  {status.user_id ===
                  user.id
                    ? "Your status"
                    : "HEXA status"}
                </strong>

                <small>
                  {formatDate(
                    status.created_at
                  )}
                </small>
              </div>

              {status.text && (
                <p>
                  {status.text}
                </p>
              )}
            </article>
          )
        )}
      </div>
    </div>
  );
}

/* ============================================================
   GROUPS
============================================================ */

function GroupsPage({
  user,
}) {
  const [
    groups,
    setGroups,
  ] = useState([]);

  const load =
    useCallback(
      async () => {
        const {
          data: memberships,
        } =
          await supabase
            .from(
              "conversation_members"
            )
            .select(
              "conversation_id,is_admin"
            )
            .eq(
              "user_id",
              user.id
            );

        const ids =
          (
            memberships ||
            []
          ).map(
            (row) =>
              row.conversation_id
          );

        if (!ids.length) {
          setGroups([]);
          return;
        }

        const {
          data,
        } =
          await supabase
            .from(
              "conversations"
            )
            .select("*")
            .eq(
              "type",
              "group"
            )
            .in(
              "id",
              ids
            )
            .order(
              "updated_at",
              {
                ascending: false,
              }
            );

        setGroups(
          data || []
        );
      },
      [user.id]
    );

  useEffect(() => {
    load();
  }, [load]);

  const createGroup =
    async () => {
      const name =
        window.prompt(
          "Group name:"
        );

      if (!name?.trim()) {
        return;
      }

      const {
        data,
        error,
      } =
        await supabase
          .from(
            "conversations"
          )
          .insert({
            type: "group",
            name:
              name.trim(),
            created_by:
              user.id,
            owner_id:
              user.id,
          })
          .select("*")
          .single();

      if (error) {
        alert(
          getErrorMessage(
            error
          )
        );
        return;
      }

      await supabase
        .from(
          "conversation_members"
        )
        .insert({
          conversation_id:
            data.id,
          user_id:
            user.id,
          is_admin:
            true,
        });

      await supabase.rpc(
        "hexa_initialize_group_permissions",
        {
          p_conversation_id:
            data.id,
        }
      );

      await load();
    };

  return (
    <div className="workspace-page">
      <div className="workspace-heading">
        <div>
          <h2>
            Groups
          </h2>

          <p>
            Create and manage
            multi-person conversations.
          </p>
        </div>

        <button
          className="primary-button"
          onClick={
            createGroup
          }
        >
          ＋ Create group
        </button>
      </div>

      <div className="workspace-grid">
        {groups.length ===
          0 && (
          <div className="empty-state">
            <div className="empty-state-icon">
              👥
            </div>

            <strong>
              No groups yet
            </strong>

            <span>
              Create your first group.
            </span>
          </div>
        )}

        {groups.map(
          (group) => (
            <div
              key={
                group.id
              }
              className="workspace-card"
            >
              <div className="workspace-card-icon">
                👥
              </div>

              <div>
                <h3>
                  {group.name}
                </h3>

                <p>
                  Group
                  conversation
                </p>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}

/* ============================================================
   COMMUNITIES
============================================================ */

function CommunitiesPage() {
  const [
    communities,
    setCommunities,
  ] = useState([]);

  useEffect(() => {
    const load =
      async () => {
        const {
          data,
        } =
          await supabase
            .from(
              "communities"
            )
            .select("*")
            .order(
              "created_at",
              {
                ascending: false,
              }
            );

        setCommunities(
          data || []
        );
      };

    load();
  }, []);

  return (
    <div className="workspace-page">
      <div className="workspace-heading">
        <div>
          <h2>
            Communities
          </h2>

          <p>
            Collections of related groups
            and connections.
          </p>
        </div>
      </div>

      <div className="workspace-grid">
        {communities.length ===
          0 && (
          <div className="empty-state">
            <div className="empty-state-icon">
              ◎
            </div>

            <strong>
              No communities yet
            </strong>

            <span>
              Communities will appear
              here.
            </span>
          </div>
        )}

        {communities.map(
          (community) => (
            <div
              className="workspace-card"
              key={
                community.id
              }
            >
              <div className="workspace-card-icon">
                ◎
              </div>

              <div>
                <h3>
                  {
                    community.name
                  }
                </h3>

                <p>
                  {community.description ||
                    "HEXA community"}
                </p>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}

/* ============================================================
   CHANNELS
============================================================ */

function ChannelsPage() {
  const [
    channels,
    setChannels,
  ] = useState([]);

  useEffect(() => {
    const load =
      async () => {
        const {
          data,
        } =
          await supabase
            .from(
              "channel_profiles"
            )
            .select("*")
            .order(
              "created_at",
              {
                ascending: false,
              }
            );

        setChannels(
          data || []
        );
      };

    load();
  }, []);

  return (
    <div className="workspace-page">
      <div className="workspace-heading">
        <div>
          <h2>
            Channels
          </h2>

          <p>
            Follow updates, creators and
            businesses.
          </p>
        </div>
      </div>

      <div className="workspace-grid">
        {channels.length ===
          0 && (
          <div className="empty-state">
            <div className="empty-state-icon">
              📣
            </div>

            <strong>
              No channels yet
            </strong>

            <span>
              Followed channels appear
              here.
            </span>
          </div>
        )}

        {channels.map(
          (channel) => (
            <div
              key={
                channel.channel_id
              }
              className="workspace-card"
            >
              <Avatar
                url={
                  channel.avatar_url
                }
                name={
                  channel.handle ||
                  "Channel"
                }
              />

              <div>
                <h3>
                  {
                    channel.handle ||
                    "Channel"
                  }
                </h3>

                <p>
                  {
                    channel.description ||
                    "HEXA channel"
                  }
                </p>

                {channel.verified && (
                  <span className="verified-badge">
                    ✓ Verified
                  </span>
                )}
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}

/* ============================================================
   CALLS
============================================================ */

function WebRTCCall({
  call,
  user,
  onClose,
}) {
  const localVideoRef =
    useRef(null);

  const remoteVideoRef =
    useRef(null);

  const peerRef =
    useRef(null);

  const localStreamRef =
    useRef(null);

  const channelRef =
    useRef(null);

  const [
    status,
    setStatus,
  ] = useState(
    call?.status ||
      "ringing"
  );

  const [
    muted,
    setMuted,
  ] = useState(false);

  const [
    videoEnabled,
    setVideoEnabled,
  ] = useState(
    call?.type ===
      "video"
  );

  const [
    seconds,
    setSeconds,
  ] = useState(0);

  const isCaller =
    call?.caller_id ===
    user.id;

  const cleanup =
    useCallback(
      async (
        finalStatus =
          "ended"
      ) => {
        localStreamRef.current
          ?.getTracks()
          .forEach(
            (track) =>
              track.stop()
          );

        peerRef.current?.close();

        if (
          channelRef.current
        ) {
          await supabase.removeChannel(
            channelRef.current
          );
        }

        if (
          call?.id &&
          finalStatus ===
            "ended"
        ) {
          await supabase
            .from(
              "calls"
            )
            .update({
              status:
                "ended",
              ended_at:
                new Date().toISOString(),
              ended_reason:
                "ended",
            })
            .eq(
              "id",
              call.id
            );
        }

        onClose();
      },
      [
        call?.id,
        onClose,
      ]
    );

  useEffect(() => {
    if (
      status !==
      "accepted"
    ) {
      return undefined;
    }

    const timer =
      setInterval(
        () =>
          setSeconds(
            (value) =>
              value + 1
          ),
        1000
      );

    return () =>
      clearInterval(
        timer
      );
  }, [status]);

  useEffect(() => {
    let disposed =
      false;

    const setup =
      async () => {
        try {
          const stream =
            await navigator.mediaDevices.getUserMedia(
              {
                audio:
                  true,
                video:
                  call.type ===
                  "video",
              }
            );

          if (
            disposed
          ) {
            stream
              .getTracks()
              .forEach(
                (track) =>
                  track.stop()
              );
            return;
          }

          localStreamRef.current =
            stream;

          if (
            localVideoRef.current
          ) {
            localVideoRef.current.srcObject =
              stream;
          }

          const pc =
            new RTCPeerConnection(
              {
                iceServers: [
                  {
                    urls:
                      "stun:stun.l.google.com:19302",
                  },

                  ...(import.meta
                    .env
                    .VITE_TURN_URL
                    ? [
                        {
                          urls:
                            import.meta
                              .env
                              .VITE_TURN_URL,
                          username:
                            import.meta
                              .env
                              .VITE_TURN_USERNAME,
                          credential:
                            import.meta
                              .env
                              .VITE_TURN_CREDENTIAL,
                        },
                      ]
                    : []),
                ],
              }
            );

          peerRef.current =
            pc;

          stream
            .getTracks()
            .forEach(
              (track) =>
                pc.addTrack(
                  track,
                  stream
                )
            );

          pc.ontrack =
            (event) => {
              const remote =
                event.streams?.[0];

              if (
                remote &&
                remoteVideoRef.current
              ) {
                remoteVideoRef.current.srcObject =
                  remote;
              }
            };

          pc.onicecandidate =
            async (
              event
            ) => {
              if (
                !event.candidate
              ) {
                return;
              }

              await supabase
                .from(
                  "call_signals"
                )
                .insert({
                  call_id:
                    call.id,
                  sender_id:
                    user.id,
                  receiver_id:
                    isCaller
                      ? call.callee_id
                      : call.caller_id,
                  type:
                    "ice-candidate",
                  payload:
                    event.candidate.toJSON
                      ? event.candidate.toJSON()
                      : event.candidate,
                });
            };

          const receiverId =
            isCaller
              ? call.callee_id
              : call.caller_id;

          const channel =
            supabase.channel(
              `hexa-call-${call.id}`
            );

          channelRef.current =
            channel;

          channel.on(
            "postgres_changes",
            {
              event:
                "INSERT",
              schema:
                "public",
              table:
                "call_signals",
              filter:
                `call_id=eq.${call.id}`,
            },
            async (
              payload
            ) => {
              const signal =
                payload.new;

              if (
                signal.receiver_id !==
                user.id
              ) {
                return;
              }

              try {
                if (
                  signal.type ===
                  "offer"
                ) {
                  await pc.setRemoteDescription(
                    new RTCSessionDescription(
                      signal.payload
                    )
                  );

                  const answer =
                    await pc.createAnswer();

                  await pc.setLocalDescription(
                    answer
                  );

                  await supabase
                    .from(
                      "call_signals"
                    )
                    .insert({
                      call_id:
                        call.id,
                      sender_id:
                        user.id,
                      receiver_id:
                        receiverId,
                      type:
                        "answer",
                      payload:
                        answer,
                    });

                  await supabase.rpc(
                    "hexa_answer_call",
                    {
                      p_call_id:
                        call.id,
                    }
                  );

                  setStatus(
                    "accepted"
                  );
                }

                if (
                  signal.type ===
                  "answer"
                ) {
                  await pc.setRemoteDescription(
                    new RTCSessionDescription(
                      signal.payload
                    )
                  );

                  setStatus(
                    "accepted"
                  );
                }

                if (
                  signal.type ===
                  "ice-candidate"
                ) {
                  await pc.addIceCandidate(
                    new RTCIceCandidate(
                      signal.payload
                    )
                  );
                }

                if (
                  signal.type ===
                  "hangup"
                ) {
                  await cleanup(
                    "ended"
                  );
                }
              } catch (error) {
                console.error(
                  "Call signal:",
                  error
                );
              }
            }
          );

          await channel.subscribe();

          if (
            isCaller
          ) {
            const offer =
              await pc.createOffer();

            await pc.setLocalDescription(
              offer
            );

            await supabase
              .from(
                "call_signals"
              )
              .insert({
                call_id:
                  call.id,
                sender_id:
                  user.id,
                receiver_id:
                  receiverId,
                type:
                  "offer",
                payload:
                  offer,
              });
          }
        } catch (error) {
          alert(
            getErrorMessage(
              error
            )
          );

          onClose();
        }
      };

    setup();

    return () => {
      disposed = true;
    };
  }, [
    call,
    cleanup,
    isCaller,
    onClose,
    user.id,
  ]);

  const toggleMute =
    () => {
      localStreamRef.current
        ?.getAudioTracks()
        .forEach(
          (track) =>
            (track.enabled =
              !track.enabled)
        );

      setMuted(
        (value) => !value
      );
    };

  const toggleVideo =
    () => {
      localStreamRef.current
        ?.getVideoTracks()
        .forEach(
          (track) =>
            (track.enabled =
              !track.enabled)
        );

      setVideoEnabled(
        (value) =>
          !value
      );
    };

  const answer =
    async () => {
      const {
        error,
      } =
        await supabase.rpc(
          "hexa_answer_call",
          {
            p_call_id:
              call.id,
          }
        );

      if (error) {
        alert(
          getErrorMessage(
            error
          )
        );
        return;
      }

      setStatus(
        "accepted"
      );
    };

  const decline =
    async () => {
      try {
        await supabase.rpc(
          "hexa_decline_call",
          {
            p_call_id:
              call.id,
          }
        );
      } catch {
        await supabase
          .from(
            "calls"
          )
          .update({
            status:
              "declined",
            ended_at:
              new Date().toISOString(),
            ended_reason:
              "declined",
          })
          .eq(
            "id",
            call.id
          );
      }

      await cleanup(
        "declined"
      );
    };

  return (
    <div className="call-overlay">
      <div className="call-card">
        <div className="call-video-stage">
          <video
            ref={
              remoteVideoRef
            }
            autoPlay
            playsInline
            className="remote-video"
          />

          <video
            ref={
              localVideoRef
            }
            autoPlay
            muted
            playsInline
            className="local-video"
          />

          {status !==
            "accepted" && (
            <div className="call-status-overlay">
              <div className="call-avatar">
                📞
              </div>

              <h2>
                {status ===
                "ringing"
                  ? "Calling…"
                  : "Connecting…"}
              </h2>

              <p>
                {call.type ===
                "video"
                  ? "Video call"
                  : "Voice call"}
              </p>
            </div>
          )}
        </div>

        <div className="call-bottom-bar">
          <div className="call-info">
            <strong>
              {call.type ===
              "video"
                ? "Video call"
                : "Voice call"}
            </strong>

            <span>
              {status ===
              "accepted"
                ? `${Math.floor(seconds / 60)
                    .toString()
                    .padStart(2, "0")}:${(
                    seconds % 60
                  )
                    .toString()
                    .padStart(2, "0")}`
                : status}
            </span>
          </div>

          <div className="call-controls">
            {status ===
              "ringing" &&
              !isCaller && (
                <>
                  <button
                    className="call-control accept"
                    onClick={
                      answer
                    }
                  >
                    ✓
                  </button>

                  <button
                    className="call-control danger"
                    onClick={
                      decline
                    }
                  >
                    ✕
                  </button>
                </>
              )}

            {status ===
              "accepted" && (
              <>
                <button
                  className={
                    muted
                      ? "call-control active"
                      : "call-control"
                  }
                  onClick={
                    toggleMute
                  }
                >
                  {muted
                    ? "🔇"
                    : "🎙️"}
                </button>

                {call.type ===
                  "video" && (
                  <button
                    className={
                      videoEnabled
                        ? "call-control"
                        : "call-control active"
                    }
                    onClick={
                      toggleVideo
                    }
                  >
                    {videoEnabled
                      ? "📹"
                      : "🚫"}
                  </button>
                )}

                <button
                  className="call-control danger"
                  onClick={() =>
                    cleanup(
                      "ended"
                    )
                  }
                >
                  ☎
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function CallsPage({
  user,
}) {
  const [
    calls,
    setCalls,
  ] = useState([]);

  useEffect(() => {
    const load =
      async () => {
        const {
          data,
        } =
          await supabase
            .from(
              "calls"
            )
            .select("*")
            .or(
              `caller_id.eq.${user.id},callee_id.eq.${user.id}`
            )
            .order(
              "created_at",
              {
                ascending: false,
              }
            )
            .limit(50);

        setCalls(
          data || []
        );
      };

    load();
  }, [user.id]);

  return (
    <div className="workspace-page">
      <div className="workspace-heading">
        <div>
          <h2>
            Calls
          </h2>

          <p>
            Voice and video call history.
          </p>
        </div>
      </div>

      <div className="call-history-list">
        {calls.length ===
          0 && (
          <div className="empty-state">
            <div className="empty-state-icon">
              ☎
            </div>

            <strong>
              No calls yet
            </strong>

            <span>
              Calls will appear
              here.
            </span>
          </div>
        )}

        {calls.map(
          (call) => (
            <div
              key={call.id}
              className="call-history-item"
            >
              <div className="call-history-icon">
                {call.type ===
                "video"
                  ? "📹"
                  : "☎"}
              </div>

              <div className="call-history-copy">
                <strong>
                  {call.caller_id ===
                  user.id
                    ? "Outgoing call"
                    : "Incoming call"}
                </strong>

                <small>
                  {
                    call.status
                  }{" "}
                  ·{" "}
                  {formatDate(
                    call.created_at
                  )}
                </small>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}

/* ============================================================
   KORA
============================================================ */

function KoraPage({
  user,
  plan,
  subscription,
  planFeatures,
}) {
  const [
    input,
    setInput,
  ] = useState("");

  const [
    messages,
    setMessages,
  ] = useState([
    {
      role: "assistant",
      content:
        "Hi. I'm Kora, your HEXA AI assistant.",
    },
  ]);

  const [
    busy,
    setBusy,
  ] = useState(false);

  const [
    selectedModel,
    setSelectedModel,
  ] = useState("auto");

  const allowedModels =
    Array.isArray(
      planFeatures?.models
    )
      ? planFeatures.models
      : HEXA_PLANS[
          plan
        ]?.models ||
        HEXA_PLANS.free
          .models;

  const usedCredits =
    Number(
      subscription?.kora_used_credits ||
        0
    );

  const totalCredits =
    Number(
      subscription?.kora_monthly_credits ||
        planFeatures?.kora_monthly_credits ||
        500
    );

  const remainingCredits =
    Math.max(
      0,
      totalCredits -
        usedCredits
    );

  const send =
    async () => {
      const text =
        input.trim();

      if (
        !text ||
        busy
      ) {
        return;
      }

      if (
        remainingCredits <=
        0
      ) {
        alert(
          "Your Kora credits are exhausted. Upgrade your plan for more credits."
        );
        return;
      }

      const nextMessages = [
        ...messages,
        {
          role: "user",
          content:
            text,
        },
      ];

      setMessages(
        nextMessages
      );

      setInput("");
      setBusy(true);

      try {
        if (!KORA_API_URL) {
          throw new Error(
            "VITE_KORA_API_URL is not configured."
          );
        }

        const response =
          await fetch(
            KORA_API_URL,
            {
              method:
                "POST",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body:
                JSON.stringify({
                  user_id:
                    user.id,
                  plan:
                    plan ||
                    "free",
                  model:
                    selectedModel ===
                    "auto"
                      ? undefined
                      : selectedModel,
                  messages:
                    nextMessages,
                  capabilities: {
                    webSearch:
                      Boolean(
                        planFeatures?.kora_web_search ||
                          planFeatures?.webSearch
                      ),
                    fileAnalysis:
                      Boolean(
                        planFeatures?.kora_file_analysis ||
                          planFeatures?.fileAnalysis
                      ),
                    advancedReasoning:
                      Boolean(
                        planFeatures?.kora_advanced_reasoning ||
                          planFeatures?.advancedReasoning
                      ),
                  },
                }),
            }
          );

        if (!response.ok) {
          throw new Error(
            `Kora request failed: ${response.status}`
          );
        }

        const data =
          await response.json();

        const answer =
          data?.text ||
          data?.answer ||
          data?.output ||
          data?.message ||
          "Kora could not generate a response.";

        setMessages(
          (current) => [
            ...current,
            {
              role:
                "assistant",
              content:
                answer,
            },
          ]
        );
      } catch (error) {
        setMessages(
          (current) => [
            ...current,
            {
              role:
                "assistant",
              content:
                getErrorMessage(
                  error
                ),
            },
          ]
        );
      } finally {
        setBusy(false);
      }
    };

  return (
    <div className="kora-page">
      <div className="kora-header">
        <div className="kora-avatar">
          ✦
        </div>

        <div>
          <h2>
            Kora
          </h2>

          <p>
            {HEXA_PLANS[
              plan
            ]?.name ||
              "HEXA Free"}{" "}
            ·{" "}
            {remainingCredits.toLocaleString()}{" "}
            credits remaining
          </p>
        </div>
      </div>

      <div className="kora-toolbar">
        <label>
          Model
          <select
            value={
              selectedModel
            }
            onChange={(event) =>
              setSelectedModel(
                event.target
                  .value
              )
            }
          >
            <option value="auto">
              Automatic
            </option>

            {allowedModels.map(
              (model) => (
                <option
                  key={model}
                  value={model}
                >
                  {model}
                </option>
              )
            )}
          </select>
        </label>

        <div className="kora-capability-chips">
          {planFeatures?.kora_web_search ||
          planFeatures?.webSearch ? (
            <span>
              Web search
            </span>
          ) : null}

          {planFeatures?.kora_file_analysis ||
          planFeatures?.fileAnalysis ? (
            <span>
              File analysis
            </span>
          ) : null}

          {planFeatures?.kora_advanced_reasoning ||
          planFeatures?.advancedReasoning ? (
            <span>
              Advanced reasoning
            </span>
          ) : null}
        </div>
      </div>

      <div className="kora-messages">
        {messages.map(
          (
            message,
            index
          ) => (
            <div
              key={index}
              className={
                message.role ===
                "user"
                  ? "kora-message user"
                  : "kora-message"
              }
            >
              {
                message.content
              }
            </div>
          )
        )}

        {busy && (
          <div className="kora-message">
            Kora is thinking…
          </div>
        )}
      </div>

      <div className="kora-composer">
        <textarea
          value={input}
          onChange={(event) =>
            setInput(
              event.target
                .value
            )
          }
          placeholder="Ask Kora anything…"
          onKeyDown={(
            event
          ) => {
            if (
              event.key ===
                "Enter" &&
              !event.shiftKey
            ) {
              event.preventDefault();
              send();
            }
          }}
        />

        <button
          className="primary-button"
          onClick={send}
          disabled={busy}
        >
          Send
        </button>
      </div>
    </div>
  );
}

/* ============================================================
   SETTINGS
============================================================ */

function SettingsPage({
  user,
  profile,
  setProfile,
  plan,
  subscription,
  planFeatures,
  onTheme,
  onCheckout,
  onOpenPricing,
}) {
  const [
    name,
    setName,
  ] = useState(
    profile?.full_name ||
      ""
  );

  const [
    username,
    setUsername,
  ] = useState(
    profile?.username ||
      ""
  );

  const [
    about,
    setAbout,
  ] = useState(
    profile?.about ||
      ""
  );

  const [
    avatarUrl,
    setAvatarUrl,
  ] = useState(
    profile?.avatar_url ||
      ""
  );

  const [
    saving,
    setSaving,
  ] = useState(false);

  const avatarRef =
    useRef(null);

  const save =
    async () => {
      setSaving(true);

      try {
        const {
          data,
          error,
        } =
          await supabase
            .from(
              "profiles"
            )
            .update({
              full_name:
                name.trim() ||
                null,
              username:
                username.trim() ||
                profile.username,
              about:
                about.trim() ||
                null,
              avatar_url:
                avatarUrl ||
                null,
              updated_at:
                new Date().toISOString(),
            })
            .eq(
              "id",
              user.id
            )
            .select(
              "id,email,created_at,username,full_name,avatar_url,updated_at,display_name,about,phone"
            )
            .single();

        if (error) {
          throw error;
        }

        setProfile(
          data
        );

        alert(
          "Profile updated."
        );
      } catch (error) {
        alert(
          getErrorMessage(
            error
          )
        );
      } finally {
        setSaving(false);
      }
    };

  const uploadAvatar =
    async (
      event
    ) => {
      const file =
        event.target.files?.[0];

      if (!file) {
        return;
      }

      const path =
        [
          user.id,
          "avatar",
          `${Date.now()}-${safeFileName(
            file.name
          )}`,
        ].join("/");

      const {
        error,
      } =
        await supabase.storage
          .from(
            STORAGE_BUCKET
          )
          .upload(
            path,
            file,
            {
              upsert:
                false,
              contentType:
                file.type,
            }
          );

      if (error) {
        alert(
          getErrorMessage(
            error
          )
        );
        return;
      }

      const {
        data,
      } =
        supabase.storage
          .from(
            STORAGE_BUCKET
          )
          .getPublicUrl(
            path
          );

      setAvatarUrl(
        data.publicUrl
      );

      event.target.value =
        "";
    };

  const chosenTheme =
    (themeId) => {
      const theme =
        THEMES.find(
          (item) =>
            item.id ===
            themeId
        );

      if (
        theme?.premium &&
        !planFeatures?.premium_themes &&
        !planFeatures?.premiumThemes
      ) {
        alert(
          "This is a premium theme. Upgrade to Plus, Pro or Ultra."
        );
        return;
      }

      onTheme(
        themeId
      );
    };

  return (
    <div className="workspace-page">
      <div className="workspace-heading">
        <div>
          <h2>
            Settings
          </h2>

          <p>
            Account, plan, appearance and
            profile.
          </p>
        </div>
      </div>

      <div className="settings-layout">
        <section className="settings-card">
          <h3>
            Your plan
          </h3>

          <div className="account-plan-card">
            <div>
              <strong>
                {HEXA_PLANS[
                  plan
                ]?.name ||
                  "HEXA Free"}
              </strong>

              <small>
                {subscription?.kora_monthly_credits ||
                  planFeatures?.kora_monthly_credits ||
                  500}{" "}
                Kora credits / period
              </small>
            </div>

            {plan !==
              "ultra" && (
              <button
                className="primary-button"
                onClick={
                  onOpenPricing
                }
              >
                Upgrade
              </button>
            )}
          </div>

          <div className="plan-summary">
            <span>
              Current models
            </span>

            <div className="pricing-models">
              {(
                planFeatures?.models ||
                HEXA_PLANS[
                  plan
                ]?.models ||
                []
              ).map(
                (model) => (
                  <span
                    key={
                      model
                    }
                    className="plan-chip"
                  >
                    {
                      model
                    }
                  </span>
                )
              )}
            </div>
          </div>
        </section>

        <section className="settings-card">
          <h3>
            Profile
          </h3>

          <div className="settings-avatar-editor">
            <Avatar
              url={
                avatarUrl
              }
              name={
                name ||
                username ||
                "HEXA User"
              }
              size="xl"
            />

            <button
              className="secondary-button"
              onClick={() =>
                avatarRef.current?.click()
              }
            >
              Change photo
            </button>

            <input
              ref={avatarRef}
              type="file"
              accept="image/*"
              hidden
              onChange={
                uploadAvatar
              }
            />
          </div>

          <label className="field">
            <span>
              Full name
            </span>

            <input
              value={
                name
              }
              onChange={(
                event
              ) =>
                setName(
                  event.target
                    .value
                )
              }
            />
          </label>

          <label className="field">
            <span>
              Username
            </span>

            <input
              value={
                username
              }
              onChange={(
                event
              ) =>
                setUsername(
                  event.target
                    .value
                    .toLowerCase()
                    .replace(
                      /[^a-z0-9_]/g,
                      ""
                    )
                )
              }
            />
          </label>

          <label className="field">
            <span>
              About
            </span>

            <textarea
              value={
                about
              }
              onChange={(
                event
              ) =>
                setAbout(
                  event.target
                    .value
                )
              }
              maxLength={200}
            />
          </label>

          <button
            className="primary-button"
            onClick={
              save
            }
            disabled={
              saving
            }
          >
            {saving
              ? "Saving…"
              : "Save profile"}
          </button>
        </section>

        <section className="settings-card">
          <h3>
            Themes
          </h3>

          <div className="theme-grid">
            {THEMES.map(
              (
                theme
              ) => (
                <button
                  key={
                    theme.id
                  }
                  className="theme-card"
                  onClick={() =>
                    chosenTheme(
                      theme.id
                    )
                  }
                >
                  <span
                    className={`theme-preview theme-${theme.id}`}
                  />

                  <strong>
                    {
                      theme.name
                    }
                  </strong>

                  {theme.premium && (
                    <small>
                      PRO+
                    </small>
                  )}
                </button>
              )
            )}
          </div>
        </section>

        <section className="settings-card">
          <h3>
            Subscription
          </h3>

          <p className="settings-description">
            Upgrade HEXA through your
            Stripe checkout endpoint.
          </p>

          <div className="subscription-actions">
            <button
              className="primary-button"
              onClick={
                onOpenPricing
              }
            >
              View all plans
            </button>

            {plan !==
              "ultra" && (
              <button
                className="secondary-button"
                onClick={() =>
                  onCheckout(
                    plan ===
                    "free"
                      ? "plus"
                      : plan ===
                          "plus"
                        ? "pro"
                        : "ultra",
                    "month"
                  )
                }
              >
                Upgrade now
              </button>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

/* ============================================================
   APP
============================================================ */

function AuthenticatedHEXA({
  user,
  profile,
  setProfile,
}) {
  const [
    activePage,
    setActivePage,
  ] = useState("chat");

  const [
    plan,
    setPlan,
  ] = useState("free");

  const [
    subscription,
    setSubscription,
  ] = useState(null);

  const [
    planFeatures,
    setPlanFeatures,
  ] = useState(
    HEXA_PLANS.free
  );

  const [
    theme,
    setTheme,
  ] = useState(
    localStorage.getItem(
      THEME_KEY
    ) ||
      "midnight"
  );

  const [
    activeCall,
    setActiveCall,
  ] = useState(null);

  const [
    incomingCall,
    setIncomingCall,
  ] = useState(null);

  const [
    online,
    setOnline,
  ] = useState(true);

  const loadSubscription =
    useCallback(
      async () => {
        const {
          data,
          error,
        } =
          await supabase
            .from(
              "subscriptions"
            )
            .select("*")
            .eq(
              "user_id",
              user.id
            )
            .maybeSingle();

        if (error) {
          console.error(
            "Subscription:",
            error
          );
        }

        const nextPlan =
          data?.plan ||
          "free";

        setSubscription(
          data ||
            {
              user_id:
                user.id,
              plan: "free",
              status:
                "active",
              kora_monthly_credits:
                500,
              kora_used_credits:
                0,
            }
        );

        setPlan(
          nextPlan
        );

        const {
          data: features,
        } =
          await supabase
            .from(
              "hexa_plan_features"
            )
            .select("*")
            .eq(
              "plan",
              nextPlan
            )
            .maybeSingle();

        setPlanFeatures(
          features ||
            HEXA_PLANS[
              nextPlan
            ] ||
            HEXA_PLANS.free
        );
      },
      [user.id]
    );

  useEffect(() => {
    loadSubscription();
  }, [
    loadSubscription,
  ]);

  useEffect(() => {
    document.documentElement.dataset.theme =
      theme;

    document.body.dataset.theme =
      theme;

    localStorage.setItem(
      THEME_KEY,
      theme
    );
  }, [theme]);

  useEffect(() => {
    const touch =
      async () => {
        await supabase.rpc(
          "hexa_touch_presence",
          {
            p_state:
              "online",
          }
        );
      };

    touch();

    const interval =
      setInterval(
        touch,
        60000
      );

    const visibility =
      () => {
        setOnline(
          document.visibilityState ===
            "visible"
        );

        if (
          document.visibilityState ===
          "visible"
        ) {
          touch();
        }
      };

    document.addEventListener(
      "visibilitychange",
      visibility
    );

    return () => {
      clearInterval(
        interval
      );

      document.removeEventListener(
        "visibilitychange",
        visibility
      );

      supabase.rpc(
        "hexa_touch_presence",
        {
          p_state:
            "offline",
        }
      );
    };
  }, []);

  useEffect(() => {
    const channel =
      supabase.channel(
        `hexa-incoming-calls-${user.id}`
      );

    channel.on(
      "postgres_changes",
      {
        event:
          "INSERT",
        schema:
          "public",
        table:
          "calls",
        filter:
          `callee_id=eq.${user.id}`,
      },
      (payload) => {
        if (
          payload.new
            ?.status ===
          "ringing"
        ) {
          setIncomingCall(
            payload.new
          );
        }
      }
    );

    channel.on(
      "postgres_changes",
      {
        event:
          "UPDATE",
        schema:
          "public",
        table:
          "calls",
        filter:
          `callee_id=eq.${user.id}`,
      },
      (payload) => {
        if (
          [
            "declined",
            "ended",
            "cancelled",
          ].includes(
            payload.new
              ?.status
          )
        ) {
          setIncomingCall(
            (current) =>
              current?.id ===
              payload.new.id
                ? null
                : current
          );
        }
      }
    );

    channel.subscribe();

    return () => {
      supabase.removeChannel(
        channel
      );
    };
  }, [user.id]);

  const startCall =
    async ({
      conversationId,
      calleeId,
      type,
    }) => {
      if (!calleeId) {
        alert(
          "There is no callable recipient in this chat."
        );
        return;
      }

      if (
        !planFeatures?.advanced_calls &&
        !planFeatures?.advancedCalls &&
        plan ===
          "free"
      ) {
        alert(
          "Upgrade to Plus, Pro or Ultra for enhanced calling."
        );
        return;
      }

      const {
        data,
        error,
      } =
        await supabase.rpc(
          "hexa_create_call",
          {
            p_callee_id:
              calleeId,
            p_conversation_id:
              isUuid(
                conversationId
              )
                ? conversationId
                : null,
            p_external:
              false,
            p_type:
              type,
          }
        );

      if (error) {
        alert(
          getErrorMessage(
            error
          )
        );
        return;
      }

      setActiveCall(
        Array.isArray(
          data
        )
          ? data[0]
          : data
      );
    };

  const checkout =
    async (
      targetPlan,
      interval
    ) => {
      if (
        targetPlan ===
        "free"
      ) {
        return;
      }

      if (
        !STRIPE_CHECKOUT_URL
      ) {
        alert(
          "VITE_STRIPE_CHECKOUT_URL is not configured."
        );
        return;
      }

      try {
        const response =
          await fetch(
            STRIPE_CHECKOUT_URL,
            {
              method:
                "POST",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body:
                JSON.stringify({
                  userId:
                    user.id,
                  plan:
                    targetPlan,
                  interval,
                  email:
                    user.email ||
                    "",
                }),
            }
          );

        const data =
          await response.json();

        if (
          !response.ok
        ) {
          throw new Error(
            data?.error ||
              "Stripe checkout failed."
          );
        }

        if (
          data?.url
        ) {
          window.location.href =
            data.url;
          return;
        }

        throw new Error(
          "Stripe checkout did not return a URL."
        );
      } catch (error) {
        alert(
          getErrorMessage(
            error
          )
        );
      }
    };

  const acceptCall =
    () => {
      if (!incomingCall) {
        return;
      }

      setActiveCall(
        incomingCall
      );

      setIncomingCall(
        null
      );
    };

  const declineCall =
    async () => {
      if (!incomingCall) {
        return;
      }

      try {
        await supabase.rpc(
          "hexa_decline_call",
          {
            p_call_id:
              incomingCall.id,
          }
        );
      } catch {
        await supabase
          .from(
            "calls"
          )
          .update({
            status:
              "declined",
            ended_at:
              new Date().toISOString(),
            ended_reason:
              "declined",
          })
          .eq(
            "id",
            incomingCall.id
          );
      }

      setIncomingCall(
        null
      );
    };

  const signOut =
    async () => {
      await supabase.auth.signOut();
    };

  const title =
    {
      chat:
        "Chat",
      status:
        "Status",
      groups:
        "Groups",
      communities:
        "Communities",
      channels:
        "Channels",
      calls:
        "Calls",
      kora:
        "Kora",
      pricing:
        "Plans",
      settings:
        "Settings",
    }[
      activePage
    ];

  return (
    <div className="hexa-app">
      <Sidebar
        activePage={
          activePage
        }
        setActivePage={
          setActivePage
        }
        profile={
          profile
        }
        online={
          online
        }
        plan={
          plan
        }
      />

      <div className="hexa-main">
        <Topbar
          title={
            title
          }
          subtitle={`${HEXA_PLANS[plan]?.name || "HEXA Free"} · HEXA workspace`}
          onSignOut={
            signOut
          }
        />

        <div className="hexa-workspace">
          {activePage ===
            "chat" && (
            <ChatPage
              user={user}
              subscription={
                subscription
              }
              planFeatures={
                planFeatures
              }
              onOpenCall={
                startCall
              }
            />
          )}

          {activePage ===
            "status" && (
            <StatusPage
              user={user}
              planFeatures={
                planFeatures
              }
            />
          )}

          {activePage ===
            "groups" && (
            <GroupsPage
              user={
                user
              }
            />
          )}

          {activePage ===
            "communities" && (
            <CommunitiesPage />
          )}

          {activePage ===
            "channels" && (
            <ChannelsPage />
          )}

          {activePage ===
            "calls" && (
            <CallsPage
              user={
                user
              }
            />
          )}

          {activePage ===
            "kora" && (
            <KoraPage
              user={
                user
              }
              plan={
                plan
              }
              subscription={
                subscription
              }
              planFeatures={
                planFeatures
              }
            />
          )}

          {activePage ===
            "pricing" && (
            <PricingPage
              plan={
                plan
              }
              onCheckout={
                checkout
              }
            />
          )}

          {activePage ===
            "settings" && (
            <SettingsPage
              user={
                user
              }
              profile={
                profile
              }
              setProfile={
                setProfile
              }
              plan={
                plan
              }
              subscription={
                subscription
              }
              planFeatures={
                planFeatures
              }
              onTheme={
                setTheme
              }
              onCheckout={
                checkout
              }
              onOpenPricing={() =>
                setActivePage(
                  "pricing"
                )
              }
            />
          )}
        </div>
      </div>

      {incomingCall && (
        <div className="incoming-call-banner">
          <div className="incoming-call-copy">
            <strong>
              Incoming{" "}
              {incomingCall.type ===
              "video"
                ? "video"
                : "voice"}{" "}
              call
            </strong>

            <span>
              Someone is calling you.
            </span>
          </div>

          <div className="incoming-call-actions">
            <button
              className="call-control danger"
              onClick={
                declineCall
              }
            >
              ✕
            </button>

            <button
              className="call-control accept"
              onClick={
                acceptCall
              }
            >
              ✓
            </button>
          </div>
        </div>
      )}

      {activeCall && (
        <WebRTCCall
          call={
            activeCall
          }
          user={
            user
          }
          onClose={() =>
            setActiveCall(
              null
            )
          }
        />
      )}
    </div>
  );
}

/* ============================================================
   ROOT
============================================================ */

export default function App() {
  const [
    session,
    setSession,
  ] = useState(null);

  const [
    profile,
    setProfile,
  ] = useState(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    startupError,
    setStartupError,
  ] = useState("");

  useEffect(() => {
    let mounted =
      true;

    const bootstrap =
      async () => {
        try {
          const {
            data,
            error,
          } =
            await supabase.auth.getSession();

          if (error) {
            throw error;
          }

          if (
            !mounted
          ) {
            return;
          }

          setSession(
            data.session ||
              null
          );

          if (
            data.session?.user
          ) {
            const userProfile =
              await ensureHexaProfile(
                data.session
                  .user
              );

            if (
              mounted
            ) {
              setProfile(
                userProfile
              );
            }
          }
        } catch (error) {
          console.error(
            "HEXA startup:",
            error
          );

          if (
            mounted
          ) {
            setStartupError(
              getErrorMessage(
                error
              )
            );
          }
        } finally {
          if (
            mounted
          ) {
            setLoading(
              false
            );
          }
        }
      };

    bootstrap();

    const {
      data: listener,
    } =
      supabase.auth.onAuthStateChange(
        async (
          _event,
          nextSession
        ) => {
          if (
            !mounted
          ) {
            return;
          }

          setSession(
            nextSession
          );

          if (
            nextSession?.user
          ) {
            const userProfile =
              await ensureHexaProfile(
                nextSession
                  .user
              );

            if (
              mounted
            ) {
              setProfile(
                userProfile
              );
            }
          } else {
            setProfile(
              null
            );
          }
        }
      );

    return () => {
      mounted = false;

      listener.subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="hexa-loading-screen">
        <div className="hexa-loading-logo">
          H
        </div>

        <strong>
          Loading HEXA…
        </strong>

        <span>
          Connecting securely.
        </span>
      </div>
    );
  }

  if (startupError) {
    return (
      <div className="hexa-error-screen">
        <div className="error-card">
          <div className="error-icon">
            !
          </div>

          <h2>
            HEXA couldn't start
          </h2>

          <p>
            {
              startupError
            }
          </p>

          <button
            className="primary-button"
            onClick={() =>
              window.location.reload()
            }
          >
            Reload HEXA
          </button>
        </div>
      </div>
    );
  }

  if (!session?.user) {
    return (
      <AuthScreen />
    );
  }

  if (!profile) {
    return (
      <div className="hexa-loading-screen">
        <div className="hexa-loading-logo">
          H
        </div>

        <strong>
          Preparing your profile…
        </strong>

        <span>
          Setting up your HEXA account.
        </span>
      </div>
    );
  }

  return (
    <AuthenticatedHEXA
      user={
        session.user
      }
      profile={
        profile
      }
      setProfile={
        setProfile
      }
    />
  );
}