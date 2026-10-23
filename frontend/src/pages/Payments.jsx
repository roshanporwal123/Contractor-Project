import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";

const colors = {
  succeeded: "#16a34a", pending: "#ca8a04", failed: "#dc2626",
  partially_refunded: "#2563eb", refunded: "#6b7280",
};

export default function Payments() {
  const [data, setData] = useState({ payments: [], summary: {}, pagination: {} });
  const [pendingRefunds, setPendingRefunds] = useState([]);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");

  const load = async () => {
    const [p, r] = await Promise.all([
      api.get("/payments", { params: { status, search, page, limit: 10 } }),
      api.get("/payments/refunds/pending"),
    ]);
    setData(p.data);
    setPendingRefunds(r.data.payments);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [status, page]);

  const requestRefund = async (p) => {
    const max = (p.amount - p.refundedAmount).toFixed(2);
    const amount = window.prompt(`Refund amount (max $${max})`, max);
    if (!amount) return;
    const reason = window.prompt("Reason?") || "";
    try {
      await api.post(`/payments/${p._id}/refunds`, { amount: Number(amount), reason });
      setError("");
      load();
    } catch (err) { setError(err.response?.data?.message || "Failed"); }
  };

  const approve = async (p, r) => {
    if (!window.confirm(`$${r.amount} Stripe se refund karna hai?`)) return;
    try {
      await api.patch(`/payments/${p._id}/refunds/${r._id}/approve`);
      setError("");
      load();
    } catch (err) { setError(err.response?.data?.message || "Failed"); }
  };

  const reject = async (p, r) => {
    const note = window.prompt("Reject karne ka reason?") || "";
    await api.patch(`/payments/${p._id}/refunds/${r._id}/reject`, { note });
    load();
  };

  const s = data.summary || {};
  const net = (s.received || 0) - (s.refunded || 0);

  return (
    <div style={{ padding: 24 }}>
      <h2>Payments</h2>
      {error && <p style={{ color: "red" }}>{error}</p>}

      <div style={{ display: "flex", gap: 16, margin: "16px 0" }}>
        <Card label="Received" value={s.received} />
        <Card label="Refunded" value={s.refunded} />
        <Card label="Net" value={net} />
        <Card label="Pending" value={s.pending} />
      </div>

      {pendingRefunds.length > 0 && (
        <div style={{ border: "1px solid #f59e0b", borderRadius: 8, padding: 12, marginBottom: 16 }}>
          <h4>Pending Refund Requests</h4>
          {pendingRefunds.map((p) =>
            p.refunds.filter((r) => r.status === "requested").map((r) => (
              <div key={r._id} style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 6 }}>
                <span>{p.invoiceNumber} | {p.payerName} | <strong>${r.amount.toFixed(2)}</strong> | {r.reason || "-"}</span>
                <button onClick={() => approve(p, r)}>Approve</button>
                <button onClick={() => reject(p, r)}>Reject</button>
              </div>
            ))
          )}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input placeholder="Invoice # ya payer name" value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (setPage(1), load())} />
        <select value={status} onChange={(e) => { setPage(1); setStatus(e.target.value); }}>
          <option value="">All</option>
          <option value="pending">Pending</option>
          <option value="succeeded">Succeeded</option>
          <option value="failed">Failed</option>
          <option value="partially_refunded">Partially refunded</option>
          <option value="refunded">Refunded</option>
        </select>
        <button onClick={() => { setPage(1); load(); }}>Search</button>
      </div>

      <table width="100%" cellPadding={8} style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>
            <th>Date</th><th>Invoice</th><th>Payer</th><th>Amount</th><th>Refunded</th><th>Status</th><th></th>
          </tr>
        </thead>
        <tbody>
          {data.payments.map((p) => (
            <tr key={p._id} style={{ borderBottom: "1px solid #eee" }}>
              <td>{new Date(p.createdAt).toLocaleDateString()}</td>
              <td><Link to={`/invoices/${p.invoice}`}>{p.invoiceNumber}</Link></td>
              <td>{p.payerName}</td>
              <td>${p.amount.toFixed(2)}</td>
              <td>${p.refundedAmount.toFixed(2)}</td>
              <td>
                <span style={{ color: "#fff", background: colors[p.status], padding: "2px 8px", borderRadius: 10, fontSize: 12 }}>
                  {p.status.replace("_", " ")}
                </span>
                {p.failureReason && <div style={{ fontSize: 11, color: "#dc2626" }}>{p.failureReason}</div>}
              </td>
              <td>
                {["succeeded", "partially_refunded"].includes(p.status) && (
                  <button onClick={() => requestRefund(p)}>Refund</button>
                )}
              </td>
            </tr>
          ))}
          {!data.payments.length && <tr><td colSpan={7}>Koi payment nahi mili</td></tr>}
        </tbody>
      </table>

      <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
        <button disabled={page <= 1} onClick={() => setPage(page - 1)}>Prev</button>
        <span>Page {page} / {data.pagination?.pages || 1}</span>
        <button disabled={page >= (data.pagination?.pages || 1)} onClick={() => setPage(page + 1)}>Next</button>
      </div>
    </div>
  );
}

const Card = ({ label, value }) => (
  <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, minWidth: 140 }}>
    <div style={{ fontSize: 12, color: "#666" }}>{label}</div>
    <div style={{ fontSize: 20, fontWeight: 600 }}>${Number(value || 0).toFixed(2)}</div>
  </div>
);