import { useState } from "react";
import api from "../api/axios";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    const res = await api.post("/auth/forgot-password", { email });
    setMsg(res.data.message);
  };

  return (
    <div style={{ maxWidth: 400, margin: "40px auto" }}>
      <h2>Forgot Password</h2>
      <form onSubmit={onSubmit}>
        <input type="email" placeholder="Your email" required onChange={(e) => setEmail(e.target.value)} />
        <button type="submit">Send reset link</button>
      </form>
      {msg && <p style={{ color: "green" }}>{msg}</p>}
    </div>
  );
};

export default ForgotPassword;