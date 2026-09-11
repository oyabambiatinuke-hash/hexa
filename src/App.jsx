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

  VITE_GIPHY_API_KEY
  VITE_TURN_URL
  VITE_TURN_USERNAME
  VITE_TURN_CREDENTIAL
*/

// Accept only canonical UUID strings where Supabase expects a user/conversation UUID.
function isHexaUuid(value) {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.trim());
}

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
const HEXA_MAX_MESSAGE_LENGTH = 10000;
const HEXA_MAX_ATTACHMENT_BYTES = 50 * 1024 * 1024;

const HEXA_RUNTIME_CONFIG = {
  supabaseUrl: SUPABASE_URL || "",
  supabaseKey: SUPABASE_KEY || "",
  giphyConfigured: Boolean(import.meta.env.VITE_GIPHY_API_KEY),
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
  { id: "chat", label: "Chat", icon: "💬" },
  { id: "groups", label: "Groups", icon: "👥" },
  { id: "communities", label: "Communities", icon: "◉" },
  { id: "channels", label: "Channels", icon: "▣" },
  { id: "status", label: "Status", icon: "◌" },
  { id: "calls", label: "Calls", icon: "☎" },
  { id: "kora", label: "Kora", icon: "✦" },
  { id: "subscription", label: "Subscription", icon: "★" },
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
  ["Payments & Business", "Payments", "Business profiles", "Catalogs", "Shopping", "Cart", "Orders", "Customer messaging", "Broadcasts", "Automated replies", "Labels", "Business tools"],
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

function withTimeout(promise, ms, message = "The request timed out. Please try again.") {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(message)), ms);
    }),
  ]);
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
            <strong>hexachi</strong>
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
            <strong>hexachi</strong>
            <span>COMMUNICATION</span>
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
                "hexachi User"
              }
              size={38}
              online
            />

            <div className="sidebar-user-info">
              <strong>
                {profile?.full_name ||
                  profile?.username ||
                  "hexachi User"}
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
      <div className="mobile-page-title"><strong>hexachi</strong></div>
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

function koraReply(input) {
  const q = String(input || "").toLowerCase();
  if (q.includes("hello") || q.includes("hi")) return "Hello. I’m Kora, your HEXA assistant. What would you like to do?";
  if (q.includes("status")) return "You can create a HEXA Status with text, photos or videos from the Status workspace.";
  if (q.includes("call")) return "Open a direct chat and use the phone or video button to start a WebRTC call.";
  if (q.includes("group")) return "Open Groups, create a group, and select the HEXA users you want to add.";
  return "I’m Kora. I can help you navigate HEXA, plan messages, explain features, and work with the tools connected to your workspace.";
}

