import React, { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

/* =========================================================
   SUPABASE
   ========================================================= */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

const SUPABASE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase =
  SUPABASE_URL && SUPABASE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          flowType: "pkce",
        },
      })
    : null;


/* =========================================================
   GLOBAL STYLES
   ========================================================= */

const css = `
* {
  box-sizing: border-box;
}

html,
body,
#root {
  margin: 0;
  min-height: 100%;
  width: 100%;
}

body {
  font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont,
    "Segoe UI", sans-serif;
}

button,
input,
textarea {
  font: inherit;
}

button {
  -webkit-tap-highlight-color: transparent;
}

::-webkit-scrollbar {
  width: 7px;
  height: 7px;
}

::-webkit-scrollbar-thumb {
  background: rgba(255,255,255,.14);
  border-radius: 99px;
}
`;


/* =========================================================
   HELPERS
   ========================================================= */

function getAuthErrorMessage(error) {
  const message = String(error?.message || "").toLowerCase();

  if (message.includes("invalid login credentials")) {
    return "The email or password is incorrect.";
  }

  if (message.includes("email not confirmed")) {
    return "Please verify your email address before signing in.";
  }

  if (message.includes("user already registered")) {
    return "An account with this email already exists.";
  }

  if (message.includes("rate limit")) {
    return "Too many attempts. Please wait a moment and try again.";
  }

  if (message.includes("pkce")) {
    return "The verification session could not be restored. Please open the verification link in the same browser and try again.";
  }

  return error?.message || "Something went wrong. Please try again.";
}


function getPasswordStrength(password) {
  if (!password) return { score: 0, label: "" };

  let score = 0;

  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 2) return { score, label: "Weak" };
  if (score <= 4) return { score, label: "Good" };

  return { score, label: "Strong" };
}


function makeUsername(name, email, id) {
  const source =
    name ||
    email?.split("@")[0] ||
    `user${id?.slice(0, 8) || ""}`;

  const base =
    source
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "")
      .slice(0, 18) ||
    `hexa${id?.slice(0, 8) || "user"}`;

  return base;
}


/* =========================================================
   PROFILE
   ========================================================= */

async function ensureHexaProfile(user) {
  if (!supabase || !user) return null;

  const metadata = user.user_metadata || {};

  const fullName =
    metadata.full_name ||
    metadata.name ||
    metadata.display_name ||
    "";

  const avatarUrl =
    metadata.avatar_url ||
    metadata.picture ||
    null;

  try {
    const {
      data: existing,
      error,
    } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      console.error("Profile lookup error:", error);
      return null;
    }

    if (existing) {
      const updates = {};

      if (!existing.full_name && fullName) {
        updates.full_name = fullName;
      }

      if (!existing.avatar_url && avatarUrl) {
        updates.avatar_url = avatarUrl;
      }

      if (!existing.email && user.email) {
        updates.email = user.email;
      }

      if (Object.keys(updates).length) {
        updates.updated_at = new Date().toISOString();

        const {
          data,
          error: updateError,
        } = await supabase
          .from("profiles")
          .update(updates)
          .eq("id", user.id)
          .select()
          .maybeSingle();

        if (updateError) {
          console.error(
            "Profile update error:",
            updateError
          );

          return existing;
        }

        return data || existing;
      }

      return existing;
    }

    const username = makeUsername(
      fullName,
      user.email,
      user.id
    );

    const {
      data,
      error: insertError,
    } = await supabase
      .from("profiles")
      .insert({
        id: user.id,
        email: user.email || null,
        username,
        full_name: fullName,
        avatar_url: avatarUrl,
      })
      .select()
      .single();

    if (!insertError) {
      return data;
    }

    /*
     * Username collision fallback.
     */
    if (
      String(insertError.message || "")
        .toLowerCase()
        .includes("username")
    ) {
      const fallbackUsername =
        `${username}_${Math.floor(
          Math.random() * 999999
        )}`;

      const {
        data: retryData,
        error: retryError,
      } = await supabase
        .from("profiles")
        .insert({
          id: user.id,
          email: user.email || null,
          username: fallbackUsername,
          full_name: fullName,
          avatar_url: avatarUrl,
        })
        .select()
        .single();

      if (retryError) {
        console.error(
          "Profile retry failed:",
          retryError
        );

        return null;
      }

      return retryData;
    }

    console.error(
      "Profile creation error:",
      insertError
    );

    return null;
  } catch (error) {
    console.error(
      "Profile initialization failed:",
      error
    );

    return null;
  }
}


/* =========================================================
   CONFIG ERROR
   ========================================================= */

function SupabaseConfigError() {
  return (
    <div style={styles.centerScreen}>
      <div style={styles.authCard}>
        <div style={styles.logo}>HEXA</div>

        <h2>Supabase configuration missing</h2>

        <p style={styles.muted}>
          Add these variables to your Vite environment:
        </p>

        <pre style={styles.code}>
{`VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_publishable_key`}
        </pre>

        <p style={styles.smallMuted}>
          Restart Vite after changing your environment
          variables.
        </p>
      </div>
    </div>
  );
}


/* =========================================================
   AUTH FIELD
   ========================================================= */

function AuthField({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  autoComplete,
}) {
  return (
    <label style={{ display: "block", marginBottom: 15 }}>
      <span style={styles.fieldLabel}>{label}</span>

      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        style={styles.input}
      />
    </label>
  );
}


/* =========================================================
   AUTH SCREEN
   ========================================================= */

