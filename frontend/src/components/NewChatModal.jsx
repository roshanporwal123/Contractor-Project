import { useEffect, useState } from "react";
import { chatApi } from "../api/chatApi";

export default function NewChatModal({ onClose, onCreated }) {
  const [type, setType] = useState("direct");
  const [name, setName] = useState("");
  const [projectId, setProjectId] = useState("");
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState([]);
  const [selected, setSelected] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const t = setTimeout(async () => {
      try {
        const { data } = await chatApi.searchUsers(search);
        setUsers(data.users);
      } catch {
        setUsers([]);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const toggle = (u) => {
    if (type === "direct") return setSelected([u]);
    setSelected((prev) =>
      prev.find((x) => x._id === u._id)
        ? prev.filter((x) => x._id !== u._id)
        : [...prev, u]
    );
  };

  const submit = async () => {
    setError("");
    if (selected.length === 0) return setError("Kam se kam 1 user select karo");
    if (type === "project" && !projectId.trim())
      return setError("Project ID daalo");
    try {
      const { data } = await chatApi.createConversation({
        type,
        name: name || undefined,
        projectId: type === "project" ? projectId.trim() : undefined,
        participantIds: selected.map((u) => u._id),
      });
      onCreated(data.conversation);
    } catch (e) {
      setError(e.response?.data?.message || "Chat create nahi hui");
    }
  };

  return (
    <div className="chat-modal-bg" onClick={onClose}>
      <div className="chat-modal" onClick={(e) => e.stopPropagation()}>
        <h3>New Chat</h3>

        <select
          value={type}
          onChange={(e) => {
            setType(e.target.value);
            setSelected([]);
          }}
        >
          <option value="direct">Customer ↔ Contractor (Direct)</option>
          <option value="project">Project Chat</option>
          <option value="internal">Internal Team Chat</option>
        </select>

        {type !== "direct" && (
          <input
            placeholder="Group name (optional)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        )}

        {type === "project" && (
          <input
            placeholder="Project ID"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
          />
        )}

        <input
          placeholder="User search (name / email)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="chat-user-list">
          {users.map((u) => {
            const active = selected.find((x) => x._id === u._id);
            return (
              <div
                key={u._id}
                className={`chat-user ${active ? "active" : ""}`}
                onClick={() => toggle(u)}
              >
                <b>{u.name}</b> <small>({u.role})</small>
                <div className="muted">{u.email}</div>
              </div>
            );
          })}
          {users.length === 0 && <p className="muted">Koi user nahi mila</p>}
        </div>

        {error && <p className="chat-error">{error}</p>}

        <div className="chat-modal-actions">
          <button className="btn-light" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={submit}>
            Start Chat
          </button>
        </div>
      </div>
    </div>
  );
}