import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { estimateApi } from "../../api/estimateApi";

export default function PublicEstimate() {
  const { token } = useParams();
  const [e, setE] = useState(null);
  const [error, setError] = useState("");
  const [reason, setReason] = useState("");
  const [showReject, setShowReject] = useState(false);

  const load = () =>
    estimateApi.publicGet(token)
      .then(({ data }) => setE(data))
      .catch(() => setError("Estimate not found or link invalid"));

  useEffect(() => { load(); }, [token]);

  const respond = async (action) => {
    try {
      await estimateApi.publicRespond(token, { action, reason });
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Action failed");
    }
  };

  if (error) return <p style={{ padding: 20, color: "red" }}>{error}</p>;
  if (!e) return <p style={{ padding: 20 }}>Loading...</p>;

  const row = (a, b) => (
    <tr><td>{a}</td><td align="right">${b.toFixed(2)}</td></tr>
  );

  return (
    <div style={{ maxWidth: 700, margin: "30px auto", padding: 20, border: "1px solid #ddd" }}>
      <h2>Estimate {e.estimateNumber}</h2>
      <h3>{e.title}</h3>
      <p>For: <b>{e.client.name}</b> ({e.client.email})</p>
      {e.validUntil && <p>Valid until: {new Date(e.validUntil).toLocaleDateString()}</p>}

      <table width="100%" cellPadding="6">
        <tbody>
          {e.laborItems.map((i) => row(`${i.description} (${i.hours}h x $${i.rate})`, i.amount))}
          {e.materialItems.map((i) => row(`${i.name} (${i.quantity} x $${i.unitCost})`, i.amount))}
          {e.additionalExpenses.map((i) => row(i.description, i.amount))}
          <tr><td colSpan="2"><hr /></td></tr>
          {row("Subtotal", e.subtotal)}
          {row("Discount", -e.discountAmount)}
          {row(`Tax (${e.taxRate}%)`, e.taxAmount)}
          <tr style={{ fontWeight: 700, fontSize: 18 }}>
            <td>Total</td><td align="right">${e.total.toFixed(2)}</td>
          </tr>
        </tbody>
      </table>

      {e.notes && <p><b>Notes:</b> {e.notes}</p>}

      {e.status === "sent" ? (
        <div style={{ marginTop: 20 }}>
          <button onClick={() => respond("accept")} style={{ background: "#16a34a", color: "#fff", padding: "8px 16px" }}>
            Accept
          </button>{" "}
          <button onClick={() => setShowReject(true)} style={{ background: "#dc2626", color: "#fff", padding: "8px 16px" }}>
            Reject
          </button>
          {showReject && (
            <div style={{ marginTop: 10 }}>
              <textarea rows="3" style={{ width: "100%" }} placeholder="Reason (optional)" value={reason} onChange={(ev) => setReason(ev.target.value)} />
              <button onClick={() => respond("reject")}>Confirm Reject</button>
            </div>
          )}
        </div>
      ) : (
        <h3 style={{ marginTop: 20 }}>Status: {e.status.toUpperCase()}</h3>
      )}
    </div>
  );
}