function FeatureAudio({ url, voice = false }) {
  const ref = useRef(null);
  const [speed, setSpeed] = useState(1);
  useEffect(() => { if (ref.current) ref.current.playbackRate = speed; }, [speed]);
  return <div className="hexa-audio-message"><span>{voice ? "🎤" : "🔊"}</span><audio ref={ref} src={url} controls/><select value={speed} onChange={e=>setSpeed(Number(e.target.value))}><option value="1">1×</option><option value="1.5">1.5×</option><option value="2">2×</option></select></div>;
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
  const [messageSenderProfiles, setMessageSenderProfiles] = useState({});
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

  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordingError, setRecordingError] = useState("");
  const [recordedVoice, setRecordedVoice] = useState(null);
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
  const recorderRef = useRef(null);
  const recorderStreamRef = useRef(null);
  const chunksRef = useRef([]);
  const recordingTimerRef = useRef(null);
  const bottomRef = useRef(null);

  const isSystem =
    selected?.id === "hexa-system-group" ||
    (selected?.type === "system_group" && selected?.name === "THE HEXA GROUP");

  const isSystemAdmin = Boolean(selected?.is_admin);

  const isSelf =
    selected?.id === "self";

  const isKora =
    selected?.id === "kora";

  function cleanupVoiceRecorder() {
    if (recordingTimerRef.current) {
      window.clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    recorderStreamRef.current?.getTracks?.().forEach(track => track.stop());
    recorderStreamRef.current = null;
    recorderRef.current = null;
  }

  async function startVoiceRecording() {
    if (recording || recordedVoice) return;
    setRecordingError("");
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setRecordingError("Voice recording is not supported by this browser.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recorderStreamRef.current = stream;
      chunksRef.current = [];
      const mimeCandidates = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus"];
      const mimeType = mimeCandidates.find(type => MediaRecorder.isTypeSupported?.(type)) || "";
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorderRef.current = recorder;
      recorder.ondataavailable = event => { if (event.data?.size) chunksRef.current.push(event.data); };
      recorder.onerror = () => { setRecordingError("The microphone recorder stopped unexpectedly."); cleanupVoiceRecorder(); setRecording(false); };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || mimeType || "audio/webm" });
        cleanupVoiceRecorder();
        if (!blob.size) {
          setRecording(false);
          setRecordingError("No voice audio was captured. Please try again.");
          return;
        }
        const ext = blob.type.includes("ogg") ? "ogg" : "webm";
        const url = URL.createObjectURL(blob);
        setRecordedVoice({ blob, url, mimeType: blob.type, duration: recordingSeconds, name: `hexa-voice-${Date.now()}.${ext}` });
        setRecording(false);
      };
      recorder.start(150);
      setRecording(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = window.setInterval(() => setRecordingSeconds(value => value + 1), 1000);
    } catch (error) {
      cleanupVoiceRecorder();
      setRecording(false);
      setRecordingError(error?.name === "NotAllowedError" ? "Microphone permission was denied. Allow microphone access and try again." : (error?.message || "Unable to start voice recording."));
    }
  }

  function stopVoiceRecording() {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") return;
    recorder.stop();
  }

  function cancelVoiceRecording() {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.onstop = null;
      try { recorderRef.current.stop(); } catch {}
    }
    cleanupVoiceRecorder();
    if (recordedVoice?.url) URL.revokeObjectURL(recordedVoice.url);
    setRecordedVoice(null);
    setRecording(false);
    setRecordingSeconds(0);
    setRecordingError("");
  }

  function discardRecordedVoice() {
    if (recordedVoice?.url) URL.revokeObjectURL(recordedVoice.url);
    setRecordedVoice(null);
    setRecordingSeconds(0);
    setRecordingError("");
  }

  function sendRecordedVoice() {
    if (!recordedVoice?.blob) return;
    const file = new File([recordedVoice.blob], recordedVoice.name || `hexa-voice-${Date.now()}.webm`, { type: recordedVoice.mimeType || recordedVoice.blob.type || "audio/webm" });
    setRecordedVoice(null);
    setMessage("");
    sendMessage(null, { name: file.name, type: "voice", file });
  }

  useEffect(() => () => {
    cleanupVoiceRecorder();
    if (recordedVoice?.url) URL.revokeObjectURL(recordedVoice.url);
  }, []);

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

    if (
      conversation.id === "self" ||
      conversation.id === "kora"
    ) {
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

      setMessages(visible);

      // In group chats, each message needs the actual sender profile
      // rather than the group profile.
      const senderIds = [...new Set(
        visible
          .map((row) => String(row.sender_id || ""))
          .filter(Boolean)
      )];
      if (senderIds.length) {
        const { data: senderRows, error: senderError } = await supabase
          .from("profiles")
          .select("id,username,full_name,avatar_url")
          .in("id", senderIds);
        if (!senderError) {
          const nextProfiles = {};
          (senderRows || []).forEach((row) => {
            nextProfiles[String(row.id)] = row;
          });
          setMessageSenderProfiles(nextProfiles);
        }
      } else {
        setMessageSenderProfiles({});
      }

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
              void (async () => { try { await supabase.rpc("hexa_mark_delivered", { p_message_ids: [row.id] }); } catch {} })();
              void (async () => { try { await supabase.rpc("hexa_mark_read", { p_message_ids: [row.id] }); } catch {} })();
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

  async function createDirectConversation(
    person
  ) {
    if (
      !person?.id ||
      !profile?.id ||
      person.id === profile.id
    ) {
      return;
    }

    setLoadingConversations(
      true
    );

    try {
      let conversation = null;

      const { data, error } = await supabase.rpc(
        "hexa_get_or_create_direct",
        {
          p_other_user_id: person.id
        }
      );

      if (error) throw error;
      conversation = data;

      const chat = {
        id: `direct:${conversation.id}`,
        realConversationId:
          conversation.id,
        type: "direct",
        kind: "direct",
        name:
          person.full_name ||
          person.username ||
          "hexachi User",
        username:
          person.username ||
          "",
        avatar_url:
          person.avatar_url ||
          null,
        online: false,
        otherProfileId:
          person.id,
        unread: 0,
        lastMessage:
          conversation.last_message ||
          "",
        lastMessageAt:
          conversation.updated_at ||
          conversation.created_at ||
          null
      };

      setConversations(
        current => {
          const without =
            current.filter(
              item =>
                String(item.id) !==
                String(chat.id)
            );

          return [
            ...without,
            chat
          ];
        }
      );

      setSelected(chat);
      setMobileConversationOpen(
        true
      );

      setNewChatOpen(false);
      setNewChatSearch("");
      onOpenChatWithUser?.();

      await loadMessages(
        chat
      );
    } catch (error) {
      console.error(
        "HEXA direct conversation:",
        error
      );

      alert(
        error?.message ||
          "Unable to create this conversation."
      );
    } finally {
      setLoadingConversations(
        false
      );
    }
  }

  /* ============================================================
     SEND MESSAGE
     ============================================================ */

  async function uploadChatAttachment(file) {
    if (!file || !profile?.id) return null;
    const bucket = import.meta.env.VITE_SUPABASE_STORAGE_BUCKET;
    if (!bucket) {
      throw new Error("Set VITE_SUPABASE_STORAGE_BUCKET in Vercel/Supabase before sending media or files.");
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${profile.id}/chat/${selected?.realConversationId || selected?.id}/${Date.now()}-${safeName}`;
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(path, file, { contentType: file.type || "application/octet-stream", upsert: false });
    if (uploadError) throw uploadError;

    const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(path);
    return {
      bucket,
      path,
      url: publicData?.publicUrl || "",
    };
  }

  async function sendMessage(event, attachmentOverride = null) {
    event?.preventDefault();

    const activeAttachment = attachmentOverride || attachment;
    const text = message.trim();
    if (!text && !activeAttachment) return;

    const inputError = validateMessageInput(text, activeAttachment?.file || activeAttachment);
    if (inputError) {
      safeAlert(inputError);
      return;
    }

    if (!profile?.id || !selected?.id) {
      safeAlert("HEXA could not determine this conversation. Please reopen the chat and try again.");
      return;
    }

    if (isSystem && !isSystemAdmin) {
      safeAlert("Only authorized HEXA administrators can publish in THE HEXA GROUP.");
      return;
    }

    if (selected?.otherUserId && blocked.includes(String(selected.otherUserId))) {
      safeAlert("This contact is blocked.");
      return;
    }

    const conversationId = selected.realConversationId || selected.id;

    // Kora is an intentional local assistant conversation, not a fake database chat.
    if (isKora) {
      const localId = `kora-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const userMessage = {
        id: `local-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        conversation_id: "kora",
        sender_id: profile.id,
        content: text,
        message_type: "text",
        created_at: new Date().toISOString(),
      };
      setMessages((current) => [...current, userMessage]);
      setMessage("");
      setReplyTo(null);
      const reply = typeof koraReply === "function" ? await koraReply(text) : "I'm here to help.";
      setMessages((current) => [
        ...current,
        {
          id: localId,
          conversation_id: "kora",
          sender_id: "kora",
          content: reply,
          message_type: "text",
          created_at: new Date().toISOString(),
        },
      ]);
      return;
    }

    const clientMessageId = `hexa-${crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
    const optimisticId = `local-${clientMessageId}`;
    let upload = null;
    let messageType = activeAttachment?.type || "text";

    if (activeAttachment?.file) {
      messageType = activeAttachment.type || "file";
      try {
        upload = await uploadChatAttachment(activeAttachment.file);
      } catch (error) {
        console.error("HEXA attachment upload:", error);
        safeAlert(error?.message || "Unable to upload this attachment.");
        return;
      }
    }

    const optimisticMessage = {
      id: optimisticId,
      conversation_id: conversationId,
      sender_id: profile.id,
      content: text || activeAttachment?.name || "",
      message_type: messageType,
      created_at: new Date().toISOString(),
      reply_to_id: replyTo?.id || null,
      client_message_id: clientMessageId,
      status: "sending",
      metadata: upload ? { storage_bucket: upload.bucket, storage_path: upload.path, file_url: upload.url } : {},
      message_attachments: upload ? [{
        file_name: activeAttachment.name,
        file_path: upload.path,
        file_url: upload.url,
        mime_type: activeAttachment.file.type || "application/octet-stream",
        file_size: activeAttachment.file.size || 0,
      }] : [],
      pending: true,
    };

    setMessages((current) => [...current, optimisticMessage]);
    updateConversationPreview(selected, optimisticMessage);
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
        content: text || activeAttachment?.name || "",
        message_type: messageType,
        reply_to_id: replyTo?.id || null,
        client_message_id: clientMessageId,
        metadata: upload ? {
          storage_bucket: upload.bucket,
          storage_path: upload.path,
          file_url: upload.url,
          mime_type: activeAttachment?.file?.type || null,
          file_name: activeAttachment?.name || null,
          file_size: activeAttachment?.file?.size || null,
        } : {},
        status: "sent",
      };

      const { data, error } = await supabase
        .from("messages")
        .insert(payload)
        .select("*, message_reactions(*), message_attachments(*), message_user_actions(*)")
        .single();
      if (error) throw error;

      if (upload) {
        const { error: attachmentError } = await supabase
          .from("message_attachments")
          .insert({
            message_id: data.id,
            user_id: profile.id,
            file_name: activeAttachment.name,
            file_path: upload.path,
            file_url: upload.url,
            mime_type: activeAttachment.file.type || "application/octet-stream",
            file_size: activeAttachment.file.size || 0,
            width: activeAttachment.file.width || null,
            height: activeAttachment.file.height || null,
            duration: activeAttachment.file.duration || null,
          });
        if (attachmentError) {
          console.warn("HEXA attachment record:", attachmentError.message);
        }
      }

      setMessages((current) => current.map((item) => item.id === optimisticId ? data : item));
      updateConversationPreview(selected, data);
    } catch (error) {
      console.error("HEXA send message:", error);
      // Files cannot safely be serialized into localStorage; text messages can.
      if (!activeAttachment?.file) {
        try {
          const queue = readLocalQueue();
          queue.push({ ...optimisticMessage, pending: true, failed: true });
          writeLocalQueue(queue);
        } catch {}
      }
      setMessages((current) => current.map((item) => item.id === optimisticId ? { ...item, pending: true, failed: true, status: "failed" } : item));
      safeAlert(error?.message || "Message could not be sent. It has been kept in your offline queue when possible.");
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
      const { data, error } = await supabase
        .from("messages")
        .update({
          content: value,
          edited_at: new Date().toISOString(),
        })
        .eq("id", editing.id)
        .eq("sender_id", profile.id)
        .select("*, message_reactions(*), message_attachments(*), message_user_actions(*)")
        .single();

      if (error) throw error;

      setMessages(current => current.map(item =>
        item.id === editing.id ? data : item
      ));

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
        const { data, error } = await supabase
          .from("messages")
          .update({
            deleted_at: new Date().toISOString(),
            content: "This message was deleted",
          })
          .eq("id", item.id)
          .eq("sender_id", profile.id)
          .select("*, message_reactions(*), message_attachments(*), message_user_actions(*)")
          .single();

        if (error) throw error;

        setMessages(current => current.map(item2 =>
          item2.id === item.id ? data : item2
        ));
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
      const { data: existing, error: findError } = await supabase
        .from("message_reactions")
        .select("message_id,user_id,reaction")
        .eq("message_id", item.id)
        .eq("user_id", profile.id)
        .eq("reaction", emoji)
        .maybeSingle();

      if (findError) throw findError;

      if (existing) {
        const { error } = await supabase
          .from("message_reactions")
          .delete()
          .eq("message_id", item.id)
          .eq("user_id", profile.id)
          .eq("reaction", emoji);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("message_reactions")
          .insert({
            message_id: item.id,
            user_id: profile.id,
            reaction: emoji,
          });
        if (error) throw error;
      }

      await loadMessages(selected);
    } catch (error) {
      console.warn("HEXA reaction:", error);
      safeAlert(error?.message || "Unable to update reaction.");
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
    if (conversation.id === "hexa-system-group" || conversation.type === "system_group") {
      safeAlert("Messages cannot be forwarded into THE HEXA GROUP unless you have publishing permission.");
      return;
    }

    try {
      const { data: source, error: sourceError } = await supabase
        .from("messages")
        .select("content,message_type,metadata")
        .eq("id", forwardMessage.id)
        .single();
      if (sourceError) throw sourceError;

      const forwardedMetadata = {
        ...(source.metadata || {}),
        forwarded: true,
        forwarded_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversationId,
          sender_id: profile.id,
          receiver_id: conversation.user_b || null,
          content: source.content || "",
          message_type: source.message_type || "text",
          metadata: forwardedMetadata,
          forwarded_from_id: forwardMessage.id,
          status: "sent",
        })
        .select("*, message_reactions(*), message_attachments(*), message_user_actions(*)")
        .single();

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

  const filteredConversations =
    useMemo(() => {
      const term =
        chatSearch
          .trim()
          .toLowerCase();

      let list =
        conversations.filter(
          conversation =>
            !archived.includes(
              String(
                conversation.id
              )
            )
        );

      if (!term) {
        return list;
      }

      return list.filter(
        conversation =>
          String(
            conversation.name ||
              ""
          )
            .toLowerCase()
            .includes(term) ||
          String(
            conversation.lastMessage ||
              ""
          )
            .toLowerCase()
            .includes(term) ||
          String(
            conversation.username ||
              ""
          )
            .toLowerCase()
            .includes(term)
      );
    }, [
      conversations,
      chatSearch,
      archived
    ]);

  const messageResults =
    useMemo(() => {
      const term =
        messageSearch
          .trim()
          .toLowerCase();

      if (!term) return [];

      return messages.filter(
        item =>
          String(
            item.content ||
              ""
          )
            .toLowerCase()
            .includes(term)
      );
    }, [
      messages,
      messageSearch
    ]);

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

    const isGroupChat =
      String(selected?.kind || selected?.type || "").toLowerCase() === "group" ||
      String(selected?.type || "").toLowerCase() === "system_group";
    const senderProfile =
      messageSenderProfiles[String(item.sender_id)] || {};
    const senderName =
      senderProfile.full_name ||
      senderProfile.username ||
      (mine ? profile?.full_name || profile?.username : "hexachi User");
    const senderAvatar =
      senderProfile.avatar_url ||
      (mine ? profile?.avatar_url : "");

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
              isGroupChat ? senderAvatar : selected.avatar_url
            }
            name={
              isGroupChat ? senderName : selected.name
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
          {isGroupChat && !mine && (
            <div className="group-message-sender">
              {senderName}
            </div>
          )}

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
            if (["audio", "voice"].includes(item.message_type) && mediaUrl) {
              return <FeatureAudio url={mediaUrl} voice={item.message_type === "voice"} />;
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
          CHAT LIST
          ====================================================== */}

      <aside className="chat-list-panel">

        <div className="chat-list-header">

          <div>
            <h2>
              Chat
            </h2>

            <span>
              {
                conversations.length
              } conversations
            </span>
          </div>

          <button
            className="new-chat-button"
            type="button"
            title="New chat"
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

          <span>
            ⌕
          </span>

          <input
            value={
              chatSearch
            }
            onChange={event =>
              setChatSearch(
                event.target
                  .value
              )
            }
            placeholder="Search chats"
          />

        </div>

        <div className="conversation-list">

          {loadingConversations &&
            !conversations.length && (
              <div className="chat-loading">
                Loading chats…
              </div>
            )}

          {filteredConversations.map(
            conversation => (
              <button
                key={
                  conversation.id
                }
                type="button"
                className={
                  `conversation ${
                    selected?.id ===
                    conversation.id
                      ? "active"
                      : ""
                  }`
                }
                onClick={() => {
                  setSelected(
                    conversation
                  );

                  setMobileConversationOpen(
                    true
                  );

                  setConversations(
                    current =>
                      current.map(
                        item =>
                          String(
                            item.id
                          ) ===
                          String(
                            conversation.id
                          )
                            ? {
                                ...item,
                                unread: 0
                              }
                            : item
                      )
                  );
                }}
              >

                <Avatar
                  src={
                    conversation.avatar_url
                  }
                  name={
                    conversation.name
                  }
                  size={48}
                  online={
                    conversation.online
                  }
                />

                <div className="conversation-content">

                  <div className="conversation-topline">

                    <strong>
                      {
                        conversation.name
                      }
                    </strong>

                    {conversation.lastMessageAt && (
                      <time>
                        {formatChatTime(
                          conversation.lastMessageAt
                        )}
                      </time>
                    )}

                  </div>

                  <div className="conversation-bottomline">

                    <span>
                      {
                        conversation.lastMessage ||
                        conversation.description ||
                        "No messages yet"
                      }
                    </span>

                    {conversation.unread >
                      0 && (
                      <b className="unread-badge">
                        {conversation.unread >
                        99
                          ? "99+"
                          : conversation.unread}
                      </b>
                    )}

                  </div>

                </div>

                {muted.includes(
                  String(
                    conversation.id
                  )
                ) && (
                  <small>
                    🔕
                  </small>
                )}

              </button>
            )
          )}

          {!filteredConversations.length && (
            <div className="empty-chat-list">
              <div>
                💬
              </div>

              <strong>
                No chats found
              </strong>

              <span>
                Start a new HEXA conversation.
              </span>
            </div>
          )}

        </div>

      </aside>

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
                ? (isSystemAdmin ? "Official hexachi · administrator" : "Official hexachi · read only")
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
                String(selected?.kind || selected?.type || "").toLowerCase() === "group" ? (
                  <>
                    <button
                      type="button"
                      title="Group voice call"
                      onClick={() => onStartCall?.(selected, "voice", "group-voice")}
                    >
                      ☎
                    </button>

                    <button
                      type="button"
                      title="Group video call"
                      onClick={() => onStartCall?.(selected, "video", "group-video")}
                    >
                      ▣
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      title="Voice call"
                      onClick={() => onStartCall?.(selected, "voice")}
                    >
                      ☎
                    </button>

                    <button
                      type="button"
                      title="Video call"
                      onClick={() => onStartCall?.(selected, "video")}
                    >
                      ▣
                    </button>
                  </>
                )
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
                      "hexachi User"
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

        {!isSystem && (
          <div className="composer-stack">
            {recording && (
              <div className="voice-recorder-panel">
                <div className="voice-recorder-live">
                  <span className="voice-recording-dot" />
                  <strong>Recording voice message</strong>
                  <span className="voice-recording-time">{String(Math.floor(recordingSeconds / 60)).padStart(2, "0")}:{String(recordingSeconds % 60).padStart(2, "0")}</span>
                </div>
                <div className="voice-waveform" aria-hidden="true">
                  {Array.from({ length: 28 }).map((_, index) => <i key={index} style={{ height: `${12 + ((index * 17 + recordingSeconds * 7) % 25)}px` }} />)}
                </div>
                <div className="voice-recorder-actions">
                  <button type="button" className="voice-cancel" onClick={cancelVoiceRecording}>Cancel</button>
                  <button type="button" className="voice-stop" onClick={stopVoiceRecording}>■ Stop</button>
                </div>
              </div>
            )}

            {recordedVoice && !recording && (
              <div className="voice-preview-panel">
                <div className="voice-preview-heading"><strong>Voice message preview</strong><span>{String(Math.floor(recordedVoice.duration / 60)).padStart(2, "0")}:{String(recordedVoice.duration % 60).padStart(2, "0")}</span></div>
                <audio controls preload="metadata" src={recordedVoice.url} />
                <div className="voice-recorder-actions">
                  <button type="button" className="voice-cancel" onClick={discardRecordedVoice}>Discard</button>
                  <button type="button" className="voice-send" onClick={sendRecordedVoice}>➤ Send voice</button>
                </div>
              </div>
            )}

            {recordingError && <div className="composer-error">{recordingError}</div>}

            {!recording && !recordedVoice && (
              <form
                className="chat-composer"
                onSubmit={editing ? event => { event.preventDefault(); saveEditedMessage(); } : sendMessage}
              >
                <div className="composer-left">
                  <button type="button" title="Emoji" onClick={() => setEmojiOpen(value => !value)}>😊</button>
                  <button type="button" title="Attachments" onClick={() => setAttachmentOpen(value => !value)}>📎</button>
                </div>

                <textarea
                  value={message}
                  onChange={event => saveDraft(event.target.value)}
                  placeholder={editing ? "Edit message…" : "Type a message"}
                  rows={1}
                  onInput={event => { event.target.style.height = "auto"; event.target.style.height = `${Math.min(event.target.scrollHeight, 120)}px`; }}
                  onKeyDown={event => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      editing ? saveEditedMessage() : sendMessage(event);
                    }
                  }}
                />

                <div className="composer-right">
                  {!message.trim() && !attachment ? (
                    <button type="button" className="composer-mic" title="Record voice message" onClick={startVoiceRecording}>🎙</button>
                  ) : (
                    <button type="submit" className="composer-send" title={editing ? "Save edit" : "Send"}>➤</button>
                  )}
                </div>
              </form>
            )}

            {attachment && !recording && !recordedVoice && (
              <div className="attachment-preview-bar">
                <span>📎 {attachment.name}</span>
                <button type="button" onClick={() => setAttachment(null)}>×</button>
              </div>
            )}
          </div>
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
                          "hexachi User"
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
            conversation.user_a === profile.id
              ? conversation.user_b
              : conversation.user_a;

          const person = profileMap[otherUserId];

          const displayName =
            person?.full_name ||
            person?.username ||
            "hexachi User";

          return {
            ...conversation,

            id: conversation.id,

            name: displayName,

            username: person?.username || "",

            avatar_url: person?.avatar_url || null,

            avatar: person?.avatar_url
              ? null
              : initials(displayName),

            kind: "direct",

            online: false,

            is_admin: Boolean(membership?.is_admin),

            otherUserId,

            latestMessage:
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
    case "voice":
      return "🎤 Voice message";

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
  const [statuses, setStatuses] = useState([]);
  const [show, setShow] = useState(false);
  const [viewer, setViewer] = useState(null);
  const [text, setText] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [statusError, setStatusError] = useState("");
  const fileRef = useRef(null);

  async function load() {
    if (!profile?.id) return;
    setLoading(true);
    setStatusError("");

    const { data, error } = await supabase
      .from("statuses")
      .select("*")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false });

    if (error) {
      console.error("HEXA status load:", error);
      setStatusError(error.message);
      setStatuses([]);
    } else {
      setStatuses(data || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [profile?.id]);

  useEffect(() => {
    return () => {
      if (file?.url) URL.revokeObjectURL(file.url);
    };
  }, [file?.url]);

  async function uploadStatusMedia(selectedFile) {
    const bucket = import.meta.env.VITE_SUPABASE_STORAGE_BUCKET;

    if (!bucket) {
      throw new Error(
        "Status media is not configured. Set VITE_SUPABASE_STORAGE_BUCKET in Vercel and redeploy."
      );
    }

    const safeName = selectedFile.name.replace(
      /[^a-zA-Z0-9._-]/g,
      "_"
    );
    const path = `${profile.id}/statuses/${Date.now()}-${safeName}`;

    const { error } = await supabase.storage
      .from(bucket)
      .upload(path, selectedFile, {
        contentType: selectedFile.type || undefined,
        upsert: false,
      });

    if (error) throw error;

    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);

    if (!data?.publicUrl) {
      throw new Error("The uploaded status file did not receive a public URL.");
    }

    return data.publicUrl;
  }

  async function create(e) {
    e.preventDefault();

    if (posting) return;

    const cleanText = text.trim();
    const cleanDescription = description.trim();

    if (!cleanText && !file) {
      setStatusError("Add some text or choose a photo/video before posting.");
      return;
    }

    if (!profile?.id) {
      setStatusError("Your HEXA profile is not ready yet. Please reload and try again.");
      return;
    }

    setPosting(true);
    setStatusError("");

    try {
      let mediaUrl = "";
      let mediaType = "";

      if (file?.file) {
        mediaUrl = await uploadStatusMedia(file.file);
        mediaType = file.kind;
      }

      const payload = {
        user_id: profile.id,
        text: cleanText,
        description: cleanDescription,
        media_url: mediaUrl || null,
        media_type: mediaType || null,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };

      const { error } = await supabase
        .from("statuses")
        .insert(payload);

      if (error) throw error;

      setText("");
      setDescription("");
      setFile(null);
      setShow(false);
      await load();
    } catch (error) {
      console.error("HEXA status post:", error);
      setStatusError(
        error?.message || "HEXA could not post this status. Please try again."
      );
    } finally {
      setPosting(false);
    }
  }

  function pick(e) {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (!selected.type.startsWith("image/") && !selected.type.startsWith("video/")) {
      setStatusError("Please choose an image or video.");
      return;
    }

    if (selected.size > HEXA_MAX_ATTACHMENT_BYTES) {
      setStatusError("Status media must be 50 MB or smaller.");
      return;
    }

    setStatusError("");
    setFile({
      file: selected,
      url: URL.createObjectURL(selected),
      kind: selected.type.startsWith("video/") ? "video" : "image",
    });
  }

  async function like(s) {
    if (!s?.id || String(s.id).startsWith("local")) return;

    const { data, error } = await supabase
      .from("status_likes")
      .select("status_id")
      .eq("status_id", s.id)
      .eq("user_id", profile.id)
      .maybeSingle();

    if (error) {
      setStatusError(error.message);
      return;
    }

    if (data) {
      await supabase
        .from("status_likes")
        .delete()
        .eq("status_id", s.id)
        .eq("user_id", profile.id);
    } else {
      await supabase
        .from("status_likes")
        .insert({ status_id: s.id, user_id: profile.id });
    }
  }

  return (
    <section className="workspace-page">
      <div className="page-heading">
        <div className="page-heading-icon">◌</div>
        <div>
          <h1>Status</h1>
          <p>Share text, photos and videos that expire after 24 hours.</p>
        </div>
        <button
          className="hero-primary heading-action"
          onClick={() => {
            setStatusError("");
            setShow(true);
          }}
        >
          ＋ Create Status
        </button>
      </div>

      {statusError && (
        <div className="settings-card" role="alert" style={{ marginBottom: 16 }}>
          <strong>Status error</strong>
          <p>{statusError}</p>
          <button onClick={load}>Retry</button>
        </div>
      )}

      <div className="status-row">
        <button
          className="create-status-card"
          onClick={() => {
            setStatusError("");
            setShow(true);
          }}
        >
          <div className="create-status-plus">＋</div>
          <strong>Create Status</strong>
          <span>Text, photo or video</span>
        </button>

        {loading ? (
          <div className="coming-card">
            <h2>Loading statuses…</h2>
            <p>Your latest HEXA statuses are loading.</p>
          </div>
        ) : (
          statuses.map((s) => (
            <button
              key={s.id}
              className="status-card unseen"
              onClick={() => setViewer(s)}
            >
              <div className="status-preview">
                {s.media_url && s.media_type === "image" ? (
                  <img src={s.media_url} alt="" />
                ) : s.media_url && s.media_type === "video" ? (
                  <video src={s.media_url} muted playsInline />
                ) : (
                  <span>Aa</span>
                )}
              </div>
              <strong>{s.text || s.description || "Media status"}</strong>
              <span>
                {new Date(s.created_at).toLocaleString()}
              </span>
            </button>
          ))
        )}
      </div>

      {show && (
        <div className="modal-backdrop" onClick={() => !posting && setShow(false)}>
          <div className="status-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>Create Status</h2>
                <p>Post a status to your HEXA contacts.</p>
              </div>
              <button type="button" onClick={() => !posting && setShow(false)}>×</button>
            </div>

            <form onSubmit={create}>
              <textarea
                className="modal-input modal-textarea"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="What's happening?"
                maxLength={HEXA_MAX_MESSAGE_LENGTH}
              />

              <input
                className="modal-input"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Caption / description"
                maxLength={1000}
              />

              <button
                type="button"
                className="media-picker"
                onClick={() => fileRef.current?.click()}
                disabled={posting}
              >
                <span>📷</span>
                <div>
                  <strong>
                    {file ? file.file.name : "Add photo or video"}
                  </strong>
                  <small>Camera, gallery or laptop file</small>
                </div>
              </button>

              <input
                ref={fileRef}
                hidden
                type="file"
                accept="image/*,video/*"
                capture="environment"
                onChange={pick}
              />

              {file && (
                <div className="status-media-preview">
                  {file.kind === "video" ? (
                    <video controls src={file.url} />
                  ) : (
                    <img src={file.url} alt="Preview" />
                  )}
                </div>
              )}

              {statusError && (
                <div className="settings-card" role="alert" style={{ marginTop: 12 }}>
                  <p>{statusError}</p>
                </div>
              )}

              <button className="hero-primary" type="submit" disabled={posting}>
                {posting ? "Posting status…" : "Post Status"}
              </button>
            </form>
          </div>
        </div>
      )}

      {viewer && (
        <div className="story-viewer" onClick={() => setViewer(null)}>
          <button className="story-close" onClick={() => setViewer(null)}>×</button>
          <div className="story-content" onClick={(e) => e.stopPropagation()}>
            {viewer.media_url && viewer.media_type === "video" ? (
              <video controls autoPlay playsInline src={viewer.media_url} />
            ) : viewer.media_url ? (
              <img src={viewer.media_url} alt="Status" />
            ) : (
              <div className="story-text">{viewer.text}</div>
            )}
            <div className="story-caption">
              {viewer.description || viewer.text}
            </div>
            <div className="story-actions">
              <button onClick={() => like(viewer)}>❤️</button>
              <button>😂</button>
              <button>😮</button>
            </div>
          </div>
        </div>
      )}
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
        <div><h1>Calls</h1><p>Private HEXA-to-HEXA voice and video calls. External calling can be billed server-side at ₦0.30/second.</p></div>
      </div>

      <div className="settings-card">
        <div><strong>Start a call</strong><p>Find a real HEXA account, then start voice or video.</p></div>
        <input className="modal-input" style={{ maxWidth: 320 }} placeholder="Search name or username" value={search} onChange={(e) => setSearch(e.target.value)} />
        <div className="people-results" style={{ maxWidth: 520 }}>
          {people.map((person) => (
            <button key={person.id} className="person-result" type="button" onClick={() => { setPeer(person); setSearch(person.username ? `@${person.username}` : person.full_name || ""); setPeople([]); setStatus(""); }}>
              <Avatar src={person.avatar_url} name={person.full_name || person.username} size={42} />
              <div><strong>{person.full_name || person.username || "hexachi User"}</strong><span>{person.username ? `@${person.username}` : "HEXA account"}</span></div>
            </button>
          ))}
        </div>
        {peer && <div className="selection-pill"><Avatar src={peer.avatar_url} name={peer.full_name || peer.username} size={32} /><span>{peer.full_name || peer.username}</span></div>}
        <div className="hero-actions"><button className="hero-secondary" onClick={() => createCall("voice")} disabled={!peer}>☎ Voice</button><button className="hero-primary" onClick={() => createCall("video")} disabled={!peer}>▣ Video</button></div>
      </div>

      {status && <p className="muted">{status}</p>}
      {active && <WebRTCCall profile={profile} call={active.call} type={active.type} peer={active.peer} onEnd={() => { setActive(null); setStatus("Call ended"); loadCalls(); }} />}

      <div className="section-heading" style={{ marginTop: 22 }}><div><h2>Call history</h2><p>Recent call activity for this HEXA account.</p></div><button className="hero-secondary" onClick={loadCalls}>Refresh</button></div>
      <div className="entity-grid">
        {history.map((c) => <div className="entity-card" key={c.id}><strong>{c.type} · {c.status}</strong><span>{new Date(c.created_at).toLocaleString()}</span><small>{c.billed_seconds || 0}s · ₦{(Number(c.amount_kobo || 0) / 100).toFixed(2)}</small></div>)}
        {!history.length && <div className="entity-card"><strong>No calls yet</strong><span>Your HEXA voice/video call history will appear here.</span></div>}
      </div>
    </section>
  );
}

function WebRTCCall({ profile, call, type, peer, onEnd }) {
  const localVideo = useRef(null);
  const remoteVideo = useRef(null);
  const remoteAudio = useRef(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const audioContextRef = useRef(null);
  const channelRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState("");
  const [muted, setMuted] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(type === "video");
  const [speakerOn, setSpeakerOn] = useState(true);
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
        localStreamRef.current = stream;
        if (localVideo.current) localVideo.current.srcObject = stream;
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));
        pc.ontrack = (event) => {
          const remoteStream = event.streams[0];
          if (!remoteStream) return;
          if (remoteVideo.current && type === "video") remoteVideo.current.srcObject = remoteStream;
          if (remoteAudio.current) {
            remoteAudio.current.srcObject = remoteStream;
            remoteAudio.current.muted = !speakerOn;
            remoteAudio.current.play?.().catch(() => {});
          }
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
      localStreamRef.current?.getTracks?.().forEach((track) => track.stop());
      localStreamRef.current = null;
      pc?.getSenders().forEach((sender) => sender.track?.stop());
      pc?.close();
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [call?.id, call?.caller_id, peer?.id, profile?.id, type]);

  function toggleMute() {
    const track = localStreamRef.current?.getAudioTracks?.()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setMuted(!track.enabled);
  }

  function toggleCamera() {
    const track = localStreamRef.current?.getVideoTracks?.()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setCameraEnabled(track.enabled);
  }

  function toggleSpeaker() {
    setSpeakerOn(value => {
      const next = !value;
      if (remoteAudio.current) remoteAudio.current.muted = !next;
      return next;
    });
  }

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
    localStreamRef.current?.getTracks?.().forEach((track) => track.stop());
    localStreamRef.current = null;
    pcRef.current?.close();
    onEnd?.();
  }

  const displayName = peer?.name || peer?.full_name || peer?.username || "hexachi User";
  return (
    <div className="story-viewer" style={{ zIndex: 800 }}>
      <div className="call-shell">
        <div className="call-header">
          <strong>{type === "video" ? "HEXA Video Call" : "HEXA Voice Call"}</strong>
          <span>{connected ? "Connected" : call?.status === "ringing" ? "Ringing…" : "Connecting…"}</span>
        </div>
        {type === "video" ? (
          <div className="call-video-grid">
            <video ref={remoteVideo} autoPlay playsInline className="call-remote-video" />
            <video ref={localVideo} autoPlay muted playsInline className={`call-local-video ${cameraEnabled ? "" : "camera-off"}`} />
            {!cameraEnabled && <div className="camera-off-label"><Avatar src={profile?.avatar_url} name={profile?.full_name || profile?.username} size={62} /><span>Camera off</span></div>}
            <audio ref={remoteAudio} autoPlay playsInline />
          </div>
        ) : (
          <div className="call-audio-stage">
            <div className="call-avatar"><Avatar src={peer?.avatar_url} name={displayName} size={82} online={connected} /></div>
            <p>{error || (connected ? "Connected" : call?.status === "ringing" ? "Ringing…" : "Connecting…")}</p>
            <audio ref={remoteAudio} autoPlay playsInline />
          </div>
        )}
        {error && <p className="call-error">{error}</p>}
        <div className="call-controls">
          <button type="button" className={`call-control-button ${muted ? "active" : ""}`} onClick={toggleMute}>{muted ? "🔇 Unmute" : "🎙 Mute"}</button>
          {type === "video" && <button type="button" className={`call-control-button ${!cameraEnabled ? "active" : ""}`} onClick={toggleCamera}>{cameraEnabled ? "📹 Camera" : "🚫 Camera"}</button>}
          <button type="button" className={`call-control-button ${!speakerOn ? "active" : ""}`} onClick={toggleSpeaker}>{speakerOn ? "🔊 Speaker" : "🔇 Speaker"}</button>
          <button type="button" className="danger-button" onClick={end}>End call</button>
        </div>
      </div>
    </div>
  );
}

function GroupWebRTCCall({ profile, roomId, conversation, callType, callRecordIds = [], participants = [], onEnd }) {
  const localVideo = useRef(null);
  const participantKey = participants.map((p) => p.id).sort().join(",");
  const peersRef = useRef(new Map());
  const pendingIceRef = useRef(new Map());
  const localStreamRef = useRef(null);
  const channelRef = useRef(null);
  const [remoteStreams, setRemoteStreams] = useState({});
  const [connectedIds, setConnectedIds] = useState([]);
  const [muted, setMuted] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(callType === "video");
  const [error, setError] = useState("");
  const [ending, setEnding] = useState(false);

  const isVideo = callType === "video";
  const displayParticipants = participants.filter((p) => String(p.id) !== String(profile.id));

  useEffect(() => {
    let stopped = false;

    async function start() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error("Camera/microphone access is not available in this browser.");
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: isVideo,
        });
        if (stopped) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        localStreamRef.current = stream;
        if (localVideo.current && isVideo) {
          localVideo.current.srcObject = stream;
        }

        const channel = supabase.channel(`hexa-group-call-${roomId}`, {
          config: { broadcast: { self: true } },
        });
        channelRef.current = channel;

        const send = async (event, payload) => {
          try {
            await channel.send({
              type: "broadcast",
              event,
              payload,
            });
          } catch (broadcastError) {
            console.warn("HEXA group call broadcast:", broadcastError?.message || broadcastError);
          }
        };

        function keyFor(userId) {
          return String(userId);
        }

        async function flushIce(userId, pc) {
          const queued = pendingIceRef.current.get(keyFor(userId)) || [];
          pendingIceRef.current.delete(keyFor(userId));
          for (const candidate of queued) {
            try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch {}
          }
        }

        async function ensurePeer(peerId, createOffer = false) {
          const id = keyFor(peerId);
          if (id === keyFor(profile.id)) return null;

          const existing = peersRef.current.get(id);
          if (existing) {
            if (createOffer && existing.signalingState === "stable" && !existing.currentRemoteDescription) {
              try {
                const offer = await existing.createOffer();
                await existing.setLocalDescription(offer);
                await send("offer", {
                  from: profile.id,
                  to: peerId,
                  description: offer,
                });
              } catch (offerError) {
                console.warn("HEXA group call re-offer:", offerError?.message || offerError);
              }
            }
            return existing;
          }

          const cfg = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };
          if (import.meta.env.VITE_TURN_URL && import.meta.env.VITE_TURN_USERNAME && import.meta.env.VITE_TURN_CREDENTIAL) {
            cfg.iceServers.push({
              urls: import.meta.env.VITE_TURN_URL,
              username: import.meta.env.VITE_TURN_USERNAME,
              credential: import.meta.env.VITE_TURN_CREDENTIAL,
            });
          }

          const pc = new RTCPeerConnection(cfg);
          peersRef.current.set(id, pc);

          stream.getTracks().forEach((track) => pc.addTrack(track, stream));

          pc.ontrack = (event) => {
            const remote = event.streams?.[0];
            if (!remote || stopped) return;
            setRemoteStreams((current) => ({ ...current, [id]: remote }));
            setConnectedIds((current) => current.includes(id) ? current : [...current, id]);
          };

          pc.onicecandidate = (event) => {
            if (event.candidate) {
              send("ice", {
                from: profile.id,
                to: peerId,
                candidate: event.candidate.toJSON(),
              });
            }
          };

          pc.onconnectionstatechange = () => {
            if (["failed", "closed", "disconnected"].includes(pc.connectionState)) {
              setConnectedIds((current) => current.filter((connectedId) => connectedId !== id));
            }
          };

          if (createOffer) {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            await send("offer", {
              from: profile.id,
              to: peerId,
              description: offer,
            });
          }

          return pc;
        }

        channel
          .on("broadcast", { event: "join" }, async ({ payload }) => {
            if (!payload?.from || String(payload.from) === String(profile.id)) return;
            // Deterministic initiator prevents offer glare: lexicographically smaller ID offers.
            const shouldOffer = String(profile.id) < String(payload.from);
            await ensurePeer(payload.from, shouldOffer);
          })
          .on("broadcast", { event: "offer" }, async ({ payload }) => {
            if (!payload?.from || String(payload.to) !== String(profile.id)) return;
            const pc = await ensurePeer(payload.from, false);
            if (!pc) return;
            try {
              await pc.setRemoteDescription(new RTCSessionDescription(payload.description));
              await flushIce(payload.from, pc);
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              await send("answer", {
                from: profile.id,
                to: payload.from,
                description: answer,
              });
            } catch (signalError) {
              console.warn("HEXA group offer handling:", signalError?.message || signalError);
            }
          })
          .on("broadcast", { event: "answer" }, async ({ payload }) => {
            if (!payload?.from || String(payload.to) !== String(profile.id)) return;
            const pc = peersRef.current.get(keyFor(payload.from));
            if (!pc) return;
            try {
              await pc.setRemoteDescription(new RTCSessionDescription(payload.description));
              await flushIce(payload.from, pc);
            } catch (signalError) {
              console.warn("HEXA group answer handling:", signalError?.message || signalError);
            }
          })
          .on("broadcast", { event: "ice" }, async ({ payload }) => {
            if (!payload?.from || String(payload.to) !== String(profile.id) || !payload.candidate) return;
            const peerId = keyFor(payload.from);
            const pc = peersRef.current.get(peerId);
            if (!pc || !pc.remoteDescription) {
              const queued = pendingIceRef.current.get(peerId) || [];
              queued.push(payload.candidate);
              pendingIceRef.current.set(peerId, queued);
              return;
            }
            try { await pc.addIceCandidate(new RTCIceCandidate(payload.candidate)); } catch {}
          })
          .on("broadcast", { event: "leave" }, ({ payload }) => {
            const peerId = keyFor(payload?.from);
            const pc = peersRef.current.get(peerId);
            pc?.close();
            peersRef.current.delete(peerId);
            setRemoteStreams((current) => {
              const next = { ...current };
              delete next[peerId];
              return next;
            });
            setConnectedIds((current) => current.filter((id) => id !== peerId));
          });

        await channel.subscribe();

        const memberIds = displayParticipants.map((p) => String(p.id)).filter(Boolean);
        for (const participantId of memberIds) {
          const shouldOffer = String(profile.id) < String(participantId);
          await ensurePeer(participantId, shouldOffer);
        }

        await send("join", { from: profile.id });
      } catch (startError) {
        console.error("HEXA group WebRTC start:", startError);
        if (!stopped) setError(startError?.message || "Unable to start the group call.");
      }
    }

    start();

    return () => {
      stopped = true;
      try { channelRef.current?.send({ type: "broadcast", event: "leave", payload: { from: profile.id } }); } catch {}
      peersRef.current.forEach((pc) => pc.close());
      peersRef.current.clear();
      localStreamRef.current?.getTracks?.().forEach((track) => track.stop());
      localStreamRef.current = null;
      if (channelRef.current) supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    };
  }, [roomId, profile?.id, participantKey]);

  function toggleMute() {
    const track = localStreamRef.current?.getAudioTracks?.()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setMuted(!track.enabled);
  }

  function toggleCamera() {
    const track = localStreamRef.current?.getVideoTracks?.()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setCameraEnabled(track.enabled);
  }

  async function end() {
    if (ending) return;
    setEnding(true);
    try {
      const ids = Array.isArray(callRecordIds) ? callRecordIds : [];
      for (const id of ids) {
        await supabase.rpc("finalize_hexa_call", {
          p_call_id: id,
          p_ended_reason: "user",
        }).catch(() => {});
      }
    } finally {
      onEnd?.();
    }
  }

  return (
    <div className="story-viewer" style={{ zIndex: 820 }}>
      <div className="call-shell">
        <div className="call-header">
          <div>
            <strong>{conversation?.name || "Group Call"}</strong>
            <span>{connectedIds.length ? `${connectedIds.length} participant${connectedIds.length === 1 ? "" : "s"} connected` : "Waiting for participants…"}</span>
          </div>
        </div>

        {isVideo && (
          <div className="call-video-grid">
            <video ref={localVideo} autoPlay muted playsInline className={`call-local-video ${cameraEnabled ? "" : "camera-off"}`} />
            {Object.entries(remoteStreams).map(([id, stream]) => {
              const person = participants.find((p) => String(p.id) === String(id));
              return <video key={id} autoPlay playsInline className="call-remote-video" ref={(node) => { if (node && node.srcObject !== stream) node.srcObject = stream; }} title={person?.full_name || person?.username || "Participant"} />;
            })}
          </div>
        )}

        {!isVideo && (
          <div className="call-audio-stage">
            <div className="call-avatar"><Avatar src={profile?.avatar_url} name={profile?.full_name || profile?.username || "hexachi"} size={86} online /></div>
            <h2>{conversation?.name || "Group Call"}</h2>
            <p>{error || (connectedIds.length ? "Connected" : "Waiting for participants…")}</p>
            {Object.entries(remoteStreams).map(([id, stream]) => (
              <audio key={id} autoPlay playsInline ref={(node) => { if (node && node.srcObject !== stream) node.srcObject = stream; }} />
            ))}
          </div>
        )}

        {error && <p className="call-error">{error}</p>}
        <div className="call-controls">
          <button type="button" className={`call-control-button ${muted ? "active" : ""}`} onClick={toggleMute}>{muted ? "🔇 Unmute" : "🎙 Mute"}</button>
          {isVideo && <button type="button" className={`call-control-button ${!cameraEnabled ? "active" : ""}`} onClick={toggleCamera}>{cameraEnabled ? "📹 Camera" : "🚫 Camera"}</button>}
          <button type="button" className="danger-button" onClick={end}>{ending ? "Ending…" : "End call"}</button>
        </div>
      </div>
    </div>
  );
}

