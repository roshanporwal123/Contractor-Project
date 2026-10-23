import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import api from "../../api/axios";
import { ADMIN_RESOURCES } from "./adminConfig";

const renderCell = (row, col) => {
  const val = row[col.key];
  if (val === undefined || val === null || val === "") return "-";
  if (col.type === "bool") return val ? "Yes" : "No";
  if (col.type === "date") return new Date(val).toLocaleDateString();
  if (col.type === "badge") return <span className="badge">{String(val)}</span>;
  if (typeof val === "object") return val.name || val._id || "-";
  return String(val);
};

export default function ResourceManager() {
  const { resource } = useParams();
  const cfg = ADMIN_RESOURCES[resource];

  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(null); // null | { isNew, form }

  useEffect(() => {
    setPage(1);
    setSearch("");
    setQ("");
  }, [resource]);

  const load = useCallback(async () => {
    if (!cfg) return;
    setLoading(true);
    setError("");
    try {
      const res = await api.get(`/admin/${resource}`, { params: { page, q, limit: 10 } });
      setRows(res.data.data);
      setPages(res.data.pages);
    } catch (e) {
      setRows([]);
      setError(e.response?.data?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [resource, page, q, cfg]);

  useEffect(() => {
    load();
  }, [load]);

  if (!cfg) return <p>Unknown section</p>;

  const openNew = () => setModal({ isNew: true, form: {} });
  const openEdit = (row) => setModal({ isNew: false, form: { ...row } });

  const save = async (e) => {
    e.preventDefault();
    try {
      const { form, isNew } = modal;
      if (isNew) await api.post(`/admin/${resource}`, form);
      else await api.put(`/admin/${resource}/${form._id}`, form);
      setModal(null);
      load();
    } catch (err) {
      alert(err.response?.data?.message || "Save failed");
    }
  };

  const remove = async (row) => {
    if (!window.confirm("Are you sure you want to delete this?")) return;
    try {
      await api.delete(`/admin/${resource}/${row._id}`);
      load();
    } catch (err) {
      alert(err.response?.data?.message || "Delete failed");
    }
  };

  const setField = (name, value) =>
    setModal((m) => ({ ...m, form: { ...m.form, [name]: value } }));

  const visibleFields = modal ? cfg.fields.filter((f) => modal.isNew || !f.createOnly) : [];

  return (
    <div>
      <div className="adm-head">
        <h1>{cfg.title}</h1>
        {cfg.canCreate && <button className="btn" onClick={openNew}>+ Add New</button>}
      </div>

      <form
        className="adm-search"
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          setQ(search);
        }}
      >
        <input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <button className="btn">Search</button>
      </form>

      {error && <p className="adm-error">{error}</p>}

      <div className="adm-tablewrap">
        <table>
          <thead>
            <tr>
              {cfg.columns.map((c) => <th key={c.key}>{c.label}</th>)}
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={cfg.columns.length + 1}>Loading...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={cfg.columns.length + 1}>No records found</td></tr>
            ) : (
              rows.map((row) => (
                <tr key={row._id}>
                  {cfg.columns.map((c) => <td key={c.key}>{renderCell(row, c)}</td>)}
                  <td className="actions">
                    {cfg.fields.length > 0 && <button className="btn sm" onClick={() => openEdit(row)}>Edit</button>}
                    <button className="btn sm danger" onClick={() => remove(row)}>Delete</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="adm-pager">
        <button className="btn sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Prev</button>
        <span>Page {page} / {pages}</span>
        <button className="btn sm" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</button>
      </div>

      {modal && (
        <div className="adm-overlay">
          <form className="adm-modal" onSubmit={save}>
            <h3>{modal.isNew ? "Add" : "Edit"} {cfg.title}</h3>
            {visibleFields.map((f) => (
              <label key={f.name}>
                {f.label}
                {f.type === "select" ? (
                  <select value={modal.form[f.name] || ""} onChange={(e) => setField(f.name, e.target.value)}>
                    <option value="">-- select --</option>
                    {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : f.type === "checkbox" ? (
                  <input type="checkbox" checked={!!modal.form[f.name]} onChange={(e) => setField(f.name, e.target.checked)} />
                ) : f.type === "textarea" ? (
                  <textarea rows={3} value={modal.form[f.name] || ""} onChange={(e) => setField(f.name, e.target.value)} />
                ) : (
                  <input
                    type={f.type}
                    value={modal.form[f.name] || ""}
                    onChange={(e) => setField(f.name, e.target.value)}
                    required={modal.isNew && (f.type === "password" || f.name === "name" || f.name === "email")}
                  />
                )}
              </label>
            ))}
            <div className="adm-modal-actions">
              <button type="button" className="btn sm" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn sm primary">Save</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}