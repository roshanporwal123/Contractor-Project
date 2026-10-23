// import { useState } from "react";
// import { Link, useNavigate } from "react-router-dom";
// import { useAuth } from "../context/AuthContext";

// const Login = () => {
//   const { login } = useAuth();
//   const navigate = useNavigate();
//   const [role, setRole] = useState("customer");
//   const [form, setForm] = useState({ email: "", password: "" });
//   const [error, setError] = useState("");

//   const onSubmit = async (e) => {
//     e.preventDefault();
//     setError("");
//     try {
//       await login(form.email, form.password, role);
//       navigate("/dashboard");
//     } catch (err) {
//       setError(err.response?.data?.message || "Login failed");
//     }
//   };

//   return (
//     <div style={{ maxWidth: 400, margin: "40px auto" }}>
//       <h2>Login</h2>
//       <div>
//         {["customer", "contractor", "admin"].map((r) => (
//           <button
//             key={r}
//             type="button"
//             onClick={() => setRole(r)}
//             style={{ fontWeight: role === r ? "bold" : "normal" }}
//           >
//             {r}
//           </button>
//         ))}
//       </div>
//       <form onSubmit={onSubmit}>
//         <input
//           type="email" placeholder="Email" required
//           onChange={(e) => setForm({ ...form, email: e.target.value })}
//         />
//         <input
//           type="password" placeholder="Password" required
//           onChange={(e) => setForm({ ...form, password: e.target.value })}
//         />
//         <button type="submit">Login as {role}</button>
//       </form>
//       {error && <p style={{ color: "red" }}>{error}</p>}
//       <p><Link to="/forgot-password">Forgot password?</Link></p>
//       {role !== "admin" && <p>New here? <Link to="/register">Sign up</Link></p>}
//     </div>
//   );
// };

// export default Login;

// import { useState } from "react";
// import { Link, useNavigate } from "react-router-dom";
// import { useAuth } from "../context/AuthContext";
// import "./AuthPage.css";

// const Login = () => {
//   const { login } = useAuth();
//   const navigate = useNavigate();
//   const [role, setRole] = useState("customer");
//   const [form, setForm] = useState({ email: "", password: "" });
//   const [error, setError] = useState("");

//   const onSubmit = async (e) => {
//     e.preventDefault();
//     setError("");
//     try {
//       await login(form.email, form.password, role);
//       navigate("/dashboard");
//     } catch (err) {
//       setError(err.response?.data?.message || "Login failed");
//     }
//   };

//   return (
//     <div className="auth-page">
//       <div className="auth-card" style={{ width: "100%", maxWidth: 400 }}>
//         <h2>Login</h2>
//         <div>
//           {["customer", "contractor", "admin"].map((r) => (
//             <button
//               key={r}
//               type="button"
//               onClick={() => setRole(r)}
//               style={{ fontWeight: role === r ? 700 : 400 }}
//             >
//               {r}
//             </button>
//           ))}
//         </div>
//         <form onSubmit={onSubmit}>
//           <input
//             type="email" placeholder="Email" required
//             onChange={(e) => setForm({ ...form, email: e.target.value })}
//           />
//           <input
//             type="password" placeholder="Password" required
//             onChange={(e) => setForm({ ...form, password: e.target.value })}
//           />
//           <button type="submit">Login as {role}</button>
//         </form>
//         {error && <p style={{ color: "#fff3f3", fontWeight: "bold" }}>{error}</p>}
//         <p><Link to="/forgot-password">Forgot password?</Link></p>
//         {role !== "admin" && <p>New here? <Link to="/register">Sign up</Link></p>}
//       </div>
//     </div>
//   );
// };

// export default Login;

// import { useState } from "react";
// import { Link, useNavigate } from "react-router-dom";
// import { useAuth } from "../context/AuthContext";
// import "./AuthPage.css";

