import { useState } from "react";
import api from "../../api/axios";

export default function DepartmentsTab({ company, onChange }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const refresh = (departments) => onChange({ ...company, departments });

  const add = async (e) => {
    e.preventDefault();
    const { data } = await api.post("/company/me/departments", { name, description });
    refresh(data);
    setName("");
    setDescription("");
  };

  const remove = async (id) => {
    if (!confirm("Delete department?")) return;
    const { data } = await api.delete(`/company/me/departments/${id}`);
    refresh(data);
  };

  const rename = async (d) => {
    const newName = prompt("New name", d.name);
    if (!newName) return;
    const { data } = await api.put(`/company/me/departments/${d._id}`, { name: newName });
    refresh(data);
  };

  return (
    <div>
      <form onSubmit={add} className="mb-4 flex flex-wrap gap-2">
        <input
          className="rounded border p-2 text-sm"
          placeholder="Department name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <input
          className="flex-1 rounded border p-2 text-sm"
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <button className="rounded bg-blue-600 px-4 py-2 text-white">Add</button>
      </form>
      <ul className="divide-y rounded border">
        {company.departments.map((d) => (
          <li key={d._id} className="flex items-center justify-between p-3">
            <div>
              <p className="font-medium">{d.name}</p>
              <p className="text-xs text-gray-500">{d.description}</p>
            </div>
            <div className="flex gap-3 text-sm">
              <button onClick={() => rename(d)} className="text-blue-600">Edit</button>
              <button onClick={() => remove(d._id)} className="text-red-600">Delete</button>
            </div>
          </li>
        ))}
        {!company.departments.length && (
          <li className="p-3 text-sm text-gray-500">No departments yet</li>
        )}
      </ul>
    </div>
  );
}