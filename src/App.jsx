import React, { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";

/* =========================================================
   HEXA — COMPLETE SINGLE FILE APP
   No App.css required.
   ========================================================= */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const supabase =
  SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          flowType: "pkce",
        },
      })
    : null;

/* =========================================================
   DATA
   ========================================================= */

const DEFAULT_USER = {
  display_name: "HEXA User",
  username: "hexa_user",
  avatar_url: "",
};

const ACCENTS = {
  Violet: "#7c5cff",
  Blue: "#3b82f6",
  Cyan: "#06b6d4",
  Green: "#22c55e",
  Orange: "#f97316",
  Pink: "#ec4899",
};

const NAV = [
  ["nexus", "⌂", "Nexus"],
  ["chat", "◌", "Chat"],
  ["groups", "◎", "Groups"],
  ["communities", "◈", "Communities"],
  ["status", "◉", "Status"],
  ["notes", "✎", "Notes"],
  ["documents", "▤", "Documents"],
  ["projects", "◆", "Projects"],
  ["kora", "✦", "Kora AI"],
  ["developer", "</>", "Developer Hub"],
];

const sampleChats = [
  {
    id: "hexagroup",
    name: "THE HEXA GROUP",
    members: 3,
    type: "group",
    avatar: "H",
    messages: [
      {
        id: 1,
        sender: "Kora",
        text: "Welcome to HEXA. Your workspace is ready.",
        time: "Now",
      },
    ],
  },
];

const FEED_TYPES = [
  {
    name: "For You",
    description: "Personalized updates from your HEXA network.",
    icon: "✦",
  },
  {
    name: "Following",
    description: "Posts and Status updates from people you follow.",
    icon: "♡",
  },
  {
    name: "Trending",
    description: "What's getting attention across HEXA.",
    icon: "↗",
  },
  {
    name: "Latest",
    description: "Fresh posts in chronological order.",
    icon: "◷",
  },
  {
    name: "Communities",
    description: "Content from communities you belong to.",
    icon: "◈",
  },
  {
    name: "Projects",
    description: "Updates from projects and collaborators.",
    icon: "◆",
  },
];

/* =========================================================
   HELPERS
   ========================================================= */

function initials(name = "HEXA") {
  return name
    .split(" ")
    .map((x) => x[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function Avatar({ user, size = 42 }) {
  const name = user?.display_name || user?.name || "HEXA";

  return user?.avatar_url ? (
    <img
      src={user.avatar_url}
      alt=""
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        objectFit: "cover",
        border: "1px solid var(--border)",
      }}
    />
  ) : (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        display: "grid",
        placeItems: "center",
        background:
          "linear-gradient(135deg,var(--accent),#111827)",
        color: "white",
        fontWeight: 900,
        fontSize: size * 0.34,
        border: "1px solid var(--border)",
        flexShrink: 0,
      }}
    >
      {initials(name)}
    </div>
  );
}

function Button({
  children,
  onClick,
  variant = "secondary",
  disabled = false,
  style = {},
}) {
  const variants = {
    primary: {
      background: "var(--accent)",
      color: "white",
      border: "none",
    },
    secondary: {
      background: "var(--panel2)",
      color: "var(--text)",
      border: "1px solid var(--border)",
    },
    ghost: {
      background: "transparent",
      color: "var(--muted)",
      border: "1px solid transparent",
    },
    danger: {
      background: "rgba(239,68,68,.12)",
      color: "#ef4444",
      border: "1px solid rgba(239,68,68,.2)",
    },
  };

  return (
    <button
      disabled={disabled}
      onClick={onClick}
      style={{
        ...variants[variant],
        padding: "10px 14px",
        borderRadius: 12,
        cursor: disabled ? "not-allowed" : "pointer",
        fontWeight: 750,
        transition: ".18s",
        opacity: disabled ? 0.5 : 1,
        ...style,
      }}
    >
      {children}
    </button>
  );
}

/* =========================================================
   AUTH
   ========================================================= */

function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function google() {
    if (!supabase) {
      setError("Supabase environment variables are missing.");
      return;
    }

    setBusy(true);
    setError("");

    const { error: authError } =
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin,
          queryParams: {
            prompt: "select_account",
          },
        },
      });

    if (authError) {
      setError(authError.message);
      setBusy(false);
    }
  }

  async function submit(e) {
    e.preventDefault();

    if (!supabase) {
      setError(
        "Supabase is not configured. Check your VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY."
      );
      return;
    }

    setBusy(true);
    setError("");

    try {
      if (mode === "login") {
        const { error: authError } =
          await supabase.auth.signInWithPassword({
            email,
            password,
          });

        if (authError) throw authError;
      } else {
        const { data, error: authError } =
          await supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo: window.location.origin,
              data: {
                display_name:
                  displayName || email.split("@")[0],
                username:
                  username ||
                  email
                    .split("@")[0]
                    .replace(/[^a-zA-Z0-9_]/g, ""),
              },
            },
          });

        if (authError) throw authError;

        if (!data.session) {
          setError(
            "Account created. Check your email if email confirmation is enabled."
          );
        }
      }
    } catch (err) {
      setError(err.message || "Authentication failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at 15% 10%,rgba(124,92,255,.2),transparent 30%),var(--bg)",
        display: "grid",
        placeItems: "center",
        padding: 24,
        color: "var(--text)",
      }}
    >
      <div
        style={{
          width: "min(460px,100%)",
          background: "rgba(18,21,31,.88)",
          border: "1px solid var(--border)",
          borderRadius: 28,
          padding: 32,
          boxShadow: "0 30px 100px rgba(0,0,0,.4)",
        }}
      >
        <div style={{ marginBottom: 28 }}>
          <div
            style={{
              fontSize: 38,
              fontWeight: 950,
              letterSpacing: -2,
            }}
          >
            HEXA
          </div>

          <div style={{ color: "var(--muted)", marginTop: 6 }}>
            Your digital workspace.
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 6,
            background: "var(--panel2)",
            padding: 5,
            borderRadius: 14,
            marginBottom: 22,
          }}
        >
          <button
            onClick={() => setMode("login")}
            style={{
              border: 0,
              borderRadius: 10,
              padding: 11,
              cursor: "pointer",
              background:
                mode === "login"
                  ? "var(--panel)"
                  : "transparent",
              color: "var(--text)",
              fontWeight: 800,
            }}
          >
            Sign in
          </button>

          <button
            onClick={() => setMode("signup")}
            style={{
              border: 0,
              borderRadius: 10,
              padding: 11,
              cursor: "pointer",
              background:
                mode === "signup"
                  ? "var(--panel)"
                  : "transparent",
              color: "var(--text)",
              fontWeight: 800,
            }}
          >
            Create account
          </button>
        </div>

        <form onSubmit={submit}>
          {mode === "signup" && (
            <>
              <Field
                label="Display name"
                value={displayName}
                onChange={setDisplayName}
                placeholder="Your name"
              />

              <Field
                label="Username"
                value={username}
                onChange={setUsername}
                placeholder="username"
              />
            </>
          )}

          <Field
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="you@example.com"
          />

          <Field
            label="Password"
            type="password"
            value={password}
            onChange={setPassword}
            placeholder="••••••••"
          />

          {error && (
            <div
              style={{
                background: "rgba(239,68,68,.1)",
                color: "#fca5a5",
                border: "1px solid rgba(239,68,68,.2)",
                padding: 12,
                borderRadius: 12,
                marginBottom: 14,
                fontSize: 13,
              }}
            >
              {error}
            </div>
          )}

          <Button
            variant="primary"
            disabled={busy}
            style={{ width: "100%", marginBottom: 12 }}
          >
            {busy
              ? "Working..."
              : mode === "login"
              ? "Enter HEXA"
              : "Create HEXA account"}
          </Button>
        </form>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            margin: "10px 0 14px",
            color: "var(--muted)",
            fontSize: 12,
          }}
        >
          <span style={{ height: 1, flex: 1, background: "var(--border)" }} />
          OR
          <span style={{ height: 1, flex: 1, background: "var(--border)" }} />
        </div>

        <Button
          onClick={google}
          disabled={busy}
          style={{ width: "100%" }}
        >
          G&nbsp;&nbsp; Continue with Google
        </Button>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}) {
  return (
    <label
      style={{
        display: "block",
        marginBottom: 14,
      }}
    >
      <div
        style={{
          fontSize: 12,
          color: "var(--muted)",
          marginBottom: 7,
          fontWeight: 700,
        }}
      >
        {label}
      </div>

      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: "100%",
          boxSizing: "border-box",
          background: "var(--panel2)",
          color: "var(--text)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: "12px 13px",
          outline: "none",
        }}
      />
    </label>
  );
}

