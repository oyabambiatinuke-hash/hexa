import React, { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import "./App.css";

/* HEXA SOURCE FIX: UniversalSearch is defined at top level before AuthenticatedHEXA. */

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

const OFFLINE_QUEUE_KEY = "hexa-message-queue-v5";
const LEGACY_OFFLINE_QUEUE_KEYS = ["hexa-message-queue-v2", "hexa-message-queue-v4"];
const DRAFTS_KEY = "hexa-chat-drafts-v4";

const LOCAL_CHAT_IDS = new Set(["self", "kora", "hexa-system-group"]);

function isHexaUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ""));
}

function isLocalHexaChat(conversation) {
  return Boolean(conversation && LOCAL_CHAT_IDS.has(String(conversation.id)));
}

const HEXA_MAX_MESSAGE_LENGTH = 10000;
const HEXA_MAX_ATTACHMENT_BYTES = 50 * 1024 * 1024;

const HEXA_RUNTIME_CONFIG = {
  supabaseUrl: SUPABASE_URL || "",
  supabaseKey: SUPABASE_KEY || "",
  turnConfigured: Boolean(
    import.meta.env.VITE_TURN_URL &&
    import.meta.env.VITE_TURN_USERNAME &&
    import.meta.env.VITE_TURN_CREDENTIAL
  ),
};

const HEXA_CONFIG_ERROR =
  !HEXA_RUNTIME_CONFIG.supabaseUrl || !HEXA_RUNTIME_CONFIG.supabaseKey
    ? "HEXA is missing its Supabase environment variables. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in your deployment settings."
    : "";
const HEXA_CALL_RATE_KOBO_PER_SECOND = 30;


/* ============================================================
   HEXA EMOJI ENGINE
   A large Unicode emoji library with searchable categories,
   skin tones, recent items, favorites and generated Unicode
   variants. The library is intentionally data-driven so it can
   contain thousands of selectable pictographs without a huge
   hand-maintained array.
   ============================================================ */
const HEXA_EMOJI_STORAGE = "hexa-emoji-v3";
const HEXA_SKIN_TONES = ["", "🏻", "🏼", "🏽", "🏾", "🏿"];
const HEXA_EMOJI_CATEGORIES = {
  "😀 Smileys": "😀 😃 😄 😁 😆 😅 😂 🤣 😊 😇 🙂 🙃 😉 😌 😍 🥰 😘 😗 😙 😚 😋 😛 😝 😜 🤪 🤨 🧐 🤓 😎 🤩 🥳 😏 😒 😞 😔 😟 😕 🙁 ☹️ 😣 😖 😫 😩 🥺 😢 😭 😤 😠 😡 🤬 🤯 😳 🥵 🥶 😱 😨 😰 😥 😓 🤗 🤔 🫣 🤭 🫢 🫡 🤫 🤥 😶 🫠 😐 😑 😬 🙄 😯 😦 😧 😮 😲 🥱 😴 🤤 😪 😵 🫨 🤐 🥴 🤢 🤮 🤧 😷 🤒 🤕 🤑 🤠 😈 👿 👹 👺 🤡 💩 👻 💀 ☠️ 👽 👾 🤖 🎃 😺 😸 😹 😻 😼 😽 🙀 😿 😾 🙈 🙉 🙊".split(" "),
  "❤️ Hearts": "❤️ 🩷 🧡 💛 💚 💙 🩵 💜 🖤 🩶 🤍 🤎 💔 ❤️‍🔥 ❤️‍🩹 ❣️ 💕 💞 💓 💗 💖 💘 💝 💟 ♥️ 💌 💋 💯 💢 💥 💫 💦 💨 💬 💭 💤 ✨ ⭐ 🌟 🔥 🌈".split(" "),
  "👋 Hands": "👋 🤚 🖐️ ✋ 🖖 👌 🤏 ✌️ 🤞 🫰 🤟 🤘 🤙 👈 👉 👆 👇 ☝️ ✍️ 🙏 👏 🙌 👐 🤲 🤝 👍 👎 ✊ 👊 🤛 🤜 🫶 💪 🖕 🫵 💅 🤳".split(" "),
  "👤 People": "👶 🧒 👦 👧 🧑 👱 👨 👩 🧔 👴 👵 🙍 🙎 🙅 🙆 💁 🙋 🧏 🙇 🤦 🤷 👮 🕵️ 💂 🥷 👷 🤴 👸 👳 👲 🧕 🤵 👰 🤰 🫃 🫄 🤱 👼 🎅 🤶 🧑‍🎄 🦸 🦹 🧙 🧚 🧛 🧜 🧝 🧞 🧟 💇 💆 🧖 🚶 🧍 🧎 🏃 💃 🕺 🕴️ 👯 🗣️ 👤 👥".split(" "),
  "🐶 Animals": "🐶 🐱 🐭 🐹 🐰 🦊 🐻 🐼 🐨 🐯 🦁 🐮 🐷 🐽 🐸 🐵 🙈 🙉 🙊 🐒 🐔 🐧 🐦 🐤 🐣 🐥 🦆 🦅 🦉 🦇 🐺 🐗 🐴 🦄 🐝 🪲 🐛 🦋 🐌 🐞 🐜 🪰 🪱 🦟 🦗 🕷️ 🦂 🐢 🐍 🦎 🦖 🦕 🐙 🦑 🦀 🦞 🦐 🐠 🐟 🐡 🦈 🐳 🐋 🐬 🦭 🐊 🦧 🦍 🐘 🦏 🦛 🐪 🐫 🦒 🦘 🦬 🐃 🐂 🐄 🐎 🐖 🐏 🐑 🦙 🐐 🦌 🐕 🐩 🦮 🐕‍🦺 🐈 🐈‍⬛ 🐓 🦃 🦚 🦜 🦢 🦩 🕊️".split(" "),
  "🍔 Food": "🍏 🍎 🍐 🍊 🍋 🍌 🍉 🍇 🍓 🫐 🍈 🍒 🍑 🥭 🍍 🥥 🥝 🍅 🍆 🥑 🥦 🥬 🥒 🌶️ 🫑 🌽 🥕 🫒 🧄 🧅 🥔 🍠 🥐 🥯 🍞 🥖 🥨 🧀 🥚 🍳 🧈 🥞 🧇 🥓 🥩 🍗 🍖 🌭 🍔 🍟 🍕 🫓 🥪 🥙 🧆 🌮 🌯 🫔 🥗 🥘 🍝 🍜 🍲 🍛 🍣 🍱 🥟 🦪 🍤 🍙 🍚 🍘 🍥 🥠 🍡 🍧 🍨 🍦 🥧 🧁 🍰 🎂 🍮 🍭 🍬 🍫 🍿 🍩 🍪 ☕ 🍵 🧃 🥤 🧋".split(" "),
  "⚽ Activities": "⚽ 🏀 🏈 ⚾ 🥎 🎾 🏐 🏉 🥏 🎱 🪀 🏓 🏸 🏒 🏑 🥍 🏏 ⛳ 🏹 🎣 🤿 🥊 🥋 🎽 🛹 🛷 ⛸️ 🥌 🎿 ⛷️ 🏂 🪂 🏋️ 🤼 🤸 ⛹️ 🤺 🤾 🏌️ 🏇 🧘 🏄 🏊 🤽 🚣 🧗 🚵 🚴 🎮 🕹️ 🎲 ♟️ 🎯 🎳 🧩 🪄 🎨 🎭 🎬 🎤 🎧 🎼 🎹 🥁 🎷 🎺 🎸 🪕 🎻 🎪 🎟️ 🎫 🏆 🥇 🥈 🥉 🏅 🎖️".split(" "),
  "🚗 Travel": "🚗 🚕 🚙 🚌 🚎 🏎️ 🚓 🚑 🚒 🚐 🛻 🚚 🚛 🚜 🛵 🏍️ 🛺 🚲 🛴 🚨 🚔 🚍 🚘 🚖 ✈️ 🛫 🛬 🛩️ 💺 🚁 🚀 🛸 🚢 ⛵ 🛥️ 🚤 🛳️ ⚓ 🚂 🚆 🚇 🚊 🚉 🚝 🚞 🚋 🚃 🚏 🗺️ 🗿 🗽 🗼 🏰 🏯 🏟️ 🎡 🎢 🎠 ⛱️ 🏖️ 🏝️ 🏜️ 🌋 ⛰️ 🏕️ ⛺ 🏠 🏡 🏢 🏥 🏦 🏨 🏫 🏛️ ⛪ 🕌 🛕".split(" "),
  "🌿 Nature": "🌱 🌲 🌳 🌴 🌵 🎋 🎍 🍀 ☘️ 🍃 🍂 🍁 🌿 🌾 🌺 🌸 🌼 🌻 🌹 🥀 🌷 💐 🪻 🌎 🌍 🌏 🌕 🌖 🌗 🌘 🌑 🌒 🌓 🌔 🌙 ☀️ 🌞 🌝 ⭐ 🌟 🌈 ☁️ ⛅ 🌤️ 🌥️ 🌦️ 🌧️ ⛈️ 🌩️ 🌨️ ❄️ ☃️ ⛄ 🌬️ 💨 💧 💦 🔥 🌊 🌪️ 🌫️".split(" "),
  "💻 Objects": "⌚ 📱 💻 ⌨️ 🖥️ 🖨️ 🖱️ 💾 💿 📷 📸 📹 🎥 📺 📻 🎙️ 🎚️ 🎛️ ☎️ 📞 📟 📠 🔋 🔌 💡 🔦 🕯️ 🧯 🛒 💰 💎 🔑 🗝️ 🔒 🔓 🔐 🛠️ 🔨 ⚒️ 🪚 🔧 🪛 🔩 ⚙️ 🧰 🧲 🧪 🧬 🔬 🔭 📚 📖 📝 ✏️ 🖊️ 🖋️ 📎 📌 📍 📐 📏 ✂️ 🗑️ 📦 📫 📬 📮 🗂️ 📁 📂 🗃️ 🗄️ 📰 🗞️ 📃 📄 📑 🔖".split(" "),
  "🎉 Celebration": "🎉 🎊 🎈 🎂 🎁 🎀 🎗️ 🎟️ 🎫 🏆 🏅 🥇 🥈 🥉 🎖️ 🎆 🎇 ✨ 🎃 🧨 🎄 🎅 🤶 🕎 🎍 🎋 🎑 🎐 🎎 🎏 🪅 🪩 🥳 🍾 🥂 🎵 🎶 🎤 🎧".split(" "),
  "☑️ Symbols": "☮️ ✝️ ☪️ 🕉️ ☯️ ☸️ ✡️ 🔯 🕎 ☦️ 🛐 ⚛️ ♾️ ☢️ ☣️ ⚠️ 🚸 🔱 ⚜️ 🔰 ⭕ ❌ ❗ ❓ ⁉️ ‼️ ✔️ ☑️ 🔘 🔴 🟠 🟡 🟢 🔵 🟣 ⚫ ⚪ 🟤 🔺 🔻 🔶 🔷 🔸 🔹 ▪️ ▫️ ◾ ◽ ◼️ ◻️ ⬛ ⬜".split(" "),
  "🏳️ Flags": "🏳️ 🏴 🏁 🚩 🏳️‍🌈 🏳️‍⚧️ 🇳🇬 🇺🇸 🇬🇧 🇨🇦 🇦🇺 🇳🇿 🇿🇦 🇰🇪 🇬🇭 🇺🇬 🇹🇿 🇷🇼 🇪🇬 🇲🇦 🇩🇿 🇸🇳 🇨🇮 🇫🇷 🇩🇪 🇮🇹 🇪🇸 🇵🇹 🇧🇷 🇦🇷 🇲🇽 🇯🇵 🇨🇳 🇰🇷 🇮🇳 🇵🇰 🇸🇦 🇦🇪 🇹🇷 🇷🇺".split(" "),
};

const HEXA_HUMAN_BASES = [
  "👶","🧒","👦","👧","🧑","👨","👩","🧔","👴","👵","🙍","🙎","🙅","🙆","💁","🙋","🧏","🙇","🤦","🤷","👮","🕵️","💂","🥷","👷","👳","🧕","🤵","👰","🤰","🫃","🫄","🤱","🦸","🦹","🧙","🧚","🧛","🧜","🧝","🧞","🧟","💇","💆","🧖","🚶","🧍","🧎","🏃","💃","🕺","🧘","🏋️","🤼","🤸","⛹️","🤺","🤾","🏌️","🏇","🏄","🏊","🤽","🚣","🧗","🚵","🚴","🫶","👏","🙌","🙏","🤝","👍","👎","👊","✊","🤛","🤜","🤟","🤘","🤙","👌","🤏","✌️","🤞","🫰","🖐️","✋","🤚","🖖","👈","👉","👆","👇","☝️","🫵","💪","🖕","💅","🤳","✍️","🤲","👐","👋"
];

const HEXA_PROFESSION_EMOJIS = "🧑‍⚕️ 👨‍⚕️ 👩‍⚕️ 🧑‍🎓 👨‍🎓 👩‍🎓 🧑‍🏫 👨‍🏫 👩‍🏫 🧑‍💻 👨‍💻 👩‍💻 🧑‍🔬 👨‍🔬 👩‍🔬 🧑‍🍳 👨‍🍳 👩‍🍳 🧑‍🚀 👨‍🚀 👩‍🚀 🧑‍🚒 👨‍🚒 👩‍🚒 🧑‍✈️ 👨‍✈️ 👩‍✈️ 🧑‍⚖️ 👨‍⚖️ 👩‍⚖️ 🧑‍🎨 👨‍🎨 👩‍🎨 🧑‍🔧 👨‍🔧 👩‍🔧 🧑‍🏭 👨‍🏭 👩‍🏭 🧑‍🌾 👨‍🌾 👩‍🌾 🧑‍🎤 👨‍🎤 👩‍🎤".split(" ");
const HEXA_FAMILY_EMOJIS = "👪 👨‍👩‍👦 👨‍👩‍👧 👨‍👩‍👧‍👦 👨‍👩‍👦‍👦 👨‍👩‍👧‍👧 👨‍👨‍👦 👨‍👨‍👧 👩‍👩‍👦 👩‍👩‍👧 👨‍👦 👨‍👧 👩‍👦 👩‍👧 👨‍👦‍👦 👩‍👧‍👧 🧑‍🧑‍🧒 🧑‍🧑‍🧒‍🧒".split(" ");

function hexSkinVariants(emoji) {
  const human = /👶|🧒|👦|👧|🧑|👨|👩|🧔|👴|👵|🙍|🙎|🙅|🙆|💁|🙋|🧏|🙇|🤦|🤷|👮|🕵|💂|🥷|👷|👳|🧕|🤵|👰|🤰|🫃|🫄|🤱|🦸|🦹|🧙|🧚|🧛|🧜|🧝|🧞|🧟|💇|💆|🧖|🚶|🧍|🧎|🏃|💃|🕺|🧘|🏋|🤼|🤸|⛹|🤺|🤾|🏌|🏇|🏄|🏊|🤽|🚣|🧗|🚵|🚴|🫶|👏|🙌|🙏|🤝|👍|👎|👊|✊|🤛|🤜|🤟|🤘|🤙|👌|🤏|✌|🤞|🫰|🖐|✋|🤚|🖖|👈|👉|👆|👇|☝|🫵|💪|🖕|💅|🤳|✍|🤲|👐|👋/.test(emoji);
  if (!human) return [emoji];
  return [emoji, ...HEXA_SKIN_TONES.slice(1).map(tone => `${emoji}${tone}`)];
}

function buildUnicodeEmojiLibrary() {
  const seed = [
    ...Object.values(HEXA_EMOJI_CATEGORIES).flat(),
    ...HEXA_HUMAN_BASES,
    ...HEXA_PROFESSION_EMOJIS,
    ...HEXA_FAMILY_EMOJIS,
  ];
  const generated = [];

  // Regional-indicator pairs produce the complete two-letter flag space.
  for (let a = 0x1f1e6; a <= 0x1f1ff; a += 1) {
    for (let b = 0x1f1e6; b <= 0x1f1ff; b += 1) {
      generated.push(String.fromCodePoint(a, b));
    }
  }

  // Include pictographic Unicode characters supported by modern browsers.
  // This gives HEXA a genuinely large selectable Unicode library rather than
  // pretending a short hand-written list is thousands of emojis.
  const pictographic = [];
  for (const [from, to] of [
    [0x1f000, 0x1faff],
    [0x1fc00, 0x1ffff],
    [0x2300, 0x23ff],
    [0x2500, 0x27bf],
    [0x2b00, 0x2bff],
  ]) {
    for (let cp = from; cp <= to; cp += 1) {
      const value = String.fromCodePoint(cp);
      try {
        if (/\p{Extended_Pictographic}/u.test(value)) pictographic.push(value);
      } catch {
        // Older engines simply use the seed list.
      }
    }
  }

  return Array.from(new Set([
    ...seed.flatMap(hexSkinVariants),
    ...generated,
    ...pictographic,
  ]));
}

const HEXA_ALL_EMOJIS = buildUnicodeEmojiLibrary();

function readEmojiPrefs() {
  try {
    return JSON.parse(localStorage.getItem(HEXA_EMOJI_STORAGE) || '{"recent":[],"favorites":[]}');
  } catch {
    return { recent: [], favorites: [] };
  }
}

function writeEmojiPrefs(data) {
  try { localStorage.setItem(HEXA_EMOJI_STORAGE, JSON.stringify(data)); } catch {}
}

/* ============================================================
   HEXA THEME SYSTEM
   ============================================================ */

const HEXA_THEME_KEY = "hexa-theme-v5";

const HEXA_THEMES = {
  midnight: {
    id: "midnight",
    name: "Midnight",
    icon: "🌌",
    description: "The original deep HEXA experience.",
    vars: {
      "--hexa-bg": "#07090d",
      "--hexa-panel": "#0d1118",
      "--hexa-panel-2": "#111722",
      "--hexa-panel-3": "#171e2b",
      "--hexa-border": "rgba(255,255,255,.08)",
      "--hexa-border-strong": "rgba(255,255,255,.14)",
      "--hexa-text": "#f4f7fb",
      "--hexa-muted": "#8e99aa",
      "--hexa-accent": "#7c5cff",
      "--hexa-accent-2": "#a78bfa",
      "--hexa-success": "#30d158",
      "--hexa-danger": "#ff4d67",
      "--hexa-shadow": "0 24px 70px rgba(0,0,0,.35)",
      "--hexa-chat-bg": "#090d14",
      "--hexa-message-in": "#171e2b",
      "--hexa-message-out": "#4b3ca7",
      "--hexa-sidebar": "#090c12"
    }
  },

  aurora: {
    id: "aurora",
    name: "Aurora",
    icon: "🌈",
    description: "Purple, blue and cyan HEXA.",
    vars: {
      "--hexa-bg": "#071017",
      "--hexa-panel": "#0b1720",
      "--hexa-panel-2": "#10212c",
      "--hexa-panel-3": "#16303b",
      "--hexa-border": "rgba(115,230,255,.10)",
      "--hexa-border-strong": "rgba(115,230,255,.20)",
      "--hexa-text": "#effcff",
      "--hexa-muted": "#8faab5",
      "--hexa-accent": "#00d9ff",
      "--hexa-accent-2": "#8b7cff",
      "--hexa-success": "#37e58c",
      "--hexa-danger": "#ff5d79",
      "--hexa-shadow": "0 24px 70px rgba(0,0,0,.45)",
      "--hexa-chat-bg": "#08141b",
      "--hexa-message-in": "#12303a",
      "--hexa-message-out": "#214f73",
      "--hexa-sidebar": "#07131a"
    }
  },

  ocean: {
    id: "ocean",
    name: "Ocean",
    icon: "🌊",
    description: "Clean blue HEXA.",
    vars: {
      "--hexa-bg": "#06111d",
      "--hexa-panel": "#0a1928",
      "--hexa-panel-2": "#0e2234",
      "--hexa-panel-3": "#14304a",
      "--hexa-border": "rgba(110,190,255,.10)",
      "--hexa-border-strong": "rgba(110,190,255,.20)",
      "--hexa-text": "#f1f8ff",
      "--hexa-muted": "#91a8bb",
      "--hexa-accent": "#168cff",
      "--hexa-accent-2": "#67b7ff",
      "--hexa-success": "#30d98b",
      "--hexa-danger": "#ff5875",
      "--hexa-shadow": "0 24px 70px rgba(0,0,0,.45)",
      "--hexa-chat-bg": "#071522",
      "--hexa-message-in": "#12304a",
      "--hexa-message-out": "#075da8",
      "--hexa-sidebar": "#071522"
    }
  },

  emerald: {
    id: "emerald",
    name: "Emerald",
    icon: "💚",
    description: "A fresh green HEXA theme.",
    vars: {
      "--hexa-bg": "#07120d",
      "--hexa-panel": "#0c1b13",
      "--hexa-panel-2": "#11271b",
      "--hexa-panel-3": "#183722",
      "--hexa-border": "rgba(100,255,170,.09)",
      "--hexa-border-strong": "rgba(100,255,170,.18)",
      "--hexa-text": "#f2fff7",
      "--hexa-muted": "#91aa9b",
      "--hexa-accent": "#18c979",
      "--hexa-accent-2": "#5df0a7",
      "--hexa-success": "#35e88c",
      "--hexa-danger": "#ff5870",
      "--hexa-shadow": "0 24px 70px rgba(0,0,0,.45)",
      "--hexa-chat-bg": "#08160f",
      "--hexa-message-in": "#153322",
      "--hexa-message-out": "#087847",
      "--hexa-sidebar": "#07150e"
    }
  },

  rose: {
    id: "rose",
    name: "Rose",
    icon: "🌹",
    description: "Elegant pink and violet HEXA.",
    vars: {
      "--hexa-bg": "#13090f",
      "--hexa-panel": "#1c0e17",
      "--hexa-panel-2": "#27121e",
      "--hexa-panel-3": "#351827",
      "--hexa-border": "rgba(255,130,190,.10)",
      "--hexa-border-strong": "rgba(255,130,190,.20)",
      "--hexa-text": "#fff4fa",
      "--hexa-muted": "#b39aa9",
      "--hexa-accent": "#ec4f9d",
      "--hexa-accent-2": "#b875ff",
      "--hexa-success": "#38d996",
      "--hexa-danger": "#ff5575",
      "--hexa-shadow": "0 24px 70px rgba(0,0,0,.45)",
      "--hexa-chat-bg": "#160b12",
      "--hexa-message-in": "#35182a",
      "--hexa-message-out": "#8f2860",
      "--hexa-sidebar": "#12090f"
    }
  },

  white: {
    id: "white",
    name: "HEXA Light",
    icon: "☀️",
    description: "Bright HEXA for daytime use.",
    vars: {
      "--hexa-bg": "#f4f6fa",
      "--hexa-panel": "#ffffff",
      "--hexa-panel-2": "#f0f2f6",
      "--hexa-panel-3": "#e6e9ef",
      "--hexa-border": "rgba(20,30,50,.10)",
      "--hexa-border-strong": "rgba(20,30,50,.16)",
      "--hexa-text": "#111827",
      "--hexa-muted": "#667085",
      "--hexa-accent": "#6947ff",
      "--hexa-accent-2": "#765cff",
      "--hexa-success": "#16a36a",
      "--hexa-danger": "#e53958",
      "--hexa-shadow": "0 24px 70px rgba(20,30,50,.12)",
      "--hexa-chat-bg": "#eef1f5",
      "--hexa-message-in": "#ffffff",
      "--hexa-message-out": "#ddd5ff",
      "--hexa-sidebar": "#ffffff"
    }
  },

  black: {
    id: "black",
    name: "True Black",
    icon: "🖤",
    description: "OLED-style HEXA.",
    vars: {
      "--hexa-bg": "#000000",
      "--hexa-panel": "#050505",
      "--hexa-panel-2": "#0a0a0a",
      "--hexa-panel-3": "#111111",
      "--hexa-border": "rgba(255,255,255,.08)",
      "--hexa-border-strong": "rgba(255,255,255,.16)",
      "--hexa-text": "#ffffff",
      "--hexa-muted": "#8b8b8b",
      "--hexa-accent": "#8b5cff",
      "--hexa-accent-2": "#b08cff",
      "--hexa-success": "#30d158",
      "--hexa-danger": "#ff375f",
      "--hexa-shadow": "0 24px 70px rgba(0,0,0,.65)",
      "--hexa-chat-bg": "#020202",
      "--hexa-message-in": "#111111",
      "--hexa-message-out": "#36227a",
      "--hexa-sidebar": "#000000"
    }
  }
};

function getSavedHexaTheme() {
  try {
    const saved = localStorage.getItem(HEXA_THEME_KEY);

    if (saved && HEXA_THEMES[saved]) {
      return saved;
    }
  } catch (error) {
    console.warn("HEXA theme restore failed:", error);
  }

  return "midnight";
}

function applyHexaTheme(themeId) {
  const theme = HEXA_THEMES[themeId] || HEXA_THEMES.midnight;

  const root = document.documentElement;

  Object.entries(theme.vars).forEach(([property, value]) => {
    root.style.setProperty(property, value);
  });

  root.dataset.hexaTheme = theme.id;

  try {
    localStorage.setItem(HEXA_THEME_KEY, theme.id);
  } catch (error) {
    console.warn("HEXA theme save failed:", error);
  }
}

function initializeHexaTheme() {
  if (typeof window === "undefined") return;

  applyHexaTheme(getSavedHexaTheme());
}

if (typeof window !== "undefined") {
  initializeHexaTheme();
}

const NAV_ITEMS = [
  { id: "chat", label: "Chats", icon: "💬" },
  { id: "status", label: "Status", icon: "◌" },
  { id: "groups", label: "Groups", icon: "👥" },
  { id: "communities", label: "Communities", icon: "◉" },
  { id: "channels", label: "Channels", icon: "▣" },
  { id: "calls", label: "Calls", icon: "☎" },
  { id: "kora", label: "Kora", icon: "✦" },
  { id: "settings", label: "Settings", icon: "⚙" },
];

const HEXA_FEATURES = [
  ["Messaging", "1:1 chats", "Group chats", "Replies", "Forward", "Edit", "Delete for me/everyone", "Copy", "Star", "Pin", "Search", "Reactions", "Emoji + skin tones", "GIFs", "Stickers", "Animated stickers", "Images", "Videos", "Files", "Audio", "Voice messages", "Playback speed", "Waveform", "Contacts", "Current/live location", "Polls", "Link previews", "Mentions", "Timestamps", "Delivered/read", "Typing/recording", "Unread counts", "Drafts", "Disappearing messages", "View-once media"],
  ["Groups", "Create", "Add/remove members", "Owner", "Multiple admins", "Permissions", "Invite links", "Name/photo/description", "Member search", "Mentions", "Announcements", "Group media/files", "Polls", "Reactions", "Replies", "Group calls", "Participant management", "Leave/report/delete"],
  ["Calls", "1:1 voice", "1:1 video", "Group voice", "Group video", "Incoming/outgoing", "Accept/decline/missed", "Mute", "Speaker", "Camera", "Front/rear camera", "PiP", "Call history", "Add participants", "Call links", "Privacy/security", "WebRTC", "STUN/TURN", "Network quality"],
  ["Status", "Text/photo/video/GIF", "Captions", "Emoji/stickers/drawing", "Privacy", "Viewers", "Seen/unseen", "Reactions", "Replies", "Navigation", "24-hour expiry", "Delete", "Notifications", "Mute"],
  ["Channels", "Create/follow/unfollow", "Profile", "Posts", "Media", "Links", "Polls", "Reactions", "Forward/share", "Search", "Notifications", "Admins", "Followers", "Privacy", "Verification"],
  ["Search", "Contacts", "Chats", "Messages", "Groups", "Channels", "Media", "Documents", "Links", "GIFs", "Audio", "Date filters", "Within conversation", "Advanced filters"],
  ["Profiles & Contacts", "Photo", "Name", "About", "Phone", "QR", "Add/invite", "Block/report", "Last seen", "Online", "Privacy", "Read receipts", "Group-add controls"],
  ["Privacy & Security", "E2E encryption", "Encrypted calls", "2FA", "Passkeys", "App lock", "Biometrics", "Security notifications", "Disappearing", "View-once", "Privacy checkup", "Device management", "Linked devices", "Logout"],
  ["Media & Files", "Camera", "Gallery", "Multiple selection", "Preview", "Compression", "Original quality", "Download", "Forward", "Delete", "Auto-download", "Storage management"],
  ["Organization", "Starred", "Pinned", "Archived", "Favorites", "Unread", "Chat filters", "Folders/categories", "Saved search"],
  ["Notifications", "Messages", "Groups", "Calls", "Missed calls", "Status", "Mentions", "Replies", "Reactions", "Channels", "Sounds", "Vibration", "Previews", "Mute", "Custom notifications"],
  ["Business messaging", "Business profiles", "Catalogs", "Customer messaging", "Broadcasts", "Automated replies", "Labels", "Business tools"],
  ["Communities", "Create", "Description/icon", "Groups", "Announcement group", "Admins", "Members", "Invites", "Notifications", "Announcements"],
  ["Broadcasts", "Create list", "Send to many", "Manage", "Private replies", "Edit/delete"],
  ["Polls", "Single choice", "Multiple choice", "Multiple answers", "Vote", "Change vote", "Results", "Forward", "Reactions", "Replies"],
  ["Location", "Current", "Live", "Select", "Preview", "Stop sharing", "Duration", "Maps"],
  ["Camera & Editing", "Photo", "Video", "Front/rear", "Flash", "Crop", "Rotate", "Draw", "Text", "Emoji", "Stickers", "Captions", "Trim video"],
  ["Personalization", "Dark/light", "Themes", "Wallpaper", "Fonts/display", "Notifications", "Custom wallpapers", "Chat-specific settings"],
  ["Backup & Restore", "Chat backup", "Media backup", "Restore", "Transfer", "Encrypted backup", "Frequency/settings"],
  ["AI", "Assistant", "AI search", "Writing help", "Summaries", "Image generation", "Image editing", "AI stickers", "Recommendations"],
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
    messages: [],
  },
  {
    id: "self",
    name: "YOU",
    kind: "self",
    readOnly: false,
    online: true,
    avatar: "Y",
    description: "Your personal space",
    messages: [],
  },
  {
    id: "kora",
    name: "Kora",
    kind: "ai",
    readOnly: false,
    online: true,
    avatar: "K",
    description: "HEXA AI",
    messages: [],
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

function readJsonStorage(key, fallback) {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; } catch { return fallback; }
}
function writeJsonStorage(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

function readLocalQueue() {
  try {
    const current = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || "[]");
    const legacy = LEGACY_OFFLINE_QUEUE_KEYS.flatMap((key) => {
      try {
        const value = JSON.parse(localStorage.getItem(key) || "[]");
        return Array.isArray(value) ? value : [];
      } catch {
        return [];
      }
    });

    const merged = [...legacy, ...(Array.isArray(current) ? current : [])];
    const unique = new Map();
    merged.forEach((item) => {
      if (!item) return;
      const key = item.id || `${item.conversation_id || "unknown"}:${item.created_at || ""}:${item.content || ""}`;
      unique.set(key, item);
    });
    return Array.from(unique.values());
  } catch {
    return [];
  }
}

