import { useEffect, useState, useCallback } from "react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";

const fmt = (d) => (d ? new Date(d).toLocaleString() : "-");
const toInput = (d) => new Date(new Date(d).getTime() - new Date(d).getTimezoneOffset() * 60000).toISOString().slice(0, 16);

export default function TimeTracking() {
  const { user } = useAuth();
  const manager = ["company", "admin"].includes(user?.role);

  const [projects, setProjects] = useState([]);
  const [entries, setEntries] = useState([]);
  const [running, setRunning] = useState(null);
  const [sheet, setSheet] = useState(null);
  const [period, setPeriod] = useState("week");
  const [filterStatus, setFilterStatus] = useState("");
  const [project, setProject] = useState("");
  const [breakMin, setBreakMin] = useState(0);
  const [elapsed, setElapsed] = useState("00:00:00");
  const [msg, setMsg] = useState("");
  const [manual, setManual] = useState({ project: "", clockIn: "", clockOut: "", breakMinutes: 0, notes: "" });

  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(""), 3000); };

  const loadProjects = async () => {
    const { data } = await api.get("/projects");
    setProjects(data.projects || data.data || data || []);
  };

  const loadEntries = useCallback(async () => {
    const { data } = await api.get("/time", { params: { status: filterStatus || undefined } });
    setEntries(data.entries);
  }, [filterStatus]);

  const loadSheet = useCallback(async () => {
    const { data } = await api.get("/time/timesheet", { params: { period } });
    setSheet(data);
  }, [period]);

  const loadRunning = async () => {
    if (manager) return;
    const { data } = await api.get("/time/running");
    setRunning(data.entry);
  };

  useEffect(() => { loadProjects(); loadRunning(); }, []);
  useEffect(() => { loadEntries(); }, [loadEntries]);
  useEffect(() => { loadSheet(); }, [loadSheet]);

  // live timer
  useEffect(() => {
    if (!running) return setElapsed("00:00:00");
    const t = setInterval(() => {
      const s = Math.floor((Date.now() - new Date(running.clockIn)) / 1000);
      const p = (n) => String(n).padStart(2, "0");
      setElapsed(`${p(Math.floor(s / 3600))}:${p(Math.floor((s % 3600) / 60))}:${p(s % 60)}`);
    }, 1000);
    return () => clearInterval(t);
  }, [running]);

  const refresh = () => { loadEntries(); loadSheet(); loadRunning(); };

  const act = async (fn, okMsg) => {
    try { await fn(); flash(okMsg); refresh(); }
    catch (e) { flash(e.response?.data?.message || "Error aaya"); }
  };

  const handleClockIn = () => {
    if (!project) return flash("Pehle project select karo");
    act(() => api.post("/time/clock-in", { project }), "Clocked in ✅");
  };
  const handleClockOut = () =>
    act(() => api.post("/time/clock-out", { breakMinutes: breakMin }), "Clocked out ✅");

  const submitManual = (e) => {
    e.preventDefault();
    act(async () => {
      await api.post("/time/manual", manual);
      setManual({ project: "", clockIn: "", clockOut: "", breakMinutes: 0, notes: "" });
    }, "Manual entry add ho gayi");
  };

  const approve = (id) => act(() => api.put(`/time/${id}/approve`), "Approved");
  const reject = (id) => {
    const reason = prompt("Reject karne ka reason?");
    if (reason === null) return;
    act(() => api.put(`/time/${id}/reject`, { reason }), "Rejected");
  };
  const remove = (id) => {
    if (!confirm("Entry delete karni hai?")) return;
    act(() => api.delete(`/time/${id}`), "Deleted");
  };

  const pName = (p) => p?.name || p?.title || "-";

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: 20 }}>
      <h2>⏱️ Time Tracking</h2>
      {msg && <p style={{ background: "#eef", padding: 8 }}>{msg}</p>}

      {/* Clock in/out - contractor only */}
      {!manager && (
        <section style={{ border: "1px solid #ddd", padding: 16, marginBottom: 20 }}>
          <h3>Clock In / Clock Out</h3>
          {running ? (
            <>
              <p>Project: <b>{pName(running.project)}</b></p>
              <h1>{elapsed}</h1>
              <label>Break (minutes): </label>
              <input type="number" min="0" value={breakMin} onChange={(e) => setBreakMin(e.target.value)} />{" "}
              <button onClick={handleClockOut}>Clock Out</button>
            </>
          ) : (
            <>
              <select value={project} onChange={(e) => setProject(e.target.value)}>
                <option value="">-- Project select karo --</option>
                {projects.map((p) => <option key={p._id} value={p._id}>{pName(p)}</option>)}
              </select>{" "}
              <button onClick={handleClockIn}>Clock In</button>
            </>
          )}
        </section>
      )}

      {/* Manual entry */}
      {!manager && (
        <section style={{ border: "1px solid #ddd", padding: 16, marginBottom: 20 }}>
          <h3>Manual Entry</h3>
          <form onSubmit={submitManual} style={{ display: "grid", gap: 8, maxWidth: 400 }}>
            <select required value={manual.project} onChange={(e) => setManual({ ...manual, project: e.target.value })}>
              <option value="">-- Project --</option>
              {projects.map((p) => <option key={p._id} value={p._id}>{pName(p)}</option>)}
            </select>
            <input required type="datetime-local" value={manual.clockIn} onChange={(e) => setManual({ ...manual, clockIn: e.target.value })} />
            <input required type="datetime-local" value={manual.clockOut} onChange={(e) => setManual({ ...manual, clockOut: e.target.value })} />
            <input type="number" min="0" placeholder="Break (min)" value={manual.breakMinutes} onChange={(e) => setManual({ ...manual, breakMinutes: e.target.value })} />
            <input placeholder="Notes" value={manual.notes} onChange={(e) => setManual({ ...manual, notes: e.target.value })} />
            <button type="submit">Add Entry</button>
          </form>
        </section>
      )}

      {/* Timesheet summary */}
      <section style={{ border: "1px solid #ddd", padding: 16, marginBottom: 20 }}>
        <h3>
          {period === "week" ? "Weekly" : "Monthly"} Timesheet{" "}
          <select value={period} onChange={(e) => setPeriod(e.target.value)}>
            <option value="week">Weekly</option>
            <option value="month">Monthly</option>
          </select>
        </h3>
        {sheet && (
          <>
            <p>
              {new Date(sheet.start).toLocaleDateString()} – {new Date(sheet.end).toLocaleDateString()} |{" "}
              Total: <b>{sheet.totals.totalHours.toFixed(2)}h</b> | Overtime:{" "}
              <b>{sheet.totals.overtimeHours.toFixed(2)}h</b>
            </p>
            <table width="100%" border="1" cellPadding="6" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr><th>Contractor</th><th>Total</th><th>Overtime</th><th>Approved</th><th>Pending</th><th>Entries</th></tr>
              </thead>
              <tbody>
                {sheet.byContractor.map((c) => (
                  <tr key={c.contractorId}>
                    <td>{c.name}</td><td>{c.totalHours}</td><td>{c.overtimeHours}</td>
                    <td>{c.approvedHours}</td><td>{c.pendingHours}</td><td>{c.entries}</td>
                  </tr>
                ))}
                {sheet.byContractor.length === 0 && <tr><td colSpan="6">Koi data nahi</td></tr>}
              </tbody>
            </table>
          </>
        )}
      </section>

      {/* Entries list */}
      <section>
        <h3>
          Time Entries{" "}
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">All</option>
            <option value="running">Running</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </h3>
        <table width="100%" border="1" cellPadding="6" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {manager && <th>Contractor</th>}
              <th>Project</th><th>Clock In</th><th>Clock Out</th><th>Break</th>
              <th>Hours</th><th>OT</th><th>Status</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e._id}>
                {manager && <td>{e.contractor?.name}</td>}
                <td>{pName(e.project)}</td>
                <td>{fmt(e.clockIn)}</td>
                <td>{fmt(e.clockOut)}</td>
                <td>{e.breakMinutes}m</td>
                <td>{e.hoursWorked}</td>
                <td>{e.overtimeHours}</td>
                <td>
                  {e.status}
                  {e.status === "rejected" && e.rejectionReason ? ` (${e.rejectionReason})` : ""}
                </td>
                <td>
                  {manager && e.status === "pending" && (
                    <>
                      <button onClick={() => approve(e._id)}>Approve</button>{" "}
                      <button onClick={() => reject(e._id)}>Reject</button>{" "}
                    </>
                  )}
                  {(manager || (e.status !== "approved" && e.status !== "running")) && (
                    <button onClick={() => remove(e._id)}>Delete</button>
                  )}
                </td>
              </tr>
            ))}
            {entries.length === 0 && <tr><td colSpan="9">Koi entry nahi</td></tr>}
          </tbody>
        </table>
      </section>
    </div>
  );
}
