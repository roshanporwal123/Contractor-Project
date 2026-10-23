import { useEffect, useState } from "react";
import api from "../../api/axios";

export default function AdminSettings() {
  const [s, setS] = useState(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    api.get("/admin/settings").then((res) => setS(res.data));
  }, []);

  if (!s) return <p>Loading...</p>;

  const set = (k, v) => setS({ ...s, [k]: v });

  const save = async (e) => {
    e.preventDefault();
    try {
      const res = await api.put("/admin/settings", s);
      setS(res.data);
      setMsg("Settings saved");
    } catch (err) {
      setMsg(err.response?.data?.message || "Save failed");
    }
  };

  return (
    <div>
      <h1>System Settings</h1>
      <form className="adm-box adm-form" onSubmit={save}>
        <label>Site Name
          <input value={s.siteName} onChange={(e) => set("siteName", e.target.value)} />
        </label>
        <label>Support Email
          <input type="email" value={s.supportEmail} onChange={(e) => set("supportEmail", e.target.value)} />
        </label>
        <label>Default Currency
          <input value={s.defaultCurrency} onChange={(e) => set("defaultCurrency", e.target.value)} />
        </label>
        <label>Default Tax Rate (%)
          <input type="number" value={s.defaultTaxRate} onChange={(e) => set("defaultTaxRate", Number(e.target.value))} />
        </label>
        <label>Max Upload Size (MB)
          <input type="number" value={s.maxUploadSizeMB} onChange={(e) => set("maxUploadSizeMB", Number(e.target.value))} />
        </label>
        <label className="row">
          <input type="checkbox" checked={s.allowSignup} onChange={(e) => set("allowSignup", e.target.checked)} />
          Allow new signups
        </label>
        <label className="row">
          <input type="checkbox" checked={s.maintenanceMode} onChange={(e) => set("maintenanceMode", e.target.checked)} />
          Maintenance mode
        </label>
        <button className="btn primary">Save Settings</button>
        {msg && <p>{msg}</p>}
      </form>
    </div>
  );
}