function writeLocalQueue(queue) {
  try {
    const safeQueue = Array.isArray(queue) ? queue : [];
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(safeQueue));
    LEGACY_OFFLINE_QUEUE_KEYS.forEach((key) => localStorage.removeItem(key));
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

function validateMessageInput(text, attachment) {
  const cleanText = String(text || "").trim();

  if (cleanText.length > HEXA_MAX_MESSAGE_LENGTH) {
    return `Messages can contain up to ${HEXA_MAX_MESSAGE_LENGTH.toLocaleString()} characters.`;
  }

  if (attachment?.size && attachment.size > HEXA_MAX_ATTACHMENT_BYTES) {
    return "Attachments must be 50 MB or smaller.";
  }

  return "";
}

function safeAlert(message) {
  if (typeof window !== "undefined") {
    window.alert(message);
  }
}

/* ============================================================
   PROFILE
   ============================================================ */

async function ensureHexaProfile(user) {
  if (!user?.id || !isHexaUuid(user.id)) {
    throw new Error("HEXA received an invalid authenticated user id.");
  }

  const metadata = user.user_metadata || {};
  const fullName = String(
    metadata.full_name || metadata.name || metadata.display_name || ""
  ).trim();
  const avatarUrl = metadata.avatar_url || metadata.picture || null;

  const makeUniqueUsername = async () => {
    const base = makeUsername(user.email, fullName).slice(0, 30);
    let candidate = base;

    for (let attempt = 0; attempt < 8; attempt += 1) {
      const { data, error } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", candidate)
        .neq("id", user.id)
        .maybeSingle();

      if (error) throw error;
      if (!data) return candidate;

      const suffix = String(Math.floor(1000 + Math.random() * 9000));
      candidate = `${base.slice(0, Math.max(3, 30 - suffix.length))}${suffix}`
        .slice(0, 30);
    }

    return `${base.slice(0, 22)}${Date.now().toString().slice(-8)}`.slice(0, 30);
  };

  // Read the user's row first. maybeSingle() returning null is normal for a
  // brand-new account and must not be treated as a database failure.
  const { data: existing, error: lookupError } = await supabase
    .from("profiles")
    .select("id,email,username,full_name,avatar_url,updated_at")
    .eq("id", user.id)
    .maybeSingle();

  if (lookupError) {
    throw new Error(`HEXA profile lookup failed: ${lookupError.message}`);
  }

  if (existing) {
    if (!existing.username || !String(existing.username).trim()) {
      const repairedUsername = await makeUniqueUsername();
      const { data: repaired, error: repairError } = await supabase
        .from("profiles")
        .update({
          username: repairedUsername,
          full_name: existing.full_name || fullName || repairedUsername,
          display_name: existing.display_name || existing.full_name || fullName || repairedUsername,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id)
        .select("id,email,username,full_name,avatar_url,updated_at")
        .maybeSingle();
      if (repairError) throw new Error(`HEXA username repair failed: ${repairError.message}`);
      return repaired || { ...existing, username: repairedUsername };
    }
    return existing;
  }

  const username = await makeUniqueUsername();
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
    .select("id,email,username,full_name,avatar_url,updated_at")
    .maybeSingle();

  if (!insertError && created) {
    return created;
  }

  // A Supabase trigger can create the profile between our lookup and insert.
  // In that race, re-read the row and keep the authenticated session alive.
  const { data: retry, error: retryError } = await supabase
    .from("profiles")
    .select("id,email,username,full_name,avatar_url,updated_at")
    .eq("id", user.id)
    .maybeSingle();

  if (retryError) {
    throw new Error(
      `HEXA profile creation failed: ${insertError?.message || retryError.message}`
    );
  }

  if (retry) return retry;

  throw new Error(
    `HEXA profile creation failed: ${insertError?.message || "no profile row was returned"}`
  );
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
              src={profile?.avatar_url ? `${profile.avatar_url}${profile.avatar_url.includes("?") ? "&" : "?"}v=${encodeURIComponent(profile?.updated_at || "")}` : null}
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
          🔔{notificationCount > 0 && <b>{notificationCount > 99 ? "99+" : notificationCount}</b>}
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
        {HEXA_FEATURES.slice(0, 12).map(([title, ...items]) => (
          <button key={title} className="feature-card" onClick={() => setActivePage(title === "Messaging" ? "chat" : title === "Groups" ? "groups" : title === "Status" ? "status" : title === "Calls" ? "calls" : title === "Channels" ? "channels" : title === "Communities" ? "communities" : title === "AI" ? "kora" : "settings")}>
            <span>{({Messaging:"💬",Groups:"👥",Calls:"☎",Status:"◌",Channels:"▣",Communities:"◉",Search:"⌕",Profiles:"👤", "Privacy & Security":"🔐", "Media & Files":"📁",Organization:"⭐",Notifications:"🔔"})[title] || "✦"}</span>
            <strong>{title}</strong>
            <p>{items.slice(0, 6).join(" · ")}</p>
          </button>
        ))}
      </div>
    </section>
  );
}

/* ============================================================
   CHAT
   ============================================================ */


/* ============================================================
   KORA — OPENAI CONNECTED ASSISTANT
   The browser never receives the OpenAI secret. Kora calls a
   server endpoint (/api/kora by default), which must keep the
   OPENAI_API_KEY on the server side.
   ============================================================ */

async function askKora({ messages, profile }) {
  const endpoint = import.meta.env.VITE_KORA_API_URL || "/api/kora";
  if (!endpoint) throw new Error("Kora API endpoint is not configured.");
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({
      profile: {
        id: profile?.id || null,
        name: profile?.display_name || profile?.full_name || profile?.username || "HEXA user",
        username: profile?.username || null,
      },
      messages: messages.filter(Boolean).slice(-32).map((message) => ({
        role: message.role === "kora" || message.role === "assistant" ? "assistant" : "user",
        content: String(message.text || message.content || ""),
      })),
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error || payload?.message || `Kora request failed (${response.status})`);
  }
  const answer = payload?.text || payload?.message || payload?.output_text || payload?.output;
  if (!answer) throw new Error("Kora connected, but the server returned no answer.");
  return String(answer);
}

function KoraPage({ profile }) {
  const [messages, setMessages] = useState([
    {
      id: "kora-welcome",
      role: "kora",
      text: `Hi ${profile?.display_name || profile?.full_name || profile?.username || "there"}. I’m Kora, your OpenAI-powered HEXA assistant.`,
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  async function send(event) {
    event?.preventDefault();
    const text = input.trim();
    if (!text || busy) return;

    const nextMessages = [...messages, {
      id: `user-${Date.now()}`,
      role: "user",
      text,
    }];

    setMessages(nextMessages);
    setInput("");
    setError("");
    setBusy(true);

    try {
      const answer = await askKora({ messages: nextMessages.slice(-24), profile });
      setMessages((current) => [
        ...current,
        {
          id: `kora-${Date.now()}`,
          role: "kora",
          text: answer,
        },
      ]);
    } catch (err) {
      console.error("HEXA Kora error:", err);
      setError(err?.message || "Kora could not respond.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="workspace-page kora-page">
      <div className="page-heading">
        <div className="page-heading-icon">✦</div>
        <div>
          <h1>Kora</h1>
          <p>OpenAI-powered assistant built into HEXA.</p>
        </div>
        <span className="settings-status">OpenAI connected</span>
      </div>

      <div className="kora-shell">
        <div className="kora-messages">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`kora-message ${message.role === "user" ? "own" : ""}`}
            >
              <div className="kora-message-avatar">{message.role === "user" ? "You" : "K"}</div>
              <div className="kora-message-bubble">{message.text}</div>
            </div>
          ))}

          {busy && (
            <div className="kora-message">
              <div className="kora-message-avatar">K</div>
              <div className="kora-message-bubble kora-typing">Kora is thinking…</div>
            </div>
          )}

          <div ref={endRef} />
        </div>

        {error && <div className="kora-error">{error}</div>}

        <form className="kora-composer" onSubmit={send}>
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                send(event);
              }
            }}
            placeholder="Message Kora…"
            rows={1}
            disabled={busy}
          />
          <button className="hero-primary" type="submit" disabled={!input.trim() || busy}>
            {busy ? "…" : "Send"}
          </button>
        </form>
      </div>
    </section>
  );
}

function formatChatTime(value) {
  if (!value) return "";

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  const now =
    new Date();

  if (
    date.toDateString() ===
    now.toDateString()
  ) {
    return date.toLocaleTimeString(
      [],
      {
        hour: "numeric",
        minute: "2-digit"
      }
    );
  }

  const yesterday =
    new Date(now);

  yesterday.setDate(
    yesterday.getDate() - 1
  );

  if (
    date.toDateString() ===
    yesterday.toDateString()
  ) {
    return "Yesterday";
  }

  return date.toLocaleDateString(
    [],
    {
      day: "numeric",
      month: "short"
    }
  );
}
/* ============================================================
   HEXA CHAT
   HEXA-style master/detail messaging experience
   ============================================================ */

async function ensureHexaDirectConversation({ profileId, otherUserId, otherProfile }) {
  if (!isHexaUuid(profileId) || !isHexaUuid(otherUserId) || String(profileId) === String(otherUserId)) {
    throw new Error("Invalid HEXA conversation participants.");
  }
  let conversation = null;
  try {
    const rpc = await supabase.rpc("hexa_get_or_create_direct", { p_other_user_id: otherUserId });
    const row = Array.isArray(rpc.data) ? rpc.data[0] : rpc.data;
    if (!rpc.error && row?.id && isHexaUuid(row.id)) conversation = row;
  } catch {}
  if (!conversation) {
    const direct = await supabase.from("conversations").select("*").eq("type", "direct")
      .or(`and(user_a.eq.${profileId},user_b.eq.${otherUserId}),and(user_a.eq.${otherUserId},user_b.eq.${profileId})`)
      .limit(1).maybeSingle();
    if (direct.error) throw direct.error;
    conversation = direct.data;
  }
  if (!conversation) {
    const created = await supabase.from("conversations").insert({
      type: "direct", name: otherProfile?.full_name || otherProfile?.username || "HEXA User",
      created_by: profileId, owner_id: profileId, user_a: profileId, user_b: otherUserId
    }).select("*").single();
    if (created.error) throw created.error;
    conversation = created.data;
  }
  const members = await supabase.from("conversation_members").upsert([
    { conversation_id: conversation.id, user_id: profileId, is_admin: false },
    { conversation_id: conversation.id, user_id: otherUserId, is_admin: false },
  ], { onConflict: "conversation_id,user_id", ignoreDuplicates: true });
  if (members.error) throw members.error;
  return { ...conversation, id: conversation.id, realConversationId: conversation.id, kind: "direct", type: "direct",
    name: otherProfile?.full_name || otherProfile?.username || conversation.name || "HEXA User",
    username: otherProfile?.username || "", avatar_url: otherProfile?.avatar_url || null, otherUserId, unread: 0 };
}