function GroupCallLauncher({ profile, target, onClose }) {
  const [state, setState] = useState({ loading: true, error: "", roomId: "", callIds: [], participants: [] });

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const conversation = target?.conversation;
        const conversationId = conversation?.realConversationId || conversation?.id;
        if (!conversationId || !isHexaUuid(conversationId)) {
          throw new Error("This group is not ready for calling.");
        }

        // Read the full member list through the secure RPC first.
        // Direct browser reads can be limited by conversation_members RLS and
        // otherwise make a perfectly valid group appear to contain only the caller.
        let members = null;
        let memberError = null;

        const rpcResult = await supabase.rpc("hexa_get_group_members", {
          p_conversation_id: conversationId,
        });

        if (!rpcResult.error) {
          members = rpcResult.data || [];
        } else {
          // Backward-compatible fallback for projects that have not run the RPC SQL yet.
          const directResult = await supabase
            .from("conversation_members")
            .select("user_id,is_admin")
            .eq("conversation_id", conversationId);
          members = directResult.data || [];
          memberError = directResult.error;
        }

        if (memberError) throw memberError;

        const memberIds = [...new Set(
          (members || [])
            .map((m) => m.user_id)
            .filter((id) => isHexaUuid(id) && String(id) !== String(profile.id))
        )];

        if (!memberIds.length) {
          throw new Error(
            "This group has no other members to call. Add at least one member to the group, then try again."
          );
        }

        const { data: people, error: peopleError } = await supabase
          .from("profiles")
          .select("id,username,full_name,avatar_url")
          .in("id", [profile.id, ...memberIds]);
        if (peopleError) throw peopleError;

        const roomId = crypto.randomUUID ? crypto.randomUUID() : `group-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const modeType = target.type === "video" ? "video" : "voice";

        const rows = memberIds.map((calleeId) => ({
          conversation_id: conversationId,
          caller_id: profile.id,
          callee_id: calleeId,
          type: modeType,
          status: "ringing",
          started_at: null,
          ended_at: null,
          rate_kobo_per_second: 30,
          currency: "NGN",
          metadata: {
            ...(target.mode ? { mode: target.mode } : {}),
            group_call: true,
            room_id: roomId,
            group_name: conversation.name || "Group Call",
            conversation_id: conversationId,
            participant_ids: [profile.id, ...memberIds],
          },
        }));

        const { data: calls, error: callError } = await supabase
          .from("calls")
          .insert(rows)
          .select("id,conversation_id,caller_id,callee_id,type,status,metadata");
        if (callError) throw callError;

        if (!active) return;

        const participantProfiles = people || memberIds.map((id) => ({ id }));
        setState({
          loading: false,
          error: "",
          roomId,
          callIds: (calls || []).map((c) => c.id),
          participants: participantProfiles,
        });

        const sessionResult = await supabase.auth.getSession();
        const token = sessionResult?.data?.session?.access_token;
        if (token) {
          for (const call of calls || []) {
            fetch("/api/hexa-push", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                kind: "call",
                callee_id: call.callee_id,
                call_id: call.id,
                call_type: modeType,
                url: `${window.location.origin}/?groupCall=${encodeURIComponent(roomId)}&conversation=${encodeURIComponent(conversationId)}`,
                title: conversation.name || "hexachi group call",
                body: modeType === "video" ? "📹 Incoming group video call" : "📞 Incoming group voice call",
              }),
            }).catch(() => {});
          }
        }
      } catch (error) {
        if (active) setState({ loading: false, error: error?.message || "Unable to start the group call.", roomId: "", callIds: [], participants: [] });
      }
    })();

    return () => { active = false; };
  }, [profile?.id, target?.conversation?.id, target?.conversation?.realConversationId, target?.type]);

  if (state.error) {
    return <div className="story-viewer"><div className="coming-card"><h2>Group call unavailable</h2><p>{state.error}</p><button onClick={onClose}>Close</button></div></div>;
  }

  if (state.loading) {
    return <div className="story-viewer"><div className="coming-card"><h2>Starting group call…</h2><p>Calling the current group members.</p></div></div>;
  }

  return <GroupWebRTCCall profile={profile} roomId={state.roomId} conversation={target.conversation} callType={target.type} callRecordIds={state.callIds} participants={state.participants} onEnd={onClose} />;
}

function GroupIncomingCallRoom({ profile, call, roomId, participantIds, onEnd }) {
  const [participants, setParticipants] = useState([]);
  useEffect(() => {
    let active = true;
    (async () => {
      const ids = [...new Set((participantIds || []).filter((id) => isHexaUuid(id)))];
      if (!ids.length) return;
      const { data } = await supabase.from("profiles").select("id,username,full_name,avatar_url").in("id", ids);
      if (active) setParticipants(data || []);
    })();
    return () => { active = false; };
  }, [participantIds.join(",")]);
  if (!roomId) return <div className="story-viewer"><div className="coming-card"><h2>Group call unavailable</h2><p>The group call room is missing.</p><button onClick={onEnd}>Close</button></div></div>;
  return <GroupWebRTCCall profile={profile} roomId={roomId} conversation={{ name: call?.metadata?.group_name || "Group Call" }} callType={call?.type || "voice"} callRecordIds={[call.id]} participants={participants} onEnd={onEnd} />;
}

function WebRTCCallLauncher({ profile, target, onClose }) {
  const [call, setCall] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      const conversation = target?.conversation;
      const user = conversation?.user_a === profile.id
        ? conversation?.user_b
        : conversation?.user_a;
      if (!conversation?.id || !user) {
        setError("This conversation does not have a direct call target.");
        return;
      }

      const { data, error: callError } = await supabase.rpc("hexa_create_call", {
        p_conversation_id: conversation.id,
        p_callee_id: user,
        p_type: target.type,
        p_external: false,
      });
      if (!mounted) return;
      if (callError) {
        setError(callError.message);
        return;
      }

      const { data: peer } = await supabase.from("profiles")
        .select("id,username,full_name,avatar_url")
        .eq("id", user)
        .maybeSingle();
      if (mounted) setCall({ data, peer: peer || { id: user, full_name: "hexachi User" } });
    })();
    return () => { mounted = false; };
  }, [profile?.id, target?.conversation?.id, target?.type]);

  if (error) {
    return <div className="story-viewer"><div className="coming-card"><h2>Call unavailable</h2><p>{error}</p><button onClick={onClose}>Close</button></div></div>;
  }
  return call ? (
    <WebRTCCall profile={profile} call={{ ...call.data, callee_id: call.peer.id }} type={target.type} peer={call.peer} onEnd={onClose} />
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
        if (active) setIncoming({ call, peer: peer || { id: call.caller_id, full_name: "hexachi User" } });
      }
    })();

    const channel = supabase.channel(`hexa-incoming-calls-${profile.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "calls", filter: `callee_id=eq.${profile.id}` }, async (payload) => {
        const call = payload.new;
        if (!active || call.status !== "ringing") return;
        const { data: peer } = await supabase.from("profiles").select("id,username,full_name,avatar_url").eq("id", call.caller_id).maybeSingle();
        if (active) setIncoming({ call, peer: peer || { id: call.caller_id, full_name: "hexachi User" } });
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
  if (incoming.accepted) {
    if (incoming.call?.metadata?.group_call) {
      const participantIds = incoming.call?.metadata?.participant_ids || [];
      const roomId = incoming.call?.metadata?.room_id;
      return <GroupIncomingCallRoom profile={profile} call={incoming.call} roomId={roomId} participantIds={participantIds} onEnd={() => setIncoming(null)} />;
    }
    return <WebRTCCall profile={profile} call={incoming.call} type={incoming.call.type} peer={{ id: incoming.call.caller_id }} onEnd={() => setIncoming(null)} />;
  }
  return <div className="story-viewer" style={{ zIndex: 700 }}>
    <div className="coming-card" style={{ width: "min(420px, 92vw)", textAlign: "center" }}>
      <Avatar src={incoming.peer?.avatar_url} name={incoming.peer?.full_name || incoming.peer?.username} size={82} />
      <h2>{incoming.peer?.full_name || incoming.peer?.username || "hexachi User"}</h2>
      <p>Incoming {incoming.call.type === "video" ? "video" : "voice"} call</p>
      <div className="hero-actions">
        <button className="hero-secondary" onClick={decline}>Decline</button>
        <button className="hero-primary" onClick={accept}>Answer</button>
      </div>
    </div>
  </div>;
}
function normalizeHexaPhone(value = "") {
  return String(value || "").replace(/[^0-9+]/g, "").trim();
}

function WalletPage({ profile }) {
  const [balance, setBalance] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [amount, setAmount] = useState(5000);
  const [username, setUsername] = useState(profile?.username ? `@${profile.username}` : "");
  const [phone, setPhone] = useState(profile?.phone_number || "");
  const [password, setPassword] = useState("");
  const [showBuyCredits, setShowBuyCredits] = useState(false);
  const [funding, setFunding] = useState(false);

  async function loadWallet() {
    if (!profile?.id) return;
    setLoading(true);
    setError("");
    try {
      const [walletResult, txResult] = await Promise.all([
        supabase.from("wallets").select("balance_kobo,currency").eq("user_id", profile.id).maybeSingle(),
        supabase.from("wallet_transactions").select("id,type,amount_kobo,status,description,created_at").eq("user_id", profile.id).order("created_at", { ascending: false }).limit(50),
      ]);
      if (walletResult.error) throw walletResult.error;
      if (txResult.error) throw txResult.error;
      setBalance(walletResult.data?.balance_kobo ?? 0);
      setTransactions(txResult.data || []);
    } catch (e) {
      setError(e?.message || "Wallet data could not be loaded. Create the HEXA wallet tables/RLS before enabling payments.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadWallet();
    setUsername(profile?.username ? `@${profile.username}` : "");
    setPhone(profile?.phone_number || "");
  }, [profile?.id, profile?.username, profile?.phone_number]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reference = params.get("reference") || params.get("trxref");
    const walletResult = params.get("wallet");
    if (reference && walletResult === "success") {
      (async () => {
        setFunding(true);
        const { data, error: verifyError } = await supabase.functions.invoke(import.meta.env.VITE_HEXA_PAYMENT_FUNCTION || "hexa-payment", {
          body: { action: "verify", reference },
        });
        if (verifyError || data?.error) {
          setError(verifyError?.message || data?.error || "Payment verification failed.");
        } else {
          setError("");
          await loadWallet();
        }
        const clean = new URL(window.location.href);
        clean.searchParams.delete("wallet");
        clean.searchParams.delete("reference");
        clean.searchParams.delete("trxref");
        window.history.replaceState({}, "", clean.toString());
        setFunding(false);
      })();
    }
  }, []);

  async function startFunding() {
    const naira = Number(amount);
    if (!Number.isFinite(naira) || naira < 100) {
      alert("Enter a valid HEXA Credits amount of at least ₦100.");
      return;
    }
    if (!profile?.email) {
      setError("Your HEXA profile does not have an email address for secure payment checkout.");
      return;
    }

    const cleanUsername = String(username || "").trim().replace(/^@/, "").toLowerCase();
    const cleanPhone = normalizeHexaPhone(phone);
    if (!cleanUsername || !cleanPhone || !password) {
      setError("Enter your HEXA username, phone number and password before buying credits.");
      return;
    }
    if (cleanUsername !== String(profile.username || "").toLowerCase()) {
      setError("The HEXA username does not match the signed-in account.");
      return;
    }
    if (cleanPhone.length < 7) {
      setError("Enter a valid phone number.");
      return;
    }

    setFunding(true);
    setError("");

    // Re-authenticate with Supabase Auth. The password is sent only to Supabase Auth;
    // it is never stored in HEXA Wallet tables or sent to the payment provider.
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: profile.email,
      password,
    });
    if (authError) {
      setError("Security check failed: your HEXA password is incorrect.");
      setFunding(false);
      return;
    }

    const { data: initData, error: invokeError } = await supabase.functions.invoke(import.meta.env.VITE_HEXA_PAYMENT_FUNCTION || "hexa-payment", {
      body: {
        action: "initialize_credits",
        amount_naira: naira,
        hexa_username: cleanUsername,
        phone_number: cleanPhone,
      },
    });

    if (invokeError || initData?.error) {
      setError(invokeError?.message || initData?.error || "Unable to start HEXA Credits payment.");
      setFunding(false);
      return;
    }
    setPassword("");
    if (initData?.authorization_url) {
      window.location.assign(initData.authorization_url);
      return;
    }
    if (initData?.ussd_code || initData?.ussd || initData?.instructions) {
      const code = initData.ussd_code || initData.ussd || "";
      alert(["HEXA PAYMENT", "", code ? `USSD: ${code}` : "", initData.instructions || "Follow the payment instructions on your phone.", "", "After payment, HEXA will verify the transaction on the server."].filter(Boolean).join("\n"));
      setFunding(false);
      return;
    }
    setError("The payment service did not return a usable payment instruction.");
    setFunding(false);
  }

  const displayNaira = Number(balance || 0) / 100;
  const displayCredits = displayNaira.toFixed(2);

  return <section className="workspace-page">
    <div className="page-heading">
      <div className="page-heading-icon">₦</div>
      <div><h1>HEXA Wallet</h1><p>Buy HEXA Credits, pay for HEXA services and view your transaction history.</p></div>
    </div>

    <div className="wallet-grid">
      <div className="wallet-balance-card">
        <span>Available HEXA Credits</span>
        <strong>{loading ? "Loading…" : displayCredits}</strong>
        <small>1 HEXA Credit = ₦1.00 · External call rate: 30 kobo/second</small>
      </div>
      <div className="settings-card wallet-fund-card">
        <div><strong>Buy HEXA Credits</strong><p>Secure account verification + server-side payment verification.</p></div>
        <button className="hero-primary" onClick={() => setShowBuyCredits(true)} disabled={funding}>Buy Credits</button>
      </div>
    </div>

    {showBuyCredits && <div className="hexa-modal-backdrop">
      <div className="entity-modal wallet-credit-modal">
        <div className="section-heading">
          <div><h2>Buy HEXA Credits</h2><p>Simple phone-style payment. Verify your HEXA account, then complete payment securely.</p></div>
          <button className="hero-secondary" onClick={() => { setShowBuyCredits(false); setPassword(""); setError(""); }}>Close</button>
        </div>
        <label className="wallet-security-field"><span>hexachi Username</span><input className="modal-input" value={username} onChange={e => setUsername(e.target.value)} placeholder="@yourusername" autoComplete="username" /></label>
        <label className="wallet-security-field"><span>Phone Number</span><input className="modal-input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="080XXXXXXXX" inputMode="tel" autoComplete="tel" /></label>
        <label className="wallet-security-field"><span>HEXA Password</span><input className="modal-input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your HEXA password" autoComplete="current-password" /></label>
        <label className="wallet-security-field"><span>Amount (₦)</span><input className="modal-input" type="number" min="100" step="100" value={amount} onChange={e => setAmount(e.target.value)} /></label>
        <div className="wallet-security-note">🔐 Your password is used only for the Supabase authentication check. HEXA does not store it and never sends it to the payment provider. Payment confirmation is verified server-side.</div>
        {error && <div className="auth-alert auth-error"><span>!</span>{error}</div>}
        <button className="hero-primary wallet-buy-button" onClick={startFunding} disabled={funding}>{funding ? "Starting secure payment…" : `Buy ${Number(amount || 0).toLocaleString("en-NG")} HEXA Credits`}</button>
      </div>
    </div>}

    {error && !showBuyCredits && <div className="auth-alert auth-error" style={{marginTop:14}}><span>!</span>{error}</div>}
    <div className="section-heading" style={{marginTop:22}}><div><h2>Transactions</h2><p>Wallet activity, HEXA Credit purchases and call charges.</p></div><button className="hero-secondary" onClick={loadWallet}>Refresh</button></div>
    <div className="entity-grid">
      {!loading && !transactions.length && <div className="entity-card"><strong>No transactions yet</strong><span>Your verified HEXA Credits and wallet activity will appear here.</span></div>}
      {transactions.map(tx => <div className="entity-card" key={tx.id}><strong>{tx.type === "credit_purchase" ? "HEXA Credits Purchase" : (tx.type || "Transaction")}</strong><span>{tx.description || "HEXA Wallet transaction"}</span><small>{tx.status || "pending"} · ₦{(Number(tx.amount_kobo || 0) / 100).toFixed(2)} · {new Date(tx.created_at).toLocaleString()}</small></div>)}
    </div>
  </section>;
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
    (peopleR.data||[]).forEach(x=>out.push({kind:"person",id:`p-${x.id}`,title:x.full_name||x.username||"hexachi User",subtitle:x.username?`@${x.username}`:"Contact",data:x}));
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


