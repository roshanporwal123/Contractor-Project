import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  getProject,
  updateProjectStatus,
  updateProjectProgress,
  removeContractor,
  uploadProjectDocs,
  deleteProjectDoc,
} from "../api/projectApi";

const API_URL = import.meta.env.VITE_API_URL?.replace("/api", "") || "https://contractor-backend.vercel.app/";

export default function ProjectDetail() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [progress, setProgress] = useState(0);

  const load = async () => {
    const { data } = await getProject(id);
    setProject(data.project);
    setProgress(data.project.progress);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line
  }, [id]);

  if (!project) return <p>Loading...</p>;

  const changeStatus = async (e) => {
    await updateProjectStatus(id, e.target.value);
    load();
  };

  const saveProgress = async () => {
    await updateProjectProgress(id, progress);
    load();
  };

  const handleRemove = async (cid) => {
    await removeContractor(id, cid);
    load();
  };

  const handleUpload = async (e) => {
    const files = e.target.files;
    if (!files.length) return;
    const fd = new FormData();
    [...files].forEach((f) => fd.append("files", f));
    try {
      await uploadProjectDocs(id, fd);
      e.target.value = "";
      load();
    } catch (err) {
      alert(err.response?.data?.message || "Upload failed");
    }
  };

  const handleDocDelete = async (docId) => {
    if (!window.confirm("Delete document?")) return;
    await deleteProjectDoc(id, docId);
    load();
  };

  return (
    <div style={{ padding: 20, maxWidth: 800 }}>
      <Link to="/projects">← Back</Link>
      <h2>{project.name}</h2>
      <p>{project.description}</p>

      <p>
        <b>Status:</b>{" "}
        <select value={project.status} onChange={changeStatus}>
          {["planning", "active", "on_hold", "completed", "cancelled"].map((s) => (
            <option key={s} value={s}>{s.replace("_", " ")}</option>
          ))}
        </select>
      </p>

      <p>
        <b>Progress:</b> {project.progress}%
        <div style={{ background: "#eee", height: 10, borderRadius: 5 }}>
          <div style={{ width: `${project.progress}%`, background: "#4caf50", height: 10, borderRadius: 5 }} />
        </div>
        <input type="range" min="0" max="100" value={progress}
          onChange={(e) => setProgress(e.target.value)} />
        <button onClick={saveProgress}>Update</button>
      </p>

      <h4>Client</h4>
      <p>
        {project.client?.name} | {project.client?.email} | {project.client?.phone}
        <br />
        {project.client?.address}
      </p>

      <h4>Location</h4>
      <p>
        {[project.location?.address, project.location?.city, project.location?.state, project.location?.zip]
          .filter(Boolean)
          .join(", ")}
      </p>

      <h4>Schedule & Budget</h4>
      <p>
        {new Date(project.startDate).toLocaleDateString()} →{" "}
        {project.endDate ? new Date(project.endDate).toLocaleDateString() : "—"} | Budget: ${project.budget}
      </p>

      <h4>Assigned Contractors</h4>
      <ul>
        {project.contractors.map((c) => (
          <li key={c._id}>
            {c.name} ({c.status}){" "}
            <button onClick={() => handleRemove(c._id)}>Remove</button>
          </li>
        ))}
        {!project.contractors.length && <li>None assigned</li>}
      </ul>
      <Link to={`/projects/${id}/edit`}>Edit / assign more</Link>

      <h4>Documents</h4>
      <input type="file" multiple onChange={handleUpload} />
      <ul>
        {project.documents.map((d) => (
          <li key={d._id}>
            <a href={`${API_URL}${d.url}`} target="_blank" rel="noreferrer">{d.name}</a>{" "}
            <button onClick={() => handleDocDelete(d._id)}>Delete</button>
          </li>
        ))}
        {!project.documents.length && <li>No documents</li>}
      </ul>
    </div>
  );
}