/* =========================================================
   APP
   ========================================================= */

export default function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(DEFAULT_USER);
  const [loading, setLoading] = useState(true);

  const [page, setPage] = useState("nexus");
  const [theme, setTheme] = useState("dark");
  const [accent, setAccent] = useState("Violet");

  const [toast, setToast] = useState("");

  useEffect(() => {
    document.body.style.margin = "0";

    const savedTheme =
      localStorage.getItem("hexa-theme") || "dark";
    const savedAccent =
      localStorage.getItem("hexa-accent") || "Violet";

    setTheme(savedTheme);
    setAccent(savedAccent);

    if (!supabase) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);

      if (data.session?.user) {
        setProfileFromUser(data.session.user);
      }

      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      async (_event, nextSession) => {
        setSession(nextSession);

        if (nextSession?.user) {
          setProfileFromUser(nextSession.user);
        } else {
          setProfile(DEFAULT_USER);
        }

        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    localStorage.setItem("hexa-theme", theme);
    localStorage.setItem("hexa-accent", accent);
  }, [theme, accent]);

  function setProfileFromUser(user) {
    const metadata = user.user_metadata || {};

    setProfile({
      display_name:
        metadata.display_name ||
        metadata.full_name ||
        metadata.name ||
        user.email?.split("@")[0] ||
        "HEXA User",

      username:
        metadata.username ||
        user.email?.split("@")[0] ||
        "hexa_user",

      avatar_url:
        metadata.avatar_url ||
        metadata.picture ||
        "",
    });
  }

  async function logout() {
    if (supabase) await supabase.auth.signOut();
    setSession(null);
  }

  function notify(text) {
    setToast(text);
    setTimeout(() => setToast(""), 2400);
  }

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#080a0f",
          color: "white",
          fontSize: 40,
          fontWeight: 950,
        }}
      >
        HEXA
      </div>
    );
  }

  if (!session) {
    return (
      <ThemeRoot theme={theme} accent={accent}>
        <AuthScreen />
      </ThemeRoot>
    );
  }

  return (
    <ThemeRoot theme={theme} accent={accent}>
      <div
        style={{
          minHeight: "100vh",
          background: "var(--bg)",
          color: "var(--text)",
          display: "flex",
          fontFamily:
            "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
        }}
      >
        <Sidebar
          page={page}
          setPage={setPage}
          profile={profile}
          onCreate={(x) => {
            setPage(x);
            notify(`Opening ${x}`);
          }}
        />

        <main
          style={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Topbar
            page={page}
            profile={profile}
            onSearch={() => notify("Global search opened")}
            onProfile={() => setPage("profile")}
          />

          <div
            style={{
              padding: "26px clamp(18px,4vw,50px)",
              maxWidth: 1500,
              width: "100%",
              boxSizing: "border-box",
              margin: "0 auto",
            }}
          >
            <PageRenderer
              page={page}
              profile={profile}
              setPage={setPage}
              notify={notify}
              theme={theme}
              setTheme={setTheme}
              accent={accent}
              setAccent={setAccent}
              logout={logout}
            />
          </div>
        </main>

        {toast && (
          <div
            style={{
              position: "fixed",
              right: 24,
              bottom: 24,
              padding: "13px 17px",
              borderRadius: 14,
              background: "var(--panel)",
              border: "1px solid var(--border)",
              boxShadow: "0 20px 50px rgba(0,0,0,.3)",
              zIndex: 100,
              fontWeight: 700,
            }}
          >
            {toast}
          </div>
        )}
      </div>
    </ThemeRoot>
  );
}

/* =========================================================
   THEME
   ========================================================= */

function ThemeRoot({ children, theme, accent }) {
  const white = theme === "white";

  return (
    <div
      style={{
        "--bg": white ? "#f4f6fa" : "#07090d",
        "--panel": white ? "#ffffff" : "#10131a",
        "--panel2": white ? "#eef1f6" : "#151922",
        "--border": white
          ? "rgba(15,23,42,.1)"
          : "rgba(255,255,255,.08)",
        "--text": white ? "#111827" : "#f8fafc",
        "--muted": white ? "#64748b" : "#8993a6",
        "--accent": ACCENTS[accent] || ACCENTS.Violet,
        minHeight: "100vh",
      }}
    >
      {children}
    </div>
  );
}

/* =========================================================
   SIDEBAR
   ========================================================= */

function Sidebar({ page, setPage, profile, onCreate }) {
  return (
    <aside
      style={{
        width: 250,
        borderRight: "1px solid var(--border)",
        background: "var(--panel)",
        minHeight: "100vh",
        padding: 18,
        boxSizing: "border-box",
        position: "sticky",
        top: 0,
        height: "100vh",
        overflowY: "auto",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 28,
          padding: "8px 6px",
        }}
      >
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 12,
            display: "grid",
            placeItems: "center",
            background: "var(--accent)",
            color: "white",
            fontWeight: 950,
          }}
        >
          H
        </div>

        <div>
          <div style={{ fontWeight: 950, letterSpacing: -0.5 }}>
            HEXA
          </div>
          <div
            style={{
              color: "var(--muted)",
              fontSize: 10,
              letterSpacing: 1.5,
            }}
          >
            NEXUS
          </div>
        </div>
      </div>

      <div
        style={{
          color: "var(--muted)",
          fontSize: 10,
          fontWeight: 900,
          letterSpacing: 1.5,
          padding: "0 9px",
          marginBottom: 8,
        }}
      >
        WORKSPACE
      </div>

      {NAV.map(([id, icon, label]) => (
        <button
          key={id}
          onClick={() => setPage(id)}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "11px 12px",
            marginBottom: 3,
            borderRadius: 12,
            border: 0,
            cursor: "pointer",
            background:
              page === id
                ? "color-mix(in srgb, var(--accent) 15%, transparent)"
                : "transparent",
            color:
              page === id ? "var(--text)" : "var(--muted)",
            fontWeight: page === id ? 850 : 650,
            textAlign: "left",
          }}
        >
          <span
            style={{
              width: 22,
              textAlign: "center",
              color:
                page === id ? "var(--accent)" : "inherit",
              fontSize: 17,
            }}
          >
            {icon}
          </span>
          {label}
        </button>
      ))}

      <div
        style={{
          height: 1,
          background: "var(--border)",
          margin: "20px 4px",
        }}
      />

      <div
        style={{
          color: "var(--muted)",
          fontSize: 10,
          fontWeight: 900,
          letterSpacing: 1.5,
          padding: "0 9px",
          marginBottom: 8,
        }}
      >
        CREATE
      </div>

      <CreateButton
        icon="+"
        label="New Project"
        onClick={() => onCreate("projects")}
      />

      <CreateButton
        icon="+"
        label="New Community"
        onClick={() => onCreate("communities")}
      />

      <CreateButton
        icon="+"
        label="New Chat"
        onClick={() => onCreate("chat")}
      />

      <CreateButton
        icon="+"
        label="New Status"
        onClick={() => onCreate("status")}
      />

      <div
        style={{
          height: 1,
          background: "var(--border)",
          margin: "20px 4px",
        }}
      />

      <div
        style={{
          color: "var(--muted)",
          fontSize: 10,
          fontWeight: 900,
          letterSpacing: 1.5,
          padding: "0 9px",
          marginBottom: 8,
        }}
      >
        ACCOUNT
      </div>

      <button
        onClick={() => setPage("profile")}
        style={{
          width: "100%",
          border: 0,
          background: "transparent",
          color: "var(--text)",
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: 9,
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <Avatar user={profile} size={34} />

        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontWeight: 800,
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {profile.display_name}
          </div>

          <div
            style={{
              color: "var(--muted)",
              fontSize: 11,
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            @{profile.username}
          </div>
        </div>
      </button>

      <button
        onClick={() => setPage("settings")}
        style={{
          width: "100%",
          marginTop: 6,
          padding: 11,
          border: 0,
          background: "transparent",
          color: "var(--muted)",
          textAlign: "left",
          cursor: "pointer",
          borderRadius: 10,
        }}
      >
        ⚙ Settings
      </button>
    </aside>
  );
}

function CreateButton({ icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 11,
        padding: "9px 12px",
        border: 0,
        background: "transparent",
        color: "var(--muted)",
        cursor: "pointer",
        textAlign: "left",
        borderRadius: 10,
      }}
    >
      <span style={{ color: "var(--accent)", fontWeight: 900 }}>
        {icon}
      </span>
      {label}
    </button>
  );
}

