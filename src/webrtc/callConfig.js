const STUN_URL =
  import.meta.env.VITE_STUN_URL ||
  "stun:stun.l.google.com:19302";

const TURN_URL = import.meta.env.VITE_TURN_URL || "";
const TURN_USERNAME = import.meta.env.VITE_TURN_USERNAME || "";
const TURN_CREDENTIAL = import.meta.env.VITE_TURN_CREDENTIAL || "";

export function getIceServers() {
  const servers = [
    {
      urls: STUN_URL,
    },
  ];

  if (TURN_URL && TURN_USERNAME && TURN_CREDENTIAL) {
    servers.push({
      urls: TURN_URL,
      username: TURN_USERNAME,
      credential: TURN_CREDENTIAL,
    });
  }

  return servers;
}