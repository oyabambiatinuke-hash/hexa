import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createRoot } from "react-dom/client";
import { createClient } from "@supabase/supabase-js";
import "./index.css";

/* =========================================================
   HEXA CONFIG
   ========================================================= */

const APP_NAME = "HEXA";
const MEDIA_BUCKET = "hexa-media";
const CALL_RATE_KOBO_PER_SECOND = 30;
const MAX_ATTACHMENT_MB = 50;

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL;

const SUPABASE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: "pkce",
    },
  }
);

/* =========================================================
   THEMES / LANGUAGES
   ========================================================= */

const THEMES = {
  Cosmic: {
    primary: "#8b5cf6",
    secondary: "#2563eb",
    glow: "rgba(124,58,237,.30)",
    background: "#080b13",
    panel: "#0c101a",
  },
  Arctic: {
    primary: "#38bdf8",
    secondary: "#0ea5e9",
    glow: "rgba(14,165,233,.28)",
    background: "#071017",
    panel: "#0b151e",
  },
  Emerald: {
    primary: "#10b981",
    secondary: "#059669",
    glow: "rgba(16,185,129,.28)",
    background: "#07110e",
    panel: "#0b1713",
  },
  Sunset: {
    primary: "#f97316",
    secondary: "#ef4444",
    glow: "rgba(249,115,22,.28)",
    background: "#130b08",
    panel: "#19100d",
  },
  Cyber: {
    primary: "#06b6d4",
    secondary: "#8b5cf6",
    glow: "rgba(6,182,212,.28)",
    background: "#060b11",
    panel: "#0a1119",
  },
  Nebula: {
    primary: "#ec4899",
    secondary: "#8b5cf6",
    glow: "rgba(236,72,153,.28)",
    background: "#100710",
    panel: "#160c17",
  },
};

const ACCENTS = {
  Violet: "#8b5cf6",
  Blue: "#3b82f6",
  Cyan: "#06b6d4",
  Green: "#22c55e",
  Orange: "#f97316",
  Pink: "#ec4899",
};

const LANGUAGES = [
  ["en", "English"],
  ["yo", "Yorùbá"],
  ["ig", "Igbo"],
  ["ha", "Hausa"],
  ["fr", "Français"],
  ["es", "Español"],
  ["pt", "Português"],
  ["de", "Deutsch"],
  ["it", "Italiano"],
  ["nl", "Nederlands"],
  ["sv", "Svenska"],
  ["no", "Norsk"],
  ["da", "Dansk"],
  ["fi", "Suomi"],
  ["is", "Íslenska"],
  ["pl", "Polski"],
  ["cs", "Čeština"],
  ["sk", "Slovenčina"],
  ["sl", "Slovenščina"],
  ["hr", "Hrvatski"],
  ["sr", "Српски"],
  ["bs", "Bosanski"],
  ["bg", "Български"],
  ["ro", "Română"],
  ["hu", "Magyar"],
  ["el", "Ελληνικά"],
  ["sq", "Shqip"],
  ["uk", "Українська"],
  ["ru", "Русский"],
  ["be", "Беларуская"],
  ["lt", "Lietuvių"],
  ["lv", "Latviešu"],
  ["et", "Eesti"],
  ["tr", "Türkçe"],
  ["ar", "العربية"],
  ["he", "עברית"],
  ["fa", "فارسی"],
  ["ur", "اردو"],
  ["hi", "हिन्दी"],
  ["bn", "বাংলা"],
  ["pa", "ਪੰਜਾਬੀ"],
  ["gu", "ગુજરાતી"],
  ["mr", "मराठी"],
  ["ne", "नेपाली"],
  ["si", "සිංහල"],
  ["ta", "தமிழ்"],
  ["te", "తెలుగు"],
  ["kn", "ಕನ್ನಡ"],
  ["ml", "മലയാളം"],
  ["as", "অসমীয়া"],
  ["or", "ଓଡ଼ିଆ"],
  ["am", "አማርኛ"],
  ["sw", "Kiswahili"],
  ["zu", "isiZulu"],
  ["xh", "isiXhosa"],
  ["af", "Afrikaans"],
  ["so", "Soomaali"],
  ["fil", "Filipino"],
  ["id", "Bahasa Indonesia"],
  ["ms", "Bahasa Melayu"],
  ["vi", "Tiếng Việt"],
  ["th", "ไทย"],
  ["km", "ខ្មែរ"],
  ["my", "မြန်မာ"],
  ["zh", "中文"],
  ["ja", "日本語"],
  ["ko", "한국어"],
  ["mn", "Монгол"],
  ["kk", "Қазақша"],
  ["uz", "O‘zbek"],
  ["az", "Azərbaycan"],
  ["hy", "Հայերեն"],
  ["ka", "ქართული"],
  ["cy", "Cymraeg"],
  ["ga", "Gaeilge"],
  ["ca", "Català"],
  ["eu", "Euskara"],
  ["gl", "Galego"],
  ["eo", "Esperanto"],
  ["la", "Latina"],
];

/* =========================================================
   EMOJI
   ========================================================= */

const EMOJIS = [
  "😀","😃","😄","😁","😆","😅","😂","🤣","😊","😇","🙂","🙃","😉","😌",
  "😍","🥰","😘","😗","😙","😚","😋","😛","😝","😜","🤪","🤨","🧐","🤓",
  "😎","🤩","🥳","😏","😒","😞","😔","😟","😕","🙁","☹️","😣","😖","😫",
  "😩","🥺","😢","😭","😤","😠","😡","🤬","🤯","😳","🥵","🥶","😱","😨",
  "😰","😥","😓","🤗","🤔","🤭","🤫","🤥","😶","😐","😑","😬","🙄","😯",
  "😦","😧","😮","😲","🥱","😴","🤤","😪","😵","🤐","🥴","🤢","🤮","🤧",
  "😷","🤒","🤕","🤑","🤠","😈","👿","👹","👺","🤡","💩","👻","💀","☠️",
  "👽","👾","🤖","🎃","😺","😸","😹","😻","😼","😽","🙀","😿","😾",
  "🙈","🙉","🙊","💋","💌","💘","💝","💖","💗","💓","💞","💕","💟","❣️",
  "💔","❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💯","💥","💫","💦",
  "💨","💣","💬","👋","🤚","🖐️","✋","🖖","👌","🤏","✌️","🤞","🤟","🤘",
  "🤙","👈","👉","👆","👇","☝️","👍","👎","✊","👊","🤛","🤜","👏","🙌",
  "👐","🤲","🤝","🙏","✍️","💅","🤳","💪","🧠","🫀","🫶","👀","👁️","👄",
  "👂","👃","🫦","👶","🧒","👦","👧","🧑","👨","👩","🧔","👵","👴","🙍",
  "🙎","🙅","🙆","💁","🙋","🧏","🙇","🤦","🤷","👮","🕵️","💂","🥷","👷",
  "🤴","👸","👳","👲","🎅","🤰","🤱","🧘","🏃","🚶","💃","🕺","👯","🗣️",
  "👤","👥","👫","👬","👭","💏","💑","👪","🐶","🐱","🐭","🐹","🐰","🦊",
  "🐻","🐼","🐨","🐯","🦁","🐮","🐷","🐸","🐵","🐔","🐧","🐦","🐤","🦄",
  "🐝","🦋","🐌","🐞","🐜","🕷️","🐢","🐍","🦎","🦖","🦕","🐙","🦑","🦀",
  "🐠","🐟","🐡","🐬","🐳","🐋","🦈","🐊","🐘","🦏","🦛","🐪","🐫","🌸",
  "🌹","🌺","🌻","🌼","🌷","🌱","🌲","🌳","🌴","🌵","🍀","🌿","☀️","🌤️",
  "⛅","🌧️","⛈️","❄️","☃️","🌈","⭐","🌟","✨","⚡","🔥","🌙","☁️","🍏",
  "🍎","🍐","🍊","🍋","🍌","🍉","🍇","🍓","🫐","🍈","🍒","🥝","🍅","🥑",
  "🍕","🍔","🍟","🌭","🍿","🍩","🍪","🎂","🍰","🍫","🍭","☕","🍺","⚽",
  "🏀","🏈","⚾","🎾","🏐","🏆","🥇","🎮","🎲","🎯","🎨","🎬","🎤","🎧",
  "🎼","🎹","🥁","📱","💻","⌨️","🖥️","🖨️","📷","📹","🎥","📞","☎️","🔒",
  "🔑","💡","📌","📍","📎","📁","📂","📝","📚","📖","✉️","📨","📩","✅",
  "❌","⚠️","❗","❓","‼️","⁉️","⭕","🚀","🎉","🎊","❤️‍🔥","❤️‍🩹",
  "👍🏻","👍🏼","👍🏽","👍🏾","👍🏿","👏🏻","👏🏼","👏🏽","👏🏾","👏🏿",
  "🙏🏻","🙏🏼","🙏🏽","🙏🏾","🙏🏿","👋🏻","👋🏼","👋🏽","👋🏾","👋🏿",
];

/* =========================================================
   HELPERS
   ========================================================= */

