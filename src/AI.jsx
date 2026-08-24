import { useState } from "react";

function AI() {
  const [messages, setMessages] = useState([
    {
      role: "ai",
      text: "Hello! I'm HEXA AI. What would you like to work on?",
    },
  ]);

  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);

  const sendMessage = async () => {
    const question = input.trim();

    if (!question || thinking) return;

    const userMessage = {
      role: "user",
      text: question,
    };

    setMessages((current) => [...current, userMessage]);
    setInput("");
    setThinking(true);

    try {
      const response = await fetch("http://localhost:3001/api/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: question,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "AI request failed");
      }

      setMessages((current) => [
        ...current,
        {
          role: "ai",
          text: data.reply || "I couldn't generate a response.",
        },
      ]);
    } catch (error) {
      console.error(error);

      setMessages((current) => [
        ...current,
        {
          role: "ai",
          text:
            "Sorry, HEXA AI couldn't connect right now. Make sure your HEXA AI server is running.",
        },
      ]);
    } finally {
      setThinking(false);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([
      {
        role: "ai",
        text: "Chat cleared. What would you like to work on?",
      },
    ]);
  };

  const suggestion = (text) => {
    setInput(text);
  };

  return (
    <div className="ai-page">

      <div className="ai-header">

        <div>
          <p className="ai-label">HEXA AI</p>

          <h1>Your intelligent workspace.</h1>

          <p className="ai-description">
            Ask questions, write, learn, create and
            explore with HEXA.
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
            suggestion("Explain artificial intelligence simply")
          }
        >
          🧠 Explain
        </button>

        <button
          onClick={() =>
            suggestion("Help me study this topic")
          }
        >
          📚 Study
        </button>

        <button
          onClick={() =>
            suggestion("Give me a creative idea")
          }
        >
          💡 Ideas
        </button>

        <button
          onClick={() =>
            suggestion("Help me write a professional document")
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
          rows="1"
          disabled={thinking}
        />

        <button
          className="ai-send"
          onClick={sendMessage}
          disabled={thinking || !input.trim()}
        >
          {thinking ? "..." : "↑"}
        </button>

      </div>

      <p className="ai-disclaimer">
        ✨ Powered by HEXA AI
      </p>

    </div>
  );
}

export default AI;