/* =========================================================
   TOPBAR
   ========================================================= */

function Topbar({ page, profile, onSearch, onProfile }) {
  const label =
    NAV.find((item) => item[0] === page)?.[2] ||
    (page === "settings" ? "Settings" : "Profile");

  return (
    <header
      style={{
        height: 72,
        borderBottom: "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 clamp(18px,4vw,50px)",
        background: "var(--panel)",
        position: "sticky",
        top: 0,
        zIndex: 20,
      }}
    >
      <div>
        <div style={{ fontSize: 20, fontWeight: 900 }}>
          {label}
        </div>

        <div
          style={{
            fontSize: 11,
            color: "var(--muted)",
            marginTop: 2,
          }}
        >
          HEXA workspace
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <button
          onClick={onSearch}
          style={{
            width: 220,
            background: "var(--panel2)",
            color: "var(--muted)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: "10px 13px",
            textAlign: "left",
            cursor: "pointer",
          }}
        >
          ⌕ Search HEXA...
        </button>

        <button
          onClick={onProfile}
          style={{
            border: 0,
            background: "transparent",
            cursor: "pointer",
          }}
        >
          <Avatar user={profile} size={38} />
        </button>
      </div>
    </header>
  );
}

/* =========================================================
   PAGE ROUTER
   ========================================================= */

function PageRenderer({
  page,
  profile,
  setPage,
  notify,
  theme,
  setTheme,
  accent,
  setAccent,
  logout,
}) {
  const common = { profile, setPage, notify };

  switch (page) {
    case "nexus":
      return <Nexus {...common} />;
    case "chat":
      return <Chat {...common} />;
    case "groups":
      return <Groups {...common} />;
    case "communities":
      return <Communities {...common} />;
    case "status":
      return <Status {...common} />;
    case "notes":
      return <Notes {...common} />;
    case "documents":
      return <Documents {...common} />;
    case "projects":
      return <Projects {...common} />;
    case "kora":
      return <Kora {...common} />;
    case "developer":
      return <DeveloperHub {...common} />;
    case "profile":
      return <Profile profile={profile} notify={notify} />;
    case "settings":
      return (
        <Settings
          theme={theme}
          setTheme={setTheme}
          accent={accent}
          setAccent={setAccent}
          logout={logout}
          notify={notify}
        />
      );
    default:
      return <Nexus {...common} />;
  }
}

/* =========================================================
   NEXUS
   ========================================================= */

function Nexus({ profile, setPage, notify }) {
  return (
    <div>
      <section
        style={{
          background:
            "linear-gradient(135deg,color-mix(in srgb,var(--accent) 20%,var(--panel)),var(--panel))",
          border: "1px solid var(--border)",
          borderRadius: 24,
          padding: "34px",
          marginBottom: 22,
        }}
      >
        <div
          style={{
            color: "var(--accent)",
            fontSize: 11,
            fontWeight: 900,
            letterSpacing: 2,
          }}
        >
          PERSONAL WORKSPACE
        </div>

        <h1
          style={{
            fontSize: "clamp(30px,5vw,54px)",
            letterSpacing: -3,
            margin: "10px 0",
          }}
        >
          Welcome back, {profile.display_name}.
        </h1>

        <p style={{ color: "var(--muted)", maxWidth: 650 }}>
          One workspace for conversations, Status, documents,
          projects, notes, communities and development.
        </p>

        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            marginTop: 22,
          }}
        >
          <Button
            variant="primary"
            onClick={() => setPage("chat")}
          >
            Open Chat
          </Button>

          <Button onClick={() => setPage("status")}>
            Create Status
          </Button>

          <Button onClick={() => setPage("documents")}>
            New Document
          </Button>
        </div>
      </section>

      <SectionTitle
        title="Everything in one place"
        action={
          <Button onClick={() => notify("Workspace refreshed")}>
            Refresh
          </Button>
        }
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit,minmax(220px,1fr))",
          gap: 14,
        }}
      >
        <FeatureCard
          icon="◌"
          title="Messages"
          text="Private conversations, groups and calls."
          onClick={() => setPage("chat")}
        />

        <FeatureCard
          icon="◉"
          title="Status"
          text="Share and discover short-form updates."
          onClick={() => setPage("status")}
        />

        <FeatureCard
          icon="✎"
          title="Notes"
          text="Capture ideas without leaving HEXA."
          onClick={() => setPage("notes")}
        />

        <FeatureCard
          icon="▤"
          title="Documents"
          text="Build and organize your documents."
          onClick={() => setPage("documents")}
        />

        <FeatureCard
          icon="◆"
          title="Projects"
          text="Plan and build projects."
          onClick={() => setPage("projects")}
        />

        <FeatureCard
          icon="✦"
          title="Kora AI"
          text="Your HEXA AI workspace assistant."
          onClick={() => setPage("kora")}
        />
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, text, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: "var(--panel)",
        color: "var(--text)",
        border: "1px solid var(--border)",
        borderRadius: 18,
        padding: 20,
        textAlign: "left",
        cursor: "pointer",
      }}
    >
      <div
        style={{
          width: 42,
          height: 42,
          borderRadius: 13,
          display: "grid",
          placeItems: "center",
          background:
            "color-mix(in srgb,var(--accent) 14%,transparent)",
          color: "var(--accent)",
          fontSize: 20,
          marginBottom: 14,
        }}
      >
        {icon}
      </div>

      <div style={{ fontWeight: 900, fontSize: 16 }}>
        {title}
      </div>

      <div
        style={{
          color: "var(--muted)",
          marginTop: 6,
          lineHeight: 1.5,
          fontSize: 13,
        }}
      >
        {text}
      </div>
    </button>
  );
}

/* =========================================================
   CHAT
   ========================================================= */

