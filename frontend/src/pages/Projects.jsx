import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getProjects, deleteProject } from "../api/projectApi";

const STATUSES = ["planning", "active", "on_hold", "completed", "cancelled"];

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await getProjects({ status, search, page, limit: 10 });
      setProjects(data.projects);
      setPages(data.pages);
    } catch (e) {
      alert(e.response?.data?.message || "Failed to load projects");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line
  }, [status, page]);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this project?")) return;
    await deleteProject(id);
    load();
  };

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <h2>Projects</h2>
        <Link to="/projects/new">+ New Project</Link>
      </div>

      <div style={{ display: "flex", gap: 10, margin: "12px 0" }}>
        <input
          placeholder="Search name or client"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (setPage(1), load())}
        />
        <select
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value);
          }}
        >
          <option value="">All status</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replace("_", " ")}
            </option>
          ))}
        </select>
        <button onClick={() => (setPage(1), load())}>Search</button>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <table border="1" cellPadding="8" width="100%">
          <thead>
            <tr>
              <th>Name</th>
              <th>Client</th>
              <th>Dates</th>
              <th>Budget</th>
              <th>Status</th>
              <th>Progress</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((p) => (
              <tr key={p._id}>
                <td>
                  <Link to={`/projects/${p._id}`}>{p.name}</Link>
                </td>
                <td>{p.client?.name}</td>
                <td>
                  {new Date(p.startDate).toLocaleDateString()} -{" "}
                  {p.endDate ? new Date(p.endDate).toLocaleDateString() : "—"}
                </td>
                <td>${p.budget}</td>
                <td>{p.status.replace("_", " ")}</td>
                <td>{p.progress}%</td>
                <td>
                  <Link to={`/projects/${p._id}/edit`}>Edit</Link>{" "}
                  <button onClick={() => handleDelete(p._id)}>Delete</button>
                </td>
              </tr>
            ))}
            {!projects.length && (
              <tr>
                <td colSpan="7" align="center">
                  No projects found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
        <button disabled={page <= 1} onClick={() => setPage(page - 1)}>
          Prev
        </button>
        <span>
          Page {page} / {pages}
        </span>
        <button disabled={page >= pages} onClick={() => setPage(page + 1)}>
          Next
        </button>
      </div>
    </div>
  );
}