function AuthScreen() {
  const [mode, setMode] = useState("signin");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const strength = getPasswordStrength(password);

  function clearMessages() {
    setError("");
    setMessage("");
  }


  /* ---------------------------------------------------------
     SIGN IN
     --------------------------------------------------------- */

  async function handleSignIn(event) {
    event.preventDefault();

    clearMessages();

    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }

    setLoading(true);

    try {
      const {
        data,
        error,
      } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) throw error;

      /*
       * The global Supabase auth listener in App()
       * receives this session and opens HEXA.
       */

      if (data?.user) {
        await ensureHexaProfile(data.user);
      }
    } catch (error) {
      setError(getAuthErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }


  /* ---------------------------------------------------------
     SIGN UP
     --------------------------------------------------------- */

  async function handleSignUp(event) {
    event.preventDefault();

    clearMessages();

    if (!fullName.trim()) {
      setError("Enter your full name.");
      return;
    }

    if (!email.trim()) {
      setError("Enter your email.");
      return;
    }

    if (password.length < 8) {
      setError(
        "Your password must contain at least 8 characters."
      );

      return;
    }

    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      /*
       * IMPORTANT:
       *
       * The emailRedirectTo tells Supabase exactly where
       * the verification link should return the user.
       *
       * After verification, Supabase restores the session
       * and the App auth listener opens HEXA.
       */

      const {
        data,
        error,
      } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
          },

          emailRedirectTo:
            window.location.origin,
        },
      });

      if (error) throw error;

      /*
       * If email confirmation is enabled:
       *
       * session === null
       *
       * The user must verify their email.
       */

      if (!data?.session) {
        setMessage(
          "Account created successfully. Check your email and verify your HEXA account. After verification, HEXA will open automatically."
        );

        setPassword("");
        setConfirmPassword("");

        return;
      }

      /*
       * If email confirmation is disabled,
       * Supabase gives us an active session immediately.
       */

      if (data.user) {
        await ensureHexaProfile(data.user);
      }
    } catch (error) {
      setError(getAuthErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }


  /* ---------------------------------------------------------
     GOOGLE
     --------------------------------------------------------- */

  async function handleGoogle() {
    clearMessages();

    setGoogleLoading(true);

    try {
      const {
        error,
      } = await supabase.auth.signInWithOAuth({
        provider: "google",

        options: {
          redirectTo: window.location.origin,

          queryParams: {
            access_type: "offline",
            prompt: "select_account",
          },
        },
      });

      if (error) throw error;
    } catch (error) {
      setError(getAuthErrorMessage(error));
      setGoogleLoading(false);
    }
  }


  /* ---------------------------------------------------------
     FORGOT PASSWORD
     --------------------------------------------------------- */

  async function handleForgotPassword() {
    clearMessages();

    if (!email.trim()) {
      setError("Enter your email address first.");
      return;
    }

    setLoading(true);

    try {
      const {
        error,
      } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        {
          redirectTo:
            `${window.location.origin}/reset-password`,
        }
      );

      if (error) throw error;

      setMessage(
        "If an account exists for that email, a password reset link has been sent."
      );
    } catch (error) {
      setError(getAuthErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }


  return (
    <div style={styles.authScreen}>
      <div style={styles.authCard}>

        <div style={styles.authBrand}>
          <div style={styles.logo}>
            HEXA
          </div>

          <div style={styles.tagline}>
            Communication without limits.
          </div>
        </div>


        <div style={styles.authTabs}>
          <button
            onClick={() => {
              clearMessages();
              setMode("signin");
            }}
            style={{
              ...styles.authTab,
              ...(mode === "signin"
                ? styles.authTabActive
                : {}),
            }}
          >
            Sign In
          </button>

          <button
            onClick={() => {
              clearMessages();
              setMode("signup");
            }}
            style={{
              ...styles.authTab,
              ...(mode === "signup"
                ? styles.authTabActive
                : {}),
            }}
          >
            Sign Up
          </button>
        </div>


        <button
          onClick={handleGoogle}
          disabled={
            googleLoading ||
            loading
          }
          style={styles.googleButton}
        >
          <span style={{ fontWeight: 900 }}>
            G
          </span>

          {googleLoading
            ? "Connecting..."
            : "Continue with Google"}
        </button>


        <div style={styles.divider}>
          <span />
          OR
          <span />
        </div>


        <form
          onSubmit={
            mode === "signin"
              ? handleSignIn
              : handleSignUp
          }
        >

          {mode === "signup" && (
            <AuthField
              label="Full name"
              value={fullName}
              onChange={setFullName}
              placeholder="Your name"
              autoComplete="name"
            />
          )}


          <AuthField
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="you@example.com"
            autoComplete="email"
          />


          <AuthField
            label="Password"
            type="password"
            value={password}
            onChange={setPassword}
            placeholder="Your password"
            autoComplete={
              mode === "signin"
                ? "current-password"
                : "new-password"
            }
          />


          {mode === "signup" &&
            password && (
              <div
                style={{
                  fontSize: 12,
                  marginTop: -6,
                  marginBottom: 14,

                  color:
                    strength.label === "Strong"
                      ? "#67e8a5"
                      : strength.label === "Good"
                      ? "#facc15"
                      : "#fb7185",
                }}
              >
                Password strength:{" "}
                {strength.label}
              </div>
            )}


          {mode === "signup" && (
            <AuthField
              label="Confirm password"
              type="password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              placeholder="Repeat your password"
              autoComplete="new-password"
            />
          )}


          {mode === "signin" && (
            <button
              type="button"
              onClick={handleForgotPassword}
              style={styles.forgot}
            >
              Forgot password?
            </button>
          )}


          {error && (
            <div style={styles.errorBox}>
              {error}
            </div>
          )}


          {message && (
            <div style={styles.successBox}>
              {message}
            </div>
          )}


          <button
            type="submit"
            disabled={
              loading ||
              googleLoading
            }
            style={styles.primaryButton}
          >
            {loading
              ? "Please wait..."
              : mode === "signin"
              ? "Sign In to HEXA"
              : "Create HEXA Account"}
          </button>
        </form>


        <div style={styles.authFooter}>
          Your account, profile and HEXA identity are
          securely connected to your Supabase account.
        </div>

      </div>
    </div>
  );
}


/* =========================================================
   AVATAR
   ========================================================= */

function Avatar({
  src,
  name = "User",
  size = 48,
}) {
  const initial =
    name?.trim()?.charAt(0)?.toUpperCase() ||
    "U";

  if (src) {
    return (
      <img
        src={src}
        alt=""
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          objectFit: "cover",
          flexShrink: 0,
        }}
      />
    );
  }

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        display: "grid",
        placeItems: "center",
        flexShrink: 0,
        background:
          "linear-gradient(135deg,#ffffff,#9298a5)",
        color: "#090a0e",
        fontWeight: 900,
        fontSize: Math.max(
          13,
          size * 0.38
        ),
      }}
    >
      {initial}
    </div>
  );
}


/* =========================================================
   HEXA WORKSPACE
   ========================================================= */