function Chat({ notify }) {
  const [selected, setSelected] = useState(sampleChats[0]);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState(
    sampleChats[0].messages
  );

  function send() {
    if (!message.trim()) return;

    setMessages((old) => [
      ...old,
      {
        id: Date.now(),
        sender: "You",
        text: message.trim(),
        time: "Now",
      },
    ]);

    setMessage("");
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns:
          "minmax(230px,280px) minmax(0,1fr)",
        minHeight: "calc(100vh - 125px)",
        border: "1px solid var(--border)",
        borderRadius: 22,
        overflow: "hidden",
        background: "var(--panel)",
      }}
    >
      <div
        style={{
          borderRight: "1px solid var(--border)",
          padding: 14,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <b>Chats</b>

          <Button
            onClick={() => notify("New chat composer opened")}
            style={{ padding: "7px 10px" }}
          >
            +
          </Button>
        </div>

        {sampleChats.map((chat) => (
          <button
            key={chat.id}
            onClick={() => {
              setSelected(chat);
              setMessages(chat.messages);
            }}
            style={{
              width: "100%",
              border: 0,
              background:
                selected.id === chat.id
                  ? "var(--panel2)"
                  : "transparent",
              color: "var(--text)",
              borderRadius: 13,
              padding: 12,
              display: "flex",
              gap: 10,
              textAlign: "left",
              cursor: "pointer",
            }}
          >
            <Avatar user={{ display_name: chat.name }} size={40} />

            <div>
              <div style={{ fontWeight: 800 }}>
                {chat.name}
              </div>

              <div
                style={{
                  fontSize: 11,
                  color: "var(--muted)",
                  marginTop: 3,
                }}
              >
                {chat.members} members
              </div>
            </div>
          </button>
        ))}
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
        }}
      >
        <div
          style={{
            padding: 15,
            borderBottom: "1px solid var(--border)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <b>{selected.name}</b>
            <div
              style={{
                color: "var(--muted)",
                fontSize: 11,
                marginTop: 3,
              }}
            >
              🔒 End-to-end encryption layer
            </div>
          </div>

          <div style={{ display: "flex", gap: 6 }}>
            <Button onClick={() => notify("Voice call UI opened")}>
              ☎
            </Button>

            <Button
              onClick={() => notify("Video call UI opened")}
            >
              ◉
            </Button>

            <Button
              onClick={() => notify("Add people panel opened")}
            >
              + Person
            </Button>
          </div>
        </div>

        <div
          style={{
            flex: 1,
            padding: 22,
            overflowY: "auto",
          }}
        >
          {messages.map((msg) => (
            <div
              key={msg.id}
              style={{
                marginBottom: 14,
                display: "flex",
                justifyContent:
                  msg.sender === "You"
                    ? "flex-end"
                    : "flex-start",
              }}
            >
              <div
                style={{
                  maxWidth: "70%",
                  padding: "11px 14px",
                  borderRadius: 16,
                  background:
                    msg.sender === "You"
                      ? "var(--accent)"
                      : "var(--panel2)",
                  color:
                    msg.sender === "You"
                      ? "white"
                      : "var(--text)",
                }}
              >
                {msg.sender !== "You" && (
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 900,
                      marginBottom: 4,
                      color: "var(--accent)",
                    }}
                  >
                    {msg.sender}
                  </div>
                )}

                <div>{msg.text}</div>

                <div
                  style={{
                    fontSize: 9,
                    opacity: 0.6,
                    marginTop: 5,
                  }}
                >
                  {msg.time}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            padding: 13,
            borderTop: "1px solid var(--border)",
            display: "flex",
            gap: 8,
          }}
        >
          <Button onClick={() => notify("Emoji picker opened")}>
            🙂
          </Button>

          <Button onClick={() => notify("Attachment picker opened")}>
            +
          </Button>

          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") send();
            }}
            placeholder="Message HEXA..."
            style={{
              flex: 1,
              minWidth: 0,
              borderRadius: 13,
              border: "1px solid var(--border)",
              background: "var(--panel2)",
              color: "var(--text)",
              padding: "11px 13px",
              outline: "none",
            }}
          />

          <Button variant="primary" onClick={send}>
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   GROUPS
   ========================================================= */

function Groups({ notify }) {
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div>
      <PageHeader
        title="Groups"
        description="Large conversations for people who need to stay together."
        button={
          <Button
            variant="primary"
            onClick={() => setShowCreate(true)}
          >
            + Create Group
          </Button>
        }
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit,minmax(260px,1fr))",
          gap: 15,
        }}
      >
        <LargeCard
          icon="H"
          title="THE HEXA GROUP"
          description="The default HEXA group."
          meta="Up to 1,000+ members"
          onClick={() => notify("THE HEXA GROUP opened")}
        />
      </div>

      {showCreate && (
        <Modal
          title="Create Group"
          onClose={() => setShowCreate(false)}
        >
          <Field
            label="Group name"
            placeholder="e.g. My Team"
            onChange={() => {}}
          />

          <Button
            variant="primary"
            style={{ width: "100%" }}
            onClick={() => {
              setShowCreate(false);
              notify("Group created");
            }}
          >
            Create group
          </Button>
        </Modal>
      )}
    </div>
  );
}

/* =========================================================
   COMMUNITIES
   ========================================================= */

function Communities({ notify }) {
  const [create, setCreate] = useState(false);

  return (
    <div>
      <PageHeader
        title="Communities"
        description="Organize people around topics, interests and projects."
        button={
          <Button
            variant="primary"
            onClick={() => setCreate(true)}
          >
            + Create Community
          </Button>
        }
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit,minmax(270px,1fr))",
          gap: 15,
        }}
      >
        <LargeCard
          icon="◈"
          title="Discover Communities"
          description="Explore public HEXA communities."
          meta="Find people"
          onClick={() => notify("Community discovery opened")}
        />

        <LargeCard
          icon="◆"
          title="Project Communities"
          description="Connect communities to projects."
          meta="Collaboration"
          onClick={() => notify("Project communities opened")}
        />
      </div>

      {create && (
        <Modal
          title="Create Community"
          onClose={() => setCreate(false)}
        >
          <Field
            label="Community name"
            placeholder="Community name"
            onChange={() => {}}
          />

          <Field
            label="Description"
            placeholder="What is this community about?"
            onChange={() => {}}
          />

          <Button
            variant="primary"
            style={{ width: "100%" }}
            onClick={() => {
              setCreate(false);
              notify("Community created");
            }}
          >
            Create community
          </Button>
        </Modal>
      )}
    </div>
  );
}

/* =========================================================
   STATUS
   ========================================================= */

