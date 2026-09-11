const CACHE = "hexachi-shell-v2";

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = {};

  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {
      body: event.data?.text?.() || "",
    };
  }

  const title = data.title || "hexachi";

  const notificationData = {
    url: data.data?.url || data.url || "/",
    conversation_id:
      data.data?.conversation_id ||
      data.conversation_id ||
      null,
    message_id:
      data.data?.message_id ||
      data.message_id ||
      null,
    call_id:
      data.data?.call_id ||
      data.call_id ||
      null,
    kind:
      data.data?.kind ||
      data.kind ||
      "message",
    call_type:
      data.data?.call_type ||
      data.call_type ||
      null,
  };

  const options = {
    body: data.body || "You have a new message.",
    icon: data.icon || "/favicon.ico",
    badge: data.badge || "/favicon.ico",

    tag:
      data.tag ||
      (
        notificationData.call_id
          ? `call-${notificationData.call_id}`
          : "hexachi-notification"
      ),

    renotify: true,

    requireInteraction:
      Boolean(data.requireInteraction) ||
      notificationData.kind === "call",

    data: notificationData,

    vibrate:
      data.vibrate ||
      [120, 60, 120],

    timestamp: Date.now(),
  };

  event.waitUntil(
    self.registration.showNotification(
      title,
      options
    )
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const notification = event.notification;
  const data = notification.data || {};

  const target =
    data.url ||
    "/";

  event.waitUntil(
    (async () => {
      const clients =
        await self.clients.matchAll({
          type: "window",
          includeUncontrolled: true,
        });

      for (const client of clients) {
        try {
          await client.focus();

          if (
            "navigate" in client &&
            target
          ) {
            await client.navigate(target);
          }

          return;
        } catch {
          // Try the next open client.
        }
      }

      if (self.clients.openWindow) {
        await self.clients.openWindow(target);
      }
    })()
  );
});

self.addEventListener("notificationclose", () => {
  // Reserved for analytics/notification cleanup.
});