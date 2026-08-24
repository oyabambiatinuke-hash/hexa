import { useCallback, useEffect, useRef } from "react";
import {
  connectCallChannel,
  disconnectCallChannel,
  sendCallSignal,
} from "../lib/callSignaling";

export function useCallSignaling(userId, handlers = {}) {
  const channelRef = useRef(null);

  const handlersRef = useRef(handlers);

  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  useEffect(() => {
    if (!userId) return;

    let mounted = true;

    async function setup() {
      try {
        const { channel } = await connectCallChannel(userId);

        if (!mounted) {
          await disconnectCallChannel(channel);
          return;
        }

        channelRef.current = channel;

        channel.on("broadcast", { event: "incoming-call" }, ({ payload }) => {
          handlersRef.current.onIncomingCall?.(payload);
        });

        channel.on("broadcast", { event: "call-accepted" }, ({ payload }) => {
          handlersRef.current.onCallAccepted?.(payload);
        });

        channel.on("broadcast", { event: "call-rejected" }, ({ payload }) => {
          handlersRef.current.onCallRejected?.(payload);
        });

        channel.on("broadcast", { event: "call-ended" }, ({ payload }) => {
          handlersRef.current.onCallEnded?.(payload);
        });

        channel.on("broadcast", { event: "offer" }, ({ payload }) => {
          handlersRef.current.onOffer?.(payload);
        });

        channel.on("broadcast", { event: "answer" }, ({ payload }) => {
          handlersRef.current.onAnswer?.(payload);
        });

        channel.on(
          "broadcast",
          { event: "ice-candidate" },
          ({ payload }) => {
            handlersRef.current.onIceCandidate?.(payload);
          }
        );
      } catch (error) {
        console.error("HEXA Realtime connection failed:", error);

        handlersRef.current.onError?.(error);
      }
    }

    setup();

    return () => {
      mounted = false;

      if (channelRef.current) {
        disconnectCallChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [userId]);

  const sendToUser = useCallback(async (recipientId, event, data = {}) => {
    if (!recipientId) {
      throw new Error("Recipient ID is required.");
    }

    /*
      Every user has their own private signaling channel.
    */

    const targetChannel = channelRef.current;

    if (!targetChannel) {
      throw new Error("HEXA Realtime is not connected.");
    }

    /*
      IMPORTANT:
      Broadcast cannot directly send to another user's channel
      through the existing channel.

      We therefore create a temporary channel for the recipient.
    */

    const recipientChannel = targetChannel.supabase
      ? targetChannel.supabase.channel(`hexa-call:${recipientId}`)
      : null;

    if (!recipientChannel) {
      throw new Error("Unable to create recipient signaling channel.");
    }

    await new Promise((resolve, reject) => {
      recipientChannel.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          resolve();
        }

        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          reject(new Error(`Recipient channel error: ${status}`));
        }
      });
    });

    await recipientChannel.send({
      type: "broadcast",
      event,
      payload: {
        ...data,
        fromUserId: userId,
        toUserId: recipientId,
      },
    });

    await recipientChannel.supabase.removeChannel(recipientChannel);
  }, [userId]);

  const sendIncomingCall = useCallback(
    (recipientId, call) =>
      sendToUser(recipientId, "incoming-call", call),
    [sendToUser]
  );

  const acceptCall = useCallback(
    (callerId, call) =>
      sendToUser(callerId, "call-accepted", call),
    [sendToUser]
  );

  const rejectCall = useCallback(
    (callerId, call) =>
      sendToUser(callerId, "call-rejected", call),
    [sendToUser]
  );

  const endCall = useCallback(
    (otherUserId, call) =>
      sendToUser(otherUserId, "call-ended", call),
    [sendToUser]
  );

  const sendOffer = useCallback(
    (recipientId, offer) =>
      sendToUser(recipientId, "offer", { offer }),
    [sendToUser]
  );

  const sendAnswer = useCallback(
    (recipientId, answer) =>
      sendToUser(recipientId, "answer", { answer }),
    [sendToUser]
  );

  const sendIceCandidate = useCallback(
    (recipientId, candidate) =>
      sendToUser(recipientId, "ice-candidate", { candidate }),
    [sendToUser]
  );

  return {
    sendIncomingCall,
    acceptCall,
    rejectCall,
    endCall,
    sendOffer,
    sendAnswer,
    sendIceCandidate,
  };
}