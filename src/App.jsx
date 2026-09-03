import React, { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import "./App.css";

/*
  ============================================================
  HEXA
  Authentication + Workspace
  ============================================================

  REQUIRED VITE VARIABLES:

  VITE_SUPABASE_URL
  VITE_SUPABASE_PUBLISHABLE_KEY

  Optional legacy fallback:

  VITE_SUPABASE_ANON_KEY

  Optional:

  VITE_GIPHY_API_KEY
  VITE_TURN_URL
  VITE_TURN_USERNAME
  VITE_TURN_CREDENTIAL
*/

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error(
    "HEXA: Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY."
  );
}

export const supabase = createClient(
  SUPABASE_URL || "https://placeholder.supabase.co",
  SUPABASE_KEY || "placeholder-key",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: "pkce",
    },
  }
);

/* ============================================================
   CONSTANTS
   ============================================================ */

const OFFLINE_QUEUE_KEY = "hexa-message-queue-v2";
const DRAFTS_KEY = "hexa-chat-drafts-v1";

const NAV_ITEMS = [
  { id: "nexus", label: "Nexus", icon: "⌂" },
  { id: "chat", label: "Chat", icon: "💬" },
  { id: "groups", label: "Groups", icon: "👥" },
  { id: "communities", label: "Communities", icon: "◉" },
  { id: "channels", label: "Channels", icon: "▣" },
  { id: "status", label: "Status", icon: "◌" },
  { id: "calls", label: "Calls", icon: "☎" },
  { id: "projects", label: "Projects", icon: "◆" },
  { id: "kora", label: "Kora", icon: "✦" },
  { id: "developer", label: "Developer Hub", icon: "</>" },
  { id: "settings", label: "Settings", icon: "⚙" },
];

const DEFAULT_CONVERSATIONS = [
  {
    id: "hexa-system-group",
    name: "THE HEXA GROUP",
    kind: "system",
    readOnly: true,
    online: true,
    avatar: "H",
    description: "Official HEXA announcements",
  },
  {
    id: "self",
    name: "YOU",
    kind: "self",
    readOnly: false,
    online: true,
    avatar: "Y",
    description: "Your personal space",
  },
  {
    id: "kora",
    name: "Kora",
    kind: "ai",
    readOnly: false,
    online: true,
    avatar: "K",
    description: "HEXA AI",
  },
];

/* ============================================================
   HELPERS
   ============================================================ */

function getAppUrl() {
  if (typeof window === "undefined") {
    return "";
  }

  return window.location.origin;
}

function getAuthRedirectUrl() {
  return `${getAppUrl()}/`;
}

function getAuthErrorMessage(error) {
  if (!error) return "";

  const message = String(error.message || error);

  const lower = message.toLowerCase();

  if (lower.includes("invalid login credentials")) {
    return "Incorrect email or password.";
  }

  if (lower.includes("email not confirmed")) {
    return "Please verify your email before signing in.";
  }

  if (lower.includes("user already registered")) {
    return "An account with this email already exists.";
  }

  if (lower.includes("password")) {
    return message;
  }

  if (lower.includes("rate limit")) {
    return "Too many attempts. Please wait a moment and try again.";
  }

  return message;
}

function getPasswordStrength(password) {
  if (!password) {
    return {
      score: 0,
      label: "",
    };
  }

  let score = 0;

  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  if (score <= 2) {
    return { score, label: "Weak" };
  }

  if (score <= 4) {
    return { score, label: "Good" };
  }

  return { score, label: "Strong" };
}

function makeUsername(email, fullName = "") {
  const source =
    fullName ||
    String(email || "").split("@")[0] ||
    `hexa_user_${Date.now()}`;

  const cleaned = source
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 24);

  return cleaned || `hexauser${Date.now()}`;
}

function readLocalQueue() {
  try {
    return JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || "[]");
  } catch {
    return [];
  }
}

function writeLocalQueue(queue) {
  try {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // Ignore storage failures.
  }
}

function readDrafts() {
  try {
    return JSON.parse(localStorage.getItem(DRAFTS_KEY) || "{}");
  } catch {
    return {};
  }
}

function writeDrafts(drafts) {
  try {
    localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts));
  } catch {
    // Ignore storage failures.
  }
}

function initials(name = "") {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);

  if (!parts.length) return "H";

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

/* ============================================================
   PROFILE
   ============================================================ */

async function ensureHexaProfile(user) {
  if (!user?.id) return null;

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
    const { data: existing, error: selectError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (selectError) {
      console.warn("HEXA profile lookup:", selectError.message);
    }

    if (existing) {
      return existing;
    }

    let username = makeUsername(user.email, fullName);

    const { data: sameUsername } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", username)
      .maybeSingle();

    if (sameUsername) {
      username = `${username}${Math.floor(Math.random() * 9999)}`;
    }

    const payload = {
      id: user.id,
      email: user.email || null,
      username,
      full_name: fullName || username,
      avatar_url: avatarUrl,
      updated_at: new Date().toISOString(),
    };

    const { data: created, error: insertError } = await supabase
      .from("profiles")
      .insert(payload)
      .select("*")
      .single();

    if (insertError) {
      /*
        A database trigger may already create the profile.
        In that case, retry the lookup instead of breaking login.
      */

      console.warn("HEXA profile creation:", insertError.message);

      const { data: retry } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      return retry || null;
    }

    return created;
  } catch (error) {
    console.warn("HEXA profile bootstrap:", error);
    return null;
  }
}

/* ============================================================
   AVATAR
   ============================================================ */

function Avatar({
  src,
  name = "HEXA",
  size = 42,
  online = false,
  className = "",
}) {
  return (
    <div
      className={`hexa-avatar ${className}`}
      style={{
        width: size,
        height: size,
        minWidth: size,
      }}
    >
      {src ? (
        <img src={src} alt={name} />
      ) : (
        <span>{initials(name)}</span>
      )}

      {online && <i className="hexa-online-dot" />}
    </div>
  );
}

/* ============================================================
   AUTH FIELD
   ============================================================ */

function AuthField({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  autoComplete,
}) {
  return (
    <label className="auth-field">
      <span>{label}</span>

      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
      />
    </label>
  );
}

/* ============================================================
   AUTH SCREEN
   ============================================================ */

function AuthScreen() {
  const [mode, setMode] = useState("signin");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const passwordStrength = getPasswordStrength(password);

  function clearMessages() {
    setError("");
    setSuccess("");
  }

  function switchMode(nextMode) {
    clearMessages();
    setMode(nextMode);
  }

  async function handleSignUp(event) {
    event.preventDefault();

    clearMessages();

    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedName) {
      setError("Enter your full name.");
      return;
    }

    if (!trimmedEmail) {
      setError("Enter your email.");
      return;
    }

    if (password.length < 8) {
      setError("Your password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setBusy(true);

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          data: {
            full_name: trimmedName,
            display_name: trimmedName,
          },

          /*
            CRITICAL:
            After the user verifies the email, Supabase returns
            them directly to the application.
          */
          emailRedirectTo: getAuthRedirectUrl(),
        },
      });

      if (signUpError) {
        throw signUpError;
      }

      /*
        If email confirmation is enabled, Supabase normally returns
        a user but no session. That is expected.
      */
      if (!data.session) {
        setSuccess(
          "Account created. Check your email and verify your HEXA account. After verification, you will be taken directly into HEXA."
        );

        setMode("signin");
        setPassword("");
        setConfirmPassword("");

        return;
      }

      /*
        If email confirmation is disabled, a session can be returned
        immediately.
      */
      await ensureHexaProfile(data.user);

      setSuccess("Account created. Opening HEXA...");
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleSignIn(event) {
    event.preventDefault();

    clearMessages();

    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail || !password) {
      setError("Enter your email and password.");
      return;
    }

    setBusy(true);

    try {
      const { data, error: signInError } =
        await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password,
        });

      if (signInError) {
        throw signInError;
      }

      if (!data.session || !data.user) {
        throw new Error("Unable to create a HEXA session.");
      }

      await ensureHexaProfile(data.user);

      /*
        App's auth listener will now move the user into the
        authenticated workspace.
      */
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    clearMessages();
    setBusy(true);

    try {
      const { error: oauthError } =
        await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: getAuthRedirectUrl(),
          },
        });

      if (oauthError) {
        throw oauthError;
      }

      /*
        Browser is redirected to Google.
        The Supabase client detects the callback when the user
        returns to the HEXA URL.
      */
    } catch (err) {
      setError(getAuthErrorMessage(err));
      setBusy(false);
    }
  }

  async function handleResetPassword() {
    clearMessages();

    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail) {
      setError("Enter your email first.");
      return;
    }

    setBusy(true);

    try {
      const { error: resetError } =
        await supabase.auth.resetPasswordForEmail(trimmedEmail, {
          redirectTo: getAuthRedirectUrl(),
        });

      if (resetError) {
        throw resetError;
      }

      setSuccess(
        "Password reset instructions have been sent to your email."
      );
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="hexa-auth-page">
      <div className="hexa-auth-glow glow-one" />
      <div className="hexa-auth-glow glow-two" />

      <main className="hexa-auth-card">
        <div className="hexa-brand">
          <div className="hexa-logo">H</div>

          <div>
            <strong>HEXA</strong>
            <span>Communication, connected.</span>
          </div>
        </div>

        <div className="auth-heading">
          <h1>
            {mode === "signin"
              ? "Welcome back"
              : "Create your HEXA account"}
          </h1>

          <p>
            {mode === "signin"
              ? "Sign in and continue where you left off."
              : "Create your account and enter the HEXA workspace."}
          </p>
        </div>

        {error && (
          <div className="auth-alert auth-error">
            <span>!</span>
            {error}
          </div>
        )}

        {success && (
          <div className="auth-alert auth-success">
            <span>✓</span>
            {success}
          </div>
        )}

        {mode === "signin" ? (
          <form onSubmit={handleSignIn}>
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
              autoComplete="current-password"
            />

            <div className="auth-forgot-row">
              <button
                type="button"
                className="text-button"
                onClick={handleResetPassword}
                disabled={busy}
              >
                Forgot password?
              </button>
            </div>

            <button
              className="primary-auth-button"
              type="submit"
              disabled={busy}
            >
              {busy ? "Signing in..." : "Sign in"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSignUp}>
            <AuthField
              label="Full name"
              value={fullName}
              onChange={setFullName}
              placeholder="Your full name"
              autoComplete="name"
            />

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
              placeholder="At least 8 characters"
              autoComplete="new-password"
            />

            {password && (
              <div className="password-strength">
                <div className="strength-bars">
                  {[1, 2, 3, 4, 5, 6].map((item) => (
                    <i
                      key={item}
                      className={
                        item <= passwordStrength.score
                          ? "filled"
                          : ""
                      }
                    />
                  ))}
                </div>

                <span>{passwordStrength.label}</span>
              </div>
            )}

            <AuthField
              label="Confirm password"
              type="password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              placeholder="Repeat your password"
              autoComplete="new-password"
            />

            <button
              className="primary-auth-button"
              type="submit"
              disabled={busy}
            >
              {busy ? "Creating account..." : "Create account"}
            </button>
          </form>
        )}

        <div className="auth-divider">
          <span>or</span>
        </div>

        <button
          type="button"
          className="google-auth-button"
          onClick={handleGoogle}
          disabled={busy}
        >
          <span className="google-icon">G</span>
          Continue with Google
        </button>

        <div className="auth-switch">
          {mode === "signin" ? (
            <>
              Don't have a HEXA account?
              <button
                type="button"
                onClick={() => switchMode("signup")}
              >
                Create one
              </button>
            </>
          ) : (
            <>
              Already have a HEXA account?
              <button
                type="button"
                onClick={() => switchMode("signin")}
              >
                Sign in
              </button>
            </>
          )}
        </div>

        <p className="auth-footer">
          By continuing, you agree to use HEXA responsibly.
        </p>
      </main>
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
  onSignOut,
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  function navigate(id) {
    setActivePage(id);
    setMobileOpen(false);
  }

  return (
    <>
      <button
        className="mobile-menu-button"
        onClick={() => setMobileOpen(true)}
      >
        ☰
      </button>

      {mobileOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`hexa-sidebar ${
          mobileOpen ? "mobile-open" : ""
        }`}
      >
        <div className="sidebar-brand">
          <div className="small-logo">H</div>

          <div>
            <strong>HEXA</strong>
            <span>NEXUS</span>
          </div>

          <button
            className="mobile-close"
            onClick={() => setMobileOpen(false)}
          >
            ×
          </button>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-section-label">WORKSPACE</div>

          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              className={
                activePage === item.id
                  ? "sidebar-item active"
                  : "sidebar-item"
              }
              onClick={() => navigate(item.id)}
            >
              <span className="sidebar-icon">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-user">
            <Avatar
              src={profile?.avatar_url}
              name={
                profile?.full_name ||
                profile?.username ||
                "HEXA User"
              }
              size={38}
              online
            />

            <div className="sidebar-user-info">
              <strong>
                {profile?.full_name ||
                  profile?.username ||
                  "HEXA User"}
              </strong>

              <span>
                @{profile?.username || "hexauser"}
              </span>
            </div>


          </div>
        </div>
      </aside>
    </>
  );
}

