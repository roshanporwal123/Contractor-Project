import { useEffect, useState } from "react";
import api from "../../api/axios";
import { fileUrl } from "../../utils/fileUrl";

export default function DocumentsTab() {
  const [docs, setDocs] = useState([]);
  const [title, setTitle] = useState("");
  const [type, setType] = useState("other");
  const [expiryDate, setExpiryDate] = useState("");
  const [file, setFile] = useState(null);
  const [err, setErr] = useState("");

  const load = () => api.get("/company/me/documents").then((r) => setDocs(r.data));
  useEffect(() => {
    load();
  }, []);

  const upload = async (e) => {
    e.preventDefault();
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    fd.append("title", title);
    fd.append("type", type);
    if (expiryDate) fd.append("expiryDate", expiryDate);
    try {
      await api.post("/company/me/documents", fd);
      setTitle("");
      setFile(null);
      setExpiryDate("");
      e.target.reset();
      setErr("");
      load();
    } catch (error) {
      setErr(error.response?.data?.message || "Upload failed");
    }
  };

  const remove = async (id) => {
    if (!confirm("Delete document?")) return;
    await api.delete(`/company/me/documents/${id}`);
    load();
  };

  const input = "rounded border p-2 text-sm";

  return (
    <div>
      <form onSubmit={upload} className="mb-4 grid gap-2 md:grid-cols-3">
        <input className={input} placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <select className={input} value={type} onChange={(e) => setType(e.target.value)}>
          {["license", "insurance", "contract", "tax", "registration", "other"].map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <input className={input} type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
        <input type="file" onChange={(e) => setFile(e.target.files[0])} required />
        <button className="rounded bg-blue-600 px-4 py-2 text-white">Upload</button>
      </form>
      {err && <p className="mb-2 text-sm text-red-600">{err}</p>}
      <ul className="divide-y rounded border">
        {docs.map((d) => (
          <li key={d._id} className="flex items-center justify-between p-3 text-sm">
            <div>
              <a href={fileUrl(d.fileUrl)} target="_blank" rel="noreferrer" className="font-medium text-blue-600">
                {d.title}
              </a>
              <p className="text-xs text-gray-500">
                {d.type}
                {d.expiryDate && ` • expires ${new Date(d.expiryDate).toLocaleDateString()}`}
              </p>
            </div>
            <button onClick={() => remove(d._id)} className="text-red-600">Delete</button>
          </li>
        ))}
        {!docs.length && <li className="p-3 text-sm text-gray-500">No documents yet</li>}
      </ul>
    </div>
  );
}