const HEXA_SUBSCRIPTION_PLANS = [
  {
    id: "plus",
    name: "HEXA Plus",
    description: "For people who want more room to communicate.",
    features: [
      "More storage",
      "Advanced chat organization",
      "Premium themes",
      "Higher media limits",
      "Expanded Kora usage",
    ],
    prices: {
      ngn: { monthly: 3500, yearly: 33600 },
      usd: { monthly: 2.99, yearly: 28.70 },
    },
  },
  {
    id: "pro",
    name: "HEXA Pro",
    description: "For power users, creators and growing communities.",
    features: [
      "Everything in Plus",
      "Higher media limits",
      "Creator tools",
      "Advanced communities",
      "More Kora credits",
    ],
    prices: {
      ngn: { monthly: 8000, yearly: 76800 },
      usd: { monthly: 6.99, yearly: 67.10 },
    },
  },
  {
    id: "ultra",
    name: "HEXA Ultra",
    description: "Maximum HEXA access for advanced users and businesses.",
    features: [
      "Everything in Pro",
      "Maximum limits",
      "Priority features",
      "Advanced business tools",
      "Highest Kora allowance",
    ],
    prices: {
      ngn: { monthly: 18000, yearly: 172800 },
      usd: { monthly: 14.99, yearly: 143.90 },
    },
  },
];

