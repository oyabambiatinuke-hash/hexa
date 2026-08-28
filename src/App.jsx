import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import "./App.css";

/* =========================================================
   HEXA NEXUS
   Complete single-file App.jsx
   ========================================================= */

/* =========================================================
   CONSTANTS
   ========================================================= */

const STORAGE = {
  profile: "hexa_profile_v3",
  chats: "hexa_chats_v3",
  notes: "hexa_notes_v3",
  theme: "hexa_theme_v3",
  accent: "hexa_accent_v3",
  messages: "hexa_messages_v3",
};

const ACCENTS = {
  Purple: "#8b5cf6",
  Blue: "#3b82f6",
  Cyan: "#06b6d4",
  Green: "#22c55e",
  Pink: "#ec4899",
  Orange: "#f97316",
  Red: "#ef4444",
};

const FEED_TYPES = [
  {
    name: "For You",
    icon: "✦",
    description: "Updates selected for your HEXA feed.",
  },
  {
    name: "Following",
    icon: "◎",
    description: "Posts from people and communities you follow.",
  },
  {
    name: "Technology",
    icon: "⌘",
    description: "Technology, software and innovation.",
  },
  {
    name: "Gaming",
    icon: "◈",
    description: "Gaming, engines and game development.",
  },
  {
    name: "Business",
    icon: "◆",
    description: "Business, startups and productivity.",
  },
];

const EMOJIS = [
  "😀","😃","😄","😁","😆","😅","😂","🤣","😊","😇",
  "🙂","🙃","😉","😌","😍","🥰","😘","😗","😙","😚",
  "😋","😛","😝","😜","🤪","🤨","🧐","🤓","😎","🤩",
  "🥳","😏","😒","😞","😔","😟","😕","🙁","☹️","😣",
  "😖","😫","😩","🥺","😢","😭","😤","😠","😡","🤬",
  "🤯","😳","🥵","🥶","😱","😨","😰","😥","😓","🤗",
  "🤔","🤭","🤫","🤥","😶","😐","😑","😬","🙄","😯",
  "😦","😧","😮","😲","🥱","😴","🤤","😪","😵","🤐",
  "🥴","🤢","🤮","🤧","😷","🤒","🤕","🤑","🤠","😈",
  "👿","👹","👺","🤡","💩","👻","💀","☠️","👽","👾",
  "🤖","🎃","😺","😸","😹","😻","😼","😽","🙀","😿",
  "😾","🙈","🙉","🙊","💋","💯","🔥","⭐","🌟","✨",
  "⚡","💫","🎉","🎊","🚀","❤️","🧡","💛","💚","💙",
  "💜","🖤","🤍","🤎","💔","❣️","💕","💞","💓","💗",
  "💖","💘","💝","💟","👍","👎","👏","🙌","🙏","🤝",
  "💪","👀","🧠","💡","🎯","🏆","🥇","🎮","🎵","🎧",
];

/* =========================================================
   SAFE STORAGE
   ========================================================= */

function readStorage(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* Storage can be unavailable in some browser modes. */
  }
}

/* =========================================================
   PROFILE
   ========================================================= */

const DEFAULT_PROFILE = {
  display_name: "Atinuke",
  username: "username",
  avatar_url: "",
};

/* =========================================================
   DEFAULT CHATS
   ========================================================= */

function makeDefaultChats(profile) {
  const username =
    profile?.username?.trim() || "username";

  const displayName =
    profile?.display_name?.trim() || "You";

  return [
    {
      id: "hexa-group",
      type: "group",
      name: "THE HEXA GROUP",
      description: "The default HEXA group.",
      members: 1,
      avatar: "H",
      messages: [],
    },
    {
      id: "self",
      type: "self",
      name: `You (@${username})`,
      description: `${displayName}'s personal HEXA chat`,
      members: 1,
      avatar: profile?.avatar_url || "",
      messages: [],
    },
    {
      id: "kora",
      type: "ai",
      name: "Kora",
      description: "HEXA AI",
      members: 1,
      avatar: "✦",
      messages: [
        {
          id: "kora-welcome",
          sender: "Kora",
          text:
            "Hi. I'm Kora, the HEXA AI workspace assistant.",
          time: "Now",
          pending: false,
        },
      ],
    },
  ];
}

/* =========================================================
   APP
   ========================================================= */
const HEXA_API =
  import.meta.env.VITE_HEXA_API_URL || "";