const makeId = () =>
  crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}`;

const now = () =>
  new Date().toISOString();

const formatTime = (value) => {
  if (!value) return "";
  return new Date(value).toLocaleTimeString(
    [],
    {
      hour: "numeric",
      minute: "2-digit",
    }
  );
};

const formatDate = (value) => {
  if (!value) return "";
  return new Date(value).toLocaleString();
};

const formatDuration = (seconds = 0) => {
  const n = Math.max(
    0,
    Math.floor(seconds)
  );
  const minutes = Math.floor(n / 60);
  const remaining = n % 60;
  return `${minutes}:${String(
    remaining
  ).padStart(2, "0")}`;
};

const initials = (name = "HEXA") =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((x) =>
      x[0]?.toUpperCase()
    )
    .join("") || "H";

const truncate = (
  value,
  length = 80
) => {
  const text = String(value || "");
  return text.length > length
    ? `${text.slice(0, length)}…`
    : text;
};

const displayName = (profile) =>
  profile?.display_name ||
  profile?.full_name ||
  profile?.username ||
  "HEXA User";

const messagePreview = (
  message
) => {
  if (!message) return "";
  if (
    message.message_type ===
    "voice"
  )
    return "🎙 Voice message";
  if (
    message.message_type ===
    "image"
  )
    return "📷 Photo";
  if (
    message.message_type ===
    "video"
  )
    return "🎥 Video";
  if (
    message.message_type ===
    "audio"
  )
    return "🎵 Audio";
  if (
    message.message_type ===
    "file"
  )
    return `📎 ${
      message.metadata?.fileName ||
      "File"
    }`;
  if (
    message.message_type ===
    "gif"
  )
    return "GIF";
  return (
    message.content ||
    ""
  );
};

const getLocal = (
  key,
  fallback
) => {
  try {
    const raw =
      localStorage.getItem(
        `hexa:${key}`
      );
    return raw
      ? JSON.parse(raw)
      : fallback;
  } catch {
    return fallback;
  }
};

const setLocal = (
  key,
  value
) => {
  try {
    localStorage.setItem(
      `hexa:${key}`,
      JSON.stringify(value)
    );
  } catch {}
};

/* =========================================================
   AVATAR
   ========================================================= */

function Avatar({
  src,
  name,
  size = 48,
  online = false,
}) {
  return (
    <div
      className="avatar-wrap"
      style={{
        width: size,
        height: size,
      }}
    >
      {src ? (
        <img
          src={src}
          alt=""
          className="avatar"
        />
      ) : (
        <div className="avatar avatar-fallback">
          {initials(name)}
        </div>
      )}

      {online && (
        <span className="online-dot" />
      )}
    </div>
  );
}

/* =========================================================
   AUTH
   ========================================================= */

function AuthScreen({
  onAuthenticated,
}) {
  const [mode, setMode] =
    useState("signin");

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [name, setName] =
    useState("");

  const [username, setUsername] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const submit = async (
    event
  ) => {
    event.preventDefault();

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      if (mode === "reset") {
        const {
          error: resetError,
        } =
          await supabase.auth.resetPasswordForEmail(
            email.trim(),
            {
              redirectTo:
                window.location.origin,
            }
          );

        if (resetError)
          throw resetError;

        setSuccess(
          "Password reset instructions have been sent."
        );
        return;
      }

      if (mode === "signin") {
        const {
          data,
          error: loginError,
        } =
          await supabase.auth.signInWithPassword(
            {
              email:
                email.trim(),
              password,
            }
          );

        if (loginError)
          throw loginError;

        onAuthenticated?.(
          data.session
        );
        return;
      }

      const cleanUsername =
        username
          .trim()
          .toLowerCase();

      if (
        !/^[a-z0-9_]{3,30}$/.test(
          cleanUsername
        )
      ) {
        throw new Error(
          "Username must contain 3–30 letters, numbers or underscores."
        );
      }

      const {
        data,
        error: signupError,
      } =
        await supabase.auth.signUp(
          {
            email:
              email.trim(),
            password,
            options: {
              data: {
                username:
                  cleanUsername,
                full_name:
                  name.trim(),
                display_name:
                  name.trim(),
              },
            },
          }
        );

      if (signupError)
        throw signupError;

      if (data.session) {
        onAuthenticated?.(
          data.session
        );
      } else {
        setSuccess(
          "Account created. Check your email if confirmation is enabled."
        );
      }
    } catch (errorObject) {
      const message =
        errorObject?.message ||
        "Something went wrong.";

      if (
        message
          .toLowerCase()
          .includes(
            "duplicate"
          ) ||
        message
          .toLowerCase()
          .includes(
            "unique"
          )
      ) {
        setError(
          "That username or account information is already being used."
        );
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  const continueGoogle =
    async () => {
      setLoading(true);

      const {
        error: googleError,
      } =
        await supabase.auth.signInWithOAuth(
          {
            provider: "google",
            options: {
              redirectTo:
                window.location.origin,
            },
          }
        );

      if (googleError) {
        setError(
          googleError.message
        );
        setLoading(false);
      }
    };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="brand-large">
          <div className="brand-mark">
            H
          </div>

          <div>
            <h1>HEXA</h1>
            <span>
              HEXA NEXUS
            </span>
          </div>
        </div>

        {mode !== "reset" && (
          <div className="auth-tabs">
            <button
              className={
                mode === "signin"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setMode("signin")
              }
            >
              Sign in
            </button>

            <button
              className={
                mode === "signup"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setMode("signup")
              }
            >
              Create account
            </button>
          </div>
        )}

        {mode !== "reset" && (
          <>
            <button
              className="google-button"
              onClick={
                continueGoogle
              }
              disabled={loading}
            >
              <strong>
                G
              </strong>
              Continue with Google
            </button>

            <div className="or">
              <span />
              OR
              <span />
            </div>
          </>
        )}

        <form onSubmit={submit}>
          {mode === "signup" && (
            <>
              <label>
                Full name
              </label>

              <input
                value={name}
                onChange={(event) =>
                  setName(
                    event.target
                      .value
                  )
                }
                required
              />

              <label>
                Username
              </label>

              <input
                value={username}
                onChange={(event) =>
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
                placeholder="your_username"
                required
              />
            </>
          )}

          <label>
            Email
          </label>

          <input
            type="email"
            value={email}
            onChange={(event) =>
              setEmail(
                event.target.value
              )
            }
            required
          />

          {mode !== "reset" && (
            <>
              <label>
                Password
              </label>

              <input
                type="password"
                value={password}
                onChange={(event) =>
                  setPassword(
                    event.target
                      .value
                  )
                }
                required
                minLength={6}
              />
            </>
          )}

          {error && (
            <div className="error-box">
              {error}
            </div>
          )}

          {success && (
            <div className="success-box">
              {success}
            </div>
          )}

          <button
            className="primary-button"
            disabled={loading}
          >
            {loading
              ? "Please wait…"
              : mode === "signup"
              ? "Create account"
              : mode === "reset"
              ? "Send reset link"
              : "Sign in"}
          </button>
        </form>

        {mode === "signin" && (
          <div className="auth-switch">
            <button
              className="text-button"
              onClick={() =>
                setMode("reset")
              }
            >
              Forgot password?
            </button>
          </div>
        )}

        {mode === "reset" && (
          <div className="auth-switch">
            <button
              className="text-button"
              onClick={() =>
                setMode("signin")
              }
            >
              ← Back to sign in
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* =========================================================
   MAIN APP
   ========================================================= */

function HexaApp({
  session,
}) {
  const userId =
    session?.user?.id;

  const [section, setSection] =
    useState("chat");

  const [profile, setProfile] =
    useState(null);

  const [conversations, setConversations] =
    useState([]);

  const [activeConversationId, setActiveConversationId] =
    useState(null);

  const [messages, setMessages] =
    useState([]);

  const [communities, setCommunities] =
    useState([]);

  const [channels, setChannels] =
    useState([]);

  const [moments, setMoments] =
    useState([]);

  const [notifications, setNotifications] =
    useState([]);

  const [wallet, setWallet] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [profileOpen, setProfileOpen] =
    useState(false);

  const [settingsOpen, setSettingsOpen] =
    useState(false);

  const [toast, setToast] =
    useState("");

  const toastRef =
    useRef(null);

  const [theme, setTheme] =
    useState(
      () =>
        getLocal(
          "theme",
          "Cosmic"
        )
    );

  const [accent, setAccent] =
    useState(
      () =>
        getLocal(
          "accent",
          "Violet"
        )
    );

  const [language, setLanguage] =
    useState(
      () =>
        getLocal(
          "language",
          "en"
        )
    );

  const flash = useCallback(
    (message) => {
      setToast(message);

      clearTimeout(
        toastRef.current
      );

      toastRef.current =
        setTimeout(() => {
          setToast("");
        }, 3000);
    },
    []
  );

  useEffect(() => {
    setLocal(
      "theme",
      theme
    );
  }, [theme]);

  useEffect(() => {
    setLocal(
      "accent",
      accent
    );
  }, [accent]);

  useEffect(() => {
    setLocal(
      "language",
      language
    );
  }, [language]);

  useEffect(() => {
    const colors =
      THEMES[
        theme
      ] ||
      THEMES.Cosmic;

    document.documentElement.style.setProperty(
      "--hexa-primary",
      ACCENTS[
        accent
      ] ||
        colors.primary
    );

    document.documentElement.style.setProperty(
      "--hexa-secondary",
      colors.secondary
    );

    document.documentElement.style.setProperty(
      "--hexa-glow",
      colors.glow
    );

    document.documentElement.style.setProperty(
      "--hexa-background",
      colors.background
    );

    document.documentElement.style.setProperty(
      "--hexa-panel",
      colors.panel
    );
  }, [
    theme,
    accent,
  ]);

  /* =======================================================
     LOAD PROFILE
     ======================================================= */

  const loadProfile =
    useCallback(
      async () => {
        if (!userId)
          return null;

        const {
          data,
          error,
        } =
          await supabase
            .from(
              "profiles"
            )
            .select("*")
            .eq(
              "id",
              userId
            )
            .maybeSingle();

        if (error) {
          console.error(
            "Profile load:",
            error
          );
          return null;
        }

        if (data) {
          setProfile(data);
          return data;
        }

        const metadata =
          session?.user
            ?.user_metadata ||
          {};

        const email =
          session?.user
            ?.email ||
          "";

        let base =
          String(
            metadata.username ||
              email.split(
                "@"
              )[0] ||
              "hexauser"
          )
            .toLowerCase()
            .replace(
              /[^a-z0-9_]/g,
              ""
            )
            .slice(
              0,
              24
            ) ||
          "hexauser";

        let candidate =
          base;

        for (
          let index = 0;
          index < 25;
          index += 1
        ) {
          const {
            data: existing,
          } =
            await supabase
              .from(
                "profiles"
              )
              .select("id")
              .eq(
                "username",
                candidate
              )
              .maybeSingle();

          if (!existing)
            break;

          candidate =
            `${base.slice(
              0,
              20
            )}${Math.floor(
              1000 +
                Math.random() *
                  8999
            )}`;
        }

        const payload = {
          id: userId,
          email,
          username:
            candidate,
          full_name:
            metadata.full_name ||
            metadata.name ||
            candidate,
          display_name:
            metadata.full_name ||
            metadata.name ||
            candidate,
          updated_at:
            now(),
        };

        const {
          data: created,
          error: createError,
        } =
          await supabase
            .from(
              "profiles"
            )
            .upsert(
              payload,
              {
                onConflict:
                  "id",
              }
            )
            .select()
            .single();

        if (createError) {
          console.error(
            "Profile create:",
            createError
          );
          return null;
        }

        setProfile(created);
        return created;
      },
      [
        userId,
        session,
      ]
    );

  /* =======================================================
     ENSURE USER DATA
     ======================================================= */

  const ensureUserRows =
    useCallback(
      async () => {
        if (!userId)
          return;

        await Promise.allSettled([
          supabase
            .from(
              "user_presence"
            )
            .upsert({
              user_id:
                userId,
              state:
                "online",
              last_seen_at:
                now(),
              updated_at:
                now(),
            }),

          supabase
            .from("wallets")
            .upsert(
              {
                user_id:
                  userId,
                currency:
                  "NGN",
              },
              {
                onConflict:
                  "user_id",
                ignoreDuplicates:
                  true,
              }
            ),

          supabase
            .from(
              "notification_preferences"
            )
            .upsert(
              {
                user_id:
                  userId,
                messages:
                  true,
                groups:
                  true,
                calls:
                  true,
                status:
                  true,
                channels:
                  true,
                sounds:
                  true,
              },
              {
                onConflict:
                  "user_id",
                ignoreDuplicates:
                  true,
              }
            ),

          supabase
            .from(
              "user_privacy_settings"
            )
            .upsert(
              {
                user_id:
                  userId,
                last_seen:
                  true,
                online_status:
                  true,
                profile_photo:
                  true,
                read_receipts:
                  true,
              },
              {
                onConflict:
                  "user_id",
                ignoreDuplicates:
                  true,
              }
            ),
        ]);
      },
      [userId]
    );

  /* =======================================================
     CONVERSATIONS
     ======================================================= */

  const loadConversations =
    useCallback(
      async () => {
        if (!userId)
          return;

        const {
          data,
          error,
        } =
          await supabase
            .from(
              "conversation_members"
            )
            .select(
              `
                conversation_id,
                is_admin,
                joined_at,
                conversations (
                  id,
                  type,
                  name,
                  created_by,
                  created_at,
                  updated_at,
                  avatar_url,
                  owner_id,
                  theme,
                  user_a,
                  user_b
                )
              `
            )
            .eq(
              "user_id",
              userId
            )
            .order(
              "joined_at",
              {
                ascending:
                  false,
              }
            );

        if (error) {
          console.error(
            "Conversation load:",
            error
          );
          setConversations([]);
          return;
        }

        const result = [];

        for (
          const row of
            data || []
        ) {
          const conversation =
            row.conversations;

          if (!conversation)
            continue;

          const item = {
            ...conversation,
            is_admin:
              row.is_admin,
          };

          if (
            conversation.type ===
            "direct"
          ) {
            const otherId =
              conversation.user_a ===
              userId
                ? conversation.user_b
                : conversation.user_a;

            if (otherId) {
              const {
                data:
                  otherProfile,
              } =
                await supabase
                  .from(
                    "profiles"
                  )
                  .select(
                    `
                      id,
                      username,
                      full_name,
                      display_name,
                      avatar_url,
                      about
                    `
                  )
                  .eq(
                    "id",
                    otherId
                  )
                  .maybeSingle();

              item.otherProfile =
                otherProfile;
            }
          }

          const {
            data:
              lastMessage,
          } =
            await supabase
              .from(
                "messages"
              )
              .select(
                `
                  id,
                  content,
                  message_type,
                  created_at,
                  sender_id,
                  status,
                  metadata,
                  deleted_at
                `
              )
              .eq(
                "conversation_id",
                conversation.id
              )
              .order(
                "created_at",
                {
                  ascending:
                    false,
                }
              )
              .limit(1)
              .maybeSingle();

          item.lastMessage =
            lastMessage ||
            null;

          result.push(item);
        }

        result.sort(
          (a, b) =>
            new Date(
              b.lastMessage
                ?.created_at ||
                b.updated_at ||
                b.created_at
            ) -
            new Date(
              a.lastMessage
                ?.created_at ||
                a.updated_at ||
                a.created_at
            )
        );

        setConversations(
          result
        );
      },
      [userId]
    );

  /* =======================================================
     MESSAGES
     ======================================================= */

  const loadMessages =
    useCallback(
      async (
        conversationId
      ) => {
        if (
          !conversationId ||
          !userId
        ) {
          setMessages([]);
          return;
        }

        const {
          data,
          error,
        } =
          await supabase
            .from(
              "messages"
            )
            .select(
              `
                *,
                sender:sender_id (
                  id,
                  username,
                  full_name,
                  display_name,
                  avatar_url
                ),
                reply_to:reply_to_id (
                  id,
                  sender_id,
                  content,
                  message_type,
                  metadata,
                  sender:sender_id (
                    id,
                    username,
                    full_name,
                    display_name,
                    avatar_url
                  )
                ),
                attachments:message_attachments (
                  id,
                  file_name,
                  file_path,
                  file_url,
                  mime_type,
                  file_size,
                  width,
                  height,
                  duration,
                  thumbnail_url
                ),
                reactions:message_reactions (
                  user_id,
                  reaction
                )
              `
            )
            .eq(
              "conversation_id",
              conversationId
            )
            .order(
              "created_at",
              {
                ascending:
                  true,
              }
            );

        if (error) {
          console.error(
            "Messages:",
            error
          );
          setMessages([]);
          return;
        }

        setMessages(
          data || []
        );

        const unread =
          (data || []).filter(
            (message) =>
              message.sender_id !==
              userId
          );

        if (
          unread.length
        ) {
          await Promise.allSettled(
            unread.map(
              (message) =>
                supabase
                  .from(
                    "message_reads"
                  )
                  .upsert({
                    message_id:
                      message.id,
                    user_id:
                      userId,
                    read_at:
                      now(),
                  })
            )
          );

          await supabase
            .from(
              "messages"
            )
            .update({
              read_at:
                now(),
              status:
                "read",
            })
            .in(
              "id",
              unread.map(
                (message) =>
                  message.id
              )
            );
        }
      },
      [userId]
    );

  /* =======================================================
     OTHER DATA
     ======================================================= */

  const loadCommunities =
    useCallback(
      async () => {
        if (!userId)
          return;

        const {
          data,
        } =
          await supabase
            .from(
              "community_members"
            )
            .select(
              `
                community_id,
                is_admin,
                communities (
                  id,
                  name,
                  description,
                  created_by,
                  created_at
                )
              `
            )
            .eq(
              "user_id",
              userId
            );

        setCommunities(
          (data || [])
            .filter(
              (row) =>
                row.communities
            )
            .map(
              (row) => ({
                ...row.communities,
                is_admin:
                  row.is_admin,
              })
            )
        );
      },
      [userId]
    );

  const loadChannels =
    useCallback(
      async () => {
        if (!userId)
          return;

        const {
          data,
        } =
          await supabase
            .from(
              "channel_followers"
            )
            .select(
              `
                channel_id,
                notifications,
                channel_profiles (
                  channel_id,
                  handle,
                  description,
                  avatar_url,
                  verified
                )
              `
            )
            .eq(
              "user_id",
              userId
            );

        const result = [];

        for (
          const row of
            data || []
        ) {
          const {
            data:
              conversation,
          } =
            await supabase
              .from(
                "conversations"
              )
              .select(
                `
                  id,
                  name,
                  avatar_url,
                  type
                `
              )
              .eq(
                "id",
                row.channel_id
              )
              .maybeSingle();

          result.push({
            id:
              row.channel_id,
            name:
              conversation?.name ||
              row
                .channel_profiles
                ?.handle ||
              "Channel",
            handle:
              row
                .channel_profiles
                ?.handle,
            description:
              row
                .channel_profiles
                ?.description,
            avatar_url:
              row
                .channel_profiles
                ?.avatar_url ||
              conversation?.avatar_url,
            verified:
              !!row
                .channel_profiles
                ?.verified,
            notifications:
              row.notifications,
          });
        }

        setChannels(result);
      },
      [userId]
    );

  const loadMoments =
    useCallback(
      async () => {
        if (!userId)
          return;

        const {
          data,
        } =
          await supabase
            .from(
              "statuses"
            )
            .select(
              `
                *,
                profile:user_id (
                  id,
                  username,
                  full_name,
                  display_name,
                  avatar_url
                )
              `
            )
            .gt(
              "expires_at",
              now()
            )
            .order(
              "created_at",
              {
                ascending:
                  false,
              }
            );

        const result = [];

        for (
          const moment of
            data || []
        ) {
          const {
            data: view,
          } =
            await supabase
              .from(
                "status_views"
              )
              .select(
                "status_id"
              )
              .eq(
                "status_id",
                moment.id
              )
              .eq(
                "viewer_id",
                userId
              )
              .maybeSingle();

          result.push({
            ...moment,
            seen:
              !!view,
          });
        }

        setMoments(
          result
        );
      },
      [userId]
    );

  const loadNotifications =
    useCallback(
      async () => {
        if (!userId)
          return;

        const {
          data,
        } =
          await supabase
            .from(
              "notifications"
            )
            .select("*")
            .eq(
              "user_id",
              userId
            )
            .order(
              "created_at",
              {
                ascending:
                  false,
              }
            )
            .limit(100);

        setNotifications(
          data || []
        );
      },
      [userId]
    );

  const loadWallet =
    useCallback(
      async () => {
        if (!userId)
          return;

        const {
          data,
        } =
          await supabase
            .from("wallets")
            .select("*")
            .eq(
              "user_id",
              userId
            )
            .maybeSingle();

        setWallet(data);
      },
      [userId]
    );

  /* =======================================================
     INITIAL LOAD
     ======================================================= */

  useEffect(() => {
    let cancelled = false;

    const boot =
      async () => {
        if (!userId)
          return;

        setLoading(true);

        await loadProfile();
        await ensureUserRows();

        await Promise.all([
          loadConversations(),
          loadCommunities(),
          loadChannels(),
          loadMoments(),
          loadNotifications(),
          loadWallet(),
        ]);

        if (!cancelled) {
          setLoading(false);
        }
      };

    boot();

    return () => {
      cancelled = true;
    };
  }, [
    userId,
    loadProfile,
    ensureUserRows,
    loadConversations,
    loadCommunities,
    loadChannels,
    loadMoments,
    loadNotifications,
    loadWallet,
  ]);

  useEffect(() => {
    if (
      activeConversationId
    ) {
      loadMessages(
        activeConversationId
      );
    } else {
      setMessages([]);
    }
  }, [
    activeConversationId,
    loadMessages,
  ]);

  /* =======================================================
     REALTIME
     ======================================================= */

  useEffect(() => {
    if (!userId)
      return;

    const channel =
      supabase.channel(
        `hexa-live-${userId}`
      );

    channel
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
        },
        async (payload) => {
          const row =
            payload.new ||
            payload.old;

          if (
            row?.conversation_id ===
            activeConversationId
          ) {
            await loadMessages(
              activeConversationId
            );
          }

          await loadConversations();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
        },
        () =>
          loadNotifications()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "statuses",
        },
        () =>
          loadMoments()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(
        channel
      );
    };
  }, [
    userId,
    activeConversationId,
    loadMessages,
    loadConversations,
    loadNotifications,
    loadMoments,
  ]);

  /* =======================================================
     DIRECT CHAT
     ======================================================= */

  const createDirectChat =
    useCallback(
      async (target) => {
        if (
          !target?.id ||
          target.id ===
            userId
        )
          return;

        const {
          data: existing,
        } =
          await supabase
            .from(
              "conversations"
            )
            .select("*")
            .eq(
              "type",
              "direct"
            )
            .or(
              `and(user_a.eq.${userId},user_b.eq.${target.id}),and(user_a.eq.${target.id},user_b.eq.${userId})`
            )
            .maybeSingle();

        if (existing) {
          await loadConversations();

          setActiveConversationId(
            existing.id
          );
          setSection("chat");

          return existing;
        }

        const conversationId =
          makeId();

        const {
          data: created,
          error,
        } =
          await supabase
            .from(
              "conversations"
            )
            .insert({
              id:
                conversationId,
              type:
                "direct",
              user_a:
                userId,
              user_b:
                target.id,
              created_by:
                userId,
              owner_id:
                userId,
            })
            .select()
            .single();

        if (error) {
          flash(
            error.message
          );
          return null;
        }

        const {
          error:
            membersError,
        } =
          await supabase
            .from(
              "conversation_members"
            )
            .insert([
              {
                conversation_id:
                  conversationId,
                user_id:
                  userId,
                is_admin:
                  true,
              },
              {
                conversation_id:
                  conversationId,
                user_id:
                  target.id,
                is_admin:
                  false,
              },
            ]);

        if (membersError) {
          flash(
            membersError.message
          );
          return null;
        }

        await loadConversations();

        setActiveConversationId(
          conversationId
        );

        setSection(
          "chat"
        );

        return created;
      },
      [
        userId,
        loadConversations,
        flash,
      ]
    );

  /* =======================================================
     GROUP
     ======================================================= */

  const createGroup =
    useCallback(
      async ({
        name,
        members = [],
      }) => {
        const cleanName =
          String(
            name || ""
          ).trim();

        if (!cleanName)
          return null;

        const id =
          makeId();

        const {
          data: conversation,
          error,
        } =
          await supabase
            .from(
              "conversations"
            )
            .insert({
              id,
              type:
                "group",
              name:
                cleanName,
              created_by:
                userId,
              owner_id:
                userId,
            })
            .select()
            .single();

        if (error) {
          flash(
            error.message
          );
          return null;
        }

        const memberIds =
          Array.from(
            new Set([
              userId,
              ...members.filter(
                Boolean
              ),
            ])
          );

        const {
          error:
            membersError,
        } =
          await supabase
            .from(
              "conversation_members"
            )
            .insert(
              memberIds.map(
                (memberId) => ({
                  conversation_id:
                    id,
                  user_id:
                    memberId,
                  is_admin:
                    memberId ===
                    userId,
                })
              )
            );

        if (membersError) {
          flash(
            membersError.message
          );
          return null;
        }

        await supabase
          .from(
            "messages"
          )
          .insert({
            id:
              makeId(),
            conversation_id:
              id,
            sender_id:
              userId,
            content:
              `${cleanName} was created.`,
            message_type:
              "system",
            status:
              "sent",
          });

        await loadConversations();

        setActiveConversationId(
          id
        );

        return conversation;
      },
      [
        userId,
        loadConversations,
        flash,
      ]
    );

  /* =======================================================
     SEND MESSAGE
     ======================================================= */

  const sendMessage =
    useCallback(
      async ({
        content = "",
        messageType = "text",
        replyToId = null,
        metadata = {},
        attachment = null,
        forwardedFromId = null,
        expiresAt = null,
        viewOnce = false,
      }) => {
        if (
          !userId ||
          !activeConversationId
        )
          return null;

        if (
          messageType ===
            "text" &&
          !String(
            content
          ).trim()
        ) {
          return null;
        }

        const payload = {
          id:
            makeId(),
          sender_id:
            userId,
          conversation_id:
            activeConversationId,
          content:
            content ||
            null,
          message_type:
            messageType,
          status:
            "sent",
          client_message_id:
            makeId(),
          reply_to_id:
            replyToId ||
            null,
          forwarded_from_id:
            forwardedFromId ||
            null,
          metadata:
            metadata || {},
          expires_at:
            expiresAt ||
            null,
          view_once:
            !!viewOnce,
          delivered_at:
            now(),
        };

        const {
          data: message,
          error,
        } =
          await supabase
            .from(
              "messages"
            )
            .insert(
              payload
            )
            .select()
            .single();

        if (error) {
          flash(
            error.message
          );
          return null;
        }

        if (attachment) {
          await supabase
            .from(
              "message_attachments"
            )
            .insert({
              id:
                makeId(),
              message_id:
                message.id,
              user_id:
                userId,
              file_name:
                attachment.fileName,
              file_path:
                attachment.filePath,
              file_url:
                attachment.fileUrl,
              mime_type:
                attachment.mimeType,
              file_size:
                attachment.fileSize,
              width:
                attachment.width ||
                null,
              height:
                attachment.height ||
                null,
              duration:
                attachment.duration ||
                null,
              thumbnail_url:
                attachment.thumbnailUrl ||
                null,
            });
        }

        await loadMessages(
          activeConversationId
        );

        await loadConversations();

        return message;
      },
      [
        userId,
        activeConversationId,
        loadMessages,
        loadConversations,
        flash,
      ]
    );

  /* =======================================================
     UPLOAD
     ======================================================= */

  const uploadFile =
    useCallback(
      async (
        file,
        folder = "messages"
      ) => {
        if (
          !file ||
          !userId
        )
          return null;

        const sizeMb =
          file.size /
          (1024 * 1024);

        if (
          sizeMb >
          MAX_ATTACHMENT_MB
        ) {
          flash(
            `Maximum file size is ${MAX_ATTACHMENT_MB}MB.`
          );
          return null;
        }

        const extension =
          file.name
            ?.split(".")
            .pop() ||
          "bin";

        const path =
          `${userId}/${folder}/${Date.now()}-${makeId()}.${extension}`;

        const {
          error,
        } =
          await supabase.storage
            .from(
              MEDIA_BUCKET
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
                  undefined,
              }
            );

        if (error) {
          flash(
            error.message
          );
          return null;
        }

        const {
          data,
        } =
          supabase.storage
            .from(
              MEDIA_BUCKET
            )
            .getPublicUrl(
              path
            );

        return {
          filePath:
            path,
          fileUrl:
            data?.publicUrl ||
            "",
          fileName:
            file.name ||
            path
              .split(
                "/"
              )
              .pop(),
          mimeType:
            file.type ||
            "application/octet-stream",
          fileSize:
            file.size,
        };
      },
      [
        userId,
        flash,
      ]
    );

  /* =======================================================
     SEND FILE
     ======================================================= */

  const sendFile =
    useCallback(
      async (file) => {
        if (!file)
          return;

        const uploaded =
          await uploadFile(
            file,
            "messages"
          );

        if (!uploaded)
          return;

        let messageType =
          "file";

        if (
          file.type.startsWith(
            "image/"
          )
        ) {
          messageType =
            "image";
        } else if (
          file.type.startsWith(
            "video/"
          )
        ) {
          messageType =
            "video";
        } else if (
          file.type.startsWith(
            "audio/"
          )
        ) {
          messageType =
            "audio";
        }

        await sendMessage({
          messageType,
          metadata: {
            url:
              uploaded.fileUrl,
            fileName:
              uploaded.fileName,
            mimeType:
              uploaded.mimeType,
            size:
              uploaded.fileSize,
          },
          attachment:
            uploaded,
        });
      },
      [
        uploadFile,
        sendMessage,
      ]
    );

  /* =======================================================
     MESSAGE ACTIONS
     ======================================================= */

  const reactToMessage =
    useCallback(
      async (
        messageId,
        reaction
      ) => {
        const {
          data: existing,
        } =
          await supabase
            .from(
              "message_reactions"
            )
            .select(
              "reaction"
            )
            .eq(
              "message_id",
              messageId
            )
            .eq(
              "user_id",
              userId
            )
            .maybeSingle();

        if (
          existing?.reaction ===
          reaction
        ) {
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
              userId
            );
        } else {
          await supabase
            .from(
              "message_reactions"
            )
            .upsert({
              message_id:
                messageId,
              user_id:
                userId,
              reaction,
            });
        }

        await loadMessages(
          activeConversationId
        );
      },
      [
        userId,
        activeConversationId,
        loadMessages,
      ]
    );

  const deleteForMe =
    useCallback(
      async (
        message
      ) => {
        await supabase
          .from(
            "message_user_actions"
          )
          .upsert({
            message_id:
              message.id,
            user_id:
              userId,
            action:
              "delete_for_me",
          });

        await loadMessages(
          activeConversationId
        );
      },
      [
        userId,
        activeConversationId,
        loadMessages,
      ]
    );

  const deleteForEveryone =
    useCallback(
      async (
        message
      ) => {
        if (
          message.sender_id !==
          userId
        )
          return;

        await supabase
          .from(
            "messages"
          )
          .update({
            deleted_at:
              now(),
            content:
              "This message was deleted.",
          })
          .eq(
            "id",
            message.id
          );

        await loadMessages(
          activeConversationId
        );
      },
      [
        userId,
        activeConversationId,
        loadMessages,
      ]
    );

  const editMessage =
    useCallback(
      async (
        message,
        content
      ) => {
        if (
          message.sender_id !==
          userId
        )
          return;

        await supabase
          .from(
            "messages"
          )
          .update({
            content:
              content.trim(),
            edited_at:
              now(),
          })
          .eq(
            "id",
            message.id
          );

        await loadMessages(
          activeConversationId
        );
      },
      [
        userId,
        activeConversationId,
        loadMessages,
      ]
    );

  const starMessage =
    useCallback(
      async (
        message
      ) => {
        await supabase
          .from(
            "message_user_actions"
          )
          .upsert({
            message_id:
              message.id,
            user_id:
              userId,
            action:
              "star",
          });

        flash(
          "Message starred."
        );
      },
      [
        userId,
        flash,
      ]
    );

  const pinMessage =
    useCallback(
      async (
        message
      ) => {
        const {
          error,
        } =
          await supabase
            .from(
              "message_actions"
            )
            .upsert({
              message_id:
                message.id,
              user_id:
                userId,
              action:
                "pin",
            });

        if (error) {
          flash(
            error.message
          );
          return;
        }

        flash(
          "Message pinned."
        );
      },
      [
        userId,
        flash,
      ]
    );

  const forwardMessage =
    useCallback(
      async (
        message,
        targetConversationId
      ) => {
        if (
          !targetConversationId
        ) {
          flash(
            "Choose a chat to forward this message to."
          );
          return;
        }

        await supabase
          .from(
            "messages"
          )
          .insert({
            id:
              makeId(),
            sender_id:
              userId,
            conversation_id:
              targetConversationId,
            content:
              message.content,
            message_type:
              message.message_type,
            metadata:
              message.metadata ||
              {},
            forwarded_from_id:
              message.id,
            status:
              "sent",
          });

        flash(
          "Message forwarded."
        );
      },
      [
        userId,
        flash,
      ]
    );

  /* =======================================================
     COMMUNITIES
     ======================================================= */

  const createCommunity =
    useCallback(
      async ({
        name,
        description,
      }) => {
        const clean =
          String(
            name || ""
          ).trim();

        if (!clean)
          return;

        const {
          data,
          error,
        } =
          await supabase
            .from(
              "communities"
            )
            .insert({
              name:
                clean,
              description:
                String(
                  description ||
                    ""
                ).trim(),
              created_by:
                userId,
            })
            .select()
            .single();

        if (error) {
          flash(
            error.message
          );
          return;
        }

        await supabase
          .from(
            "community_members"
          )
          .insert({
            community_id:
              data.id,
            user_id:
              userId,
            is_admin:
              true,
          });

        await loadCommunities();
      },
      [
        userId,
        loadCommunities,
        flash,
      ]
    );

  const createCommunityGroup =
    useCallback(
      async ({
        communityId,
        name,
      }) => {
        const group =
          await createGroup({
            name,
            members: [],
          });

        if (!group)
          return;

        await supabase
          .from(
            "community_groups"
          )
          .insert({
            community_id:
              communityId,
            conversation_id:
              group.id,
          });

        await loadCommunities();
      },
      [
        createGroup,
        loadCommunities,
      ]
    );

  /* =======================================================
     CHANNELS
     ======================================================= */

  const createChannel =
    useCallback(
      async ({
        name,
        handle,
        description,
      }) => {
        const channelId =
          makeId();

        const {
          error,
        } =
          await supabase
            .from(
              "conversations"
            )
            .insert({
              id:
                channelId,
              type:
                "channel",
              name:
                name.trim(),
              created_by:
                userId,
              owner_id:
                userId,
            });

        if (error) {
          flash(
            error.message
          );
          return;
        }

        await supabase
          .from(
            "channel_profiles"
          )
          .insert({
            channel_id:
              channelId,
            handle:
              String(
                handle ||
                  name
              )
                .replace(
                  /^@/,
                  ""
                )
                .toLowerCase()
                .replace(
                  /[^a-z0-9_]/g,
                  ""
                ),
            description:
              String(
                description ||
                  ""
              ).trim(),
          });

        await supabase
          .from(
            "channel_admins"
          )
          .insert({
            channel_id:
              channelId,
            user_id:
              userId,
            role:
              "owner",
          });

        await supabase
          .from(
            "channel_followers"
          )
          .insert({
            channel_id:
              channelId,
            user_id:
              userId,
            notifications:
              true,
          });

        await loadChannels();
      },
      [
        userId,
        loadChannels,
        flash,
      ]
    );

  const followChannel =
    useCallback(
      async (
        channelId
      ) => {
        const {
          error,
        } =
          await supabase
            .from(
              "channel_followers"
            )
            .upsert({
              channel_id:
                channelId,
              user_id:
                userId,
              notifications:
                true,
            });

        if (error) {
          flash(
            error.message
          );
          return;
        }

        await loadChannels();

        flash(
          "Channel followed."
        );
      },
      [
        userId,
        loadChannels,
        flash,
      ]
    );

  const createChannelPost =
    useCallback(
      async ({
        channelId,
        text,
        file,
      }) => {
        let mediaUrl =
          null;

        let mediaType =
          null;

        if (file) {
          const uploaded =
            await uploadFile(
              file,
              "channels"
            );

          if (!uploaded)
            return;

          mediaUrl =
            uploaded.fileUrl;

          mediaType =
            uploaded.mimeType;
        }

        const {
          error,
        } =
          await supabase
            .from(
              "channel_posts"
            )
            .insert({
              channel_id:
                channelId,
              author_id:
                userId,
              text:
                text?.trim() ||
                null,
              media_url:
                mediaUrl,
              media_type:
                mediaType,
              metadata: {},
            });

        if (error) {
          flash(
            error.message
          );
        }
      },
      [
        userId,
        uploadFile,
        flash,
      ]
    );

  /* =======================================================
     MOMENTS
     ======================================================= */

  const createMoment =
    useCallback(
      async ({
        text,
        description,
        file,
      }) => {
        let mediaUrl =
          null;

        let mediaType =
          null;

        if (file) {
          const uploaded =
            await uploadFile(
              file,
              "moments"
            );

          if (!uploaded)
            return;

          mediaUrl =
            uploaded.fileUrl;

          mediaType =
            uploaded.mimeType;
        }

        const {
          error,
        } =
          await supabase
            .from(
              "statuses"
            )
            .insert({
              user_id:
                userId,
              text:
                text?.trim() ||
                null,
              description:
                description?.trim() ||
                null,
              media_url:
                mediaUrl,
              media_type:
                mediaType,
              created_at:
                now(),
              expires_at:
                new Date(
                  Date.now() +
                    24 *
                      60 *
                      60 *
                      1000
                ).toISOString(),
              privacy:
                "contacts",
              allow_replies:
                true,
            });

        if (error) {
          flash(
            error.message
          );
          return;
        }

        await loadMoments();
      },
      [
        userId,
        uploadFile,
        loadMoments,
        flash,
      ]
    );

  const viewMoment =
    useCallback(
      async (
        moment
      ) => {
        await supabase
          .from(
            "status_views"
          )
          .upsert({
            status_id:
              moment.id,
            viewer_id:
              userId,
            viewed_at:
              now(),
          });

        await loadMoments();
      },
      [
        userId,
        loadMoments,
      ]
    );

  const reactToMoment =
    useCallback(
      async (
        statusId,
        reaction
      ) => {
        await supabase
          .from(
            "status_reactions"
          )
          .upsert({
            status_id:
              statusId,
            user_id:
              userId,
            reaction,
          });

        flash(
          "Reaction sent."
        );
      },
      [
        userId,
        flash,
      ]
    );

  /* =======================================================
     CALLS
     ======================================================= */

  const [callState, setCallState] =
    useState(null);

  const startCall =
    useCallback(
      async ({
        conversation,
        type,
      }) => {
        const calleeId =
          conversation
            ?.otherProfile
            ?.id;

        if (!calleeId) {
          flash(
            "This call currently requires a direct chat."
          );
          return;
        }

        const {
          data,
          error,
        } =
          await supabase
            .from("calls")
            .insert({
              conversation_id:
                conversation.id,
              caller_id:
                userId,
              callee_id:
                calleeId,
              type,
              status:
                "ringing",
              rate_kobo_per_second:
                CALL_RATE_KOBO_PER_SECOND,
              currency:
                "NGN",
            })
            .select()
            .single();

        if (error) {
          flash(
            error.message
          );
          return;
        }

        setCallState({
          ...data,
          direction:
            "outgoing",
          peer:
            conversation.otherProfile,
        });
      },
      [
        userId,
        flash,
      ]
    );

  /* =======================================================
     RENDER
     ======================================================= */

  const activeConversation =
    conversations.find(
      (conversation) =>
        conversation.id ===
        activeConversationId
    ) || null;

  const unreadCount =
    notifications.filter(
      (item) =>
        !item.read_at
    ).length;

  if (loading) {
    return (
      <LoadingScreen />
    );
  }

  return (
    <div className="hexa-shell">
      <Sidebar
        section={section}
        setSection={
          setSection
        }
        unreadCount={
          unreadCount
        }
        profile={profile}
        onProfile={() =>
          setProfileOpen(true)
        }
        onSettings={() =>
          setSettingsOpen(true)
        }
      />

      <main className="hexa-main">
        {section ===
          "chat" && (
          <ChatWorkspace
            userId={userId}
            profile={profile}
            conversations={
              conversations
            }
            activeConversation={
              activeConversation
            }
            activeConversationId={
              activeConversationId
            }
            setActiveConversationId={
              setActiveConversationId
            }
            messages={
              messages
            }
            sendMessage={
              sendMessage
            }
            sendFile={
              sendFile
            }
            reactToMessage={
              reactToMessage
            }
            deleteForMe={
              deleteForMe
            }
            deleteForEveryone={
              deleteForEveryone
            }
            editMessage={
              editMessage
            }
            starMessage={
              starMessage
            }
            pinMessage={
              pinMessage
            }
            forwardMessage={
              forwardMessage
            }
            createDirectChat={
              createDirectChat
            }
            createGroup={
              createGroup
            }
            flash={flash}
            loadMessages={
              loadMessages
            }
            loadConversations={
              loadConversations
            }
          />
        )}

        {section ===
          "moments" && (
          <MomentsPage
            moments={
              moments
            }
            createMoment={
              createMoment
            }
            viewMoment={
              viewMoment
            }
            reactToMoment={
              reactToMoment
            }
          />
        )}

        {section ===
          "communities" && (
          <CommunitiesPage
            communities={
              communities
            }
            createCommunity={
              createCommunity
            }
            createCommunityGroup={
              createCommunityGroup
            }
          />
        )}

        {section ===
          "channels" && (
          <ChannelsPage
            channels={
              channels
            }
            createChannel={
              createChannel
            }
            createChannelPost={
              createChannelPost
            }
            followChannel={
              followChannel
            }
            userId={userId}
          />
        )}

        {section ===
          "calls" && (
          <CallsPage
            conversations={
              conversations
            }
            startCall={
              startCall
            }
          />
        )}

        {section ===
          "kora" && (
          <KoraPage
            profile={
              profile
            }
            wallet={
              wallet
            }
            flash={flash}
          />
        )}

        {section ===
          "notifications" && (
          <NotificationsPage
            notifications={
              notifications
            }
            reload={
              loadNotifications
            }
          />
        )}

        {section ===
          "wallet" && (
          <WalletPage
            wallet={wallet}
          />
        )}
      </main>

      {profileOpen && (
        <ProfileModal
          profile={
            profile
          }
          userId={
            userId
          }
          uploadFile={
            uploadFile
          }
          onClose={() =>
            setProfileOpen(
              false
            )
          }
          onSaved={
            loadProfile
          }
        />
      )}

      {settingsOpen && (
        <SettingsModal
          userId={
            userId
          }
          profile={
            profile
          }
          theme={
            theme
          }
          setTheme={
            setTheme
          }
          accent={
            accent
          }
          setAccent={
            setAccent
          }
          language={
            language
          }
          setLanguage={
            setLanguage
          }
          onClose={() =>
            setSettingsOpen(
              false
            )
          }
        />
      )}

      {callState && (
        <CallOverlay
          call={
            callState
          }
          userId={
            userId
          }
          onClose={() =>
            setCallState(
              null
            )
          }
          flash={flash}
        />
      )}

      {toast && (
        <div className="hexa-toast">
          {toast}
        </div>
      )}
    </div>
  );
}

/* =========================================================
   SIDEBAR
   ========================================================= */

function Sidebar({
  section,
  setSection,
  unreadCount,
  profile,
  onProfile,
  onSettings,
}) {
  const items = [
    [
      "chat",
      "💬",
      "Chat",
    ],
    [
      "moments",
      "◉",
      "Moments",
    ],
    [
      "communities",
      "👥",
      "Communities",
    ],
    [
      "channels",
      "📡",
      "Channels",
    ],
    [
      "calls",
      "📞",
      "Calls",
    ],
    [
      "kora",
      "✦",
      "Kora",
    ],
    [
      "notifications",
      "🔔",
      "Notifications",
    ],
    [
      "wallet",
      "₦",
      "Wallet",
    ],
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-mark">
          H
        </div>

        <span>HEXA</span>
      </div>

      <nav>
        {items.map(
          ([
            id,
            icon,
            label,
          ]) => (
            <button
              key={id}
              className={
                section ===
                id
                  ? "nav-item active"
                  : "nav-item"
              }
              onClick={() =>
                setSection(id)
              }
            >
              <span className="nav-icon">
                {icon}
              </span>

              <span>
                {label}
              </span>

              {id ===
                "notifications" &&
                unreadCount > 0 && (
                  <span className="notification-badge">
                    {unreadCount >
                    99
                      ? "99+"
                      : unreadCount}
                  </span>
                )}
            </button>
          )
        )}
      </nav>

      <div className="sidebar-bottom">
        <button
          className="nav-item"
          onClick={
            onProfile
          }
        >
          <Avatar
            src={
              profile
                ?.avatar_url
            }
            name={displayName(
              profile
            )}
            size={34}
          />

          <span>
            Profile
          </span>
        </button>

        <button
          className="nav-item"
          onClick={
            onSettings
          }
        >
          <span className="nav-icon">
            ⚙️
          </span>

          <span>
            Settings
          </span>
        </button>
      </div>
    </aside>
  );
}

/* =========================================================
   CHAT WORKSPACE
   ========================================================= */

function ChatWorkspace({
  userId,
  profile,
  conversations,
  activeConversation,
  activeConversationId,
  setActiveConversationId,
  messages,
  sendMessage,
  sendFile,
  reactToMessage,
  deleteForMe,
  deleteForEveryone,
  editMessage,
  starMessage,
  pinMessage,
  forwardMessage,
  createDirectChat,
  createGroup,
  flash,
  loadMessages,
  loadConversations,
}) {
  const [search, setSearch] =
    useState("");

  const [newChatOpen, setNewChatOpen] =
    useState(false);

  const [username, setUsername] =
    useState("");

  const [groupOpen, setGroupOpen] =
    useState(false);

  const filtered =
    conversations.filter(
      (conversation) => {
        const name =
          conversation.type ===
          "direct"
            ? displayName(
                conversation.otherProfile
              )
            : conversation.name ||
              "";

        return name
          .toLowerCase()
          .includes(
            search
              .toLowerCase()
          );
      }
    );

  const findUser =
    async () => {
      const value =
        username
          .trim()
          .replace(
            /^@/,
            ""
          )
          .toLowerCase();

      if (!value)
        return;

      const {
        data,
      } =
        await supabase
          .from(
            "profiles"
          )
          .select(
            `
              id,
              username,
              full_name,
              display_name,
              avatar_url,
              about
            `
          )
          .eq(
            "username",
            value
          )
          .maybeSingle();

      if (!data) {
        flash(
          "That HEXA username was not found."
        );
        return;
      }

      await createDirectChat(
        data
      );

      setUsername("");
      setNewChatOpen(
        false
      );
    };

  return (
    <div className="chat-workspace">
      <section
        className={
          activeConversation
            ? "chat-list mobile-hidden"
            : "chat-list"
        }
      >
        <div className="section-header">
          <div>
            <h1>
              Chats
            </h1>

            <span>
              {
                conversations.length
              }{" "}
              conversations
            </span>
          </div>

          <div className="header-actions">
            <button
              className="icon-button"
              onClick={() =>
                setNewChatOpen(
                  true
                )
              }
            >
              +
            </button>

            <button
              className="icon-button"
              onClick={() =>
                setGroupOpen(
                  true
                )
              }
            >
              👥
            </button>
          </div>
        </div>

        <div className="search-box">
          🔎

          <input
            value={search}
            onChange={(
              event
            ) =>
              setSearch(
                event.target.value
              )
            }
            placeholder="Search chats"
          />
        </div>

        <div className="chat-list-scroll">
          {filtered.length ===
          0 ? (
            <div className="empty-state">
              <div>
                💬
              </div>

              <h3>
                No conversations
              </h3>

              <p>
                Start a new
                conversation.
              </p>
            </div>
          ) : (
            filtered.map(
              (conversation) => (
                <ConversationRow
                  key={
                    conversation.id
                  }
                  conversation={
                    conversation
                  }
                  selected={
                    conversation.id ===
                    activeConversationId
                  }
                  onClick={() =>
                    setActiveConversationId(
                      conversation.id
                    )
                  }
                />
              )
            )
          )}
        </div>
      </section>

      <section
        className={
          activeConversation
            ? "chat-panel mobile-open"
            : "chat-panel"
        }
      >
        {!activeConversation ? (
          <div className="no-chat-selected">
            <div className="hexagon">
              H
            </div>

            <h2>
              HEXA
            </h2>

            <p>
              Select a chat to start
              messaging.
            </p>
          </div>
        ) : (
          <ConversationView
            userId={
              userId
            }
            profile={
              profile
            }
            conversation={
              activeConversation
            }
            conversations={
              conversations
            }
            messages={
              messages
            }
            onBack={() =>
              setActiveConversationId(
                null
              )
            }
            sendMessage={
              sendMessage
            }
            sendFile={
              sendFile
            }
            reactToMessage={
              reactToMessage
            }
            deleteForMe={
              deleteForMe
            }
            deleteForEveryone={
              deleteForEveryone
            }
            editMessage={
              editMessage
            }
            starMessage={
              starMessage
            }
            pinMessage={
              pinMessage
            }
            forwardMessage={
              forwardMessage
            }
            flash={
              flash
            }
            loadMessages={
              loadMessages
            }
            loadConversations={
              loadConversations
            }
          />
        )}
      </section>

      {newChatOpen && (
        <Modal
          title="New chat"
          onClose={() =>
            setNewChatOpen(
              false
            )
          }
        >
          <label>
            HEXA username
          </label>

          <input
            autoFocus
            value={username}
            onChange={(
              event
            ) =>
              setUsername(
                event.target.value
              )
            }
            placeholder="@username"
          />

          <div className="modal-actions">
            <button
              className="secondary-button"
              onClick={() =>
                setNewChatOpen(
                  false
                )
              }
            >
              Cancel
            </button>

            <button
              className="primary-button"
              onClick={
                findUser
              }
            >
              Start chat
            </button>
          </div>
        </Modal>
      )}

      {groupOpen && (
        <GroupModal
          onClose={() =>
            setGroupOpen(
              false
            )
          }
          onCreate={async ({
            name,
          }) => {
            await createGroup(
              {
                name,
                members: [],
              }
            );

            setGroupOpen(
              false
            );
          }}
        />
      )}
    </div>
  );
}

/* =========================================================
   CONVERSATION ROW
   ========================================================= */

function ConversationRow({
  conversation,
  selected,
  onClick,
}) {
  const title =
    conversation.type ===
    "direct"
      ? displayName(
          conversation.otherProfile
        )
      : conversation.name ||
        "Group";

  return (
    <button
      className={
        selected
          ? "conversation-row selected"
          : "conversation-row"
      }
      onClick={onClick}
    >
      <Avatar
        src={
          conversation.type ===
          "direct"
            ? conversation
                .otherProfile
                ?.avatar_url
            : conversation.avatar_url
        }
        name={title}
        size={54}
      />

      <div className="conversation-info">
        <div className="conversation-top">
          <strong>
            {title}
          </strong>

          <span>
            {formatTime(
              conversation
                .lastMessage
                ?.created_at
            )}
          </span>
        </div>

        <div className="conversation-bottom">
          <span>
            {messagePreview(
              conversation.lastMessage
            ) ||
              "No messages yet"}
          </span>
        </div>
      </div>
    </button>
  );
}

/* =========================================================
   CONVERSATION
   ========================================================= */

function ConversationView({
  userId,
  profile,
  conversation,
  conversations,
  messages,
  onBack,
  sendMessage,
  sendFile,
  reactToMessage,
  deleteForMe,
  deleteForEveryone,
  editMessage,
  starMessage,
  pinMessage,
  forwardMessage,
  flash,
  loadMessages,
  loadConversations,
}) {
  const [text, setText] =
    useState("");

  const [replyingTo, setReplyingTo] =
    useState(null);

  const [editingMessage, setEditingMessage] =
    useState(null);

  const [emojiOpen, setEmojiOpen] =
    useState(false);

  const [chatMenuOpen, setChatMenuOpen] =
    useState(false);

  const [searchOpen, setSearchOpen] =
    useState(false);

  const [messageSearch, setMessageSearch] =
    useState("");

  const [selectMode, setSelectMode] =
    useState(false);

  const [selectedMessages, setSelectedMessages] =
    useState([]);

  const [recording, setRecording] =
    useState(false);

  const [recordSeconds, setRecordSeconds] =
    useState(0);

  const [pollOpen, setPollOpen] =
    useState(false);

  const mediaRecorderRef =
    useRef(null);

  const mediaStreamRef =
    useRef(null);

  const chunksRef =
    useRef([]);

  const recorderTimer =
    useRef(null);

  const fileInput =
    useRef(null);

  const listNameRef =
    useRef("");

  const title =
    conversation.type ===
    "direct"
      ? displayName(
          conversation.otherProfile
        )
      : conversation.name ||
        "Group";

  const subtitle =
    conversation.type ===
    "direct"
      ? `@${conversation.otherProfile?.username || "hexauser"}`
      : "Group conversation";

  const filteredMessages =
    messageSearch.trim()
      ? messages.filter(
          (message) =>
            messagePreview(
              message
            )
              .toLowerCase()
              .includes(
                messageSearch
                  .trim()
                  .toLowerCase()
              )
        )
      : messages;

  /* -------------------------------------------------------
     SEND TEXT
     ------------------------------------------------------- */

  const sendText =
    async () => {
      const clean =
        text.trim();

      if (!clean)
        return;

      if (
        editingMessage
      ) {
        await editMessage(
          editingMessage,
          clean
        );

        setEditingMessage(
          null
        );
        setText("");
        return;
      }

      await sendMessage({
        content:
          clean,
        messageType:
          "text",
        replyToId:
          replyingTo?.id ||
          null,
      });

      setText("");
      setReplyingTo(
        null
      );
    };

  /* -------------------------------------------------------
     VOICE MESSAGE
     ------------------------------------------------------- */

  const startRecording =
    async () => {
      if (recording)
        return;

      try {
        const stream =
          await navigator.mediaDevices.getUserMedia(
            {
              audio: true,
            }
          );

        mediaStreamRef.current =
          stream;

        const mimeType =
          MediaRecorder.isTypeSupported(
            "audio/webm;codecs=opus"
          )
            ? "audio/webm;codecs=opus"
            : "audio/webm";

        const recorder =
          new MediaRecorder(
            stream,
            { mimeType }
          );

        mediaRecorderRef.current =
          recorder;

        chunksRef.current =
          [];

        recorder.ondataavailable =
          (
            event
          ) => {
            if (
              event.data?.size
            ) {
              chunksRef.current.push(
                event.data
              );
            }
          };

        recorder.onstop =
          async () => {
            clearInterval(
              recorderTimer.current
            );

            stream
              .getTracks()
              .forEach(
                (track) =>
                  track.stop()
              );

            setRecording(
              false
            );

            const blob =
              new Blob(
                chunksRef.current,
                {
                  type: mimeType,
                }
              );

            chunksRef.current =
              [];

            if (!blob.size)
              return;

            const file =
              new File(
                [
                  blob,
                ],
                `voice-${Date.now()}.webm`,
                {
                  type: mimeType,
                }
              );

            const uploaded =
              await uploadVoice(
                file
              );

            if (!uploaded)
              return;

            await sendMessage({
              messageType:
                "voice",
              metadata: {
                url:
                  uploaded.fileUrl,
                fileName:
                  uploaded.fileName,
                mimeType:
                  uploaded.mimeType,
                duration:
                  recordSeconds,
              },
              attachment:
                uploaded,
              replyToId:
                replyingTo?.id ||
                null,
            });

            setReplyingTo(
              null
            );
            setRecordSeconds(
              0
            );
          };

        recorder.start(250);

        setRecording(
          true
        );

        setRecordSeconds(
          0
        );

        recorderTimer.current =
          setInterval(
            () =>
              setRecordSeconds(
                (value) =>
                  value + 1
              ),
            1000
          );
      } catch (error) {
        flash(
          error?.message ||
            "Microphone access failed."
        );
      }
    };

  const stopRecording =
    () => {
      mediaRecorderRef.current?.stop();
    };

  const cancelRecording =
    () => {
      clearInterval(
        recorderTimer.current
      );

      mediaRecorderRef.current =
        null;

      mediaStreamRef.current
        ?.getTracks()
        .forEach(
          (track) =>
            track.stop()
        );

      chunksRef.current =
        [];

      setRecording(
        false
      );

      setRecordSeconds(
        0
      );
    };

  const uploadVoice =
    async (file) => {
      const path =
        `${userId}/messages/voice-${Date.now()}-${makeId()}.webm`;

      const {
        error,
      } =
        await supabase.storage
          .from(
            MEDIA_BUCKET
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
                file.type,
            }
          );

      if (error) {
        flash(
          error.message
        );
        return null;
      }

      const {
        data,
      } =
        supabase.storage
          .from(
            MEDIA_BUCKET
          )
          .getPublicUrl(
            path
          );

      return {
        filePath:
          path,
        fileUrl:
          data.publicUrl,
        fileName:
          file.name,
        mimeType:
          file.type,
        fileSize:
          file.size,
      };
    };

  const handleFile =
    async (event) => {
      const file =
        event.target.files?.[0];

      event.target.value =
        "";

      if (!file) return;

      await sendFile(file);
    };

  /* -------------------------------------------------------
     SELECTION
     ------------------------------------------------------- */

  const toggleSelected =
    (messageId) => {
      setSelectedMessages(
        (current) =>
          current.includes(
            messageId
          )
            ? current.filter(
                (id) =>
                  id !==
                  messageId
              )
            : [
                ...current,
                messageId,
              ]
      );
    };

  const finishSelect =
    () => {
      setSelectMode(false);
      setSelectedMessages([]);
    };

  /* -------------------------------------------------------
     CHAT ACTIONS
     ------------------------------------------------------- */

  const handleClearChat =
    async () => {
      const confirmed =
        window.confirm(
          "Clear this chat from your account?"
        );

      if (!confirmed)
        return;

      await Promise.all(
        messages.map(
          (message) =>
            supabase
              .from(
                "message_user_actions"
              )
              .upsert({
                message_id:
                  message.id,
                user_id:
                  userId,
                action:
                  "delete_for_me",
              })
        )
      );

      await loadMessages(
        conversation.id
      );

      setChatMenuOpen(
        false
      );

      flash(
        "Chat cleared."
      );
    };

  const handleDeleteChat =
    async () => {
      const confirmed =
        window.confirm(
          "Delete this chat from your chat list?"
        );

      if (!confirmed)
        return;

      const {
        error,
      } =
        await supabase
          .from(
            "conversation_members"
          )
          .delete()
          .eq(
            "conversation_id",
            conversation.id
          )
          .eq(
            "user_id",
            userId
          );

      if (error) {
        flash(
          error.message
        );
        return;
      }

      setChatMenuOpen(
        false
      );

      await loadConversations();

      onBack();
    };

  const handleMute =
    async (
      seconds
    ) => {
      const mutedUntil =
        seconds === null
          ? new Date(
              "2999-12-31T23:59:59Z"
            ).toISOString()
          : new Date(
              Date.now() +
                seconds *
                  1000
            ).toISOString();

      const {
        error,
      } =
        await supabase
          .from(
            "chat_preferences"
          )
          .upsert({
            user_id:
              userId,
            conversation_id:
              conversation.id,
            muted_until:
              mutedUntil,
          });

      if (error) {
        flash(
          error.message
        );
        return;
      }

      setChatMenuOpen(
        false
      );

      flash(
        seconds === null
          ? "Notifications muted forever."
          : "Notifications muted."
      );
    };

  const handleDisappearing =
    async (
      seconds
    ) => {
      const {
        error,
      } =
        await supabase
          .from(
            "chat_preferences"
          )
          .upsert({
            user_id:
              userId,
            conversation_id:
              conversation.id,
            disappearing_seconds:
              seconds,
          });

      if (error) {
        flash(
          error.message
        );
        return;
      }

      setChatMenuOpen(
        false
      );

      flash(
        seconds === 0
          ? "Disappearing messages turned off."
          : "Disappearing messages updated."
      );
    };

  const handleFavourite =
    async () => {
      const {
        error,
      } =
        await supabase
          .from(
            "chat_preferences"
          )
          .upsert({
            user_id:
              userId,
            conversation_id:
              conversation.id,
            favorite:
              true,
          });

      if (error) {
        flash(
          error.message
        );
        return;
      }

      setChatMenuOpen(
        false
      );

      flash(
        "Chat added to favourites."
      );
    };

  const handleList =
    async ({
      action,
      name,
    }) => {
      if (
        action ===
        "add"
      ) {
        const {
          data: folder,
        } =
          await supabase
            .from(
              "chat_folders"
            )
            .select(
              "id,name"
            )
            .eq(
              "user_id",
              userId
            )
            .eq(
              "name",
              name
            )
            .maybeSingle();

        let folderId =
          folder?.id;

        if (!folderId) {
          const {
            data: created,
            error,
          } =
            await supabase
              .from(
                "chat_folders"
              )
              .insert({
                user_id:
                  userId,
                name:
                  name,
              })
              .select()
              .single();

          if (error) {
            flash(
              error.message
            );
            return;
          }

          folderId =
            created.id;
        }

        const {
          error,
        } =
          await supabase
            .from(
              "chat_folder_items"
            )
            .upsert({
              folder_id:
                folderId,
              conversation_id:
                conversation.id,
            });

        if (error) {
          flash(
            error.message
          );
          return;
        }

        flash(
          `Added chat to ${name}.`
        );
        return;
      }

      if (
        action ===
        "create"
      ) {
        if (!name?.trim())
          return;

        const {
          data: created,
          error,
        } =
          await supabase
            .from(
              "chat_folders"
            )
            .insert({
              user_id:
                userId,
              name:
                name.trim(),
            })
            .select()
            .single();

        if (error) {
          flash(
            error.message
          );
          return;
        }

        await supabase
          .from(
            "chat_folder_items"
          )
          .upsert({
            folder_id:
              created.id,
            conversation_id:
              conversation.id,
          });

        flash(
          `Created "${name}" and added this chat.`
        );
      }
    };

  const handleExport =
    async () => {
      const text =
        messages
          .map(
            (message) =>
              `[${formatDate(
                message.created_at
              )}] ${
                message.sender_id ===
                userId
                  ? "You"
                  : displayName(
                      message.sender
                    )
              }: ${messagePreview(
                message
              )}`
          )
          .join("\n");

      const blob =
        new Blob(
          [text],
          {
            type:
              "text/plain;charset=utf-8",
          }
        );

      const url =
        URL.createObjectURL(
          blob
        );

      const anchor =
        document.createElement(
          "a"
        );

      anchor.href =
        url;

      anchor.download =
        `${title.replace(
          /[^a-z0-9-_]+/gi,
          "_"
        )}-chat.txt`;

      anchor.click();

      URL.revokeObjectURL(
        url
      );

      setChatMenuOpen(
        false
      );

      flash(
        "Chat exported."
      );
    };

  const handleCallLink =
    async () => {
      const link =
        `${window.location.origin}/call/${conversation.id}`;

      try {
        await navigator.clipboard.writeText(
          link
        );

        flash(
          "Call link copied."
        );
      } catch {
        flash(
          link
        );
      }

      setChatMenuOpen(
        false
      );
    };

  const handleContactInfo =
    () => {
      setChatMenuOpen(
        false
      );

      if (
        conversation.type ===
        "direct"
      ) {
        alert(
          [
            title,
            `@${conversation.otherProfile?.username || ""}`,
            "",
            conversation.otherProfile
              ?.about ||
              "No about information.",
          ].join("\n")
        );
      } else {
        alert(
          `${title}\n\nGroup information will show members, admins, permissions and invite settings.`
        );
      }
    };

  const handleReport =
    async () => {
      const confirmed =
        window.confirm(
          `Report ${title}?`
        );

      if (!confirmed)
        return;

      await supabase
        .from(
          "security_events"
        )
        .insert({
          user_id:
            userId,
          event_type:
            "chat_report",
          metadata: {
            conversation_id:
              conversation.id,
          },
        });

      setChatMenuOpen(
        false
      );

      flash(
        "Report submitted."
      );
    };

  const handleBlock =
    async () => {
      if (
        conversation.type !==
        "direct"
      ) {
        flash(
          "Blocking is only available for direct contacts."
        );
        return;
      }

      const confirmed =
        window.confirm(
          `Block ${title}?`
        );

      if (!confirmed)
        return;

      await supabase
        .from(
          "security_events"
        )
        .insert({
          user_id:
            userId,
          event_type:
            "block_user",
          metadata: {
            blocked_user_id:
              conversation
                .otherProfile
                ?.id,
            conversation_id:
              conversation.id,
          },
        });

      setChatMenuOpen(
        false
      );

      flash(
        `${title} has been blocked.`
      );
    };

  return (
    <div className="conversation-view">
      {/* HEADER */}

      <header className="conversation-header">
        <button
          className="mobile-back"
          onClick={onBack}
        >
          ←
        </button>

        <Avatar
          src={
            conversation.type ===
            "direct"
              ? conversation
                  .otherProfile
                  ?.avatar_url
              : conversation.avatar_url
          }
          name={title}
          size={46}
        />

        <div className="conversation-title">
          <strong>
            {title}
          </strong>

          <span>
            {subtitle}
          </span>
        </div>

        <div className="conversation-header-actions">
          {conversation.type ===
            "direct" && (
            <>
              <button
                className="icon-button"
                title="Voice call"
              >
                📞
              </button>

              <button
                className="icon-button"
                title="Video call"
              >
                📹
              </button>
            </>
          )}

          {/* =================================================
              THREE-DOT MENU
              ================================================= */}

          <div className="relative-menu">
            <button
              className="icon-button"
              title="More"
              onClick={() =>
                setChatMenuOpen(
                  (value) =>
                    !value
                )
              }
            >
              ⋮
            </button>

            {chatMenuOpen && (
              <ChatHeaderMenu
                conversation={
                  conversation
                }
                onContactInfo={
                  handleContactInfo
                }
                onSearch={() => {
                  setChatMenuOpen(
                    false
                  );
                  setSearchOpen(
                    true
                  );
                }}
                onSelectMessages={() => {
                  setChatMenuOpen(
                    false
                  );
                  setSelectMode(
                    true
                  );
                }}
                onMute={
                  handleMute
                }
                onDisappearing={
                  handleDisappearing
                }
                onFavourite={
                  handleFavourite
                }
                onList={
                  handleList
                }
                onExport={
                  handleExport
                }
                onCloseChat={() => {
                  setChatMenuOpen(
                    false
                  );
                  onBack();
                }}
                onCallLink={
                  handleCallLink
                }
                onNewGroupCall={() => {
                  setChatMenuOpen(
                    false
                  );

                  flash(
                    "New group call started. Select participants from your group."
                  );
                }}
                onReport={
                  handleReport
                }
                onBlock={
                  handleBlock
                }
                onClearChat={
                  handleClearChat
                }
                onDeleteChat={
                  handleDeleteChat
                }
              />
            )}
          </div>
        </div>
      </header>

      {/* SEARCH */}

      {searchOpen && (
        <div className="chat-search-bar">
          <button
            className="icon-button"
            onClick={() => {
              setSearchOpen(
                false
              );
              setMessageSearch(
                ""
              );
            }}
          >
            ←
          </button>

          <input
            autoFocus
            value={
              messageSearch
            }
            onChange={(
              event
            ) =>
              setMessageSearch(
                event.target.value
              )
            }
            placeholder="Search messages"
          />
        </div>
      )}

      {/* SELECT MODE BAR */}

      {selectMode && (
        <div className="select-toolbar">
          <button
            className="icon-button"
            onClick={
              finishSelect
            }
          >
            ←
          </button>

          <strong>
            {selectedMessages.length}{" "}
            selected
          </strong>

          <button
            className="icon-button"
            onClick={async () => {
              for (
                const id of selectedMessages
              ) {
                await deleteForMe({
                  id,
                });
              }

              finishSelect();
            }}
          >
            🗑
          </button>

          <button
            className="icon-button"
            onClick={() => {
              flash(
                "Selected messages can be forwarded or exported."
              );
            }}
          >
            📤
          </button>
        </div>
      )}

      {/* MESSAGES */}

      <div className="message-area">
        {filteredMessages.length ===
        0 ? (
          <div className="empty-chat">
            <div className="empty-chat-icon">
              🔒
            </div>

            <h3>
              Messages are private
            </h3>

            <p>
              Send a message to
              start the
              conversation.
            </p>
          </div>
        ) : (
          filteredMessages.map(
            (message) => (
              <div
                key={
                  message.id
                }
                id={`message-${message.id}`}
                className={
                  selectMode &&
                  selectedMessages.includes(
                    message.id
                  )
                    ? "message-selected-row"
                    : ""
                }
                onClick={
                  selectMode
                    ? () =>
                        toggleSelected(
                          message.id
                        )
                    : undefined
                }
              >
                <MessageBubble
                  message={
                    message
                  }
                  userId={
                    userId
                  }
                  onReply={(
                    target
                  ) =>
                    setReplyingTo(
                      target
                    )
                  }
                  onReact={
                    reactToMessage
                  }
                  onDeleteForMe={
                    deleteForMe
                  }
                  onDeleteForEveryone={
                    deleteForEveryone
                  }
                  onEdit={(
                    target
                  ) => {
                    setEditingMessage(
                      target
                    );
                    setText(
                      target.content ||
                        ""
                    );
                  }}
                  onStar={
                    starMessage
                  }
                  onPin={
                    pinMessage
                  }
                  onForward={
                    forwardMessage
                  }
                  conversations={
                    conversations
                  }
                />
              </div>
            )
          )
        )}
      </div>

      {/* REPLY */}

      {replyingTo && (
        <div className="reply-composer-preview">
          <div className="reply-preview-accent" />

          <div className="reply-preview-content">
            <strong>
              Replying to{" "}
              {replyingTo.sender
                ? displayName(
                    replyingTo.sender
                  )
                : replyingTo.sender_id ===
                  userId
                ? "You"
                : title}
            </strong>

            <span>
              {messagePreview(
                replyingTo
              )}
            </span>
          </div>

          <button
            className="icon-button"
            onClick={() =>
              setReplyingTo(
                null
              )
            }
          >
            ×
          </button>
        </div>
      )}

      {/* EDIT */}

      {editingMessage && (
        <div className="reply-composer-preview">
          <div className="reply-preview-accent" />

          <div className="reply-preview-content">
            <strong>
              Editing message
            </strong>

            <span>
              {truncate(
                editingMessage.content ||
                  "",
                120
              )}
            </span>
          </div>

          <button
            className="icon-button"
            onClick={() => {
              setEditingMessage(
                null
              );
              setText("");
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* COMPOSER */}

      <div className="composer">
        {recording ? (
          <div className="voice-recording-bar">
            <button
              className="icon-button"
              onClick={
                cancelRecording
              }
            >
              🗑
            </button>

            <div className="recording-live">
              <span className="recording-dot" />

              <strong>
                Recording
              </strong>

              <span>
                {formatDuration(
                  recordSeconds
                )}
              </span>
            </div>

            <button
              className="send-voice-button"
              onClick={
                stopRecording
              }
            >
              ➤
            </button>
          </div>
        ) : (
          <>
            <button
              className="icon-button"
              onClick={() =>
                setEmojiOpen(
                  (value) =>
                    !value
                )
              }
            >
              😊
            </button>

            <button
              className="icon-button"
              onClick={() =>
                fileInput.current?.click()
              }
            >
              📎
            </button>

            <input
              ref={fileInput}
              type="file"
              hidden
              accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.txt"
              onChange={
                handleFile
              }
            />

            <textarea
              value={text}
              onChange={(
                event
              ) =>
                setText(
                  event.target.value
                )
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
                  sendText();
                }
              }}
              placeholder={
                editingMessage
                  ? "Edit message…"
                  : "Type a message"
              }
              rows={1}
            />

            {text.trim() ? (
              <button
                className="send-button"
                onClick={
                  sendText
                }
              >
                ➤
              </button>
            ) : (
              <button
                className="icon-button"
                onClick={
                  startRecording
                }
                title="Voice message"
              >
                🎙
              </button>
            )}
          </>
        )}
      </div>

      {emojiOpen && (
        <EmojiPicker
          onSelect={(
            emoji
          ) =>
            setText(
              (value) =>
                `${value}${emoji}`
            )
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
          onCreate={() =>
            setPollOpen(
              false
            )
          }
        />
      )}
    </div>
  );
}

/* =========================================================
   WHATSAPP CHAT THREE-DOT MENU
   ========================================================= */

function ChatHeaderMenu({
  conversation,
  onContactInfo,
  onSearch,
  onSelectMessages,
  onMute,
  onDisappearing,
  onFavourite,
  onList,
  onExport,
  onCloseChat,
  onCallLink,
  onNewGroupCall,
  onReport,
  onBlock,
  onClearChat,
  onDeleteChat,
}) {
  const [
    submenu,
    setSubmenu,
  ] = useState(null);

  const [
    newListName,
    setNewListName,
  ] = useState("");

  const lists = [
    "Family",
    "School",
  ];

  const toggle =
    (name) =>
      setSubmenu(
        (current) =>
          current === name
            ? null
            : name
      );

  const createList =
    async () => {
      const clean =
        newListName.trim();

      if (!clean)
        return;

      await onList?.({
        action:
          "create",
        name: clean,
      });

      setNewListName("");
      setSubmenu(
        null
      );
    };

  return (
    <div
      className="popup-menu whatsapp-chat-menu"
      onClick={(event) =>
        event.stopPropagation()
      }
    >
      <button
        onClick={
          onContactInfo
        }
      >
        <span>👤</span>
        <span>
          Contact info
        </span>
      </button>

      <button
        onClick={
          onSearch
        }
      >
        <span>🔎</span>
        <span>
          Search
        </span>
      </button>

      <button
        onClick={
          onSelectMessages
        }
      >
        <span>☑️</span>
        <span>
          Select messages
        </span>
      </button>

      <div className="submenu-wrap">
        <button
          onClick={() =>
            toggle("mute")
          }
        >
          <span>🔕</span>
          <span>
            Mute notifications
          </span>
          <span className="submenu-arrow">
            ›
          </span>
        </button>

        {submenu ===
          "mute" && (
          <div className="submenu">
            <button
              onClick={() => {
                onMute(
                  60 * 60
                );
              }}
            >
              1 hour
            </button>

            <button
              onClick={() => {
                onMute(
                  8 * 60 * 60
                );
              }}
            >
              8 hours
            </button>

            <button
              onClick={() => {
                onMute(
                  null
                );
              }}
            >
              Always
            </button>
          </div>
        )}
      </div>

      <div className="submenu-wrap">
        <button
          onClick={() =>
            toggle(
              "disappearing"
            )
          }
        >
          <span>⏱</span>

          <span>
            Disappearing messages
          </span>

          <span className="submenu-arrow">
            ›
          </span>
        </button>

        {submenu ===
          "disappearing" && (
          <div className="submenu">
            <button
              onClick={() =>
                onDisappearing(
                  86400
                )
              }
            >
              24 hours
            </button>

            <button
              onClick={() =>
                onDisappearing(
                  604800
                )
              }
            >
              7 days
            </button>

            <button
              onClick={() =>
                onDisappearing(
                  7776000
                )
              }
            >
              90 days
            </button>

            <button
              onClick={() =>
                onDisappearing(
                  0
                )
              }
            >
              Off
            </button>
          </div>
        )}
      </div>

      <button
        onClick={
          onFavourite
        }
      >
        <span>⭐</span>
        <span>
          Add to favourites
        </span>
      </button>

      <div className="submenu-wrap">
        <button
          onClick={() =>
            toggle("lists")
          }
        >
          <span>📁</span>

          <span>
            Add to list
          </span>

          <span className="submenu-arrow">
            ›
          </span>
        </button>

        {submenu ===
          "lists" && (
          <div className="submenu list-submenu">
            {lists.map(
              (list) => (
                <button
                  key={list}
                  onClick={() => {
                    onList({
                      action:
                        "add",
                      name:
                        list,
                    });
                    setSubmenu(
                      null
                    );
                  }}
                >
                  {list}
                </button>
              )
            )}

            <div className="new-list-box">
              <input
                value={
                  newListName
                }
                onChange={(
                  event
                ) =>
                  setNewListName(
                    event
                      .target
                      .value
                  )
                }
                placeholder="New list name"
                onKeyDown={(
                  event
                ) => {
                  if (
                    event.key ===
                    "Enter"
                  ) {
                    createList();
                  }
                }}
              />

              <button
                onClick={
                  createList
                }
              >
                + New list
              </button>
            </div>
          </div>
        )}
      </div>

      <button
        onClick={
          onExport
        }
      >
        <span>📤</span>
        <span>
          Export chat
        </span>
      </button>

      <button
        onClick={
          onCloseChat
        }
      >
        <span>✕</span>
        <span>
          Close chat
        </span>
      </button>

      <button
        onClick={
          onCallLink
        }
      >
        <span>🔗</span>
        <span>
          Send call link
        </span>
      </button>

      <button
        onClick={
          onNewGroupCall
        }
      >
        <span>👥</span>
        <span>
          New group call
        </span>
      </button>

      <div className="menu-divider" />

      <button
        className="danger-menu-item"
        onClick={
          onReport
        }
      >
        <span>⚠️</span>
        <span>
          Report
        </span>
      </button>

      <button
        className="danger-menu-item"
        onClick={
          onBlock
        }
      >
        <span>🚫</span>
        <span>
          Block
        </span>
      </button>

      <button
        className="danger-menu-item"
        onClick={
          onClearChat
        }
      >
        <span>🗑</span>
        <span>
          Clear chat
        </span>
      </button>

      <button
        className="danger-menu-item"
        onClick={
          onDeleteChat
        }
      >
        <span>⌫</span>
        <span>
          Delete chat
        </span>
      </button>
    </div>
  );
}

/* =========================================================
   MESSAGE BUBBLE
   ========================================================= */

function MessageBubble({
  message,
  userId,
  onReply,
  onReact,
  onDeleteForMe,
  onDeleteForEveryone,
  onEdit,
  onStar,
  onPin,
  onForward,
  conversations,
}) {
  const mine =
    message.sender_id ===
    userId;

  const [
    menuOpen,
    setMenuOpen,
  ] = useState(false);

  const [
    reactionOpen,
    setReactionOpen,
  ] = useState(false);

  const [
    audioSpeed,
    setAudioSpeed,
  ] = useState(1);

  const [
    forwardOpen,
    setForwardOpen,
  ] = useState(false);

  const reply =
    message.reply_to;

  const attachment =
    message.attachments?.[0];

  const metadata =
    message.metadata ||
    {};

  const url =
    metadata.url ||
    attachment?.file_url;

  if (
    message.deleted_at
  ) {
    return (
      <div
        className={
          mine
            ? "message-line mine"
            : "message-line"
        }
      >
        <div className="message-bubble deleted">
          🚫 This message
          was deleted
        </div>
      </div>
    );
  }

  return (
    <div
      className={
        mine
          ? "message-line mine"
          : "message-line"
      }
    >
      <div className="message-wrap">
        <div
          className={
            mine
              ? "message-bubble mine"
              : "message-bubble"
          }
        >
          {reply && (
            <div
              className="quoted-message"
              onClick={() => {
                const target =
                  document.getElementById(
                    `message-${reply.id}`
                  );

                target?.scrollIntoView(
                  {
                    behavior:
                      "smooth",
                    block:
                      "center",
                  }
                );

                target?.classList.add(
                  "message-highlight"
                );

                setTimeout(
                  () =>
                    target?.classList.remove(
                      "message-highlight"
                    ),
                  1500
                );
              }}
            >
              <strong>
                {reply.sender
                  ? displayName(
                      reply.sender
                    )
                  : reply.sender_id ===
                    userId
                  ? "You"
                  : "User"}
              </strong>

              <span>
                {messagePreview(
                  reply
                )}
              </span>
            </div>
          )}

          {message.message_type ===
            "image" &&
            url && (
              <img
                src={url}
                alt=""
                className="message-media"
              />
            )}

          {message.message_type ===
            "video" &&
            url && (
              <video
                src={url}
                controls
                className="message-media"
              />
            )}

          {message.message_type ===
            "voice" &&
            url && (
              <div className="voice-message">
                <audio
                  controls
                  src={url}
                  onPlay={(
                    event
                  ) => {
                    event.currentTarget.playbackRate =
                      audioSpeed;
                  }}
                />

                <button
                  className="voice-speed"
                  onClick={() => {
                    setAudioSpeed(
                      audioSpeed ===
                        1
                        ? 1.5
                        : audioSpeed ===
                          1.5
                        ? 2
                        : 1
                    );
                  }}
                >
                  {audioSpeed}×
                </button>
              </div>
            )}

          {(message.message_type ===
            "file" ||
            message.message_type ===
              "audio") &&
            url && (
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="file-message"
              >
                <span>
                  {message.message_type ===
                  "audio"
                    ? "🎵"
                    : "📎"}
                </span>

                <div>
                  <strong>
                    {metadata.fileName ||
                      attachment?.file_name ||
                      "Attachment"}
                  </strong>

                  <small>
                    {metadata.mimeType ||
                      attachment?.mime_type ||
                      ""}
                  </small>
                </div>
              </a>
            )}

          {message.message_type ===
            "gif" &&
            url && (
              <img
                src={url}
                alt="GIF"
                className="message-gif"
              />
            )}

          {message.content &&
            ![
              "system",
              "poll",
            ].includes(
              message.message_type
            ) && (
              <p className="message-text">
                {message.content}
              </p>
            )}

          {message.message_type ===
            "poll" && (
            <div className="message-poll">
              <strong>
                📊 Poll
              </strong>

              <p>
                {message.content}
              </p>
            </div>
          )}

          {message.message_type ===
            "system" && (
            <p className="system-message">
              {message.content}
            </p>
          )}

          <div className="message-meta">
            {message.edited_at && (
              <span>
                edited
              </span>
            )}

            <span>
              {formatTime(
                message.created_at
              )}
            </span>

            {mine && (
              <span
                className={
                  message.status ===
                  "read"
                    ? "message-read"
                    : ""
                }
              >
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
        </div>

        <button
          className="message-more-button"
          onClick={() =>
            setMenuOpen(
              (value) =>
                !value
            )
          }
        >
          ⋮
        </button>

        {menuOpen && (
          <div className="popup-menu message-menu">
            <button
              onClick={() => {
                onReply(
                  message
                );
                setMenuOpen(
                  false
                );
              }}
            >
              ↩ Reply
            </button>

            <button
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(
                    message.content ||
                      ""
                  );
                } catch {}

                setMenuOpen(
                  false
                );
              }}
            >
              📋 Copy
            </button>

            <button
              onClick={() => {
                setForwardOpen(
                  true
                );
                setMenuOpen(
                  false
                );
              }}
            >
              ↗ Forward
            </button>

            <button
              onClick={() => {
                onStar(
                  message
                );
                setMenuOpen(
                  false
                );
              }}
            >
              ⭐ Star
            </button>

            <button
              onClick={() => {
                onPin(
                  message
                );
                setMenuOpen(
                  false
                );
              }}
            >
              📌 Pin
            </button>

            {mine && (
              <button
                onClick={() => {
                  onEdit(
                    message
                  );
                  setMenuOpen(
                    false
                  );
                }}
              >
                ✏️ Edit
              </button>
            )}

            <button
              onClick={() => {
                onDeleteForMe(
                  message
                );
                setMenuOpen(
                  false
                );
              }}
            >
              🗑 Delete for me
            </button>

            {mine && (
              <button
                onClick={() => {
                  onDeleteForEveryone(
                    message
                  );
                  setMenuOpen(
                    false
                  );
                }}
              >
                🚫 Delete for everyone
              </button>
            )}

            <button
              onClick={() => {
                setReactionOpen(
                  true
                );
                setMenuOpen(
                  false
                );
              }}
            >
              😀 React
            </button>
          </div>
        )}

        {reactionOpen && (
          <div className="reaction-picker">
            {[
              "❤️",
              "😂",
              "😮",
              "😢",
              "🙏",
              "👍",
              "🔥",
            ].map(
              (reaction) => (
                <button
                  key={
                    reaction
                  }
                  onClick={() => {
                    onReact(
                      message.id,
                      reaction
                    );
                    setReactionOpen(
                      false
                    );
                  }}
                >
                  {reaction}
                </button>
              )
            )}
          </div>
        )}

        {forwardOpen && (
          <div className="forward-picker">
            <strong>
              Forward to…
            </strong>

            {conversations
              .filter(
                (item) =>
                  item.id !==
                  message.conversation_id
              )
              .slice(
                0,
                8
              )
              .map(
                (item) => (
                  <button
                    key={
                      item.id
                    }
                    onClick={() => {
                      onForward(
                        message,
                        item.id
                      );
                      setForwardOpen(
                        false
                      );
                    }}
                  >
                    {item.type ===
                    "direct"
                      ? displayName(
                          item.otherProfile
                        )
                      : item.name ||
                        "Group"}
                  </button>
                )
              )}

            <button
              onClick={() =>
                setForwardOpen(
                  false
                )
              }
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {message.reactions
        ?.length > 0 && (
        <div className="message-reactions">
          {Object.entries(
            message.reactions.reduce(
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
            )
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
                  onReact(
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
      )}
    </div>
  );
}

/* =========================================================
   EMOJI
   ========================================================= */

function EmojiPicker({
  onSelect,
}) {
  const [search, setSearch] =
    useState("");

  const filtered =
    search.trim()
      ? EMOJIS.filter(
          (emoji) =>
            emoji
              .toLowerCase()
              .includes(
                search
                  .toLowerCase()
              )
        )
      : EMOJIS;

  return (
    <div className="emoji-panel">
      <input
        value={search}
        onChange={(event) =>
          setSearch(
            event.target.value
          )
        }
        placeholder="Search emoji"
      />

      <div className="emoji-grid">
        {filtered.map(
          (emoji, index) => (
            <button
              key={`${emoji}-${index}`}
              onClick={() =>
                onSelect(
                  emoji
                )
              }
            >
              {emoji}
            </button>
          )
        )}
      </div>
    </div>
  );
}

/* =========================================================
   GROUP MODAL
   ========================================================= */

function GroupModal({
  onClose,
  onCreate,
}) {
  const [name, setName] =
    useState("");

  return (
    <Modal
      title="New group"
      onClose={onClose}
    >
      <label>
        Group name
      </label>

      <input
        value={name}
        onChange={(event) =>
          setName(
            event.target.value
          )
        }
        placeholder="Group name"
      />

      <div className="modal-actions">
        <button
          className="secondary-button"
          onClick={onClose}
        >
          Cancel
        </button>

        <button
          className="primary-button"
          onClick={() =>
            onCreate({
              name,
            })
          }
        >
          Create group
        </button>
      </div>
    </Modal>
  );
}

/* =========================================================
   MOMENTS
   ========================================================= */

function MomentsPage({
  moments,
  createMoment,
  viewMoment,
  reactToMoment,
}) {
  const [text, setText] =
    useState("");

  const [description, setDescription] =
    useState("");

  const [file, setFile] =
    useState(null);

  const [viewer, setViewer] =
    useState(null);

  const input =
    useRef(null);

  const publish =
    async () => {
      if (
        !text.trim() &&
        !file
      )
        return;

      await createMoment({
        text,
        description,
        file,
      });

      setText("");
      setDescription("");
      setFile(null);
    };

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>
            Moments
          </h1>

          <p>
            Share photos, videos and
            updates for 24 hours.
          </p>
        </div>
      </header>

      <div className="moment-create-card">
        <strong>
          Create a Moment
        </strong>

        <textarea
          value={text}
          onChange={(event) =>
            setText(
              event.target.value
            )
          }
          placeholder="What's happening?"
        />

        <input
          value={description}
          onChange={(event) =>
            setDescription(
              event.target.value
            )
          }
          placeholder="Description"
        />

        <input
          ref={input}
          hidden
          type="file"
          accept="image/*,video/*"
          onChange={(event) =>
            setFile(
              event.target.files?.[0] ||
                null
            )
          }
        />

        <div className="composer-actions">
          <button
            className="secondary-button"
            onClick={() =>
              input.current?.click()
            }
          >
            📷 Media
          </button>

          <button
            className="primary-button"
            onClick={publish}
          >
            Publish
          </button>
        </div>
      </div>

      {moments.length ===
      0 ? (
        <div className="empty-large">
          <div>◉</div>

          <h2>
            No Moments yet
          </h2>

          <p>
            Your updates will
            appear here.
          </p>
        </div>
      ) : (
        <div className="moments-row">
          {moments.map(
            (moment) => (
              <button
                className={
                  moment.seen
                    ? "moment-card seen"
                    : "moment-card"
                }
                key={
                  moment.id
                }
                onClick={async () => {
                  await viewMoment(
                    moment
                  );
                  setViewer(
                    moment
                  );
                }}
              >
                {moment.media_url ? (
                  <img
                    src={
                      moment.media_url
                    }
                    alt=""
                  />
                ) : (
                  <div className="moment-text-card">
                    {truncate(
                      moment.text ||
                        "Moment",
                      100
                    )}
                  </div>
                )}

                <div className="moment-overlay">
                  <Avatar
                    src={
                      moment
                        .profile
                        ?.avatar_url
                    }
                    name={displayName(
                      moment.profile
                    )}
                    size={32}
                  />

                  <strong>
                    {displayName(
                      moment.profile
                    )}
                  </strong>
                </div>
              </button>
            )
          )}
        </div>
      )}

      {viewer && (
        <MomentViewer
          moment={
            viewer
          }
          onClose={() =>
            setViewer(
              null
            )
          }
          reactToMoment={
            reactToMoment
          }
        />
      )}
    </div>
  );
}

function MomentViewer({
  moment,
  onClose,
  reactToMoment,
}) {
  return (
    <div className="fullscreen-overlay">
      <div className="moment-viewer">
        <button
          className="viewer-close"
          onClick={
            onClose
          }
        >
          ×
        </button>

        <div className="moment-viewer-content">
          {moment.media_url &&
          moment.media_type?.startsWith(
            "video"
          ) ? (
            <video
              src={
                moment.media_url
              }
              controls
              autoPlay
            />
          ) : moment.media_url ? (
            <img
              src={
                moment.media_url
              }
              alt=""
            />
          ) : (
            <div className="viewer-text">
              {moment.text}
            </div>
          )}
        </div>

        <div className="moment-viewer-footer">
          <strong>
            {displayName(
              moment.profile
            )}
          </strong>

          <span>
            {
              moment.description
            }
          </span>

          <p>
            {
              moment.text
            }
          </p>

          <div className="moment-reactions">
            {[
              "❤️",
              "😂",
              "😮",
              "😢",
              "🔥",
              "👍",
            ].map(
              (reaction) => (
                <button
                  key={
                    reaction
                  }
                  onClick={() =>
                    reactToMoment(
                      moment.id,
                      reaction
                    )
                  }
                >
                  {reaction}
                </button>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   COMMUNITIES
   ========================================================= */

function CommunitiesPage({
  communities,
  createCommunity,
  createCommunityGroup,
}) {
  const [open, setOpen] =
    useState(false);

  const [selected, setSelected] =
    useState(null);

  const [name, setName] =
    useState("");

  const [description, setDescription] =
    useState("");

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>
            Communities
          </h1>

          <p>
            Bring groups and people
            together.
          </p>
        </div>

        <button
          className="primary-button"
          onClick={() =>
            setOpen(true)
          }
        >
          + Create community
        </button>
      </header>

      {communities.length ===
      0 ? (
        <div className="empty-large">
          <div>👥</div>

          <h2>
            Build your first
            community
          </h2>
        </div>
      ) : (
        <div className="community-grid">
          {communities.map(
            (community) => (
              <button
                key={
                  community.id
                }
                className="community-card"
                onClick={() =>
                  setSelected(
                    community
                  )
                }
              >
                <div className="community-icon">
                  👥
                </div>

                <h3>
                  {
                    community.name
                  }
                </h3>

                <p>
                  {
                    community.description
                  }
                </p>

                <span>
                  {community.is_admin
                    ? "Admin"
                    : "Member"}
                </span>
              </button>
            )
          )}
        </div>
      )}

      {open && (
        <Modal
          title="Create community"
          onClose={() =>
            setOpen(false)
          }
        >
          <label>
            Name
          </label>

          <input
            value={name}
            onChange={(
              event
            ) =>
              setName(
                event.target.value
              )
            }
          />

          <label>
            Description
          </label>

          <textarea
            value={
              description
            }
            onChange={(
              event
            ) =>
              setDescription(
                event.target.value
              )
            }
          />

          <div className="modal-actions">
            <button
              className="secondary-button"
              onClick={() =>
                setOpen(false)
              }
            >
              Cancel
            </button>

            <button
              className="primary-button"
              onClick={async () => {
                await createCommunity(
                  {
                    name,
                    description,
                  }
                );

                setName("");
                setDescription("");
                setOpen(false);
              }}
            >
              Create
            </button>
          </div>
        </Modal>
      )}

      {selected && (
        <CommunityDetail
          community={
            selected
          }
          onClose={() =>
            setSelected(null)
          }
          createCommunityGroup={
            createCommunityGroup
          }
        />
      )}
    </div>
  );
}

function CommunityDetail({
  community,
  onClose,
  createCommunityGroup,
}) {
  const [groupName, setGroupName] =
    useState("");

  return (
    <div className="fullscreen-overlay">
      <div className="detail-panel">
        <header className="detail-header">
          <button
            onClick={
              onClose
            }
          >
            ←
          </button>

          <div>
            <h2>
              {
                community.name
              }
            </h2>

            <span>
              Community
            </span>
          </div>
        </header>

        <div className="community-hero">
          <div className="community-icon large">
            👥
          </div>

          <h1>
            {
              community.name
            }
          </h1>

          <p>
            {
              community.description
            }
          </p>
        </div>

        <div className="community-section">
          <div className="section-title">
            <h3>
              Groups
            </h3>

            {community.is_admin && (
              <button
                className="secondary-button"
                onClick={async () => {
                  if (
                    !groupName.trim()
                  )
                    return;

                  await createCommunityGroup(
                    {
                      communityId:
                        community.id,
                      name:
                        groupName,
                    }
                  );

                  setGroupName(
                    ""
                  );
                }}
              >
                Add group
              </button>
            )}
          </div>

          {community.is_admin && (
            <input
              value={groupName}
              onChange={(
                event
              ) =>
                setGroupName(
                  event.target.value
                )
              }
              placeholder="New group name"
            />
          )}

          <div className="community-placeholder">
            Groups connected
            to this community
            appear here.
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   CHANNELS
   ========================================================= */

function ChannelsPage({
  channels,
  createChannel,
  createChannelPost,
  followChannel,
  userId,
}) {
  const [
    createOpen,
    setCreateOpen,
  ] = useState(false);

  const [
    selected,
    setSelected,
  ] = useState(null);

  const [name, setName] =
    useState("");

  const [handle, setHandle] =
    useState("");

  const [
    description,
    setDescription,
  ] = useState("");

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>
            Channels
          </h1>

          <p>
            Follow creators and
            organizations.
          </p>
        </div>

        <button
          className="primary-button"
          onClick={() =>
            setCreateOpen(
              true
            )
          }
        >
          + Create channel
        </button>
      </header>

      <div className="channel-layout">
        <section className="channel-list">
          <div className="search-box">
            🔎
            <input
              placeholder="Discover channels"
            />
          </div>

          {channels.length ===
          0 ? (
            <div className="empty-state">
              <div>
                📡
              </div>

              <h3>
                No followed channels
              </h3>
            </div>
          ) : (
            channels.map(
              (channel) => (
                <button
                  key={
                    channel.id
                  }
                  className="channel-row"
                  onClick={() =>
                    setSelected(
                      channel
                    )
                  }
                >
                  <Avatar
                    src={
                      channel.avatar_url
                    }
                    name={
                      channel.name
                    }
                    size={52}
                  />

                  <div>
                    <strong>
                      {
                        channel.name
                      }
                    </strong>

                    <span>
                      @
                      {
                        channel.handle
                      }
                    </span>

                    <p>
                      {truncate(
                        channel.description ||
                          "Channel",
                        60
                      )}
                    </p>
                  </div>
                </button>
              )
            )
          )}
        </section>

        <section className="channel-feed">
          {selected ? (
            <ChannelFeed
              channel={
                selected
              }
              userId={
                userId
              }
              createChannelPost={
                createChannelPost
              }
              followChannel={
                followChannel
              }
            />
          ) : (
            <div className="no-chat-selected">
              <div className="hexagon">
                📡
              </div>

              <h2>
                Channels
              </h2>
            </div>
          )}
        </section>
      </div>

      {createOpen && (
        <Modal
          title="Create channel"
          onClose={() =>
            setCreateOpen(
              false
            )
          }
        >
          <label>
            Name
          </label>

          <input
            value={name}
            onChange={(
              event
            ) =>
              setName(
                event.target.value
              )
            }
          />

          <label>
            Handle
          </label>

          <input
            value={handle}
            onChange={(
              event
            ) =>
              setHandle(
                event.target.value
              )
            }
          />

          <label>
            Description
          </label>

          <textarea
            value={
              description
            }
            onChange={(
              event
            ) =>
              setDescription(
                event.target.value
              )
            }
          />

          <div className="modal-actions">
            <button
              className="secondary-button"
              onClick={() =>
                setCreateOpen(
                  false
                )
              }
            >
              Cancel
            </button>

            <button
              className="primary-button"
              onClick={async () => {
                await createChannel(
                  {
                    name,
                    handle,
                    description,
                  }
                );

                setCreateOpen(
                  false
                );
              }}
            >
              Create channel
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function ChannelFeed({
  channel,
  userId,
  createChannelPost,
  followChannel,
}) {
  const [posts, setPosts] =
    useState([]);

  const [text, setText] =
    useState("");

  const [isAdmin, setIsAdmin] =
    useState(false);

  const [file, setFile] =
    useState(null);

  const loadPosts =
    useCallback(
      async () => {
        const {
          data,
        } =
          await supabase
            .from(
              "channel_posts"
            )
            .select(
              `
                *,
                profiles:author_id (
                  id,
                  username,
                  full_name,
                  display_name,
                  avatar_url
                )
              `
            )
            .eq(
              "channel_id",
              channel.id
            )
            .order(
              "created_at",
              {
                ascending:
                  false,
              }
            );

        setPosts(
          data || []
        );
      },
      [channel.id]
    );

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  useEffect(() => {
    supabase
      .from(
        "channel_admins"
      )
      .select(
        "role"
      )
      .eq(
        "channel_id",
        channel.id
      )
      .eq(
        "user_id",
        userId
      )
      .maybeSingle()
      .then(
        ({
          data,
        }) =>
          setIsAdmin(
            !!data
          )
      );
  }, [
    channel.id,
    userId,
  ]);

  return (
    <div className="channel-feed-inner">
      <header className="channel-header">
        <Avatar
          src={
            channel.avatar_url
          }
          name={
            channel.name
          }
          size={62}
        />

        <div className="channel-header-info">
          <h2>
            {
              channel.name
            }
          </h2>

          <span>
            @
            {
              channel.handle
            }
          </span>

          <p>
            {
              channel.description
            }
          </p>
        </div>

        <button
          className="secondary-button"
          onClick={() =>
            followChannel(
              channel.id
            )
          }
        >
          Follow
        </button>
      </header>

      {isAdmin && (
        <div className="channel-composer">
          <textarea
            value={text}
            onChange={(
              event
            ) =>
              setText(
                event.target.value
              )
            }
            placeholder="Publish an update…"
          />

          <input
            type="file"
            accept="image/*,video/*"
            onChange={(
              event
            ) =>
              setFile(
                event.target.files?.[0] ||
                  null
              )
            }
          />

          <button
            className="primary-button"
            onClick={async () => {
              await createChannelPost(
                {
                  channelId:
                    channel.id,
                  text,
                  file,
                }
              );

              setText("");
              setFile(null);
              loadPosts();
            }}
          >
            Publish
          </button>
        </div>
      )}

      <div className="channel-posts">
        {posts.map(
          (post) => (
            <article
              key={
                post.id
              }
              className="channel-post"
            >
              <div className="post-author">
                <Avatar
                  src={
                    post
                      .profiles
                      ?.avatar_url
                  }
                  name={displayName(
                    post.profiles
                  )}
                  size={42}
                />

                <div>
                  <strong>
                    {displayName(
                      post.profiles
                    )}
                  </strong>

                  <span>
                    {formatTime(
                      post.created_at
                    )}
                  </span>
                </div>
              </div>

              {post.text && (
                <p>
                  {
                    post.text
                  }
                </p>
              )}

              {post.media_url && (
                post.media_type?.startsWith(
                  "video"
                ) ? (
                  <video
                    src={
                      post.media_url
                    }
                    controls
                  />
                ) : (
                  <img
                    src={
                      post.media_url
                    }
                    alt=""
                  />
                )
              )}
            </article>
          )
        )}
      </div>
    </div>
  );
}

/* =========================================================
   CALLS
   ========================================================= */

function CallsPage({
  conversations,
  startCall,
}) {
  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>
            Calls
          </h1>

          <p>
            Voice and video calling.
          </p>
        </div>
      </header>

      <div className="calls-info">
        <div className="call-icon">
          📞
        </div>

        <h2>
          HEXA Calls
        </h2>

        <p>
          WebRTC voice and video
          calling.
        </p>

        <small>
          Rate: ₦
          {(
            CALL_RATE_KOBO_PER_SECOND /
            100
          ).toFixed(2)}
          / second
        </small>
      </div>

      <div className="call-list">
        {conversations
          .filter(
            (conversation) =>
              conversation.type ===
              "direct"
          )
          .map(
            (conversation) => (
              <div
                className="call-contact"
                key={
                  conversation.id
                }
              >
                <Avatar
                  src={
                    conversation
                      .otherProfile
                      ?.avatar_url
                  }
                  name={displayName(
                    conversation.otherProfile
                  )}
                  size={50}
                />

                <div>
                  <strong>
                    {displayName(
                      conversation.otherProfile
                    )}
                  </strong>

                  <span>
                    Ready to call
                  </span>
                </div>

                <button
                  onClick={() =>
                    startCall({
                      conversation,
                      type:
                        "voice",
                    })
                  }
                >
                  📞
                </button>

                <button
                  onClick={() =>
                    startCall({
                      conversation,
                      type:
                        "video",
                    })
                  }
                >
                  📹
                </button>
              </div>
            )
          )}
      </div>
    </div>
  );
}

/* =========================================================
   CALL OVERLAY
   ========================================================= */

function CallOverlay({
  call,
  userId,
  onClose,
  flash,
}) {
  const [seconds, setSeconds] =
    useState(0);

  const [accepted, setAccepted] =
    useState(false);

  const [muted, setMuted] =
    useState(false);

  const [videoEnabled, setVideoEnabled] =
    useState(
      call.type ===
        "video"
    );

  const [stream, setStream] =
    useState(null);

  const pcRef =
    useRef(null);

  const localVideoRef =
    useRef(null);

  useEffect(() => {
    let active = true;

    const setup =
      async () => {
        try {
          const media =
            await navigator.mediaDevices.getUserMedia(
              {
                audio: true,
                video:
                  call.type ===
                  "video",
              }
            );

          if (!active)
            return;

          setStream(
            media
          );

          if (
            localVideoRef.current
          ) {
            localVideoRef.current.srcObject =
              media;
          }

          const pc =
            new RTCPeerConnection({
              iceServers:
                [
                  {
                    urls:
                      "stun:stun.cloudflare.com:3478",
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
            });

          pcRef.current =
            pc;

          media
            .getTracks()
            .forEach(
              (track) =>
                pc.addTrack(
                  track,
                  media
                )
            );
        } catch (error) {
          flash(
            error?.message ||
              "Could not start call."
          );
        }
      };

    setup();

    return () => {
      active =
        false;

      stream
        ?.getTracks()
        .forEach(
          (track) =>
            track.stop()
        );

      pcRef.current?.close();
    };
  }, []);

  useEffect(() => {
    if (!accepted)
      return;

    const interval =
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
        interval
      );
  }, [accepted]);

  const answer =
    async () => {
      setAccepted(
        true
      );

      await supabase
        .from("calls")
        .update({
          status:
            "accepted",
          started_at:
            now(),
        })
        .eq(
          "id",
          call.id
        );
    };

  const end =
    async () => {
      await supabase
        .from("calls")
        .update({
          status:
            "ended",
          ended_at:
            now(),
          billed_seconds:
            seconds,
          amount_kobo:
            seconds *
            CALL_RATE_KOBO_PER_SECOND,
        })
        .eq(
          "id",
          call.id
        );

      stream
        ?.getTracks()
        .forEach(
          (track) =>
            track.stop()
        );

      onClose();
    };

  return (
    <div className="call-overlay">
      <div className="call-window">
        <div className="call-topbar">
          <strong>
            {call.type ===
            "video"
              ? "Video call"
              : "Voice call"}
          </strong>

          <span>
            {accepted
              ? formatDuration(
                  seconds
                )
              : "Calling…"}
          </span>
        </div>

        <div className="call-stage">
          {videoEnabled ? (
            <video
              ref={
                localVideoRef
              }
              autoPlay
              muted
              playsInline
              className="local-video-main"
            />
          ) : (
            <div className="voice-call-avatar">
              <Avatar
                src={
                  call.peer
                    ?.avatar_url
                }
                name={displayName(
                  call.peer
                )}
                size={120}
              />

              <h2>
                {displayName(
                  call.peer
                )}
              </h2>
            </div>
          )}
        </div>

        <div className="call-controls">
          {!accepted && (
            <button
              className="call-control accept"
              onClick={answer}
            >
              ✓
            </button>
          )}

          {accepted && (
            <>
              <button
                className={
                  muted
                    ? "call-control active"
                    : "call-control"
                }
                onClick={() => {
                  setMuted(
                    (value) =>
                      !value
                  );

                  stream
                    ?.getAudioTracks()
                    .forEach(
                      (track) =>
                        (track.enabled =
                          muted)
                    );
                }}
              >
                🎙
              </button>

              <button
                className="call-control"
                onClick={() =>
                  setVideoEnabled(
                    (
                      value
                    ) =>
                      !value
                  )
                }
              >
                📹
              </button>
            </>
          )}

          <button
            className="call-control decline"
            onClick={
              end
            }
          >
            ☎
          </button>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   KORA
   ========================================================= */

function KoraPage({
  profile,
  wallet,
  flash,
}) {
  const [input, setInput] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [items, setItems] =
    useState([
      {
        role:
          "assistant",
        text:
          `Hello ${displayName(
            profile
          )}. How can I help?`,
      },
    ]);

  const send =
    async () => {
      const clean =
        input.trim();

      if (
        !clean ||
        loading
      )
        return;

      setItems(
        (current) => [
          ...current,
          {
            role:
              "user",
            text:
              clean,
          },
        ]
      );

      setInput("");
      setLoading(
        true
      );

      try {
        const response =
          await fetch(
            "/api/kora",
            {
              method:
                "POST",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body: JSON.stringify(
                {
                  message:
                    clean,
                }
              ),
            }
          );

        if (!response.ok)
          throw new Error(
            "Kora endpoint is unavailable."
          );

        const data =
          await response.json();

        setItems(
          (current) => [
            ...current,
            {
              role:
                "assistant",
              text:
                data.answer ||
                data.message ||
                "Kora could not answer right now.",
            },
          ]
        );
      } catch (error) {
        flash(
          error.message
        );
      } finally {
        setLoading(
          false
        );
      }
    };

  return (
    <div className="page kora-page">
      <div className="kora-hero">
        <div className="kora-logo">
          ✦
        </div>

        <h1>
          Kora
        </h1>

        <p>
          Your intelligent assistant
          inside HEXA.
        </p>
      </div>

      <div className="kora-chat">
        <div className="kora-messages">
          {items.map(
            (
              item,
              index
            ) => (
              <div
                key={
                  index
                }
                className={
                  item.role ===
                  "user"
                    ? "kora-message user"
                    : "kora-message"
                }
              >
                <div className="kora-avatar">
                  {item.role ===
                  "user"
                    ? "U"
                    : "✦"}
                </div>

                <div>
                  <strong>
                    {item.role ===
                    "user"
                      ? "You"
                      : "Kora"}
                  </strong>

                  <p>
                    {
                      item.text
                    }
                  </p>
                </div>
              </div>
            )
          )}

          {loading && (
            <div className="kora-typing">
              Kora is
              thinking…
            </div>
          )}
        </div>

        <div className="kora-composer">
          <input
            value={input}
            onChange={(
              event
            ) =>
              setInput(
                event.target.value
              )
            }
            onKeyDown={(
              event
            ) => {
              if (
                event.key ===
                "Enter"
              ) {
                send();
              }
            }}
            placeholder="Ask Kora anything…"
          />

          <button
            onClick={
              send
            }
          >
            ➤
          </button>
        </div>
      </div>

      <div className="kora-plan">
        <span>
          Wallet
        </span>

        <strong>
          ₦
          {(
            Number(
              wallet?.balance_kobo ||
                0
            ) / 100
          ).toLocaleString()}
        </strong>
      </div>
    </div>
  );
}

/* =========================================================
   NOTIFICATIONS
   ========================================================= */

function NotificationsPage({
  notifications,
  reload,
}) {
  const markRead =
    async (
      notification
    ) => {
      await supabase
        .from(
          "notifications"
        )
        .update({
          read_at:
            now(),
        })
        .eq(
          "id",
          notification.id
        );

      reload();
    };

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>
            Notifications
          </h1>

          <p>
            Activity across
            HEXA.
          </p>
        </div>
      </header>

      {notifications.length ===
      0 ? (
        <div className="empty-large">
          <div>🔔</div>

          <h2>
            No notifications
          </h2>
        </div>
      ) : (
        <div className="notification-list">
          {notifications.map(
            (
              notification
            ) => (
              <button
                key={
                  notification.id
                }
                className={
                  notification.read_at
                    ? "notification-row"
                    : "notification-row unread"
                }
                onClick={() =>
                  markRead(
                    notification
                  )
                }
              >
                <div className="notification-icon">
                  🔔
                </div>

                <div>
                  <strong>
                    {
                      notification.title
                    }
                  </strong>

                  <p>
                    {
                      notification.body
                    }
                  </p>

                  <span>
                    {formatDate(
                      notification.created_at
                    )}
                  </span>
                </div>
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}

/* =========================================================
   WALLET
   ========================================================= */

function WalletPage({
  wallet,
}) {
  const balance =
    Number(
      wallet?.balance_kobo ||
        0
    ) / 100;

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>
            HEXA Wallet
          </h1>

          <p>
            Calls, credits and
            transactions.
          </p>
        </div>
      </header>

      <div className="wallet-card">
        <span>
          Available
          balance
        </span>

        <strong>
          ₦
          {balance.toLocaleString(
            undefined,
            {
              minimumFractionDigits:
                2,
            }
          )}
        </strong>

        <button className="primary-button">
          + Add funds
        </button>
      </div>

      <div className="wallet-actions">
        <button>
          💳 Add money
        </button>

        <button>
          📜 Transactions
        </button>

        <button>
          ⭐ Buy Kora
          credits
        </button>
      </div>
    </div>
  );
}

/* =========================================================
   PROFILE
   ========================================================= */

function ProfileModal({
  profile,
  userId,
  onClose,
  onSaved,
  uploadFile,
}) {
  const [name, setName] =
    useState(
      profile?.display_name ||
        profile?.full_name ||
        ""
    );

  const [username, setUsername] =
    useState(
      profile?.username ||
        ""
    );

  const [about, setAbout] =
    useState(
      profile?.about ||
        ""
    );

  const [phone, setPhone] =
    useState(
      profile?.phone ||
        ""
    );

  const [avatarUrl, setAvatarUrl] =
    useState(
      profile?.avatar_url ||
        ""
    );

  const photoInput =
    useRef(null);

  const [saving, setSaving] =
    useState(false);

  const save =
    async () => {
      setSaving(true);

      try {
        const cleanUsername =
          username
            .trim()
            .toLowerCase();

        if (
          !/^[a-z0-9_]{3,30}$/.test(
            cleanUsername
          )
        ) {
          throw new Error(
            "Username must be 3–30 letters, numbers or underscores."
          );
        }

        const {
          error,
        } =
          await supabase
            .from(
              "profiles"
            )
            .update({
              display_name:
                name.trim(),
              full_name:
                name.trim(),
              username:
                cleanUsername,
              about:
                about.trim(),
              phone:
                phone.trim() ||
                null,
              avatar_url:
                avatarUrl ||
                null,
              updated_at:
                now(),
            })
            .eq(
              "id",
              userId
            );

        if (error)
          throw error;

        await onSaved?.();
        onClose();
      } catch (error) {
        alert(
          error.message
        );
      } finally {
        setSaving(
          false
        );
      }
    };

  return (
    <Modal
      title="Your profile"
      onClose={onClose}
    >
      <div className="profile-center">
        <Avatar
          src={avatarUrl}
          name={name}
          size={92}
        />

        <input
          ref={
            photoInput
          }
          hidden
          type="file"
          accept="image/*"
          onChange={async (
            event
          ) => {
            const file =
              event.target.files?.[0];

            if (!file)
              return;

            const uploaded =
              await uploadFile(
                file,
                "avatars"
              );

            if (uploaded) {
              setAvatarUrl(
                uploaded.fileUrl
              );
            }
          }}
        />

        <button
          className="secondary-button"
          onClick={() =>
            photoInput.current?.click()
          }
        >
          Change profile
          photo
        </button>
      </div>

      <label>
        Display name
      </label>

      <input
        value={name}
        onChange={(event) =>
          setName(
            event.target.value
          )
        }
      />

      <label>
        Username
      </label>

      <input
        value={username}
        onChange={(event) =>
          setUsername(
            event.target.value
              .toLowerCase()
              .replace(
                /[^a-z0-9_]/g,
                ""
              )
          )
        }
      />

      <label>
        About
      </label>

      <textarea
        value={about}
        onChange={(event) =>
          setAbout(
            event.target.value
          )
        }
        maxLength={200}
      />

      <label>
        Phone
      </label>

      <input
        value={phone}
        onChange={(event) =>
          setPhone(
            event.target.value
          )
        }
      />

      <div className="modal-actions">
        <button
          className="secondary-button"
          onClick={
            onClose
          }
        >
          Cancel
        </button>

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
            : "Save changes"}
        </button>
      </div>
    </Modal>
  );
}

/* =========================================================
   SETTINGS
   ========================================================= */

function SettingsModal({
  userId,
  profile,
  theme,
  setTheme,
  accent,
  setAccent,
  language,
  setLanguage,
  onClose,
}) {
  const [privacy, setPrivacy] =
    useState(null);

  const [notifications, setNotifications] =
    useState(null);

  useEffect(() => {
    Promise.all([
      supabase
        .from(
          "user_privacy_settings"
        )
        .select("*")
        .eq(
          "user_id",
          userId
        )
        .maybeSingle(),

      supabase
        .from(
          "notification_preferences"
        )
        .select("*")
        .eq(
          "user_id",
          userId
        )
        .maybeSingle(),
    ]).then(
      ([
        privacyResult,
        notificationsResult,
      ]) => {
        setPrivacy(
          privacyResult.data
        );

        setNotifications(
          notificationsResult.data
        );
      }
    );
  }, [userId]);

  const updatePrivacy =
    async (
      field,
      value
    ) => {
      setPrivacy(
        (current) => ({
          ...(current ||
            {}),
          [field]:
            value,
        })
      );

      await supabase
        .from(
          "user_privacy_settings"
        )
        .upsert({
          user_id:
            userId,
          [field]:
            value,
          updated_at:
            now(),
        });
    };

  const updateNotifications =
    async (
      field,
      value
    ) => {
      setNotifications(
        (current) => ({
          ...(current ||
            {}),
          [field]:
            value,
        })
      );

      await supabase
        .from(
          "notification_preferences"
        )
        .upsert({
          user_id:
            userId,
          [field]:
            value,
          updated_at:
            now(),
        });
    };

  return (
    <Modal
      title="Settings"
      onClose={onClose}
    >
      <div className="settings-section">
        <h3>
          Appearance
        </h3>

        <label>
          Theme
        </label>

        <select
          value={theme}
          onChange={(
            event
          ) =>
            setTheme(
              event.target.value
            )
          }
        >
          {Object.keys(
            THEMES
          ).map(
            (name) => (
              <option
                key={name}
                value={name}
              >
                {name}
              </option>
            )
          )}
        </select>

        <label>
          Accent
        </label>

        <select
          value={accent}
          onChange={(
            event
          ) =>
            setAccent(
              event.target.value
            )
          }
        >
          {Object.keys(
            ACCENTS
          ).map(
            (name) => (
              <option
                key={name}
                value={name}
              >
                {name}
              </option>
            )
          )}
        </select>
      </div>

      <div className="settings-section">
        <h3>
          Language
        </h3>

        <select
          value={language}
          onChange={(
            event
          ) =>
            setLanguage(
              event.target.value
            )
          }
          size={7}
        >
          {LANGUAGES.map(
            ([
              code,
              name,
            ]) => (
              <option
                key={code}
                value={code}
              >
                {name}
              </option>
            )
          )}
        </select>
      </div>

      <div className="settings-section">
        <h3>
          Privacy
        </h3>

        <SettingToggle
          label="Last seen"
          value={
            privacy?.last_seen
          }
          onChange={(value) =>
            updatePrivacy(
              "last_seen",
              value
            )
          }
        />

        <SettingToggle
          label="Online status"
          value={
            privacy?.online_status
          }
          onChange={(value) =>
            updatePrivacy(
              "online_status",
              value
            )
          }
        />

        <SettingToggle
          label="Profile photo"
          value={
            privacy?.profile_photo
          }
          onChange={(value) =>
            updatePrivacy(
              "profile_photo",
              value
            )
          }
        />

        <SettingToggle
          label="Read receipts"
          value={
            privacy?.read_receipts
          }
          onChange={(value) =>
            updatePrivacy(
              "read_receipts",
              value
            )
          }
        />
      </div>

      <div className="settings-section">
        <h3>
          Notifications
        </h3>

        {[
          [
            "Messages",
            "messages",
          ],
          [
            "Groups",
            "groups",
          ],
          [
            "Calls",
            "calls",
          ],
          [
            "Moments",
            "status",
          ],
          [
            "Channels",
            "channels",
          ],
          [
            "Sounds",
            "sounds",
          ],
        ].map(
          ([
            label,
            key,
          ]) => (
            <SettingToggle
              key={key}
              label={label}
              value={
                notifications?.[
                  key
                ]
              }
              onChange={(
                value
              ) =>
                updateNotifications(
                  key,
                  value
                )
              }
            />
          )
        )}
      </div>

      <div className="settings-section">
        <h3>
          Account
        </h3>

        <div className="account-row">
          <Avatar
            src={
              profile
                ?.avatar_url
            }
            name={displayName(
              profile
            )}
            size={46}
          />

          <div>
            <strong>
              {displayName(
                profile
              )}
            </strong>

            <span>
              @
              {
                profile?.username
              }
            </span>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function SettingToggle({
  label,
  value,
  onChange,
}) {
  return (
    <button
      className="setting-toggle"
      onClick={() =>
        onChange(
          !value
        )
      }
    >
      <span>
        {label}
      </span>

      <span
        className={
          value
            ? "toggle on"
            : "toggle"
        }
      >
        <span />
      </span>
    </button>
  );
}

/* =========================================================
   POLL MODAL
   ========================================================= */

function PollModal({
  onClose,
  onCreate,
}) {
  return (
    <Modal
      title="Create poll"
      onClose={onClose}
    >
      <label>
        Question
      </label>

      <input placeholder="Your question" />

      <label>
        Option 1
      </label>

      <input />

      <label>
        Option 2
      </label>

      <input />

      <div className="modal-actions">
        <button
          className="secondary-button"
          onClick={onClose}
        >
          Cancel
        </button>

        <button
          className="primary-button"
          onClick={
            onCreate
          }
        >
          Create poll
        </button>
      </div>
    </Modal>
  );
}

/* =========================================================
   MODAL
   ========================================================= */

function Modal({
  title,
  children,
  onClose,
}) {
  return (
    <div className="modal-overlay">
      <div className="modal">
        <header className="modal-header">
          <h2>
            {title}
          </h2>

          <button
            onClick={
              onClose
            }
          >
            ×
          </button>
        </header>

        <div className="modal-body">
          {children}
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   LOADING
   ========================================================= */

function LoadingScreen() {
  return (
    <div className="loading-screen">
      <div className="loading-logo">
        H
      </div>

      <h2>
        HEXA
      </h2>

      <span>
        Starting…
      </span>
    </div>
  );
}

/* =========================================================
   ROOT
   ========================================================= */

function Root() {
  const [session, setSession] =
    useState(null);

  const [checking, setChecking] =
    useState(true);

  useEffect(() => {
    let mounted = true;

    supabase.auth
      .getSession()
      .then(
        ({
          data,
        }) => {
          if (!mounted)
            return;

          setSession(
            data.session ||
              null
          );

          setChecking(
            false
          );
        }
      );

    const {
      data: listener,
    } =
      supabase.auth.onAuthStateChange(
        (
          _event,
          newSession
        ) => {
          setSession(
            newSession ||
              null
          );
        }
      );

    return () => {
      mounted =
        false;

      listener?.subscription?.unsubscribe();
    };
  }, []);

  if (checking) {
    return (
      <LoadingScreen />
    );
  }

  if (!session) {
    return (
      <AuthScreen
        onAuthenticated={
          setSession
        }
      />
    );
  }

  return (
    <HexaApp
      session={session}
    />
  );
}

/* =========================================================
   GLOBAL CSS
   ========================================================= */

const style =
  document.createElement(
    "style"
  );

style.textContent = `
:root {
  --hexa-primary: #8b5cf6;
  --hexa-secondary: #2563eb;
  --hexa-glow: rgba(124,58,237,.30);
  --hexa-background: #080b13;
  --hexa-panel: #0c101a;
}

