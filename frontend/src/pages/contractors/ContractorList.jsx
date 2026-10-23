import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axios";

const statusColor = { Active: "#16a34a", Inactive: "#6b7280", Pending: "#d97706" };

export default function ContractorList() {
  const [data, setData] = useState({ contractors: [], pages: 1 });
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/contractors", {
        params: { search, status, page, limit: 10 },
      });
      setData(data);
    } catch (e) {
      alert(e.response?.data?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(load, 300); // debounce
    return () => clearTimeout(t);
    // eslint-disable-next-line
  }, [search, status, page]);

  const changeStatus = async (id, newStatus) => {
    await api.patch(`/contractors/${id}/status`, { status: newStatus });
    load();
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this contractor?")) return;
    await api.delete(`/contractors/${id}`);
    load();
  };

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        <h2>Contractors</h2>
        <Link to="/contractors/new">+ Add Contractor</Link>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        <input
          placeholder="Search name, email, skill..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All Status</option>
          <option>Active</option>
          <option>Inactive</option>
          <option>Pending</option>
        </select>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <table width="100%" border="1" cellPadding="8" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th>Name</th><th>Specialization</th><th>Skills</th>
              <th>Phone</th><th>Status</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.contractors.map((c) => (
              <tr key={c._id}>
                <td><Link to={`/contractors/${c._id}`}>{c.name}</Link><br /><small>{c.email}</small></td>
                <td>{c.specialization || "-"}</td>
                <td>{c.skills?.join(", ") || "-"}</td>
                <td>{c.phone || "-"}</td>
                <td>
                  <select
                    value={c.status}
                    style={{ color: statusColor[c.status] }}
                    onChange={(e) => changeStatus(c._id, e.target.value)}
                  >
                    <option>Active</option>
                    <option>Inactive</option>
                    <option>Pending</option>
                  </select>
                </td>
                <td>
                  <Link to={`/contractors/${c._id}/edit`}>Edit</Link>{" "}
                  <button onClick={() => remove(c._id)}>Delete</button>
                </td>
              </tr>
            ))}
            {!data.contractors.length && (
              <tr><td colSpan="6" align="center">No contractors found</td></tr>
            )}
          </tbody>
        </table>
      )}

      <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
        <button disabled={page <= 1} onClick={() => setPage(page - 1)}>Prev</button>
        <span>Page {page} / {data.pages || 1}</span>
        <button disabled={page >= data.pages} onClick={() => setPage(page + 1)}>Next</button>
      </div>
    </div>
  );
}