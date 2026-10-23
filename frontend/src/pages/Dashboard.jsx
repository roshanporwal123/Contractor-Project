import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import ContractorDashboard from "./ContractorDashboard";
import CustomerDashboard from "./CustomerDashboard";
import AdminDashboard from "./AdminDashboard";

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const onLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div style={{ maxWidth: 600, margin: "40px auto" }}>
      <h2>Welcome, {user.name}</h2>
      <p>Role: <b>{user.role}</b></p>
      {user.role === "admin" && <AdminDashboard />}
      {user.role === "contractor" && <ContractorDashboard />}
      {user.role === "customer" && <CustomerDashboard />}
      <button onClick={onLogout}>Logout</button>
    </div>
  );
};

export default Dashboard;