* {
  box-sizing: border-box;
}

html,
body,
#root {
  margin: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  font-family: Inter, system-ui, sans-serif;
}

body {
  color: #f8fafc;
  background:
    radial-gradient(
      circle at 20% 0%,
      var(--hexa-glow),
      transparent 32%
    ),
    var(--hexa-background);
}

button,
input,
textarea,
select {
  font: inherit;
}

button {
  cursor: pointer;
}

button:disabled {
  cursor: not-allowed;
  opacity: .55;
}

input,
textarea,
select {
  color: #fff;
  background: #111522;
  border: 1px solid #252b3a;
  border-radius: 12px;
  outline: none;
}

input:focus,
textarea:focus,
select:focus {
  border-color: var(--hexa-primary);
}

input {
  height: 46px;
  padding: 0 14px;
}

textarea {
  padding: 12px;
  min-height: 90px;
  resize: vertical;
}

label {
  display: block;
  margin: 14px 0 7px;
  color: #aeb7c8;
  font-size: 13px;
}

.hexa-shell {
  width: 100%;
  height: 100%;
  display: flex;
  background:
    radial-gradient(
      circle at 80% 10%,
      var(--hexa-glow),
      transparent 25%
    ),
    var(--hexa-background);
}

.sidebar {
  width: 250px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  padding: 20px 12px;
  background: rgba(10,13,22,.95);
  border-right: 1px solid #202535;
}

