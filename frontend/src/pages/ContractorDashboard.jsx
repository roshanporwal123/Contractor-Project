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

export default function ContractorDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/contractor-portal/dashboard")
      .then((res) => setData(res.data))
      .catch((e) => setError(e.response?.data?.message || "Data load nahi hua"));
  }, []);

  if (error) return <p style={{ color: "red" }}>{error}</p>;
  if (!data) return <p>Loading...</p>;

  const { contractor: c, stats, projects, tasks, payouts, timeEntries } = data;

  return (
    <div>
      {/* ---------- Stat cards ---------- */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Card label="Status" value={stats.status} />
        <Card label="Hourly Rate" value={`₹${stats.hourlyRate}`} />
        <Card label="Experience" value={`${stats.experienceYears} yrs`} />
        <Card label="Rating" value={stats.averageRating} />
        <Card label="Documents" value={stats.totalDocuments} />
        <Card label="Total Projects" value={stats.totalProjects} />
        <Card label="Active Projects" value={stats.activeProjects} />
        <Card label="Completed" value={stats.completedProjects} />
        <Card label="Pending Tasks" value={stats.pendingTasks} />
        <Card label="Completed Tasks" value={stats.completedTasks} />
        <Card label="Overdue Tasks" value={stats.overdueTasks} />
        <Card label="Total Earned" value={`₹${stats.totalEarned}`} />
        <Card label="Pending Payout" value={`₹${stats.pendingPayout}`} />
        <Card label="Total Hours" value={stats.totalHours} />
        <Card label="Overtime Hours" value={stats.overtimeHours} />
      </div>

      {/* ---------- Projects ---------- */}
      <Section title="My Projects">
        <table border="1" cellPadding="6">
          <thead>
            <tr>
              <th>Project</th><th>Client</th><th>Location</th>
              <th>Start</th><th>End</th><th>Status</th><th>Progress</th>
            </tr>
          </thead>
          <tbody>
            {projects.length === 0 && (
              <tr><td colSpan="7">Abhi koi project assign nahi hua</td></tr>
            )}
            {projects.map((p) => (
              <tr key={p._id}>
                <td>{p.name}</td>
                <td>{p.client?.name || "-"}</td>
                <td>{[p.location?.city, p.location?.state].filter(Boolean).join(", ") || "-"}</td>
                <td>{fmt(p.startDate)}</td>
                <td>{fmt(p.endDate)}</td>
                <td>{p.status.replace("_", " ")}</td>
                <td>{p.progress}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      {/* ---------- Tasks ---------- */}
      <Section title="My Tasks">
        <table border="1" cellPadding="6">
          <thead>
            <tr>
              <th>Task</th><th>Project</th><th>Priority</th>
              <th>Due</th><th>Status</th><th>Progress</th>
            </tr>
          </thead>
          <tbody>
            {tasks.length === 0 && (
              <tr><td colSpan="6">Abhi koi task assign nahi hua</td></tr>
            )}
            {tasks.map((t) => (
              <tr key={t._id}>
                <td>{t.title}</td>
                <td>{t.project?.name || "-"}</td>
                <td>{t.priority}</td>
                <td>{fmt(t.dueDate)}</td>
                <td>{t.status.replace("_", " ")}</td>
                <td>{t.progress}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      {/* ---------- Payouts ---------- */}
      <Section title="My Payouts">
        <table border="1" cellPadding="6">
          <thead>
            <tr>
              <th>Date</th><th>Project</th><th>Amount</th>
              <th>Method</th><th>Status</th><th>Paid On</th><th>Reference</th>
            </tr>
          </thead>
          <tbody>
            {payouts.length === 0 && (
              <tr><td colSpan="7">Abhi koi payout nahi hai</td></tr>
            )}
            {payouts.map((p) => (
              <tr key={p._id}>
                <td>{fmt(p.createdAt)}</td>
                <td>{p.project?.name || "-"}</td>
                <td>₹{p.amount}</td>
                <td>{p.method.replace("_", " ")}</td>
                <td>{p.status}</td>
                <td>{fmt(p.paidAt)}</td>
                <td>{p.reference || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      {/* ---------- Time entries ---------- */}
      <Section title="My Time Entries">
        <table border="1" cellPadding="6">
          <thead>
            <tr>
              <th>Date</th><th>Project</th><th>Task</th>
              <th>Clock In</th><th>Clock Out</th><th>Hours</th>
              <th>Overtime</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            {timeEntries.length === 0 && (
              <tr><td colSpan="8">Abhi koi time entry nahi hai</td></tr>
            )}
            {timeEntries.map((t) => (
              <tr key={t._id}>
                <td>{fmt(t.clockIn)}</td>
                <td>{t.project?.name || "-"}</td>
                <td>{t.task?.title || "-"}</td>
                <td>{new Date(t.clockIn).toLocaleTimeString()}</td>
                <td>{t.clockOut ? new Date(t.clockOut).toLocaleTimeString() : "Running"}</td>
                <td>{t.hoursWorked}</td>
                <td>{t.overtimeHours}</td>
                <td>{t.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      {/* ---------- Profile ---------- */}
      <Section title="Profile">
        <p><b>Name:</b> {c.name}</p>
        <p><b>Business:</b> {c.businessName || "-"}</p>
        <p><b>Specialization:</b> {c.specialization || "-"}</p>
        <p><b>Bio:</b> {c.bio || "-"}</p>
        <p><b>Skills:</b> {c.skills?.join(", ") || "-"}</p>
      </Section>

      {/* ---------- Contact ---------- */}
      <Section title="Contact">
        <p><b>Email:</b> {c.email}</p>
        <p><b>Phone:</b> {c.phone || "-"}</p>
        <p>
          <b>Address:</b>{" "}
          {[c.address?.street, c.address?.city, c.address?.state, c.address?.zip, c.address?.country]
            .filter(Boolean)
            .join(", ") || "-"}
        </p>
        <p><b>Service Areas:</b> {c.serviceAreas?.join(", ") || "-"}</p>
      </Section>

      {/* ---------- License ---------- */}
      <Section title="License">
        <p><b>Number:</b> {c.license?.number || "-"}</p>
        <p><b>Issued By:</b> {c.license?.issuedBy || "-"}</p>
        <p><b>Issue Date:</b> {fmt(c.license?.issueDate)}</p>
        <p><b>Expiry:</b> {fmt(c.license?.expiryDate)}</p>
      </Section>

      {/* ---------- Insurance ---------- */}
      <Section title="Insurance">
        <p><b>Provider:</b> {c.insurance?.provider || "-"}</p>
        <p><b>Policy #:</b> {c.insurance?.policyNumber || "-"}</p>
        <p><b>Coverage:</b> {c.insurance?.coverageAmount ? `₹${c.insurance.coverageAmount}` : "-"}</p>
        <p><b>Expiry:</b> {fmt(c.insurance?.expiryDate)}</p>
      </Section>

      {/* ---------- Documents ---------- */}
      <Section title="Documents">
        <table border="1" cellPadding="6">
          <thead><tr><th>Name</th><th>Type</th><th>Uploaded</th></tr></thead>
          <tbody>
            {c.documents.length === 0 && (
              <tr><td colSpan="3">Koi document nahi hai</td></tr>
            )}
            {c.documents.map((d) => (
              <tr key={d._id}>
                <td><a href={d.url} target="_blank" rel="noreferrer">{d.name}</a></td>
                <td>{d.type}</td>
                <td>{fmt(d.uploadedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>
    </div>
  );
}