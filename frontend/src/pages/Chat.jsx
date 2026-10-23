import { useEffect, useRef, useState, useCallback } from "react";
import { useAuth } from "../context/AuthContext"; // apne AuthContext ke hisaab se adjust karo
import { chatApi } from "../api/chatApi";
import { connectSocket, SERVER } from "../api/socket";
import NewChatModal from "../components/NewChatModal";
import "./chat.css";

const convTitle = (c, myId) => {
  if (c.name) return c.name;
  if (c.type === "project" && c.project?.name) return `Project: ${c.project.name}`;
  const others = c.participants.filter((p) => p._id !== myId);
  return others.map((p) => p.name).join(", ") || "Chat";
};

const fmtTime = (d) =>
  new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const typeLabel = { direct: "Direct", project: "Project", internal: "Internal" };

export default function Chat() {
  const { user } = useAuth();
  const myId = user?._id || user?.id;

  const [conversations, setConversations] = useState([]);
  const [active, setActive] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [files, setFiles] = useState([]);
  const [typingUser, setTypingUser] = useState(null);
  const [online, setOnline] = useState(new Set());
  const [showNew, setShowNew] = useState(false);
  const [showFiles, setShowFiles] = useState(false);
  const [sharedFiles, setSharedFiles] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [sending, setSending] = useState(false);

  const activeRef = useRef(null);
  const bottomRef = useRef(null);
  const typingTimeout = useRef(null);
  const fileInput = useRef(null);

  activeRef.current = active;

  const loadConversations = useCallback(async () => {
    const { data } = await chatApi.getConversations();
    setConversations(data.conversations);
  }, []);

  // Socket setup
  useEffect(() => {
    loadConversations();
    const socket = connectSocket();

    socket.on("message:new", (msg) => {
      const current = activeRef.current;
      if (current && msg.conversation === current._id) {
        setMessages((prev) =>
          prev.find((m) => m._id === msg._id) ? prev : [...prev, msg]
        );
        if (msg.sender._id !== myId) chatApi.markRead(current._id);
      }
      // sidebar update
      setConversations((prev) => {
        const idx = prev.findIndex((c) => c._id === msg.conversation);
        if (idx === -1) {
          loadConversations();
          return prev;
        }
        const updated = { ...prev[idx] };
        updated.lastMessage = {
          text: msg.text || "📎 File",
          sender: msg.sender._id,
          createdAt: msg.createdAt,
        };
        updated.lastMessageAt = msg.createdAt;
        const isActive = current && current._id === msg.conversation;
        if (!isActive && msg.sender._id !== myId) {
          updated.unread = (updated.unread || 0) + 1;
        }
        return [updated, ...prev.filter((_, i) => i !== idx)];
      });
    });

    socket.on("conversation:new", (conv) => {
      setConversations((prev) =>
        prev.find((c) => c._id === conv._id) ? prev : [{ ...conv, unread: 0 }, ...prev]
      );
    });

    socket.on("typing", ({ conversationId, userId, isTyping }) => {
      if (activeRef.current?._id !== conversationId) return;
      setTypingUser(isTyping ? userId : null);
    });

    socket.on("presence", ({ userId, online: isOn }) => {
      setOnline((prev) => {
        const next = new Set(prev);
        isOn ? next.add(userId) : next.delete(userId);
        return next;
      });
    });

    return () => {
      socket.off("message:new");
      socket.off("conversation:new");
      socket.off("typing");
      socket.off("presence");
    };
  }, [loadConversations, myId]);

  // Open conversation
  const openConversation = async (conv) => {
    setActive(conv);
    setShowFiles(false);
    setTypingUser(null);
    const { data } = await chatApi.getMessages(conv._id);
    setMessages(data.messages);
    setHasMore(data.hasMore);
    await chatApi.markRead(conv._id);
    setConversations((prev) =>
      prev.map((c) => (c._id === conv._id ? { ...c, unread: 0 } : c))
    );
  };

  const loadOlder = async () => {
    if (!messages.length) return;
    const { data } = await chatApi.getMessages(active._id, messages[0].createdAt);
    setMessages((prev) => [...data.messages, ...prev]);
    setHasMore(data.hasMore);
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleTyping = (e) => {
    setText(e.target.value);
    if (!active) return;
    const socket = connectSocket();
    socket.emit("typing", { conversationId: active._id, isTyping: true });
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      socket.emit("typing", { conversationId: active._id, isTyping: false });
    }, 1200);
  };

  const send = async (e) => {
    e.preventDefault();
    if (!active || sending) return;
    if (!text.trim() && files.length === 0) return;

    const fd = new FormData();
    fd.append("text", text);
    files.forEach((f) => fd.append("files", f));

    try {
      setSending(true);
      await chatApi.sendMessage(active._id, fd);
      setText("");
      setFiles([]);
      if (fileInput.current) fileInput.current.value = "";
    } catch (err) {
      alert(err.response?.data?.message || "Message send nahi hua");
    } finally {
      setSending(false);
    }
  };

  const toggleFiles = async () => {
    if (!showFiles) {
      const { data } = await chatApi.getFiles(active._id);
      setSharedFiles(data.files);
    }
    setShowFiles((s) => !s);
  };

  const onCreated = async (conv) => {
    setShowNew(false);
    await loadConversations();
    openConversation(conv);
  };

  const isImage = (a) => a.mimetype?.startsWith("image/");

  return (
    <div className="chat-wrap">
      {/* SIDEBAR */}
      <aside className="chat-sidebar">
        <div className="chat-sidebar-head">
          <h3>Messages</h3>
          <button className="btn-primary" onClick={() => setShowNew(true)}>
            + New
          </button>
        </div>
        <div className="chat-conv-list">
          {conversations.map((c) => {
            const others = c.participants.filter((p) => p._id !== myId);
            const isOn = c.type === "direct" && others[0] && online.has(others[0]._id);
            return (
              <div
                key={c._id}
                className={`chat-conv ${active?._id === c._id ? "active" : ""}`}
                onClick={() => openConversation(c)}
              >
                <div className="chat-conv-top">
                  <b>
                    {isOn && <span className="dot" />}
                    {convTitle(c, myId)}
                  </b>
                  {c.unread > 0 && <span className="badge">{c.unread}</span>}
                </div>
                <div className="chat-conv-sub">
                  <span className="tag">{typeLabel[c.type]}</span>
                  <span className="muted ellipsis">{c.lastMessage?.text || "No messages"}</span>
                </div>
              </div>
            );
          })}
          {conversations.length === 0 && (
            <p className="muted pad">Abhi koi chat nahi hai. "+ New" dabao.</p>
          )}
        </div>
      </aside>

      {/* MAIN */}
      <section className="chat-main">
        {!active ? (
          <div className="chat-empty">Koi conversation select karo</div>
        ) : (
          <>
            <header className="chat-header">
              <div>
                <b>{convTitle(active, myId)}</b>
                <div className="muted">
                  {active.participants.map((p) => p.name).join(", ")}
                </div>
              </div>
              <button className="btn-light" onClick={toggleFiles}>
                📁 Files
              </button>
            </header>

            {showFiles ? (
              <div className="chat-files">
                <h4>Shared Files</h4>
                {sharedFiles.length === 0 && <p className="muted">Koi file share nahi hui</p>}
                {sharedFiles.map((f, i) => (
                  <a
                    key={i}
                    href={`${SERVER}${f.url}`}
                    target="_blank"
                    rel="noreferrer"
                    className="file-row"
                  >
                    📄 {f.name}
                    <small>
                      {" "}
                      — {f.sentBy}, {new Date(f.sentAt).toLocaleDateString()}
                    </small>
                  </a>
                ))}
              </div>
            ) : (
              <>
                <div className="chat-messages">
                  {hasMore && (
                    <button className="btn-light center" onClick={loadOlder}>
                      Purane messages load karo
                    </button>
                  )}
                  {messages.map((m) => {
                    const mine = m.sender._id === myId;
                    return (
                      <div key={m._id} className={`msg ${mine ? "mine" : ""}`}>
                        {!mine && <div className="msg-name">{m.sender.name}</div>}
                        {m.text && <div className="msg-text">{m.text}</div>}
                        {m.attachments?.map((a, i) =>
                          isImage(a) ? (
                            <a key={i} href={`${SERVER}${a.url}`} target="_blank" rel="noreferrer">
                              <img src={`${SERVER}${a.url}`} alt={a.name} className="msg-img" />
                            </a>
                          ) : (
                            <a
                              key={i}
                              href={`${SERVER}${a.url}`}
                              target="_blank"
                              rel="noreferrer"
                              className="msg-file"
                            >
                              📎 {a.name}
                            </a>
                          )
                        )}
                        <div className="msg-time">{fmtTime(m.createdAt)}</div>
                      </div>
                    );
                  })}
                  {typingUser && <div className="typing">typing...</div>}
                  <div ref={bottomRef} />
                </div>

                {files.length > 0 && (
                  <div className="chat-preview">
                    {files.map((f, i) => (
                      <span key={i} className="chip">
                        {f.name}
                        <button
                          type="button"
                          onClick={() => setFiles(files.filter((_, x) => x !== i))}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <form className="chat-input" onSubmit={send}>
                  <input
                    type="file"
                    multiple
                    hidden
                    ref={fileInput}
                    onChange={(e) => setFiles(Array.from(e.target.files).slice(0, 5))}
                  />
                  <button
                    type="button"
                    className="btn-light"
                    onClick={() => fileInput.current.click()}
                  >
                    📎
                  </button>
                  <input
                    className="grow"
                    placeholder="Message likho..."
                    value={text}
                    onChange={handleTyping}
                  />
                  <button className="btn-primary" disabled={sending}>
                    {sending ? "..." : "Send"}
                  </button>
                </form>
              </>
            )}
          </>
        )}
      </section>

      {showNew && <NewChatModal onClose={() => setShowNew(false)} onCreated={onCreated} />}
    </div>
  );
}