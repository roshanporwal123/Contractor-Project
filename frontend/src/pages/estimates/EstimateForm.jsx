import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { estimateApi } from "../../api/estimateApi";
import api from "../../api/axios";

const empty = {
  title: "",
  project: "",
  client: { name: "", email: "", phone: "", address: "" },
  laborItems: [],
  materialItems: [],
  additionalExpenses: [],
  taxRate: 0,
  discountType: "fixed",
  discountValue: 0,
  validUntil: "",
  notes: "",
};

export default function EstimateForm() {
  const { id } = useParams();
  const nav = useNavigate();
  const [form, setForm] = useState(empty);
  const [projects, setProjects] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/projects").then(({ data }) => setProjects(data.projects || data)).catch(() => {});
    if (id) {
      estimateApi.get(id).then(({ data }) =>
        setForm({
          ...empty,
          ...data,
          project: data.project?._id || "",
          validUntil: data.validUntil ? data.validUntil.slice(0, 10) : "",
        })
      );
    }
  }, [id]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setClient = (k, v) => setForm((f) => ({ ...f, client: { ...f.client, [k]: v } }));

  const addRow = (key, row) => set(key, [...form[key], row]);
  const updRow = (key, i, field, val) =>
    set(key, form[key].map((r, idx) => (idx === i ? { ...r, [field]: val } : r)));
  const delRow = (key, i) => set(key, form[key].filter((_, idx) => idx !== i));

  // live preview totals
  const t = useMemo(() => {
    const labor = form.laborItems.reduce((s, i) => s + (+i.hours || 0) * (+i.rate || 0), 0);
    const mat = form.materialItems.reduce((s, i) => s + (+i.quantity || 0) * (+i.unitCost || 0), 0);
    const exp = form.additionalExpenses.reduce((s, i) => s + (+i.amount || 0), 0);
    const sub = labor + mat + exp;
    const disc = form.discountType === "percent"
      ? (sub * (+form.discountValue || 0)) / 100
      : Math.min(+form.discountValue || 0, sub);
    const tax = ((sub - disc) * (+form.taxRate || 0)) / 100;
    return { labor, mat, exp, sub, disc, tax, total: sub - disc + tax };
  }, [form]);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    const payload = { ...form };
    if (!payload.project) delete payload.project;
    if (!payload.validUntil) delete payload.validUntil;
    try {
      id ? await estimateApi.update(id, payload) : await estimateApi.create(payload);
      nav("/estimates");
    } catch (err) {
      setError(err.response?.data?.message || "Save failed");
    }
  };

  const num = (v) => (v === "" ? "" : Number(v));
  const box = { border: "1px solid #ddd", padding: 12, margin: "12px 0", borderRadius: 6 };

  return (
    <form onSubmit={submit} style={{ padding: 20, maxWidth: 900 }}>
      <h2>{id ? "Edit Estimate" : "New Estimate"}</h2>
      {error && <p style={{ color: "red" }}>{error}</p>}

      <div style={box}>
        <input required placeholder="Estimate title" value={form.title} onChange={(e) => set("title", e.target.value)} />{" "}
        <select value={form.project} onChange={(e) => set("project", e.target.value)}>
          <option value="">-- Project (optional) --</option>
          {projects.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
        </select>{" "}
        <label>Valid until: <input type="date" value={form.validUntil} onChange={(e) => set("validUntil", e.target.value)} /></label>
      </div>

      <div style={box}>
        <h4>Client</h4>
        <input required placeholder="Name" value={form.client.name} onChange={(e) => setClient("name", e.target.value)} />{" "}
        <input required type="email" placeholder="Email" value={form.client.email} onChange={(e) => setClient("email", e.target.value)} />{" "}
        <input placeholder="Phone" value={form.client.phone} onChange={(e) => setClient("phone", e.target.value)} />{" "}
        <input placeholder="Address" value={form.client.address} onChange={(e) => setClient("address", e.target.value)} />
      </div>

      <div style={box}>
        <h4>Labor</h4>
        {form.laborItems.map((r, i) => (
          <div key={i}>
            <input required placeholder="Description" value={r.description} onChange={(e) => updRow("laborItems", i, "description", e.target.value)} />{" "}
            <input required type="number" min="0" placeholder="Hours" value={r.hours} onChange={(e) => updRow("laborItems", i, "hours", num(e.target.value))} />{" "}
            <input required type="number" min="0" placeholder="Rate" value={r.rate} onChange={(e) => updRow("laborItems", i, "rate", num(e.target.value))} />{" "}
            = ${((+r.hours || 0) * (+r.rate || 0)).toFixed(2)}{" "}
            <button type="button" onClick={() => delRow("laborItems", i)}>x</button>
          </div>
        ))}
        <button type="button" onClick={() => addRow("laborItems", { description: "", hours: "", rate: "" })}>+ Add labor</button>
      </div>

      <div style={box}>
        <h4>Materials</h4>
        {form.materialItems.map((r, i) => (
          <div key={i}>
            <input required placeholder="Material" value={r.name} onChange={(e) => updRow("materialItems", i, "name", e.target.value)} />{" "}
            <input required type="number" min="0" placeholder="Qty" value={r.quantity} onChange={(e) => updRow("materialItems", i, "quantity", num(e.target.value))} />{" "}
            <input required type="number" min="0" placeholder="Unit cost" value={r.unitCost} onChange={(e) => updRow("materialItems", i, "unitCost", num(e.target.value))} />{" "}
            = ${((+r.quantity || 0) * (+r.unitCost || 0)).toFixed(2)}{" "}
            <button type="button" onClick={() => delRow("materialItems", i)}>x</button>
          </div>
        ))}
        <button type="button" onClick={() => addRow("materialItems", { name: "", quantity: "", unitCost: "" })}>+ Add material</button>
      </div>

      <div style={box}>
        <h4>Additional Expenses</h4>
        {form.additionalExpenses.map((r, i) => (
          <div key={i}>
            <input required placeholder="Description" value={r.description} onChange={(e) => updRow("additionalExpenses", i, "description", e.target.value)} />{" "}
            <input required type="number" min="0" placeholder="Amount" value={r.amount} onChange={(e) => updRow("additionalExpenses", i, "amount", num(e.target.value))} />{" "}
            <button type="button" onClick={() => delRow("additionalExpenses", i)}>x</button>
          </div>
        ))}
        <button type="button" onClick={() => addRow("additionalExpenses", { description: "", amount: "" })}>+ Add expense</button>
      </div>

      <div style={box}>
        <label>Tax %: <input type="number" min="0" max="100" value={form.taxRate} onChange={(e) => set("taxRate", num(e.target.value))} /></label>{" "}
        <label>Discount:{" "}
          <select value={form.discountType} onChange={(e) => set("discountType", e.target.value)}>
            <option value="fixed">Fixed $</option>
            <option value="percent">Percent %</option>
          </select>{" "}
          <input type="number" min="0" value={form.discountValue} onChange={(e) => set("discountValue", num(e.target.value))} />
        </label>
        <div style={{ marginTop: 10 }}>
          <textarea rows="3" style={{ width: "100%" }} placeholder="Notes / terms" value={form.notes} onChange={(e) => set("notes", e.target.value)} />
        </div>
      </div>

      <div style={{ ...box, background: "#f9fafb" }}>
        <div>Labor: ${t.labor.toFixed(2)} | Materials: ${t.mat.toFixed(2)} | Expenses: ${t.exp.toFixed(2)}</div>
        <div>Subtotal: ${t.sub.toFixed(2)}</div>
        <div>Discount: -${t.disc.toFixed(2)}</div>
        <div>Tax: ${t.tax.toFixed(2)}</div>
        <h3>Total: ${t.total.toFixed(2)}</h3>
      </div>

      <button type="submit">{id ? "Update" : "Save as Draft"}</button>{" "}
      <button type="button" onClick={() => nav("/estimates")}>Cancel</button>
    </form>
  );
}