function AuthenticatedHEXA({
  session,
}) {
  const user = session.user;

  const [profile, setProfile] =
    useState(null);

  const [page, setPage] =
    useState("chat");

  const [theme, setTheme] =
    useState(
      localStorage.getItem(
        "hexa-theme"
      ) || "dark"
    );

  const [mobileSidebar, setMobileSidebar] =
    useState(false);

  const [conversations, setConversations] =
    useState([]);

  const [
    activeConversation,
    setActiveConversation,
  ] = useState(null);

  const [messages, setMessages] =
    useState([]);

  const [messageText, setMessageText] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [people, setPeople] =
    useState([]);

  const [
    loadingWorkspace,
    setLoadingWorkspace,
  ] = useState(true);

  const [sending, setSending] =
    useState(false);


  /* ---------------------------------------------------------
     PROFILE
     --------------------------------------------------------- */

  useEffect(() => {
    let alive = true;

    async function loadProfile() {
      const p =
        await ensureHexaProfile(user);

      if (alive) {
        setProfile(p);
        setLoadingWorkspace(false);
      }
    }

    loadProfile();

    return () => {
      alive = false;
    };
  }, [user]);


  /* ---------------------------------------------------------
     THEME
     --------------------------------------------------------- */

  useEffect(() => {
    localStorage.setItem(
      "hexa-theme",
      theme
    );
  }, [theme]);


  /* ---------------------------------------------------------
     LOAD CONVERSATIONS
     --------------------------------------------------------- */

  useEffect(() => {
    if (
      !supabase ||
      !user?.id
    ) {
      return;
    }

    let alive = true;

    async function loadConversations() {
      const {
        data: memberships,
        error,
      } = await supabase
        .from("conversation_members")
        .select(`
          conversation_id,
          is_admin,
          conversations (
            id,
            type,
            name,
            avatar_url,
            theme,
            owner_id,
            created_by,
            created_at,
            updated_at,
            user_a,
            user_b
          )
        `)
        .eq(
          "user_id",
          user.id
        );

      if (error) {
        console.error(
          "Conversation loading failed:",
          error
        );

        if (alive) {
          setConversations([]);
        }

        return;
      }

      const rows =
        memberships
          ?.map(
            (item) =>
              item.conversations
          )
          .filter(Boolean) || [];

      if (alive) {
        setConversations(rows);

        const systemGroup =
          rows.find(
            (conversation) =>
              conversation.name ===
                "THE HEXA GROUP" &&
              conversation.type ===
                "system_group"
          );

        if (systemGroup) {
          setActiveConversation(
            systemGroup
          );
        } else if (rows.length) {
          setActiveConversation(
            rows[0]
          );
        }
      }
    }

    loadConversations();

    return () => {
      alive = false;
    };
  }, [user?.id]);


  /* ---------------------------------------------------------
     LOAD MESSAGES
     --------------------------------------------------------- */

  useEffect(() => {
    if (
      !supabase ||
      !activeConversation?.id
    ) {
      setMessages([]);
      return;
    }

    let alive = true;

    async function loadMessages() {
      const {
        data,
        error,
      } = await supabase
        .from("messages")
        .select("*")
        .eq(
          "conversation_id",
          activeConversation.id
        )
        .is(
          "deleted_at",
          null
        )
        .order(
          "created_at",
          {
            ascending: true,
          }
        );

      if (error) {
        console.error(
          "Message loading failed:",
          error
        );

        return;
      }

      if (alive) {
        setMessages(
          data || []
        );
      }
    }

    loadMessages();


    /*
     * REALTIME MESSAGES
     */

    const channel =
      supabase
        .channel(
          `hexa-messages-${activeConversation.id}`
        )
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter:
              `conversation_id=eq.${activeConversation.id}`,
          },
          (payload) => {
            setMessages(
              (current) => {
                if (
                  current.some(
                    (message) =>
                      message.id ===
                      payload.new.id
                  )
                ) {
                  return current;
                }

                return [
                  ...current,
                  payload.new,
                ];
              }
            );
          }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "messages",
            filter:
              `conversation_id=eq.${activeConversation.id}`,
          },
          (payload) => {
            setMessages(
              (current) =>
                current.map(
                  (message) =>
                    message.id ===
                    payload.new.id
                      ? payload.new
                      : message
                )
            );
          }
        )
        .subscribe();

    return () => {
      alive = false;
      supabase.removeChannel(
        channel
      );
    };
  }, [
    activeConversation?.id,
  ]);


  /* ---------------------------------------------------------
     SEARCH PEOPLE
     --------------------------------------------------------- */

  useEffect(() => {
    if (
      !supabase ||
      !search.trim()
    ) {
      setPeople([]);
      return;
    }

    const timer =
      setTimeout(
        async () => {
          const term =
            search.trim();

          const {
            data,
            error,
          } = await supabase
            .from("profiles")
            .select(
              "id,username,full_name,avatar_url,email"
            )
            .or(
              `username.ilike.%${term}%,full_name.ilike.%${term}%`
            )
            .neq(
              "id",
              user.id
            )
            .limit(20);

          if (!error) {
            setPeople(
              data || []
            );
          }
        },
        300
      );

    return () =>
      clearTimeout(timer);
  }, [
    search,
    user.id,
  ]);


  /* ---------------------------------------------------------
     SEND MESSAGE
     --------------------------------------------------------- */

  async function sendMessage() {
    const text =
      messageText.trim();

    if (
      !text ||
      !activeConversation ||
      sending
    ) {
      return;
    }

    /*
     * THE HEXA GROUP is read-only for
     * ordinary members.
     */

    if (
      activeConversation.type ===
        "system_group" &&
      activeConversation.owner_id !==
        user.id
    ) {
      setMessageText("");
      return;
    }

    setSending(true);

    try {
      let receiverId =
        user.id;

      if (
        activeConversation.type ===
        "direct"
      ) {
        receiverId =
          activeConversation.user_a ===
          user.id
            ? activeConversation.user_b
            : activeConversation.user_a;
      }

      const clientMessageId =
        `${user.id}-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2)}`;

      const {
        data,
        error,
      } = await supabase
        .from("messages")
        .insert({
          sender_id:
            user.id,

          receiver_id:
            receiverId,

          content:
            text,

          conversation_id:
            activeConversation.id,

          client_message_id:
            clientMessageId,

          message_type:
            "text",

          status:
            "sent",

          metadata: {},
        })
        .select()
        .single();

      if (error) throw error;

      setMessages(
        (current) => {
          if (
            current.some(
              (message) =>
                message.id ===
                data.id
            )
          ) {
            return current;
          }

          return [
            ...current,
            data,
          ];
        }
      );

      setMessageText("");
    } catch (error) {
      console.error(
        "Unable to send message:",
        error
      );
    } finally {
      setSending(false);
    }
  }


  /* ---------------------------------------------------------
     CREATE DIRECT CHAT
     --------------------------------------------------------- */

  async function openPerson(person) {
    if (!person?.id) return;

    const existing =
      conversations.find(
        (conversation) =>
          conversation.type ===
            "direct" &&

          (
            conversation.user_a ===
              person.id ||
            conversation.user_b ===
              person.id
          ) &&

          (
            conversation.user_a ===
              user.id ||
            conversation.user_b ===
              user.id
          )
      );

    if (existing) {
      setActiveConversation(
        existing
      );

      setPage("chat");
      setSearch("");

      return;
    }


    const {
      data: conversation,
      error,
    } = await supabase
      .from("conversations")
      .insert({
        type: "direct",
        created_by:
          user.id,
        owner_id:
          user.id,
        user_a:
          user.id,
        user_b:
          person.id,
        name:
          person.full_name ||
          person.username ||
          "Chat",
      })
      .select()
      .single();

    if (error) {
      console.error(
        "Unable to create chat:",
        error
      );

      return;
    }


    const {
      error:
        membersError,
    } = await supabase
      .from(
        "conversation_members"
      )
      .upsert([
        {
          conversation_id:
            conversation.id,

          user_id:
            user.id,

          is_admin:
            true,
        },

        {
          conversation_id:
            conversation.id,

          user_id:
            person.id,

          is_admin:
            false,
        },
      ]);

    if (membersError) {
      console.error(
        "Unable to create chat members:",
        membersError
      );
    }


    setConversations(
      (current) => [
        conversation,
        ...current,
      ]
    );

    setActiveConversation(
      conversation
    );

    setSearch("");
    setPage("chat");
  }


  /* ---------------------------------------------------------
     SIGN OUT
     --------------------------------------------------------- */

  async function signOut() {
    await supabase.auth.signOut();
  }


  const isSystemGroup =
    activeConversation?.type ===
      "system_group" &&
    activeConversation?.name ===
      "THE HEXA GROUP";


  const canSend =
    !isSystemGroup ||
    activeConversation?.owner_id ===
      user.id;


  const displayName =
    profile?.full_name ||
    user.user_metadata?.full_name ||
    user.email?.split("@")[0] ||
    "HEXA User";


  if (loadingWorkspace) {
    return (
      <div style={styles.loadingScreen}>
        <div style={styles.logo}>
          HEXA
        </div>

        <div style={styles.smallMuted}>
          Opening your workspace...
        </div>
      </div>
    );
  }


  return (
    <div
      className={`hexa-app theme-${theme}`}
      style={{
        ...styles.app,

        background:
          theme === "light"
            ? "#f4f5f7"
            : "#07080c",

        color:
          theme === "light"
            ? "#101114"
            : "#fff",
      }}
    >

      <style>
        {css}
      </style>


      {/* =====================================================
          SIDEBAR
          ===================================================== */}

      <aside
        style={{
          ...styles.sidebar,

          background:
            theme === "light"
              ? "#fff"
              : "#0d0f14",

          borderRight:
            theme === "light"
              ? "1px solid #e4e6eb"
              : "1px solid #20232c",

          transform:
            mobileSidebar
              ? "translateX(0)"
              : undefined,
        }}
      >

        <div style={styles.sidebarTop}>
          <div>
            <div style={styles.sidebarLogo}>
              HEXA
            </div>

            <div style={styles.nexus}>
              NEXUS
            </div>
          </div>

          <button
            onClick={signOut}
            style={styles.iconButton}
            title="Sign out"
          >
            ↪
          </button>
        </div>


        {/* PROFILE */}

        <div style={styles.profileCard}>
          <Avatar
            src={profile?.avatar_url}
            name={displayName}
            size={44}
          />

          <div
            style={{
              minWidth: 0,
            }}
          >
            <div style={styles.profileName}>
              {displayName}
            </div>

            <div style={styles.profileUsername}>
              @{profile?.username || "user"}
            </div>
          </div>
        </div>


        {/* NAVIGATION */}

        <div style={styles.navLabel}>
          WORKSPACE
        </div>

        {[
          ["chat", "💬", "Chat"],
          ["groups", "👥", "Groups"],
          ["communities", "🌐", "Communities"],
          ["status", "◉", "Status"],
          ["channels", "📢", "Channels"],
          ["calls", "☎", "Calls"],
          ["kora", "✦", "Kora"],
        ].map(
          ([id, icon, label]) => (
            <button
              key={id}
              onClick={() => {
                setPage(id);
                setMobileSidebar(false);
              }}
              style={{
                ...styles.navButton,

                ...(page === id
                  ? styles.navButtonActive
                  : {}),
              }}
            >
              <span>{icon}</span>
              <span>{label}</span>
            </button>
          )
        )}


        <div style={{ flex: 1 }} />


        {/* THEME */}

        <div style={styles.navLabel}>
          APPEARANCE
        </div>

        <button
          onClick={() =>
            setTheme(
              theme === "dark"
                ? "light"
                : "dark"
            )
          }
          style={styles.navButton}
        >
          <span>
            {theme === "dark"
              ? "☀️"
              : "🌙"}
          </span>

          <span>
            {theme === "dark"
              ? "Light theme"
              : "Dark theme"}
          </span>
        </button>


        <button
          onClick={signOut}
          style={{
            ...styles.navButton,
            color: "#f87171",
          }}
        >
          <span>↪</span>
          <span>Sign out</span>
        </button>
      </aside>


      {/* =====================================================
          MAIN
          ===================================================== */}

      <main style={styles.main}>

        {/* HEADER */}

        <header
          style={{
            ...styles.header,

            background:
              theme === "light"
                ? "rgba(255,255,255,.9)"
                : "rgba(7,8,12,.9)",

            borderBottom:
              theme === "light"
                ? "1px solid #e4e6eb"
                : "1px solid #20232c",
          }}
        >

          <button
            onClick={() =>
              setMobileSidebar(
                !mobileSidebar
              )
            }
            style={styles.mobileMenu}
          >
            ☰
          </button>


          <div
            style={{
              minWidth: 0,
            }}
          >
            <div style={styles.headerTitle}>
              {page === "chat"
                ? "Chat"
                : page === "groups"
                ? "Groups"
                : page === "communities"
                ? "Communities"
                : page === "status"
                ? "Status"
                : page === "channels"
                ? "Channels"
                : page === "calls"
                ? "Calls"
                : "Kora"}
            </div>

            <div style={styles.headerSubtitle}>
              {displayName}
            </div>
          </div>


          <div style={styles.searchWrap}>
            <span>⌕</span>

            <input
              value={search}
              onChange={(e) =>
                setSearch(
                  e.target.value
                )
              }
              placeholder="Search people on HEXA"
              style={styles.searchInput}
            />
          </div>
        </header>


        {/* SEARCH RESULTS */}

        {search.trim() && (
          <div style={styles.searchResults}>
            <div style={styles.searchHeading}>
              HEXA PEOPLE
            </div>

            {people.length === 0 ? (
              <div style={styles.empty}>
                No HEXA users found.
              </div>
            ) : (
              people.map(
                (person) => (
                  <button
                    key={person.id}
                    onClick={() =>
                      openPerson(
                        person
                      )
                    }
                    style={styles.personResult}
                  >
                    <Avatar
                      src={
                        person.avatar_url
                      }
                      name={
                        person.full_name ||
                        person.username
                      }
                      size={42}
                    />

                    <div
                      style={{
                        textAlign:
                          "left",
                      }}
                    >
                      <div
                        style={
                          styles.personName
                        }
                      >
                        {person.full_name ||
                          person.username}
                      </div>

                      <div
                        style={
                          styles.personUsername
                        }
                      >
                        @{person.username}
                      </div>
                    </div>
                  </button>
                )
              )
            )}
          </div>
        )}


        {/* ===================================================
            CHAT
            =================================================== */}

        {page === "chat" && (
          <div style={styles.chatLayout}>

            {/* CHAT LIST */}

            <section
              style={{
                ...styles.chatList,

                background:
                  theme === "light"
                    ? "#fff"
                    : "#0b0d12",

                borderRight:
                  theme === "light"
                    ? "1px solid #e4e6eb"
                    : "1px solid #20232c",
              }}
            >

              <div style={styles.sectionHeader}>
                <div>
                  <div style={styles.sectionTitle}>
                    Messages
                  </div>

                  <div style={styles.smallMuted}>
                    {conversations.length} chats
                  </div>
                </div>

                <button
                  style={styles.roundButton}
                  title="New chat"
                >
                  +
                </button>
              </div>


              {conversations.length === 0 ? (
                <div style={styles.empty}>
                  <div
                    style={{
                      fontSize: 34,
                    }}
                  >
                    💬
                  </div>

                  <div
                    style={{
                      marginTop: 10,
                    }}
                  >
                    No chats yet
                  </div>

                  <div style={styles.smallMuted}>
                    Search for a HEXA user
                    to start messaging.
                  </div>
                </div>
              ) : (
                conversations.map(
                  (conversation) => {
                    const selected =
                      activeConversation?.id ===
                      conversation.id;

                    return (
                      <button
                        key={conversation.id}
                        onClick={() =>
                          setActiveConversation(
                            conversation
                          )
                        }
                        style={{
                          ...styles.chatRow,

                          ...(selected
                            ? styles.chatRowActive
                            : {}),
                        }}
                      >
                        <Avatar
                          name={
                            conversation.name ||
                            "Chat"
                          }
                          src={
                            conversation.avatar_url
                          }
                          size={46}
                        />

                        <div
                          style={{
                            minWidth: 0,
                            flex: 1,
                            textAlign:
                              "left",
                          }}
                        >
                          <div
                            style={
                              styles.chatName
                            }
                          >
                            {conversation.name ||
                              "Direct chat"}
                          </div>

                          <div
                            style={
                              styles.chatPreview
                            }
                          >
                            {conversation.type ===
                            "system_group"
                              ? "Official HEXA announcements"
                              : "Tap to open conversation"}
                          </div>
                        </div>
                      </button>
                    );
                  }
                )
              )}
            </section>


            {/* MESSAGE PANEL */}

            <section style={styles.messagePanel}>

              {!activeConversation ? (
                <div style={styles.emptyPanel}>
                  <div
                    style={{
                      fontSize: 60,
                    }}
                  >
                    💬
                  </div>

                  <h2>
                    Welcome to HEXA
                  </h2>

                  <p style={styles.muted}>
                    Select a conversation
                    or search for
                    someone on HEXA.
                  </p>
                </div>
              ) : (
                <>

                  {/* MESSAGE HEADER */}

                  <div style={styles.messageHeader}>
                    <Avatar
                      name={
                        activeConversation.name
                      }
                      src={
                        activeConversation.avatar_url
                      }
                      size={44}
                    />

                    <div
                      style={{
                        minWidth: 0,
                      }}
                    >
                      <div
                        style={
                          styles.messageHeaderTitle
                        }
                      >
                        {
                          activeConversation.name
                        }
                      </div>

                      <div style={styles.smallMuted}>
                        {isSystemGroup
                          ? "Official HEXA"
                          : "Conversation"}
                      </div>
                    </div>

                    <div
                      style={{
                        marginLeft: "auto",
                        display: "flex",
                        gap: 7,
                      }}
                    >
                      <button
                        style={
                          styles.callButton
                        }
                        title="Voice call"
                      >
                        ☎
                      </button>

                      <button
                        style={
                          styles.callButton
                        }
                        title="Video call"
                      >
                        ◉
                      </button>
                    </div>
                  </div>


                  {/* MESSAGES */}

                  <div style={styles.messagesArea}>

                    {messages.length === 0 ? (
                      <div
                        style={
                          styles.emptyMessage
                        }
                      >
                        <div
                          style={{
                            fontSize: 42,
                          }}
                        >
                          {isSystemGroup
                            ? "📢"
                            : "💬"}
                        </div>

                        <div
                          style={{
                            marginTop: 12,
                            fontWeight: 800,
                          }}
                        >
                          {isSystemGroup
                            ? "THE HEXA GROUP"
                            : "No messages yet"}
                        </div>

                        <div
                          style={
                            styles.smallMuted
                          }
                        >
                          {isSystemGroup
                            ? "Official HEXA announcements"
                            : "Start the conversation."}
                        </div>
                      </div>
                    ) : (
                      messages.map(
                        (message) => {
                          const mine =
                            message.sender_id ===
                            user.id;

                          return (
                            <div
                              key={
                                message.id
                              }
                              style={{
                                display:
                                  "flex",

                                justifyContent:
                                  mine
                                    ? "flex-end"
                                    : "flex-start",

                                marginBottom: 8,
                              }}
                            >
                              <div
                                style={{
                                  ...styles.messageBubble,

                                  ...(mine
                                    ? styles.messageMine
                                    : styles.messageOther),
                                }}
                              >
                                {message.content}

                                <div
                                  style={{
                                    fontSize: 9,
                                    opacity:
                                      0.55,
                                    marginTop: 5,
                                    textAlign:
                                      "right",
                                  }}
                                >
                                  {new Date(
                                    message.created_at
                                  ).toLocaleTimeString(
                                    [],
                                    {
                                      hour:
                                        "2-digit",
                                      minute:
                                        "2-digit",
                                    }
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        }
                      )
                    )}

                  </div>


                  {/* COMPOSER */}

                  <div style={styles.composer}>

                    <button
                      style={
                        styles.composerButton
                      }
                      title="Emoji"
                    >
                      😊
                    </button>

                    <button
                      style={
                        styles.composerButton
                      }
                      title="GIF"
                    >
                      GIF
                    </button>

                    <button
                      style={
                        styles.composerButton
                      }
                      title="Attach"
                    >
                      ＋
                    </button>

                    <input
                      value={
                        messageText
                      }
                      disabled={
                        !canSend
                      }
                      onChange={(e) =>
                        setMessageText(
                          e.target.value
                        )
                      }
                      onKeyDown={(e) => {
                        if (
                          e.key ===
                            "Enter" &&
                          !e.shiftKey
                        ) {
                          e.preventDefault();
                          sendMessage();
                        }
                      }}
                      placeholder={
                        canSend
                          ? "Type a message..."
                          : "Only the HEXA owner can post here"
                      }
                      style={{
                        ...styles.messageInput,

                        opacity:
                          canSend
                            ? 1
                            : 0.55,
                      }}
                    />

                    <button
                      onClick={
                        sendMessage
                      }
                      disabled={
                        !canSend ||
                        !messageText.trim() ||
                        sending
                      }
                      style={{
                        ...styles.sendButton,

                        opacity:
                          canSend &&
                          messageText.trim()
                            ? 1
                            : 0.45,
                      }}
                    >
                      ➤
                    </button>
                  </div>

                </>
              )}

            </section>
          </div>
        )}


        {/* ===================================================
            OTHER WORKSPACE PAGES
            =================================================== */}

        {page !== "chat" && (
          <div style={styles.pageContainer}>

            <div style={styles.pageHero}>

              <div style={styles.pageIcon}>
                {page === "groups"
                  ? "👥"
                  : page === "communities"
                  ? "🌐"
                  : page === "status"
                  ? "◉"
                  : page === "channels"
                  ? "📢"
                  : page === "calls"
                  ? "☎"
                  : "✦"}
              </div>

              <h1>
                {page === "groups"
                  ? "Groups"
                  : page === "communities"
                  ? "Communities"
                  : page === "status"
                  ? "Status"
                  : page === "channels"
                  ? "Channels"
                  : page === "calls"
                  ? "Calls"
                  : "Kora"}
              </h1>

              <p style={styles.muted}>
                This HEXA workspace is
                connected to your
                authenticated account.
              </p>
            </div>


            {page === "status" && (
              <div style={styles.featureGrid}>

                <div style={styles.featureCard}>
                  <div style={styles.featureIcon}>
                    ＋
                  </div>

                  <h3>
                    Create Status
                  </h3>

                  <p style={styles.muted}>
                    Share text, photos
                    and videos.
                  </p>
                </div>


                <div style={styles.featureCard}>
                  <div style={styles.featureIcon}>
                    ◉
                  </div>

                  <h3>
                    24-hour Status
                  </h3>

                  <p style={styles.muted}>
                    Status updates
                    disappear after
                    24 hours.
                  </p>
                </div>


                <div style={styles.featureCard}>
                  <div style={styles.featureIcon}>
                    ❤️
                  </div>

                  <h3>
                    Reactions
                  </h3>

                  <p style={styles.muted}>
                    People can react
                    and comment.
                  </p>
                </div>

              </div>
            )}


            {page === "groups" && (
              <div style={styles.featureGrid}>

                <div style={styles.featureCard}>
                  <div style={styles.featureIcon}>
                    ＋
                  </div>

                  <h3>
                    Create Group
                  </h3>

                  <p style={styles.muted}>
                    Create a chat with
                    multiple HEXA users.
                  </p>
                </div>


                <div style={styles.featureCard}>
                  <div style={styles.featureIcon}>
                    👥
                  </div>

                  <h3>
                    Group Calling
                  </h3>

                  <p style={styles.muted}>
                    A group call can
                    reach all members
                    of the group.
                  </p>
                </div>

              </div>
            )}


            {page === "communities" && (
              <div style={styles.featureGrid}>

                <div style={styles.featureCard}>
                  <div style={styles.featureIcon}>
                    🌐
                  </div>

                  <h3>
                    Create Community
                  </h3>

                  <p style={styles.muted}>
                    Connect multiple
                    HEXA groups under
                    one community owner.
                  </p>
                </div>

              </div>
            )}


            {page === "calls" && (
              <div style={styles.featureCard}>

                <div style={styles.featureIcon}>
                  ☎
                </div>

                <h3>
                  HEXA Calls
                </h3>

                <p style={styles.muted}>
                  Voice and video
                  calling will use
                  the calls and
                  call_signals tables
                  in your Supabase
                  schema.
                </p>

                <div style={styles.priceBox}>
                  <strong>
                    15 kobo / second
                  </strong>

                  <span>
                    Call billing is
                    calculated from
                    call duration.
                  </span>
                </div>

              </div>
            )}


            {page === "kora" && (
              <div style={styles.featureCard}>

                <div style={styles.featureIcon}>
                  ✦
                </div>

                <h3>
                  Kora
                </h3>

                <p style={styles.muted}>
                  Your HEXA AI
                  assistant.
                </p>

              </div>
            )}


            {page === "channels" && (
              <div style={styles.featureCard}>

                <div style={styles.featureIcon}>
                  📢
                </div>

                <h3>
                  Channels
                </h3>

                <p style={styles.muted}>
                  Broadcast
                  communication for
                  HEXA communities.
                </p>

              </div>
            )}

          </div>
        )}

      </main>
    </div>
  );
}


/* =========================================================
   STYLES
   ========================================================= */

const styles = {
  app: {
    minHeight: "100vh",
    width: "100%",
    display: "flex",
    overflow: "hidden",
  },

  centerScreen: {
    minHeight: "100vh",
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    background: "#08090d",
    color: "#fff",
  },

  authScreen: {
    minHeight: "100vh",
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,

    background:
      "radial-gradient(circle at top,#18202f 0%,#090b10 45%,#050609 100%)",
  },

  authCard: {
    width: "100%",
    maxWidth: 440,
    background: "#11131a",
    border: "1px solid #292e39",
    borderRadius: 26,
    padding: 28,
    color: "#fff",
    boxShadow:
      "0 30px 100px rgba(0,0,0,.45)",
  },

  authBrand: {
    textAlign: "center",
    marginBottom: 25,
  },

  logo: {
    fontSize: 42,
    fontWeight: 950,
    letterSpacing: -2,
  },

  tagline: {
    marginTop: 5,
    color: "#858b98",
    fontSize: 13,
  },

  authTabs: {
    display: "grid",
    gridTemplateColumns:
      "1fr 1fr",
    background: "#0a0c11",
    padding: 4,
    borderRadius: 13,
    marginBottom: 20,
  },

  authTab: {
    height: 42,
    border: 0,
    borderRadius: 10,
    background: "transparent",
    color: "#9298a5",
    fontWeight: 800,
    cursor: "pointer",
  },

  authTabActive: {
    background: "#fff",
    color: "#08090d",
  },

  googleButton: {
    width: "100%",
    height: 52,
    borderRadius: 14,
    border: "1px solid #363b46",
    background: "#fff",
    color: "#111",
    fontWeight: 800,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 11,
  },

  divider: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    margin: "20px 0",
    color: "#656b77",
    fontSize: 12,
  },

  fieldLabel: {
    display: "block",
    fontSize: 13,
    fontWeight: 700,
    color: "#c8ccd5",
    marginBottom: 8,
  },

  input: {
    width: "100%",
    height: 50,
    padding: "0 15px",
    borderRadius: 13,
    border: "1px solid #303541",
    outline: "none",
    background: "#0d0f15",
    color: "#fff",
    fontSize: 14,
  },

  forgot: {
    display: "block",
    margin: "-3px 0 17px auto",
    border: 0,
    background: "transparent",
    color: "#aab0bc",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 700,
  },

  errorBox: {
    background:
      "rgba(239,68,68,.1)",
    border:
      "1px solid rgba(239,68,68,.3)",
    color: "#fca5a5",
    padding: 12,
    borderRadius: 12,
    fontSize: 13,
    lineHeight: 1.5,
    marginBottom: 15,
  },

  successBox: {
    background:
      "rgba(34,197,94,.1)",
    border:
      "1px solid rgba(34,197,94,.25)",
    color: "#86efac",
    padding: 12,
    borderRadius: 12,
    fontSize: 13,
    lineHeight: 1.5,
    marginBottom: 15,
  },

  primaryButton: {
    width: "100%",
    height: 52,
    borderRadius: 14,
    border: 0,
    background: "#fff",
    color: "#07080b",
    fontWeight: 900,
    cursor: "pointer",
  },

  authFooter: {
    textAlign: "center",
    marginTop: 20,
    color: "#676d79",
    fontSize: 11,
    lineHeight: 1.6,
  },

  code: {
    padding: 16,
    borderRadius: 14,
    background: "#08090d",
    overflowX: "auto",
    color: "#d1d5db",
  },

  muted: {
    color: "#8c93a0",
    lineHeight: 1.6,
  },

  smallMuted: {
    color: "#717887",
    fontSize: 12,
  },

  loadingScreen: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    background: "#08090d",
    color: "#fff",
    gap: 12,
  },

  sidebar: {
    width: 255,
    minWidth: 255,
    minHeight: "100vh",
    padding: 16,
    display: "flex",
    flexDirection: "column",
    transition: "transform .2s ease",
  },

  sidebarTop: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },

  sidebarLogo: {
    fontSize: 27,
    fontWeight: 950,
    letterSpacing: -1.5,
  },

  nexus: {
    color: "#747b88",
    fontSize: 9,
    letterSpacing: 3,
    fontWeight: 800,
    marginTop: -2,
  },

  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    border: "1px solid #292d36",
    background: "transparent",
    color: "#aeb4bf",
    cursor: "pointer",
  },

  profileCard: {
    display: "flex",
    alignItems: "center",
    gap: 11,
    padding: 11,
    borderRadius: 15,
    background:
      "rgba(255,255,255,.045)",
    marginBottom: 22,
  },

  profileName: {
    fontSize: 13,
    fontWeight: 800,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  profileUsername: {
    marginTop: 3,
    fontSize: 11,
    color: "#777e8c",
  },

  navLabel: {
    fontSize: 9,
    color: "#606774",
    letterSpacing: 1.5,
    fontWeight: 900,
    padding: "0 9px",
    marginBottom: 7,
    marginTop: 7,
  },

  navButton: {
    width: "100%",
    height: 43,
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "0 11px",
    border: 0,
    borderRadius: 11,
    background: "transparent",
    color: "#a4aab5",
    cursor: "pointer",
    textAlign: "left",
    fontWeight: 700,
    fontSize: 13,
    marginBottom: 3,
  },

  navButtonActive: {
    background:
      "rgba(255,255,255,.09)",
    color: "#fff",
  },

  main: {
    minWidth: 0,
    flex: 1,
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    position: "relative",
  },

  header: {
    height: 70,
    minHeight: 70,
    display: "flex",
    alignItems: "center",
    gap: 14,
    padding: "0 20px",
    backdropFilter: "blur(18px)",
    position: "relative",
    zIndex: 10,
  },

  mobileMenu: {
    display: "none",
    border: 0,
    background: "transparent",
    color: "inherit",
    fontSize: 21,
    cursor: "pointer",
  },

  headerTitle: {
    fontSize: 17,
    fontWeight: 900,
  },

  headerSubtitle: {
    marginTop: 2,
    color: "#747b88",
    fontSize: 11,
  },

  searchWrap: {
    marginLeft: "auto",
    width: "min(390px, 42vw)",
    height: 40,
    borderRadius: 12,
    border: "1px solid #292d36",
    background:
      "rgba(255,255,255,.045)",
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "0 12px",
    color: "#737b88",
  },

  searchInput: {
    minWidth: 0,
    flex: 1,
    border: 0,
    outline: 0,
    background: "transparent",
    color: "inherit",
  },

  searchResults: {
    position: "absolute",
    top: 62,
    right: 20,
    width:
      "min(390px, calc(100vw - 30px))",
    maxHeight: 420,
    overflowY: "auto",
    padding: 10,
    background: "#11131a",
    border: "1px solid #292e38",
    borderRadius: 16,
    zIndex: 30,
    boxShadow:
      "0 20px 70px rgba(0,0,0,.4)",
  },

  searchHeading: {
    color: "#686f7c",
    fontSize: 9,
    letterSpacing: 1.5,
    fontWeight: 900,
    padding: "6px 8px",
  },

  personResult: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    gap: 11,
    padding: 10,
    border: 0,
    borderRadius: 12,
    background: "transparent",
    color: "#fff",
    cursor: "pointer",
  },

  personName: {
    fontWeight: 800,
    fontSize: 13,
  },

  personUsername: {
    color: "#747b88",
    fontSize: 11,
    marginTop: 2,
  },

  chatLayout: {
    flex: 1,
    minHeight: 0,
    display: "grid",
    gridTemplateColumns:
      "320px minmax(0,1fr)",
  },

  chatList: {
    minWidth: 0,
    overflowY: "auto",
  },

  sectionHeader: {
    height: 76,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 15px",
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: 900,
  },

  roundButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    border: "1px solid #303540",
    background: "#fff",
    color: "#090a0d",
    cursor: "pointer",
    fontSize: 19,
    fontWeight: 800,
  },

  chatRow: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    gap: 11,
    padding: "11px 14px",
    border: 0,
    background: "transparent",
    color: "inherit",
    cursor: "pointer",
  },

  chatRowActive: {
    background:
      "rgba(255,255,255,.075)",
  },

  chatName: {
    fontSize: 13,
    fontWeight: 800,
    overflow: "hidden",
    whiteSpace: "nowrap",
    textOverflow: "ellipsis",
  },

  chatPreview: {
    fontSize: 11,
    color: "#737a87",
    marginTop: 4,
  },

  messagePanel: {
    minWidth: 0,
    minHeight: 0,
    display: "flex",
    flexDirection: "column",
  },

  messageHeader: {
    minHeight: 70,
    padding: "0 18px",
    display: "flex",
    alignItems: "center",
    gap: 11,
    borderBottom:
      "1px solid #20232c",
  },

  messageHeaderTitle: {
    fontWeight: 900,
    fontSize: 14,
  },

  callButton: {
    width: 37,
    height: 37,
    borderRadius: 10,
    border:
      "1px solid #2b2f39",
    background:
      "rgba(255,255,255,.04)",
    color: "#fff",
    cursor: "pointer",
  },

  messagesArea: {
    flex: 1,
    minHeight: 0,
    overflowY: "auto",
    padding: 20,
  },

  emptyMessage: {
    minHeight: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
  },

  messageBubble: {
    maxWidth:
      "min(70%, 600px)",
    padding: "10px 13px",
    borderRadius: 16,
    fontSize: 14,
    lineHeight: 1.45,
  },

  messageMine: {
    background: "#fff",
    color: "#090a0d",
    borderBottomRightRadius: 5,
  },

  messageOther: {
    background: "#181b23",
    color: "#fff",
    borderBottomLeftRadius: 5,
  },

  composer: {
    minHeight: 68,
    padding: "10px 14px",
    display: "flex",
    alignItems: "center",
    gap: 7,
    borderTop:
      "1px solid #20232c",
  },

  composerButton: {
    height: 38,
    minWidth: 38,
    padding: "0 9px",
    borderRadius: 10,
    border:
      "1px solid #292d36",
    background:
      "rgba(255,255,255,.04)",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 800,
    fontSize: 12,
  },

  messageInput: {
    flex: 1,
    minWidth: 0,
    height: 42,
    borderRadius: 12,
    border:
      "1px solid #292d36",
    outline: 0,
    padding: "0 13px",
    background: "#101219",
    color: "#fff",
  },

  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    border: 0,
    background: "#fff",
    color: "#08090d",
    cursor: "pointer",
    fontWeight: 900,
  },

  empty: {
    padding: 25,
    textAlign: "center",
    color: "#858c99",
    fontSize: 13,
  },

  emptyPanel: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
  },

  pageContainer: {
    flex: 1,
    overflowY: "auto",
    padding: "50px 6vw",
  },

  pageHero: {
    maxWidth: 750,
    margin: "0 auto 35px",
    textAlign: "center",
  },

  pageIcon: {
    width: 70,
    height: 70,
    borderRadius: 22,
    margin: "0 auto 20px",
    display: "grid",
    placeItems: "center",
    fontSize: 30,
    background:
      "rgba(255,255,255,.07)",
  },

  featureGrid: {
    maxWidth: 900,
    margin: "0 auto",
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(220px,1fr))",
    gap: 15,
  },

  featureCard: {
    padding: 22,
    borderRadius: 20,
    border:
      "1px solid #292d36",
    background:
      "rgba(255,255,255,.035)",
  },

  featureIcon: {
    fontSize: 25,
    marginBottom: 15,
  },

  priceBox: {
    marginTop: 20,
    padding: 15,
    borderRadius: 13,
    background:
      "rgba(255,255,255,.05)",
    display: "flex",
    flexDirection: "column",
    gap: 5,
  },
};