async function hexaApi(path, options = {}) {
  const response = await fetch(`${HEXA_API}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "HEXA server request failed");
  }

  return data;
}

/* =========================================================
   KORA — REAL OPENAI CONNECTION
   ========================================================= */

async function askKora({
  message,
  conversation = [],
  context = {},
}) {
  return hexaApi("/api/kora", {
    method: "POST",
    body: JSON.stringify({
      message,
      conversation,
      context,
    }),
  });
}

/* =========================================================
   TURN — WEBRTC CALL CONNECTION
   ========================================================= */

async function getTurnCredentials() {
  return hexaApi("/api/turn", {
    method: "GET",
  });
}

async function createPeerConnection() {
  const turn = await getTurnCredentials();

  return new RTCPeerConnection({
    iceServers: [
      {
        urls: turn.urls,
        username: turn.username,
        credential: turn.credential,
      },
    ],
  });
}
export default function App() {
  const storedProfile = readStorage(
    STORAGE.profile,
    DEFAULT_PROFILE
  );

  const [profile, setProfile] = useState({
    ...DEFAULT_PROFILE,
    ...storedProfile,
  });

  const [theme, setTheme] = useState(
    readStorage(STORAGE.theme, "dark")
  );

  const [accent, setAccent] = useState(
    readStorage(STORAGE.accent, "Purple")
  );

  const [page, setPage] = useState("Nexus");

  const [toast, setToast] = useState("");

  const [online, setOnline] = useState(
    typeof navigator !== "undefined"
      ? navigator.onLine
      : true
  );

  useEffect(() => {
    writeStorage(STORAGE.profile, profile);
  }, [profile]);

  useEffect(() => {
    writeStorage(STORAGE.theme, theme);
  }, [theme]);

  useEffect(() => {
    writeStorage(STORAGE.accent, accent);
  }, [accent]);

  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  useEffect(() => {
    if (!toast) return;

    const timer = setTimeout(
      () => setToast(""),
      2600
    );

    return () => clearTimeout(timer);
  }, [toast]);

  function notify(message) {
    setToast(message);
  }

  function logout() {
    notify("HEXA session reset");
  }

  const style = {
    "--accent":
      ACCENTS[accent] || ACCENTS.Purple,
    "--bg":
      theme === "white"
        ? "#f5f7fb"
        : "#080a0f",
    "--bg2":
      theme === "white"
        ? "#eef1f6"
        : "#0b0e14",
    "--panel":
      theme === "white"
        ? "#ffffff"
        : "#0e1118",
    "--panel2":
      theme === "white"
        ? "#f0f2f6"
        : "#151922",
    "--panel3":
      theme === "white"
        ? "#e7eaf0"
        : "#1a1f29",
    "--text":
      theme === "white"
        ? "#10131a"
        : "#f7f8fb",
    "--muted":
      theme === "white"
        ? "#667085"
        : "#8b93a5",
    "--border":
      theme === "white"
        ? "#dfe3ea"
        : "#242a35",
  };

  function renderPage() {
    switch (page) {
      case "Chat":
        return (
          <Chat
            profile={profile}
            notify={notify}
          />
        );

      case "Groups":
        return <Groups notify={notify} />;

      case "Communities":
        return (
          <Communities
            notify={notify}
          />
        );

      case "Status":
        return (
          <Status
            profile={profile}
            notify={notify}
          />
        );

      case "Notes":
        return <Notes notify={notify} />;

      case "Documents":
        return <Documents notify={notify} />;

      case "Projects":
        return <Projects notify={notify} />;

      case "Kora":
        return <Kora notify={notify} />;

      case "Developer Hub":
        return (
          <DeveloperHub
            notify={notify}
          />
        );

      case "Profile":
        return (
          <Profile
            profile={profile}
            setProfile={setProfile}
            notify={notify}
          />
        );

      case "Settings":
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

      case "Nexus":
      default:
        return (
          <Nexus
            profile={profile}
            online={online}
            setPage={setPage}
            notify={notify}
          />
        );
    }
  }

  return (
    <div
      style={{
        ...style,
        minHeight: "100vh",
        background: "var(--bg)",
        color: "var(--text)",
        display: "flex",
        fontFamily:
          "Inter, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
      }}
    >
      <Sidebar
        page={page}
        setPage={setPage}
        profile={profile}
        online={online}
      />

      <main
        style={{
          flex: 1,
          minWidth: 0,
          minHeight: "100vh",
          background:
            "radial-gradient(circle at top right, color-mix(in srgb,var(--accent) 7%,transparent), transparent 35%), var(--bg)",
        }}
      >
        <TopBar
          page={page}
          online={online}
          profile={profile}
          setPage={setPage}
        />

        <div
          style={{
            maxWidth: 1500,
            margin: "0 auto",
            padding: "28px clamp(16px,3vw,38px) 45px",
          }}
        >
          {renderPage()}
        </div>
      </main>

      {toast && (
        <div
          style={{
            position: "fixed",
            right: 22,
            bottom: 22,
            zIndex: 500,
            background: "var(--panel)",
            border: "1px solid var(--border)",
            boxShadow:
              "0 20px 60px rgba(0,0,0,.35)",
            borderRadius: 14,
            padding: "12px 16px",
            fontWeight: 750,
          }}
        >
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
  page,
  setPage,
  profile,
  online,
}) {
  const items = [
    ["Nexus", "⌂"],
    ["Chat", "◌"],
    ["Groups", "◎"],
    ["Communities", "◈"],
    ["Status", "◉"],
    ["Notes", "▤"],
    ["Documents", "▧"],
    ["Projects", "◆"],
    ["Kora", "✦"],
    ["Developer Hub", "</>"],
  ];

  return (
    <aside
      style={{
        width: 245,
        flexShrink: 0,
        minHeight: "100vh",
        background: "var(--panel)",
        borderRight:
          "1px solid var(--border)",
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
          gap: 11,
          padding: "5px 7px 25px",
        }}
      >
        <div
          style={{
            width: 39,
            height: 39,
            borderRadius: 13,
            background: "var(--accent)",
            color: "white",
            display: "grid",
            placeItems: "center",
            fontWeight: 950,
            fontSize: 18,
            boxShadow:
              "0 10px 30px color-mix(in srgb,var(--accent) 30%,transparent)",
          }}
        >
          H
        </div>

        <div>
          <div
            style={{
              fontWeight: 950,
              letterSpacing: 1,
            }}
          >
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
          fontSize: 10,
          color: "var(--muted)",
          fontWeight: 850,
          letterSpacing: 1.2,
          padding: "0 9px 9px",
        }}
      >
        WORKSPACE
      </div>

      <nav
        style={{
          display: "grid",
          gap: 4,
        }}
      >
        {items.map(([name, icon]) => (
          <button
            key={name}
            onClick={() => setPage(name)}
            style={{
              border: 0,
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "11px 12px",
              borderRadius: 12,
              cursor: "pointer",
              textAlign: "left",
              color:
                page === name
                  ? "var(--text)"
                  : "var(--muted)",
              background:
                page === name
                  ? "var(--panel2)"
                  : "transparent",
              fontWeight:
                page === name
                  ? 850
                  : 650,
            }}
          >
            <span
              style={{
                width: 23,
                textAlign: "center",
                color:
                  page === name
                    ? "var(--accent)"
                    : "inherit",
              }}
            >
              {icon}
            </span>

            {name}
          </button>
        ))}
      </nav>

      <div
        style={{
          marginTop: 25,
          paddingTop: 16,
          borderTop:
            "1px solid var(--border)",
        }}
      >
        <button
          onClick={() => setPage("Profile")}
          style={{
            width: "100%",
            border: 0,
            background: "transparent",
            color: "var(--text)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 10,
            textAlign: "left",
            padding: 7,
          }}
        >
          <Avatar
            user={profile}
            size={38}
          />

          <div
            style={{
              minWidth: 0,
            }}
          >
            <div
              style={{
                fontWeight: 800,
                overflow: "hidden",
                whiteSpace: "nowrap",
                textOverflow: "ellipsis",
              }}
            >
              {profile.display_name}
            </div>

            <div
              style={{
                color: "var(--muted)",
                fontSize: 10,
                display: "flex",
                gap: 5,
                alignItems: "center",
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background:
                    online
                      ? "#22c55e"
                      : "#ef4444",
                }}
              />
              {online
                ? "Online"
                : "Offline"}
            </div>
          </div>
        </button>
      </div>
    </aside>
  );
}
function Kora({ notify }) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const [messages, setMessages] = useState([
    {
      from: "Kora",
      text: "Hi. I'm Kora, the HEXA AI workspace assistant.",
    },
  ]);

  async function send() {
    const text = input.trim();

    if (!text || loading) return;

    setInput("");

    setMessages((old) => [
      ...old,
      {
        from: "You",
        text,
      },
    ]);

    setLoading(true);

    try {
      const result = await askKora({
        message: text,
        conversation: messages,
        context: {
          product: "HEXA",
          assistant: "Kora",
        },
      });

      setMessages((old) => [
        ...old,
        {
          from: "Kora",
          text:
            result.answer ||
            "Kora could not generate a response.",
        },
      ]);
    } catch (error) {
      setMessages((old) => [
        ...old,
        {
          from: "Kora",
          text:
            error.message ||
            "Kora is temporarily unavailable.",
        },
      ]);

      notify?.(error.message || "Kora connection failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Kora AI"
        description="HEXA's AI workspace."
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
              HEXA AI · Connected
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

          {loading && (
            <div
              style={{
                color: "var(--muted)",
                padding: 10,
              }}
            >
              Kora is thinking…
            </div>
          )}
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
            disabled={loading}
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

          <Button
            variant="primary"
            onClick={send}
            disabled={loading}
          >
            {loading ? "..." : "Send"}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   TOP BAR
   ========================================================= */

function TopBar({
  page,
  online,
  profile,
  setPage,
}) {
  return (
    <header
      style={{
        height: 68,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 15,
        padding: "0 clamp(16px,3vw,38px)",
        borderBottom:
          "1px solid var(--border)",
        background:
          "color-mix(in srgb,var(--panel) 82%,transparent)",
        backdropFilter: "blur(18px)",
        position: "sticky",
        top: 0,
        zIndex: 20,
      }}
    >
      <div>
        <div
          style={{
            fontWeight: 900,
          }}
        >
          {page}
        </div>

        <div
          style={{
            fontSize: 10,
            color: "var(--muted)",
            marginTop: 2,
          }}
        >
          HEXA CORE
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div
          style={{
            border:
              "1px solid var(--border)",
            borderRadius: 999,
            padding: "7px 11px",
            fontSize: 11,
            display: "flex",
            gap: 7,
            alignItems: "center",
          }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background:
                online
                  ? "#22c55e"
                  : "#ef4444",
            }}
          />

          {online
            ? "Online"
            : "Offline mode"}
        </div>

        <button
          onClick={() => setPage("Profile")}
          style={{
            border: 0,
            background: "transparent",
            cursor: "pointer",
            color: "var(--text)",
          }}
        >
          <Avatar
            user={profile}
            size={36}
          />
        </button>
      </div>
    </header>
  );
}

/* =========================================================
   NEXUS
   ========================================================= */

function Nexus({
  profile,
  online,
  setPage,
  notify,
}) {
  return (
    <div>
      <div
        style={{
          background:
            "linear-gradient(135deg,color-mix(in srgb,var(--accent) 20%,var(--panel)),var(--panel))",
          border:
            "1px solid color-mix(in srgb,var(--accent) 30%,var(--border))",
          borderRadius: 26,
          padding: "clamp(24px,5vw,50px)",
          marginBottom: 20,
        }}
      >
        <div
          style={{
            color: "var(--accent)",
            fontWeight: 900,
            fontSize: 11,
            letterSpacing: 1.5,
          }}
        >
          HEXA NEXUS
        </div>

        <h1
          style={{
            margin: "10px 0 10px",
            fontSize:
              "clamp(32px,5vw,58px)",
            letterSpacing: -2.5,
            lineHeight: 1,
          }}
        >
          Welcome back,
          <br />
          {profile.display_name}.
        </h1>

        <p
          style={{
            maxWidth: 650,
            color: "var(--muted)",
            lineHeight: 1.7,
            marginBottom: 25,
          }}
        >
          One workspace for communication,
          knowledge, projects, creativity and
          Kora AI.
        </p>

        <div
          style={{
            display: "flex",
            gap: 9,
            flexWrap: "wrap",
          }}
        >
          <Button
            variant="primary"
            onClick={() => setPage("Chat")}
          >
            Open Chat
          </Button>

          <Button
            onClick={() => setPage("Kora")}
          >
            Ask Kora
          </Button>

          <Button
            onClick={() => setPage("Projects")}
          >
            Create Project
          </Button>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit,minmax(220px,1fr))",
          gap: 14,
        }}
      >
        <StatCard
          icon="◌"
          title="Messaging"
          value="HEXA Chat"
          description={
            online
              ? "Connected"
              : "Offline sync enabled"
          }
          onClick={() => setPage("Chat")}
        />

        <StatCard
          icon="✦"
          title="Kora AI"
          value="Ready"
          description="Your HEXA AI workspace"
          onClick={() => setPage("Kora")}
        />

        <StatCard
          icon="▤"
          title="Notes"
          value="Workspace"
          description="Capture ideas quickly"
          onClick={() => setPage("Notes")}
        />

        <StatCard
          icon="◆"
          title="Projects"
          value="Build"
          description="Organize your work"
          onClick={() => setPage("Projects")}
        />
      </div>

      <div
        style={{
          marginTop: 20,
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit,minmax(260px,1fr))",
          gap: 14,
        }}
      >
        <LargeCard
          icon="H"
          title="THE HEXA GROUP"
          description="Your default HEXA group. Everyone starts here."
          meta="Default group"
          onClick={() => setPage("Chat")}
        />

        <LargeCard
          icon="◉"
          title="Status"
          description="Share short-form updates with a social feed."
          meta="TikTok-style feed"
          onClick={() => setPage("Status")}
        />

        <LargeCard
          icon="</>"
          title="Developer Hub"
          description="Organize VS Code, Unreal, Unity and Godot."
          meta="Development tools"
          onClick={() => setPage("Developer Hub")}
        />
      </div>
    </div>
  );
}

function StatCard({
  icon,
  title,
  value,
  description,
  onClick,
}) {
  return (
    <button
      onClick={onClick}
      style={{
        border:
          "1px solid var(--border)",
        background: "var(--panel)",
        color: "var(--text)",
        borderRadius: 18,
        padding: 18,
        textAlign: "left",
        cursor: "pointer",
      }}
    >
      <div
        style={{
          fontSize: 22,
          color: "var(--accent)",
          marginBottom: 14,
        }}
      >
        {icon}
      </div>

      <div
        style={{
          fontSize: 12,
          color: "var(--muted)",
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontWeight: 900,
          fontSize: 20,
          marginTop: 4,
        }}
      >
        {value}
      </div>

      <div
        style={{
          color: "var(--muted)",
          fontSize: 11,
          marginTop: 5,
        }}
      >
        {description}
      </div>
    </button>
  );
}

/* =========================================================
   CHAT
   ========================================================= */

function Chat({
  profile,
  notify,
}) {
  const initialChats = useMemo(
    () => {
      const saved = readStorage(
        STORAGE.chats,
        null
      );

      if (
        Array.isArray(saved) &&
        saved.length >= 3
      ) {
        return saved;
      }

      return makeDefaultChats(profile);
    },
    [profile]
  );

  const [chats, setChats] =
    useState(initialChats);

  const [selectedId, setSelectedId] =
    useState(
      initialChats[0]?.id ||
        "hexa-group"
    );

  const selected =
    chats.find(
      (x) => x.id === selectedId
    ) ||
    chats[0];

  const [message, setMessage] =
    useState("");

  const [showEmoji, setShowEmoji] =
    useState(false);

  const [showAttach, setShowAttach] =
    useState(false);

  const [showTheme, setShowTheme] =
    useState(false);

  const [recording, setRecording] =
    useState(false);

  const [chatTheme, setChatTheme] =
    useState("default");

  const fileRef = useRef(null);

  useEffect(() => {
    writeStorage(
      STORAGE.chats,
      chats
    );
  }, [chats]);

  useEffect(() => {
    if (!selected) return;

    setChatTheme(
      selected.theme || "default"
    );
  }, [selectedId]);

  function updateChat(id, updater) {
    setChats((old) =>
      old.map((chat) =>
        chat.id === id
          ? updater(chat)
          : chat
      )
    );
  }

  function sendMessage(
    text = message,
    extra = {}
  ) {
    const clean = text.trim();

    if (!clean || !selected) return;

    const msg = {
      id:
        `${Date.now()}-${Math.random()
          .toString(36)
          .slice(2)}`,
      sender: "You",
      text: clean,
      time: "Now",
      pending:
        typeof navigator !==
          "undefined" &&
        !navigator.onLine,
      ...extra,
    };

    updateChat(
      selected.id,
      (chat) => ({
        ...chat,
        messages: [
          ...(chat.messages || []),
          msg,
        ],
      })
    );

    setMessage("");
    setShowEmoji(false);

    if (
      selected.type === "ai"
    ) {
      setTimeout(() => {
        updateChat(
          selected.id,
          (chat) => ({
            ...chat,
            messages: [
              ...(chat.messages || []),
              {
                id:
                  `kora-${Date.now()}`,
                sender: "Kora",
                text:
                  "I received your message. Connect your preferred AI provider to enable live model responses.",
                time: "Now",
              },
            ],
          })
        );
      }, 450);
    }
  }
/* =========================================================
   HEXA LOCAL GIF / REACTION LIBRARY
   No GIPHY. No external API.
   ========================================================= */

const HEXA_GIF_CATEGORIES = [
  "All",
  "Funny",
  "Love",
  "Hype",
  "Emotional",
  "Shock",
  "Cool",
  "Dead",
  "Celebration",
  "Respect",
  "Cute",
  "Angry",
  "HEXA",
];

const HEXA_GIF_SEEDS = [
  ["😂", "Laughing", "Funny"],
  ["🤣", "Rolling Laugh", "Funny"],
  ["😭", "Crying", "Emotional"],
  ["💀", "Dead", "Dead"],
  ["☠️", "Absolutely Dead", "Dead"],
  ["😂", "Can't Breathe", "Funny"],
  ["🤣", "I'm Gone", "Funny"],
  ["😹", "Cat Laugh", "Funny"],
  ["🙃", "Everything Is Fine", "Funny"],
  ["🤡", "Clown Moment", "Funny"],

  ["❤️", "Heart", "Love"],
  ["💕", "Double Heart", "Love"],
  ["💖", "Sparkle Heart", "Love"],
  ["💗", "Growing Heart", "Love"],
  ["💘", "Cupid", "Love"],
  ["💝", "Gift Heart", "Love"],
  ["😍", "In Love", "Love"],
  ["🥰", "Adorable", "Love"],
  ["😘", "Kiss", "Love"],
  ["🫶", "Heart Hands", "Love"],

  ["🔥", "Fire", "Hype"],
  ["🚀", "Launch", "Hype"],
  ["⚡", "Lightning", "Hype"],
  ["💯", "Hundred", "Hype"],
  ["🙌", "Let's Go", "Hype"],
  ["👏", "Applause", "Hype"],
  ["🎯", "Nailed It", "Hype"],
  ["🏆", "Winner", "Hype"],
  ["👑", "King", "Hype"],
  ["⭐", "Star", "Hype"],

  ["😱", "Screaming", "Shock"],
  ["🤯", "Mind Blown", "Shock"],
  ["😳", "Shocked", "Shock"],
  ["🫨", "Shaking", "Shock"],
  ["😮", "Whoa", "Shock"],
  ["😲", "Surprised", "Shock"],
  ["👁️", "I Saw That", "Shock"],
  ["👀", "Watching", "Shock"],
  ["🫢", "Oops", "Shock"],
  ["😵", "Dizzy", "Shock"],

  ["😎", "Cool", "Cool"],
  ["🕶️", "Sunglasses", "Cool"],
  ["😏", "Smirk", "Cool"],
  ["🤌", "Perfect", "Cool"],
  ["💅", "Unbothered", "Cool"],
  ["🗿", "Stone Face", "Cool"],
  ["🥶", "Ice Cold", "Cool"],
  ["✨", "Sparkle", "Cool"],
  ["🆒", "Cool", "Cool"],
  ["🎤", "Mic Drop", "Cool"],

  ["🥹", "Happy Tears", "Emotional"],
  ["😢", "Sad", "Emotional"],
  ["😭", "Big Cry", "Emotional"],
  ["💔", "Heartbroken", "Emotional"],
  ["🫂", "Hug", "Emotional"],
  ["😔", "Disappointed", "Emotional"],
  ["🥺", "Please", "Emotional"],
  ["😞", "Pain", "Emotional"],
  ["😩", "Tired", "Emotional"],
  ["🫠", "Melting", "Emotional"],

  ["🙏", "Thank You", "Respect"],
  ["🫡", "Salute", "Respect"],
  ["🤝", "Handshake", "Respect"],
  ["👏", "Respect", "Respect"],
  ["🙇", "Respect Bow", "Respect"],
  ["💪", "Strong", "Respect"],
  ["🏅", "Medal", "Respect"],
  ["🥇", "First Place", "Respect"],
  ["🎖️", "Achievement", "Respect"],
  ["🤝", "Teamwork", "Respect"],

  ["🎉", "Party", "Celebration"],
  ["🥳", "Party Face", "Celebration"],
  ["🎊", "Confetti", "Celebration"],
  ["🍾", "Celebrate", "Celebration"],
  ["🕺", "Dance", "Celebration"],
  ["💃", "Dancing", "Celebration"],
  ["🎂", "Birthday", "Celebration"],
  ["🎈", "Balloon", "Celebration"],
  ["🏆", "Victory", "Celebration"],
  ["🎆", "Fireworks", "Celebration"],

  ["🥰", "Cute", "Cute"],
  ["🐻", "Bear Hug", "Cute"],
  ["🐱", "Cute Cat", "Cute"],
  ["🐶", "Cute Dog", "Cute"],
  ["🐼", "Panda", "Cute"],
  ["🐰", "Bunny", "Cute"],
  ["🦊", "Fox", "Cute"],
  ["🐸", "Frog", "Cute"],
  ["🐥", "Chick", "Cute"],
  ["🧸", "Teddy", "Cute"],

  ["😡", "Angry", "Angry"],
  ["🤬", "Very Angry", "Angry"],
  ["😤", "Steam", "Angry"],
  ["💢", "Rage", "Angry"],
  ["👿", "Mad", "Angry"],
  ["😠", "Annoyed", "Angry"],
  ["🙄", "Eye Roll", "Angry"],
  ["😑", "No Words", "Angry"],
  ["🗯️", "Arguing", "Angry"],
  ["🔥", "Raging", "Angry"],

  ["⬡", "HEXA", "HEXA"],
  ["✦", "Kora", "HEXA"],
  ["⚡", "HEXA Energy", "HEXA"],
  ["🚀", "HEXA Launch", "HEXA"],
  ["💎", "HEXA Premium", "HEXA"],
  ["🧠", "HEXA Intelligence", "HEXA"],
  ["💻", "HEXA Code", "HEXA"],
  ["🌐", "HEXA Network", "HEXA"],
  ["🔮", "HEXA Future", "HEXA"],
  ["✨", "HEXA Magic", "HEXA"],
];

/*
 * Turn the reaction definitions into a larger local library.
 * These are lightweight animated reaction cards rather than
 * external GIF downloads.
 */
const HEXA_GIFS = HEXA_GIF_SEEDS.map((item, index) => ({
  id: `hexa-gif-${index + 1}`,
  emoji: item[0],
  name: item[1],
  category: item[2],
  animation: [
    "hexaPop",
    "hexaBounce",
    "hexaPulse",
    "hexaSpin",
    "hexaShake",
    "hexaFloat",
  ][index % 6],
}));

/* =========================================================
   LOCAL GIF PICKER
   ========================================================= */

function HexaGifPicker({
  onSelect,
  onClose,
}) {
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [favorites, setFavorites] = useState(() => {
    try {
      return JSON.parse(
        localStorage.getItem("hexa-gif-favorites") || "[]"
      );
    } catch {
      return [];
    }
  });

  function toggleFavorite(gif) {
    setFavorites((old) => {
      const next = old.includes(gif.id)
        ? old.filter((id) => id !== gif.id)
        : [...old, gif.id];

      localStorage.setItem(
        "hexa-gif-favorites",
        JSON.stringify(next)
      );

      return next;
    });
  }

  const filtered = HEXA_GIFS.filter((gif) => {
    const categoryMatch =
      category === "All" ||
      gif.category === category ||
      (category === "Favorites" &&
        favorites.includes(gif.id));

    const searchMatch =
      !search.trim() ||
      `${gif.name} ${gif.category} ${gif.emoji}`
        .toLowerCase()
        .includes(search.toLowerCase());

    return categoryMatch && searchMatch;
  });

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        bottom: "calc(100% + 10px)",
        width: "min(430px, calc(100vw - 30px))",
        maxHeight: 470,
        background: "var(--panel)",
        border: "1px solid var(--border)",
        borderRadius: 20,
        boxShadow: "0 25px 80px rgba(0,0,0,.45)",
        overflow: "hidden",
        zIndex: 50,
      }}
    >
      {/* HEADER */}
      <div
        style={{
          padding: 13,
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 10,
          }}
        >
          <div>
            <div style={{ fontWeight: 950 }}>
              HEXA GIFs
            </div>

            <div
              style={{
                fontSize: 10,
                color: "var(--muted)",
                marginTop: 3,
              }}
            >
              100+ local reactions
            </div>
          </div>

          <Button onClick={onClose}>×</Button>
        </div>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search reactions..."
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: "10px 12px",
            borderRadius: 11,
            border: "1px solid var(--border)",
            background: "var(--panel2)",
            color: "var(--text)",
            outline: "none",
          }}
        />
      </div>

      {/* CATEGORIES */}
      <div
        style={{
          display: "flex",
          gap: 6,
          overflowX: "auto",
          padding: "10px 12px",
          borderBottom: "1px solid var(--border)",
        }}
      >
        {[
          ...HEXA_GIF_CATEGORIES,
          "Favorites",
        ].map((x) => (
          <button
            key={x}
            onClick={() => setCategory(x)}
            style={{
              flexShrink: 0,
              border:
                category === x
                  ? "1px solid var(--accent)"
                  : "1px solid var(--border)",
              background:
                category === x
                  ? "var(--accent)"
                  : "var(--panel2)",
              color:
                category === x
                  ? "#fff"
                  : "var(--text)",
              borderRadius: 10,
              padding: "7px 10px",
              cursor: "pointer",
              fontSize: 11,
              fontWeight: 800,
            }}
          >
            {x}
          </button>
        ))}
      </div>

      {/* GIF GRID */}
      <div
        style={{
          padding: 12,
          overflowY: "auto",
          maxHeight: 330,
          display: "grid",
          gridTemplateColumns:
            "repeat(4,minmax(0,1fr))",
          gap: 8,
        }}
      >
        {filtered.map((gif) => (
          <div
            key={gif.id}
            style={{
              position: "relative",
            }}
          >
            <button
              onClick={() => onSelect(gif)}
              title={gif.name}
              style={{
                width: "100%",
                aspectRatio: "1",
                border: "1px solid var(--border)",
                borderRadius: 13,
                background: "var(--panel2)",
                cursor: "pointer",
                display: "grid",
                placeItems: "center",
                overflow: "hidden",
              }}
            >
              <span
                className={gif.animation}
                style={{
                  fontSize: 37,
                  lineHeight: 1,
                }}
              >
                {gif.emoji}
              </span>
            </button>

            <button
              onClick={() => toggleFavorite(gif)}
              title="Favorite"
              style={{
                position: "absolute",
                right: 3,
                top: 3,
                width: 22,
                height: 22,
                border: 0,
                borderRadius: "50%",
                background: "rgba(0,0,0,.55)",
                color: favorites.includes(gif.id)
                  ? "var(--accent)"
                  : "#fff",
                cursor: "pointer",
                fontSize: 11,
              }}
            >
              {favorites.includes(gif.id)
                ? "★"
                : "☆"}
            </button>
          </div>
        ))}

        {!filtered.length && (
          <div
            style={{
              gridColumn: "1/-1",
              textAlign: "center",
              padding: 35,
              color: "var(--muted)",
            }}
          >
            No HEXA reactions found.
          </div>
        )}
      </div>
    </div>
  );
}

/* =========================================================
   CHAT
   ========================================================= */

function Chat({
  notify,
  profile,
}) {
  const defaultChats = [
    {
      id: "hexa-group",
      name: "THE HEXA GROUP",
      members: "HEXA",
      type: "group",
      canSendMessages: true,
      messages: [],
    },
    {
      id: "self",
      name: `You (${profile?.username || "username"})`,
      members: "Personal",
      type: "self",
      canSendMessages: true,
      messages: [],
    },
    {
      id: "kora",
      name: "Kora",
      members: "HEXA AI",
      type: "ai",
      canSendMessages: true,
      messages: [
        {
          id: "kora-welcome",
          sender: "Kora",
          text:
            "Hi. I'm Kora, the HEXA AI. How can I help?",
          time: "Now",
        },
      ],
    },
  ];

  const [selected, setSelected] = useState(
    defaultChats[0]
  );

  const [messages, setMessages] = useState(
    defaultChats[0].messages
  );

  const [message, setMessage] = useState("");
  const [showGifs, setShowGifs] = useState(false);
  const [showAttachments, setShowAttachments] =
    useState(false);

  const [queuedMessages, setQueuedMessages] =
    useState(() => {
      try {
        return JSON.parse(
          localStorage.getItem(
            "hexa-offline-messages"
          ) || "[]"
        );
      } catch {
        return [];
      }
    });

  /*
   * In a real Supabase-connected chat this value should
   * come from conversation_members.can_send_messages.
   *
   * For the owner/default local HEXA session it is true.
   */
  const canSend =
    selected.type !== "group" ||
    selected.canSendMessages === true;

  function selectChat(chat) {
    setSelected(chat);
    setMessages(chat.messages || []);
    setShowGifs(false);
    setShowAttachments(false);
  }

  function saveOfflineQueue(next) {
    setQueuedMessages(next);

    localStorage.setItem(
      "hexa-offline-messages",
      JSON.stringify(next)
    );
  }

  function sendText() {
    const text = message.trim();

    if (!text || !canSend) return;

    const newMessage = {
      id: crypto.randomUUID
        ? crypto.randomUUID()
        : Date.now(),
      sender: "You",
      senderId: profile?.id || null,
      text,
      type: "text",
      conversationId: selected.id,
      time: "Now",
      createdAt: new Date().toISOString(),
      pending:
        typeof navigator !== "undefined" &&
        navigator.onLine === false,
    };

    setMessages((old) => [...old, newMessage]);
    setMessage("");

    if (
      typeof navigator !== "undefined" &&
      navigator.onLine === false
    ) {
      saveOfflineQueue([
        ...queuedMessages,
        newMessage,
      ]);

      notify?.(
        "Offline — message queued for sync"
      );
    } else {
      notify?.("Message sent");
    }
  }

  function sendGif(gif) {
    if (!canSend) return;

    const newMessage = {
      id: crypto.randomUUID
        ? crypto.randomUUID()
        : Date.now(),
      sender: "You",
      senderId: profile?.id || null,
      type: "gif",
      gifId: gif.id,
      gifName: gif.name,
      gifEmoji: gif.emoji,
      gifAnimation: gif.animation,
      conversationId: selected.id,
      time: "Now",
      createdAt: new Date().toISOString(),
      pending:
        typeof navigator !== "undefined" &&
        navigator.onLine === false,
    };

    setMessages((old) => [...old, newMessage]);
    setShowGifs(false);

    if (
      typeof navigator !== "undefined" &&
      navigator.onLine === false
    ) {
      saveOfflineQueue([
        ...queuedMessages,
        newMessage,
      ]);

      notify?.(
        "Offline — GIF queued for sync"
      );
    } else {
      notify?.("GIF sent");
    }
  }

  function importFiles(event) {
    if (!canSend) return;

    const files = Array.from(
      event.target.files || []
    );

    if (!files.length) return;

    files.forEach((file) => {
      const isImage =
        file.type.startsWith("image/");

      const url = URL.createObjectURL(file);

      const newMessage = {
        id: crypto.randomUUID
          ? crypto.randomUUID()
          : Date.now(),
        sender: "You",
        senderId: profile?.id || null,
        type: isImage ? "image" : "file",
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        localUrl: url,
        conversationId: selected.id,
        time: "Now",
        createdAt: new Date().toISOString(),
      };

      setMessages((old) => [
        ...old,
        newMessage,
      ]);
    });

    event.target.value = "";
    setShowAttachments(false);

    notify?.(
      `${files.length} file${
        files.length > 1 ? "s" : ""
      } added to chat`
    );
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
      {/* CHAT LIST */}
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
            onClick={() =>
              notify?.("New chat composer opened")
            }
            style={{
              padding: "7px 10px",
            }}
          >
            +
          </Button>
        </div>

        {defaultChats.map((chat) => (
          <button
            key={chat.id}
            onClick={() => selectChat(chat)}
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
              marginBottom: 4,
            }}
          >
            <Avatar
              user={{
                display_name: chat.name,
              }}
              size={40}
            />

            <div
              style={{
                minWidth: 0,
              }}
            >
              <div
                style={{
                  fontWeight: 800,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {chat.name}
              </div>

              <div
                style={{
                  fontSize: 11,
                  color: "var(--muted)",
                  marginTop: 3,
                }}
              >
                {chat.members}
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* CHAT AREA */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
        }}
      >
        {/* HEADER */}
        <div
          style={{
            padding: 15,
            borderBottom:
              "1px solid var(--border)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div
            style={{
              minWidth: 0,
            }}
          >
            <b>{selected.name}</b>

            <div
              style={{
                color: "var(--muted)",
                fontSize: 11,
                marginTop: 3,
              }}
            >
              {selected.type === "group"
                ? "🔒 Restricted group messaging"
                : selected.type === "ai"
                ? "✦ HEXA AI"
                : "🔒 Private conversation"}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: 6,
              flexShrink: 0,
            }}
          >
            <Button
              onClick={() =>
                notify?.("Voice call UI opened")
              }
            >
              ☎
            </Button>

            <Button
              onClick={() =>
                notify?.("Video call UI opened")
              }
            >
              ◉
            </Button>

            {selected.type === "group" && (
              <Button
                onClick={() =>
                  notify?.(
                    "Manage HEXA GROUP members"
                  )
                }
              >
                + Person
              </Button>
            )}
          </div>
        </div>

        {/* MESSAGES */}
        <div
          style={{
            flex: 1,
            padding: 22,
            overflowY: "auto",
          }}
        >
          {messages.length === 0 && (
            <div
              style={{
                minHeight: 300,
                display: "grid",
                placeItems: "center",
                textAlign: "center",
                color: "var(--muted)",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 45,
                    marginBottom: 10,
                  }}
                >
                  ⬡
                </div>

                <b
                  style={{
                    color: "var(--text)",
                  }}
                >
                  {selected.name}
                </b>

                <div
                  style={{
                    fontSize: 12,
                    marginTop: 5,
                  }}
                >
                  Start the conversation.
                </div>
              </div>
            </div>
          )}

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
                  maxWidth:
                    msg.type === "gif"
                      ? 230
                      : "70%",
                  padding:
                    msg.type === "gif"
                      ? 7
                      : "11px 14px",
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

                {/* GIF MESSAGE */}
                {msg.type === "gif" && (
                  <div
                    style={{
                      borderRadius: 13,
                      minHeight: 130,
                      display: "grid",
                      placeItems: "center",
                      background:
                        "var(--panel2)",
                      overflow: "hidden",
                      position: "relative",
                    }}
                  >
                    <span
                      className={
                        msg.gifAnimation ||
                        "hexaBounce"
                      }
                      style={{
                        fontSize: 80,
                      }}
                    >
                      {msg.gifEmoji}
                    </span>

                    <div
                      style={{
                        position: "absolute",
                        left: 8,
                        bottom: 7,
                        fontSize: 9,
                        padding:
                          "4px 7px",
                        borderRadius: 7,
                        background:
                          "rgba(0,0,0,.45)",
                        color: "#fff",
                      }}
                    >
                      {msg.gifName}
                    </div>
                  </div>
                )}

                {/* IMAGE */}
                {msg.type === "image" && (
                  <img
                    src={msg.localUrl}
                    alt={msg.fileName}
                    style={{
                      maxWidth: "100%",
                      maxHeight: 300,
                      borderRadius: 12,
                      display: "block",
                    }}
                  />
                )}

                {/* FILE */}
                {msg.type === "file" && (
                  <div
                    style={{
                      display: "flex",
                      gap: 10,
                      alignItems: "center",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 28,
                      }}
                    >
                      📎
                    </div>

                    <div>
                      <div
                        style={{
                          fontWeight: 800,
                          wordBreak:
                            "break-word",
                        }}
                      >
                        {msg.fileName}
                      </div>

                      <div
                        style={{
                          fontSize: 10,
                          opacity: 0.65,
                          marginTop: 3,
                        }}
                      >
                        {Math.max(
                          1,
                          Math.round(
                            msg.fileSize /
                              1024
                          )
                        )}{" "}
                        KB
                      </div>
                    </div>
                  </div>
                )}

                {/* TEXT */}
                {msg.type !== "gif" &&
                  msg.type !== "image" &&
                  msg.type !== "file" && (
                    <div>
                      {msg.sender !== "You" && (
                        <div
                          style={{
                            fontSize: 10,
                            fontWeight: 900,
                            marginBottom: 4,
                            color:
                              "var(--accent)",
                          }}
                        >
                          {msg.sender}
                        </div>
                      )}

                      <div>
                        {msg.text}
                      </div>
                    </div>
                  )}

                <div
                  style={{
                    fontSize: 9,
                    opacity: 0.6,
                    marginTop: 5,
                  }}
                >
                  {msg.pending
                    ? "Queued · Offline"
                    : msg.time}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* COMPOSER */}
        <div
          style={{
            padding: 13,
            borderTop:
              "1px solid var(--border)",
            position: "relative",
          }}
        >
          {!canSend ? (
            <div
              style={{
                padding: 15,
                borderRadius: 13,
                background:
                  "var(--panel2)",
                color: "var(--muted)",
                textAlign: "center",
                fontSize: 12,
              }}
            >
              🔒 Only the HEXA GROUP owner
              and authorized senders can
              send messages here.
            </div>
          ) : (
            <>
              {showGifs && (
                <HexaGifPicker
                  onSelect={sendGif}
                  onClose={() =>
                    setShowGifs(false)
                  }
                />
              )}

              {showAttachments && (
                <div
                  style={{
                    position: "absolute",
                    left: 13,
                    bottom:
                      "calc(100% + 10px)",
                    padding: 10,
                    background:
                      "var(--panel)",
                    border:
                      "1px solid var(--border)",
                    borderRadius: 15,
                    boxShadow:
                      "0 20px 60px rgba(0,0,0,.4)",
                    zIndex: 45,
                    display: "grid",
                    gap: 6,
                    minWidth: 180,
                  }}
                >
                  <label
                    style={{
                      padding: 10,
                      borderRadius: 10,
                      background:
                        "var(--panel2)",
                      cursor: "pointer",
                      fontSize: 12,
                      fontWeight: 800,
                    }}
                  >
                    🖼️ Picture / Video
                    <input
                      type="file"
                      accept="image/*,video/*"
                      multiple
                      hidden
                      onChange={
                        importFiles
                      }
                    />
                  </label>

                  <label
                    style={{
                      padding: 10,
                      borderRadius: 10,
                      background:
                        "var(--panel2)",
                      cursor: "pointer",
                      fontSize: 12,
                      fontWeight: 800,
                    }}
                  >
                    📁 Import Files
                    <input
                      type="file"
                      multiple
                      hidden
                      onChange={
                        importFiles
                      }
                    />
                  </label>
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                }}
              >
                {/* EMOJI */}
                <Button
                  onClick={() => {
                    setMessage(
                      (x) =>
                        `${x} 😊`
                    );
                    setShowGifs(false);
                  }}
                  title="Emoji"
                >
                  🙂
                </Button>

                {/* GIF */}
                <Button
                  onClick={() => {
                    setShowGifs(
                      (x) => !x
                    );
                    setShowAttachments(
                      false
                    );
                  }}
                  title="HEXA GIFs"
                >
                  GIF
                </Button>

                {/* ATTACHMENTS */}
                <Button
                  onClick={() => {
                    setShowAttachments(
                      (x) => !x
                    );
                    setShowGifs(false);
                  }}
                  title="Pictures and files"
                >
                  +
                </Button>

                <input
                  value={message}
                  onChange={(e) =>
                    setMessage(
                      e.target.value
                    )
                  }
                  onKeyDown={(e) => {
                    if (
                      e.key === "Enter" &&
                      !e.shiftKey
                    ) {
                      e.preventDefault();
                      sendText();
                    }
                  }}
                  placeholder={
                    selected.type === "group"
                      ? "Message THE HEXA GROUP..."
                      : selected.type === "ai"
                      ? "Message Kora..."
                      : "Message yourself..."
                  }
                  style={{
                    flex: 1,
                    minWidth: 0,
                    borderRadius: 13,
                    border:
                      "1px solid var(--border)",
                    background:
                      "var(--panel2)",
                    color: "var(--text)",
                    padding:
                      "11px 13px",
                    outline: "none",
                  }}
                />

                <Button
                  variant="primary"
                  onClick={sendText}
                >
                  Send
                </Button>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent:
                    "space-between",
                  marginTop: 7,
                  padding:
                    "0 3px",
                  fontSize: 9,
                  color:
                    "var(--muted)",
                }}
              >
                <span>
                  GIFs · Pictures · Files
                </span>

                <span>
                  {typeof navigator !==
                    "undefined" &&
                  navigator.onLine
                    ? "● Online"
                    : "○ Offline · Sync queued"}
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

  function insertEmoji(emoji) {
    setMessage(
      (old) => old + emoji
    );
  }

  function importFiles(files) {
    if (!files?.length) return;

    Array.from(files).forEach(
      (file) => {
        const isImage =
          file.type.startsWith(
            "image/"
          );

        const url =
          URL.createObjectURL(file);

        updateChat(
          selected.id,
          (chat) => ({
            ...chat,
            messages: [
              ...(chat.messages || []),
              {
                id:
                  `file-${Date.now()}-${Math.random()}`,
                sender: "You",
                text: isImage
                  ? `🖼️ ${file.name}`
                  : `📎 ${file.name}`,
                time: "Now",
                file: {
                  name: file.name,
                  type: file.type,
                  size: file.size,
                  url,
                  image: isImage,
                },
              },
            ],
          })
        );
      }
    );

    setShowAttach(false);
    notify(
      `${files.length} file${
        files.length > 1
          ? "s"
          : ""
      } added to chat`
    );
  }

  function shareGif() {
    const gifUrls = [
      "https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif",
      "https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif",
      "https://media.giphy.com/media/3o7TKU8RvQuomF7UUo/giphy.gif",
    ];

    const url =
      gifUrls[
        Math.floor(
          Math.random() *
            gifUrls.length
        )
      ];

    sendMessage(
      "🎞️ GIF",
      {
        gif: url,
      }
    );

    notify("GIF added to chat");
  }

  function changeTheme(theme) {
    setChatTheme(theme);

    updateChat(
      selected.id,
      (chat) => ({
        ...chat,
        theme,
      })
    );

    setShowTheme(false);
    notify("Chat theme updated");
  }

  function startCall(type) {
    notify(
      `${type} call interface opened`
    );
  }

  const themeBackground =
    chatTheme === "midnight"
      ? "linear-gradient(145deg,#050509,#171329)"
      : chatTheme === "ocean"
      ? "linear-gradient(145deg,#06131b,#092735)"
      : chatTheme === "sunset"
      ? "linear-gradient(145deg,#1c0b09,#28151d)"
      : "var(--panel)";

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns:
          "minmax(230px,280px) minmax(0,1fr)",
        minHeight:
          "calc(100vh - 125px)",
        border:
          "1px solid var(--border)",
        borderRadius: 22,
        overflow: "hidden",
        background: "var(--panel)",
      }}
    >
      <div
        style={{
          borderRight:
            "1px solid var(--border)",
          padding: 14,
          overflowY: "auto",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            marginBottom: 12,
          }}
        >
          <div>
            <b>Chats</b>

            <div
              style={{
                color: "var(--muted)",
                fontSize: 10,
                marginTop: 3,
              }}
            >
              Your HEXA conversations
            </div>
          </div>

          <Button
            onClick={() =>
              notify(
                "New chat composer opened"
              )
            }
            style={{
              padding:
                "7px 10px",
            }}
          >
            +
          </Button>
        </div>

        {chats.map((chat) => (
          <button
            key={chat.id}
            onClick={() =>
              setSelectedId(chat.id)
            }
            style={{
              width: "100%",
              border: 0,
              background:
                selected?.id ===
                chat.id
                  ? "var(--panel2)"
                  : "transparent",
              color: "var(--text)",
              borderRadius: 13,
              padding: 12,
              display: "flex",
              gap: 10,
              textAlign: "left",
              cursor: "pointer",
              marginBottom: 4,
            }}
          >
            {chat.type ===
            "self" ? (
              <Avatar
                user={profile}
                size={40}
              />
            ) : (
              <div
                style={{
                  width: 40,
                  height: 40,
                  flexShrink: 0,
                  borderRadius: 13,
                  display: "grid",
                  placeItems: "center",
                  background:
                    chat.type ===
                    "ai"
                      ? "var(--accent)"
                      : "var(--panel3)",
                  color:
                    chat.type ===
                    "ai"
                      ? "white"
                      : "var(--accent)",
                  fontWeight: 950,
                }}
              >
                {chat.avatar}
              </div>
            )}

            <div
              style={{
                minWidth: 0,
              }}
            >
              <div
                style={{
                  fontWeight: 800,
                  overflow: "hidden",
                  textOverflow:
                    "ellipsis",
                  whiteSpace:
                    "nowrap",
                }}
              >
                {chat.name}
              </div>

              <div
                style={{
                  fontSize: 11,
                  color:
                    "var(--muted)",
                  marginTop: 3,
                }}
              >
                {chat.description}
              </div>
            </div>
          </button>
        ))}

        <div
          style={{
            marginTop: 15,
            padding: 12,
            borderRadius: 14,
            background:
              "var(--panel2)",
            fontSize: 10,
            color: "var(--muted)",
            lineHeight: 1.5,
          }}
        >
          <b
            style={{
              color: "var(--text)",
            }}
          >
            Offline sync
          </b>

          <br />

          Messages created offline
          remain locally queued and
          can be synchronized when
          connectivity returns.
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
          background:
            themeBackground,
        }}
      >
        {!selected ? (
          <div
            style={{
              flex: 1,
              display: "grid",
              placeItems: "center",
            }}
          >
            No chat selected.
          </div>
        ) : (
          <>
            <div
              style={{
                padding: 15,
                borderBottom:
                  "1px solid var(--border)",
                display: "flex",
                justifyContent:
                  "space-between",
                alignItems:
                  "center",
                gap: 10,
              }}
            >
              <div
                style={{
                  display: "flex",
                  gap: 11,
                  alignItems:
                    "center",
                  minWidth: 0,
                }}
              >
                {selected.type ===
                "self" ? (
                  <Avatar
                    user={profile}
                    size={40}
                  />
                ) : (
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 13,
                      background:
                        selected.type ===
                        "ai"
                          ? "var(--accent)"
                          : "var(--panel3)",
                      display: "grid",
                      placeItems:
                        "center",
                      color:
                        selected.type ===
                        "ai"
                          ? "white"
                          : "var(--accent)",
                      fontWeight: 900,
                    }}
                  >
                    {selected.avatar}
                  </div>
                )}

                <div
                  style={{
                    minWidth: 0,
                  }}
                >
                  <b>
                    {selected.name}
                  </b>

                  <div
                    style={{
                      color:
                        "var(--muted)",
                      fontSize: 10,
                      marginTop: 3,
                    }}
                  >
                    {selected.type ===
                    "ai"
                      ? "HEXA AI"
                      : "🔒 Secure HEXA chat"}
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 5,
                  flexWrap:
                    "wrap",
                  justifyContent:
                    "flex-end",
                }}
              >
                <Button
                  onClick={() =>
                    startCall(
                      "Voice"
                    )
                  }
                >
                  ☎
                </Button>

                <Button
                  onClick={() =>
                    startCall(
                      "Video"
                    )
                  }
                >
                  ◉
                </Button>

                <Button
                  onClick={() =>
                    setShowTheme(
                      !showTheme
                    )
                  }
                >
                  🎨
                </Button>

                {selected.type ===
                  "group" && (
                  <Button
                    onClick={() =>
                      notify(
                        "Add people panel opened"
                      )
                    }
                  >
                    + Person
                  </Button>
                )}
              </div>
            </div>

            {showTheme && (
              <div
                style={{
                  padding: 10,
                  borderBottom:
                    "1px solid var(--border)",
                  display: "flex",
                  gap: 7,
                  flexWrap: "wrap",
                  background:
                    "var(--panel)",
                }}
              >
                {[
                  [
                    "default",
                    "Default",
                  ],
                  [
                    "midnight",
                    "Midnight",
                  ],
                  ["ocean", "Ocean"],
                  [
                    "sunset",
                    "Sunset",
                  ],
                ].map(
                  ([id, label]) => (
                    <Button
                      key={id}
                      variant={
                        chatTheme ===
                        id
                          ? "primary"
                          : "secondary"
                      }
                      onClick={() =>
                        changeTheme(
                          id
                        )
                      }
                    >
                      {label}
                    </Button>
                  )
                )}
              </div>
            )}

            <div
              style={{
                flex: 1,
                padding: 22,
                overflowY:
                  "auto",
                minHeight: 350,
              }}
            >
              {(selected.messages ||
                []).map(
                (msg) => (
                  <div
                    key={msg.id}
                    style={{
                      marginBottom: 14,
                      display:
                        "flex",
                      justifyContent:
                        msg.sender ===
                        "You"
                          ? "flex-end"
                          : "flex-start",
                    }}
                  >
                    <div
                      style={{
                        maxWidth:
                          "min(75%,650px)",
                        padding:
                          "11px 14px",
                        borderRadius: 16,
                        background:
                          msg.sender ===
                          "You"
                            ? "var(--accent)"
                            : "var(--panel2)",
                        color:
                          msg.sender ===
                          "You"
                            ? "white"
                            : "var(--text)",
                        opacity:
                          msg.pending
                            ? 0.65
                            : 1,
                      }}
                    >
                      {msg.sender !==
                        "You" && (
                        <div
                          style={{
                            fontSize: 10,
                            fontWeight: 900,
                            marginBottom: 4,
                            color:
                              "var(--accent)",
                          }}
                        >
                          {msg.sender}
                        </div>
                      )}

                      {msg.file
                        ?.image && (
                        <img
                          src={
                            msg.file.url
                          }
                          alt={
                            msg.file.name
                          }
                          style={{
                            display:
                              "block",
                            maxWidth:
                              "100%",
                            maxHeight: 320,
                            borderRadius: 12,
                            marginBottom: 7,
                          }}
                        />
                      )}

                      {msg.gif && (
                        <img
                          src={msg.gif}
                          alt="GIF"
                          style={{
                            display:
                              "block",
                            maxWidth:
                              "100%",
                            maxHeight: 280,
                            borderRadius: 12,
                            marginBottom: 7,
                          }}
                        />
                      )}

                      <div>
                        {msg.text}
                      </div>

                      {msg.file &&
                        !msg.file
                          .image && (
                          <div
                            style={{
                              marginTop: 7,
                              padding:
                                "8px 10px",
                              borderRadius: 9,
                              background:
                                "rgba(0,0,0,.12)",
                              fontSize: 11,
                            }}
                          >
                            📎{" "}
                            {
                              msg.file
                                .name
                            }
                          </div>
                        )}

                      <div
                        style={{
                          fontSize: 9,
                          opacity: 0.6,
                          marginTop: 5,
                        }}
                      >
                        {msg.pending
                          ? "Queued · offline"
                          : msg.time}
                      </div>
                    </div>
                  </div>
                )
              )}

              {selected.messages
                ?.length === 0 && (
                <div
                  style={{
                    minHeight: 300,
                    display:
                      "grid",
                    placeItems:
                      "center",
                    textAlign:
                      "center",
                    color:
                      "var(--muted)",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: 45,
                        marginBottom: 10,
                      }}
                    >
                      ◌
                    </div>

                    <b
                      style={{
                        color:
                          "var(--text)",
                      }}
                    >
                      No messages yet
                    </b>

                    <div
                      style={{
                        marginTop: 5,
                        fontSize: 12,
                      }}
                    >
                      Start the
                      conversation.
                    </div>
                  </div>
                </div>
              )}
            </div>

            {showEmoji && (
              <div
                style={{
                  padding: 10,
                  borderTop:
                    "1px solid var(--border)",
                  borderBottom:
                    "1px solid var(--border)",
                  background:
                    "var(--panel)",
                  display:
                    "grid",
                  gridTemplateColumns:
                    "repeat(auto-fill,minmax(38px,1fr))",
                  gap: 3,
                  maxHeight: 170,
                  overflowY:
                    "auto",
                }}
              >
                {EMOJIS.map(
                  (emoji, i) => (
                    <button
                      key={`${emoji}-${i}`}
                      onClick={() =>
                        insertEmoji(
                          emoji
                        )
                      }
                      style={{
                        border: 0,
                        background:
                          "transparent",
                        cursor:
                          "pointer",
                        fontSize: 23,
                        padding: 6,
                        borderRadius: 8,
                      }}
                    >
                      {emoji}
                    </button>
                  )
                )}
              </div>
            )}

            {showAttach && (
              <div
                style={{
                  padding: 10,
                  borderTop:
                    "1px solid var(--border)",
                  background:
                    "var(--panel)",
                  display: "flex",
                  gap: 8,
                  flexWrap:
                    "wrap",
                }}
              >
                <Button
                  onClick={() =>
                    fileRef.current?.click()
                  }
                >
                  🖼️ Picture / File
                </Button>

                <Button
                  onClick={
                    shareGif
                  }
                >
                  🎞️ GIF
                </Button>

                <Button
                  onClick={() => {
                    setRecording(
                      !recording
                    );
                    setShowAttach(
                      false
                    );
                  }}
                >
                  🎙️ Voice
                </Button>
              </div>
            )}

            {recording && (
              <div
                style={{
                  padding:
                    "10px 14px",
                  background:
                    "var(--panel)",
                  borderTop:
                    "1px solid var(--border)",
                  display: "flex",
                  justifyContent:
                    "space-between",
                  alignItems:
                    "center",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    gap: 9,
                    alignItems:
                      "center",
                  }}
                >
                  <span
                    style={{
                      width: 9,
                      height: 9,
                      borderRadius:
                        "50%",
                      background:
                        "#ef4444",
                    }}
                  />
                  Recording voice
                  message...
                </div>

                <Button
                  variant="primary"
                  onClick={() => {
                    setRecording(
                      false
                    );
                    sendMessage(
                      "🎙️ Voice message"
                    );
                  }}
                >
                  Stop & Send
                </Button>
              </div>
            )}

            <div
              style={{
                padding: 13,
                borderTop:
                  "1px solid var(--border)",
                display: "flex",
                gap: 8,
                position:
                  "relative",
              }}
            >
              <Button
                onClick={() =>
                  setShowEmoji(
                    !showEmoji
                  )
                }
              >
                🙂
              </Button>

              <Button
                onClick={() =>
                  setShowAttach(
                    !showAttach
                  )
                }
              >
                +
              </Button>

              <input
                ref={fileRef}
                type="file"
                multiple
                accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.zip"
                hidden
                onChange={(e) =>
                  importFiles(
                    e.target.files
                  )
                }
              />

              <input
                value={message}
                onChange={(e) =>
                  setMessage(
                    e.target.value
                  )
                }
                onKeyDown={(e) => {
                  if (
                    e.key ===
                    "Enter"
                  ) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder={
                  selected.type ===
                  "ai"
                    ? "Message Kora..."
                    : "Message HEXA..."
                }
                style={{
                  flex: 1,
                  minWidth: 0,
                  borderRadius: 13,
                  border:
                    "1px solid var(--border)",
                  background:
                    "var(--panel2)",
                  color:
                    "var(--text)",
                  padding:
                    "11px 13px",
                  outline: "none",
                }}
              />

              <Button
                variant="primary"
                onClick={() =>
                  sendMessage()
                }
              >
                Send
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
/* =========================================================
   HEXA WEBRTC CALL ENGINE
   ========================================================= */

async function getTurnIceServers(supabase) {
  const {
    data: {
      session,
    },
    error,
  } = await supabase.auth.getSession();

  if (error || !session) {
    throw new Error(
      "You must be signed in to make calls."
    );
  }

  const response = await fetch(
    "/api/turn",
    {
      method: "GET",
      headers: {
        Authorization:
          `Bearer ${session.access_token}`,
      },
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.error ||
        "Unable to connect to TURN."
    );
  }

  return data.iceServers;
}function createHexaCallManager({
  supabase,
  userId,
  conversationId,
  callId,
  remoteUserId,
  type,
  onRemoteStream,
  onState,
  onError,
}) {
  let channel = null;
  let peer = null;
  let localStream = null;

  let stopped = false;

  async function initialize() {
    const iceServers =
      await getTurnIceServers(
        supabase
      );

    peer =
      new RTCPeerConnection({
        iceServers,
        iceCandidatePoolSize: 10,
      });

    peer.onicecandidate = async (
      event
    ) => {
      if (
        !event.candidate ||
        !channel ||
        stopped
      ) {
        return;
      }

      await channel.send({
        type: "broadcast",
        event: "ice-candidate",
        payload: {
          callId,
          from: userId,
          candidate:
            event.candidate.toJSON(),
        },
      });
    };

    peer.ontrack = (event) => {
      const stream =
        event.streams?.[0];

      if (stream) {
        onRemoteStream?.(stream);
      }
    };

    peer.onconnectionstatechange =
      () => {
        const state =
          peer.connectionState;

        if (
          state === "connected"
        ) {
          onState?.("connected");
        }

        if (
          state === "disconnected"
        ) {
          onState?.(
            "disconnected"
          );
        }

        if (
          state === "failed"
        ) {
          onState?.("failed");
        }

        if (
          state === "closed"
        ) {
          onState?.("ended");
        }
      };

    channel =
      supabase.channel(
        `call:${callId}`,
        {
          config: {
            broadcast: {
              ack: true,
            },
            private: true,
          },
        }
      );

    channel
      .on(
        "broadcast",
        {
          event:
            "offer",
        },
        async ({
          payload,
        }) => {
          if (
            payload.callId !==
              callId ||
            payload.from ===
              userId
          ) {
            return;
          }

          await peer.setRemoteDescription(
            new RTCSessionDescription(
              payload.offer
            )
          );

          const answer =
            await peer.createAnswer();

          await peer.setLocalDescription(
            answer
          );

          await channel.send({
            type: "broadcast",
            event:
              "answer",
            payload: {
              callId,
              from: userId,
              answer,
            },
          });
        }
      )

      .on(
        "broadcast",
        {
          event:
            "answer",
        },
        async ({
          payload,
        }) => {
          if (
            payload.callId !==
              callId ||
            payload.from ===
              userId
          ) {
            return;
          }

          await peer.setRemoteDescription(
            new RTCSessionDescription(
              payload.answer
            )
          );
        }
      )

      .on(
        "broadcast",
        {
          event:
            "ice-candidate",
        },
        async ({
          payload,
        }) => {
          if (
            payload.callId !==
              callId ||
            payload.from ===
              userId
          ) {
            return;
          }

          try {
            await peer.addIceCandidate(
              new RTCIceCandidate(
                payload.candidate
              )
            );
          } catch (error) {
            console.warn(
              "ICE candidate error:",
              error
            );
          }
        }
      )

      .on(
        "broadcast",
        {
          event:
            "hangup",
        },
        async ({
          payload,
        }) => {
          if (
            payload.callId !==
              callId ||
            payload.from ===
              userId
          ) {
            return;
          }

          await stop(
            false
          );
        }
      );

    await channel.subscribe(
      async (status) => {
        if (
          status !==
          "SUBSCRIBED"
        ) {
          return;
        }

        /*
         * Caller creates the offer.
         */
        if (
          userId !==
          remoteUserId
        ) {
          /*
           * The caller will explicitly
           * call createOffer().
           */
        }
      }
    );

    return peer;
  }

  async function attachLocalMedia() {
    localStream =
      await navigator.mediaDevices.getUserMedia(
        {
          audio: true,
          video:
            type === "video",
        }
      );

    for (
      const track of
        localStream.getTracks()
    ) {
      peer.addTrack(
        track,
        localStream
      );
    }

    return localStream;
  }

  async function createOffer() {
    if (!peer) {
      throw new Error(
        "Call engine is not initialized."
      );
    }

    const offer =
      await peer.createOffer({
        offerToReceiveAudio:
          true,
        offerToReceiveVideo:
          type === "video",
      });

    await peer.setLocalDescription(
      offer
    );

    await channel.send({
      type: "broadcast",
      event: "offer",
      payload: {
        callId,
        from: userId,
        offer,
      },
    });
  }

  async function stop(
    notifyRemote = true
  ) {
    stopped = true;

    if (
      notifyRemote &&
      channel
    ) {
      try {
        await channel.send({
          type: "broadcast",
          event: "hangup",
          payload: {
            callId,
            from: userId,
          },
        });
      } catch {
        // Ignore signaling cleanup errors.
      }
    }

    if (localStream) {
      for (
        const track of
          localStream.getTracks()
      ) {
        track.stop();
      }

      localStream = null;
    }

    if (peer) {
      peer.close();
      peer = null;
    }

    if (channel) {
      await supabase.removeChannel(
        channel
      );

      channel = null;
    }

    onState?.("ended");
  }

  function toggleMute() {
    if (!localStream) {
      return false;
    }

    const audioTracks =
      localStream.getAudioTracks();

    if (!audioTracks.length) {
      return false;
    }

    const enabled =
      !audioTracks[0].enabled;

    for (
      const track of
        audioTracks
    ) {
      track.enabled =
        enabled;
    }

    return !enabled;
  }

  function toggleCamera() {
    if (!localStream) {
      return false;
    }

    const videoTracks =
      localStream.getVideoTracks();

    if (!videoTracks.length) {
      return false;
    }

    const enabled =
      !videoTracks[0].enabled;

    for (
      const track of
        videoTracks
    ) {
      track.enabled =
        enabled;
    }

    return !enabled;
  }

  return {
    initialize,
    attachLocalMedia,
    createOffer,
    stop,
    toggleMute,
    toggleCamera,
  };
}
function CallWindow({
  supabase,
  currentUserId,
  call,
  isCaller,
  onClose,
  notify,
}) {
  const [callEngine, setCallEngine] =
    useState(null);

  const [localStream, setLocalStream] =
    useState(null);

  const [remoteStream, setRemoteStream] =
    useState(null);

  const [status, setStatus] =
    useState(
      call.status === "ringing"
        ? "ringing"
        : "connecting"
    );

  const [muted, setMuted] =
    useState(false);

  const [cameraOff, setCameraOff] =
    useState(false);

  const localVideo =
    useRef(null);

  const remoteVideo =
    useRef(null);

  useEffect(() => {
    let mounted = true;

    async function start() {
      try {
        const engine =
          createHexaCallManager({
            supabase,
            userId:
              currentUserId,
            conversationId:
              call.conversation_id,
            callId:
              call.id,
            remoteUserId:
              isCaller
                ? call.callee_id
                : call.caller_id,
            type:
              call.type,
            onRemoteStream:
              (stream) => {
                if (mounted) {
                  setRemoteStream(
                    stream
                  );
                }
              },
            onState:
              (next) => {
                if (
                  mounted
                ) {
                  setStatus(
                    next
                  );
                }
              },
            onError:
              (error) => {
                notify?.(
                  error.message
                );
              },
          });

        await engine.initialize();

        const stream =
          await engine.attachLocalMedia();

        if (!mounted) {
          await engine.stop(
            false
          );
          return;
        }

        setCallEngine(
          engine
        );

        setLocalStream(
          stream
        );

        if (
          isCaller
        ) {
          await engine.createOffer();
        }
      } catch (error) {
        notify?.(
          error.message ||
            "Unable to start call."
        );
      }
    }

    start();

    return () => {
      mounted = false;

      if (callEngine) {
        callEngine.stop(
          false
        );
      }
    };

    // Intentionally initialize once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (
      localVideo.current &&
      localStream
    ) {
      localVideo.current.srcObject =
        localStream;
    }
  }, [
    localStream,
  ]);

  useEffect(() => {
    if (
      remoteVideo.current &&
      remoteStream
    ) {
      remoteVideo.current.srcObject =
        remoteStream;
    }
  }, [
    remoteStream,
  ]);

  async function hangUp() {
    try {
      if (callEngine) {
        await callEngine.stop(
          true
        );
      }

      await endCall({
        supabase,
        callId:
          call.id,
      });
    } catch {
      // Local cleanup still happens.
    }

    onClose?.();
  }

  function toggleMute() {
    if (!callEngine) {
      return;
    }

    const next =
      callEngine.toggleMute();

    setMuted(next);
  }

  function toggleCamera() {
    if (!callEngine) {
      return;
    }

    const next =
      callEngine.toggleCamera();

    setCameraOff(next);
  }

  const videoCall =
    call.type === "video";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 999,
        background:
          "rgba(0,0,0,.88)",
        display: "grid",
        placeItems:
          "center",
        padding: 20,
      }}
    >
      <div
        style={{
          width:
            "min(1000px,100%)",
          height:
            "min(720px,90vh)",
          background:
            "var(--panel)",
          border:
            "1px solid var(--border)",
          borderRadius: 24,
          overflow: "hidden",
          position:
            "relative",
        }}
      >
        {videoCall ? (
          <>
            <video
              ref={remoteVideo}
              autoPlay
              playsInline
              style={{
                width: "100%",
                height: "100%",
                objectFit:
                  "cover",
                background:
                  "#000",
              }}
            />

            <video
              ref={localVideo}
              autoPlay
              muted
              playsInline
              style={{
                position:
                  "absolute",
                right: 18,
                top: 18,
                width: 220,
                height: 140,
                objectFit:
                  "cover",
                borderRadius: 16,
                border:
                  "2px solid rgba(255,255,255,.2)",
                background:
                  "#111",
              }}
            />
          </>
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "grid",
              placeItems:
                "center",
            }}
          >
            <div
              style={{
                textAlign:
                  "center",
              }}
            >
              <div
                style={{
                  width: 110,
                  height: 110,
                  borderRadius:
                    "50%",
                  display: "grid",
                  placeItems:
                    "center",
                  margin:
                    "0 auto 18px",
                  background:
                    "var(--accent)",
                  color:
                    "white",
                  fontSize: 40,
                  fontWeight:
                    900,
                }}
              >
                ☎
              </div>

              <h2
                style={{
                  margin: 0,
                }}
              >
                {isCaller
                  ? "Calling..."
                  : "Connected"}
              </h2>
            </div>
          </div>
        )}

        <div
          style={{
            position:
              "absolute",
            left: 18,
            top: 18,
            padding:
              "9px 13px",
            borderRadius: 12,
            background:
              "rgba(0,0,0,.55)",
            color: "white",
            backdropFilter:
              "blur(10px)",
          }}
        >
          {status}
        </div>

        <div
          style={{
            position:
              "absolute",
            bottom: 20,
            left: 0,
            right: 0,
            display: "flex",
            justifyContent:
              "center",
            gap: 10,
          }}
        >
          <Button
            onClick={
              toggleMute
            }
          >
            {muted
              ? "🔇 Unmute"
              : "🎙 Mute"}
          </Button>

          {videoCall && (
            <Button
              onClick={
                toggleCamera
              }
            >
              {cameraOff
                ? "📷 Camera on"
                : "📷 Camera off"}
            </Button>
          )}

          <Button
            variant="danger"
            onClick={
              hangUp
            }
          >
            ☎ End
          </Button>
        </div>
      </div>
    </div>
  );
}const channel = supabase.channel(
  `call:${callId}`,
  {
    config: {
      private: true,
      broadcast: {
        ack: true,
      },
    },
  }
);

/* =========================================================
   GROUPS
   ========================================================= */

function Groups({ notify }) {
  const [showCreate, setShowCreate] =
    useState(false);

  const [name, setName] =
    useState("");

  return (
    <div>
      <PageHeader
        title="Groups"
        description="Large conversations for people who need to stay together."
        button={
          <Button
            variant="primary"
            onClick={() =>
              setShowCreate(true)
            }
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
          meta="Default · 1,000+ capacity"
          onClick={() =>
            notify(
              "THE HEXA GROUP opened"
            )
          }
        />
      </div>

      {showCreate && (
        <Modal
          title="Create Group"
          onClose={() =>
            setShowCreate(false)
          }
        >
          <Field
            label="Group name"
            value={name}
            placeholder="e.g. My Team"
            onChange={setName}
          />

          <Button
            variant="primary"
            style={{
              width: "100%",
            }}
            onClick={() => {
              if (!name.trim()) {
                notify(
                  "Enter a group name"
                );
                return;
              }

              setShowCreate(false);
              setName("");
              notify(
                `Group "${name.trim()}" created`
              );
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
  const [create, setCreate] =
    useState(false);

  return (
    <div>
      <PageHeader
        title="Communities"
        description="Organize people around topics, interests and projects."
        button={
          <Button
            variant="primary"
            onClick={() =>
              setCreate(true)
            }
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
          onClick={() =>
            notify(
              "Community discovery opened"
            )
          }
        />

        <LargeCard
          icon="◆"
          title="Project Communities"
          description="Connect communities to projects."
          meta="Collaboration"
          onClick={() =>
            notify(
              "Project communities opened"
            )
          }
        />

        <LargeCard
          icon="H"
          title="THE HEXA GROUP"
          description="The default HEXA community space."
          meta="Everyone starts here"
          onClick={() =>
            notify(
              "THE HEXA GROUP opened"
            )
          }
        />
      </div>

      {create && (
        <Modal
          title="Create Community"
          onClose={() =>
            setCreate(false)
          }
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
            style={{
              width: "100%",
            }}
            onClick={() => {
              setCreate(false);
              notify(
                "Community created"
              );
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

function Status({
  profile,
  notify,
}) {
  const [feed, setFeed] =
    useState("For You");

  const [create, setCreate] =
    useState(false);

  const [liked, setLiked] =
    useState(false);

  const [comment, setComment] =
    useState("");

  const [comments, setComments] =
    useState([]);

  function postComment() {
    if (!comment.trim()) return;

    setComments((x) => [
      ...x,
      {
        id: Date.now(),
        text: comment.trim(),
        author:
          profile.display_name,
      },
    ]);

    setComment("");
  }

  return (
    <div>
      <PageHeader
        title="Status"
        description="A social feed for short-form updates, photos and videos."
        button={
          <Button
            variant="primary"
            onClick={() =>
              setCreate(true)
            }
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
            {FEED_TYPES.map(
              (type) => (
                <button
                  key={type.name}
                  onClick={() =>
                    setFeed(
                      type.name
                    )
                  }
                  style={{
                    flexShrink: 0,
                    border:
                      feed ===
                      type.name
                        ? "1px solid var(--accent)"
                        : "1px solid var(--border)",
                    background:
                      feed ===
                      type.name
                        ? "color-mix(in srgb,var(--accent) 12%,transparent)"
                        : "var(--panel)",
                    color:
                      "var(--text)",
                    borderRadius: 13,
                    padding:
                      "10px 14px",
                    cursor:
                      "pointer",
                    fontWeight: 750,
                  }}
                >
                  {type.icon}{" "}
                  {type.name}
                </button>
              )
            )}
          </div>

          <div
            style={{
              background:
                "var(--panel)",
              border:
                "1px solid var(--border)",
              borderRadius: 22,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: 390,
                display: "grid",
                placeItems:
                  "center",
                background:
                  "linear-gradient(145deg,#111827,color-mix(in srgb,var(--accent) 30%,#111827))",
                position:
                  "relative",
              }}
            >
              <div
                style={{
                  textAlign:
                    "center",
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
                    color:
                      "rgba(255,255,255,.65)",
                    marginTop: 7,
                  }}
                >
                  Short-form HEXA
                  status content
                  appears here.
                </div>
              </div>
            </div>

            <div
              style={{
                padding: 18,
              }}
            >
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems:
                    "center",
                }}
              >
                <Avatar
                  user={profile}
                  size={40}
                />

                <div
                  style={{
                    flex: 1,
                  }}
                >
                  <b>
                    {profile.display_name}
                  </b>

                  <div
                    style={{
                      color:
                        "var(--muted)",
                      fontSize: 11,
                    }}
                  >
                    Just now · Public
                  </div>
                </div>
              </div>

              <p
                style={{
                  lineHeight: 1.6,
                }}
              >
                Building the future
                inside HEXA. 🚀
              </p>

              <div
                style={{
                  display:
                    "flex",
                  gap: 8,
                  borderTop:
                    "1px solid var(--border)",
                  paddingTop: 12,
                }}
              >
                <Button
                  onClick={() =>
                    setLiked(
                      !liked
                    )
                  }
                  style={{
                    color: liked
                      ? "var(--accent)"
                      : "var(--muted)",
                  }}
                >
                  {liked
                    ? "♥ Liked"
                    : "♡ Like"}
                </Button>

                <Button
                  onClick={() =>
                    document
                      .getElementById(
                        "status-comment"
                      )
                      ?.focus()
                  }
                >
                  ♡ Comment
                </Button>

                <Button
                  onClick={() =>
                    notify(
                      "Status shared"
                    )
                  }
                >
                  ↗ Share
                </Button>
              </div>

              <div
                style={{
                  marginTop: 15,
                }}
              >
                {comments.map(
                  (item) => (
                    <div
                      key={item.id}
                      style={{
                        padding: 10,
                        background:
                          "var(--panel2)",
                        borderRadius: 10,
                        marginBottom: 6,
                      }}
                    >
                      <b
                        style={{
                          fontSize: 11,
                        }}
                      >
                        {item.author}
                      </b>

                      <div
                        style={{
                          marginTop: 3,
                        }}
                      >
                        {item.text}
                      </div>
                    </div>
                  )
                )}

                <div
                  style={{
                    display:
                      "flex",
                    gap: 8,
                    marginTop: 10,
                  }}
                >
                  <input
                    id="status-comment"
                    value={comment}
                    onChange={(e) =>
                      setComment(
                        e.target.value
                      )
                    }
                    placeholder="Write a comment..."
                    style={{
                      flex: 1,
                      minWidth: 0,
                      padding: 11,
                      borderRadius: 11,
                      background:
                        "var(--panel2)",
                      color:
                        "var(--text)",
                      border:
                        "1px solid var(--border)",
                    }}
                  />

                  <Button
                    onClick={
                      postComment
                    }
                  >
                    Post
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            background:
              "var(--panel)",
            border:
              "1px solid var(--border)",
            borderRadius: 18,
            padding: 18,
          }}
        >
          <b>Feed types</b>

          <div
            style={{
              marginTop: 13,
            }}
          >
            {FEED_TYPES.map(
              (x) => (
                <div
                  key={x.name}
                  style={{
                    padding:
                      "11px 0",
                    borderBottom:
                      "1px solid var(--border)",
                  }}
                >
                  <div
                    style={{
                      fontWeight: 800,
                    }}
                  >
                    {x.icon}{" "}
                    {x.name}
                  </div>

                  <div
                    style={{
                      color:
                        "var(--muted)",
                      fontSize: 11,
                      lineHeight: 1.4,
                      marginTop: 4,
                    }}
                  >
                    {
                      x.description
                    }
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      </div>

      {create && (
        <Modal
          title="Create Status"
          onClose={() =>
            setCreate(false)
          }
        >
          <div
            style={{
              border:
                "1px dashed var(--border)",
              borderRadius: 16,
              padding: 25,
              textAlign:
                "center",
              marginBottom: 14,
            }}
          >
            <div
              style={{
                fontSize: 35,
              }}
            >
              ＋
            </div>

            <div
              style={{
                fontWeight: 800,
              }}
            >
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
            style={{
              width: "100%",
            }}
            onClick={() => {
              setCreate(false);
              notify(
                "Status published"
              );
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
  const [notes, setNotes] =
    useState(() =>
      readStorage(
        STORAGE.notes,
        [
          {
            id: 1,
            title:
              "Welcome to HEXA",
            body:
              "Your notes workspace.",
          },
        ]
      )
    );

  const [selectedId, setSelectedId] =
    useState(
      () =>
        notes[0]?.id || 1
    );

  const selected =
    notes.find(
      (x) =>
        x.id === selectedId
    ) || notes[0];

  useEffect(() => {
    writeStorage(
      STORAGE.notes,
      notes
    );
  }, [notes]);

  function createNote() {
    const note = {
      id: Date.now(),
      title: "Untitled note",
      body: "",
    };

    setNotes((x) => [
      ...x,
      note,
    ]);

    setSelectedId(note.id);

    notify("New note created");
  }

  function updateNote(field, value) {
    setNotes((old) =>
      old.map((note) =>
        note.id ===
        selected.id
          ? {
              ...note,
              [field]: value,
            }
          : note
      )
    );
  }

  if (!selected) {
    return (
      <div>
        <PageHeader
          title="Notes"
          description="A focused place for ideas and quick thoughts."
          button={
            <Button
              variant="primary"
              onClick={createNote}
            >
              + New Note
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Notes"
        description="A focused place for ideas, drafts and quick thoughts."
        button={
          <Button
            variant="primary"
            onClick={createNote}
          >
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
          border:
            "1px solid var(--border)",
          borderRadius: 20,
          overflow: "hidden",
          background:
            "var(--panel)",
        }}
      >
        <div
          style={{
            borderRight:
              "1px solid var(--border)",
            padding: 12,
            overflowY:
              "auto",
          }}
        >
          {notes.map(
            (note) => (
              <button
                key={note.id}
                onClick={() =>
                  setSelectedId(
                    note.id
                  )
                }
                style={{
                  width: "100%",
                  textAlign:
                    "left",
                  border: 0,
                  background:
                    selected.id ===
                    note.id
                      ? "var(--panel2)"
                      : "transparent",
                  color:
                    "var(--text)",
                  padding: 12,
                  borderRadius: 11,
                  cursor:
                    "pointer",
                  marginBottom: 4,
                }}
              >
                <b>
                  {note.title ||
                    "Untitled"}
                </b>

                <div
                  style={{
                    color:
                      "var(--muted)",
                    fontSize: 11,
                    marginTop: 5,
                    overflow:
                      "hidden",
                    textOverflow:
                      "ellipsis",
                    whiteSpace:
                      "nowrap",
                  }}
                >
                  {note.body ||
                    "Empty note"}
                </div>
              </button>
            )
          )}
        </div>

        <div
          style={{
            padding: 28,
          }}
        >
          <input
            value={selected.title}
            onChange={(e) =>
              updateNote(
                "title",
                e.target.value
              )
            }
            style={{
              width: "100%",
              boxSizing:
                "border-box",
              border: 0,
              outline: 0,
              background:
                "transparent",
              color:
                "var(--text)",
              fontSize: 30,
              fontWeight: 900,
              marginBottom: 20,
            }}
          />

          <textarea
            value={selected.body}
            onChange={(e) =>
              updateNote(
                "body",
                e.target.value
              )
            }
            placeholder="Start writing..."
            style={{
              width: "100%",
              minHeight: 420,
              resize:
                "vertical",
              boxSizing:
                "border-box",
              border: 0,
              outline: 0,
              background:
                "transparent",
              color:
                "var(--text)",
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
  const [doc, setDoc] =
    useState("");

  const [title, setTitle] =
    useState("");

  const tools = [
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
  ];

  return (
    <div>
      <PageHeader
        title="Documents"
        description="Create polished documents inside your HEXA workspace."
        button={
          <Button
            variant="primary"
            onClick={() =>
              notify(
                "New document created"
              )
            }
          >
            + New Document
          </Button>
        }
      />

      <div
        style={{
          background:
            "var(--panel)",
          border:
            "1px solid var(--border)",
          borderRadius: 20,
          padding: 25,
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 7,
            flexWrap:
              "wrap",
            paddingBottom: 15,
            borderBottom:
              "1px solid var(--border)",
          }}
        >
          {tools.map(
            (x) => (
              <Button
                key={x}
                onClick={() =>
                  notify(
                    `${x} tool selected`
                  )
                }
              >
                {x}
              </Button>
            )
          )}
        </div>

        <input
          value={title}
          onChange={(e) =>
            setTitle(
              e.target.value
            )
          }
          placeholder="Document title"
          style={{
            width: "100%",
            boxSizing:
              "border-box",
            border: 0,
            outline: 0,
            background:
              "transparent",
            color:
              "var(--text)",
            fontSize: 32,
            fontWeight: 900,
            margin:
              "25px 0",
          }}
        />

        <textarea
          value={doc}
          onChange={(e) =>
            setDoc(
              e.target.value
            )
          }
          placeholder="Start your document..."
          style={{
            width: "100%",
            minHeight: 500,
            border: 0,
            outline: 0,
            resize:
              "vertical",
            background:
              "transparent",
            color:
              "var(--text)",
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
  const [create, setCreate] =
    useState(false);

  return (
    <div>
      <PageHeader
        title="Projects"
        description="Build, organize and track anything."
        button={
          <Button
            variant="primary"
            onClick={() =>
              setCreate(true)
            }
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
          onClick={() =>
            setCreate(true)
          }
        />

        <LargeCard
          icon="</>"
          title="Development"
          description="Connect code and development tools."
          meta="VS Code · Unreal · Unity · Godot"
          onClick={() =>
            notify(
              "Development project opened"
            )
          }
        />
      </div>

      {create && (
        <Modal
          title="Create Project"
          onClose={() =>
            setCreate(false)
          }
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
            style={{
              width: "100%",
            }}
            onClick={() => {
              setCreate(false);
              notify(
                "Project created"
              );
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
  const [input, setInput] =
    useState("");

  const [messages, setMessages] =
    useState([
      {
        id: 1,
        from: "Kora",
        text:
          "Hi. I'm Kora, the HEXA AI workspace assistant.",
      },
    ]);

  function send() {
    if (!input.trim())
      return;

    const text =
      input.trim();

    setMessages((old) => [
      ...old,
      {
        id: Date.now(),
        from: "You",
        text,
      },
    ]);

    setInput("");

    setTimeout(() => {
      setMessages((old) => [
        ...old,
        {
          id:
            Date.now() + 1,
          from: "Kora",
          text:
            "I received that. Connect your AI provider to enable live model responses.",
        },
      ]);
    }, 400);
  }

  return (
    <div>
      <PageHeader
        title="Kora AI"
        description="HEXA's AI workspace."
        button={
          <Button
            onClick={() =>
              notify(
                "New Kora conversation"
              )
            }
          >
            + New conversation
          </Button>
        }
      />

      <div
        style={{
          maxWidth: 900,
          margin: "0 auto",
          border:
            "1px solid var(--border)",
          borderRadius: 22,
          background:
            "var(--panel)",
          minHeight: 650,
          display: "flex",
          flexDirection:
            "column",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: 18,
            borderBottom:
              "1px solid var(--border)",
            display: "flex",
            gap: 12,
            alignItems:
              "center",
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              display: "grid",
              placeItems:
                "center",
              background:
                "var(--accent)",
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
                color:
                  "var(--muted)",
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
            overflowY:
              "auto",
          }}
        >
          {messages.map(
            (m) => (
              <div
                key={m.id}
                style={{
                  marginBottom: 15,
                  display:
                    "flex",
                  justifyContent:
                    m.from ===
                    "You"
                      ? "flex-end"
                      : "flex-start",
                }}
              >
                <div
                  style={{
                    maxWidth:
                      "75%",
                    background:
                      m.from ===
                      "You"
                        ? "var(--accent)"
                        : "var(--panel2)",
                    color:
                      m.from ===
                      "You"
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
            )
          )}
        </div>

        <div
          style={{
            padding: 13,
            borderTop:
              "1px solid var(--border)",
            display: "flex",
            gap: 8,
          }}
        >
          <input
            value={input}
            onChange={(e) =>
              setInput(
                e.target.value
              )
            }
            onKeyDown={(e) => {
              if (
                e.key ===
                "Enter"
              ) {
                send();
              }
            }}
            placeholder="Ask Kora..."
            style={{
              flex: 1,
              minWidth: 0,
              padding: 12,
              borderRadius: 12,
              border:
                "1px solid var(--border)",
              background:
                "var(--panel2)",
              color:
                "var(--text)",
            }}
          />

          <Button
            variant="primary"
            onClick={send}
          >
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

function DeveloperHub({
  notify,
}) {
  const tools = [
    {
      name: "VS Code",
      icon: "</>",
      description:
        "Code and app development",
      protocol:
        "vscode://",
    },
    {
      name: "Unreal Engine",
      icon: "U",
      description:
        "AAA game development",
      protocol:
        "unreal://",
    },
    {
      name: "Unity Hub",
      icon: "◇",
      description:
        "Unity game development",
      protocol:
        "unityhub://",
    },
    {
      name: "Godot",
      icon: "G",
      description:
        "Open-source game engine",
      protocol:
        "godot://",
    },
  ];

  function launch(tool) {
    try {
      window.location.href =
        tool.protocol;

      notify(
        `Attempting to open ${tool.name}`
      );
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
        {tools.map(
          (tool) => (
            <div
              key={tool.name}
              style={{
                background:
                  "var(--panel)",
                border:
                  "1px solid var(--border)",
                borderRadius: 20,
                padding: 20,
              }}
            >
              <div
                style={{
                  width: 58,
                  height: 58,
                  borderRadius: 17,
                  background:
                    "var(--panel2)",
                  display: "grid",
                  placeItems:
                    "center",
                  color:
                    "var(--accent)",
                  fontWeight: 950,
                  fontSize: 20,
                  marginBottom: 16,
                }}
              >
                {tool.icon}
              </div>

              <div
                style={{
                  fontSize: 18,
                  fontWeight: 900,
                }}
              >
                {tool.name}
              </div>

              <div
                style={{
                  color:
                    "var(--muted)",
                  margin:
                    "7px 0 18px",
                }}
              >
                {
                  tool.description
                }
              </div>

              <Button
                variant="primary"
                onClick={() =>
                  launch(tool)
                }
                style={{
                  width:
                    "100%",
                }}
              >
                Open{" "}
                {tool.name}
              </Button>
            </div>
          )
        )}
      </div>
    </div>
  );
}

/* =========================================================
   PROFILE
   ========================================================= */

function Profile({
  profile,
  setProfile,
  notify,
}) {
  const file =
    useRef(null);

  function update(field, value) {
    setProfile((old) => ({
      ...old,
      [field]: value,
    }));
  }

  function choosePicture(e) {
    const selected =
      e.target.files?.[0];

    if (!selected) return;

    const url =
      URL.createObjectURL(
        selected
      );

    update(
      "avatar_url",
      url
    );

    notify(
      "Profile picture updated"
    );
  }

  return (
    <div>
      <PageHeader
        title="Profile"
        description="Manage your HEXA identity."
      />

      <div
        style={{
          maxWidth: 720,
          background:
            "var(--panel)",
          border:
            "1px solid var(--border)",
          borderRadius: 22,
          padding: 25,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems:
              "center",
            gap: 18,
            marginBottom: 25,
          }}
        >
          <Avatar
            user={profile}
            size={90}
          />

          <div>
            <h2
              style={{
                margin: 0,
              }}
            >
              {
                profile.display_name
              }
            </h2>

            <div
              style={{
                color:
                  "var(--muted)",
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
          onChange={
            choosePicture
          }
        />

        <Button
          onClick={() =>
            file.current?.click()
          }
          style={{
            marginBottom: 20,
          }}
        >
          Change profile picture
        </Button>

        <Field
          label="Display name"
          value={
            profile.display_name
          }
          onChange={(value) =>
            update(
              "display_name",
              value
            )
          }
        />

        <Field
          label="Username"
          value={
            profile.username
          }
          onChange={(value) =>
            update(
              "username",
              value.replace(
                /^@/,
                ""
              )
            )
          }
        />

        <Button
          variant="primary"
          onClick={() =>
            notify(
              "Profile saved"
            )
          }
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
          <div
            style={{
              display: "flex",
              gap: 8,
            }}
          >
            {[
              "dark",
              "white",
            ].map((x) => (
              <Button
                key={x}
                variant={
                  theme === x
                    ? "primary"
                    : "secondary"
                }
                onClick={() =>
                  setTheme(x)
                }
              >
                {x === "dark"
                  ? "🌙 Dark"
                  : "☀ White"}
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
              display:
                "flex",
              gap: 8,
              flexWrap:
                "wrap",
            }}
          >
            {Object.keys(
              ACCENTS
            ).map((x) => (
              <button
                key={x}
                onClick={() =>
                  setAccent(x)
                }
                style={{
                  border:
                    accent === x
                      ? `2px solid ${ACCENTS[x]}`
                      : "1px solid var(--border)",
                  background:
                    "var(--panel2)",
                  color:
                    "var(--text)",
                  borderRadius: 12,
                  padding:
                    "9px 13px",
                  cursor:
                    "pointer",
                }}
              >
                {x}
              </button>
            ))}
          </div>
        </SettingCard>

        <SettingCard
          title="Messaging"
          description="HEXA keeps offline messages locally queued until connectivity returns."
        >
          <div
            style={{
              padding: 13,
              borderRadius: 12,
              background:
                "var(--panel2)",
            }}
          >
            🔄 Offline message
            synchronization
          </div>
        </SettingCard>

        <SettingCard
          title="Chat themes"
          description="Individual HEXA conversations can have their own visual theme."
        >
          <div
            style={{
              padding: 13,
              borderRadius: 12,
              background:
                "var(--panel2)",
            }}
          >
            🎨 Per-chat themes
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
              background:
                "var(--panel2)",
            }}
          >
            🔒 Encryption
            architecture
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
              notify(
                "Signed out"
              );
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

function Button({
  children,
  variant = "secondary",
  style = {},
  ...props
}) {
  const variants = {
    primary: {
      background:
        "var(--accent)",
      color: "white",
      border:
        "1px solid var(--accent)",
    },

    danger: {
      background:
        "rgba(239,68,68,.12)",
      color: "#ef4444",
      border:
        "1px solid rgba(239,68,68,.3)",
    },

    secondary: {
      background:
        "var(--panel2)",
      color:
        "var(--text)",
      border:
        "1px solid var(--border)",
    },
  };

  return (
    <button
      {...props}
      style={{
        ...variants[
          variants[variant]
            ? variant
            : "secondary"
        ],
        borderRadius: 11,
        padding:
          "9px 12px",
        cursor:
          "pointer",
        fontWeight: 750,
        fontSize: 12,
        ...style,
      }}
    >
      {children}
    </button>
  );
}

function PageHeader({
  title,
  description,
  button,
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent:
          "space-between",
        alignItems:
          "flex-end",
        gap: 20,
        flexWrap:
          "wrap",
        marginBottom: 25,
      }}
    >
      <div>
        <h1
          style={{
            fontSize: 34,
            letterSpacing:
              -1.5,
            margin: 0,
          }}
        >
          {title}
        </h1>

        <p
          style={{
            color:
              "var(--muted)",
            margin:
              "7px 0 0",
          }}
        >
          {description}
        </p>
      </div>

      {button}
    </div>
  );
}

function SectionTitle({
  title,
  action,
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent:
          "space-between",
        alignItems:
          "center",
        marginBottom: 13,
      }}
    >
      <h2
        style={{
          margin: 0,
          fontSize: 18,
        }}
      >
        {title}
      </h2>

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
        background:
          "var(--panel)",
        color:
          "var(--text)",
        border:
          "1px solid var(--border)",
        borderRadius: 20,
        padding: 20,
        textAlign:
          "left",
        cursor:
          "pointer",
      }}
    >
      <div
        style={{
          width: 50,
          height: 50,
          display: "grid",
          placeItems:
            "center",
          borderRadius: 15,
          background:
            "var(--panel2)",
          color:
            "var(--accent)",
          fontWeight: 950,
          fontSize: 19,
          marginBottom: 16,
        }}
      >
        {icon}
      </div>

      <div
        style={{
          fontSize: 17,
          fontWeight: 900,
        }}
      >
        {title}
      </div>

      <div
        style={{
          color:
            "var(--muted)",
          margin:
            "7px 0 15px",
          lineHeight: 1.5,
          fontSize: 13,
        }}
      >
        {description}
      </div>

      <div
        style={{
          fontSize: 11,
          color:
            "var(--accent)",
          fontWeight: 800,
        }}
      >
        {meta}
      </div>
    </button>
  );
}

function SettingCard({
  title,
  description,
  children,
}) {
  return (
    <div
      style={{
        background:
          "var(--panel)",
        border:
          "1px solid var(--border)",
        borderRadius: 18,
        padding: 20,
      }}
    >
      <div
        style={{
          fontWeight: 900,
        }}
      >
        {title}
      </div>

      <div
        style={{
          color:
            "var(--muted)",
          fontSize: 12,
          margin:
            "5px 0 15px",
          lineHeight: 1.5,
        }}
      >
        {description}
      </div>

      {children}
    </div>
  );
}

function Field({
  label,
  value,
  placeholder,
  onChange,
}) {
  return (
    <label
      style={{
        display:
          "block",
        marginBottom: 14,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 800,
          marginBottom: 6,
          color:
            "var(--muted)",
        }}
      >
        {label}
      </div>

      <input
        value={value ?? ""}
        placeholder={
          placeholder
        }
        onChange={(e) =>
          onChange(
            e.target.value
          )
        }
        style={{
          width: "100%",
          boxSizing:
            "border-box",
          padding:
            "11px 12px",
          borderRadius: 11,
          border:
            "1px solid var(--border)",
          background:
            "var(--panel2)",
          color:
            "var(--text)",
          outline: "none",
        }}
      />
    </label>
  );
}

function Modal({
  title,
  onClose,
  children,
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background:
          "rgba(0,0,0,.65)",
        backdropFilter:
          "blur(10px)",
        display: "grid",
        placeItems:
          "center",
        padding: 20,
        zIndex: 100,
      }}
      onMouseDown={(e) => {
        if (
          e.target ===
          e.currentTarget
        ) {
          onClose();
        }
      }}
    >
      <div
        style={{
          width:
            "min(480px,100%)",
          maxHeight:
            "90vh",
          overflowY:
            "auto",
          background:
            "var(--panel)",
          border:
            "1px solid var(--border)",
          borderRadius: 22,
          padding: 22,
          boxShadow:
            "0 30px 100px rgba(0,0,0,.45)",
        }}
      >
        <div
          style={{
            display:
              "flex",
            justifyContent:
              "space-between",
            alignItems:
              "center",
            marginBottom: 20,
          }}
        >
          <h2
            style={{
              margin: 0,
            }}
          >
            {title}
          </h2>

          <Button
            onClick={onClose}
          >
            ×
          </Button>
        </div>

        {children}
      </div>
    </div>
  );
}

function Avatar({
  user,
  size = 40,
}) {
  const name =
    user?.display_name ||
    user?.name ||
    "H";

  const avatar =
    user?.avatar_url ||
    user?.avatar ||
    "";

  if (avatar) {
    return (
      <img
        src={avatar}
        alt={name}
        style={{
          width: size,
          height: size,
          borderRadius:
            Math.round(
              size * 0.32
            ),
          objectFit:
            "cover",
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
        borderRadius:
          Math.round(
            size * 0.32
          ),
        background:
          "linear-gradient(135deg,var(--accent),color-mix(in srgb,var(--accent) 45%,#111))",
        color: "white",
        display: "grid",
        placeItems:
          "center",
        fontWeight: 950,
        fontSize:
          size * 0.38,
        flexShrink: 0,
      }}
    >
      {name
        .trim()
        .charAt(0)
        .toUpperCase()}
    </div>
  );
}