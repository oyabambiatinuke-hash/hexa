/* =========================================================
   HEXA SERVICES
   GIPHY + WEBRTC + TURN + OFFLINE + NOTIFICATIONS
   ========================================================= */

const GIPHY_KEY =
  import.meta.env.VITE_GIPHY_API_KEY;

const TURN_TOKEN_URL =
  import.meta.env.VITE_TURN_TOKEN_URL ||
  "/api/turn-credentials";

/* =========================================================
   GIPHY
   ========================================================= */

export async function searchGiphy(
  query,
  limit = 24,
  offset = 0
) {
  if (!GIPHY_KEY) {
    throw new Error(
      "VITE_GIPHY_API_KEY is missing."
    );
  }

  const params = new URLSearchParams({
    api_key: GIPHY_KEY,
    q: query || "reaction",
    limit: String(limit),
    offset: String(offset),
    rating: "pg-13",
    lang: "en",
    bundle: "messaging_non_clips",
  });

  const response = await fetch(
    `https://api.giphy.com/v1/gifs/search?${params}`
  );

  if (!response.ok) {
    throw new Error(
      `GIPHY search failed: ${response.status}`
    );
  }

  const json = await response.json();

  return {
    results: json.data || [],
    pagination: json.pagination || {},
  };
}

export async function getTrendingGiphy(
  limit = 24
) {
  if (!GIPHY_KEY) {
    throw new Error(
      "VITE_GIPHY_API_KEY is missing."
    );
  }

  const params = new URLSearchParams({
    api_key: GIPHY_KEY,
    limit: String(limit),
    rating: "pg-13",
    bundle: "messaging_non_clips",
  });

  const response = await fetch(
    `https://api.giphy.com/v1/gifs/trending?${params}`
  );

  if (!response.ok) {
    throw new Error(
      `GIPHY trending failed: ${response.status}`
    );
  }

  const json = await response.json();

  return json.data || [];
}

export function getGiphyUrl(gif) {
  return (
    gif?.images?.original?.url ||
    gif?.images?.downsized?.url ||
    gif?.images?.fixed_height?.url ||
    ""
  );
}

export function getGiphyPreview(gif) {
  return (
    gif?.images?.fixed_width_small?.url ||
    gif?.images?.preview_gif?.url ||
    gif?.images?.fixed_height_small?.url ||
    getGiphyUrl(gif)
  );
}

/* =========================================================
   GIPHY ANALYTICS
   ========================================================= */

export async function registerGiphyAction(
  gifId,
  action,
  userId
) {
  if (!GIPHY_KEY || !gifId) return;

  try {
    const params = new URLSearchParams({
      api_key: GIPHY_KEY,
      gif_id: gifId,
      action_type: action,
    });

    if (userId) {
      params.set(
        "user_id",
        String(userId)
      );
    }

    await fetch(
      `https://api.giphy.com/v1/gifs/${gifId}?${params}`
    );
  } catch {
    // Analytics must never break messaging.
  }
}

/* =========================================================
   TURN / STUN
   ========================================================= */

export async function getTurnCredentials() {
  const response = await fetch(
    TURN_TOKEN_URL,
    {
      method: "GET",
      credentials: "include",
      headers: {
        Accept: "application/json",
      },
    }
  );

  if (!response.ok) {
    throw new Error(
      `TURN credential request failed: ${response.status}`
    );
  }

  const data = await response.json();

  /*
    Expected response:

    {
      ice_servers: [
        {
          urls: "stun:...",
        },
        {
          urls: [
            "turn:...",
            "turns:..."
          ],
          username: "...",
          credential: "..."
        }
      ]
    }
  */

  if (!data.ice_servers) {
    throw new Error(
      "TURN response does not contain ice_servers."
    );
  }

  return data.ice_servers;
}

/* =========================================================
   WEBRTC
   ========================================================= */

export async function createHexaPeerConnection() {
  const iceServers =
    await getTurnCredentials();

  const connection =
    new RTCPeerConnection({
      iceServers,
      bundlePolicy: "max-bundle",
      rtcpMuxPolicy: "require",
    });

  return connection;
}

/* =========================================================
   MEDIA DEVICES
   ========================================================= */

export async function getMicrophone() {
  return navigator.mediaDevices.getUserMedia(
    {
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: false,
    }
  );
}

export async function getCameraAndMicrophone() {
  return navigator.mediaDevices.getUserMedia(
    {
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },

      video: {
        width: {
          ideal: 1280,
        },

        height: {
          ideal: 720,
        },

        frameRate: {
          ideal: 30,
        },

        facingMode: "user",
      },
    }
  );
}

export function stopMediaStream(stream) {
  if (!stream) return;

  stream
    .getTracks()
    .forEach((track) => {
      track.stop();
    });
}

/* =========================================================
   CALL DEVICE CHECK
   ========================================================= */