/* =========================================================
   RESPONSIVE
   ========================================================= */

if (
  typeof document !==
  "undefined"
) {
  const responsiveStyle =
    document.getElementById(
      "hexa-responsive-style"
    );

  if (!responsiveStyle) {
    const style =
      document.createElement(
        "style"
      );

    style.id =
      "hexa-responsive-style";

    style.textContent = `
      @media (max-width: 850px) {
        .hexa-app aside {
          position: fixed !important;
          z-index: 100 !important;
          left: 0;
          top: 0;
          bottom: 0;
          transform: translateX(-105%);
          box-shadow: 20px 0 60px rgba(0,0,0,.35);
        }

        .hexa-app .mobile-menu {
          display: block !important;
        }
      }

      @media (max-width: 700px) {
        .hexa-app .searchWrap {
          width: 42px !important;
          padding: 0 11px !important;
        }

        .hexa-app .searchWrap input {
          display: none;
        }

        .hexa-app .chatLayout {
          grid-template-columns: 1fr !important;
        }

        .hexa-app .chatList {
          display: none;
        }

        .hexa-app .messageBubble {
          max-width: 82% !important;
        }

        .hexa-app .composerButton {
          min-width: 35px;
        }

        .hexa-app .pageContainer {
          padding: 30px 18px !important;
        }
      }
    `;

    document.head.appendChild(
      style
    );
  }
}


