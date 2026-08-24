import { supabase } from "../lib/supabase";

export function createCallChannel(userId) {
  if (!userId) {
    throw new Error("Missing user ID.");
  }

  return supabase.channel(`hexa-call:${userId}`, {
    config: {
      broadcast: {
        self: false,
      },
    },
  });
}

export async function connectCallChannel(userId, handlers = {}) {
  const channel = createCallChannel(userId);

  channel.on("broadcast", { event: "incoming-call" }, ({ payload }) => {
    handlers.onIncomingCall?.(payload);
  });

  channel.on("broadcast", { event: "call-accepted" }, ({ payload }) => {
    handlers.onCallAccepted?.(payload);
  });

  channel.on("broadcast", { event: "call-rejected" }, ({ payload }) => {
    handlers.onCallRejected?.(payload);
  });

  channel.on("broadcast", { event: "call-ended" }, ({ payload }) => {
    handlers.onCallEnded?.(payload);
  });

  channel.on("broadcast", { event: "offer" }, ({ payload }) => {
    handlers.onOffer?.(payload);
  });

  channel.on("broadcast", { event: "answer" }, ({ payload }) => {
    handlers.onAnswer?.(payload);
  });

  channel.on("broadcast", { event: "ice-candidate" }, ({ payload }) => {
    handlers.onIceCandidate?.(payload);
  });

  await new Promise((resolve, reject) => {
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        resolve();
      }

      if (
        status === "CHANNEL_ERROR" ||
        status === "TIMED_OUT" ||
        status === "CLOSED"
      ) {
        reject(new Error(`Realtime status: ${status}`));
      }
    });
  });

  return channel;
}

export async function sendSignal(
  recipientId,
  event,
  payload
) {
  if (!recipientId) {
    throw new Error("Recipient ID is required.");
  }

  const channel = supabase.channel(`hexa-call:${recipientId}`, {
    config: {
      broadcast: {
        self: false,
      },
    },
  });

  await new Promise((resolve, reject) => {
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        resolve();
      }

      if (
        status === "CHANNEL_ERROR" ||
        status === "TIMED_OUT"
      ) {
        reject(new Error(`Realtime status: ${status}`));
      }
    });
  });

  const result = await channel.send({
    type: "broadcast",
    event,
    payload,
  });

  await supabase.removeChannel(channel);

  return result;
}