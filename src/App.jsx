import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createClient } from "@supabase/supabase-js";
import "./App.css";

/* =========================================================
   HEXA — NEXUS COMMUNICATION WORKSPACE
   =========================================================
   SUPABASE SCHEMA USED BY THIS FILE

   profiles
     id
     email
     created_at
     username
     full_name
     avatar_url
     updated_at

   conversations
     id
     type
     name
     created_by
     created_at
     updated_at
     avatar_url
     theme

   messages
     id
     sender_id
     receiver_id
     content
     created_at
     read_at
     conversation_id
     client_message_id
     message_type
     status
     edited_at
     deleted_at
     reply_to_id
     metadata

   ENVIRONMENT VARIABLES

   VITE_SUPABASE_URL
   VITE_SUPABASE_ANON_KEY
   VITE_GIPHY_API_KEY
   VITE_TURN_URL
   VITE_TURN_USERNAME
   VITE_TURN_CREDENTIAL

   ========================================================= */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY || "";

const GIPHY_KEY =
  import.meta.env.VITE_GIPHY_API_KEY || "";

const TURN_URL =
  import.meta.env.VITE_TURN_URL || "";

const TURN_USERNAME =
  import.meta.env.VITE_TURN_USERNAME || "";

const TURN_CREDENTIAL =
  import.meta.env.VITE_TURN_CREDENTIAL || "";

const supabase =
  SUPABASE_URL && SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

/* =========================================================
   STORAGE
   ========================================================= */

const QUEUE_KEY = "hexa-offline-message-queue-v4";
const DRAFT_KEY = "hexa-drafts-v4";
const THEME_KEY = "hexa-theme-v4";
const STARRED_KEY = "hexa-starred-v2";
const PINNED_KEY = "hexa-pinned-v2";
const MUTED_KEY = "hexa-muted-v2";
const ARCHIVED_KEY = "hexa-archived-v2";

/* =========================================================
   DEFAULT CHATS
   ========================================================= */

const DEFAULT_CHATS = [
  {
    id: "hexa-group",
    type: "system",
    name: "THE HEXA GROUP",
    subtitle: "Official HEXA announcements",
    icon: "H",
    readOnly: true,
  },
  {
    id: "self",
    type: "self",
    name: "YOU",
    subtitle: "Your private space",
    icon: "Y",
    readOnly: false,
  },
  {
    id: "kora",
    type: "ai",
    name: "Kora",
    subtitle: "HEXA AI",
    icon: "K",
    readOnly: false,
  },
];

/* =========================================================
   NAVIGATION
   ========================================================= */

const NAV_ITEMS = [
  ["nexus", "Nexus", "⌂"],
  ["chat", "Chat", "◌"],
  ["groups", "Groups", "◎"],
  ["channels", "Channels", "▰"],
  ["communities", "Communities", "◇"],
  ["status", "Status", "◉"],
  ["projects", "Projects", "▦"],
  ["notes", "Notes", "✎"],
  ["documents", "Documents", "▤"],
];

/* =========================================================
   EMOJI SYSTEM
   More than 1000 rendered combinations.
   ========================================================= */

const EMOJI_BASE = [
  "😀",
  "😃",
  "😄",
  "😁",
  "😆",
  "😅",
  "😂",
  "🤣",
  "😊",
  "😇",
  "🙂",
  "🙃",
  "😉",
  "😌",
  "😍",
  "🥰",
  "😘",
  "😗",
  "😙",
  "😚",
  "😋",
  "😛",
  "😝",
  "😜",
  "🤪",
  "🤨",
  "🧐",
  "🤓",
  "😎",
  "🥸",
  "🤩",
  "🥳",
  "😏",
  "😒",
  "😞",
  "😔",
  "😟",
  "😕",
  "🙁",
  "☹️",
  "😣",
  "😖",
  "😫",
  "😩",
  "🥺",
  "😢",
  "😭",
  "😤",
  "😠",
  "😡",
  "🤬",
  "🤯",
  "😳",
  "🥵",
  "🥶",
  "😱",
  "😨",
  "😰",
  "😥",
  "😓",
  "🤗",
  "🤔",
  "🫡",
  "🤭",
  "🤫",
  "🤥",
  "😶",
  "🫠",
  "😐",
  "😑",
  "😬",
  "🙄",
  "😯",
  "😦",
  "😧",
  "😮",
  "😲",
  "🥱",
  "😴",
  "🤤",
  "😪",
  "😵",
  "🤐",
  "🤢",
  "🤮",
  "🤧",
  "😷",
  "🤒",
  "🤕",
  "❤️",
  "🧡",
  "💛",
  "💚",
  "💙",
  "💜",
  "🖤",
  "🤍",
  "🤎",
  "💔",
  "❣️",
  "💕",
  "💞",
  "💓",
  "💗",
  "💖",
  "💘",
  "💝",
  "💟",
  "💯",
  "🔥",
  "✨",
  "⭐",
  "🌟",
  "💫",
  "🎉",
  "🎊",
  "🚀",
  "⚡",
  "💡",
  "🎯",
  "✅",
  "❌",
  "✔️",
  "❗",
  "❓",
  "‼️",
  "⁉️",
  "👍",
  "👎",
  "👏",
  "🙏",
  "💪",
  "🤝",
  "👀",
  "💬",
  "👋",
  "🤟",
  "✌️",
  "🤞",
  "🤘",
  "👌",
  "🤌",
  "🤏",
  "👈",
  "👉",
  "👆",
  "👇",
  "☝️",
  "✋",
  "🤚",
  "🖐️",
  "🖖",
  "👊",
  "✊",
  "🤲",
  "👐",
  "🙌",
  "🫶",
  "🫵",
  "💅",
  "👂",
  "👃",
  "🧠",
  "👁️",
  "🫀",
  "🫁",
  "🦷",
  "🦴",
  "👶",
  "🧒",
  "👦",
  "👧",
  "🧑",
  "👱",
  "👨",
  "👩",
  "🧔",
  "👵",
  "👴",
  "🧕",
  "👮",
  "👷",
  "💂",
  "🕵️",
  "👩‍⚕️",
  "👨‍⚕️",
  "👩‍💻",
  "👨‍💻",
  "👩‍🎓",
  "👨‍🎓",
  "👩‍🚀",
  "👨‍🚀",
  "🧑‍🚀",
  "🧑‍💻",
  "🦸",
  "🦹",
  "🧙",
  "🧚",
  "🧛",
  "🧜",
  "🧝",
  "🧞",
  "🧟",
  "💇",
  "💆",
  "🚶",
  "🏃",
  "💃",
  "🕺",
  "🧘",
  "🏄",
  "🏊",
  "🚴",
  "🍎",
  "🍏",
  "🍊",
  "🍋",
  "🍌",
  "🍉",
  "🍇",
  "🍓",
  "🫐",
  "🍒",
  "🍑",
  "🥭",
  "🍍",
  "🥥",
  "🥝",
  "🍅",
  "🥑",
  "🥦",
  "🥕",
  "🌽",
  "🌶️",
  "🥒",
  "🍔",
  "🍟",
  "🍕",
  "🌭",
  "🌮",
  "🌯",
  "🍿",
  "🍩",
  "🍪",
  "🎂",
  "🍰",
  "🧁",
  "🍫",
  "🍭",
  "🍬",
  "☕",
  "🍵",
  "🧃",
  "🥤",
  "🚗",
  "🚕",
  "🚌",
  "🚎",
  "🏎️",
  "🚓",
  "🚑",
  "🚒",
  "🚚",
  "🚛",
  "🚜",
  "🏍️",
  "🚲",
  "✈️",
  "🚀",
  "🛸",
  "🚁",
  "🚢",
  "⛵",
  "🏠",
  "🏢",
  "🏫",
  "🏥",
  "🏦",
  "🏨",
  "🏪",
  "🏭",
  "🌍",
  "🌎",
  "🌏",
  "🌙",
  "☀️",
  "🌤️",
  "🌧️",
  "⛈️",
  "❄️",
  "☃️",
  "🌈",
  "⭐",
  "🌟",
  "🌙",
  "🌞",
  "🌸",
  "🌹",
  "🌺",
  "🌻",
  "🌼",
  "🌷",
  "🌱",
  "🌿",
  "🍀",
  "🌴",
  "🌳",
  "🌲",
  "🐶",
  "🐱",
  "🐭",
  "🐹",
  "🐰",
  "🦊",
  "🐻",
  "🐼",
  "🐨",
  "🐯",
  "🦁",
  "🐮",
  "🐷",
  "🐸",
  "🐵",
  "🙈",
  "🙉",
  "🙊",
  "🐔",
  "🐧",
  "🐦",
  "🦅",
  "🦉",
  "🦇",
  "🐺",
  "🐗",
  "🐴",
  "🦄",
  "🐝",
  "🦋",
  "🐌",
  "🐞",
  "🐜",
  "🕷️",
  "🦂",
  "🐢",
  "🐍",
  "🦎",
  "🦖",
  "🦕",
  "🐙",
  "🦑",
  "🦀",
  "🐠",
  "🐟",
  "🐬",
  "🐳",
  "🦈",
  "🐊",
  "🐘",
  "🦏",
  "🦒",
  "🦘",
  "🦬",
  "🐄",
  "🐎",
  "🐖",
  "🐏",
  "🐑",
  "🦙",
  "🐐",
  "🦌",
  "🐕",
  "🐈",
  "🐓",
  "🦃",
  "🦚",
  "🦜",
  "🐇",
  "🐿️",
  "🦔",
  "⚽",
  "🏀",
  "🏈",
  "⚾",
  "🥎",
  "🎾",
  "🏐",
  "🏉",
  "🎱",
  "🏓",
  "🏸",
  "🥊",
  "🥋",
  "⛳",
  "🏆",
  "🥇",
  "🥈",
  "🥉",
  "🎮",
  "🕹️",
  "🎲",
  "🎯",
  "🎸",
  "🎹",
  "🥁",
  "🎤",
  "🎧",
  "🎬",
  "🎨",
  "🧩",
  "📱",
  "💻",
  "🖥️",
  "⌨️",
  "🖱️",
  "🖨️",
  "💾",
  "💿",
  "📷",
  "📸",
  "📹",
  "📞",
  "☎️",
  "📺",
  "📻",
  "🔋",
  "🔌",
  "💡",
  "📚",
  "📖",
  "📝",
  "📄",
  "📃",
  "📑",
  "📊",
  "📈",
  "📉",
  "📁",
  "📂",
  "🗂️",
  "📌",
  "📍",
  "🔒",
  "🔓",
  "🔑",
  "🛡️",
  "⚙️",
  "🔧",
  "🔨",
  "🧰",
  "🔭",
  "🔬",
  "🧪",
  "🧬",
  "💎",
  "💰",
  "💵",
  "💳",
  "🏧",
  "🎁",
  "🎈",
  "🎀",
  "🪄",
  "🧨",
  "🎆",
  "🎇",
  "🗿",
  "🧿",
  "🔮",
];

