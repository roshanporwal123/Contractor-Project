import { useEffect, useState } from "react";
import api from "../api/axios";

const colors = { pending: "#ca8a04", paid: "#16a34a", cancelled: "#6b7280" };
const nameOf = (c) => c?.name || c?.fullName || c?.user?.name || c?.email || c?._id || "-";
const empty = { contractor: "", project: "", amount: "", method: "bank_transfer", periodStart: "", periodEnd: "", note: "" };

export default function Payouts() {
  const [data, setData] = useState({ payouts: [], summary: {}, pagination: {} });
  const [byContractor, setByContractor] = useState([]);
  const [contractors, setContractors] = useState([]);
  const [projects, setProjects] = useState([]);
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [form, setForm] = useState(empty);
  const [error, setError] = useState("");

  const load = async () => {
    const [p, s] = await Promise.all([
      api.get("/payouts", { params: { status, page, limit: 10 } }),
      api.get("/payouts/summary"),
    ]);
    setData(p.data);
    setByContractor(s.data.summary);
  };

  useEffect(() => {
    api.get("/contractors").then((r) => setContractors(r.data.contractors || r.data.data || r.data || [])).catch(() => {});
    api.get("/projects").then((r) => setProjects(r.data.projects || r.data.data || r.data || [])).catch(() => {});
  }, []);
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [status, page]);

  const create = async (e) => {
    e.preventDefault();
    try {
      await api.post("/payouts", { ...form, amount: Number(form.amount) });
      setForm(empty);
      setError("");
      load();
    } catch (err) { setError(err.response?.data?.message || "Failed"); }
  };

  const markPaid = async (p) => {
    const reference = window.prompt("Transaction / cheque reference (optional)") ?? "";
    await api.patch(`/payouts/${p._id}/pay`, { reference });
    load();
  };
  const cancel = async (p) => {
    if (!window.confirm("Payout cancel karna hai?")) return;
    await api.patch(`/payouts/${p._id}/cancel`);
    load();
  };

  const s = data.summary || {};

  return (
    <div style={{ padding: 24 }}>
      <h2>Contractor Payouts</h2>
      {error && <p style={{ color: "red" }}>{error}</p>}

      <div style={{ display: "flex", gap: 16, margin: "16px 0" }}>
        <Card label="Pending" value={s.pending} />
        <Card label="Paid" value={s.paid} />
      </div>

      <form onSubmit={create} style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
        <select required value={form.contractor} onChange={(e) => setForm({ ...form, contractor: e.target.value })}>
          <option value="">-- Contractor --</option>
          {contractors.map((c) => <option key={c._id} value={c._id}>{nameOf(c)}</option>)}
        </select>
        <select value={form.project} onChange={(e) => setForm({ ...form, project: e.target.value })}>
          <option value="">-- Project (optional) --</option>
          {projects.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
        </select>
        <input required type="number" min="0.01" step="0.01" placeholder="Amount" value={form.amount}
          onChange={(e) => setForm({ ...form, amount: e.target.value })} />
        <select value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
          <option value="bank_transfer">Bank transfer</option>
          <option value="cash">Cash</option>
          <option value="cheque">Cheque</option>
          <option value="stripe">Stripe</option>
          <option value="other">Other</option>
        </select>
        <label>From <input type="date" value={form.periodStart} onChange={(e) => setForm({ ...form, periodStart: e.target.value })} /></label>
        <label>To <input type="date" value={form.periodEnd} onChange={(e) => setForm({ ...form, periodEnd: e.target.value })} /></label>
        <input placeholder="Note" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
        <button type="submit">+ Add Payout</button>
      </form>

      <h4>Contractor wise</h4>
      <table width="100%" cellPadding={6} style={{ borderCollapse: "collapse", marginBottom: 20 }}>
        <thead><tr style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>
          <th>Contractor</th><th>Pending</th><th>Paid</th><th>Payouts</th>
        </tr></thead>
        <tbody>
          {byContractor.map((r) => (
            <tr key={r.contractor?._id || Math.random()} style={{ borderBottom: "1px solid #eee" }}>
              <td>{nameOf(r.contractor)}</td>
              <td>${r.pending.toFixed(2)}</td>
              <td>${r.paid.toFixed(2)}</td>
              <td>{r.count}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <h4>All Payouts</h4>
        <select value={status} onChange={(e) => { setPage(1); setStatus(e.target.value); }}>
          <option value="">All</option>
          <option value="pending">Pending</option>
          <option value="paid">Paid</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>
      <table width="100%" cellPadding={8} style={{ borderCollapse: "collapse" }}>
        <thead><tr style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>
          <th>Contractor</th><th>Project</th><th>Period</th><th>Amount</th><th>Method</th><th>Status</th><th></th>
        </tr></thead>
        <tbody>
          {data.payouts.map((p) => (
            <tr key={p._id} style={{ borderBottom: "1px solid #eee" }}>
              <td>{nameOf(p.contractor)}</td>
              <td>{p.project?.name || "-"}</td>
              <td>
                {p.periodStart ? new Date(p.periodStart).toLocaleDateString() : "-"} –{" "}
                {p.periodEnd ? new Date(p.periodEnd).toLocaleDateString() : "-"}
              </td>
              <td>${p.amount.toFixed(2)}</td>
              <td>{p.method.replace("_", " ")}</td>
              <td>
                <span style={{ color: "#fff", background: colors[p.status], padding: "2px 8px", borderRadius: 10, fontSize: 12 }}>
                  {p.status}
                </span>
                {p.paidAt && <div style={{ fontSize: 11 }}>{new Date(p.paidAt).toLocaleDateString()} {p.reference && `(${p.reference})`}</div>}
              </td>
              <td>
                {p.status === "pending" && (
                  <>
                    <button onClick={() => markPaid(p)}>Mark Paid</button>{" "}
                    <button onClick={() => cancel(p)}>Cancel</button>
                  </>
                )}
              </td>
            </tr>
          ))}
          {!data.payouts.length && <tr><td colSpan={7}>Koi payout nahi hai</td></tr>}
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