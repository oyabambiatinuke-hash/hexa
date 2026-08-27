import React, { useMemo, useState } from "react";

const EMOJIS = [
  "😀","😃","😄","😁","😆","😅","😂","🤣","😊","😇",
  "🙂","🙃","😉","😌","😍","🥰","😘","😗","😙","😚",
  "😋","😛","😝","😜","🤪","🤨","🧐","🤓","😎","🤩",
  "🥳","😏","😒","😞","😔","😟","😕","🙁","☹️","😣",
  "😖","😫","😩","🥺","😢","😭","😤","😠","😡","🤬",
  "🤯","😳","🥵","🥶","😱","😨","😰","😥","😓","🤗",
  "🤔","🫣","🤭","🫢","🫡","🤫","🫠","🤥","😶","🫥",
  "😐","🫤","😑","😬","🙄","😯","😦","😧","😮","😲",
  "🥱","😴","🤤","😪","😵","🤐","🥴","🤢","🤮","🤧",
  "😷","🤒","🤕","❤️","🧡","💛","💚","💙","💜","🖤",
  "🤍","🤎","💔","❤️‍🔥","❤️‍🩹","💕","💞","💓","💗","💖",
  "💘","💝","💟","❣️","💯","🔥","✨","⭐","🌟","💫",
  "🎉","🎊","👏","🙌","👍","👎","👋","🤝","🙏","💪",
  "🫶","👀","🧠","💡","🚀","🎯","🏆","🥇","🎮","🎵",
  "🎬","📸","📱","💻","🌍","🌎","🌏","☀️","🌙","🌈",
  "🍕","🍔","🍟","🌮","🍎","🍓","🍉","☕","🍿","🎂",
  "⚽","🏀","🏈","🎾","🏆","🚗","✈️","🏠","💰","💎",
  "🔒","🔑","✅","❌","⚡","💥","❗","❓","‼️","⁉️"
];

const STARTER_POSTS = [
  {
    id: 1,
    creator: "HEXA",
    handle: "@hexa",
    avatar: "H",
    text: "Welcome to HEXA 🌐 Your workspace, social network, AI and community — all connected.",
    tag: "#HEXA",
    music: "HEXA Original Sound",
    likes: 12840,
    comments: 642,
    shares: 2130,
    saves: 3890,
    views: 98421,
    following: false,
    liked: false,
    saved: false,
    reposted: false,
  },
  {
    id: 2,
    creator: "HEXA Community",
    handle: "@hexacommunity",
    avatar: "HC",
    text: "Create. Connect. Discover. 🚀 What are you building today?",
    tag: "#BuildWithHEXA",
    music: "Original Audio",
    likes: 7420,
    comments: 318,
    shares: 921,
    saves: 1450,
    views: 56200,
    following: false,
    liked: false,
    saved: false,
    reposted: false,
  },
];

function formatNumber(number) {
  if (number >= 1000000) {
    return `${(number / 1000000).toFixed(1)}M`;
  }

  if (number >= 1000) {
    return `${(number / 1000).toFixed(1)}K`;
  }

  return String(number);
}

