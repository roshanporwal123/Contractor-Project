import PDFDocument from "pdfkit";

const money = (n) => `$${Number(n || 0).toFixed(2)}`;
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-US") : "-");

export const buildInvoicePdf = (inv, res) => {
  const doc = new PDFDocument({ margin: 50, size: "A4" });
  doc.pipe(res);

  const companyName = inv.company?.name || inv.company?.companyName || "Company";

  /* Header */
  doc.fontSize(22).font("Helvetica-Bold").text("INVOICE", 50, 50);
  doc.fontSize(10).font("Helvetica");
  doc.text(companyName, 350, 50, { align: "right" });
  doc.text(`Invoice #: ${inv.invoiceNumber}`, 350, 66, { align: "right" });
  doc.text(`Issue Date: ${fmtDate(inv.issueDate)}`, 350, 80, { align: "right" });
  doc.text(`Due Date: ${fmtDate(inv.dueDate)}`, 350, 94, { align: "right" });
  doc.font("Helvetica-Bold").text(`Status: ${inv.status.toUpperCase()}`, 350, 108, { align: "right" });

  /* Bill to */
  doc.font("Helvetica-Bold").fontSize(11).text("Bill To", 50, 140);
  doc.font("Helvetica").fontSize(10);
  doc.text(inv.client.name, 50, 156);
  if (inv.client.email) doc.text(inv.client.email);
  if (inv.client.phone) doc.text(inv.client.phone);
  if (inv.client.address) doc.text(inv.client.address, { width: 250 });
  if (inv.project?.name) doc.text(`Project: ${inv.project.name}`, 320, 156);

  let y = 235;

  const drawTable = (title, headers, rows) => {
    if (!rows.length) return;
    doc.font("Helvetica-Bold").fontSize(11).text(title, 50, y);
    y += 18;
    doc.rect(50, y, 495, 18).fill("#eeeeee");
    doc.fillColor("#000").font("Helvetica-Bold").fontSize(9);
    const xs = [55, 280, 345, 420];
    headers.forEach((h, i) => doc.text(h, xs[i], y + 5, { width: 80 }));
    y += 22;
    doc.font("Helvetica").fontSize(9);
    rows.forEach((r) => {
      if (y > 740) {
        doc.addPage();
        y = 50;
      }
      doc.text(r[0], xs[0], y, { width: 215 });
      doc.text(r[1], xs[1], y, { width: 60 });
      doc.text(r[2], xs[2], y, { width: 70 });
      doc.text(r[3], xs[3], y, { width: 120 });
      y += 18;
    });
    y += 10;
  };

  drawTable(
    "Labor Charges",
    ["Description", "Hours", "Rate", "Amount"],
    inv.laborItems.map((i) => [i.description, String(i.hours), money(i.rate), money(i.amount)])
  );
  drawTable(
    "Material Charges",
    ["Description", "Qty", "Unit Price", "Amount"],
    inv.materialItems.map((i) => [i.description, String(i.quantity), money(i.unitPrice), money(i.amount)])
  );

  /* Totals */
  if (y > 640) {
    doc.addPage();
    y = 50;
  }
  const line = (label, value, bold = false) => {
    doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(10);
    doc.text(label, 340, y, { width: 100 });
    doc.text(value, 440, y, { width: 105, align: "right" });
    y += 16;
  };
  line("Labor", money(inv.laborTotal));
  line("Materials", money(inv.materialTotal));
  line("Subtotal", money(inv.subtotal));
  line(
    inv.discountType === "percent" ? `Discount (${inv.discountValue}%)` : "Discount",
    `- ${money(inv.discountAmount)}`
  );
  line(`Tax (${inv.taxRate}%)`, money(inv.taxAmount));
  line("Total", money(inv.total), true);
  line("Paid", money(inv.amountPaid));
  line("Balance Due", money(inv.balanceDue), true);
  y += 10;

  /* Payment history */
  if (inv.payments.length) {
    if (y > 650) {
      doc.addPage();
      y = 50;
    }
    doc.font("Helvetica-Bold").fontSize(11).text("Payment History", 50, y);
    y += 18;
    doc.font("Helvetica").fontSize(9);
    inv.payments.forEach((p) => {
      doc.text(
        `${fmtDate(p.date)}  |  ${p.method.replace("_", " ")}  |  ${money(p.amount)}${
          p.reference ? `  |  Ref: ${p.reference}` : ""
        }`,
        50,
        y
      );
      y += 14;
    });
    y += 8;
  }

  if (inv.notes) {
    doc.font("Helvetica-Bold").fontSize(10).text("Notes", 50, y);
    doc.font("Helvetica").fontSize(9).text(inv.notes, 50, y + 14, { width: 495 });
  }

  doc.end();
};