function ChatPage({
  profile,
  initialConversation,
  onStartCall,
  onOpenChatWithUser
}) {
  const [conversations, setConversations] = useState(
    DEFAULT_CONVERSATIONS
  );

  const [selected, setSelected] = useState(
    initialConversation || DEFAULT_CONVERSATIONS[0]
  );

  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");

  const [loading, setLoading] = useState(false);
  const [loadingConversations, setLoadingConversations] =
    useState(false);

  const [chatSearch, setChatSearch] = useState("");
  const [messageSearch, setMessageSearch] = useState("");

  const [mobileConversationOpen, setMobileConversationOpen] =
    useState(Boolean(initialConversation));

  const [newChatOpen, setNewChatOpen] = useState(false);
  const [newChatSearch, setNewChatSearch] = useState("");
  const [peopleResults, setPeopleResults] = useState([]);
  const [peopleLoading, setPeopleLoading] = useState(false);
  const [messageRequestsOpen, setMessageRequestsOpen] = useState(false);
  const [messageRequests, setMessageRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [chatFilter, setChatFilter] = useState("all");
  const [chatFolders, setChatFolders] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("hexa-chat-folders") || '[{"id":"family","name":"Family"}]');
    } catch {
      return [{ id: "family", name: "Family" }];
    }
  });
  const [activeChatFolder, setActiveChatFolder] = useState("all");
  const [chatFolderMenuOpen, setChatFolderMenuOpen] = useState(false);
  const [chatFolderAssignOpen, setChatFolderAssignOpen] = useState(false);

  const [replyTo, setReplyTo] = useState(null);
  const [editing, setEditing] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [reactionMenu, setReactionMenu] = useState(null);

  const [forwardOpen, setForwardOpen] = useState(false);
  const [forwardMessage, setForwardMessage] = useState(null);

  const [emojiOpen, setEmojiOpen] = useState(false);

  const emojiPrefs = useMemo(() => readEmojiPrefs(), []);
  const [emojiCategory, setEmojiCategory] = useState("😀 Smileys");
  const [emojiSearch, setEmojiSearch] = useState("");
  const [emojiTone, setEmojiTone] = useState("");
  const [emojiRecent, setEmojiRecent] = useState(emojiPrefs.recent || []);
  const [emojiFavorites, setEmojiFavorites] = useState(emojiPrefs.favorites || []);

  const insertHexaEmoji = (emoji) => {
    const value = emojiTone && !emoji.includes(emojiTone)
      ? (hexSkinVariants(emoji).find(v => v.endsWith(emojiTone)) || emoji)
      : emoji;
    setMessage(current => `${current}${value}`);
    const nextRecent = [value, ...emojiRecent.filter(e => e !== value)].slice(0, 80);
    setEmojiRecent(nextRecent);
    writeEmojiPrefs({ recent: nextRecent, favorites: emojiFavorites });
  };

  const toggleEmojiFavorite = (emoji) => {
    const next = emojiFavorites.includes(emoji)
      ? emojiFavorites.filter(e => e !== emoji)
      : [emoji, ...emojiFavorites];
    setEmojiFavorites(next);
    writeEmojiPrefs({ recent: emojiRecent, favorites: next });
  };

  const visibleHexaEmojis = useMemo(() => {
    let source = emojiCategory === "⭐ Recent"
      ? emojiRecent
      : emojiCategory === "💖 Favorites"
        ? emojiFavorites
        : HEXA_EMOJI_CATEGORIES[emojiCategory] || HEXA_ALL_EMOJIS;
    source = Array.from(new Set(source));
    if (!emojiSearch.trim()) return source;
    const q = emojiSearch.trim().toLowerCase();
    return source.filter(e => e.toLowerCase().includes(q));
  }, [emojiCategory, emojiSearch, emojiRecent, emojiFavorites]);
  const [gifOpen, setGifOpen] = useState(false);
  const [stickerOpen, setStickerOpen] = useState(false);
  const [attachmentOpen, setAttachmentOpen] = useState(false);

  const [pollOpen, setPollOpen] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState([
    "",
    ""
  ]);

  const [contactOpen, setContactOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);

  const [attachment, setAttachment] = useState(null);

  const [chatSettingsOpen, setChatSettingsOpen] =
    useState(false);

  const [disappearing, setDisappearing] =
    useState("off");

  const [starred, setStarred] = useState(
    () =>
      readJsonStorage(
        "hexa-starred-v5",
        []
      )
  );

  const [pinned, setPinned] = useState(
    () =>
      readJsonStorage(
        "hexa-pinned-v5",
        []
      )
  );

  const [muted, setMuted] = useState(
    () =>
      readJsonStorage(
        "hexa-muted-v5",
        []
      )
  );

  const [archived, setArchived] = useState(
    () =>
      readJsonStorage(
        "hexa-archived-v5",
        []
      )
  );

  const [blocked, setBlocked] = useState(
    () =>
      readJsonStorage(
        "hexa-blocked-v5",
        []
      )
  );

  const [selectedMessages, setSelectedMessages] =
    useState([]);

  const [selectionMode, setSelectionMode] =
    useState(false);

  const mediaRef = useRef(null);
  const cameraRef = useRef(null);
  const bottomRef = useRef(null);

  const isSystem =
    selected?.id === "hexa-system-group" ||
    (selected?.type === "system_group" && selected?.name === "THE HEXA GROUP");

  const isSystemAdmin = Boolean(selected?.is_admin);

  const isSelf =
    selected?.id === "self";

  const isKora =
    selected?.id === "kora";

  /* ============================================================
     STORAGE
     ============================================================ */

  function saveStorage(key, value) {
    try {
      localStorage.setItem(
        key,
        JSON.stringify(value)
      );
    } catch (error) {
      console.warn(
        "HEXA storage error:",
        error
      );
    }
  }

  useEffect(() => {
    saveStorage(
      "hexa-starred-v5",
      starred
    );
  }, [starred]);

  useEffect(() => {
    saveStorage(
      "hexa-pinned-v5",
      pinned
    );
  }, [pinned]);

  useEffect(() => {
    saveStorage(
      "hexa-muted-v5",
      muted
    );
  }, [muted]);

  useEffect(() => {
    saveStorage(
      "hexa-archived-v5",
      archived
    );
  }, [archived]);

  useEffect(() => {
    saveStorage(
      "hexa-blocked-v5",
      blocked
    );
  }, [blocked]);

  async function loadMessageRequests() {
    if (!profile?.id) return;
    setRequestsLoading(true);
    try {
      const { data, error } = await supabase
        .from("message_requests")
        .select("id,sender_id,recipient_id,status,created_at")
        .eq("recipient_id", profile.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) {
        console.warn("HEXA message requests unavailable:", error.message);
        setMessageRequests([]);
        return;
      }
      const rows = data || [];
      const senderIds = [...new Set(rows.map(r => r.sender_id).filter(Boolean))];
      let profiles = [];
      if (senderIds.length) {
        const result = await supabase
          .from("profiles")
          .select("id,username,full_name,avatar_url")
          .in("id", senderIds);
        profiles = result.data || [];
      }
      const map = Object.fromEntries(profiles.map(x => [x.id, x]));
      setMessageRequests(rows.map(r => ({ ...r, sender: map[r.sender_id] || null })));
    } catch (error) {
      console.warn("HEXA message requests:", error);
      setMessageRequests([]);
    } finally {
      setRequestsLoading(false);
    }
  }

  async function sendMessageRequest(person) {
    if (!person?.id || person.id === profile?.id) return;
    try {
      const { error } = await supabase.from("message_requests").insert({
        sender_id: profile.id,
        recipient_id: person.id,
        status: "pending",
      });
      if (error) throw error;
      alert("Message request sent.");
    } catch (error) {
      alert(error?.message || "Unable to send message request.");
    }
  }

  async function acceptMessageRequest(request) {
    try {
      const sender = request.sender || {};
      const conversation = await ensureHexaDirectConversation({ profileId: profile.id, otherUserId: request.sender_id, otherProfile: sender });
      const { error } = await supabase.from("message_requests").update({ status: "accepted", responded_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", request.id).eq("recipient_id", profile.id);
      if (error) throw error;
      setConversations(current => [conversation, ...current.filter(item => String(item.id) !== String(conversation.id))]);
      setSelected(conversation); setMobileConversationOpen(true); setMessageRequestsOpen(false);
      setMessageRequests(items => items.filter(item => item.id !== request.id));
    } catch (error) { alert(error?.message || "Unable to accept request."); }
  }

  async function declineMessageRequest(request) {
    try {
      await supabase.from("message_requests").update({ status: "declined" }).eq("id", request.id);
    } finally {
      setMessageRequests(items => items.filter(item => item.id !== request.id));
    }
  }

  function setChatTargetForRequest(conversation) {
    setSelected(conversation);
    setMobileConversationOpen(true);
    setMessageRequestsOpen(false);
  }

  useEffect(() => {
    loadMessageRequests();
  }, [profile?.id]);

  /* ============================================================
     CONVERSATION LOADING
     ============================================================ */

  useEffect(() => {
    if (
      initialConversation?.id &&
      initialConversation.id !== selected?.id
    ) {
      setSelected(initialConversation);
      setMobileConversationOpen(true);
    }
  }, [initialConversation?.id]);

  async function refreshConversations() {
    if (!profile?.id) return;

    setLoadingConversations(true);

    try {
      const realChats =
        await loadHexaConversations(profile);

      const defaultIds =
        new Set(
          DEFAULT_CONVERSATIONS.map(
            chat => chat.id
          )
        );

      const mapped = (realChats || []).map(chat => {
        if (
          chat?.type === "system_group" &&
          chat?.name === "THE HEXA GROUP"
        ) {
          return {
            ...chat,
            id: "hexa-system-group",
            realConversationId: chat.id,
            kind: "group",
            readOnly: true,
            is_admin: Boolean(chat.is_admin)
          };
        }
        return chat;
      });

      const cleaned = mapped.filter(
        chat => !defaultIds.has(String(chat.id)) || chat.id === "hexa-system-group"
      );

      const official = cleaned.find(
        chat => chat.id === "hexa-system-group"
      );
      const others = cleaned.filter(
        chat => chat.id !== "hexa-system-group"
      );

      setConversations([
        official || DEFAULT_CONVERSATIONS[0],
        DEFAULT_CONVERSATIONS[1],
        DEFAULT_CONVERSATIONS[2],
        ...others
      ]);

      if (official && selected?.id === "hexa-system-group") {
        setSelected(current => ({
          ...current,
          ...official
        }));
      }
    } catch (error) {
      console.warn(
        "HEXA conversations:",
        error
      );
    } finally {
      setLoadingConversations(false);
    }
  }

  useEffect(() => {
    refreshConversations();
  }, [profile?.id]);

  /* ============================================================
     LOAD MESSAGES
     ============================================================ */

  async function loadMessages(conversation) {
    if (!conversation?.id) {
      setMessages([]);
      return;
    }

    if (isLocalHexaChat(conversation)) {
      setMessages([]);
      return;
    }

    setLoading(true);

    let conversationId =
      conversation.realConversationId ||
      conversation.id;

    try {
      if (
        conversation.id ===
        "hexa-system-group"
      ) {
        const { data } =
          await supabase
            .from("conversations")
            .select(
              "id,name,type,owner_id,created_by,avatar_url,theme"
            )
            .eq(
              "name",
              "THE HEXA GROUP"
            )
            .eq(
              "type",
              "system_group"
            )
            .limit(1)
            .maybeSingle();

        if (!data?.id) {
          setMessages([]);
          return;
        }

        conversationId = data.id;

        const { data: membership } = await supabase
          .from("conversation_members")
          .select("user_id,is_admin")
          .eq("conversation_id", data.id)
          .eq("user_id", profile.id)
          .maybeSingle();

        setSelected(previous =>
          previous?.id ===
          "hexa-system-group"
            ? {
                ...previous,
                ...data,
                id: "hexa-system-group",
                realConversationId:
                  data.id,
                is_admin: Boolean(membership?.is_admin),
                type: data.type
              }
            : previous
        );
      }

      const { data, error } =
        await supabase
          .from("messages")
          .select(
            "*, message_reactions(*), message_attachments(*), message_user_actions(*)"
          )
          .eq(
            "conversation_id",
            conversationId
          )
          .is(
            "deleted_at",
            null
          )
          .order(
            "created_at",
            {
              ascending: true
            }
          );

      if (error) {
        throw error;
      }

      const visible = (data || []).filter((row) => {
        const actions = Array.isArray(row.message_user_actions)
          ? row.message_user_actions
          : [];
        const mine = actions.find(
          (action) => String(action.user_id) === String(profile.id)
        );
        return !mine?.deleted_for_me;
      });

      let callRows = [];
      try {
        const { data: callsData } = await supabase
          .from("calls")
          .select("id,conversation_id,caller_id,callee_id,type,status,started_at,ended_at,created_at,metadata")
          .eq("conversation_id", conversationId)
          .order("created_at", { ascending: true });
        callRows = (callsData || []).map((call) => ({
          id: `call-${call.id}`,
          conversation_id: call.conversation_id,
          sender_id: call.caller_id,
          receiver_id: call.callee_id,
          content: call.status || "call",
          message_type: "call",
          created_at: call.created_at,
          call_id: call.id,
          call_status: call.status,
          call_type: call.type,
          call_mode: call.metadata?.mode || (call.type === "video" ? "video-call" : "voice-call"),
          call_duration: call.metadata?.duration_seconds || 0,
          metadata: call.metadata || {}
        }));
      } catch (callError) {
        console.warn("HEXA call history in chat unavailable:", callError?.message || callError);
      }

      setMessages(
        [...visible, ...callRows].sort(
          (a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0)
        )
      );

      const myActions = (data || [])
        .flatMap((row) => row.message_user_actions || [])
        .filter((action) => String(action.user_id) === String(profile.id));
      setStarred(myActions.filter((action) => action.starred).map((action) => String(action.message_id)));
      setPinned(myActions.filter((action) => action.pinned).map((action) => String(action.message_id)));

      const incomingIds = visible
        .filter((row) => String(row.sender_id) !== String(profile.id) && row.id)
        .map((row) => row.id);
      if (incomingIds.length) {
        await Promise.all([
          supabase.rpc("hexa_mark_delivered", { p_message_ids: incomingIds }),
          supabase.rpc("hexa_mark_read", { p_message_ids: incomingIds }),
        ]);
      }
    } catch (error) {
      console.warn(
        "HEXA message loading:",
        error
      );

      setMessages([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMessages(selected);
    setReplyTo(null);
    setEditing(null);
    setContextMenu(null);
    setReactionMenu(null);
    setSelectedMessages([]);
    setSelectionMode(false);

    const draftKey =
      `hexa-draft:${selected?.id}`;

    try {
      setMessage(
        localStorage.getItem(
          draftKey
        ) || ""
      );
    } catch {
      setMessage("");
    }
  }, [selected?.id]);

  /* ============================================================
     REALTIME MESSAGES
     ============================================================ */

  useEffect(() => {
    if (!profile?.id) return;

    const channel =
      supabase
        .channel(
          `hexa-chat-${profile.id}`
        )
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages"
          },
          payload => {
            const row =
              payload.new;

            const conversationId =
              selected?.realConversationId ||
              selected?.id;

            if (isLocalHexaChat(selected) || !isHexaUuid(conversationId)) return;

            if (
              row?.conversation_id !==
              conversationId
            ) {
              return;
            }

            setMessages(current =>
              current.some(
                item =>
                  String(item.id) ===
                  String(row.id)
              )
                ? current
                : [
                    ...current,
                    row
                  ]
            );

            if (String(row.sender_id) !== String(profile.id) && row.id) {
              supabase.rpc("hexa_mark_delivered", { p_message_ids: [row.id] }).catch(() => {});
              supabase.rpc("hexa_mark_read", { p_message_ids: [row.id] }).catch(() => {});
            }

            updateConversationPreview(
              selected,
              row
            );
          }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "messages"
          },
          payload => {
            const row =
              payload.new;

            setMessages(current =>
              current.map(item =>
                String(item.id) ===
                String(row.id)
                  ? row
                  : item
              )
            );
          }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "calls"
          },
          payload => {
            const call = payload.new;
            const conversationId = selected?.realConversationId || selected?.id;
            if (!conversationId || !isHexaUuid(conversationId)) return;
            if (String(call?.conversation_id) !== String(conversationId)) return;
            const callMessage = {
              id: `call-${call.id}`,
              conversation_id: call.conversation_id,
              sender_id: call.caller_id,
              receiver_id: call.callee_id,
              content: call.status || "call",
              message_type: "call",
              created_at: call.created_at,
              call_id: call.id,
              call_status: call.status,
              call_type: call.type,
              call_mode: call.metadata?.mode || (call.type === "video" ? "video-call" : "voice-call"),
              call_duration: call.metadata?.duration_seconds || 0,
              metadata: call.metadata || {}
            };
            setMessages(current => {
              const exists = current.some(item => String(item.id) === String(callMessage.id));
              return exists
                ? current.map(item => String(item.id) === String(callMessage.id) ? callMessage : item)
                : [...current, callMessage].sort((a,b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));
            });
          }
        )
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "calls"
          },
          payload => {
            const call = payload.new;
            const conversationId = selected?.realConversationId || selected?.id;
            if (!conversationId || !isHexaUuid(conversationId)) return;
            if (String(call?.conversation_id) !== String(conversationId)) return;

            const callMessage = {
              id: `call-${call.id}`,
              conversation_id: call.conversation_id,
              sender_id: call.caller_id,
              receiver_id: call.callee_id,
              content: call.status || "call",
              message_type: "call",
              created_at: call.created_at,
              call_id: call.id,
              call_status: call.status,
              call_type: call.type,
              call_mode: call.metadata?.mode || (call.type === "video" ? "video-call" : "voice-call"),
              call_duration: call.metadata?.duration_seconds || 0,
              metadata: call.metadata || {}
            };

            setMessages(current =>
              current.some(item => String(item.id) === String(callMessage.id))
                ? current
                : [...current, callMessage].sort(
                    (a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0)
                  )
            );
          }
        )
        .subscribe();

    return () => {
      supabase.removeChannel(
        channel
      );
    };
  }, [
    profile?.id,
    selected?.id,
    selected?.realConversationId
  ]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth"
    });
  }, [messages.length]);

  /* ============================================================
     CONVERSATION PREVIEW
     ============================================================ */

  function updateConversationPreview(
    conversation,
    newMessage
  ) {
    if (!conversation?.id) return;

    setConversations(current => {
      const exists =
        current.some(
          item =>
            String(item.id) ===
            String(conversation.id)
        );

      const preview =
        newMessage?.deleted_for_everyone
          ? "Message deleted"
          : newMessage?.content ||
            (
              newMessage?.message_type ===
              "image"
                ? "📷 Photo"
                : newMessage?.message_type ===
                  "video"
                    ? "🎥 Video"
                    : newMessage?.message_type ===
                      "audio"
                        ? "🎵 Audio"
                        : newMessage?.message_type ===
                          "file"
                            ? "📎 Document"
                            : "Attachment"
            );

      const updated = {
        ...conversation,
        lastMessage:
          preview,
        lastMessageAt:
          newMessage?.created_at ||
          new Date().toISOString(),
        unread:
          selected?.id ===
          conversation.id
            ? 0
            : Number(
                conversation.unread || 0
              ) + 1
      };

      if (!exists) {
        return [
          updated,
          ...current
        ];
      }

      return current
        .map(item =>
          String(item.id) ===
          String(conversation.id)
            ? updated
            : item
        )
        .sort(
          (a, b) =>
            new Date(
              b.lastMessageAt || 0
            ) -
            new Date(
              a.lastMessageAt || 0
            )
        );
    });
  }

  /* ============================================================
     DRAFTS
     ============================================================ */

  function saveDraft(value) {
    setMessage(value);

    if (!selected?.id) return;

    try {
      const key =
        `hexa-draft:${selected.id}`;

      if (value.trim()) {
        localStorage.setItem(
          key,
          value
        );
      } else {
        localStorage.removeItem(
          key
        );
      }
    } catch (error) {
      console.warn(
        "HEXA draft:",
        error
      );
    }
  }

  /* ============================================================
     NEW CHAT / PERSON SEARCH
     ============================================================ */

  useEffect(() => {
    const term =
      newChatSearch.trim();

    if (!newChatOpen || !term) {
      setPeopleResults([]);
      return;
    }

    let cancelled = false;

    const timer =
      setTimeout(
        async () => {
          setPeopleLoading(true);

          try {
            const { data, error } =
              await supabase
                .from("profiles")
                .select(
                  "id,full_name,username,avatar_url"
                )
                .or(
                  `full_name.ilike.%${term}%,username.ilike.%${term}%`
                )
                .neq(
                  "id",
                  profile.id
                )
                .limit(20);

            if (
              !cancelled
            ) {
              if (error) {
                throw error;
              }

              setPeopleResults(
                data || []
              );
            }
          } catch (error) {
            console.warn(
              "HEXA person search:",
              error
            );

            if (!cancelled) {
              setPeopleResults([]);
            }
          } finally {
            if (!cancelled) {
              setPeopleLoading(
                false
              );
            }
          }
        },
        250
      );

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [
    newChatSearch,
    newChatOpen,
    profile?.id
  ]);

  async function createDirectConversation(person) {
    if (!person?.id || !profile?.id || person.id === profile.id) return;
    setLoadingConversations(true);
    try {
      const existing = await supabase.from("conversations").select("*").eq("type", "direct")
        .or(`and(user_a.eq.${profile.id},user_b.eq.${person.id}),and(user_a.eq.${person.id},user_b.eq.${profile.id})`)
        .limit(1).maybeSingle();
      if (existing.error) throw existing.error;
      if (!existing.data) {
        const pending = await supabase.from("message_requests").select("id,status")
          .eq("sender_id", profile.id).eq("recipient_id", person.id).eq("status", "pending")
          .limit(1).maybeSingle();
        if (!pending.data) {
          const request = await supabase.from("message_requests").insert({ sender_id: profile.id, recipient_id: person.id, status: "pending" });
          if (request.error) throw request.error;
        }
        setNewChatOpen(false); setNewChatSearch("");
        alert(pending.data ? "Message request already sent." : "Message request sent. They can accept it before the chat opens.");
        return;
      }
      const chat = await ensureHexaDirectConversation({ profileId: profile.id, otherUserId: person.id, otherProfile: person });
      setConversations(current => [chat, ...current.filter(item => String(item.id) !== String(chat.id))]);
      setSelected(chat); setMobileConversationOpen(true); setNewChatOpen(false); setNewChatSearch("");
      onOpenChatWithUser?.();
    } catch (error) {
      alert(error?.message || "Unable to open this chat.");
    } finally { setLoadingConversations(false); }
  }

  /* ============================================================
     VOICE RECORDING + MEDIA UPLOAD
     ============================================================ */

  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordingBlob, setRecordingBlob] = useState(null);
  const [recordingPreviewUrl, setRecordingPreviewUrl] = useState("");
  const mediaRecorderRef = useRef(null);
  const recordingChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (recordingPreviewUrl) URL.revokeObjectURL(recordingPreviewUrl);
      const stream = mediaRecorderRef.current?.stream;
      stream?.getTracks?.().forEach((track) => track.stop());
    };
  }, [recordingPreviewUrl]);

  function clearRecordingState() {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    mediaRecorderRef.current?.stream?.getTracks?.().forEach((track) => track.stop());
    mediaRecorderRef.current = null;
    recordingChunksRef.current = [];
    setRecording(false);
    setRecordingSeconds(0);
  }

  function cancelVoiceRecording() {
    if (recordingPreviewUrl) URL.revokeObjectURL(recordingPreviewUrl);
    setRecordingBlob(null);
    setRecordingPreviewUrl("");
    clearRecordingState();
  }

  async function startVoiceRecording() {
    if (isSystem || isSelf || isKora || isLocalHexaChat(selected)) return;
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      safeAlert("Voice recording is not supported by this browser.");
      return;
    }

    try {
      cancelVoiceRecording();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const preferred = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus"].find((type) => MediaRecorder.isTypeSupported?.(type));
      const recorder = preferred ? new MediaRecorder(stream, { mimeType: preferred }) : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      recordingChunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data?.size) recordingChunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(recordingChunksRef.current, { type: recorder.mimeType || "audio/webm" });
        if (blob.size) {
          setRecordingBlob(blob);
          const preview = URL.createObjectURL(blob);
          setRecordingPreviewUrl(preview);
        }
        stream.getTracks().forEach((track) => track.stop());
      };
      recorder.start(250);
      setRecording(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => setRecordingSeconds((value) => value + 1), 1000);
    } catch (error) {
      safeAlert(error?.message || "Microphone access was denied.");
      clearRecordingState();
    }
  }

  function stopVoiceRecording() {
    if (!mediaRecorderRef.current) return;
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    setRecording(false);
    try {
      mediaRecorderRef.current.stop();
    } catch {}
  }

  function formatRecordingTime(total) {
    const seconds = Number(total || 0);
    return `${Math.floor(seconds / 60).toString().padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
  }

  async function uploadChatBlob(blob, fileName = "voice-message.webm") {
    const bucket = import.meta.env.VITE_SUPABASE_STORAGE_BUCKET;
    if (!bucket) throw new Error("Set VITE_SUPABASE_STORAGE_BUCKET before sending media.");
    const conversationId = selected?.realConversationId || selected?.id;
    if (!isHexaUuid(conversationId)) throw new Error("This conversation is not ready for media uploads.");
    const path = `${profile.id}/chat/${conversationId}/${Date.now()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const { error } = await supabase.storage.from(bucket).upload(path, blob, { contentType: blob.type || "audio/webm", upsert: false });
    if (error) throw error;
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return { bucket, path, url: data?.publicUrl || "" };
  }

  async function sendVoiceMessage() {
    if (!recordingBlob || !selected?.id || isLocalHexaChat(selected) || isSystem) return;
    if (recordingSeconds < 1) {
      cancelVoiceRecording();
      return;
    }

    const blob = recordingBlob;
    const duration = recordingSeconds;
    try {
      setLoading(true);
      const upload = await uploadChatBlob(blob, `voice-${Date.now()}.webm`);
      const clientMessageId = `hexa-${crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
      const payload = {
        conversation_id: selected.realConversationId || selected.id,
        sender_id: profile.id,
        content: "Voice message",
        message_type: "voice",
        client_message_id: clientMessageId,
        status: "sent",
        metadata: {
          storage_bucket: upload.bucket,
          storage_path: upload.path,
          file_url: upload.url,
          mime_type: blob.type || "audio/webm",
          duration_seconds: duration,
        },
      };
      const { data, error } = await supabase.from("messages").insert(payload).select("*, message_reactions(*), message_attachments(*), message_user_actions(*)").single();
      if (error) throw error;
      const attachmentRecord = {
        message_id: data.id,
        user_id: profile.id,
        file_name: `voice-${Date.now()}.webm`,
        file_path: upload.path,
        file_url: upload.url,
        mime_type: blob.type || "audio/webm",
        file_size: blob.size,
        duration,
      };
      const { error: attachmentError } = await supabase.from("message_attachments").insert(attachmentRecord);
      if (attachmentError) console.warn("HEXA voice attachment record:", attachmentError.message);

      // Keep the just-sent voice note fully hydrated locally. The realtime INSERT
      // for messages does not include nested message_attachments rows.
      const hydratedVoiceMessage = {
        ...data,
        content: "",
        message_type: "voice",
        metadata: { ...(data.metadata || {}), file_url: upload.url, duration_seconds: duration, storage_path: upload.path, storage_bucket: upload.bucket, mime_type: blob.type || "audio/webm" },
        message_attachments: [attachmentRecord],
      };
      setMessages((current) => [
        ...current.filter((item) => String(item.client_message_id || "") !== String(clientMessageId)),
        hydratedVoiceMessage,
      ]);
      updateConversationPreview(selected, { ...data, content: "Voice message", message_type: "voice" });
      cancelVoiceRecording();
    } catch (error) {
      safeAlert(error?.message || "Unable to send the voice message.");
    } finally {
      setLoading(false);
    }
  }

  /* ============================================================
     SEND MESSAGE
     ============================================================ */

  async function handleSendMessage(event) {
    event?.preventDefault();
    const text = message.trim();
    if (!text && !attachment) return;

    if (isSystem && !isSystemAdmin) {
      safeAlert("Only authorized HEXA administrators can publish in THE HEXA GROUP.");
      return;
    }

    if (!selected?.id || isLocalHexaChat(selected)) {
      if (isKora) {
        const localId = `local-${Date.now()}`;
        const next = [...messages, { id: localId, role: "user", sender_id: profile.id, conversation_id: "kora", content: text, message_type: "text", created_at: new Date().toISOString() }];
        setMessages(next);
        setMessage("");
        setReplyTo(null);
        try {
          const reply = await askKora({ messages: next.map((m) => ({ role: m.sender_id === "kora" ? "kora" : "user", text: m.content })), profile });
          setMessages((current) => [...current, { id: `kora-${Date.now()}`, role: "kora", sender_id: "kora", conversation_id: "kora", content: reply, message_type: "text", created_at: new Date().toISOString() }]);
        } catch (error) {
          safeAlert(error?.message || "Kora could not respond.");
        }
      }
      return;
    }

    if (!isHexaUuid(selected.realConversationId || selected.id)) {
      safeAlert("This conversation is not ready yet.");
      return;
    }

    if (selected?.otherUserId && blocked.includes(String(selected.otherUserId))) {
      safeAlert("This contact is blocked.");
      return;
    }

    const inputError = validateMessageInput(text, attachment?.file || attachment);
    if (inputError) {
      safeAlert(inputError);
      return;
    }

    const conversationId = selected.realConversationId || selected.id;
    const clientMessageId = `hexa-${crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
    const optimisticId = `local-${clientMessageId}`;
    let upload = null;
    const messageType = ["text", "image", "video", "audio", "file", "gif", "voice", "system"].includes(String(attachment?.type || "text"))
      ? String(attachment?.type || "text")
      : "file";

    if (attachment?.file) {
      try {
        upload = await uploadChatAttachment(attachment.file);
      } catch (error) {
        safeAlert(error?.message || "Unable to upload this attachment.");
        return;
      }
    }

    const optimisticMessage = {
      id: optimisticId,
      conversation_id: conversationId,
      sender_id: profile.id,
      content: text || attachment?.name || "",
      message_type: messageType,
      created_at: new Date().toISOString(),
      reply_to_id: replyTo?.id || null,
      client_message_id: clientMessageId,
      status: "sending",
      metadata: upload ? { storage_bucket: upload.bucket, storage_path: upload.path, file_url: upload.url } : {},
      message_attachments: upload ? [{ file_name: attachment.name, file_path: upload.path, file_url: upload.url, mime_type: attachment.file.type, file_size: attachment.file.size }] : [],
      pending: true,
    };

    setMessages((current) => [...current, optimisticMessage]);
    updateConversationPreview(selected, optimisticMessage);
    const oldAttachment = attachment;
    setMessage("");
    setReplyTo(null);
    setAttachment(null);
    setEmojiOpen(false);
    setGifOpen(false);
    setStickerOpen(false);
    setAttachmentOpen(false);
    try { localStorage.removeItem(`hexa-draft:${selected.id}`); } catch {}

    try {
      const payload = {
        conversation_id: conversationId,
        sender_id: profile.id,
        receiver_id: isHexaUuid(selected.otherUserId) ? selected.otherUserId : null,
        content: text || oldAttachment?.name || "",
        message_type: messageType,
        reply_to_id: !oldAttachment && isHexaUuid(replyTo?.id) ? replyTo.id : null,
        client_message_id: clientMessageId,
        metadata: upload ? { storage_bucket: upload.bucket, storage_path: upload.path, file_url: upload.url, mime_type: oldAttachment?.file?.type || null, file_name: oldAttachment?.name || null, file_size: oldAttachment?.file?.size || null } : {},
        status: "sent",
      };
      const { data, error } = await supabase.from("messages").insert(payload).select("*, message_reactions(*), message_attachments(*), message_user_actions(*)").single();
      if (error) throw error;
      if (upload) {
        const { error: attachmentError } = await supabase.from("message_attachments").insert({ message_id: data.id, user_id: profile.id, file_name: oldAttachment.name, file_path: upload.path, file_url: upload.url, mime_type: oldAttachment.file.type || "application/octet-stream", file_size: oldAttachment.file.size || 0 });
        if (attachmentError) console.warn("HEXA attachment record:", attachmentError.message);
      }
      setMessages((current) => current.map((item) => item.id === optimisticId ? data : item));
      updateConversationPreview(selected, data);
    } catch (error) {
      console.error("HEXA send message:", error);
      setMessages((current) => current.map((item) => item.id === optimisticId ? { ...item, pending: true, failed: true, status: "failed" } : item));
      if (!oldAttachment?.file) {
        try {
          const queue = readLocalQueue();
          queue.push({ ...optimisticMessage, pending: true, failed: true });
          writeLocalQueue(queue);
        } catch {}
      }
      safeAlert(`Message could not be sent. ${error?.message || "Please check your Supabase messages table and RLS policies."}`);
    }
  }

  /* ============================================================
     MESSAGE ACTIONS
     ============================================================ */

  async function copyMessage(
    item
  ) {
    try {
      await navigator.clipboard.writeText(
        item?.content || ""
      );
    } catch {
      alert(
        "Unable to copy this message."
      );
    }

    setContextMenu(null);
  }

  async function editMessage(
    item
  ) {
    if (
      item.sender_id !==
      profile.id
    ) {
      return;
    }

    setEditing(item);
    setMessage(
      item.content || ""
    );
    setContextMenu(null);
  }

  async function saveEditedMessage() {
    if (!editing) return;

    const value =
      message.trim();

    if (!value) return;

    try {
      const { data, error } = await supabase.rpc(
        "hexa_edit_message",
        {
          p_message_id: editing.id,
          p_content: value
        }
      );

      if (error) {
        throw error;
      }

      setMessages(
        current =>
          current.map(item =>
            item.id ===
            editing.id
              ? data
              : item
          )
      );

      setEditing(null);
      setMessage("");
    } catch (error) {
      console.error(
        "HEXA edit:",
        error
      );
    }
  }

  async function deleteMessage(
    item,
    everyone = false
  ) {
    if (!item?.id) return;

    if (everyone) {
      if (
        item.sender_id !==
        profile.id
      ) {
        return;
      }

      try {
        const { data, error } = await supabase.rpc(
          "hexa_delete_message_for_everyone",
          {
            p_message_id: item.id
          }
        );

        if (error) {
          throw error;
        }

        setMessages(
          current =>
            current.map(item2 =>
              item2.id ===
              item.id
                ? data
                : item2
            )
        );
      } catch (error) {
        console.error(
          "HEXA delete:",
          error
        );
      }
    } else {
      const { error } = await supabase.rpc("hexa_set_message_action", {
        p_message_id: item.id,
        p_action: "delete_for_me",
        p_enabled: true,
      });
      if (error) {
        console.error("HEXA delete for me:", error);
        safeAlert(error.message);
        return;
      }

      setMessages((current) => current.filter((item2) => String(item2.id) !== String(item.id)));
    }

    setContextMenu(null);
  }

  async function toggleStar(item) {
    const id = String(item.id);
    const enabled = !starred.includes(id);
    const { error } = await supabase.rpc(
      "hexa_set_message_action",
      {
        p_message_id: item.id,
        p_action: "star",
        p_enabled: enabled
      }
    );
    if (error) {
      safeAlert(error.message);
      return;
    }
    setStarred(current =>
      enabled
        ? [...current, id]
        : current.filter(x => x !== id)
    );
    setContextMenu(null);
  }

  async function togglePin(item) {
    const id = String(item.id);
    const enabled = !pinned.includes(id);
    const { error } = await supabase.rpc(
      "hexa_set_message_action",
      {
        p_message_id: item.id,
        p_action: "pin",
        p_enabled: enabled
      }
    );
    if (error) {
      safeAlert(error.message);
      return;
    }
    setPinned(current =>
      enabled
        ? [...current, id]
        : current.filter(x => x !== id)
    );
    setContextMenu(null);
  }

  /* ============================================================
     REACTIONS
     ============================================================ */

  async function reactToMessage(item, emoji) {
    if (!item?.id || !profile?.id) return;
    setReactionMenu(null);

    try {
      const existing = (item.message_reactions || []).find(
        (reaction) => String(reaction.user_id) === String(profile.id)
      );

      if (existing && String(existing.reaction) === String(emoji)) {
        const { error } = await supabase
          .from("message_reactions")
          .delete()
          .eq("message_id", item.id)
          .eq("user_id", profile.id);
        if (error) throw error;
      } else {
        const { error: deleteError } = await supabase
          .from("message_reactions")
          .delete()
          .eq("message_id", item.id)
          .eq("user_id", profile.id);
        if (deleteError) throw deleteError;

        const { error: insertError } = await supabase
          .from("message_reactions")
          .insert({
            message_id: item.id,
            user_id: profile.id,
            reaction: emoji,
          });
        if (insertError) throw insertError;
      }

      await loadMessages(selected);
    } catch (error) {
      console.warn("HEXA reaction:", error);
      safeAlert(
        error?.message ||
        "Unable to update reaction. Check message_reactions permissions."
      );
    }
  }

  /* ============================================================
     FORWARD
     ============================================================ */

  function openForward(item) {
    setForwardMessage(
      item
    );
    setForwardOpen(
      true
    );
    setContextMenu(null);
  }

  async function forwardToChat(conversation) {
    if (!forwardMessage || !conversation) return;

    const conversationId = conversation.realConversationId || conversation.id;
    if (isLocalHexaChat(conversation) || !isHexaUuid(conversationId)) {
      safeAlert("Messages cannot be forwarded into THE HEXA GROUP unless you have publishing permission.");
      return;
    }

    try {
      const { data, error } = await supabase.rpc("hexa_forward_message", {
        p_message_id: forwardMessage.id,
        p_destination_conversation_id: conversationId,
      });
      if (error) throw error;
      updateConversationPreview(conversation, data);
      setForwardOpen(false);
      setForwardMessage(null);
    } catch (error) {
      console.error("HEXA forwarding:", error);
      safeAlert(error?.message || "Unable to forward this message.");
    }
  }

  /* ============================================================
     CHAT CONTROLS
     ============================================================ */

  function toggleMute() {
    const id =
      String(selected.id);

    setMuted(current =>
      current.includes(id)
        ? current.filter(
            x => x !== id
          )
        : [
            ...current,
            id
          ]
    );
  }

  function toggleArchive() {
    const id =
      String(selected.id);

    setArchived(current =>
      current.includes(id)
        ? current.filter(
            x => x !== id
          )
        : [
            ...current,
            id
          ]
    );

    setChatSettingsOpen(
      false
    );
  }

  function toggleBlock() {
    const id =
      String(selected.id);

    setBlocked(current =>
      current.includes(id)
        ? current.filter(
            x => x !== id
          )
        : [
            ...current,
            id
          ]
    );

    setChatSettingsOpen(
      false
    );
  }

  function clearChat() {
    setMessages([]);
    setChatSettingsOpen(
      false
    );
  }

  /* ============================================================
     MULTI SELECT
     ============================================================ */

  function toggleMessageSelection(
    item
  ) {
    const id =
      String(item.id);

    setSelectionMode(
      true
    );

    setSelectedMessages(
      current =>
        current.includes(id)
          ? current.filter(
              x => x !== id
            )
          : [
              ...current,
              id
            ]
    );
  }

  function cancelSelection() {
    setSelectedMessages(
      []
    );
    setSelectionMode(
      false
    );
  }

  async function deleteSelected() {
    const selectedItems =
      messages.filter(
        item =>
          selectedMessages.includes(
            String(item.id)
          )
      );

    for (
      const item of selectedItems
    ) {
      await deleteMessage(
        item,
        item.sender_id ===
          profile.id
      );
    }

    cancelSelection();
  }

  /* ============================================================
     SEARCH
     ============================================================ */

  const filteredConversations = useMemo(() => {
    const term = chatSearch.trim().toLowerCase();
    let list = conversations.filter(c => !archived.includes(String(c.id)));

    if (chatFilter === "unread") {
      list = list.filter(c => Number(c.unread || 0) > 0);
    }
    if (chatFilter === "groups") {
      list = list.filter(c => c.kind === "group" || c.type === "group" || c.type === "system_group");
    }
    if (chatFilter === "favorites") {
      list = list.filter(c => starred.includes(String(c.id)));
    }

    let assignments = {};
    try {
      assignments = JSON.parse(localStorage.getItem("hexa-chat-folder-assignments") || "{}");
    } catch {}

    if (activeChatFolder !== "all" && activeChatFolder !== "groups") {
      list = list.filter(c =>
        (c.chatFolderIds || assignments[String(c.id)] || []).includes(activeChatFolder)
      );
    }

    if (activeChatFolder === "groups") {
      list = list.filter(c =>
        c.kind === "group" || c.type === "group" || c.type === "system_group"
      );
    }

    list = [...list].sort((a, b) => {
      const ap = pinned.includes(String(a.id)) ? 1 : 0;
      const bp = pinned.includes(String(b.id)) ? 1 : 0;
      if (ap !== bp) return bp - ap;

      return new Date(
        b.lastMessageAt || b.latestMessageAt || 0
      ) - new Date(
        a.lastMessageAt || a.latestMessageAt || 0
      );
    });

    if (!term) return list;

    return list.filter(c => {
      const haystack = [
        c.name,
        c.username,
        c.lastMessage,
        c.latestMessage,
        c.description
      ]
        .map(value => String(value || "").toLowerCase())
        .join(" ");

      return haystack.includes(term);
    });
  }, [
    conversations,
    chatSearch,
    archived,
    chatFilter,
    starred,
    pinned,
    activeChatFolder
  ]);

  useEffect(() => {
    try {
      localStorage.setItem("hexa-chat-folders", JSON.stringify(chatFolders));
    } catch {}
  }, [chatFolders]);

  const chatFolderAssignments = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("hexa-chat-folder-assignments") || "{}");
    } catch {
      return {};
    }
  }, [chatFolders]);

  function setConversationFolders(conversationId, folderIds) {
    try {
      const key = String(conversationId);
      const current = JSON.parse(localStorage.getItem("hexa-chat-folder-assignments") || "{}");
      current[key] = Array.from(new Set(folderIds));
      localStorage.setItem("hexa-chat-folder-assignments", JSON.stringify(current));
    } catch {}
    setConversations((items) =>
      items.map((item) =>
        String(item.id) === String(conversationId)
          ? { ...item, chatFolderIds: folderIds }
          : item
      )
    );
  }

  function createChatFolder() {
    const name = window.prompt("New chat group name");
    const clean = String(name || "").trim();
    if (!clean) return;
    const id = `folder-${Date.now()}`;
    setChatFolders((items) => [...items, { id, name: clean.slice(0, 30) }]);
    setActiveChatFolder(id);
    setChatFolderMenuOpen(false);
  }

  function deleteChatFolder(folderId) {
    setChatFolders((items) => items.filter((folder) => folder.id !== folderId));
    setConversations((items) => items.map((item) => ({
      ...item,
      chatFolderIds: (item.chatFolderIds || []).filter((id) => id !== folderId)
    })));
    try {
      const current = JSON.parse(localStorage.getItem("hexa-chat-folder-assignments") || "{}");
      Object.keys(current).forEach((key) => {
        current[key] = (current[key] || []).filter((id) => id !== folderId);
      });
      localStorage.setItem("hexa-chat-folder-assignments", JSON.stringify(current));
    } catch {}
    if (activeChatFolder === folderId) setActiveChatFolder("all");
  }

  function toggleChatFolder(conversation) {
    const current = conversation?.chatFolderIds || [];
    const selectedIds = new Set(current);
    for (const folder of chatFolders) {
      if (folder.id === "family") continue;
    }
    setChatFolderAssignOpen(false);
  }

  /* ============================================================
     MESSAGE RENDERER
     ============================================================ */

  function renderMessage(item) {
    const mine =
      String(
        item.sender_id
      ) ===
      String(profile.id);

    const isSelected =
      selectedMessages.includes(
        String(item.id)
      );

    const reactions =
      item.message_reactions ||
      [];

    if (item.message_type === "call") {
      const callMode = item.call_mode || (item.call_type === "video" ? "video-call" : "voice-call");
      const isVideo = callMode === "video-call" || callMode === "video-chat";
      const isChat = callMode === "voice-chat" || callMode === "video-chat";
      const title = isVideo
        ? (isChat ? "Video Chat" : "Video Call")
        : (isChat ? "Voice Chat" : "Voice Call");
      const icon = isVideo ? "📹" : "☎";
      const statusLabel = item.call_status === "missed"
        ? (mine ? "Missed" : "Missed call")
        : item.call_status === "declined"
          ? "Declined"
          : item.call_status === "cancelled"
            ? "Cancelled"
            : item.call_status === "ended"
              ? "Call ended"
              : item.call_status === "accepted"
                ? "Call connected"
                : "Calling…";
      const duration = Number(item.call_duration || 0);
      const durationText = duration > 0
        ? `${Math.floor(duration / 60)}:${String(duration % 60).padStart(2, "0")}`
        : "";
      const callbackMode = callMode;
      return (
        <div
          key={item.id}
          className={`hexa-message-row ${mine ? "mine" : "incoming"} call-message-row`}
          id={`msg-${item.id}`}
        >
          {!mine && <Avatar src={selected.avatar_url} name={selected.name} size={30} />}
          <div className={`message-bubble call-message-bubble ${mine ? "mine" : ""}`}>
            <div className="call-message-main">
              <div className="call-message-icon">{icon}</div>
              <div className="call-message-copy">
                <strong>{title}</strong>
                <span>{statusLabel}{durationText ? ` · ${durationText}` : ""}</span>
              </div>
            </div>
            <div className="message-meta">
              <span>{item.created_at ? new Date(item.created_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : ""}</span>
            </div>
            <button
              type="button"
              className="call-back-button"
              onClick={(event) => {
                event.stopPropagation();
                onStartCall?.(selected, item.call_type || (isVideo ? "video" : "voice"), callbackMode);
              }}
            >
              ↻ Call back
            </button>
          </div>
        </div>
      );
    }

    return (
      <div
        key={item.id}
        id={`msg-${item.id}`}
        className={
          `hexa-message-row ${
            mine
              ? "mine"
              : "incoming"
          } ${
            isSelected
              ? "selected-message"
              : ""
          }`
        }
        onContextMenu={event => {
          event.preventDefault();

          setContextMenu({
            id: item.id,
            x: event.clientX,
            y: event.clientY
          });
        }}
        onClick={() => {
          if (
            selectionMode
          ) {
            toggleMessageSelection(
              item
            );
          }
        }}
      >
        {!mine && (
          <Avatar
            src={
              selected.avatar_url
            }
            name={
              selected.name
            }
            size={30}
          />
        )}

        <div
          className={
            `message-bubble ${
              mine
                ? "mine"
                : ""
            }`
          }
        >
          {item.forwarded && (
            <div className="forwarded-label">
              ↪ Forwarded
            </div>
          )}

          {(item.reply_to_id || item.reply_to) && (
            <div className="quoted-message">
              ↩ Reply
            </div>
          )}

          {(() => {
            const attachmentRow = item.message_attachments?.[0];
            const mediaUrl = attachmentRow?.file_url || item.media_url || item.metadata?.file_url;
            if (item.deleted_at || item.metadata?.deleted_for_everyone) {
              return <div className="message-content deleted-message">This message was deleted</div>;
            }
            if (item.message_type === "image" && mediaUrl) {
              return <img src={mediaUrl} alt="Shared" className="message-media" />;
            }
            if (item.message_type === "video" && mediaUrl) {
              return <video src={mediaUrl} controls className="message-media" />;
            }
            if ((item.message_type === "voice" || item.message_type === "audio") && mediaUrl) {
              const duration = Number(
                item.metadata?.duration_seconds ||
                attachmentRow?.duration ||
                0
              );
              return (
                <div className="voice-message-player">
                  <div className="voice-message-icon">🎙</div>
                  <div className="voice-message-player-main">
                    <audio
                      src={mediaUrl}
                      controls
                      preload="metadata"
                      className="message-audio"
                    />
                    <div className="voice-message-footer">
                      <span>{duration ? formatRecordingTime(duration) : "Voice message"}</span>
                      <button
                        type="button"
                        onClick={(event) => {
                          const audio = event.currentTarget
                            .closest(".voice-message-player")
                            ?.querySelector("audio");
                          if (!audio) return;
                          audio.playbackRate =
                            audio.playbackRate === 1
                              ? 1.5
                              : audio.playbackRate === 1.5
                                ? 2
                                : 1;
                        }}
                      >
                        1×
                      </button>
                    </div>
                  </div>
                </div>
              );
            }
            if (item.message_type === "file" && mediaUrl) {
              return <a className="message-file" href={mediaUrl} target="_blank" rel="noreferrer">📎 {item.content || attachmentRow?.file_name || "Download file"}</a>;
            }
            return <div className="message-content">{item.content}</div>;
          })()}

          <div className="message-meta">
            <span>
              {item.created_at
                ? new Date(
                    item.created_at
                  ).toLocaleTimeString(
                    [],
                    {
                      hour:
                        "numeric",
                      minute:
                        "2-digit"
                    }
                  )
                : ""}
            </span>

            {item.edited_at && (
              <span>
                edited
              </span>
            )}

            {mine && (
              <span className="message-status">
                {item.pending
                  ? "◷"
                  : "✓✓"}
              </span>
            )}
          </div>

          {reactions.length >
            0 && (
            <div className="message-reactions">
              {reactions.map(
                reaction => (
                  <button
                    key={`${reaction.message_id}-${reaction.user_id}-${reaction.reaction}`}
                    type="button"
                    onClick={() =>
                      reactToMessage(
                        item,
                        reaction.reaction
                      )
                    }
                  >
                    {
                      reaction.reaction
                    }
                  </button>
                )
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ============================================================
     RETURN
     ============================================================ */

  return (
    <section
      className={
        `chat-layout ${
          mobileConversationOpen
            ? "mobile-chat-open"
            : "mobile-chat-list"
        }`
      }
      onClick={() => {
        if (contextMenu) {
          setContextMenu(null);
        }
      }}
    >

      
{/* ======================================================
    HEXA CHAT LIST — WHATSAPP STYLE
    ====================================================== */}

<aside className="chat-list-panel">

  {/* HEADER */}
  <div className="chat-list-header">

    <div className="chat-list-title-wrap">
      <div className="chat-list-title-row">
        <h2>Chats</h2>

        {conversations.length > 0 && (
          <span className="chat-count">
            {conversations.length > 999 ? "999+" : conversations.length}
          </span>
        )}
      </div>

      <span className="chat-list-header-subtitle">
        Your conversations
      </span>
    </div>

    <div className="chat-list-head-actions">

      <button
        type="button"
        className="chat-header-action"
        title="New chat"
        onClick={() => setNewChatOpen(true)}
      >
        ＋
      </button>

      <button
        type="button"
        className="chat-header-action"
        title="Message requests"
        onClick={() => {
          setMessageRequestsOpen(true);
          loadMessageRequests();
        }}
      >
        ⋮
      </button>

    </div>
  </div>


  {/* SEARCH */}
  <div className="chat-search-box">

    <span className="chat-search-icon">⌕</span>

    <input
      type="search"
      value={chatSearch}
      onChange={(event) => setChatSearch(event.target.value)}
      placeholder="Search chats"
      aria-label="Search chats"
    />

    {chatSearch && (
      <button
        type="button"
        className="chat-search-clear"
        onClick={() => setChatSearch("")}
        aria-label="Clear search"
      >
        ×
      </button>
    )}

  </div>


  {/* PRIMARY FILTER TABS */}
  <div className="chat-tabs">

    <button
      type="button"
      className={chatFilter === "all" ? "active" : ""}
      onClick={() => {
        setChatFilter("all");
        setActiveChatFolder("all");
      }}
    >
      All
      {conversations.length > 0 && (
        <span>{conversations.length > 99 ? "99+" : conversations.length}</span>
      )}
    </button>

    <button
      type="button"
      className={chatFilter === "unread" ? "active" : ""}
      onClick={() => setChatFilter("unread")}
    >
      Unread

      {conversations.filter(
        (c) => Number(c.unread || 0) > 0
      ).length > 0 && (
        <span>
          {conversations.filter(
            (c) => Number(c.unread || 0) > 0
          ).length > 99
            ? "99+"
            : conversations.filter(
                (c) => Number(c.unread || 0) > 0
              ).length}
        </span>
      )}
    </button>

    <button
      type="button"
      className={chatFilter === "favorites" ? "active" : ""}
      onClick={() => {
        setChatFilter("favorites");
        setActiveChatFolder("all");
      }}
    >
      Favorites

      {starred.length > 0 && (
        <span>
          {starred.length > 99 ? "99+" : starred.length}
        </span>
      )}
    </button>

    <button
      type="button"
      className={chatFilter === "groups" ? "active" : ""}
      onClick={() => {
        setChatFilter("groups");
        setActiveChatFolder("groups");
      }}
    >
      Groups
    </button>

  </div>


  {/* FOLDER STRIP */}
  <div className="chat-folder-strip">

    <button
      type="button"
      className={
        activeChatFolder === "all" &&
        chatFilter === "all"
          ? "folder-chip active"
          : "folder-chip"
      }
      onClick={() => {
        setActiveChatFolder("all");
        setChatFilter("all");
      }}
    >
      All chats
    </button>

    {chatFolders.slice(0, 4).map((folder) => (
      <button
        key={folder.id}
        type="button"
        className={
          activeChatFolder === folder.id
            ? "folder-chip active"
            : "folder-chip"
        }
        onClick={() => {
          setActiveChatFolder(folder.id);
          setChatFilter("all");
        }}
      >
        {folder.name}
      </button>
    ))}

    <button
      type="button"
      className="folder-more-button"
      title="Chat folders"
      onClick={() =>
        setChatFolderMenuOpen((value) => !value)
      }
    >
      ⋯
    </button>

  </div>


  {/* FOLDER MENU */}
  {chatFolderMenuOpen && (
    <div className="chat-folder-dropdown-menu">

      <button
        type="button"
        onClick={() => {
          setActiveChatFolder("all");
          setChatFilter("all");
          setChatFolderMenuOpen(false);
        }}
      >
        <span>💬</span>
        <span>All chats</span>
      </button>

      <button
        type="button"
        onClick={() => {
          setActiveChatFolder("groups");
          setChatFilter("groups");
          setChatFolderMenuOpen(false);
        }}
      >
        <span>👥</span>
        <span>Groups</span>
      </button>

      <div className="folder-menu-divider" />

      {chatFolders.map((folder) => (
        <div
          key={folder.id}
          className="folder-menu-row"
        >

          <button
            type="button"
            onClick={() => {
              setActiveChatFolder(folder.id);
              setChatFilter("all");
              setChatFolderMenuOpen(false);
            }}
          >
            <span>🗂️</span>
            <span>{folder.name}</span>
          </button>

          {folder.id !== "family" && (
            <button
              type="button"
              className="folder-delete-button"
              title={`Delete ${folder.name}`}
              onClick={() => deleteChatFolder(folder.id)}
            >
              ×
            </button>
          )}

        </div>
      ))}

      <div className="folder-menu-divider" />

      <button
        type="button"
        className="create-folder-button"
        onClick={() => {
          setChatFolderMenuOpen(false);
          createChatFolder();
        }}
      >
        <span>＋</span>
        <span>Create chat group</span>
      </button>

    </div>
  )}


  {/* CHAT SUMMARY */}
  <div className="chat-list-summary">

    <span>
      {filteredConversations.length}{" "}
      {filteredConversations.length === 1
        ? "conversation"
        : "conversations"}
    </span>

    {pinned.length > 0 && (
      <span className="summary-pin">
        📌 {pinned.length}
      </span>
    )}

  </div>


  {/* CONVERSATIONS */}
  <div className="conversation-list">

    {loadingConversations && !conversations.length && (
      <div className="chat-loading">

        {[1, 2, 3, 4].map((item) => (
          <div
            className="chat-loading-row"
            key={item}
          >
            <div className="chat-loading-avatar" />

            <div className="chat-loading-copy">
              <div />
              <div />
            </div>
          </div>
        ))}

        <span>Loading conversations…</span>

      </div>
    )}


    {filteredConversations.map((conversation) => {

      const conversationId = String(conversation.id);

      const isPinned =
        pinned.includes(conversationId);

      const isFavorite =
        starred.includes(conversationId);

      const isMuted =
        muted.includes(conversationId);

      const isActive =
        selected?.id === conversation.id;

      const unreadCount =
        Number(conversation.unread || 0);

      const preview =
        conversation.lastMessage ||
        conversation.latestMessage ||
        conversation.description ||
        "No messages yet";

      const minePreview =
        String(
          conversation.latestMessageSender || ""
        ) === String(profile?.id);

      const displayPreview =
        minePreview && preview
          ? `You: ${preview}`
          : preview;


      return (
        <div
          key={conversation.id}
          className={
            `conversation-row ${
              isActive ? "active" : ""
            } ${
              unreadCount ? "has-unread" : ""
            }`
          }
        >

          {/* MAIN CHAT BUTTON */}
          <button
            type="button"
            className="conversation-main-button"
            onClick={() => {

              setSelected(conversation);

              setMobileConversationOpen(true);

              setConversations((current) =>
                current.map((item) =>
                  String(item.id) ===
                  String(conversation.id)
                    ? {
                        ...item,
                        unread: 0,
                      }
                    : item
                )
              );

            }}
          >

            <div className="conversation-avatar-wrap">

              <Avatar
                src={conversation.avatar_url}
                name={
                  conversation.name ||
                  "HEXA User"
                }
                size={50}
                online={conversation.online}
              />

              {(conversation.kind === "group" ||
                conversation.type === "group" ||
                conversation.type === "system_group") && (
                <span className="conversation-group-badge">
                  👥
                </span>
              )}

            </div>


            <div className="conversation-content">

              <div className="conversation-topline">

                <strong>
                  {conversation.name ||
                    "HEXA User"}
                </strong>

                <time
                  className={
                    unreadCount
                      ? "unread-time"
                      : ""
                  }
                >
                  {formatChatTime(
                    conversation.lastMessageAt ||
                    conversation.latestMessageAt
                  )}
                </time>

              </div>


              <div className="conversation-bottomline">

                <span
                  className={
                    unreadCount
                      ? "preview-unread"
                      : ""
                  }
                >
                  {displayPreview}
                </span>


                <div className="conversation-indicators">

                  {isPinned && (
                    <small title="Pinned">
                      📌
                    </small>
                  )}

                  {isFavorite && (
                    <small title="Favorite">
                      ★
                    </small>
                  )}

                  {isMuted && (
                    <small title="Muted">
                      🔕
                    </small>
                  )}

                  {unreadCount > 0 && (
                    <b className="unread-badge">
                      {unreadCount > 99
                        ? "99+"
                        : unreadCount}
                    </b>
                  )}

                </div>

              </div>

            </div>

          </button>


          {/* CHAT OPTIONS */}
          <button
            type="button"
            className="conversation-options-button"
            title="Chat options"
            onClick={(event) => {
              event.stopPropagation();

              setSelected(conversation);
              setChatFolderAssignOpen(true);
            }}
          >
            ⋮
          </button>

        </div>
      );
    })}


    {/* EMPTY STATE */}
    {!filteredConversations.length && (
      <div className="empty-chat-list">

        <div className="empty-chat-icon">
          💬
        </div>

        <strong>
          {chatSearch
            ? "No matching chats"
            : "No conversations yet"}
        </strong>

        <span>
          {chatSearch
            ? "Try another name, username or message."
            : "Start a new HEXA conversation."}
        </span>

        {!chatSearch && (
          <button
            type="button"
            className="empty-chat-action"
            onClick={() =>
              setNewChatOpen(true)
            }
          >
            Start a chat
          </button>
        )}

      </div>
    )}

  </div>


  {/* ASSIGN CHAT TO FOLDERS */}
  {chatFolderAssignOpen && selected && (
    <div className="chat-folder-assign-popover">

      <div className="chat-folder-assign-header">

        <div>
          <strong>Chat folders</strong>
          <span>
            Organize this conversation
          </span>
        </div>

        <button
          type="button"
          onClick={() =>
            setChatFolderAssignOpen(false)
          }
        >
          ×
        </button>

      </div>


      <div className="chat-folder-assign-name">
        <Avatar
          src={selected.avatar_url}
          name={selected.name}
          size={38}
        />

        <strong>
          {selected.name}
        </strong>
      </div>


      <p>
        Choose one or more folders for this
        conversation.
      </p>


      {chatFolders.map((folder) => {

        const currentIds =
          selected.chatFolderIds || [];

        const checked =
          currentIds.includes(folder.id);

        return (
          <label
            key={folder.id}
            className="chat-folder-check"
          >

            <input
              type="checkbox"
              checked={checked}
              onChange={(event) => {

                const next =
                  event.target.checked
                    ? [
                        ...currentIds,
                        folder.id,
                      ]
                    : currentIds.filter(
                        (id) =>
                          id !== folder.id
                      );

                setConversationFolders(
                  selected.id,
                  next
                );

              }}
            />

            <span>{folder.name}</span>

          </label>
        );
      })}


      <button
        type="button"
        className="chat-folder-new-inline"
        onClick={createChatFolder}
      >
        ＋ Create new folder
      </button>

    </div>
  )}

</aside>


{/* ======================================================
    MESSAGE REQUESTS
    ====================================================== */}

{messageRequestsOpen && (
  <div
    className="message-requests-modal"
    onClick={() =>
      setMessageRequestsOpen(false)
    }
  >

    <div
      className="message-requests-card"
      onClick={(event) =>
        event.stopPropagation()
      }
    >

      <div className="message-requests-header">

        <div>
          <strong>
            Message requests
          </strong>

          <span>
            People who want to start a
            conversation with you
          </span>
        </div>

        <button
          type="button"
          onClick={() =>
            setMessageRequestsOpen(false)
          }
        >
          ×
        </button>

      </div>


      {requestsLoading ? (

        <div className="request-loading">
          Loading requests…
        </div>

      ) : messageRequests.length ? (

        <div className="request-list">

          {messageRequests.map((request) => {

            const sender =
              request.sender || {};

            return (
              <div
                className="request-item"
                key={request.id}
              >

                <Avatar
                  src={sender.avatar_url}
                  name={
                    sender.full_name ||
                    sender.username ||
                    "HEXA User"
                  }
                  size={48}
                />


                <div className="request-copy">

                  <strong>
                    {sender.full_name ||
                      sender.username ||
                      "HEXA User"}
                  </strong>

                  <span>
                    {sender.username
                      ? `@${sender.username}`
                      : "HEXA user"}
                  </span>

                  <small>
                    Wants to message you
                  </small>

                </div>


                <div className="request-actions">

                  <button
                    className="hero-primary"
                    type="button"
                    onClick={() =>
                      acceptMessageRequest(
                        request
                      )
                    }
                  >
                    Accept
                  </button>

                  <button
                    className="hero-secondary"
                    type="button"
                    onClick={() =>
                      declineMessageRequest(
                        request
                      )
                    }
                  >
                    Decline
                  </button>

                </div>

              </div>
            );
          })}

        </div>

      ) : (

        <div className="request-empty">

          <div>💬</div>

          <strong>
            No message requests
          </strong>

          <span>
            New requests will appear here
            before they become chats.
          </span>

        </div>

      )}

    </div>

  </div>
)}

      {/* ======================================================
          CHAT MAIN
          ====================================================== */}

      <main className="chat-main">

        <header className="chat-header">

          <button
            className="mobile-chat-back"
            type="button"
            onClick={() =>
              setMobileConversationOpen(
                false
              )
            }
          >
            ←
          </button>

          <Avatar
            src={
              selected?.avatar_url
            }
            name={
              selected?.name
            }
            size={42}
            online={
              selected?.online
            }
          />

          <div className="chat-header-copy">

            <strong>
              {
                selected?.name
              }
            </strong>

            <span>
              {isSystem
                ? (isSystemAdmin ? "Official HEXA · administrator" : "Official HEXA · read only")
                : isKora
                  ? "Kora AI"
                  : selected?.online
                    ? "online"
                    : "last seen recently"}
            </span>

          </div>

          <div className="chat-header-actions">

            {!isSystem &&
              !isSelf && (
                <>
                  <button type="button" title="Voice call" onClick={() => onStartCall?.(selected, "voice", "call")}>☎</button>
                  <button type="button" title="Voice chat" onClick={() => onStartCall?.(selected, "voice", "chat")}>🎧</button>
                  <button type="button" title="Video call" onClick={() => onStartCall?.(selected, "video", "call")}>📹</button>
                  <button type="button" title="Video chat" onClick={() => onStartCall?.(selected, "video", "chat")}>🎥</button>
                </>
              )}

            <button
              type="button"
              title="Search messages"
              onClick={() => {
                const value =
                  prompt(
                    "Search messages in this chat"
                  );

                if (
                  value !==
                  null
                ) {
                  setMessageSearch(
                    value
                  );
                }
              }}
            >
              ⌕
            </button>

            <button
              type="button"
              title="Chat settings"
              onClick={() =>
                setChatSettingsOpen(
                  value =>
                    !value
                )
              }
            >
              ⋮
            </button>

          </div>

        </header>

        {/* CHAT SETTINGS */}

        {chatSettingsOpen && (
          <div className="chat-settings-popover">

            <strong>
              Chat settings
            </strong>

            <label>
              Disappearing messages

              <select
                value={
                  disappearing
                }
                onChange={event =>
                  setDisappearing(
                    event.target
                      .value
                  )
                }
              >
                <option value="off">
                  Off
                </option>

                <option value="24h">
                  24 hours
                </option>

                <option value="7d">
                  7 days
                </option>

                <option value="90d">
                  90 days
                </option>
              </select>
            </label>

            <button
              type="button"
              onClick={
                toggleMute
              }
            >
              {muted.includes(
                String(
                  selected.id
                )
              )
                ? "🔔 Unmute chat"
                : "🔕 Mute chat"}
            </button>

            <button
              type="button"
              onClick={
                toggleArchive
              }
            >
              {archived.includes(
                String(
                  selected.id
                )
              )
                ? "Unarchive chat"
                : "Archive chat"}
            </button>

            <button
              type="button"
              onClick={
                clearChat
              }
            >
              Clear chat
            </button>

            {!isSystem &&
              !isSelf && (
                <button
                  type="button"
                  className="danger-text"
                  onClick={
                    toggleBlock
                  }
                >
                  {blocked.includes(
                    String(
                      selected.id
                    )
                  )
                    ? "Unblock contact"
                    : "Block contact"}
                </button>
              )}

          </div>
        )}

        {/* MESSAGE SEARCH */}

        {messageSearch && (
          <div className="chat-message-search">

            <input
              autoFocus
              value={
                messageSearch
              }
              onChange={event =>
                setMessageSearch(
                  event.target
                    .value
                )
              }
              placeholder="Search messages"
            />

            <button
              type="button"
              onClick={() =>
                setMessageSearch(
                  ""
                )
              }
            >
              ×
            </button>

            {messageResults.length >
              0 && (
              <div>
                {messageResults
                  .slice(
                    0,
                    10
                  )
                  .map(item => (
                    <button
                      key={
                        item.id
                      }
                      type="button"
                      onClick={() =>
                        document
                          .getElementById(
                            `msg-${item.id}`
                          )
                          ?.scrollIntoView({
                            behavior:
                              "smooth",
                            block:
                              "center"
                          })
                      }
                    >
                      {
                        item.content
                      }
                    </button>
                  ))}
              </div>
            )}

          </div>
        )}

        {/* MESSAGE AREA */}

        <div className="messages-area">

          {loading ? (
            <div className="empty-chat">

              <div className="loading-spinner" />

              <p>
                Loading messages…
              </p>

            </div>
          ) : messages.length ? (
            messages.map(
              renderMessage
            )
          ) : (
            <div className="empty-chat">

              <div className="empty-chat-icon">
                {
                  selected?.avatar ||
                  "H"
                }
              </div>

              <h3>
                {isSystem
                  ? "THE HEXA GROUP"
                  : `Chat with ${
                      selected?.name ||
                      "HEXA User"
                    }`}
              </h3>

              <p>
                {isSystem
                  ? "Official HEXA announcements appear here."
                  : "Messages are end-to-end encrypted in the HEXA architecture."}
              </p>

            </div>
          )}

          <div
            ref={
              bottomRef
            }
          />

        </div>

        {/* SELECTION TOOLBAR */}

        {selectionMode && (
          <div className="message-selection-toolbar">

            <strong>
              {
                selectedMessages.length
              } selected
            </strong>

            <button
              type="button"
              onClick={
                deleteSelected
              }
            >
              🗑
            </button>

            <button
              type="button"
              onClick={
                cancelSelection
              }
            >
              Cancel
            </button>

          </div>
        )}

        {/* REPLY / EDIT */}

        {replyTo && (
          <div className="reply-bar">

            <div>
              <strong>
                Replying to
              </strong>

              <span>
                {
                  replyTo.content ||
                  "Media"
                }
              </span>
            </div>

            <button
              type="button"
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

        {editing && (
          <div className="reply-bar">

            <div>
              <strong>
                Editing message
              </strong>

              <span>
                {
                  editing.content
                }
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                setEditing(
                  null
                );
                setMessage(
                  ""
                );
              }}
            >
              Cancel
            </button>

          </div>
        )}

        {/* COMPOSER */}

        {recording && (
          <div className="voice-recording-bar">
            <span className="recording-dot">●</span>
            <strong>Recording {formatRecordingTime(recordingSeconds)}</strong>
            <div className="voice-wave">{Array.from({ length: 18 }).map((_, i) => <i key={i} style={{ animationDelay: `${i * 55}ms` }} />)}</div>
            <button type="button" onClick={cancelVoiceRecording}>Cancel</button>
            <button type="button" className="send-voice-button" onClick={stopVoiceRecording}>Stop</button>
          </div>
        )}
        {!recording && recordingBlob && (
          <div className="voice-recording-bar preview">
            <span>🎙</span>
            <audio src={recordingPreviewUrl} controls />
            <span>{formatRecordingTime(recordingSeconds)}</span>
            <button type="button" onClick={cancelVoiceRecording}>Delete</button>
            <button type="button" className="send-voice-button" onClick={sendVoiceMessage}>Send</button>
          </div>
        )}

        {!isSystem && (
          <form
            className="chat-composer"
            onSubmit={
              editing
                ? event => {
                    event.preventDefault();
                    saveEditedMessage();
                  }
                 : handleSendMessage
            }
          >

            <div className="composer-left">

              <button
                type="button"
                title="Emoji"
                onClick={() =>
                  setEmojiOpen(
                    value =>
                      !value
                  )
                }
              >
                😊
              </button>

              <button
                type="button"
                title="Attachments"
                onClick={() =>
                  setAttachmentOpen(
                    value =>
                      !value
                  )
                }
              >
                📎
              </button>

              <button
                type="button"
                title="Voice message"
                className={recording ? "recording-active" : ""}
                onClick={recording ? stopVoiceRecording : startVoiceRecording}
              >
                {recording ? "⏺" : "🎙"}
              </button>

            </div>

            <input
              value={
                message
              }
              onChange={event =>
                saveDraft(
                  event.target
                    .value
                )
              }
              placeholder="Type a message"
              onKeyDown={event => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  if (editing) saveEditedMessage();
                  else handleSendMessage(event);
                }
              }}
            />

            <div className="composer-right">
              <button
                type="submit"
                title={editing ? "Save edit" : "Send"}
                className="composer-send-button"
              >
                ➤
              </button>
            </div>

          </form>
        )}

        {/* ==================================================
            HEXA EMOJI PANEL
            ================================================== */}
        {emojiOpen && (
          <div className="emoji-panel hexa-emoji-picker">
            <div className="emoji-picker-header">
              <div className="emoji-picker-title">
                <strong>HEXA Emoji</strong>
                <span>{HEXA_ALL_EMOJIS.length.toLocaleString()}</span>
              </div>
              <button type="button" className="emoji-close" onClick={() => setEmojiOpen(false)}>×</button>
            </div>

            <div className="emoji-search-row">
              <input
                className="emoji-search"
                value={emojiSearch}
                onChange={e => setEmojiSearch(e.target.value)}
                placeholder="Search emojis..."
              />
              {emojiSearch && <button type="button" className="emoji-clear-search" onClick={() => setEmojiSearch("")}>×</button>}
            </div>

            <div className="emoji-category-tabs">
              <button type="button" className={emojiCategory === "⭐ Recent" ? "active" : ""} onClick={() => setEmojiCategory("⭐ Recent")}>🕘</button>
              <button type="button" className={emojiCategory === "💖 Favorites" ? "active" : ""} onClick={() => setEmojiCategory("💖 Favorites")}>💖</button>
              {Object.keys(HEXA_EMOJI_CATEGORIES).map(category => (
                <button key={category} type="button" title={category} className={emojiCategory === category ? "active" : ""} onClick={() => setEmojiCategory(category)}>
                  {category.split(" ")[0]}
                </button>
              ))}
            </div>

            <div className="emoji-tone-row">
              <span>Skin tone</span>
              {HEXA_SKIN_TONES.map(tone => (
                <button key={tone || "default"} type="button" className={emojiTone === tone ? "selected" : ""} onClick={() => setEmojiTone(tone)}>
                  {tone ? `👍${tone}` : "👍"}
                </button>
              ))}
            </div>

            <div className="emoji-picker-label">
              {emojiSearch ? `Results for "${emojiSearch}"` : emojiCategory}
            </div>

            <div className="emoji-grid hexa-emoji-grid">
              {visibleHexaEmojis.map((emoji, index) => {
                const favorite = emojiFavorites.includes(emoji);
                const display = emojiTone && !emoji.includes(emojiTone)
                  ? (hexSkinVariants(emoji).find(v => v.endsWith(emojiTone)) || emoji)
                  : emoji;
                return (
                  <button
                    key={`${emoji}-${index}`}
                    type="button"
                    className="emoji-item"
                    onClick={() => insertHexaEmoji(emoji)}
                    onContextMenu={e => { e.preventDefault(); toggleEmojiFavorite(emoji); }}
                    title={favorite ? "Remove favorite" : "Add favorite with right click"}
                  >
                    <span>{display}</span>
                    {favorite && <small>♥</small>}
                  </button>
                );
              })}
            </div>

            {!visibleHexaEmojis.length && (
              <div className="emoji-empty">
                <span>🔎</span>
                <strong>No emojis found</strong>
                <p>Try another search or category.</p>
              </div>
            )}

            <div className="emoji-picker-footer">
              <span>🕘 {emojiRecent.length}</span>
              <span>💖 {emojiFavorites.length}</span>
              <span>✨ {HEXA_ALL_EMOJIS.length.toLocaleString()}</span>
            </div>
          </div>
        )}

        {/* ==================================================
            ATTACHMENTS
            ================================================== */}

        {attachmentOpen && (
          <div className="feature-popover attachment-popover">

            <button
              type="button"
              onClick={() =>
                mediaRef.current?.click()
              }
            >
              📷 Photos & videos
            </button>

            <button
              type="button"
              onClick={() =>
                cameraRef.current?.click()
              }
            >
              📸 Camera
            </button>

            <button
              type="button"
              onClick={() =>
                setPollOpen(
                  true
                )
              }
            >
              📊 Poll
            </button>

            <button
              type="button"
              onClick={() =>
                setContactOpen(
                  true
                )
              }
            >
              👤 Contact
            </button>

            <button
              type="button"
              onClick={() =>
                setLocationOpen(
                  true
                )
              }
            >
              📍 Location
            </button>

            <button
              type="button"
              onClick={() =>
                setGifOpen(
                  true
                )
              }
            >
              GIF
            </button>

            <button
              type="button"
              onClick={() =>
                setStickerOpen(
                  true
                )
              }
            >
              🩷 Sticker
            </button>

          </div>
        )}

        <input
          ref={mediaRef}
          type="file"
          accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.txt"
          hidden
          onChange={event => {
            const file =
              event.target
                .files?.[0];

            if (!file) return;

            setAttachment({
              name:
                file.name,
              type:
                file.type.startsWith(
                  "image/"
                )
                  ? "image"
                  : file.type.startsWith(
                      "video/"
                    )
                    ? "video"
                    : "file",
              file
            });

            setAttachmentOpen(
              false
            );
          }}
        />

        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          onChange={event => {
            const file =
              event.target
                .files?.[0];

            if (!file) return;

            setAttachment({
              name:
                file.name,
              type:
                "image",
              file
            });

            setAttachmentOpen(
              false
            );
          }}
        />

      </main>

      {/* ======================================================
          NEW CHAT MODAL
          ====================================================== */}

      {newChatOpen && (
        <div
          className="hexa-modal-overlay"
          onClick={() =>
            setNewChatOpen(
              false
            )
          }
        >

          <div
            className="hexa-modal new-chat-modal"
            onClick={event =>
              event.stopPropagation()
            }
          >

            <div className="modal-header">

              <div>
                <strong>
                  New Chat
                </strong>

                <span>
                  Find someone on HEXA
                </span>
              </div>

              <button
                type="button"
                onClick={() =>
                  setNewChatOpen(
                    false
                  )
                }
              >
                ×
              </button>

            </div>

            <div className="new-chat-search">

              <span>
                ⌕
              </span>

              <input
                autoFocus
                value={
                  newChatSearch
                }
                onChange={event =>
                  setNewChatSearch(
                    event.target
                      .value
                  )
                }
                placeholder="Search name or username"
              />

            </div>

            <div className="people-results">

              {peopleLoading && (
                <div className="modal-loading">
                  Searching HEXA…
                </div>
              )}

              {!peopleLoading &&
                newChatSearch.trim() &&
                !peopleResults.length && (
                  <div className="modal-empty">
                    No HEXA account found.
                  </div>
                )}

              {peopleResults.map(
                person => (
                  <button
                    key={
                      person.id
                    }
                    type="button"
                    className="person-result"
                    onClick={() =>
                      createDirectConversation(
                        person
                      )
                    }
                  >

                    <Avatar
                      src={
                        person.avatar_url
                      }
                      name={
                        person.full_name ||
                        person.username
                      }
                      size={46}
                      online={
                        person.online
                      }
                    />

                    <div>
                      <strong>
                        {
                          person.full_name ||
                          person.username ||
                          "HEXA User"
                        }
                      </strong>

                      <span>
                        {person.username
                          ? `@${person.username}`
                          : "HEXA account"}
                      </span>
                    </div>

                  </button>
                )
              )}

            </div>

          </div>

        </div>
      )}

      {/* ======================================================
          FORWARD MODAL
          ====================================================== */}

      {forwardOpen && (
        <div
          className="hexa-modal-overlay"
          onClick={() =>
            setForwardOpen(
              false
            )
          }
        >

          <div
            className="hexa-modal forward-modal"
            onClick={event =>
              event.stopPropagation()
            }
          >

            <div className="modal-header">

              <div>
                <strong>
                  Forward message
                </strong>

                <span>
                  Choose a conversation
                </span>
              </div>

              <button
                type="button"
                onClick={() =>
                  setForwardOpen(
                    false
                  )
                }
              >
                ×
              </button>

            </div>

            <div className="forward-list">

              {conversations
                .filter(
                  conversation =>
                    conversation.id !==
                      "hexa-system-group"
                )
                .map(
                  conversation => (
                    <button
                      key={
                        conversation.id
                      }
                      type="button"
                      className="person-result"
                      onClick={() =>
                        forwardToChat(
                          conversation
                        )
                      }
                    >

                      <Avatar
                        src={
                          conversation.avatar_url
                        }
                        name={
                          conversation.name
                        }
                        size={44}
                      />

                      <div>
                        <strong>
                          {
                            conversation.name
                          }
                        </strong>

                        <span>
                          {
                            conversation.lastMessage ||
                            conversation.description ||
                            "Conversation"
                          }
                        </span>
                      </div>

                    </button>
                  )
                )}

            </div>

          </div>

        </div>
      )}

      {/* ======================================================
          CONTEXT MENU
          ====================================================== */}

      {contextMenu && (
        <div
          className="message-context-menu"
          style={{
            left: Math.min(
              contextMenu.x,
              window.innerWidth -
                235
            ),
            top: Math.min(
              contextMenu.y,
              window.innerHeight -
                430
            )
          }}
          onClick={event =>
            event.stopPropagation()
          }
        >

          {(() => {
            const item =
              messages.find(
                messageItem =>
                  String(
                    messageItem.id
                  ) ===
                  String(
                    contextMenu.id
                  )
              );

            if (!item) {
              return null;
            }

            return (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setReplyTo(
                      item
                    );
                    setContextMenu(
                      null
                    );
                  }}
                >
                  ↩ Reply
                </button>

                <button
                  type="button"
                  onClick={() =>
                    copyMessage(
                      item
                    )
                  }
                >
                  📋 Copy
                </button>

                <button
                  type="button"
                  onClick={() =>
                    editMessage(
                      item
                    )
                  }
                  disabled={
                    item.sender_id !==
                    profile.id
                  }
                >
                  ✏️ Edit
                </button>

                <button
                  type="button"
                  onClick={() =>
                    toggleStar(
                      item
                    )
                  }
                >
                  ⭐{" "}
                  {starred.includes(
                    String(
                      item.id
                    )
                  )
                    ? "Unstar"
                    : "Star"}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    togglePin(
                      item
                    )
                  }
                >
                  📌{" "}
                  {pinned.includes(
                    String(
                      item.id
                    )
                  )
                    ? "Unpin"
                    : "Pin"}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    openForward(
                      item
                    )
                  }
                >
                  ↪ Forward
                </button>

                <button
                  type="button"
                  onClick={() =>
                    reactToMessage(
                      item,
                      "❤️"
                    )
                  }
                >
                  ❤️ React
                </button>

                <button
                  type="button"
                  onClick={() =>
                    toggleMessageSelection(
                      item
                    )
                  }
                >
                  ☑ Select
                </button>

                <button
                  type="button"
                  onClick={() =>
                    deleteMessage(
                      item,
                      false
                    )
                  }
                >
                  🗑 Delete for me
                </button>

                {item.sender_id ===
                  profile.id && (
                  <button
                    type="button"
                    onClick={() =>
                      deleteMessage(
                        item,
                        true
                      )
                    }
                  >
                    🗑 Delete for everyone
                  </button>
                )}
              </>
            );
          })()}

        </div>
      )}

    </section>
  );
}
async function loadHexaConversations(profile) {
  if (!profile?.id) return [];

  try {
    /*
     * Get every conversation this user belongs to.
     */
    const { data: memberships, error: membershipError } =
      await supabase
        .from("conversation_members")
        .select("conversation_id,is_admin")
        .eq("user_id", profile.id);

    if (membershipError) {
      console.error(
        "HEXA conversation membership load:",
        membershipError
      );
      return [];
    }

    const conversationIds = [
      ...new Set(
        (memberships || [])
          .map((item) => item.conversation_id)
          .filter(Boolean)
      ),
    ];

    if (!conversationIds.length) {
      return [];
    }

    /*
     * Load the actual conversations.
     */
    const { data: conversationRows, error: conversationError } =
      await supabase
        .from("conversations")
        .select("*")
        .in("id", conversationIds);

    if (conversationError) {
      console.error(
        "HEXA conversation load:",
        conversationError
      );
      return [];
    }

    /*
     * Find the other user for direct conversations.
     */
    const directOtherIds = [
      ...new Set(
        (conversationRows || [])
          .filter((conversation) => conversation.type === "direct")
          .map((conversation) =>
            conversation.user_a === profile.id
              ? conversation.user_b
              : conversation.user_a
          )
          .filter(Boolean)
      ),
    ];

    let otherProfiles = [];

    if (directOtherIds.length) {
      const { data: profileRows, error: profileError } =
        await supabase
          .from("profiles")
          .select(
            "id,username,full_name,avatar_url"
          )
          .in("id", directOtherIds);

      if (profileError) {
        console.warn(
          "HEXA direct profile load:",
          profileError
        );
      } else {
        otherProfiles = profileRows || [];
      }
    }

    const profileMap = Object.fromEntries(
      otherProfiles.map((person) => [person.id, person])
    );

    // Some direct conversations rely only on conversation_members.
    // Resolve those participants so calls and chat headers still work.
    const directMissingMemberConversations = (conversationRows || []).filter(
      (conversation) =>
        conversation.type === "direct" &&
        (!isHexaUuid(conversation.user_a) || !isHexaUuid(conversation.user_b))
    );

    const membershipByConversation = {};
    if (directMissingMemberConversations.length) {
      const missingIds = directMissingMemberConversations.map((c) => c.id);
      const { data: memberRows } = await supabase
        .from("conversation_members")
        .select("conversation_id,user_id,is_admin")
        .in("conversation_id", missingIds);

      for (const member of memberRows || []) {
        if (!membershipByConversation[member.conversation_id]) {
          membershipByConversation[member.conversation_id] = [];
        }
        membershipByConversation[member.conversation_id].push(member);
      }

      const missingOtherIds = [
        ...new Set(
          Object.values(membershipByConversation)
            .flat()
            .map((member) => member.user_id)
            .filter((id) => isHexaUuid(id) && String(id) !== String(profile.id))
        )
      ];

      if (missingOtherIds.length) {
        const { data: missingProfiles } = await supabase
          .from("profiles")
          .select("id,username,full_name,avatar_url")
          .in("id", missingOtherIds);

        for (const person of missingProfiles || []) {
          profileMap[person.id] = person;
        }
      }
    }

    /*
     * Get recent messages so the Chat list can show:
     *
     * Person
     * Latest message
     * Latest activity time
     */
    const { data: messageRows, error: messageError } =
      await supabase
        .from("messages")
        .select(
          "id,conversation_id,sender_id,content,message_type,metadata,created_at,deleted_at"
        )
        .in("conversation_id", conversationIds)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(1000);

    if (messageError) {
      console.warn(
        "HEXA latest messages load:",
        messageError
      );
    }

    const latestMessages = {};

    (messageRows || []).forEach((msg) => {
      if (!latestMessages[msg.conversation_id]) {
        latestMessages[msg.conversation_id] = msg;
      }
    });

    /*
     * Convert database conversations into the format
     * already used by the HEXA Chat UI.
     */
    return (conversationRows || [])
      .map((conversation) => {
        const membership = (memberships || []).find(
          (member) =>
            member.conversation_id === conversation.id
        );

        const latest =
          latestMessages[conversation.id] || null;

        if (conversation.type === "direct") {
          const otherUserId =
            isHexaUuid(conversation.user_a) &&
            String(conversation.user_a) === String(profile.id)
              ? conversation.user_b
              : isHexaUuid(conversation.user_b) &&
                String(conversation.user_b) === String(profile.id)
                ? conversation.user_a
                : null;

          const membershipFallback = (membershipByConversation[conversation.id] || [])
            .map((member) => member.user_id)
            .find((id) => isHexaUuid(id) && String(id) !== String(profile.id));

          const resolvedOtherUserId =
            otherUserId || membershipFallback || null;

          const person = resolvedOtherUserId
            ? profileMap[resolvedOtherUserId]
            : null;

          const displayName =
            person?.full_name ||
            person?.username ||
            "HEXA User";

          return {
            ...conversation,

            id: conversation.id,
            realConversationId: conversation.id,

            name: displayName,

            username: person?.username || "",

            avatar_url: person?.avatar_url || null,

            avatar: person?.avatar_url
              ? null
              : initials(displayName),

            kind: "direct",

            online: false,

            is_admin: Boolean(membership?.is_admin),

            otherUserId: resolvedOtherUserId,

            latestMessage:
              latest?.content ||
              getChatPreviewText(latest),

            lastMessage:
              latest?.content ||
              getChatPreviewText(latest),

            latestMessageAt:
              latest?.created_at ||
              conversation.updated_at ||
              conversation.created_at ||
              null,

            latestMessageSender:
              latest?.sender_id || null,
          };
        }

        return {
          ...conversation,

          id: conversation.id,
          realConversationId: conversation.id,

          name:
            conversation.name ||
            "HEXA Group",

          avatar:
            conversation.avatar_url
              ? null
              : initials(
                  conversation.name ||
                    "HEXA Group"
                ),

          avatar_url:
            conversation.avatar_url || null,

          kind: "group",

          online: false,

          is_admin: Boolean(membership?.is_admin),

          latestMessage:
            latest?.content ||
            getChatPreviewText(latest),

          lastMessage:
            latest?.content ||
            getChatPreviewText(latest),

          latestMessageAt:
            latest?.created_at ||
            conversation.updated_at ||
            conversation.created_at ||
            null,

          latestMessageSender:
            latest?.sender_id || null,
        };
      })
      .sort(
        (a, b) =>
          new Date(b.latestMessageAt || 0) -
          new Date(a.latestMessageAt || 0)
      );
  } catch (error) {
    console.error(
      "HEXA conversation list failed:",
      error
    );

    return [];
  }
}

