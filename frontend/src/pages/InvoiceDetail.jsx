import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "../api/axios";

export default function InvoiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [inv, setInv] = useState(null);
  const [error, setError] = useState("");
  const [pay, setPay] = useState({ amount: "", method: "cash", reference: "", note: "" });

  const load = () => api.get(`/invoices/${id}`).then(({ data }) => setInv(data.invoice));
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  // const payResult = new URLSearchParams(window.location.search).get("payment");

  // useEffect(() => {
  // if (payResult === "success") setTimeout(load, 2500); // webhook ko thoda time do
  // // eslint-disable-next-line
  // }, []);
  const qs = new URLSearchParams(window.location.search);
  const payResult = qs.get("payment");
  const pid = qs.get("pid");

  useEffect(() => {
    if (payResult === "success" && pid) {
      api.post(`/payments/${pid}/verify`).then(load).catch(() => setTimeout(load, 2500));
    }
    // eslint-disable-next-line
  }, []);

  const payOnline = async () => {
  const amount = window.prompt("Kitna pay karna hai? (full ke liye jaisa hai rehne do)", inv.balanceDue);
  if (amount === null) return;
  try {
    const { data } = await api.post(`/payments/checkout/${id}`, { amount: Number(amount) });
    window.location.href = data.url;
  } catch (err) {
    setError(err.response?.data?.message || "Payment start nahi hui");
  }
 };
  const addPayment = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api.post(`/invoices/${id}/payments`, { ...pay, amount: Number(pay.amount) });
      setPay({ amount: "", method: "cash", reference: "", note: "" });
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Payment failed");
    }
  };

  const downloadPdf = async () => {
    const res = await api.get(`/invoices/${id}/pdf`, { responseType: "blob" });
    const url = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${inv.invoiceNumber}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const cancel = async () => {
    if (!window.confirm("Invoice cancel karna hai?")) return;
    await api.patch(`/invoices/${id}/cancel`);
    load();
  };

  const remove = async () => {
    if (!window.confirm("Invoice delete karna hai?")) return;
    try {
      await api.delete(`/invoices/${id}`);
      navigate("/invoices");
    } catch (err) {
      setError(err.response?.data?.message || "Delete failed");
    }
  };

  if (!inv) return <p style={{ padding: 24 }}>Loading...</p>;

  const canEdit = !inv.payments.length && inv.status !== "cancelled";
  const canPay = inv.status !== "cancelled" && inv.balanceDue > 0;

  return (
    <div style={{ padding: 24, maxWidth: 800 }}>
      <Link to="/invoices">← Back</Link>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>{inv.invoiceNumber} <small>({inv.status})</small></h2>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={downloadPdf}>Download PDF</button>
          {canPay && <button onClick={payOnline}>Pay Online (Stripe)</button>}
          {canEdit && <Link to={`/invoices/${id}/edit`}>Edit</Link>}
          {inv.status !== "paid" && inv.status !== "cancelled" && <button onClick={cancel}>Cancel</button>}
          {!inv.payments.length && <button onClick={remove}>Delete</button>}
        </div>
      </div>
      {error && <p style={{ color: "red" }}>{error}</p>}
      {payResult === "success" && <p style={{ color: "green" }}>Payment ho gayi! Status update ho raha hai...</p>}
      {payResult === "cancelled" && <p style={{ color: "#ca8a04" }}>Payment cancel ho gayi.</p>}

      <p>
        <strong>{inv.client.name}</strong><br />
        {inv.client.email} {inv.client.phone}<br />
        {inv.client.address}<br />
        {inv.project?.name && <>Project: {inv.project.name}<br /></>}
        Issued: {new Date(inv.issueDate).toLocaleDateString()} | Due: {new Date(inv.dueDate).toLocaleDateString()}
      </p>

      {inv.laborItems.length > 0 && (
        <Table title="Labor" head={["Description", "Hours", "Rate", "Amount"]}
          rows={inv.laborItems.map((i) => [i.description, i.hours, `$${i.rate}`, `$${i.amount.toFixed(2)}`])} />
      )}
      {inv.materialItems.length > 0 && (
        <Table title="Materials" head={["Description", "Qty", "Unit Price", "Amount"]}
          rows={inv.materialItems.map((i) => [i.description, i.quantity, `$${i.unitPrice}`, `$${i.amount.toFixed(2)}`])} />
      )}

      <div style={{ textAlign: "right", margin: "16px 0" }}>
        <div>Subtotal: ${inv.subtotal.toFixed(2)}</div>
        <div>Discount: -${inv.discountAmount.toFixed(2)}</div>
        <div>Tax ({inv.taxRate}%): ${inv.taxAmount.toFixed(2)}</div>
        <div><strong>Total: ${inv.total.toFixed(2)}</strong></div>
        <div>Paid: ${inv.amountPaid.toFixed(2)}</div>
        <div><strong>Balance Due: ${inv.balanceDue.toFixed(2)}</strong></div>
      </div>

      {inv.notes && <p><em>{inv.notes}</em></p>}

      <h3>Payment History</h3>
      {inv.payments.length ? (
        <Table head={["Date", "Method", "Reference", "Amount"]}
          rows={inv.payments.map((p) => [
            new Date(p.date).toLocaleDateString(), p.method.replace("_", " "), p.reference || "-", `$${p.amount.toFixed(2)}`,
          ])} />
      ) : <p>Abhi koi payment nahi hui</p>}

      {canPay && (
        <form onSubmit={addPayment} style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 12 }}>
          <input required type="number" min="0.01" step="0.01" max={inv.balanceDue} placeholder="Amount"
            value={pay.amount} onChange={(e) => setPay({ ...pay, amount: e.target.value })} />
          <select value={pay.method} onChange={(e) => setPay({ ...pay, method: e.target.value })}>
            <option value="cash">Cash</option>
            <option value="card">Card</option>
            <option value="bank_transfer">Bank transfer</option>
            <option value="cheque">Cheque</option>
            <option value="other">Other</option>
          </select>
          <input placeholder="Reference" value={pay.reference} onChange={(e) => setPay({ ...pay, reference: e.target.value })} />
          <button type="submit">Record Payment</button>
        </form>
      )}
    </div>
  );
}

const Table = ({ title, head, rows }) => (
  <>
    {title && <h4>{title}</h4>}
    <table width="100%" cellPadding={6} style={{ borderCollapse: "collapse" }}>
      <thead>
        <tr style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>
          {head.map((h) => <th key={h}>{h}</th>)}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} style={{ borderBottom: "1px solid #eee" }}>
            {r.map((c, j) => <td key={j}>{c}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  </>
);