/* ============================================================
   TOPBAR
   ============================================================ */

function Topbar({ profile, search, setSearch, activePage, onNotifications, notificationCount, onSettings }) {
  return (
    <header className="hexa-topbar">
      <div className="mobile-page-title"><strong>HEXA</strong></div>
      <div className="topbar-search">
        <span>⌕</span>
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search people, chats and HEXA..." />
        <kbd>⌘ K</kbd>
      </div>
      <div className="topbar-actions">
        <button className="notification-button" title="Notifications" onClick={onNotifications}>
          ♢{notificationCount > 0 && <b>{notificationCount > 99 ? "99+" : notificationCount}</b>}
        </button>
        <button title="Settings" onClick={onSettings}>⚙</button>
        <Avatar src={profile?.avatar_url} name={profile?.full_name || profile?.username || "HEXA"} size={38} online />
      </div>
    </header>
  );
}

/* ============================================================
   NEXUS
   ============================================================ */

function NexusHome({
  profile,
  setActivePage,
}) {
  const name =
    profile?.full_name ||
    profile?.username ||
    "there";

  return (
    <section className="workspace-page">
      <div className="hero-panel">
        <div>
          <div className="eyebrow">HEXA NEXUS</div>

          <h1>
            Welcome back,{" "}
            <span>{name.split(" ")[0]}</span>.
          </h1>

          <p>
            Your conversations, communities, channels,
            statuses and calls — all in one place.
          </p>

          <div className="hero-actions">
            <button
              className="hero-primary"
              onClick={() => setActivePage("chat")}
            >
              Open Chat
            </button>

            <button
              className="hero-secondary"
              onClick={() => setActivePage("status")}
            >
              View Status
            </button>
          </div>
        </div>

        <div className="hero-orbit">
          <div className="orbit-core">H</div>
          <div className="orbit-ring ring-a" />
          <div className="orbit-ring ring-b" />
        </div>
      </div>

      <div className="section-heading">
        <div>
          <h2>Your HEXA</h2>
          <p>Everything important at a glance.</p>
        </div>
      </div>

      <div className="feature-grid">
        <button
          className="feature-card"
          onClick={() => setActivePage("chat")}
        >
          <span>💬</span>
          <strong>Chat</strong>
          <p>Message people and sync conversations.</p>
        </button>

        <button
          className="feature-card"
          onClick={() => setActivePage("groups")}
        >
          <span>👥</span>
          <strong>Groups</strong>
          <p>Create and manage group conversations.</p>
        </button>

        <button
          className="feature-card"
          onClick={() => setActivePage("status")}
        >
          <span>◌</span>
          <strong>Status</strong>
          <p>Share text, photos and videos.</p>
        </button>

        <button
          className="feature-card"
          onClick={() => setActivePage("calls")}
        >
          <span>☎</span>
          <strong>Calls</strong>
          <p>Voice and video communication.</p>
        </button>
      </div>
    </section>
  );
}

/* ============================================================
   CHAT
   ============================================================ */

function koraReply(input) {
  const q = String(input || "").toLowerCase();
  if (q.includes("hello") || q.includes("hi")) return "Hello. I’m Kora, your HEXA assistant. What would you like to do?";
  if (q.includes("status")) return "You can create a HEXA Status with text, photos or videos from the Status workspace.";
  if (q.includes("call")) return "Open a direct chat and use the phone or video button to start a WebRTC call.";
  if (q.includes("group")) return "Open Groups, create a group, and select the HEXA users you want to add.";
  return "I’m Kora. I can help you navigate HEXA, plan messages, explain features, and work with the tools connected to your workspace.";
}