function Status({ profile, notify }) {
  const [feed, setFeed] = useState("For You");
  const [create, setCreate] = useState(false);
  const [liked, setLiked] = useState(false);
  const [comment, setComment] = useState("");
  const [comments, setComments] = useState([]);

  function postComment() {
    if (!comment.trim()) return;

    setComments((x) => [...x, comment.trim()]);
    setComment("");
  }

  return (
    <div>
      <PageHeader
        title="Status"
        description="A spacious social feed for short-form updates."
        button={
          <Button
            variant="primary"
            onClick={() => setCreate(true)}
          >
            + Create Status
          </Button>
        }
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "minmax(0,1fr) 270px",
          gap: 20,
          alignItems: "start",
        }}
      >
        <div>
          <div
            style={{
              display: "flex",
              gap: 8,
              overflowX: "auto",
              paddingBottom: 10,
              marginBottom: 14,
            }}
          >
            {FEED_TYPES.map((type) => (
              <button
                key={type.name}
                onClick={() => setFeed(type.name)}
                style={{
                  flexShrink: 0,
                  border:
                    feed === type.name
                      ? "1px solid var(--accent)"
                      : "1px solid var(--border)",
                  background:
                    feed === type.name
                      ? "color-mix(in srgb,var(--accent) 12%,transparent)"
                      : "var(--panel)",
                  color: "var(--text)",
                  borderRadius: 13,
                  padding: "10px 14px",
                  cursor: "pointer",
                  fontWeight: 750,
                }}
              >
                {type.icon} {type.name}
              </button>
            ))}
          </div>

          <div
            style={{
              background: "var(--panel)",
              border: "1px solid var(--border)",
              borderRadius: 22,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: 390,
                display: "grid",
                placeItems: "center",
                background:
                  "linear-gradient(145deg,#111827,color-mix(in srgb,var(--accent) 30%,#111827))",
                position: "relative",
              }}
            >
              <div
                style={{
                  textAlign: "center",
                  padding: 20,
                }}
              >
                <div
                  style={{
                    fontSize: 70,
                    marginBottom: 10,
                  }}
                >
                  ◉
                </div>

                <div
                  style={{
                    fontSize: 24,
                    fontWeight: 950,
                  }}
                >
                  {feed}
                </div>

                <div
                  style={{
                    color: "rgba(255,255,255,.65)",
                    marginTop: 7,
                  }}
                >
                  Your Status feed appears here.
                </div>
              </div>
            </div>

            <div style={{ padding: 18 }}>
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "center",
                }}
              >
                <Avatar user={profile} size={40} />

                <div style={{ flex: 1 }}>
                  <b>{profile.display_name}</b>
                  <div
                    style={{
                      color: "var(--muted)",
                      fontSize: 11,
                    }}
                  >
                    Just now · Public
                  </div>
                </div>
              </div>

              <p style={{ lineHeight: 1.6 }}>
                Building the future inside HEXA. 🚀
              </p>

              <div
                style={{
                  display: "flex",
                  gap: 8,
                  borderTop: "1px solid var(--border)",
                  paddingTop: 12,
                }}
              >
                <Button
                  onClick={() => setLiked(!liked)}
                  style={{
                    color: liked
                      ? "var(--accent)"
                      : "var(--muted)",
                  }}
                >
                  {liked ? "♥ Liked" : "♡ Like"}
                </Button>

                <Button
                  onClick={() =>
                    document
                      .getElementById("status-comment")
                      ?.focus()
                  }
                >
                  ♡ Comment
                </Button>

                <Button
                  onClick={() => notify("Status shared")}
                >
                  ↗ Share
                </Button>
              </div>

              <div style={{ marginTop: 15 }}>
                {comments.map((x, i) => (
                  <div
                    key={i}
                    style={{
                      padding: 10,
                      background: "var(--panel2)",
                      borderRadius: 10,
                      marginBottom: 6,
                    }}
                  >
                    {x}
                  </div>
                ))}

                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    marginTop: 10,
                  }}
                >
                  <input
                    id="status-comment"
                    value={comment}
                    onChange={(e) =>
                      setComment(e.target.value)
                    }
                    placeholder="Write a comment..."
                    style={{
                      flex: 1,
                      minWidth: 0,
                      padding: 11,
                      borderRadius: 11,
                      background: "var(--panel2)",
                      color: "var(--text)",
                      border: "1px solid var(--border)",
                    }}
                  />

                  <Button onClick={postComment}>
                    Post
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            background: "var(--panel)",
            border: "1px solid var(--border)",
            borderRadius: 18,
            padding: 18,
          }}
        >
          <b>Feed types</b>

          <div style={{ marginTop: 13 }}>
            {FEED_TYPES.map((x) => (
              <div
                key={x.name}
                style={{
                  padding: "11px 0",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <div style={{ fontWeight: 800 }}>
                  {x.icon} {x.name}
                </div>

                <div
                  style={{
                    color: "var(--muted)",
                    fontSize: 11,
                    lineHeight: 1.4,
                    marginTop: 4,
                  }}
                >
                  {x.description}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {create && (
        <Modal
          title="Create Status"
          onClose={() => setCreate(false)}
        >
          <div
            style={{
              border: "1px dashed var(--border)",
              borderRadius: 16,
              padding: 25,
              textAlign: "center",
              marginBottom: 14,
            }}
          >
            <div style={{ fontSize: 35 }}>＋</div>
            <div style={{ fontWeight: 800 }}>
              Add photo or video
            </div>
          </div>

          <Field
            label="Status text"
            placeholder="What's happening?"
            onChange={() => {}}
          />

          <Button
            variant="primary"
            style={{ width: "100%" }}
            onClick={() => {
              setCreate(false);
              notify("Status published");
            }}
          >
            Publish Status
          </Button>
        </Modal>
      )}
    </div>
  );
}

/* =========================================================
   NOTES
   ========================================================= */

function Notes({ notify }) {
  const [notes, setNotes] = useState([
    {
      id: 1,
      title: "Welcome to HEXA",
      body: "Your notes workspace.",
    },
  ]);

  const [selected, setSelected] = useState(notes[0]);

  function createNote() {
    const note = {
      id: Date.now(),
      title: "Untitled note",
      body: "",
    };

    setNotes((x) => [...x, note]);
    setSelected(note);
  }

  function updateBody(value) {
    const updated = {
      ...selected,
      body: value,
    };

    setSelected(updated);

    setNotes((old) =>
      old.map((x) => (x.id === selected.id ? updated : x))
    );
  }

  return (
    <div>
      <PageHeader
        title="Notes"
        description="A focused place for ideas, drafts and quick thoughts."
        button={
          <Button variant="primary" onClick={createNote}>
            + New Note
          </Button>
        }
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "240px minmax(0,1fr)",
          minHeight: 600,
          border: "1px solid var(--border)",
          borderRadius: 20,
          overflow: "hidden",
          background: "var(--panel)",
        }}
      >
        <div
          style={{
            borderRight: "1px solid var(--border)",
            padding: 12,
          }}
        >
          {notes.map((note) => (
            <button
              key={note.id}
              onClick={() => setSelected(note)}
              style={{
                width: "100%",
                textAlign: "left",
                border: 0,
                background:
                  selected.id === note.id
                    ? "var(--panel2)"
                    : "transparent",
                color: "var(--text)",
                padding: 12,
                borderRadius: 11,
                cursor: "pointer",
                marginBottom: 4,
              }}
            >
              <b>{note.title}</b>

              <div
                style={{
                  color: "var(--muted)",
                  fontSize: 11,
                  marginTop: 5,
                  overflow: "hidden",
                }}
              >
                {note.body || "Empty note"}
              </div>
            </button>
          ))}
        </div>

        <div style={{ padding: 28 }}>
          <input
            value={selected.title}
            onChange={(e) => {
              const updated = {
                ...selected,
                title: e.target.value,
              };

              setSelected(updated);

              setNotes((old) =>
                old.map((x) =>
                  x.id === selected.id ? updated : x
                )
              );
            }}
            style={{
              width: "100%",
              boxSizing: "border-box",
              border: 0,
              outline: 0,
              background: "transparent",
              color: "var(--text)",
              fontSize: 30,
              fontWeight: 900,
              marginBottom: 20,
            }}
          />

          <textarea
            value={selected.body}
            onChange={(e) => updateBody(e.target.value)}
            placeholder="Start writing..."
            style={{
              width: "100%",
              minHeight: 420,
              resize: "vertical",
              boxSizing: "border-box",
              border: 0,
              outline: 0,
              background: "transparent",
              color: "var(--text)",
              fontSize: 16,
              lineHeight: 1.8,
            }}
          />
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   DOCUMENTS
   ========================================================= */

function Documents({ notify }) {
  const [doc, setDoc] = useState("");

  return (
    <div>
      <PageHeader
        title="Documents"
        description="Create polished documents inside your HEXA workspace."
        button={
          <Button
            variant="primary"
            onClick={() => notify("New document created")}
          >
            + New Document
          </Button>
        }
      />

      <div
        style={{
          background: "var(--panel)",
          border: "1px solid var(--border)",
          borderRadius: 20,
          padding: 25,
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 7,
            flexWrap: "wrap",
            paddingBottom: 15,
            borderBottom: "1px solid var(--border)",
          }}
        >
          {[
            "B",
            "I",
            "U",
            "H1",
            "H2",
            "• List",
            "☷",
            "Link",
            "Image",
            "Table",
          ].map((x) => (
            <Button
              key={x}
              onClick={() => notify(`${x} tool selected`)}
            >
              {x}
            </Button>
          ))}
        </div>

        <input
          placeholder="Document title"
          style={{
            width: "100%",
            boxSizing: "border-box",
            border: 0,
            outline: 0,
            background: "transparent",
            color: "var(--text)",
            fontSize: 32,
            fontWeight: 900,
            margin: "25px 0",
          }}
        />

        <textarea
          value={doc}
          onChange={(e) => setDoc(e.target.value)}
          placeholder="Start your document..."
          style={{
            width: "100%",
            minHeight: 500,
            border: 0,
            outline: 0,
            resize: "vertical",
            background: "transparent",
            color: "var(--text)",
            fontSize: 16,
            lineHeight: 1.8,
          }}
        />
      </div>
    </div>
  );
}

/* =========================================================
   PROJECTS
   ========================================================= */

function Projects({ notify }) {
  const [create, setCreate] = useState(false);

  return (
    <div>
      <PageHeader
        title="Projects"
        description="Build, organize and track anything."
        button={
          <Button
            variant="primary"
            onClick={() => setCreate(true)}
          >
            + Create Project
          </Button>
        }
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit,minmax(250px,1fr))",
          gap: 15,
        }}
      >
        <LargeCard
          icon="◆"
          title="New Project"
          description="Start a new workspace."
          meta="Ready to build"
          onClick={() => setCreate(true)}
        />

        <LargeCard
          icon="</>"
          title="Development"
          description="Connect code and development tools."
          meta="VS Code · Unreal · Unity · Godot"
          onClick={() => notify("Development project opened")}
        />
      </div>

      {create && (
        <Modal
          title="Create Project"
          onClose={() => setCreate(false)}
        >
          <Field
            label="Project name"
            placeholder="My Project"
            onChange={() => {}}
          />

          <Field
            label="Description"
            placeholder="Project description"
            onChange={() => {}}
          />

          <Button
            variant="primary"
            style={{ width: "100%" }}
            onClick={() => {
              setCreate(false);
              notify("Project created");
            }}
          >
            Create project
          </Button>
        </Modal>
      )}
    </div>
  );
}