export async function checkCallDevices() {
  if (!navigator.mediaDevices) {
    return {
      supported: false,
      microphone: false,
      camera: false,
    };
  }

  const devices =
    await navigator.mediaDevices.enumerateDevices();

  return {
    supported: true,

    microphone: devices.some(
      (device) =>
        device.kind === "audioinput"
    ),

    camera: devices.some(
      (device) =>
        device.kind === "videoinput"
    ),
  };
}

/* =========================================================
   OFFLINE STORAGE
   ========================================================= */

const DB_NAME = "hexa-offline";
const DB_VERSION = 1;
const STORE_NAME = "messages";

function openOfflineDB() {
  return new Promise(
    (resolve, reject) => {
      const request =
        indexedDB.open(
          DB_NAME,
          DB_VERSION
        );

      request.onupgradeneeded = () => {
        const db =
          request.result;

        if (
          !db.objectStoreNames.contains(
            STORE_NAME
          )
        ) {
          db.createObjectStore(
            STORE_NAME,
            {
              keyPath: "id",
            }
          );
        }
      };

      request.onsuccess = () =>
        resolve(request.result);

      request.onerror = () =>
        reject(
          request.error
        );
    }
  );
}

export async function queueOfflineMessage(
  message
) {
  const db =
    await openOfflineDB();

  return new Promise(
    (resolve, reject) => {
      const transaction =
        db.transaction(
          STORE_NAME,
          "readwrite"
        );

      transaction
        .objectStore(STORE_NAME)
        .put({
          ...message,
          queuedAt:
            Date.now(),
        });

      transaction.oncomplete =
        () => resolve(true);

      transaction.onerror =
        () =>
          reject(
            transaction.error
          );
    }
  );
}

export async function getQueuedMessages() {
  const db =
    await openOfflineDB();

  return new Promise(
    (resolve, reject) => {
      const request =
        db
          .transaction(
            STORE_NAME,
            "readonly"
          )
          .objectStore(STORE_NAME)
          .getAll();

      request.onsuccess = () =>
        resolve(
          request.result || []
        );

      request.onerror = () =>
        reject(
          request.error
        );
    }
  );
}

export async function deleteQueuedMessage(
  id
) {
  const db =
    await openOfflineDB();

  return new Promise(
    (resolve, reject) => {
      const transaction =
        db.transaction(
          STORE_NAME,
          "readwrite"
        );

      transaction
        .objectStore(STORE_NAME)
        .delete(id);

      transaction.oncomplete =
        () => resolve(true);

      transaction.onerror =
        () =>
          reject(
            transaction.error
          );
    }
  );
}

/* =========================================================
   NOTIFICATIONS
   ========================================================= */

export async function requestHexaNotifications() {
  if (
    !("Notification" in window)
  ) {
    return "unsupported";
  }

  return Notification.requestPermission();
}

export function notifyHexa(
  title,
  options = {}
) {
  if (
    !("Notification" in window)
  ) {
    return null;
  }

  if (
    Notification.permission !==
    "granted"
  ) {
    return null;
  }

  return new Notification(
    title,
    {
      icon: "/favicon.ico",
      ...options,
    }
  );
}

/* =========================================================
   VIBRATION
   ========================================================= */

export function vibrateHexa(
  pattern = [40]
) {
  if (
    "vibrate" in navigator
  ) {
    navigator.vibrate(
      pattern
    );
  }
}

/* =========================================================
   WAKE LOCK
   ========================================================= */

let wakeLock = null;

export async function enableWakeLock() {
  if (
    !("wakeLock" in navigator)
  ) {
    return false;
  }

  try {
    wakeLock =
      await navigator.wakeLock.request(
        "screen"
      );

    return true;
  } catch {
    return false;
  }
}

export async function disableWakeLock() {
  if (!wakeLock) return;

  try {
    await wakeLock.release();
  } catch {
    // Already released.
  }

  wakeLock = null;
}

/* =========================================================
   SHARE
   ========================================================= */

export async function shareHexa(
  data
) {
  if (
    navigator.share
  ) {
    return navigator.share(
      data
    );
  }

  if (
    navigator.clipboard &&
    data?.url
  ) {
    await navigator.clipboard.writeText(
      data.url
    );

    return true;
  }

  return false;
}

/* =========================================================
   CLIPBOARD
   ========================================================= */

export async function copyHexa(
  text
) {
  if (
    !navigator.clipboard
  ) {
    return false;
  }

  await navigator.clipboard.writeText(
    text
  );

  return true;
}

/* =========================================================
   NETWORK STATE
   ========================================================= */

export function subscribeToNetwork(
  callback
) {
  const online =
    () => callback(true);

  const offline =
    () => callback(false);

  window.addEventListener(
    "online",
    online
  );

  window.addEventListener(
    "offline",
    offline
  );

  return () => {
    window.removeEventListener(
      "online",
      online
    );

    window.removeEventListener(
      "offline",
      offline
    );
  };
}