export default function SocialFeed({
  currentUser = "username",
  onOpenProfile,
  onShare,
}) {
  const [posts, setPosts] = useState(STARTER_POSTS);
  const [activeComments, setActiveComments] = useState(null);
  const [commentText, setCommentText] = useState("");
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [search, setSearch] = useState("");

  const visiblePosts = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return posts;

    return posts.filter(
      (post) =>
        post.creator.toLowerCase().includes(query) ||
        post.handle.toLowerCase().includes(query) ||
        post.text.toLowerCase().includes(query) ||
        post.tag.toLowerCase().includes(query)
    );
  }, [posts, search]);

  const updatePost = (id, updater) => {
    setPosts((current) =>
      current.map((post) =>
        post.id === id ? updater(post) : post
      )
    );
  };

  const toggleLike = (id) => {
    updatePost(id, (post) => ({
      ...post,
      liked: !post.liked,
      likes: post.liked ? post.likes - 1 : post.likes + 1,
    }));
  };

  const toggleSave = (id) => {
    updatePost(id, (post) => ({
      ...post,
      saved: !post.saved,
      saves: post.saved ? post.saves - 1 : post.saves + 1,
    }));
  };

  const toggleFollow = (id) => {
    updatePost(id, (post) => ({
      ...post,
      following: !post.following,
    }));
  };

  const repost = (id) => {
    updatePost(id, (post) => ({
      ...post,
      reposted: !post.reposted,
    }));
  };

  const sharePost = (post) => {
    updatePost(post.id, (item) => ({
      ...item,
      shares: item.shares + 1,
    }));

    if (navigator.share) {
      navigator
        .share({
          title: `${post.creator} on HEXA`,
          text: post.text,
        })
        .catch(() => {});
    }

    onShare?.(post);
  };

  const addComment = () => {
    if (!commentText.trim() || activeComments === null) return;

    updatePost(activeComments, (post) => ({
      ...post,
      comments: post.comments + 1,
    }));

    setCommentText("");
  };

  const addEmoji = (emoji) => {
    setCommentText((value) => `${value}${emoji}`);
  };

  return (
    <div className="hexa-social">

      {/* HEADER */}

      <header className="social-header">
        <div>
          <div className="social-eyebrow">HEXA SOCIAL</div>
          <h1>For You</h1>
          <p>
            Discover people, creators, communities and ideas.
          </p>
        </div>

        <button
          className="social-profile-button"
          onClick={() => onOpenProfile?.(currentUser)}
        >
          <span>{currentUser?.[0]?.toUpperCase() || "U"}</span>
          Profile
        </button>
      </header>

      {/* UNIVERSAL SOCIAL SEARCH */}

      <div className="social-search">
        <span>⌕</span>

        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search people, posts, creators and #hashtags..."
        />

        {search && (
          <button onClick={() => setSearch("")}>
            ×
          </button>
        )}
      </div>

      {/* FEED */}

      <main className="social-feed">

        {visiblePosts.map((post) => (
          <article
            className="social-post"
            key={post.id}
          >

            {/* POST CONTENT */}

            <div className="post-content">

              <div className="post-top">

                <button
                  className="creator"
                  onClick={() =>
                    onOpenProfile?.(post.handle)
                  }
                >
                  <span className="creator-avatar">
                    {post.avatar}
                  </span>

                  <span>
                    <strong>{post.creator}</strong>
                    <small>{post.handle}</small>
                  </span>
                </button>

                <button
                  className={`follow-button ${
                    post.following ? "following" : ""
                  }`}
                  onClick={() => toggleFollow(post.id)}
                >
                  {post.following ? "Following" : "Follow"}
                </button>

              </div>

              <div className="post-text">
                {post.text}
              </div>

              <div className="post-tag">
                {post.tag}
              </div>

              <div className="post-audio">
                🎵 {post.music}
              </div>

              <div className="post-stats">
                {formatNumber(post.views)} views
              </div>

            </div>

            {/* ACTION RAIL */}

            <aside className="post-actions">

              <button
                className={post.liked ? "active" : ""}
                onClick={() => toggleLike(post.id)}
              >
                <span>
                  {post.liked ? "❤️" : "🤍"}
                </span>
                <small>{formatNumber(post.likes)}</small>
              </button>

              <button
                onClick={() =>
                  setActiveComments(post.id)
                }
              >
                <span>💬</span>
                <small>
                  {formatNumber(post.comments)}
                </small>
              </button>

              <button
                onClick={() => repost(post.id)}
                className={post.reposted ? "active" : ""}
              >
                <span>🔁</span>
                <small>
                  {post.reposted ? "Reposted" : "Repost"}
                </small>
              </button>

              <button
                onClick={() => sharePost(post)}
              >
                <span>↗️</span>
                <small>
                  {formatNumber(post.shares)}
                </small>
              </button>

              <button
                onClick={() => toggleSave(post.id)}
                className={post.saved ? "active" : ""}
              >
                <span>
                  {post.saved ? "🔖" : "📑"}
                </span>
                <small>
                  {formatNumber(post.saves)}
                </small>
              </button>

              <button>
                <span>⋯</span>
                <small>More</small>
              </button>

            </aside>

          </article>
        ))}

        {!visiblePosts.length && (
          <div className="social-empty">
            <div>🔎</div>
            <h3>No results</h3>
            <p>
              Try searching for another person, post or hashtag.
            </p>
          </div>
        )}

      </main>

      {/* COMMENT SHEET */}

      {activeComments !== null && (
        <div
          className="comment-overlay"
          onClick={() => setActiveComments(null)}
        >
          <section
            className="comment-sheet"
            onClick={(event) => event.stopPropagation()}
          >

            <div className="comment-header">
              <strong>Comments</strong>

              <button
                onClick={() => setActiveComments(null)}
              >
                ×
              </button>
            </div>

            <div className="comment-list">

              <div className="comment">
                <span>😀</span>
                <div>
                  <strong>HEXA user</strong>
                  <p>This is amazing 🔥</p>
                </div>
              </div>

              <div className="comment">
                <span>🚀</span>
                <div>
                  <strong>Creator</strong>
                  <p>Welcome to HEXA! ❤️</p>
                </div>
              </div>

            </div>

            {/* EMOJI PICKER */}

            {emojiOpen && (
              <div className="emoji-picker">
                {EMOJIS.map((emoji, index) => (
                  <button
                    key={`${emoji}-${index}`}
                    onClick={() => addEmoji(emoji)}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}

            <div className="comment-input">

              <button
                onClick={() =>
                  setEmojiOpen((value) => !value)
                }
              >
                😊
              </button>

              <input
                value={commentText}
                onChange={(event) =>
                  setCommentText(event.target.value)
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    addComment();
                  }
                }}
                placeholder="Add a comment..."
              />

              <button
                className="comment-send"
                disabled={!commentText.trim()}
                onClick={addComment}
              >
                ➤
              </button>

            </div>

          </section>
        </div>
      )}

    </div>
  );
}