function getChatPreviewText(message) {
  if (!message) return "";

  switch (message.message_type) {
    case "image":
      return "📷 Photo";

    case "video":
      return "🎥 Video";

    case "audio":
      return "🔊 Audio";

    case "gif":
      return "GIF";

    case "sticker":
      return "🧩 Sticker";

    case "poll":
      return "🗳️ Poll";

    case "contact":
      return "👤 Contact";

    case "location":
      return "📍 Location";

    case "file":
      return "📄 File";

    default:
      return message.content || "";
  }
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

function LiveMediaModePage({ profile, mode = "voice-chat" }) {
  const isVideo = mode === "video-chat" || mode === "video-call";
  const isCall = mode === "voice-call" || mode === "video-call";
  const title = isVideo
    ? (isCall ? "Video Call" : "Video Chat")
    : (isCall ? "Voice Call" : "Voice Chat");
  const icon = isVideo ? (isCall ? "📹" : "🎥") : (isCall ? "☎" : "🎧");
  const [people, setPeople] = useState([]);
  const [peer, setPeer] = useState(null);
  const [search, setSearch] = useState("");
  const [active, setActive] = useState(null);
  const [status, setStatus] = useState("");

  useEffect(() => {
    const term = search.trim();
    if (term.length < 2) { setPeople([]); return; }
    const timer = setTimeout(async () => {
      const pattern = `%${term}%`;
      const { data } = await supabase.from("profiles")
        .select("id,username,full_name,avatar_url")
        .neq("id", profile.id)
        .or(`username.ilike.${pattern},full_name.ilike.${pattern}`)
        .limit(12);
      setPeople(data || []);
    }, 180);
    return () => clearTimeout(timer);
  }, [search, profile?.id]);

  async function start() {
    if (!peer?.id) { setStatus(`Select a HEXA user for ${title.toLowerCase()}.`); return; }
    const { data: direct, error: directError } = await supabase.rpc("hexa_get_or_create_direct", { p_other_user_id: peer.id });
    if (directError || !direct?.id) { setStatus(directError?.message || "Unable to open the direct conversation."); return; }
    const { data, error } = await supabase.rpc("hexa_create_call", {
      p_conversation_id: direct.id, p_callee_id: peer.id, p_type: isVideo ? "video" : "voice", p_external: false
    });
    if (error) { setStatus(error.message); return; }
    setActive({ call: data, type: isVideo ? "video" : "voice", peer, mode });
    setStatus(isCall ? `Starting ${title.toLowerCase()}…` : `Opening ${title.toLowerCase()}…`);
  }

  return (
    <section className="workspace-page live-media-page">
      <div className="page-heading">
        <div className="page-heading-icon">{icon}</div>
        <div><h1>{title}</h1><p>{isCall ? `Private HEXA ${isVideo ? "video" : "voice"} calling.` : `Live ${isVideo ? "video" : "audio"} conversation in real time.`}</p></div>
      </div>

      <div className="live-media-card">
        <div className="live-media-intro">
          <div className="live-media-icon">{icon}</div>
          <div><strong>{title}</strong><span>{isCall ? "Ring one HEXA user and talk in real time." : "Start a live conversation. Nothing is recorded or sent as a voice message."}</span></div>
        </div>
        <input className="modal-input" placeholder="Search name or username" value={search} onChange={e => setSearch(e.target.value)} />
        <div className="people-results">
          {people.map(person => (
            <button key={person.id} className="person-result" type="button" onClick={() => { setPeer(person); setSearch(person.username ? `@${person.username}` : person.full_name || ""); setPeople([]); setStatus(""); }}>
              <Avatar src={person.avatar_url} name={person.full_name || person.username} size={46} />
              <div><strong>{person.full_name || person.username || "HEXA User"}</strong><span>{person.username ? `@${person.username}` : "HEXA account"}</span></div>
            </button>
          ))}
        </div>
        {peer && <div className="live-selected-peer"><Avatar src={peer.avatar_url} name={peer.full_name || peer.username} size={48} /><div><strong>{peer.full_name || peer.username}</strong><span>{peer.username ? `@${peer.username}` : "HEXA account"}</span></div></div>}
        <button className="hero-primary live-start-button" onClick={start} disabled={!peer}>{icon} {title}</button>
        {status && <p className="muted">{status}</p>}
      </div>

      {active && <WebRTCCall profile={profile} call={active.call} type={active.type} peer={active.peer} mode={active.mode} onEnd={() => { setActive(null); setStatus(`${title} ended.`); }} />}
    </section>
  );
}

function CallsPage({ profile }) {
  const [history, setHistory] = useState([]);
  const [people, setPeople] = useState([]);
  const [peer, setPeer] = useState(null);
  const [search, setSearch] = useState("");
  const [active, setActive] = useState(null);
  const [status, setStatus] = useState("");

  async function loadCalls() {
    if (!profile?.id) return;
    const { data } = await supabase.from("calls")
      .select("*")
      .or(`caller_id.eq.${profile.id},callee_id.eq.${profile.id}`)
      .order("created_at", { ascending: false })
      .limit(50);
    setHistory(data || []);
  }

  useEffect(() => { loadCalls(); }, [profile?.id]);

  useEffect(() => {
    const term = search.trim();
    if (term.length < 2) { setPeople([]); return; }
    const timer = setTimeout(async () => {
      const pattern = `%${term}%`;
      const { data } = await supabase.from("profiles")
        .select("id,username,full_name,avatar_url")
        .neq("id", profile.id)
        .or(`username.ilike.${pattern},full_name.ilike.${pattern}`)
        .limit(12);
      setPeople(data || []);
    }, 200);
    return () => clearTimeout(timer);
  }, [search, profile?.id]);

  async function createCall(type) {
    if (!peer?.id) {
      setStatus("Search for a HEXA user first.");
      return;
    }

    const { data: direct, error: directError } = await supabase.rpc("hexa_get_or_create_direct", {
      p_other_user_id: peer.id,
    });
    if (directError || !direct?.id) {
      setStatus(directError?.message || "Unable to open the direct conversation.");
      return;
    }

    const { data, error } = await supabase.rpc("hexa_create_call", {
      p_conversation_id: direct.id,
      p_callee_id: peer.id,
      p_type: type,
      p_external: false,
    });
    if (error) {
      setStatus(error.message);
      return;
    }

    setActive({ call: data, type, peer });
    setStatus("Calling…");
    loadCalls();
  }

  return (
    <section className="workspace-page">
      <div className="page-heading">
        <div className="page-heading-icon">☎</div>
        <div><h1>Calls</h1><p>Private HEXA voice calls, video calls, Voice Chat and Video Chat.</p></div>
      </div>

      <div className="settings-card">
        <div><strong>Start a call</strong><p>Find a real HEXA account, then start voice or video.</p></div>
        <input className="modal-input" style={{ maxWidth: 320 }} placeholder="Search name or username" value={search} onChange={(e) => setSearch(e.target.value)} />
        <div className="people-results" style={{ maxWidth: 520 }}>
          {people.map((person) => (
            <button key={person.id} className="person-result" type="button" onClick={() => { setPeer(person); setSearch(person.username ? `@${person.username}` : person.full_name || ""); setPeople([]); setStatus(""); }}>
              <Avatar src={person.avatar_url} name={person.full_name || person.username} size={42} />
              <div><strong>{person.full_name || person.username || "HEXA User"}</strong><span>{person.username ? `@${person.username}` : "HEXA account"}</span></div>
            </button>
          ))}
        </div>
        {peer && <div className="selection-pill"><Avatar src={peer.avatar_url} name={peer.full_name || peer.username} size={32} /><span>{peer.full_name || peer.username}</span></div>}
        <div className="hero-actions call-mode-actions">
          <button className="hero-secondary" onClick={() => createCall("voice")} disabled={!peer}>☎ Voice Call</button>
          <button className="hero-secondary" onClick={() => createCall("voice")} disabled={!peer}>🎧 Voice Chat</button>
          <button className="hero-primary" onClick={() => createCall("video")} disabled={!peer}>📹 Video Call</button>
          <button className="hero-primary" onClick={() => createCall("video")} disabled={!peer}>🎥 Video Chat</button>
        </div>
      </div>

      {status && <p className="muted">{status}</p>}
      {active && <WebRTCCall profile={profile} call={active.call} type={active.type} peer={active.peer} onEnd={() => { setActive(null); setStatus("Call ended"); loadCalls(); }} />}

      <div className="section-heading" style={{ marginTop: 22 }}><div><h2>Call history</h2><p>Recent call activity for this HEXA account.</p></div><button className="hero-secondary" onClick={loadCalls}>Refresh</button></div>
      <div className="entity-grid">
        {history.map((c) => <div className="entity-card" key={c.id}><strong>{c.type} · {c.status}</strong><span>{new Date(c.created_at).toLocaleString()}</span><small>{c.billed_seconds || 0}s</small></div>)}
        {!history.length && <div className="entity-card"><strong>No calls yet</strong><span>Your HEXA voice/video call history will appear here.</span></div>}
      </div>
    </section>
  );
}

function WebRTCCall({ profile, call, type, peer, mode = "call", onEnd }) {
  const localVideo = useRef(null);
  const remoteVideo = useRef(null);
  const pcRef = useRef(null);
  const channelRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState("");
  const endedRef = useRef(false);

  useEffect(() => {
    if (!profile?.id || !call?.id || !peer?.id) return undefined;
    let stopped = false;
    let pc = null;

    const insertSignal = async (signalType, payload) => {
      const { error: signalError } = await supabase.from("call_signals").insert({
        call_id: call.id,
        sender_id: profile.id,
        receiver_id: peer.id,
        type: signalType,
        payload,
      });
      if (signalError) console.warn("HEXA call signal:", signalError.message);
    };

    const handleSignal = async (signal) => {
      if (stopped || String(signal.receiver_id) !== String(profile.id)) return;
      try {
        if (signal.type === "offer") {
          if (!pc.currentRemoteDescription) {
            await pc.setRemoteDescription(new RTCSessionDescription(signal.payload));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            await insertSignal("answer", answer);
          }
        } else if (signal.type === "answer" && String(profile.id) === String(call.caller_id)) {
          if (!pc.currentRemoteDescription) {
            await pc.setRemoteDescription(new RTCSessionDescription(signal.payload));
          }
        } else if (signal.type === "ice" && signal.payload) {
          try { await pc.addIceCandidate(new RTCIceCandidate(signal.payload)); } catch {}
        }
      } catch (e) {
        console.error("HEXA WebRTC signal:", e);
        if (!stopped) setError(e?.message || "Call negotiation failed.");
      }
    };

    const start = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error("Camera/microphone access is not available in this browser.");
        const cfg = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };
        if (import.meta.env.VITE_TURN_URL && import.meta.env.VITE_TURN_USERNAME && import.meta.env.VITE_TURN_CREDENTIAL) {
          cfg.iceServers.push({ urls: import.meta.env.VITE_TURN_URL, username: import.meta.env.VITE_TURN_USERNAME, credential: import.meta.env.VITE_TURN_CREDENTIAL });
        }

        pc = new RTCPeerConnection(cfg);
        pcRef.current = pc;
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: type === "video" });
        if (localVideo.current) localVideo.current.srcObject = stream;
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));
        pc.ontrack = (event) => {
          if (remoteVideo.current && event.streams[0]) remoteVideo.current.srcObject = event.streams[0];
        };
        pc.onicecandidate = (event) => {
          if (event.candidate) insertSignal("ice", event.candidate.toJSON());
        };
        pc.onconnectionstatechange = () => {
          const state = pc.connectionState;
          setConnected(state === "connected");
          if (["failed", "closed"].includes(state) && !stopped) setError("Call connection lost.");
        };

        const channel = supabase.channel(`call-${call.id}-${profile.id}`)
          .on("postgres_changes", { event: "INSERT", schema: "public", table: "call_signals", filter: `call_id=eq.${call.id}` }, (payload) => handleSignal(payload.new))
          .on("postgres_changes", { event: "UPDATE", schema: "public", table: "calls", filter: `id=eq.${call.id}` }, (payload) => {
            const status = payload.new?.status;
            if (["ended", "declined", "rejected", "missed"].includes(status) && !endedRef.current) {
              endedRef.current = true;
              onEnd?.();
            }
          });
        channelRef.current = channel;
        await channel.subscribe();

        const { data: existingSignals } = await supabase.from("call_signals").select("*").eq("call_id", call.id).order("created_at", { ascending: true });
        for (const signal of existingSignals || []) await handleSignal(signal);

        if (String(profile.id) === String(call.caller_id)) {
          const hasOffer = (existingSignals || []).some((s) => s.type === "offer" && String(s.sender_id) === String(profile.id));
          if (!hasOffer && !stopped) {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            await insertSignal("offer", offer);
          }
        }
      } catch (e) {
        console.error("HEXA WebRTC start:", e);
        if (!stopped) setError(e?.message || "Unable to start the call.");
      }
    };

    start();

    return () => {
      stopped = true;
      pc?.getSenders().forEach((sender) => sender.track?.stop());
      pc?.close();
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [call?.id, call?.caller_id, peer?.id, profile?.id, type]);

  async function end() {
    if (endedRef.current) return;
    endedRef.current = true;
    const { error: billingError } = await supabase.rpc("finalize_hexa_call", {
      p_call_id: call.id,
      p_ended_reason: "user",
    });
    if (billingError) {
      setError(billingError.message || "Unable to finalize the call.");
      endedRef.current = false;
      return;
    }
    pcRef.current?.getSenders().forEach((sender) => sender.track?.stop());
    pcRef.current?.close();
    onEnd?.();
  }

  const displayName = peer?.name || peer?.full_name || peer?.username || "HEXA User";
  return (
    <div className="story-viewer" style={{ zIndex: 800 }}>
      <div className="call-shell">
        <div className="call-header">
          <strong>{mode === "voice-chat" ? "HEXA Voice Chat" : mode === "video-chat" ? "HEXA Video Chat" : type === "video" ? "HEXA Video Call" : "HEXA Voice Call"}</strong>
          <span>{connected ? "Connected" : call?.status === "ringing" ? "Ringing…" : "Connecting…"}</span>
        </div>
        {type === "video" ? (
          <div className="call-video-grid">
            <video ref={remoteVideo} autoPlay playsInline className="call-remote-video" />
            <video ref={localVideo} autoPlay muted playsInline className="call-local-video" />
          </div>
        ) : (
          <div className="call-audio-stage">
            <div className="call-avatar"><Avatar src={peer?.avatar_url} name={displayName} size={82} /></div>
            <p>{error || (connected ? "Connected" : "Calling…")}</p>
          </div>
        )}
        {error && <p className="call-error">{error}</p>}
        <div className="call-controls"><button className="danger-button" onClick={end}>End call</button></div>
      </div>
    </div>
  );
}