/* =========================================================
   KORA
   ========================================================= */

function Kora({ notify }) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    {
      from: "Kora",
      text: "Hi. I'm Kora, the HEXA AI workspace assistant.",
    },
  ]);

  function send() {
    if (!input.trim()) return;

    const text = input.trim();

    setMessages((old) => [
      ...old,
      { from: "You", text },
      {
        from: "Kora",
        text:
          "I received that. Connect your AI provider to give Kora real model responses.",
      },
    ]);

    setInput("");
  }

  return (
    <div>
      <PageHeader
        title="Kora AI"
        description="HEXA's AI workspace."
        button={
          <Button onClick={() => notify("New Kora conversation")}>
            + New conversation
          </Button>
        }
      />

      <div
        style={{
          maxWidth: 900,
          margin: "0 auto",
          border: "1px solid var(--border)",
          borderRadius: 22,
          background: "var(--panel)",
          minHeight: 650,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: 18,
            borderBottom: "1px solid var(--border)",
            display: "flex",
            gap: 12,
            alignItems: "center",
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              display: "grid",
              placeItems: "center",
              background: "var(--accent)",
              color: "white",
              fontSize: 20,
            }}
          >
            ✦
          </div>

          <div>
            <b>Kora</b>
            <div
              style={{
                color: "var(--muted)",
                fontSize: 11,
              }}
            >
              HEXA AI
            </div>
          </div>
        </div>

        <div
          style={{
            flex: 1,
            padding: 22,
            overflowY: "auto",
          }}
        >
          {messages.map((m, i) => (
            <div
              key={i}
              style={{
                marginBottom: 15,
                display: "flex",
                justifyContent:
                  m.from === "You"
                    ? "flex-end"
                    : "flex-start",
              }}
            >
              <div
                style={{
                  maxWidth: "75%",
                  background:
                    m.from === "You"
                      ? "var(--accent)"
                      : "var(--panel2)",
                  color:
                    m.from === "You"
                      ? "white"
                      : "var(--text)",
                  padding: 13,
                  borderRadius: 15,
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    opacity: 0.6,
                    marginBottom: 4,
                  }}
                >
                  {m.from}
                </div>
                {m.text}
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            padding: 13,
            borderTop: "1px solid var(--border)",
            display: "flex",
            gap: 8,
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") send();
            }}
            placeholder="Ask Kora..."
            style={{
              flex: 1,
              minWidth: 0,
              padding: 12,
              borderRadius: 12,
              border: "1px solid var(--border)",
              background: "var(--panel2)",
              color: "var(--text)",
            }}
          />

          <Button variant="primary" onClick={send}>
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   DEVELOPER HUB
   ========================================================= */

function DeveloperHub({ notify }) {
  const tools = [
    {
      name: "VS Code",
      icon: "</>",
      description: "Code and app development",
      protocol: "vscode://",
    },
    {
      name: "Unreal Engine",
      icon: "U",
      description: "AAA game development",
      protocol: "unreal://",
    },
    {
      name: "Unity Hub",
      icon: "◇",
      description: "Unity game development",
      protocol: "unityhub://",
    },
    {
      name: "Godot",
      icon: "G",
      description: "Open-source game engine",
      protocol: "godot://",
    },
  ];

  function launch(tool) {
    /*
      Browsers cannot guarantee launching arbitrary desktop
      applications. These protocol links work only if the
      operating system/application has registered the protocol.
    */
    try {
      window.location.href = tool.protocol;
      notify(`Attempting to open ${tool.name}`);
    } catch {
      notify(
        `${tool.name} could not be launched by this browser`
      );
    }
  }

  return (
    <div>
      <PageHeader
        title="Developer Hub"
        description="Launch and organize your development tools."
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit,minmax(260px,1fr))",
          gap: 15,
        }}
      >
        {tools.map((tool) => (
          <div
            key={tool.name}
            style={{
              background: "var(--panel)",
              border: "1px solid var(--border)",
              borderRadius: 20,
              padding: 20,
            }}
          >
            <div
              style={{
                width: 58,
                height: 58,
                borderRadius: 17,
                background: "var(--panel2)",
                display: "grid",
                placeItems: "center",
                color: "var(--accent)",
                fontWeight: 950,
                fontSize: 20,
                marginBottom: 16,
              }}
            >
              {tool.icon}
            </div>

            <div style={{ fontSize: 18, fontWeight: 900 }}>
              {tool.name}
            </div>

            <div
              style={{
                color: "var(--muted)",
                margin: "7px 0 18px",
              }}
            >
              {tool.description}
            </div>

            <Button
              variant="primary"
              onClick={() => launch(tool)}
              style={{ width: "100%" }}
            >
              Open {tool.name}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* =========================================================
   PROFILE
   ========================================================= */

function Profile({ profile, notify }) {
  const file = useRef(null);

  return (
    <div>
      <PageHeader
        title="Profile"
        description="Manage your HEXA identity."
      />

      <div
        style={{
          maxWidth: 720,
          background: "var(--panel)",
          border: "1px solid var(--border)",
          borderRadius: 22,
          padding: 25,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
            marginBottom: 25,
          }}
        >
          <Avatar user={profile} size={90} />

          <div>
            <h2 style={{ margin: 0 }}>
              {profile.display_name}
            </h2>

            <div
              style={{
                color: "var(--muted)",
                marginTop: 5,
              }}
            >
              @{profile.username}
            </div>
          </div>
        </div>

        <input
          ref={file}
          type="file"
          accept="image/*"
          hidden
          onChange={() => notify("Profile picture selected")}
        />

        <Button
          onClick={() => file.current?.click()}
          style={{ marginBottom: 20 }}
        >
          Change profile picture
        </Button>

        <Field
          label="Display name"
          value={profile.display_name}
          onChange={() => {}}
        />

        <Field
          label="Username"
          value={`@${profile.username}`}
          onChange={() => {}}
        />

        <Button
          variant="primary"
          onClick={() => notify("Profile saved")}
        >
          Save profile
        </Button>
      </div>
    </div>
  );
}

/* =========================================================
   SETTINGS
   ========================================================= */

function Settings({
  theme,
  setTheme,
  accent,
  setAccent,
  logout,
  notify,
}) {
  return (
    <div>
      <PageHeader
        title="Settings"
        description="Customize your HEXA workspace."
      />

      <div
        style={{
          display: "grid",
          gap: 14,
          maxWidth: 850,
        }}
      >
        <SettingCard
          title="Appearance"
          description="Choose how HEXA looks."
        >
          <div style={{ display: "flex", gap: 8 }}>
            {["dark", "white"].map((x) => (
              <Button
                key={x}
                variant={theme === x ? "primary" : "secondary"}
                onClick={() => setTheme(x)}
              >
                {x === "dark" ? "🌙 Dark" : "☀ White"}
              </Button>
            ))}
          </div>
        </SettingCard>

        <SettingCard
          title="Accent color"
          description="Choose HEXA's highlight color."
        >
          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            {Object.keys(ACCENTS).map((x) => (
              <button
                key={x}
                onClick={() => setAccent(x)}
                style={{
                  border:
                    accent === x
                      ? `2px solid ${ACCENTS[x]}`
                      : "1px solid var(--border)",
                  background: "var(--panel2)",
                  color: "var(--text)",
                  borderRadius: 12,
                  padding: "9px 13px",
                  cursor: "pointer",
                }}
              >
                {x}
              </button>
            ))}
          </div>
        </SettingCard>

        <SettingCard
          title="Privacy"
          description="Your conversations should use a real encryption implementation on the server/client layer."
        >
          <div
            style={{
              padding: 13,
              borderRadius: 12,
              background: "var(--panel2)",
            }}
          >
            🔒 Encryption architecture
          </div>
        </SettingCard>

        <SettingCard
          title="Account"
          description="Sign out of this HEXA session."
        >
          <Button
            variant="danger"
            onClick={() => {
              logout();
              notify("Signed out");
            }}
          >
            Sign out
          </Button>
        </SettingCard>
      </div>
    </div>
  );
}

/* =========================================================
   COMMON UI
   ========================================================= */

function PageHeader({ title, description, button }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-end",
        gap: 20,
        flexWrap: "wrap",
        marginBottom: 25,
      }}
    >
      <div>
        <h1
          style={{
            fontSize: 34,
            letterSpacing: -1.5,
            margin: 0,
          }}
        >
          {title}
        </h1>

        <p
          style={{
            color: "var(--muted)",
            margin: "7px 0 0",
          }}
        >
          {description}
        </p>
      </div>

      {button}
    </div>
  );
}

function SectionTitle({ title, action }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 13,
      }}
    >
      <h2 style={{ margin: 0, fontSize: 18 }}>{title}</h2>
      {action}
    </div>
  );
}