function ChatPage({ profile, onStartCall, onOpenChatWithUser, initialConversation }) {
  const [conversations, setConversations] = useState(DEFAULT_CONVERSATIONS);
  const [selected, setSelected] = useState(initialConversation || DEFAULT_CONVERSATIONS[0]);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [chatSearch, setChatSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [reactionMenu, setReactionMenu] = useState(null);
  const [gifOpen, setGifOpen] = useState(false);
  const [gifQuery, setGifQuery] = useState("");
  const [gifs, setGifs] = useState([]);
  const [recording, setRecording] = useState(false);
  const [attachment, setAttachment] = useState(null);
  const mediaRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const draftsRef = useRef(readDrafts());
  const bottomRef = useRef(null);

  const isSystem = selected.id === "hexa-system-group";

  useEffect(() => {
    if (initialConversation?.id && initialConversation.id !== selected.id) setSelected(initialConversation);
  }, [initialConversation?.id]);

  useEffect(() => {
    const draft = draftsRef.current[selected.id] || "";
    setMessage(draft);
    setReplyTo(null);
    setReactionMenu(null);
    loadMessages(selected);
  }, [selected.id]);

  useEffect(() => {
    const channel = supabase.channel(`hexa-messages-${profile?.id || "guest"}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, payload => {
        const row = payload.new;
        const selectedConversationId = selected.realConversationId || selected.id;
        if (row?.conversation_id !== selectedConversationId) return;
        setMessages(cur => cur.some(x => x.id === row.id) ? cur : [...cur, row]);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages" }, payload => {
        const selectedConversationId = selected.realConversationId || selected.id;
        if (payload.new?.conversation_id !== selectedConversationId) return;
        setMessages(cur => cur.map(x => x.id === payload.new.id ? payload.new : x));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selected.id, profile?.id]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length]);

  async function loadMessages(conversation) {
    if (!conversation?.id) { setMessages([]); return; }
    if (conversation.id === "self" || conversation.id === "kora") { setMessages([]); return; }
    setLoading(true);
    let conversationId = conversation.id;
    if (conversation.id === "hexa-system-group") {
      const { data: systemGroup } = await supabase
        .from("conversations")
        .select("id,name,type,owner_id,created_by,avatar_url,theme")
        .eq("name", "THE HEXA GROUP")
        .eq("type", "group")
        .limit(1)
        .maybeSingle();
      if (!systemGroup?.id) { setMessages([]); setLoading(false); return; }
      conversationId = systemGroup.id;
      setSelected(prev => prev.id === "hexa-system-group" ? { ...prev, ...systemGroup, id: "hexa-system-group", realConversationId: systemGroup.id } : prev);
    }
    const { data, error } = await supabase.from("messages").select("*, message_reactions(*)").eq("conversation_id", conversationId).is("deleted_at", null).order("created_at", { ascending: true });
    setMessages(error ? [] : (data || []));
    setLoading(false);
  }

  async function createDirectConversation(user) {
    if (!user?.id || user.id === profile?.id) return;
    const { data: existing } = await supabase.from("conversations").select("*").eq("type", "direct").or(`and(user_a.eq.${profile.id},user_b.eq.${user.id}),and(user_a.eq.${user.id},user_b.eq.${profile.id})`).limit(1).maybeSingle();
    let conversation = existing;
    if (!conversation) {
      const { data, error } = await supabase.from("conversations").insert({ type: "direct", user_a: profile.id, user_b: user.id, created_by: profile.id, owner_id: profile.id, name: user.full_name || user.username || "HEXA User" }).select("*").single();
      if (error) { console.error(error); return; }
      conversation = data;
      await supabase.from("conversation_members").upsert([{ conversation_id: conversation.id, user_id: profile.id, is_admin: true }, { conversation_id: conversation.id, user_id: user.id, is_admin: false }], { onConflict: "conversation_id,user_id" });
    }
    const mapped = { ...conversation, name: user.full_name || user.username || conversation.name || "HEXA User", avatar: initials(user.full_name || user.username), kind: "direct", online: false };
    setConversations(cur => [mapped, ...cur.filter(x => x.id !== mapped.id)]);
    setSelected(mapped);
    onOpenChatWithUser?.(mapped);
  }

  function updateDraft(value) {
    setMessage(value);
    draftsRef.current = { ...draftsRef.current, [selected.id]: value };
    writeDrafts(draftsRef.current);
  }

  async function uploadFile(file) {
    const bucket = import.meta.env.VITE_SUPABASE_STORAGE_BUCKET;
    if (!bucket) throw new Error("Set VITE_SUPABASE_STORAGE_BUCKET to enable persistent media uploads.");
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${profile.id}/messages/${Date.now()}-${safe}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: false, contentType: file.type || "application/octet-stream" });
    if (error) throw error;
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return { path, url: data.publicUrl };
  }

  async function insertMessage(payload) {
    const clientId = `${profile.id}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const optimistic = { id: `local-${clientId}`, ...payload, sender_id: profile.id, created_at: new Date().toISOString(), status: "sending", client_message_id: clientId };
    setMessages(cur => [...cur, optimistic]);
    const { data, error } = await supabase.from("messages").insert({ ...payload, sender_id: profile.id, client_message_id: clientId, status: "sent" }).select("*").single();
    if (error) {
      if (!navigator.onLine) writeLocalQueue([...readLocalQueue(), { ...optimistic, queued_at: new Date().toISOString() }]);
      setMessages(cur => cur.map(x => x.id === optimistic.id ? { ...x, status: "queued" } : x));
      return null;
    }
    setMessages(cur => cur.map(x => x.id === optimistic.id ? data : x));
    return data;
  }

  async function sendMessage(e) {
    e?.preventDefault();
    const text = message.trim();
    if (!text || isSystem || !profile?.id) return;
    updateDraft("");
    const reply = replyTo?.id || null;
    setReplyTo(null);
    if (selected.id === "kora") {
      const local = { id: `local-${Date.now()}`, sender_id: profile.id, content: text, created_at: new Date().toISOString(), message_type: "text", metadata: reply ? { reply_to_id: reply } : {} };
      setMessages(cur => [...cur, local]);
      setTimeout(() => setMessages(cur => [...cur, { id: `kora-${Date.now()}`, sender_id: "kora", content: koraReply(text), created_at: new Date().toISOString(), message_type: "text" }]), 450);
      return;
    }
    await insertMessage({ conversation_id: selected.id, content: text, message_type: "text", reply_to_id: reply });
  }

  async function sendAttachment(file) {
    if (!file || isSystem) return;
    try {
      const uploaded = await uploadFile(file);
      const type = file.type.startsWith("image/") ? "image" : file.type.startsWith("video/") ? "video" : file.type.startsWith("audio/") ? "audio" : "file";
      const row = await insertMessage({ conversation_id: selected.id, content: file.name, message_type: type, metadata: { url: uploaded.url, path: uploaded.path, file_name: file.name, mime_type: file.type, size: file.size }, reply_to_id: replyTo?.id || null });
      if (row) await supabase.from("message_attachments").insert({ message_id: row.id, user_id: profile.id, file_name: file.name, file_path: uploaded.path, file_url: uploaded.url, mime_type: file.type, file_size: file.size });
      setAttachment(null); setReplyTo(null);
    } catch (err) { alert(err.message || "Attachment upload failed."); }
  }

  async function toggleReaction(msg, reaction) {
    if (!msg?.id || String(msg.id).startsWith("local-") || !profile?.id) return;
    const { data: existing } = await supabase.from("message_reactions").select("*").eq("message_id", msg.id).eq("user_id", profile.id).eq("reaction", reaction).maybeSingle();
    if (existing) await supabase.from("message_reactions").delete().eq("message_id", msg.id).eq("user_id", profile.id).eq("reaction", reaction);
    else await supabase.from("message_reactions").insert({ message_id: msg.id, user_id: profile.id, reaction });
    setReactionMenu(null);
    loadMessages(selected);
  }

  async function searchGifs() {
    const key = import.meta.env.VITE_GIPHY_API_KEY;
    if (!key) { setGifs([]); return; }
    const q = encodeURIComponent(gifQuery.trim() || "trending");
    try { const r = await fetch(`https://api.giphy.com/v1/gifs/search?api_key=${key}&q=${q}&limit=18&rating=pg-13`); const j = await r.json(); setGifs(j.data || []); } catch { setGifs([]); }
  }

  async function sendGif(gif) {
    if (!gif?.images?.original?.url || isSystem) return;
    await insertMessage({ conversation_id: selected.id, content: gif.title || "GIF", message_type: "gif", metadata: { url: gif.images.original.url, preview_url: gif.images.fixed_width?.url || gif.images.original.url, source: "giphy" } });
    setGifOpen(false);
  }

  async function startRecording() {
    if (!navigator.mediaDevices?.getUserMedia) { alert("Voice recording is not supported by this browser."); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = e => { if (e.data.size) chunksRef.current.push(e.data); };
      recorder.onstop = async () => { const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" }); stream.getTracks().forEach(t => t.stop()); const file = new File([blob], `voice-${Date.now()}.webm`, { type: blob.type }); await sendAttachment(file); };
      recorder.start(); recorderRef.current = recorder; setRecording(true);
    } catch (err) { alert(err.message || "Microphone permission denied."); }
  }
  function stopRecording() { recorderRef.current?.stop(); recorderRef.current = null; setRecording(false); }

  async function flushOfflineQueue() {
    if (!navigator.onLine) return;
    const queue = readLocalQueue(); if (!queue.length) return;
    const remaining = [];
    for (const item of queue) {
      const { error } = await supabase.from("messages").insert({ conversation_id: item.conversation_id, sender_id: profile.id, content: item.content, message_type: item.message_type || "text", metadata: item.metadata || {}, reply_to_id: item.reply_to_id || null, client_message_id: item.client_message_id || `offline-${Date.now()}` });
      if (error) remaining.push(item);
    }
    writeLocalQueue(remaining);
    if (selected.id && !["self", "kora", "hexa-system-group"].includes(selected.id)) loadMessages(selected);
  }
  useEffect(() => { window.addEventListener("online", flushOfflineQueue); flushOfflineQueue(); return () => window.removeEventListener("online", flushOfflineQueue); }, [selected.id, profile?.id]);

  const filtered = conversations.filter(c => (c.name || "").toLowerCase().includes(chatSearch.toLowerCase()));

  function renderMessage(item) {
    const own = item.sender_id === profile?.id;
    const meta = item.metadata || {};
    const reactions = item.message_reactions || [];
    return <div key={item.id} className={`message-row ${own ? "own" : ""}`}>
      <div className="message-bubble-wrap">
        {item.reply_to_id && <div className="reply-preview">↪ Replying to a message</div>}
        <div className="message-bubble">
          {item.message_type === "image" && meta.url ? <img src={meta.url} alt={item.content} className="message-media"/> : null}
          {item.message_type === "video" && meta.url ? <video src={meta.url} controls className="message-media"/> : null}
          {item.message_type === "gif" && meta.url ? <img src={meta.url} alt={item.content} className="message-media gif-media"/> : null}
          {item.message_type === "audio" || item.message_type === "voice" ? (meta.url ? <audio src={meta.url} controls/> : <span>🎤 Voice message</span>) : null}
          {!['image','video','gif','audio','voice'].includes(item.message_type) && <span>{item.content}</span>}
          <small>{item.created_at ? new Date(item.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""} {item.status === "queued" ? "· queued" : item.status === "sending" ? "· sending" : ""}</small>
        </div>
        <div className="message-tools">
          <button type="button" onClick={() => setReplyTo(item)}>↩</button>
          <button type="button" onClick={() => setReactionMenu(reactionMenu === item.id ? null : item.id)}>☺</button>
          {reactionMenu === item.id && <div className="reaction-picker">{["❤️","😂","👍","🔥","😮","😢","👏","🎉","🙏","💯"].map(r => <button key={r} type="button" onClick={() => toggleReaction(item,r)}>{r}</button>)}</div>}
        </div>
        {reactions.length > 0 && <div className="reaction-summary">{[...new Set(reactions.map(r => r.reaction))].slice(0,6).join(" ")} {reactions.length}</div>}
      </div>
    </div>;
  }

  return <section className="chat-layout">
    <div className="chat-list-panel">
      <div className="chat-list-header"><div><h2>Chat</h2><span>{conversations.length} conversations</span></div><button className="new-chat-button" onClick={() => mediaRef.current?.focus()}>＋</button></div>
      <div className="chat-search"><span>⌕</span><input value={chatSearch} onChange={e => setChatSearch(e.target.value)} placeholder="Search chats"/></div>
      <div className="conversation-list">{filtered.map(c => <button key={c.id} className={`conversation ${selected.id === c.id ? "active" : ""}`} onClick={() => setSelected(c)}><Avatar name={c.name} size={46} online={c.online}/><div className="conversation-content"><strong>{c.name}</strong><span>{c.kind === "system" ? "Official HEXA" : c.kind === "ai" ? "HEXA AI" : c.description || "Conversation"}</span></div></button>)}</div>
    </div>
    <div className="chat-main">
      <div className="chat-header"><Avatar name={selected.name} size={42} online={selected.online}/><div><strong>{selected.name}</strong><span>{isSystem ? "Official HEXA · read only" : selected.kind === "ai" ? "Kora AI" : "online"}</span></div><div className="chat-header-actions"><button onClick={() => !isSystem && selected.id !== "self" && onStartCall?.(selected,"voice")}>☎</button><button onClick={() => !isSystem && selected.id !== "self" && onStartCall?.(selected,"video")}>▣</button><button onClick={() => navigator.clipboard?.writeText(selected.id)}>⋮</button></div></div>
      <div className="messages-area">
        {loading ? <div className="empty-chat"><div className="loading-spinner"/><p>Loading messages…</p></div> : messages.length ? messages.map(renderMessage) : <div className="empty-chat"><div className="empty-chat-icon">{selected.avatar || "H"}</div><h3>{isSystem ? "THE HEXA GROUP" : `Chat with ${selected.name}`}</h3><p>{isSystem ? "Official HEXA announcements appear here." : "Start a conversation."}</p></div>}
        <div ref={bottomRef}/>
      </div>
      {replyTo && <div className="reply-bar"><span>↩ Replying to: {replyTo.content || "media"}</span><button type="button" onClick={() => setReplyTo(null)}>×</button></div>}
      {gifOpen && <div className="gif-panel"><div className="gif-search"><input value={gifQuery} onChange={e=>setGifQuery(e.target.value)} onKeyDown={e=>e.key==='Enter'&&searchGifs()} placeholder="Search GIPHY"/><button type="button" onClick={searchGifs}>Search</button></div><div className="gif-grid">{gifs.map(g=><button key={g.id} type="button" onClick={()=>sendGif(g)}><img src={g.images.fixed_width?.url || g.images.original.url} alt={g.title}/></button>)}</div>{!import.meta.env.VITE_GIPHY_API_KEY&&<small>Set VITE_GIPHY_API_KEY to enable GIPHY search.</small>}</div>}
      <form className="message-composer" onSubmit={sendMessage}>
        <button type="button" title="Emoji" disabled={isSystem} onClick={() => updateDraft(message + " 😊")}>☺</button>
        <button type="button" title="Attachment" disabled={isSystem} onClick={() => mediaRef.current?.click()}>＋</button>
        <input ref={mediaRef} type="file" hidden accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.zip" onChange={e=>{const f=e.target.files?.[0]; if(f){setAttachment(f);sendAttachment(f);}e.target.value=""}}/>
        <input value={message} onChange={e=>updateDraft(e.target.value)} disabled={isSystem} placeholder={isSystem ? "Only HEXA admins can publish here" : "Type a message…"}/>
        <button type="button" className="composer-action" title="GIF" disabled={isSystem} onClick={()=>{setGifOpen(v=>!v); if(!gifs.length) searchGifs();}}>GIF</button>
        <button type="button" className="composer-action" title={recording?"Stop recording":"Voice message"} disabled={isSystem} onClick={recording?stopRecording:startRecording}>{recording?"■":"🎤"}</button>
        <button className="send-button" type="submit" disabled={!message.trim() || isSystem}>➤</button>
      </form>
    </div>
  </section>;
}

/* ============================================================
   GENERIC WORKSPACE PAGE
   ============================================================ */

function CreateEntityModal({ type, profile, onClose, onCreated }) {
  const [name,setName]=useState(""); const [description,setDescription]=useState(""); const [people,setPeople]=useState([]); const [members,setMembers]=useState([]); const [busy,setBusy]=useState(false);
  useEffect(()=>{supabase.from("profiles").select("id,username,full_name,avatar_url").neq("id",profile.id).limit(50).then(({data})=>setPeople(data||[]));},[profile.id]);
  async function create(e){e.preventDefault();if(!name.trim())return;setBusy(true);
    if(type==="Group"){
      const {data,error}=await supabase.from("conversations").insert({type:"group",name:name.trim(),created_by:profile.id,owner_id:profile.id}).select("*").single();
      if(error){alert(error.message);setBusy(false);return;}
      const rows=[{conversation_id:data.id,user_id:profile.id,is_admin:true},...members.map(id=>({conversation_id:data.id,user_id:id,is_admin:false}))];
      await supabase.from("conversation_members").insert(rows); onCreated({...data,member_ids:[profile.id,...members],description});
    } else {
      const {data,error}=await supabase.from("communities").insert({name:name.trim(),description:description.trim(),created_by:profile.id}).select("*").single();
      if(error){alert(error.message);setBusy(false);return;}
      await supabase.from("community_members").insert({community_id:data.id,user_id:profile.id,is_admin:true});
      onCreated({...data,member_ids:[profile.id]});
    }
    setBusy(false);onClose();
  }
  return <div className="modal-backdrop" onClick={onClose}><div className="entity-modal" onClick={e=>e.stopPropagation()}><div className="modal-header"><div><h2>Create {type}</h2><p>Create a real HEXA {type.toLowerCase()}.</p></div><button onClick={onClose}>×</button></div><form onSubmit={create}><input className="modal-input" value={name} onChange={e=>setName(e.target.value)} placeholder={`${type} name`} required/><textarea className="modal-input modal-textarea" value={description} onChange={e=>setDescription(e.target.value)} placeholder="Description"/>{type==="Group"&&<div className="member-picker"><strong>Add HEXA members</strong>{people.map(p=><label key={p.id} className="member-option"><input type="checkbox" checked={members.includes(p.id)} onChange={()=>setMembers(m=>m.includes(p.id)?m.filter(x=>x!==p.id):[...m,p.id])}/><Avatar src={p.avatar_url} name={p.full_name||p.username} size={34}/><span>{p.full_name||p.username||p.id}</span></label>)}</div>}<button className="hero-primary" disabled={busy}>{busy?"Creating…":`Create ${type}`}</button></form></div></div>;
}

function GroupsPage({ profile, onOpenChat }) {
  const [groups,setGroups]=useState([]);const[show,setShow]=useState(false);const[loading,setLoading]=useState(true);
  useEffect(()=>{(async()=>{const {data}=await supabase.from("conversations").select("*").eq("type","group").order("created_at",{ascending:false});setGroups(data||[]);setLoading(false)})();},[]);
  return <section className="workspace-page"><div className="page-heading"><div className="page-heading-icon">👥</div><div><h1>Groups</h1><p>Create group conversations and manage members.</p></div><button className="hero-primary heading-action" onClick={()=>setShow(true)}>＋ Create Group</button></div><div className="entity-grid">{loading?<div className="coming-card"><h2>Loading groups…</h2></div>:groups.length?groups.map(g=><button className="entity-card" key={g.id} onClick={()=>onOpenChat?.({...g,kind:"group",online:true})}><Avatar name={g.name} size={54}/><strong>{g.name}</strong><span>{g.description||"HEXA group conversation"}</span></button>):<div className="coming-card"><div>👥</div><h2>Your groups</h2><p>No groups yet. Create one and add HEXA users.</p></div>}</div>{show&&<CreateEntityModal type="Group" profile={profile} onClose={()=>setShow(false)} onCreated={g=>setGroups(x=>[g,...x])}/>}</section>;
}

function CommunitiesPage({ profile }) { const[items,setItems]=useState([]);const[show,setShow]=useState(false);useEffect(()=>{supabase.from("communities").select("*").order("created_at",{ascending:false}).then(({data})=>setItems(data||[]))},[]);return <section className="workspace-page"><div className="page-heading"><div className="page-heading-icon">◉</div><div><h1>Communities</h1><p>Bring groups and people together.</p></div><button className="hero-primary heading-action" onClick={()=>setShow(true)}>＋ Create Community</button></div><div className="entity-grid">{items.length?items.map(c=><div className="entity-card" key={c.id}><Avatar name={c.name} size={54}/><strong>{c.name}</strong><span>{c.description||"HEXA community"}</span></div>):<div className="coming-card"><div>◉</div><h2>Your communities</h2><p>Create a community and add your groups.</p></div>}</div>{show&&<CreateEntityModal type="Community" profile={profile} onClose={()=>setShow(false)} onCreated={c=>setItems(x=>[c,...x])}/>}</section>; }

function ChannelsPage({ profile }) {
  const[channels,setChannels]=useState([]);const[name,setName]=useState("");const[creating,setCreating]=useState(false);
  useEffect(()=>{supabase.from("conversations").select("*").eq("type","group").order("created_at",{ascending:false}).then(({data})=>setChannels((data||[]).filter(x=>x.metadata?.channel===true||/^channel:/i.test(x.name||""))))},[]);
  async function create(){if(!name.trim())return;setCreating(true);const {data,error}=await supabase.from("conversations").insert({type:"group",name:`channel:${name.trim()}`,created_by:profile.id,owner_id:profile.id}).select("*").single();if(error)alert(error.message);else{await supabase.from("conversation_members").insert({conversation_id:data.id,user_id:profile.id,is_admin:true});setChannels(x=>[data,...x]);setName("")}setCreating(false)}
  return <section className="workspace-page"><div className="page-heading"><div className="page-heading-icon">▣</div><div><h1>Channels</h1><p>Broadcast-style HEXA spaces.</p></div></div><div className="settings-card"><div><strong>Create a channel</strong><p>Channels use the existing group conversation infrastructure.</p></div><input className="modal-input" style={{maxWidth:300}} value={name} onChange={e=>setName(e.target.value)} placeholder="Channel name"/><button onClick={create} disabled={creating}>Create</button></div><div className="entity-grid">{channels.map(c=><div className="entity-card" key={c.id}><strong>{String(c.name).replace(/^channel:/i,"")}</strong><span>Channel</span></div>)}</div></section>;
}

function StatusPage({ profile }) {
  const[statuses,setStatuses]=useState([]);const[show,setShow]=useState(false);const[viewer,setViewer]=useState(null);const[text,setText]=useState("");const[description,setDescription]=useState("");const[file,setFile]=useState(null);const fileRef=useRef(null);
  async function load(){const {data}=await supabase.from("statuses").select("*").gt("expires_at",new Date().toISOString()).order("created_at",{ascending:false});setStatuses(data||[])}
  useEffect(()=>{load()},[]);
  async function upload(file){const bucket=import.meta.env.VITE_SUPABASE_STORAGE_BUCKET;if(!bucket)throw new Error("Set VITE_SUPABASE_STORAGE_BUCKET for status media uploads.");const path=`${profile.id}/statuses/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,"_")}`;const {error}=await supabase.storage.from(bucket).upload(path,file,{contentType:file.type});if(error)throw error;return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl}
  async function create(e){e.preventDefault();if(!text.trim()&&!file)return;let mediaUrl="",mediaType="";try{if(file){mediaUrl=await upload(file.file);mediaType=file.kind}}catch(err){alert(err.message);return}const {error}=await supabase.from("statuses").insert({user_id:profile.id,text:text.trim(),description:description.trim(),media_url:mediaUrl,media_type:mediaType,expires_at:new Date(Date.now()+86400000).toISOString()});if(error)alert(error.message);else{setText("");setDescription("");setFile(null);setShow(false);load()}}
  function pick(e){const f=e.target.files?.[0];if(f)setFile({file:f,url:URL.createObjectURL(f),kind:f.type.startsWith("video")?"video":"image"})}
  async function like(s){if(String(s.id).startsWith("local"))return;const {data}=await supabase.from("status_likes").select("status_id").eq("status_id",s.id).eq("user_id",profile.id).maybeSingle();if(data)await supabase.from("status_likes").delete().eq("status_id",s.id).eq("user_id",profile.id);else await supabase.from("status_likes").insert({status_id:s.id,user_id:profile.id});}
  return <section className="workspace-page"><div className="page-heading"><div className="page-heading-icon">◌</div><div><h1>Status</h1><p>Share text, photos and videos that expire after 24 hours.</p></div><button className="hero-primary heading-action" onClick={()=>setShow(true)}>＋ Create Status</button></div><div className="status-row"><button className="create-status-card" onClick={()=>setShow(true)}><div className="create-status-plus">＋</div><strong>Create Status</strong><span>Text, photo or video</span></button>{statuses.map(s=><button key={s.id} className="status-card unseen" onClick={()=>setViewer(s)}><div className="status-preview">{s.media_url&&s.media_type==="image"?<img src={s.media_url} alt=""/>:s.media_url&&s.media_type==="video"?<video src={s.media_url}/>:<span>Aa</span>}</div><strong>{s.text||s.description||"Media status"}</strong><span>{new Date(s.created_at).toLocaleString()}</span></button>)}</div>{show&&<div className="modal-backdrop" onClick={()=>setShow(false)}><div className="status-modal" onClick={e=>e.stopPropagation()}><div className="modal-header"><h2>Create Status</h2><button onClick={()=>setShow(false)}>×</button></div><form onSubmit={create}><textarea className="modal-input modal-textarea" value={text} onChange={e=>setText(e.target.value)} placeholder="What's happening?"/><input className="modal-input" value={description} onChange={e=>setDescription(e.target.value)} placeholder="Caption / description"/><button type="button" className="media-picker" onClick={()=>fileRef.current?.click()}><span>📷</span><div><strong>{file?file.file.name:"Add photo or video"}</strong><small>Camera, gallery or laptop file</small></div></button><input ref={fileRef} hidden type="file" accept="image/*,video/*" capture="environment" onChange={pick}/>{file&&<div className="status-media-preview">{file.kind==="video"?<video controls src={file.url}/>:<img src={file.url} alt="Preview"/>}</div>}<button className="hero-primary">Post Status</button></form></div></div>}{viewer&&<div className="story-viewer" onClick={()=>setViewer(null)}><button className="story-close" onClick={()=>setViewer(null)}>×</button><div className="story-content" onClick={e=>e.stopPropagation()}>{viewer.media_url&&viewer.media_type==="video"?<video controls autoPlay src={viewer.media_url}/>:viewer.media_url?<img src={viewer.media_url} alt="Status"/>:<div className="story-text">{viewer.text}</div>}<div className="story-caption">{viewer.description||viewer.text}</div><div className="story-actions"><button onClick={()=>like(viewer)}>❤️</button><button>😂</button><button>😮</button></div></div></div>}</section>;
}

function CallsPage({ profile }) {
  const[history,setHistory]=useState([]);const[active,setActive]=useState(null);const[peer,setPeer]=useState(null);const[status,setStatus]=useState("");
  useEffect(()=>{supabase.from("calls").select("*").or(`caller_id.eq.${profile.id},callee_id.eq.${profile.id}`).order("created_at",{ascending:false}).limit(30).then(({data})=>setHistory(data||[]))},[profile.id]);
  async function createCall(type){if(!peer?.id)return;const {data,error}=await supabase.from("calls").insert({caller_id:profile.id,callee_id:peer.id,type,status:"ringing",rate_kobo_per_second:0.15}).select("*").single();if(error){setStatus(error.message);return}setActive({call:data,type,peer});setStatus("Calling…")}
  return <section className="workspace-page"><div className="page-heading"><div className="page-heading-icon">☎</div><div><h1>Calls</h1><p>Voice and video calls using WebRTC signaling through Supabase.</p></div></div><div className="settings-card"><div><strong>Start a call</strong><p>Open a chat and use the phone/video buttons to select a person.</p></div><input className="modal-input" style={{maxWidth:280}} placeholder="Paste user UUID" value={peer?.id||""} onChange={e=>setPeer({id:e.target.value})}/><button onClick={()=>createCall("voice")}>Voice</button><button onClick={()=>createCall("video")}>Video</button></div>{active&&<WebRTCCall profile={profile} call={active.call} type={active.type} peer={active.peer} onEnd={()=>{setActive(null);setStatus("Call ended")}}/>}<div className="entity-grid">{history.map(c=><div className="entity-card" key={c.id}><strong>{c.type} · {c.status}</strong><span>{new Date(c.created_at).toLocaleString()}</span><small>{c.billed_seconds||0}s · ₦{Number(c.amount_kobo||0)/100}</small></div>)}</div>{status&&<p className="muted">{status}</p>}</section>;
}

function WebRTCCall({ profile, call, type, peer, onEnd }) {
  const localVideo = useRef(null);
  const remoteVideo = useRef(null);
  const pcRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState("");
  const startedRef = useRef(Date.now());
  const endedRef = useRef(false);

  useEffect(() => {
    let channel;
    let pc;
    let stopped = false;

    async function insertSignal(typeName, payload) {
      const { error: signalError } = await supabase.from("call_signals").insert({
        call_id: call.id,
        sender_id: profile.id,
        receiver_id: peer.id,
        type: typeName,
        payload,
      });
      if (signalError) console.warn("HEXA call signal:", signalError.message);
    }

    async function handleSignal(signal) {
      if (stopped || signal.receiver_id !== profile.id) return;
      try {
        if (signal.type === "offer") {
          await pc.setRemoteDescription(new RTCSessionDescription(signal.payload));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          await insertSignal("answer", answer);
        } else if (signal.type === "answer" && profile.id === call.caller_id) {
          if (!pc.currentRemoteDescription) await pc.setRemoteDescription(new RTCSessionDescription(signal.payload));
        } else if (signal.type === "ice" && signal.payload) {
          try { await pc.addIceCandidate(new RTCIceCandidate(signal.payload)); } catch {}
        }
      } catch (e) {
        console.error(e);
        if (!stopped) setError(e?.message || "Call negotiation failed.");
      }
    }

    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error("Camera/microphone access is not available in this browser.");
        const cfg = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };
        if (import.meta.env.VITE_TURN_URL) {
          cfg.iceServers.push({ urls: import.meta.env.VITE_TURN_URL, username: import.meta.env.VITE_TURN_USERNAME, credential: import.meta.env.VITE_TURN_CREDENTIAL });
        }
        pc = new RTCPeerConnection(cfg);
        pcRef.current = pc;
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: type === "video" });
        if (localVideo.current) localVideo.current.srcObject = stream;
        stream.getTracks().forEach(track => pc.addTrack(track, stream));
        pc.ontrack = e => { if (remoteVideo.current && e.streams[0]) remoteVideo.current.srcObject = e.streams[0]; };
        pc.onicecandidate = e => { if (e.candidate) insertSignal("ice", e.candidate.toJSON()); };
        pc.onconnectionstatechange = () => {
          const state = pc.connectionState;
          setConnected(state === "connected");
          if (["failed", "disconnected"].includes(state) && !stopped) setError("Call connection lost.");
        };

        channel = supabase.channel(`call-${call.id}`)
          .on("postgres_changes", { event: "INSERT", schema: "public", table: "call_signals", filter: `call_id=eq.${call.id}` }, p => handleSignal(p.new))
          .subscribe();

        // Catch an offer that was created before the callee pressed Answer.
        const { data: existingSignals } = await supabase.from("call_signals").select("*").eq("call_id", call.id).order("id", { ascending: true });
        for (const signal of existingSignals || []) await handleSignal(signal);

        if (profile.id === call.caller_id) {
          const hasOffer = (existingSignals || []).some(s => s.type === "offer" && s.sender_id === profile.id);
          if (!hasOffer) {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            await insertSignal("offer", offer);
          }
        }

        await supabase.from("calls").update({ status: "active", started_at: new Date().toISOString() }).eq("id", call.id).eq("status", "ringing");
        startedRef.current = Date.now();
      } catch (e) {
        console.error(e);
        if (!stopped) setError(e?.message || "Unable to start the call.");
      }
    })();

    return () => {
      stopped = true;
      pc?.getSenders().forEach(sender => sender.track?.stop());
      pc?.close();
      if (channel) supabase.removeChannel(channel);
    };
  }, [call.id, call.caller_id, peer.id, profile.id, type]);

  async function end() {
    if (endedRef.current) return;
    endedRef.current = true;
    const seconds = connected ? Math.max(0, Math.floor((Date.now() - startedRef.current) / 1000)) : 0;
    await supabase.from("calls").update({
      status: "ended",
      ended_at: new Date().toISOString(),
      ended_reason: "user",
      billed_seconds: seconds,
      amount_kobo: seconds * 0.15,
    }).eq("id", call.id);
    pcRef.current?.getSenders().forEach(sender => sender.track?.stop());
    pcRef.current?.close();
    onEnd?.();
  }

  return <div className="story-viewer" style={{ zIndex: 800 }}>
    <div className="call-shell">
      <div className="call-header"><strong>{type === "video" ? "HEXA Video Call" : "HEXA Voice Call"}</strong><span>{connected ? "Connected" : "Connecting…"}</span></div>
      {type === "video" ? <div className="call-video-grid"><video ref={remoteVideo} autoPlay playsInline className="call-remote-video"/><video ref={localVideo} autoPlay muted playsInline className="call-local-video"/></div> : <div className="call-audio-stage"><div className="call-avatar"><Avatar name={peer?.name || "HEXA User"} size={82}/></div><p>{error || (connected ? "Connected" : "Calling…")}</p></div>}
      {error && <p className="call-error">{error}</p>}
      <div className="call-controls"><button className="danger-button" onClick={end}>End call</button></div>
    </div>
  </div>;
}
function WebRTCCallLauncher({profile,target,onClose}){
  const[call,setCall]=useState(null);const[error,setError]=useState("");useEffect(()=>{let mounted=true;(async()=>{const user=target.conversation?.user_a===profile.id?target.conversation?.user_b:target.conversation?.user_a;if(!user){setError("This conversation does not have a direct call target.");return}const {data,error}=await supabase.from("calls").insert({conversation_id:target.conversation.id,caller_id:profile.id,callee_id:user,type:target.type,status:"ringing",rate_kobo_per_second:0.15}).select("*").single();if(!mounted)return;if(error)setError(error.message);else setCall({...data,callee_id:user})})();return()=>{mounted=false}},[]);if(error)return <div className="story-viewer"><div className="coming-card"><h2>Call unavailable</h2><p>{error}</p><button onClick={onClose}>Close</button></div></div>;return call?<WebRTCCall profile={profile} call={call} type={target.type} peer={{id:call.callee_id}} onEnd={onClose}/>:<div className="story-viewer"><div className="coming-card"><h2>Starting call…</h2></div></div>;
}

