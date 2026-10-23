import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";

const STATUSES = ["todo", "in_progress", "review", "completed", "cancelled"];
const PRIORITIES = ["low", "medium", "high", "urgent"];
const emptyForm = { title: "", description: "", project: "", assignedTo: "", priority: "medium", dueDate: "" };

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [contractors, setContractors] = useState([]);
  const [filters, setFilters] = useState({ search: "", status: "", priority: "", project: "" });
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
    const { data } = await api.get("/tasks", { params });
    setTasks(data.tasks);
  }, [filters]);

  useEffect(() => { load().catch(console.error); }, [load]);

  useEffect(() => {
    // adjust response keys if your project/contractor list APIs differ
    api.get("/projects").then(({ data }) => setProjects(data.projects || data));
    api.get("/contractors").then(({ data }) => setContractors(data.contractors || data));
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      if (editId) await api.put(`/tasks/${editId}`, form);
      else await api.post("/tasks", form);
      setForm(emptyForm); setEditId(null); setShowForm(false);
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong");
    }
  };

  const edit = (t) => {
    setEditId(t._id);
    setForm({
      title: t.title,
      description: t.description || "",
      project: t.project?._id || "",
      assignedTo: t.assignedTo?._id || "",
      priority: t.priority,
      dueDate: t.dueDate ? t.dueDate.slice(0, 10) : "",
    });
    setShowForm(true);
  };

  const changeStatus = async (id, status) => {
    await api.patch(`/tasks/${id}/status`, { status });
    load();
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this task?")) return;
    await api.delete(`/tasks/${id}`);
    load();
  };

  const isOverdue = (t) =>
    t.dueDate && new Date(t.dueDate) < new Date() && !["completed", "cancelled"].includes(t.status);

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>Tasks</h2>
        <button onClick={() => { setShowForm(!showForm); setEditId(null); setForm(emptyForm); }}>
          {showForm ? "Close" : "+ New Task"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} style={{ display: "grid", gap: 8, maxWidth: 480, margin: "12px 0" }}>
          {error && <p style={{ color: "red" }}>{error}</p>}
          <input placeholder="Title *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          <textarea placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <select value={form.project} onChange={(e) => setForm({ ...form, project: e.target.value })} required>
            <option value="">Select project *</option>
            {projects.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
          </select>
          <select value={form.assignedTo} onChange={(e) => setForm({ ...form, assignedTo: e.target.value })}>
            <option value="">Unassigned</option>
            {contractors.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
          <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
            {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
          </select>
          <input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
          <button type="submit">{editId ? "Update Task" : "Create Task"}</button>
        </form>
      )}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "12px 0" }}>
        <input placeholder="Search..." value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
        <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
          <option value="">All status</option>
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select value={filters.priority} onChange={(e) => setFilters({ ...filters, priority: e.target.value })}>
          <option value="">All priority</option>
          {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
        </select>
        <select value={filters.project} onChange={(e) => setFilters({ ...filters, project: e.target.value })}>
          <option value="">All projects</option>
          {projects.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
        </select>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table border="1" cellPadding="8" style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr><th>Title</th><th>Project</th><th>Assigned</th><th>Priority</th><th>Due</th><th>Status</th><th>Progress</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {tasks.map((t) => (
              <tr key={t._id} style={isOverdue(t) ? { background: "#fff1f1" } : {}}>
                <td><Link to={`/tasks/${t._id}`}>{t.title}</Link></td>
                <td>{t.project?.name}</td>
                <td>{t.assignedTo?.name || "—"}</td>
                <td>{t.priority}</td>
                <td>{t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "—"}</td>
                <td>
                  <select value={t.status} onChange={(e) => changeStatus(t._id, e.target.value)}>
                    {STATUSES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </td>
                <td>{t.progress}%</td>
                <td>
                  <button onClick={() => edit(t)}>Edit</button>{" "}
                  <button onClick={() => remove(t._id)}>Delete</button>
                </td>
              </tr>
            ))}
            {!tasks.length && <tr><td colSpan="8" align="center">No tasks found</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}