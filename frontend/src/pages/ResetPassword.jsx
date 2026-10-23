import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../api/axios";

const ResetPassword = () => {
  const { token } = useParams();
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(""); setMsg("");
    try {
      const res = await api.post(`/auth/reset-password/${token}`, { password });
      setMsg(res.data.message);
    } catch (err) {
      setError(err.response?.data?.message || "Failed");
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: "40px auto" }}>
      <h2>Reset Password</h2>
      <form onSubmit={onSubmit}>
        <input type="password" placeholder="New password" required onChange={(e) => setPassword(e.target.value)} />
        <button type="submit">Reset</button>
      </form>
      {msg && <p style={{ color: "green" }}>{msg} <Link to="/login">Login</Link></p>}
      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
};

export default ResetPassword;