function IncomingCallWatcher({ profile }) {
  const [incoming, setIncoming] = useState(null);
  useEffect(() => {
    if (!profile?.id) return;
    let active = true;
    const channel = supabase.channel(`hexa-incoming-calls-${profile.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "calls", filter: `callee_id=eq.${profile.id}` }, async (payload) => {
        const call = payload.new;
        if (!active || call.status !== "ringing") return;
        const { data: peer } = await supabase.from("profiles").select("id,username,full_name,avatar_url").eq("id", call.caller_id).maybeSingle();
        if (active) setIncoming({ call, peer: peer || { id: call.caller_id, full_name: "HEXA User" } });
      })
      .subscribe();
    return () => { active = false; supabase.removeChannel(channel); };
  }, [profile?.id]);
  if (!incoming) return null;
  const accept = () => setIncoming(x => x ? { ...x, accepted: true } : null);
  const decline = async () => {
    await supabase.from("calls").update({ status: "ended", ended_at: new Date().toISOString(), ended_reason: "declined" }).eq("id", incoming.call.id);
    setIncoming(null);
  };
  if (incoming.accepted) return <WebRTCCall profile={profile} call={incoming.call} type={incoming.call.type} peer={{ id: incoming.call.caller_id }} onEnd={() => setIncoming(null)} />;
  return <div className="story-viewer" style={{ zIndex: 700 }}>
    <div className="coming-card" style={{ width: "min(420px, 92vw)", textAlign: "center" }}>
      <Avatar src={incoming.peer?.avatar_url} name={incoming.peer?.full_name || incoming.peer?.username} size={82} />
      <h2>{incoming.peer?.full_name || incoming.peer?.username || "HEXA User"}</h2>
      <p>Incoming {incoming.call.type === "video" ? "video" : "voice"} call</p>
      <div className="hero-actions">
        <button className="hero-secondary" onClick={decline}>Decline</button>
        <button className="hero-primary" onClick={accept}>Answer</button>
      </div>
    </div>
  </div>;
}

function AuthenticatedHEXA({ session, onSignOut }) {
  const [profile,setProfile]=useState(null),[profileLoading,setProfileLoading]=useState(true),[activePage,setActivePage]=useState("nexus"),[search,setSearch]=useState(""),[notifications,setNotifications]=useState([]),[showNotifications,setShowNotifications]=useState(false),[chatTarget,setChatTarget]=useState(null),[callTarget,setCallTarget]=useState(null);
  useEffect(()=>{let cancelled=false;(async()=>{const result=await ensureHexaProfile(session?.user);if(!cancelled){setProfile(result);setProfileLoading(false)}})();return()=>{cancelled=true}},[session?.user?.id]);
  useEffect(()=>{if(!profile?.id)return;const channel=supabase.channel(`hexa-notifications-${profile.id}`).on("postgres_changes",{event:"INSERT",schema:"public",table:"messages"},p=>{if(p.new?.sender_id===profile.id)return;setNotifications(x=>[{id:Date.now(),title:"New message",body:p.new?.content||"New message",created_at:new Date().toISOString()},...x].slice(0,50))}).subscribe();return()=>supabase.removeChannel(channel)},[profile?.id]);
  if(profileLoading)return <div className="hexa-loading-screen"><div className="loading-logo">H</div><div className="loading-spinner"/><strong>Opening HEXA…</strong><span>Preparing your workspace</span></div>;
  let page; switch(activePage){
    case "nexus":page=<NexusHome profile={profile} setActivePage={setActivePage}/>;break;
    case "chat":page=<ChatPage profile={profile} initialConversation={chatTarget?.id ? chatTarget : undefined} onStartCall={(c,type)=>setCallTarget({conversation:c,type})} onOpenChatWithUser={()=>setSearch("")}/>;break;
    case "groups":page=<GroupsPage profile={profile} onOpenChat={c=>{setChatTarget(c);setActivePage("chat")}}/>;break;
    case "communities":page=<CommunitiesPage profile={profile}/>;break;
    case "channels":page=<ChannelsPage profile={profile}/>;break;
    case "status":page=<StatusPage profile={profile}/>;break;
    case "calls":page=<CallsPage profile={profile}/>;break;
    case "kora":page=<KoraPage profile={profile}/>;break;
    case "settings":page=<SettingsPage profile={profile} onSignOut={onSignOut}/>;break;
    case "projects":page=<WorkspacePlaceholder title="Projects" description="Organize collaborative work." icon="◆"/>;break;
    case "developer":page=<WorkspacePlaceholder title="Developer Hub" description="Build and connect with HEXA." icon="</>"/>;break;
    default:page=<NexusHome profile={profile} setActivePage={setActivePage}/>;
  }
  return <div className="hexa-app"><IncomingCallWatcher profile={profile}/><Sidebar activePage={activePage} setActivePage={setActivePage} profile={profile}/><div className="hexa-main"><Topbar profile={profile} search={search} setSearch={setSearch} activePage={activePage} onNotifications={()=>setShowNotifications(v=>!v)} notificationCount={notifications.length} onSettings={()=>setActivePage("settings")}/><main className="hexa-content"><UniversalSearch search={search} profile={profile} onMessage={async p=>{setSearch("");const {data}=await supabase.from("conversations").select("*").eq("type","direct").or(`and(user_a.eq.${profile.id},user_b.eq.${p.id}),and(user_a.eq.${p.id},user_b.eq.${profile.id})`).limit(1).maybeSingle();if(data){setChatTarget({...data,name:p.full_name||p.username,kind:"direct"});setActivePage("chat")}else{const {data:newChat,error}=await supabase.from("conversations").insert({type:"direct",user_a:profile.id,user_b:p.id,created_by:profile.id,owner_id:profile.id,name:p.full_name||p.username||"HEXA User"}).select("*").single();if(error){alert(error.message);return}await supabase.from("conversation_members").upsert([{conversation_id:newChat.id,user_id:profile.id,is_admin:true},{conversation_id:newChat.id,user_id:p.id,is_admin:false}],{onConflict:"conversation_id,user_id"});setChatTarget({...newChat,name:p.full_name||p.username,kind:"direct"});setActivePage("chat")}}}/>{showNotifications&&<div className="notifications-panel"><div className="notifications-header"><strong>Notifications</strong><button onClick={()=>setNotifications([])}>Clear</button></div>{notifications.length?notifications.map(n=><div className="notification-item" key={n.id}><span>●</span><div><strong>{n.title}</strong><p>{n.body}</p><small>{new Date(n.created_at).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}</small></div></div>):<div className="notification-empty">You're all caught up.</div>}</div>}{page}{callTarget&&<WebRTCCallLauncher profile={profile} target={callTarget} onClose={()=>setCallTarget(null)}/>}</main></div></div>;
}


/* ============================================================
   AUTH BOOTSTRAP
   ============================================================ */

export default function App() {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [authError, setAuthError] = useState("");

  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    let subscription;

    async function initializeAuth() {
      try {
        /*
          Supabase's PKCE email/OAuth callback may arrive with:

          ?code=...

          detectSessionInUrl is enabled above, so the client can
          automatically process the redirect.

          We additionally handle the code explicitly as a fallback.
        */
        if (typeof window !== "undefined") {
          const url = new URL(window.location.href);
          const code = url.searchParams.get("code");

          if (code) {
            const { error } =
              await supabase.auth.exchangeCodeForSession(code);

            if (error) {
              console.warn(
                "HEXA auth code exchange:",
                error.message
              );
            }

            /*
              Remove the one-time auth code from the visible URL.
            */
            url.searchParams.delete("code");

            window.history.replaceState(
              {},
              document.title,
              `${url.pathname}${url.search}${url.hash}`
            );
          }

          /*
            Handle password-reset callbacks.
          */
          const type = url.searchParams.get("type");

          if (type === "recovery") {
            console.log("HEXA password recovery callback.");
          }
        }

        const {
          data: { session: currentSession },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          throw error;
        }

        if (mountedRef.current) {
          setSession(currentSession || null);
          setAuthLoading(false);
        }

        /*
          Important:
          onAuthStateChange handles:

          SIGNED_IN
          SIGNED_OUT
          TOKEN_REFRESHED
          USER_UPDATED

          This includes authentication returning from email
          confirmation and OAuth redirects.
        */
        const {
          data: { subscription: authSubscription },
        } = supabase.auth.onAuthStateChange(
          (event, nextSession) => {
            console.log("HEXA auth event:", event);

            if (!mountedRef.current) return;

            setSession(nextSession || null);

            /*
              Do not perform long database operations directly inside
              the Supabase auth callback. Schedule them after the
              callback finishes.
            */
            if (
              nextSession?.user &&
              (event === "SIGNED_IN" ||
                event === "USER_UPDATED" ||
                event === "INITIAL_SESSION")
            ) {
              setTimeout(() => {
                ensureHexaProfile(nextSession.user).catch(
                  (profileError) => {
                    console.warn(
                      "HEXA profile bootstrap:",
                      profileError
                    );
                  }
                );
              }, 0);
            }
          }
        );

        subscription = authSubscription;
      } catch (error) {
        console.error("HEXA authentication initialization:", error);

        if (mountedRef.current) {
          setAuthError(getAuthErrorMessage(error));
          setAuthLoading(false);
        }
      }
    }

    initializeAuth();

    return () => {
      mountedRef.current = false;

      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();

    if (mountedRef.current) {
      setSession(null);
    }
  }

  /*
    ============================================================
    IMPORTANT:
    Do NOT render the normal app before auth initialization has
    finished. This prevents the temporary "logged out" screen
    flashing during email verification/OAuth redirects.
    ============================================================
  */

  if (authLoading) {
    return (
      <>
        <style>{APP_STYLES}</style>

        <div className="hexa-loading-screen">
          <div className="loading-logo">H</div>
          <div className="loading-spinner" />
          <strong>HEXA</strong>
          <span>Connecting your account...</span>
        </div>
      </>
    );
  }

  if (authError && !session) {
    return (
      <>
        <style>{APP_STYLES}</style>

        <div className="hexa-error-screen">
          <div className="loading-logo">H</div>

          <h1>HEXA couldn't start</h1>

          <p>{authError}</p>

          <button
            className="hero-primary"
            onClick={() => window.location.reload()}
          >
            Try again
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{APP_STYLES}</style>

      {session ? (
        <AuthenticatedHEXA
          session={session}
          onSignOut={handleSignOut}
        />
      ) : (
        <AuthScreen />
      )}
    </>
  );
}

/* ============================================================
   CSS
   ============================================================ */

const APP_STYLES = `
:root {
  font-family:
    Inter,
    ui-sans-serif,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;

  color-scheme: dark;

  --hexa-bg: #07090d;
  --hexa-panel: #0d1118;
  --hexa-panel-2: #111722;
  --hexa-panel-3: #171e2b;
  --hexa-border: rgba(255,255,255,.08);
  --hexa-border-strong: rgba(255,255,255,.14);
  --hexa-text: #f4f7fb;
  --hexa-muted: #8e99aa;
  --hexa-accent: #7c5cff;
  --hexa-accent-2: #a78bfa;
  --hexa-success: #30d158;
  --hexa-danger: #ff4d67;
  --hexa-shadow: 0 24px 70px rgba(0,0,0,.35);
}

* {
  box-sizing: border-box;
}

html,
body,
#root {
  width: 100%;
  min-height: 100%;
  margin: 0;
}

body {
  background: var(--hexa-bg);
  color: var(--hexa-text);
}

button,
input,
textarea {
  font: inherit;
}

button {
  cursor: pointer;
}

button:disabled {
  cursor: not-allowed;
  opacity: .55;
}

/* ============================================================
   AUTH
   ============================================================ */

.hexa-auth-page {
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  position: relative;
  overflow: hidden;
  background:
    radial-gradient(
      circle at 20% 10%,
      rgba(124,92,255,.16),
      transparent 34%
    ),
    radial-gradient(
      circle at 90% 80%,
      rgba(77,166,255,.10),
      transparent 35%
    ),
    #07090d;
}

.hexa-auth-glow {
  position: absolute;
  width: 360px;
  height: 360px;
  border-radius: 50%;
  filter: blur(90px);
  pointer-events: none;
}

.glow-one {
  top: -180px;
  left: -140px;
  background: rgba(124,92,255,.22);
}

.glow-two {
  bottom: -180px;
  right: -140px;
  background: rgba(72,149,239,.14);
}

.hexa-auth-card {
  width: min(100%, 470px);
  padding: 38px;
  border: 1px solid var(--hexa-border);
  background: rgba(13,17,24,.92);
  backdrop-filter: blur(24px);
  border-radius: 28px;
  box-shadow: var(--hexa-shadow);
  position: relative;
  z-index: 2;
}

.hexa-brand {
  display: flex;
  align-items: center;
  gap: 13px;
  margin-bottom: 34px;
}

.hexa-logo,
.small-logo,
.loading-logo {
  display: grid;
  place-items: center;
  background:
    linear-gradient(
      145deg,
      var(--hexa-accent),
      #4e8cff
    );
  box-shadow:
    0 12px 30px rgba(124,92,255,.28);
  color: white;
  font-weight: 900;
}

.hexa-logo {
  width: 50px;
  height: 50px;
  border-radius: 15px;
  font-size: 22px;
}

.hexa-brand strong {
  display: block;
  font-size: 21px;
  letter-spacing: .12em;
}

.hexa-brand span {
  display: block;
  color: var(--hexa-muted);
  font-size: 12px;
  margin-top: 2px;
}

.auth-heading h1 {
  font-size: 30px;
  line-height: 1.1;
  margin: 0 0 10px;
}

.auth-heading p {
  color: var(--hexa-muted);
  margin: 0 0 26px;
  line-height: 1.6;
}

.auth-field {
  display: block;
  margin-bottom: 16px;
}

.auth-field span {
  display: block;
  margin-bottom: 8px;
  color: #cbd3df;
  font-size: 13px;
  font-weight: 700;
}

.auth-field input,
.message-composer input,
.chat-search input,
.topbar-search input {
  width: 100%;
  border: 1px solid var(--hexa-border);
  background: rgba(255,255,255,.035);
  color: var(--hexa-text);
  outline: none;
}

.auth-field input {
  height: 50px;
  padding: 0 15px;
  border-radius: 13px;
}

.auth-field input:focus,
.message-composer input:focus,
.chat-search input:focus,
.topbar-search input:focus {
  border-color: rgba(124,92,255,.65);
  box-shadow: 0 0 0 3px rgba(124,92,255,.10);
}

.auth-field input::placeholder,
.message-composer input::placeholder,
.chat-search input::placeholder,
.topbar-search input::placeholder {
  color: #667181;
}

.password-strength {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: -8px 0 16px;
}

.strength-bars {
  display: flex;
  gap: 4px;
  flex: 1;
}

.strength-bars i {
  height: 3px;
  flex: 1;
  border-radius: 4px;
  background: #252d3a;
}

.strength-bars i.filled {
  background: var(--hexa-accent);
}

.password-strength span {
  font-size: 11px;
  color: var(--hexa-muted);
}

.primary-auth-button,
.google-auth-button {
  width: 100%;
  height: 50px;
  border-radius: 13px;
  border: 1px solid transparent;
  font-weight: 800;
}

.primary-auth-button {
  background: linear-gradient(
    135deg,
    var(--hexa-accent),
    #596cff
  );
  color: white;
  box-shadow: 0 12px 28px rgba(124,92,255,.22);
}

.google-auth-button {
  background: rgba(255,255,255,.045);
  border-color: var(--hexa-border);
  color: white;
}

.google-icon {
  margin-right: 8px;
  font-weight: 900;
}

.auth-divider {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 22px 0;
  color: #5f6877;
  font-size: 12px;
}

.auth-divider::before,
.auth-divider::after {
  content: "";
  height: 1px;
  flex: 1;
  background: var(--hexa-border);
}

.auth-forgot-row {
  text-align: right;
  margin: -5px 0 17px;
}

.text-button {
  border: 0;
  background: transparent;
  color: var(--hexa-accent-2);
  padding: 0;
  font-size: 12px;
}

.auth-switch {
  text-align: center;
  color: var(--hexa-muted);
  font-size: 13px;
  margin-top: 22px;
}

.auth-switch button {
  border: 0;
  background: transparent;
  color: var(--hexa-accent-2);
  font-weight: 800;
  margin-left: 5px;
}

.auth-footer {
  text-align: center;
  color: #566070;
  font-size: 10px;
  margin: 25px 0 0;
}

.auth-alert {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 13px;
  border-radius: 12px;
  margin-bottom: 18px;
  font-size: 12px;
  line-height: 1.5;
}

.auth-error {
  background: rgba(255,77,103,.08);
  border: 1px solid rgba(255,77,103,.18);
  color: #ff9aac;
}

.auth-success {
  background: rgba(48,209,88,.08);
  border: 1px solid rgba(48,209,88,.18);
  color: #91eca8;
}

/* ============================================================
   APP
   ============================================================ */

.hexa-app {
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  background: var(--hexa-bg);
}

.hexa-sidebar {
  width: 250px;
  min-width: 250px;
  border-right: 1px solid var(--hexa-border);
  background: #090c11;
  display: flex;
  flex-direction: column;
  padding: 20px 14px;
}

.sidebar-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 8px 24px;
}

.small-logo {
  width: 36px;
  height: 36px;
  border-radius: 11px;
  font-size: 15px;
}

.sidebar-brand strong {
  display: block;
  font-size: 14px;
  letter-spacing: .13em;
}

.sidebar-brand span {
  color: var(--hexa-muted);
  font-size: 9px;
  letter-spacing: .18em;
}

.mobile-close {
  display: none;
  margin-left: auto;
  background: transparent;
  border: 0;
  color: var(--hexa-muted);
  font-size: 25px;
}

.sidebar-nav {
  flex: 1;
}

.sidebar-section-label {
  color: #535d6c;
  font-size: 9px;
  letter-spacing: .16em;
  font-weight: 800;
  padding: 0 11px 9px;
}

.sidebar-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  border: 0;
  border-radius: 11px;
  background: transparent;
  color: #8d98a8;
  padding: 11px 12px;
  margin-bottom: 3px;
  text-align: left;
  font-size: 13px;
  transition: .15s ease;
}

.sidebar-item:hover {
  background: rgba(255,255,255,.035);
  color: white;
}

.sidebar-item.active {
  background: rgba(124,92,255,.12);
  color: white;
  box-shadow:
    inset 2px 0 0 var(--hexa-accent);
}

.sidebar-icon {
  width: 21px;
  text-align: center;
  font-size: 15px;
}

.sidebar-bottom {
  border-top: 1px solid var(--hexa-border);
  padding-top: 15px;
}

.sidebar-user {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 7px;
}

.sidebar-user-info {
  min-width: 0;
  flex: 1;
}

.sidebar-user-info strong {
  display: block;
  font-size: 11px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sidebar-user-info span {
  display: block;
  color: var(--hexa-muted);
  font-size: 9px;
  margin-top: 2px;
}

.signout-small {
  border: 0;
  background: transparent;
  color: #677181;
  font-size: 17px;
}

.signout-small:hover {
  color: white;
}

.hexa-avatar {
  position: relative;
  border-radius: 50%;
  overflow: visible;
  display: grid;
  place-items: center;
  background:
    linear-gradient(
      145deg,
      #242d3d,
      #151a23
    );
  border: 1px solid var(--hexa-border);
  flex-shrink: 0;
}

.hexa-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
}

.hexa-avatar span {
  font-size: 12px;
  font-weight: 900;
}

.hexa-online-dot {
  position: absolute;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: var(--hexa-success);
  border: 2px solid #090c11;
  bottom: -1px;
  right: -1px;
}

.hexa-main {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.hexa-topbar {
  height: 68px;
  min-height: 68px;
  border-bottom: 1px solid var(--hexa-border);
  display: flex;
  align-items: center;
  padding: 0 24px;
  gap: 20px;
  background: rgba(7,9,13,.75);
  backdrop-filter: blur(16px);
}

.topbar-search {
  max-width: 620px;
  width: min(100%, 620px);
  position: relative;
  margin: auto;
}

.topbar-search > span {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: #667181;
}

.topbar-search input {
  height: 39px;
  border-radius: 10px;
  padding: 0 55px 0 38px;
  font-size: 12px;
}

.topbar-search kbd {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: #687383;
  background: rgba(255,255,255,.04);
  border: 1px solid var(--hexa-border);
  border-radius: 5px;
  padding: 2px 5px;
  font-size: 9px;
}

.topbar-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.topbar-actions > button {
  border: 0;
  background: transparent;
  color: #7d8797;
  font-size: 17px;
  width: 34px;
  height: 34px;
  border-radius: 9px;
}

.topbar-actions > button:hover {
  background: rgba(255,255,255,.05);
  color: white;
}

.mobile-page-title {
  display: none;
}

.hexa-content {
  flex: 1;
  min-height: 0;
  overflow: auto;
  position: relative;
}

.workspace-page {
  max-width: 1350px;
  margin: 0 auto;
  padding: 30px;
}

/* ============================================================
   NEXUS
   ============================================================ */

.hero-panel {
  min-height: 290px;
  border: 1px solid var(--hexa-border);
  border-radius: 24px;
  background:
    radial-gradient(
      circle at 85% 35%,
      rgba(124,92,255,.18),
      transparent 30%
    ),
    linear-gradient(
      135deg,
      #111621,
      #0c1018
    );
  padding: 40px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  overflow: hidden;
}

.eyebrow {
  color: var(--hexa-accent-2);
  font-size: 10px;
  font-weight: 900;
  letter-spacing: .18em;
  margin-bottom: 12px;
}

.hero-panel h1 {
  margin: 0;
  font-size: clamp(30px, 4vw, 52px);
  letter-spacing: -.045em;
}

.hero-panel h1 span {
  color: var(--hexa-accent-2);
}

.hero-panel p {
  max-width: 610px;
  color: var(--hexa-muted);
  line-height: 1.7;
  margin: 14px 0 24px;
}

.hero-actions {
  display: flex;
  gap: 10px;
}

.hero-primary,
.hero-secondary {
  border-radius: 11px;
  padding: 11px 17px;
  font-size: 12px;
  font-weight: 800;
}

.hero-primary {
  border: 1px solid transparent;
  background: linear-gradient(
    135deg,
    var(--hexa-accent),
    #596cff
  );
  color: white;
}

.hero-secondary {
  background: rgba(255,255,255,.04);
  border: 1px solid var(--hexa-border);
  color: white;
}

.hero-orbit {
  width: 240px;
  height: 240px;
  position: relative;
  display: grid;
  place-items: center;
}

.orbit-core {
  width: 70px;
  height: 70px;
  border-radius: 22px;
  display: grid;
  place-items: center;
  background: linear-gradient(
    145deg,
    var(--hexa-accent),
    #4c7cff
  );
  box-shadow: 0 0 60px rgba(124,92,255,.4);
  font-size: 28px;
  font-weight: 900;
  z-index: 2;
}

.orbit-ring {
  position: absolute;
  border: 1px solid rgba(124,92,255,.25);
  border-radius: 50%;
}

.ring-a {
  width: 150px;
  height: 150px;
}

.ring-b {
  width: 230px;
  height: 230px;
  border-color: rgba(255,255,255,.08);
}

.section-heading {
  display: flex;
  justify-content: space-between;
  margin: 32px 0 16px;
}

.section-heading h2 {
  margin: 0;
  font-size: 19px;
}

.section-heading p {
  color: var(--hexa-muted);
  font-size: 11px;
  margin: 4px 0 0;
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.feature-card {
  text-align: left;
  border: 1px solid var(--hexa-border);
  border-radius: 17px;
  background: var(--hexa-panel);
  color: white;
  padding: 20px;
  transition: .18s ease;
}

.feature-card:hover {
  transform: translateY(-2px);
  border-color: rgba(124,92,255,.35);
  background: var(--hexa-panel-2);
}

.feature-card > span {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: rgba(124,92,255,.10);
  margin-bottom: 17px;
}

.feature-card strong {
  display: block;
  font-size: 14px;
}

.feature-card p {
  color: var(--hexa-muted);
  line-height: 1.5;
  font-size: 11px;
  margin: 6px 0 0;
}

/* ============================================================
   CHAT
   ============================================================ */

.chat-layout {
  height: calc(100vh - 68px);
  height: calc(100dvh - 68px);
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr);
}

.chat-list-panel {
  border-right: 1px solid var(--hexa-border);
  background: #090c11;
  min-width: 0;
}

.chat-list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 22px 18px 16px;
}

.chat-list-header h2 {
  margin: 0;
  font-size: 21px;
}

.chat-list-header span {
  color: var(--hexa-muted);
  font-size: 10px;
}

.new-chat-button {
  width: 34px;
  height: 34px;
  border: 1px solid var(--hexa-border);
  background: rgba(124,92,255,.12);
  color: white;
  border-radius: 10px;
}

.chat-search {
  margin: 0 13px 13px;
  position: relative;
}

.chat-search span {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #697485;
}

.chat-search input {
  height: 39px;
  border-radius: 10px;
  padding-left: 34px;
  font-size: 11px;
}

.conversation-list {
  overflow-y: auto;
  max-height: calc(100% - 100px);
}

.conversation {
  width: calc(100% - 12px);
  margin: 2px 6px;
  padding: 10px 10px;
  display: flex;
  align-items: center;
  gap: 10px;
  border: 0;
  border-radius: 12px;
  background: transparent;
  color: white;
  text-align: left;
}

.conversation:hover,
.conversation.active {
  background: rgba(255,255,255,.05);
}

.conversation.active {
  box-shadow: inset 2px 0 var(--hexa-accent);
}

.conversation-content {
  min-width: 0;
}

.conversation-content strong {
  display: block;
  font-size: 12px;
}

.conversation-content span {
  display: block;
  color: var(--hexa-muted);
  font-size: 9px;
  margin-top: 4px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.chat-main {
  min-width: 0;
  display: flex;
  flex-direction: column;
  background:
    radial-gradient(
      circle at 50% 0,
      rgba(124,92,255,.035),
      transparent 40%
    );
}

.chat-header {
  height: 67px;
  min-height: 67px;
  display: flex;
  align-items: center;
  gap: 10px;
  border-bottom: 1px solid var(--hexa-border);
  padding: 0 17px;
}

.chat-header > div:nth-child(2) {
  min-width: 0;
  flex: 1;
}

.chat-header strong {
  display: block;
  font-size: 12px;
}

.chat-header span {
  display: block;
  color: var(--hexa-success);
  font-size: 9px;
  margin-top: 3px;
}

.chat-header-actions {
  display: flex;
  gap: 3px;
}

.chat-header-actions button {
  width: 35px;
  height: 35px;
  border: 0;
  border-radius: 9px;
  background: transparent;
  color: #7d8797;
}

.chat-header-actions button:hover {
  color: white;
  background: rgba(255,255,255,.04);
}

.messages-area {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 24px;
}

.empty-chat {
  height: 100%;
  display: grid;
  place-content: center;
  text-align: center;
}

.empty-chat-icon {
  width: 62px;
  height: 62px;
  display: grid;
  place-items: center;
  margin: 0 auto 16px;
  border-radius: 19px;
  background: rgba(124,92,255,.10);
  color: var(--hexa-accent-2);
  font-weight: 900;
  font-size: 23px;
}

.empty-chat h3 {
  margin: 0;
  font-size: 17px;
}

.empty-chat p {
  color: var(--hexa-muted);
  font-size: 11px;
}

.message-row {
  display: flex;
  margin: 7px 0;
}

.message-row.own {
  justify-content: flex-end;
}

.message-bubble {
  max-width: min(72%, 560px);
  padding: 9px 11px;
  border-radius: 14px;
  background: var(--hexa-panel-2);
  border: 1px solid var(--hexa-border);
}

.message-row.own .message-bubble {
  background: rgba(124,92,255,.17);
  border-color: rgba(124,92,255,.22);
}

.message-bubble span {
  display: block;
  font-size: 12px;
  line-height: 1.5;
}

.message-bubble small {
  display: block;
  text-align: right;
  color: #667181;
  font-size: 8px;
  margin-top: 4px;
}

.message-composer {
  min-height: 65px;
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 11px 14px;
  border-top: 1px solid var(--hexa-border);
}

.message-composer > button {
  border: 0;
  background: transparent;
  color: #758092;
  width: 32px;
  height: 32px;
  border-radius: 8px;
}

.message-composer > button:hover {
  color: white;
  background: rgba(255,255,255,.04);
}

.message-composer input {
  flex: 1;
  height: 40px;
  padding: 0 13px;
  border-radius: 11px;
  font-size: 11px;
}

.composer-action {
  font-size: 9px;
  font-weight: 900;
}

.send-button {
  background: var(--hexa-accent) !important;
  color: white !important;
}

/* ============================================================
   GENERIC PAGES
   ============================================================ */

.page-heading {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 28px;
}

.page-heading-icon {
  width: 50px;
  height: 50px;
  display: grid;
  place-items: center;
  border-radius: 15px;
  background: rgba(124,92,255,.10);
  border: 1px solid rgba(124,92,255,.15);
  font-size: 21px;
}

.page-heading h1 {
  margin: 0;
  font-size: 27px;
}

.page-heading p {
  margin: 5px 0 0;
  color: var(--hexa-muted);
  font-size: 11px;
}

.heading-action {
  margin-left: auto;
}

.coming-card {
  min-height: 300px;
  border: 1px solid var(--hexa-border);
  border-radius: 20px;
  display: grid;
  place-content: center;
  text-align: center;
  background: var(--hexa-panel);
}

.coming-card > div {
  margin: 0 auto 15px;
  width: 50px;
  height: 50px;
  display: grid;
  place-items: center;
  border-radius: 15px;
  background: rgba(124,92,255,.10);
}

.coming-card h2 {
  margin: 0;
}

.coming-card p {
  color: var(--hexa-muted);
  font-size: 11px;
}

function WorkspacePlaceholder({ title, description, icon, children }) { return <section className="workspace-page"><div className="page-heading"><div className="page-heading-icon">{icon}</div><div><h1>{title}</h1><p>{description}</p></div></div>{children||<div className="coming-card"><div>✦</div><h2>{title}</h2><p>This HEXA workspace is ready for connected Supabase features.</p></div>}</section>; }

/* ============================================================
   STATUS
   ============================================================ */

.status-row {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  padding-bottom: 10px;
}

.create-status-card,
.status-card {
  min-width: 170px;
  height: 245px;
  border-radius: 20px;
  border: 1px solid var(--hexa-border);
  background: var(--hexa-panel);
  color: white;
  padding: 16px;
  text-align: left;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}

.create-status-card:hover,
.status-card:hover {
  border-color: rgba(124,92,255,.35);
}

.create-status-plus {
  width: 48px;
  height: 48px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: rgba(124,92,255,.14);
  color: var(--hexa-accent-2);
  font-size: 24px;
  margin-bottom: auto;
}

.create-status-card strong,
.status-card strong {
  font-size: 12px;
}

.create-status-card span,
.status-card span {
  color: var(--hexa-muted);
  font-size: 9px;
  margin-top: 5px;
}

.status-preview {
  flex: 1;
  margin: -4px -4px 15px;
  border-radius: 14px;
  background:
    radial-gradient(
      circle at 30% 20%,
      rgba(124,92,255,.28),
      transparent 45%
    ),
    #171d29;
  display: grid;
  place-items: center;
  font-size: 25px;
  font-weight: 900;
  color: #d9d0ff;
}

/* ============================================================
   MODAL
   ============================================================ */

.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgba(0,0,0,.7);
  backdrop-filter: blur(10px);
}

.status-modal {
  width: min(100%, 520px);
  max-height: 90vh;
  overflow: auto;
  background: #0e131c;
  border: 1px solid var(--hexa-border-strong);
  border-radius: 22px;
  padding: 20px;
  box-shadow: var(--hexa-shadow);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 18px;
}

.modal-header h2 {
  margin: 0;
}

.modal-header button {
  border: 0;
  background: transparent;
  color: #8b95a4;
  font-size: 24px;
}

.status-modal textarea {
  width: 100%;
  min-height: 130px;
  resize: vertical;
  border: 1px solid var(--hexa-border);
  background: #090d13;
  color: white;
  border-radius: 13px;
  padding: 14px;
  outline: none;
  margin-bottom: 13px;
}

.file-drop {
  min-height: 120px;
  border: 1px dashed rgba(124,92,255,.4);
  background: rgba(124,92,255,.04);
  border-radius: 15px;
  display: grid;
  place-content: center;
  text-align: center;
  cursor: pointer;
  margin-bottom: 13px;
}

.file-drop span {
  font-size: 25px;
}

.file-drop strong {
  font-size: 12px;
}

.file-drop small {
  color: var(--hexa-muted);
  margin-top: 5px;
}

.file-drop input {
  display: none;
}

.selected-file {
  padding: 10px;
  border: 1px solid var(--hexa-border);
  border-radius: 10px;
  color: var(--hexa-muted);
  font-size: 10px;
  margin-bottom: 12px;
}

/* ============================================================
   SEARCH
   ============================================================ */

.global-search-panel {
  position: absolute;
  top: 8px;
  left: 50%;
  transform: translateX(-50%);
  width: min(650px, calc(100% - 30px));
  z-index: 30;
  background: #111722;
  border: 1px solid var(--hexa-border-strong);
  border-radius: 17px;
  box-shadow: var(--hexa-shadow);
  overflow: hidden;
}

.search-panel-header {
  padding: 13px 15px;
  display: flex;
  gap: 10px;
  align-items: center;
  border-bottom: 1px solid var(--hexa-border);
  font-size: 12px;
}

.search-empty {
  padding: 40px 20px;
  text-align: center;
}

.search-empty > div {
  font-size: 30px;
  color: var(--hexa-accent-2);
}

.search-empty h3 {
  margin: 12px 0 6px;
  font-size: 14px;
}

.search-empty p {
  margin: 0;
  color: var(--hexa-muted);
  font-size: 10px;
}

/* ============================================================
   LOADING
   ============================================================ */

.hexa-loading-screen,
.hexa-error-screen {
  min-height: 100vh;
  min-height: 100dvh;
  display: grid;
  place-content: center;
  justify-items: center;
  gap: 12px;
  background: #07090d;
  color: white;
  text-align: center;
  padding: 25px;
}

.loading-logo {
  width: 64px;
  height: 64px;
  border-radius: 19px;
  font-size: 26px;
}

.loading-spinner {
  width: 23px;
  height: 23px;
  border: 2px solid rgba(255,255,255,.12);
  border-top-color: var(--hexa-accent);
  border-radius: 50%;
  animation: hexa-spin .8s linear infinite;
}

.hexa-loading-screen span,
.hexa-error-screen p {
  color: var(--hexa-muted);
  font-size: 11px;
}

.hexa-error-screen h1 {
  margin: 0;
}

@keyframes hexa-spin {
  to {
    transform: rotate(360deg);
  }
}

/* ============================================================
   MOBILE
   ============================================================ */

.mobile-menu-button {
  display: none;
}

.sidebar-overlay {
  display: none;
}

@media (max-width: 1000px) {
  .feature-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .hero-orbit {
    width: 180px;
    height: 180px;
  }

  .ring-b {
    width: 170px;
    height: 170px;
  }
}

@media (max-width: 760px) {
  .hexa-sidebar {
    position: fixed;
    z-index: 90;
    left: 0;
    top: 0;
    bottom: 0;
    transform: translateX(-105%);
    transition: transform .2s ease;
    box-shadow: 30px 0 80px rgba(0,0,0,.4);
  }

  .hexa-sidebar.mobile-open {
    transform: translateX(0);
  }

  .sidebar-overlay {
    display: block;
    position: fixed;
    inset: 0;
    z-index: 80;
    background: rgba(0,0,0,.6);
  }

  .mobile-menu-button {
    display: grid;
    place-items: center;
    position: fixed;
    z-index: 70;
    top: 14px;
    left: 12px;
    width: 39px;
    height: 39px;
    border-radius: 11px;
    border: 1px solid var(--hexa-border);
    background: rgba(9,12,17,.9);
    color: white;
  }

  .mobile-close {
    display: block;
  }

  .mobile-page-title {
    display: block;
    margin-left: 52px;
    font-size: 13px;
    letter-spacing: .12em;
  }

  .hexa-topbar {
    padding: 0 12px;
    gap: 8px;
  }

  .topbar-search {
    max-width: none;
  }

  .topbar-search kbd {
    display: none;
  }

  .topbar-actions {
    display: none;
  }

  .workspace-page {
    padding: 18px 14px;
  }

  .hero-panel {
    padding: 25px;
    min-height: 340px;
  }

  .hero-orbit {
    display: none;
  }

  .hero-panel h1 {
    font-size: 34px;
  }

  .feature-grid {
    grid-template-columns: 1fr 1fr;
  }

  .chat-layout {
    grid-template-columns: 1fr;
  }

  .chat-list-panel {
    display: none;
  }

  .chat-header {
    padding-left: 15px;
  }

  .messages-area {
    padding: 14px;
  }

  .message-bubble {
    max-width: 84%;
  }

  .page-heading {
    align-items: flex-start;
    flex-wrap: wrap;
  }

  .heading-action {
    width: 100%;
    margin-left: 0;
  }
}

@media (max-width: 520px) {
  .hexa-auth-page {
    padding: 12px;
  }

  .hexa-auth-card {
    padding: 26px 19px;
    border-radius: 21px;
  }

  .auth-heading h1 {
    font-size: 25px;
  }

  .feature-grid {
    grid-template-columns: 1fr;
  }

  .hero-panel {
    padding: 22px;
  }

  .hero-actions {
    flex-direction: column;
  }

  .hero-primary,
  .hero-secondary {
    width: 100%;
  }

  .chat-header-actions button:nth-child(2) {
    display: none;
  }

  .composer-action {
    display: none !important;
  }

  .message-composer {
    padding: 8px;
  }

  .message-composer > button:first-child {
    display: none;
  }

  .status-row {
    margin-right: -14px;
  }
}


.call-shell{width:min(920px,96vw);height:min(760px,92vh);display:flex;flex-direction:column;background:var(--hexa-panel);border:1px solid var(--hexa-border-strong);border-radius:22px;overflow:hidden;box-shadow:var(--hexa-shadow)}.call-header{display:flex;justify-content:space-between;align-items:center;padding:16px 18px;border-bottom:1px solid var(--hexa-border)}.call-header span{color:var(--hexa-muted);font-size:11px}.call-video-grid{position:relative;flex:1;background:#050507;display:grid;place-items:center}.call-remote-video{width:100%;height:100%;object-fit:contain;background:#050507}.call-local-video{position:absolute;right:18px;bottom:18px;width:min(230px,30%);aspect-ratio:16/10;object-fit:cover;border-radius:14px;border:2px solid rgba(255,255,255,.25);background:#111}.call-audio-stage{flex:1;display:grid;place-items:center;text-align:center}.call-avatar{margin-bottom:12px}.call-controls{padding:16px;display:flex;justify-content:center;border-top:1px solid var(--hexa-border)}.danger-button{padding:12px 24px;border-radius:999px;background:var(--hexa-danger);color:#fff;font-weight:800}.call-error{margin:0;padding:0 18px 10px;color:var(--hexa-danger);font-size:11px;text-align:center}
/* HEXA feature extensions */
.notifications-panel{position:absolute;right:22px;top:72px;width:min(390px,calc(100vw - 28px));background:var(--hexa-panel);border:1px solid var(--hexa-border-strong);border-radius:18px;box-shadow:var(--hexa-shadow);z-index:100;padding:10px}.notifications-header{display:flex;justify-content:space-between;align-items:center;padding:12px 10px;border-bottom:1px solid var(--hexa-border)}.notifications-header button{background:none;border:0;color:var(--hexa-accent-2)}.notification-item{display:flex;gap:12px;padding:14px 10px;border-bottom:1px solid var(--hexa-border)}.notification-item>span{color:var(--hexa-accent)}.notification-item p{margin:4px 0;color:var(--hexa-muted)}.notification-item small{color:var(--hexa-muted)}.notification-empty{padding:28px;text-align:center;color:var(--hexa-muted)}.notification-button{position:relative}.notification-button b{position:absolute;right:0;top:-5px;min-width:17px;height:17px;padding:0 4px;border-radius:99px;background:var(--hexa-danger);font-size:9px;display:grid;place-items:center;color:#fff}.entity-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:14px}.entity-card{padding:20px;border:1px solid var(--hexa-border);background:var(--hexa-panel);border-radius:18px;display:flex;flex-direction:column;gap:9px}.entity-card span,.entity-card small{color:var(--hexa-muted)}.entity-modal,.status-modal{width:min(620px,calc(100vw - 28px));max-height:90vh;overflow:auto;background:var(--hexa-panel);border:1px solid var(--hexa-border-strong);border-radius:22px;padding:22px;box-shadow:var(--hexa-shadow)}.modal-input{width:100%;margin:8px 0;padding:13px 14px;border-radius:12px;border:1px solid var(--hexa-border);background:rgba(255,255,255,.035);color:var(--hexa-text);outline:none}.modal-textarea{min-height:90px;resize:vertical}.media-picker{width:100%;display:flex;align-items:center;gap:14px;text-align:left;padding:12px;border:1px dashed var(--hexa-border-strong);border-radius:14px;background:transparent;color:var(--hexa-text);margin:8px 0 14px}.media-picker img{width:52px;height:52px;border-radius:12px;object-fit:cover}.media-picker span{width:52px;height:52px;border-radius:12px;display:grid;place-items:center;background:var(--hexa-panel-3);font-size:25px}.media-picker small{display:block;color:var(--hexa-muted);margin-top:3px}.member-picker{display:grid;gap:7px;max-height:180px;overflow:auto;margin-bottom:16px}.member-option{display:flex;align-items:center;gap:9px;padding:7px;border-radius:10px}.member-option:hover{background:rgba(255,255,255,.04)}.status-composer-tabs{display:flex;gap:8px;margin-bottom:10px}.status-composer-tabs button{flex:1;padding:11px;border:1px solid var(--hexa-border);background:var(--hexa-panel-2);color:var(--hexa-text);border-radius:11px}.status-media-preview img,.status-media-preview video{width:100%;max-height:300px;object-fit:contain;border-radius:14px;margin:8px 0}.privacy-row{display:flex;align-items:center;justify-content:space-between;margin:12px 0;color:var(--hexa-muted)}.privacy-row select{background:var(--hexa-panel-2);color:var(--hexa-text);border:1px solid var(--hexa-border);padding:9px;border-radius:10px}.status-card.unseen .status-preview{box-shadow:0 0 0 3px var(--hexa-accent)}.status-card.seen{opacity:.8}.status-preview img,.status-preview video{width:100%;height:100%;object-fit:cover;border-radius:inherit}.story-viewer{position:fixed;inset:0;background:rgba(0,0,0,.92);z-index:500;display:grid;place-items:center;padding:20px}.story-content{width:min(520px,100%);height:min(88vh,820px);position:relative;background:#000;border-radius:20px;overflow:hidden;display:flex;align-items:center;justify-content:center}.story-content img,.story-content video{width:100%;height:100%;object-fit:contain}.story-text{font-size:34px;font-weight:800;text-align:center;padding:30px}.story-caption{position:absolute;left:18px;right:18px;bottom:58px;padding:10px;border-radius:10px;background:rgba(0,0,0,.45)}.story-actions{position:absolute;bottom:10px;right:12px;display:flex;gap:6px}.story-actions button,.story-close{border:0;background:rgba(255,255,255,.12);color:#fff;border-radius:50%;width:38px;height:38px}.story-close{position:absolute;right:22px;top:20px;z-index:2;font-size:25px}.story-progress{position:absolute;top:12px;left:20px;right:20px;height:3px;background:rgba(255,255,255,.35);z-index:2}.search-results{display:grid;gap:6px;padding:8px}.search-person{display:flex;align-items:center;gap:12px;padding:10px;border:0;background:transparent;color:var(--hexa-text);text-align:left;border-radius:12px}.search-person:hover{background:rgba(255,255,255,.05)}.search-person div{flex:1}.search-person span{display:block;color:var(--hexa-muted);font-size:12px}.search-person b{font-size:12px;color:var(--hexa-accent-2)}.settings-grid{display:grid;gap:12px;max-width:760px}.settings-card{display:flex;align-items:center;gap:16px;justify-content:space-between;padding:18px;border:1px solid var(--hexa-border);background:var(--hexa-panel);border-radius:18px}.settings-card>div:first-child{flex:1}.settings-card p{color:var(--hexa-muted);margin:5px 0 0}.settings-card button{border:1px solid var(--hexa-border);background:var(--hexa-panel-2);color:var(--hexa-text);padding:10px 14px;border-radius:10px}.settings-card.danger button{color:#fff;background:var(--hexa-danger);border-color:transparent}
.reply-bar{display:flex;justify-content:space-between;gap:12px;align-items:center;padding:8px 14px;background:var(--hexa-panel-2);border-top:1px solid var(--hexa-border);font-size:12px;color:var(--hexa-muted)}.reply-bar button{border:0;background:none;color:var(--hexa-text)}.message-bubble-wrap{position:relative;max-width:86%}.message-tools{display:none;position:absolute;right:0;top:-34px;background:var(--hexa-panel);border:1px solid var(--hexa-border);border-radius:10px;padding:3px;z-index:4}.message-bubble-wrap:hover .message-tools{display:flex}.message-tools button{border:0;background:none;color:var(--hexa-text);padding:5px}.reaction-picker{position:absolute;bottom:32px;right:0;display:flex;background:var(--hexa-panel);border:1px solid var(--hexa-border);border-radius:14px;padding:5px;box-shadow:var(--hexa-shadow)}.reaction-summary{font-size:12px;background:var(--hexa-panel-2);border-radius:10px;padding:3px 7px;display:inline-block;margin-top:3px}.message-media{display:block;max-width:280px;max-height:340px;border-radius:12px;object-fit:contain}.gif-panel{position:absolute;left:14px;right:14px;bottom:76px;background:var(--hexa-panel);border:1px solid var(--hexa-border-strong);border-radius:16px;padding:10px;z-index:30;box-shadow:var(--hexa-shadow)}.gif-search{display:flex;gap:7px}.gif-search input{flex:1}.gif-grid{display:grid;grid-template-columns:repeat(6,1fr);gap:6px;max-height:240px;overflow:auto;margin-top:8px}.gif-grid button{padding:0;border:0;background:none}.gif-grid img{width:100%;height:70px;object-fit:cover;border-radius:7px}.muted{color:var(--hexa-muted)}

`;