/* =========================================================
   ROOT APP
   ========================================================= */

export default function App() {
  const [session, setSession] =
    useState(null);

  const [loading, setLoading] =
    useState(true);


  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let mounted = true;


    /*
     * =====================================================
     * INITIAL AUTH RESTORE
     * =====================================================
     *
     * This runs when HEXA first loads.
     *
     * It is especially important after the user clicks
     * the email verification link.
     */

    async function initializeAuth() {
      try {
        /*
         * First allow Supabase to process the
         * verification URL / PKCE callback.
         */

        const {
          data,
          error,
        } =
          await supabase.auth.getSession();

        if (error) {
          throw error;
        }

        const currentSession =
          data?.session || null;

        if (!mounted) {
          return;
        }

        if (
          currentSession?.user
        ) {
          /*
           * VERIFIED USER:
           *
           * Ensure their HEXA profile exists.
           */

          await ensureHexaProfile(
            currentSession.user
          );

          /*
           * This is what causes React to leave
           * AuthScreen and open AuthenticatedHEXA.
           */

          setSession(
            currentSession
          );
        } else {
          setSession(null);
        }
      } catch (error) {
        console.error(
          "Auth initialization failed:",
          error
        );

        if (mounted) {
          setSession(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }


    initializeAuth();


    /*
     * =====================================================
     * SUPABASE AUTH STATE LISTENER
     * =====================================================
     *
     * This catches:
     *
     * SIGNED_IN
     * USER_UPDATED
     * TOKEN_REFRESHED
     *
     * including the authentication state restored after
     * email verification.
     */

    const {
      data: authListener,
    } =
      supabase.auth.onAuthStateChange(
        (
          event,
          nextSession
        ) => {
          if (!mounted) {
            return;
          }

          if (
            nextSession?.user
          ) {
            /*
             * IMPORTANT:
             *
             * Set the session immediately.
             *
             * This causes the app to render HEXA.
             *
             * Profile creation happens asynchronously
             * afterward so authentication is not blocked
             * by the profile operation.
             */

            setSession(
              nextSession
            );

            setTimeout(
              async () => {
                try {
                  await ensureHexaProfile(
                    nextSession.user
                  );
                } catch (error) {
                  console.error(
                    "Post-auth profile initialization failed:",
                    error
                  );
                }
              },
              0
            );

            return;
          }


          /*
           * No authenticated user.
           */

          if (
            event ===
            "SIGNED_OUT"
          ) {
            setSession(null);
          }
        }
      );


    return () => {
      mounted = false;

      authListener.subscription.unsubscribe();
    };
  }, []);


  /* =======================================================
     SUPABASE CONFIGURATION
     ======================================================= */

  if (!supabase) {
    return (
      <SupabaseConfigError />
    );
  }


  /* =======================================================
     AUTH INITIALIZATION
     ======================================================= */

  if (loading) {
    return (
      <div style={styles.loadingScreen}>
        <div style={styles.logo}>
          HEXA
        </div>

        <div style={styles.smallMuted}>
          Checking your account...
        </div>
      </div>
    );
  }


  /* =======================================================
     NO SESSION
     ======================================================= */

  if (!session) {
    return (
      <AuthScreen />
    );
  }


  /* =======================================================
     AUTHENTICATED HEXA
     ======================================================= */

  return (
    <AuthenticatedHEXA
      session={session}
    />
  );
}
