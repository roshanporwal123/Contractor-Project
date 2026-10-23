import { useEffect, useState } from "react";
import api from "../api/axios";

const Card = ({ label, value }) => (
  <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 16, minWidth: 150 }}>
    <div style={{ fontSize: 13, color: "#666" }}>{label}</div>
    <div style={{ fontSize: 22, fontWeight: 700 }}>{value}</div>
  </div>
);

const Section = ({ title, children }) => (
  <div style={{ marginTop: 28, overflowX: "auto" }}>
    <h3>{title}</h3>
    {children}
  </div>
);

const fmt = (d) => (d ? new Date(d).toLocaleDateString() : "-");
const label = (s) => (s ? s.replace("_", " ") : "-");

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/admin-portal/dashboard")
      .then((res) => setData(res.data))
      .catch((e) => setError(e.response?.data?.message || "Data load nahi hua"));
  }, []);

  if (error) return <p style={{ color: "red" }}>{error}</p>;
  if (!data) return <p>Loading...</p>;

  const { stats, users, companies, contractors, projects, invoices, payouts } = data;

  return (
    <div>
      {/* ---------- Stat cards ---------- */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Card label="Total Users" value={stats.totalUsers} />
        <Card label="Admins" value={stats.adminUsers} />
        <Card label="Customers" value={stats.customerUsers} />
        <Card label="Contractor Logins" value={stats.contractorUsers} />
        <Card label="Companies" value={stats.totalCompanies} />
        <Card label="Contractors" value={stats.totalContractors} />
        <Card label="Active Contractors" value={stats.activeContractors} />
        <Card label="Total Projects" value={stats.totalProjects} />
        <Card label="Active Projects" value={stats.activeProjects} />
        <Card label="Completed Projects" value={stats.completedProjects} />
        <Card label="Total Tasks" value={stats.totalTasks} />
        <Card label="Completed Tasks" value={stats.completedTasks} />
        <Card label="Time Entries Pending" value={stats.pendingTimeEntries} />
        <Card label="Total Invoices" value={stats.totalInvoices} />
        <Card label="Total Invoiced" value={`₹${stats.totalInvoiced}`} />
        <Card label="Received" value={`₹${stats.totalReceived}`} />
        <Card label="Outstanding" value={`₹${stats.outstanding}`} />
        <Card label="Payouts Paid" value={`₹${stats.payoutsPaid}`} />
        <Card label="Payouts Pending" value={`₹${stats.payoutsPending}`} />
      </div>

      {/* ---------- Users ---------- */}
      <Section title="Recent Users">
        <table border="1" cellPadding="6">
          <thead>
            <tr><th>Name</th><th>Email</th><th>Role</th><th>Joined</th></tr>
          </thead>
          <tbody>
            {users.length === 0 && <tr><td colSpan="4">Koi user nahi hai</td></tr>}
            {users.map((u) => (
              <tr key={u._id}>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td>{u.role}</td>
                <td>{fmt(u.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      {/* ---------- Companies ---------- */}
      <Section title="Recent Companies">
        <table border="1" cellPadding="6">
          <thead>
            <tr><th>Company</th><th>Email</th><th>Phone</th><th>Owner</th><th>Created</th></tr>
          </thead>
          <tbody>
            {companies.length === 0 && <tr><td colSpan="5">Koi company nahi hai</td></tr>}
            {companies.map((c) => (
              <tr key={c._id}>
                <td>{c.name}</td>
                <td>{c.email || "-"}</td>
                <td>{c.phone || "-"}</td>
                <td>{c.owner?.name || "-"} ({c.owner?.email || "-"})</td>
                <td>{fmt(c.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      {/* ---------- Contractors ---------- */}
      <Section title="Recent Contractors">
        <table border="1" cellPadding="6">
          <thead>
            <tr>
              <th>Name</th><th>Email</th><th>Company</th>
              <th>Specialization</th><th>Rate</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            {contractors.length === 0 && <tr><td colSpan="6">Koi contractor nahi hai</td></tr>}
            {contractors.map((c) => (
              <tr key={c._id}>
                <td>{c.name}</td>
                <td>{c.email}</td>
                <td>{c.company?.name || "-"}</td>
                <td>{c.specialization || "-"}</td>
                <td>₹{c.hourlyRate}</td>
                <td>{c.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      {/* ---------- Projects ---------- */}
      <Section title="Recent Projects">
        <table border="1" cellPadding="6">
          <thead>
            <tr>
              <th>Project</th><th>Company</th><th>Client</th><th>Start</th>
              <th>End</th><th>Budget</th><th>Status</th><th>Progress</th>
            </tr>
          </thead>
          <tbody>
            {projects.length === 0 && <tr><td colSpan="8">Koi project nahi hai</td></tr>}
            {projects.map((p) => (
              <tr key={p._id}>
                <td>{p.name}</td>
                <td>{p.company?.name || "-"}</td>
                <td>{p.client?.name || "-"}</td>
                <td>{fmt(p.startDate)}</td>
                <td>{fmt(p.endDate)}</td>
                <td>₹{p.budget}</td>
                <td>{label(p.status)}</td>
                <td>{p.progress}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      {/* ---------- Invoices ---------- */}
      <Section title="Recent Invoices">
        <table border="1" cellPadding="6">
          <thead>
            <tr>
              <th>Invoice #</th><th>Company</th><th>Client</th><th>Due</th>
              <th>Total</th><th>Paid</th><th>Balance</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            {invoices.length === 0 && <tr><td colSpan="8">Koi invoice nahi hai</td></tr>}
            {invoices.map((i) => (
              <tr key={i._id}>
                <td>{i.invoiceNumber}</td>
                <td>{i.company?.name || "-"}</td>
                <td>{i.client?.name || "-"}</td>
                <td>{fmt(i.dueDate)}</td>
                <td>₹{i.total}</td>
                <td>₹{i.amountPaid}</td>
                <td>₹{i.balanceDue}</td>
                <td>{i.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      {/* ---------- Payouts ---------- */}
      <Section title="Recent Payouts">
        <table border="1" cellPadding="6">
          <thead>
            <tr>
              <th>Date</th><th>Company</th><th>Contractor</th>
              <th>Amount</th><th>Method</th><th>Status</th><th>Paid On</th>
            </tr>
          </thead>
          <tbody>
            {payouts.length === 0 && <tr><td colSpan="7">Koi payout nahi hai</td></tr>}
            {payouts.map((p) => (
              <tr key={p._id}>
                <td>{fmt(p.createdAt)}</td>
                <td>{p.company?.name || "-"}</td>
                <td>{p.contractor?.name || "-"}</td>
                <td>₹{p.amount}</td>
                <td>{label(p.method)}</td>
                <td>{p.status}</td>
                <td>{fmt(p.paidAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>
    </div>
  );
}