.sidebar-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 12px 22px;
  font-size: 21px;
  font-weight: 800;
}

.brand-mark {
  width: 46px;
  height: 46px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 900;
  background:
    linear-gradient(
      135deg,
      var(--hexa-primary),
      var(--hexa-secondary)
    );
  box-shadow:
    0 0 30px
    var(--hexa-glow);
}

.sidebar nav {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.nav-item {
  width: 100%;
  min-height: 48px;
  display: flex;
  align-items: center;
  gap: 13px;
  padding: 0 13px;
  border: 0;
  border-radius: 13px;
  color: #aeb7c8;
  background: transparent;
  text-align: left;
}

.nav-item:hover,
.nav-item.active {
  background: #151a28;
  color: white;
}

.nav-item.active {
  box-shadow:
    inset 3px 0 0
    var(--hexa-primary);
}

.nav-icon {
  width: 25px;
  text-align: center;
}

.notification-badge {
  margin-left: auto;
  min-width: 22px;
  height: 22px;
  padding: 0 6px;
  border-radius: 99px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #ef4444;
  color: white;
  font-size: 11px;
}

.sidebar-bottom {
  margin-top: auto;
  padding-top: 12px;
  border-top: 1px solid #202535;
}

.hexa-main {
  flex: 1;
  min-width: 0;
  min-height: 0;
}

.page {
  width: 100%;
  height: 100%;
  overflow: auto;
  padding: 32px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 15px;
  margin-bottom: 25px;
}

.page-header h1 {
  margin: 0 0 5px;
}

.page-header p {
  margin: 0;
  color: #8993a7;
}

.primary-button,
.secondary-button {
  border-radius: 11px;
  padding: 11px 17px;
}

.primary-button {
  border: 0;
  color: white;
  background:
    linear-gradient(
      135deg,
      var(--hexa-primary),
      var(--hexa-secondary)
    );
}

.secondary-button {
  border: 1px solid #2a3142;
  color: white;
  background: #171c2a;
}

.text-button {
  border: 0;
  color: #a78bfa;
  background: transparent;
}

.icon-button {
  width: 40px;
  height: 40px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: #aeb7c8;
  font-size: 19px;
}

.icon-button:hover {
  background: #171c2a;
  color: white;
}

.avatar-wrap {
  position: relative;
  flex-shrink: 0;
}

.avatar {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
}

.avatar-fallback {
  display: flex;
  justify-content: center;
  align-items: center;
  color: white;
  background:
    linear-gradient(
      135deg,
      var(--hexa-primary),
      var(--hexa-secondary)
    );
  font-weight: 800;
}

.online-dot {
  position: absolute;
  right: 0;
  bottom: 1px;
  width: 11px;
  height: 11px;
  border-radius: 50%;
  border: 2px solid #0b0f18;
  background: #22c55e;
}

.chat-workspace {
  display: flex;
  width: 100%;
  height: 100%;
}

.chat-list {
  width: 390px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  border-right: 1px solid #202535;
  background: #0c101a;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px;
}

.section-header h1 {
  margin: 0;
}

.section-header span {
  color: #737e92;
  font-size: 12px;
}

.header-actions {
  display: flex;
  gap: 4px;
}

.search-box {
  height: 44px;
  margin: 0 15px 13px;
  padding: 0 12px;
  display: flex;
  align-items: center;
  gap: 9px;
  border-radius: 11px;
  background: #151a26;
  color: #778196;
}

.search-box input {
  flex: 1;
  height: 100%;
  border: 0;
  padding: 0;
  background: transparent;
}

.chat-list-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 0 8px 20px;
}

