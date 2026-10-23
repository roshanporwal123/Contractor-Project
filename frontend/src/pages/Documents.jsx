import { useEffect, useState, useCallback } from "react";
import api from "../api/axios";

const CATEGORIES = [
  { value: "contract", label: "Contract" },
  { value: "w9", label: "W-9" },
  { value: "insurance_certificate", label: "Insurance Certificate" },
  { value: "license", label: "License" },
  { value: "project_document", label: "Project Document" },
  { value: "invoice", label: "Invoice" },
  { value: "estimate", label: "Estimate" },
  { value: "other", label: "Other" },
];

const labelOf = (v) => CATEGORIES.find((c) => c.value === v)?.label || v;

const badgeStyle = (status) => {
  const map = {
    expired: { background: "#fee2e2", color: "#b91c1c" },
    expiring_soon: { background: "#fef3c7", color: "#b45309" },
    valid: { background: "#dcfce7", color: "#15803d" },
    none: { background: "#f3f4f6", color: "#6b7280" },
  };
  return { ...map[status], padding: "2px 8px", borderRadius: 12, fontSize: 12 };
};

const emptyForm = {
  title: "",
  category: "contract",
  description: "",
  project: "",
  contractor: "",
  expiryDate: "",
  reminderDaysBefore: 30,
};

