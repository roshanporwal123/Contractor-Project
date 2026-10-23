import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { estimateApi } from "../../api/estimateApi";

const colors = { draft: "#888", sent: "#2563eb", accepted: "#16a34a", rejected: "#dc2626", expired: "#d97706" };

export default function EstimateList() {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [msg, setMsg] = useState("");

  const load = async () => {
    const { data } = await estimateApi.list({ status, search });
    setItems(data);
  };
  useEffect(() => { load(); }, [status]);

  const send = async (id) => {
    try {
      await estimateApi.send(id);
      setMsg("Estimate client ko bhej diya gaya");
      load();
    } catch (e) {
      setMsg(e.response?.data?.message || "Send failed");
    }
  };

  const del = async (id) => {
    if (!window.confirm("Delete this estimate?")) return;
    try {
      await estimateApi.remove(id);
      load();
    } catch (e) {
      setMsg(e.response?.data?.message || "Delete failed");
    }
  };

  const download = async (e) => {
    const { data } = await estimateApi.pdf(e._id);
    const url = URL.createObjectURL(new Blob([data], { type: "application/pdf" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${e.estimateNumber}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>Estimates & Quotes</h2>
        <Link to="/estimates/new">+ New Estimate</Link>
      </div>

      <div style={{ display: "flex", gap: 8, margin: "12px 0" }}>
        <input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <button onClick={load}>Search</button>
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All</option>
          {Object.keys(colors).map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {msg && <p>{msg}</p>}

      <table width="100%" border="1" cellPadding="8" style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr><th>No</th><th>Title</th><th>Client</th><th>Project</th><th>Total</th><th>Status</th><th>Actions</th></tr>
        </thead>
        <tbody>
          {items.map((e) => (
            <tr key={e._id}>
              <td>{e.estimateNumber}</td>
              <td>{e.title}</td>
              <td>{e.client.name}</td>
              <td>{e.project?.name || "-"}</td>
              <td>${e.total.toFixed(2)}</td>
              <td style={{ color: colors[e.status], fontWeight: 600 }}>{e.status}</td>
              <td style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {e.status === "draft" && <Link to={`/estimates/${e._id}/edit`}>Edit</Link>}
                <button onClick={() => download(e)}>PDF</button>
                {["draft", "sent", "rejected"].includes(e.status) && (
                  <button onClick={() => send(e._id)}>{e.status === "draft" ? "Send" : "Resend"}</button>
                )}
                {e.status !== "accepted" && <button onClick={() => del(e._id)}>Delete</button>}
              </td>
            </tr>
          ))}
          {!items.length && <tr><td colSpan="7" align="center">No estimates</td></tr>}
        </tbody>
      </table>
    </div>
  );
}