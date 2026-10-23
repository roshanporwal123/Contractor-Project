import { useState } from "react";
import api from "../../api/axios";
import { fileUrl } from "../../utils/fileUrl";

export default function ProfileTab({ company, onSaved }) {
  const bi = company?.businessInfo || {};
  const [f, setF] = useState({
    name: company?.name || "",
    email: company?.email || "",
    phone: company?.phone || "",
    website: company?.website || "",
    registrationNumber: bi.registrationNumber || "",
    taxId: bi.taxId || "",
    industry: bi.industry || "",
    foundedYear: bi.foundedYear || "",
    description: bi.description || "",
    street: bi.address?.street || "",
    city: bi.address?.city || "",
    state: bi.address?.state || "",
    zip: bi.address?.zip || "",
    country: bi.address?.country || "",
  });
  const [msg, setMsg] = useState("");
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    const body = {
      name: f.name,
      email: f.email,
      phone: f.phone,
      website: f.website,
      businessInfo: {
        registrationNumber: f.registrationNumber,
        taxId: f.taxId,
        industry: f.industry,
        foundedYear: f.foundedYear || undefined,
        description: f.description,
        address: {
          street: f.street,
          city: f.city,
          state: f.state,
          zip: f.zip,
          country: f.country,
        },
      },
    };
    try {
      const { data } = company
        ? await api.put("/company/me", body)
        : await api.post("/company", body);
      onSaved(data);
      setMsg("Saved ✅");
    } catch (err) {
      setMsg(err.response?.data?.message || "Error");
    }
  };

  const uploadLogo = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("logo", file);
    try {
      const { data } = await api.post("/company/me/logo", fd);
      onSaved(data);
    } catch (err) {
      setMsg(err.response?.data?.message || "Logo upload failed");
    }
  };

  const field = (label, k, type = "text") => (
    <label className="block text-sm">
      {label}
      <input
        type={type}
        className="w-full rounded border p-2 text-sm"
        value={f[k]}
        onChange={set(k)}
        required={k === "name"}
      />
    </label>
  );

  return (
    <form onSubmit={submit} className="space-y-4">
      {company && (
        <div className="flex items-center gap-4">
          {company.logo?.url ? (
            <img
              src={fileUrl(company.logo.url)}
              alt="logo"
              className="h-20 w-20 rounded object-cover"
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded bg-gray-100 text-xs">
              No logo
            </div>
          )}
          <input type="file" accept="image/*" onChange={uploadLogo} />
        </div>
      )}
      <div className="grid gap-3 md:grid-cols-2">
        {field("Company Name *", "name")}
        {field("Email", "email", "email")}
        {field("Phone", "phone")}
        {field("Website", "website")}
        {field("Registration No.", "registrationNumber")}
        {field("Tax ID", "taxId")}
        {field("Industry", "industry")}
        {field("Founded Year", "foundedYear", "number")}
      </div>
      <label className="block text-sm">
        Description
        <textarea
          className="w-full rounded border p-2 text-sm"
          rows={3}
          value={f.description}
          onChange={set("description")}
        />
      </label>
      <h3 className="font-semibold">Business Address</h3>
      <div className="grid gap-3 md:grid-cols-2">
        {field("Street", "street")}
        {field("City", "city")}
        {field("State", "state")}
        {field("ZIP", "zip")}
        {field("Country", "country")}
      </div>
      <button className="rounded bg-blue-600 px-4 py-2 text-white">
        {company ? "Save Changes" : "Create Company"}
      </button>
      {msg && <span className="ml-3 text-sm">{msg}</span>}
    </form>
  );
}