const formatSize = (b = 0) => (b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(b / 1024)} KB`);

export default function Documents() {
  const [documents, setDocuments] = useState([]);
  const [summary, setSummary] = useState(null);
  const [projects, setProjects] = useState([]);
  const [contractors, setContractors] = useState([]);
  const [filters, setFilters] = useState({ category: "", expiry: "", search: "" });
  const [form, setForm] = useState(emptyForm);
  const [file, setFile] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
      const [docs, sum] = await Promise.all([
        api.get("/documents", { params }),
        api.get("/documents/summary"),
      ]);
      setDocuments(docs.data.documents);
      setSummary(sum.data);
    } catch (e) {
      setError(e.response?.data?.message || "Failed to load documents");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  // Dropdowns ke liye projects & contractors (response shape alag ho to yaha adjust karo)
  useEffect(() => {
    const pick = (d, key) => (Array.isArray(d) ? d : d?.[key] || []);
    api.get("/projects").then((r) => setProjects(pick(r.data, "projects"))).catch(() => {});
    api.get("/contractors").then((r) => setContractors(pick(r.data, "contractors"))).catch(() => {});
  }, []);

  const resetForm = () => {
    setForm(emptyForm);
    setFile(null);
    setEditingId(null);
    setShowForm(false);
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!editingId && !file) return setError("Please choose a file");

    const data = new FormData();
    Object.entries(form).forEach(([k, v]) => data.append(k, v ?? ""));
    if (file) data.append("file", file);

    try {
      if (editingId) {
        await api.put(`/documents/${editingId}`, data);
      } else {
        await api.post("/documents", data);
      }
      resetForm();
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Save failed");
    }
  };

  const handleEdit = (d) => {
    setEditingId(d._id);
    setForm({
      title: d.title,
      category: d.category,
      description: d.description || "",
      project: d.project?._id || "",
      contractor: d.contractor?._id || "",
      expiryDate: d.expiryDate ? d.expiryDate.slice(0, 10) : "",
      reminderDaysBefore: d.reminderDaysBefore || 30,
    });
    setFile(null);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this document?")) return;
    try {
      await api.delete(`/documents/${id}`);
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Delete failed");
    }
  };

  const handleDownload = async (d) => {
    try {
      const res = await api.get(`/documents/${d._id}/download`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = d.file?.originalName || "document";
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      setError("Download failed");
    }
  };

  const contractorName = (c) => (c ? c.name || `${c.firstName || ""} ${c.lastName || ""}`.trim() : "-");

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>Document Management</h2>
        <button onClick={() => (showForm ? resetForm() : setShowForm(true))}>
          {showForm ? "Close" : "+ Upload Document"}
        </button>
      </div>

      {error && <p style={{ color: "#b91c1c" }}>{error}</p>}

      {/* Summary */}
      {summary && (
        <div style={{ display: "flex", gap: 12, margin: "16px 0", flexWrap: "wrap" }}>
          <Card title="Total" value={summary.total} />
          <Card title="Expiring (30d)" value={summary.expiringSoon} color="#b45309" />
          <Card title="Expired" value={summary.expired} color="#b91c1c" />
        </div>
      )}

      {/* Upload / Edit form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          style={{ display: "grid", gap: 10, padding: 16, border: "1px solid #e5e7eb", borderRadius: 8, marginBottom: 20 }}
        >
          <h3>{editingId ? "Edit Document" : "Upload Document"}</h3>
          <input
            placeholder="Title *"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />
          <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          <textarea
            placeholder="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <select value={form.project} onChange={(e) => setForm({ ...form, project: e.target.value })}>
            <option value="">-- Link project (optional) --</option>
            {projects.map((p) => (
              <option key={p._id} value={p._id}>{p.name}</option>
            ))}
          </select>
          <select value={form.contractor} onChange={(e) => setForm({ ...form, contractor: e.target.value })}>
            <option value="">-- Link contractor (optional) --</option>
            {contractors.map((c) => (
              <option key={c._id} value={c._id}>{contractorName(c)}</option>
            ))}
          </select>
          <label>
            Expiry date (optional)
            <input
              type="date"
              value={form.expiryDate}
              onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
            />
          </label>
          <label>
            Remind before (days)
            <input
              type="number"
              min="1"
              value={form.reminderDaysBefore}
              onChange={(e) => setForm({ ...form, reminderDaysBefore: e.target.value })}
            />
          </label>
          <label>
            File {editingId ? "(naya file choose karoge to version badh jayega)" : "*"}
            <input type="file" onChange={(e) => setFile(e.target.files[0])} />
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="submit">{editingId ? "Update" : "Upload"}</button>
            <button type="button" onClick={resetForm}>Cancel</button>
          </div>
        </form>
      )}

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
        <input
          placeholder="Search title..."
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
        />
        <select value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })}>
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
        <select value={filters.expiry} onChange={(e) => setFilters({ ...filters, expiry: e.target.value })}>
          <option value="">All expiry</option>
          <option value="expiring">Expiring soon</option>
          <option value="expired">Expired</option>
          <option value="valid">Valid</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <p>Loading...</p>
      ) : documents.length === 0 ? (
        <p>No documents found.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table width="100%" cellPadding="8" style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "2px solid #e5e7eb" }}>
                <th>Title</th>
                <th>Category</th>
                <th>Project</th>
                <th>Contractor</th>
                <th>File</th>
                <th>Expiry</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((d) => (
                <tr key={d._id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td>
                    {d.title} <small style={{ color: "#9ca3af" }}>v{d.version}</small>
                  </td>
                  <td>{labelOf(d.category)}</td>
                  <td>{d.project?.name || "-"}</td>
                  <td>{contractorName(d.contractor)}</td>
                  <td>
                    {d.file?.originalName} <small>({formatSize(d.file?.size)})</small>
                  </td>
                  <td>
                    <span style={badgeStyle(d.expiryStatus)}>
                      {d.expiryDate
                        ? `${new Date(d.expiryDate).toLocaleDateString()} · ${d.expiryStatus.replace("_", " ")}`
                        : "No expiry"}
                    </span>
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <button onClick={() => handleDownload(d)}>Download</button>{" "}
                    <button onClick={() => handleEdit(d)}>Edit</button>{" "}
                    <button onClick={() => handleDelete(d._id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Card({ title, value, color = "#111827" }) {
  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: "10px 18px", minWidth: 120 }}>
      <div style={{ fontSize: 12, color: "#6b7280" }}>{title}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color }}>{value}</div>
    </div>
  );
}