.conversation-row {
  width: 100%;
  display: flex;
  gap: 12px;
  padding: 12px;
  border: 0;
  border-radius: 13px;
  color: white;
  background: transparent;
  text-align: left;
}

.conversation-row:hover,
.conversation-row.selected {
  background: #151b29;
}

.conversation-info {
  min-width: 0;
  flex: 1;
}

.conversation-top,
.conversation-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}

.conversation-top strong,
.conversation-bottom span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.conversation-top span {
  color: #657085;
  font-size: 11px;
}

.conversation-bottom span {
  color: #8b95a8;
  font-size: 13px;
}

.chat-panel {
  flex: 1;
  min-width: 0;
  height: 100%;
}

.no-chat-selected,
.empty-state,
.empty-large {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #778296;
  text-align: center;
  padding: 30px;
}

.no-chat-selected h2,
.empty-state h3,
.empty-large h2 {
  color: white;
}

.hexagon {
  width: 85px;
  height: 85px;
  border-radius: 25px;
  display: flex;
  justify-content: center;
  align-items: center;
  background:
    linear-gradient(
      135deg,
      var(--hexa-primary),
      var(--hexa-secondary)
    );
  box-shadow:
    0 0 50px
    var(--hexa-glow);
  font-size: 30px;
  font-weight: 900;
}

