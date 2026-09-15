import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
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

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY;

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || "0x4AAAAAAE2fwQUazL1ercgF";
const HEXA_TURNSTILE_WIDGET_KEY = "__HEXA_TURNSTILE_WIDGET_ID__";

function getCurrentTurnstileToken(fallback = "") {
  try {
    const widgetId = typeof window !== "undefined" ? window[HEXA_TURNSTILE_WIDGET_KEY] : null;
    if (widgetId !== null && widgetId !== undefined && window.turnstile?.getResponse) {
      const liveToken = window.turnstile.getResponse(widgetId);
      if (liveToken) return liveToken;
    }
  } catch {}
  return fallback || "";
}

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
const HEXA_EXPLICIT_SIGNOUT_KEY = "hexa-explicit-signout-v1";
const HEXA_GUEST_NOTICE_KEY = "hexa-guest-notice-seen-v1";

function hasPersistedSupabaseSessionInBrowser() {
  if (typeof window === "undefined") return false;
  try {
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i) || "";
      if (!key.startsWith("sb-")) continue;
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      try {
        const parsed = JSON.parse(raw);
        if (parsed?.access_token || parsed?.refresh_token || parsed?.currentSession?.access_token) return true;
      } catch {
        if (raw.includes("access_token") || raw.includes("refresh_token")) return true;
      }
    }
  } catch {}
  return false;
}

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
const HEXA_CALL_RATE_KOBO_PER_SECOND = 50;


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

const HEXA_LANGUAGES = [
  ["en","English"],["yo","Yorùbá"],["ig","Igbo"],["ha","Hausa"],["fr","Français"],["es","Español"],["pt","Português"],["de","Deutsch"],["it","Italiano"],["nl","Nederlands"],["sv","Svenska"],["no","Norsk"],["da","Dansk"],["fi","Suomi"],["is","Íslenska"],["ga","Gaeilge"],["cy","Cymraeg"],["pl","Polski"],["cs","Čeština"],["sk","Slovenčina"],["hu","Magyar"],["ro","Română"],["bg","Български"],["sr","Српски"],["hr","Hrvatski"],["sl","Slovenščina"],["uk","Українська"],["ru","Русский"],["be","Беларуская"],["lt","Lietuvių"],["lv","Latviešu"],["et","Eesti"],["el","Ελληνικά"],["tr","Türkçe"],["az","Azərbaycan"],["ka","ქართული"],["hy","Հայերեն"],["he","עברית"],["ar","العربية"],["fa","فارسی"],["ur","اردو"],["ps","پښتو"],["ku","Kurdî"],["hi","हिन्दी"],["bn","বাংলা"],["pa","ਪੰਜਾਬੀ"],["gu","ગુજરાતી"],["mr","मराठी"],["ne","नेपाली"],["si","සිංහල"],["ta","தமிழ்"],["te","తెలుగు"],["kn","ಕನ್ನಡ"],["ml","മലയാളം"],["or","ଓଡ଼ିଆ"],["as","অসমীয়া"],["ur-PK","اردو (پاکستان)"],["th","ไทย"],["lo","ລາວ"],["km","ខ្មែរ"],["my","မြန်မာ"],["vi","Tiếng Việt"],["id","Bahasa Indonesia"],["ms","Bahasa Melayu"],["jv","Basa Jawa"],["su","Basa Sunda"],["tl","Filipino"],["ceb","Cebuano"],["zh-CN","简体中文"],["zh-TW","繁體中文"],["ja","日本語"],["ko","한국어"],["mn","Монгол"],["bo","བོད་སྐད"],["dz","རྫོང་ཁ"],["kk","Қазақша"],["ky","Кыргызча"],["uz","O‘zbekcha"],["tg","Тоҷикӣ"],["tk","Türkmençe"],["tt","Татарча"],["ug","ئۇيغۇرچە"],["sw","Kiswahili"],["zu","isiZulu"],["xh","isiXhosa"],["af","Afrikaans"],["am","አማርኛ"],["so","Soomaali"],["rw","Kinyarwanda"],["sn","chiShona"],["st","Sesotho"],["tn","Setswana"],["ny","Chichewa"],["mg","Malagasy"],["eo","Esperanto"],["la","Latina"],["mt","Malti"],["sq","Shqip"],["bs","Bosanski"],["mk","Македонски"],["mo","Moldovan"],["br","Brezhoneg"],["co","Corsu"],["lb","Lëtzebuergesch"],["fy","Frysk"],["gd","Gàidhlig"],["jv","Jawa"],["mi","Māori"],["sm","Gagana Samoa"],["to","Lea faka-Tonga"],["fj","Fiji Hindi"],["haw","ʻŌlelo Hawaiʻi"],["ht","Kreyòl Ayisyen"],["sw-CD","Kiswahili (Congo)"],["es-MX","Español (México)"],["en-GB","English (UK)"],["en-US","English (US)"],["pt-BR","Português (Brasil)"],["fr-CA","Français (Canada)"],["de-CH","Deutsch (Schweiz)"],["it-CH","Italiano (Svizzera)"],["zh-HK","繁體中文 (香港)"],["ar-EG","العربية (مصر)"],["ha-Latn-NG","Hausa (Nigeria)"],["yo-NG","Yorùbá (Nigeria)"],["ig-NG","Igbo (Nigeria)"],
];
const HEXA_LANGUAGE_MAP = Object.fromEntries(HEXA_LANGUAGES.map(([code,name]) => [code,{code,name}]));
const HEXA_LANGUAGE_STORAGE_KEY = "hexa-language-v2";
function getSavedHexaLanguage(){ try{return localStorage.getItem(HEXA_LANGUAGE_STORAGE_KEY)||"en";}catch{return "en";} }
function saveHexaLanguage(code){ try{localStorage.setItem(HEXA_LANGUAGE_STORAGE_KEY, code);}catch{} document.documentElement.lang=code; window.dispatchEvent(new CustomEvent("hexa-language-change",{detail:code})); }
const HEXA_LANGUAGE_TRANSLATIONS = {
  en:{workspace:"Workspace",settings:"Settings",appearance:"Appearance",language:"Language",save:"Save",search:"Search",chat:"Chat",calls:"Calls",groups:"Groups",communities:"Communities",channels:"Channels",moments:"Moments",notifications:"Notifications",kora:"Kora"},
  yo:{workspace:"Ibi iṣẹ́",profile:"Àkọọ́lẹ̀",settings:"Ètò",appearance:"Ìrísí",language:"Èdè",save:"Fipamọ́",search:"Wá",chat:"Ìfọ̀rọ̀wérọ̀",calls:"Ìpè",groups:"Àwọn ẹgbẹ́",communities:"Àwùjọ",channels:"Àwọn ikanni",moments:"Àwọn ìṣẹ̀lẹ̀",notifications:"Àwọn ìfitónilétí",kora:"Kora"},
  ig:{workspace:"Ọrụ",profile:"Profaịlụ",settings:"Ntọala",appearance:"Ọdịdị",language:"Asụsụ",save:"Chekwaa",search:"Chọọ",chat:"Mkparịta ụka",calls:"Oku",groups:"Otu",communities:"Obodo",channels:"Ọwa",moments:"Ọnọdụ",notifications:"Ọkwa",kora:"Kora"},
  ha:{workspace:"Wurin aiki",profile:"Bayanan martaba",settings:"Saituna",appearance:"Bayyanar",language:"Harshe",save:"Ajiye",search:"Nema",chat:"Hira",calls:"Kira",groups:"Ƙungiyoyi",communities:"Al'umma",channels:"Tashoshi",moments:"Labarai",notifications:"Sanarwa",kora:"Kora"},
  fr:{workspace:"Espace de travail",profile:"Profil",settings:"Paramètres",appearance:"Apparence",language:"Langue",save:"Enregistrer",search:"Rechercher",chat:"Discussions",calls:"Appels",groups:"Groupes",communities:"Communautés",channels:"Chaînes",moments:"Moments",notifications:"Notifications",kora:"Kora"},
  es:{workspace:"Espacio de trabajo",profile:"Perfil",settings:"Ajustes",appearance:"Apariencia",language:"Idioma",save:"Guardar",search:"Buscar",chat:"Chats",calls:"Llamadas",groups:"Grupos",communities:"Comunidades",channels:"Canales",moments:"Momentos",notifications:"Notificaciones",kora:"Kora"},
  de:{workspace:"Arbeitsbereich",profile:"Profil",settings:"Einstellungen",appearance:"Darstellung",language:"Sprache",save:"Speichern",search:"Suchen",chat:"Chats",calls:"Anrufe",groups:"Gruppen",communities:"Communitys",channels:"Kanäle",moments:"Momente",notifications:"Benachrichtigungen",kora:"Kora"},
  pt:{workspace:"Área de trabalho",profile:"Perfil",settings:"Definições",appearance:"Aparência",language:"Idioma",save:"Guardar",search:"Pesquisar",chat:"Conversas",calls:"Chamadas",groups:"Grupos",communities:"Comunidades",channels:"Canais",moments:"Momentos",notifications:"Notificações",kora:"Kora"},
  ar:{workspace:"مساحة العمل",profile:"الملف الشخصي",settings:"الإعدادات",appearance:"المظهر",language:"اللغة",save:"حفظ",search:"بحث",chat:"الدردشة",calls:"المكالمات",groups:"المجموعات",communities:"المجتمعات",channels:"القنوات",moments:"اللحظات",notifications:"الإشعارات",kora:"Kora"},
  hi:{workspace:"कार्यक्षेत्र",profile:"प्रोफ़ाइल",settings:"सेटिंग्स",appearance:"रूप",language:"भाषा",save:"सहेजें",search:"खोजें",chat:"चैट",calls:"कॉल",groups:"समूह",communities:"समुदाय",channels:"चैनल",moments:"मोमेंट्स",notifications:"सूचनाएँ",kora:"Kora"},
  sw:{workspace:"Eneo la kazi",profile:"Wasifu",settings:"Mipangilio",appearance:"Mwonekano",language:"Lugha",save:"Hifadhi",search:"Tafuta",chat:"Mazungumzo",calls:"Simu",groups:"Vikundi",communities:"Jumuiya",channels:"Vituo",moments:"Matukio",notifications:"Arifa",kora:"Kora"},
  "zh-CN":{settings:"设置",appearance:"外观",language:"语言",save:"保存",search:"搜索",chat:"聊天",calls:"通话",groups:"群组",communities:"社区",channels:"频道",moments:"动态",notifications:"通知",kora:"Kora"},
  ja:{settings:"設定",appearance:"外観",language:"言語",save:"保存",search:"検索",chat:"チャット",calls:"通話",groups:"グループ",communities:"コミュニティ",channels:"チャンネル",moments:"モーメント",notifications:"通知",kora:"Kora"},
  ko:{settings:"설정",appearance:"화면",language:"언어",save:"저장",search:"검색",chat:"채팅",calls:"통화",groups:"그룹",communities:"커뮤니티",channels:"채널",moments:"모먼트",notifications:"알림",kora:"Kora"},
};
function hexLang(code,key){const base=String(code||"en").split("-")[0]; return HEXA_LANGUAGE_TRANSLATIONS[code]?.[key] || HEXA_LANGUAGE_TRANSLATIONS[base]?.[key] || HEXA_LANGUAGE_TRANSLATIONS.en[key] || key;}

const HexaLanguageContext = React.createContext({ language: getSavedHexaLanguage(), setLanguage: saveHexaLanguage, t: (key) => key });
function HexaLanguageProvider({ children }) {
  const [language, setLanguageState] = useState(getSavedHexaLanguage);
  useEffect(() => { if (typeof document !== "undefined") { document.documentElement.lang = language; document.documentElement.dataset.hexaLanguage = language; } }, [language]);
  useEffect(() => { const handler = (event) => setLanguageState(event?.detail || getSavedHexaLanguage()); window.addEventListener("hexa-language-change", handler); return () => window.removeEventListener("hexa-language-change", handler); }, []);
  const setLanguage = useCallback((code) => { saveHexaLanguage(code); setLanguageState(code); }, []);
  const t = useCallback((key) => hexLang(language, key), [language]);
  return <HexaLanguageContext.Provider value={{ language, setLanguage, t }}>{children}</HexaLanguageContext.Provider>;
}
function useHexaLanguage(){ return React.useContext(HexaLanguageContext); }

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
    name: "HEXA White",
    icon: "☀️",
    description: "Pure white HEXA with black text and controls.",
    vars: {
      "--hexa-bg": "#ffffff",
      "--hexa-panel": "#ffffff",
      "--hexa-panel-2": "#ffffff",
      "--hexa-panel-3": "#f3f4f6",
      "--hexa-border": "rgba(0,0,0,.09)",
      "--hexa-border-strong": "rgba(0,0,0,.16)",
      "--hexa-text": "#000000",
      "--hexa-muted": "#4b5563",
      "--hexa-accent": "#111111",
      "--hexa-accent-2": "#000000",
      "--hexa-success": "#0b7a4b",
      "--hexa-danger": "#c1121f",
      "--hexa-shadow": "0 24px 70px rgba(0,0,0,.10)",
      "--hexa-chat-bg": "#ffffff",
      "--hexa-message-in": "#f4f4f5",
      "--hexa-message-out": "#000000",
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
  { id: "calls", label: "Calls", icon: "☎" },
  { id: "moments", label: "Moments", icon: "◌" },
  { id: "channels", label: "Channels", icon: "▣" },
  { id: "kora", label: "Kora", icon: "✦" },
  { id: "settings", label: "Settings", icon: "⚙" },
];

const HEXA_FEATURES = [
  ["Messaging", "1:1 chats", "Group chats", "Replies", "Forward", "Edit", "Delete for me/everyone", "Copy", "Star", "Pin", "Search", "Reactions", "Emoji + skin tones", "GIFs", "Stickers", "Animated stickers", "Images", "Videos", "Files", "Audio", "Voice messages", "Playback speed", "Waveform", "Contacts", "Current/live location", "Polls", "Link previews", "Mentions", "Timestamps", "Delivered/read", "Typing/recording", "Unread counts", "Drafts", "Disappearing messages", "View-once media"],
  ["Groups", "Create", "Add/remove members", "Owner", "Multiple admins", "Permissions", "Invite links", "Name/photo/description", "Member search", "Mentions", "Announcements", "Group media/files", "Polls", "Reactions", "Replies", "Group calls", "Participant management", "Leave/report/delete"],
  ["Calls", "1:1 voice", "1:1 video", "Group voice", "Group video", "Incoming/outgoing", "Accept/decline/missed", "Mute", "Speaker", "Camera", "Front/rear camera", "PiP", "Call history", "Add participants", "Call links", "Privacy/security", "WebRTC", "STUN/TURN", "Network quality"],
  ["Moments", "Text/photo/video/GIF", "Captions", "Emoji/stickers/drawing", "Privacy", "Viewers", "Seen/unseen", "Reactions", "Replies", "Navigation", "24-hour expiry", "Delete", "Notifications", "Mute"],
  ["Channels", "Create/follow/unfollow", "Profile", "Posts", "Media", "Links", "Polls", "Reactions", "Forward/share", "Search", "Notifications", "Admins", "Followers", "Privacy", "Verification"],
  ["Search", "Contacts", "Chats", "Messages", "Groups", "Channels", "Media", "Documents", "Links", "GIFs", "Audio", "Date filters", "Within conversation", "Advanced filters"],
  ["Profiles & Contacts", "Photo", "Name", "About", "Phone", "QR", "Add/invite", "Block/report", "Last seen", "Online", "Privacy", "Read receipts", "Group-add controls"],
  ["Privacy & Security", "E2E encryption", "Encrypted calls", "2FA", "Passkeys", "App lock", "Biometrics", "Security notifications", "Disappearing", "View-once", "Privacy checkup", "Device management", "Linked devices", "Logout"],
  ["Media & Files", "Camera", "Gallery", "Multiple selection", "Preview", "Compression", "Original quality", "Download", "Forward", "Delete", "Auto-download", "Storage management"],
  ["Organization", "Starred", "Pinned", "Archived", "Favorites", "Unread", "Chat filters", "Folders/categories", "Saved search"],
  ["Notifications", "Messages", "Groups", "Calls", "Missed calls", "Moments", "Mentions", "Replies", "Reactions", "Channels", "Sounds", "Vibration", "Previews", "Mute", "Custom notifications"],
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
  if (typeof window !== "undefined") {
    return `${window.location.origin}/auth/callback`;
  }

  return `${getAppUrl()}/auth/callback`;
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

function safeAlert(message, kind = "info") {
  if (typeof document === "undefined") return;
  document.querySelector(".hexa-action-toast")?.remove();
  const toast = document.createElement("div");
  toast.className = `hexa-action-toast ${kind}`;
  toast.setAttribute("role", "status");
  const safe = String(message).replace(/[&<>]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]));
  toast.innerHTML = `<span class="hexa-toast-icon">${kind === "success" ? "✓" : kind === "danger" ? "!" : "i"}</span><span>${safe}</span>`;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("show"));
  window.setTimeout(() => {
    toast.classList.remove("show");
    window.setTimeout(() => toast.remove(), 180);
  }, 2600);
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
      const patch = {
        email: user.email || existing.email || null,
        is_anonymous: Boolean(user.is_anonymous),
        guest_created_at: existing.guest_created_at || user.created_at || new Date().toISOString(),
        guest_last_seen_at: Boolean(user.is_anonymous) ? new Date().toISOString() : existing.guest_last_seen_at || null,
        updated_at: new Date().toISOString(),
      };
      try {
        const { data: refreshed } = await supabase.from("profiles").update(patch).eq("id", user.id).select("*").single();
        return refreshed || { ...existing, ...patch };
      } catch {
        return existing;
      }
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
      is_anonymous: Boolean(user.is_anonymous),
      guest_created_at: user.created_at || new Date().toISOString(),
      guest_last_seen_at: new Date().toISOString(),
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
  const [guestCaptchaToken, setGuestCaptchaToken] = useState("");

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
            Return verified users to HEXA's auth callback. The current
            browser origin is used so localhost, preview deployments,
            and production deployments all use the correct domain.
          */
          emailRedirectTo: `${window.location.origin}/auth/callback`,
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

  async function handleContinueAsGuest() {
    clearMessages();
    setBusy(true);
    try {
      const { data: existingSessionData } = await supabase.auth.getSession();
      if (existingSessionData?.session) {
        await ensureHexaProfile(existingSessionData.session.user);
        return;
      }
      const resolvedCaptchaToken = TURNSTILE_SITE_KEY ? getCurrentTurnstileToken(guestCaptchaToken) : "";
      if (TURNSTILE_SITE_KEY && !resolvedCaptchaToken) {
        throw new Error("Please complete the security check before continuing as a guest.");
      }
      const { data, error } = await supabase.auth.signInAnonymously({
        options: TURNSTILE_SITE_KEY ? { captchaToken: resolvedCaptchaToken } : undefined,
      });
      if (error) throw error;
      if (!data?.session) throw new Error("Unable to create a temporary HEXA profile.");
      try {
        const widgetId = typeof window !== "undefined" ? window[HEXA_TURNSTILE_WIDGET_KEY] : null;
        if (widgetId !== null && widgetId !== undefined && window.turnstile?.reset) window.turnstile.reset(widgetId);
      } catch {}
      try { localStorage.removeItem(HEXA_EXPLICIT_SIGNOUT_KEY); } catch {}
      await ensureHexaProfile(data.user);
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
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

        <div className="hexa-guest-auth-card">
          <strong>Try HEXA without creating an account first</strong>
          <p>We create a secure, temporary profile in your browser. Add an email and password later in Settings to keep access on another device.</p>
          <div className="hexa-captcha-wrap"><HexaTurnstile onToken={setGuestCaptchaToken} disabled={busy} /></div>
          <button type="button" className="hero-secondary guest-auth-button" onClick={handleContinueAsGuest} disabled={busy || (!!TURNSTILE_SITE_KEY && !guestCaptchaToken)}>
            {busy ? "Opening HEXA…" : "Continue as guest"}
          </button>
          <a href="/privacy" className="privacy-link">Privacy Policy</a>
        </div>
        <p className="auth-footer">
          By continuing, you agree to use HEXA responsibly. We do not request location or device IDs just to create a temporary profile.
        </p>
      </main>
    </div>
  );
}

function HexaTurnstile({ onToken, onError, disabled, onReady }) {
  const mountRef = useRef(null);
  const widgetIdRef = useRef(null);
  const callbacksRef = useRef({ onToken, onError, onReady });

  useEffect(() => {
    callbacksRef.current = { onToken, onError, onReady };
  }, [onToken, onError, onReady]);

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY || !mountRef.current) return undefined;
    let cancelled = false;

    const render = () => {
      if (cancelled || !window.turnstile || !mountRef.current) return;
      try {
        if (widgetIdRef.current !== null) {
          try { window.turnstile.remove(widgetIdRef.current); } catch {}
          widgetIdRef.current = null;
        }

        const widgetId = window.turnstile.render(mountRef.current, {
          sitekey: TURNSTILE_SITE_KEY,
          action: 'guest_signup',
          theme: 'auto',
          size: 'normal',
          execution: 'execute',
          callback: (token) => callbacksRef.current.onToken?.(token || ''),
          'expired-callback': () => callbacksRef.current.onToken?.(''),
          'error-callback': (code) => {
            callbacksRef.current.onToken?.('');
            callbacksRef.current.onError?.(
              `Turnstile error ${code || 'unknown'}. Please retry the security verification.`
            );
          },
          'timeout-callback': () => {
            callbacksRef.current.onToken?.('');
            callbacksRef.current.onError?.('Turnstile verification timed out. Please try again.');
          },
        });

        widgetIdRef.current = widgetId;
        try {
          window[HEXA_TURNSTILE_WIDGET_KEY] = widgetId;
          window.__HEXA_TURNSTILE_EXECUTE__ = () => {
            if (widgetIdRef.current !== null && window.turnstile?.execute) {
              window.turnstile.execute(widgetIdRef.current);
              return true;
            }
            return false;
          };
        } catch {}

        callbacksRef.current.onReady?.(widgetId);
      } catch (error) {
        console.warn('HEXA Turnstile render:', error);
        callbacksRef.current.onToken?.('');
        callbacksRef.current.onError?.('Cloudflare security verification could not be loaded. Please try again.');
      }
    };

    const ensureScript = () => {
      if (cancelled) return;
      if (window.turnstile) {
        render();
        return;
      }
      const existing = document.querySelector('script[data-hexa-turnstile="true"]');
      if (existing) {
        existing.addEventListener('load', render, { once: true });
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      script.dataset.hexaTurnstile = 'true';
      script.onload = render;
      script.onerror = () => callbacksRef.current.onError?.('Cloudflare Turnstile could not be loaded. Please check your network or browser settings.');
      document.head.appendChild(script);
    };

    ensureScript();

    return () => {
      cancelled = true;
      try {
        if (widgetIdRef.current !== null && window.turnstile) {
          window.turnstile.remove(widgetIdRef.current);
        }
      } catch {}
      widgetIdRef.current = null;
      try {
        if (window[HEXA_TURNSTILE_WIDGET_KEY] !== undefined) delete window[HEXA_TURNSTILE_WIDGET_KEY];
        if (window.__HEXA_TURNSTILE_EXECUTE__) delete window.__HEXA_TURNSTILE_EXECUTE__;
      } catch {}
    };
  }, []);

  if (!TURNSTILE_SITE_KEY) {
    return (
      <div className="hexa-captcha-missing">
        CAPTCHA is not configured yet. Add <code>VITE_TURNSTILE_SITE_KEY</code> in Vercel.
      </div>
    );
  }

  return (
    <div
      ref={mountRef}
      className={`hexa-turnstile${disabled ? ' is-disabled' : ''}`}
      aria-label="Security verification"
      aria-busy={disabled ? 'true' : 'false'}
    />
  );
}

