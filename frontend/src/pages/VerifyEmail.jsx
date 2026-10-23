import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../api/axios";

const VerifyEmail = () => {
  const { token } = useParams();
  const [msg, setMsg] = useState("Verifying...");
  const called = useRef(false);

  useEffect(() => {
    if (called.current) return; // StrictMode double call se bachne ke liye
    called.current = true;
    api
      .get(`/auth/verify-email/${token}`)
      .then((res) => setMsg(res.data.message))
      .catch((err) => setMsg(err.response?.data?.message || "Verification failed"));
  }, [token]);

  return (
    <div style={{ maxWidth: 400, margin: "40px auto" }}>
      <h2>Email Verification</h2>
      <p>{msg}</p>
      <Link to="/login">Go to Login</Link>
    </div>
  );
};

export default VerifyEmail;