.conversation-view {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.conversation-header {
  min-height: 72px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  border-bottom: 1px solid #202535;
  background: #0d121d;
}

.conversation-title {
  min-width: 0;
  flex: 1;
}

.conversation-title strong,
.conversation-title span {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.conversation-title span {
  margin-top: 3px;
  color: #7c879b;
  font-size: 12px;
}

.conversation-header-actions {
  display: flex;
  align-items: center;
  gap: 2px;
}

.relative-menu {
  position: relative;
}

.message-area {
  flex: 1;
  overflow-y: auto;
  padding: 18px 22px 25px;
}

.message-line {
  display: flex;
  justify-content: flex-start;
  margin-bottom: 9px;
}

.message-line.mine {
  justify-content: flex-end;
}

.message-wrap {
  position: relative;
  max-width: min(78%, 700px);
}

.message-bubble {
  max-width: 100%;
  padding: 8px 10px 6px;
  border: 1px solid #232b3c;
  border-radius: 14px 14px 14px 5px;
  background: #161c29;
}

.message-bubble.mine {
  border-radius: 14px 14px 5px 14px;
  background:
    linear-gradient(
      135deg,
      color-mix(
        in srgb,
        var(--hexa-primary) 33%,
        #111827
      ),
      #15233b
    );
}

.message-text {
  margin: 3px 0;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  line-height: 1.45;
}

.message-meta {
  display: flex;
  justify-content: flex-end;
  gap: 5px;
  color: #6f7b8d;
  font-size: 10px;
}

.message-read {
  color: #38bdf8;
}

.message-more-button {
  position: absolute;
  right: -31px;
  bottom: 2px;
  width: 25px;
  height: 25px;
  border: 0;
  border-radius: 8px;
  color: #7c8799;
  background: transparent;
}

.message-line.mine .message-more-button {
  left: -31px;
  right: auto;
}

.quoted-message {
  margin-bottom: 7px;
  padding: 7px 9px;
  border-left: 3px solid var(--hexa-primary);
  border-radius: 6px;
  background: rgba(0,0,0,.18);
  display: flex;
  flex-direction: column;
  gap: 3px;
  cursor: pointer;
}

.quoted-message strong {
  color: #c4b5fd;
  font-size: 12px;
}

.quoted-message span {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  color: #a8b2c2;
  font-size: 12px;
}

.message-highlight {
  animation: messageHighlight 1.5s ease;
}

@keyframes messageHighlight {
  30% {
    box-shadow:
      0 0 0 3px var(--hexa-primary),
      0 0 30px var(--hexa-glow);
  }
}

.message-media {
  display: block;
  max-width: min(360px, 100%);
  max-height: 430px;
  border-radius: 10px;
}

.message-gif {
  max-width: min(350px, 100%);
  border-radius: 10px;
}

.file-message {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 230px;
  color: white;
  text-decoration: none;
  padding: 5px;
}

.file-message > span {
  width: 42px;
  height: 42px;
  border-radius: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #20283a;
}

.file-message strong,
.file-message small {
  display: block;
}

.file-message small {
  margin-top: 3px;
  color: #7d879a;
}

.voice-message {
  width: min(370px, 100%);
  display: flex;
  align-items: center;
  gap: 7px;
}

.voice-message audio {
  width: 100%;
  height: 38px;
}

.voice-speed {
  border: 0;
  border-radius: 8px;
  padding: 6px 8px;
  color: white;
  background: #272f40;
  font-size: 11px;
}

.message-reactions {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.message-reactions button,
.reaction-picker button {
  border: 1px solid #30384b;
  border-radius: 99px;
  padding: 3px 7px;
  color: white;
  background: #111722;
}

.reaction-picker,
.forward-picker {
  position: absolute;
  right: 0;
  bottom: 30px;
  z-index: 100;
  min-width: 190px;
  padding: 7px;
  border: 1px solid #2d3547;
  border-radius: 12px;
  background: #111722;
  box-shadow: 0 20px 55px rgba(0,0,0,.45);
}

.forward-picker strong {
  display: block;
  padding: 7px;
  margin-bottom: 4px;
}

.forward-picker button {
  width: 100%;
  min-height: 38px;
  border: 0;
  border-radius: 8px;
  color: white;
  background: transparent;
  text-align: left;
}

.forward-picker button:hover {
  background: #1a2130;
}

.popup-menu {
  position: absolute;
  z-index: 150;
  min-width: 230px;
  padding: 6px;
  border: 1px solid #2d3547;
  border-radius: 14px;
  background: #111722;
  box-shadow: 0 20px 55px rgba(0,0,0,.45);
}

.message-menu {
  right: 0;
  bottom: 32px;
}

.popup-menu button {
  width: 100%;
  min-height: 42px;
  border: 0;
  border-radius: 9px;
  padding: 0 12px;
  color: white;
  background: transparent;
  text-align: left;
}

.popup-menu button:hover {
  background: #1a2130;
}

.whatsapp-chat-menu {
  top: 45px;
  right: 0;
  width: 285px;
  min-width: 285px;
  max-height: calc(100vh - 90px);
  overflow-y: auto;
}

.whatsapp-chat-menu > button,
.whatsapp-chat-menu .submenu-wrap > button {
  min-height: 45px;
  display: flex;
  align-items: center;
  gap: 12px;
  border: 0;
  border-radius: 9px;
  padding: 0 12px;
  color: white;
  background: transparent;
  text-align: left;
}

.whatsapp-chat-menu > button:hover,
.whatsapp-chat-menu .submenu-wrap > button:hover {
  background: #1a2130;
}

.whatsapp-chat-menu > button span:first-child,
.whatsapp-chat-menu .submenu-wrap > button span:first-child {
  width: 22px;
  text-align: center;
}

.submenu-wrap {
  position: relative;
}

.submenu-arrow {
  margin-left: auto;
  color: #7d8799;
  font-size: 20px;
}

.submenu {
  position: absolute;
  top: 0;
  right: calc(100% + 6px);
  width: 220px;
  z-index: 160;
  padding: 6px;
  border: 1px solid #2d3547;
  border-radius: 12px;
  background: #111722;
  box-shadow: 0 20px 55px rgba(0,0,0,.45);
}

.submenu button {
  width: 100%;
  min-height: 42px;
}

.list-submenu {
  width: 230px;
}

.new-list-box {
  padding: 7px;
  border-top: 1px solid #293143;
}

.new-list-box input {
  width: 100%;
  height: 38px;
}

.new-list-box button {
  margin-top: 6px;
  color: #a78bfa;
}

.menu-divider {
  height: 1px;
  margin: 7px 5px;
  background: #293143;
}

.danger-menu-item {
  color: #fca5a5 !important;
}

.chat-search-bar {
  min-height: 58px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 12px;
  border-bottom: 1px solid #202535;
  background: #0f141f;
}

.chat-search-bar input {
  flex: 1;
}

.select-toolbar {
  min-height: 58px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 12px;
  border-bottom: 1px solid #202535;
  background: #101620;
}

.select-toolbar strong {
  flex: 1;
}

.message-selected-row {
  border-radius: 12px;
  background: rgba(139,92,246,.12);
}

.reply-composer-preview {
  min-height: 61px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 15px;
  border-top: 1px solid #202838;
  background: #0f1520;
}

.reply-preview-accent {
  width: 3px;
  align-self: stretch;
  border-radius: 3px;
  background: var(--hexa-primary);
}

.reply-preview-content {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.reply-preview-content strong {
  color: #c4b5fd;
  font-size: 12px;
}

.reply-preview-content span {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  color: #8c97aa;
}

.composer {
  min-height: 68px;
  display: flex;
  align-items: flex-end;
  gap: 4px;
  padding: 10px 12px;
  border-top: 1px solid #202535;
  background: #0c1019;
}

.composer textarea {
  flex: 1;
  min-height: 45px;
  max-height: 150px;
  resize: none;
}

.send-button,
.send-voice-button {
  width: 46px;
  height: 46px;
  border: 0;
  border-radius: 50%;
  color: white;
  background:
    linear-gradient(
      135deg,
      var(--hexa-primary),
      var(--hexa-secondary)
    );
}

.voice-recording-bar {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
}

.recording-live {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 9px;
}

.recording-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #ef4444;
  animation: pulseDot 1s infinite;
}

@keyframes pulseDot {
  50% {
    transform: scale(.65);
  }
}

.emoji-panel {
  position: absolute;
  left: 12px;
  bottom: 70px;
  z-index: 120;
  width: min(400px, 92vw);
  max-height: 360px;
  padding: 10px;
  border: 1px solid #2a3447;
  border-radius: 15px;
  background: #101621;
  box-shadow: 0 25px 60px rgba(0,0,0,.5);
}

.emoji-panel input {
  width: 100%;
  margin-bottom: 8px;
}

.emoji-grid {
  max-height: 280px;
  display: grid;
  grid-template-columns: repeat(9, 1fr);
  overflow-y: auto;
}

.emoji-grid button {
  width: 38px;
  height: 38px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  font-size: 22px;
}

.emoji-grid button:hover {
  background: #20283a;
}

.channel-layout {
  min-height: calc(100% - 100px);
  display: flex;
  overflow: hidden;
  border: 1px solid #202838;
  border-radius: 18px;
}

.channel-list {
  width: 350px;
  flex-shrink: 0;
  overflow-y: auto;
  border-right: 1px solid #202838;
}

.channel-row {
  width: 100%;
  display: flex;
  gap: 12px;
  padding: 13px;
  border: 0;
  color: white;
  background: transparent;
  text-align: left;
}

.channel-row:hover {
  background: #151c2b;
}

.channel-row span,
.channel-row p {
  display: block;
}

.channel-row span {
  color: #a78bfa;
  font-size: 12px;
}

.channel-row p {
  margin: 5px 0 0;
  color: #788499;
}

.channel-feed {
  flex: 1;
  overflow-y: auto;
}

.channel-header {
  display: flex;
  gap: 13px;
  align-items: flex-start;
  padding: 22px;
  border-bottom: 1px solid #242c3c;
}

.channel-header-info {
  flex: 1;
}

.channel-header-info p {
  color: #7d879a;
}

.channel-composer {
  margin: 18px;
  padding: 14px;
  border: 1px solid #252d3e;
  border-radius: 16px;
  background: #111722;
}

.channel-composer textarea {
  width: 100%;
  border: 0;
  background: transparent;
}

.channel-posts {
  padding: 18px;
}

.channel-post {
  margin-bottom: 15px;
  padding: 16px;
  border: 1px solid #252e3f;
  border-radius: 16px;
  background: #0f151f;
}

.channel-post img,
.channel-post video {
  max-width: 100%;
  max-height: 600px;
  border-radius: 13px;
}

.post-author {
  display: flex;
  gap: 10px;
}

.post-author span {
  display: block;
  color: #758095;
  font-size: 11px;
}

.calls-info {
  max-width: 650px;
  margin: 40px auto;
  padding: 40px;
  border: 1px solid #252e3f;
  border-radius: 20px;
  background: #101621;
  text-align: center;
}

.call-icon {
  font-size: 55px;
}

.call-list {
  max-width: 900px;
  margin: auto;
}

.call-contact {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
  padding: 13px;
  border: 1px solid #252e3f;
  border-radius: 13px;
  background: #111722;
}

.call-contact > div:nth-child(2) {
  flex: 1;
}

.call-contact span {
  display: block;
  color: #768196;
  font-size: 12px;
}

.call-contact > button {
  width: 42px;
  height: 42px;
  border: 0;
  border-radius: 50%;
  color: white;
  background: #1a2231;
}

.call-overlay {
  position: fixed;
  inset: 0;
  z-index: 300;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0,0,0,.72);
  backdrop-filter: blur(12px);
}

.call-window {
  width: min(850px, 94vw);
  height: min(800px, 92vh);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid #31394c;
  border-radius: 22px;
  background: #080d15;
}

.call-topbar {
  min-height: 55px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 18px;
  border-bottom: 1px solid #252d3f;
}

.call-stage {
  flex: 1;
  position: relative;
  overflow: hidden;
  background: #050910;
}

.local-video-main {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.voice-call-avatar {
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.call-controls {
  display: flex;
  justify-content: center;
  gap: 12px;
  padding: 18px;
}

.call-control {
  width: 58px;
  height: 58px;
  border: 0;
  border-radius: 50%;
  color: white;
  background: #20293a;
  font-size: 22px;
}

.call-control.accept {
  background: #16a34a;
}

.call-control.decline {
  background: #dc2626;
}

.call-control.active {
  background: var(--hexa-primary);
}

.kora-hero {
  padding-top: 20px;
  text-align: center;
}

.kora-logo {
  width: 75px;
  height: 75px;
  margin: auto;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 25px;
  font-size: 40px;
  background:
    linear-gradient(
      135deg,
      var(--hexa-primary),
      var(--hexa-secondary)
    );
}

.kora-chat {
  width: min(850px, 100%);
  height: min(570px, 60vh);
  margin: 35px auto 16px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid #252e3f;
  border-radius: 19px;
  background: #0d131e;
}

.kora-messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.kora-message {
  display: flex;
  gap: 10px;
  max-width: 85%;
  margin-bottom: 18px;
}

.kora-message.user {
  margin-left: auto;
  flex-direction: row-reverse;
}

.kora-avatar {
  width: 38px;
  height: 38px;
  flex-shrink: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 12px;
  background:
    linear-gradient(
      135deg,
      var(--hexa-primary),
      var(--hexa-secondary)
    );
}

.kora-message p {
  white-space: pre-wrap;
}

.kora-composer {
  display: flex;
  gap: 8px;
  padding: 11px;
  border-top: 1px solid #242c3d;
}

.kora-composer input {
  flex: 1;
}

.kora-composer button {
  width: 48px;
  border: 0;
  border-radius: 12px;
  color: white;
  background: var(--hexa-primary);
}

.kora-plan {
  width: min(850px, 100%);
  display: flex;
  justify-content: space-between;
  margin: auto;
  padding: 16px;
  border-radius: 14px;
  background: #111722;
}

.notification-list {
  max-width: 850px;
  margin: auto;
}

.notification-row {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 13px;
  margin-bottom: 6px;
  padding: 14px;
  border: 1px solid #222b3b;
  border-radius: 14px;
  color: white;
  background: #101621;
  text-align: left;
}

.notification-row.unread {
  border-color: var(--hexa-primary);
}

.notification-row p {
  margin: 4px 0;
  color: #8a94a7;
}

.notification-row span {
  color: #667186;
  font-size: 11px;
}

.wallet-card {
  max-width: 700px;
  margin: 40px auto 15px;
  padding: 30px;
  border: 1px solid #2a3344;
  border-radius: 22px;
  background:
    linear-gradient(
      135deg,
      rgba(124,58,237,.18),
      #101621
    );
}

.wallet-card strong {
  display: block;
  margin: 8px 0 22px;
  font-size: 42px;
}

.wallet-actions {
  max-width: 700px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin: auto;
}

.wallet-actions button {
  padding: 14px;
  border: 1px solid #2a3344;
  border-radius: 13px;
  color: white;
  background: #111722;
}

.community-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 13px;
}

.community-card {
  padding: 18px;
  border: 1px solid #273043;
  border-radius: 16px;
  color: white;
  background: #111722;
  text-align: left;
}

.community-icon {
  width: 52px;
  height: 52px;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 16px;
  background: #1d2636;
  font-size: 26px;
}

.community-icon.large {
  width: 80px;
  height: 80px;
  margin: auto;
  font-size: 38px;
}

.community-card p {
  color: #7e899e;
}

.community-card span {
  color: #a78bfa;
  font-size: 12px;
}

.fullscreen-overlay {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 25px;
  background: rgba(0,0,0,.78);
}

.detail-panel {
  width: min(850px, 95vw);
  height: min(800px, 90vh);
  overflow-y: auto;
  border: 1px solid #293143;
  border-radius: 20px;
  background: #0d121d;
}

.detail-header {
  display: flex;
  align-items: center;
  gap: 13px;
  padding: 17px;
  border-bottom: 1px solid #242b3b;
}

.detail-header button {
  border: 0;
  color: white;
  background: transparent;
  font-size: 22px;
}

.community-hero {
  padding: 35px;
  text-align: center;
  border-bottom: 1px solid #242b3b;
}

.community-section {
  padding: 20px;
}

.section-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.community-placeholder {
  padding: 30px;
  margin-top: 12px;
  border-radius: 13px;
  color: #788398;
  background: #151b28;
  text-align: center;
}

.moments-row {
  display: flex;
  gap: 12px;
  overflow-x: auto;
}

.moment-card {
  position: relative;
  width: 165px;
  min-width: 165px;
  height: 255px;
  overflow: hidden;
  border: 0;
  border-radius: 16px;
  color: white;
  background: #171d2b;
}

.moment-card.seen {
  opacity: .6;
}

.moment-card > img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.moment-text-card {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 15px;
  background:
    linear-gradient(
      135deg,
      var(--hexa-primary),
      var(--hexa-secondary)
    );
}

.moment-overlay {
  position: absolute;
  left: 10px;
  right: 10px;
  bottom: 10px;
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 7px;
  border-radius: 10px;
  background: rgba(0,0,0,.45);
}

.moment-create-card {
  max-width: 750px;
  margin-bottom: 25px;
  padding: 18px;
  border: 1px solid #273044;
  border-radius: 17px;
  background: #101621;
}

.moment-create-card textarea,
.moment-create-card input {
  width: 100%;
  margin-top: 9px;
}

.moment-viewer {
  position: relative;
  width: min(650px, 94vw);
  height: min(850px, 90vh);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid #31384a;
  border-radius: 20px;
  background: #03060b;
}

.viewer-close {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 3;
  width: 40px;
  height: 40px;
  border: 0;
  border-radius: 50%;
  color: white;
  background: rgba(0,0,0,.55);
  font-size: 24px;
}

.moment-viewer-content {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
}

.moment-viewer-content img,
.moment-viewer-content video {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.viewer-text {
  padding: 35px;
  font-size: 28px;
  text-align: center;
}

.moment-viewer-footer {
  padding: 15px;
  border-top: 1px solid #252d3e;
  background: #090e16;
}

.moment-reactions {
  display: flex;
  gap: 6px;
}

.moment-reactions button {
  width: 40px;
  height: 36px;
  border: 0;
  border-radius: 10px;
  background: #171f2e;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 400;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(0,0,0,.72);
  backdrop-filter: blur(8px);
}

.modal {
  width: min(540px, 96vw);
  max-height: 90vh;
  overflow-y: auto;
  border: 1px solid #293143;
  border-radius: 20px;
  background: #0d121d;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 18px;
  border-bottom: 1px solid #232b3a;
}

.modal-header h2 {
  margin: 0;
}

.modal-header button {
  width: 35px;
  height: 35px;
  border: 0;
  border-radius: 9px;
  color: white;
  background: transparent;
  font-size: 24px;
}

.modal-body {
  padding: 20px;
}

.modal-body input,
.modal-body textarea,
.modal-body select {
  width: 100%;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 20px;
}

.profile-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.settings-section {
  margin-bottom: 25px;
}

.settings-section h3 {
  color: #aeb7c8;
}

.account-row {
  display: flex;
  align-items: center;
  gap: 11px;
}

.account-row strong,
.account-row span {
  display: block;
}

.account-row span {
  color: #7d8799;
  font-size: 12px;
}

.setting-toggle {
  width: 100%;
  min-height: 48px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: 0;
  border-bottom: 1px solid #222938;
  color: white;
  background: transparent;
}

.toggle {
  width: 42px;
  height: 24px;
  padding: 3px;
  border-radius: 20px;
  background: #343b4b;
}

.toggle span {
  display: block;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: white;
}

.toggle.on {
  background: var(--hexa-primary);
}

.toggle.on span {
  transform: translateX(18px);
}

.auth-page {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow-y: auto;
  padding: 20px;
}

.auth-card {
  width: min(450px, 100%);
  padding: 28px;
  border: 1px solid #292f40;
  border-radius: 22px;
  background: rgba(14,18,29,.95);
}

.brand-large {
  display: flex;
  align-items: center;
  gap: 13px;
  margin-bottom: 22px;
}

.brand-large h1 {
  margin: 0;
}

.brand-large span {
  color: #7f899d;
  font-size: 12px;
}

.auth-tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  padding: 4px;
  margin-bottom: 17px;
  border-radius: 12px;
  background: #151a26;
}

.auth-tabs button {
  border: 0;
  padding: 10px;
  border-radius: 9px;
  color: #7f899d;
  background: transparent;
}

.auth-tabs button.active {
  color: white;
  background: #272e3e;
}

.google-button {
  width: 100%;
  height: 46px;
  border: 1px solid #2a3142;
  border-radius: 11px;
  color: white;
  background: #151a25;
}

.or {
  display: flex;
  align-items: center;
  gap: 9px;
  margin: 17px 0;
  color: #596477;
  font-size: 11px;
}

.or span {
  flex: 1;
  height: 1px;
  background: #252b3a;
}

.auth-card form .primary-button {
  width: 100%;
  margin-top: 17px;
}

.error-box,
.success-box {
  margin-top: 12px;
  padding: 10px;
  border-radius: 9px;
  font-size: 12px;
}

.error-box {
  color: #fecaca;
  background: rgba(239,68,68,.12);
}

.success-box {
  color: #bbf7d0;
  background: rgba(34,197,94,.12);
}

.auth-switch {
  text-align: center;
}

.loading-screen {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background: #070a11;
}

.loading-logo {
  width: 70px;
  height: 70px;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 22px;
  font-size: 32px;
  font-weight: 900;
  background:
    linear-gradient(
      135deg,
      var(--hexa-primary),
      var(--hexa-secondary)
    );
  animation: pulse 1.6s infinite;
}

@keyframes pulse {
  50% {
    transform: scale(.92);
    opacity: .7;
  }
}

.hexa-toast {
  position: fixed;
  right: 18px;
  bottom: 18px;
  z-index: 600;
  max-width: 380px;
  padding: 12px 15px;
  border: 1px solid #313a4e;
  border-radius: 12px;
  color: white;
  background: #151c29;
}

@media (max-width: 1000px) {
  .sidebar {
    width: 78px;
    padding: 15px 8px;
  }

  .sidebar-brand span,
  .nav-item > span:not(.nav-icon),
  .sidebar-bottom span {
    display: none;
  }

  .sidebar-brand {
    justify-content: center;
  }

  .nav-item {
    justify-content: center;
    padding: 0;
  }

  .chat-list {
    width: 340px;
  }
}

.mobile-back {
  display: none;
}

@media (max-width: 700px) {
  .sidebar {
    position: fixed;
    z-index: 50;
    left: 0;
    right: 0;
    bottom: 0;
    width: 100%;
    height: 65px;
    padding: 5px;
    display: flex;
    flex-direction: row;
    border-right: 0;
    border-top: 1px solid #202535;
  }

  .sidebar-brand,
  .sidebar-bottom {
    display: none;
  }

  .sidebar nav {
    width: 100%;
    display: flex;
    flex-direction: row;
  }

  .nav-item {
    flex: 1;
    min-width: 0;
    height: 55px;
  }

  .hexa-main {
    padding-bottom: 65px;
  }

  .chat-list {
    width: 100%;
  }

  .chat-list.mobile-hidden {
    display: none;
  }

  .chat-panel {
    display: none;
  }

  .chat-panel.mobile-open {
    display: block;
  }

  .mobile-back {
    display: block;
  }

  .page {
    padding: 17px;
  }

  .message-wrap {
    max-width: 84%;
  }

  .channel-layout {
    border: 0;
  }

  .channel-list {
    width: 100%;
    border-right: 0;
  }

  .channel-feed {
    display: none;
  }

  .community-grid {
    grid-template-columns: 1fr;
  }

  .wallet-actions {
    grid-template-columns: 1fr;
  }

  .modal-overlay,
  .fullscreen-overlay {
    padding: 0;
  }

  .modal,
  .detail-panel,
  .moment-viewer {
    width: 100%;
    height: 100%;
    max-height: 100%;
    border: 0;
    border-radius: 0;
  }

  .emoji-grid {
    grid-template-columns: repeat(8, 1fr);
  }

  .message-more-button {
    display: none;
  }

  .whatsapp-chat-menu {
    right: 0;
    width: min(285px, calc(100vw - 25px));
    min-width: min(285px, calc(100vw - 25px));
  }

  .submenu {
    position: fixed;
    right: 12px;
    top: auto;
    bottom: 80px;
  }
}
`;

document.head.appendChild(
  style
);

/* =========================================================
   MOUNT
   ========================================================= */

createRoot(
  document.getElementById(
    "root"
  )
).render(
  <Root />
);