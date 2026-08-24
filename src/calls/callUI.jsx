import React, { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import "./CallUI.css";

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

export default function CallUI({
  callId,
  currentUserId,
  remoteUserId,
  remoteName = "HEXA User",
  mode = "video",
  incoming = false,
  onClose,
}) {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerRef = useRef(null);
  const channelRef = useRef(null);
  const localStreamRef = useRef(null);

  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(true);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(mode === "voice");
  const [speaker, setSpeaker] = useState(true);
  const [error, setError] = useState("");

  const sendSignal = async (payload) => {
    if (!channelRef.current) return;

    await channelRef.current.send({
      type: "broadcast",
      event: "signal",
      payload: {
        ...payload,
        from: currentUserId,
      },
    });
  };

  const createPeer = async (stream) => {
    const peer = new RTCPeerConnection(ICE_SERVERS);

    peerRef.current = peer;

    stream.getTracks().forEach((track) => {
      peer.addTrack(track, stream);
    });

    peer.ontrack = (event) => {
      const [remoteStream] = event.streams;

      if (remoteVideoRef.current && remoteStream) {
        remoteVideoRef.current.srcObject = remoteStream;
      }

      setConnected(true);
      setConnecting(false);
    };

    peer.onicecandidate = async (event) => {
      if (!event.candidate) return;

      await sendSignal({
        type: "ice-candidate",
        candidate: event.candidate,
      });
    };

    peer.onconnectionstatechange = () => {
      const state = peer.connectionState;

      if (state === "connected") {
        setConnected(true);
        setConnecting(false);
      }

      if (
        state === "failed" ||
        state === "disconnected" ||
        state === "closed"
      ) {
        setConnected(false);
      }
    };

    return peer;
  };

  useEffect(() => {
    let mounted = true;

    const startCall = async () => {
      try {
        if (!currentUserId || !remoteUserId || !callId) {
          throw new Error("Missing call information.");
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: mode === "video",
        });

        if (!mounted) return;

        localStreamRef.current = stream;

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        const channel = supabase.channel(`hexa-call-${callId}`, {
          config: {
            broadcast: {
              self: false,
            },
          },
        });

        channelRef.current = channel;

        channel.on(
          "broadcast",
          { event: "signal" },
          async ({ payload }) => {
            if (!payload || payload.from === currentUserId) return;

            const peer = peerRef.current;

            if (!peer) return;

            if (payload.type === "offer") {
              await peer.setRemoteDescription(
                new RTCSessionDescription(payload.offer)
              );

              const answer = await peer.createAnswer();

              await peer.setLocalDescription(answer);

              await sendSignal({
                type: "answer",
                answer,
              });
            }

            if (payload.type === "answer") {
              await peer.setRemoteDescription(
                new RTCSessionDescription(payload.answer)
              );
            }

            if (payload.type === "ice-candidate") {
              try {
                await peer.addIceCandidate(
                  new RTCIceCandidate(payload.candidate)
                );
              } catch {
                // Candidate may arrive before remote description.
              }
            }

            if (payload.type === "hangup") {
              endCall(false);
            }
          }
        );

        await channel.subscribe();

        if (!mounted) return;

        await createPeer(stream);

        /*
         * The caller creates the offer.
         * The receiver waits for it.
         */
        if (!incoming) {
          const peer = peerRef.current;

          const offer = await peer.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: mode === "video",
          });

          await peer.setLocalDescription(offer);

          await sendSignal({
            type: "offer",
            offer,
          });
        }

        setConnecting(true);
      } catch (err) {
        console.error(err);

        if (mounted) {
          setError(
            err?.message ||
              "Unable to access your microphone or camera."
          );
          setConnecting(false);
        }
      }
    };

    startCall();

    return () => {
      mounted = false;

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          track.stop();
        });
      }

      if (peerRef.current) {
        peerRef.current.close();
      }

      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      };
    };
  }, [callId, currentUserId, remoteUserId, mode, incoming]);

  const toggleMute = () => {
    const stream = localStreamRef.current;

    if (!stream) return;

    stream.getAudioTracks().forEach((track) => {
      track.enabled = !track.enabled;
    });

    setMuted((prev) => !prev);
  };

  const toggleCamera = () => {
    const stream = localStreamRef.current;

    if (!stream) return;

    const videoTracks = stream.getVideoTracks();

    if (!videoTracks.length) return;

    videoTracks.forEach((track) => {
      track.enabled = !track.enabled;
    });

    setCameraOff((prev) => !prev);
  };

  const endCall = async (notify = true) => {
    if (notify) {
      await sendSignal({
        type: "hangup",
      });
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
    }

    if (peerRef.current) {
      peerRef.current.close();
    }

    if (channelRef.current) {
      await supabase.removeChannel(channelRef.current);
    }

    onClose?.();
  };

  return (
    <div className="call-layer">
      <div className="call-background" />

      <div className="call-window">
        <header className="call-header">
          <div className="call-person">
            <div className="call-avatar">
              {remoteName
                .split(" ")
                .map((word) => word[0])
                .slice(0, 2)
                .join("")
                .toUpperCase()}
            </div>

            <div>
              <strong>{remoteName}</strong>

              <span>
                {error
                  ? "Call error"
                  : connected
                  ? mode === "video"
                    ? "Video call"
                    : "Voice call"
                  : "Connecting..."}
              </span>
            </div>
          </div>

          <button
            className="call-close"
            onClick={() => endCall(true)}
          >
            ×
          </button>
        </header>

        <div className="call-stage">
          {mode === "video" && !cameraOff ? (
            <video
              ref={remoteVideoRef}
              className="remote-video"
              autoPlay
              playsInline
            />
          ) : (
            <div className="voice-stage">
              <div className="voice-avatar">
                {remoteName
                  .split(" ")
                  .map((word) => word[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase()}
              </div>

              <h2>{remoteName}</h2>

              <span>
                {connecting
                  ? "Calling..."
                  : connected
                  ? "Connected"
                  : "Waiting for connection"}
              </span>
            </div>
          )}

          {mode === "video" && (
            <div className="local-video-container">
              {cameraOff ? (
                <div className="camera-off">
                  <span>◉</span>
                </div>
              ) : (
                <video
                  ref={localVideoRef}
                  className="local-video"
                  autoPlay
                  muted
                  playsInline
                />
              )}
            </div>
          )}

          {error && (
            <div className="call-error">
              <strong>Unable to start call</strong>
              <span>{error}</span>
              <small>
                Make sure HEXA has permission to use your microphone
                and camera.
              </small>
            </div>
          )}

          {!error && connecting && (
            <div className="connecting-indicator">
              <span className="connecting-ring" />
              <span>Connecting securely...</span>
            </div>
          )}
        </div>

        <footer className="call-controls">
          <button
            className={muted ? "control active" : "control"}
            onClick={toggleMute}
          >
            <span>{muted ? "🔇" : "🎙"}</span>
            <small>{muted ? "Unmute" : "Mute"}</small>
          </button>

          {mode === "video" && (
            <button
              className={cameraOff ? "control active" : "control"}
              onClick={toggleCamera}
            >
              <span>{cameraOff ? "🚫" : "▣"}</span>
              <small>{cameraOff ? "Camera on" : "Camera"}</small>
            </button>
          )}

          <button
            className={speaker ? "control" : "control active"}
            onClick={() => setSpeaker((prev) => !prev)}
          >
            <span>{speaker ? "🔊" : "🔈"}</span>
            <small>Speaker</small>
          </button>

          <button
            className="end-call"
            onClick={() => endCall(true)}
          >
            <span>☎</span>
            <small>End</small>
          </button>
        </footer>
      </div>
    </div>
  );
}