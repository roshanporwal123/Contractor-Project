import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../api/axios";

const FILE_BASE = import.meta.env.VITE_API_URL?.replace("/api", "") || "https://contractor-backend.vercel.app/";

export default function TaskDetail() {
  const { id } = useParams();
  const [task, setTask] = useState(null);
  const [comment, setComment] = useState("");
  const [progress, setProgress] = useState(0);

  const load = async () => {
    const { data } = await api.get(`/tasks/${id}`);
    setTask(data.task);
    setProgress(data.task.progress);
  };

  useEffect(() => { load().catch(console.error); }, [id]);

  const saveProgress = async () => {
    await api.patch(`/tasks/${id}/progress`, { progress });
    load();
  };

  const postComment = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    await api.post(`/tasks/${id}/comments`, { text: comment });
    setComment("");
    load();
  };

  const removeComment = async (cid) => {
    await api.delete(`/tasks/${id}/comments/${cid}`);
    load();
  };

  const upload = async (e) => {
    const files = e.target.files;
    if (!files.length) return;
    const fd = new FormData();
    [...files].forEach((f) => fd.append("files", f));
    await api.post(`/tasks/${id}/attachments`, fd, { headers: { "Content-Type": "multipart/form-data" } });
    e.target.value = "";
    load();
  };

  const removeAttachment = async (aid) => {
    await api.delete(`/tasks/${id}/attachments/${aid}`);
    load();
  };

  if (!task) return <p style={{ padding: 20 }}>Loading...</p>;

  return (
    <div style={{ padding: 20, maxWidth: 800 }}>
      <Link to="/tasks">← Back</Link>
      <h2>{task.title}</h2>
      <p>{task.description}</p>
      <p>
        <b>Project:</b> {task.project?.name} | <b>Assigned:</b> {task.assignedTo?.name || "Unassigned"} |{" "}
        <b>Priority:</b> {task.priority} | <b>Status:</b> {task.status} |{" "}
        <b>Due:</b> {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "—"}
      </p>

      <h3>Progress: {task.progress}%</h3>
      <progress value={task.progress} max="100" style={{ width: "100%" }} />
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8 }}>
        <input type="range" min="0" max="100" step="5" value={progress} onChange={(e) => setProgress(e.target.value)} />
        <span>{progress}%</span>
        <button onClick={saveProgress}>Update</button>
      </div>

      <h3>Attachments</h3>
      <input type="file" multiple onChange={upload} />
      <ul>
        {task.attachments.map((a) => (
          <li key={a._id}>
            <a href={`${FILE_BASE}/${a.path.replace(/\\/g, "/")}`} target="_blank" rel="noreferrer">{a.originalName}</a>{" "}
            ({Math.round(a.size / 1024)} KB){" "}
            <button onClick={() => removeAttachment(a._id)}>x</button>
          </li>
        ))}
        {!task.attachments.length && <li>No attachments</li>}
      </ul>

      <h3>Comments</h3>
      <form onSubmit={postComment} style={{ display: "flex", gap: 8 }}>
        <input style={{ flex: 1 }} placeholder="Write a comment..." value={comment} onChange={(e) => setComment(e.target.value)} />
        <button type="submit">Post</button>
      </form>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {[...task.comments].reverse().map((c) => (
          <li key={c._id} style={{ borderBottom: "1px solid #ddd", padding: "8px 0" }}>
            <b>{c.user?.name}</b>{" "}
            <small>{new Date(c.createdAt).toLocaleString()}</small>
            <button onClick={() => removeComment(c._id)} style={{ float: "right" }}>Delete</button>
            <div>{c.text}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}