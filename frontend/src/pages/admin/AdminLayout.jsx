import { NavLink, Outlet, Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "./admin.css";

const links = [
  ["/admin", "Dashboard", true],
  ["/admin/users", "Users"],
  ["/admin/companies", "Companies"],
  ["/admin/contractors", "Contractors"],
  ["/admin/projects", "Projects"],
  ["/admin/services", "Services"],
  ["/admin/payments", "Payments"],
  ["/admin/invoices", "Invoices"],
  ["/admin/documents", "Documents"],
  ["/admin/reviews", "Reviews"],
  ["/admin/subscriptions", "Subscriptions"],
  ["/admin/reports", "Reports"],
  ["/admin/settings", "System Settings"],
];

export default function AdminLayout() {
  const { user, loading } = useAuth();

  if (loading) return <p style={{ padding: 20 }}>Loading...</p>;
  if (!user || user.role !== "admin") return <Navigate to="/login" replace />;

  return (
    <div className="adm-wrap">
      <aside className="adm-side">
        <h2>Admin Panel</h2>
        {links.map(([to, label, end]) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => (isActive ? "active" : "")}>
            {label}
          </NavLink>
        ))}
      </aside>
      <main className="adm-main">
        <Outlet />
      </main>
    </div>
  );
}