import PDFDocument from "pdfkit";

const money = (n) => `$${Number(n || 0).toFixed(2)}`;

export const buildEstimatePdf = (estimate, companyName = "Company") => {
  const doc = new PDFDocument({ margin: 50, size: "A4" });

  doc.fontSize(20).text("ESTIMATE", { align: "right" });
  doc.fontSize(10).fillColor("#555")
    .text(`No: ${estimate.estimateNumber}`, { align: "right" })
    .text(`Date: ${new Date(estimate.createdAt).toLocaleDateString()}`, { align: "right" });
  if (estimate.validUntil)
    doc.text(`Valid until: ${new Date(estimate.validUntil).toLocaleDateString()}`, { align: "right" });

  doc.moveDown().fillColor("#000").fontSize(14).text(companyName);
  doc.moveDown(0.5).fontSize(11).text("Prepared for:", { underline: true });
  doc.fontSize(10)
    .text(estimate.client.name)
    .text(estimate.client.email)
    .text(estimate.client.phone || "")
    .text(estimate.client.address || "");

  doc.moveDown().fontSize(13).text(estimate.title);
  doc.moveDown(0.5);

  const section = (title, rows) => {
    if (!rows.length) return;
    doc.moveDown(0.5).fontSize(11).fillColor("#000").text(title, { underline: true });
    doc.fontSize(10);
    rows.forEach(([a, b]) => {
      const y = doc.y;
      doc.text(a, 50, y, { width: 380 });
      doc.text(b, 440, y, { width: 100, align: "right" });
    });
  };

  section("Labor", estimate.laborItems.map((i) => [`${i.description} (${i.hours}h x ${money(i.rate)})`, money(i.amount)]));
  section("Materials", estimate.materialItems.map((i) => [`${i.name} (${i.quantity} x ${money(i.unitCost)})`, money(i.amount)]));
  section("Additional Expenses", estimate.additionalExpenses.map((i) => [i.description, money(i.amount)]));

  doc.moveDown();
  const totals = [
    ["Subtotal", money(estimate.subtotal)],
    [
      `Discount${estimate.discountType === "percent" ? ` (${estimate.discountValue}%)` : ""}`,
      `-${money(estimate.discountAmount)}`,
    ],
    [`Tax (${estimate.taxRate}%)`, money(estimate.taxAmount)],
  ];
  totals.forEach(([a, b]) => {
    const y = doc.y;
    doc.text(a, 300, y, { width: 130 });
    doc.text(b, 440, y, { width: 100, align: "right" });
  });
  doc.moveDown(0.3).fontSize(13).font("Helvetica-Bold");
  const y = doc.y;
  doc.text("TOTAL", 300, y, { width: 130 });
  doc.text(money(estimate.total), 440, y, { width: 100, align: "right" });
  doc.font("Helvetica");

  if (estimate.notes) {
    doc.moveDown(2).fontSize(10).text("Notes:", 50, doc.y, { underline: true });
    doc.text(estimate.notes, 50, doc.y, { width: 490 });
  }
  return doc;
};