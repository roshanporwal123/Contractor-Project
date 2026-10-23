import { useState } from "react";
import api from "../../api/axios";

export default function BillingTab({ company, onSaved }) {
  const b = company.billing || {};
  const [f, setF] = useState({
    billingName: b.billingName || "",
    billingEmail: b.billingEmail || "",
    currency: b.currency || "USD",
    paymentTerms: b.paymentTerms || "Net 30",
    street: b.address?.street || "",
    city: b.address?.city || "",
    state: b.address?.state || "",
    zip: b.address?.zip || "",
    country: b.address?.country || "",
  });
  const [msg, setMsg] = useState("");
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    const { street, city, state, zip, country, ...rest } = f;
    try {
      const { data } = await api.put("/company/me/billing", {
        ...rest,
        address: { street, city, state, zip, country },
      });
      onSaved(data);
      setMsg("Saved ✅");
    } catch (err) {
      setMsg(err.response?.data?.message || "Error");
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
      />
    </label>
  );

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2">
        {field("Billing Name", "billingName")}
        {field("Billing Email", "billingEmail", "email")}
        {field("Currency", "currency")}
        {field("Payment Terms", "paymentTerms")}
        {field("Street", "street")}
        {field("City", "city")}
        {field("State", "state")}
        {field("ZIP", "zip")}
        {field("Country", "country")}
      </div>
      <button className="rounded bg-blue-600 px-4 py-2 text-white">Save Billing Info</button>
      {msg && <span className="ml-3 text-sm">{msg}</span>}
    </form>
  );
}