function LargeCard({
  icon,
  title,
  description,
  meta,
  onClick,
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background: "var(--panel)",
        color: "var(--text)",
        border: "1px solid var(--border)",
        borderRadius: 20,
        padding: 20,
        textAlign: "left",
        cursor: "pointer",
      }}
    >
      <div
        style={{
          width: 50,
          height: 50,
          display: "grid",
          placeItems: "center",
          borderRadius: 15,
          background: "var(--panel2)",
          color: "var(--accent)",
          fontWeight: 950,
          fontSize: 19,
          marginBottom: 16,
        }}
      >
        {icon}
      </div>

      <div style={{ fontSize: 17, fontWeight: 900 }}>
        {title}
      </div>

      <div
        style={{
          color: "var(--muted)",
          margin: "7px 0 15px",
          lineHeight: 1.5,
          fontSize: 13,
        }}
      >
        {description}
      </div>

      <div
        style={{
          fontSize: 11,
          color: "var(--accent)",
          fontWeight: 800,
        }}
      >
        {meta}
      </div>
    </button>
  );
}

function SettingCard({ title, description, children }) {
  return (
    <div
      style={{
        background: "var(--panel)",
        border: "1px solid var(--border)",
        borderRadius: 18,
        padding: 20,
      }}
    >
      <div style={{ fontWeight: 900 }}>{title}</div>

      <div
        style={{
          color: "var(--muted)",
          fontSize: 12,
          margin: "5px 0 15px",
          lineHeight: 1.5,
        }}
      >
        {description}
      </div>

      {children}
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.65)",
        backdropFilter: "blur(10px)",
        display: "grid",
        placeItems: "center",
        padding: 20,
        zIndex: 100,
      }}
    >
      <div
        style={{
          width: "min(480px,100%)",
          background: "var(--panel)",
          border: "1px solid var(--border)",
          borderRadius: 22,
          padding: 22,
          boxShadow: "0 30px 100px rgba(0,0,0,.45)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <h2 style={{ margin: 0 }}>{title}</h2>

          <Button onClick={onClose}>×</Button>
        </div>

        {children}
      </div>
    </div>
  );
}


/* =========================================================
   HEXA BILLING
   Free -> Plus -> Pro -> Ultra
   KORA is included in every plan.
   ========================================================= */

const HEXA_PLANS = {
  free: {
    id: "free",
    name: "Free",
    price: 0,
    description: "Everything you need to get started with HEXA.",
    color: "default",

    kora: {
      credits: 500,
      label: "500 KORA credits / month",
    },

    storage: "2 GB",
    features: [
      "HEXA messaging",
      "Groups & communities",
      "Status",
      "Voice & video calls",
      "KORA AI",
      "2 GB cloud storage",
    ],
  },

  plus: {
    id: "plus",
    name: "Plus",
    price: 9.99,
    description: "More power for everyday HEXA users.",
    color: "purple",

    kora: {
      credits: 5000,
      label: "5,000 KORA credits / month",
    },

    storage: "50 GB",
    features: [
      "Everything in Free",
      "5,000 KORA credits",
      "50 GB cloud storage",
      "Higher file limits",
      "Premium profile features",
      "Priority KORA access",
    ],
  },

  pro: {
    id: "pro",
    name: "Pro",
    price: 24.99,
    description: "Advanced HEXA for creators and professionals.",
    color: "blue",

    kora: {
      credits: 20000,
      label: "20,000 KORA credits / month",
    },

    storage: "250 GB",
    features: [
      "Everything in Plus",
      "20,000 KORA credits",
      "250 GB cloud storage",
      "Advanced KORA capabilities",
      "Developer tools",
      "Priority processing",
    ],
  },

  ultra: {
    id: "ultra",
    name: "Ultra",
    price: 49.99,
    description: "The ultimate HEXA experience.",
    color: "gold",

    kora: {
      credits: 100000,
      label: "100,000 KORA credits / month",
    },

    storage: "1 TB",
    features: [
      "Everything in Pro",
      "100,000 KORA credits",
      "1 TB cloud storage",
      "Maximum KORA limits",
      "Advanced AI capabilities",
      "Highest priority processing",
      "Early access to HEXA features",
    ],
  },
};

/* =========================================================
   PLAN ORDER
   ========================================================= */

const PLAN_ORDER = ["free", "plus", "pro", "ultra"];

function getPlanRank(plan) {
  return PLAN_ORDER.indexOf(plan);
}


/* =========================================================
   BILLING API
   ========================================================= */

const HEXA_BILLING_API =
  import.meta.env.VITE_BILLING_API_URL ||
  "https://hexa-1-nu8m.onrender.com";

/* =========================================================
   BILLING CENTER
   ========================================================= */

