import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { useNotifications } from "../context/NotificationContext";
import { TYPE_META, timeAgo } from "../utils/notificationMeta";
import "./NotificationBell.css";

export default function NotificationBell() {
  const { unreadCount, latest, refresh } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleClick = async (n) => {
    try {
      if (!n.isRead) await api.patch(`/notifications/${n._id}/read`);
      refresh();
    } catch (err) {
      console.error(err);
    }
    setOpen(false);
    if (n.link) navigate(n.link);
  };

  const markAll = async () => {
    try {
      await api.patch("/notifications/read-all");
      refresh();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="nb-wrap" ref={ref}>
      <button className="nb-btn" onClick={() => setOpen((o) => !o)} aria-label="Notifications">
        🔔
        {unreadCount > 0 && (
          <span className="nb-badge">{unreadCount > 99 ? "99+" : unreadCount}</span>
        )}
      </button>

      {open && (
        <div className="nb-dropdown">
          <div className="nb-header">
            <strong>Notifications</strong>
            {unreadCount > 0 && (
              <button className="nb-link" onClick={markAll}>
                Mark all read
              </button>
            )}
          </div>

          <div className="nb-list">
            {latest.length === 0 && <p className="nb-empty">No notifications yet</p>}
            {latest.map((n) => (
              <div
                key={n._id}
                className={`nb-item ${n.isRead ? "" : "nb-unread"}`}
                onClick={() => handleClick(n)}
              >
                <span className="nb-icon">{(TYPE_META[n.type] || TYPE_META.general).icon}</span>
                <div className="nb-body">
                  <div className="nb-title">{n.title}</div>
                  <div className="nb-msg">{n.message}</div>
                  <div className="nb-time">{timeAgo(n.createdAt)}</div>
                </div>
              </div>
            ))}
          </div>

          <button
            className="nb-footer"
            onClick={() => {
              setOpen(false);
              navigate("/notifications");
            }}
          >
            View all notifications
          </button>
        </div>
      )}
    </div>
  );
}