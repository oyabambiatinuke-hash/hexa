import React, { useMemo, useState } from "react";
import "./chat.css";

const INITIAL_CHATS = [
  {
    id: "nexa",
    name: "NEXA",
    type: "ai",
    avatar: "N",
    status: "HEXA AI",
    messages: [
      {
        id: 1,
        sender: "nexa",
        text: "Hey Atinuke 👋 I'm NEXA, your HEXA AI assistant. How can I help you?",
        time: "Now",
      },
    ],
  },
  {
    id: "john",
    name: "John",
    type: "person",
    avatar: "J",
    status: "Online",
    messages: [
      {
        id: 2,
        sender: "john",
        text: "Hey, are you available?",
        time: "10:42 PM",
      },
    ],
  },
  {
    id: "sarah",
    name: "Sarah",
    type: "person",
    avatar: "S",
    status: "Offline",
    messages: [
      {
        id: 3,
        sender: "sarah",
        text: "I'll send the files tomorrow.",
        time: "9:18 PM",
      },
    ],
  },
];

function Chat() {
  const [chats, setChats] = useState(INITIAL_CHATS);
  const [activeId, setActiveId] = useState("nexa");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [loadingAI, setLoadingAI] = useState(false);
  const [typing, setTyping] = useState(false);

  const activeChat = useMemo(
    () => chats.find((chat) => chat.id === activeId),
    [chats, activeId]
  );

  const filteredChats = chats.filter((chat) =>
    chat.name.toLowerCase().includes(search.toLowerCase())
  );

  const updateMessages = (chatId, newMessages) => {
    setChats((current) =>
      current.map((chat) =>
        chat.id === chatId
          ? {
              ...chat,
              messages: [...chat.messages, ...newMessages],
            }
          : chat
      )
    );
  };

  const sendMessage = async (event) => {
    event?.preventDefault();

    const text = message.trim();

    if (!text || !activeChat || loadingAI) return;

    const userMessage = {
      id: Date.now(),
      sender: "me",
      text,
      time: "Now",
    };

    setMessage("");
    updateMessages(activeChat.id, [userMessage]);

    // NEXA AI conversation
    if (activeChat.type === "ai") {
      setLoadingAI(true);
      setTyping(true);

      try {
        const response = await fetch("/api/ai", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: text,
            conversation: activeChat.messages
              .filter((item) => item.sender === "me" || item.sender === "nexa")
              .map((item) => ({
                role: item.sender === "me" ? "user" : "assistant",
                content: item.text,
              })),
          }),
        });

        if (!response.ok) {
          throw new Error(`AI request failed: ${response.status}`);
        }

        const data = await response.json();

        const aiText =
          data.reply ||
          data.message ||
          data.content ||
          "I'm having trouble responding right now.";

        updateMessages(activeChat.id, [
          {
            id: Date.now() + 1,
            sender: "nexa",
            text: aiText,
            time: "Now",
          },
        ]);
      } catch (error) {
        console.error("NEXA error:", error);

        updateMessages(activeChat.id, [
          {
            id: Date.now() + 1,
            sender: "nexa",
            text:
              "I couldn't connect to the HEXA AI service. Make sure your AI server and OpenAI API configuration are running.",
            time: "Now",
            error: true,
          },
        ]);
      } finally {
        setTyping(false);
        setLoadingAI(false);
      }

      return;
    }

    // Temporary local response for normal users.
    setTimeout(() => {
      updateMessages(activeChat.id, [
        {
          id: Date.now() + 2,
          sender: activeChat.id,
          text: "Message sent.",
          time: "Now",
        },
      ]);
    }, 500);
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage(event);
    }
  };

  return (
    <section className="hexa-chat">
      <aside className="chat-sidebar">
        <div className="chat-sidebar-top">
          <div>
            <div className="chat-title">Chat</div>
            <div className="chat-subtitle">
              Messages & conversations
            </div>
          </div>

          <button
            className="new-chat-button"
            onClick={() => setSearch("")}
            title="New chat"
          >
            +
          </button>
        </div>

        <div className="chat-search">
          <span>⌕</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search chats..."
          />
        </div>

        <div className="chat-list">
          {filteredChats.map((chat) => (
            <button
              key={chat.id}
              className={`chat-list-item ${
                activeId === chat.id ? "active" : ""
              }`}
              onClick={() => setActiveId(chat.id)}
            >
              <div
                className={`chat-avatar ${
                  chat.type === "ai" ? "ai-avatar" : ""
                }`}
              >
                {chat.avatar}
              </div>

              <div className="chat-list-content">
                <div className="chat-list-row">
                  <strong>{chat.name}</strong>

                  {chat.type === "ai" && (
                    <span className="ai-badge">AI</span>
                  )}
                </div>

                <span>{chat.status}</span>
              </div>
            </button>
          ))}
        </div>
      </aside>

      <main className="chat-window">
        {activeChat ? (
          <>
            <header className="chat-header">
              <div className="chat-header-user">
                <div
                  className={`chat-avatar ${
                    activeChat.type === "ai" ? "ai-avatar" : ""
                  }`}
                >
                  {activeChat.avatar}
                </div>

                <div>
                  <div className="chat-header-name">
                    {activeChat.name}

                    {activeChat.type === "ai" && (
                      <span className="nexa-tag">NEXA</span>
                    )}
                  </div>

                  <div className="chat-header-status">
                    {activeChat.type === "ai"
                      ? "HEXA AI Assistant"
                      : activeChat.status}
                  </div>
                </div>
              </div>

              <div className="chat-header-actions">
                <button title="Search">⌕</button>
                <button title="Call">◉</button>
                <button title="More">•••</button>
              </div>
            </header>

            {activeChat.type === "ai" && (
              <div className="nexa-banner">
                <div className="nexa-banner-icon">N</div>

                <div>
                  <strong>You're chatting with NEXA</strong>
                  <p>
                    Your intelligent HEXA assistant for ideas, documents,
                    projects and everyday work.
                  </p>
                </div>
              </div>
            )}

            <div className="messages">
              {activeChat.messages.map((item) => {
                const mine = item.sender === "me";
                const isNexa = item.sender === "nexa";

                return (
                  <div
                    key={item.id}
                    className={`message-row ${
                      mine ? "mine" : "theirs"
                    }`}
                  >
                    {!mine && (
                      <div
                        className={`message-mini-avatar ${
                          isNexa ? "ai-avatar" : ""
                        }`}
                      >
                        {isNexa ? "N" : activeChat.avatar}
                      </div>
                    )}

                    <div className="message-group">
                      {!mine && (
                        <div className="message-author">
                          {isNexa ? "NEXA" : activeChat.name}
                        </div>
                      )}

                      <div
                        className={`message-bubble ${
                          isNexa ? "nexa-message" : ""
                        } ${item.error ? "message-error" : ""}`}
                      >
                        {item.text}
                      </div>

                      <div className="message-time">{item.time}</div>
                    </div>
                  </div>
                );
              })}

              {typing && (
                <div className="message-row theirs">
                  <div className="message-mini-avatar ai-avatar">N</div>

                  <div className="message-group">
                    <div className="message-author">NEXA</div>

                    <div className="message-bubble nexa-message typing">
                      <span />
                      <span />
                      <span />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <form className="chat-composer" onSubmit={sendMessage}>
              <button
                type="button"
                className="composer-icon"
                title="Attach file"
              >
                +
              </button>

              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  activeChat.type === "ai"
                    ? "Message NEXA..."
                    : `Message ${activeChat.name}...`
                }
                rows={1}
                disabled={loadingAI}
              />

              <button
                type="button"
                className="composer-icon"
                title="Voice message"
              >
                ◉
              </button>

              <button
                type="submit"
                className="send-button"
                disabled={!message.trim() || loadingAI}
              >
                {loadingAI ? "..." : "➤"}
              </button>
            </form>
          </>
        ) : (
          <div className="empty-chat">
            <div className="empty-chat-icon">H</div>
            <h2>HEXA Chat</h2>
            <p>Select a conversation to begin.</p>
          </div>
        )}
      </main>
    </section>
  );
}

export default Chat;