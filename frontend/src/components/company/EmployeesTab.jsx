import { useEffect, useState } from "react";
import api from "../../api/axios";

const empty = { name: "", email: "", phone: "", designation: "", department: "", status: "active" };

export default function EmployeesTab({ company }) {
  const [list, setList] = useState([]);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);
  const [err, setErr] = useState("");

  const load = () => api.get("/company/me/employees").then((r) => setList(r.data));
  useEffect(() => {
    load();
  }, []);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    try {
      if (editId) await api.put(`/company/me/employees/${editId}`, form);
      else await api.post("/company/me/employees", form);
      setForm(empty);
      setEditId(null);
      load();
    } catch (error) {
      setErr(error.response?.data?.message || "Error");
    }
  };

  const edit = (emp) => {
    setEditId(emp._id);
    setForm({
      name: emp.name,
      email: emp.email,
      phone: emp.phone || "",
      designation: emp.designation || "",
      department: emp.department || "",
      status: emp.status,
    });
  };

  const remove = async (id) => {
    if (!confirm("Delete employee?")) return;
    await api.delete(`/company/me/employees/${id}`);
    load();
  };

  const input = "rounded border p-2 text-sm";

  return (
    <div>
      <form onSubmit={submit} className="mb-4 grid gap-2 md:grid-cols-3">
        <input className={input} placeholder="Name *" value={form.name} onChange={set("name")} required />
        <input className={input} type="email" placeholder="Email *" value={form.email} onChange={set("email")} required />
        <input className={input} placeholder="Phone" value={form.phone} onChange={set("phone")} />
        <input className={input} placeholder="Designation" value={form.designation} onChange={set("designation")} />
        <select className={input} value={form.department} onChange={set("department")}>
          <option value="">Department</option>
          {company.departments.map((d) => (
            <option key={d._id} value={d.name}>{d.name}</option>
          ))}
        </select>
        <select className={input} value={form.status} onChange={set("status")}>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <button className="rounded bg-blue-600 px-4 py-2 text-white">
          {editId ? "Update" : "Add Employee"}
        </button>
        {editId && (
          <button
            type="button"
            onClick={() => {
              setEditId(null);
              setForm(empty);
            }}
            className="rounded border px-4 py-2"
          >
            Cancel
          </button>
        )}
      </form>
      {err && <p className="mb-2 text-sm text-red-600">{err}</p>}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-2">Name</th>
              <th>Email</th>
              <th>Dept</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {list.map((e) => (
              <tr key={e._id} className="border-t">
                <td className="p-2">
                  {e.name}
                  <div className="text-xs text-gray-500">{e.designation}</div>
                </td>
                <td>{e.email}</td>
                <td>{e.department}</td>
                <td>{e.status}</td>
                <td className="space-x-3">
                  <button onClick={() => edit(e)} className="text-blue-600">Edit</button>
                  <button onClick={() => remove(e._id)} className="text-red-600">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}