// const Login = () => {
//   const { login } = useAuth();
//   const navigate = useNavigate();
//   const [role, setRole] = useState("customer");
//   const [form, setForm] = useState({ email: "", password: "" });
//   const [error, setError] = useState("");
//   const [showPassword, setShowPassword] = useState(false);

//   const onSubmit = async (e) => {
//     e.preventDefault();
//     setError("");
//     try {
//       await login(form.email, form.password, role);
//       navigate("/dashboard");
//     } catch (err) {
//       setError(err.response?.data?.message || "Login failed");
//     }
//   };

//   return (
//     <div className="auth-page">
//       <div className="auth-card">
//         <h2>Login</h2>
//         <div>
//           {["customer", "contractor", "admin"].map((r) => (
//             <button
//               key={r}
//               type="button"
//               onClick={() => setRole(r)}
//               style={{ fontWeight: role === r ? 700 : 400 }}
//             >
//               {r}
//             </button>
//           ))}
//         </div>

//         <form onSubmit={onSubmit}>
//           <input
//             type="email"
//             placeholder="Email"
//             required
//             onChange={(e) => setForm({ ...form, email: e.target.value })}
//           />

//           <div className="pw-wrap">
//             <input
//               type={showPassword ? "text" : "password"}
//               placeholder="Password"
//               required
//               onChange={(e) => setForm({ ...form, password: e.target.value })}
//             />
//             <button
//               type="button"
//               className="eye-btn"
//               onClick={() => setShowPassword(!showPassword)}
//               aria-label={showPassword ? "Hide password" : "Show password"}
//             >
//               {showPassword ? (
//                 <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
//                   <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
//                   <line x1="1" y1="1" x2="23" y2="23" />
//                 </svg>
//               ) : (
//                 <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
//                   <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
//                   <circle cx="12" cy="12" r="3" />
//                 </svg>
//               )}
//             </button>
//           </div>

//           <button type="submit">Login as {role}</button>
//         </form>

//         {error && <p style={{ color: "#fff3f3", fontWeight: "bold" }}>{error}</p>}
//         <p><Link to="/forgot-password">Forgot password?</Link></p>
//         {role !== "admin" && <p>New here? <Link to="/register">Sign up</Link></p>}
//       </div>
//     </div>
//   );
// };

// export default Login;

import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./AuthPage.css";

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState("customer");
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const videoRef = useRef(null);

  // Video hamesha chalti rahe
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = true;
    video.play().catch(() => {});

    const handlePause = () => video.play().catch(() => {});
    const handleEnded = () => {
      video.currentTime = 0;
      video.play().catch(() => {});
    };

    video.addEventListener("pause", handlePause);
    video.addEventListener("ended", handleEnded);

    return () => {
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("ended", handleEnded);
    };
  }, []);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await login(form.email, form.password, role);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    }
  };

  return (
    <div className="auth-page">
      {/* Background video */}
      {/* <video
        ref={videoRef}
        className="auth-bg-video"
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        disablePictureInPicture
        controls={false}
      >
        <source src="/bg-video1.mp4" type="video/mp4" />
      </video> */}
      <img src="/img2.jpg" alt= "" className="auth-bg-video" />
      <div className="auth-video-overlay" />

      <div className="auth-card">
        <h2>Login</h2>
        <div>
          {["customer", "contractor", "admin"].map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              style={{ fontWeight: role === r ? 700 : 400 }}
            >
              {r}
            </button>
          ))}
        </div>

        <form onSubmit={onSubmit}>
          <input
            type="email"
            placeholder="Email"
            required
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />

          <div className="pw-wrap">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              required
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
            <button
              type="button"
              className="eye-btn"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>

          <button type="submit" className="login-submit-btn">
            Login as {role}
          </button>
        </form>

        {error && <p style={{ color: "#fff3f3", fontWeight: "bold" }}>{error}</p>}
        <p><Link to="/forgot-password">Forgot password?</Link></p>
        {role !== "admin" && <p>New here? <Link to="/register">Sign up</Link></p>}
      </div>
    </div>
  );
};

export default Login;