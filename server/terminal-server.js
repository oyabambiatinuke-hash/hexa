import "dotenv/config";
import express from "express";
import cors from "cors";
import http from "http";
import { WebSocketServer } from "ws";
import { spawn } from "child_process";
import os from "os";

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

const PORT = 8787;

app.get("/api/terminal", (req, res) => {
  res.json({
    ok: true,
    platform: process.platform,
    shell: getShell(),
  });
});

function getShell() {
  if (process.platform === "win32") {
    return process.env.ComSpec || "powershell.exe";
  }

  return process.env.SHELL || "/bin/bash";
}

const wss = new WebSocketServer({
  server,
  path: "/terminal",
});

wss.on("connection", (socket) => {
  console.log("HEXA terminal connected");

  const shell = getShell();

  const shellArgs =
    process.platform === "win32"
      ? ["-NoLogo", "-NoExit"]
      : [];

  const terminal = spawn(shell, shellArgs, {
    cwd: process.env.HEXA_WORKSPACE || process.cwd(),
    env: {
      ...process.env,
      TERM: "xterm-256color",
    },
    windowsHide: true,
  });

  socket.send(
    JSON.stringify({
      type: "connected",
      shell,
      cwd: process.cwd(),
      platform: os.platform(),
    })
  );

  terminal.stdout.on("data", (data) => {
    if (socket.readyState === socket.OPEN) {
      socket.send(
        JSON.stringify({
          type: "output",
          data: data.toString(),
        })
      );
    }
  });

  terminal.stderr.on("data", (data) => {
    if (socket.readyState === socket.OPEN) {
      socket.send(
        JSON.stringify({
          type: "error",
          data: data.toString(),
        })
      );
    }
  });

  terminal.on("exit", (code) => {
    if (socket.readyState === socket.OPEN) {
      socket.send(
        JSON.stringify({
          type: "exit",
          code,
        })
      );

      socket.close();
    }
  });

  socket.on("message", (raw) => {
    try {
      const message = JSON.parse(raw.toString());

      if (message.type === "input") {
        terminal.stdin.write(message.data);
      }

      if (message.type === "resize") {
        // Reserved for PTY resize support.
        // The terminal still works without this.
      }
    } catch {
      terminal.stdin.write(raw.toString());
    }
  });

  socket.on("close", () => {
    console.log("HEXA terminal disconnected");

    try {
      terminal.kill();
    } catch {
      // Already closed.
    }
  });
});

server.listen(PORT, () => {
  console.log("");
  console.log("======================================");
  console.log("        HEXA TERMINAL SERVER");
  console.log("======================================");
  console.log(`HTTP:      http://localhost:${PORT}`);
  console.log(`WebSocket: ws://localhost:${PORT}/terminal`);
  console.log(`Shell:     ${getShell()}`);
  console.log(`Workspace: ${process.cwd()}`);
  console.log("======================================");
  console.log("");
});