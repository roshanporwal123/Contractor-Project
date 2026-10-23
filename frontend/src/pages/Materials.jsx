import { useEffect, useState } from "react";
import api from "../api/axios";

const TABS = ["Materials", "Suppliers", "Purchase Orders", "Used Materials"];
const input = { padding: 8, border: "1px solid #ccc", borderRadius: 6 };
const btn = { padding: "8px 14px", border: 0, borderRadius: 6, background: "#2563eb", color: "#fff", cursor: "pointer" };
const small = { ...btn, padding: "4px 8px", fontSize: 12, marginRight: 4 };
const card = { border: "1px solid #e5e7eb", borderRadius: 8, padding: 16, marginBottom: 16 };

export default function Materials() {
  const [tab, setTab] = useState("Materials");
  const [materials, setMaterials] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [usages, setUsages] = useState([]);
  const [projects, setProjects] = useState([]);
  const [summary, setSummary] = useState(null);
  const [lowStock, setLowStock] = useState([]);
  const [error, setError] = useState("");

  const [mForm, setMForm] = useState({ name: "", sku: "", category: "", unit: "pcs", quantity: 0, unitCost: 0, lowStockThreshold: 10, supplier: "" });
  const [sForm, setSForm] = useState({ name: "", contactPerson: "", email: "", phone: "", address: "" });
  const [poForm, setPoForm] = useState({ supplier: "", expectedDate: "", items: [{ material: "", quantity: 1, unitCost: "" }] });
  const [uForm, setUForm] = useState({ material: "", project: "", quantity: 1, notes: "" });

  const load = async () => {
    try {
      const [m, s, o, u, sm, ls] = await Promise.all([
        api.get("/materials"),
        api.get("/materials/suppliers"),
        api.get("/materials/purchase-orders"),
        api.get("/materials/usage"),
        api.get("/materials/summary"),
        api.get("/materials/low-stock"),
      ]);
      setMaterials(m.data.materials);
      setSuppliers(s.data.suppliers);
      setOrders(o.data.purchaseOrders);
      setUsages(u.data.usages);
      setSummary(sm.data.summary);
      setLowStock(ls.data.materials);
      api.get("/projects").then((r) => setProjects(r.data.projects || [])).catch(() => {});
    } catch (e) {
      setError(e.response?.data?.message || "Failed to load");
    }
  };

  useEffect(() => { load(); }, []);

  const run = async (fn, after) => {
    try {
      setError("");
      const res = await fn();
      if (res?.data?.lowStockAlert) alert(res.data.lowStockAlert);
      after && after();
      load();
    } catch (e) {
      setError(e.response?.data?.message || "Something went wrong");
    }
  };

  const addMaterial = (e) => {
    e.preventDefault();
    const body = { ...mForm };
    if (!body.supplier) delete body.supplier;
    run(() => api.post("/materials", body), () =>
      setMForm({ name: "", sku: "", category: "", unit: "pcs", quantity: 0, unitCost: 0, lowStockThreshold: 10, supplier: "" }));
  };

  const addSupplier = (e) => {
    e.preventDefault();
    run(() => api.post("/materials/suppliers", sForm), () =>
      setSForm({ name: "", contactPerson: "", email: "", phone: "", address: "" }));
  };

  const addPO = (e) => {
    e.preventDefault();
    const items = poForm.items
      .filter((i) => i.material)
      .map((i) => ({ material: i.material, quantity: Number(i.quantity), ...(i.unitCost !== "" && { unitCost: Number(i.unitCost) }) }));
    run(() => api.post("/materials/purchase-orders", { ...poForm, items }), () =>
      setPoForm({ supplier: "", expectedDate: "", items: [{ material: "", quantity: 1, unitCost: "" }] }));
  };

  const setItem = (idx, key, val) =>
    setPoForm((p) => ({ ...p, items: p.items.map((it, i) => (i === idx ? { ...it, [key]: val } : it)) }));

  const addUsage = (e) => {
    e.preventDefault();
    run(() => api.post("/materials/usage", uForm), () =>
      setUForm({ material: "", project: "", quantity: 1, notes: "" }));
  };

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
      <h2>Material Management</h2>
      {error && <p style={{ color: "red" }}>{error}</p>}

      {summary && (
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
          <div style={card}>Total Materials<br /><b>{summary.totalMaterials}</b></div>
          <div style={card}>Stock Value<br /><b>${summary.totalStockValue.toFixed(2)}</b></div>
          <div style={card}>Used Cost<br /><b>${summary.totalUsedCost.toFixed(2)}</b></div>
          <div style={{ ...card, borderColor: summary.lowStockCount ? "#dc2626" : "#e5e7eb" }}>
            Low Stock<br /><b>{summary.lowStockCount}</b>
          </div>
        </div>
      )}

      {lowStock.length > 0 && (
        <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", padding: 12, borderRadius: 8, marginBottom: 16 }}>
          ⚠️ <b>Low-stock alert:</b>{" "}
          {lowStock.map((m) => `${m.name} (${m.quantity} ${m.unit})`).join(", ")}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            style={{ ...btn, background: tab === t ? "#1d4ed8" : "#94a3b8" }}>{t}</button>
        ))}
      </div>

      {/* MATERIALS */}
      {tab === "Materials" && (
        <>
          <form onSubmit={addMaterial} style={{ ...card, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input style={input} placeholder="Name" required value={mForm.name} onChange={(e) => setMForm({ ...mForm, name: e.target.value })} />
            <input style={input} placeholder="SKU" value={mForm.sku} onChange={(e) => setMForm({ ...mForm, sku: e.target.value })} />
            <input style={input} placeholder="Category" value={mForm.category} onChange={(e) => setMForm({ ...mForm, category: e.target.value })} />
            <input style={{ ...input, width: 70 }} placeholder="Unit" value={mForm.unit} onChange={(e) => setMForm({ ...mForm, unit: e.target.value })} />
            <input style={{ ...input, width: 90 }} type="number" min="0" placeholder="Qty" value={mForm.quantity} onChange={(e) => setMForm({ ...mForm, quantity: e.target.value })} />
            <input style={{ ...input, width: 90 }} type="number" min="0" step="0.01" placeholder="Unit cost" value={mForm.unitCost} onChange={(e) => setMForm({ ...mForm, unitCost: e.target.value })} />
            <input style={{ ...input, width: 110 }} type="number" min="0" placeholder="Low stock at" value={mForm.lowStockThreshold} onChange={(e) => setMForm({ ...mForm, lowStockThreshold: e.target.value })} />
            <select style={input} value={mForm.supplier} onChange={(e) => setMForm({ ...mForm, supplier: e.target.value })}>
              <option value="">Supplier (optional)</option>
              {suppliers.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
            <button style={btn}>Add Material</button>
          </form>

          <table width="100%" cellPadding="8" style={{ borderCollapse: "collapse" }}>
            <thead><tr style={{ textAlign: "left", background: "#f1f5f9" }}>
              <th>Name</th><th>SKU</th><th>Category</th><th>Qty</th><th>Unit Cost</th><th>Supplier</th><th></th>
            </tr></thead>
            <tbody>
              {materials.map((m) => {
                const low = m.quantity <= m.lowStockThreshold;
                return (
                  <tr key={m._id} style={{ borderBottom: "1px solid #e5e7eb", background: low ? "#fef2f2" : "transparent" }}>
                    <td>{m.name}</td><td>{m.sku}</td><td>{m.category}</td>
                    <td>{m.quantity} {m.unit} {low && "⚠️"}</td>
                    <td>${m.unitCost}</td><td>{m.supplier?.name}</td>
                    <td><button style={{ ...small, background: "#dc2626" }}
                      onClick={() => window.confirm("Delete?") && run(() => api.delete(`/materials/${m._id}`))}>Delete</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      )}

      {/* SUPPLIERS */}
      {tab === "Suppliers" && (
        <>
          <form onSubmit={addSupplier} style={{ ...card, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input style={input} placeholder="Supplier name" required value={sForm.name} onChange={(e) => setSForm({ ...sForm, name: e.target.value })} />
            <input style={input} placeholder="Contact person" value={sForm.contactPerson} onChange={(e) => setSForm({ ...sForm, contactPerson: e.target.value })} />
            <input style={input} type="email" placeholder="Email" value={sForm.email} onChange={(e) => setSForm({ ...sForm, email: e.target.value })} />
            <input style={input} placeholder="Phone" value={sForm.phone} onChange={(e) => setSForm({ ...sForm, phone: e.target.value })} />
            <input style={input} placeholder="Address" value={sForm.address} onChange={(e) => setSForm({ ...sForm, address: e.target.value })} />
            <button style={btn}>Add Supplier</button>
          </form>
          <table width="100%" cellPadding="8" style={{ borderCollapse: "collapse" }}>
            <thead><tr style={{ textAlign: "left", background: "#f1f5f9" }}>
              <th>Name</th><th>Contact</th><th>Email</th><th>Phone</th><th></th>
            </tr></thead>
            <tbody>
              {suppliers.map((s) => (
                <tr key={s._id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                  <td>{s.name}</td><td>{s.contactPerson}</td><td>{s.email}</td><td>{s.phone}</td>
                  <td><button style={{ ...small, background: "#dc2626" }}
                    onClick={() => window.confirm("Delete?") && run(() => api.delete(`/materials/suppliers/${s._id}`))}>Delete</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {/* PURCHASE ORDERS */}
      {tab === "Purchase Orders" && (
        <>
          <form onSubmit={addPO} style={card}>
            <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
              <select style={input} required value={poForm.supplier} onChange={(e) => setPoForm({ ...poForm, supplier: e.target.value })}>
                <option value="">Select supplier</option>
                {suppliers.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
              </select>
              <input style={input} type="date" value={poForm.expectedDate} onChange={(e) => setPoForm({ ...poForm, expectedDate: e.target.value })} />
            </div>
            {poForm.items.map((it, idx) => (
              <div key={idx} style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                <select style={input} value={it.material} onChange={(e) => setItem(idx, "material", e.target.value)}>
                  <option value="">Select material</option>
                  {materials.map((m) => <option key={m._id} value={m._id}>{m.name}</option>)}
                </select>
                <input style={{ ...input, width: 80 }} type="number" min="1" value={it.quantity} onChange={(e) => setItem(idx, "quantity", e.target.value)} />
                <input style={{ ...input, width: 110 }} type="number" min="0" step="0.01" placeholder="Unit cost" value={it.unitCost} onChange={(e) => setItem(idx, "unitCost", e.target.value)} />
              </div>
            ))}
            <button type="button" style={{ ...small, background: "#64748b" }}
              onClick={() => setPoForm({ ...poForm, items: [...poForm.items, { material: "", quantity: 1, unitCost: "" }] })}>+ Add item</button>{" "}
            <button style={btn}>Create PO</button>
          </form>

          <table width="100%" cellPadding="8" style={{ borderCollapse: "collapse" }}>
            <thead><tr style={{ textAlign: "left", background: "#f1f5f9" }}>
              <th>PO #</th><th>Supplier</th><th>Items</th><th>Total</th><th>Status</th><th>Actions</th>
            </tr></thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o._id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                  <td>{o.poNumber}</td>
                  <td>{o.supplier?.name}</td>
                  <td>{o.items.map((i) => `${i.name} x${i.quantity}`).join(", ")}</td>
                  <td>${o.totalCost.toFixed(2)}</td>
                  <td>{o.status}</td>
                  <td>
                    {o.status === "Draft" && <button style={small} onClick={() => run(() => api.patch(`/materials/purchase-orders/${o._id}/status`, { status: "Ordered" }))}>Mark Ordered</button>}
                    {o.status === "Ordered" && <button style={{ ...small, background: "#16a34a" }} onClick={() => run(() => api.patch(`/materials/purchase-orders/${o._id}/status`, { status: "Received" }))}>Mark Received</button>}
                    {(o.status === "Draft" || o.status === "Ordered") && <button style={{ ...small, background: "#f59e0b" }} onClick={() => run(() => api.patch(`/materials/purchase-orders/${o._id}/status`, { status: "Cancelled" }))}>Cancel</button>}
                    {o.status === "Draft" && <button style={{ ...small, background: "#dc2626" }} onClick={() => run(() => api.delete(`/materials/purchase-orders/${o._id}`))}>Delete</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {/* USED MATERIALS */}
      {tab === "Used Materials" && (
        <>
          <form onSubmit={addUsage} style={{ ...card, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <select style={input} required value={uForm.material} onChange={(e) => setUForm({ ...uForm, material: e.target.value })}>
              <option value="">Select material</option>
              {materials.map((m) => <option key={m._id} value={m._id}>{m.name} ({m.quantity} {m.unit})</option>)}
            </select>
            <select style={input} required value={uForm.project} onChange={(e) => setUForm({ ...uForm, project: e.target.value })}>
              <option value="">Select project</option>
              {projects.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
            </select>
            <input style={{ ...input, width: 90 }} type="number" min="0.01" step="any" value={uForm.quantity} onChange={(e) => setUForm({ ...uForm, quantity: e.target.value })} />
            <input style={input} placeholder="Notes" value={uForm.notes} onChange={(e) => setUForm({ ...uForm, notes: e.target.value })} />
            <button style={btn}>Record Usage</button>
          </form>

          <table width="100%" cellPadding="8" style={{ borderCollapse: "collapse" }}>
            <thead><tr style={{ textAlign: "left", background: "#f1f5f9" }}>
              <th>Date</th><th>Material</th><th>Project</th><th>Qty</th><th>Cost</th><th></th>
            </tr></thead>
            <tbody>
              {usages.map((u) => (
                <tr key={u._id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                  <td>{new Date(u.date).toLocaleDateString()}</td>
                  <td>{u.material?.name}</td>
                  <td>{u.project?.name}</td>
                  <td>{u.quantity} {u.material?.unit}</td>
                  <td>${u.totalCost.toFixed(2)}</td>
                  <td><button style={{ ...small, background: "#dc2626" }}
                    onClick={() => window.confirm("Remove and restore stock?") && run(() => api.delete(`/materials/usage/${u._id}`))}>Remove</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}