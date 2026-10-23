import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../api/axios";

const empty = {
  name: "", businessName: "", email: "", phone: "", bio: "",
  specialization: "", experienceYears: 0, hourlyRate: 0,
  skills: "", serviceAreas: "",
  address: { street: "", city: "", state: "", zip: "", country: "" },
  license: { number: "", issuedBy: "", issueDate: "", expiryDate: "" },
  insurance: { provider: "", policyNumber: "", coverageAmount: "", expiryDate: "" },
  status: "Pending",
};

const toDate = (d) => (d ? d.substring(0, 10) : "");

export default function ContractorForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    api.get(`/contractors/${id}`).then(({ data }) => {
      setForm({
        ...empty,
        ...data,
        skills: (data.skills || []).join(", "),
        serviceAreas: (data.serviceAreas || []).join(", "),
        address: { ...empty.address, ...data.address },
        license: {
          ...empty.license, ...data.license,
          issueDate: toDate(data.license?.issueDate),
          expiryDate: toDate(data.license?.expiryDate),
        },
        insurance: {
          ...empty.insurance, ...data.insurance,
          expiryDate: toDate(data.insurance?.expiryDate),
        },
      });
    });
  }, [id]);

  const set = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const setNested = (group) => (e) =>
    setForm({ ...form, [group]: { ...form[group], [e.target.name]: e.target.value } });

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const csv = (s) => s.split(",").map((x) => x.trim()).filter(Boolean);
    const payload = {
      ...form,
      skills: csv(form.skills),
      serviceAreas: csv(form.serviceAreas),
    };
    try {
      if (id) await api.put(`/contractors/${id}`, payload);
      else await api.post("/contractors", payload);
      navigate("/contractors");
    } catch (err) {
      alert(err.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} style={{ padding: 24, maxWidth: 720, display: "grid", gap: 10 }}>
      <h2>{id ? "Edit" : "Add"} Contractor</h2>

      <h4>Basic Info</h4>
      <input name="name" placeholder="Full name *" value={form.name} onChange={set} required />
      <input name="businessName" placeholder="Business name" value={form.businessName} onChange={set} />
      <input name="specialization" placeholder="Specialization (e.g. Electrician)" value={form.specialization} onChange={set} />
      <input name="skills" placeholder="Skills (comma separated)" value={form.skills} onChange={set} />
      <input name="experienceYears" type="number" min="0" placeholder="Experience (years)" value={form.experienceYears} onChange={set} />
      <input name="hourlyRate" type="number" min="0" placeholder="Hourly rate" value={form.hourlyRate} onChange={set} />
      <textarea name="bio" placeholder="Bio" value={form.bio} onChange={set} />

      <h4>Contact Information</h4>
      <input name="email" type="email" placeholder="Email *" value={form.email} onChange={set} required />
      <input name="phone" placeholder="Phone" value={form.phone} onChange={set} />
      <input name="street" placeholder="Street" value={form.address.street} onChange={setNested("address")} />
      <input name="city" placeholder="City" value={form.address.city} onChange={setNested("address")} />
      <input name="state" placeholder="State" value={form.address.state} onChange={setNested("address")} />
      <input name="zip" placeholder="ZIP" value={form.address.zip} onChange={setNested("address")} />
      <input name="country" placeholder="Country" value={form.address.country} onChange={setNested("address")} />

      <h4>Service Area</h4>
      <input name="serviceAreas" placeholder="Cities / ZIPs (comma separated)" value={form.serviceAreas} onChange={set} />

      <h4>License Details</h4>
      <input name="number" placeholder="License number" value={form.license.number} onChange={setNested("license")} />
      <input name="issuedBy" placeholder="Issued by" value={form.license.issuedBy} onChange={setNested("license")} />
      <label>Issue date <input name="issueDate" type="date" value={form.license.issueDate} onChange={setNested("license")} /></label>
      <label>Expiry date <input name="expiryDate" type="date" value={form.license.expiryDate} onChange={setNested("license")} /></label>

      <h4>Insurance Details</h4>
      <input name="provider" placeholder="Provider" value={form.insurance.provider} onChange={setNested("insurance")} />
      <input name="policyNumber" placeholder="Policy number" value={form.insurance.policyNumber} onChange={setNested("insurance")} />
      <input name="coverageAmount" type="number" placeholder="Coverage amount" value={form.insurance.coverageAmount} onChange={setNested("insurance")} />
      <label>Expiry date <input name="expiryDate" type="date" value={form.insurance.expiryDate} onChange={setNested("insurance")} /></label>

      <h4>Status</h4>
      <select name="status" value={form.status} onChange={set}>
        <option>Pending</option>
        <option>Active</option>
        <option>Inactive</option>
      </select>

      <button disabled={saving}>{saving ? "Saving..." : "Save Contractor"}</button>
    </form>
  );
}