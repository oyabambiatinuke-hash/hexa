import React, { useEffect, useRef, useState } from "react";
import { CallManager } from "./callmanager";

export default function CallWindow({
  supabase,
  conversationId,
  currentUserId,
  remoteUserId,
  remoteName = "HEXA User",
  remoteAvatar = "",
  mode = "video",
  incoming = false,
  onClose,
}) {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const callRef = useRef(null);

  const [status, setStatus] = useState(
    incoming ? "incoming" : "starting"
  );

  const [muted, setMuted] = useState(false);
  const [camera, setCamera] = useState(
    mode === "video"
  );

  useEffect(() => {
    let active = true;

    const start = async () => {
      const manager = new CallManager({
        supabase,
        conversationId,
        userId: currentUserId,
        remoteUserId,

        onLocalStream: (stream) => {
          if (
            active &&
            localVideoRef.current
          ) {
            localVideoRef.current.srcObject =
              stream;
          }
        },

        onRemoteStream: (stream) => {
          if (
            active &&
            remoteVideoRef.current
          ) {
            remoteVideoRef.current.srcObject =
              stream;
          }
        },

        onStateChange: (nextState) => {
          if (active) setStatus(nextState);
        },

        onError: (error) => {
          console.error(
            "HEXA call error:",
            error
          );
        },
      });

      callRef.current = manager;

      if (incoming) {
        await manager.initialize();
      } else {
        await manager.startCall({
          video: mode === "video",
        });
      }
    };

    start().catch((error) => {
      console.error(error);
      setStatus("permission-error");
    });

    return () => {
      active = false;
      callRef.current?.end();
    };
  }, [
    supabase,
    conversationId,
    currentUserId,
    remoteUserId,
    mode,
    incoming,
  ]);

  const toggleMic = () => {
    const enabled =
      callRef.current?.toggleMicrophone();

    if (typeof enabled === "boolean") {
      setMuted(!enabled);
    }
  };

  const toggleCamera = () => {
    const enabled =
      callRef.current?.toggleCamera();

    if (typeof enabled === "boolean") {
      setCamera(enabled);
    }
  };

  const switchCamera = () => {
    callRef.current?.switchCamera();
  };

  const hangUp = async () => {
    await callRef.current?.end();
    onClose?.();
  };

  const accept = async () => {
    await callRef.current?.acceptCall({
      video: mode === "video",
    });

    setStatus("connecting");
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.call}>
        <div style={styles.top}>
          <div>
            <strong>{remoteName}</strong>
            <div style={styles.status}>
              {status}
            </div>
          </div>

          <button
            style={styles.close}
            onClick={hangUp}
          >
            ×
          </button>
        </div>

        <div style={styles.stage}>
          {mode === "video" ? (
            <>
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                style={styles.remote}
              />

              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                style={styles.local}
              />
            </>
          ) : (
            <div style={styles.voice}>
              <div style={styles.avatar}>
                {remoteAvatar ? (
                  <img
                    src={remoteAvatar}
                    alt=""
                    style={styles.avatarImage}
                  />
                ) : (
                  remoteName
                    .charAt(0)
                    .toUpperCase()
                )}
              </div>

              <h2>{remoteName}</h2>
              <span>{status}</span>

              <audio
                ref={remoteVideoRef}
                autoPlay
              />
            </div>
          )}
        </div>

        {incoming && status === "incoming" && (
          <div style={styles.incoming}>
            <button
              style={styles.accept}
              onClick={accept}
            >
              Accept
            </button>

            <button
              style={styles.reject}
              onClick={hangUp}
            >
              Decline
            </button>
          </div>
        )}

        {(!incoming ||
          status !== "incoming") && (
          <div style={styles.controls}>
            <button
              style={styles.control}
              onClick={toggleMic}
            >
              {muted ? "🔇" : "🎙️"}
            </button>

            {mode === "video" && (
              <>
                <button
                  style={styles.control}
                  onClick={toggleCamera}
                >
                  {camera ? "📹" : "🚫"}
                </button>

                <button
                  style={styles.control}
                  onClick={switchCamera}
                >
                  🔄
                </button>
              </>
            )}

            <button
              style={styles.hangup}
              onClick={hangUp}
            >
              ☎
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: "fixed",
    inset: 0,
    zIndex: 99999,
    background:
      "rgba(0,0,0,.82)",
    display: "grid",
    placeItems: "center",
    padding: 20,
  },

  call: {
    width: "min(1100px, 96vw)",
    height: "min(760px, 92vh)",
    background: "#0b0d12",
    borderRadius: 28,
    overflow: "hidden",
    color: "#fff",
    display: "flex",
    flexDirection: "column",
    boxShadow:
      "0 30px 100px rgba(0,0,0,.6)",
  },

  top: {
    height: 76,
    padding: "0 24px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottom:
      "1px solid rgba(255,255,255,.08)",
  },

  status: {
    opacity: 0.55,
    fontSize: 13,
    marginTop: 3,
  },

  close: {
    border: 0,
    background:
      "rgba(255,255,255,.08)",
    color: "#fff",
    width: 40,
    height: 40,
    borderRadius: 12,
    fontSize: 25,
    cursor: "pointer",
  },

  stage: {
    flex: 1,
    position: "relative",
    overflow: "hidden",
    background: "#050608",
  },

  remote: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },

  local: {
    position: "absolute",
    right: 20,
    bottom: 20,
    width: 190,
    height: 135,
    objectFit: "cover",
    borderRadius: 18,
    border:
      "2px solid rgba(255,255,255,.2)",
    background: "#111",
  },

  voice: {
    height: "100%",
    display: "grid",
    placeItems: "center",
    alignContent: "center",
    gap: 10,
  },

  avatar: {
    width: 130,
    height: 130,
    borderRadius: "50%",
    display: "grid",
    placeItems: "center",
    background:
      "linear-gradient(135deg,#7c3aed,#2563eb)",
    fontSize: 44,
    fontWeight: 800,
  },

  avatarImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    borderRadius: "50%",
  },

  controls: {
    minHeight: 100,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
  },

  control: {
    width: 54,
    height: 54,
    border: 0,
    borderRadius: "50%",
    background:
      "rgba(255,255,255,.1)",
    color: "#fff",
    fontSize: 20,
    cursor: "pointer",
  },

  hangup: {
    width: 62,
    height: 62,
    border: 0,
    borderRadius: "50%",
    background: "#ef4444",
    color: "#fff",
    fontSize: 22,
    cursor: "pointer",
  },

  incoming: {
    minHeight: 110,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
  },

  accept: {
    padding: "14px 28px",
    border: 0,
    borderRadius: 14,
    background: "#22c55e",
    color: "#fff",
    fontWeight: 700,
    cursor: "pointer",
  },

  reject: {
    padding: "14px 28px",
    border: 0,
    borderRadius: 14,
    background: "#ef4444",
    color: "#fff",
    fontWeight: 700,
    cursor: "pointer",
  },
};