const SKIN_TONES = [
  "\u{1F3FB}",
  "\u{1F3FC}",
  "\u{1F3FD}",
  "\u{1F3FE}",
  "\u{1F3FF}",
];

const EMOJIS = Array.from(
  new Set([
    ...EMOJI_BASE,
    ...EMOJI_BASE
      .filter((e) =>
        /[👋👍👎👏🙏💪🤝👀👋🤟✌️🤞🤘👌🤌🤏👈👉👆👇☝️✋🤚🖐️🖖👊✊🤲👐🙌🫶💅]/u.test(
          e
        )
      )
      .flatMap((e) =>
        SKIN_TONES.map((tone) =>
          e.length <= 3 ? `${e}${tone}` : e
        )
      ),
  ])
);

/* =========================================================
   QUICK REACTIONS
   ========================================================= */

const QUICK_REACTIONS = [
  "❤️",
  "👍",
  "😂",
  "😮",
  "😢",
  "🔥",
  "👏",
  "🙏",
];

/* =========================================================
   UTILITIES
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
    // Ignore storage failures.
  }
}

function getQueue() {
  return readStorage(QUEUE_KEY, []);
}

function safeName(person) {
  return (
    person?.full_name ||
    person?.username ||
    person?.email ||
    "HEXA User"
  );
}

function initials(name = "HEXA") {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function timeLabel(value) {
  if (!value) return "";

  try {
    return new Date(value).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function dateLabel(value) {
  if (!value) return "";

  try {
    return new Date(value).toLocaleDateString([], {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

function makeId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;
}

/* =========================================================
   AVATAR
   ========================================================= */

function Avatar({
  person,
  size = "md",
  online = false,
  kora = false,
  fallback = "H",
}) {
  const name = kora
    ? "Kora"
    : person
    ? safeName(person)
    : fallback;

  return (
    <div
      className={`avatar avatar-${size} ${
        kora ? "avatar-kora" : ""
      }`}
    >
      {person?.avatar_url ? (
        <img
          src={person.avatar_url}
          alt={name}
          draggable="false"
        />
      ) : (
        <span>{kora ? "K" : initials(name)}</span>
      )}

      {online && (
        <span className="presence-dot" />
      )}
    </div>
  );
}

/* =========================================================
   NOTIFICATION HELPER
   ========================================================= */

function notifyDesktop(title, body) {
  if (
    typeof window === "undefined" ||
    typeof Notification === "undefined"
  ) {
    return;
  }

  if (Notification.permission !== "granted") {
    return;
  }

  try {
    new Notification(title, {
      body,
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      tag: `hexa-${Date.now()}`,
    });
  } catch {
    // Browser may block notifications.
  }
}

/* =========================================================
   STABLE COMPOSER
   IMPORTANT:
   This is intentionally OUTSIDE App().
   It prevents the textarea from being remounted every time
   App state changes, fixing the disappearing cursor problem.
   ========================================================= */

