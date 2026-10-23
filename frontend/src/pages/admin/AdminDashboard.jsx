import { useEffect, useState } from "react";
import api from "../../api/axios";

const cards = [
  ["users", "Total Users"],
  ["companies", "Companies"],
  ["contractors", "Contractors"],
  ["pendingContractors", "Pending Contractors"],
  ["projects", "Projects"],
  ["activeProjects", "Active Projects"],
  ["tasks", "Tasks"],
  ["invoices", "Invoices"],
  ["unpaidInvoices", "Unpaid / Overdue"],
  ["payments", "Payments"],
  ["documents", "Documents"],
  ["pendingReviews", "Pending Reviews"],
  ["subscriptions", "Subscriptions"],
  ["revenue", "Total Revenue"],
];

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/admin/dashboard")
      .then((res) => setData(res.data))
      .catch((e) => setError(e.response?.data?.message || "Failed to load"));
  }, []);

  if (error) return <p className="adm-error">{error}</p>;
  if (!data) return <p>Loading...</p>;

  return (
    <div>
      <h1>Dashboard</h1>
      <div className="adm-cards">
        {cards.map(([key, label]) => (
          <div className="adm-card" key={key}>
            <span>{label}</span>
            <strong>{data.stats[key]}</strong>
          </div>
        ))}
      </div>

      <div className="adm-two">
        <div className="adm-box">
          <h3>Recent Users</h3>
          <table>
            <tbody>
              {data.recentUsers.map((u) => (
                <tr key={u._id}>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td><span className="badge">{u.role}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="adm-box">
          <h3>Recent Payments</h3>
          <table>
            <tbody>
              {data.recentPayments.map((p) => (
                <tr key={p._id}>
                  <td>{p.amount}</td>
                  <td><span className="badge">{p.status}</span></td>
                  <td>{new Date(p.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}