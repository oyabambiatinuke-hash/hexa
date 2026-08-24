import { useEffect, useRef, useState } from "react";

export default function Terminal() {
  const [lines, setLines] = useState([
    {
      type: "system",
      text: "HEXA Terminal v1.0",
    },
    {
      type: "system",
      text: "Advanced workspace terminal initialized.",
    },
    {
      type: "system",
      text: 'Type "help" to see available commands.',
    },
  ]);

  const [command, setCommand] = useState("");
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const inputRef = useRef(null);
  const terminalRef = useRef(null);

  useEffect(() => {
    terminalRef.current?.scrollTo({
      top: terminalRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [lines]);

  const runCommand = (cmd) => {
    const value = cmd.trim();

    if (!value) return;

    setLines((prev) => [
      ...prev,
      {
        type: "command",
        text: `hexa@workspace:~$ ${value}`,
      },
    ]);

    setHistory((prev) => [value, ...prev]);
    setHistoryIndex(-1);

    const lower = value.toLowerCase();

    let output = [];

    if (lower === "help") {
      output = [
        "HEXA Terminal Commands",
        "",
        "help       Show available commands",
        "clear      Clear terminal",
        "status     Workspace status",
        "files      List project files",
        "pwd        Show workspace path",
        "whoami     Show current user",
        "date       Show system date",
        "version    HEXA version",
        "build      Build project",
        "run        Run project",
        "stop       Stop running process",
        "npm        Execute npm command",
      ];
    } else if (lower === "clear") {
      setLines([]);
      return;
    } else if (lower === "status") {
      output = [
        "Workspace: ONLINE",
        "CodeSpace: ACTIVE",
        "Terminal: CONNECTED",
        "Editor: READY",
        "Project server: READY",
      ];
    } else if (lower === "files") {
      output = [
        "src/",
        "  components/",
        "  App.jsx",
        "  App.css",
        "public/",
        "package.json",
        "vite.config.js",
      ];
    } else if (lower === "pwd") {
      output = ["C:/Users/USER/Desktop/HEXA"];
    } else if (lower === "whoami") {
      output = ["hexa-user"];
    } else if (lower === "version") {
      output = ["HEXA Workspace 1.0.0"];
    } else if (lower === "build") {
      output = [
        "Preparing production build...",
        "Checking dependencies...",
        "Compiling source...",
        "Build completed successfully.",
      ];
    } else if (lower === "run") {
      output = [
        "Starting HEXA development server...",
        "Server running.",
        "Workspace is ready.",
      ];
    } else if (lower === "stop") {
      output = ["Stopping active workspace process...", "Process stopped."];
    } else if (lower === "date") {
      output = [new Date().toString()];
    } else if (lower.startsWith("npm ")) {
      output = [
        `> ${value}`,
        "",
        "HEXA package manager interface",
        "Command accepted by workspace terminal.",
      ];
    } else {
      output = [
        `Command not found: ${value}`,
        'Type "help" for available HEXA commands.',
      ];
    }

    setLines((prev) => [
      ...prev,
      ...output.map((text) => ({
        type: "output",
        text,
      })),
    ]);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      runCommand(command);
      setCommand("");
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();

      if (!history.length) return;

      const nextIndex = Math.min(
        historyIndex + 1,
        history.length - 1
      );

      setHistoryIndex(nextIndex);
      setCommand(history[nextIndex]);
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();

      if (historyIndex <= 0) {
        setHistoryIndex(-1);
        setCommand("");
        return;
      }

      const nextIndex = historyIndex - 1;

      setHistoryIndex(nextIndex);
      setCommand(history[nextIndex]);
    }

    if (e.key === "l" && e.ctrlKey) {
      e.preventDefault();
      setLines([]);
    }
  };

  return (
    <div
      className="hexa-terminal"
      onClick={() => inputRef.current?.focus()}
    >
      <div className="terminal-header">
        <div className="terminal-title">
          <span className="terminal-dot red" />
          <span className="terminal-dot yellow" />
          <span className="terminal-dot green" />
          <span className="terminal-name">
            HEXA Terminal
          </span>
        </div>

        <div className="terminal-status">
          <span className="status-indicator" />
          Connected
        </div>
      </div>

      <div
        className="terminal-body"
        ref={terminalRef}
      >
        {lines.map((line, index) => (
          <div
            key={index}
            className={`terminal-line ${line.type}`}
          >
            {line.text || "\u00A0"}
          </div>
        ))}

        <div className="terminal-input-row">
          <span className="terminal-prompt">
            hexa@workspace:~$
          </span>

          <input
            ref={inputRef}
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyDown={handleKeyDown}
            autoComplete="off"
            spellCheck="false"
            autoFocus
          />
        </div>
      </div>

      <div className="terminal-footer">
        <span>HEXASHELL</span>
        <span>UTF-8</span>
        <span>CONNECTED</span>
        <span>Ctrl+L Clear</span>
      </div>
    </div>
  );
}