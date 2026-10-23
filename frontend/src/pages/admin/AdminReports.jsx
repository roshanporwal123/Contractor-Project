import { useEffect, useState } from "react";
import api from "../../api/axios";

function Bars({ title, rows, labelKey = "label", valueKey = "total" }) {
  const max = Math.max(1, ...rows.map((r) => r[valueKey]));
  return (
    <div className="adm-box">
      <h3>{title}</h3>
      {rows.length === 0 && <p>No data</p>}
      {rows.map((r, i) => (
        <div className="bar-row" key={i}>
          <span className="bar-label">{String(r[labelKey] ?? r._id ?? "N/A")}</span>
          <div className="bar-track">
            <div className="bar-fill" style={{ width: `${(r[valueKey] / max) * 100}%` }} />
          </div>
          <span className="bar-val">{r[valueKey]}</span>
        </div>
      ))}
    </div>
  );
}

export default function AdminReports() {
  const [d, setD] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/admin/reports")
      .then((res) => setD(res.data))
      .catch((e) => setError(e.response?.data?.message || "Failed to load"));
  }, []);

  if (error) return <p className="adm-error">{error}</p>;
  if (!d) return <p>Loading...</p>;

  return (
    <div>
      <h1>Reports</h1>
      <div className="adm-two">
        <Bars title="User Growth (12 months)" rows={d.userGrowth} />
        <Bars title="Revenue (12 months)" rows={d.revenue} />
        <Bars title="Projects Created (12 months)" rows={d.projectGrowth} />
        <Bars title="Users by Role" rows={d.usersByRole} valueKey="count" />
        <Bars title="Projects by Status" rows={d.projectsByStatus} valueKey="count" />
        <Bars title="Invoices by Status" rows={d.invoicesByStatus} valueKey="count" />
        <Bars title="Subscriptions by Plan" rows={d.subsByPlan} valueKey="count" />
      </div>
    </div>
  );
}