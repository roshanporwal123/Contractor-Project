import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api/axios";
import { createProject, getProject, updateProject } from "../api/projectApi";

const empty = {
  name: "",
  description: "",
  client: { name: "", email: "", phone: "", address: "" },
  location: { address: "", city: "", state: "", zip: "" },
  startDate: "",
  endDate: "",
  budget: 0,
  status: "planning",
  progress: 0,
  contractors: [],
};

const toDate = (d) => (d ? new Date(d).toISOString().slice(0, 10) : "");

export default function ProjectForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(empty);
  const [contractors, setContractors] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .get("/contractors")
      .then(({ data }) => setContractors(data.contractors || []))
      .catch(() => {});

    if (id) {
      getProject(id).then(({ data }) => {
        const p = data.project;
        setForm({
          ...empty,
          ...p,
          startDate: toDate(p.startDate),
          endDate: toDate(p.endDate),
          contractors: p.contractors.map((c) => c._id),
        });
      });
    }
  }, [id]);

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));
  const setNested = (group, field, value) =>
    setForm((f) => ({ ...f, [group]: { ...f[group], [field]: value } }));

  const toggleContractor = (cid) =>
    set(
      "contractors",
      form.contractors.includes(cid)
        ? form.contractors.filter((x) => x !== cid)
        : [...form.contractors, cid]
    );

  const submit = async (e) => {
    e.preventDefault();
    if (form.endDate && form.endDate < form.startDate)
      return alert("End date start date se pehle nahi ho sakti");

    setSaving(true);
    try {
      const payload = { ...form, budget: Number(form.budget), progress: Number(form.progress) };
      if (!payload.endDate) delete payload.endDate;
      id ? await updateProject(id, payload) : await createProject(payload);
      navigate("/projects");
    } catch (err) {
      alert(err.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} style={{ padding: 20, maxWidth: 700, display: "grid", gap: 10 }}>
      <h2>{id ? "Edit Project" : "New Project"}</h2>

      <input required placeholder="Project name" value={form.name}
        onChange={(e) => set("name", e.target.value)} />
      <textarea placeholder="Description" value={form.description}
        onChange={(e) => set("description", e.target.value)} />

      <h4>Client Details</h4>
      <input required placeholder="Client name" value={form.client.name}
        onChange={(e) => setNested("client", "name", e.target.value)} />
      <input type="email" placeholder="Client email" value={form.client.email}
        onChange={(e) => setNested("client", "email", e.target.value)} />
      <input placeholder="Client phone" value={form.client.phone}
        onChange={(e) => setNested("client", "phone", e.target.value)} />
      <input placeholder="Client address" value={form.client.address}
        onChange={(e) => setNested("client", "address", e.target.value)} />

      <h4>Project Location</h4>
      <input placeholder="Address" value={form.location.address}
        onChange={(e) => setNested("location", "address", e.target.value)} />
      <input placeholder="City" value={form.location.city}
        onChange={(e) => setNested("location", "city", e.target.value)} />
      <input placeholder="State" value={form.location.state}
        onChange={(e) => setNested("location", "state", e.target.value)} />
      <input placeholder="ZIP" value={form.location.zip}
        onChange={(e) => setNested("location", "zip", e.target.value)} />

      <h4>Schedule & Budget</h4>
      <label>Start date
        <input required type="date" value={form.startDate}
          onChange={(e) => set("startDate", e.target.value)} />
      </label>
      <label>End date
        <input type="date" value={form.endDate}
          onChange={(e) => set("endDate", e.target.value)} />
      </label>
      <input type="number" min="0" placeholder="Budget" value={form.budget}
        onChange={(e) => set("budget", e.target.value)} />

      <select value={form.status} onChange={(e) => set("status", e.target.value)}>
        {["planning", "active", "on_hold", "completed", "cancelled"].map((s) => (
          <option key={s} value={s}>{s.replace("_", " ")}</option>
        ))}
      </select>

      <label>Progress: {form.progress}%
        <input type="range" min="0" max="100" value={form.progress}
          onChange={(e) => set("progress", e.target.value)} />
      </label>

      <h4>Assign Contractors</h4>
      <div>
        {contractors.map((c) => (
          <label key={c._id} style={{ display: "block" }}>
            <input type="checkbox" checked={form.contractors.includes(c._id)}
              onChange={() => toggleContractor(c._id)} />{" "}
            {c.name} ({c.status})
          </label>
        ))}
        {!contractors.length && <p>No contractors yet</p>}
      </div>

      <button disabled={saving}>{saving ? "Saving..." : "Save Project"}</button>
    </form>
  );
}