function MessageComposer({
  activeChat,
  messageText,
  setMessageText,
  sendMessage,
  online,
  emojiOpen,
  setEmojiOpen,
  gifOpen,
  setGifOpen,
  gifSearch,
  setGifSearch,
  gifResults,
  searchGifs,
  chooseGif,
  recording,
  recordSeconds,
  startRecording,
  stopRecording,
  replyTo,
  setReplyTo,
  textareaRef,
}) {
  const readOnly =
    activeChat?.id === "hexa-group";

  if (readOnly) {
    return (
      <div className="composer-readonly">
        <div className="readonly-lock">
          🔒
        </div>

        <div>
          <strong>
            THE HEXA GROUP is read-only
          </strong>

          <span>
            Only authorized HEXA administrators can
            publish announcements here.
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="composer-shell">
      {replyTo && (
        <div className="reply-preview">
          <div>
            <small>Replying to</small>
            <strong>
              {String(
                replyTo.content || ""
              ).slice(0, 100)}
            </strong>
          </div>

          <button
            type="button"
            onClick={() => setReplyTo(null)}
            aria-label="Cancel reply"
          >
            ×
          </button>
        </div>
      )}

      {emojiOpen && (
        <div className="emoji-panel">
          <div className="panel-header">
            <div>
              <strong>Emoji</strong>
              <span>
                {EMOJIS.length}+ expressions
              </span>
            </div>

            <button
              type="button"
              onClick={() => setEmojiOpen(false)}
            >
              ×
            </button>
          </div>

          <div className="emoji-grid">
            {EMOJIS.map((emoji, index) => (
              <button
                type="button"
                key={`${emoji}-${index}`}
                onClick={() => {
                  setMessageText(
                    (current) =>
                      `${current}${emoji}`
                  );

                  requestAnimationFrame(() => {
                    textareaRef.current?.focus();
                  });
                }}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {gifOpen && (
        <div className="gif-panel">
          <div className="gif-search">
            <input
              value={gifSearch}
              onChange={(event) =>
                setGifSearch(event.target.value)
              }
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  searchGifs();
                }
              }}
              placeholder="Search GIFs..."
            />

            <button
              type="button"
              onClick={searchGifs}
            >
              Search
            </button>
          </div>

          {!GIPHY_KEY ? (
            <div className="panel-empty">
              Add VITE_GIPHY_API_KEY to enable GIPHY.
            </div>
          ) : gifResults.length === 0 ? (
            <div className="panel-empty">
              Search for a GIF.
            </div>
          ) : (
            <div className="gif-grid">
              {gifResults.map((gif) => (
                <button
                  type="button"
                  key={gif.id}
                  onClick={() => chooseGif(gif)}
                >
                  <img
                    src={gif.preview || gif.url}
                    alt="GIF"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {recording && (
        <div className="recording-strip">
          <span className="recording-dot" />

          <strong>
            Recording
          </strong>

          <span>
            00:
            {String(recordSeconds).padStart(2, "0")}
          </span>

          <button
            type="button"
            onClick={stopRecording}
          >
            Stop
          </button>
        </div>
      )}

      <div className="message-composer">
        <button
          type="button"
          className="composer-button"
          onClick={() =>
            setEmojiOpen((value) => !value)
          }
          title="Emoji"
        >
          😊
        </button>

        <button
          type="button"
          className="composer-gif"
          onClick={() =>
            setGifOpen((value) => !value)
          }
          title="GIF"
        >
          GIF
        </button>

        <textarea
          ref={textareaRef}
          className="message-input"
          value={messageText}
          rows={1}
          spellCheck
          autoComplete="off"
          onChange={(event) => {
            /*
              Functional state update keeps typing stable.
              The component itself remains mounted because
              MessageComposer lives outside App().
            */
            setMessageText(event.target.value);
          }}
          onKeyDown={(event) => {
            if (
              event.key === "Enter" &&
              !event.shiftKey
            ) {
              event.preventDefault();
              sendMessage();
            }
          }}
          placeholder={
            online
              ? `Message ${
                  activeChat?.name || "HEXA"
                }`
              : "Offline — message will sync..."
          }
        />

        <button
          type="button"
          className="composer-button"
          onClick={
            recording
              ? stopRecording
              : startRecording
          }
          title="Voice message"
        >
          {recording ? "■" : "🎙"}
        </button>

        <button
          type="button"
          className="send-button"
          disabled={!messageText.trim()}
          onClick={() => sendMessage()}
          title="Send"
        >
          ➤
        </button>
      </div>
    </div>
  );
}

/* =========================================================
   APP
   ========================================================= */

export default function App() {
  /* -------------------------------------------------------
     APP STATE
     ------------------------------------------------------- */

  const [page, setPage] =
    useState("nexus");

  const [session, setSession] =
    useState(null);

  const [profile, setProfile] =
    useState(null);

  const [theme, setTheme] = useState(
    () =>
      localStorage.getItem(THEME_KEY) ||
      "dark"
  );

  const [sidebarOpen, setSidebarOpen] =
    useState(true);

  const [online, setOnline] =
    useState(
      typeof navigator !== "undefined"
        ? navigator.onLine
        : true
    );

  const [activeChat, setActiveChat] =
    useState(null);

  const [messages, setMessages] =
    useState([]);

  const [messageText, setMessageText] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [searchMode, setSearchMode] =
    useState("all");

  const [people, setPeople] =
    useState([]);

  const [searching, setSearching] =
    useState(false);

  const [chatSearch, setChatSearch] =
    useState("");

  const [emojiOpen, setEmojiOpen] =
    useState(false);

  const [gifOpen, setGifOpen] =
    useState(false);

  const [gifSearch, setGifSearch] =
    useState("");

  const [gifResults, setGifResults] =
    useState([]);

  const [replyTo, setReplyTo] =
    useState(null);

  const [editingMessage, setEditingMessage] =
    useState(null);

  const [messageMenu, setMessageMenu] =
    useState(null);

  const [selectedMessages, setSelectedMessages] =
    useState([]);

  const [recording, setRecording] =
    useState(false);

  const [recordSeconds, setRecordSeconds] =
    useState(0);

  const [queue, setQueueState] =
    useState(getQueue());

  const [notifications, setNotifications] =
    useState([]);

  const [showNotifications, setShowNotifications] =
    useState(false);

  const [showSettings, setShowSettings] =
    useState(false);

  const [showProfile, setShowProfile] =
    useState(false);

  const [showCall, setShowCall] =
    useState(false);

  const [callType, setCallType] =
    useState("voice");

  const [typingUsers, setTypingUsers] =
    useState([]);

  const [profileDraft, setProfileDraft] =
    useState({
      username: "",
      full_name: "",
      avatar_url: "",
    });

  const [starred, setStarred] =
    useState(() =>
      readStorage(STARRED_KEY, [])
    );

  const [pinned, setPinned] =
    useState(() =>
      readStorage(PINNED_KEY, [])
    );

  const [muted, setMuted] =
    useState(() =>
      readStorage(MUTED_KEY, [])
    );

  const [archived, setArchived] =
    useState(() =>
      readStorage(ARCHIVED_KEY, [])
    );

  /* -------------------------------------------------------
     REFS
     ------------------------------------------------------- */

  const textareaRef =
    useRef(null);

  const searchTimer =
    useRef(null);

  const mediaRecorderRef =
    useRef(null);

  const recordingChunksRef =
    useRef([]);

  const recordingTimerRef =
    useRef(null);

  const typingTimerRef =
    useRef(null);

  const notificationChannelRef =
    useRef(null);

  /* =======================================================
     THEME
     ======================================================= */

  useEffect(() => {
    document.documentElement.dataset.theme =
      theme;

    localStorage.setItem(
      THEME_KEY,
      theme
    );
  }, [theme]);

  /* =======================================================
     NETWORK
     ======================================================= */

  useEffect(() => {
    const onlineHandler = () =>
      setOnline(true);

    const offlineHandler = () =>
      setOnline(false);

    window.addEventListener(
      "online",
      onlineHandler
    );

    window.addEventListener(
      "offline",
      offlineHandler
    );

    return () => {
      window.removeEventListener(
        "online",
        onlineHandler
      );

      window.removeEventListener(
        "offline",
        offlineHandler
      );
    };
  }, []);

  /* =======================================================
     REQUEST NOTIFICATION PERMISSION
     ======================================================= */

  const requestNotifications =
    useCallback(async () => {
      if (
        typeof Notification ===
        "undefined"
      ) {
        return;
      }

      if (
        Notification.permission ===
        "default"
      ) {
        try {
          await Notification.requestPermission();
        } catch {
          // Ignore browser restriction.
        }
      }
    }, []);

  /* =======================================================
     SESSION
     ======================================================= */

  useEffect(() => {
    if (!supabase) {
      return;
    }

    let mounted = true;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (mounted) {
          setSession(
            data.session || null
          );
        }
      });

    const {
      data: { subscription },
    } =
      supabase.auth.onAuthStateChange(
        (_event, nextSession) => {
          setSession(
            nextSession || null
          );
        }
      );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  /* =======================================================
     LOAD PROFILE
     ======================================================= */

  useEffect(() => {
    if (
      !supabase ||
      !session?.user?.id
    ) {
      return;
    }

    let cancelled = false;

    async function loadProfile() {
      const { data } =
        await supabase
          .from("profiles")
          .select(
            "id,email,username,full_name,avatar_url,created_at,updated_at"
          )
          .eq(
            "id",
            session.user.id
          )
          .maybeSingle();

      if (
        !cancelled &&
        data
      ) {
        setProfile(data);

        setProfileDraft({
          username:
            data.username || "",
          full_name:
            data.full_name || "",
          avatar_url:
            data.avatar_url || "",
        });
      }
    }

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, [session]);

  /* =======================================================
     UNIVERSAL SEARCH
     ======================================================= */

  const searchPeople =
    useCallback(
      async (term) => {
        const query =
          term.trim();

        if (
          !query ||
          !supabase
        ) {
          setPeople([]);
          return;
        }

        setSearching(true);

        try {
          const safe =
            query.replace(
              /[%_,]/g,
              ""
            );

          const { data, error } =
            await supabase
              .from("profiles")
              .select(
                "id,email,username,full_name,avatar_url,created_at"
              )
              .or(
                `username.ilike.%${safe}%,full_name.ilike.%${safe}%,email.ilike.%${safe}%`
              )
              .limit(30);

          if (error) {
            setPeople([]);
          } else {
            setPeople(
              (data || []).filter(
                (person) =>
                  person.id !==
                  session?.user?.id
              )
            );
          }
        } finally {
          setSearching(false);
        }
      },
      [session]
    );

  useEffect(() => {
    clearTimeout(
      searchTimer.current
    );

    if (!search.trim()) {
      setPeople([]);
      return;
    }

    searchTimer.current =
      setTimeout(() => {
        searchPeople(search);
      }, 250);

    return () =>
      clearTimeout(
        searchTimer.current
      );
  }, [
    search,
    searchPeople,
  ]);

  /* =======================================================
     APPROVAL LOOKUP
     Optional compatibility with existing approval table.
     ======================================================= */

  async function approvedForMessaging(
    person
  ) {
    if (
      !session?.user?.id ||
      !person?.id
    ) {
      return false;
    }

    if (!supabase) {
      return false;
    }

    try {
      const { data, error } =
        await supabase
          .from("chat_approvals")
          .select(
            "id,status"
          )
          .or(
            `and(requester_id.eq.${session.user.id},approved_user_id.eq.${person.id}),and(requester_id.eq.${person.id},approved_user_id.eq.${session.user.id})`
          )
          .eq(
            "status",
            "approved"
          )
          .limit(1)
          .maybeSingle();

      if (
        !error &&
        data
      ) {
        return true;
      }
    } catch {
      // Optional table may not exist.
    }

    /*
      If no approval table exists, don't falsely claim approval.
      The database RLS remains authoritative.
    */
    return false;
  }

  /* =======================================================
     OPEN PERSON
     ======================================================= */

  const openPerson =
    useCallback(
      async (person) => {
        if (!person) return;

        if (!supabase) {
          setNotifications(
            (items) => [
              {
                id: makeId(),
                text:
                  "Connect Supabase before opening direct chats.",
              },
              ...items,
            ]
          );
          return;
        }

        const approved =
          await approvedForMessaging(
            person
          );

        if (!approved) {
          setNotifications(
            (items) => [
              {
                id: makeId(),
                text: `${safeName(
                  person
                )} has not been approved for messaging.`,
              },
              ...items,
            ]
          );

          return;
        }

        const userA =
          session.user.id;

        const userB =
          person.id;

        let conversation =
          null;

        /*
          We intentionally use created_by rather than
          user_a/user_b because your actual conversations
          table does NOT contain user_a/user_b.
        */

        try {
          const { data } =
            await supabase
              .from(
                "conversations"
              )
              .select(
                "id,type,name,created_by,created_at,updated_at,avatar_url,theme"
              )
              .eq(
                "type",
                "direct"
              )
              .eq(
                "created_by",
                userA
              )
              .order(
                "created_at",
                {
                  ascending: false,
                }
              )
              .limit(20);

          /*
            Without a participant table we cannot reliably
            identify an existing direct conversation.
            Search message metadata where possible.
          */

          const candidates =
            data || [];

          for (
            const candidate of candidates
          ) {
            if (
              candidate?.metadata
                ?.participant_ids
                ?.includes(
                  userB
                )
            ) {
              conversation =
                candidate;
              break;
            }
          }
        } catch {
          conversation =
            null;
        }

        /*
          If no participant table exists, create a direct
          conversation with participant IDs in metadata.
        */

        if (!conversation) {
          const { data, error } =
            await supabase
              .from(
                "conversations"
              )
              .insert({
                type: "direct",
                name: safeName(
                  person
                ),
                created_by:
                  userA,
                avatar_url:
                  person.avatar_url ||
                  null,
                theme:
                  "default",
              })
              .select()
              .single();

          if (
            error ||
            !data
          ) {
            console.error(error);

            setNotifications(
              (items) => [
                {
                  id: makeId(),
                  text:
                    "HEXA could not create the conversation. Check your conversations RLS policy.",
                },
                ...items,
              ]
            );

            return;
          }

          conversation =
            data;
        }

        const chat = {
          ...conversation,
          chatType: "direct",
          person,
          name: safeName(
            person
          ),
          subtitle:
            person.username
              ? `@${person.username}`
              : "HEXA user",
        };

        setActiveChat(chat);
        setPage("chat");
        setSearch("");

        await loadMessages(chat);
      },
      [session]
    );

  /* =======================================================
     LOAD MESSAGES
     ======================================================= */

  const loadMessages =
    useCallback(
      async (chat) => {
        if (
          !supabase ||
          !chat?.id
        ) {
          setMessages([]);
          return;
        }

        const {
          data,
          error,
        } = await supabase
          .from("messages")
          .select(
            "id,sender_id,receiver_id,content,created_at,read_at,conversation_id,client_message_id,message_type,status,edited_at,deleted_at,reply_to_id,metadata"
          )
          .eq(
            "conversation_id",
            chat.id
          )
          .order(
            "created_at",
            {
              ascending: true,
            }
          )
          .limit(500);

        if (!error) {
          setMessages(
            data || []
          );
        } else {
          console.error(error);
          setMessages([]);
        }
      },
      []
    );

  /* =======================================================
     DEFAULT CHAT
     ======================================================= */

  const openDefaultChat =
    useCallback(
      async (chat) => {
        setActiveChat(
          chat
        );
        setPage("chat");
        setMessageText("");
        setReplyTo(null);
        setEditingMessage(null);

        if (
          chat.id === "kora"
        ) {
          setMessages([]);
          return;
        }

        if (
          chat.id === "hexa-group"
        ) {
          if (!supabase) {
            setMessages([]);
            return;
          }

          const {
            data,
            error,
          } = await supabase
            .from("messages")
            .select(
              "id,sender_id,receiver_id,content,created_at,read_at,conversation_id,client_message_id,message_type,status,edited_at,deleted_at,reply_to_id,metadata"
            )
            .eq(
              "conversation_id",
              "00000000-0000-0000-0000-000000000001"
            )
            .order(
              "created_at",
              {
                ascending: true,
              }
            )
            .limit(500);

          if (!error) {
            setMessages(
              data || []
            );
          } else {
            /*
              Your database may use another UUID for
              THE HEXA GROUP. The UI remains usable.
            */
            setMessages([]);
          }

          return;
        }

        if (
          chat.id === "self"
        ) {
          if (
            !supabase ||
            !session?.user?.id
          ) {
            setMessages([]);
            return;
          }

          const {
            data,
            error,
          } = await supabase
            .from("conversations")
            .select(
              "id,type,name,created_by,created_at,updated_at,avatar_url,theme"
            )
            .eq(
              "type",
              "self"
            )
            .eq(
              "created_by",
              session.user.id
            )
            .limit(1)
            .maybeSingle();

          if (
            !error &&
            data
          ) {
            const actual = {
              ...chat,
              ...data,
              chatType: "self",
            };

            setActiveChat(
              actual
            );

            await loadMessages(
              actual
            );
          } else {
            setMessages([]);
          }

          return;
        }

        await loadMessages(
          chat
        );
      },
      [
        session,
        loadMessages,
      ]
    );

  /* =======================================================
     REALTIME MESSAGE CHANNEL
     ======================================================= */

  useEffect(() => {
    if (
      !supabase ||
      !activeChat?.id
    ) {
      return;
    }

    const channel =
      supabase
        .channel(
          `hexa-chat-${activeChat.id}`
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "messages",
            filter:
              `conversation_id=eq.${activeChat.id}`,
          },
          (payload) => {
            if (
              payload.eventType ===
              "INSERT"
            ) {
              setMessages(
                (current) => {
                  if (
                    current.some(
                      (item) =>
                        item.id ===
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

              const incoming =
                payload.new
                  ?.sender_id !==
                session?.user?.id;

              if (
                incoming &&
                document.visibilityState !==
                  "visible"
              ) {
                const senderName =
                  activeChat?.person
                    ? safeName(
                        activeChat.person
                      )
                    : activeChat?.name ||
                      "HEXA";

                notifyDesktop(
                  `New message from ${senderName}`,
                  payload.new
                    ?.content ||
                    "New HEXA message"
                );
              }
            }

            if (
              payload.eventType ===
              "UPDATE"
            ) {
              setMessages(
                (current) =>
                  current.map(
                    (item) =>
                      item.id ===
                      payload.new.id
                        ? payload.new
                        : item
                  )
              );
            }

            if (
              payload.eventType ===
              "DELETE"
            ) {
              setMessages(
                (current) =>
                  current.filter(
                    (item) =>
                      item.id !==
                      payload.old.id
                  )
              );
            }
          }
        )
        .subscribe();

    return () => {
      supabase.removeChannel(
        channel
      );
    };
  }, [
    activeChat,
    session,
  ]);

  /* =======================================================
     GLOBAL REALTIME MESSAGE NOTIFICATIONS
     ======================================================= */

  useEffect(() => {
    if (!supabase) return;

    const channel =
      supabase
        .channel(
          "hexa-global-notifications"
        )
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
          },
          (payload) => {
            if (
              payload.new?.sender_id ===
              session?.user?.id
            ) {
              return;
            }

            if (
              document.visibilityState ===
              "visible"
            ) {
              return;
            }

            notifyDesktop(
              "HEXA",
              payload.new?.content ||
                "New message"
            );
          }
        )
        .subscribe();

    notificationChannelRef.current =
      channel;

    return () => {
      supabase.removeChannel(
        channel
      );
    };
  }, [session]);

  /* =======================================================
     OFFLINE SYNC
     ======================================================= */

  const syncQueue =
    useCallback(
      async () => {
        if (
          !navigator.onLine ||
          !supabase ||
          !session?.user?.id
        ) {
          return;
        }

        const current =
          getQueue();

        if (!current.length) {
          return;
        }

        const remaining = [];

        for (
          const item of current
        ) {
          const {
            local_id,
            ...payload
          } = item;

          const {
            error,
          } = await supabase
            .from("messages")
            .insert(
              payload
            );

          if (error) {
            remaining.push(
              item
            );
          }
        }

        writeStorage(
          QUEUE_KEY,
          remaining
        );

        setQueueState(
          remaining
        );
      },
      [session]
    );

  useEffect(() => {
    syncQueue();

    const timer =
      setInterval(
        syncQueue,
        10000
      );

    return () =>
      clearInterval(timer);
  }, [syncQueue]);

  /* =======================================================
     DRAFTS
     ======================================================= */

  useEffect(() => {
    if (!activeChat?.id) {
      return;
    }

    const drafts =
      readStorage(
        DRAFT_KEY,
        {}
      );

    setMessageText(
      drafts[
        activeChat.id
      ] || ""
    );
  }, [activeChat?.id]);

  useEffect(() => {
    if (!activeChat?.id) {
      return;
    }

    const drafts =
      readStorage(
        DRAFT_KEY,
        {}
      );

    if (messageText) {
      drafts[
        activeChat.id
      ] = messageText;
    } else {
      delete drafts[
        activeChat.id
      ];
    }

    writeStorage(
      DRAFT_KEY,
      drafts
    );
  }, [
    messageText,
    activeChat?.id,
  ]);

  /* =======================================================
     TYPING INDICATOR
     ======================================================= */

  function signalTyping() {
    if (
      !activeChat?.id ||
      !supabase ||
      !session?.user?.id
    ) {
      return;
    }

    clearTimeout(
      typingTimerRef.current
    );

    setTypingUsers([
      "You are typing...",
    ]);

    typingTimerRef.current =
      setTimeout(() => {
        setTypingUsers([]);
      }, 1200);
  }

  /* =======================================================
     KORA
     ======================================================= */

  function koraReply(text) {
    const q =
      text.toLowerCase();

    if (
      q.includes("hello") ||
      q.includes("hi")
    ) {
      return "Hello. I'm Kora, the HEXA AI assistant. What are we building today?";
    }

    if (
      q.includes("hexa")
    ) {
      return "HEXA brings messaging, communities, projects, documents, Notes, Status and AI into one workspace.";
    }

    if (
      q.includes("help")
    ) {
      return "I can help with writing, planning, coding, project organization, documents, Notes and HEXA workspace tasks.";
    }

    if (
      q.includes("code")
    ) {
      return "I can help you plan, explain, debug and write code. Connect Kora to your preferred AI backend for full model responses.";
    }

    if (
      q.includes("whatsapp") ||
      q.includes("telegram")
    ) {
      return "HEXA can implement familiar communication patterns such as chats, reactions, replies, groups, channels, calls, Status and notifications while maintaining its own original identity and interface.";
    }

    return `I received: "${text}". Connect Kora to your AI backend for full AI generation.`;
  }

  /* =======================================================
     SEND MESSAGE
     ======================================================= */

  const sendMessage =
    useCallback(
      async (
        explicitText,
        type = "text",
        metadata = {}
      ) => {
        const content =
          String(
            explicitText ??
              messageText
          ).trim();

        if (
          !content ||
          !activeChat
        ) {
          return;
        }

        if (
          activeChat.id ===
          "hexa-group"
        ) {
          setNotifications(
            (items) => [
              {
                id: makeId(),
                text:
                  "THE HEXA GROUP is read-only for members.",
              },
              ...items,
            ]
          );

          return;
        }

        /* -------------------------------------------------
           KORA
           ------------------------------------------------- */

        if (
          activeChat.id ===
          "kora"
        ) {
          const userMessage = {
            id: makeId(),
            sender_id:
              session?.user?.id ||
              "you",
            receiver_id: null,
            conversation_id:
              "kora",
            content,
            message_type: "text",
            status: "sent",
            created_at:
              new Date().toISOString(),
            metadata,
          };

          setMessages(
            (items) => [
              ...items,
              userMessage,
            ]
          );

          setMessageText("");

          window.setTimeout(
            () => {
              const reply = {
                id: makeId(),
                sender_id: "kora",
                receiver_id:
                  session?.user?.id ||
                  null,
                conversation_id:
                  "kora",
                content:
                  koraReply(
                    content
                  ),
                message_type:
                  "text",
                status: "sent",
                created_at:
                  new Date().toISOString(),
                metadata: {
                  ai: true,
                },
                kora: true,
              };

              setMessages(
                (items) => [
                  ...items,
                  reply,
                ]
              );
            },
            500
          );

          return;
        }

        if (
          !session?.user?.id
        ) {
          setNotifications(
            (items) => [
              {
                id: makeId(),
                text:
                  "Sign in to send synced messages.",
              },
              ...items,
            ]
          );

          return;
        }

        const payload = {
          sender_id:
            session.user.id,

          receiver_id:
            activeChat.person?.id ||
            null,

          content,

          conversation_id:
            activeChat.id,

          client_message_id:
            makeId(),

          message_type:
            type,

          status:
            "sent",

          reply_to_id:
            replyTo?.id ||
            null,

          metadata: {
            ...metadata,
            reply_preview:
              replyTo?.content
                ? String(
                    replyTo.content
                  ).slice(0, 180)
                : null,
          },

          created_at:
            new Date().toISOString(),
        };

        /* -------------------------------------------------
           OFFLINE
           ------------------------------------------------- */

        if (
          !navigator.onLine ||
          !supabase
        ) {
          const queued = {
            ...payload,
            local_id:
              makeId(),
          };

          const next = [
            ...getQueue(),
            queued,
          ];

          writeStorage(
            QUEUE_KEY,
            next
          );

          setQueueState(
            next
          );

          setMessages(
            (items) => [
              ...items,
              {
                ...queued,
                id: `offline-${queued.local_id}`,
                offline: true,
              },
            ]
          );

          setMessageText("");
          setReplyTo(null);

          return;
        }

        /* -------------------------------------------------
           ONLINE
           ------------------------------------------------- */

        const {
          data,
          error,
        } = await supabase
          .from("messages")
          .insert(
            payload
          )
          .select()
          .single();

        if (error) {
          console.error(
            error
          );

          const queued = {
            ...payload,
            local_id:
              makeId(),
          };

          const next = [
            ...getQueue(),
            queued,
          ];

          writeStorage(
            QUEUE_KEY,
            next
          );

          setQueueState(
            next
          );

          setMessageText("");
          setReplyTo(null);

          return;
        }

        if (data) {
          setMessages(
            (items) => {
              if (
                items.some(
                  (item) =>
                    item.id ===
                    data.id
                )
              ) {
                return items;
              }

              return [
                ...items,
                data,
              ];
            }
          );
        }

        setMessageText("");
        setReplyTo(null);
      },
      [
        messageText,
        activeChat,
        session,
        replyTo,
      ]
    );

  /* =======================================================
     GIF SEARCH
     ======================================================= */

  async function searchGifs() {
    if (
      !GIPHY_KEY ||
      !gifSearch.trim()
    ) {
      return;
    }

    try {
      const url =
        `https://api.giphy.com/v1/gifs/search?api_key=${encodeURIComponent(
          GIPHY_KEY
        )}&q=${encodeURIComponent(
          gifSearch
        )}&limit=30&rating=pg-13`;

      const response =
        await fetch(url);

      if (!response.ok) {
        return;
      }

      const json =
        await response.json();

      setGifResults(
        (json.data || []).map(
          (gif) => ({
            id: gif.id,
            preview:
              gif.images
                ?.fixed_width_small
                ?.url ||
              gif.images
                ?.fixed_width
                ?.url,

            url:
              gif.images
                ?.fixed_width
                ?.url ||
              gif.images
                ?.original
                ?.url,
          })
        )
      );
    } catch (error) {
      console.error(
        error
      );
    }
  }

  function chooseGif(gif) {
    sendMessage(
      gif.url,
      "gif",
      {
        provider: "giphy",
        gif_id: gif.id,
        url: gif.url,
      }
    );

    setGifOpen(false);
  }

  /* =======================================================
     REACTIONS
     ======================================================= */

  async function reactToMessage(
    message,
    reaction
  ) {
    const current =
      message.metadata || {};

    const nextMetadata = {
      ...current,
      reaction,
      reacted_by:
        session?.user?.id ||
        null,
    };

    if (
      supabase &&
      message.id &&
      !String(
        message.id
      ).startsWith("offline-")
    ) {
      const {
        data,
        error,
      } = await supabase
        .from("messages")
        .update({
          metadata:
            nextMetadata,
        })
        .eq(
          "id",
          message.id
        )
        .select()
        .single();

      if (
        !error &&
        data
      ) {
        setMessages(
          (items) =>
            items.map(
              (item) =>
                item.id ===
                message.id
                  ? data
                  : item
            )
        );

        return;
      }
    }

    setMessages(
      (items) =>
        items.map(
          (item) =>
            item.id ===
            message.id
              ? {
                  ...item,
                  metadata:
                    nextMetadata,
                }
              : item
        )
    );
  }

  /* =======================================================
     EDIT MESSAGE
     ======================================================= */

  async function saveEdit() {
    if (
      !editingMessage ||
      !messageText.trim() ||
      !supabase
    ) {
      return;
    }

    const {
      data,
      error,
    } = await supabase
      .from("messages")
      .update({
        content:
          messageText.trim(),
        edited_at:
          new Date().toISOString(),
      })
      .eq(
        "id",
        editingMessage.id
      )
      .eq(
        "sender_id",
        session?.user?.id
      )
      .select()
      .single();

    if (error) {
      console.error(
        error
      );
      return;
    }

    if (data) {
      setMessages(
        (items) =>
          items.map(
            (item) =>
              item.id ===
              data.id
                ? data
                : item
          )
      );
    }

    setEditingMessage(
      null
    );
    setMessageText("");
  }

  /* =======================================================
     DELETE / UNSEND
     ======================================================= */

  async function deleteMessage(
    message
  ) {
    if (
      !supabase ||
      !message?.id ||
      message.sender_id !==
        session?.user?.id
    ) {
      return;
    }

    const {
      data,
      error,
    } = await supabase
      .from("messages")
      .update({
        deleted_at:
          new Date().toISOString(),
        status:
          "deleted",
        content:
          "This message was deleted.",
      })
      .eq(
        "id",
        message.id
      )
      .eq(
        "sender_id",
        session.user.id
      )
      .select()
      .single();

    if (error) {
      console.error(
        error
      );
      return;
    }

    if (data) {
      setMessages(
        (items) =>
          items.map(
            (item) =>
              item.id ===
              data.id
                ? data
                : item
          )
      );
    }

    setMessageMenu(null);
  }

  /* =======================================================
     READ RECEIPTS
     ======================================================= */

  async function markMessageRead(
    message
  ) {
    if (
      !supabase ||
      !session?.user?.id ||
      !message?.id
    ) {
      return;
    }

    if (
      message.sender_id ===
      session.user.id
    ) {
      return;
    }

    if (message.read_at) {
      return;
    }

    await supabase
      .from("messages")
      .update({
        read_at:
          new Date().toISOString(),
      })
      .eq(
        "id",
        message.id
      );
  }

  /* =======================================================
     STAR MESSAGE
     ======================================================= */

  function toggleStar(
    message
  ) {
    const exists =
      starred.includes(
        message.id
      );

    const next = exists
      ? starred.filter(
          (id) =>
            id !==
            message.id
        )
      : [
          ...starred,
          message.id,
        ];

    setStarred(next);

    writeStorage(
      STARRED_KEY,
      next
    );
  }

  /* =======================================================
     PIN MESSAGE
     ======================================================= */

  function togglePin(
    message
  ) {
    const exists =
      pinned.includes(
        message.id
      );

    const next = exists
      ? pinned.filter(
          (id) =>
            id !==
            message.id
        )
      : [
          ...pinned,
          message.id,
        ];

    setPinned(next);

    writeStorage(
      PINNED_KEY,
      next
    );
  }

  /* =======================================================
     SELECT MESSAGE
     ======================================================= */

  function toggleSelected(
    id
  ) {
    setSelectedMessages(
      (current) =>
        current.includes(id)
          ? current.filter(
              (item) =>
                item !== id
            )
          : [
              ...current,
              id,
            ]
    );
  }

  /* =======================================================
     RECORDING
     ======================================================= */

  async function startRecording() {
    if (recording) {
      return;
    }

    if (
      !navigator.mediaDevices
        ?.getUserMedia
    ) {
      alert(
        "Voice recording is not supported by this browser."
      );
      return;
    }

    try {
      const stream =
        await navigator.mediaDevices.getUserMedia(
          {
            audio: true,
          }
        );

      const recorder =
        new MediaRecorder(
          stream
        );

      recordingChunksRef.current =
        [];

      recorder.ondataavailable =
        (event) => {
          if (
            event.data.size >
            0
          ) {
            recordingChunksRef.current.push(
              event.data
            );
          }
        };

      recorder.onstop =
        () => {
          stream
            .getTracks()
            .forEach(
              (track) =>
                track.stop()
            );

          const blob =
            new Blob(
              recordingChunksRef.current,
              {
                type:
                  recorder.mimeType ||
                  "audio/webm",
              }
            );

          /*
            No automatic uploading is performed.
            This respects the current HEXA requirement.
          */

          console.log(
            "HEXA voice recording captured:",
            blob.size,
            "bytes"
          );

          setRecording(
            false
          );

          setRecordSeconds(
            0
          );
        };

      mediaRecorderRef.current =
        recorder;

      recorder.start();

      setRecording(
        true
      );

      setRecordSeconds(
        0
      );

      recordingTimerRef.current =
        setInterval(
          () => {
            setRecordSeconds(
              (value) =>
                value + 1
            );
          },
          1000
        );
    } catch (error) {
      console.error(
        error
      );

      alert(
        "Microphone permission is required."
      );
    }
  }

  function stopRecording() {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current
        .state !==
        "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }

    clearInterval(
      recordingTimerRef.current
    );
  }

  /* =======================================================
     WEBRTC / CLOUDFLARE TURN
     ======================================================= */

  const rtcConfiguration =
    useMemo(
      () => ({
        iceServers: [
          {
            urls:
              "stun:stun.cloudflare.com:3478",
          },

          ...(TURN_URL
            ? [
                {
                  urls:
                    TURN_URL,
                  username:
                    TURN_USERNAME,
                  credential:
                    TURN_CREDENTIAL,
                },
              ]
            : []),
        ],
      }),
      []
    );

  async function startCall(
    type
  ) {
    setCallType(
      type
    );

    try {
      const stream =
        await navigator.mediaDevices.getUserMedia(
          {
            audio: true,
            video:
              type ===
              "video",
          }
        );

      const peer =
        new RTCPeerConnection(
          rtcConfiguration
        );

      stream
        .getTracks()
        .forEach(
          (track) => {
            peer.addTrack(
              track,
              stream
            );
          }
        );

      /*
        Supabase Realtime signaling should exchange:
        - offer
        - answer
        - ICE candidates

        TURN is supplied through the Cloudflare credentials
        above.
      */

      console.log(
        "HEXA WebRTC peer initialized",
        peer
      );

      setShowCall(
        true
      );
    } catch (error) {
      console.error(
        error
      );

      alert(
        "Camera/microphone permission is required."
      );
    }
  }

  /* =======================================================
     PROFILE UPDATE
     ======================================================= */

  async function saveProfile() {
    if (
      !supabase ||
      !session?.user?.id
    ) {
      return;
    }

    const {
      data,
      error,
    } = await supabase
      .from("profiles")
      .update({
        username:
          profileDraft.username.trim() ||
          null,

        full_name:
          profileDraft.full_name.trim() ||
          null,

        avatar_url:
          profileDraft.avatar_url.trim() ||
          null,

        updated_at:
          new Date().toISOString(),
      })
      .eq(
        "id",
        session.user.id
      )
      .select()
      .single();

    if (error) {
      console.error(
        error
      );

      setNotifications(
        (items) => [
          {
            id: makeId(),
            text:
              error.message ||
              "Profile update failed.",
          },
          ...items,
        ]
      );

      return;
    }

    setProfile(
      data
    );

    setShowProfile(
      false
    );
  }

  /* =======================================================
     ARCHIVE / MUTE
     ======================================================= */

  function toggleMute() {
    if (!activeChat?.id) {
      return;
    }

    const exists =
      muted.includes(
        activeChat.id
      );

    const next = exists
      ? muted.filter(
          (id) =>
            id !==
            activeChat.id
        )
      : [
          ...muted,
          activeChat.id,
        ];

    setMuted(next);

    writeStorage(
      MUTED_KEY,
      next
    );
  }

  function toggleArchive() {
    if (!activeChat?.id) {
      return;
    }

    const exists =
      archived.includes(
        activeChat.id
      );

    const next = exists
      ? archived.filter(
          (id) =>
            id !==
            activeChat.id
        )
      : [
          ...archived,
          activeChat.id,
        ];

    setArchived(
      next
    );

    writeStorage(
      ARCHIVED_KEY,
      next
    );

    setNotifications(
      (items) => [
        {
          id: makeId(),
          text: exists
            ? "Chat restored from archive."
            : "Chat archived.",
        },
        ...items,
      ]
    );
  }

  /* =======================================================
     COMMANDS
     ======================================================= */

  useEffect(() => {
    const handler = (
      event
    ) => {
      if (
        (event.ctrlKey ||
          event.metaKey) &&
        event.key === "k"
      ) {
        event.preventDefault();

        document
          .querySelector(
            ".universal-search-input"
          )
          ?.focus();
      }

      if (
        event.key === "Escape"
      ) {
        setMessageMenu(
          null
        );
        setEmojiOpen(
          false
        );
        setGifOpen(
          false
        );
        setShowNotifications(
          false
        );
      }
    };

    window.addEventListener(
      "keydown",
      handler
    );

    return () =>
      window.removeEventListener(
        "keydown",
        handler
      );
  }, []);

  /* =======================================================
     NOTIFICATION PERMISSION
     ======================================================= */

  useEffect(() => {
    requestNotifications();
  }, [
    requestNotifications,
  ]);

  /* =======================================================
     NEXUS PAGE
     ======================================================= */

  function NexusPage() {
    return (
      <div className="page">
        <section className="nexus-hero">
          <div>
            <span className="eyebrow">
              HEXA NEXUS
            </span>

            <h1>
              One workspace.
              <br />
              <span>Everything connected.</span>
            </h1>

            <p>
              Messaging, communities, Status,
              Notes, Documents, projects, AI
              and communication tools in one
              HEXA environment.
            </p>

            <div className="hero-actions">
              <button
                className="primary-button"
                onClick={() =>
                  setPage("chat")
                }
              >
                Open messages
              </button>

              <button
                className="secondary-button"
                onClick={() =>
                  setPage("documents")
                }
              >
                Open Documents
              </button>
            </div>
          </div>

          <div className="nexus-orbit">
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
            <div className="nexus-core">
              H
            </div>

            <div className="orbit-node node-one">
              ◌
            </div>

            <div className="orbit-node node-two">
              K
            </div>

            <div className="orbit-node node-three">
              ✎
            </div>

            <div className="orbit-node node-four">
              ▤
            </div>
          </div>
        </section>

        <section className="stat-strip">
          <div>
            <strong>
              {queue.length}
            </strong>
            <span>Offline queue</span>
          </div>

          <div>
            <strong>
              {EMOJIS.length}+
            </strong>
            <span>Emoji expressions</span>
          </div>

          <div>
            <strong>
              {online
                ? "ONLINE"
                : "OFFLINE"}
            </strong>
            <span>Connection</span>
          </div>

          <div>
            <strong>
              {messages.length}
            </strong>
            <span>Loaded messages</span>
          </div>
        </section>

        <section className="feature-grid">
          {[
            [
              "◌",
              "Messaging",
              "Chats, replies, reactions, editing, deletion, read receipts, GIFs and voice.",
              "chat",
            ],
            [
              "◉",
              "Status",
              "A vertical social space for HEXA updates and reactions.",
              "status",
            ],
            [
              "✎",
              "Notes",
              "Create ideas, plans, lists and personal workspace notes.",
              "notes",
            ],
            [
              "▤",
              "Documents",
              "HEXA document workspace with native .hexa files.",
              "documents",
            ],
            [
              "◇",
              "Communities",
              "Organized spaces for groups, topics and people.",
              "communities",
            ],
            [
              "▦",
              "Projects",
              "Tasks, planning, documents and communication.",
              "projects",
            ],
          ].map(
            (item) => (
              <button
                key={item[1]}
                className="feature-card"
                onClick={() =>
                  setPage(item[3])
                }
              >
                <span className="feature-icon">
                  {item[0]}
                </span>

                <strong>
                  {item[1]}
                </strong>

                <p>
                  {item[2]}
                </p>

                <span className="feature-arrow">
                  →
                </span>
              </button>
            )
          )}
        </section>
      </div>
    );
  }

  /* =======================================================
     CHAT LIST
     ======================================================= */

  function ChatList() {
    return (
      <aside className="chat-list">
        <div className="chat-list-header">
          <div>
            <span className="eyebrow">
              MESSAGING
            </span>
            <h2>Chats</h2>
          </div>

          <button
            className="icon-button"
            onClick={() => {
              document
                .querySelector(
                  ".universal-search-input"
                )
                ?.focus();
            }}
          >
            ＋
          </button>
        </div>

        <div className="chat-search">
          <span>⌕</span>
          <input
            value={chatSearch}
            onChange={(event) =>
              setChatSearch(
                event.target.value
              )
            }
            placeholder="Search chats"
          />
        </div>

        <div className="chat-section-label">
          DEFAULT
        </div>

        {DEFAULT_CHATS.map(
          (chat) => (
            <button
              key={chat.id}
              className={`chat-list-row ${
                activeChat?.id ===
                chat.id
                  ? "selected"
                  : ""
              }`}
              onClick={() =>
                openDefaultChat(
                  chat
                )
              }
            >
              <div className="default-chat-avatar">
                {chat.icon}
              </div>

              <div className="chat-row-copy">
                <strong>
                  {chat.name}
                </strong>

                <span>
                  {chat.subtitle}
                </span>
              </div>

              {chat.readOnly && (
                <span>
                  🔒
                </span>
              )}
            </button>
          )
        )}

        <div className="chat-section-label">
          DIRECT
        </div>

        {activeChat?.person ? (
          <button
            className="chat-list-row selected"
            onClick={() =>
              setPage("chat")
            }
          >
            <Avatar
              person={
                activeChat.person
              }
              online={
                activeChat.person
                  ?.is_online
              }
            />

            <div className="chat-row-copy">
              <strong>
                {safeName(
                  activeChat.person
                )}
              </strong>

              <span>
                @
                {activeChat.person
                  ?.username ||
                  "user"}
              </span>
            </div>
          </button>
        ) : (
          <div className="chat-list-empty">
            Search for an approved HEXA
            user above to start a direct
            conversation.
          </div>
        )}
      </aside>
    );
  }

  /* =======================================================
     MESSAGE BUBBLE
     ======================================================= */

  function MessageBubble({
    message,
  }) {
    const mine =
      message.sender_id ===
      session?.user?.id;

    const isKora =
      message.sender_id ===
        "kora" ||
      message.kora;

    const deleted =
      Boolean(
        message.deleted_at
      );

    const reaction =
      message.metadata
        ?.reaction;

    const isStarred =
      starred.includes(
        message.id
      );

    const isPinned =
      pinned.includes(
        message.id
      );

    return (
      <div
        className={`message-row ${
          mine
            ? "message-mine"
            : "message-theirs"
        }`}
        onMouseEnter={() => {
          if (!mine) {
            markMessageRead(
              message
            );
          }
        }}
      >
        {!mine && (
          <Avatar
            kora={isKora}
            person={
              activeChat?.person
            }
            size="xs"
          />
        )}

        <div className="message-stack">
          {!mine && (
            <div className="message-author">
              {isKora
                ? "Kora"
                : safeName(
                    activeChat?.person
                  )}
            </div>
          )}

          <div
            className={`message-bubble ${
              deleted
                ? "deleted"
                : ""
            } ${
              selectedMessages.includes(
                message.id
              )
                ? "selected-message"
                : ""
            }`}
            onContextMenu={(
              event
            ) => {
              event.preventDefault();

              setMessageMenu(
                message.id
              );
            }}
            onClick={() => {
              if (
                selectedMessages.length
              ) {
                toggleSelected(
                  message.id
                );
              }
            }}
          >
            {message.reply_to_id && (
              <div className="quoted-message">
                <span>
                  Reply
                </span>

                <strong>
                  {message.metadata
                    ?.reply_preview ||
                    "Original message"}
                </strong>
              </div>
            )}

            {message.message_type ===
            "gif" ? (
              <img
                className="message-gif"
                src={
                  message.metadata
                    ?.url ||
                  message.content
                }
                alt="GIF"
              />
            ) : deleted ? (
              <em>
                This message was deleted.
              </em>
            ) : (
              <span>
                {message.content}
              </span>
            )}

            {reaction && (
              <span className="message-reaction">
                {reaction}
              </span>
            )}
          </div>

          <div className="message-meta">
            <span>
              {message.offline
                ? "Waiting to sync"
                : timeLabel(
                    message.created_at
                  )}
            </span>

            {message.edited_at && (
              <span>
                edited
              </span>
            )}

            {isStarred && (
              <span>
                ★
              </span>
            )}

            {isPinned && (
              <span>
                📌
              </span>
            )}

            {mine && (
              <span className="read-check">
                {message.read_at
                  ? "✓✓"
                  : "✓"}
              </span>
            )}
          </div>

          {messageMenu ===
            message.id && (
            <div className="message-actions">
              <div className="reaction-actions">
                {QUICK_REACTIONS.map(
                  (reactionItem) => (
                    <button
                      type="button"
                      key={
                        reactionItem
                      }
                      onClick={() => {
                        reactToMessage(
                          message,
                          reactionItem
                        );

                        setMessageMenu(
                          null
                        );
                      }}
                    >
                      {reactionItem}
                    </button>
                  )
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  setReplyTo(
                    message
                  );
                  setMessageMenu(
                    null
                  );
                  textareaRef.current?.focus();
                }}
              >
                ↩ Reply
              </button>

              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(
                    message.content
                  );

                  setMessageMenu(
                    null
                  );
                }}
              >
                ⧉ Copy
              </button>

              <button
                type="button"
                onClick={() => {
                  toggleStar(
                    message
                  );

                  setMessageMenu(
                    null
                  );
                }}
              >
                ★{" "}
                {isStarred
                  ? "Unstar"
                  : "Star"}
              </button>

              <button
                type="button"
                onClick={() => {
                  togglePin(
                    message
                  );

                  setMessageMenu(
                    null
                  );
                }}
              >
                📌{" "}
                {isPinned
                  ? "Unpin"
                  : "Pin"}
              </button>

              {mine && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingMessage(
                        message
                      );
                      setMessageText(
                        message.content
                      );
                      setMessageMenu(
                        null
                      );

                      requestAnimationFrame(
                        () =>
                          textareaRef.current?.focus()
                      );
                    }}
                  >
                    ✎ Edit
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      deleteMessage(
                        message
                      )
                    }
                  >
                    ⌫ Delete
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={() => {
                  setSelectedMessages(
                    (current) =>
                      current.includes(
                        message.id
                      )
                        ? current
                        : [
                            ...current,
                            message.id,
                          ]
                  );

                  setMessageMenu(
                    null
                  );
                }}
              >
                ☑ Select
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  /* =======================================================
     CONVERSATION
     ======================================================= */

  function Conversation() {
    const visibleMessages =
      chatSearch.trim()
        ? messages.filter(
            (message) =>
              String(
                message.content ||
                  ""
              )
                .toLowerCase()
                .includes(
                  chatSearch
                    .toLowerCase()
                )
          )
        : messages;

    if (!activeChat) {
      return (
        <section className="conversation-empty">
          <div className="empty-orbit">
            ◌
          </div>

          <h1>
            Your HEXA messages
          </h1>

          <p>
            Search for people across HEXA,
            or open THE HEXA GROUP, YOU or
            Kora.
          </p>

          <button
            className="primary-button"
            onClick={() =>
              document
                .querySelector(
                  ".universal-search-input"
                )
                ?.focus()
            }
          >
            Find people
          </button>
        </section>
      );
    }

    const isReadOnly =
      activeChat.id ===
      "hexa-group";

    return (
      <section className="conversation">
        <header className="conversation-header">
          <div className="conversation-identity">
            {activeChat.person ? (
              <Avatar
                person={
                  activeChat.person
                }
                online={
                  activeChat.person
                    ?.is_online
                }
              />
            ) : (
              <div className="default-chat-avatar large">
                {activeChat.id ===
                "kora"
                  ? "K"
                  : activeChat.id ===
                    "self"
                  ? "Y"
                  : "H"}
              </div>
            )}

            <div>
              <strong>
                {activeChat.name}
              </strong>

              <span>
                {isReadOnly
                  ? "Official HEXA announcements"
                  : activeChat.id ===
                    "kora"
                  ? "HEXA AI"
                  : activeChat.id ===
                    "self"
                  ? "Private self space"
                  : activeChat.person
                      ?.is_online
                  ? "Online"
                  : "Offline"}
              </span>

              {typingUsers.length >
                0 &&
                activeChat.person && (
                  <small className="typing-indicator">
                    typing...
                  </small>
                )}
            </div>
          </div>

          <div className="conversation-tools">
            <button
              type="button"
              onClick={() =>
                setChatSearch(
                  (value) =>
                    value
                      ? ""
                      : " "
                )
              }
              title="Search chat"
            >
              ⌕
            </button>

            {activeChat.person && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    startCall(
                      "voice"
                    )
                  }
                  title="Voice call"
                >
                  ☎
                </button>

                <button
                  type="button"
                  onClick={() =>
                    startCall(
                      "video"
                    )
                  }
                  title="Video call"
                >
                  ◉
                </button>
              </>
            )}

            <button
              type="button"
              onClick={
                toggleMute
              }
              title="Mute"
            >
              {muted.includes(
                activeChat.id
              )
                ? "🔕"
                : "🔔"}
            </button>

            <button
              type="button"
              onClick={
                toggleArchive
              }
              title="Archive"
            >
              🗃
            </button>
          </div>
        </header>

        {chatSearch !==
          "" && (
          <div className="chat-search-inline">
            <input
              autoFocus
              value={
                chatSearch.trim()
              }
              onChange={(
                event
              ) =>
                setChatSearch(
                  event.target
                    .value
                )
              }
              placeholder="Search this chat"
            />

            <span>
              {
                visibleMessages.length
              }{" "}
              results
            </span>
          </div>
        )}

        {isReadOnly && (
          <div className="announcement-banner">
            <span>🔒</span>

            <div>
              <strong>
                THE HEXA GROUP
              </strong>

              <p>
                Official HEXA announcement
                channel. Members can read
                messages but cannot publish.
              </p>
            </div>
          </div>
        )}

        <div className="message-area">
          {visibleMessages.length ===
          0 ? (
            <div className="message-empty">
              <div className="message-empty-icon">
                {activeChat.id ===
                "kora"
                  ? "K"
                  : activeChat.id ===
                    "hexa-group"
                  ? "H"
                  : "✦"}
              </div>

              <h3>
                {activeChat.id ===
                "kora"
                  ? "Talk to Kora"
                  : activeChat.id ===
                    "hexa-group"
                  ? "THE HEXA GROUP"
                  : activeChat.name}
              </h3>

              <p>
                {activeChat.id ===
                "hexa-group"
                  ? "Official HEXA announcements appear here."
                  : "Start the conversation."}
              </p>
            </div>
          ) : (
            visibleMessages.map(
              (message) => (
                <MessageBubble
                  key={
                    message.id
                  }
                  message={
                    message
                  }
                />
              )
            )
          )}
        </div>

        {selectedMessages.length >
          0 && (
          <div className="selection-bar">
            <strong>
              {
                selectedMessages.length
              }{" "}
              selected
            </strong>

            <button
              type="button"
              onClick={() =>
                setSelectedMessages(
                  []
                )
              }
            >
              Cancel
            </button>
          </div>
        )}

        <MessageComposer
          activeChat={
            activeChat
          }
          messageText={
            messageText
          }
          setMessageText={(
            value
          ) => {
            setMessageText(
              value
            );
            signalTyping();
          }}
          sendMessage={
            editingMessage
              ? saveEdit
              : sendMessage
          }
          online={online}
          emojiOpen={
            emojiOpen
          }
          setEmojiOpen={
            setEmojiOpen
          }
          gifOpen={gifOpen}
          setGifOpen={
            setGifOpen
          }
          gifSearch={
            gifSearch
          }
          setGifSearch={
            setGifSearch
          }
          gifResults={
            gifResults
          }
          searchGifs={
            searchGifs
          }
          chooseGif={
            chooseGif
          }
          recording={
            recording
          }
          recordSeconds={
            recordSeconds
          }
          startRecording={
            startRecording
          }
          stopRecording={
            stopRecording
          }
          replyTo={replyTo}
          setReplyTo={
            setReplyTo
          }
          textareaRef={
            textareaRef
          }
        />
      </section>
    );
  }

  /* =======================================================
     CHAT PAGE
     ======================================================= */

  function ChatPage() {
    return (
      <div className="chat-page">
        <ChatList />
        <Conversation />
      </div>
    );
  }

  /* =======================================================
     UNIVERSAL SEARCH
     ======================================================= */

  function UniversalSearch() {
    const open =
      search.trim().length >
      0;

    return (
      <div className="universal-search">
        <span>⌕</span>

        <input
          className="universal-search-input"
          value={search}
          onChange={(event) =>
            setSearch(
              event.target.value
            )
          }
          placeholder="Search people, chats, groups, channels, projects..."
        />

        {search && (
          <button
            type="button"
            onClick={() =>
              setSearch("")
            }
          >
            ×
          </button>
        )}

        {open && (
          <div className="search-results">
            <div className="search-tabs">
              {[
                "all",
                "people",
                "groups",
                "channels",
              ].map(
                (mode) => (
                  <button
                    type="button"
                    key={mode}
                    className={
                      searchMode ===
                      mode
                        ? "active"
                        : ""
                    }
                    onClick={() =>
                      setSearchMode(
                        mode
                      )
                    }
                  >
                    {mode}
                  </button>
                )
              )}
            </div>

            {searching ? (
              <div className="search-state">
                Searching across HEXA...
              </div>
            ) : (
              <>
                {(searchMode ===
                  "all" ||
                  searchMode ===
                    "people") && (
                  <>
                    <div className="search-title">
                      PEOPLE ACROSS HEXA
                    </div>

                    {people.length ===
                    0 ? (
                      <div className="search-state">
                        No HEXA users found.
                      </div>
                    ) : (
                      people.map(
                        (
                          person
                        ) => (
                          <button
                            type="button"
                            className="person-result"
                            key={
                              person.id
                            }
                            onClick={() =>
                              openPerson(
                                person
                              )
                            }
                          >
                            <Avatar
                              person={
                                person
                              }
                            />

                            <div>
                              <strong>
                                {safeName(
                                  person
                                )}
                              </strong>

                              <span>
                                @
                                {person.username ||
                                  "username"}
                              </span>

                              {person.email && (
                                <small>
                                  {person.email}
                                </small>
                              )}
                            </div>

                            <span className="search-arrow">
                              →
                            </span>
                          </button>
                        )
                      )
                    )}
                  </>
                )}

                {searchMode ===
                  "groups" && (
                  <div className="search-state">
                    HEXA groups will appear
                    here when connected to
                    your group membership
                    tables.
                  </div>
                )}

                {searchMode ===
                  "channels" && (
                  <div className="search-state">
                    HEXA channels will appear
                    here when connected to
                    channel membership
                    tables.
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    );
  }

  /* =======================================================
     STATUS
     ======================================================= */

  function StatusPage() {
    return (
      <div className="page">
        <div className="page-heading">
          <div>
            <span className="eyebrow">
              SOCIAL
            </span>

            <h1>Status</h1>

            <p>
              Your HEXA social updates.
            </p>
          </div>

          <button className="primary-button">
            ＋ Create status
          </button>
        </div>

        <div className="status-layout">
          <div className="status-create-card">
            <div className="status-plus">
              ＋
            </div>

            <strong>
              Create a status
            </strong>

            <p>
              Share an update with your
              HEXA audience.
            </p>
          </div>

          <div className="status-preview">
            <div className="status-profile">
              <Avatar
                person={profile}
              />

              <div>
                <strong>
                  {safeName(
                    profile
                  )}
                </strong>

                <span>
                  Just now
                </span>
              </div>
            </div>

            <div className="status-message">
              Welcome to HEXA.
            </div>

            <div className="status-controls">
              <button>
                ❤️
              </button>
              <button>
                💬
              </button>
              <button>
                ↗
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* =======================================================
     NOTES
     ======================================================= */

  function NotesPage() {
    return (
      <div className="page">
        <div className="page-heading">
          <div>
            <span className="eyebrow">
              PERSONAL WORKSPACE
            </span>

            <h1>Notes</h1>

            <p>
              Capture ideas, plans and
              information inside HEXA.
            </p>
          </div>

          <button className="primary-button">
            ＋ New note
          </button>
        </div>

        <div className="notes-grid">
          {[
            [
              "Welcome to HEXA Notes",
              "Ideas, plans, meeting notes and personal information.",
            ],
            [
              "Project ideas",
              "Keep your next HEXA build organized.",
            ],
            [
              "Quick thoughts",
              "Write something before you forget it.",
            ],
          ].map(
            (note) => (
              <button
                className="note-card"
                key={
                  note[0]
                }
              >
                <span>
                  ✎
                </span>

                <strong>
                  {note[0]}
                </strong>

                <p>
                  {note[1]}
                </p>

                <small>
                  Just now
                </small>
              </button>
            )
          )}
        </div>
      </div>
    );
  }

  /* =======================================================
     DOCUMENTS
     ======================================================= */

  function DocumentsPage() {
    return (
      <div className="page">
        <div className="page-heading">
          <div>
            <span className="eyebrow">
              HEXA DOCUMENTS
            </span>

            <h1>Documents</h1>

            <p>
              Create and manage native HEXA
              documents.
            </p>
          </div>

          <button className="primary-button">
            ＋ New document
          </button>
        </div>

        <div className="document-workspace">
          <div className="document-toolbar">
            <button>
              New
            </button>
            <button>
              Open
            </button>
            <button>
              Save
            </button>
            <button>
              Export
            </button>
          </div>

          <div className="document-page">
            <span className="document-extension">
              .hexa
            </span>

            <h2>
              Untitled HEXA Document
            </h2>

            <p>
              HEXA's native document format is
              <strong>
                {" "}
                .hexa
              </strong>
              .
            </p>

            <div className="document-lines">
              <span />
              <span />
              <span />
              <span />
              <span />
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* =======================================================
     FEATURE PAGES
     ======================================================= */

  function FeaturePage({
    title,
    eyebrow,
    icon,
    description,
  }) {
    return (
      <div className="page">
        <div className="page-heading">
          <div>
            <span className="eyebrow">
              {eyebrow}
            </span>

            <h1>
              {title}
            </h1>

            <p>
              {description}
            </p>
          </div>

          <button className="primary-button">
            ＋ Create
          </button>
        </div>

        <div className="feature-empty">
          <div className="feature-empty-icon">
            {icon}
          </div>

          <h2>
            {title}
          </h2>

          <p>
            The HEXA workspace is ready for
            your Supabase group, channel,
            community and project data.
          </p>

          <div className="feature-tags">
            <span>
              Search
            </span>
            <span>
              Members
            </span>
            <span>
              Roles
            </span>
            <span>
              Permissions
            </span>
            <span>
              Notifications
            </span>
            <span>
              Activity
            </span>
          </div>
        </div>
      </div>
    );
  }

  /* =======================================================
     SETTINGS
     ======================================================= */

  function SettingsPage() {
    return (
      <div className="page">
        <div className="page-heading">
          <div>
            <span className="eyebrow">
              HEXA
            </span>

            <h1>
              Settings
            </h1>

            <p>
              Control your HEXA experience.
            </p>
          </div>
        </div>

        <div className="settings-grid">
          <section className="settings-card">
            <h3>
              Appearance
            </h3>

            <p>
              Choose how HEXA looks.
            </p>

            <div className="theme-options">
              <button
                className={
                  theme ===
                  "dark"
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setTheme(
                    "dark"
                  )
                }
              >
                🌙 Dark
              </button>

              <button
                className={
                  theme ===
                  "light"
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setTheme(
                    "light"
                  )
                }
              >
                ☀ Light
              </button>
            </div>
          </section>

          <section className="settings-card">
            <h3>
              Notifications
            </h3>

            <p>
              Receive HEXA notifications while
              working elsewhere.
            </p>

            <button
              className="secondary-button"
              onClick={
                requestNotifications
              }
            >
              Enable browser notifications
            </button>
          </section>

          <section className="settings-card">
            <h3>
              Connection
            </h3>

            <p>
              HEXA works with an offline message
              queue.
            </p>

            <strong
              className={
                online
                  ? "online-text"
                  : "offline-text"
              }
            >
              {online
                ? "● Connected"
                : "● Offline"}
            </strong>

            <span>
              {queue.length} waiting
              message
              {queue.length ===
              1
                ? ""
                : "s"}
            </span>
          </section>

          <section className="settings-card">
            <h3>
              Profile
            </h3>

            <p>
              Change your public HEXA identity.
            </p>

            <button
              className="secondary-button"
              onClick={() =>
                setShowProfile(
                  true
                )
              }
            >
              Edit profile
            </button>
          </section>
        </div>
      </div>
    );
  }

  /* =======================================================
     PROFILE MODAL
     ======================================================= */

  function ProfileModal() {
    if (!showProfile) {
      return null;
    }

    return (
      <div className="modal-backdrop">
        <div className="modal profile-modal">
          <div className="modal-header">
            <div>
              <span className="eyebrow">
                HEXA PROFILE
              </span>

              <h2>
                Edit profile
              </h2>
            </div>

            <button
              onClick={() =>
                setShowProfile(
                  false
                )
              }
            >
              ×
            </button>
          </div>

          <div className="profile-preview">
            <Avatar
              person={{
                ...profile,
                ...profileDraft,
              }}
              size="lg"
            />

            <div>
              <strong>
                {profileDraft.full_name ||
                  profileDraft.username ||
                  "HEXA User"}
              </strong>

              <span>
                @
                {profileDraft.username ||
                  "username"}
              </span>
            </div>
          </div>

          <label>
            Full name
            <input
              value={
                profileDraft.full_name
              }
              onChange={(event) =>
                setProfileDraft(
                  (current) => ({
                    ...current,
                    full_name:
                      event.target
                        .value,
                  })
                )
              }
            />
          </label>

          <label>
            Username
            <input
              value={
                profileDraft.username
              }
              onChange={(event) =>
                setProfileDraft(
                  (current) => ({
                    ...current,
                    username:
                      event.target
                        .value,
                  })
                )
              }
            />
          </label>

          <label>
            Avatar URL
            <input
              value={
                profileDraft.avatar_url
              }
              onChange={(event) =>
                setProfileDraft(
                  (current) => ({
                    ...current,
                    avatar_url:
                      event.target
                        .value,
                  })
                )
              }
              placeholder="https://..."
            />
          </label>

          <div className="modal-actions">
            <button
              className="secondary-button"
              onClick={() =>
                setShowProfile(
                  false
                )
              }
            >
              Cancel
            </button>

            <button
              className="primary-button"
              onClick={
                saveProfile
              }
            >
              Save profile
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* =======================================================
     CALL MODAL
     ======================================================= */

  function CallModal() {
    if (!showCall) {
      return null;
    }

    return (
      <div className="modal-backdrop">
        <div className="call-modal">
          <div className="call-avatar-large">
            {activeChat?.person ? (
              <Avatar
                person={
                  activeChat.person
                }
                size="lg"
              />
            ) : (
              <div className="default-chat-avatar huge">
                H
              </div>
            )}
          </div>

          <span className="eyebrow">
            {callType ===
            "video"
              ? "VIDEO CALL"
              : "VOICE CALL"}
          </span>

          <h2>
            {activeChat?.name ||
              "HEXA"}
          </h2>

          <p>
            WebRTC connection initialized.
          </p>

          <div className="call-connection">
            <span />
            Cloudflare TURN ready
          </div>

          <button
            className="end-call"
            onClick={() =>
              setShowCall(
                false
              )
            }
          >
            End call
          </button>
        </div>
      </div>
    );
  }

  /* =======================================================
     NOTIFICATIONS PANEL
     ======================================================= */

  function NotificationsPanel() {
    if (
      !showNotifications
    ) {
      return null;
    }

    return (
      <div className="notifications-panel">
        <div className="panel-header">
          <div>
            <strong>
              Notifications
            </strong>

            <span>
              HEXA activity
            </span>
          </div>

          <button
            onClick={() =>
              setNotifications(
                []
              )
            }
          >
            Clear
          </button>
        </div>

        {notifications.length ===
        0 ? (
          <div className="panel-empty">
            No new notifications.
          </div>
        ) : (
          notifications.map(
            (notification) => (
              <div
                className="notification-item"
                key={
                  notification.id
                }
              >
                <span className="notification-dot" />
                <span>
                  {
                    notification.text
                  }
                </span>
              </div>
            )
          )
        )}
      </div>
    );
  }

  /* =======================================================
     SIDEBAR
     ======================================================= */

  function Sidebar() {
    return (
      <aside
        className={`app-sidebar ${
          sidebarOpen
            ? ""
            : "collapsed"
        }`}
      >
        <div className="brand">
          <div className="brand-mark">
            H
          </div>

          {sidebarOpen && (
            <div>
              <strong>
                HEXA
              </strong>

              <span>
                NEXUS
              </span>
            </div>
          )}
        </div>

        <button
          className="new-message-button"
          onClick={() => {
            setPage(
              "chat"
            );

            requestAnimationFrame(
              () =>
                document
                  .querySelector(
                    ".universal-search-input"
                  )
                  ?.focus()
            );
          }}
        >
          ＋
          {sidebarOpen && (
            <span>
              New message
            </span>
          )}
        </button>

        <nav className="main-nav">
          {NAV_ITEMS.map(
            (item) => {
              const [
                id,
                label,
                icon,
              ] = item;

              return (
                <button
                  key={id}
                  className={
                    page === id
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    setPage(
                      id
                    )
                  }
                >
                  <span>
                    {icon}
                  </span>

                  {sidebarOpen && (
                    <label>
                      {label}
                    </label>
                  )}
                </button>
              );
            }
          )}

          <button
            className={
              page ===
              "settings"
                ? "active"
                : ""
            }
            onClick={() =>
              setPage(
                "settings"
              )
            }
          >
            <span>
              ⚙
            </span>

            {sidebarOpen && (
              <label>
                Settings
              </label>
            )}
          </button>
        </nav>

        <div className="sidebar-divider" />

        {sidebarOpen && (
          <div className="sidebar-label">
            DEFAULT CHATS
          </div>
        )}

        {DEFAULT_CHATS.map(
          (chat) => (
            <button
              className="sidebar-chat"
              key={chat.id}
              onClick={() =>
                openDefaultChat(
                  chat
                )
              }
            >
              <div className="sidebar-chat-icon">
                {chat.icon}
              </div>

              {sidebarOpen && (
                <div>
                  <strong>
                    {chat.name}
                  </strong>

                  <span>
                    {chat.id ===
                    "hexa-group"
                      ? "Announcements"
                      : chat.id ===
                        "kora"
                      ? "HEXA AI"
                      : "Private"}
                  </span>
                </div>
              )}
            </button>
          )
        )}

        <div className="sidebar-bottom">
          <div className="connection">
            <span
              className={
                online
                  ? "online-dot"
                  : "offline-dot"
              }
            />

            {sidebarOpen &&
              (online
                ? "Connected"
                : "Offline")}
          </div>

          {sidebarOpen &&
            queue.length >
              0 && (
              <div className="queue-badge">
                {queue.length} waiting
                to sync
              </div>
            )}

          <button
            className="sidebar-profile"
            onClick={() =>
              setShowProfile(
                true
              )
            }
          >
            <Avatar
              person={profile}
              online={
                online
              }
              size="sm"
            />

            {sidebarOpen && (
              <div>
                <strong>
                  {safeName(
                    profile
                  )}
                </strong>

                <span>
                  @
                  {profile?.username ||
                    "username"}
                </span>
              </div>
            )}
          </button>
        </div>
      </aside>
    );
  }

  /* =======================================================
     TOPBAR
     ======================================================= */

  function Topbar() {
    return (
      <header className="topbar">
        <button
          className="mobile-menu"
          onClick={() =>
            setSidebarOpen(
              (value) =>
                !value
            )
          }
        >
          ☰
        </button>

        <UniversalSearch />

        <div className="topbar-actions">
          <button
            onClick={() =>
              setTheme(
                (value) =>
                  value ===
                  "dark"
                    ? "light"
                    : "dark"
              )
            }
            title="Theme"
          >
            {theme ===
            "dark"
              ? "☀"
              : "☾"}
          </button>

          <button
            onClick={() =>
              requestNotifications()
            }
            title="Enable notifications"
          >
            🔔
          </button>

          <button
            className="notification-button"
            onClick={() =>
              setShowNotifications(
                (value) =>
                  !value
              )
            }
          >
            ♢

            {notifications.length >
              0 && (
              <span className="notification-count">
                {notifications.length >
                9
                  ? "9+"
                  : notifications.length}
              </span>
            )}
          </button>

          <button
            className="topbar-profile"
            onClick={() =>
              setShowProfile(
                true
              )
            }
          >
            <Avatar
              person={profile}
              online={
                online
              }
              size="sm"
            />
          </button>
        </div>

        <NotificationsPanel />
      </header>
    );
  }

  /* =======================================================
     ROOT RENDER
     ======================================================= */

  return (
    <div className="hexa-app">
      <Sidebar />

      <div className="app-content">
        <Topbar />

        <main className="workspace">
          {page ===
            "nexus" && (
            <NexusPage />
          )}

          {page ===
            "chat" && (
            <ChatPage />
          )}

          {page ===
            "status" && (
            <StatusPage />
          )}

          {page ===
            "notes" && (
            <NotesPage />
          )}

          {page ===
            "documents" && (
            <DocumentsPage />
          )}

          {page ===
            "groups" && (
            <FeaturePage
              eyebrow="SOCIAL"
              title="Groups"
              icon="◎"
              description="HEXA groups for conversations, roles, permissions, moderation and shared spaces."
            />
          )}

          {page ===
            "channels" && (
            <FeaturePage
              eyebrow="BROADCAST"
              title="Channels"
              icon="▰"
              description="Publish and follow HEXA broadcasts and announcement streams."
            />
          )}

          {page ===
            "communities" && (
            <FeaturePage
              eyebrow="COMMUNITY"
              title="Communities"
              icon="◇"
              description="Organize HEXA groups, topics and people into larger communities."
            />
          )}

          {page ===
            "projects" && (
            <FeaturePage
              eyebrow="WORKSPACE"
              title="Projects"
              icon="▦"
              description="Connect tasks, people, documents, Notes and communication around projects."
            />
          )}

          {page ===
            "settings" && (
            <SettingsPage />
          )}
        </main>
      </div>

      <ProfileModal />
      <CallModal />
    </div>
  );
}