export function HexaBilling({
  currentPlan = "free",
  userId,
  email,
  onUpgrade,
  onDowngrade,
}) {
  const [billingCycle, setBillingCycle] = useState("monthly");
  const [selectedPlan, setSelectedPlan] = useState(currentPlan);
  const [showAllFeatures, setShowAllFeatures] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState(null);
  const [error, setError] = useState("");

  const current =
    HEXA_PLANS[currentPlan] || HEXA_PLANS.free;

  const getMonthlyEquivalent = (plan) => {
    if (plan.price === 0) return 0;

    return Math.round(plan.price * 0.8 * 100) / 100;
  };

  const handlePlanAction = async (planId) => {
    const selected = HEXA_PLANS[planId];

    if (!selected || planId === currentPlan) {
      return;
    }

    setError("");

    if (
      getPlanRank(planId) <
      getPlanRank(currentPlan)
    ) {
      if (onDowngrade) {
        onDowngrade(selected);
      }

      return;
    }

    if (!userId) {
      setError(
        "You must be signed in before upgrading HEXA."
      );
      return;
    }

    setSelectedPlan(planId);
    setLoadingPlan(planId);

    try {
      const response = await fetch(
        `${HEXA_BILLING_API}/api/stripe/create-checkout-session`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            userId,
            email,
            plan: planId,
            billingCycle,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Unable to create Stripe checkout session."
        );
      }

      if (!data.url) {
        throw new Error(
          "Stripe checkout URL was not returned."
        );
      }

      /*
        Stripe Checkout is hosted by Stripe.

        We redirect the customer there instead of
        collecting card information inside HEXA.
      */

      window.location.href = data.url;

      if (onUpgrade) {
        onUpgrade(selected);
      }
    } catch (err) {
      console.error(
        "HEXA checkout error:",
        err
      );

      setError(
        err?.message ||
          "Unable to start checkout."
      );

      setLoadingPlan(null);
    }
  };

  return (
    <div className="hexa-billing">
      <div className="billing-header">
        <div>
          <div className="billing-eyebrow">
            HEXA MEMBERSHIP
          </div>

          <h1>Choose your HEXA plan</h1>

          <p>
            Start free. Upgrade when you need more
            power. KORA is included with every HEXA plan.
          </p>
        </div>

        <div className="current-plan-pill">
          <span className="status-dot" />

          Current plan:
          {" "}
          <strong>{current.name}</strong>
        </div>
      </div>

      <div className="billing-toggle">
        <button
          className={
            billingCycle === "monthly"
              ? "active"
              : ""
          }
          onClick={() =>
            setBillingCycle("monthly")
          }
        >
          Monthly
        </button>

        <button
          className={
            billingCycle === "yearly"
              ? "active"
              : ""
          }
          onClick={() =>
            setBillingCycle("yearly")
          }
        >
          Yearly

          <span className="save-badge">
            Save 20%
          </span>
        </button>
      </div>

      {error && (
        <div className="billing-error">
          <span>⚠</span>

          <span>{error}</span>

          <button
            onClick={() => setError("")}
          >
            ×
          </button>
        </div>
      )}

      <div className="plan-grid">
        {PLAN_ORDER.map((planId) => {
          const plan = HEXA_PLANS[planId];

          const isCurrent =
            planId === currentPlan;

          const isSelected =
            planId === selectedPlan;

          const isPopular =
            planId === "pro";

          const price =
            billingCycle === "yearly"
              ? getMonthlyEquivalent(plan)
              : plan.price;

          const isLoading =
            loadingPlan === planId;

          return (
            <div
              key={plan.id}
              className={[
                "hexa-plan-card",
                plan.color,
                isCurrent ? "current" : "",
                isSelected ? "selected" : "",
                isPopular ? "popular" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {isPopular && (
                <div className="popular-label">
                  MOST POPULAR
                </div>
              )}

              <div className="plan-top">
                <div className="plan-icon">
                  {plan.id === "free" && "○"}
                  {plan.id === "plus" && "✦"}
                  {plan.id === "pro" && "◆"}
                  {plan.id === "ultra" && "♛"}
                </div>

                <h2>{plan.name}</h2>

                <p>{plan.description}</p>
              </div>

              <div className="plan-price">
                {price === 0 ? (
                  <strong>Free</strong>
                ) : (
                  <>
                    <span>$</span>

                    <strong>
                      {price.toFixed(2)}
                    </strong>

                    <small>/mo</small>
                  </>
                )}
              </div>

              {billingCycle === "yearly" &&
                plan.price > 0 && (
                  <div className="yearly-note">
                    Billed annually
                  </div>
                )}

              <div className="kora-box">
                <div className="kora-orb">
                  K
                </div>

                <div>
                  <strong>
                    KORA included
                  </strong>

                  <span>
                    {plan.kora.label}
                  </span>
                </div>
              </div>

              <div className="storage-row">
                <span>
                  ☁ Storage
                </span>

                <strong>
                  {plan.storage}
                </strong>
              </div>

              <div className="plan-features">
                {(showAllFeatures
                  ? plan.features
                  : plan.features.slice(0, 5)
                ).map((feature) => (
                  <div
                    className="feature-row"
                    key={feature}
                  >
                    <span className="feature-check">
                      ✓
                    </span>

                    <span>{feature}</span>
                  </div>
                ))}
              </div>

              {plan.features.length > 5 && (
                <button
                  className="feature-more"
                  onClick={() =>
                    setShowAllFeatures(
                      !showAllFeatures
                    )
                  }
                >
                  {showAllFeatures
                    ? "Show less"
                    : "Show all features"}
                </button>
              )}

              <button
                className={[
                  "plan-action",
                  isCurrent
                    ? "current-button"
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                disabled={
                  isCurrent ||
                  Boolean(loadingPlan)
                }
                onClick={() =>
                  handlePlanAction(plan.id)
                }
              >
                {isLoading
                  ? "Opening Stripe..."
                  : isCurrent
                  ? "Current plan"
                  : getPlanRank(planId) >
                    getPlanRank(currentPlan)
                  ? `Upgrade to ${plan.name}`
                  : `Switch to ${plan.name}`}
              </button>
            </div>
          );
        })}
      </div>

      <div className="billing-footer">
        <div>
          <strong>
            🤖 KORA is part of HEXA.
          </strong>

          <span>
            Your KORA allowance automatically
            increases when you upgrade.
          </span>
        </div>

        <div className="billing-security">
          🔒 Secure Stripe billing
        </div>
      </div>
    </div>
  );
}


/* =========================================================
   KORA USAGE CARD
   ========================================================= */

export function KoraUsage({
  plan = "free",
  used = 120,
}) {
  const currentPlan =
    HEXA_PLANS[plan] ||
    HEXA_PLANS.free;

  const limit =
    currentPlan.kora.credits;

  const percentage =
    Math.min(
      100,
      Math.round(
        (used / limit) * 100
      )
    );

  const remaining =
    Math.max(
      0,
      limit - used
    );

  return (
    <div className="kora-usage-card">
      <div className="kora-usage-header">
        <div className="kora-brand">
          <div className="kora-logo">
            K
          </div>

          <div>
            <strong>KORA</strong>
            <span>AI usage</span>
          </div>
        </div>

        <span className="kora-plan">
          {currentPlan.name}
        </span>
      </div>

      <div className="usage-number">
        <strong>
          {used.toLocaleString()}
        </strong>

        <span>
          {" "}
          / {limit.toLocaleString()}
          {" "}
          credits
        </span>
      </div>

      <div className="usage-bar">
        <div
          className="usage-progress"
          style={{
            width:
              `${percentage}%`,
          }}
        />
      </div>

      <div className="usage-bottom">
        <span>
          {remaining.toLocaleString()}
          {" "}
          remaining
        </span>

        <span>
          {percentage}% used
        </span>
      </div>
    </div>
  );
}



/* =========================================================
   KORA USAGE CARD
   ========================================================= */

export function KoraUsage({
  plan = "free",
  used = 120,
}) {
  const currentPlan = HEXA_PLANS[plan] || HEXA_PLANS.free;

  const limit = currentPlan.kora.credits;

  const percentage = Math.min(
    100,
    Math.round((used / limit) * 100)
  );

  const remaining = Math.max(0, limit - used);

  return (
    <div className="kora-usage-card">
      <div className="kora-usage-header">
        <div className="kora-brand">
          <div className="kora-logo">K</div>

          <div>
            <strong>KORA</strong>
            <span>AI usage</span>
          </div>
        </div>

        <span className="kora-plan">
          {currentPlan.name}
        </span>
      </div>

      <div className="usage-number">
        <strong>{used.toLocaleString()}</strong>
        <span>
          / {limit.toLocaleString()} credits
        </span>
      </div>

      <div className="usage-bar">
        <div
          className="usage-progress"
          style={{ width: `${percentage}%` }}
        />
      </div>

      <div className="usage-bottom">
        <span>{remaining.toLocaleString()} remaining</span>
        <span>{percentage}% used</span>
      </div>
    </div>
  );
}

/* =========================================================
   EXAMPLE BILLING PAGE
   ========================================================= */

export function SubscriptionPage() {
  const [plan, setPlan] = useState("free");

  const [notice, setNotice] = useState("");

  const handleUpgrade = (newPlan) => {
    setNotice(
      `Upgrade selected: ${newPlan.name}. Payment checkout will open here.`
    );

    /*
      IMPORTANT:

      Do NOT simply change the user's plan here
      in a production application.

      Instead:

      1. Create checkout session on your server.
      2. Send user to payment provider.
      3. Provider processes payment.
      4. Webhook verifies payment.
      5. Server updates Supabase subscription.
      6. HEXA reads the verified entitlement.
    */
  };

  const handleDowngrade = (newPlan) => {
    setNotice(
      `Your plan can be changed to ${newPlan.name} at the end of your current billing period.`
    );
  };

  return (
    <div className="subscription-page">
      <HexaBilling
        currentPlan={plan}
        onUpgrade={handleUpgrade}
        onDowngrade={handleDowngrade}
      />

      <div className="subscription-kora">
        <div>
          <div className="section-label">
            YOUR KORA
          </div>

          <h2>KORA grows with your HEXA plan.</h2>

          <p>
            Every HEXA account receives KORA automatically.
            Upgrade your HEXA plan to unlock higher KORA
            limits.
          </p>
        </div>

        <KoraUsage
          plan={plan}
          used={120}
        />
      </div>

      {notice && (
        <div className="billing-notice">
          <span>✓</span>
          {notice}
          <button onClick={() => setNotice("")}>
            ×
          </button>
        </div>
      )}
    </div>
  );
}