function WebRTCCallLauncher({ profile, target, onClose }) {
  const [call, setCall] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      const conversation = target?.conversation;
      const realConversationId = conversation?.realConversationId || conversation?.id;
      if (!realConversationId || !isHexaUuid(realConversationId)) {
        setError("This conversation is not ready for calling.");
        return;
      }

      let user = null;

      // Prefer the participant already resolved by the chat list.
      if (isHexaUuid(conversation.otherUserId) && String(conversation.otherUserId) !== String(profile.id)) {
        user = conversation.otherUserId;
      }

      // Backward-compatible direct-chat columns.
      if (!user) {
        const candidate = String(conversation.user_a || "") === String(profile.id)
          ? conversation.user_b
          : conversation.user_a;
        if (isHexaUuid(candidate) && String(candidate) !== String(profile.id)) {
          user = candidate;
        }
      }

      // Final fallback: resolve the other member from conversation_members.
      if (!user) {
        const { data: members, error: memberError } = await supabase
          .from("conversation_members")
          .select("user_id")
          .eq("conversation_id", realConversationId);

        if (memberError) {
          setError(memberError.message || "Unable to find the other participant.");
          return;
        }

        const candidates = (members || [])
          .map((member) => member.user_id)
          .filter((id) => isHexaUuid(id) && String(id) !== String(profile.id));

        // Calls are 1:1. A group/community/channel must use the group-call
        // flow instead of inventing a single callee.
        if (String(conversation?.type || conversation?.kind || "").toLowerCase() === "group" || candidates.length > 1) {
          setError("Group calls must be started from the group call control.");
          return;
        }

        user = candidates[0] || null;
      }

      if (!user || !isHexaUuid(user)) {
        setError("This conversation does not have another participant to call.");
        return;
      }

      let data = null;
      let callError = null;
      try {
        const result = await supabase.rpc("hexa_create_call", { p_conversation_id: realConversationId, p_callee_id: user, p_type: target.type, p_external: false });
        data = Array.isArray(result.data) ? result.data[0] : result.data;
        callError = result.error;
      } catch (e) { callError = e; }
      if (callError || !data) {
        const fallback = await supabase.from("calls").insert({ conversation_id: realConversationId, caller_id: profile.id, callee_id: user, type: target.type, status: "ringing", rate_kobo_per_second: 30, currency: "NGN", metadata: { mode: target.mode || (target.type === "video" ? "video-call" : "voice-call") } }).select("*").single();
        if (fallback.error) { setError(fallback.error.message || callError?.message || "Unable to create the call."); return; }
        data = fallback.data;
      }
      if (!mounted) return;

      if (data?.id && target?.mode) {
        const currentMetadata = data?.metadata && typeof data.metadata === "object" ? data.metadata : {};
        await supabase.from("calls").update({
          metadata: { ...currentMetadata, mode: target.mode }
        }).eq("id", data.id);
      }

      const { data: peer } = await supabase.from("profiles")
        .select("id,username,full_name,avatar_url")
        .eq("id", user)
        .maybeSingle();
      if (mounted) setCall({ data, peer: peer || { id: user, full_name: "HEXA User" } });
    })();
    return () => { mounted = false; };
  }, [
    profile?.id,
    target?.conversation?.id,
    target?.conversation?.realConversationId,
    target?.type,
    target?.mode,
  ]);

  if (error) {
    return <div className="story-viewer"><div className="coming-card"><h2>Call unavailable</h2><p>{error}</p><button onClick={onClose}>Close</button></div></div>;
  }
  return call ? (
    <WebRTCCall profile={profile} call={{ ...call.data, callee_id: call.peer.id }} type={target.type} peer={call.peer} mode={target.mode || "call"} onEnd={onClose} />
  ) : (
    <div className="story-viewer"><div className="coming-card"><h2>Starting call…</h2><p>Waiting for the other HEXA user to answer.</p></div></div>
  );
}

