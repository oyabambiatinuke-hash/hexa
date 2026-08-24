import { useState } from "react";

export default function Chat() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);

  const sendMessage = () => {
    const text = message.trim();
    if (!text) return;

    setMessages((prev) => [
      ...prev,
      {
        id: Date.now(),
        text,
        from: "You",
      },
    ]);

    setMessage("");
  };

  return (
    <div className="chat-page">
      <div className="chat-header">
        <div>
          <h2>Chat</h2>
          <p>Messages and conversations</p>
        </div>
      </div>

      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="chat-empty">
            <h3>No messages yet</h3>
            <p>Start a conversation.</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div className="chat-message" key={msg.id}>
              <strong>{msg.from}</strong>
              <p>{msg.text}</p>
            </div>
          ))
        )}
      </div>

      <div className="chat-input-area">
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") sendMessage();
          }}
          placeholder="Type a message..."
        />

        <button onClick={sendMessage}>
          Send
        </button>
      </div>
    </div>
  );
}