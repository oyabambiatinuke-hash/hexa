import { getIceServers } from "./callconfig";

export class CallManager {
  constructor({
    supabase,
    conversationId,
    userId,
    remoteUserId,
    onRemoteStream,
    onLocalStream,
    onStateChange,
    onError,
  }) {
    this.supabase = supabase;
    this.conversationId = conversationId;
    this.userId = userId;
    this.remoteUserId = remoteUserId;

    this.onRemoteStream = onRemoteStream;
    this.onLocalStream = onLocalStream;
    this.onStateChange = onStateChange;
    this.onError = onError;

    this.peer = null;
    this.channel = null;
    this.localStream = null;
    this.remoteStream = null;
    this.closed = false;
  }

  setState(state) {
    this.onStateChange?.(state);
  }

  async initialize() {
    if (this.closed) return;

    this.peer = new RTCPeerConnection({
      iceServers: getIceServers(),
    });

    this.remoteStream = new MediaStream();

    this.peer.onicecandidate = async (event) => {
      if (!event.candidate || this.closed) return;

      await this.sendSignal({
        type: "ice-candidate",
        candidate: event.candidate,
      });
    };

    this.peer.ontrack = (event) => {
      event.streams[0]?.getTracks().forEach((track) => {
        this.remoteStream.addTrack(track);
      });

      this.onRemoteStream?.(this.remoteStream);
    };

    this.peer.onconnectionstatechange = () => {
      const state = this.peer.connectionState;

      if (state === "connected") {
        this.setState("connected");
      }

      if (state === "connecting") {
        this.setState("connecting");
      }

      if (
        state === "failed" ||
        state === "disconnected"
      ) {
        this.setState("disconnected");
      }

      if (state === "closed") {
        this.setState("ended");
      }
    };

    this.channel = this.supabase.channel(
      `hexa-call:${this.conversationId}:${this.userId}`
    );

    this.channel.on(
      "broadcast",
      { event: "signal" },
      async ({ payload }) => {
        if (payload?.from === this.userId) return;
        if (payload?.to && payload.to !== this.userId) return;

        try {
          await this.handleSignal(payload);
        } catch (error) {
          this.onError?.(error);
        }
      }
    );

    await this.channel.subscribe();

    this.setState("ready");
  }

  async getMedia({ video = true } = {}) {
    this.localStream =
      await navigator.mediaDevices.getUserMedia({
        audio: true,
        video,
      });

    this.localStream.getTracks().forEach((track) => {
      this.peer.addTrack(track, this.localStream);
    });

    this.onLocalStream?.(this.localStream);

    return this.localStream;
  }

  async startCall({ video = true } = {}) {
    await this.initialize();
    await this.getMedia({ video });

    this.setState("calling");

    const offer = await this.peer.createOffer();

    await this.peer.setLocalDescription(offer);

    await this.sendSignal({
      type: "offer",
      offer,
    });
  }

  async acceptCall({ video = true } = {}) {
    await this.getMedia({ video });
  }

  async handleSignal(signal) {
    if (!this.peer) {
      await this.initialize();
    }

    if (signal.type === "offer") {
      await this.peer.setRemoteDescription(
        new RTCSessionDescription(signal.offer)
      );

      this.setState("incoming");

      const answer = await this.peer.createAnswer();

      await this.peer.setLocalDescription(answer);

      await this.sendSignal({
        type: "answer",
        answer,
      });

      this.setState("connecting");
      return;
    }

    if (signal.type === "answer") {
      await this.peer.setRemoteDescription(
        new RTCSessionDescription(signal.answer)
      );

      this.setState("connecting");
      return;
    }

    if (signal.type === "ice-candidate") {
      if (!signal.candidate) return;

      try {
        await this.peer.addIceCandidate(
          new RTCIceCandidate(signal.candidate)
        );
      } catch (error) {
        console.warn(
          "Unable to add ICE candidate:",
          error
        );
      }

      return;
    }

    if (signal.type === "hangup") {
      this.end();
    }
  }

  async sendSignal(payload) {
    if (!this.channel || this.closed) return;

    await this.channel.send({
      type: "broadcast",
      event: "signal",
      payload: {
        ...payload,
        from: this.userId,
        to: this.remoteUserId,
      },
    });
  }

  toggleMicrophone() {
    if (!this.localStream) return null;

    const track =
      this.localStream.getAudioTracks()[0];

    if (!track) return null;

    track.enabled = !track.enabled;

    return track.enabled;
  }

  toggleCamera() {
    if (!this.localStream) return null;

    const track =
      this.localStream.getVideoTracks()[0];

    if (!track) return null;

    track.enabled = !track.enabled;

    return track.enabled;
  }

  async switchCamera() {
    if (!this.localStream) return;

    const currentVideo =
      this.localStream.getVideoTracks()[0];

    if (!currentVideo) return;

    const devices =
      await navigator.mediaDevices.enumerateDevices();

    const cameras = devices.filter(
      (device) => device.kind === "videoinput"
    );

    if (cameras.length < 2) return;

    const currentId = currentVideo.getSettings().deviceId;

    const nextCamera =
      cameras.find(
        (camera) => camera.deviceId !== currentId
      ) || cameras[0];

    const nextStream =
      await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          deviceId: {
            exact: nextCamera.deviceId,
          },
        },
      });

    const nextTrack =
      nextStream.getVideoTracks()[0];

    const sender =
      this.peer
        .getSenders()
        .find(
          (item) =>
            item.track?.kind === "video"
        );

    if (sender) {
      await sender.replaceTrack(nextTrack);
    }

    currentVideo.stop();

    this.localStream.removeTrack(currentVideo);
    this.localStream.addTrack(nextTrack);

    this.onLocalStream?.(this.localStream);
  }

  async end() {
    if (this.closed) return;

    this.closed = true;

    try {
      await this.sendSignal({
        type: "hangup",
      });
    } catch {}

    this.localStream?.getTracks().forEach(
      (track) => track.stop()
    );

    this.peer?.getSenders().forEach((sender) => {
      try {
        sender.track?.stop();
      } catch {}
    });

    try {
      await this.channel?.unsubscribe();
    } catch {}

    try {
      this.peer?.close();
    } catch {}

    this.setState("ended");
  }
}