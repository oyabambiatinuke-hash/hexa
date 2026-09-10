/* public/hexa-sw.js */

const CACHE_NAME = "hexa-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

/*
 * Push notification received from the HEXA push server.
 */
self.addEventListener("push", (event) => {
  event.waitUntil(
    (async () => {
      let data = {};

      try {
        data = event.data ? event.data.json() : {};
      } catch {
        data = {
          title: "HEXA",
          body: event.data?.text?.() || "You have a new notification.",
        };
      }

      const type = data.type || "message";

      let title = data.title || "HEXA";
      let body = data.body || "";
      let icon = data.icon || "/pwa-192.png";
      let badge = data.badge || "/pwa-192.png";

      if (type === "voice_call") {
        title = data.title || "Incoming voice call";
        body = data.body || "Someone is calling you on HEXA";
      }

      if (type === "video_call") {
        title = data.title || "Incoming video call";
        body = data.body || "Someone is calling you on HEXA";
      }

      const notificationOptions = {
        body,
        icon,
        badge,
        tag: data.tag || `hexa-${type}-${data.id || Date.now()}`,
        renotify: true,
        requireInteraction:
          type === "voice_call" || type === "video_call",

        vibrate:
          type === "voice_call" || type === "video_call"
            ? [250, 100, 250, 100, 500]
            : [120, 80, 120],

        data: {
          type,
          id: data.id || null,
          conversationId: data.conversationId || null,
          callId: data.callId || null,
          url: data.url || "/",
        },

        actions:
          type === "voice_call" || type === "video_call"
            ? [
                {
                  action: "open-call",
                  title: "Open call",
                },
                {
                  action: "dismiss",
                  title: "Dismiss",
                },
              ]
            : [
                {
                  action: "open",
                  title: "Open HEXA",
                },
              ],
      };

      await self.registration.showNotification(
        title,
        notificationOptions
      );
    })()
  );
});

/*
 * Notification clicked.
 */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "dismiss") {
    return;
  }

  event.waitUntil(
    (async () => {
      const data = event.notification.data || {};

      let targetUrl = data.url || "/";

      if (data.type === "message" && data.conversationId) {
        targetUrl = `/?chat=${encodeURIComponent(
          data.conversationId
        )}`;
      }

      if (
        (data.type === "voice_call" ||
          data.type === "video_call") &&
        data.callId
      ) {
        targetUrl = `/?call=${encodeURIComponent(data.callId)}`;
      }

      const absoluteUrl = new URL(
        targetUrl,
        self.location.origin
      ).href;

      const clientsList = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      /*
       * Reuse an existing HEXA tab.
       */
      for (const client of clientsList) {
        if ("focus" in client) {
          await client.focus();

          if ("navigate" in client) {
            await client.navigate(absoluteUrl);
          }

          return;
        }
      }

      /*
       * No HEXA tab exists, so create one.
       */
      if (self.clients.openWindow) {
        await self.clients.openWindow(absoluteUrl);
      }
    })()
  );
});

/*
 * Optional message channel.
 * The React app can tell the service worker which chat is currently open.
 */
self.addEventListener("message", (event) => {
  if (!event.data) return;

  if (event.data.type === "HEXA_READY") {
    event.source?.postMessage({
      type: "HEXA_SW_READY",
    });
  }
});