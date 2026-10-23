import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { useNotifications } from "../context/NotificationContext";
import { TYPE_META, timeAgo } from "../utils/notificationMeta";
import "./Notifications.css";

const FILTERS = [
  { key: "", label: "All" },
  { key: "new_project", label: "Projects" },
  { key: "task_assigned", label: "Tasks" },
  { key: "invoice_generated", label: "Invoices" },
  { key: "payment_received", label: "Payments" },
  { key: "document_expiry", label: "Documents" },
  { key: "schedule_change", label: "Schedule" },
  { key: "new_message", label: "Messages" },
];

export default function Notifications() {
  const navigate = useNavigate();
  const { refresh } = useNotifications();
  const [items, setItems] = useState([]);
  const [type, setType] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(false);

  const load = useCallback(
    async (pageNo = 1, append = false) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ page: pageNo, limit: 15 });
        if (type) params.set("type", type);
        if (unreadOnly) params.set("unread", "true");
        const { data } = await api.get(`/notifications?${params.toString()}`);
        setItems((prev) => (append ? [...prev, ...data.notifications] : data.notifications));
        setPage(data.page);
        setPages(data.pages);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    },
    [type, unreadOnly]
  );

  useEffect(() => {
    load(1, false);
  }, [load]);

  const open = async (n) => {
    if (!n.isRead) {
      await api.patch(`/notifications/${n._id}/read`);
      setItems((prev) => prev.map((x) => (x._id === n._id ? { ...x, isRead: true } : x)));
      refresh();
    }
    if (n.link) navigate(n.link);
  };

  const remove = async (e, id) => {
    e.stopPropagation();
    await api.delete(`/notifications/${id}`);
    setItems((prev) => prev.filter((x) => x._id !== id));
    refresh();
  };

  const markAll = async () => {
    await api.patch("/notifications/read-all");
    setItems((prev) => prev.map((x) => ({ ...x, isRead: true })));
    refresh();
  };

  const clearRead = async () => {
    if (!window.confirm("Delete all read notifications?")) return;
    await api.delete("/notifications");
    load(1, false);
    refresh();
  };

  return (
    <div className="np-page">
      <div className="np-top">
        <h2>Notifications</h2>
        <div className="np-actions">
          <label className="np-check">
            <input
              type="checkbox"
              checked={unreadOnly}
              onChange={(e) => setUnreadOnly(e.target.checked)}
            />
            Unread only
          </label>
          <button onClick={markAll}>Mark all read</button>
          <button className="np-danger" onClick={clearRead}>
            Clear read
          </button>
        </div>
      </div>

      <div className="np-tabs">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            className={type === f.key ? "np-tab active" : "np-tab"}
            onClick={() => setType(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="np-list">
        {!loading && items.length === 0 && <p className="np-empty">No notifications found</p>}

        {items.map((n) => (
          <div
            key={n._id}
            className={`np-item ${n.isRead ? "" : "np-unread"}`}
            onClick={() => open(n)}
          >
            <span className="np-icon">{(TYPE_META[n.type] || TYPE_META.general).icon}</span>
            <div className="np-body">
              <div className="np-title">
                {n.title} {!n.isRead && <span className="np-dot" />}
              </div>
              <div className="np-msg">{n.message}</div>
              <div className="np-time">{timeAgo(n.createdAt)}</div>
            </div>
            <button className="np-del" onClick={(e) => remove(e, n._id)} title="Delete">
              ✕
            </button>
          </div>
        ))}
      </div>

      {page < pages && (
        <button className="np-more" disabled={loading} onClick={() => load(page + 1, true)}>
          {loading ? "Loading..." : "Load more"}
        </button>
      )}
    </div>
  );
}