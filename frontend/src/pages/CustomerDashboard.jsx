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

export default function CustomerDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/customer-portal/dashboard")
      .then((res) => setData(res.data))
      .catch((e) => setError(e.response?.data?.message || "Data load nahi hua"));
  }, []);

  if (error) return <p style={{ color: "red" }}>{error}</p>;
  if (!data) return <p>Loading...</p>;

  const { stats, contractors, projects, tasks, invoices, payouts, timeEntries } = data;

  return (
    <div>
      {/* ---------- Stat cards ---------- */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Card label="Contractors" value={stats.totalContractors} />
        <Card label="Active Contractors" value={stats.activeContractors} />
        <Card label="Total Projects" value={stats.totalProjects} />
        <Card label="Active Projects" value={stats.activeProjects} />
        <Card label="Completed Projects" value={stats.completedProjects} />
        <Card label="Pending Tasks" value={stats.pendingTasks} />
        <Card label="Completed Tasks" value={stats.completedTasks} />
        <Card label="Overdue Tasks" value={stats.overdueTasks} />
        <Card label="Total Invoiced" value={`₹${stats.totalInvoiced}`} />
        <Card label="Received" value={`₹${stats.totalReceived}`} />
        <Card label="Outstanding" value={`₹${stats.outstanding}`} />
        <Card label="Overdue Invoices" value={stats.overdueInvoices} />
        <Card label="Payouts Paid" value={`₹${stats.payoutsPaid}`} />
        <Card label="Payouts Pending" value={`₹${stats.payoutsPending}`} />
        <Card label="Hours To Approve" value={stats.hoursToApprove} />
      </div>

      {/* ---------- Projects ---------- */}
      <Section title="Recent Projects">
        <table border="1" cellPadding="6">
          <thead>
            <tr>
              <th>Project</th><th>Client</th><th>Start</th><th>End</th>
              <th>Budget</th><th>Contractors</th><th>Status</th><th>Progress</th>
            </tr>
          </thead>
          <tbody>
            {projects.length === 0 && <tr><td colSpan="8">Koi project nahi hai</td></tr>}
            {projects.map((p) => (
              <tr key={p._id}>
                <td>{p.name}</td>
                <td>{p.client?.name || "-"}</td>
                <td>{fmt(p.startDate)}</td>
                <td>{fmt(p.endDate)}</td>
                <td>₹{p.budget}</td>
                <td>{p.contractors?.length || 0}</td>
                <td>{label(p.status)}</td>
                <td>{p.progress}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      {/* ---------- Contractors ---------- */}
      <Section title="Contractors">
        <table border="1" cellPadding="6">
          <thead>
            <tr>
              <th>Name</th><th>Business</th><th>Email</th><th>Phone</th>
              <th>Specialization</th><th>Rate</th><th>Rating</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            {contractors.length === 0 && <tr><td colSpan="8">Koi contractor nahi hai</td></tr>}
            {contractors.map((c) => (
              <tr key={c._id}>
                <td>{c.name}</td>
                <td>{c.businessName || "-"}</td>
                <td>{c.email}</td>
                <td>{c.phone || "-"}</td>
                <td>{c.specialization || "-"}</td>
                <td>₹{c.hourlyRate}</td>
                <td>{c.averageRating}</td>
                <td>{c.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      {/* ---------- Tasks ---------- */}
      <Section title="Recent Tasks">
        <table border="1" cellPadding="6">
          <thead>
            <tr>
              <th>Task</th><th>Project</th><th>Assigned To</th><th>Priority</th>
              <th>Due</th><th>Status</th><th>Progress</th>
            </tr>
          </thead>
          <tbody>
            {tasks.length === 0 && <tr><td colSpan="7">Koi task nahi hai</td></tr>}
            {tasks.map((t) => (
              <tr key={t._id}>
                <td>{t.title}</td>
                <td>{t.project?.name || "-"}</td>
                <td>{t.assignedTo?.name || "Unassigned"}</td>
                <td>{t.priority}</td>
                <td>{fmt(t.dueDate)}</td>
                <td>{label(t.status)}</td>
                <td>{t.progress}%</td>
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
              <th>Invoice #</th><th>Client</th><th>Project</th><th>Due</th>
              <th>Total</th><th>Paid</th><th>Balance</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            {invoices.length === 0 && <tr><td colSpan="8">Koi invoice nahi hai</td></tr>}
            {invoices.map((i) => (
              <tr key={i._id}>
                <td>{i.invoiceNumber}</td>
                <td>{i.client?.name || "-"}</td>
                <td>{i.project?.name || "-"}</td>
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
              <th>Date</th><th>Contractor</th><th>Project</th>
              <th>Amount</th><th>Method</th><th>Status</th><th>Paid On</th>
            </tr>
          </thead>
          <tbody>
            {payouts.length === 0 && <tr><td colSpan="7">Koi payout nahi hai</td></tr>}
            {payouts.map((p) => (
              <tr key={p._id}>
                <td>{fmt(p.createdAt)}</td>
                <td>{p.contractor?.name || "-"}</td>
                <td>{p.project?.name || "-"}</td>
                <td>₹{p.amount}</td>
                <td>{label(p.method)}</td>
                <td>{p.status}</td>
                <td>{fmt(p.paidAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      {/* ---------- Time entries ---------- */}
      <Section title="Recent Time Entries">
        <table border="1" cellPadding="6">
          <thead>
            <tr>
              <th>Date</th><th>Worker</th><th>Project</th>
              <th>Hours</th><th>Overtime</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            {timeEntries.length === 0 && <tr><td colSpan="6">Koi time entry nahi hai</td></tr>}
            {timeEntries.map((t) => (
              <tr key={t._id}>
                <td>{fmt(t.clockIn)}</td>
                <td>{t.contractor?.name || "-"}</td>
                <td>{t.project?.name || "-"}</td>
                <td>{t.hoursWorked}</td>
                <td>{t.overtimeHours}</td>
                <td>{t.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>
    </div>
  );
}