function GuestWelcomeScreen({ onStart, busy, captchaToken, onCaptchaToken, onCaptchaError }) {
  return (
    <div className="hexa-guest-welcome">
      <div className="hexa-guest-welcome-glow hexa-guest-welcome-glow-a" />
      <div className="hexa-guest-welcome-glow hexa-guest-welcome-glow-b" />
      <div className="hexa-guest-welcome-card">
        <div className="hexa-guest-welcome-logo">H</div>
        <div className="hexa-guest-welcome-eyebrow">PRIVATE • SIMPLE • VOICE-FIRST</div>
        <h1>Welcome to HEXA!</h1>
        <p className="hexa-guest-welcome-lead">Your temporary profile is ready.</p>
        <p className="hexa-guest-welcome-copy">Start chatting without creating a password first. Your temporary session stays in this browser until you secure it from Settings.</p>
        <div className="hexa-captcha-wrap"><HexaTurnstile onToken={onCaptchaToken} onError={onCaptchaError} disabled={busy} /></div>
        <button type="button" className="hexa-guest-start-button" onClick={onStart} disabled={busy || (!!TURNSTILE_SITE_KEY && !captchaToken)}>
          <span className="hexa-guest-start-icon">{busy ? "…" : "→"}</span>
          <span>{busy ? "Opening HEXA…" : "Start Chatting"}</span>
        </button>
        <div className="hexa-guest-welcome-note">
          <span>🔐</span>
          <div>
            <strong>Secure your account later</strong>
            <small>To use this chat on another device, add an email and password in Settings.</small>
          </div>
        </div>
        <div className="hexa-guest-welcome-privacy">
          HEXA does not need your GPS location or device ID just to start a temporary profile. <a href="/privacy">Privacy Policy</a>
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
  onSignOut,
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { language, t } = useHexaLanguage();

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
          <div className="sidebar-section-label">{t("workspace")}</div>

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
              <span>{hexLang(language, item.id === "chat" ? "chat" : item.id === "groups" ? "groups" : item.id === "communities" ? "communities" : item.id === "calls" ? "calls" : item.id === "moments" ? "moments" : item.id === "channels" ? "channels" : item.id === "kora" ? "kora" : item.id === "settings" ? "settings" : item.label)}</span>
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
  const { language } = useHexaLanguage();
  return (
    <header className="hexa-topbar">
      <div className="mobile-page-title"><strong>HEXA</strong></div>
      <div className="topbar-search">
        <span>⌕</span>
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={hexLang(language,"search") + "…"} />
        <kbd>⌘ K</kbd>
      </div>
      <div className="topbar-actions">
        <button className="notification-button" title={hexLang(language,"notifications")} onClick={onNotifications}>
          ♢{notificationCount > 0 && <b>{notificationCount > 99 ? "99+" : notificationCount}</b>}
        </button>
        <button title={hexLang(language,"settings")} onClick={onSettings}>⚙</button>
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
          <button key={title} className="feature-card" onClick={() => setActivePage(title === "Messaging" ? "chat" : title === "Groups" ? "groups" : title === "Status" ? "moments" : title === "Calls" ? "calls" : title === "Channels" ? "channels" : title === "Communities" ? "communities" : title === "AI" ? "kora" : "settings")}>
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

async function askKora({ profile, messages = [], prompt = "" } = {}) {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData?.session?.access_token;
  if (!accessToken) throw new Error("Kora session expired. Please sign in again.");

  const payloadMessages = messages.length ? messages : [{ role: "user", content: prompt }];
  const response = await fetch("/api/kora", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      profile: profile ? { id: profile.id, username: profile.username, full_name: profile.full_name } : undefined,
      messages: payloadMessages,
      input: prompt,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error || data?.message || `Kora request failed (${response.status})`);
  return String(data?.reply ?? data?.output ?? data?.message ?? data?.text ?? data?.content ?? "").trim();
}

function koraReply(input) {
  const q = String(input || "").toLowerCase();
  if (q.includes("hello") || q.includes("hi")) return "Hello. I’m Kora, your HEXA assistant. What would you like to do?";
  if (q.includes("status")) return "You can create a HEXA Moments with text, photos or videos from the Moments workspace.";
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
  const [reactionBursts, setReactionBursts] = useState([]);
  const [editing, setEditing] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [reactionMenu, setReactionMenu] = useState(null);

  const [forwardOpen, setForwardOpen] = useState(false);
  const [forwardMessage, setForwardMessage] = useState(null);
  const [actionDialog, setActionDialog] = useState(null);
  const [translateDialog, setTranslateDialog] = useState(null);
  const [translationBusy, setTranslationBusy] = useState(false);

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
  const recorderRef = useRef(null);
  const recorderStreamRef = useRef(null);
  const recorderChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);
  const recordingStartedAtRef = useRef(0);
  const [attachment, setAttachment] = useState(null);

  const [chatSettingsOpen, setChatSettingsOpen] =
    useState(false);

  const [quickActionsOpen, setQuickActionsOpen] =
    useState(false);

  const [focusMode, setFocusMode] =
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

  const [favouriteChats, setFavouriteChats] = useState(
    () =>
      readJsonStorage(
        "hexa-favourite-chats-v1",
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

  const [pinnedPanelOpen, setPinnedPanelOpen] = useState(false);
  const [savedPanelOpen, setSavedPanelOpen] = useState(false);
  const [vaultOpen, setVaultOpen] = useState(false);
  const [vaultSearch, setVaultSearch] = useState("");
  const [vaultFilter, setVaultFilter] = useState("all");
  const [vaultItems, setVaultItems] = useState(() => readJsonStorage("hexa-message-vault-v1", []));
  const [reminders, setReminders] = useState(() => readJsonStorage("hexa-message-reminders-v1", []));
  const [remindersPanelOpen, setRemindersPanelOpen] = useState(false);

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

  useEffect(() => {
    writeJsonStorage("hexa-message-reminders-v1", reminders);
  }, [reminders]);

  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      setReminders(current => {
        let changed = false;
        const next = current.map(item => {
          if (!item.triggered && item.remindAt <= now) {
            changed = true;
            safeAlert(`Reminder: ${item.preview || "Saved message"}`, "success");
            return { ...item, triggered: true };
          }
          return item;
        });
        return changed ? next : current;
      });
    };
    tick();
    const id = window.setInterval(tick, 30000);
    return () => window.clearInterval(id);
  }, []);

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
    saveStorage("hexa-message-vault-v1", vaultItems);
  }, [vaultItems]);

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

      const { data: messageRows, error } =
        await supabase
          .from("messages")
          .select("*")
          .eq("conversation_id", conversationId)
          .is("deleted_at", null)
          .order("created_at", { ascending: true });

      if (error) throw error;

      const messageIds = (messageRows || []).map(row => row.id).filter(Boolean);
      let reactions = [];
      let attachments = [];
      let userActions = [];
      if (messageIds.length) {
        const [reactionR, attachmentR, actionR] = await Promise.all([
          supabase.from("message_reactions").select("*").in("message_id", messageIds),
          supabase.from("message_attachments").select("*").in("message_id", messageIds),
          supabase.from("message_user_actions").select("*").in("message_id", messageIds).eq("user_id", profile.id),
        ]);
        if (reactionR.error) console.warn("HEXA message reactions:", reactionR.error.message);
        if (attachmentR.error) console.warn("HEXA message attachments:", attachmentR.error.message);
        if (actionR.error) console.warn("HEXA message actions:", actionR.error.message);
        reactions = reactionR.data || [];
        attachments = attachmentR.data || [];
        userActions = actionR.data || [];
      }

      const data = (messageRows || []).map(row => ({
        ...row,
        message_reactions: reactions.filter(r => String(r.message_id) === String(row.id)),
        message_attachments: attachments.filter(a => String(a.message_id) === String(row.id)),
        message_user_actions: userActions.filter(a => String(a.message_id) === String(row.id)),
      }));

      const visible = data.filter((row) => {
        const actions = Array.isArray(row.message_user_actions)
          ? row.message_user_actions
          : [];
        const mine = actions.find(
          (action) => String(action.user_id) === String(profile.id)
        );
        return !mine?.deleted_for_me;
      });

      setMessages(visible);

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
          "HEXA User",
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
      recorderChunksRef.current = [];
      const mimeCandidates = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/ogg;codecs=opus",
        "audio/mp4"
      ];
      const mimeType = mimeCandidates.find(type => MediaRecorder.isTypeSupported?.(type)) || "";
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorderRef.current = recorder;
      recordingStartedAtRef.current = Date.now();
      recorder.ondataavailable = event => {
        if (event.data?.size) recorderChunksRef.current.push(event.data);
      };
      recorder.onerror = () => {
        setRecordingError("The microphone recorder stopped unexpectedly.");
        cleanupVoiceRecorder();
        setRecording(false);
      };
      recorder.onstop = () => {
        const duration = Math.max(0, Math.round((Date.now() - recordingStartedAtRef.current) / 1000));
        const blob = new Blob(recorderChunksRef.current, { type: recorder.mimeType || mimeType || "audio/webm" });
        cleanupVoiceRecorder();
        if (!blob.size) {
          setRecording(false);
          setRecordingError("No voice audio was captured. Please try again.");
          return;
        }
        const ext = blob.type.includes("ogg") ? "ogg" : blob.type.includes("mp4") ? "m4a" : "webm";
        const url = URL.createObjectURL(blob);
        setRecordedVoice({
          blob,
          url,
          mimeType: blob.type,
          duration,
          name: `hexa-voice-${Date.now()}.${ext}`,
        });
        setRecording(false);
      };
      recorder.start(150);
      setRecording(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = window.setInterval(() => {
        setRecordingSeconds(Math.max(0, Math.floor((Date.now() - recordingStartedAtRef.current) / 1000)));
      }, 250);
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
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.onstop = null;
      try { recorder.stop(); } catch {}
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
    const file = new File(
      [recordedVoice.blob],
      recordedVoice.name || `hexa-voice-${Date.now()}.webm`,
      { type: recordedVoice.mimeType || recordedVoice.blob.type || "audio/webm" }
    );
    setRecordedVoice(null);
    setMessage("");
    sendMessage(null, { name: file.name, type: "voice", file });
  }

  useEffect(() => () => {
    cleanupVoiceRecorder();
    if (recordedVoice?.url) URL.revokeObjectURL(recordedVoice.url);
  }, []);

    async function sendMessage(event, overrideAttachment = null) {
    event?.preventDefault();

    const activeAttachment = overrideAttachment || attachment;
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
      content: text || (messageType === "voice" ? "🎙 Voice message" : activeAttachment?.name || "Media"),
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
        content: text || (messageType === "voice" ? "🎙 Voice message" : activeAttachment?.name || "Media"),
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
        .select("*")
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
        } else {
          data.message_attachments = [{
            message_id: data.id,
            user_id: profile.id,
            file_name: activeAttachment.name,
            file_path: upload.path,
            file_url: upload.url,
            mime_type: activeAttachment.file.type || "application/octet-stream",
            file_size: activeAttachment.file.size || 0,
          }];
        }
      }
      data.message_reactions = [];
      data.message_user_actions = [];

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

  function getVaultMedia(item) {
    const attachmentRow = item?.message_attachments?.[0];
    return attachmentRow?.file_url || item?.media_url || item?.metadata?.file_url || null;
  }

  function addToVault(item, category = "General") {
    if (!item?.id) return;
    const id = String(item.id);
    setVaultItems(current => {
      if (current.some(entry => String(entry.message_id) === id)) {
        safeAlert("Already in Message Vault.");
        return current;
      }
      const snapshot = {
        id: `vault-${id}-${Date.now()}`,
        message_id: id,
        conversation_id: item.conversation_id || selected?.id || null,
        sender_id: item.sender_id || null,
        content: item.content || "",
        message_type: item.message_type || "text",
        metadata: item.metadata || {},
        media_url: getVaultMedia(item),
        created_at: item.created_at || new Date().toISOString(),
        saved_at: new Date().toISOString(),
        category
      };
      safeAlert("Saved to Message Vault.");
      return [snapshot, ...current].slice(0, 500);
    });
    setContextMenu(null);
  }

  function removeFromVault(vaultId) {
    setVaultItems(current => current.filter(entry => entry.id !== vaultId));
  }

  function openVaultItem(item) {
    if (String(item.conversation_id || "") !== String(selected?.id || "")) {
      safeAlert("This message is saved in another chat. Open that conversation to jump to it.");
      return;
    }
    setVaultOpen(false);
    requestAnimationFrame(() => {
      const node = document.getElementById(`msg-${item.message_id}`);
      if (node) {
        node.scrollIntoView({ behavior: "smooth", block: "center" });
        node.classList.add("hexa-pinned-highlight");
        window.setTimeout(() => node.classList.remove("hexa-pinned-highlight"), 1800);
      }
    });
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
  function openPinnedMessage(item) {
    if (!item?.id) return;
    setPinnedPanelOpen(false);
    requestAnimationFrame(() => {
      const node = document.getElementById(`msg-${item.id}`);
      if (node) {
        node.scrollIntoView({ behavior: "smooth", block: "center" });
        node.classList.add("hexa-pinned-highlight");
        window.setTimeout(() => node.classList.remove("hexa-pinned-highlight"), 1800);
      }
    });
  }

     REACTIONS
     ============================================================ */

  async function translateMessage(item) {
    if (!item?.content || !profile?.id) return;
    const targetCode = getSavedHexaLanguage();
    const targetName = HEXA_LANGUAGE_MAP[targetCode]?.name || targetCode || "English";
    setContextMenu(null);
    setTranslationBusy(true);
    setTranslateDialog({ item, targetCode, targetName, translated: "", error: "" });
    try {
      const reply = await askKora({
        profile,
        prompt: `Translate the following HEXA chat message into ${targetName}. Preserve names, emojis, URLs, account numbers, codes, and numbers exactly. Return only the translation, with no commentary.\n\nMessage:\n${String(item.content)}`,
      });
      if (!reply) throw new Error("No translation returned.");
      setTranslateDialog(current => current ? { ...current, translated: reply } : null);
    } catch (error) {
      setTranslateDialog(current => current ? { ...current, error: error?.message || "Translation failed." } : null);
    } finally {
      setTranslationBusy(false);
    }
  }

  function triggerReactionBurst(messageId, emoji) {
    if (!messageId || !emoji) return;
    const burstId = `${messageId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setReactionBursts(current => [
      ...current.filter(item => item.messageId !== messageId),
      {
        id: burstId,
        messageId: String(messageId),
        emoji,
        particles: Array.from({ length: 8 }, (_, index) => ({
          id: `${burstId}-${index}`,
          x: (index - 3.5) * 10 + (Math.random() * 16 - 8),
          y: -(44 + Math.random() * 56),
          delay: Math.random() * 90,
          rotate: Math.round(Math.random() * 50 - 25),
        })),
      },
    ]);
    window.setTimeout(() => {
      setReactionBursts(current => current.filter(item => item.id !== burstId));
    }, 1250);
  }

  async function reactToMessage(item, emoji) {
    if (!item?.id || !profile?.id) return;
    setReactionMenu(null);

    try {
      const { error } = await supabase.rpc("hexa_react_to_message", {
        p_message_id: item.id,
        p_reaction: emoji,
      });
      if (error) throw error;
      triggerReactionBurst(item.id, emoji);
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

  function closeChatMenu() {
    setChatSettingsOpen(false);
  }

  function closeQuickActions() {
    setQuickActionsOpen(false);
  }

  function runQuickAction(action) {
    closeQuickActions();

    if (action === "focus") {
      setFocusMode(value => !value);
      return;
    }

    if (action === "latest") {
      requestAnimationFrame(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      });
      return;
    }

    if (action === "search") {
      setMessageSearch("");
      requestAnimationFrame(() => document.querySelector(".chat-message-search input")?.focus());
      return;
    }

    if (action === "export") {
      handleChatMenuAction("export");
      return;
    }

    if (action === "voice") {
      if (!isSystem && !isSelf) onStartCall?.(selected, "voice");
      return;
    }

    if (action === "video") {
      if (!isSystem && !isSelf) onStartCall?.(selected, "video");
    }
  }

  function openActionDialog(config) {
    setActionDialog({ type: "choice", title: "HEXA", subtitle: "", options: [], value: "", ...config });
  }

  function closeActionDialog() {
    setActionDialog(null);
  }

  function scheduleMessageReminder(item, when) {
    if (!item?.id) return;
    const remindAt = when === "today"
      ? Date.now() + 2 * 60 * 60 * 1000
      : when === "tomorrow"
        ? Date.now() + 24 * 60 * 60 * 1000
        : when === "weekend"
          ? Date.now() + 3 * 24 * 60 * 60 * 1000
          : when === "next-week"
            ? Date.now() + 7 * 24 * 60 * 60 * 1000
            : new Date(when).getTime();
    if (!Number.isFinite(remindAt)) return;
    const reminder = {
      id: `rem-${Date.now()}-${item.id}`,
      messageId: String(item.id),
      conversationId: String(selected?.realConversationId || selected?.id || ""),
      remindAt,
      createdAt: Date.now(),
      triggered: false,
      preview: item.content || (item.message_type === "voice" ? "🎙 Voice message" : item.message_type === "image" ? "📷 Photo" : item.message_type === "video" ? "🎥 Video" : "Message"),
      sender: String(item.sender_id) === String(profile.id) ? "You" : (selected?.name || "Contact")
    };
    setReminders(current => [reminder, ...current.filter(x => x.messageId !== reminder.messageId || x.triggered)]);
    setRemindersPanelOpen(true);
    setContextMenu(null);
    safeAlert("Message reminder set.", "success");
  }

  function removeReminder(id) {
    setReminders(current => current.filter(item => item.id !== id));
  }

  function jumpToReminder(reminder) {
    const item = messages.find(m => String(m.id) === String(reminder.messageId));
    if (item) {
      openPinnedMessage(item);
      setRemindersPanelOpen(false);
    }
  }

  async function handleChatMenuAction(action) {
    closeChatMenu();

    if (!selected?.id) return;

    switch (action) {
      case "contact-info":
        setContactOpen(true);
        break;

      case "search":
        setMessageSearch("");
        requestAnimationFrame(() => document.querySelector(".chat-message-search input")?.focus());
        break;

      case "select":
        setSelectionMode(true);
        break;

      case "mute": {
        openActionDialog({
          type: "choice",
          title: "Mute notifications",
          subtitle: "Choose how long HEXA should stay quiet for this chat.",
          options: [
            { label: "1 hour", value: "1h", icon: "◷" },
            { label: "8 hours", value: "8h", icon: "◴" },
            { label: "Always", value: "always", icon: "∞" },
          ],
          onConfirm: async (choice) => {
            const duration = choice === "1h" ? 3600 : choice === "8h" ? 28800 : null;
            const conversationId = selected.realConversationId || selected.id;
            const mutedUntil = duration === null ? null : new Date(Date.now() + duration * 1000).toISOString();
            try {
              const { error } = await supabase.from("chat_preferences").upsert({ user_id: profile.id, conversation_id: conversationId, muted_until: mutedUntil }, { onConflict: "user_id,conversation_id" });
              if (error) throw error;
            } catch (error) { console.warn("HEXA mute preference:", error); }
            if (mutedUntil) localStorage.setItem(`hexa-muted-until:${selected.id}`, mutedUntil);
            setMuted(current => current.includes(String(selected.id)) ? current : [...current, String(selected.id)]);
            safeAlert(`Notifications muted: ${choice === "always" ? "Always" : choice === "1h" ? "1 hour" : "8 hours"}.`, "success");
          }
        });
        break;
      }

      case "disappearing": {
        openActionDialog({
          type: "choice",
          title: "Disappearing messages",
          subtitle: "New messages can automatically disappear after the selected period.",
          options: [
            { label: "Off", value: "off", icon: "○" },
            { label: "24 hours", value: "24h", icon: "24" },
            { label: "7 days", value: "7d", icon: "7" },
            { label: "90 days", value: "90d", icon: "90" },
          ],
          selectedValue: disappearing,
          onConfirm: async (next) => {
            setDisappearing(next);
            const conversationId = selected.realConversationId || selected.id;
            const seconds = next === "24h" ? 86400 : next === "7d" ? 604800 : next === "90d" ? 7776000 : 0;
            try {
              const { error } = await supabase.from("chat_preferences").upsert({ user_id: profile.id, conversation_id: conversationId, disappearing_seconds: seconds }, { onConflict: "user_id,conversation_id" });
              if (error) throw error;
            } catch (error) { console.warn("HEXA disappearing preference:", error); }
            safeAlert(`Disappearing messages: ${next === "off" ? "Off" : next === "24h" ? "24 hours" : next === "7d" ? "7 days" : "90 days"}.`, "success");
          }
        });
        break;
      }

      case "favourite": {
        const id = String(selected.id);
        const next = favouriteChats.includes(id) ? favouriteChats.filter(item => item !== id) : [...favouriteChats, id];
        writeJsonStorage("hexa-favourite-chats-v1", next);
        setFavouriteChats(next);
        try {
          const conversationId = selected.realConversationId || selected.id;
          const { error } = await supabase.from("chat_preferences").upsert({
            user_id: profile.id, conversation_id: conversationId, favorite: next.includes(id)
          }, { onConflict: "user_id,conversation_id" });
          if (error) throw error;
        } catch (error) { console.warn("HEXA favourite preference:", error); }
        break;
      }

      case "list": {
        openActionDialog({
          type: "choice",
          title: "Add chat to list",
          subtitle: "Organize this conversation so it is easier to find later.",
          options: [
            { label: "Family", value: "Family", icon: "⌂" },
            { label: "School", value: "School", icon: "▣" },
            { label: "+ New list", value: "__new__", icon: "+" },
          ],
          onConfirm: async (value) => {
            if (value === "__new__") {
              openActionDialog({
                type: "input", title: "Create new list", subtitle: "Give this list a short name.", inputPlaceholder: "List name", confirmLabel: "Create list",
                onConfirm: async (name) => {
                  const clean = String(name || "").trim();
                  if (!clean) return;
                  localStorage.setItem(`hexa-chat-list:${selected.id}`, clean);
                  const conversationId = selected.realConversationId || selected.id;
                  try { const { error } = await supabase.from("chat_preferences").upsert({ user_id: profile.id, conversation_id: conversationId, folder: clean }, { onConflict: "user_id,conversation_id" }); if (error) throw error; } catch (error) { console.warn("HEXA chat folder preference:", error); }
                  safeAlert(`Added to ${clean}.`, "success");
                }
              });
              return;
            }
            localStorage.setItem(`hexa-chat-list:${selected.id}`, value);
            try { const conversationId = selected.realConversationId || selected.id; const { error } = await supabase.from("chat_preferences").upsert({ user_id: profile.id, conversation_id: conversationId, folder: value }, { onConflict: "user_id,conversation_id" }); if (error) throw error; } catch (error) { console.warn("HEXA chat folder preference:", error); }
            safeAlert(`Added to ${value}.`, "success");
          }
        });
        break;
      }

      case "export": {
        const exportText = messages.map(item => {
          const sender = String(item.sender_id) === String(profile.id) ? "You" : (selected.name || "Contact");
          const time = item.created_at ? new Date(item.created_at).toLocaleString() : "";
          return `[${time}] ${sender}: ${item.content || ""}`;
        }).join("\n");
        try {
          await navigator.clipboard.writeText(exportText);
          safeAlert("Chat copied to clipboard.");
        } catch {
          try {
            const blob = new Blob([exportText], { type: "text/plain;charset=utf-8" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${(selected.name || "HEXA-chat").replace(/[^a-z0-9-_]+/gi,"-")}.txt`;
            a.click();
            URL.revokeObjectURL(url);
          } catch { safeAlert("Unable to export the chat on this device."); }
        }
        break;
      }

      case "close":
        setMobileConversationOpen(false);
        break;

      case "call-link": {
        const conversationId = selected.realConversationId || selected.id;
        const calleeId = selected.otherUserId;
        if (!conversationId || !calleeId || isSystem || isSelf) {
          safeAlert("A direct HEXA contact is required to create a call link.", "danger");
          break;
        }

        openActionDialog({
          type: "choice",
          title: "Create call link",
          subtitle: `Create a real ${selected.name || "HEXA contact"} call session and share its join link.`,
          options: [
            { value: "voice", label: "Voice call link", icon: "☎" },
            { value: "video", label: "Video call link", icon: "▣" },
          ],
          onConfirm: async (type) => {
            try {
              const { data: call, error } = await supabase.rpc("hexa_create_call", {
                p_conversation_id: conversationId,
                p_callee_id: calleeId,
                p_type: type,
                p_external: false,
              });
              if (error) throw error;
              if (!call?.id) throw new Error("HEXA did not return a call session.");

              const link = `${window.location.origin}/call/${call.id}`;
              let copied = false;
              try {
                await navigator.clipboard.writeText(link);
                copied = true;
              } catch {}

              const callLabel = type === "video" ? "🎥 HEXA video call" : "📞 HEXA voice call";
              const { error: messageError } = await supabase.from("messages").insert({
                conversation_id: conversationId,
                sender_id: profile.id,
                receiver_id: calleeId,
                content: `${callLabel}\n${link}`,
                message_type: "call_link",
                status: "sent",
                metadata: { call_id: call.id, call_type: type, call_link: link },
              });
              if (messageError) {
                console.warn("HEXA call-link message:", messageError.message);
              }

              const prefix = copied ? "Call link created and copied." : "Call link created.";
              safeAlert(`${prefix} It was also sent in this chat.`, "success");
              await loadMessages(selected);
            } catch (error) {
              safeAlert(error?.message || "Unable to create the call link.", "danger");
            }
          }
        });
        break;
      }

      case "group-call":
        onStartCall?.(selected, "voice", { forceGroup: true });
        break;

      case "report": {
        openActionDialog({
          type: "confirm", danger: true, title: "Report this chat?", subtitle: "HEXA will review the conversation details associated with your report.", confirmLabel: "Report chat",
          onConfirm: async () => {
            try { const { error } = await supabase.from("security_events").insert({ user_id: profile.id, event_type: "chat_report", metadata: { conversation_id: selected.realConversationId || selected.id, reported_user_id: selected.otherUserId || null } }); if (error) throw error; safeAlert("Report submitted to HEXA.", "success"); } catch (error) { safeAlert(error?.message || "Unable to submit report.", "danger"); }
          }
        });
        break;
      }

      case "block":
        toggleBlock();
        break;

      case "clear":
        clearChat();
        break;

      case "delete":
        openActionDialog({
          type: "confirm", danger: true, title: "Delete this chat?", subtitle: "This removes the conversation from your HEXA chat list. This cannot be undone from the app.", confirmLabel: "Delete chat",
          onConfirm: async () => {
            try { const conversationId = selected.realConversationId || selected.id; const { error } = await supabase.from("conversation_members").delete().eq("conversation_id", conversationId).eq("user_id", profile.id); if (error) throw error; setConversations(current => current.filter(item => String(item.id) !== String(selected.id))); setMessages([]); setMobileConversationOpen(false); safeAlert("Chat deleted.", "success"); } catch (error) { safeAlert(error?.message || "Unable to delete this chat.", "danger"); }
          }
        });
        break;

      default:
        break;
    }
  }

  function clearChat() {
    setMessages([]);
    setChatSettingsOpen(false);
    safeAlert("Chat cleared from this view.", "success");
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

  function getSelectedMessageItems() {
    const selectedSet = new Set(selectedMessages.map(String));
    return messages.filter(item => selectedSet.has(String(item.id)));
  }

  function selectAllMessages() {
    const selectable = messages.filter(item => !item.deleted_at);
    if (!selectable.length) return;
    setSelectedMessages(selectable.map(item => String(item.id)));
    setSelectionMode(true);
  }

  async function copySelected() {
    const items = getSelectedMessageItems();
    if (!items.length) return;
    const text = items.map(item => item.content || "").filter(Boolean).join("\n");
    if (!text) { safeAlert("There is no text to copy in the selected messages."); return; }
    try {
      await navigator.clipboard.writeText(text);
      safeAlert(`${items.length} message${items.length === 1 ? "" : "s"} copied.`);
    } catch {
      safeAlert("Unable to copy the selected messages on this device.");
    }
  }

  async function runBulkMessageAction(action) {
    const items = getSelectedMessageItems();
    if (!items.length) return;

    if (action === "star") {
      for (const item of items) await toggleStar(item);
      cancelSelection();
      return;
    }

    if (action === "pin") {
      for (const item of items) await togglePin(item);
      cancelSelection();
      return;
    }

    if (action === "forward") {
      if (items.length !== 1) {
        safeAlert("Select one message to forward at a time.");
        return;
      }
      openForward(items[0]);
      cancelSelection();
      return;
    }

    if (action === "copy") {
      await copySelected();
      return;
    }

    if (action === "delete") {
      await deleteSelected();
    }
  }

  async function deleteSelected() {
    const selectedItems = getSelectedMessageItems();

    if (!selectedItems.length) return;
    const ownCount = selectedItems.filter(item => String(item.sender_id) === String(profile.id)).length;
    const everyone = ownCount === selectedItems.length;
    openActionDialog({
      type: "confirm", danger: true,
      title: everyone ? "Delete selected messages?" : "Delete selected messages for you?",
      subtitle: everyone ? `You are about to remove ${selectedItems.length} message${selectedItems.length === 1 ? "" : "s"} for everyone.` : `You are about to remove ${selectedItems.length} message${selectedItems.length === 1 ? "" : "s"} from your view.`,
      confirmLabel: "Delete",
      onConfirm: async () => {
        for (const item of selectedItems) await deleteMessage(item, everyone && String(item.sender_id) === String(profile.id));
        cancelSelection();
        safeAlert(`${selectedItems.length} message${selectedItems.length === 1 ? "" : "s"} deleted.`, "success");
      }
    });
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

  function renderSmartChatText(text) {
  const source = String(text ?? "");
  if (!source) return null;

  // Only URLs are clickable. Numbers with 7+ digits are visual-only
  // highlights; numbers with 6 or fewer digits remain normal text.
  const tokenPattern = /(https?:\/\/[^\s]+|www\.[^\s]+|(?<!\d)\d{7,}(?!\d))/gi;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = tokenPattern.exec(source))) {
    if (match.index > lastIndex) {
      parts.push({ type: "text", value: source.slice(lastIndex, match.index), key: `t-${lastIndex}` });
    }
    const raw = match[0];
    const isUrl = /^(https?:\/\/|www\.)/i.test(raw);
    parts.push({ type: isUrl ? "url" : "number", value: raw, key: `l-${match.index}` });
    lastIndex = tokenPattern.lastIndex;
  }

  if (lastIndex < source.length) {
    parts.push({ type: "text", value: source.slice(lastIndex), key: `t-${lastIndex}` });
  }

  return parts.map(part => {
    if (part.type === "url") {
      const href = /^https?:\/\//i.test(part.value) ? part.value : `https://${part.value}`;
      return (
        <a
          key={part.key}
          className="hexa-chat-link"
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={event => event.stopPropagation()}
        >
          {part.value}
        </a>
      );
    }
    if (part.type === "number") {
      return (
        <span key={part.key} className="hexa-number-highlight" aria-label="Number">
          {part.value}
        </span>
      );
    }
    return <React.Fragment key={part.key}>{part.value}</React.Fragment>;
  });
}

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
        onTouchStart={event => {
          const touch = event.touches?.[0];
          if (!touch) return;
          event.currentTarget.__hexaSwipe = {
            startX: touch.clientX,
            startY: touch.clientY,
            lastX: touch.clientX,
            lastY: touch.clientY,
          };
        }}
        onTouchMove={event => {
          const state = event.currentTarget.__hexaSwipe;
          const touch = event.touches?.[0];
          if (!state || !touch) return;
          state.lastX = touch.clientX;
          state.lastY = touch.clientY;
        }}
        onTouchEnd={event => {
          const state = event.currentTarget.__hexaSwipe;
          event.currentTarget.__hexaSwipe = null;
          if (!state || !item?.id) return;
          const dx = state.lastX - state.startX;
          const dy = state.lastY - state.startY;
          const horizontalSwipe = Math.abs(dx) >= 55 && Math.abs(dx) > Math.abs(dy) * 1.2;
          if (horizontalSwipe) {
            setReplyTo(item);
            window.setTimeout(() => document.querySelector('[data-hexa-composer-input]')?.focus?.(), 0);
          }
        }}
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
            } ${
              reactionBursts.some(burst => burst.messageId === String(item.id))
                ? "hexa-reaction-pulse"
                : ""
            }`
          }
        >
          {reactionBursts
            .filter(burst => burst.messageId === String(item.id))
            .map(burst => (
              <div className="hexa-reaction-burst" key={burst.id} aria-hidden="true">
                {burst.particles.map(particle => (
                  <span
                    key={particle.id}
                    className="hexa-reaction-particle"
                    style={{
                      '--burst-x': `${particle.x}px`,
                      '--burst-y': `${particle.y}px`,
                      '--burst-delay': `${particle.delay}ms`,
                      '--burst-rotate': `${particle.rotate}deg`,
                    }}
                  >
                    {burst.emoji}
                  </span>
                ))}
              </div>
            ))}
          {item.forwarded && (
            <div className="forwarded-label">
              ↪ Forwarded
            </div>
          )}

          {(item.reply_to_id || item.reply_to) && (() => {
            const replied = item.reply_to || messages.find(m => String(m.id) === String(item.reply_to_id));
            const repliedMine = replied && String(replied.sender_id) === String(profile.id);
            const replyAttachment = replied?.message_attachments?.[0];
            const replyMediaUrl = replyAttachment?.file_url || replied?.media_url || replied?.metadata?.file_url;
            const repliedText = replied?.content || (replied?.message_type === "voice" ? "🎙 Voice message" : replied?.message_type === "image" ? "📷 Photo" : replied?.message_type === "video" ? "🎬 Video" : replied?.message_type === "file" ? "📎 File" : "Message");
            return (
              <div
                className="quoted-message quoted-message-button"
                role="button"
                tabIndex={0}
                onClick={() => {
                  if (replied?.id) {
                    const node = document.getElementById(`msg-${replied.id}`);
                    node?.scrollIntoView({ behavior: "smooth", block: "center" });
                    node?.classList.add("hexa-reply-highlight");
                    window.setTimeout(() => node?.classList.remove("hexa-reply-highlight"), 1400);
                  }
                }}
                onKeyDown={event => {
                  if (event.key === "Enter" || event.key === " ") event.currentTarget.click();
                }}
                title="Jump to replied message"
              >
                <span className="quoted-message-bar" />
                <span className="quoted-message-copy">
                  <strong>{repliedMine ? "You" : (replied?.sender_name || selected?.name || "Message")}</strong>
                  {replied?.message_type === "image" && replyMediaUrl ? (
                    <span className="quoted-rich-media-row" style={{display:"flex",alignItems:"center",gap:8,minWidth:0}}><img src={replyMediaUrl} alt="Replied photo" className="quoted-rich-media" style={{width:52,height:42,objectFit:"cover",borderRadius:7,flex:"0 0 auto"}} /><em style={{fontStyle:"normal",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{repliedText === "📷 Photo" ? "Photo" : repliedText}</em></span>
                  ) : replied?.message_type === "video" && replyMediaUrl ? (
                    <span className="quoted-rich-media-row" style={{display:"flex",alignItems:"center",gap:8,minWidth:0}}><video src={replyMediaUrl} muted playsInline preload="metadata" className="quoted-rich-media" style={{width:52,height:42,objectFit:"cover",borderRadius:7,background:"#000",flex:"0 0 auto"}} /><em style={{fontStyle:"normal",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{repliedText === "🎬 Video" ? "Video" : repliedText}</em></span>
                  ) : replied?.message_type === "voice" && replyMediaUrl ? (
                    <span className="quoted-rich-media-row" style={{display:"flex",alignItems:"center",gap:8}}><span className="quoted-audio-icon">🎙</span><em style={{fontStyle:"normal"}}>{repliedText}</em></span>
                  ) : (
                    <span>{repliedText}</span>
                  )}
                </span>
              </div>
            );
          })()}

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
            return <div className="message-content">{renderSmartChatText(item.content)}</div>;
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
        } ${focusMode ? "focus-mode" : ""}`
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
                  <button
                    type="button"
                    title="Voice call"
                    onClick={() =>
                      onStartCall?.(
                        selected,
                        "voice"
                      )
                    }
                  >
                    ☎
                  </button>

                  <button
                    type="button"
                    title="Video call"
                    onClick={() =>
                      onStartCall?.(
                        selected,
                        "video"
                      )
                    }
                  >
                    ▣
                  </button>
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
              className={pinnedPanelOpen ? "quick-actions-trigger active" : "quick-actions-trigger"}
              title="Pinned messages"
              aria-label="Pinned messages"
              onClick={() => {
                setPinnedPanelOpen(value => !value);
                setSavedPanelOpen(false);
                setQuickActionsOpen(false);
                setChatSettingsOpen(false);
              }}
            >
              📌
              {messages.filter(message => pinned.includes(String(message.id))).length > 0 && (
                <span className="pinned-header-count">
                  {messages.filter(message => pinned.includes(String(message.id))).length}
                </span>
              )}
            </button>

            <button
              type="button"
              className={savedPanelOpen ? "quick-actions-trigger active" : "quick-actions-trigger"}
              title="Saved messages"
              aria-label="Saved messages"
              onClick={() => {
                setSavedPanelOpen(value => !value);
                setPinnedPanelOpen(false);
                setQuickActionsOpen(false);
                setChatSettingsOpen(false);
              }}
            >
              ☆
              {messages.filter(message => starred.includes(String(message.id))).length > 0 && (
                <span className="saved-header-count">
                  {messages.filter(message => starred.includes(String(message.id))).length}
                </span>
              )}
            </button>

            <button
              type="button"
              className={vaultOpen ? "quick-actions-trigger active" : "quick-actions-trigger"}
              title="Message Vault"
              aria-label="Message Vault"
              onClick={() => {
                setVaultOpen(value => !value);
                setPinnedPanelOpen(false);
                setSavedPanelOpen(false);
                setRemindersPanelOpen(false);
                setQuickActionsOpen(false);
                setChatSettingsOpen(false);
              }}
            >
              ◈
              {vaultItems.length > 0 && <span className="saved-header-count">{vaultItems.length > 999 ? "999+" : vaultItems.length}</span>}
            </button>

            <button
              type="button"
              className={remindersPanelOpen ? "quick-actions-trigger active" : "quick-actions-trigger"}
              title="Message reminders"
              aria-label="Message reminders"
              onClick={() => {
                setRemindersPanelOpen(value => !value);
                setPinnedPanelOpen(false);
                setSavedPanelOpen(false);
                setQuickActionsOpen(false);
                setChatSettingsOpen(false);
              }}
            >
              ⏰
              {reminders.filter(item => !item.triggered).length > 0 && <span className="saved-header-count">{reminders.filter(item => !item.triggered).length}</span>}
            </button>

            <button
              type="button"
              className={quickActionsOpen ? "quick-actions-trigger active" : "quick-actions-trigger"}
              title="Quick actions"
              aria-label="Quick actions"
              onClick={() => {
                setQuickActionsOpen(value => !value);
                setChatSettingsOpen(false);
              }}
            >
              ✦
            </button>

            <button
              type="button"
              title="Chat options"
              aria-label="Chat options"
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

        {quickActionsOpen && (
          <>
            <div
              className="chat-menu-backdrop"
              onClick={closeQuickActions}
              aria-hidden="true"
            />
            <div className="quick-actions-popover">
              <div className="quick-actions-heading">
                <strong>Quick Actions</strong>
                <span>Power tools for this chat</span>
              </div>
              <button type="button" onClick={() => runQuickAction("latest")}>↓<span>Jump to latest message</span></button>
              <button type="button" className={focusMode ? "selected" : ""} onClick={() => runQuickAction("focus")}>⛶<span>{focusMode ? "Exit focus mode" : "Enter focus mode"}</span></button>
              <button type="button" onClick={() => runQuickAction("search")}>⌕<span>Search this chat</span></button>
              <button type="button" onClick={() => runQuickAction("export")}>⇩<span>Export conversation</span></button>
              {!isSystem && !isSelf && <button type="button" onClick={() => runQuickAction("voice")}>☎<span>Start voice call</span></button>}
              {!isSystem && !isSelf && <button type="button" onClick={() => runQuickAction("video")}>▣<span>Start video call</span></button>}
            </div>
          </>
        )}

        {/* CHAT THREE-DOT MENU */}
        {chatSettingsOpen && (
          <>
            <div
              className="chat-menu-backdrop"
              onClick={closeChatMenu}
              aria-hidden="true"
            />
            <div className="chat-settings-popover whatsapp-chat-menu">
              <button type="button" onClick={() => handleChatMenuAction("contact-info")}>👤 <span>Contact info</span></button>
              <button type="button" onClick={() => handleChatMenuAction("search")}>⌕ <span>Search</span></button>
              <button type="button" onClick={() => handleChatMenuAction("select")}>☑ <span>Select messages</span></button>
              <div className="chat-menu-divider" />
              <button type="button" onClick={() => handleChatMenuAction("mute")}>🔕 <span>Mute notifications</span><small>1 hour · 8 hours · Always</small></button>
              <button type="button" onClick={() => handleChatMenuAction("disappearing")}>⏱ <span>Disappearing messages</span><small>24 hours · 7 days · 90 days · Off</small></button>
              <button type="button" onClick={() => handleChatMenuAction("favourite")}>⭐ <span>Add to favourites</span></button>
              <button type="button" onClick={() => handleChatMenuAction("list")}>☷ <span>Add to list</span><small>Family · School · + New list</small></button>
              <button type="button" onClick={() => handleChatMenuAction("export")}>⇩ <span>Export chat</span></button>
              <button type="button" onClick={() => handleChatMenuAction("close")}>× <span>Close chat</span></button>
              <button type="button" onClick={() => handleChatMenuAction("call-link")}>🔗 <span>Send call link</span></button>
              <button type="button" onClick={() => handleChatMenuAction("group-call")}>👥 <span>New group call</span></button>
              <div className="chat-menu-divider" />
              <button type="button" onClick={() => handleChatMenuAction("report")}>⚑ <span>Report</span></button>
              <button type="button" className="danger-menu-item" onClick={() => handleChatMenuAction("block")}>🚫 <span>Block</span></button>
              <button type="button" onClick={() => handleChatMenuAction("clear")}>⌫ <span>Clear chat</span></button>
              <button type="button" className="danger-menu-item" onClick={() => handleChatMenuAction("delete")}>🗑 <span>Delete chat</span></button>
            </div>
          </>
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

        {vaultOpen && (
          <div className="hexa-vault-panel">
            <div className="hexa-vault-head">
              <div>
                <span className="hexa-vault-kicker">HEXA STORAGE LAYER</span>
                <strong>◈ Message Vault</strong>
                <small>One searchable place for the messages and media you never want to lose.</small>
              </div>
              <button type="button" onClick={() => setVaultOpen(false)} aria-label="Close Message Vault">×</button>
            </div>
            <div className="hexa-vault-tools">
              <input value={vaultSearch} onChange={event => setVaultSearch(event.target.value)} placeholder="Search your vault…" aria-label="Search Message Vault" />
              <div className="hexa-vault-filters">
                {[
                  ["all", "All"],
                  ["text", "Text"],
                  ["media", "Media"],
                  ["voice", "Voice"],
                  ["link", "Links"]
                ].map(([value,label]) => <button key={value} type="button" className={vaultFilter === value ? "active" : ""} onClick={() => setVaultFilter(value)}>{label}</button>)}
              </div>
            </div>
            {(() => {
              const query = vaultSearch.trim().toLowerCase();
              const filtered = vaultItems.filter(item => {
                const hay = `${item.content || ""} ${item.category || ""}`.toLowerCase();
                const typeMatch = vaultFilter === "all"
                  || (vaultFilter === "text" && !["image","video","voice","audio","file"].includes(item.message_type))
                  || (vaultFilter === "media" && ["image","video","file"].includes(item.message_type))
                  || (vaultFilter === "voice" && ["voice","audio"].includes(item.message_type))
                  || (vaultFilter === "link" && /https?:\/\/|www\./i.test(item.content || ""));
                return typeMatch && (!query || hay.includes(query));
              });
              if (!filtered.length) return <div className="hexa-vault-empty"><div>◈</div><strong>{vaultItems.length ? "Nothing matches that filter" : "Your Message Vault is empty"}</strong><span>Open Message actions on anything important and tap Message Vault.</span></div>;
              return <div className="hexa-vault-list">{filtered.slice(0, 80).map(item => {
                const isCurrent = String(item.conversation_id || "") === String(selected?.id || "");
                const media = item.media_url;
                return <div className="hexa-vault-item" key={item.id}>
                  <button type="button" className="hexa-vault-open" onClick={() => openVaultItem(item)}>
                    <div className="hexa-vault-thumb">
                      {media && item.message_type === "image" ? <img src={media} alt="" /> : media && item.message_type === "video" ? <video src={media} muted playsInline /> : item.message_type === "voice" || item.message_type === "audio" ? "🎙" : item.message_type === "file" ? "📄" : "✦"}
                    </div>
                    <div className="hexa-vault-copy">
                      <strong>{isCurrent ? "Current chat" : "Saved chat"} · {item.message_type || "text"}</strong>
                      <span>{item.content || (item.message_type === "image" ? "Photo" : item.message_type === "video" ? "Video" : item.message_type === "voice" ? "Voice message" : "Saved message")}</span>
                      <small>Saved {item.saved_at ? new Date(item.saved_at).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : ""}</small>
                    </div>
                  </button>
                  <button type="button" className="hexa-vault-remove" title="Remove from vault" onClick={() => removeFromVault(item.id)}>×</button>
                </div>;
              })}</div>;
            })()}
          </div>
        )}

        {remindersPanelOpen && (
          <div className="hexa-pinned-panel hexa-reminders-panel">
            <div className="hexa-pinned-head">
              <div>
                <span className="hexa-pinned-kicker">MESSAGE TO-DO</span>
                <strong>⏰ Reminders</strong>
                <small>Come back to important messages at the right time.</small>
              </div>
              <button type="button" onClick={() => setRemindersPanelOpen(false)} aria-label="Close reminders">×</button>
            </div>
            {!reminders.length ? (
              <div className="hexa-pinned-empty"><div>⏰</div><strong>No reminders yet</strong><span>Open Message actions → Remind me on any message.</span></div>
            ) : (
              <div className="hexa-pinned-list">
                {reminders.slice(0, 12).map(reminder => (
                  <div className="hexa-pinned-item hexa-reminder-item" key={reminder.id}>
                    <button type="button" className="hexa-pinned-jump" onClick={() => jumpToReminder(reminder)}>
                      <span className="hexa-pinned-icon">⏰</span>
                      <span className="hexa-pinned-copy">
                        <strong>{reminder.sender}</strong>
                        <span>{reminder.preview}</span>
                        <small>{reminder.triggered ? "Reminder delivered" : new Date(reminder.remindAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</small>
                      </span>
                    </button>
                    <button type="button" className="hexa-pinned-unpin" title="Remove reminder" onClick={() => removeReminder(reminder.id)}>×</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {savedPanelOpen && (
          <div className="hexa-saved-panel">
            <div className="hexa-saved-head">
              <div>
                <span className="hexa-saved-kicker">PERSONAL SHORTCUT</span>
                <strong>☆ Saved messages</strong>
                <small>Keep important messages easy to find in this conversation.</small>
              </div>
              <button type="button" onClick={() => setSavedPanelOpen(false)} aria-label="Close saved messages">×</button>
            </div>
            {(() => {
              const currentSaved = messages.filter(message => starred.includes(String(message.id)));
              if (!currentSaved.length) {
                return (
                  <div className="hexa-saved-empty">
                    <div>☆</div>
                    <strong>No saved messages yet</strong>
                    <span>Use Message actions → Star to save an important message for later.</span>
                  </div>
                );
              }
              return (
                <div className="hexa-saved-list">
                  {currentSaved.slice(-12).reverse().map(item => (
                    <div className="hexa-saved-item" key={item.id}>
                      <button type="button" className="hexa-saved-jump" onClick={() => openPinnedMessage(item)}>
                        <span className="hexa-saved-icon">☆</span>
                        <span className="hexa-saved-copy">
                          <strong>{String(item.sender_id) === String(profile.id) ? "You" : (selected?.name || "Contact")}</strong>
                          <span>{item.content || (item.message_type === "image" ? "📷 Photo" : item.message_type === "video" ? "🎥 Video" : item.message_type === "voice" ? "🎙 Voice message" : "Message")}</span>
                          <small>{item.created_at ? new Date(item.created_at).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : ""}</small>
                        </span>
                      </button>
                      <button type="button" className="hexa-saved-remove" title="Remove from saved" onClick={() => toggleStar(item)}>×</button>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}

        {pinnedPanelOpen && (
          <div className="hexa-pinned-panel">
            <div className="hexa-pinned-head">
              <div>
                <span className="hexa-pinned-kicker">CHAT SHORTCUT</span>
                <strong>📌 Pinned messages</strong>
                <small>Jump straight to important messages in this conversation.</small>
              </div>
              <button type="button" onClick={() => setPinnedPanelOpen(false)} aria-label="Close pinned messages">×</button>
            </div>
            {(() => {
              const currentPinned = messages.filter(message => pinned.includes(String(message.id)));
              if (!currentPinned.length) {
                return (
                  <div className="hexa-pinned-empty">
                    <div>📌</div>
                    <strong>No pinned messages yet</strong>
                    <span>Use Message actions → Pin on any important message.</span>
                  </div>
                );
              }
              return (
                <div className="hexa-pinned-list">
                  {currentPinned.slice(-8).reverse().map(item => (
                    <div className="hexa-pinned-item" key={item.id}>
                      <button type="button" className="hexa-pinned-jump" onClick={() => openPinnedMessage(item)}>
                        <span className="hexa-pinned-icon">📌</span>
                        <span className="hexa-pinned-copy">
                          <strong>{String(item.sender_id) === String(profile.id) ? "You" : (selected?.name || "Contact")}</strong>
                          <span>{item.content || (item.message_type === "image" ? "📷 Photo" : item.message_type === "video" ? "🎥 Video" : item.message_type === "voice" ? "🎙 Voice message" : "Message")}</span>
                          <small>{item.created_at ? new Date(item.created_at).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : ""}</small>
                        </span>
                      </button>
                      <button type="button" className="hexa-pinned-unpin" title="Unpin message" onClick={() => togglePin(item)}>×</button>
                    </div>
                  ))}
                </div>
              );
            })()}
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
            <div className="selection-toolbar-leading">
              <button type="button" className="selection-close" onClick={cancelSelection} aria-label="Exit selection mode">
                ×
              </button>
              <div className="selection-count-block">
                <strong>{selectedMessages.length}</strong>
                <span>{selectedMessages.length === 1 ? "message selected" : "messages selected"}</span>
              </div>
            </div>

            <div className="selection-toolbar-actions">
              <button type="button" className="selection-tool" onClick={selectAllMessages} title="Select all">
                <span>☑</span><small>All</small>
              </button>
              <button type="button" className="selection-tool" onClick={() => runBulkMessageAction("copy")} disabled={!selectedMessages.length} title="Copy">
                <span>⧉</span><small>Copy</small>
              </button>
              <button type="button" className="selection-tool" onClick={() => runBulkMessageAction("star")} disabled={!selectedMessages.length} title="Star">
                <span>☆</span><small>Star</small>
              </button>
              <button type="button" className="selection-tool" onClick={() => runBulkMessageAction("pin")} disabled={!selectedMessages.length} title="Pin">
                <span>📌</span><small>Pin</small>
              </button>
              <button type="button" className="selection-tool" onClick={() => runBulkMessageAction("forward")} disabled={selectedMessages.length !== 1} title="Forward one message">
                <span>↪</span><small>Forward</small>
              </button>
              <button type="button" className="selection-tool danger" onClick={() => runBulkMessageAction("delete")} disabled={!selectedMessages.length} title="Delete selected">
                <span>🗑</span><small>Delete</small>
              </button>
            </div>
          </div>
        )}

        {/* REPLY / EDIT */}

        {replyTo && (
          <div className="reply-bar reply-composer-bar">
            <span className="reply-composer-accent" />
            <div className="reply-composer-copy">
              <strong>Replying to {String(replyTo.sender_id) === String(profile.id) ? "yourself" : (selected?.name || "message")}</strong>
              <span>{replyTo.content || (replyTo.message_type === "voice" ? "🎙 Voice message" : replyTo.message_type === "image" ? "📷 Photo" : replyTo.message_type === "video" ? "🎬 Video" : "Media")}</span>
            </div>
            <button type="button" onClick={() => setReplyTo(null)} aria-label="Cancel reply">×</button>
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
          <>
            {recording && (
              <div className="voice-recorder-panel hexa-native-voice-panel">
                <div className="voice-recorder-live">
                  <span className="voice-recording-dot" />
                  <strong>Recording voice message</strong>
                  <span className="voice-recording-time">{String(Math.floor(recordingSeconds / 60)).padStart(2, "0")}:{String(recordingSeconds % 60).padStart(2, "0")}</span>
                </div>
                <div className="voice-waveform" aria-hidden="true">
                  {Array.from({ length: 30 }).map((_, index) => <i key={index} style={{ height: `${10 + ((index * 17 + recordingSeconds * 7) % 28)}px` }} />)}
                </div>
                <div className="voice-recorder-actions">
                  <button type="button" className="voice-cancel" onClick={cancelVoiceRecording}>Cancel</button>
                  <button type="button" className="voice-stop" onClick={stopVoiceRecording}>■ Stop & preview</button>
                </div>
              </div>
            )}
            {recordedVoice && !recording && (
              <div className="voice-preview-panel hexa-native-voice-panel">
                <div className="voice-preview-heading">
                  <strong>Voice message preview</strong>
                  <span>{String(Math.floor(recordedVoice.duration / 60)).padStart(2, "0")}:{String(recordedVoice.duration % 60).padStart(2, "0")}</span>
                </div>
                <audio controls preload="metadata" src={recordedVoice.url} />
                <div className="voice-recorder-actions">
                  <button type="button" className="voice-cancel" onClick={discardRecordedVoice}>Discard</button>
                  <button type="button" className="voice-send" onClick={sendRecordedVoice}>➤ Send voice</button>
                </div>
              </div>
            )}
            {recordingError && <div className="composer-error">{recordingError}</div>}
          <form
            className={`chat-composer hexa-message-composer ${recording ? "is-recording" : ""}`}
            onSubmit={
              editing
                ? event => {
                    event.preventDefault();
                    saveEditedMessage();
                  }
                : sendMessage
            }
          >
            <div className="composer-shell">
              <div className="composer-main-row">
                <button
                  type="button"
                  className="composer-icon-btn"
                  title="Emoji"
                  aria-label="Open emoji picker"
                  onClick={() => setEmojiOpen(value => !value)}
                >
                  <span aria-hidden="true">😊</span>
                </button>

                <button
                  type="button"
                  className="composer-icon-btn"
                  title="Attach"
                  aria-label="Attach a photo, video, file or audio"
                  onClick={() => setAttachmentOpen(value => !value)}
                >
                  <span aria-hidden="true">＋</span>
                </button>

                <textarea
                  data-hexa-composer-input
                  className="composer-textarea"
                  rows={1}
                  value={message}
                  onChange={event => saveDraft(event.target.value)}
                  placeholder={
                    recording
                      ? "Recording voice message…"
                      : editing
                        ? "Edit your message…"
                        : "Type a message"
                  }
                  disabled={recording}
                  onKeyDown={event => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      if (editing) saveEditedMessage();
                      else sendMessage(event);
                    }
                  }}
                  onInput={event => {
                    event.currentTarget.style.height = "auto";
                    event.currentTarget.style.height = `${Math.min(event.currentTarget.scrollHeight, 140)}px`;
                  }}
                />

                <div className="composer-trailing-actions">
                  {editing ? (
                    <button
                      type="submit"
                      className="composer-send-btn"
                      title="Save edit"
                      aria-label="Save edited message"
                    >
                      ✓
                    </button>
                  ) : message.trim() || attachment ? (
                    <button
                      type="submit"
                      className="composer-send-btn"
                      title="Send"
                      aria-label="Send message"
                    >
                      ➤
                    </button>
                  ) : (
                    <button
                      type="button"
                      className={`composer-voice-btn ${recording ? "active" : ""}`}
                      title={recording ? "Stop recording" : "Record voice message"}
                      aria-label={recording ? "Stop recording" : "Record voice message"}
                      onClick={recording ? stopVoiceRecording : startVoiceRecording}
                    >
                      <span aria-hidden="true">{recording ? "■" : "🎙"}</span>
                    </button>
                  )}
                </div>
              </div>

              {recording && (
                <div className="composer-recording-bar">
                  <span className="recording-pulse" aria-hidden="true" />
                  <strong>Recording voice message</strong>
                  <span className="recording-hint">Tap 🎙 to stop</span>
                </div>
              )}
            </div>
          </form>
          </>
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

      {translateDialog && (
        <div className="hexa-translate-overlay" onClick={() => !translationBusy && setTranslateDialog(null)}>
          <div className="hexa-translate-modal" onClick={event => event.stopPropagation()}>
            <div className="hexa-translate-head">
              <div>
                <span className="hexa-translate-kicker">HEXA SMART TRANSLATE</span>
                <h3>{translationBusy ? "Translating…" : `Translated to ${translateDialog.targetName}`}</h3>
              </div>
              <button type="button" className="hexa-action-dialog-close" disabled={translationBusy} onClick={() => setTranslateDialog(null)}>×</button>
            </div>
            <div className="hexa-translate-original">
              <span>Original</span>
              <p>{translateDialog.item?.content}</p>
            </div>
            <div className="hexa-translate-divider">↓</div>
            <div className="hexa-translate-result">
              <span>{translateDialog.targetName}</span>
              {translationBusy ? <div className="hexa-translate-loading"><i/><i/><i/></div> : translateDialog.error ? <p className="hexa-translate-error">{translateDialog.error}</p> : <p>{translateDialog.translated}</p>}
            </div>
            {!translationBusy && !translateDialog.error && translateDialog.translated && (
              <button type="button" className="hero-primary hexa-translate-copy" onClick={async () => { try { await navigator.clipboard.writeText(translateDialog.translated); safeAlert("Translation copied."); } catch { safeAlert("Could not copy translation."); } }}>
                Copy translation
              </button>
            )}
          </div>
        </div>
      )}

      {actionDialog && (
        <div className="hexa-action-dialog-overlay" onClick={closeActionDialog}>
          <div className={`hexa-action-dialog ${actionDialog.danger ? "danger" : ""}`} onClick={event => event.stopPropagation()}>
            <div className="hexa-action-dialog-glow" />
            <div className="hexa-action-dialog-head">
              <div className="hexa-action-dialog-badge">{actionDialog.danger ? "!" : actionDialog.type === "input" ? "✎" : "☰"}</div>
              <div><strong>{actionDialog.title}</strong><span>{actionDialog.subtitle}</span></div>
              <button type="button" className="hexa-action-dialog-close" onClick={closeActionDialog}>×</button>
            </div>
            {actionDialog.type === "choice" && <div className="hexa-choice-list">{actionDialog.options.map(option => <button key={option.value} type="button" className={`hexa-choice-card ${actionDialog.selectedValue === option.value ? "selected" : ""}`} onClick={async () => { closeActionDialog(); await actionDialog.onConfirm?.(option.value); }}><span className="hexa-choice-icon">{option.icon}</span><span className="hexa-choice-copy"><strong>{option.label}</strong><small>{actionDialog.selectedValue === option.value ? "Current setting" : "Tap to select"}</small></span><span className="hexa-choice-check">{actionDialog.selectedValue === option.value ? "✓" : "›"}</span></button>)}</div>}
            {actionDialog.type === "input" && <ActionDialogInput config={actionDialog} close={closeActionDialog} />}
            {actionDialog.type === "confirm" && <div className="hexa-confirm-body"><div className="hexa-confirm-icon">{actionDialog.danger ? "!" : "?"}</div><p>{actionDialog.subtitle}</p><div className="hexa-confirm-actions"><button type="button" className="hexa-dialog-secondary" onClick={closeActionDialog}>Cancel</button><button type="button" className={`hexa-dialog-primary ${actionDialog.danger ? "danger" : ""}`} onClick={async () => { closeActionDialog(); await actionDialog.onConfirm?.(); }}>{actionDialog.confirmLabel || "Continue"}</button></div></div>}
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

            <div className="modal-header forward-modal-header">
              <div className="forward-title-wrap">
                <div className="forward-title-icon">↪</div>
                <div><strong>Forward message</strong><span>Choose where to send this message</span></div>
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

            {forwardMessage && <div className="forward-preview-card"><div className="forward-preview-label">MESSAGE TO FORWARD</div><div className="forward-preview-body"><span className="forward-preview-type">{forwardMessage.message_type === "voice" ? "🎙" : forwardMessage.message_type === "image" ? "📷" : forwardMessage.message_type === "video" ? "🎬" : forwardMessage.message_type === "file" ? "📎" : "💬"}</span><div><strong>{String(forwardMessage.content || "Media").slice(0, 140)}</strong><small>{forwardMessage.created_at ? new Date(forwardMessage.created_at).toLocaleString() : ""}</small></div></div></div>}
            <div className="forward-search-box">⌕<input aria-label="Search conversations to forward to" placeholder="Search chats" value={chatSearch} onChange={event => setChatSearch(event.target.value)} /></div>
            <div className="forward-list">

              {conversations.filter(conversation => conversation.id !== "hexa-system-group").filter(conversation => !chatSearch.trim() || `${conversation.name || ""} ${conversation.username || ""}`.toLowerCase().includes(chatSearch.trim().toLowerCase())).map(
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
          MESSAGE ACTION SHEET
          ====================================================== */}

      {contextMenu && (
        <div
          className="message-action-popover"
          style={{
            left: Math.max(
              12,
              Math.min(
                contextMenu.x,
                window.innerWidth - 330
              )
            ),
            top: Math.max(
              12,
              Math.min(
                contextMenu.y,
                window.innerHeight - 560
              )
            )
          }}
          onClick={event => event.stopPropagation()}
        >
          {(() => {
            const item = messages.find(
              messageItem =>
                String(messageItem.id) === String(contextMenu.id)
            );

            if (!item) return null;

            const quickReactions = ["❤️", "😂", "👍", "😮", "😢", "🙏"];
            const isMine = String(item.sender_id) === String(profile.id);
            const isStarred = starred.includes(String(item.id));
            const isPinned = pinned.includes(String(item.id));

            return (
              <>
                <div className="message-action-sheet-head">
                  <div>
                    <span className="message-action-sheet-kicker">MESSAGE ACTIONS</span>
                    <strong>{isMine ? "Your message" : "Message"}</strong>
                  </div>
                  <button type="button" className="message-action-sheet-close" onClick={() => setContextMenu(null)} aria-label="Close message actions">×</button>
                </div>

                <div className="message-action-reactions">
                  {quickReactions.map(emoji => (
                    <button
                      key={emoji}
                      type="button"
                      className="quick-reaction"
                      title={`React ${emoji}`}
                      onClick={() => reactToMessage(item, emoji)}
                    >
                      {emoji}
                    </button>
                  ))}
                  <button
                    type="button"
                    className="quick-reaction more-reactions"
                    title="More reactions"
                    onClick={() => {
                      setReactionMenu(item.id);
                      setContextMenu(null);
                    }}
                  >
                    ＋
                  </button>
                </div>

                <div className="message-action-section">
                  <div className="message-action-section-title">Message</div>

                  <button type="button" className="message-action-item" onClick={() => {
                    setReplyTo(item);
                    setContextMenu(null);
                  }}>
                    <span className="message-action-icon">↩</span>
                    <span className="message-action-copy">
                      <strong>Reply</strong>
                      <small>Reply to this message</small>
                    </span>
                  </button>

                  {item.content && item.message_type !== "image" && item.message_type !== "video" && item.message_type !== "voice" && item.message_type !== "audio" && (
                    <button type="button" className="message-action-item" onClick={() => translateMessage(item)}>
                      <span className="message-action-icon">文</span>
                      <span className="message-action-copy">
                        <strong>Translate</strong>
                        <small>Translate into your HEXA language</small>
                      </span>
                    </button>
                  )}

                  <button type="button" className="message-action-item" onClick={() => addToVault(item)}>
                    <span className="message-action-icon">◈</span>
                    <span className="message-action-copy">
                      <strong>Message Vault</strong>
                      <small>Save this message, photo, video, file, or voice note</small>
                    </span>
                  </button>

                  <button type="button" className="message-action-item" onClick={() => copyMessage(item)}>
                    <span className="message-action-icon">⧉</span>
                    <span className="message-action-copy">
                      <strong>Copy</strong>
                      <small>Copy message text</small>
                    </span>
                  </button>

                  <button
                    type="button"
                    className="message-action-item"
                    onClick={() => editMessage(item)}
                    disabled={!isMine}
                  >
                    <span className="message-action-icon">✎</span>
                    <span className="message-action-copy">
                      <strong>Edit</strong>
                      <small>{isMine ? "Change your message" : "Only your messages can be edited"}</small>
                    </span>
                  </button>

                  <button type="button" className="message-action-item" onClick={() => openForward(item)}>
                    <span className="message-action-icon">↪</span>
                    <span className="message-action-copy">
                      <strong>Forward</strong>
                      <small>Send to another chat</small>
                    </span>
                  </button>

                  <button type="button" className="message-action-item" onClick={() => {
                    setContextMenu(null);
                    openActionDialog({
                      type: "choice",
                      title: "Remind me",
                      subtitle: "Get a reminder about this message later.",
                      options: [
                        { label: "Later today", value: "today", icon: "☀" },
                        { label: "Tomorrow", value: "tomorrow", icon: "◷" },
                        { label: "This weekend", value: "weekend", icon: "☷" },
                        { label: "Next week", value: "next-week", icon: "→" },
                      ],
                      onConfirm: (value) => scheduleMessageReminder(item, value)
                    });
                  }}>
                    <span className="message-action-icon">⏰</span>
                    <span className="message-action-copy">
                      <strong>Remind me</strong>
                      <small>Come back to this message later</small>
                    </span>
                  </button>
                </div>

                <div className="message-action-divider" />

                <div className="message-action-section compact-actions">
                  <button type="button" className="message-action-item compact" onClick={() => toggleStar(item)}>
                    <span className="message-action-icon">{isStarred ? "★" : "☆"}</span>
                    <span className="message-action-copy">
                      <strong>{isStarred ? "Unstar" : "Star"}</strong>
                      <small>{isStarred ? "Remove from starred" : "Save for later"}</small>
                    </span>
                  </button>

                  <button type="button" className="message-action-item compact" onClick={() => togglePin(item)}>
                    <span className="message-action-icon">{isPinned ? "📌" : "⌑"}</span>
                    <span className="message-action-copy">
                      <strong>{isPinned ? "Unpin" : "Pin"}</strong>
                      <small>{isPinned ? "Remove chat pin" : "Keep it visible"}</small>
                    </span>
                  </button>

                  <button type="button" className="message-action-item compact" onClick={() => toggleMessageSelection(item)}>
                    <span className="message-action-icon">☑</span>
                    <span className="message-action-copy">
                      <strong>Select</strong>
                      <small>{selectionMode ? `${selectedMessages.length} currently selected` : "Choose several messages for bulk actions"}</small>
                    </span>
                  </button>
                </div>

                <div className="message-action-divider" />

                <div className="message-action-section">
                  <div className="message-action-section-title danger-title">Remove</div>

                  <button type="button" className="message-action-item danger-action" onClick={() => deleteMessage(item, false)}>
                    <span className="message-action-icon">⌫</span>
                    <span className="message-action-copy">
                      <strong>Delete for me</strong>
                      <small>Remove it from your chat</small>
                    </span>
                  </button>

                  {isMine && (
                    <button type="button" className="message-action-item danger-action" onClick={() => deleteMessage(item, true)}>
                      <span className="message-action-icon">🗑</span>
                      <span className="message-action-copy">
                        <strong>Delete for everyone</strong>
                        <small>Remove it for everyone in this chat</small>
                      </span>
                    </button>
                  )}
                </div>

                <div className="message-action-footer">
                  <span>Long-press a message for these actions</span>
                </div>
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
            "HEXA User";

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

function CommunitiesPage({ profile }) {
  const [items, setItems] = useState([]);
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const result = await supabase
          .from("communities")
          .select("id,name,description,created_by,created_at")
          .order("created_at", { ascending: false });
        if (result.error) throw result.error;
        if (!cancelled) setItems(result.data || []);
      } catch (err) {
        console.error("HEXA communities load:", err);
        if (!cancelled) setError("Communities are temporarily unavailable. Your chats and other HEXA features are still available.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <section className="workspace-page">
      <div className="page-heading">
        <div className="page-heading-icon">◉</div>
        <div><h1>Communities</h1><p>Bring groups and people together.</p></div>
        <button className="hero-primary heading-action" onClick={() => setShow(true)}>＋ Create Community</button>
      </div>
      {error && <div className="hexa-inline-warning">{error}</div>}
      <div className="entity-grid">
        {loading ? (
          <div className="coming-card"><h2>Loading communities…</h2></div>
        ) : items.length ? (
          items.map(c => (
            <div className="entity-card" key={c.id}>
              <Avatar name={c.name} size={54}/>
              <strong>{c.name}</strong>
              <span>{c.description || "HEXA community"}</span>
            </div>
          ))
        ) : (
          <div className="coming-card">
            <div>◉</div><h2>Your communities</h2><p>Create a community and add your groups.</p>
          </div>
        )}
      </div>
      {show && <CreateEntityModal type="Community" profile={profile} onClose={() => setShow(false)} onCreated={c => setItems(x => [c, ...x])}/>} 
    </section>
  );
}

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
  const [shareOpen, setShareOpen] = useState(false);
  const [reaction, setReaction] = useState("❤️");
  const [commentText, setCommentText] = useState("");
  const [comments, setComments] = useState([]);
  const [counts, setCounts] = useState({});
  const [liked, setLiked] = useState({});
  const [viewed, setViewed] = useState({});
  const [viewList, setViewList] = useState([]);
  const [highlights, setHighlights] = useState([]);
  const [highlightEditor, setHighlightEditor] = useState(null);
  const [highlightViewer, setHighlightViewer] = useState(null);
  const [highlightName, setHighlightName] = useState("");
  const [highlightSource, setHighlightSource] = useState(null);
  const fileRef = useRef(null);

  async function load() {
    if (!profile?.id) return;
    setLoading(true); setStatusError("");
    try {
      const { data, error } = await supabase.from("statuses")
        .select("*")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false });
      if (error) throw error;
      const rows = data || [];
      setStatuses(rows);
      if (!rows.length) { setCounts({}); setLiked({}); setViewed({}); return; }
      const ids = rows.map((x) => x.id);
      const [likesR, viewsR] = await Promise.all([
        supabase.from("status_likes").select("status_id,user_id").in("status_id", ids),
        supabase.from("status_views").select("status_id,viewer_id,viewed_at").in("status_id", ids),
      ]);
      const c = {}, l = {}, v = {};
      (likesR.data || []).forEach((x) => { c[x.status_id] = (c[x.status_id] || 0) + 1; if (String(x.user_id) === String(profile.id)) l[x.status_id] = true; });
      (viewsR.data || []).forEach((x) => { c[`${x.status_id}:views`] = (c[`${x.status_id}:views`] || 0) + 1; if (String(x.viewer_id) === String(profile.id)) v[x.status_id] = true; });
      setCounts(c); setLiked(l); setViewed(v);
    } catch (error) {
      console.error("hexachi status load:", error);
      setStatusError(error?.message || "Unable to load statuses.");
    } finally { setLoading(false); }
  }

  useEffect(() => {
    load();
    if (!profile?.id) return;
    try {
      const raw = localStorage.getItem(`hexa-moments-highlights:${profile.id}`);
      setHighlights(raw ? JSON.parse(raw) : []);
    } catch { setHighlights([]); }
  }, [profile?.id]);

  function persistHighlights(next) {
    setHighlights(next);
    try { localStorage.setItem(`hexa-moments-highlights:${profile.id}`, JSON.stringify(next)); } catch {}
  }

  function addMomentToHighlight(status, highlightId) {
    if (!status?.id || !highlightId) return;
    const next = highlights.map((h) => {
      if (h.id !== highlightId) return h;
      const exists = (h.items || []).some((item) => item.id === status.id);
      if (exists) return h;
      return { ...h, items: [...(h.items || []), { ...status }] };
    });
    persistHighlights(next);
    setHighlightEditor(null);
    setStatusError(`Added to ${next.find((h) => h.id === highlightId)?.name || "Highlight"}.`);
  }

  function createHighlightFromMoment(status) {
    setHighlightSource(status);
    setHighlightName("");
    setHighlightEditor({ mode: "create" });
  }

  function createHighlight() {
    const name = highlightName.trim();
    if (!name || !highlightSource?.id) return;
    const item = { ...highlightSource };
    const next = [{ id: `hl-${Date.now()}`, name, cover_url: item.media_url || "", items: [item], created_at: new Date().toISOString() }, ...highlights];
    persistHighlights(next);
    setHighlightEditor(null); setHighlightSource(null); setHighlightName("");
    setStatusError(`Created highlight “${name}”.`);
  }

  function renameHighlight(highlight) {
    const name = window.prompt("Rename highlight", highlight?.name || "");
    if (!name?.trim()) return;
    persistHighlights(highlights.map((h) => h.id === highlight.id ? { ...h, name: name.trim() } : h));
  }

  function deleteHighlight(highlight) {
    if (!highlight) return;
    if (!window.confirm(`Delete the “${highlight.name}” highlight?`)) return;
    persistHighlights(highlights.filter((h) => h.id !== highlight.id));
    if (highlightViewer?.id === highlight.id) setHighlightViewer(null);
  }

  function removeMomentFromHighlight(highlight, momentId) {
    const items = (highlight.items || []).filter((item) => item.id !== momentId);
    const next = items.length ? highlights.map((h) => h.id === highlight.id ? { ...h, items, cover_url: h.cover_url === (highlight.items || []).find((i) => i.id === momentId)?.media_url ? (items[0]?.media_url || "") : h.cover_url } : h) : highlights.filter((h) => h.id !== highlight.id);
    persistHighlights(next);
    setHighlightViewer({ ...(next.find((h) => h.id === highlight.id) || {}), id: highlight.id, items });
  }

  function openHighlight(highlight) {
    if (!highlight?.items?.length) return;
    setHighlightViewer({ ...highlight, index: 0 });
  }

  function nextHighlightItem(direction) {
    if (!highlightViewer?.items?.length) return;
    const nextIndex = highlightViewer.index + direction;
    if (nextIndex < 0 || nextIndex >= highlightViewer.items.length) return;
    setHighlightViewer({ ...highlightViewer, index: nextIndex });
  }

  async function openStatus(status) {
    setViewer(status);
    setShareOpen(false);
    setReaction("❤️");
    if (!status?.id || String(status.user_id) === String(profile.id)) return;
    try {
      await supabase.from("status_views").upsert({ status_id: status.id, viewer_id: profile.id, viewed_at: new Date().toISOString() }, { onConflict: "status_id,viewer_id" });
      setViewed((x) => ({ ...x, [status.id]: true }));
      setCounts((x) => ({ ...x, [`${status.id}:views`]: (x[`${status.id}:views`] || 0) + (x[status.id + ":counted"] ? 0 : 1), [status.id + ":counted"]: true }));
    } catch (e) { console.warn("hexachi status view:", e?.message || e); }
    await loadComments(status.id);
  }

  async function loadComments(statusId) {
    if (!statusId) return;
    const { data, error } = await supabase.from("status_comments").select("id,status_id,user_id,text,created_at").eq("status_id", statusId).order("created_at", { ascending: true });
    if (error) { console.warn("hexachi status comments:", error.message); return; }
    const rows = data || [];
    const ids = [...new Set(rows.map((x) => x.user_id).filter(Boolean))];
    let profiles = [];
    if (ids.length) profiles = (await supabase.from("profiles").select("id,username,full_name,avatar_url").in("id", ids)).data || [];
    const map = Object.fromEntries(profiles.map((x) => [x.id, x]));
    setComments(rows.map((x) => ({ ...x, profile: map[x.user_id] || null })));
  }

  async function toggleLike(status) {
    if (!status?.id) return;
    try {
      if (liked[status.id]) {
        const { error } = await supabase.from("status_likes").delete().eq("status_id", status.id).eq("user_id", profile.id);
        if (error) throw error;
        setLiked((x) => ({ ...x, [status.id]: false }));
        setCounts((x) => ({ ...x, [status.id]: Math.max(0, (x[status.id] || 0) - 1) }));
      } else {
        const { error } = await supabase.from("status_likes").insert({ status_id: status.id, user_id: profile.id });
        if (error) throw error;
        setLiked((x) => ({ ...x, [status.id]: true }));
        setCounts((x) => ({ ...x, [status.id]: (x[status.id] || 0) + 1 }));
      }
    } catch (error) { setStatusError(error?.message || "Unable to update like."); }
  }

  async function addComment(e) {
    e?.preventDefault();
    const value = commentText.trim();
    if (!viewer?.id || !value) return;
    if (viewer.allow_replies === false) { setStatusError("Replies are disabled for this status."); return; }
    const { data, error } = await supabase.from("status_comments").insert({ status_id: viewer.id, user_id: profile.id, text: value }).select("id,status_id,user_id,text,created_at").single();
    if (error) { setStatusError(error.message); return; }
    setComments((x) => [...x, { ...data, profile }]);
    setCommentText("");
    setCounts((x) => ({ ...x, [`${viewer.id}:comments`]: (x[`${viewer.id}:comments`] || 0) + 1 }));
    try {
      const owner = viewer.user_id;
      if (String(owner) !== String(profile.id)) await supabase.from("notifications").insert({ user_id: owner, kind: "status_comment", title: "New status comment", body: `${profile.full_name || profile.username || "Someone"} commented on your status.`, data: { status_id: viewer.id, comment_id: data.id } });
    } catch {}
    await loadComments(viewer.id);
  }

  async function uploadStatusMedia(selectedFile) {
    const bucket = import.meta.env.VITE_SUPABASE_STORAGE_BUCKET;
    if (!bucket) throw new Error("Set VITE_SUPABASE_STORAGE_BUCKET in Vercel before uploading status media.");
    const safeName = selectedFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${profile.id}/statuses/${Date.now()}-${safeName}`;
    const { error } = await supabase.storage.from(bucket).upload(path, selectedFile, { contentType: selectedFile.type || undefined, upsert: false });
    if (error) throw error;
    return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  }

  async function create(e) {
    e.preventDefault(); if (posting) return;
    const cleanText = text.trim(), cleanDescription = description.trim();
    if (!cleanText && !file) { setStatusError("Add text or choose a photo/video."); return; }
    setPosting(true); setStatusError("");
    try {
      let mediaUrl = "", mediaType = "";
      if (file?.file) { mediaUrl = await uploadStatusMedia(file.file); mediaType = file.kind; }
      const { data, error } = await supabase.from("statuses").insert({ user_id: profile.id, text: cleanText, description: cleanDescription, media_url: mediaUrl || null, media_type: mediaType || null, expires_at: new Date(Date.now() + 86400000).toISOString(), privacy: "contacts", allow_replies: true, metadata: {} }).select("*").single();
      if (error) throw error;
      setText(""); setDescription(""); setFile(null); setShow(false); await load();
      if (data?.id) setViewer(data);
    } catch (error) { setStatusError(error?.message || "Unable to post status."); }
    finally { setPosting(false); }
  }

  function pick(e) {
    const selected = e.target.files?.[0]; if (!selected) return;
    if (!selected.type.startsWith("image/") && !selected.type.startsWith("video/")) { setStatusError("Choose an image or video."); return; }
    if (selected.size > HEXA_MAX_ATTACHMENT_BYTES) { setStatusError("Status media must be 50 MB or smaller."); return; }
    setStatusError(""); setFile({ file: selected, url: URL.createObjectURL(selected), kind: selected.type.startsWith("video/") ? "video" : "image" });
  }

  async function copyMomentLink(status) {
    const url = `${window.location.origin}/moments/${status.id}`;
    try { await navigator.clipboard.writeText(url); setStatusError("Moment link copied."); } catch { window.prompt("Copy this Moment link:", url); }
    setShareOpen(false);
  }

  async function shareMoment(status) {
    const url = `${window.location.origin}/moments/${status.id}`;
    try {
      if (navigator.share) await navigator.share({ title: "HEXA Moment", text: status.description || status.text || "Check out this Moment", url });
      else { await navigator.clipboard.writeText(url); setStatusError("Moment link copied."); }
      try { await supabase.from("status_shares").insert({ status_id: status.id, user_id: profile.id, share_type: "native" }); } catch {}
    } catch (error) { if (error?.name !== "AbortError") setStatusError(error?.message || "Unable to share Moment."); }
    setShareOpen(false);
  }

  async function repostMoment(status) {
    try {
      const { error: repostError } = await supabase.from("statuses").insert({
        user_id: profile.id,
        text: status.text || "",
        description: status.description || "",
        media_url: status.media_url || null,
        media_type: status.media_type || null,
        expires_at: new Date(Date.now() + 86400000).toISOString(),
        privacy: "contacts",
        allow_replies: true,
        metadata: { ...(status.metadata || {}), repost_of: status.id, reposted_from_user_id: status.user_id }
      });
      if (repostError) throw repostError;
      try { await supabase.from("status_reposts").upsert({ status_id: status.id, user_id: profile.id }, { onConflict: "status_id,user_id" }); } catch {}
      setStatusError("Moment reposted to your Moments.");
      setShareOpen(false);
      await load();
    } catch (error) { setStatusError(error?.message || "Unable to repost Moment."); }
  }

  async function reactToMoment(status, emoji) {
    if (!status?.id) return;
    try {
      const { data: existing } = await supabase.from("status_reactions").select("reaction").eq("status_id", status.id).eq("user_id", profile.id).maybeSingle();
      if (existing?.reaction === emoji) {
        await supabase.from("status_reactions").delete().eq("status_id", status.id).eq("user_id", profile.id);
        setReaction("❤️");
      } else {
        await supabase.from("status_reactions").upsert({ status_id: status.id, user_id: profile.id, reaction: emoji }, { onConflict: "status_id,user_id" });
        setReaction(emoji);
      }
      await load();
    } catch (error) { setStatusError(error?.message || "Unable to update reaction."); }
  }

  function nextStatus(direction) {
    if (!viewer) return;
    const i = statuses.findIndex((x) => x.id === viewer.id);
    const next = statuses[i + direction];
    if (next) openStatus(next);
  }

  useEffect(() => {
    if (!viewer?.id) return;
    const channel = supabase.channel(`hexa-status-${viewer.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "status_comments", filter: `status_id=eq.${viewer.id}` }, () => loadComments(viewer.id))
      .on("postgres_changes", { event: "*", schema: "public", table: "status_likes", filter: `status_id=eq.${viewer.id}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [viewer?.id]);

  const likeCount = viewer ? counts[viewer.id] || 0 : 0;
  const viewCount = viewer ? counts[`${viewer.id}:views`] || 0 : 0;
  const commentCount = viewer ? counts[`${viewer.id}:comments`] || comments.length : 0;

  return <section className="workspace-page status-workspace">
    <div className="page-heading"><div className="page-heading-icon">◌</div><div><h1>Moments</h1><p>Facebook-style Stories that expire after 24 hours. Like, react, comment, share and repost.</p></div><button className="hero-primary heading-action" onClick={() => setShow(true)}>＋ Create Moment</button></div>
    <div className="moments-highlights-section">
      <div className="moments-highlights-heading">
        <div><strong>Highlights</strong><span>Keep your favourite Moments beyond 24 hours</span></div>
        <button type="button" onClick={() => setStatusError("Open a Moment and choose ☆ Highlight to create or add it to a Highlight.")}>How it works</button>
      </div>
      <div className="moments-highlights-row">
        <button type="button" className="moment-highlight-add" onClick={() => setStatusError("Open one of your Moments to create a Highlight.")}>
          <span>＋</span><b>New</b>
        </button>
        {highlights.map((h) => (
          <div className="moment-highlight-card-wrap" key={h.id}>
            <button type="button" className="moment-highlight-card" onClick={() => openHighlight(h)}>
              <div className="moment-highlight-ring">{h.cover_url ? <img src={h.cover_url} alt=""/> : <span>✦</span>}</div>
              <strong>{h.name}</strong><small>{h.items?.length || 0} Moment{(h.items?.length || 0) === 1 ? "" : "s"}</small>
            </button>
            <button type="button" className="moment-highlight-more" onClick={() => renameHighlight(h)} aria-label={`Rename ${h.name}`}>⋯</button>
          </div>
        ))}
        {!highlights.length && <div className="moments-highlights-empty"><span>☆</span><div><strong>Your first Highlight</strong><small>Save a Moment here so it stays on your profile after 24 hours.</small></div></div>}
      </div>
    </div>
    {statusError && <div className="settings-card status-error"><strong>Status</strong><p>{statusError}</p><button onClick={() => setStatusError("")}>Dismiss</button></div>}
    <div className="status-row status-scroll-row">
      <button className="create-status-card" onClick={() => setShow(true)}><div className="create-status-plus">＋</div><strong>Create Moment</strong><span>Text, photo or video</span></button>
      {loading ? <div className="coming-card"><h2>Loading statuses…</h2></div> : statuses.map((s) => <button key={s.id} className={`status-card moments-story-card ${viewed[s.id] ? "seen" : "unseen"}`} onClick={() => openStatus(s)}><div className="status-preview">{s.media_url && s.media_type === "image" ? <img src={s.media_url} alt=""/> : s.media_url && s.media_type === "video" ? <video src={s.media_url} muted playsInline/> : <span className="moment-text-preview">Aa</span>}<span className="moment-story-badge">{viewed[s.id] ? "Viewed" : "New"}</span></div><div className="moment-card-body"><div className="moment-card-author"><Avatar src={s.user_id === profile.id ? profile.avatar_url : ""} name={s.user_id === profile.id ? (profile.full_name || profile.username || "You") : "HEXA User"} size={32}/><div><strong>{s.user_id === profile.id ? (profile.full_name || profile.username || "You") : "HEXA User"}</strong><small>{s.created_at ? new Date(s.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}</small></div></div><p>{s.description || s.text || "Media Moment"}</p><div className="moment-card-stats"><span>❤️ {counts[s.id] || 0}</span><span>👁 {counts[`${s.id}:views`] || 0}</span><span>💬 {counts[`${s.id}:comments`] || 0}</span></div></div></button>)}
    </div>
    {show && <div className="modal-backdrop" onClick={() => !posting && setShow(false)}><div className="status-modal" onClick={(e) => e.stopPropagation()}><div className="modal-header"><div><h2>Create Moment</h2><p>Share something with your contacts.</p></div><button type="button" onClick={() => !posting && setShow(false)}>×</button></div><form onSubmit={create}><textarea className="modal-input modal-textarea" value={text} onChange={(e) => setText(e.target.value)} placeholder="What's happening?" maxLength={HEXA_MAX_MESSAGE_LENGTH}/><input className="modal-input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Caption / description" maxLength={1000}/><button type="button" className="media-picker" onClick={() => fileRef.current?.click()} disabled={posting}><span>📷</span><div><strong>{file ? file.file.name : "Add photo or video"}</strong><small>Camera, gallery or laptop file</small></div></button><input ref={fileRef} hidden type="file" accept="image/*,video/*" capture="environment" onChange={pick}/>{file && <div className="status-media-preview">{file.kind === "video" ? <video controls src={file.url}/> : <img src={file.url} alt="Preview"/>}</div>}<button className="hero-primary" type="submit" disabled={posting}>{posting ? "Posting…" : "Post Moment"}</button></form></div></div>}
    {viewer && (
      <div className="story-viewer" onClick={() => setViewer(null)}>
        <button className="story-close" onClick={() => setViewer(null)}>×</button>
        <button
          className="story-nav story-prev"
          onClick={(e) => {
            e.stopPropagation();
            nextStatus(-1);
          }}
        >
          ‹
        </button>

        <div className="story-content moments-viewer-content" onClick={(e) => e.stopPropagation()}>
          <div className="moments-viewer-topbar"><div className="moment-viewer-identity"><Avatar name={viewer.user_id === profile.id ? (profile.full_name || profile.username || "You") : "HEXA User"} src={viewer.user_id === profile.id ? profile.avatar_url : ""} size={36}/><div><strong>{viewer.user_id === profile.id ? (profile.full_name || profile.username || "You") : "HEXA User"}</strong><small>{viewer.created_at ? new Date(viewer.created_at).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : ""}</small></div></div><button type="button" className="moment-viewer-more" onClick={() => setShareOpen(x => !x)}>⋯</button></div>
          {viewer.media_url && viewer.media_type === "video" ? (
            <video controls autoPlay playsInline src={viewer.media_url} />
          ) : viewer.media_url ? (
            <img src={viewer.media_url} alt="Moment" />
          ) : (
            <div className="story-text">{viewer.text}</div>
          )}

          <div className="story-caption">
            <strong>{viewer.description || viewer.text || "Moment"}</strong>
            <span>{new Date(viewer.created_at).toLocaleString()}</span>
          </div>

          <div className="story-stats moments-viewer-stats">
            <span><b>{likeCount}</b> likes</span>
            <span><b>{viewCount}</b> views</span>
            <span><b>{commentCount}</b> comments</span>
          </div>

          <div className="story-actions moments-story-actions">
            <button type="button" className={`moment-action-button ${liked[viewer.id] ? "active liked" : ""}`} onClick={() => toggleLike(viewer)} title="Like">
              <span>{liked[viewer.id] ? "♥" : "♡"}</span><small>{likeCount}</small>
            </button>
            <div className="moment-reaction-picker">
              {["👍", "❤️", "😂", "😮", "😢", "😡", "🙏"].map((emoji) => (
                <button type="button" key={emoji} className={`moment-reaction-button ${reaction === emoji ? "active" : ""}`} onClick={() => reactToMoment(viewer, emoji)} title={`React ${emoji}`}>{emoji}</button>
              ))}
            </div>
            <button type="button" className="moment-action-button" onClick={() => loadComments(viewer.id)} title="Comments">
              <span>💬</span><small>{commentCount}</small>
            </button>
            <button type="button" className="moment-action-button" onClick={() => setShareOpen((x) => !x)} title="Share">
              <span>↗</span><small>Share</small>
            </button>
            {String(viewer.user_id) === String(profile.id) && (
              <button type="button" onClick={() => { setHighlightSource(viewer); setHighlightEditor({ mode: "choose" }); }}>☆</button>
            )}
          </div>

          {shareOpen && (
            <div
              className="moments-share-menu"
              onClick={(e) => e.stopPropagation()}
            >
              <button type="button" onClick={() => shareMoment(viewer)}>↗ Share Moment</button>
              <button type="button" onClick={() => copyMomentLink(viewer)}>🔗 Copy link</button>
              <button type="button" onClick={() => repostMoment(viewer)}>↻ Repost</button>
            </div>
          )}

          <div className="status-comments">
            <strong>Comments</strong>
            <div className="status-comments-list">
              {comments.map((c) => (
                <div className="status-comment premium-comment" key={c.id}>
                  <Avatar
                    src={c.profile?.avatar_url}
                    name={c.profile?.full_name || c.profile?.username || "HEXA User"}
                    size={32}
                  />
                  <div>
                    <b>{c.profile?.full_name || c.profile?.username || "HEXA User"}</b>
                    <p>{c.text}</p>
                    <div className="status-comment-meta"><small>{new Date(c.created_at).toLocaleString()}</small><button type="button" onClick={() => { setCommentText(`@${c.profile?.username || c.profile?.full_name || "user"} `); }}>Reply</button></div>
                  </div>
                </div>
              ))}
            </div>

            {viewer.allow_replies !== false && (
              <form className="status-comment-form" onSubmit={addComment}>
                <input
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Write a comment…"
                  maxLength={1000}
                />
                <button type="submit">Send</button>
              </form>
            )}
          </div>
        </div>

        <button
          className="story-nav story-next"
          onClick={(e) => {
            e.stopPropagation();
            nextStatus(1);
          }}
        >
          ›
        </button>
      </div>
    )}

    {highlightEditor && (
      <div className="modal-backdrop" onClick={() => setHighlightEditor(null)}>
        <div className="highlight-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header"><div><h2>{highlightEditor.mode === "choose" ? "Add to Highlight" : "Create Highlight"}</h2><p>{highlightEditor.mode === "choose" ? "Choose a Highlight for this Moment." : "Keep this Moment on your profile."}</p></div><button type="button" onClick={() => setHighlightEditor(null)}>×</button></div>
          {highlightEditor.mode === "create" ? (
            <div className="highlight-create-form">
              <input className="modal-input" autoFocus value={highlightName} onChange={(e) => setHighlightName(e.target.value)} placeholder="Highlight name" maxLength={40}/>
              <button className="hero-primary" type="button" disabled={!highlightName.trim()} onClick={createHighlight}>Create Highlight</button>
            </div>
          ) : (
            <div className="highlight-choice-list">
              {highlights.map((h) => <button type="button" className="highlight-choice" key={h.id} onClick={() => addMomentToHighlight(highlightSource, h)}><span className="highlight-choice-cover">{h.cover_url ? <img src={h.cover_url} alt=""/> : "✦"}</span><span><b>{h.name}</b><small>{h.items?.length || 0} saved Moment{(h.items?.length || 0) === 1 ? "" : "s"}</small></span><strong>›</strong></button>)}
              <button type="button" className="highlight-choice highlight-new-choice" onClick={() => setHighlightEditor({ mode: "create" })}><span className="highlight-choice-cover plus">＋</span><span><b>New Highlight</b><small>Create a new collection</small></span><strong>＋</strong></button>
            </div>
          )}
        </div>
      </div>
    )}

    {highlightViewer && (
      <div className="highlight-viewer" onClick={() => setHighlightViewer(null)}>
        <button className="story-close" onClick={() => setHighlightViewer(null)}>×</button>
        <button className="story-nav story-prev" onClick={(e) => { e.stopPropagation(); nextHighlightItem(-1); }}>‹</button>
        <div className="highlight-viewer-card" onClick={(e) => e.stopPropagation()}>
          <div className="highlight-viewer-top"><div><strong>{highlightViewer.name}</strong><small>Highlight · {highlightViewer.index + 1} / {highlightViewer.items.length}</small></div><button type="button" onClick={() => deleteHighlight(highlightViewer)}>Delete</button></div>
          {(() => { const item = highlightViewer.items[highlightViewer.index]; return item?.media_url && item.media_type === "video" ? <video controls autoPlay playsInline src={item.media_url}/> : item?.media_url ? <img src={item.media_url} alt="Moment"/> : <div className="highlight-viewer-text">{item?.text || "Moment"}</div>; })()}
          <div className="highlight-viewer-caption">{highlightViewer.items[highlightViewer.index]?.description || highlightViewer.items[highlightViewer.index]?.text || "Moment"}<button type="button" onClick={() => removeMomentFromHighlight(highlightViewer, highlightViewer.items[highlightViewer.index]?.id)}>Remove from Highlight</button></div>
        </div>
        <button className="story-nav story-next" onClick={(e) => { e.stopPropagation(); nextHighlightItem(1); }}>›</button>
      </div>
    )}
  </section>;
}

function KoraPage({ profile }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const recognitionRef = useRef(null);

  useEffect(() => {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) return;
    setVoiceSupported(true);

    const recognition = new Recognition();
    recognition.lang = document.documentElement.lang || "en-US";
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognition.onresult = (event) => {
      let finalText = "";
      let interimText = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const text = event.results[i][0]?.transcript || "";
        if (event.results[i].isFinal) finalText += text;
        else interimText += text;
      }
      setInput((finalText || interimText || "").trim());
      if (finalText.trim()) {
        window.setTimeout(() => {
          const spoken = finalText.trim();
          if (!spoken) return;
          setInput(spoken);
        }, 0);
      }
    };

    recognitionRef.current = recognition;
    return () => {
      try { recognition.stop(); } catch {}
      recognitionRef.current = null;
    };
  }, []);

  function toggleVoice() {
    if (!recognitionRef.current) return;
    if (listening) {
      try { recognitionRef.current.stop(); } catch {}
      return;
    }
    try {
      recognitionRef.current.lang = document.documentElement.lang || "en-US";
      recognitionRef.current.start();
    } catch {}
  }

  async function send(textOverride = "") {
    const text = String(textOverride || input).trim();
    if (!text || busy) return;

    setInput("");
    setMessages(current => [
      ...current,
      {
        id: `u-${Date.now()}`,
        role: "user",
        content: text
      }
    ]);
    setBusy(true);

    try {
      let reply;

      // Use the authenticated Kora client so the Supabase access token
      // is sent to /api/kora. The server can then verify the signed-in user.
      reply = await askKora({
        profile,
        messages: [
          ...messages,
          { role: "user", content: text }
        ]
      });

      setMessages(current => [
        ...current,
        {
          id: `k-${Date.now()}`,
          role: "kora",
          content: String(reply)
        }
      ]);
    } catch (error) {
      console.error("HEXA Kora request:", error);

      setMessages(current => [
        ...current,
        {
          id: `k-error-${Date.now()}`,
          role: "kora",
          content:
            error?.message?.includes("401") ||
            error?.message?.toLowerCase?.().includes("unauthorized")
              ? "Kora could not verify your HEXA session. Please refresh HEXA and try again."
              : error?.message ||
                "Kora is temporarily unavailable. Please try again."
        }
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="workspace-page">
      <div className="page-heading kora-heading">
        <div className="page-heading-icon">✦</div>
        <div><h1>Kora</h1><p>Your voice-first HEXA assistant.</p></div>
      </div>
      <div className="kora-page-card">
        <div className="kora-voice-hero">
          <div className={`kora-orb ${listening ? "listening" : ""}`}>✦</div>
          <div>
            <strong>{listening ? "Kora is listening…" : "Talk to Kora"}</strong>
            <span>{voiceSupported ? "Press the microphone and speak naturally." : "Voice input is unavailable in this browser."}</span>
          </div>
          <button type="button" className={`kora-hero-mic ${listening ? "active" : ""}`} onClick={toggleVoice} disabled={!voiceSupported} aria-label={listening ? "Stop listening" : "Talk to Kora"}>🎙</button>
        </div>
        <div className="kora-voice-prompts">
          {["Kora, call my son", "Kora, tell me what this message means", "Kora, translate this into Yoruba"].map((prompt) => (
            <button key={prompt} type="button" onClick={() => { setInput(prompt); if (voiceSupported) toggleVoice(); }}>{prompt}</button>
          ))}
        </div>
        <div className="kora-page-messages">
          {!messages.length && <div className="kora-empty"><div>✦</div><h2>Just say what you need</h2><p>Speak a request, ask what a message means, translate something, find a setting, or tell Kora what you want to do in HEXA.</p></div>}
          {messages.map(item => (
            <div key={item.id} className={`kora-message ${item.role}`}>
              <span>{item.role === "kora" ? "✦" : "You"}</span>
              <p>{item.content}</p>
            </div>
          ))}
          {busy && <div className="kora-message kora"><span>✦</span><p>Kora is thinking…</p></div>}
        </div>
        <form className="kora-composer" onSubmit={e => { e.preventDefault(); send(); }}>
          <button type="button" className={`kora-mic-btn ${listening ? "active" : ""}`} onClick={toggleVoice} disabled={!voiceSupported || busy} aria-label={listening ? "Stop voice input" : "Start voice input"}>🎙</button>
          <input value={input} onChange={e => setInput(e.target.value)} placeholder="Say it or type it…" />
          <button className="hero-primary" type="submit" disabled={busy || !input.trim()}>Send</button>
        </form>
      </div>
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
        <div><h1>Calls</h1><p>Private HEXA-to-HEXA voice and video calls. External calling can be billed server-side at ₦0.50/second.</p></div>
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
          <strong>{type === "video" ? "HEXA Video Call" : "HEXA Voice Call"}</strong>
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
      if (mounted) setCall({ data, peer: peer || { id: user, full_name: "HEXA User" } });
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
        <small>1 HEXA Credit = ₦1.00 · External call rate: 50 kobo/second</small>
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
        <label className="wallet-security-field"><span>HEXA Username</span><input className="modal-input" value={username} onChange={e => setUsername(e.target.value)} placeholder="@yourusername" autoComplete="username" /></label>
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

function ProfileEditModal({ profile, onClose, onSaved }) {
  const [fullName,setFullName]=useState(profile?.full_name||"");
  const [username,setUsername]=useState(profile?.username||"");
  const [email]=useState(profile?.email||"");
  const [about,setAbout]=useState(profile?.about||"");
  const [phone,setPhone]=useState(profile?.phone||"");
  const [avatarFile,setAvatarFile]=useState(null),[avatarPreview,setAvatarPreview]=useState(profile?.avatar_url||"");
  const [saving,setSaving]=useState(false),[error,setError]=useState("");
  const fileRef=useRef(null);
  async function save(e){
    e.preventDefault(); if(saving||!profile?.id)return; setSaving(true); setError("");
    try{
      const cleanUsername=username.trim().replace(/^@+/,"").toLowerCase();
      if(!fullName.trim())throw new Error("Full name is required.");
      if(cleanUsername.length<3)throw new Error("Username must be at least 3 characters.");
      const check=await supabase.from("profiles").select("id").eq("username",cleanUsername).neq("id",profile.id).maybeSingle();
      if(check.error)throw check.error; if(check.data)throw new Error("That username is already taken.");
      let avatarUrl=profile.avatar_url||null;
      if(avatarFile){
        const bucket=import.meta.env.VITE_SUPABASE_STORAGE_BUCKET; if(!bucket)throw new Error("Set VITE_SUPABASE_STORAGE_BUCKET before uploading a profile picture.");
        const ext=(avatarFile.name.split(".").pop()||"jpg").toLowerCase(); const path=`${profile.id}/profile/avatar-${Date.now()}.${ext}`;
        const up=await supabase.storage.from(bucket).upload(path,avatarFile,{contentType:avatarFile.type||"image/jpeg",upsert:true}); if(up.error)throw up.error;
        avatarUrl=supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
      }
      const base={full_name:fullName.trim(),username:cleanUsername,avatar_url:avatarUrl,updated_at:new Date().toISOString()};
      let result=await supabase.from("profiles").update({...base,about:about.trim(),phone:phone.trim()}).eq("id",profile.id).select("*").single();
      if(result.error)result=await supabase.from("profiles").update(base).eq("id",profile.id).select("*").single();
      if(result.error)throw result.error; onSaved?.(result.data); safeAlert("Profile updated successfully.","success"); onClose?.();
    }catch(err){setError(err?.message||"Unable to update your profile.");}finally{setSaving(false);}
  }
  function pick(e){const f=e.target.files?.[0];if(!f)return;if(!f.type.startsWith("image/")){setError("Choose an image file.");return;}if(f.size>8*1024*1024){setError("Profile pictures must be 8MB or smaller.");return;}setAvatarFile(f);setAvatarPreview(URL.createObjectURL(f));}
  return <div className="modal-backdrop" onClick={()=>!saving&&onClose?.()}><div className="profile-edit-modal" onClick={e=>e.stopPropagation()}>
    <div className="modal-header"><div><h2>Edit profile</h2><p>Update the details people see across HEXA.</p></div><button type="button" onClick={()=>!saving&&onClose?.()}>×</button></div>
    <form onSubmit={save}>
      <button type="button" className="profile-edit-avatar-picker" onClick={()=>fileRef.current?.click()}><Avatar src={avatarPreview} name={fullName||username||"HEXA User"} size={96}/><span>📷 Change photo</span></button>
      <input ref={fileRef} hidden type="file" accept="image/*" onChange={pick}/>
      <label className="wallet-security-field"><span>Full name</span><input className="modal-input" value={fullName} onChange={e=>setFullName(e.target.value)} maxLength={80} required/></label>
      <label className="wallet-security-field"><span>Username</span><input className="modal-input" value={username} onChange={e=>setUsername(e.target.value)} maxLength={30} autoCapitalize="none" required/></label>
      <label className="wallet-security-field"><span>Email</span><input className="modal-input" value={email} readOnly/></label>
      <label className="wallet-security-field"><span>Phone</span><input className="modal-input" value={phone} onChange={e=>setPhone(e.target.value)} maxLength={30} inputMode="tel"/></label>
      <label className="wallet-security-field"><span>About</span><textarea className="modal-input modal-textarea" value={about} onChange={e=>setAbout(e.target.value)} maxLength={160} placeholder="Tell people a little about yourself"/></label>
      {error&&<div className="auth-alert auth-error"><span>!</span>{error}</div>}
      <div className="hexa-confirm-actions"><button type="button" className="hexa-dialog-secondary" onClick={onClose} disabled={saving}>Cancel</button><button type="submit" className="hexa-dialog-primary" disabled={saving}>{saving?"Saving…":"Save changes"}</button></div>
    </form>
  </div></div>;
}

function SettingsPage({ profile, session, onSignOut, onProfileUpdated }) {
  const [theme, setTheme] = useState(getSavedHexaTheme());
  const [showThemes, setShowThemes] = useState(true);
  const [savedLanguage, setSavedLanguage] = useState(getSavedHexaLanguage());
  const [draftLanguage, setDraftLanguage] = useState(getSavedHexaLanguage());
  const [languageSearch, setLanguageSearch] = useState("");
  const [languageOpen, setLanguageOpen] = useState(true);
  const [saved, setSaved] = useState(false);
  const [uiTick, setUiTick] = useState(0);
  const [showProfileEditor,setShowProfileEditor]=useState(false);
  const { language, setLanguage } = useHexaLanguage();

  useEffect(() => { applyHexaTheme(theme); }, [theme]);
  useEffect(() => {
    const onLanguage = () => setUiTick(v => v + 1);
    window.addEventListener("hexa-language-change", onLanguage);
    document.documentElement.lang = savedLanguage;
    return () => window.removeEventListener("hexa-language-change", onLanguage);
  }, [savedLanguage]);

  const lang = savedLanguage;
  const activeTheme = HEXA_THEMES[theme] || HEXA_THEMES.midnight;
  const filteredLanguages = useMemo(() => {
    const q = languageSearch.trim().toLowerCase();
    if (!q) return HEXA_LANGUAGES;
    return HEXA_LANGUAGES.filter(([code,name]) => `${name} ${code}`.toLowerCase().includes(q));
  }, [languageSearch]);

  function changeTheme(themeId){ setTheme(themeId); applyHexaTheme(themeId); }
  async function saveLanguage(){
    setLanguage(draftLanguage);
    setSavedLanguage(draftLanguage);
    try { if(profile?.id) await supabase.from("profiles").update({language:draftLanguage,updated_at:new Date().toISOString()}).eq("id",profile.id); } catch {}
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2200);
  }

  return (
    <section className="workspace-page settings-page">
      <div className="page-heading">
        <div className="page-heading-icon">⚙</div>
        <div><h1>{hexLang(lang,"settings")}</h1><p>Customize HEXA, including appearance and language.</p></div>
      </div>

      <GuestAccountUpgrade session={session} profile={profile}/>

      <div className="settings-card hexa-profile-settings">
        <Avatar src={profile?.avatar_url} name={profile?.full_name || profile?.username || "HEXA User"} size={64} />
        <div className="profile-settings-copy"><strong>{profile?.full_name || profile?.username || "HEXA User"}</strong><p>{profile?.username ? `@${profile.username}` : profile?.email || "HEXA account"}</p><small>{profile?.about || "Add an About description to your profile."}</small></div>
        <button type="button" className="hero-secondary" onClick={()=>setShowProfileEditor(true)}>Edit profile</button>
      </div>

      <div className="settings-section">
        <button className="settings-section-heading" onClick={() => setShowThemes(v => !v)}>
          <div><strong>{hexLang(lang,"appearance")}</strong><span>Choose how HEXA looks on your devices.</span></div><b>{showThemes ? "⌃" : "⌄"}</b>
        </button>
        {showThemes && <div className="hexa-theme-panel">
          <div className="theme-current hexa-theme-current-card">
            <div className="theme-current-copy">
              <span>Current theme</span>
              <strong>{activeTheme.icon} {activeTheme.name}</strong>
              <small>{activeTheme.description}</small>
            </div>
            <div className={`theme-current-swatch ${theme === "white" ? "is-white" : ""}`} style={{background: activeTheme.vars["--hexa-bg"], borderColor: activeTheme.vars["--hexa-border-strong"]}}>
              <span style={{background: activeTheme.vars["--hexa-message-in"]}}></span>
              <span style={{background: activeTheme.vars["--hexa-message-out"]}}></span>
              <b style={{background: activeTheme.vars["--hexa-accent"]}}></b>
            </div>
          </div>
          <div className="theme-selector-toolbar">
            <span><strong>{Object.keys(HEXA_THEMES).length}</strong> themes</span>
            <span>Tap a card to apply instantly</span>
          </div>
          <div className="hexa-theme-grid">
            {Object.values(HEXA_THEMES).map(item => <button key={item.id} type="button" aria-pressed={theme===item.id} className={`hexa-theme-option ${theme===item.id?"selected":""} ${item.id === "white" ? "hexa-white-theme-option" : ""}`} onClick={() => changeTheme(item.id)}>
              <div className="theme-preview" style={{background:item.vars["--hexa-bg"]}}><div className="theme-preview-sidebar" style={{background:item.vars["--hexa-sidebar"]}}/><div className="theme-preview-content"><div className="theme-preview-message incoming" style={{background:item.vars["--hexa-message-in"]}}/><div className="theme-preview-message outgoing" style={{background:item.vars["--hexa-message-out"]}}/></div><div className="theme-preview-accent" style={{background:item.vars["--hexa-accent"]}}/></div>
              <div className="theme-option-copy"><strong>{item.icon} {item.name}</strong><span>{item.description}</span></div><div className="theme-option-status">{theme===item.id?"Active":"Select"}</div>{theme===item.id&&<div className="theme-selected">✓</div>}
            </button>)}
          </div>
        </div>}
      </div>

      <div className="settings-section language-settings-card">
        <button className="settings-section-heading" onClick={() => setLanguageOpen(v => !v)}>
          <div><strong>🌐 {hexLang(lang,"language")}</strong><span>{HEXA_LANGUAGE_MAP[savedLanguage]?.name || "English"} · 120+ supported languages</span></div><b>{languageOpen ? "⌃" : "⌄"}</b>
        </button>
        {languageOpen && <div className="language-picker-panel">
          <div className="language-current-row">
            <div><span>Current language</span><strong>{HEXA_LANGUAGE_MAP[savedLanguage]?.name || savedLanguage}</strong></div>
            <span className="language-count">{HEXA_LANGUAGES.length} languages</span>
          </div>
          <div className="language-search-row"><span>⌕</span><input value={languageSearch} onChange={e=>setLanguageSearch(e.target.value)} placeholder="Search language or code…" /></div>
          <div className="language-list" role="listbox" aria-label="Languages">
            {filteredLanguages.map(([code,name]) => <button key={code} type="button" className={`language-option ${draftLanguage===code?"selected":""}`} onClick={()=>setDraftLanguage(code)}>
              <span className="language-radio">{draftLanguage===code?"✓":""}</span><span className="language-name">{name}</span><code>{code}</code>
            </button>)}
            {!filteredLanguages.length && <div className="language-empty">No language matches “{languageSearch}”.</div>}
          </div>
          <div className="language-save-row"><span>{saved ? "✓ Language saved" : `Selected: ${HEXA_LANGUAGE_MAP[draftLanguage]?.name || draftLanguage}`}</span><button type="button" className="hero-primary language-save-button" onClick={saveLanguage}>{hexLang(lang,"save")}</button></div>
        </div>}
      </div>

      <div className="settings-grid">
        <div className="settings-card"><div><strong>{hexLang(lang,"chat")} appearance</strong><p>Your selected theme applies to conversations, bubbles, menus and panels.</p></div><span className="settings-status">{activeTheme.name}</span></div>
        <div className="settings-card"><div><strong>Language status</strong><p>Saved locally and applied to the HEXA interface. Your browser language attribute is also updated.</p></div><span className="settings-status">{HEXA_LANGUAGE_MAP[savedLanguage]?.name || savedLanguage}</span></div>
        <div className="settings-card"><div><strong>Account</strong><p>Manage your HEXA session.</p></div><button className="settings-danger-button" onClick={onSignOut}>Sign out</button></div>
      </div>
      {showProfileEditor && <ProfileEditModal profile={profile} onClose={()=>setShowProfileEditor(false)} onSaved={onProfileUpdated}/>}
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

function CallLinkJoinPage({ profile }) {
  const callId = useMemo(() => {
    if (typeof window === "undefined") return "";
    const match = window.location.pathname.match(/^\/call\/([0-9a-f-]{36})$/i);
    return match?.[1] || "";
  }, []);
  const [call, setCall] = useState(null);
  const [peer, setPeer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    if (!profile?.id || !callId) {
      setLoading(false);
      if (!callId) setError("This HEXA call link is invalid.");
      return;
    }

    let active = true;
    let channel;

    const load = async () => {
      try {
        const { data: row, error: callError } = await supabase
          .from("calls")
          .select("*")
          .eq("id", callId)
          .maybeSingle();
        if (callError) throw callError;
        if (!row) throw new Error("This call link is invalid, expired, or unavailable to your account.");

        if (![String(row.caller_id), String(row.callee_id)].includes(String(profile.id))) {
          throw new Error("This call link was created for a different HEXA account.");
        }

        const peerId = String(row.caller_id) === String(profile.id) ? row.callee_id : row.caller_id;
        const { data: profileRow } = await supabase
          .from("profiles")
          .select("id,username,full_name,avatar_url")
          .eq("id", peerId)
          .maybeSingle();

        if (!active) return;
        setCall(row);
        setPeer(profileRow || { id: peerId, full_name: "HEXA User" });
        setLoading(false);

        channel = supabase.channel(`hexa-call-link-${row.id}-${profile.id}`)
          .on("postgres_changes", { event: "UPDATE", schema: "public", table: "calls", filter: `id=eq.${row.id}` }, (payload) => {
            if (!active) return;
            const next = payload.new;
            setCall(next);
            if (["ended", "declined", "rejected", "missed"].includes(next.status)) setFinished(true);
          })
          .subscribe();
      } catch (e) {
        if (!active) return;
        setError(e?.message || "Unable to open this call link.");
        setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
      if (channel) supabase.removeChannel(channel);
    };
  }, [profile?.id, callId]);

  async function joinCall() {
    if (!call?.id || !peer?.id || joining) return;
    setJoining(true);
    try {
      if (String(call.callee_id) === String(profile.id) && call.status === "ringing") {
        const { data, error: answerError } = await supabase.rpc("hexa_answer_call", { p_call_id: call.id });
        if (answerError) throw answerError;
        setCall(data || { ...call, status: "active" });
      } else if (String(call.caller_id) !== String(profile.id) && String(call.callee_id) !== String(profile.id)) {
        throw new Error("This call link is not available to this account.");
      }
    } catch (e) {
      setError(e?.message || "Unable to join the call.");
    } finally {
      setJoining(false);
    }
  }

  if (loading) {
    return <div className="story-viewer" style={{ zIndex: 1200 }}><div className="coming-card" style={{ width: "min(460px, 92vw)", textAlign: "center" }}><div className="loading-spinner" /><h2>Opening HEXA call</h2><p>Checking this call invitation…</p></div></div>;
  }

  if (error) {
    return <div className="story-viewer" style={{ zIndex: 1200 }}><div className="coming-card" style={{ width: "min(460px, 92vw)", textAlign: "center" }}><div className="page-heading-icon">!</div><h2>Call link unavailable</h2><p>{error}</p><button className="hero-primary" type="button" onClick={() => { window.history.replaceState({}, "", "/"); window.location.reload(); }}>Return to HEXA</button></div></div>;
  }

  if (finished || ["ended", "declined", "rejected", "missed"].includes(call?.status)) {
    return <div className="story-viewer" style={{ zIndex: 1200 }}><div className="coming-card" style={{ width: "min(460px, 92vw)", textAlign: "center" }}><div className="page-heading-icon">✓</div><h2>Call ended</h2><p>This HEXA call session is no longer active.</p><button className="hero-primary" type="button" onClick={() => { window.history.replaceState({}, "", "/"); window.location.reload(); }}>Return to HEXA</button></div></div>;
  }

  const displayName = peer?.full_name || peer?.username || "HEXA User";
  const isCaller = String(call?.caller_id) === String(profile.id);

  if ((isCaller && call?.status === "ringing") || (!isCaller && call?.status === "ringing")) {
    return <div className="story-viewer" style={{ zIndex: 1200 }}><div className="coming-card" style={{ width: "min(480px, 94vw)", textAlign: "center" }}><Avatar src={peer?.avatar_url} name={displayName} size={92} /><h2>{call?.type === "video" ? "HEXA Video Call" : "HEXA Voice Call"}</h2><p>{isCaller ? `Waiting for ${displayName} to join…` : `Incoming call from ${displayName}.`}</p><div className="hero-actions">{!isCaller && <button className="hero-primary" type="button" onClick={joinCall} disabled={joining}>{joining ? "Joining…" : "Join call"}</button>}<button className="hero-secondary" type="button" onClick={() => { window.history.replaceState({}, "", "/"); window.location.reload(); }}>Close</button></div></div></div>;
  }

  return <WebRTCCall profile={profile} call={call} type={call.type} peer={peer} onEnd={() => setFinished(true)} />;
}

function ActionDialogInput({ config, close }) {
  const [value, setValue] = useState("");
  return (
    <form className="hexa-input-dialog" onSubmit={async event => {
      event.preventDefault();
      if (!value.trim()) return;
      close();
      await config.onConfirm?.(value.trim());
    }}>
      <label><span>List name</span><input autoFocus value={value} onChange={event => setValue(event.target.value)} placeholder={config.inputPlaceholder || "Enter a name"} maxLength={40} /></label>
      <div className="hexa-confirm-actions"><button type="button" className="hexa-dialog-secondary" onClick={close}>Cancel</button><button type="submit" className="hexa-dialog-primary">{config.confirmLabel || "Save"}</button></div>
    </form>
  );
}


function PrivacyPolicyPage() {
  return (
    <div className="hexa-policy-page">
      <div className="hexa-policy-card">
        <div className="hexa-brand"><div className="hexa-logo">H</div><div><strong>HEXA</strong><span>Privacy, explained simply.</span></div></div>
        <h1>Privacy Policy</h1>
        <p>HEXA uses your account information and messages to provide communication features. HEXA can start a temporary guest profile automatically so people can enter the app without a login barrier.</p>
        <h2>Temporary guest profiles</h2>
        <p>A guest profile is associated with a Supabase Auth user and a browser session. HEXA does not need your GPS location or a device identifier to create this profile. You can add an email and password in Settings to keep access on another device.</p>
        <h2>Messages and media</h2>
        <p>Messages and uploaded media are stored to provide the communication features you use. HEXA does not silently read unrelated files on your device.</p>
        <h2>Retention</h2>
        <p>Abandoned, empty anonymous profiles are eligible for automatic cleanup after the configured retention period. Accounts with sent messages are not removed by the empty-profile cleanup.</p>
        <h2>Your choices</h2>
        <p>You can upgrade a temporary profile to a permanent account, sign out, and use the Settings area to manage profile information and privacy controls.</p>
        <div className="hexa-policy-actions"><a className="hero-primary" href="/">Back to HEXA</a></div>
      </div>
    </div>
  );
}

function TemporaryGuestBanner({ profile, onOpenSettings }) {
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(HEXA_GUEST_NOTICE_KEY) === "1"; } catch { return false; }
  });
  if (!profile?.is_anonymous || dismissed) return null;
  return <div className="hexa-guest-banner">
    <span className="hexa-guest-banner-icon">🛡️</span>
    <div className="hexa-guest-banner-copy">
      <strong>Temporary HEXA profile</strong>
      <span>We've created a secure, temporary profile for you. To access this chat from another device or phone, add an email and password in your settings. Supabase keeps your session token in your browser so this temporary session can persist.</span>
      <a href="/privacy">Privacy Policy</a>
    </div>
    <button type="button" className="hexa-guest-secure" onClick={onOpenSettings}>Secure my account</button>
    <button type="button" aria-label="Dismiss" className="hexa-guest-dismiss" onClick={() => { try { localStorage.setItem(HEXA_GUEST_NOTICE_KEY,"1"); } catch {} setDismissed(true); }}>×</button>
  </div>;
}

function GuestAccountUpgrade({ session, profile }) {
  const isGuestLineage = Boolean(profile?.guest_created_at);
  const isAnonymous = Boolean(session?.user?.is_anonymous);
  const [email, setEmail] = useState(profile?.email || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  if (!isGuestLineage) return null;

  async function addEmail(e) {
    e.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      const value = email.trim().toLowerCase();
      if (!value) throw new Error("Enter the email address you want to keep this HEXA profile with.");
      const { error: updateError } = await supabase.auth.updateUser({ email: value });
      if (updateError) throw updateError;
      await supabase.from("profiles").update({ email: value, updated_at: new Date().toISOString() }).eq("id", session.user.id);
      setMessage("Verification email sent. After you verify it, return to Settings to set your password.");
    } catch (err) { setError(err?.message || "Unable to add this email."); }
    finally { setBusy(false); }
  }

  async function setAccountPassword(e) {
    e.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      if (password.length < 8) throw new Error("Your password must be at least 8 characters.");
      if (password !== confirmPassword) throw new Error("Passwords do not match.");
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setPassword(""); setConfirmPassword("");
      setMessage("Password added. Your HEXA profile can now be recovered with your email and password.");
    } catch (err) { setError(err?.message || "Unable to set your password."); }
    finally { setBusy(false); }
  }

  return <div className="settings-card guest-upgrade-card">
    <div><strong>🔐 Secure your temporary profile</strong><p>{isAnonymous ? "Add an email now so you can keep this HEXA profile. Supabase will ask you to verify it." : "Your email is linked. Add a password now so you can sign in on another device."}</p></div>
    {isAnonymous ? <form onSubmit={addEmail} className="guest-upgrade-form"><input className="modal-input" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email"/><button className="hero-primary" disabled={busy}>{busy?"Sending…":"Add email"}</button></form> : <form onSubmit={setAccountPassword} className="guest-upgrade-form"><input className="modal-input" type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Create a password" autoComplete="new-password"/><input className="modal-input" type="password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} placeholder="Repeat password" autoComplete="new-password"/><button className="hero-primary" disabled={busy}>{busy?"Saving…":"Add password"}</button></form>}
    {error&&<div className="auth-alert auth-error"><span>!</span>{error}</div>}{message&&<div className="auth-alert auth-success"><span>✓</span>{message}</div>}
  </div>;
}

function AuthenticatedHEXA({ session, onSignOut }) {

  const [profile,setProfile]=useState(null),[profileLoading,setProfileLoading]=useState(true),[activePage,setActivePage]=useState("chat"),[search,setSearch]=useState(""),[notifications,setNotifications]=useState([]),[showNotifications,setShowNotifications]=useState(false),[chatTarget,setChatTarget]=useState(null),[callTarget,setCallTarget]=useState(null);
  useEffect(()=>{let cancelled=false;(async()=>{const result=await ensureHexaProfile(session?.user);if(!cancelled){setProfile(result);setProfileLoading(false)}})();return()=>{cancelled=true}},[session?.user?.id]);
  const { setLanguage: setGlobalLanguage } = useHexaLanguage();
  useEffect(()=>{ if(profile?.language && profile.language !== getSavedHexaLanguage()) setGlobalLanguage(profile.language); },[profile?.language]);
  useEffect(()=>{if(!profile?.id)return;const channel=supabase.channel(`hexa-notifications-${profile.id}`).on("postgres_changes",{event:"INSERT",schema:"public",table:"messages"},p=>{if(p.new?.sender_id===profile.id)return;setNotifications(x=>[{id:Date.now(),title:"New message",body:p.new?.content||"New message",created_at:new Date().toISOString()},...x].slice(0,50))}).subscribe();return()=>supabase.removeChannel(channel)},[profile?.id]);
  if(profileLoading)return <div className="hexa-loading-screen"><div className="loading-logo">H</div><div className="loading-spinner"/><strong>Opening HEXA…</strong><span>Preparing your workspace</span></div>;
  if (typeof window !== "undefined" && /^\/call\/[0-9a-f-]{36}$/i.test(window.location.pathname)) {
    return <CallLinkJoinPage profile={profile} />;
  }
  let page; switch(activePage){
    case "nexus":page=<NexusHome profile={profile} setActivePage={setActivePage}/>;break;
    case "chat":page=<ChatPage profile={profile} initialConversation={chatTarget?.id ? chatTarget : undefined} onStartCall={(c,type)=>setCallTarget({conversation:c,type})} onOpenChatWithUser={()=>setSearch("")}/>;break;
    case "groups":page=<GroupsPage profile={profile} onOpenChat={c=>{setChatTarget(c);setActivePage("chat")}}/>;break;
    case "communities":page=<CommunitiesPage profile={profile}/>;break;
    case "channels":page=<ChannelsPage profile={profile}/>;break;
    case "moments":page=<StatusPage profile={profile}/>;break;
    case "calls":page=<CallsPage profile={profile}/>;break;
    case "kora":page=<KoraPage profile={profile}/>;break;
    case "settings":page=<SettingsPage profile={profile} session={session} onSignOut={onSignOut} onProfileUpdated={setProfile}/>;break;
        case "developer":page=<WorkspacePlaceholder title="" description="Build and connect with HEXA." icon="</>"/>;break;
    default:page=<ChatPage profile={profile} initialConversation={chatTarget?.id ? chatTarget : undefined} onStartCall={(c,type)=>setCallTarget({conversation:c,type})} onOpenChatWithUser={()=>setSearch("")}/>;
  }
  return <div className="hexa-app"><IncomingCallWatcher profile={profile}/><Sidebar activePage={activePage} setActivePage={setActivePage} profile={profile}/><div className="hexa-main"><Topbar profile={profile} search={search} setSearch={setSearch} activePage={activePage} onNotifications={()=>setShowNotifications(v=>!v)} notificationCount={notifications.length} onSettings={()=>setActivePage("settings")}/><main className="hexa-content"><TemporaryGuestBanner profile={profile} onOpenSettings={()=>setActivePage("settings")}/><UniversalSearch search={search} profile={profile} onMessage={async p=>{setSearch("");const {data}=await supabase.from("conversations").select("*").eq("type","direct").or(`and(user_a.eq.${profile.id},user_b.eq.${p.id}),and(user_a.eq.${p.id},user_b.eq.${profile.id})`).limit(1).maybeSingle();if(data){setChatTarget({...data,name:p.full_name||p.username,kind:"direct"});setActivePage("chat")}else{const {data:newChat,error}=await supabase.rpc("hexa_get_or_create_direct",{p_other_user_id:p.id});if(error){alert(error.message);return}setChatTarget({...newChat,name:p.full_name||p.username,kind:"direct"});setActivePage("chat")}}}/>{showNotifications&&<div className="notifications-panel"><div className="notifications-header"><strong>Notifications</strong><button onClick={()=>setNotifications([])}>Clear</button></div>{notifications.length?notifications.map(n=><div className="notification-item" key={n.id}><span>●</span><div><strong>{n.title}</strong><p>{n.body}</p><small>{new Date(n.created_at).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}</small></div></div>):<div className="notification-empty">You're all caught up.</div>}</div>}{page}{callTarget&&<WebRTCCallLauncher profile={profile} target={callTarget} onClose={()=>setCallTarget(null)}/>}</main></div></div>;
}


/* ============================================================
   AUTH BOOTSTRAP
   ============================================================ */

export default function App() {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [authError, setAuthError] = useState("");
  const [showGuestWelcome, setShowGuestWelcome] = useState(false);
  const [guestStarting, setGuestStarting] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaError, setCaptchaError] = useState("");

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

        let {
          data: { session: currentSession },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          throw error;
        }

        if (!currentSession) {
          let explicitSignout = false;
          try { explicitSignout = localStorage.getItem(HEXA_EXPLICIT_SIGNOUT_KEY) === "1"; } catch {}

          // Never create a new Supabase guest user during initial page load.
          // First honor any persisted browser session, then wait for one explicit click.
          const hasLocalToken = hasPersistedSupabaseSessionInBrowser();
          if (!explicitSignout && !hasLocalToken) {
            if (mountedRef.current) setShowGuestWelcome(true);
          }
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

  useEffect(() => {
    const uid = session?.user?.id;
    if (!uid || !session?.user?.is_anonymous) return;
    let stopped = false;
    const touch = async () => {
      if (stopped) return;
      const stamp = new Date().toISOString();
      try { await supabase.from("profiles").update({ guest_last_seen_at: stamp, is_anonymous: true, updated_at: stamp }).eq("id", uid); } catch {}
    };
    touch();
    const timer = window.setInterval(touch, 15 * 60 * 1000);
    const onVisible = () => { if (document.visibilityState === "visible") touch(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { stopped = true; window.clearInterval(timer); document.removeEventListener("visibilitychange", onVisible); };
  }, [session?.user?.id, session?.user?.is_anonymous]);

  async function handleStartGuestChat() {
    if (guestStarting) return;
    setGuestStarting(true);
    setAuthError("");
    try {
      // Double-check the browser session immediately before creating anything.
      const { data: existingSessionData } = await supabase.auth.getSession();
      if (existingSessionData?.session) {
        if (mountedRef.current) {
          setSession(existingSessionData.session);
          setShowGuestWelcome(false);
        }
        return;
      }

      let resolvedCaptchaToken = TURNSTILE_SITE_KEY ? getCurrentTurnstileToken(captchaToken) : "";
      if (TURNSTILE_SITE_KEY && !resolvedCaptchaToken) {
        try { if (window.__HEXA_TURNSTILE_EXECUTE__) window.__HEXA_TURNSTILE_EXECUTE__(); } catch {}
        const started = Date.now();
        while (!resolvedCaptchaToken && Date.now() - started < 15000) {
          await new Promise((r) => setTimeout(r, 250));
          resolvedCaptchaToken = getCurrentTurnstileToken(captchaToken);
          if (!resolvedCaptchaToken) resolvedCaptchaToken = captchaToken || "";
        }
        if (!resolvedCaptchaToken) throw new Error("Cloudflare security verification could not be completed. Please retry.");
      }

      const guest = await supabase.auth.signInAnonymously({
        options: TURNSTILE_SITE_KEY ? { captchaToken: resolvedCaptchaToken } : undefined,
      });
      if (guest.error) {
        const message = guest.error.message || "";
        if (/anonymous/i.test(message) && /disabled|not enabled|not allowed/i.test(message)) {
          throw new Error("HEXA anonymous sign-in is not enabled in Supabase. In Supabase Dashboard open Authentication → Sign In / Providers → Anonymous Sign-Ins and enable it. Then save the settings and try again.");
        }
        if (/captcha|turnstile/i.test(message)) {
          throw new Error(`HEXA security verification was rejected by Supabase: ${message}`);
        }
        throw guest.error;
      }
      if (!guest.data?.session) throw new Error("HEXA could not open the temporary profile.");
      try {
        const widgetId = typeof window !== "undefined" ? window[HEXA_TURNSTILE_WIDGET_KEY] : null;
        if (widgetId !== null && widgetId !== undefined && window.turnstile?.reset) window.turnstile.reset(widgetId);
      } catch {}

      try { localStorage.removeItem(HEXA_EXPLICIT_SIGNOUT_KEY); } catch {}
      await ensureHexaProfile(guest.data.user);

      if (mountedRef.current) {
        setSession(guest.data.session);
        setShowGuestWelcome(false);
      }
    } catch (error) {
      console.error("HEXA guest start:", error);
      if (mountedRef.current) setAuthError(getAuthErrorMessage(error) || "Unable to start HEXA safely. Please try again.");
    } finally {
      if (mountedRef.current) setGuestStarting(false);
    }
  }

  async function handleSignOut() {
    try {
      try { localStorage.setItem(HEXA_EXPLICIT_SIGNOUT_KEY, "1"); } catch {}
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

  if (typeof window !== "undefined" && window.location.pathname === "/privacy") {
    return <HexaLanguageProvider><style>{APP_STYLES}</style><PrivacyPolicyPage /></HexaLanguageProvider>;
  }

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

  if (showGuestWelcome && !session && !authError) {
    return (
      <HexaLanguageProvider>
        <style>{APP_STYLES + `
.hexa-guest-welcome{position:relative;min-height:100dvh;overflow:hidden;display:grid;place-items:center;padding:24px;background:radial-gradient(circle at 20% 15%,rgba(124,92,255,.18),transparent 34%),radial-gradient(circle at 80% 85%,rgba(0,210,190,.13),transparent 30%),var(--hexa-bg,#080a12);color:var(--hexa-text,#fff)}
.hexa-guest-welcome-card{position:relative;z-index:2;width:min(560px,100%);padding:42px 38px;border:1px solid var(--hexa-border-strong,rgba(255,255,255,.12));border-radius:34px;background:color-mix(in srgb,var(--hexa-panel,#121622) 92%,transparent);box-shadow:0 35px 100px rgba(0,0,0,.35),inset 0 1px 0 rgba(255,255,255,.05);backdrop-filter:blur(26px);text-align:center}
.hexa-guest-welcome-logo{width:76px;height:76px;margin:0 auto 20px;border-radius:24px;display:grid;place-items:center;font-size:34px;font-weight:950;color:#fff;background:linear-gradient(135deg,#7657ff,#27d6c5);box-shadow:0 18px 45px rgba(118,87,255,.28)}
.hexa-guest-welcome-eyebrow{font-size:10px;letter-spacing:.16em;font-weight:900;color:var(--hexa-accent-2,#bcaeff)}
.hexa-guest-welcome-card h1{margin:9px 0 4px;font-size:clamp(32px,6vw,46px);letter-spacing:-.04em}
.hexa-guest-welcome-lead{margin:0;font-size:18px;font-weight:850}
.hexa-guest-welcome-copy{max-width:430px;margin:12px auto 22px;color:var(--hexa-muted,#aeb7c8);font-size:13px;line-height:1.7}
.hexa-guest-start-button{width:100%;min-height:60px;border:0;border-radius:18px;padding:0 20px;display:flex;align-items:center;justify-content:center;gap:12px;background:linear-gradient(135deg,#7657ff,#5b7cff);color:#fff;font-size:16px;font-weight:900;cursor:pointer;box-shadow:0 18px 38px rgba(91,124,255,.26);transition:transform .18s ease,box-shadow .18s ease}
.hexa-guest-start-button:hover{transform:translateY(-2px);box-shadow:0 22px 46px rgba(91,124,255,.34)}.hexa-guest-start-button:disabled{opacity:.65;cursor:wait;transform:none}
.hexa-guest-start-icon{width:34px;height:34px;border-radius:11px;background:rgba(255,255,255,.16);display:grid;place-items:center;font-size:19px}
.hexa-guest-welcome-note{display:flex;gap:11px;text-align:left;margin-top:16px;padding:13px;border:1px solid var(--hexa-border,#252b3a);border-radius:16px;background:rgba(255,255,255,.03)}
.hexa-guest-welcome-note>span{font-size:20px}.hexa-guest-welcome-note div{display:grid;gap:3px}.hexa-guest-welcome-note strong{font-size:11px}.hexa-guest-welcome-note small{font-size:10px;line-height:1.5;color:var(--hexa-muted,#aeb7c8)}
.hexa-guest-welcome-privacy{margin-top:15px;font-size:9px;line-height:1.6;color:var(--hexa-muted,#aeb7c8)}.hexa-guest-welcome-privacy a{color:var(--hexa-accent-2,#bcaeff);text-decoration:underline}
.hexa-guest-welcome-glow{position:absolute;border-radius:50%;filter:blur(45px);pointer-events:none}.hexa-guest-welcome-glow-a{width:260px;height:260px;left:-90px;top:-70px;background:rgba(118,87,255,.18)}.hexa-guest-welcome-glow-b{width:240px;height:240px;right:-80px;bottom:-70px;background:rgba(39,214,197,.12)}
@media(max-width:700px){.hexa-guest-welcome{padding:14px}.hexa-guest-welcome-card{padding:30px 20px;border-radius:27px}.hexa-guest-welcome-logo{width:64px;height:64px;border-radius:20px;font-size:28px}.hexa-guest-welcome-card h1{font-size:34px}.hexa-guest-welcome-copy{font-size:12px}.hexa-guest-start-button{min-height:58px}}
`}</style>
        <GuestWelcomeScreen onStart={() => {
          try { if (window.__HEXA_TURNSTILE_EXECUTE__) window.__HEXA_TURNSTILE_EXECUTE__(); } catch {}
          handleStartGuestChat();
        }} busy={guestStarting} captchaToken={captchaToken} onCaptchaToken={(token) => { setCaptchaError(""); setCaptchaToken(token); }} onCaptchaError={(message) => { setCaptchaError(message); setCaptchaToken(""); }} />
        {captchaError ? <div style={{marginTop:10,color:"#b42318",fontSize:12,fontWeight:700,textAlign:"center"}}>{captchaError} <button type="button" onClick={() => window.turnstile?.reset?.(window[HEXA_TURNSTILE_WIDGET_KEY])} style={{marginLeft:6,textDecoration:"underline",background:"none",border:0,cursor:"pointer",fontWeight:800}}>Retry</button></div> : null}
      </HexaLanguageProvider>
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
    <HexaLanguageProvider>
    <HexaErrorBoundary>
      <style>{APP_STYLES + `

/* ============================================================
   HEXA ACTION SYSTEM — SELECTION + ACTION SURFACES
   ============================================================ */
.message-selection-toolbar{
  position:absolute;
  z-index:75;
  top:10px;
  left:10px;
  right:10px;
  min-height:64px;
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:10px;
  padding:8px 10px;
  border:1px solid var(--hexa-border-strong);
  border-radius:18px;
  background:color-mix(in srgb,var(--hexa-panel) 94%,transparent);
  box-shadow:0 20px 55px rgba(0,0,0,.24), inset 0 1px 0 rgba(255,255,255,.05);
  backdrop-filter:blur(20px);
}
.selection-toolbar-leading{display:flex;align-items:center;gap:9px;min-width:0}.selection-close{width:40px;height:40px;flex:0 0 40px;border:1px solid var(--hexa-border);border-radius:13px;background:var(--hexa-panel-2);color:var(--hexa-text);font-size:25px;line-height:1;cursor:pointer}.selection-close:hover{background:var(--hexa-panel-3);transform:translateY(-1px)}
.selection-count-block{display:grid;gap:2px;min-width:86px}.selection-count-block strong{font-size:17px;line-height:1}.selection-count-block span{font-size:10px;color:var(--hexa-muted);white-space:nowrap}
.selection-toolbar-actions{display:flex;align-items:center;gap:4px;overflow:auto;scrollbar-width:none}.selection-toolbar-actions::-webkit-scrollbar{display:none}.selection-tool{width:48px;min-width:48px;height:48px;border:1px solid transparent;border-radius:13px;background:transparent;color:var(--hexa-text);display:grid;place-items:center;align-content:center;gap:1px;cursor:pointer}.selection-tool span{font-size:18px;line-height:1}.selection-tool small{font-size:8px;color:var(--hexa-muted);font-weight:800}.selection-tool:hover{background:var(--hexa-panel-3);border-color:var(--hexa-border)}.selection-tool:disabled{opacity:.34;cursor:not-allowed}.selection-tool.danger span,.selection-tool.danger small{color:var(--hexa-danger)}

.message-action-sheet-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:5px 5px 9px}.message-action-sheet-head>div{display:grid;gap:2px}.message-action-sheet-kicker{font-size:8px;letter-spacing:.12em;font-weight:900;color:var(--hexa-accent-2)}.message-action-sheet-head strong{font-size:14px}.message-action-sheet-close{width:30px;height:30px;border:1px solid var(--hexa-border);border-radius:10px;background:var(--hexa-panel-2);color:var(--hexa-text);font-size:20px;line-height:1;cursor:pointer}.message-action-sheet-close:hover{background:var(--hexa-panel-3)}
.message-action-item{position:relative;min-height:54px}.message-action-item:active{transform:scale(.985)}.message-action-item:hover .message-action-icon{transform:translateY(-1px)}.message-action-icon{transition:transform .14s ease,background .14s ease}.message-action-copy small{max-width:220px}.message-action-footer{padding:8px 10px 3px;color:var(--hexa-muted);font-size:9px;text-align:center;opacity:.78}

/* Better inline / hover actions */
.message-tools{gap:2px!important;padding:4px!important;border-radius:13px!important;background:color-mix(in srgb,var(--hexa-panel) 94%,transparent)!important;box-shadow:0 10px 30px rgba(0,0,0,.18)!important;backdrop-filter:blur(14px)}.message-tools button{width:32px;height:30px;border-radius:9px!important;display:grid;place-items:center}.message-tools button:hover{background:var(--hexa-panel-3)!important}.reaction-picker{gap:2px!important;padding:5px!important;border-radius:14px!important;box-shadow:0 14px 35px rgba(0,0,0,.2)!important}.reaction-picker button{width:34px;height:34px;border:0;border-radius:9px;background:transparent}.reaction-picker button:hover{background:var(--hexa-panel-3)}

/* Cleaner reply/edit surface */
.quoted-message-button{width:100%;display:flex;align-items:stretch;gap:8px;margin:0 0 8px;padding:0;border:0;background:rgba(127,127,127,.09);color:inherit;border-radius:9px;text-align:left;cursor:pointer;overflow:hidden}.quoted-message-bar{width:3px;flex:0 0 3px;background:var(--hexa-accent);border-radius:999px}.quoted-message-copy{display:grid;gap:2px;padding:7px 8px;min-width:0}.quoted-message-copy strong{font-size:11px;color:var(--hexa-accent-2)}.quoted-message-copy span{font-size:11px;color:var(--hexa-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.hexa-reply-highlight{outline:2px solid var(--hexa-accent);outline-offset:3px;animation:hexaReplyPulse 1.4s ease}@keyframes hexaReplyPulse{0%,100%{box-shadow:0 0 0 0 rgba(124,92,255,0)}35%{box-shadow:0 0 0 7px rgba(124,92,255,.18)}}
.reply-composer-bar{display:flex;align-items:center;gap:8px}.reply-composer-accent{width:3px;height:34px;flex:0 0 3px;background:var(--hexa-accent);border-radius:999px}.reply-composer-copy{display:grid;gap:2px;flex:1;min-width:0}.reply-composer-copy strong{font-size:11px;color:var(--hexa-accent-2)}.reply-composer-copy span{font-size:12px;color:var(--hexa-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.reply-bar{min-height:52px!important;padding:8px 12px!important;background:var(--hexa-panel)!important;box-shadow:0 -8px 25px rgba(0,0,0,.08)}.reply-bar>div{min-width:0;border-left:3px solid var(--hexa-accent);padding-left:9px;display:grid;gap:3px}.reply-bar strong{font-size:10px;color:var(--hexa-accent-2)!important}.reply-bar span{max-width:min(68vw,560px);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--hexa-text)!important}.reply-bar button{width:34px;height:34px;border-radius:10px;background:var(--hexa-panel-2);border:1px solid var(--hexa-border)!important;cursor:pointer}.reply-bar button:hover{background:var(--hexa-panel-3)}

/* Polished chat menu and other action popovers */
.chat-settings-popover.whatsapp-chat-menu{border-radius:20px!important;padding:7px!important;box-shadow:0 22px 60px rgba(0,0,0,.25)!important;backdrop-filter:blur(20px)}.whatsapp-chat-menu button{min-height:46px!important;border-radius:12px!important;padding:9px 11px!important}.whatsapp-chat-menu button:hover{transform:translateX(1px);background:var(--hexa-panel-3)!important}.whatsapp-chat-menu button>span{font-weight:700}.whatsapp-chat-menu button small{line-height:1.35}.whatsapp-chat-menu .danger-menu-item{background:rgba(220,70,70,.05)}.whatsapp-chat-menu .danger-menu-item:hover{background:rgba(220,70,70,.11)!important}

[data-hexa-theme="white"] .message-selection-toolbar,[data-hexa-theme="white"] .message-action-sheet-head{background:#fff}.message-selection-toolbar{color:var(--hexa-text)}
@media(max-width:700px){
  .message-selection-toolbar{top:6px;left:6px;right:6px;border-radius:16px;padding:7px}.selection-count-block strong{font-size:15px}.selection-close{width:38px;height:38px;flex-basis:38px}.selection-tool{width:44px;min-width:44px;height:44px}.message-action-popover{box-shadow:0 -8px 50px rgba(0,0,0,.28)!important}
}

/* HEXA action outcome UI */
.hexa-action-toast{position:fixed;left:50%;bottom:24px;transform:translate(-50%,18px);opacity:0;z-index:5000;display:flex;align-items:center;gap:9px;max-width:min(460px,calc(100vw - 28px));padding:11px 14px;border:1px solid var(--hexa-border-strong);border-radius:14px;background:color-mix(in srgb,var(--hexa-panel) 96%,transparent);color:var(--hexa-text);box-shadow:0 18px 50px rgba(0,0,0,.28);backdrop-filter:blur(18px);font-size:12px;font-weight:700;transition:opacity .18s ease,transform .18s ease}.hexa-action-toast.show{opacity:1;transform:translate(-50%,0)}.hexa-action-toast.success .hexa-toast-icon{background:rgba(40,200,120,.12);color:#22c77a}.hexa-action-toast.danger .hexa-toast-icon{background:rgba(240,80,90,.12);color:#f05a66}.hexa-toast-icon{width:24px;height:24px;border-radius:8px;background:rgba(127,127,127,.12);display:grid;place-items:center;font-weight:900}.hexa-action-dialog-overlay{position:fixed;inset:0;z-index:4000;background:rgba(3,6,11,.62);display:grid;place-items:center;padding:18px;backdrop-filter:blur(8px)}.hexa-action-dialog{position:relative;overflow:hidden;width:min(470px,100%);border:1px solid var(--hexa-border-strong);border-radius:24px;background:var(--hexa-panel);box-shadow:0 30px 100px rgba(0,0,0,.4);padding:18px}.hexa-action-dialog-glow{position:absolute;width:180px;height:180px;right:-80px;top:-90px;background:radial-gradient(circle,rgba(124,92,255,.24),transparent 70%);pointer-events:none}.hexa-action-dialog-head{position:relative;display:grid;grid-template-columns:42px 1fr 34px;gap:11px;align-items:center}.hexa-action-dialog-badge{width:42px;height:42px;border-radius:13px;display:grid;place-items:center;background:rgba(124,92,255,.12);border:1px solid rgba(124,92,255,.22);font-weight:900;color:var(--hexa-accent-2)}.hexa-action-dialog.danger .hexa-action-dialog-badge{background:rgba(240,80,90,.10);border-color:rgba(240,80,90,.22);color:#ef6570}.hexa-action-dialog-head strong{display:block;font-size:15px}.hexa-action-dialog-head span{display:block;margin-top:3px;color:var(--hexa-muted);font-size:10px;line-height:1.4}.hexa-action-dialog-close{width:34px;height:34px;border:1px solid var(--hexa-border);border-radius:10px;background:var(--hexa-panel-2);color:var(--hexa-text);font-size:20px;cursor:pointer}.hexa-choice-list{display:grid;gap:7px;margin-top:16px}.hexa-choice-card{display:grid;grid-template-columns:40px 1fr 20px;gap:11px;align-items:center;padding:10px;border:1px solid var(--hexa-border);border-radius:15px;background:var(--hexa-panel-2);color:var(--hexa-text);text-align:left;cursor:pointer}.hexa-choice-card:hover{border-color:var(--hexa-border-strong);background:var(--hexa-panel-3);transform:translateY(-1px)}.hexa-choice-card.selected{border-color:rgba(124,92,255,.48);background:rgba(124,92,255,.09)}.hexa-choice-icon{width:40px;height:40px;border-radius:12px;display:grid;place-items:center;background:var(--hexa-panel);border:1px solid var(--hexa-border);font-weight:900}.hexa-choice-copy{display:grid;gap:3px}.hexa-choice-copy strong{font-size:12px}.hexa-choice-copy small{font-size:9px;color:var(--hexa-muted)}.hexa-choice-check{color:var(--hexa-muted);font-size:18px}.hexa-choice-card.selected .hexa-choice-check{color:var(--hexa-accent-2)}.hexa-input-dialog{display:grid;gap:14px;margin-top:16px}.hexa-input-dialog label{display:grid;gap:7px}.hexa-input-dialog label span{font-size:10px;color:var(--hexa-muted);font-weight:800;text-transform:uppercase;letter-spacing:.06em}.hexa-input-dialog input{width:100%;box-sizing:border-box;border:1px solid var(--hexa-border);border-radius:13px;padding:13px 14px;background:var(--hexa-panel-2);color:var(--hexa-text);outline:none}.hexa-input-dialog input:focus{border-color:var(--hexa-accent)}.hexa-confirm-body{margin-top:16px}.hexa-confirm-body p{margin:0;color:var(--hexa-muted);font-size:12px;line-height:1.55}.hexa-confirm-icon{width:48px;height:48px;border-radius:15px;display:grid;place-items:center;background:rgba(240,80,90,.10);color:#ef6570;font-size:20px;font-weight:900;margin-bottom:12px}.hexa-confirm-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:18px}.hexa-dialog-secondary,.hexa-dialog-primary{min-height:42px;padding:0 15px;border-radius:12px;border:1px solid var(--hexa-border);font-weight:800;cursor:pointer}.hexa-dialog-secondary{background:var(--hexa-panel-2);color:var(--hexa-text)}.hexa-dialog-primary{background:var(--hexa-accent);color:#fff;border-color:transparent}.hexa-dialog-primary.danger{background:#d94c58}.forward-modal{width:min(560px,calc(100vw - 24px))!important;border-radius:24px!important;padding:16px!important}.forward-modal-header{padding-bottom:12px!important}.forward-title-wrap{display:flex;align-items:center;gap:10px}.forward-title-icon{width:42px;height:42px;border-radius:13px;background:rgba(124,92,255,.10);border:1px solid rgba(124,92,255,.22);display:grid;place-items:center;font-size:21px;color:var(--hexa-accent-2)}.forward-preview-card{padding:11px;border:1px solid var(--hexa-border);background:var(--hexa-panel-2);border-radius:15px;margin:6px 0 10px}.forward-preview-label{font-size:8px;letter-spacing:.09em;color:var(--hexa-muted);font-weight:900;margin-bottom:8px}.forward-preview-body{display:flex;align-items:center;gap:10px}.forward-preview-type{width:36px;height:36px;display:grid;place-items:center;border-radius:11px;background:var(--hexa-panel);border:1px solid var(--hexa-border);font-size:18px}.forward-preview-body>div{min-width:0;display:grid;gap:3px}.forward-preview-body strong{font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:390px}.forward-preview-body small{font-size:9px;color:var(--hexa-muted)}.forward-search-box{display:flex;align-items:center;gap:8px;border:1px solid var(--hexa-border);background:var(--hexa-panel-2);border-radius:13px;padding:0 11px;margin:8px 0}.forward-search-box input{width:100%;border:0;outline:0;background:transparent;color:var(--hexa-text);height:40px}.forward-list{display:grid!important;gap:5px!important;max-height:48vh!important;overflow:auto!important;padding-right:2px}.forward-list .person-result{display:grid!important;grid-template-columns:44px 1fr!important;gap:10px!important;align-items:center!important;padding:9px!important;border:1px solid transparent!important;border-radius:14px!important;background:transparent!important;text-align:left!important}.forward-list .person-result:hover{border-color:var(--hexa-border)!important;background:var(--hexa-panel-2)!important}.forward-list .person-result>div{min-width:0;display:grid;gap:3px}.forward-list .person-result strong{font-size:12px}.forward-list .person-result span{font-size:9px;color:var(--hexa-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}@media(max-width:640px){.hexa-action-dialog-overlay{padding:10px;align-items:end}.hexa-action-dialog{border-radius:22px 22px 18px 18px;padding:15px}.hexa-confirm-actions{display:grid;grid-template-columns:1fr 1fr}.hexa-dialog-secondary,.hexa-dialog-primary{width:100%}.forward-modal{max-height:86vh;overflow:auto}.forward-list{max-height:44vh!important}}

/* ============================================================
   MOMENTS — PREMIUM SOCIAL INTERACTIONS
   ============================================================ */
.moments-story-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:12px 2px 4px}
.moment-action-button{min-width:58px;min-height:48px;border:1px solid rgba(15,23,42,.09);border-radius:16px;background:#fff;display:flex;align-items:center;justify-content:center;gap:6px;cursor:pointer;transition:transform .18s ease,box-shadow .18s ease,border-color .18s ease,background .18s ease}
.moment-action-button:hover{transform:translateY(-1px);box-shadow:0 8px 22px rgba(15,23,42,.10);border-color:rgba(15,23,42,.16)}
.moment-action-button span{font-size:20px;line-height:1}
.moment-action-button small{font-size:12px;font-weight:800;color:#475569}
.moment-action-button.active{background:#fff1f2;border-color:#fecdd3;color:#e11d48}
.moment-action-button.liked span{animation:hexaMomentLike .28s ease}
@keyframes hexaMomentLike{0%{transform:scale(.7)}60%{transform:scale(1.22)}100%{transform:scale(1)}}
.moment-reaction-picker{display:flex;align-items:center;gap:3px;padding:4px 6px;border:1px solid rgba(15,23,42,.08);background:#f8fafc;border-radius:16px}
.moment-reaction-button{width:34px;height:34px;border:0;background:transparent;border-radius:10px;font-size:20px;cursor:pointer;transition:transform .15s ease,background .15s ease}
.moment-reaction-button:hover{transform:scale(1.18);background:#fff}
.moment-reaction-button.active{background:#fff;box-shadow:0 2px 8px rgba(15,23,42,.10)}
.premium-comment{padding:10px 0;border-bottom:1px solid rgba(15,23,42,.06)}
.status-comment-meta{display:flex;align-items:center;gap:10px;margin-top:4px}
.status-comment-meta small{color:#64748b}
.status-comment-meta button{border:0;background:transparent;font-size:12px;font-weight:800;color:#334155;cursor:pointer;padding:2px 0}
.status-comment-meta button:hover{text-decoration:underline}
.status-comment-form{display:flex;gap:8px;margin-top:12px;padding:8px;border:1px solid rgba(15,23,42,.09);border-radius:18px;background:#fff;box-shadow:0 8px 24px rgba(15,23,42,.06)}
.status-comment-form input{flex:1;border:0;outline:none;background:transparent;padding:9px 10px;font-size:14px}
.status-comment-form button{border:0;border-radius:13px;background:#111827;color:#fff;padding:9px 14px;font-weight:800;cursor:pointer}
.moments-viewer-stats{display:flex;align-items:center;gap:18px;padding:8px 0 2px;font-size:13px;color:#64748b}
.moments-viewer-stats b{color:#111827}
@media(max-width:700px){.moment-reaction-picker{order:2;width:100%;justify-content:space-around}.moment-action-button{flex:1}.moments-story-actions{gap:6px}.status-comment-form{position:sticky;bottom:0}}
`}
</style>

      {session ? (
        <AuthenticatedHEXA
          session={session}
          onSignOut={handleSignOut}
        />
      ) : (
        <AuthScreen />
      )}
    </HexaErrorBoundary>
    </HexaLanguageProvider>
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

.hexa-message-row {
  width: 100%;
  display: flex;
  align-items: flex-end;
  gap: 7px;
  margin: 7px 0;
}
.hexa-message-row.mine {
  justify-content: flex-end;
  flex-direction: row-reverse;
}
.hexa-message-row.incoming {
  justify-content: flex-start;
}
.hexa-message-row.mine .message-bubble {
  margin-left: auto;
  margin-right: 0;
}
.hexa-message-row.incoming .message-bubble {
  margin-right: auto;
  margin-left: 0;
}
.hexa-message-row.mine .message-bubble-wrap {
  margin-left: auto;
}
.hexa-message-row.incoming .message-bubble-wrap {
  margin-right: auto;
}
.chat-menu-backdrop {
  position: fixed;
  inset: 0;
  z-index: 70;
  background: transparent;
}
.whatsapp-chat-menu {
  position: absolute;
  right: 14px;
  top: 62px;
  z-index: 80;
  width: min(330px, calc(100vw - 28px));
  max-height: min(78vh, 690px);
  overflow-y: auto;
  padding: 7px;
  border-radius: 16px;
}
.whatsapp-chat-menu > button {
  width: 100%;
  display: grid;
  grid-template-columns: 26px minmax(0,1fr);
  align-items: center;
  gap: 9px;
  min-height: 44px;
  padding: 9px 11px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: var(--hexa-text);
  text-align: left;
  cursor: pointer;
}
.whatsapp-chat-menu > button:hover {
  background: rgba(255,255,255,.055);
}
.whatsapp-chat-menu > button > span {
  font-size: 12px;
  font-weight: 650;
}
.whatsapp-chat-menu > button > small {
  grid-column: 2;
  margin-top: -7px;
  color: var(--hexa-muted);
  font-size: 9px;
  line-height: 1.35;
}
.chat-menu-divider {
  height: 1px;
  background: var(--hexa-border);
  margin: 6px 7px;
}
.whatsapp-chat-menu .danger-menu-item {
  color: #ff7070;
}
@media (max-width: 700px) {
  .whatsapp-chat-menu {
    right: 8px;
    top: 58px;
    width: min(340px, calc(100vw - 16px));
    max-height: 74vh;
  }
  .hexa-message-row .message-bubble {
    max-width: 82%;
  }
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

/* =========================================================
   HEXA EMOJI PICKER
   ========================================================= */
.hexa-emoji-picker{width:min(440px,calc(100vw - 20px));max-height:min(640px,74vh);display:flex;flex-direction:column;overflow:hidden;padding:12px;border:1px solid var(--hexa-border-strong);border-radius:20px;background:var(--hexa-panel);box-shadow:var(--hexa-shadow);backdrop-filter:blur(22px)}
.emoji-picker-header{display:flex;align-items:center;justify-content:space-between;padding:2px 4px 10px}.emoji-picker-title{display:flex;align-items:center;gap:8px}.emoji-picker-title span{padding:3px 8px;border-radius:999px;background:var(--hexa-panel-3);color:var(--hexa-muted);font-size:10px}.emoji-close{width:30px;height:30px;border-radius:50%;background:var(--hexa-panel-3);color:var(--hexa-text);font-size:20px}.emoji-search-row{position:relative;margin-bottom:8px}.emoji-search{width:100%;height:40px;padding:0 38px 0 13px;border:1px solid var(--hexa-border);border-radius:12px;background:var(--hexa-panel-2);color:var(--hexa-text);outline:none}.emoji-clear-search{position:absolute;right:5px;top:5px;width:30px;height:30px;border-radius:50%;background:transparent;color:var(--hexa-muted);font-size:18px}.emoji-category-tabs{display:flex;gap:4px;overflow-x:auto;padding-bottom:7px}.emoji-category-tabs button{flex:0 0 36px;width:36px;height:36px;border-radius:10px;background:transparent;color:var(--hexa-text);font-size:19px}.emoji-category-tabs button:hover,.emoji-category-tabs button.active{background:var(--hexa-accent);color:#fff}.emoji-tone-row{display:flex;align-items:center;gap:4px;padding:7px 3px;border-top:1px solid var(--hexa-border);border-bottom:1px solid var(--hexa-border);overflow-x:auto}.emoji-tone-row span{margin-right:5px;color:var(--hexa-muted);font-size:10px;white-space:nowrap}.emoji-tone-row button{min-width:34px;height:30px;border-radius:9px;background:transparent;font-size:17px}.emoji-tone-row button.selected,.emoji-tone-row button:hover{background:var(--hexa-panel-3)}.emoji-picker-label{padding:9px 3px 6px;color:var(--hexa-muted);font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.08em}.hexa-emoji-grid{display:grid;grid-template-columns:repeat(9,minmax(0,1fr));gap:2px;flex:1;min-height:0;overflow-y:auto;padding:2px}.emoji-item{position:relative;aspect-ratio:1;display:flex;align-items:center;justify-content:center;border-radius:10px;background:transparent;color:var(--hexa-text);font-size:27px;transition:transform .1s ease,background .1s ease}.emoji-item:hover{transform:scale(1.12);background:var(--hexa-panel-3);z-index:2}.emoji-item:active{transform:scale(.92)}.emoji-item small{position:absolute;right:1px;bottom:1px;color:var(--hexa-accent-2);font-size:8px}.emoji-empty{min-height:160px;display:flex;align-items:center;justify-content:center;flex-direction:column;text-align:center;color:var(--hexa-muted)}.emoji-empty span{font-size:34px;margin-bottom:7px}.emoji-empty strong{color:var(--hexa-text)}.emoji-empty p{font-size:11px;margin:5px 0}.emoji-picker-footer{display:flex;justify-content:space-between;gap:8px;padding:8px 3px 1px;border-top:1px solid var(--hexa-border);color:var(--hexa-muted);font-size:9px}
@media(max-width:700px){.hexa-emoji-picker{width:calc(100vw - 16px);max-height:68vh}.hexa-emoji-grid{grid-template-columns:repeat(7,minmax(0,1fr))}.emoji-item{font-size:24px}}

/* HEXA feature extensions */
.notifications-panel{position:absolute;right:22px;top:72px;width:min(390px,calc(100vw - 28px));background:var(--hexa-panel);border:1px solid var(--hexa-border-strong);border-radius:18px;box-shadow:var(--hexa-shadow);z-index:100;padding:10px}.notifications-header{display:flex;justify-content:space-between;align-items:center;padding:12px 10px;border-bottom:1px solid var(--hexa-border)}.notifications-header button{background:none;border:0;color:var(--hexa-accent-2)}.notification-item{display:flex;gap:12px;padding:14px 10px;border-bottom:1px solid var(--hexa-border)}.notification-item>span{color:var(--hexa-accent)}.notification-item p{margin:4px 0;color:var(--hexa-muted)}.notification-item small{color:var(--hexa-muted)}.notification-empty{padding:28px;text-align:center;color:var(--hexa-muted)}.notification-button{position:relative}.notification-button b{position:absolute;right:0;top:-5px;min-width:17px;height:17px;padding:0 4px;border-radius:99px;background:var(--hexa-danger);font-size:9px;display:grid;place-items:center;color:#fff}.entity-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:14px}.entity-card{padding:20px;border:1px solid var(--hexa-border);background:var(--hexa-panel);border-radius:18px;display:flex;flex-direction:column;gap:9px}.entity-card span,.entity-card small{color:var(--hexa-muted)}.entity-modal,.status-modal{width:min(620px,calc(100vw - 28px));max-height:90vh;overflow:auto;background:var(--hexa-panel);border:1px solid var(--hexa-border-strong);border-radius:22px;padding:22px;box-shadow:var(--hexa-shadow)}.modal-input{width:100%;margin:8px 0;padding:13px 14px;border-radius:12px;border:1px solid var(--hexa-border);background:rgba(255,255,255,.035);color:var(--hexa-text);outline:none}.modal-textarea{min-height:90px;resize:vertical}.media-picker{width:100%;display:flex;align-items:center;gap:14px;text-align:left;padding:12px;border:1px dashed var(--hexa-border-strong);border-radius:14px;background:transparent;color:var(--hexa-text);margin:8px 0 14px}.media-picker img{width:52px;height:52px;border-radius:12px;object-fit:cover}.media-picker span{width:52px;height:52px;border-radius:12px;display:grid;place-items:center;background:var(--hexa-panel-3);font-size:25px}.media-picker small{display:block;color:var(--hexa-muted);margin-top:3px}.member-picker{display:grid;gap:7px;max-height:180px;overflow:auto;margin-bottom:16px}.member-option{display:flex;align-items:center;gap:9px;padding:7px;border-radius:10px}.member-option:hover{background:rgba(255,255,255,.04)}.status-composer-tabs{display:flex;gap:8px;margin-bottom:10px}.status-composer-tabs button{flex:1;padding:11px;border:1px solid var(--hexa-border);background:var(--hexa-panel-2);color:var(--hexa-text);border-radius:11px}.status-media-preview img,.status-media-preview video{width:100%;max-height:300px;object-fit:contain;border-radius:14px;margin:8px 0}.privacy-row{display:flex;align-items:center;justify-content:space-between;margin:12px 0;color:var(--hexa-muted)}.privacy-row select{background:var(--hexa-panel-2);color:var(--hexa-text);border:1px solid var(--hexa-border);padding:9px;border-radius:10px}.status-card.unseen .status-preview{box-shadow:0 0 0 3px var(--hexa-accent)}.status-card.seen{opacity:.8}.status-preview img,.status-preview video{width:100%;height:100%;object-fit:cover;border-radius:inherit}.story-viewer{position:fixed;inset:0;background:rgba(0,0,0,.92);z-index:500;display:grid;place-items:center;padding:20px}.story-content{width:min(520px,100%);height:min(88vh,820px);position:relative;background:#000;border-radius:20px;overflow:hidden;display:flex;align-items:center;justify-content:center}.story-content img,.story-content video{width:100%;height:100%;object-fit:contain}.story-text{font-size:34px;font-weight:800;text-align:center;padding:30px}.story-caption{position:absolute;left:18px;right:18px;bottom:58px;padding:10px;border-radius:10px;background:rgba(0,0,0,.45)}.story-actions{position:absolute;bottom:10px;right:12px;display:flex;gap:6px}.story-actions button,.story-close{border:0;background:rgba(255,255,255,.12);color:#fff;border-radius:50%;width:38px;height:38px}.story-close{position:absolute;right:22px;top:20px;z-index:2;font-size:25px}.story-progress{position:absolute;top:12px;left:20px;right:20px;height:3px;background:rgba(255,255,255,.35);z-index:2}.search-results{display:grid;gap:6px;padding:8px}.search-person{display:flex;align-items:center;gap:12px;padding:10px;border:0;background:transparent;color:var(--hexa-text);text-align:left;border-radius:12px}.search-person:hover{background:rgba(255,255,255,.05)}.search-person div{flex:1}.search-person span{display:block;color:var(--hexa-muted);font-size:12px}.search-person b{font-size:12px;color:var(--hexa-accent-2)}.settings-grid{display:grid;gap:12px;max-width:760px}.settings-card{display:flex;align-items:center;gap:16px;justify-content:space-between;padding:18px;border:1px solid var(--hexa-border);background:var(--hexa-panel);border-radius:18px}.settings-card>div:first-child{flex:1}.settings-card p{color:var(--hexa-muted);margin:5px 0 0}.settings-card button{border:1px solid var(--hexa-border);background:var(--hexa-panel-2);color:var(--hexa-text);padding:10px 14px;border-radius:10px}.settings-card.danger button{color:#fff;background:var(--hexa-danger);border-color:transparent}
.reply-bar{display:flex;justify-content:space-between;gap:12px;align-items:center;padding:8px 14px;background:var(--hexa-panel-2);border-top:1px solid var(--hexa-border);font-size:12px;color:var(--hexa-muted)}.reply-bar button{border:0;background:none;color:var(--hexa-text)}.message-bubble-wrap{position:relative;max-width:86%}.message-tools{display:none;position:absolute;right:0;top:-34px;background:var(--hexa-panel);border:1px solid var(--hexa-border);border-radius:10px;padding:3px;z-index:4}.message-bubble-wrap:hover .message-tools{display:flex}.message-tools button{border:0;background:none;color:var(--hexa-text);padding:5px}.reaction-picker{position:absolute;bottom:32px;right:0;display:flex;background:var(--hexa-panel);border:1px solid var(--hexa-border);border-radius:14px;padding:5px;box-shadow:var(--hexa-shadow)}.reaction-summary{font-size:12px;background:var(--hexa-panel-2);border-radius:10px;padding:3px 7px;display:inline-block;margin-top:3px}.hexa-reaction-pulse{animation:hexaReactionPulse .62s cubic-bezier(.22,1,.36,1)}
.hexa-reaction-burst{position:absolute;inset:0;pointer-events:none;z-index:8;display:grid;place-items:center;overflow:visible}
.hexa-reaction-particle{position:absolute;font-size:20px;filter:drop-shadow(0 4px 8px rgba(0,0,0,.18));animation:hexaReactionFloat 1.08s cubic-bezier(.16,.84,.31,1) forwards;animation-delay:var(--burst-delay);opacity:0;transform:translate3d(0,8px,0) scale(.55) rotate(0deg)}
@keyframes hexaReactionPulse{0%{transform:scale(1)}35%{transform:scale(1.018)}65%{transform:scale(.996)}100%{transform:scale(1)}}
@keyframes hexaReactionFloat{0%{opacity:0;transform:translate3d(0,8px,0) scale(.55) rotate(0deg)}18%{opacity:1}72%{opacity:1}100%{opacity:0;transform:translate3d(var(--burst-x),var(--burst-y),0) scale(1.05) rotate(var(--burst-rotate))}}
.message-media{display:block;max-width:280px;max-height:340px;border-radius:12px;object-fit:contain}.gif-panel{position:absolute;left:14px;right:14px;bottom:76px;background:var(--hexa-panel);border:1px solid var(--hexa-border-strong);border-radius:16px;padding:10px;z-index:30;box-shadow:var(--hexa-shadow)}.gif-search{display:flex;gap:7px}.gif-search input{flex:1}.gif-grid{display:grid;grid-template-columns:repeat(6,1fr);gap:6px;max-height:240px;overflow:auto;margin-top:8px}.gif-grid button{padding:0;border:0;background:none}.gif-grid img{width:100%;height:70px;object-fit:cover;border-radius:7px}.muted{color:var(--hexa-muted)}

/* HEXA wallet UI */
.wallet-credit-modal{width:min(560px,calc(100vw - 28px))}.wallet-security-field{display:grid;gap:4px;margin-top:10px}.wallet-security-field>span{font-size:11px;color:var(--hexa-muted)}.wallet-security-note{margin:12px 0;padding:12px;border:1px solid var(--hexa-border);background:rgba(124,92,255,.07);border-radius:12px;color:var(--hexa-muted);font-size:11px;line-height:1.5}.wallet-buy-button{width:100%;margin-top:8px}.hexa-modal-backdrop{position:fixed;inset:0;z-index:900;background:rgba(0,0,0,.72);display:grid;place-items:center;padding:14px}
.wallet-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px}.wallet-balance-card{padding:24px;border:1px solid var(--hexa-border);background:linear-gradient(135deg,var(--hexa-panel),var(--hexa-panel-2));border-radius:20px;display:grid;gap:8px}.wallet-balance-card span{color:var(--hexa-muted);font-size:11px}.wallet-balance-card strong{font-size:32px;letter-spacing:-.03em}.wallet-balance-card small{color:var(--hexa-muted);font-size:10px}.wallet-fund-card{align-items:center}.wallet-fund-card .modal-input{margin:0}.wallet-fund-card .hero-primary{white-space:nowrap}

/* HEXA master feature UI */
.hexa-audio-message{display:flex;align-items:center;gap:7px}.hexa-audio-message audio{max-width:210px;height:34px}.hexa-audio-message select{background:var(--hexa-panel-2);color:var(--hexa-text);border:1px solid var(--hexa-border);border-radius:8px;padding:4px}.message-context-menu{position:fixed;z-index:1000;min-width:190px;background:var(--hexa-panel);border:1px solid var(--hexa-border-strong);border-radius:14px;padding:6px;box-shadow:var(--hexa-shadow);display:grid;gap:2px}.message-context-menu button{border:0;background:none;color:var(--hexa-text);padding:10px;text-align:left;border-radius:9px}.message-context-menu button:hover{background:rgba(255,255,255,.06)}.message-context-menu .danger-text{color:var(--hexa-danger)}
.message-context-menu{display:none}
.message-action-popover{position:fixed;z-index:1200;width:min(318px,calc(100vw - 24px));max-height:min(570px,calc(100vh - 24px));overflow:auto;background:var(--hexa-panel);border:1px solid var(--hexa-border-strong);border-radius:20px;padding:8px;box-shadow:0 22px 60px rgba(0,0,0,.28);backdrop-filter:blur(18px)}
.message-action-reactions{display:flex;align-items:center;gap:4px;padding:4px;background:var(--hexa-panel-2);border:1px solid var(--hexa-border);border-radius:15px;margin-bottom:7px}
.quick-reaction{width:40px;height:38px;display:grid;place-items:center;border:0;background:transparent;color:var(--hexa-text);border-radius:11px;font-size:20px;cursor:pointer;transition:transform .15s ease,background .15s ease}
.quick-reaction:hover{background:rgba(127,127,127,.12);transform:scale(1.08)}
.quick-reaction.more-reactions{font-size:18px;color:var(--hexa-muted);font-weight:800}
.message-action-section{display:grid;gap:2px}
.message-action-section-title{padding:7px 10px 5px;font-size:10px;letter-spacing:.08em;text-transform:uppercase;font-weight:800;color:var(--hexa-muted)}
.message-action-item{width:100%;display:flex;align-items:center;gap:11px;padding:10px 10px;border:0;background:transparent;color:var(--hexa-text);border-radius:13px;text-align:left;cursor:pointer}
.message-action-item:hover{background:rgba(127,127,127,.10)}
.message-action-item:disabled{opacity:.46;cursor:not-allowed}
.message-action-item:disabled:hover{background:transparent}
.message-action-icon{width:34px;height:34px;flex:0 0 34px;display:grid;place-items:center;border-radius:10px;background:var(--hexa-panel-2);border:1px solid var(--hexa-border);font-size:17px}
.message-action-copy{min-width:0;display:grid;gap:2px}
.message-action-copy strong{font-size:13px;font-weight:700;color:var(--hexa-text)}
.message-action-copy small{font-size:10px;color:var(--hexa-muted);line-height:1.35}
.message-action-divider{height:1px;background:var(--hexa-border);margin:5px 4px}
.compact-actions{grid-template-columns:1fr;display:grid}
.message-action-item.compact{padding-block:8px}
.danger-title{color:var(--hexa-danger)!important}
.danger-action .message-action-icon{color:var(--hexa-danger);border-color:rgba(220,70,70,.20)}
.danger-action:hover{background:rgba(220,70,70,.08)}
.message-action-popover::-webkit-scrollbar{width:7px}
.message-action-popover::-webkit-scrollbar-thumb{background:rgba(127,127,127,.26);border-radius:999px}
[data-hexa-theme="white"] .message-action-popover{background:#fff;border-color:#e5e7eb;box-shadow:0 24px 70px rgba(17,24,39,.18)}
[data-hexa-theme="white"] .message-action-reactions,
[data-hexa-theme="white"] .message-action-icon{background:#f6f7f9;border-color:#e6e8ec}
[data-hexa-theme="white"] .message-action-item:hover{background:#f5f6f8}
@media (max-width:640px){
  .message-action-popover{left:12px!important;right:12px;width:auto;bottom:12px;top:auto!important;max-height:72vh;border-radius:22px;padding:9px}
  .message-action-reactions{justify-content:space-between}
  .quick-reaction{width:42px;height:42px}
}
.emoji-panel,.sticker-panel,.feature-popover,.chat-settings-popover{position:absolute;z-index:40;background:var(--hexa-panel);border:1px solid var(--hexa-border-strong);border-radius:16px;box-shadow:var(--hexa-shadow);padding:12px}.emoji-panel{left:12px;bottom:76px;width:min(410px,calc(100% - 24px))}.emoji-tones,.emoji-grid,.sticker-grid{display:flex;flex-wrap:wrap;gap:5px}.emoji-grid{max-height:220px;overflow:auto;margin-top:8px}.emoji-panel button,.sticker-grid button{border:0;background:transparent;font-size:21px;padding:6px;border-radius:8px}.emoji-panel button:hover,.sticker-grid button:hover{background:rgba(255,255,255,.06)}.sticker-panel{left:12px;bottom:76px;width:300px}.sticker-grid{margin-top:10px}.sticker-grid button{font-size:30px}.feature-popover{right:12px;bottom:76px;width:min(360px,calc(100% - 24px));display:grid;gap:8px}.feature-popover h3{margin:0}.chat-settings-popover{right:12px;top:64px;width:270px;display:grid;gap:10px;z-index:60}.chat-settings-popover label{display:grid;gap:6px;color:var(--hexa-muted);font-size:12px}.chat-settings-popover select,.chat-settings-popover button{padding:9px;border-radius:9px;border:1px solid var(--hexa-border);background:var(--hexa-panel-2);color:var(--hexa-text)}.chat-search-results{padding:10px;border-top:1px solid var(--hexa-border);display:grid;gap:5px}.chat-search-results button{border:0;background:transparent;color:var(--hexa-muted);text-align:left;padding:6px}.poll-message{display:grid;gap:7px;min-width:220px}.poll-message button{display:flex;justify-content:space-between;gap:10px;padding:9px;border-radius:9px;border:1px solid var(--hexa-border);background:var(--hexa-panel-2);color:var(--hexa-text);text-align:left}.poll-message button span{color:var(--hexa-muted);font-size:10px}.shared-contact{display:flex;gap:10px;align-items:center;min-width:190px}.shared-contact div{display:grid}.shared-contact small{color:var(--hexa-muted)}.location-card{color:inherit;text-decoration:none;display:block;padding:4px}.file-message{display:flex;gap:8px;align-items:center}.forwarded-label{font-size:10px;color:var(--hexa-muted);margin-bottom:5px}.sticker-message{font-size:70px;line-height:1}.view-once-bubble{min-width:100px}.universal-search-result{display:flex;align-items:center;gap:10px;width:100%}.universal-search-result-copy{flex:1}.universal-search-result>b{text-transform:uppercase;font-size:9px;color:var(--hexa-accent-2)}


/* HEXA 2026 visual polish + Quick Actions */
.hexa-avatar{
  position:relative!important;
  display:grid!important;
  place-items:center!important;
  overflow:hidden!important;
  aspect-ratio:1/1!important;
  border-radius:50%!important;
  background:radial-gradient(circle at 30% 25%,rgba(124,92,255,.28),rgba(18,23,32,.98) 62%)!important;
  border:1px solid rgba(255,255,255,.11)!important;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.08),0 8px 24px rgba(0,0,0,.18)!important;
}
.hexa-avatar img{
  display:block!important;
  width:100%!important;
  height:100%!important;
  min-width:100%!important;
  min-height:100%!important;
  object-fit:cover!important;
  object-position:50% 50%!important;
  border-radius:50%!important;
  overflow:hidden!important;
  background:var(--hexa-panel-3)!important;
}
.hexa-avatar span{position:relative;z-index:1}
.hexa-online-dot{z-index:4!important;box-shadow:0 0 0 2px var(--hexa-panel),0 0 10px rgba(43,214,126,.5)!important}
.chat-main{background:radial-gradient(circle at 75% 15%,rgba(124,92,255,.06),transparent 34%),linear-gradient(180deg,rgba(9,12,17,.96),rgba(7,9,13,.99))}
.chat-header{min-height:72px!important;padding:10px 14px!important;background:rgba(10,13,19,.78)!important;backdrop-filter:blur(18px)!important;border-bottom:1px solid rgba(255,255,255,.08)!important;box-shadow:0 8px 28px rgba(0,0,0,.12)!important}
.chat-header-copy{min-width:0!important}
.chat-header-copy strong{font-size:13px!important;letter-spacing:.01em}
.chat-header-copy span{font-size:10px!important;color:#8993a3!important;margin-top:3px!important;display:block!important}
.chat-header-actions{display:flex!important;align-items:center!important;gap:5px!important}
.chat-header-actions button{width:38px!important;height:38px!important;border:1px solid rgba(255,255,255,.07)!important;border-radius:12px!important;background:rgba(255,255,255,.035)!important;color:var(--hexa-text)!important;transition:transform .16s ease,background .16s ease,border-color .16s ease!important}
.chat-header-actions button:hover{transform:translateY(-1px);background:rgba(124,92,255,.12)!important;border-color:rgba(124,92,255,.3)!important}
.quick-actions-trigger.active{background:rgba(124,92,255,.16)!important;border-color:rgba(124,92,255,.35)!important;color:#fff!important}
.messages-area{padding:18px 20px!important;scroll-behavior:smooth!important;background-image:radial-gradient(circle at 15% 20%,rgba(124,92,255,.035),transparent 30%),radial-gradient(circle at 85% 75%,rgba(72,149,239,.03),transparent 28%)}
.hexa-message-row{align-items:flex-end!important;gap:7px!important;touch-action:pan-y}
.hexa-message-row.incoming{justify-content:flex-start!important}
.hexa-message-row.mine{justify-content:flex-end!important}
.hexa-message-row.mine .message-bubble{border-radius:18px 18px 5px 18px!important;background:linear-gradient(135deg,rgba(124,92,255,.24),rgba(124,92,255,.12))!important;border-color:rgba(124,92,255,.24)!important;box-shadow:0 8px 24px rgba(0,0,0,.12)!important}
.hexa-message-row.incoming .message-bubble{border-radius:18px 18px 18px 5px!important;background:rgba(255,255,255,.035)!important;border-color:rgba(255,255,255,.08)!important;box-shadow:0 6px 18px rgba(0,0,0,.10)!important}
.message-content{font-size:13px!important;line-height:1.55!important;color:#eef2f8!important;white-space:pre-wrap!important;overflow-wrap:anywhere!important}
.hexa-chat-link{color:var(--hexa-accent-2)!important;text-decoration:underline!important;text-decoration-thickness:1.5px;text-underline-offset:2px;font-weight:700;overflow-wrap:anywhere}.hexa-chat-link:hover{filter:brightness(1.15)}.hexa-number-highlight{display:inline;background:linear-gradient(180deg,rgba(124,92,255,.16),rgba(124,92,255,.08));border-bottom:2px solid var(--hexa-accent-2);border-radius:4px 4px 2px 2px;color:inherit;padding:0 2px;margin:0 1px;font-weight:850;text-decoration:underline;text-decoration-thickness:1.5px;text-underline-offset:2px;box-shadow:inset 0 -1px 0 rgba(124,92,255,.12);cursor:text;user-select:text}.message-content .hexa-number-highlight{white-space:pre-wrap}
.message-meta{font-size:9px!important;opacity:.78!important;margin-top:5px!important;gap:6px!important}
.focus-mode .chat-list-panel{display:none!important}
.focus-mode{grid-template-columns:minmax(0,1fr)!important}
.focus-mode .chat-main{min-width:0!important}
.quick-actions-popover{position:absolute;right:58px;top:74px;z-index:70;width:min(300px,calc(100vw - 24px));padding:8px;background:rgba(16,20,28,.97);border:1px solid var(--hexa-border-strong);border-radius:18px;box-shadow:0 24px 70px rgba(0,0,0,.34);backdrop-filter:blur(20px);display:grid;gap:3px}
.quick-actions-heading{padding:8px 10px 10px;border-bottom:1px solid var(--hexa-border);margin-bottom:2px}
.quick-actions-heading strong{display:block;font-size:13px}
.quick-actions-heading span{display:block;color:var(--hexa-muted);font-size:9px;margin-top:3px}
.quick-actions-popover button{display:grid;grid-template-columns:28px 1fr;align-items:center;gap:7px;border:0;background:transparent;color:var(--hexa-text);padding:10px;border-radius:10px;text-align:left;font-size:11px}
.quick-actions-popover button:hover,.quick-actions-popover button.selected{background:rgba(124,92,255,.12);color:#fff}
.chat-menu-backdrop{position:fixed;inset:0;z-index:55;background:transparent}
.chat-settings-popover.whatsapp-chat-menu,.quick-actions-popover{z-index:80!important}
.chat-list-panel{background:linear-gradient(180deg,#0a0e14,#080b10)!important}
.chat-list-header,.chat-search{background:transparent!important}
.conversation{margin:3px 7px!important;border-radius:15px!important;transition:background .16s ease,transform .16s ease!important}
.conversation:hover{background:rgba(255,255,255,.035)!important;transform:translateX(1px)}
.conversation.active{background:linear-gradient(90deg,rgba(124,92,255,.15),rgba(124,92,255,.055))!important;box-shadow:inset 2px 0 0 var(--hexa-accent)!important}
.message-composer{min-height:78px!important;padding:12px 14px!important;gap:9px!important;background:rgba(8,11,16,.88)!important;backdrop-filter:blur(20px)!important}
.message-composer input{height:48px!important;border-radius:17px!important;background:rgba(255,255,255,.045)!important;border-color:rgba(255,255,255,.09)!important;font-size:13px!important}
.message-composer input:focus{border-color:rgba(124,92,255,.55)!important;box-shadow:0 0 0 4px rgba(124,92,255,.10),inset 0 1px 0 rgba(255,255,255,.04)!important}
.message-composer .send-button{width:48px!important;height:48px!important;flex:0 0 48px!important;border-radius:16px!important;background:linear-gradient(145deg,var(--hexa-accent),#6f85ff)!important;box-shadow:0 10px 26px rgba(124,92,255,.28)!important}
@media(max-width:700px){.messages-area{padding:12px!important}.quick-actions-popover{right:10px;top:64px}.chat-header-actions button{width:34px!important;height:34px!important}.message-composer{min-height:70px!important;padding:9px!important}.message-composer input{height:44px!important}.message-composer .send-button{width:44px!important;height:44px!important;flex-basis:44px!important}}

/* HEXA 2026 composer + language settings */
.message-composer{min-height:72px!important;padding:10px 12px!important;gap:8px!important;background:color-mix(in srgb,var(--hexa-panel) 92%,transparent);backdrop-filter:blur(14px);border-top:1px solid var(--hexa-border-strong)!important}
.message-composer input{height:46px!important;border:1px solid var(--hexa-border-strong)!important;border-radius:16px!important;background:var(--hexa-panel-2)!important;color:var(--hexa-text)!important;padding:0 15px!important;font-size:13px!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.03)}
.message-composer input:focus{outline:none!important;border-color:var(--hexa-accent)!important;box-shadow:0 0 0 3px rgba(124,92,255,.12)!important}
.message-composer .send-button{width:46px!important;height:46px!important;border-radius:50%!important;box-shadow:0 8px 22px rgba(0,0,0,.22)!important;font-size:17px!important}
.chat-settings-popover.whatsapp-chat-menu{width:min(340px,calc(100vw - 24px));max-height:min(78vh,690px);overflow:auto;padding:7px;display:grid;gap:2px}
.whatsapp-chat-menu button{display:grid;grid-template-columns:26px 1fr auto;align-items:center;gap:8px;width:100%;padding:11px 10px;border:0;border-radius:10px;background:transparent;color:var(--hexa-text);text-align:left;font-size:12px}
.whatsapp-chat-menu button:hover{background:var(--hexa-panel-3)}
.whatsapp-chat-menu button small{grid-column:2/-1;color:var(--hexa-muted);font-size:9px;margin-top:-4px}
.whatsapp-chat-menu .danger-menu-item{color:#ff6b7a}
.chat-menu-divider{height:1px;background:var(--hexa-border);margin:5px 3px}
.language-settings-card{overflow:hidden}
.language-picker-panel{padding:14px}
.language-current-row,.language-save-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 2px}
.language-current-row span,.language-current-row small,.language-save-row span{color:var(--hexa-muted);font-size:11px}
.language-current-row strong{display:block;margin-top:3px}
.language-count{padding:6px 9px;border:1px solid var(--hexa-border);border-radius:999px}
.language-search-row{display:flex;align-items:center;gap:9px;height:44px;margin:8px 0 10px;padding:0 12px;border:1px solid var(--hexa-border-strong);border-radius:13px;background:var(--hexa-panel-2)}
.language-search-row input{width:100%;border:0;background:transparent;outline:0;color:var(--hexa-text);font-size:12px}
.language-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;max-height:360px;overflow:auto;padding-right:3px}
.language-option{display:flex;align-items:center;gap:9px;min-width:0;padding:10px;border:1px solid var(--hexa-border);border-radius:11px;background:transparent;color:var(--hexa-text);text-align:left;cursor:pointer}
.language-option:hover{background:var(--hexa-panel-3)}
.language-option.selected{border-color:var(--hexa-accent);background:rgba(124,92,255,.09)}
.language-radio{width:20px;height:20px;flex:0 0 20px;display:grid;place-items:center;border:1px solid var(--hexa-border-strong);border-radius:50%;color:white;background:transparent;font-size:11px}
.language-option.selected .language-radio{background:var(--hexa-accent);border-color:var(--hexa-accent)}
.language-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px;flex:1}
.language-option code{font-size:8px;color:var(--hexa-muted)}
.language-empty{padding:24px;text-align:center;color:var(--hexa-muted);grid-column:1/-1}
.language-save-button{min-width:110px!important}
@media(max-width:700px){.language-list{grid-template-columns:1fr}.message-composer{padding:8px!important}.message-composer input{height:44px!important}.message-composer .send-button{width:44px!important;height:44px!important}}
`;


const HEXA_SETTINGS_POLISH_CSS = `
/* ============================================================
   HEXA SETTINGS + THEME SELECTOR POLISH
   ============================================================ */
.settings-page{padding-bottom:34px}
.settings-page .page-heading{margin-bottom:18px}
.settings-page .settings-section{border:1px solid var(--hexa-border);border-radius:20px;background:var(--hexa-panel);overflow:hidden;box-shadow:var(--hexa-shadow);margin-bottom:16px}
.settings-section-heading{width:100%;display:flex;align-items:center;justify-content:space-between;gap:18px;padding:18px 20px;border:0;background:transparent;color:var(--hexa-text);text-align:left;cursor:pointer}
.settings-section-heading>div{min-width:0}
.settings-section-heading strong{display:block;font-size:14px;line-height:1.25}
.settings-section-heading span{display:block;color:var(--hexa-muted);font-size:10px;margin-top:5px}
.settings-section-heading b{width:30px;height:30px;display:grid;place-items:center;border-radius:10px;background:var(--hexa-panel-3);font-size:15px;flex:0 0 30px}
.hexa-profile-settings{display:flex!important;align-items:center;gap:14px;padding:16px 18px!important;margin-bottom:16px}
.hexa-profile-settings>div:nth-child(2){min-width:0}
.hexa-profile-settings strong{font-size:14px}
.hexa-profile-settings p{margin:4px 0 0;color:var(--hexa-muted);font-size:11px}
.hexa-theme-panel{padding:0 16px 16px}
.hexa-theme-current-card{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:15px;border:1px solid var(--hexa-border);border-radius:16px;background:var(--hexa-panel-2);margin-bottom:10px}
.theme-current-copy{min-width:0}
.theme-current-copy>span{display:block;color:var(--hexa-muted);font-size:9px;text-transform:uppercase;letter-spacing:.08em;font-weight:800}
.theme-current-copy strong{display:block;margin-top:4px;font-size:15px}
.theme-current-copy small{display:block;color:var(--hexa-muted);font-size:10px;margin-top:4px;line-height:1.45}
.theme-current-swatch{width:150px;height:66px;flex:0 0 150px;border:1px solid;border-radius:15px;padding:9px;display:grid;grid-template-columns:1fr 1fr;gap:8px;position:relative;overflow:hidden}
.theme-current-swatch span{display:block;border-radius:10px;border:1px solid rgba(0,0,0,.06)}
.theme-current-swatch b{position:absolute;left:10px;bottom:10px;width:26px;height:6px;border-radius:99px}
.theme-selector-toolbar{display:flex;justify-content:space-between;gap:10px;padding:3px 2px 10px;color:var(--hexa-muted);font-size:9px}
.hexa-theme-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
.hexa-theme-option{position:relative;display:flex;flex-direction:column;gap:9px;padding:9px;border:1px solid var(--hexa-border);border-radius:16px;background:var(--hexa-panel-2);color:var(--hexa-text);text-align:left;cursor:pointer;transition:transform .16s ease,box-shadow .16s ease,border-color .16s ease,background .16s ease}
.hexa-theme-option:hover{transform:translateY(-2px);border-color:var(--hexa-border-strong);box-shadow:0 12px 26px rgba(0,0,0,.10)}
.hexa-theme-option.selected{border-color:var(--hexa-accent);box-shadow:inset 0 0 0 1px var(--hexa-accent),0 12px 28px rgba(0,0,0,.12)}
.theme-preview{height:78px;border-radius:12px;display:flex;overflow:hidden;position:relative;border:1px solid rgba(255,255,255,.12)}
.theme-preview-sidebar{width:25%;height:100%}
.theme-preview-content{flex:1;padding:10px;display:flex;flex-direction:column;justify-content:center;gap:7px}
.theme-preview-message{height:11px;border-radius:6px;max-width:68%}
.theme-preview-message.outgoing{align-self:flex-end;width:55%}
.theme-preview-accent{position:absolute;right:8px;top:8px;width:7px;height:7px;border-radius:50%}
.theme-option-copy{min-width:0;padding-right:36px}
.theme-option-copy strong{display:block;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.theme-option-copy span{display:block;color:var(--hexa-muted);font-size:9px;line-height:1.35;margin-top:3px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.theme-option-status{position:absolute;right:9px;bottom:9px;color:var(--hexa-muted);font-size:8px;font-weight:800;text-transform:uppercase;letter-spacing:.05em}
.theme-selected{position:absolute;top:9px;right:9px;width:24px;height:24px;display:grid;place-items:center;border-radius:50%;background:var(--hexa-accent);color:#fff;font-size:12px;font-weight:900;box-shadow:0 6px 14px rgba(0,0,0,.18)}
.hexa-white-theme-option .theme-preview{border-color:rgba(0,0,0,.10)}
@media(max-width:900px){.hexa-theme-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:600px){.hexa-theme-grid{grid-template-columns:1fr}.hexa-theme-current-card{align-items:flex-start}.theme-current-swatch{width:120px;flex-basis:120px}.theme-selector-toolbar{flex-direction:column;gap:3px}}

/* ============================================================
   MESSAGE COMPOSER POLISH
   ============================================================ */
.message-composer{position:relative;display:flex;align-items:center;gap:8px;min-height:76px!important;padding:10px 12px!important;border-top:1px solid var(--hexa-border-strong)!important}
.message-composer:focus-within{box-shadow:0 -8px 24px rgba(0,0,0,.05)}
.message-composer input{min-width:0!important;height:48px!important;border-radius:17px!important;padding:0 16px!important;font-size:13px!important;line-height:1.4!important;transition:border-color .15s ease,box-shadow .15s ease,background .15s ease}
.message-composer>button{width:40px!important;height:40px!important;display:grid!important;place-items:center!important;border-radius:12px!important;flex:0 0 40px!important}
.message-composer .send-button{width:48px!important;height:48px!important;flex-basis:48px!important;border-radius:16px!important;display:grid!important;place-items:center!important;font-size:17px!important}
.message-composer .send-button:active{transform:scale(.96)}
`;

const HEXA_WHITE_THEME_CSS = `
/* ============================================================
   HEXA WHITE UI — pure white workspace
   ============================================================ */
[data-hexa-theme="white"] {
  color-scheme: light;
}
[data-hexa-theme="white"] body,
[data-hexa-theme="white"] .hexa-app,
[data-hexa-theme="white"] .hexa-main,
[data-hexa-theme="white"] .workspace-page,
[data-hexa-theme="white"] .chat-layout,
[data-hexa-theme="white"] .chat-main,
[data-hexa-theme="white"] .chat-list-panel,
[data-hexa-theme="white"] .chat-header,
[data-hexa-theme="white"] .messages-area,
[data-hexa-theme="white"] .message-composer {
  background: #fff !important;
  color: #000 !important;
}
[data-hexa-theme="white"] .chat-list-panel,
[data-hexa-theme="white"] .chat-header,
[data-hexa-theme="white"] .message-composer {
  border-color: rgba(0,0,0,.09) !important;
  box-shadow: 0 8px 28px rgba(0,0,0,.05) !important;
}
[data-hexa-theme="white"] .chat-header {
  backdrop-filter: blur(16px) !important;
}
[data-hexa-theme="white"] .chat-header-copy strong,
[data-hexa-theme="white"] .chat-header-copy span,
[data-hexa-theme="white"] .chat-list-header h2,
[data-hexa-theme="white"] .chat-list-header span,
[data-hexa-theme="white"] .conversation strong,
[data-hexa-theme="white"] .conversation span,
[data-hexa-theme="white"] .page-heading h1,
[data-hexa-theme="white"] .settings-section-heading strong,
[data-hexa-theme="white"] .settings-section-heading span,
[data-hexa-theme="white"] .settings-card strong,
[data-hexa-theme="white"] .settings-card p {
  color: #000 !important;
}
[data-hexa-theme="white"] .chat-header-actions button,
[data-hexa-theme="white"] .message-composer > button,
[data-hexa-theme="white"] .new-chat-button,
[data-hexa-theme="white"] .settings-section-heading,
[data-hexa-theme="white"] .settings-card button,
[data-hexa-theme="white"] .language-option,
[data-hexa-theme="white"] .hexa-theme-option {
  background: #fff !important;
  color: #000 !important;
  border-color: rgba(0,0,0,.12) !important;
}
[data-hexa-theme="white"] .chat-header-actions button:hover,
[data-hexa-theme="white"] .message-composer > button:hover,
[data-hexa-theme="white"] .language-option:hover,
[data-hexa-theme="white"] .hexa-theme-option:hover {
  background: #f3f4f6 !important;
  color: #000 !important;
}
[data-hexa-theme="white"] .conversation.active {
  background: #f1f1f1 !important;
  box-shadow: inset 3px 0 0 #000 !important;
}
[data-hexa-theme="white"] .chat-search input,
[data-hexa-theme="white"] .topbar-search input,
[data-hexa-theme="white"] .message-composer input,
[data-hexa-theme="white"] .language-search-row {
  background: #fff !important;
  color: #000 !important;
  border-color: rgba(0,0,0,.14) !important;
}
[data-hexa-theme="white"] .chat-search input::placeholder,
[data-hexa-theme="white"] .topbar-search input::placeholder,
[data-hexa-theme="white"] .message-composer input::placeholder,
[data-hexa-theme="white"] .language-search-row input::placeholder {
  color: #6b7280 !important;
}
[data-hexa-theme="white"] .message-composer input:focus {
  border-color: #000 !important;
  box-shadow: 0 0 0 3px rgba(0,0,0,.08) !important;
}
[data-hexa-theme="white"] .message-composer .send-button,
[data-hexa-theme="white"] .hero-primary,
[data-hexa-theme="white"] .send-button {
  background: #000 !important;
  color: #fff !important;
  border-color: #000 !important;
}
[data-hexa-theme="white"] .message-composer .send-button:hover,
[data-hexa-theme="white"] .hero-primary:hover,
[data-hexa-theme="white"] .send-button:hover {
  background: #222 !important;
}
[data-hexa-theme="white"] .hexa-message-row.mine .message-bubble {
  background: #000 !important;
  color: #fff !important;
  border-color: #000 !important;
}
[data-hexa-theme="white"] .hexa-message-row.mine .message-content,
[data-hexa-theme="white"] .hexa-message-row.mine .message-meta,
[data-hexa-theme="white"] .hexa-message-row.mine .message-meta span {
  color: #fff !important;
}
[data-hexa-theme="white"] .hexa-message-row.incoming .message-bubble {
  background: #f3f4f6 !important;
  color: #000 !important;
  border-color: rgba(0,0,0,.10) !important;
}
[data-hexa-theme="white"] .hexa-message-row.incoming .message-content,
[data-hexa-theme="white"] .hexa-message-row.incoming .message-meta,
[data-hexa-theme="white"] .hexa-message-row.incoming .message-meta span {
  color: #000 !important;
}
[data-hexa-theme="white"] .message-bubble a,
[data-hexa-theme="white"] .message-file,
[data-hexa-theme="white"] .message-file:hover,
[data-hexa-theme="white"] .quoted-message,
[data-hexa-theme="white"] .forwarded-label {
  color: #000 !important;
}
[data-hexa-theme="white"] .hexa-message-row.mine .message-bubble a,
[data-hexa-theme="white"] .hexa-message-row.mine .message-file,
[data-hexa-theme="white"] .hexa-message-row.mine .quoted-message,
[data-hexa-theme="white"] .hexa-message-row.mine .forwarded-label {
  color: #fff !important;
}
/* Media controls/icons are black; photos/videos retain their natural image colors. */
[data-hexa-theme="white"] .message-media,
[data-hexa-theme="white"] .message-media + *,
[data-hexa-theme="white"] video::-webkit-media-controls {
  color: #000;
}
[data-hexa-theme="white"] .composer-action,
[data-hexa-theme="white"] .chat-header-actions button,
[data-hexa-theme="white"] .message-composer > button {
  color: #000 !important;
}
[data-hexa-theme="white"] .chat-settings-popover,
[data-hexa-theme="white"] .whatsapp-chat-menu,
[data-hexa-theme="white"] .quick-actions-popover,
[data-hexa-theme="white"] .gif-panel,
[data-hexa-theme="white"] .notifications-panel,
[data-hexa-theme="white"] .entity-modal,
[data-hexa-theme="white"] .status-modal,
[data-hexa-theme="white"] .hexa-modal-backdrop > div {
  background: #fff !important;
  color: #000 !important;
  border-color: rgba(0,0,0,.12) !important;
  box-shadow: 0 24px 70px rgba(0,0,0,.16) !important;
}
[data-hexa-theme="white"] .whatsapp-chat-menu button,
[data-hexa-theme="white"] .quick-actions-popover button,
[data-hexa-theme="white"] .notifications-header button,
[data-hexa-theme="white"] .notification-item,
[data-hexa-theme="white"] .settings-section-heading {
  color: #000 !important;
}
[data-hexa-theme="white"] .whatsapp-chat-menu button:hover,
[data-hexa-theme="white"] .quick-actions-popover button:hover,
[data-hexa-theme="white"] .quick-actions-popover button.selected {
  background: #f3f4f6 !important;
  color: #000 !important;
}
[data-hexa-theme="white"] .settings-section,
[data-hexa-theme="white"] .settings-card,
[data-hexa-theme="white"] .hexa-profile-settings,
[data-hexa-theme="white"] .hexa-theme-panel,
[data-hexa-theme="white"] .language-picker-panel {
  background: #fff !important;
  color: #000 !important;
  border-color: rgba(0,0,0,.10) !important;
  box-shadow: 0 14px 40px rgba(0,0,0,.06) !important;
}
[data-hexa-theme="white"] .settings-card .settings-status,
[data-hexa-theme="white"] .theme-current small,
[data-hexa-theme="white"] .theme-current span,
[data-hexa-theme="white"] .theme-selector-toolbar,
[data-hexa-theme="white"] .language-current-row span,
[data-hexa-theme="white"] .language-save-row span,
[data-hexa-theme="white"] .language-option code {
  color: #4b5563 !important;
}
[data-hexa-theme="white"] .hexa-theme-option.selected {
  border-color: #000 !important;
  background: #f7f7f7 !important;
  box-shadow: inset 0 0 0 2px #000, 0 12px 26px rgba(0,0,0,.08) !important;
}
[data-hexa-theme="white"] .hexa-theme-option.selected .theme-selected,
[data-hexa-theme="white"] .language-option.selected .language-radio {
  background: #000 !important;
  color: #fff !important;
  border-color: #000 !important;
}
`;



const HEXA_MOMENTS_CSS = `
/* Facebook-style Moments polish */
.moments-story-card{position:relative}.moments-story-card .status-preview{overflow:hidden}.moments-story-card .status-preview img,.moments-story-card .status-preview video{width:100%;height:100%;object-fit:cover}.moments-story-actions{position:static!important;display:flex!important;gap:6px!important;flex-wrap:wrap!important}.moments-story-actions button{min-width:38px}.moments-story-actions button.active{background:#fff!important;color:#111!important}.moments-share-menu{position:absolute;right:14px;bottom:58px;z-index:50;width:220px;background:#fff;color:#111;border-radius:14px;padding:6px;box-shadow:0 18px 50px rgba(0,0,0,.35)}.moments-share-menu button{width:100%;display:block;text-align:left;padding:10px;border:0;background:transparent;color:#111;border-radius:9px}.moments-share-menu button:hover{background:#f3f4f6}.status-comments{background:rgba(0,0,0,.25);border-radius:12px}.status-comment-form input{outline:none}.status-comment-form button{min-width:68px}.moment-share-inline{margin-left:auto}.status-card{transition:transform .18s ease,box-shadow .18s ease}.status-card:hover{transform:translateY(-2px)}
@media(max-width:700px){.moments-share-menu{right:8px;bottom:54px}.moments-story-actions{gap:4px!important}.moments-story-actions button{min-width:34px;padding:7px}.story-stats{gap:10px;font-size:11px}}
.moments-highlights-section{margin:0 0 18px;padding:16px;border:1px solid var(--hexa-border);border-radius:18px;background:var(--hexa-panel);box-shadow:var(--hexa-shadow)}.moments-highlights-heading{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-bottom:12px}.moments-highlights-heading>div{display:flex;flex-direction:column;gap:3px}.moments-highlights-heading strong{font-size:14px;color:var(--hexa-text)}.moments-highlights-heading span{font-size:10px;color:var(--hexa-muted)}.moments-highlights-heading>button{border:1px solid var(--hexa-border);background:var(--hexa-panel-2);color:var(--hexa-text);border-radius:10px;padding:8px 10px;font-size:10px;cursor:pointer}.moments-highlights-row{display:flex;align-items:flex-start;gap:14px;overflow:auto;padding:2px 2px 5px}.moment-highlight-card-wrap{position:relative;min-width:88px}.moment-highlight-card,.moment-highlight-add{width:88px;border:0;background:transparent;color:var(--hexa-text);display:flex;flex-direction:column;align-items:center;gap:5px;cursor:pointer}.moment-highlight-ring{width:64px;height:64px;border-radius:50%;padding:3px;background:linear-gradient(135deg,#7c5cff,#00c2ff,#ff3b81);display:grid;place-items:center}.moment-highlight-ring img{width:100%;height:100%;object-fit:cover;border-radius:50%;border:3px solid var(--hexa-panel)}.moment-highlight-ring span{width:100%;height:100%;border-radius:50%;display:grid;place-items:center;background:var(--hexa-panel-2);font-size:22px}.moment-highlight-card strong,.moment-highlight-card small{max-width:88px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.moment-highlight-card strong{font-size:10px}.moment-highlight-card small{font-size:8px;color:var(--hexa-muted)}.moment-highlight-add span{width:64px;height:64px;border-radius:50%;display:grid;place-items:center;border:2px dashed var(--hexa-accent);font-size:26px;background:var(--hexa-panel-2)}.moment-highlight-add b{font-size:10px}.moment-highlight-more{position:absolute;top:2px;right:-1px;width:24px;height:24px;border:1px solid var(--hexa-border);border-radius:50%;background:var(--hexa-panel);color:var(--hexa-text);cursor:pointer}.moments-highlights-empty{display:flex;align-items:center;gap:10px;padding:6px 10px;color:var(--hexa-muted)}.moments-highlights-empty>span{width:48px;height:48px;display:grid;place-items:center;border-radius:50%;background:var(--hexa-panel-2);font-size:20px}.moments-highlights-empty>div{display:flex;flex-direction:column;gap:2px}.moments-highlights-empty strong{font-size:11px;color:var(--hexa-text)}.moments-highlights-empty small{font-size:9px;max-width:260px}.highlight-modal{width:min(520px,92vw);background:var(--hexa-panel);color:var(--hexa-text);border:1px solid var(--hexa-border);border-radius:22px;box-shadow:0 28px 90px rgba(0,0,0,.3);padding:18px}.highlight-create-form{display:flex;flex-direction:column;gap:12px}.highlight-choice-list{display:flex;flex-direction:column;gap:7px}.highlight-choice{display:flex;align-items:center;gap:11px;width:100%;padding:9px 10px;border:1px solid var(--hexa-border);border-radius:14px;background:var(--hexa-panel-2);color:var(--hexa-text);cursor:pointer;text-align:left}.highlight-choice:hover{transform:translateY(-1px);box-shadow:0 8px 18px rgba(0,0,0,.08)}.highlight-choice-cover{width:42px;height:42px;border-radius:50%;display:grid;place-items:center;overflow:hidden;background:var(--hexa-panel);flex:0 0 auto;font-size:17px}.highlight-choice-cover img{width:100%;height:100%;object-fit:cover}.highlight-choice span:nth-child(2){min-width:0;display:flex;flex-direction:column;gap:2px;flex:1}.highlight-choice b{font-size:11px}.highlight-choice small{font-size:9px;color:var(--hexa-muted)}.highlight-choice>strong{font-size:20px;color:var(--hexa-muted)}.highlight-choice-cover.plus{border:1px dashed var(--hexa-accent);font-size:21px}.highlight-viewer{position:fixed;inset:0;z-index:5000;background:rgba(0,0,0,.88);display:flex;align-items:center;justify-content:center;padding:20px}.highlight-viewer-card{width:min(520px,92vw);max-height:92vh;display:flex;flex-direction:column;background:#111;color:#fff;border-radius:20px;overflow:hidden;box-shadow:0 30px 100px rgba(0,0,0,.5)}.highlight-viewer-card>img,.highlight-viewer-card>video{width:100%;max-height:72vh;object-fit:contain;background:#000}.highlight-viewer-top{display:flex;align-items:center;justify-content:space-between;padding:12px 14px}.highlight-viewer-top>div{display:flex;flex-direction:column;gap:3px}.highlight-viewer-top strong{font-size:13px}.highlight-viewer-top small{font-size:9px;opacity:.7}.highlight-viewer-top button{border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.08);color:#fff;border-radius:9px;padding:7px 10px;font-size:9px}.highlight-viewer-text{min-height:420px;display:grid;place-items:center;padding:30px;font-size:22px;text-align:center;white-space:pre-wrap}.highlight-viewer-caption{display:flex;align-items:center;gap:12px;padding:12px 14px;font-size:11px}.highlight-viewer-caption>button{margin-left:auto;border:0;background:rgba(255,255,255,.08);color:#fff;border-radius:9px;padding:7px 9px;font-size:9px}.highlight-viewer .story-nav{color:#fff}.highlight-viewer .story-close{color:#fff}@media(max-width:700px){.moments-highlights-section{padding:12px;border-radius:15px}.moments-highlights-heading span{display:none}.moments-highlights-row{gap:10px}.highlight-modal{padding:14px}.highlight-viewer{padding:10px}.highlight-viewer-card{width:100%}}
`;
const HEXA_KORA_CSS = `
.hexa-inline-warning{margin:0 0 14px;padding:12px 14px;border:1px solid rgba(245,158,11,.35);background:rgba(245,158,11,.08);border-radius:12px;color:var(--hexa-text);font-size:12px}.kora-page-card{height:min(700px,calc(100vh - 180px));display:flex;flex-direction:column;border:1px solid var(--hexa-border);background:var(--hexa-panel);border-radius:22px;overflow:hidden;box-shadow:var(--hexa-shadow)}.kora-page-messages{flex:1;overflow:auto;padding:22px}.kora-empty{text-align:center;max-width:520px;margin:auto;color:var(--hexa-muted)}.kora-empty>div{width:62px;height:62px;display:grid;place-items:center;margin:0 auto 12px;border-radius:20px;background:var(--hexa-accent);color:#fff;font-size:28px;box-shadow:0 10px 30px rgba(124,92,255,.28)}.kora-empty h2{margin:0;color:var(--hexa-text)}.kora-message{display:flex;gap:10px;align-items:flex-start;max-width:min(760px,90%);margin:0 0 14px}.kora-message>span{flex:0 0 auto;font-size:11px;font-weight:800;color:var(--hexa-muted);padding-top:8px}.kora-message p{margin:0;padding:11px 14px;border-radius:16px;background:var(--hexa-panel-2);color:var(--hexa-text);line-height:1.55;white-space:pre-wrap}.kora-message.user{margin-left:auto;justify-content:flex-end}.kora-message.user>span{order:2}.kora-message.user p{background:var(--hexa-accent);color:#fff}.kora-composer{display:flex;gap:10px;padding:14px;border-top:1px solid var(--hexa-border);background:var(--hexa-panel)}.kora-composer input{flex:1;min-width:0;height:46px;padding:0 15px;border:1px solid var(--hexa-border);border-radius:14px;background:var(--hexa-panel-2);color:var(--hexa-text);outline:none}.kora-composer input:focus{border-color:var(--hexa-accent);box-shadow:0 0 0 3px rgba(124,92,255,.10)}.kora-voice-hero{display:flex;align-items:center;gap:14px;padding:16px 18px;border-bottom:1px solid var(--hexa-border);background:linear-gradient(135deg,rgba(124,92,255,.14),rgba(0,194,255,.07));}.kora-orb{width:48px;height:48px;flex:0 0 48px;border-radius:50%;display:grid;place-items:center;background:var(--hexa-accent);color:#fff;font-size:22px;box-shadow:0 8px 24px rgba(124,92,255,.28)}.kora-orb.listening{animation:koraListenPulse 1.1s ease-in-out infinite}.kora-voice-hero>div:nth-child(2){display:flex;flex-direction:column;gap:3px;min-width:0}.kora-voice-hero strong{color:var(--hexa-text);font-size:13px}.kora-voice-hero span{color:var(--hexa-muted);font-size:10px}.kora-hero-mic,.kora-mic-btn{border:0;display:grid;place-items:center;background:var(--hexa-panel-2);color:var(--hexa-text);cursor:pointer}.kora-hero-mic{margin-left:auto;width:44px;height:44px;border-radius:50%;font-size:19px}.kora-hero-mic.active,.kora-mic-btn.active{background:#ef4444;color:#fff;box-shadow:0 0 0 6px rgba(239,68,68,.12);animation:koraListenPulse 1.1s ease-in-out infinite}.kora-voice-prompts{display:flex;gap:8px;padding:12px 16px;overflow:auto;border-bottom:1px solid var(--hexa-border)}.kora-voice-prompts button{flex:0 0 auto;border:1px solid var(--hexa-border);background:var(--hexa-panel-2);color:var(--hexa-text);border-radius:999px;padding:9px 12px;font-size:10px;cursor:pointer;white-space:nowrap}.kora-mic-btn{flex:0 0 44px;width:44px;height:44px;border-radius:50%;font-size:19px}.kora-mic-btn:disabled,.kora-hero-mic:disabled{opacity:.45;cursor:not-allowed}.kora-heading p{margin:3px 0 0;color:var(--hexa-muted)}@keyframes koraListenPulse{0%,100%{transform:scale(1);box-shadow:0 0 0 0 rgba(124,92,255,.25)}50%{transform:scale(1.04);box-shadow:0 0 0 12px rgba(124,92,255,0)}}@media(max-width:700px){.kora-page-card{height:calc(100vh - 150px);border-radius:16px}.kora-page-messages{padding:14px}.kora-message{max-width:94%}.kora-voice-hero{padding:13px}.kora-voice-prompts{padding:10px 12px}.kora-composer{padding:10px}.kora-composer .hero-primary{min-width:64px}}
`;


const HEXA_COMPOSER_CSS = `
.hexa-message-composer{width:100%;padding:10px 14px 14px!important;background:var(--hexa-panel)!important;border-top:1px solid var(--hexa-border)!important}
.composer-shell{width:min(100%,980px);margin:0 auto;border:1px solid var(--hexa-border);background:var(--hexa-panel-2);border-radius:24px;box-shadow:0 8px 30px rgba(0,0,0,.06);overflow:hidden}
.composer-main-row{display:flex;align-items:flex-end;gap:8px;min-height:58px;padding:7px 8px}
.composer-icon-btn,.composer-voice-btn,.composer-send-btn{flex:0 0 42px;width:42px;height:42px;border:0;border-radius:50%;display:grid;place-items:center;cursor:pointer;transition:transform .15s ease,background .15s ease,box-shadow .15s ease;color:var(--hexa-text);background:transparent;font-size:20px}
.composer-icon-btn:hover{background:rgba(127,127,127,.12);transform:translateY(-1px)}
.composer-textarea{flex:1;min-width:0;min-height:42px;max-height:140px;resize:none;border:0;outline:none;background:transparent;color:var(--hexa-text);font:inherit;font-size:15px;line-height:1.45;padding:10px 6px 8px}
.composer-textarea::placeholder{color:var(--hexa-muted)}
.composer-textarea:disabled{opacity:.75}
.composer-trailing-actions{display:flex;align-items:center;gap:6px;padding-bottom:1px}
.composer-send-btn{background:var(--hexa-accent);color:#fff;font-size:19px;font-weight:900;box-shadow:0 8px 20px rgba(0,0,0,.14)}
.composer-send-btn:hover{transform:scale(1.04)}
.composer-voice-btn{background:var(--hexa-text);color:var(--hexa-panel);font-size:19px}
.composer-voice-btn:hover{transform:scale(1.04)}
.composer-voice-btn.active{background:#d11;color:#fff;box-shadow:0 0 0 5px rgba(209,17,17,.13)}
.composer-recording-bar{display:flex;align-items:center;gap:9px;padding:8px 15px 10px;border-top:1px solid var(--hexa-border);font-size:12px;color:var(--hexa-text)}
.composer-recording-bar .recording-hint{margin-left:auto;color:var(--hexa-muted)}
.recording-pulse{width:9px;height:9px;border-radius:50%;background:#d11;box-shadow:0 0 0 0 rgba(209,17,17,.5);animation:hexaRecordingPulse 1.35s infinite}
@keyframes hexaRecordingPulse{0%{box-shadow:0 0 0 0 rgba(209,17,17,.5)}70%{box-shadow:0 0 0 8px rgba(209,17,17,0)}100%{box-shadow:0 0 0 0 rgba(209,17,17,0)}}
[data-hexa-theme="white"] .hexa-message-composer{background:#fff!important}
[data-hexa-theme="white"] .composer-shell{background:#fff;border-color:rgba(0,0,0,.14);box-shadow:0 10px 30px rgba(0,0,0,.07)}
[data-hexa-theme="white"] .composer-textarea{color:#111}
@media(max-width:700px){.hexa-message-composer{padding:7px 8px 9px!important}.composer-shell{border-radius:20px}.composer-main-row{gap:5px;padding:6px}.composer-icon-btn,.composer-voice-btn,.composer-send-btn{flex-basis:38px;width:38px;height:38px}.composer-textarea{font-size:14px;padding-left:4px;padding-right:4px}.composer-recording-bar{font-size:11px}.composer-recording-bar .recording-hint{display:none}}
`;

const HEXA_PINNED_MESSAGES_CSS = `
.hexa-saved-panel{position:relative;z-index:12;border-bottom:1px solid var(--hexa-border);background:var(--hexa-panel);box-shadow:0 10px 28px rgba(0,0,0,.08);animation:hexaSavedDrop .18s ease-out}.hexa-saved-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;padding:13px 16px;border-bottom:1px solid var(--hexa-border)}.hexa-saved-head>div{min-width:0;display:flex;flex-direction:column;gap:3px}.hexa-saved-kicker{font-size:9px;font-weight:900;letter-spacing:.12em;color:var(--hexa-accent);text-transform:uppercase}.hexa-saved-head strong{font-size:13px;color:var(--hexa-text)}.hexa-saved-head small{font-size:10px;color:var(--hexa-muted)}.hexa-saved-head>button{width:32px;height:32px;border:1px solid var(--hexa-border);background:var(--hexa-panel-2);color:var(--hexa-text);border-radius:10px;font-size:18px;cursor:pointer}.hexa-saved-list{max-height:280px;overflow:auto;padding:7px 10px}.hexa-saved-item{display:flex;align-items:stretch;gap:6px;border-radius:13px}.hexa-saved-item:hover{background:var(--hexa-panel-2)}.hexa-saved-jump{flex:1;display:flex;align-items:center;gap:10px;min-width:0;border:0;background:transparent;color:inherit;text-align:left;padding:10px 8px;border-radius:12px;cursor:pointer}.hexa-saved-icon{width:32px;height:32px;display:grid;place-items:center;border-radius:10px;background:rgba(124,92,255,.10);flex:0 0 auto;font-size:18px}.hexa-saved-copy{min-width:0;display:flex;flex-direction:column;gap:2px}.hexa-saved-copy strong,.hexa-saved-copy span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.hexa-saved-copy strong{font-size:11px;color:var(--hexa-text)}.hexa-saved-copy span{font-size:12px;color:var(--hexa-text)}.hexa-saved-copy small{font-size:9px;color:var(--hexa-muted)}.hexa-saved-remove{width:32px;margin:7px 5px 7px 0;border:0;background:transparent;color:var(--hexa-muted);border-radius:9px;cursor:pointer;font-size:17px}.hexa-saved-remove:hover{background:rgba(255,70,70,.10);color:#f87171}.hexa-saved-empty{padding:24px 18px 26px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:5px;color:var(--hexa-muted)}.hexa-saved-empty>div{width:42px;height:42px;display:grid;place-items:center;border-radius:13px;background:rgba(124,92,255,.10);font-size:22px}.hexa-saved-empty strong{color:var(--hexa-text);font-size:12px}.hexa-saved-empty span{font-size:10px;max-width:350px}.saved-header-count{position:absolute;transform:translate(10px,-10px);min-width:16px;height:16px;padding:0 4px;display:grid;place-items:center;border-radius:999px;background:var(--hexa-accent);color:#fff;font-size:8px;font-weight:900;border:2px solid var(--hexa-panel)}@keyframes hexaSavedDrop{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}[data-hexa-theme="white"] .hexa-saved-panel{background:#fff;border-color:rgba(0,0,0,.10);box-shadow:0 12px 28px rgba(0,0,0,.07)}[data-hexa-theme="white"] .hexa-saved-head>button{background:#f7f7f8;color:#111;border-color:rgba(0,0,0,.12)}[data-hexa-theme="white"] .hexa-saved-item:hover{background:#f7f7f8}[data-hexa-theme="white"] .saved-header-count{border-color:#fff}@media(max-width:700px){.hexa-saved-head{padding:11px 12px}.hexa-saved-list{max-height:220px}.hexa-saved-copy span{font-size:11px}.saved-header-count{transform:translate(8px,-8px)}}
.hexa-pinned-panel{position:relative;z-index:12;border-bottom:1px solid var(--hexa-border);background:var(--hexa-panel);box-shadow:0 10px 28px rgba(0,0,0,.08);animation:hexaPinnedDrop .18s ease-out}.hexa-pinned-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;padding:13px 16px;border-bottom:1px solid var(--hexa-border)}.hexa-pinned-head>div{min-width:0;display:flex;flex-direction:column;gap:3px}.hexa-pinned-kicker{font-size:9px;font-weight:900;letter-spacing:.12em;color:var(--hexa-accent);text-transform:uppercase}.hexa-pinned-head strong{font-size:13px;color:var(--hexa-text)}.hexa-pinned-head small{font-size:10px;color:var(--hexa-muted)}.hexa-pinned-head>button{width:32px;height:32px;border:1px solid var(--hexa-border);background:var(--hexa-panel-2);color:var(--hexa-text);border-radius:10px;font-size:18px;cursor:pointer}.hexa-pinned-list{max-height:260px;overflow:auto;padding:7px 10px}.hexa-pinned-item{display:flex;align-items:stretch;gap:6px;border-radius:13px}.hexa-pinned-item:hover{background:var(--hexa-panel-2)}.hexa-pinned-jump{flex:1;display:flex;align-items:center;gap:10px;min-width:0;border:0;background:transparent;color:inherit;text-align:left;padding:10px 8px;border-radius:12px;cursor:pointer}.hexa-pinned-icon{width:32px;height:32px;display:grid;place-items:center;border-radius:10px;background:rgba(124,92,255,.10);flex:0 0 auto}.hexa-pinned-copy{min-width:0;display:flex;flex-direction:column;gap:2px}.hexa-pinned-copy strong,.hexa-pinned-copy span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.hexa-pinned-copy strong{font-size:11px;color:var(--hexa-text)}.hexa-pinned-copy span{font-size:12px;color:var(--hexa-text)}.hexa-pinned-copy small{font-size:9px;color:var(--hexa-muted)}.hexa-pinned-unpin{width:32px;margin:7px 5px 7px 0;border:0;background:transparent;color:var(--hexa-muted);border-radius:9px;cursor:pointer;font-size:17px}.hexa-pinned-unpin:hover{background:rgba(255,70,70,.10);color:#f87171}.hexa-pinned-empty{padding:24px 18px 26px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:5px;color:var(--hexa-muted)}.hexa-pinned-empty>div{width:42px;height:42px;display:grid;place-items:center;border-radius:13px;background:rgba(124,92,255,.10);font-size:20px}.hexa-pinned-empty strong{color:var(--hexa-text);font-size:12px}.hexa-pinned-empty span{font-size:10px;max-width:350px}.pinned-header-count{position:absolute;transform:translate(10px,-10px);min-width:16px;height:16px;padding:0 4px;display:grid;place-items:center;border-radius:999px;background:var(--hexa-accent);color:#fff;font-size:8px;font-weight:900;border:2px solid var(--hexa-panel)}.hexa-pinned-highlight .message-bubble{animation:hexaPinnedHighlight 1.8s ease}.hexa-pinned-highlight{position:relative;z-index:2}@keyframes hexaPinnedDrop{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}@keyframes hexaPinnedHighlight{0%{box-shadow:0 0 0 0 rgba(124,92,255,0)}20%{box-shadow:0 0 0 5px rgba(124,92,255,.25)}100%{box-shadow:0 0 0 0 rgba(124,92,255,0)}}[data-hexa-theme="white"] .hexa-pinned-panel{background:#fff;border-color:rgba(0,0,0,.10);box-shadow:0 12px 28px rgba(0,0,0,.07)}[data-hexa-theme="white"] .hexa-pinned-head>button{background:#f7f7f8;color:#111;border-color:rgba(0,0,0,.12)}[data-hexa-theme="white"] .hexa-pinned-item:hover{background:#f7f7f8}[data-hexa-theme="white"] .pinned-header-count{border-color:#fff}@media(max-width:700px){.hexa-pinned-head{padding:11px 12px}.hexa-pinned-list{max-height:220px}.hexa-pinned-copy span{font-size:11px}.pinned-header-count{transform:translate(8px,-8px)}}
`;

const HEXA_UI_POLISH_CSS = `
.hexa-reminders-panel{border-color:rgba(124,92,255,.22)}
.hexa-reminder-item .hexa-pinned-jump{align-items:flex-start}
.message-action-item{transition:background .16s ease,transform .16s ease}
.message-action-item:hover{transform:translateY(-1px)}
.moments-story-card{overflow:hidden;background:var(--hexa-panel);border:1px solid var(--hexa-border)!important;border-radius:20px!important;box-shadow:var(--hexa-shadow);min-width:230px;max-width:250px;text-align:left;padding:0!important}
.moments-story-card .status-preview{height:250px;position:relative;background:var(--hexa-panel-2)}
.moments-story-card .moment-text-preview{font-size:44px;font-weight:900;color:var(--hexa-text);display:grid;place-items:center;width:100%;height:100%}
.moment-story-badge{position:absolute;top:10px;right:10px;padding:5px 8px;border-radius:999px;background:rgba(0,0,0,.5);color:#fff;font-size:9px;backdrop-filter:blur(8px)}
.moment-card-body{padding:11px 12px 13px;display:grid;gap:9px}
.moment-card-author{display:flex;align-items:center;gap:8px}
.moment-card-author>div{display:grid;gap:1px;min-width:0}
.moment-card-author strong{font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.moment-card-author small{font-size:8px;color:var(--hexa-muted)}
.moment-card-body p{margin:0;font-size:11px;line-height:1.45;color:var(--hexa-text);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;min-height:31px}
.moment-card-stats{display:flex;gap:10px;color:var(--hexa-muted);font-size:9px}
.moment-card-stats span:first-child{color:var(--hexa-text)}
.moments-viewer-content{display:flex!important;flex-direction:column;align-items:stretch!important;justify-content:flex-start!important}
.moments-viewer-topbar{position:absolute;z-index:4;top:0;left:0;right:0;padding:15px;display:flex;align-items:center;justify-content:space-between;background:linear-gradient(rgba(0,0,0,.58),transparent)}
.moment-viewer-identity{display:flex;align-items:center;gap:9px;color:#fff}
.moment-viewer-identity>div{display:grid;gap:2px}
.moment-viewer-identity strong{font-size:12px}.moment-viewer-identity small{font-size:9px;opacity:.78}
.moment-viewer-more{width:36px;height:36px;border-radius:50%;border:0;background:rgba(255,255,255,.12);color:#fff;font-size:22px}
.moments-viewer-content>img,.moments-viewer-content>video{flex:1;width:100%;height:100%;object-fit:contain!important;background:#000;padding-top:18px}
.moments-viewer-stats{left:18px;right:18px;bottom:54px!important;display:flex;gap:18px;color:rgba(255,255,255,.9)}
.moments-viewer-stats span{font-size:10px}.moments-viewer-stats b{color:#fff;font-size:12px}
@media(max-width:700px){.moments-story-card{min-width:205px}.moments-story-card .status-preview{height:215px}.moment-card-body{padding:10px}.moments-viewer-topbar{padding:12px}.moments-viewer-stats{gap:12px}}
`;


const HEXA_PROFILE_EDIT_CSS = `
.profile-edit-modal{width:min(560px,92vw);max-height:min(88vh,760px);overflow:auto;background:var(--hexa-panel);color:var(--hexa-text);border:1px solid var(--hexa-border);border-radius:24px;padding:18px;box-shadow:0 30px 90px rgba(0,0,0,.35)}.profile-edit-modal form{display:grid;gap:11px}.profile-edit-avatar-picker{justify-self:center;display:flex;flex-direction:column;align-items:center;gap:8px;border:0;background:transparent;color:var(--hexa-text);cursor:pointer}.profile-edit-avatar-picker span{font-size:11px;font-weight:800;color:var(--hexa-accent-2)}.profile-settings-copy{min-width:0;display:grid;gap:3px;flex:1}.profile-settings-copy small{color:var(--hexa-muted);font-size:10px;line-height:1.4}.hexa-profile-settings{display:flex;align-items:center;gap:14px}.hexa-profile-settings>.hero-secondary{margin-left:auto;flex:0 0 auto}@media(max-width:650px){.hexa-profile-settings{align-items:flex-start;flex-wrap:wrap}.hexa-profile-settings>.hero-secondary{margin-left:0}.profile-edit-modal{width:100%;padding:14px;border-radius:20px}}

.hexa-translate-overlay{position:fixed;inset:0;z-index:10040;display:grid;place-items:center;padding:20px;background:rgba(5,8,18,.58);backdrop-filter:blur(12px)}
.hexa-translate-modal{width:min(560px,calc(100vw - 30px));max-height:min(760px,calc(100vh - 30px));overflow:auto;border:1px solid var(--hexa-border-strong);border-radius:24px;background:var(--hexa-panel);box-shadow:0 30px 90px rgba(0,0,0,.35);padding:20px}

.hexa-vault-panel{position:relative;z-index:13;border-bottom:1px solid var(--hexa-border);background:var(--hexa-panel);box-shadow:0 12px 34px rgba(0,0,0,.10);animation:hexaSavedDrop .18s ease-out}.hexa-vault-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:15px 16px;border-bottom:1px solid var(--hexa-border)}.hexa-vault-head>div{min-width:0;display:flex;flex-direction:column;gap:4px}.hexa-vault-kicker{font-size:9px;font-weight:900;letter-spacing:.13em;color:var(--hexa-accent);text-transform:uppercase}.hexa-vault-head strong{font-size:15px;color:var(--hexa-text)}.hexa-vault-head small{font-size:10px;color:var(--hexa-muted)}.hexa-vault-head>button{width:32px;height:32px;border:1px solid var(--hexa-border);background:var(--hexa-panel-2);color:var(--hexa-text);border-radius:10px;font-size:18px;cursor:pointer}.hexa-vault-tools{padding:10px 12px;border-bottom:1px solid var(--hexa-border);display:flex;flex-direction:column;gap:9px}.hexa-vault-tools input{width:100%;box-sizing:border-box;border:1px solid var(--hexa-border);background:var(--hexa-panel-2);color:var(--hexa-text);border-radius:12px;padding:10px 12px;outline:none}.hexa-vault-filters{display:flex;gap:6px;overflow:auto}.hexa-vault-filters button{border:1px solid var(--hexa-border);background:transparent;color:var(--hexa-muted);border-radius:999px;padding:6px 10px;font-size:10px;font-weight:800;white-space:nowrap;cursor:pointer}.hexa-vault-filters button.active{background:var(--hexa-accent);border-color:var(--hexa-accent);color:#fff}.hexa-vault-list{max-height:330px;overflow:auto;padding:8px 10px}.hexa-vault-item{display:flex;gap:6px;align-items:stretch;border-radius:14px}.hexa-vault-item:hover{background:var(--hexa-panel-2)}.hexa-vault-open{display:flex;align-items:center;gap:10px;min-width:0;flex:1;padding:9px 8px;border:0;background:transparent;color:inherit;text-align:left;cursor:pointer;border-radius:13px}.hexa-vault-thumb{width:42px;height:42px;flex:0 0 auto;border-radius:12px;overflow:hidden;display:grid;place-items:center;background:rgba(124,92,255,.10);font-size:20px}.hexa-vault-thumb img,.hexa-vault-thumb video{width:100%;height:100%;object-fit:cover}.hexa-vault-copy{min-width:0;display:flex;flex-direction:column;gap:2px}.hexa-vault-copy strong,.hexa-vault-copy span,.hexa-vault-copy small{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.hexa-vault-copy strong{font-size:10px;color:var(--hexa-accent)}.hexa-vault-copy span{font-size:12px;color:var(--hexa-text)}.hexa-vault-copy small{font-size:9px;color:var(--hexa-muted)}.hexa-vault-remove{width:32px;margin:7px 5px 7px 0;border:0;background:transparent;color:var(--hexa-muted);border-radius:9px;cursor:pointer;font-size:18px}.hexa-vault-remove:hover{background:rgba(255,70,70,.10);color:#f87171}.hexa-vault-empty{padding:28px 18px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:6px;color:var(--hexa-muted)}.hexa-vault-empty>div{width:48px;height:48px;display:grid;place-items:center;border-radius:15px;background:rgba(124,92,255,.10);font-size:24px;color:var(--hexa-accent)}.hexa-vault-empty strong{color:var(--hexa-text);font-size:12px}.hexa-vault-empty span{font-size:10px;max-width:420px}@media(max-width:700px){.hexa-vault-head{padding:12px}.hexa-vault-list{max-height:270px}.hexa-vault-copy span{font-size:11px}}
.hexa-translate-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}.hexa-translate-kicker{display:block;color:var(--hexa-accent);font-size:10px;font-weight:900;letter-spacing:.14em}.hexa-translate-head h3{margin:6px 0 0;font-size:20px}.hexa-translate-original,.hexa-translate-result{padding:14px;border:1px solid var(--hexa-border);border-radius:16px;background:var(--hexa-panel-2)}.hexa-translate-original span,.hexa-translate-result span{font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:var(--hexa-muted);font-weight:800}.hexa-translate-original p,.hexa-translate-result p{margin:8px 0 0;white-space:pre-wrap;line-height:1.55;color:var(--hexa-text)}.hexa-translate-divider{text-align:center;color:var(--hexa-accent);font-size:20px;padding:8px}.hexa-translate-copy{width:100%;margin-top:14px}.hexa-translate-error{color:#ff7a90!important}.hexa-translate-loading{display:flex;gap:7px;padding:15px 0}.hexa-translate-loading i{width:8px;height:8px;border-radius:50%;background:var(--hexa-accent);animation:hexaTranslateDot 900ms infinite ease-in-out}.hexa-translate-loading i:nth-child(2){animation-delay:120ms}.hexa-translate-loading i:nth-child(3){animation-delay:240ms}@keyframes hexaTranslateDot{0%,80%,100%{transform:translateY(0);opacity:.35}40%{transform:translateY(-6px);opacity:1}}

`;



const HEXA_MOBILE_CSS = `
/* ============================================================
   HEXA MOBILE EXPERIENCE — phone-first polish
   ============================================================ */
@media (max-width: 700px){
  :root{--hexa-mobile-pad:10px}
  html,body,#root{min-height:100%;}
  body{overflow-x:hidden;-webkit-tap-highlight-color:transparent}

  .workspace-page{padding:10px var(--hexa-mobile-pad) 16px!important}
  .page-heading{gap:10px!important;margin-bottom:12px!important}
  .page-heading h1{font-size:24px!important;letter-spacing:-.02em}
  .page-heading p{font-size:11px!important;line-height:1.45}

  /* Chat becomes a real two-screen phone flow. */
  .chat-layout{
    position:relative!important;
    display:block!important;
    width:100%!important;
    height:calc(100dvh - 56px)!important;
    min-height:0!important;
    overflow:hidden!important;
    grid-template-columns:none!important;
  }
  .chat-list-panel,
  .chat-main{
    position:absolute!important;
    inset:0!important;
    width:100%!important;
    min-width:0!important;
    height:100%!important;
  }
  .chat-list-panel{
    display:flex!important;
    flex-direction:column!important;
    border-right:0!important;
    z-index:2!important;
    transform:translateX(0)!important;
    opacity:1!important;
    visibility:visible!important;
  }
  .mobile-chat-open .chat-list-panel,
  .focus-mode .chat-list-panel{display:none!important}
  .mobile-chat-list .chat-main{display:none!important}
  .mobile-chat-open .chat-main{display:flex!important}

  .chat-list-header{
    min-height:58px!important;
    padding:12px 12px 9px!important;
  }
  .chat-list-header h2{font-size:20px!important}
  .chat-list-header span{font-size:9px!important}
  .new-chat-button{width:40px!important;height:40px!important;border-radius:13px!important;font-size:20px!important}

  .chat-search{margin:3px 10px 10px!important}
  .chat-search input{
    height:44px!important;
    border-radius:14px!important;
    font-size:12px!important;
    padding-left:38px!important;
  }
  .conversation-list{
    flex:1!important;
    max-height:none!important;
    min-height:0!important;
    padding:0 4px 8px!important;
    overscroll-behavior:contain!important;
    -webkit-overflow-scrolling:touch!important;
  }
  .conversation{
    width:100%!important;
    min-height:70px!important;
    margin:1px 0!important;
    padding:10px 8px!important;
    gap:10px!important;
    border-radius:16px!important;
  }
  .conversation:active{transform:scale(.992)}
  .conversation-content strong{font-size:12px!important}
  .conversation-content span{font-size:10px!important}
  .conversation-topline time{font-size:9px!important}
  .unread-badge{min-width:20px!important;height:20px!important}

  .chat-header{
    min-height:60px!important;
    height:60px!important;
    padding:7px 8px!important;
    gap:8px!important;
    flex:0 0 60px!important;
  }
  .mobile-chat-back{
    display:grid!important;
    place-items:center!important;
    width:40px!important;
    height:40px!important;
    flex:0 0 40px!important;
    border:1px solid var(--hexa-border)!important;
    border-radius:13px!important;
    background:var(--hexa-panel-2)!important;
    color:var(--hexa-text)!important;
    font-size:20px!important;
  }
  .chat-header .avatar{flex:0 0 auto}
  .chat-header-copy{min-width:0!important;flex:1 1 auto!important}
  .chat-header-copy strong{font-size:12px!important;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .chat-header-copy span{font-size:9px!important;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .chat-header-actions{
    max-width:48vw!important;
    min-width:0!important;
    overflow-x:auto!important;
    overflow-y:hidden!important;
    scrollbar-width:none!important;
    -ms-overflow-style:none!important;
    gap:4px!important;
    flex:0 1 auto!important;
    overscroll-behavior-x:contain!important;
  }
  .chat-header-actions::-webkit-scrollbar{display:none}
  .chat-header-actions button{
    flex:0 0 36px!important;
    width:36px!important;
    height:36px!important;
    border-radius:11px!important;
    font-size:15px!important;
  }

  .messages-area{
    padding:12px 9px 10px!important;
    overscroll-behavior:contain!important;
    -webkit-overflow-scrolling:touch!important;
  }
  .message-row{margin-bottom:5px!important}
  .message-bubble-wrap{max-width:88%!important}
  .message-bubble{
    max-width:100%!important;
    border-radius:17px!important;
    padding:9px 11px!important;
    font-size:13px!important;
    line-height:1.42!important;
  }
  .message-bubble small{font-size:8px!important}
  .message-media{max-width:min(78vw,280px)!important;max-height:42vh!important}
  .reply-bar{padding:8px 10px!important;gap:8px!important}
  .reply-bar > div{min-width:0}
  .reply-bar button{width:34px;height:34px;border-radius:10px;background:var(--hexa-panel-3)}

  .message-tools{display:none!important}
  .message-action-popover{
    left:8px!important;
    right:8px!important;
    bottom:max(8px,env(safe-area-inset-bottom))!important;
    width:auto!important;
    max-height:72dvh!important;
    border-radius:22px!important;
    padding:8px!important;
  }

  .quick-actions-popover,
  .chat-settings-popover,
  .emoji-panel,
  .gif-panel,
  .sticker-panel,
  .feature-popover{
    max-width:calc(100vw - 16px)!important;
  }
  .quick-actions-popover,
  .chat-settings-popover{right:8px!important}

  .message-composer,
  .hexa-message-composer{
    padding-left:7px!important;
    padding-right:7px!important;
    padding-bottom:max(8px,env(safe-area-inset-bottom))!important;
  }
  .composer-shell{border-radius:19px!important}
  .composer-main-row{min-height:52px!important;gap:3px!important;padding:5px!important}
  .composer-icon-btn,.composer-voice-btn,.composer-send-btn{
    flex:0 0 38px!important;
    width:38px!important;
    height:38px!important;
    border-radius:12px!important;
  }
  .composer-voice-btn{border-radius:50%!important}
  .composer-textarea{
    min-height:40px!important;
    max-height:112px!important;
    font-size:14px!important;
    line-height:1.4!important;
    padding:8px 4px!important;
  }
  .composer-recording-bar{padding:7px 11px 8px!important}

  .empty-chat{padding:22px!important}
  .empty-chat h3{font-size:17px!important}
  .empty-chat p{font-size:10px!important;line-height:1.45}

  /* Prevent wide cards/modals from becoming horizontally scrollable. */
  .entity-modal,.status-modal,.profile-edit-modal,.hexa-translate-modal,.call-shell{
    width:calc(100vw - 16px)!important;
    max-width:calc(100vw - 16px)!important;
    max-height:calc(100dvh - 24px)!important;
    border-radius:19px!important;
  }
  .hexa-translate-overlay,.story-viewer,.hexa-modal-backdrop{padding:8px!important}
  .story-content{width:100%!important;height:calc(100dvh - 16px)!important;border-radius:16px!important}

  /* Larger touch targets across phone pages. */
  button,input,select,textarea{touch-action:manipulation}
  .settings-card,.entity-card{border-radius:16px!important}
  .settings-card{padding:14px!important;gap:10px!important;align-items:flex-start!important}
  .settings-card button{min-height:40px!important}

  /* Calls */
  .call-shell{height:calc(100dvh - 16px)!important}
  .call-header{padding:11px 12px!important}
  .call-local-video{right:10px!important;bottom:10px!important;width:34%!important}
  .call-controls{padding:12px!important;padding-bottom:max(12px,env(safe-area-inset-bottom))!important}
}

@media (max-width: 390px){
  .chat-header-actions{max-width:42vw!important}
  .chat-header-actions button{flex-basis:34px!important;width:34px!important;height:34px!important}
  .chat-header-copy strong{font-size:11px!important}
  .message-bubble{font-size:12.5px!important}
  .conversation{min-height:66px!important}
  .composer-icon-btn,.composer-voice-btn,.composer-send-btn{flex-basis:36px!important;width:36px!important;height:36px!important}
}

@media (prefers-reduced-motion: reduce){
  .conversation,.message-bubble,.chat-header-actions button{transition:none!important}
}
`;

const HEXA_GUEST_PRIVACY_CSS = `
.hexa-guest-banner{position:relative;z-index:20;display:flex;align-items:center;gap:12px;margin:10px 14px 0;padding:11px 14px;border:1px solid color-mix(in srgb,var(--hexa-accent,#6d5dfc) 30%,var(--hexa-border,#ddd));border-radius:16px;background:color-mix(in srgb,var(--hexa-card,#fff) 92%,var(--hexa-accent,#6d5dfc));box-shadow:0 10px 30px rgba(0,0,0,.08)}
.hexa-guest-banner-icon{font-size:21px}.hexa-guest-banner-copy{min-width:0;flex:1;display:flex;flex-direction:column;gap:2px}.hexa-guest-banner-copy strong{font-size:13px}.hexa-guest-banner-copy span{font-size:11px;line-height:1.45;opacity:.78}.hexa-guest-banner-copy a,.privacy-link{font-size:11px;color:var(--hexa-accent,#5b4bdb);text-decoration:underline}.hexa-guest-secure{border:0;border-radius:10px;padding:9px 12px;font-weight:800;background:var(--hexa-accent,#6d5dfc);color:#fff;cursor:pointer;white-space:nowrap}.hexa-guest-dismiss{border:0;background:transparent;font-size:20px;opacity:.55;cursor:pointer}.hexa-guest-auth-card{margin-top:16px;padding:14px;border:1px solid var(--hexa-border,#ddd);border-radius:15px;background:color-mix(in srgb,var(--hexa-card,#fff) 92%,var(--hexa-accent,#6d5dfc));display:flex;flex-direction:column;gap:8px}.hexa-guest-auth-card strong{font-size:13px}.hexa-guest-auth-card p{margin:0;font-size:11px;line-height:1.5;opacity:.78}.guest-auth-button{align-self:flex-start}.guest-upgrade-card{display:flex;flex-direction:column;gap:12px;margin-bottom:14px}.guest-upgrade-card p{margin:5px 0 0;opacity:.72}.guest-upgrade-form{display:flex;gap:8px;align-items:center}.guest-upgrade-form .modal-input{flex:1}.hexa-policy-page{min-height:100dvh;padding:28px;background:var(--hexa-bg,#f6f7fb);display:grid;place-items:center}.hexa-policy-card{width:min(760px,100%);padding:28px;border-radius:24px;background:var(--hexa-card,#fff);border:1px solid var(--hexa-border,#ddd);box-shadow:0 20px 60px rgba(0,0,0,.08)}.hexa-policy-card h1{font-size:34px;margin:24px 0 12px}.hexa-policy-card h2{font-size:18px;margin:24px 0 8px}.hexa-policy-card p{line-height:1.7;opacity:.82}.hexa-policy-actions{margin-top:24px}.hexa-policy-actions a{text-decoration:none;display:inline-flex}
@media(max-width:700px){.hexa-guest-banner{margin:8px 8px 0;align-items:flex-start;flex-wrap:wrap}.hexa-guest-secure{width:100%}.hexa-guest-dismiss{position:absolute;top:5px;right:6px}.guest-upgrade-form{flex-direction:column;align-items:stretch}.hexa-policy-page{padding:12px}.hexa-policy-card{padding:20px}.hexa-policy-card h1{font-size:28px}}
`;

const APP_STYLES = APP_STYLES_HEAD + APP_STYLES_TAIL + HEXA_PROFILE_EDIT_CSS + HEXA_SETTINGS_POLISH_CSS + HEXA_WHITE_THEME_CSS + HEXA_MOMENTS_CSS + HEXA_KORA_CSS + HEXA_COMPOSER_CSS + HEXA_PINNED_MESSAGES_CSS + HEXA_UI_POLISH_CSS + HEXA_MOBILE_CSS + HEXA_GUEST_PRIVACY_CSS;


