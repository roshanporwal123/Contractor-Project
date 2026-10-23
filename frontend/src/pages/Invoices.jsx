import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";

const colors = {
  paid: "#16a34a", unpaid: "#ca8a04", partial: "#2563eb",
  overdue: "#dc2626", cancelled: "#6b7280",
};

export default function Invoices() {
  const [data, setData] = useState({ invoices: [], summary: {}, pagination: {} });
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/invoices", { params: { status, search, page, limit: 10 } });
      setData(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [status, page]);

  const s = data.summary || {};

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>Invoices</h2>
        <Link to="/invoices/new">+ New Invoice</Link>
      </div>

      <div style={{ display: "flex", gap: 16, margin: "16px 0" }}>
        <Card label="Total Billed" value={s.totalBilled} />
        <Card label="Total Paid" value={s.totalPaid} />
        <Card label="Outstanding" value={s.outstanding} />
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input
          placeholder="Search invoice # or client"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (setPage(1), load())}
        />
        <select value={status} onChange={(e) => { setPage(1); setStatus(e.target.value); }}>
          <option value="">All</option>
          <option value="unpaid">Unpaid</option>
          <option value="partial">Partial</option>
          <option value="paid">Paid</option>
          <option value="overdue">Overdue</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <button onClick={() => { setPage(1); load(); }}>Search</button>
      </div>

      {loading ? <p>Loading...</p> : (
        <table width="100%" cellPadding={8} style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>
              <th>Invoice #</th><th>Client</th><th>Project</th><th>Due</th>
              <th>Total</th><th>Balance</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            {data.invoices.map((i) => (
              <tr key={i._id} style={{ borderBottom: "1px solid #eee" }}>
                <td><Link to={`/invoices/${i._id}`}>{i.invoiceNumber}</Link></td>
                <td>{i.client?.name}</td>
                <td>{i.project?.name || "-"}</td>
                <td>{new Date(i.dueDate).toLocaleDateString()}</td>
                <td>${i.total.toFixed(2)}</td>
                <td>${i.balanceDue.toFixed(2)}</td>
                <td>
                  <span style={{ color: "#fff", background: colors[i.status], padding: "2px 8px", borderRadius: 10, fontSize: 12 }}>
                    {i.status}
                  </span>
                </td>
              </tr>
            ))}
            {!data.invoices.length && <tr><td colSpan={7}>Koi invoice nahi mila</td></tr>}
          </tbody>
        </table>
      )}

      <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
        <button disabled={page <= 1} onClick={() => setPage(page - 1)}>Prev</button>
        <span>Page {page} / {data.pagination?.pages || 1}</span>
        <button disabled={page >= (data.pagination?.pages || 1)} onClick={() => setPage(page + 1)}>Next</button>
      </div>
    </div>
  );
}

const Card = ({ label, value }) => (
  <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, minWidth: 150 }}>
    <div style={{ fontSize: 12, color: "#666" }}>{label}</div>
    <div style={{ fontSize: 20, fontWeight: 600 }}>${Number(value || 0).toFixed(2)}</div>
  </div>
);