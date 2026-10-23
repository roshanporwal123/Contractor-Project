import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../../api/axios";

const FILE_BASE = import.meta.env.VITE_API_URL?.replace("/api", "") || "https://contractor-backend.vercel.app/";

export default function ContractorProfile() {
  const { id } = useParams();
  const [c, setC] = useState(null);
  const [files, setFiles] = useState([]);
  const [docType, setDocType] = useState("license");

  const load = () => api.get(`/contractors/${id}`).then(({ data }) => setC(data));
  useEffect(() => { load(); }, [id]);

  const upload = async (e) => {
    e.preventDefault();
    if (!files.length) return;
    const fd = new FormData();
    [...files].forEach((f) => fd.append("files", f));
    fd.append("type", docType);
    try {
      await api.post(`/contractors/${id}/documents`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setFiles([]);
      e.target.reset();
      load();
    } catch (err) {
      alert(err.response?.data?.message || "Upload failed");
    }
  };

  const removeDoc = async (docId) => {
    if (!window.confirm("Delete document?")) return;
    await api.delete(`/contractors/${id}/documents/${docId}`);
    load();
  };

  if (!c) return <p style={{ padding: 24 }}>Loading...</p>;

  const fmt = (d) => (d ? new Date(d).toLocaleDateString() : "-");

  return (
    <div style={{ padding: 24, maxWidth: 800 }}>
      <Link to="/contractors">← Back</Link>
      <h2>{c.name} <small>({c.status})</small></h2>
      <p>{c.specialization} {c.businessName && `• ${c.businessName}`}</p>
      <p>{c.bio}</p>

      <h4>Contact</h4>
      <p>{c.email} | {c.phone || "-"}</p>
      <p>{[c.address?.street, c.address?.city, c.address?.state, c.address?.zip, c.address?.country].filter(Boolean).join(", ") || "-"}</p>

      <h4>Skills</h4>
      <p>{c.skills?.join(", ") || "-"}</p>
      <p>Experience: {c.experienceYears} yrs | Rate: ${c.hourlyRate}/hr</p>

      <h4>Service Area</h4>
      <p>{c.serviceAreas?.join(", ") || "-"}</p>

      <h4>License</h4>
      <p>#{c.license?.number || "-"} • {c.license?.issuedBy || "-"} • Expires: {fmt(c.license?.expiryDate)}</p>

      <h4>Insurance</h4>
      <p>{c.insurance?.provider || "-"} • Policy {c.insurance?.policyNumber || "-"} • Coverage: {c.insurance?.coverageAmount || "-"} • Expires: {fmt(c.insurance?.expiryDate)}</p>

      <h4>Documents</h4>
      <form onSubmit={upload} style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <select value={docType} onChange={(e) => setDocType(e.target.value)}>
          <option value="license">License</option>
          <option value="insurance">Insurance</option>
          <option value="w9">W-9</option>
          <option value="contract">Contract</option>
          <option value="other">Other</option>
        </select>
        <input type="file" multiple onChange={(e) => setFiles(e.target.files)} />
        <button>Upload</button>
      </form>

      <ul>
        {c.documents.map((d) => (
          <li key={d._id}>
            <a href={`${FILE_BASE}${d.url}`} target="_blank" rel="noreferrer">{d.name}</a>{" "}
            <small>[{d.type}]</small>{" "}
            <button onClick={() => removeDoc(d._id)}>x</button>
          </li>
        ))}
        {!c.documents.length && <li>No documents</li>}
      </ul>
    </div>
  );
}