function IncomingCallWatcher({ profile }) {
  const [incoming, setIncoming] = useState(null);
  useEffect(() => {
    if (!profile?.id) return;
    let active = true;
    (async () => {
      const { data: ringing, error } = await supabase
        .from("calls")
        .select("*")
        .eq("callee_id", profile.id)
        .eq("status", "ringing")
        .order("created_at", { ascending: false })
        .limit(1);
      if (!error && ringing?.[0] && active) {
        const call = ringing[0];
        const { data: peer } = await supabase
          .from("profiles")
          .select("id,username,full_name,avatar_url")
          .eq("id", call.caller_id)
          .maybeSingle();
        if (active) setIncoming({ call, peer: peer || { id: call.caller_id, full_name: "HEXA User" } });
      }
    })();

    const channel = supabase.channel(`hexa-incoming-calls-${profile.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "calls", filter: `callee_id=eq.${profile.id}` }, async (payload) => {
        const call = payload.new;
        if (!active || call.status !== "ringing") return;
        const { data: peer } = await supabase.from("profiles").select("id,username,full_name,avatar_url").eq("id", call.caller_id).maybeSingle();
        if (active) setIncoming({ call, peer: peer || { id: call.caller_id, full_name: "HEXA User" } });
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "calls", filter: `callee_id=eq.${profile.id}` }, (payload) => {
        if (["ended", "declined", "rejected", "missed"].includes(payload.new?.status)) {
          setIncoming(current => current && String(current.call.id) === String(payload.new.id) ? null : current);
        }
      })
      .subscribe();
    return () => { active = false; supabase.removeChannel(channel); };
  }, [profile?.id]);
  if (!incoming) return null;
  const accept = async () => {
    if (!incoming?.call?.id) return;
    const { data, error } = await supabase.rpc("hexa_answer_call", {
      p_call_id: incoming.call.id
    });
    if (error) {
      safeAlert(error.message);
      return;
    }
    setIncoming(x => x ? { ...x, call: data, accepted: true } : null);
  };
  const decline = async () => {
    const { error } = await supabase.rpc("hexa_decline_call", {
      p_call_id: incoming.call.id
    });
    if (error) safeAlert(error.message);
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
function UniversalSearch({ search, profile, onMessage }) {
  const [results,setResults]=useState([]),[loading,setLoading]=useState(false),[error,setError]=useState("");
  useEffect(()=>{let cancelled=false;const run=async()=>{const term=String(search||"").trim();if(term.length<2){setResults([]);setError("");return;}setLoading(true);setError("");const pattern=`%${term}%`;try{
    const [peopleR,chatsR,msgsR,communitiesR,statusR]=await Promise.all([
      supabase.from("profiles").select("id,username,full_name,email,avatar_url").neq("id",profile?.id).or(`username.ilike.${pattern},full_name.ilike.${pattern},email.ilike.${pattern}`).limit(10),
      supabase.from("conversations").select("id,name,type,description,owner_id,created_by").ilike("name",pattern).limit(10),
      supabase.from("messages").select("id,conversation_id,sender_id,content,message_type,created_at").ilike("content",pattern).is("deleted_at",null).order("created_at",{ascending:false}).limit(15),
      supabase.from("communities").select("id,name,description,created_at").ilike("name",pattern).limit(8),
      supabase.from("statuses").select("id,user_id,text,description,media_type,created_at").or(`text.ilike.${pattern},description.ilike.${pattern}`).gt("expires_at",new Date().toISOString()).limit(8)
    ]);
    if(cancelled)return;const out=[];
    (peopleR.data||[]).forEach(x=>out.push({kind:"person",id:`p-${x.id}`,title:x.full_name||x.username||"HEXA User",subtitle:x.username?`@${x.username}`:"Contact",data:x}));
    (chatsR.data||[]).filter(x=>x.type!=="direct").forEach(x=>out.push({kind:x.name?.toLowerCase().startsWith("channel:")?"channel":x.type==="group"?"group":"chat",id:`c-${x.id}`,title:String(x.name||"").replace(/^channel:/i,""),subtitle:x.type==="group"?"Group":"Chat",data:x}));
    (msgsR.data||[]).forEach(x=>out.push({kind:"message",id:`m-${x.id}`,title:x.content||x.message_type||"Message",subtitle:`Message · ${new Date(x.created_at).toLocaleString()}`,data:x}));
    (communitiesR.data||[]).forEach(x=>out.push({kind:"community",id:`co-${x.id}`,title:x.name,subtitle:"Community",data:x}));
    (statusR.data||[]).forEach(x=>out.push({kind:"status",id:`s-${x.id}`,title:x.text||x.description||"Status",subtitle:"Status",data:x}));
    setResults(out);
  }catch(e){if(!cancelled)setError(e?.message||"Search failed")}finally{if(!cancelled)setLoading(false)}};const t=setTimeout(run,250);return()=>{cancelled=true;clearTimeout(t)}},[search,profile?.id]);
  if(!search?.trim())return null;return <div className="universal-search-panel">{loading&&<div className="universal-search-state">Searching people, chats, messages, groups, communities, channels, status and media…</div>}{!loading&&error&&<div className="universal-search-state">{error}</div>}{!loading&&!error&&!results.length&&<div className="universal-search-state">No HEXA results found.</div>}{results.map(r=><button key={r.id} className="universal-search-result" type="button" onClick={()=>{if(r.kind==="person")onMessage(r.data);else alert(`${r.subtitle}: ${r.title}`)}}><div className="universal-search-avatar">{r.kind==="person"?<Avatar src={r.data.avatar_url} name={r.title} size={40}/>:r.kind==="message"?"💬":r.kind==="group"?"👥":r.kind==="channel"?"📢":r.kind==="community"?"◉":"◌"}</div><div className="universal-search-result-copy"><strong>{r.title}</strong><span>{r.subtitle}</span></div><b>{r.kind}</b></button>)}</div>;
}
/* ============================================================
   HEXA SETTINGS
   ============================================================ */

function ProfileEditor({ profile, onSaved }) {
  const [name, setName] = useState(profile?.full_name || profile?.display_name || "");
  const [username, setUsername] = useState(profile?.username || "");
  const [about, setAbout] = useState(profile?.about || "");
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || "");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const fileRef = useRef(null);

  useEffect(() => {
    setName(profile?.full_name || profile?.display_name || "");
    setUsername(profile?.username || "");
    setAbout(profile?.about || "");
    setAvatarUrl(profile?.avatar_url || "");
  }, [profile?.id, profile?.full_name, profile?.display_name, profile?.username, profile?.about, profile?.avatar_url]);

  async function saveProfile(event) {
    event?.preventDefault();
    if (!profile?.id || busy) return;
    const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 30);
    if (cleanUsername.length < 3) {
      setStatus("Username must contain at least 3 letters, numbers or underscores.");
      return;
    }
    setBusy(true); setStatus("");
    try {
      const { data: duplicate, error: duplicateError } = await supabase
        .from("profiles").select("id").eq("username", cleanUsername).neq("id", profile.id).maybeSingle();
      if (duplicateError) throw duplicateError;
      if (duplicate) throw new Error("That username is already taken.");
      const { data, error } = await supabase.from("profiles").update({
        full_name: name.trim() || cleanUsername,
        display_name: name.trim() || cleanUsername,
        username: cleanUsername,
        about: about.trim() || null,
        avatar_url: avatarUrl || null,
        updated_at: new Date().toISOString(),
      }).eq("id", profile.id).select("*").single();
      if (error) throw error;
      setStatus(`Saved as @${data.username}`);
      onSaved?.(data);
    } catch (error) {
      setStatus(error?.message || "Unable to save your profile.");
    } finally { setBusy(false); }
  }

  async function changeAvatar(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !profile?.id) return;
    if (!file.type.startsWith("image/")) { setStatus("Choose an image file."); return; }
    if (file.size > 5 * 1024 * 1024) { setStatus("Profile pictures must be 5 MB or smaller."); return; }
    setBusy(true); setStatus("Uploading profile picture…");
    try {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
      const path = `${profile.id}/avatar-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type, cacheControl: "3600" });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const publicUrl = data?.publicUrl;
      if (!publicUrl) throw new Error("The profile picture uploaded but no public URL was returned.");
      const { error: updateError } = await supabase.from("profiles").update({ avatar_url: publicUrl, updated_at: new Date().toISOString() }).eq("id", profile.id);
      if (updateError) throw updateError;
      const nextAvatarUrl = `${publicUrl}?v=${Date.now()}`;
      setAvatarUrl(nextAvatarUrl);
      const nextProfile = { ...profile, avatar_url: publicUrl, updated_at: new Date().toISOString() };
      onSaved?.(nextProfile);
      setStatus("Profile picture updated.");
    } catch (error) {
      setStatus(error?.message || "Unable to upload profile picture. Make sure the avatars storage bucket exists.");
    } finally { setBusy(false); }
  }

  return (
    <form className="settings-card profile-editor-card" onSubmit={saveProfile}>
      <div className="profile-editor-avatar-wrap">
        <Avatar src={avatarUrl} name={name || username || "HEXA User"} size={92} online />
        <input ref={fileRef} hidden type="file" accept="image/*" onChange={changeAvatar} />
        <button type="button" className="profile-avatar-change" onClick={() => fileRef.current?.click()} disabled={busy}>Change photo</button>
      </div>
      <div className="profile-editor-fields">
        <div className="profile-editor-title"><div><strong>Edit profile</strong><span>Your picture stays inside the HEXA profile circle.</span></div><span className="settings-status">{profile?.email || "HEXA account"}</span></div>
        <label className="settings-field"><span>Name</span><input className="modal-input" value={name} onChange={e => setName(e.target.value)} maxLength={80} placeholder="Your name" /></label>
        <label className="settings-field"><span>Username</span><input className="modal-input" value={username} onChange={e => setUsername(e.target.value.toLowerCase())} maxLength={30} placeholder="username" /></label>
        <label className="settings-field"><span>About</span><textarea className="modal-input modal-textarea" value={about} onChange={e => setAbout(e.target.value)} maxLength={140} placeholder="Tell people about yourself" /></label>
        {status && <p className="muted profile-save-status">{status}</p>}
        <button className="hero-primary" type="submit" disabled={busy}>{busy ? "Saving…" : "Save profile"}</button>
      </div>
    </form>
  );
}

function SettingsPage({ profile, onSignOut, onProfileSaved }) {
  const [theme, setTheme] = useState(getSavedHexaTheme());
  const [showThemes, setShowThemes] = useState(true);

  useEffect(() => {
    applyHexaTheme(theme);
  }, [theme]);

  function changeTheme(themeId) {
    setTheme(themeId);
    applyHexaTheme(themeId);
  }

  const activeTheme = HEXA_THEMES[theme] || HEXA_THEMES.midnight;

  return (
    <section className="workspace-page settings-page">

      <div className="page-heading">
        <div className="page-heading-icon">⚙</div>

        <div>
          <h1>Settings</h1>
          <p>
            Customize your HEXA experience, appearance and account.
          </p>
        </div>
      </div>

      {/* PROFILE */}

      <ProfileEditor profile={profile} onSaved={onProfileSaved} />

      <div className="settings-card hexa-profile-settings">
        <Avatar
          src={profile?.avatar_url}
          name={
            profile?.full_name ||
            profile?.username ||
            "HEXA User"
          }
          size={64}
        />

        <div>
          <strong>
            {profile?.full_name ||
              profile?.username ||
              "HEXA User"}
          </strong>

          <p>
            {profile?.username
              ? `@${profile.username}`
              : profile?.email || "HEXA account"}
          </p>
        </div>
      </div>

      {/* APPEARANCE */}

      <div className="settings-section">

        <button
          className="settings-section-heading"
          onClick={() => setShowThemes(v => !v)}
        >
          <div>
            <strong>Appearance</strong>
            <span>
              Choose how HEXA looks on your devices.
            </span>
          </div>

          <b>{showThemes ? "⌃" : "⌄"}</b>
        </button>

        {showThemes && (
          <div className="hexa-theme-panel">

            <div className="theme-current">
              <div>
                <span>Current theme</span>
                <strong>
                  {activeTheme.icon} {activeTheme.name}
                </strong>
              </div>

              <small>
                {activeTheme.description}
              </small>
            </div>

            <div className="hexa-theme-grid">

              {Object.values(HEXA_THEMES).map(item => (
                <button
                  key={item.id}
                  type="button"
                  className={
                    `hexa-theme-option ${
                      theme === item.id
                        ? "selected"
                        : ""
                    }`
                  }
                  onClick={() => changeTheme(item.id)}
                >

                  <div
                    className="theme-preview"
                    style={{
                      background: item.vars["--hexa-bg"]
                    }}
                  >
                    <div
                      className="theme-preview-sidebar"
                      style={{
                        background:
                          item.vars["--hexa-sidebar"]
                      }}
                    />

                    <div className="theme-preview-content">

                      <div
                        className="theme-preview-message incoming"
                        style={{
                          background:
                            item.vars["--hexa-message-in"]
                        }}
                      />

                      <div
                        className="theme-preview-message outgoing"
                        style={{
                          background:
                            item.vars["--hexa-message-out"]
                        }}
                      />

                    </div>

                    <div
                      className="theme-preview-accent"
                      style={{
                        background:
                          item.vars["--hexa-accent"]
                      }}
                    />
                  </div>

                  <div className="theme-option-copy">
                    <strong>
                      {item.icon} {item.name}
                    </strong>

                    <span>
                      {item.description}
                    </span>
                  </div>

                  {theme === item.id && (
                    <div className="theme-selected">
                      ✓
                    </div>
                  )}

                </button>
              ))}

            </div>

          </div>
        )}

      </div>

      {/* CHAT */}

      <div className="settings-grid">

        <div className="settings-card">
          <div>
            <strong>Chat appearance</strong>
            <p>
              Your selected theme automatically applies to
              conversations, chat bubbles, menus and panels.
            </p>
          </div>

          <span className="settings-status">
            {activeTheme.name}
          </span>
        </div>

        <div className="settings-card">
          <div>
            <strong>Theme synchronization</strong>
            <p>
              HEXA remembers your theme on this device.
            </p>
          </div>

          <span className="settings-status">
            Enabled
          </span>
        </div>

        <div className="settings-card settings-row">
          <div><strong>Privacy</strong><p>Last seen, online status, read receipts, profile photo and blocked contacts.</p></div><button type="button" className="settings-inline-button">›</button>
        </div>
        <div className="settings-card settings-row">
          <div><strong>Notifications</strong><p>Messages, groups, calls, status alerts and notification previews.</p></div><button type="button" className="settings-inline-button">›</button>
        </div>
        <div className="settings-card settings-row">
          <div><strong>Chats</strong><p>Wallpaper, disappearing messages, drafts, backups and media settings.</p></div><button type="button" className="settings-inline-button">›</button>
        </div>
        <div className="settings-card settings-row">
          <div><strong>Calls</strong><p>Microphone, camera, speaker, call privacy and incoming-call preferences.</p></div><button type="button" className="settings-inline-button">›</button>
        </div>
        <div className="settings-card settings-row">
          <div><strong>Storage and data</strong><p>Media usage, auto-download preferences and network settings.</p></div><button type="button" className="settings-inline-button">›</button>
        </div>
        <div className="settings-card settings-row">
          <div><strong>Help</strong><p>FAQ, contact HEXA support, app information and safety resources.</p></div><button type="button" className="settings-inline-button">›</button>
        </div>

        <div className="settings-card">
          <div>
            <strong>Account</strong>
            <p>
              Manage your HEXA session.
            </p>
          </div>

          <button
            className="settings-danger-button"
            onClick={onSignOut}
          >
            Sign out
          </button>
        </div>

      </div>

    </section>
  );
}
class HexaErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("HEXA runtime error:", error, info);
  }

  handleReload = () => {
    if (typeof window !== "undefined") window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <>
        <style>{APP_STYLES}</style>
        <div className="hexa-error-screen">
          <div className="loading-logo">H</div>
          <h1>HEXA needs to restart</h1>
          <p>Something unexpected happened in the workspace. Your local drafts and queued messages were not intentionally cleared.</p>
          <button className="hero-primary" onClick={this.handleReload}>Reload HEXA</button>
        </div>
      </>
    );
  }
}

