import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api/axios";

const emptyLabor = { description: "", hours: 1, rate: 0 };
const emptyMaterial = { description: "", quantity: 1, unitPrice: 0 };
const toInput = (d) => (d ? new Date(d).toISOString().slice(0, 10) : "");

export default function InvoiceForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    project: "",
    client: { name: "", email: "", phone: "", address: "" },
    issueDate: toInput(new Date()),
    dueDate: "",
    laborItems: [{ ...emptyLabor }],
    materialItems: [],
    taxRate: 0,
    discountType: "fixed",
    discountValue: 0,
    notes: "",
  });

  useEffect(() => {
    api.get("/projects").then((r) => setProjects(r.data.projects || r.data.data || r.data || [])).catch(() => {});
    if (id) {
      api.get(`/invoices/${id}`).then(({ data }) => {
        const i = data.invoice;
        setForm({
          project: i.project?._id || "",
          client: { name: "", email: "", phone: "", address: "", ...i.client },
          issueDate: toInput(i.issueDate),
          dueDate: toInput(i.dueDate),
          laborItems: i.laborItems,
          materialItems: i.materialItems,
          taxRate: i.taxRate,
          discountType: i.discountType,
          discountValue: i.discountValue,
          notes: i.notes || "",
        });
      });
    }
  }, [id]);

  /* live totals */
  const laborTotal = form.laborItems.reduce((s, i) => s + i.hours * i.rate, 0);
  const materialTotal = form.materialItems.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const subtotal = laborTotal + materialTotal;
  const discount = Math.min(
    form.discountType === "percent" ? (subtotal * form.discountValue) / 100 : Number(form.discountValue),
    subtotal
  );
  const tax = ((subtotal - discount) * form.taxRate) / 100;
  const total = subtotal - discount + tax;

  const setClient = (k, v) => setForm({ ...form, client: { ...form.client, [k]: v } });
  const setItem = (key, idx, field, value) => {
    const items = [...form[key]];
    items[idx] = { ...items[idx], [field]: field === "description" ? value : Number(value) };
    setForm({ ...form, [key]: items });
  };
  const addItem = (key, tpl) => setForm({ ...form, [key]: [...form[key], { ...tpl }] });
  const removeItem = (key, idx) => setForm({ ...form, [key]: form[key].filter((_, i) => i !== idx) });

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    const payload = { ...form, project: form.project || undefined };
    try {
      const { data } = id ? await api.put(`/invoices/${id}`, payload) : await api.post("/invoices", payload);
      navigate(`/invoices/${data.invoice._id}`);
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong");
    }
  };

  return (
    <form onSubmit={submit} style={{ padding: 24, maxWidth: 800 }}>
      <h2>{id ? "Edit Invoice" : "New Invoice"}</h2>
      {error && <p style={{ color: "red" }}>{error}</p>}

      <h4>Client</h4>
      <input required placeholder="Client name" value={form.client.name} onChange={(e) => setClient("name", e.target.value)} />
      <input type="email" placeholder="Email" value={form.client.email} onChange={(e) => setClient("email", e.target.value)} />
      <input placeholder="Phone" value={form.client.phone} onChange={(e) => setClient("phone", e.target.value)} />
      <input placeholder="Address" value={form.client.address} onChange={(e) => setClient("address", e.target.value)} />

      <h4>Details</h4>
      <select value={form.project} onChange={(e) => setForm({ ...form, project: e.target.value })}>
        <option value="">-- Project (optional) --</option>
        {projects.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
      </select>
      <label> Issue: <input type="date" value={form.issueDate} onChange={(e) => setForm({ ...form, issueDate: e.target.value })} /></label>
      <label> Due: <input required type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /></label>

      <h4>Labor Charges</h4>
      {form.laborItems.map((it, idx) => (
        <div key={idx} style={{ display: "flex", gap: 6, marginBottom: 6 }}>
          <input required placeholder="Description" value={it.description} onChange={(e) => setItem("laborItems", idx, "description", e.target.value)} />
          <input type="number" min="0" step="0.25" title="Hours" value={it.hours} onChange={(e) => setItem("laborItems", idx, "hours", e.target.value)} />
          <input type="number" min="0" step="0.01" title="Rate" value={it.rate} onChange={(e) => setItem("laborItems", idx, "rate", e.target.value)} />
          <span>${(it.hours * it.rate).toFixed(2)}</span>
          <button type="button" onClick={() => removeItem("laborItems", idx)}>✕</button>
        </div>
      ))}
      <button type="button" onClick={() => addItem("laborItems", emptyLabor)}>+ Add labor</button>

      <h4>Material Charges</h4>
      {form.materialItems.map((it, idx) => (
        <div key={idx} style={{ display: "flex", gap: 6, marginBottom: 6 }}>
          <input required placeholder="Description" value={it.description} onChange={(e) => setItem("materialItems", idx, "description", e.target.value)} />
          <input type="number" min="0" title="Quantity" value={it.quantity} onChange={(e) => setItem("materialItems", idx, "quantity", e.target.value)} />
          <input type="number" min="0" step="0.01" title="Unit price" value={it.unitPrice} onChange={(e) => setItem("materialItems", idx, "unitPrice", e.target.value)} />
          <span>${(it.quantity * it.unitPrice).toFixed(2)}</span>
          <button type="button" onClick={() => removeItem("materialItems", idx)}>✕</button>
        </div>
      ))}
      <button type="button" onClick={() => addItem("materialItems", emptyMaterial)}>+ Add material</button>

      <h4>Tax & Discount</h4>
      <label> Tax %: <input type="number" min="0" max="100" step="0.01" value={form.taxRate} onChange={(e) => setForm({ ...form, taxRate: Number(e.target.value) })} /></label>
      <select value={form.discountType} onChange={(e) => setForm({ ...form, discountType: e.target.value })}>
        <option value="fixed">Discount ($)</option>
        <option value="percent">Discount (%)</option>
      </select>
      <input type="number" min="0" step="0.01" value={form.discountValue} onChange={(e) => setForm({ ...form, discountValue: Number(e.target.value) })} />

      <h4>Notes</h4>
      <textarea rows={3} style={{ width: "100%" }} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />

      <div style={{ textAlign: "right", margin: "16px 0" }}>
        <div>Subtotal: ${subtotal.toFixed(2)}</div>
        <div>Discount: -${discount.toFixed(2)}</div>
        <div>Tax: ${tax.toFixed(2)}</div>
        <strong>Total: ${total.toFixed(2)}</strong>
      </div>

      <button type="submit">{id ? "Update Invoice" : "Create Invoice"}</button>
    </form>
  );
}