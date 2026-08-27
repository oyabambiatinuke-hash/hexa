import { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

const AI_SERVER =
  import.meta.env.VITE_AI_SERVER_URL ||
  "http://localhost:3001";

function AI() {
  const [messages, setMessages] = useState([
    {
      role: "ai",
      text: "Hello! I'm HEXA AI. What would you like to work on?",
    },
  ]);

  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);

  async function sendMessage() {
    const question = input.trim();

    if (!question || thinking) return;

    const userMessage = {
      role: "user",
      text: question,
    };

    setMessages((current) => [
      ...current,
      userMessage,
    ]);

    setInput("");
    setThinking(true);

    try {
      const response = await fetch(
        `${AI_SERVER}/api/ai`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: question,
          }),
        }
      );

      let data;

      try {
        data = await response.json();
      } catch {
        throw new Error(
          `HEXA AI server returned invalid JSON (${response.status}).`
        );
      }

      if (!response.ok) {
        throw new Error(
          data?.error ||
            `HEXA AI request failed (${response.status}).`
        );
      }

      const reply =
        data?.reply ||
        data?.text ||
        "HEXA AI returned an empty response.";

      setMessages((current) => [
        ...current,
        {
          role: "ai",
          text: reply,
        },
      ]);
    } catch (error) {
      console.error("HEXA AI:", error);

      let message =
        "HEXA AI couldn't connect to the AI server.";

      if (
        error?.message?.includes("rate-limit")
      ) {
        message =
          "OpenAI is temporarily busy. Please wait a moment and try again.";
      } else if (
        error?.message?.includes("401")
      ) {
        message =
          "HEXA AI authentication failed. Check your OpenAI API key.";
      } else if (
        error?.message?.includes("Failed to fetch")
      ) {
        message =
          "HEXA AI server is offline. Start the HEXA AI server on port 3001.";
      } else if (error?.message) {
        message = error.message;
      }

      setMessages((current) => [
        ...current,
        {
          role: "ai",
          text: message,
        },
      ]);
    } finally {
      setThinking(false);
    }
  }

  function handleKeyDown(event) {
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();
      sendMessage();
    }
  }

  function clearChat() {
    setMessages([
      {
        role: "ai",
        text:
          "Chat cleared. What would you like to work on?",
      },
    ]);
  }

  function suggestion(text) {
    setInput(text);
  }

  return (
    <div className="ai-page">

      <div className="ai-header">

        <div>
          <p className="ai-label">
            HEXA AI
          </p>

          <h1>
            Your intelligent workspace.
          </h1>

          <p className="ai-description">
            Ask questions, write, learn, create
            and explore with HEXA AI.
          </p>
        </div>

        <button
          className="ai-clear"
          onClick={clearChat}
        >
          Clear chat
        </button>

      </div>

      <div className="ai-chat">

        {messages.map((message, index) => (

          <div
            key={index}
            className={`ai-message ${
              message.role === "user"
                ? "user-message"
                : "hexa-message"
            }`}
          >

            {message.role === "ai" && (
              <div className="ai-avatar">
                H
              </div>
            )}

            <div className="message-bubble">
              {message.text}
            </div>

          </div>

        ))}

        {thinking && (

          <div className="ai-message hexa-message">

            <div className="ai-avatar">
              H
            </div>

            <div className="message-bubble">
              <span className="thinking-dots">
                HEXA is thinking...
              </span>
            </div>

          </div>

        )}

      </div>

      <div className="ai-suggestions">

        <button
          onClick={() =>
            suggestion(
              "Explain artificial intelligence simply"
            )
          }
        >
          🧠 Explain
        </button>

        <button
          onClick={() =>
            suggestion(
              "Help me study this topic"
            )
          }
        >
          📚 Study
        </button>

        <button
          onClick={() =>
            suggestion(
              "Give me a creative idea"
            )
          }
        >
          💡 Ideas
        </button>

        <button
          onClick={() =>
            suggestion(
              "Help me write a professional document"
            )
          }
        >
          ✍️ Write
        </button>

      </div>

      <div className="ai-input-area">

        <textarea
          value={input}
          onChange={(event) =>
            setInput(event.target.value)
          }
          onKeyDown={handleKeyDown}
          placeholder="Ask HEXA anything..."
          rows={1}
          disabled={thinking}
        />

        <button
          className="ai-send"
          onClick={sendMessage}
          disabled={
            thinking ||
            !input.trim()
          }
        >
          {thinking ? "..." : "↑"}
        </button>

      </div>

      <p className="ai-disclaimer">
        ✨ Powered by OpenAI · HEXA AI
      </p>

    </div>
  );
}

export default AI;