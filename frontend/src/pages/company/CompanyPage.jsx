import { useEffect, useState } from "react";
import api from "../../api/axios";
import ProfileTab from "../../components/company/ProfileTab";
import DepartmentsTab from "../../components/company/DepartmentsTab";
import EmployeesTab from "../../components/company/EmployeesTab";
import DocumentsTab from "../../components/company/DocumentsTab";
import BillingTab from "../../components/company/BillingTab";

const TABS = ["Profile", "Departments", "Employees", "Documents", "Billing"];

export default function CompanyPage() {
  const [company, setCompany] = useState(null);
  const [exists, setExists] = useState(true);
  const [tab, setTab] = useState("Profile");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/company/me")
      .then((r) => setCompany(r.data))
      .catch((e) => e.response?.status === 404 && setExists(false))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="p-6">Loading...</p>;

  if (!exists)
    return (
      <div className="mx-auto max-w-2xl p-6">
        <h1 className="mb-4 text-2xl font-bold">Create your company</h1>
        <ProfileTab
          company={null}
          onSaved={(c) => {
            setCompany(c);
            setExists(true);
          }}
        />
      </div>
    );

  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="mb-4 text-2xl font-bold">{company.name}</h1>
      <div className="mb-6 flex gap-2 overflow-x-auto border-b">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm ${
              tab === t ? "border-b-2 border-blue-600 font-semibold" : "text-gray-500"
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === "Profile" && <ProfileTab company={company} onSaved={setCompany} />}
      {tab === "Departments" && <DepartmentsTab company={company} onChange={setCompany} />}
      {tab === "Employees" && <EmployeesTab company={company} />}
      {tab === "Documents" && <DocumentsTab />}
      {tab === "Billing" && <BillingTab company={company} onSaved={setCompany} />}
    </div>
  );
}