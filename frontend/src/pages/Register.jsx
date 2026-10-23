// import { useState } from "react";
// import { Link } from "react-router-dom";
// import api from "../api/axios";
// import "./AuthPage.css";

// const Register = () => {
//   const [form, setForm] = useState({
//     name: "", email: "", password: "", phone: "", role: "customer",
//   });
//   const [msg, setMsg] = useState("");
//   const [error, setError] = useState("");


//   const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

//   const onSubmit = async (e) => {
//     e.preventDefault();
//     setError(""); setMsg("");
//     try {
//       const res = await api.post("/auth/register", form);
//       setMsg(res.data.message);
//     } catch (err) {
//       setError(err.response?.data?.message || "Something went wrong");
//     }
//   };

//   return (
//     // <div style={{ maxWidth: 400, margin: "40px auto" }}>
//     <div className="auth-page">
//       <div className="auth-card">
//       <h2>Sign Up</h2>
//       <form onSubmit={onSubmit}>
//         <select name="role" value={form.role} onChange={onChange}>
//           <option value="customer">Customer</option>
//           <option value="contractor">Contractor</option>
//         </select>
//         <input name="name" placeholder="Full name" onChange={onChange} required />
//         <input name="email" type="email" placeholder="Email" onChange={onChange} required />
//         <input name="phone" placeholder="Phone" onChange={onChange} />
//         <input name="password" type="password" placeholder="Password" onChange={onChange} required />
//         <button type="submit">Register</button>
//       </form>
//       {msg && <p style={{ color: "green" }}>{msg}</p>}
//       {error && <p style={{ color: "red" }}>{error}</p>}
//       <p>Already have an account? <Link to="/login">Login</Link></p>
//     </div>
//     </div>
//   );
// };

// export default Register;

// import { useState } from "react";
// import { Link } from "react-router-dom";
// import api from "../api/axios";
// import "./AuthPage.css";

// const Register = () => {
//   const [form, setForm] = useState({
//     name: "", email: "", password: "", phone: "", role: "customer",
//   });
//   const [msg, setMsg] = useState("");
//   const [error, setError] = useState("");
//   const [showPassword, setShowPassword] = useState(false);

//   const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

//   const onSubmit = async (e) => {
//     e.preventDefault();
//     setError(""); setMsg("");
//     try {
//       const res = await api.post("/auth/register", form);
//       setMsg(res.data.message);
//     } catch (err) {
//       setError(err.response?.data?.message || "Something went wrong");
//     }
//   };

//   return (
//     <div className="auth-page">
//       <div className="auth-card">
//         <h2>Sign Up</h2>
//         <form onSubmit={onSubmit}>
//           <select name="role" value={form.role} onChange={onChange}>
//             <option value="customer">Customer</option>
//             <option value="contractor">Contractor</option>
//           </select>
//           <input name="name" placeholder="Full name" onChange={onChange} required />
//           <input name="email" type="email" placeholder="Email" onChange={onChange} required />
//           <input name="phone" placeholder="Phone" autoComplete="off" onChange={onChange} />

//           <div className="pw-wrap">
//             <input
//               name="password"
//               type={showPassword ? "text" : "password"}
//               placeholder="Password"
//               onChange={onChange}
//               required
//             />
//             <button
//               type="button"
//               className="eye-btn"
//               onClick={() => setShowPassword(!showPassword)}
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

//           <button type="submit">Register</button>
//         </form>
//         {msg && <p style={{ color: "green" }}>{msg}</p>}
//         {error && <p style={{ color: "red" }}>{error}</p>}
//         <p>Already have an account? <Link to="/login">Login</Link></p>
//       </div>
//     </div>
//   );
// };

// export default Register;

import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import "./AuthPage.css";

const Register = () => {
  const [form, setForm] = useState({
    name: "", email: "", password: "", phone: "", role: "customer",
  });
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(""); setMsg("");
    try {
      const res = await api.post("/auth/register", form);
      setMsg(res.data.message);
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong");
    }
  };

  return (
    <div className="auth-page">
      <img src="/pic1.jpg" alt="" className="auth-bg-video" />
      <div className="auth-video-overlay" />

      <div className="auth-card">
        <h2>Sign Up</h2>
        <form onSubmit={onSubmit}>
          <select name="role" value={form.role} onChange={onChange}>
            <option value="customer">Customer</option>
            <option value="contractor">Contractor</option>
          </select>
          <input name="name" placeholder="Full name" onChange={onChange} required />
          <input name="email" type="email" placeholder="Email" onChange={onChange} required />
          <input
            name="phone"
            type="tel"
            placeholder="Phone"
            autoComplete="off"
            onChange={onChange}
          />

          <div className="pw-wrap">
            <input
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              onChange={onChange}
              required
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

          <button type="submit" className="login-submit-btn">Register</button>
        </form>

        {msg && <p style={{ color: "#bbf7d0", fontWeight: "bold" }}>{msg}</p>}
        {error && <p style={{ color: "#fff3f3", fontWeight: "bold" }}>{error}</p>}
        <p>Already have an account? <Link to="/login">Login</Link></p>
      </div>
    </div>
  );
};

export default Register;