function SubscriptionPage({ profile }) {
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [billingCurrency, setBillingCurrency] = useState("ngn");
  const [billingCycle, setBillingCycle] = useState("monthly");

  async function getSessionToken() {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    const token = data?.session?.access_token;
    if (!token) throw new Error("Your HEXA session has expired. Please sign in again.");
    return token;
  }

  async function loadSubscription() {
    if (!profile?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("hexa_subscriptions")
        .select("*")
        .eq("user_id", profile.id)
        .maybeSingle();
      if (error) throw error;
      setSubscription(data || null);
    } catch (error) {
      console.warn("HEXA subscription load:", error?.message || error);
      setMessage(error?.message || "Unable to load your subscription.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSubscription();

    const channel = supabase
      .channel(`hexa-subscription-${profile?.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "hexa_subscriptions",
          filter: `user_id=eq.${profile?.id}`,
        },
        (payload) => {
          if (payload.new) setSubscription(payload.new);
          else loadSubscription();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id]);

  async function startCheckout(planId) {
    if (!profile?.id) return;
    setBusy(planId);
    setMessage("");

    try {
      const token = await getSessionToken();
      const endpoint =
        import.meta.env.VITE_HEXA_SUBSCRIPTION_CHECKOUT_URL ||
        "/api/hexa-subscription-checkout";

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          plan_id: planId,
          currency: billingCurrency,
          billingCycle,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.url) {
        throw new Error(
          data?.error ||
            "Unable to start Stripe checkout."
        );
      }

      window.location.assign(data.url);
    } catch (error) {
      setMessage(error?.message || "Unable to start Stripe checkout.");
    } finally {
      setBusy("");
    }
  }

  async function manageSubscription() {
    setBusy("manage");
    setMessage("");

    try {
      const token = await getSessionToken();
      const response = await fetch("/api/hexa-subscription-portal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.url) {
        throw new Error(
          data?.error ||
            "Unable to open subscription management."
        );
      }
      window.location.assign(data.url);
    } catch (error) {
      setMessage(error?.message || "Unable to open subscription management.");
    } finally {
      setBusy("");
    }
  }

  const isActive = ["active", "trialing"].includes(subscription?.status);

  return (
    <section className="workspace-page subscription-page">
      <div className="page-heading">
        <div className="page-heading-icon">★</div>
        <div>
          <h1>Subscription</h1>
          <p>Upgrade your hexachi account securely through Stripe.</p>
        </div>
      </div>

      {subscription && (
        <div className="settings-card subscription-current">
          <div>
            <strong>
              {subscription.plan_name || subscription.plan_id || "Free"}
            </strong>
            <p>
              {subscription.status || "active"}
              {subscription.current_period_end
                ? ` · Renews ${new Date(subscription.current_period_end).toLocaleDateString()}`
                : ""}
            </p>
          </div>
          <button
            className="settings-secondary-button"
            type="button"
            disabled={busy === "manage"}
            onClick={manageSubscription}
          >
            {busy === "manage" ? "Opening…" : "Manage subscription"}
          </button>
        </div>
      )}

      {message && (
        <div className="subscription-message">
          {message}
        </div>
      )}

      <div className="subscription-controls settings-card">
        <div>
          <strong>Billing</strong>
          <p>Choose your currency and billing frequency before checkout.</p>
        </div>
        <div className="subscription-control-row">
          <label>
            <span>Currency</span>
            <select value={billingCurrency} onChange={(e) => setBillingCurrency(e.target.value)}>
              <option value="ngn">NGN ₦</option>
              <option value="usd">USD $</option>
            </select>
          </label>
          <label>
            <span>Billing cycle</span>
            <select value={billingCycle} onChange={(e) => setBillingCycle(e.target.value)}>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </label>
        </div>
      </div>

      {loading ? (
        <div className="coming-card">
          <div className="loading-spinner" />
          <h2>Loading subscription…</h2>
        </div>
      ) : (
        <div className="subscription-grid">
          {HEXA_SUBSCRIPTION_PLANS.map((plan) => {
            const current =
              isActive &&
              subscription?.plan_id === plan.id;

            return (
              <article
                key={plan.id}
                className={`subscription-card ${
                  current ? "current" : ""
                } ${plan.id === "pro" ? "featured" : ""}`}
              >
                {plan.id === "pro" && (
                  <span className="popular">POPULAR</span>
                )}

                <span className="eyebrow">HEXACHI MEMBERSHIP</span>
                <h2>{plan.name}</h2>
                <div className="subscription-price">
                  <strong>
                    {billingCurrency === "ngn" ? "₦" : "$"}
                    {plan.prices[billingCurrency][billingCycle].toLocaleString(undefined, {
                      minimumFractionDigits: billingCurrency === "usd" ? 2 : 0,
                      maximumFractionDigits: 2,
                    })}
                  </strong>
                  <span>/{billingCycle === "monthly" ? "month" : "year"}</span>
                </div>
                <p>{plan.description}</p>

                <div className="subscription-features">
                  {plan.features.map((feature) => (
                    <span key={feature}>✓ {feature}</span>
                  ))}
                </div>

                <button
                  className="hero-primary"
                  type="button"
                  disabled={current || Boolean(busy)}
                  onClick={() => startCheckout(plan.id)}
                >
                  {busy === plan.id
                    ? "Opening Stripe…"
                    : current
                      ? "Current plan"
                      : `Choose ${plan.name.replace("HEXA ", "")}`}
                </button>
              </article>
            );
          })}
        </div>
      )}

      <div className="billing-footer">
        <div>
          <strong>🔒 Secure Stripe billing</strong>
          <span>
            Stripe handles payment details. hexachi stores only the subscription status and Stripe identifiers needed to provide your plan.
          </span>
        </div>
      </div>
    </section>
  );
}

function SettingsPage({ profile, onSignOut, onNavigate }) {
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

      <div className="settings-card hexa-profile-settings">
        <Avatar
          src={profile?.avatar_url}
          name={
            profile?.full_name ||
            profile?.username ||
            "hexachi User"
          }
          size={64}
        />

        <div>
          <strong>
            {profile?.full_name ||
              profile?.username ||
              "hexachi User"}
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

      <div className="settings-layout-grid">
        <div className="settings-card settings-feature-card">
          <div className="settings-feature-icon">👤</div>
          <div className="settings-feature-copy">
            <strong>Profile</strong>
            <p>Manage your name, username and profile picture.</p>
          </div>
          <span className="settings-status">Account</span>
        </div>

        <div className="settings-card settings-feature-card">
          <div className="settings-feature-icon">🔔</div>
          <div className="settings-feature-copy">
            <strong>Notifications</strong>
            <p>Message alerts, call alerts and notification preferences.</p>
          </div>
          <span className="settings-status">Active</span>
        </div>

        <div className="settings-card settings-feature-card">
          <div className="settings-feature-icon">💬</div>
          <div className="settings-feature-copy">
            <strong>Chats & media</strong>
            <p>Control chat appearance, media behaviour and conversation preferences.</p>
          </div>
          <button type="button" onClick={() => onNavigate?.("chat")}>Open</button>
        </div>

        <div className="settings-card settings-feature-card settings-clickable" onClick={() => onNavigate?.("subscription")}>
          <div className="settings-feature-icon">★</div>
          <div className="settings-feature-copy">
            <strong>Subscription</strong>
            <p>Manage HEXA Plus, Pro or Ultra through Stripe.</p>
          </div>
          <span className="settings-status">Stripe</span>
        </div>

        <div className="settings-card settings-feature-card">
          <div className="settings-feature-icon">🔒</div>
          <div className="settings-feature-copy">
            <strong>Privacy & security</strong>
            <p>Review account privacy, sessions and security-related controls.</p>
          </div>
          <span className="settings-status">Protected</span>
        </div>

        <div className="settings-card settings-feature-card">
          <div className="settings-feature-icon">📞</div>
          <div className="settings-feature-copy">
            <strong>Calls</strong>
            <p>Voice and video calling uses your existing HEXA call system.</p>
          </div>
          <button type="button" onClick={() => onNavigate?.("calls")}>Open</button>
        </div>
      </div>

      <div className="settings-card settings-account-footer">
        <div className="settings-footer-avatar">
          <Avatar src={profile?.avatar_url} name={profile?.full_name || profile?.username || "hexachi User"} size={44} />
        </div>
        <div className="settings-feature-copy">
          <strong>{profile?.full_name || profile?.username || "hexachi User"}</strong>
          <p>{profile?.email || (profile?.username ? `@${profile.username}` : "Signed in to hexachi")}</p>
        </div>
        <button className="settings-danger-button" onClick={onSignOut}>Sign out</button>
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

function MobileBottomNav({ activePage, setActivePage }) {
  const items = [
    { id: "chat", icon: "💬", label: "Chat" },
    { id: "groups", icon: "👥", label: "Groups" },
    { id: "status", icon: "◌", label: "Status" },
    { id: "calls", icon: "☎", label: "Calls" },
    { id: "settings", icon: "⚙", label: "Settings" },
  ];
  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
      {items.map((item) => (
        <button key={item.id} type="button" className={activePage === item.id ? "active" : ""} onClick={() => setActivePage(item.id)} aria-label={item.label}>
          <span className="mobile-bottom-icon">{item.icon}</span>
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}

function AuthenticatedHEXA({ session, onSignOut }) {

  const [profile,setProfile]=useState(null),[profileLoading,setProfileLoading]=useState(true),[activePage,setActivePage]=useState("chat"),[search,setSearch]=useState(""),[notifications,setNotifications]=useState([]),[showNotifications,setShowNotifications]=useState(false),[chatTarget,setChatTarget]=useState(null),[callTarget,setCallTarget]=useState(null);
  useEffect(()=>{let cancelled=false;(async()=>{const result=await ensureHexaProfile(session?.user);if(!cancelled){setProfile(result);setProfileLoading(false)}})();return()=>{cancelled=true}},[session?.user?.id]);
  useEffect(()=>{if(!profile?.id)return;const channel=supabase.channel(`hexa-notifications-${profile.id}`).on("postgres_changes",{event:"INSERT",schema:"public",table:"messages"},p=>{if(p.new?.sender_id===profile.id)return;setNotifications(x=>[{id:Date.now(),title:"New message",body:p.new?.content||"New message",created_at:new Date().toISOString()},...x].slice(0,50))}).subscribe();return()=>supabase.removeChannel(channel)},[profile?.id]);
  if(profileLoading)return <div className="hexa-loading-screen"><div className="loading-logo">H</div><div className="loading-spinner"/><strong>Opening HEXA…</strong><span>Preparing your workspace</span></div>;
  let page; switch(activePage){
        case "chat":page=<ChatPage profile={profile} initialConversation={chatTarget?.id ? chatTarget : undefined} onStartCall={(c,type,mode)=>setCallTarget({conversation:c,type,mode: mode || (type === "video" ? "video-call" : "voice-call")})} onOpenChatWithUser={()=>setSearch("")}/>;break;
    case "groups":page=<GroupsPage profile={profile} onOpenChat={c=>{setChatTarget(c);setActivePage("chat")}}/>;break;
    case "communities":page=<CommunitiesPage profile={profile}/>;break;
    case "channels":page=<ChannelsPage profile={profile}/>;break;
    case "status":page=<StatusPage profile={profile}/>;break;
    case "calls":page=<CallsPage profile={profile}/>;break;
    case "kora":page=<KoraPage profile={profile}/>;break;
    case "subscription":page=<SubscriptionPage profile={profile}/>;break;
    case "settings":page=<SettingsPage profile={profile} onSignOut={onSignOut} onNavigate={setActivePage}/>;break;
    case "projects":page=<WorkspacePlaceholder title="Projects" description="Organize collaborative work." icon="◆"/>;break;
    case "developer":page=<WorkspacePlaceholder title="Developer Hub" description="Build and connect with HEXA." icon="</>"/>;break;
    default:page=<ChatPage profile={profile} initialConversation={chatTarget?.id ? chatTarget : undefined} onStartCall={(c,type,mode)=>setCallTarget({conversation:c,type,mode: mode || (type === "video" ? "video-call" : "voice-call")})} onOpenChatWithUser={()=>setSearch("")}/>;
  }
  const callConversation = callTarget?.conversation;
  const callConversationKind = String(callConversation?.kind || callConversation?.type || "").toLowerCase();
  const isGroupCallTarget = String(callTarget?.mode || "").startsWith("group-") || callConversationKind === "group" || callConversationKind === "system_group";
  const normalizedCallTarget = callTarget
    ? {
        ...callTarget,
        mode: isGroupCallTarget
          ? (String(callTarget.mode || "").startsWith("group-")
              ? callTarget.mode
              : callTarget.type === "video" ? "group-video" : "group-voice")
          : callTarget.mode,
      }
    : null;

  return <div className="hexa-app"><IncomingCallWatcher profile={profile}/><Sidebar activePage={activePage} setActivePage={setActivePage} profile={profile}/><div className="hexa-main"><Topbar profile={profile} search={search} setSearch={setSearch} activePage={activePage} onNotifications={()=>setShowNotifications(v=>!v)} notificationCount={notifications.length} onSettings={()=>setActivePage("settings")}/><main className="hexa-content"><UniversalSearch search={search} profile={profile} onMessage={async p=>{setSearch("");const {data}=await supabase.from("conversations").select("*").eq("type","direct").or(`and(user_a.eq.${profile.id},user_b.eq.${p.id}),and(user_a.eq.${p.id},user_b.eq.${profile.id})`).limit(1).maybeSingle();if(data){setChatTarget({...data,name:p.full_name||p.username,kind:"direct"});setActivePage("chat")}else{const {data:newChat,error}=await supabase.rpc("hexa_get_or_create_direct",{p_other_user_id:p.id});if(error){alert(error.message);return}setChatTarget({...newChat,name:p.full_name||p.username,kind:"direct"});setActivePage("chat")}}}/>{showNotifications&&<div className="notifications-panel"><div className="notifications-header"><strong>Notifications</strong><button onClick={()=>setNotifications([])}>Clear</button></div>{notifications.length?notifications.map(n=><div className="notification-item" key={n.id}><span>●</span><div><strong>{n.title}</strong><p>{n.body}</p><small>{new Date(n.created_at).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}</small></div></div>):<div className="notification-empty">You're all caught up.</div>}</div>}{page}{normalizedCallTarget && (isGroupCallTarget ? <GroupCallLauncher profile={profile} target={normalizedCallTarget} onClose={()=>setCallTarget(null)} /> : <WebRTCCallLauncher profile={profile} target={normalizedCallTarget} onClose={()=>setCallTarget(null)} />)}</main></div><MobileBottomNav activePage={activePage} setActivePage={setActivePage}/></div>;
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
        } = await withTimeout(
          supabase.auth.getSession(),
          15000,
          "HEXA could not connect to Supabase within 15 seconds. Check your Vercel environment variables and Supabase URL, then try again."
        );

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
          <h1>hexachi configuration required</h1>
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
          <strong>hexachi</strong>
          <span>Starting hexachi securely…</span>
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

          <h1>hexachi couldn't start</h1>

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
      <style>{APP_STYLES + COMMUNICATION_UI_OVERRIDES}</style>

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

const APP_STYLES_HEAD = `
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


/* WhatsApp-style message alignment */
.hexa-message-row {
  width: 100%;
  display: flex;
  align-items: flex-end;
  gap: 7px;
  margin: 7px 0;
}

.hexa-message-row.mine {
  justify-content: flex-end;
}

.hexa-message-row.incoming {
  justify-content: flex-start;
}

.hexa-message-row .message-bubble {
  max-width: min(72%, 560px);
  min-width: 0;
}

.group-message-sender {
  font-size: 11px;
  font-weight: 800;
  color: var(--hexa-accent-2);
  margin: 0 0 4px 1px;
  line-height: 1.2;
}

.hexa-message-row.mine .message-bubble {
  margin-left: auto;
}

.hexa-message-row.incoming .message-bubble {
  margin-right: auto;
}

.hexa-message-row .hexa-avatar {
  width: 30px !important;
  height: 30px !important;
  min-width: 30px !important;
  overflow: hidden !important;
  border-radius: 50% !important;
}

.hexa-message-row .hexa-avatar img {
  display: block;
  width: 100%;
  height: 100%;
  min-width: 100%;
  min-height: 100%;
  object-fit: cover;
  border-radius: 50%;
}

.hexa-avatar {
  overflow: hidden !important;
  border-radius: 50% !important;
}

.hexa-avatar img {
  display: block;
  width: 100%;
  height: 100%;
  min-width: 100%;
  min-height: 100%;
  object-fit: cover;
  border-radius: 50%;
}

.hexa-online-dot {
  z-index: 2;
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
`;

function WorkspacePlaceholder({ title, description, icon, children }) { return <section className="workspace-page"><div className="page-heading"><div className="page-heading-icon">{icon}</div><div><h1>{title}</h1><p>{description}</p></div></div>{children||<div className="coming-card"><div>✦</div><h2>{title}</h2><p>This HEXA workspace is ready for connected Supabase features.</p></div>}</section>; }

const APP_STYLES_TAIL = `
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
   HEXA CHAT COMPOSER + VOICE RECORDING
   ============================================================ */
.chat-main { position: relative; min-height: 0; }
.composer-stack { flex: 0 0 auto; border-top: 1px solid var(--hexa-border); background: rgba(9,12,17,.96); position: relative; z-index: 35; }
.chat-composer { display: flex; align-items: flex-end; gap: 8px; padding: 10px 12px; min-height: 62px; width: 100%; box-sizing: border-box; }
.chat-composer .composer-left, .chat-composer .composer-right { display:flex; align-items:center; gap:4px; flex:0 0 auto; }
.chat-composer button { width: 38px; height: 38px; border: 0; border-radius: 11px; background: var(--hexa-panel-2); color: var(--hexa-text); cursor:pointer; }
.chat-composer button:hover { background: var(--hexa-accent); color:#fff; }
.chat-composer textarea { flex:1; min-width:0; min-height:40px; max-height:120px; resize:none; border:1px solid var(--hexa-border-strong); border-radius:20px; background:var(--hexa-panel-2); color:var(--hexa-text); padding:10px 14px; line-height:1.35; outline:none; box-sizing:border-box; font:inherit; }
.chat-composer textarea:focus { border-color: var(--hexa-accent); box-shadow: 0 0 0 2px rgba(124,92,255,.12); }
.composer-send { background: var(--hexa-accent) !important; color:#fff !important; }
.voice-recorder-panel, .voice-preview-panel { display:flex; align-items:center; gap:12px; padding:10px 12px; min-height:64px; background:var(--hexa-panel-2); border-bottom:1px solid var(--hexa-border); }
.voice-recorder-live, .voice-preview-heading { display:flex; align-items:center; gap:8px; flex:0 0 auto; white-space:nowrap; }
.voice-recording-dot { width:9px; height:9px; border-radius:50%; background:var(--hexa-danger); box-shadow:0 0 0 0 rgba(255,77,103,.6); animation:hexa-record-pulse 1.3s infinite; }
.voice-recording-time { color:var(--hexa-muted); font-variant-numeric:tabular-nums; }
.voice-waveform { flex:1; min-width:40px; height:32px; display:flex; align-items:center; justify-content:center; gap:3px; overflow:hidden; }
.voice-waveform i { display:block; width:3px; border-radius:999px; background:linear-gradient(180deg,var(--hexa-accent-2),var(--hexa-accent)); opacity:.85; }
.voice-recorder-actions { display:flex; gap:7px; align-items:center; flex:0 0 auto; }
.voice-recorder-actions button { border:1px solid var(--hexa-border); border-radius:999px; padding:9px 13px; background:var(--hexa-panel); color:var(--hexa-text); }
.voice-stop, .voice-send { background:var(--hexa-accent) !important; color:#fff !important; border-color:transparent !important; }
.voice-preview-panel { flex-wrap:wrap; }
.voice-preview-panel audio { width:min(320px,40vw); max-width:100%; height:34px; }
.voice-preview-heading { min-width:150px; }
.voice-preview-heading span { color:var(--hexa-muted); font-size:11px; }
.composer-error { padding:7px 14px; color:#ff9aac; font-size:11px; border-bottom:1px solid var(--hexa-border); }
.attachment-preview-bar { display:flex; align-items:center; justify-content:space-between; gap:10px; padding:7px 12px; border-top:1px solid var(--hexa-border); color:var(--hexa-muted); font-size:11px; }
.attachment-preview-bar button { width:28px; height:28px; border:0; border-radius:50%; background:var(--hexa-panel-3); color:var(--hexa-text); }
@keyframes hexa-record-pulse { 0%,100%{ box-shadow:0 0 0 0 rgba(255,77,103,.45); } 50%{ box-shadow:0 0 0 7px rgba(255,77,103,0); } }

/* ============================================================
   CALL CONTROLS / RESPONSIVE CALL STAGE
   ============================================================ */
.call-controls { flex-wrap:wrap; gap:8px; align-items:center; }
.call-control-button { min-width:102px; padding:10px 13px; border-radius:999px; border:1px solid var(--hexa-border); background:var(--hexa-panel-2); color:var(--hexa-text); font-weight:700; }
.call-control-button.active { background:rgba(255,77,103,.14); border-color:rgba(255,77,103,.35); color:#ff9aac; }
.call-video-grid { min-height:0; overflow:hidden; }
.call-video-grid > audio, .call-audio-stage > audio { display:none; }
.call-local-video.camera-off { opacity:0; pointer-events:none; }
.camera-off-label { position:absolute; inset:0; display:grid; place-items:center; align-content:center; gap:9px; color:#fff; background:radial-gradient(circle at center,rgba(124,92,255,.14),transparent 45%); pointer-events:none; }
.call-avatar .hexa-avatar { margin:0 auto; }

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

@media (max-width: 760px) {
  .chat-layout { height: calc(100dvh - 68px); min-height: 0; }
  .chat-main { width:100%; min-width:0; }
  .messages-area { padding: 12px 9px 10px; }
  .hexa-message-row { gap:5px; margin:5px 0; }
  .hexa-message-row .message-bubble { max-width: min(84vw, 420px); }
  .message-bubble { max-width: min(84vw,420px); }
  .chat-header { padding:0 10px; gap:7px; }
  .chat-header-actions button { width:34px; height:34px; }
  .composer-stack { padding-bottom: env(safe-area-inset-bottom); }
  .chat-composer { padding:7px 8px; gap:5px; }
  .chat-composer textarea { min-height:38px; padding:9px 12px; border-radius:18px; font-size:14px; }
  .chat-composer button { width:36px; height:36px; }
  .voice-recorder-panel, .voice-preview-panel { padding:8px; gap:7px; }
  .voice-waveform { display:none; }
  .voice-recorder-live { min-width:0; flex:1; }
  .voice-recorder-live strong { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:11px; }
  .voice-recorder-actions button { padding:8px 10px; }
  .voice-preview-panel audio { width:100%; flex:1 1 100%; order:3; }
  .voice-preview-heading { flex:1; }
  .attachment-preview-bar { font-size:10px; }
  .call-shell { width:100vw; height:100dvh; max-height:none; border-radius:0; border-left:0; border-right:0; }
  .call-header { padding:12px 14px; }
  .call-local-video { width:30vw; max-width:150px; right:10px; bottom:10px; }
  .call-controls { padding:10px; padding-bottom:calc(10px + env(safe-area-inset-bottom)); }
  .call-control-button, .danger-button { min-width:0; flex:1 1 42%; padding:10px 8px; font-size:11px; }
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
.notifications-panel{position:absolute;right:22px;top:72px;width:min(390px,calc(100vw - 28px));background:var(--hexa-panel);border:1px solid var(--hexa-border-strong);border-radius:18px;box-shadow:var(--hexa-shadow);z-index:100;padding:10px}.notifications-header{display:flex;justify-content:space-between;align-items:center;padding:12px 10px;border-bottom:1px solid var(--hexa-border)}.notifications-header button{background:none;border:0;color:var(--hexa-accent-2)}.notification-item{display:flex;gap:12px;padding:14px 10px;border-bottom:1px solid var(--hexa-border)}.notification-item>span{color:var(--hexa-accent)}.notification-item p{margin:4px 0;color:var(--hexa-muted)}.notification-item small{color:var(--hexa-muted)}.notification-empty{padding:28px;text-align:center;color:var(--hexa-muted)}.notification-button{position:relative}.notification-button b{position:absolute;right:0;top:-5px;min-width:17px;height:17px;padding:0 4px;border-radius:99px;background:var(--hexa-danger);font-size:9px;display:grid;place-items:center;color:#fff}.entity-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:14px}.entity-card{padding:20px;border:1px solid var(--hexa-border);background:var(--hexa-panel);border-radius:18px;display:flex;flex-direction:column;gap:9px}.entity-card span,.entity-card small{color:var(--hexa-muted)}.entity-modal,.status-modal{width:min(620px,calc(100vw - 28px));max-height:90vh;overflow:auto;background:var(--hexa-panel);border:1px solid var(--hexa-border-strong);border-radius:22px;padding:22px;box-shadow:var(--hexa-shadow)}.modal-input{width:100%;margin:8px 0;padding:13px 14px;border-radius:12px;border:1px solid var(--hexa-border);background:rgba(255,255,255,.035);color:var(--hexa-text);outline:none}.modal-textarea{min-height:90px;resize:vertical}.media-picker{width:100%;display:flex;align-items:center;gap:14px;text-align:left;padding:12px;border:1px dashed var(--hexa-border-strong);border-radius:14px;background:transparent;color:var(--hexa-text);margin:8px 0 14px}.media-picker img{width:52px;height:52px;border-radius:12px;object-fit:cover}.media-picker span{width:52px;height:52px;border-radius:12px;display:grid;place-items:center;background:var(--hexa-panel-3);font-size:25px}.media-picker small{display:block;color:var(--hexa-muted);margin-top:3px}.member-picker{display:grid;gap:7px;max-height:180px;overflow:auto;margin-bottom:16px}.member-option{display:flex;align-items:center;gap:9px;padding:7px;border-radius:10px}.member-option:hover{background:rgba(255,255,255,.04)}.status-composer-tabs{display:flex;gap:8px;margin-bottom:10px}.status-composer-tabs button{flex:1;padding:11px;border:1px solid var(--hexa-border);background:var(--hexa-panel-2);color:var(--hexa-text);border-radius:11px}.status-media-preview img,.status-media-preview video{width:100%;max-height:300px;object-fit:contain;border-radius:14px;margin:8px 0}.privacy-row{display:flex;align-items:center;justify-content:space-between;margin:12px 0;color:var(--hexa-muted)}.privacy-row select{background:var(--hexa-panel-2);color:var(--hexa-text);border:1px solid var(--hexa-border);padding:9px;border-radius:10px}.status-card.unseen .status-preview{box-shadow:0 0 0 3px var(--hexa-accent)}.status-card.seen{opacity:.8}.status-preview img,.status-preview video{width:100%;height:100%;object-fit:cover;border-radius:inherit}.story-viewer{position:fixed;inset:0;background:rgba(0,0,0,.92);z-index:500;display:grid;place-items:center;padding:20px}.story-content{width:min(520px,100%);height:min(88vh,820px);position:relative;background:#000;border-radius:20px;overflow:hidden;display:flex;align-items:center;justify-content:center}.story-content img,.story-content video{width:100%;height:100%;object-fit:contain}.story-text{font-size:34px;font-weight:800;text-align:center;padding:30px}.story-caption{position:absolute;left:18px;right:18px;bottom:58px;padding:10px;border-radius:10px;background:rgba(0,0,0,.45)}.story-actions{position:absolute;bottom:10px;right:12px;display:flex;gap:6px}.story-actions button,.story-close{border:0;background:rgba(255,255,255,.12);color:#fff;border-radius:50%;width:38px;height:38px}.story-close{position:absolute;right:22px;top:20px;z-index:2;font-size:25px}.story-progress{position:absolute;top:12px;left:20px;right:20px;height:3px;background:rgba(255,255,255,.35);z-index:2}.search-results{display:grid;gap:6px;padding:8px}.search-person{display:flex;align-items:center;gap:12px;padding:10px;border:0;background:transparent;color:var(--hexa-text);text-align:left;border-radius:12px}.search-person:hover{background:rgba(255,255,255,.05)}.search-person div{flex:1}.search-person span{display:block;color:var(--hexa-muted);font-size:12px}.search-person b{font-size:12px;color:var(--hexa-accent-2)}.settings-grid{display:grid;gap:12px;max-width:760px}.settings-card{display:flex;align-items:center;gap:16px;justify-content:space-between;padding:18px;border:1px solid var(--hexa-border);background:var(--hexa-panel);border-radius:18px}.settings-card>div:first-child{flex:1}.settings-card p{color:var(--hexa-muted);margin:5px 0 0}.settings-card button{border:1px solid var(--hexa-border);background:var(--hexa-panel-2);color:var(--hexa-text);padding:10px 14px;border-radius:10px}.settings-card.danger button{color:#fff;background:var(--hexa-danger);border-color:transparent}
.reply-bar{display:flex;justify-content:space-between;gap:12px;align-items:center;padding:8px 14px;background:var(--hexa-panel-2);border-top:1px solid var(--hexa-border);font-size:12px;color:var(--hexa-muted)}.reply-bar button{border:0;background:none;color:var(--hexa-text)}.message-bubble-wrap{position:relative;max-width:86%}.message-tools{display:none;position:absolute;right:0;top:-34px;background:var(--hexa-panel);border:1px solid var(--hexa-border);border-radius:10px;padding:3px;z-index:4}.message-bubble-wrap:hover .message-tools{display:flex}.message-tools button{border:0;background:none;color:var(--hexa-text);padding:5px}.reaction-picker{position:absolute;bottom:32px;right:0;display:flex;background:var(--hexa-panel);border:1px solid var(--hexa-border);border-radius:14px;padding:5px;box-shadow:var(--hexa-shadow)}.reaction-summary{font-size:12px;background:var(--hexa-panel-2);border-radius:10px;padding:3px 7px;display:inline-block;margin-top:3px}.message-media{display:block;max-width:280px;max-height:340px;border-radius:12px;object-fit:contain}.gif-panel{position:absolute;left:14px;right:14px;bottom:76px;background:var(--hexa-panel);border:1px solid var(--hexa-border-strong);border-radius:16px;padding:10px;z-index:30;box-shadow:var(--hexa-shadow)}.gif-search{display:flex;gap:7px}.gif-search input{flex:1}.gif-grid{display:grid;grid-template-columns:repeat(6,1fr);gap:6px;max-height:240px;overflow:auto;margin-top:8px}.gif-grid button{padding:0;border:0;background:none}.gif-grid img{width:100%;height:70px;object-fit:cover;border-radius:7px}.muted{color:var(--hexa-muted)}

/* HEXA wallet UI */
.wallet-credit-modal{width:min(560px,calc(100vw - 28px))}.wallet-security-field{display:grid;gap:4px;margin-top:10px}.wallet-security-field>span{font-size:11px;color:var(--hexa-muted)}.wallet-security-note{margin:12px 0;padding:12px;border:1px solid var(--hexa-border);background:rgba(124,92,255,.07);border-radius:12px;color:var(--hexa-muted);font-size:11px;line-height:1.5}.wallet-buy-button{width:100%;margin-top:8px}.hexa-modal-backdrop{position:fixed;inset:0;z-index:900;background:rgba(0,0,0,.72);display:grid;place-items:center;padding:14px}
.wallet-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px}.wallet-balance-card{padding:24px;border:1px solid var(--hexa-border);background:linear-gradient(135deg,var(--hexa-panel),var(--hexa-panel-2));border-radius:20px;display:grid;gap:8px}.wallet-balance-card span{color:var(--hexa-muted);font-size:11px}.wallet-balance-card strong{font-size:32px;letter-spacing:-.03em}.wallet-balance-card small{color:var(--hexa-muted);font-size:10px}.wallet-fund-card{align-items:center}.wallet-fund-card .modal-input{margin:0}.wallet-fund-card .hero-primary{white-space:nowrap}

/* HEXA master feature UI */
.hexa-audio-message{display:flex;align-items:center;gap:7px}.hexa-audio-message audio{max-width:210px;height:34px}.hexa-audio-message select{background:var(--hexa-panel-2);color:var(--hexa-text);border:1px solid var(--hexa-border);border-radius:8px;padding:4px}.message-context-menu{position:fixed;z-index:1000;min-width:190px;background:var(--hexa-panel);border:1px solid var(--hexa-border-strong);border-radius:14px;padding:6px;box-shadow:var(--hexa-shadow);display:grid;gap:2px}.message-context-menu button{border:0;background:none;color:var(--hexa-text);padding:10px;text-align:left;border-radius:9px}.message-context-menu button:hover{background:rgba(255,255,255,.06)}.message-context-menu .danger-text{color:var(--hexa-danger)}.emoji-panel,.sticker-panel,.feature-popover,.chat-settings-popover{position:absolute;z-index:40;background:var(--hexa-panel);border:1px solid var(--hexa-border-strong);border-radius:16px;box-shadow:var(--hexa-shadow);padding:12px}.emoji-panel{left:12px;bottom:76px;width:min(410px,calc(100% - 24px))}.emoji-tones,.emoji-grid,.sticker-grid{display:flex;flex-wrap:wrap;gap:5px}.emoji-grid{max-height:220px;overflow:auto;margin-top:8px}.emoji-panel button,.sticker-grid button{border:0;background:transparent;font-size:21px;padding:6px;border-radius:8px}.emoji-panel button:hover,.sticker-grid button:hover{background:rgba(255,255,255,.06)}.sticker-panel{left:12px;bottom:76px;width:300px}.sticker-grid{margin-top:10px}.sticker-grid button{font-size:30px}.feature-popover{right:12px;bottom:76px;width:min(360px,calc(100% - 24px));display:grid;gap:8px}.feature-popover h3{margin:0}.chat-settings-popover{right:12px;top:64px;width:270px;display:grid;gap:10px;z-index:60}.chat-settings-popover label{display:grid;gap:6px;color:var(--hexa-muted);font-size:12px}.chat-settings-popover select,.chat-settings-popover button{padding:9px;border-radius:9px;border:1px solid var(--hexa-border);background:var(--hexa-panel-2);color:var(--hexa-text)}.chat-search-results{padding:10px;border-top:1px solid var(--hexa-border);display:grid;gap:5px}.chat-search-results button{border:0;background:transparent;color:var(--hexa-muted);text-align:left;padding:6px}.poll-message{display:grid;gap:7px;min-width:220px}.poll-message button{display:flex;justify-content:space-between;gap:10px;padding:9px;border-radius:9px;border:1px solid var(--hexa-border);background:var(--hexa-panel-2);color:var(--hexa-text);text-align:left}.poll-message button span{color:var(--hexa-muted);font-size:10px}.shared-contact{display:flex;gap:10px;align-items:center;min-width:190px}.shared-contact div{display:grid}.shared-contact small{color:var(--hexa-muted)}.location-card{color:inherit;text-decoration:none;display:block;padding:4px}.file-message{display:flex;gap:8px;align-items:center}.forwarded-label{font-size:10px;color:var(--hexa-muted);margin-bottom:5px}.sticker-message{font-size:70px;line-height:1}.view-once-bubble{min-width:100px}.universal-search-result{display:flex;align-items:center;gap:10px;width:100%}.universal-search-result-copy{flex:1}.universal-search-result>b{text-transform:uppercase;font-size:9px;color:var(--hexa-accent-2)}

`;

const APP_STYLES = APP_STYLES_HEAD + APP_STYLES_TAIL + `
/* Refined Settings UI */
.settings-page{max-width:1100px;margin:0 auto;padding-bottom:40px}.settings-page .page-heading{margin-bottom:18px}.hexa-profile-settings{position:relative;overflow:hidden;background:linear-gradient(135deg,var(--hexa-panel),var(--hexa-panel-2));box-shadow:0 16px 40px rgba(0,0,0,.12)}.hexa-profile-settings:after{content:"";position:absolute;inset:auto -90px -120px auto;width:260px;height:260px;border-radius:50%;background:var(--hexa-accent);opacity:.08;filter:blur(4px);pointer-events:none}.settings-layout-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin-top:16px}.settings-feature-card{min-height:92px;position:relative;transition:transform .16s ease,border-color .16s ease,background .16s ease;cursor:default}.settings-feature-card.settings-clickable{cursor:pointer}.settings-feature-card:hover{transform:translateY(-2px);border-color:var(--hexa-border-strong);background:var(--hexa-panel-2)}.settings-feature-icon{width:42px;height:42px;flex:0 0 42px;border-radius:13px;display:grid;place-items:center;background:color-mix(in srgb,var(--hexa-accent) 15%,transparent);border:1px solid color-mix(in srgb,var(--hexa-accent) 26%,var(--hexa-border));font-size:19px}.settings-feature-copy{min-width:0;flex:1}.settings-feature-copy strong{display:block;font-size:15px}.settings-feature-copy p{font-size:12px;line-height:1.5}.settings-feature-card>button{white-space:nowrap}.settings-account-footer{margin-top:14px}.settings-account-footer .settings-feature-copy{padding-right:8px}.settings-status{display:inline-flex;align-items:center;gap:6px;padding:7px 10px;border:1px solid var(--hexa-border);border-radius:999px;background:var(--hexa-panel-2);color:var(--hexa-accent-2);font-size:12px;font-weight:700;white-space:nowrap}.settings-danger-button{color:#fff!important;background:var(--hexa-danger)!important;border-color:transparent!important}.settings-footer-avatar{display:grid;place-items:center}.subscription-page .page-heading,.settings-page .page-heading{align-items:center}
@media (max-width:760px){.settings-layout-grid{grid-template-columns:1fr}.settings-card{padding:14px;border-radius:16px}.settings-feature-card{min-height:80px}.settings-feature-card p{font-size:11px}.settings-account-footer{align-items:center}.settings-account-footer .settings-danger-button{width:100%}.settings-account-footer{display:grid;grid-template-columns:auto 1fr}.settings-account-footer .settings-danger-button{grid-column:1 / -1}.hexa-profile-settings{align-items:center}.settings-page{padding:0 4px 30px}}
`;

const COMMUNICATION_UI_OVERRIDES = `
/* ============================================================
   HEXACHI COMMUNICATION-FIRST UI OVERRIDES
   ============================================================ */
.hexa-app{background:radial-gradient(circle at 72% -10%,rgba(124,92,255,.08),transparent 28%),var(--hexa-bg);}
.hexa-sidebar{width:226px;min-width:226px;padding:16px 11px;background:rgba(8,11,16,.94);backdrop-filter:blur(20px);}
.sidebar-brand{padding:5px 8px 18px;}
.sidebar-brand strong{font-size:15px;letter-spacing:.12em;}
.sidebar-brand span{font-size:8px;letter-spacing:.14em;color:var(--hexa-accent-2);}
.sidebar-section-label{padding:7px 10px 8px;font-size:8px;color:#606b7b;}
.sidebar-nav{display:grid;gap:2px;}
.sidebar-item{padding:10px 11px;border-radius:12px;font-size:12px;}
.sidebar-item.active{background:linear-gradient(90deg,rgba(124,92,255,.2),rgba(124,92,255,.05));box-shadow:inset 2px 0 0 var(--hexa-accent);}
.sidebar-bottom{padding-top:11px;}
.hexa-topbar{height:62px;min-height:62px;padding:0 18px;background:rgba(6,9,13,.78);}
.topbar-search{max-width:720px;}
.topbar-search input{height:41px;border-radius:13px;background:rgba(255,255,255,.035);border-color:var(--hexa-border-strong);}
.hexa-content{overflow:auto;background:linear-gradient(180deg,rgba(255,255,255,.008),transparent 24%);}
.workspace-page{max-width:1280px;padding:24px;}
.chat-layout{height:calc(100dvh - 62px);grid-template-columns:340px minmax(0,1fr);}
.chat-list-panel{background:rgba(7,10,14,.72);backdrop-filter:blur(16px);}
.chat-list-header{padding:18px 17px 14px;}
.chat-list-header h2{font-size:20px;letter-spacing:-.02em;}
.chat-search{margin:0 13px 12px;}
.chat-search input{height:42px;border-radius:12px;background:rgba(255,255,255,.035);}
.conversation{padding:11px 10px;min-height:66px;}
.conversation-content strong{font-size:12px;}
.chat-main{background:radial-gradient(circle at 50% 0,rgba(124,92,255,.055),transparent 42%),rgba(6,9,13,.45);}
.chat-header{height:64px;min-height:64px;padding:0 15px;background:rgba(8,11,16,.68);backdrop-filter:blur(16px);}
.messages-area{padding:18px 20px 12px;}
.message-bubble{border-radius:15px;box-shadow:0 4px 20px rgba(0,0,0,.08);}
.chat-composer{padding:10px 12px calc(10px + env(safe-area-inset-bottom));background:rgba(7,10,14,.78);backdrop-filter:blur(18px);border-top:1px solid var(--hexa-border);}
.chat-composer textarea{background:rgba(255,255,255,.045);border-color:var(--hexa-border-strong);min-height:42px;padding:10px 15px;}
.chat-composer button{background:transparent;border:1px solid transparent;}
.chat-composer button:hover{background:rgba(124,92,255,.16);color:var(--hexa-text);border-color:rgba(124,92,255,.25);}
@media(max-width:760px){
  .hexa-topbar{height:58px;min-height:58px;padding:0 9px 0 8px;gap:7px;}
  .mobile-page-title{font-size:12px;letter-spacing:.14em;}
  .topbar-search{margin-left:0;}
  .topbar-search input{height:38px;font-size:12px;border-radius:12px;padding-left:35px;padding-right:10px;}
  .chat-layout{height:calc(100dvh - 58px);grid-template-columns:1fr;}
  .chat-list-panel{display:none;}
  .chat-header{height:58px;min-height:58px;padding:0 9px;}
  .messages-area{padding:10px 8px 8px;}
  .chat-composer{padding:6px 6px calc(6px + env(safe-area-inset-bottom));gap:4px;}
  .chat-composer .composer-left,.chat-composer .composer-right{gap:2px;}
  .chat-composer button{width:36px;height:36px;border-radius:10px;}
  .chat-composer textarea{min-height:38px;max-height:96px;border-radius:18px;font-size:14px;padding:8px 12px;}
  .sidebar-item{padding:12px 11px;}
}


/* ============================================================
   HEXACHI MOBILE-FIRST POLISH
   ============================================================ */
.mobile-bottom-nav{display:none;}
@media (max-width:760px){
  :root{--mobile-nav-h:68px;--mobile-top-h:58px;}
  html,body,#root{width:100%;min-width:0;max-width:100%;overflow:hidden;}
  .hexa-app{width:100%;height:100dvh;min-height:100dvh;overflow:hidden;}
  .hexa-main{min-width:0;width:100%;height:100%;overflow:hidden;}
  .hexa-content{height:calc(100dvh - var(--mobile-top-h));min-height:0;padding-bottom:var(--mobile-nav-h);box-sizing:border-box;overflow:hidden;}
  .hexa-topbar{position:relative;height:var(--mobile-top-h);min-height:var(--mobile-top-h);padding:0 8px;box-sizing:border-box;gap:6px;}
  .mobile-menu-button{left:8px;top:10px;width:38px;height:38px;border-radius:12px;z-index:95;}
  .mobile-page-title{margin-left:48px;min-width:58px;white-space:nowrap;}
  .topbar-search{flex:1;min-width:0;}
  .topbar-search input{width:100%;height:38px;padding:0 10px 0 32px;font-size:12px;border-radius:12px;box-sizing:border-box;}
  .chat-layout{height:calc(100dvh - var(--mobile-top-h) - var(--mobile-nav-h));min-height:0;}
  .chat-main{height:100%;min-height:0;display:flex;flex-direction:column;}
  .chat-header{flex:0 0 58px;height:58px;min-height:58px;padding:0 8px;gap:7px;box-sizing:border-box;}
  .chat-header-copy{min-width:0;flex:1;}
  .chat-header-copy strong,.chat-header-copy span{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
  .chat-header-copy strong{font-size:13px;}
  .chat-header-copy span{font-size:10px;}
  .chat-header-actions{display:flex;gap:3px;flex:0 0 auto;}
  .chat-header-actions button{width:34px;height:34px;border-radius:10px;}
  .chat-header-actions button:nth-child(n+4){display:none;}
  .messages-area{flex:1;min-height:0;overflow-y:auto;overflow-x:hidden;padding:10px 8px 8px;scroll-padding-bottom:90px;-webkit-overflow-scrolling:touch;}
  .hexa-message-row{width:100%;display:flex;align-items:flex-end;gap:5px;margin:3px 0;}
  .hexa-message-row.mine{justify-content:flex-end;}
  .hexa-message-row.incoming{justify-content:flex-start;}
  .hexa-message-row .message-bubble-wrap{min-width:0;max-width:calc(100vw - 54px);}
  .hexa-message-row .message-bubble{max-width:100%;padding:8px 10px;font-size:14px;line-height:1.35;border-radius:15px;overflow-wrap:anywhere;word-break:break-word;}
  .hexa-message-row.mine .message-bubble{border-bottom-right-radius:5px;}
  .hexa-message-row.incoming .message-bubble{border-bottom-left-radius:5px;}
  .message-media{max-width:min(72vw,280px);height:auto;}
  .composer-stack{position:relative;flex:0 0 auto;z-index:45;}
  .chat-composer{min-height:56px;padding:6px 7px calc(6px + env(safe-area-inset-bottom));gap:4px;align-items:flex-end;}
  .chat-composer .composer-left,.chat-composer .composer-right{gap:2px;}
  .chat-composer button{width:35px;height:35px;min-width:35px;border-radius:11px;font-size:15px;}
  .chat-composer textarea{min-height:37px;max-height:88px;padding:9px 11px;border-radius:18px;font-size:14px;line-height:1.3;}
  .composer-send{width:36px!important;height:36px!important;min-width:36px!important;border-radius:50%!important;}
  .voice-recorder-panel,.voice-preview-panel{min-height:58px;padding:7px 8px;gap:6px;flex-wrap:nowrap;}
  .voice-recorder-live,.voice-preview-heading{min-width:0;flex:1;}
  .voice-recorder-live strong{font-size:11px;}
  .voice-waveform{display:flex;min-width:34px;gap:2px;height:22px;}
  .voice-waveform i{width:2px;}
  .voice-recorder-actions{gap:4px;}
  .voice-recorder-actions button{padding:8px 9px;font-size:10px;white-space:nowrap;}
  .voice-preview-panel{flex-wrap:wrap;}
  .voice-preview-panel audio{width:100%;order:4;height:32px;}
  .emoji-panel,.sticker-panel,.feature-popover,.gif-panel{position:fixed;left:8px;right:8px;bottom:calc(var(--mobile-nav-h) + 58px + env(safe-area-inset-bottom));width:auto;max-height:56dvh;overflow:auto;z-index:120;}
  .emoji-grid{max-height:38dvh;}
  .mobile-bottom-nav{position:fixed;display:grid;grid-template-columns:repeat(5,1fr);left:0;right:0;bottom:0;height:var(--mobile-nav-h);padding:5px 4px calc(5px + env(safe-area-inset-bottom));box-sizing:border-box;background:rgba(7,10,14,.96);backdrop-filter:blur(22px);-webkit-backdrop-filter:blur(22px);border-top:1px solid var(--hexa-border-strong);z-index:100;}
  .mobile-bottom-nav button{border:0;background:transparent;color:var(--hexa-muted);display:grid;place-items:center;align-content:center;gap:3px;border-radius:13px;font-size:9px;min-width:0;}
  .mobile-bottom-nav button.active{color:var(--hexa-text);background:rgba(124,92,255,.15);}
  .mobile-bottom-icon{font-size:20px;line-height:1;}
  .workspace-page,.page{padding:14px 10px 20px;}
  .status-row{overflow-x:auto;padding-bottom:5px;-webkit-overflow-scrolling:touch;}
  .status-card{flex:0 0 118px;}
  .entity-grid,.feature-grid{grid-template-columns:1fr!important;}
  .entity-card{padding:15px;}
  .notifications-panel{position:fixed;left:8px;right:8px;top:62px;width:auto;max-height:60dvh;overflow:auto;}
  .hexa-modal-overlay{padding:8px;align-items:end;}
  .hexa-modal,.entity-modal,.status-modal{width:100%;max-width:none;max-height:86dvh;border-radius:20px 20px 12px 12px;padding:16px;}
  .call-shell{width:100vw;height:100dvh;max-height:none;border-radius:0;}
}
@media (max-width:420px){
  .mobile-page-title{display:none;}
  .mobile-menu-button{top:10px;left:7px;width:36px;height:36px;}
  .topbar-search{margin-left:43px;}
  .chat-header-copy strong{font-size:12px;}
  .chat-header-actions button{width:31px;height:31px;}
  .chat-composer button{width:33px;height:33px;min-width:33px;}
  .composer-send{width:35px!important;height:35px!important;min-width:35px!important;}
  .chat-composer textarea{font-size:13px;padding:8px 10px;}
  .hexa-message-row .message-bubble-wrap{max-width:calc(100vw - 42px);}
  .hexa-message-row .message-bubble{font-size:13px;padding:7px 9px;}
  .hexa-message-row .hexa-avatar{display:none;}
  .voice-waveform{display:none;}
  .voice-recorder-actions button{padding:7px 8px;font-size:10px;}
  .mobile-bottom-nav{height:64px;}
  .mobile-bottom-icon{font-size:18px;}
}
`;