function AuthenticatedHEXA({ session, onSignOut }) {

  const [profile,setProfile]=useState(null),[profileLoading,setProfileLoading]=useState(true),[activePage,setActivePage]=useState("chat"),[search,setSearch]=useState(""),[notifications,setNotifications]=useState([]),[showNotifications,setShowNotifications]=useState(false),[chatTarget,setChatTarget]=useState(null),[callTarget,setCallTarget]=useState(null);
  const [profileError, setProfileError] = useState("");
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!session?.user?.id) {
        if (!cancelled) {
          setProfile(null);
          setProfileError("");
          setProfileLoading(false);
        }
        return;
      }
      setProfileLoading(true);
      setProfileError("");
      try {
        const { error: dbCheckError } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", session.user.id)
          .maybeSingle();

        if (dbCheckError) {
          throw new Error(`HEXA database check failed: ${dbCheckError.message}`);
        }

        const result = await ensureHexaProfile(session.user);
        if (!result) {
          throw new Error(
            "Your account is authenticated, but HEXA could not read or create your profile. Check the profiles table RLS policies in Supabase."
          );
        }
        if (!cancelled) setProfile(result);
      } catch (error) {
        console.error("HEXA profile bootstrap error:", error);
        if (!cancelled) {
          setProfile(null);
          setProfileError(error?.message || "HEXA could not load your profile.");
        }
      } finally {
        if (!cancelled) setProfileLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [session?.user?.id]);
  useEffect(() => {
    if (!profile?.id || typeof window === "undefined") return;
    try {
      const saved = JSON.parse(localStorage.getItem(`hexa-notifications:${profile.id}`) || "[]");
      if (Array.isArray(saved)) setNotifications(saved.slice(0, 100));
    } catch {
      setNotifications([]);
    }
  }, [profile?.id]);

  useEffect(() => {
    if (!profile?.id || typeof window === "undefined") return;
    try {
      localStorage.setItem(`hexa-notifications:${profile.id}`, JSON.stringify(notifications.slice(0, 100)));
    } catch {}
  }, [profile?.id, notifications]);

  function pushNotification(notification) {
    const item = {
      id: notification.id || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      title: notification.title || "HEXA notification",
      body: notification.body || "",
      kind: notification.kind || "general",
      conversation_id: notification.conversation_id || null,
      created_at: notification.created_at || new Date().toISOString(),
    };
    setNotifications((items) => [item, ...items.filter((x) => String(x.id) !== String(item.id))].slice(0, 100));
    return item;
  }

  async function enableBrowserNotifications() {
    if (!("Notification" in window)) return;
    try {
      await Notification.requestPermission();
    } catch (error) {
      console.warn("HEXA notification permission:", error);
    }
  }

  useEffect(() => {
    if (!profile?.id || typeof window === "undefined") return;

    // Ask once for browser notifications. The user can deny this and HEXA
    // will continue using the in-app notification center normally.
    const channel = supabase
      .channel(`hexa-notifications-${profile.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        async (payload) => {
          const message = payload.new;
          if (!message || message.sender_id === profile.id) return;

          const body = message.content || (message.message_type === "image" ? "📷 Photo" : message.message_type === "video" ? "🎥 Video" : message.message_type === "voice" ? "🎙 Voice message" : "New HEXA message");
          const notification = pushNotification({
            id: `${message.id || Date.now()}-message`,
            title: "New message",
            body,
            kind: "message",
            conversation_id: message.conversation_id || null,
          });

          // System-level notification when HEXA is not the foreground page.
          if (
            "Notification" in window &&
            Notification.permission === "granted" &&
            document.visibilityState !== "visible"
          ) {
            try {
              const n = new Notification(notification.title, {
                body: notification.body,
                icon: "/favicon.ico",
                tag: `hexa-message-${message.conversation_id || message.id}`,
              });
              n.onclick = () => {
                window.focus();
                n.close();
              };
            } catch (error) {
              console.warn("HEXA system notification:", error);
            }
          }
        }
      )
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "message_requests", filter: `recipient_id=eq.${profile.id}` }, (payload) => {
        const request = payload.new;
        if (!request || request.status !== "pending") return;
        pushNotification({
          id: `${request.id}-request`,
          title: "New message request",
          body: "Someone wants to start a HEXA conversation with you.",
          kind: "request",
        });
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "message_requests", filter: `sender_id=eq.${profile.id}` }, (payload) => {
        const request = payload.new;
        if (!request) return;
        if (request.status === "accepted") {
          pushNotification({ id: `${request.id}-accepted`, title: "Message request accepted", body: "Your HEXA conversation is now open.", kind: "request" });
        } else if (request.status === "declined") {
          pushNotification({ id: `${request.id}-declined`, title: "Message request declined", body: "Your message request was declined.", kind: "request" });
        }
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "calls" }, (payload) => {
        const call = payload.new;
        if (!call || String(call.callee_id) !== String(profile.id)) return;
        pushNotification({
          id: `${call.id}-incoming`,
          title: call.type === "video" ? "Incoming video call" : "Incoming voice call",
          body: "Tap HEXA to answer the call.",
          kind: "call",
          conversation_id: call.conversation_id || null,
        });
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "calls" }, (payload) => {
        const call = payload.new;
        if (!call || (String(call.caller_id) !== String(profile.id) && String(call.callee_id) !== String(profile.id))) return;
        if (["missed", "declined", "ended"].includes(call.status)) {
          const label = call.status === "missed" ? "Missed" : call.status === "declined" ? "Declined" : "Call ended";
          pushNotification({
            id: `${call.id}-${call.status}`,
            title: call.type === "video" ? `Video call · ${label}` : `Voice call · ${label}`,
            body: "Open Calls or the conversation for details.",
            kind: "call",
            conversation_id: call.conversation_id || null,
          });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id]);
  if (profileLoading) return <div className="hexa-loading-screen"><div className="loading-logo">H</div><div className="loading-spinner"/><strong>Opening HEXA…</strong><span>Preparing your workspace</span></div>;
  if (profileError || !profile) return (
    <div className="hexa-error-screen">
      <div className="loading-logo">H</div>
      <h1>HEXA could not load your profile</h1>
      <p>{profileError || "Your session is valid, but HEXA could not load the required profile record."}</p>
      <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
        <button className="hero-primary" onClick={() => window.location.reload()}>Retry</button>
        <button className="hero-secondary" onClick={onSignOut}>Sign out</button>
      </div>
    </div>
  );
  let page; switch(activePage){
    case "chat":page=<ChatPage profile={profile} initialConversation={chatTarget?.id ? chatTarget : undefined} onStartCall={(c,type,mode)=>setCallTarget({conversation:c,type,mode: mode === "chat" ? (type === "video" ? "video-chat" : "voice-chat") : (type === "video" ? "video-call" : "voice-call")})} onOpenChatWithUser={()=>setSearch("")}/>;break;
    case "groups":page=<GroupsPage profile={profile} onOpenChat={c=>{setChatTarget(c);setActivePage("chat")}}/>;break;
    case "communities":page=<CommunitiesPage profile={profile}/>;break;
    case "channels":page=<ChannelsPage profile={profile}/>;break;
    case "status":page=<StatusPage profile={profile}/>;break;
    case "calls":page=<CallsPage profile={profile}/>;break;
    case "kora":page=<KoraPage profile={profile}/>;break;
    case "settings":page=<SettingsPage profile={profile} onSignOut={onSignOut} onProfileSaved={(next)=>setProfile(p=>({...p,...next}))}/>;break;
    default:page=<ChatPage profile={profile} onStartCall={(c,type,mode)=>setCallTarget({conversation:c,type,mode: mode === "chat" ? (type === "video" ? "video-chat" : "voice-chat") : (type === "video" ? "video-call" : "voice-call")})}/>;
  }
  return <div className={`hexa-app ${activePage === "chat" ? "chat-mode" : ""}`}><IncomingCallWatcher profile={profile}/><Sidebar activePage={activePage} setActivePage={setActivePage} profile={profile}/><div className={`hexa-main ${activePage === "chat" ? "hexa-main-chat" : ""}`}>{activePage !== "chat" && <Topbar profile={profile} search={search} setSearch={setSearch} activePage={activePage} onNotifications={()=>setShowNotifications(v=>!v)} notificationCount={notifications.length} onSettings={()=>setActivePage("settings")}/>}<main className="hexa-content"><UniversalSearch search={search} profile={profile} onMessage={async p=>{setSearch("");try{const chat=await ensureHexaDirectConversation({profileId:profile.id,otherUserId:p.id,otherProfile:p});setChatTarget(chat);setActivePage("chat");}catch(error){try{const request=await supabase.from("message_requests").insert({sender_id:profile.id,recipient_id:p.id,status:"pending"});if(request.error)throw request.error;alert("Message request sent. They can accept it before the chat opens.");}catch(requestError){alert(requestError?.message||error?.message||"Unable to start this conversation.");}}}}/>{showNotifications&&<div className="notifications-panel"><div className="notifications-header"><strong>Notifications</strong><div style={{display:"flex",gap:8}}><button type="button" onClick={enableBrowserNotifications}>Enable</button><button type="button" onClick={()=>{setNotifications([]);try{localStorage.removeItem(`hexa-notifications:${profile.id}`)}catch{}}}>Clear</button></div></div>{notifications.length?notifications.map(n=><button type="button" className="notification-item notification-item-button" key={n.id} onClick={()=>{setShowNotifications(false); if(n.conversation_id){setChatTarget({id:n.conversation_id});setActivePage("chat");} else if(n.kind === "call"){setActivePage("calls");} else if(n.kind === "request"){setActivePage("chat");}}}><span>{n.kind === "call" ? "☎" : n.kind === "request" ? "✉" : "●"}</span><div><strong>{n.title}</strong><p>{n.body}</p><small>{new Date(n.created_at).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}</small></div></button>):<div className="notification-empty">You're all caught up.</div>}</div>}{page}{callTarget&&<WebRTCCallLauncher profile={profile} target={callTarget} onClose={()=>setCallTarget(null)}/>}</main></div></div>;
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
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error("HEXA sign out:", error);
      setAuthError(getAuthErrorMessage(error) || "Unable to sign out safely. Please try again.");
      return;
    }

    if (mountedRef.current) {
      setSession(null);
      setAuthError("");
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

  if (HEXA_CONFIG_ERROR) {
    return (
      <>
        <style>{APP_STYLES}</style>
        <div className="hexa-error-screen">
          <div className="loading-logo">H</div>
          <h1>HEXA configuration required</h1>
          <p>{HEXA_CONFIG_ERROR}</p>
          <small>Vercel: Project → Settings → Environment Variables → add the required VITE_ variables, then redeploy.</small>
        </div>
      </>
    );
  }

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
    <HexaErrorBoundary>
      <style>{APP_STYLES}</style><style>{EXTRA_CHAT_STYLES}</style>

      {session ? (
        <AuthenticatedHEXA
          session={session}
          onSignOut={handleSignOut}
        />
      ) : (
        <AuthScreen />
      )}
    </HexaErrorBoundary>
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
  padding: 16px;
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
  width: 260px;
  height: 260px;
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
  width: min(100%, 400px);
  padding: 26px;
  border: 1px solid var(--hexa-border);
  background: rgba(13,17,24,.92);
  backdrop-filter: blur(24px);
  border-radius: 20px;
  box-shadow: var(--hexa-shadow);
  position: relative;
  z-index: 2;
}

.hexa-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 22px;
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
  width: 42px;
  height: 42px;
  border-radius: 12px;
  font-size: 19px;
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
  font-size: 24px;
  line-height: 1.15;
  margin: 0 0 7px;
}

.auth-heading p {
  color: var(--hexa-muted);
  margin: 0 0 18px;
  line-height: 1.6;
}

.auth-field {
  display: block;
  margin-bottom: 11px;
}

.auth-field span {
  display: block;
  margin-bottom: 6px;
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
  overflow: hidden;
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
  bottom: 1px;
  right: 1px;
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

.chat-folder-bar{position:relative;display:flex;align-items:center;gap:6px;padding:7px 14px 5px;border-bottom:1px solid var(--hexa-border);background:var(--hexa-sidebar)}
.chat-folder-tabs{display:flex;align-items:center;gap:4px;min-width:0;overflow-x:auto;scrollbar-width:none;flex:1}
.chat-folder-tabs::-webkit-scrollbar{display:none}
.chat-folder-tabs button{border:0;background:transparent;color:var(--hexa-muted);padding:7px 10px;border-radius:9px;white-space:nowrap;font-size:11px;font-weight:700;cursor:pointer}
.chat-folder-tabs button.selected{background:rgba(124,92,255,.13);color:var(--hexa-text)}
.chat-folder-plus,.chat-folder-dropdown{width:30px;height:30px;border:1px solid var(--hexa-border);background:var(--hexa-panel-2);color:var(--hexa-text);border-radius:9px;cursor:pointer;display:grid;place-items:center;flex:0 0 auto}
.chat-folder-menu{position:absolute;right:12px;top:45px;width:210px;z-index:45;background:var(--hexa-panel);border:1px solid var(--hexa-border-strong);border-radius:12px;box-shadow:var(--hexa-shadow);padding:6px}
.chat-folder-menu>button,.chat-folder-menu-row>button{display:block;width:100%;border:0;background:transparent;color:var(--hexa-text);text-align:left;padding:9px;border-radius:8px;font-size:11px;cursor:pointer}
.chat-folder-menu>button:hover,.chat-folder-menu-row>button:hover{background:rgba(255,255,255,.05)}
.chat-folder-menu-row{display:flex;align-items:center}
.chat-folder-menu-row>button:first-child{flex:1}
.chat-folder-delete{width:30px!important;text-align:center!important;color:var(--hexa-danger)!important}
.chat-filter-row.secondary{padding-top:7px}
.chat-folder-assign-trigger{opacity:.55;cursor:pointer;padding:3px}
.chat-folder-assign-popover{position:absolute;z-index:50;left:16px;right:16px;bottom:16px;background:var(--hexa-panel);border:1px solid var(--hexa-border-strong);border-radius:14px;box-shadow:var(--hexa-shadow);padding:12px}
.chat-folder-assign-header{display:flex;justify-content:space-between;align-items:center}
.chat-folder-assign-header button{border:0;background:transparent;color:var(--hexa-muted);font-size:18px;cursor:pointer}
.chat-folder-assign-popover p{font-size:10px;color:var(--hexa-muted);margin:7px 0 10px}
.chat-folder-check{display:flex;align-items:center;gap:8px;padding:7px 4px;font-size:11px}
.chat-folder-check input{accent-color:var(--hexa-accent)}
.chat-folder-new-inline{width:100%;margin-top:7px;border:1px solid var(--hexa-border);background:var(--hexa-panel-2);color:var(--hexa-text);border-radius:9px;padding:8px;font-size:11px}
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

/* ============================================================
   CHAT LIST POLISH
   ============================================================ */
.chat-list-title-wrap { min-width: 0; }
.chat-list-title-row { display: flex; align-items: center; gap: 7px; }
.chat-list-title-row h2 { margin: 0; }
.chat-count { min-width: 18px; height: 18px; padding: 0 5px; border-radius: 999px; display: inline-flex; align-items: center; justify-content: center; font-size: 9px; color: #bbc4d2; background: rgba(255,255,255,.07); }
.chat-list-header-subtitle { display: block; margin-top: 4px; }
.chat-filter-row { padding: 0 13px 8px; display: flex; gap: 5px; overflow-x: auto; scrollbar-width: none; }
.chat-filter-row::-webkit-scrollbar { display: none; }
.chat-filter-row button { flex: 0 0 auto; min-height: 29px; padding: 0 9px; display: inline-flex; align-items: center; gap: 5px; border: 1px solid var(--hexa-border); border-radius: 999px; background: rgba(255,255,255,.025); color: #8994a5; font-size: 10px; }
.chat-filter-row button.selected { color: white; border-color: rgba(124,92,255,.42); background: rgba(124,92,255,.14); }
.chat-filter-row button em { font-style: normal; font-size: 8px; min-width: 15px; height: 15px; padding: 0 4px; border-radius: 999px; display: inline-flex; align-items: center; justify-content: center; color: white; background: rgba(255,255,255,.09); }
.chat-filter-row .has-requests, .chat-filter-row .request-pill.has-requests { color: white; border-color: rgba(66,211,146,.28); background: rgba(66,211,146,.08); }
.chat-search-clear { position: absolute; right: 7px; top: 50%; transform: translateY(-50%); width: 24px; height: 24px; border: 0; border-radius: 50%; background: rgba(255,255,255,.06); color: #9ca8b8; }
.chat-list-summary { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 1px 16px 7px; color: #687384; font-size: 8px; text-transform: uppercase; letter-spacing: .08em; }
.conversation { position: relative; border: 1px solid transparent; }
.conversation:hover { background: rgba(255,255,255,.045); border-color: rgba(255,255,255,.03); }
.conversation.active { background: rgba(124,92,255,.09); border-color: rgba(124,92,255,.16); box-shadow: inset 2px 0 var(--hexa-accent); }
.conversation.has-unread { background: rgba(255,255,255,.018); }
.conversation.has-unread.active { background: rgba(124,92,255,.09); }
.conversation-avatar-wrap { position: relative; flex: 0 0 auto; }
.conversation-type-badge { position: absolute; right: -2px; bottom: -1px; width: 18px; height: 18px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; background: #131923; border: 2px solid #090c11; font-size: 8px; }
.conversation-content { flex: 1; min-width: 0; }
.conversation-content strong { max-width: calc(100% - 60px); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.conversation-topline time { flex: 0 0 auto; }
.conversation-topline time.unread-time { color: var(--hexa-success); font-weight: 700; }
.conversation-bottomline { min-width: 0; display: flex; align-items: center; gap: 7px; }
.conversation-bottomline > span { flex: 1; min-width: 0; }
.conversation-bottomline .preview-unread { color: #d9e0ea; font-weight: 600; }
.conversation-indicators { flex: 0 0 auto; display: flex; align-items: center; gap: 3px; }
.conversation-indicators small { color: #758092; font-size: 8px; }
.unread-badge { min-width: 18px; height: 18px; padding: 0 5px; display: inline-flex; align-items: center; justify-content: center; border-radius: 999px; background: var(--hexa-accent); color: #fff; font-size: 8px; }
.chat-loading { padding: 20px 16px; display: grid; gap: 9px; color: #6e798a; font-size: 9px; }
.chat-skeleton { height: 45px; border-radius: 11px; background: linear-gradient(90deg, rgba(255,255,255,.035), rgba(255,255,255,.065), rgba(255,255,255,.035)); background-size: 220% 100%; animation: hexa-skeleton 1.25s ease-in-out infinite; }
@keyframes hexa-skeleton { 0% { background-position: 100% 0; } 100% { background-position: -100% 0; } }
.empty-chat-list { padding: 46px 24px; text-align: center; }
.empty-chat-icon { width: 54px; height: 54px; margin: 0 auto 13px; border-radius: 18px; display: flex; align-items: center; justify-content: center; background: rgba(124,92,255,.1); font-size: 25px; color: #b7aaff; }
.empty-chat-action { margin-top: 13px; height: 34px; padding: 0 14px; border: 0; border-radius: 10px; color: white; background: var(--hexa-accent); font-size: 10px; }

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
    font-size: 22px;
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

/* =========================================================
   HEXA EMOJI PICKER
   ========================================================= */
.hexa-emoji-picker{width:min(440px,calc(100vw - 20px));max-height:min(640px,74vh);display:flex;flex-direction:column;overflow:hidden;padding:12px;border:1px solid var(--hexa-border-strong);border-radius:20px;background:var(--hexa-panel);box-shadow:var(--hexa-shadow);backdrop-filter:blur(22px)}
.emoji-picker-header{display:flex;align-items:center;justify-content:space-between;padding:2px 4px 10px}.emoji-picker-title{display:flex;align-items:center;gap:8px}.emoji-picker-title span{padding:3px 8px;border-radius:999px;background:var(--hexa-panel-3);color:var(--hexa-muted);font-size:10px}.emoji-close{width:30px;height:30px;border-radius:50%;background:var(--hexa-panel-3);color:var(--hexa-text);font-size:20px}.emoji-search-row{position:relative;margin-bottom:8px}.emoji-search{width:100%;height:40px;padding:0 38px 0 13px;border:1px solid var(--hexa-border);border-radius:12px;background:var(--hexa-panel-2);color:var(--hexa-text);outline:none}.emoji-clear-search{position:absolute;right:5px;top:5px;width:30px;height:30px;border-radius:50%;background:transparent;color:var(--hexa-muted);font-size:18px}.emoji-category-tabs{display:flex;gap:4px;overflow-x:auto;padding-bottom:7px}.emoji-category-tabs button{flex:0 0 36px;width:36px;height:36px;border-radius:10px;background:transparent;color:var(--hexa-text);font-size:19px}.emoji-category-tabs button:hover,.emoji-category-tabs button.active{background:var(--hexa-accent);color:#fff}.emoji-tone-row{display:flex;align-items:center;gap:4px;padding:7px 3px;border-top:1px solid var(--hexa-border);border-bottom:1px solid var(--hexa-border);overflow-x:auto}.emoji-tone-row span{margin-right:5px;color:var(--hexa-muted);font-size:10px;white-space:nowrap}.emoji-tone-row button{min-width:34px;height:30px;border-radius:9px;background:transparent;font-size:17px}.emoji-tone-row button.selected,.emoji-tone-row button:hover{background:var(--hexa-panel-3)}.emoji-picker-label{padding:9px 3px 6px;color:var(--hexa-muted);font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.08em}.hexa-emoji-grid{display:grid;grid-template-columns:repeat(9,minmax(0,1fr));gap:2px;flex:1;min-height:0;overflow-y:auto;padding:2px}.emoji-item{position:relative;aspect-ratio:1;display:flex;align-items:center;justify-content:center;border-radius:10px;background:transparent;color:var(--hexa-text);font-size:27px;transition:transform .1s ease,background .1s ease}.emoji-item:hover{transform:scale(1.12);background:var(--hexa-panel-3);z-index:2}.emoji-item:active{transform:scale(.92)}.emoji-item small{position:absolute;right:1px;bottom:1px;color:var(--hexa-accent-2);font-size:8px}.emoji-empty{min-height:160px;display:flex;align-items:center;justify-content:center;flex-direction:column;text-align:center;color:var(--hexa-muted)}.emoji-empty span{font-size:34px;margin-bottom:7px}.emoji-empty strong{color:var(--hexa-text)}.emoji-empty p{font-size:11px;margin:5px 0}.emoji-picker-footer{display:flex;justify-content:space-between;gap:8px;padding:8px 3px 1px;border-top:1px solid var(--hexa-border);color:var(--hexa-muted);font-size:9px}
@media(max-width:700px){.hexa-emoji-picker{width:calc(100vw - 16px);max-height:68vh}.hexa-emoji-grid{grid-template-columns:repeat(7,minmax(0,1fr))}.emoji-item{font-size:24px}}

/* HEXA feature extensions */
.notifications-panel{position:absolute;right:22px;top:72px;width:min(390px,calc(100vw - 28px));background:var(--hexa-panel);border:1px solid var(--hexa-border-strong);border-radius:18px;box-shadow:var(--hexa-shadow);z-index:100;padding:10px}.notifications-header{display:flex;justify-content:space-between;align-items:center;padding:12px 10px;border-bottom:1px solid var(--hexa-border)}.notifications-header button{background:none;border:0;color:var(--hexa-accent-2)}.notification-item{display:flex;gap:12px;padding:14px 10px;border-bottom:1px solid var(--hexa-border)}.notification-item>span{color:var(--hexa-accent)}.notification-item p{margin:4px 0;color:var(--hexa-muted)}.notification-item small{color:var(--hexa-muted)}.notification-empty{padding:28px;text-align:center;color:var(--hexa-muted)}.notification-button{position:relative}.notification-button b{position:absolute;right:0;top:-5px;min-width:17px;height:17px;padding:0 4px;border-radius:99px;background:var(--hexa-danger);font-size:9px;display:grid;place-items:center;color:#fff}.entity-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:14px}.entity-card{padding:20px;border:1px solid var(--hexa-border);background:var(--hexa-panel);border-radius:18px;display:flex;flex-direction:column;gap:9px}.entity-card span,.entity-card small{color:var(--hexa-muted)}.entity-modal,.status-modal{width:min(620px,calc(100vw - 28px));max-height:90vh;overflow:auto;background:var(--hexa-panel);border:1px solid var(--hexa-border-strong);border-radius:22px;padding:22px;box-shadow:var(--hexa-shadow)}.modal-input{width:100%;margin:8px 0;padding:13px 14px;border-radius:12px;border:1px solid var(--hexa-border);background:rgba(255,255,255,.035);color:var(--hexa-text);outline:none}.modal-textarea{min-height:90px;resize:vertical}.media-picker{width:100%;display:flex;align-items:center;gap:14px;text-align:left;padding:12px;border:1px dashed var(--hexa-border-strong);border-radius:14px;background:transparent;color:var(--hexa-text);margin:8px 0 14px}.media-picker img{width:52px;height:52px;border-radius:12px;object-fit:cover}.media-picker span{width:52px;height:52px;border-radius:12px;display:grid;place-items:center;background:var(--hexa-panel-3);font-size:25px}.media-picker small{display:block;color:var(--hexa-muted);margin-top:3px}.member-picker{display:grid;gap:7px;max-height:180px;overflow:auto;margin-bottom:16px}.member-option{display:flex;align-items:center;gap:9px;padding:7px;border-radius:10px}.member-option:hover{background:rgba(255,255,255,.04)}.status-composer-tabs{display:flex;gap:8px;margin-bottom:10px}.status-composer-tabs button{flex:1;padding:11px;border:1px solid var(--hexa-border);background:var(--hexa-panel-2);color:var(--hexa-text);border-radius:11px}.status-media-preview img,.status-media-preview video{width:100%;max-height:300px;object-fit:contain;border-radius:14px;margin:8px 0}.privacy-row{display:flex;align-items:center;justify-content:space-between;margin:12px 0;color:var(--hexa-muted)}.privacy-row select{background:var(--hexa-panel-2);color:var(--hexa-text);border:1px solid var(--hexa-border);padding:9px;border-radius:10px}.status-card.unseen .status-preview{box-shadow:0 0 0 3px var(--hexa-accent)}.status-card.seen{opacity:.8}.status-preview img,.status-preview video{width:100%;height:100%;object-fit:cover;border-radius:inherit}.story-viewer{position:fixed;inset:0;background:rgba(0,0,0,.92);z-index:500;display:grid;place-items:center;padding:20px}.story-content{width:min(520px,100%);height:min(88vh,820px);position:relative;background:#000;border-radius:20px;overflow:hidden;display:flex;align-items:center;justify-content:center}.story-content img,.story-content video{width:100%;height:100%;object-fit:contain}.story-text{font-size:34px;font-weight:800;text-align:center;padding:30px}.story-caption{position:absolute;left:18px;right:18px;bottom:58px;padding:10px;border-radius:10px;background:rgba(0,0,0,.45)}.story-actions{position:absolute;bottom:10px;right:12px;display:flex;gap:6px}.story-actions button,.story-close{border:0;background:rgba(255,255,255,.12);color:#fff;border-radius:50%;width:38px;height:38px}.story-close{position:absolute;right:22px;top:20px;z-index:2;font-size:25px}.story-progress{position:absolute;top:12px;left:20px;right:20px;height:3px;background:rgba(255,255,255,.35);z-index:2}.search-results{display:grid;gap:6px;padding:8px}.search-person{display:flex;align-items:center;gap:12px;padding:10px;border:0;background:transparent;color:var(--hexa-text);text-align:left;border-radius:12px}.search-person:hover{background:rgba(255,255,255,.05)}.search-person div{flex:1}.search-person span{display:block;color:var(--hexa-muted);font-size:12px}.search-person b{font-size:12px;color:var(--hexa-accent-2)}.settings-grid{display:grid;gap:12px;max-width:760px}.settings-card{display:flex;align-items:center;gap:16px;justify-content:space-between;padding:18px;border:1px solid var(--hexa-border);background:var(--hexa-panel);border-radius:18px}.settings-card>div:first-child{flex:1}.settings-card p{color:var(--hexa-muted);margin:5px 0 0}.settings-card button{border:1px solid var(--hexa-border);background:var(--hexa-panel-2);color:var(--hexa-text);padding:10px 14px;border-radius:10px}.settings-card.danger button{color:#fff;background:var(--hexa-danger);border-color:transparent}.settings-inline-button{font-size:24px!important;line-height:1;min-width:42px;min-height:42px;border-radius:50%!important}
.reply-bar{display:flex;justify-content:space-between;gap:12px;align-items:center;padding:8px 14px;background:var(--hexa-panel-2);border-top:1px solid var(--hexa-border);font-size:12px;color:var(--hexa-muted)}.reply-bar button{border:0;background:none;color:var(--hexa-text)}.message-bubble-wrap{position:relative;max-width:86%}.message-tools{display:none;position:absolute;right:0;top:-34px;background:var(--hexa-panel);border:1px solid var(--hexa-border);border-radius:10px;padding:3px;z-index:4}.message-bubble-wrap:hover .message-tools{display:flex}.message-tools button{border:0;background:none;color:var(--hexa-text);padding:5px}.reaction-picker{position:absolute;bottom:32px;right:0;display:flex;background:var(--hexa-panel);border:1px solid var(--hexa-border);border-radius:14px;padding:5px;box-shadow:var(--hexa-shadow)}.reaction-summary{font-size:12px;background:var(--hexa-panel-2);border-radius:10px;padding:3px 7px;display:inline-block;margin-top:3px}.message-media{display:block;max-width:280px;max-height:340px;border-radius:12px;object-fit:contain}.gif-panel{position:absolute;left:14px;right:14px;bottom:76px;background:var(--hexa-panel);border:1px solid var(--hexa-border-strong);border-radius:16px;padding:10px;z-index:30;box-shadow:var(--hexa-shadow)}.gif-search{display:flex;gap:7px}.gif-search input{flex:1}.gif-grid{display:grid;grid-template-columns:repeat(6,1fr);gap:6px;max-height:240px;overflow:auto;margin-top:8px}.gif-grid button{padding:0;border:0;background:none}.gif-grid img{width:100%;height:70px;object-fit:cover;border-radius:7px}.muted{color:var(--hexa-muted)}

.chat-filter-row{display:flex;gap:6px;align-items:center;padding:8px 12px 4px;overflow-x:auto}.chat-filter-row button{border:1px solid var(--hexa-border);background:var(--hexa-panel-2);color:var(--hexa-muted);border-radius:999px;padding:7px 10px;font-size:11px;white-space:nowrap}.chat-filter-row button.selected{background:var(--hexa-accent);border-color:transparent;color:#fff}.chat-filter-row .request-pill{margin-left:auto}.chat-filter-row .request-pill.has-requests{color:#fff;background:rgba(48,209,88,.18);border-color:rgba(48,209,88,.35)}.message-requests-modal{position:fixed;inset:0;z-index:850;background:rgba(0,0,0,.62);display:grid;place-items:center;padding:18px}.message-requests-card{width:min(640px,100%);max-height:min(720px,90vh);overflow:auto;background:var(--hexa-panel);border:1px solid var(--hexa-border-strong);border-radius:20px;box-shadow:var(--hexa-shadow)}.message-requests-header{display:flex;align-items:center;justify-content:space-between;padding:18px;border-bottom:1px solid var(--hexa-border)}.message-requests-header div{display:grid;gap:4px}.message-requests-header span{font-size:12px;color:var(--hexa-muted)}.message-requests-header>button{border:0;background:transparent;color:var(--hexa-text);font-size:24px}.request-list{display:grid}.request-item{display:flex;align-items:center;gap:12px;padding:14px 18px;border-bottom:1px solid var(--hexa-border)}.request-copy{min-width:0;flex:1;display:grid;gap:3px}.request-copy span,.request-copy small{color:var(--hexa-muted);font-size:11px}.request-actions{display:flex;gap:7px}.request-actions button{padding:8px 11px}.request-empty{min-height:220px;display:grid;place-items:center;align-content:center;gap:7px;padding:30px;text-align:center;color:var(--hexa-muted)}.request-empty div{font-size:42px}.request-empty strong{color:var(--hexa-text);font-size:16px}.request-empty span{font-size:12px;max-width:310px}

/* HEXA master feature UI */
.call-message-bubble{min-width:245px;padding:11px 12px}.call-message-main{display:flex;align-items:center;gap:12px}.call-message-icon{width:42px;height:42px;border-radius:14px;display:grid;place-items:center;background:var(--hexa-panel-3);font-size:21px}.call-message-copy{display:grid;gap:3px}.call-message-copy strong{font-size:13px}.call-message-copy span{font-size:11px;color:var(--hexa-muted)}.call-back-button{margin-top:9px;width:100%;border:1px solid var(--hexa-border);background:var(--hexa-panel-2);color:var(--hexa-text);border-radius:10px;padding:8px 10px;font-weight:700;cursor:pointer}.call-back-button:hover{background:var(--hexa-accent);color:#fff;border-color:transparent}.call-message-row .message-meta{margin-top:7px}.call-message-row .message-bubble{box-shadow:0 8px 24px rgba(0,0,0,.10)}

.hexa-audio-message{display:flex;align-items:center;gap:7px}.hexa-audio-message audio{max-width:210px;height:34px}.hexa-audio-message select{background:var(--hexa-panel-2);color:var(--hexa-text);border:1px solid var(--hexa-border);border-radius:8px;padding:4px}.message-context-menu{position:fixed;z-index:1000;min-width:190px;background:var(--hexa-panel);border:1px solid var(--hexa-border-strong);border-radius:14px;padding:6px;box-shadow:var(--hexa-shadow);display:grid;gap:2px}.message-context-menu button{border:0;background:none;color:var(--hexa-text);padding:10px;text-align:left;border-radius:9px}.message-context-menu button:hover{background:rgba(255,255,255,.06)}.message-context-menu .danger-text{color:var(--hexa-danger)}.emoji-panel,.sticker-panel,.feature-popover,.chat-settings-popover{position:absolute;z-index:40;background:var(--hexa-panel);border:1px solid var(--hexa-border-strong);border-radius:16px;box-shadow:var(--hexa-shadow);padding:12px}.emoji-panel{left:12px;bottom:76px;width:min(410px,calc(100% - 24px))}.emoji-tones,.emoji-grid,.sticker-grid{display:flex;flex-wrap:wrap;gap:5px}.emoji-grid{max-height:220px;overflow:auto;margin-top:8px}.emoji-panel button,.sticker-grid button{border:0;background:transparent;font-size:21px;padding:6px;border-radius:8px}.emoji-panel button:hover,.sticker-grid button:hover{background:rgba(255,255,255,.06)}.sticker-panel{left:12px;bottom:76px;width:300px}.sticker-grid{margin-top:10px}.sticker-grid button{font-size:30px}.feature-popover{right:12px;bottom:76px;width:min(360px,calc(100% - 24px));display:grid;gap:8px}.feature-popover h3{margin:0}.chat-settings-popover{right:12px;top:64px;width:270px;display:grid;gap:10px;z-index:60}.chat-settings-popover label{display:grid;gap:6px;color:var(--hexa-muted);font-size:12px}.chat-settings-popover select,.chat-settings-popover button{padding:9px;border-radius:9px;border:1px solid var(--hexa-border);background:var(--hexa-panel-2);color:var(--hexa-text)}.chat-search-results{padding:10px;border-top:1px solid var(--hexa-border);display:grid;gap:5px}.chat-search-results button{border:0;background:transparent;color:var(--hexa-muted);text-align:left;padding:6px}.poll-message{display:grid;gap:7px;min-width:220px}.poll-message button{display:flex;justify-content:space-between;gap:10px;padding:9px;border-radius:9px;border:1px solid var(--hexa-border);background:var(--hexa-panel-2);color:var(--hexa-text);text-align:left}.poll-message button span{color:var(--hexa-muted);font-size:10px}.shared-contact{display:flex;gap:10px;align-items:center;min-width:190px}.shared-contact div{display:grid}.shared-contact small{color:var(--hexa-muted)}.location-card{color:inherit;text-decoration:none;display:block;padding:4px}.file-message{display:flex;gap:8px;align-items:center}.forwarded-label{font-size:10px;color:var(--hexa-muted);margin-bottom:5px}.sticker-message{font-size:70px;line-height:1}.view-once-bubble{min-width:100px}.universal-search-result{display:flex;align-items:center;gap:10px;width:100%}.universal-search-result-copy{flex:1}.universal-search-result>b{text-transform:uppercase;font-size:9px;color:var(--hexa-accent-2)}


/* ============================================================
   HEXA — FRIENDLY DESKTOP / TABLET SCALING
   ============================================================ */

.hexa-sidebar {
  width: 240px !important;
  min-width: 240px !important;
  max-width: 240px !important;
  padding: 8px !important;
}

.hexa-sidebar .sidebar-section-label,
.hexa-sidebar .sidebar-item > span:not(.sidebar-icon),
.hexa-sidebar .sidebar-user-info,
.hexa-sidebar .sidebar-brand > div:last-of-type {
  display: block !important;
}

.hexa-sidebar .sidebar-brand {
  justify-content: flex-start !important;
  padding: 0 12px !important;
}

.hexa-sidebar .sidebar-item {
  width: 100% !important;
  height: 44px !important;
  min-height: 44px !important;
  margin: 2px 0 !important;
  padding: 0 11px !important;
  display: flex !important;
  place-items: initial !important;
  border-radius: 10px !important;
}

.hexa-sidebar .sidebar-icon {
  width: 24px !important;
  min-width: 24px !important;
  font-size: 17px !important;
}

.hexa-main {
  min-width: 0 !important;
}

.hexa-topbar {
  height: 64px !important;
  min-height: 64px !important;
  padding: 0 18px !important;
}

.hexa-content:not(.hexa-chat-content) {
  overflow-y: auto !important;
}

.workspace-page {
  width: min(1180px, calc(100% - 36px)) !important;
  max-width: 1180px !important;
  padding: 28px 0 40px !important;
}

.page-heading h1 {
  font-size: 25px !important;
}

.page-heading p {
  font-size: 12px !important;
}

.chat-layout {
  grid-template-columns: 360px minmax(0, 1fr) !important;
}

.chat-list-panel {
  width: 360px !important;
  min-width: 360px !important;
  max-width: 360px !important;
}

.messages-area {
  padding-left: clamp(22px, 6vw, 96px) !important;
  padding-right: clamp(22px, 6vw, 96px) !important;
}

.message-stack {
  max-width: min(680px, 78%) !important;
}

.message-bubble {
  max-width: 100% !important;
  font-size: 13px !important;
  line-height: 1.5 !important;
}

.chat-composer {
  min-height: 68px !important;
  height: 68px !important;
  padding: 10px 14px !important;
}

.chat-composer > input {
  height: 44px !important;
  min-height: 44px !important;
  font-size: 13px !important;
}

.notifications-panel {
  top: 72px !important;
  right: 18px !important;
  width: min(390px, calc(100vw - 36px)) !important;
}

/* ============================================================
   TABLET
   ============================================================ */

@media (max-width: 1000px) {
  .hexa-sidebar {
    width: 210px !important;
    min-width: 210px !important;
    max-width: 210px !important;
  }

  .chat-layout {
    grid-template-columns: 320px minmax(0, 1fr) !important;
  }

  .chat-list-panel {
    width: 320px !important;
    min-width: 320px !important;
    max-width: 320px !important;
  }

  .workspace-page {
    width: min(100% - 28px, 1000px) !important;
  }
}

/* ============================================================
   PHONE
   ============================================================ */

@media (max-width: 760px) {
  .hexa-sidebar {
    width: min(320px, 88vw) !important;
    min-width: 0 !important;
    max-width: min(320px, 88vw) !important;
    display: flex !important;
    position: fixed !important;
    inset: 0 auto 0 0 !important;
    z-index: 900 !important;
    transform: translateX(-105%) !important;
    transition: transform .2s ease !important;
    padding: 8px !important;
  }

  .hexa-sidebar.mobile-open {
    transform: translateX(0) !important;
  }

  .hexa-sidebar .sidebar-section-label,
  .hexa-sidebar .sidebar-item > span:not(.sidebar-icon),
  .hexa-sidebar .sidebar-user-info,
  .hexa-sidebar .sidebar-brand > div:last-of-type {
    display: block !important;
  }

  .hexa-sidebar .sidebar-item {
    width: 100% !important;
    height: 44px !important;
    min-height: 44px !important;
    display: flex !important;
    place-items: initial !important;
    padding: 0 11px !important;
  }

  .chat-layout {
    grid-template-columns: 100% !important;
  }

  .chat-list-panel {
    width: 100% !important;
    min-width: 100% !important;
    max-width: 100% !important;
  }

  .workspace-page {
    width: calc(100% - 20px) !important;
    padding: 18px 0 30px !important;
  }

  .messages-area {
    padding: 10px 9px !important;
  }

  .message-stack {
    max-width: 88% !important;
  }

  .chat-composer {
    height: auto !important;
    min-height: 60px !important;
    padding: 7px !important;
  }
}

/* ============================================================
   HEXA UX POLISH — COMMUNICATION APP LAYOUT
   ============================================================ */

.hexa-app {
  background: var(--hexa-bg);
  color: var(--hexa-text);
}

.hexa-sidebar {
  width: 232px !important;
  min-width: 232px !important;
  max-width: 232px !important;
  padding: 0 !important;
  background: var(--hexa-panel) !important;
  border-right: 1px solid var(--hexa-border) !important;
}

.sidebar-brand {
  height: 64px !important;
  min-height: 64px !important;
  padding: 0 16px !important;
  gap: 10px !important;
  background: var(--hexa-panel) !important;
}

.sidebar-brand strong {
  font-size: 15px !important;
  letter-spacing: .04em !important;
}

.sidebar-brand span {
  font-size: 9px !important;
  letter-spacing: .08em !important;
}

.sidebar-nav {
  padding: 10px 10px 8px !important;
}

.sidebar-section-label {
  padding: 10px 10px 6px !important;
  font-size: 10px !important;
}

.sidebar-item {
  width: 100% !important;
  min-height: 44px !important;
  height: 44px !important;
  margin: 2px 0 !important;
  padding: 0 12px !important;
  display: flex !important;
  align-items: center !important;
  gap: 12px !important;
  border-radius: 10px !important;
  font-size: 13px !important;
}

.sidebar-item.active {
  background: color-mix(in srgb, var(--hexa-accent) 14%, transparent) !important;
  color: #fff !important;
}

.sidebar-icon {
  width: 24px !important;
  min-width: 24px !important;
  font-size: 18px !important;
  text-align: center !important;
}

.sidebar-bottom {
  padding: 10px !important;
  background: var(--hexa-panel) !important;
}

.sidebar-user {
  min-height: 54px !important;
  padding: 7px 9px !important;
  border-radius: 11px !important;
  background: var(--hexa-panel-2) !important;
}

.hexa-main {
  min-width: 0 !important;
  background: var(--hexa-bg) !important;
}

.hexa-topbar {
  height: 64px !important;
  min-height: 64px !important;
  padding: 0 18px !important;
  background: var(--hexa-panel) !important;
}

.topbar-search {
  max-width: 720px !important;
}

.topbar-search input {
  height: 40px !important;
  border-radius: 20px !important;
  font-size: 13px !important;
}

.topbar-actions {
  gap: 5px !important;
}

.topbar-actions > button {
  width: 40px !important;
  height: 40px !important;
}

.notification-button {
  position: relative;
  font-size: 17px !important;
}

.notification-button b {
  position: absolute;
  top: 1px;
  right: 1px;
  min-width: 17px;
  height: 17px;
  padding: 0 4px;
  display: grid;
  place-items: center;
  border-radius: 10px;
  background: #ef4444;
  color: white;
  font-size: 9px;
  border: 2px solid var(--hexa-panel);
}

.hexa-content {
  overflow: hidden !important;
}

.workspace-page {
  width: min(1180px, calc(100% - 44px)) !important;
  max-width: 1180px !important;
  padding: 30px 0 44px !important;
}

.page-heading h1 {
  font-size: clamp(24px, 2.4vw, 32px) !important;
}

.page-heading p {
  font-size: 12px !important;
}

.entity-grid {
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)) !important;
  gap: 16px !important;
}

.entity-card, .coming-card {
  border-radius: 15px !important;
}

.chat-layout {
  grid-template-columns: 360px minmax(0, 1fr) !important;
}

.chat-list-panel {
  width: 360px !important;
  min-width: 360px !important;
  max-width: 360px !important;
  background: var(--hexa-panel) !important;
}

.chat-list-header {
  height: 70px !important;
  min-height: 70px !important;
  padding: 12px 16px !important;
}

.chat-list-header h2 {
  font-size: 20px !important;
}

.chat-search {
  padding: 9px 13px !important;
}

.chat-search input {
  height: 40px !important;
  border-radius: 20px !important;
  font-size: 13px !important;
}

.conversation {
  min-height: 76px !important;
  height: 76px !important;
  padding: 10px 15px !important;
  gap: 12px !important;
}

.conversation-content strong {
  font-size: 14px !important;
}

.conversation-content span {
  font-size: 11px !important;
}

.chat-main {
  background: var(--hexa-chat-bg, var(--hexa-bg)) !important;
}

.chat-header {
  height: 64px !important;
  min-height: 64px !important;
  padding: 0 18px !important;
}

.messages-area {
  padding: 22px clamp(18px, 6vw, 100px) 24px !important;
}

.message-stack {
  max-width: min(72%, 720px) !important;
}

.message-bubble {
  max-width: 100% !important;
  padding: 8px 11px !important;
  border-radius: 10px !important;
}

.message-bubble span {
  font-size: 13px !important;
  line-height: 1.5 !important;
}

.chat-composer {
  height: 72px !important;
  min-height: 72px !important;
  padding: 10px 16px !important;
  gap: 8px !important;
}

.chat-composer > input {
  height: 46px !important;
  min-height: 46px !important;
  border-radius: 23px !important;
  padding: 0 17px !important;
  font-size: 13px !important;
}

.composer-left button,
.composer-right button {
  width: 44px !important;
  height: 44px !important;
  min-width: 44px !important;
}

.notifications-panel {
  top: 74px !important;
  right: 18px !important;
  width: min(410px, calc(100vw - 36px)) !important;
  border-radius: 14px !important;
}

@media (max-width: 1100px) {
  .hexa-sidebar {
    width: 215px !important;
    min-width: 215px !important;
    max-width: 215px !important;
  }

  .chat-layout {
    grid-template-columns: 320px minmax(0, 1fr) !important;
  }

  .chat-list-panel {
    width: 320px !important;
    min-width: 320px !important;
    max-width: 320px !important;
  }

  .message-stack {
    max-width: 78% !important;
  }
}

@media (max-width: 760px) {
  .hexa-sidebar {
    width: min(340px, 88vw) !important;
    min-width: 0 !important;
    max-width: min(340px, 88vw) !important;
  }

  .hexa-topbar {
    height: 58px !important;
    min-height: 58px !important;
    padding: 0 9px !important;
  }

  .chat-layout {
    grid-template-columns: 100% !important;
  }

  .chat-list-panel {
    width: 100% !important;
    min-width: 100% !important;
    max-width: 100% !important;
  }

  .workspace-page {
    width: calc(100% - 20px) !important;
    padding: 18px 0 28px !important;
  }

  .messages-area {
    padding: 10px 9px 16px !important;
  }

  .message-stack {
    max-width: 88% !important;
  }
}

.voice-recording-bar { display:flex; align-items:center; gap:10px; padding:10px 14px; border-top:1px solid var(--hexa-border); background:var(--hexa-panel-2); }
.voice-recording-bar.preview { padding-top:8px; padding-bottom:8px; }
.voice-recording-bar audio { flex:1; min-width:140px; max-width:360px; height:34px; }
.recording-dot { color:#ff4d67; animation:hexaPulse 1s infinite; }
.voice-wave { flex:1; display:flex; align-items:center; justify-content:center; gap:3px; height:28px; overflow:hidden; }
.voice-wave i { width:3px; height:8px; border-radius:99px; background:var(--hexa-accent); animation:hexaWave .8s ease-in-out infinite alternate; }
.voice-wave i:nth-child(2n){height:14px}.voice-wave i:nth-child(3n){height:20px}.voice-wave i:nth-child(4n){height:11px}
.recording-active { color:#ff5570 !important; background:rgba(255,77,103,.09) !important; }
.send-voice-button { background:var(--hexa-accent) !important; color:#fff !important; border-radius:10px !important; padding:8px 12px !important; }
@keyframes hexaPulse { 50% { opacity:.35; } }
@keyframes hexaWave { from { transform:scaleY(.65); opacity:.55; } to { transform:scaleY(1.15); opacity:1; } }

/* ============================================================
   HEXA LIVE COMMUNICATION MODES
   ============================================================ */
.live-media-page { max-width: 980px; }
.live-media-card { background: var(--hexa-panel); border: 1px solid var(--hexa-border); border-radius: 18px; padding: 22px; display: grid; gap: 14px; max-width: 760px; }
.live-media-intro { display: flex; align-items: center; gap: 14px; }
.live-media-icon { width: 54px; height: 54px; border-radius: 16px; display: grid; place-items: center; background: color-mix(in srgb, var(--hexa-accent) 14%, transparent); font-size: 26px; }
.live-media-intro strong, .live-media-intro span { display:block; }
.live-media-intro strong { font-size: 16px; }
.live-media-intro span { margin-top: 4px; color: var(--hexa-muted); font-size: 12px; line-height: 1.45; }
.live-selected-peer { display:flex; align-items:center; gap:12px; padding:10px 12px; border-radius:12px; background:var(--hexa-panel-2); }
.live-selected-peer strong, .live-selected-peer span { display:block; }
.live-selected-peer span { margin-top:2px; color:var(--hexa-muted); font-size:10px; }
.live-start-button { min-height:48px; }
.call-mode-actions { display:grid; grid-template-columns: repeat(2,minmax(0,1fr)); }
.message-audio { width:min(300px,100%); }
@media (max-width:760px){ .call-mode-actions { grid-template-columns:1fr; } .live-media-card { padding:16px; border-radius:14px; } }

/* Kora */
.kora-page { max-width: 980px; }
.kora-page .page-heading { align-items: center; }
.kora-shell { min-height: 620px; display: flex; flex-direction: column; overflow: hidden; border: 1px solid var(--hexa-border); border-radius: 20px; background: var(--hexa-panel); box-shadow: var(--hexa-shadow); }
.kora-messages { flex: 1; overflow: auto; padding: 24px; display: flex; flex-direction: column; gap: 14px; }
.kora-message { display:flex; align-items:flex-end; gap:10px; max-width: 82%; }
.kora-message.own { margin-left:auto; flex-direction:row-reverse; }
.kora-message-avatar { min-width: 34px; height: 34px; border-radius: 50%; display:grid; place-items:center; padding:0 6px; background: var(--hexa-panel-2); color: var(--hexa-text); font-size: 10px; font-weight:700; }
.kora-message.own .kora-message-avatar { background: var(--hexa-accent); color:#fff; }
.kora-message-bubble { padding: 12px 15px; border-radius: 16px 16px 16px 4px; background: var(--hexa-panel-2); color: var(--hexa-text); line-height:1.55; white-space:pre-wrap; }
.kora-message.own .kora-message-bubble { border-radius: 16px 16px 4px 16px; background: var(--hexa-message-out, var(--hexa-accent)); color: var(--hexa-text); }
.kora-typing { opacity:.75; }
.kora-error { margin: 0 20px 10px; padding: 10px 12px; border-radius: 10px; background: rgba(220,50,50,.10); color: #ff7b7b; font-size: 13px; }
.kora-composer { display:flex; gap:10px; padding:14px; border-top:1px solid var(--hexa-border); background:var(--hexa-panel-2); }
.kora-composer textarea { flex:1; resize:none; min-height:46px; max-height:140px; padding:12px 14px; border:1px solid var(--hexa-border); border-radius:14px; background:var(--hexa-panel); color:var(--hexa-text); outline:none; font:inherit; }
.kora-composer textarea:focus { border-color: var(--hexa-accent); }
@media (max-width:760px){ .kora-shell{min-height:calc(100vh - 150px); border-radius:14px;} .kora-messages{padding:16px;} .kora-message{max-width:92%;} .kora-composer{padding:10px;} }

`;

const EXTRA_CHAT_STYLES = `
/* ============================================================
   CHAT UI — compact WhatsApp-style proportional layout
   ============================================================ */
.chat-mode .hexa-sidebar {
  width: 64px !important;
  min-width: 64px !important;
  max-width: 64px !important;
  padding: 10px 8px !important;
  align-items: center;
}
.chat-mode .sidebar-brand {
  width: 46px !important;
  justify-content: center !important;
  padding: 6px !important;
  margin-bottom: 8px;
}
.chat-mode .sidebar-brand > div:last-of-type,
.chat-mode .sidebar-section-label,
.chat-mode .sidebar-item > span:not(.sidebar-icon),
.chat-mode .sidebar-user-info {
  display: none !important;
}
.chat-mode .sidebar-nav {
  width: 100%;
  display: grid;
  gap: 5px;
}
.chat-mode .sidebar-item {
  width: 46px !important;
  height: 46px !important;
  min-height: 46px !important;
  padding: 0 !important;
  margin: 0 auto !important;
  border-radius: 13px !important;
  justify-content: center !important;
}
.chat-mode .sidebar-icon {
  font-size: 18px !important;
  width: auto !important;
}
.chat-mode .sidebar-bottom {
  width: 100%;
  display: flex;
  justify-content: center;
}
.chat-mode .sidebar-user {
  padding: 6px !important;
}
.chat-mode .hexa-main-chat .hexa-topbar {
  display: none !important;
}
.chat-mode .hexa-main-chat .hexa-content {
  height: 100vh !important;
  min-height: 100vh !important;
  padding: 0 !important;
  margin: 0 !important;
  overflow: hidden !important;
}
.chat-mode .chat-layout {
  height: 100vh !important;
  min-height: 100vh !important;
  grid-template-columns: minmax(315px, 370px) minmax(0, 1fr) !important;
  background: #06080d !important;
}
.chat-mode .chat-list-panel {
  width: auto !important;
  min-width: 0 !important;
  max-width: none !important;
  background: #090c11 !important;
  border-right: 1px solid rgba(255,255,255,.07) !important;
}
.chat-mode .chat-list-header {
  height: 64px !important;
  padding: 0 16px !important;
  border-bottom: 1px solid rgba(255,255,255,.055);
}
.chat-mode .chat-list-header h2 {
  font-size: 20px !important;
  font-weight: 800 !important;
  letter-spacing: -.02em;
}
.chat-mode .chat-list-header-subtitle {
  font-size: 9px !important;
  color: #77808d !important;
  margin-top: 3px;
}
.chat-mode .chat-list-head-actions {
  display: flex;
  align-items: center;
  gap: 2px;
}
.chat-mode .new-chat-button,
.chat-mode .chat-list-menu-button {
  width: 34px !important;
  height: 34px !important;
  display: grid !important;
  place-items: center !important;
  border-radius: 10px !important;
  border: 1px solid transparent !important;
  background: transparent !important;
  color: #aeb6c2 !important;
  font-size: 21px !important;
}
.chat-mode .new-chat-button:hover,
.chat-mode .chat-list-menu-button:hover {
  background: rgba(255,255,255,.055) !important;
  color: #fff !important;
}
.chat-mode .chat-search {
  margin: 11px 12px 8px !important;
}
.chat-mode .chat-search input {
  height: 38px !important;
  border-radius: 10px !important;
  background: #11151b !important;
  border: 1px solid rgba(255,255,255,.05) !important;
  font-size: 11px !important;
  color: #e7eaf0 !important;
}
.chat-mode .chat-filter-row {
  padding: 2px 12px 10px !important;
  gap: 6px !important;
}
.chat-mode .chat-filter-row button {
  padding: 6px 10px !important;
  min-height: 29px !important;
  background: #11151b !important;
  border-color: rgba(255,255,255,.06) !important;
  color: #818b98 !important;
  font-size: 10px !important;
}
.chat-mode .chat-filter-row button.selected {
  background: var(--hexa-accent) !important;
  color: #fff !important;
}
.chat-mode .conversation-list {
  max-height: calc(100vh - 153px) !important;
}
.chat-mode .conversation {
  width: calc(100% - 8px) !important;
  margin: 1px 4px !important;
  padding: 10px 10px !important;
  min-height: 68px;
  border-radius: 11px !important;
  gap: 11px !important;
}
.chat-mode .conversation:hover {
  background: rgba(255,255,255,.035) !important;
}
.chat-mode .conversation.active {
  background: rgba(124,92,255,.10) !important;
  box-shadow: inset 2px 0 var(--hexa-accent) !important;
}
.chat-mode .conversation .hexa-avatar {
  width: 46px !important;
  height: 46px !important;
  min-width: 46px !important;
}
.chat-mode .conversation-content {
  flex: 1 !important;
  min-width: 0 !important;
}
.chat-mode .conversation-topline {
  display: flex !important;
  align-items: baseline !important;
  gap: 8px !important;
}
.chat-mode .conversation-topline strong {
  flex: 1 !important;
  min-width: 0 !important;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-size: 12px !important;
  font-weight: 750 !important;
}
.chat-mode .conversation-topline time {
  flex: 0 0 auto;
  color: #697382 !important;
  font-size: 9px !important;
}
.chat-mode .conversation-bottomline {
  display: flex !important;
  align-items: center !important;
  gap: 7px !important;
  margin-top: 4px !important;
}
.chat-mode .conversation-bottomline span {
  flex: 1 !important;
  min-width: 0 !important;
  margin: 0 !important;
  font-size: 10px !important;
  line-height: 1.35 !important;
  color: #7b8491 !important;
}
.chat-mode .unread-badge {
  min-width: 17px !important;
  height: 17px !important;
  padding: 0 5px !important;
  display: inline-grid !important;
  place-items: center !important;
  border-radius: 999px !important;
  font-size: 8px !important;
  background: var(--hexa-accent) !important;
  color: white !important;
}
.chat-mode .chat-main {
  min-width: 0;
  background: #0a0d12 !important;
}
.chat-mode .chat-header {
  height: 64px !important;
  min-height: 64px !important;
  padding: 0 16px !important;
  background: #0b0f14 !important;
  border-bottom: 1px solid rgba(255,255,255,.055) !important;
}
.chat-mode .chat-header strong {
  font-size: 12px !important;
}
.chat-mode .chat-header span {
  color: #737d8b !important;
  font-size: 9px !important;
}
.chat-mode .chat-header-actions {
  gap: 3px !important;
}
.chat-mode .chat-header-actions button {
  width: 34px !important;
  height: 34px !important;
  border-radius: 9px !important;
  color: #8e98a8 !important;
}
.chat-mode .messages-area {
  padding: 24px clamp(20px, 5vw, 80px) 18px !important;
  background: radial-gradient(circle at 50% 0, rgba(124,92,255,.025), transparent 42%) !important;
}
.chat-mode .hexa-message-row {
  margin: 6px 0 !important;
}
.chat-mode .message-bubble {
  max-width: min(68vw, 620px) !important;
  border-radius: 13px !important;
  padding: 8px 10px !important;
}
.chat-mode .message-content {
  font-size: 12px !important;
  line-height: 1.45 !important;
}
.chat-mode .message-meta {
  font-size: 8px !important;
}
.chat-mode .message-composer {
  min-height: 64px !important;
  padding: 9px 12px !important;
  background: #0a0d12 !important;
}
.chat-mode .message-composer input {
  height: 40px !important;
  border-radius: 11px !important;
  background: #12161d !important;
  font-size: 11px !important;
}
@media (max-width: 820px) {
  .chat-mode .hexa-sidebar {
    width: 56px !important;
    min-width: 56px !important;
    max-width: 56px !important;
  }
  .chat-mode .chat-layout {
    grid-template-columns: 320px minmax(0,1fr) !important;
  }
}
@media (max-width: 700px) {
  .chat-mode .chat-layout {
    display: block !important;
  }
  .chat-mode .chat-list-panel {
    height: 100vh !important;
  }
  .chat-mode .mobile-chat-open .chat-list-panel {
    display: none !important;
  }
}

/* ============================================================
   HEXA PROFILE / CALL CATEGORY POLISH
   ============================================================ */
.profile-editor-card{display:grid;grid-template-columns:150px 1fr;gap:24px;align-items:start;margin-bottom:18px}
.profile-editor-avatar-wrap{display:flex;flex-direction:column;align-items:center;gap:10px}
.profile-editor-avatar-wrap .hexa-avatar{border:3px solid var(--hexa-accent);box-shadow:0 8px 30px rgba(0,0,0,.2);overflow:hidden}
.profile-editor-avatar-wrap .hexa-avatar img{width:100%;height:100%;display:block;object-fit:cover}
.profile-avatar-change{border:1px solid var(--hexa-border);background:var(--hexa-panel-2);color:var(--hexa-text);border-radius:999px;padding:8px 12px;cursor:pointer}
.profile-editor-fields{display:flex;flex-direction:column;gap:12px}.profile-editor-title{display:flex;align-items:center;justify-content:space-between;gap:12px}.profile-editor-title strong,.profile-editor-title span{display:block}.profile-editor-title span{color:var(--hexa-muted);font-size:12px;margin-top:3px}.settings-field{display:flex;flex-direction:column;gap:6px}.settings-field>span{font-size:12px;color:var(--hexa-muted);font-weight:700}.profile-save-status{margin:0}.call-mode-actions{flex-wrap:wrap}.call-mode-actions button{min-width:150px}
@media(max-width:760px){.profile-editor-card{grid-template-columns:1fr}.profile-editor-avatar-wrap{align-items:flex-start}.profile-editor-title{align-items:flex-start;flex-direction:column}}

/* HEXA polished chat list + notifications */
.chat-list-panel{background:var(--hexa-sidebar);}
.chat-list-header{padding:18px 16px 12px;border-bottom:1px solid var(--hexa-border);}
.chat-list-title-row h2{font-size:20px;letter-spacing:-.02em;color:var(--hexa-text);}
.chat-list-header-subtitle{font-size:9px!important;text-transform:uppercase;letter-spacing:.08em;color:var(--hexa-muted)!important;}
.chat-list-head-actions{display:flex;gap:6px;}
.new-chat-button,.chat-list-menu-button{width:34px;height:34px;border-radius:10px;border:1px solid var(--hexa-border);background:var(--hexa-panel-2);color:var(--hexa-text);display:grid;place-items:center;}
.chat-search{margin:10px 12px 6px;height:38px;border:1px solid var(--hexa-border);border-radius:12px;background:var(--hexa-panel-2);}
.chat-search input{font-size:11px;}
.chat-filter-row{padding:6px 12px 7px;gap:5px;}
.chat-filter-row button{padding:6px 9px;font-size:10px;background:transparent;}
.chat-filter-row button.selected{background:var(--hexa-accent);}
.chat-list-summary{padding:3px 14px 7px;font-size:8px;color:var(--hexa-muted);}
.conversation{position:relative;display:flex;align-items:center;width:100%;padding:10px 13px;border:0;border-bottom:1px solid rgba(255,255,255,.035);background:transparent;color:var(--hexa-text);text-align:left;gap:11px;cursor:pointer;}
.conversation:hover{background:rgba(255,255,255,.035);}
.conversation.active{background:rgba(124,92,255,.13);}
.conversation.has-unread{background:rgba(124,92,255,.045);}
.conversation.has-unread.active{background:rgba(124,92,255,.16);}
.conversation-avatar-wrap{position:relative;flex:0 0 auto;}
.conversation .hexa-avatar{width:48px!important;height:48px!important;border:1px solid var(--hexa-border-strong);}
.conversation-content{min-width:0;flex:1;}
.conversation-topline,.conversation-bottomline{display:flex;align-items:center;justify-content:space-between;gap:8px;min-width:0;}
.conversation-topline strong{font-size:12px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.conversation-topline time{font-size:9px;color:var(--hexa-muted);flex:0 0 auto;}
.conversation-topline time.unread-time{color:var(--hexa-accent-2);font-weight:800;}
.conversation-bottomline{margin-top:4px;}
.conversation-bottomline>span{min-width:0;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:10px;color:var(--hexa-muted);}
.conversation-bottomline>span.preview-unread{color:var(--hexa-text);font-weight:650;}
.conversation-indicators{display:flex;align-items:center;gap:4px;flex:0 0 auto;}
.conversation-indicators small{font-size:9px;color:var(--hexa-muted);}
.unread-badge{min-width:18px;height:18px;padding:0 5px;border-radius:999px;background:var(--hexa-accent);color:#fff;display:grid;place-items:center;font-size:9px;}
.conversation-type-badge{position:absolute;right:-2px;bottom:-2px;width:18px;height:18px;border-radius:50%;display:grid;place-items:center;background:var(--hexa-panel-3);border:2px solid var(--hexa-sidebar);font-size:9px;}
.notification-item-button{width:100%;border:0;background:transparent;color:var(--hexa-text);text-align:left;cursor:pointer;}
.notification-item-button:hover{background:rgba(255,255,255,.04);}
.notifications-panel{padding:8px;}
.notifications-header{padding:10px 8px;}
.notifications-header button{font-size:10px;cursor:pointer;}
@media (max-width:900px){.chat-list-panel{width:100%;}.conversation{padding:10px 12px;}}

/* ============================================================
   COMPACT HEXA AUTH SCREEN
   Fits small phones, tablets and laptops without scrolling
   ============================================================ */

.hexa-auth-page {
  min-height: 100dvh;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px;
  overflow-y: auto;
  box-sizing: border-box;
  position: relative;
}

.hexa-auth-card {
  width: min(100%, 390px);
  max-height: calc(100dvh - 24px);
  overflow-y: auto;

  padding: 20px 22px 16px;
  border-radius: 18px;
  box-sizing: border-box;

  /* Keeps the card compact */
  scrollbar-width: thin;
}

/* ============================================================
   BRAND
   ============================================================ */

.hexa-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
}

.hexa-logo {
  width: 38px;
  height: 38px;
  min-width: 38px;
  border-radius: 11px;

  display: flex;
  align-items: center;
  justify-content: center;

  font-size: 20px;
  font-weight: 800;
}

.hexa-brand strong {
  display: block;
  font-size: 19px;
  line-height: 1.05;
}

.hexa-brand span {
  display: block;
  margin-top: 2px;
  font-size: 10px;
  opacity: 0.65;
}

/* ============================================================
   HEADING
   ============================================================ */

.auth-heading {
  margin-bottom: 14px;
}

.auth-heading h1 {
  margin: 0;
  font-size: 22px;
  line-height: 1.15;
  letter-spacing: -0.4px;
}

.auth-heading p {
  margin: 5px 0 0;
  font-size: 12px;
  line-height: 1.35;
  opacity: 0.7;
}

/* ============================================================
   ALERTS
   ============================================================ */

.auth-alert {
  display: flex;
  align-items: flex-start;
  gap: 7px;

  padding: 8px 10px;
  margin-bottom: 10px;

  border-radius: 9px;
  font-size: 11px;
  line-height: 1.35;
}

.auth-alert span {
  flex-shrink: 0;
  font-weight: 800;
}

/* ============================================================
   FORM
   ============================================================ */

.auth-field {
  display: block;
  margin-bottom: 9px;
}

.auth-field > span {
  display: block;
  margin-bottom: 4px;

  font-size: 11px;
  font-weight: 650;
}

.auth-field input {
  width: 100%;
  height: 39px;

  padding: 0 11px;
  box-sizing: border-box;

  border-radius: 9px;
  font-size: 12px;

  outline: none;
}

/* ============================================================
   PASSWORD STRENGTH
   ============================================================ */

.password-strength {
  display: flex;
  align-items: center;
  justify-content: space-between;

  gap: 8px;
  margin-top: -3px;
  margin-bottom: 8px;

  font-size: 9px;
}

.strength-bars {
  display: flex;
  gap: 3px;
  flex: 1;
}

.strength-bars i {
  height: 3px;
  flex: 1;
  border-radius: 10px;
  opacity: 0.18;
}

.strength-bars i.filled {
  opacity: 1;
}

/* ============================================================
   FORGOT PASSWORD
   ============================================================ */

.auth-forgot-row {
  display: flex;
  justify-content: flex-end;
  margin-top: -2px;
  margin-bottom: 9px;
}

.text-button {
  border: 0;
  background: none;
  padding: 2px;

  font-size: 10px;
  cursor: pointer;
}

/* ============================================================
   PRIMARY BUTTON
   ============================================================ */

.primary-auth-button {
  width: 100%;
  height: 40px;

  border: 0;
  border-radius: 9px;

  font-size: 12px;
  font-weight: 750;

  cursor: pointer;
}

.primary-auth-button:disabled,
.google-auth-button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

/* ============================================================
   DIVIDER
   ============================================================ */

.auth-divider {
  display: flex;
  align-items: center;
  gap: 9px;

  margin: 11px 0;
}

.auth-divider::before,
.auth-divider::after {
  content: "";
  height: 1px;
  flex: 1;
  opacity: 0.14;
  background: currentColor;
}

.auth-divider span {
  font-size: 9px;
  opacity: 0.55;
}

/* ============================================================
   GOOGLE
   ============================================================ */

.google-auth-button {
  width: 100%;
  height: 39px;

  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;

  border-radius: 9px;

  font-size: 11px;
  font-weight: 650;

  cursor: pointer;
}

.google-icon {
  width: 18px;
  height: 18px;

  display: flex;
  align-items: center;
  justify-content: center;

  font-size: 14px;
  font-weight: 800;
}

/* ============================================================
   SIGN IN / SIGN UP SWITCH
   ============================================================ */

.auth-switch {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;

  gap: 4px;

  margin-top: 12px;

  font-size: 10px;
  line-height: 1.3;
  text-align: center;
}

.auth-switch button {
  border: 0;
  background: none;

  padding: 0;

  font-size: 10px;
  font-weight: 750;

  cursor: pointer;
}

/* ============================================================
   FOOTER
   ============================================================ */

.auth-footer {
  margin: 10px 0 0;

  font-size: 8px;
  line-height: 1.3;

  text-align: center;
  opacity: 0.45;
}

/* ============================================================
   GLOW — KEEP IT SUBTLE
   ============================================================ */

.hexa-auth-glow {
  position: fixed;
  width: 180px;
  height: 180px;

  border-radius: 50%;

  pointer-events: none;
  opacity: 0.12;

  filter: blur(70px);
}

.glow-one {
  top: -80px;
  left: -60px;
}

.glow-two {
  right: -70px;
  bottom: -80px;
}

/* ============================================================
   SMALL PHONES
   ============================================================ */

@media (max-width: 420px) {
  .hexa-auth-page {
    padding: 8px;
    align-items: center;
  }

  .hexa-auth-card {
    width: 100%;
    max-height: calc(100dvh - 16px);
    padding: 16px 17px 12px;
    border-radius: 15px;
  }

  .hexa-brand {
    margin-bottom: 10px;
  }

  .hexa-logo {
    width: 34px;
    height: 34px;
    min-width: 34px;
    font-size: 18px;
    border-radius: 9px;
  }

  .hexa-brand strong {
    font-size: 17px;
  }

  .hexa-brand span {
    font-size: 9px;
  }

  .auth-heading {
    margin-bottom: 10px;
  }

  .auth-heading h1 {
    font-size: 19px;
  }

  .auth-heading p {
    font-size: 10px;
  }

  .auth-field {
    margin-bottom: 7px;
  }

  .auth-field > span {
    font-size: 10px;
    margin-bottom: 3px;
  }

  .auth-field input {
    height: 35px;
    font-size: 11px;
    border-radius: 8px;
  }

  .primary-auth-button,
  .google-auth-button {
    height: 36px;
  }

  .auth-divider {
    margin: 8px 0;
  }

  .auth-switch {
    margin-top: 9px;
  }

  .auth-footer {
    margin-top: 7px;
  }
}

/* ============================================================
   VERY SMALL PHONES
   ============================================================ */

@media (max-height: 650px) {
  .hexa-auth-card {
    padding-top: 13px;
    padding-bottom: 10px;
  }

  .hexa-brand {
    margin-bottom: 7px;
  }

  .auth-heading {
    margin-bottom: 8px;
  }

  .auth-heading h1 {
    font-size: 18px;
  }

  .auth-heading p {
    display: none;
  }

  .auth-field {
    margin-bottom: 6px;
  }

  .auth-field input {
    height: 33px;
  }

  .primary-auth-button,
  .google-auth-button {
    height: 34px;
  }

  .auth-divider {
    margin: 7px 0;
  }

  .auth-switch {
    margin-top: 7px;
  }

  .auth-footer {
    display: none;
  }
}

/* ============================================================
   LANDSCAPE PHONES
   ============================================================ */

@media (max-height: 500px) and (orientation: landscape) {
  .hexa-auth-page {
    align-items: flex-start;
    padding: 6px;
  }

  .hexa-auth-card {
    max-height: calc(100dvh - 12px);
    padding: 10px 16px;
  }

  .hexa-brand {
    margin-bottom: 5px;
  }

  .auth-heading {
    margin-bottom: 5px;
  }

  .auth-heading p {
    display: none;
  }

  .auth-field {
    margin-bottom: 5px;
  }

  .auth-field input {
    height: 31px;
  }

  .primary-auth-button,
  .google-auth-button {
    height: 32px;
  }

  .auth-divider {
    margin: 5px 0;
  }

  .auth-switch {
    margin-top: 5px;
  }

  .auth-footer {
    display: none;
  }
}

`;
