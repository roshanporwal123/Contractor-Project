import Material from "../models/Material.js";
import Supplier from "../models/Supplier.js";
import PurchaseOrder from "../models/PurchaseOrder.js";
import MaterialUsage from "../models/MaterialUsage.js";

const wrap = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

/* ================= MATERIALS ================= */

export const createMaterial = wrap(async (req, res) => {
  const material = await Material.create({ ...req.body, company: req.companyId });
  res.status(201).json({ success: true, material });
});

export const getMaterials = wrap(async (req, res) => {
  const { search, category, lowStock } = req.query;
  const filter = { company: req.companyId };
  if (search) filter.name = { $regex: search, $options: "i" };
  if (category) filter.category = category;
  if (lowStock === "true") filter.$expr = { $lte: ["$quantity", "$lowStockThreshold"] };

  const materials = await Material.find(filter)
    .populate("supplier", "name")
    .sort({ createdAt: -1 });
  res.json({ success: true, count: materials.length, materials });
});

export const getLowStock = wrap(async (req, res) => {
  const materials = await Material.find({
    company: req.companyId,
    $expr: { $lte: ["$quantity", "$lowStockThreshold"] },
  }).populate("supplier", "name");
  res.json({ success: true, count: materials.length, materials });
});

export const getMaterialSummary = wrap(async (req, res) => {
  const materials = await Material.find({ company: req.companyId });
  const totalStockValue = materials.reduce((s, m) => s + m.quantity * m.unitCost, 0);
  const lowStockCount = materials.filter((m) => m.quantity <= m.lowStockThreshold).length;

  const usage = await MaterialUsage.aggregate([
    { $match: { company: req.companyId } },
    { $group: { _id: null, total: { $sum: "$totalCost" } } },
  ]);

  res.json({
    success: true,
    summary: {
      totalMaterials: materials.length,
      totalStockValue,
      lowStockCount,
      totalUsedCost: usage[0]?.total || 0,
    },
  });
});

export const getMaterial = wrap(async (req, res) => {
  const material = await Material.findOne({
    _id: req.params.id,
    company: req.companyId,
  }).populate("supplier", "name");
  if (!material) return res.status(404).json({ success: false, message: "Material not found" });
  res.json({ success: true, material });
});

export const updateMaterial = wrap(async (req, res) => {
  const material = await Material.findOneAndUpdate(
    { _id: req.params.id, company: req.companyId },
    req.body,
    { new: true, runValidators: true }
  );
  if (!material) return res.status(404).json({ success: false, message: "Material not found" });
  res.json({ success: true, material });
});

export const deleteMaterial = wrap(async (req, res) => {
  const material = await Material.findOneAndDelete({
    _id: req.params.id,
    company: req.companyId,
  });
  if (!material) return res.status(404).json({ success: false, message: "Material not found" });
  res.json({ success: true, message: "Material deleted" });
});

/* ================= SUPPLIERS ================= */

export const createSupplier = wrap(async (req, res) => {
  const supplier = await Supplier.create({ ...req.body, company: req.companyId });
  res.status(201).json({ success: true, supplier });
});

export const getSuppliers = wrap(async (req, res) => {
  const suppliers = await Supplier.find({ company: req.companyId }).sort({ createdAt: -1 });
  res.json({ success: true, count: suppliers.length, suppliers });
});

export const updateSupplier = wrap(async (req, res) => {
  const supplier = await Supplier.findOneAndUpdate(
    { _id: req.params.id, company: req.companyId },
    req.body,
    { new: true, runValidators: true }
  );
  if (!supplier) return res.status(404).json({ success: false, message: "Supplier not found" });
  res.json({ success: true, supplier });
});

export const deleteSupplier = wrap(async (req, res) => {
  const inUse = await PurchaseOrder.exists({ company: req.companyId, supplier: req.params.id });
  if (inUse)
    return res
      .status(400)
      .json({ success: false, message: "Supplier has purchase orders. Mark inactive instead." });

  const supplier = await Supplier.findOneAndDelete({
    _id: req.params.id,
    company: req.companyId,
  });
  if (!supplier) return res.status(404).json({ success: false, message: "Supplier not found" });
  res.json({ success: true, message: "Supplier deleted" });
});

/* ================= PURCHASE ORDERS ================= */

const nextPoNumber = async (companyId) => {
  const count = await PurchaseOrder.countDocuments({ company: companyId });
  return `PO-${String(count + 1).padStart(4, "0")}`;
};

export const createPurchaseOrder = wrap(async (req, res) => {
  const { supplier, items, expectedDate, notes } = req.body;

  const sup = await Supplier.findOne({ _id: supplier, company: req.companyId });
  if (!sup) return res.status(404).json({ success: false, message: "Supplier not found" });

  const materialIds = items.map((i) => i.material);
  const mats = await Material.find({ _id: { $in: materialIds }, company: req.companyId });
  if (mats.length !== new Set(materialIds.map(String)).size)
    return res.status(400).json({ success: false, message: "Invalid material in items" });

  const finalItems = items.map((i) => {
    const m = mats.find((x) => String(x._id) === String(i.material));
    return {
      material: m._id,
      name: m.name,
      quantity: Number(i.quantity),
      unitCost: i.unitCost !== undefined ? Number(i.unitCost) : m.unitCost,
    };
  });

  const totalCost = finalItems.reduce((s, i) => s + i.quantity * i.unitCost, 0);

  const po = await PurchaseOrder.create({
    company: req.companyId,
    poNumber: await nextPoNumber(req.companyId),
    supplier,
    items: finalItems,
    totalCost,
    expectedDate,
    notes,
    createdBy: req.user._id,
  });

  res.status(201).json({ success: true, purchaseOrder: po });
});

export const getPurchaseOrders = wrap(async (req, res) => {
  const filter = { company: req.companyId };
  if (req.query.status) filter.status = req.query.status;
  const purchaseOrders = await PurchaseOrder.find(filter)
    .populate("supplier", "name")
    .sort({ createdAt: -1 });
  res.json({ success: true, count: purchaseOrders.length, purchaseOrders });
});

export const getPurchaseOrder = wrap(async (req, res) => {
  const po = await PurchaseOrder.findOne({ _id: req.params.id, company: req.companyId })
    .populate("supplier")
    .populate("items.material", "name unit");
  if (!po) return res.status(404).json({ success: false, message: "Purchase order not found" });
  res.json({ success: true, purchaseOrder: po });
});

// status: Ordered | Received | Cancelled
export const updatePurchaseOrderStatus = wrap(async (req, res) => {
  const { status } = req.body;
  const po = await PurchaseOrder.findOne({ _id: req.params.id, company: req.companyId });
  if (!po) return res.status(404).json({ success: false, message: "Purchase order not found" });

  const allowed = {
    Draft: ["Ordered", "Cancelled"],
    Ordered: ["Received", "Cancelled"],
    Received: [],
    Cancelled: [],
  };
  if (!allowed[po.status].includes(status))
    return res
      .status(400)
      .json({ success: false, message: `Cannot change ${po.status} to ${status}` });

  if (status === "Received") {
    for (const item of po.items) {
      await Material.findOneAndUpdate(
        { _id: item.material, company: req.companyId },
        { $inc: { quantity: item.quantity }, $set: { unitCost: item.unitCost } }
      );
    }
    po.receivedDate = new Date();
  }

  po.status = status;
  await po.save();
  res.json({ success: true, purchaseOrder: po });
});

export const deletePurchaseOrder = wrap(async (req, res) => {
  const po = await PurchaseOrder.findOne({ _id: req.params.id, company: req.companyId });
  if (!po) return res.status(404).json({ success: false, message: "Purchase order not found" });
  if (po.status !== "Draft")
    return res.status(400).json({ success: false, message: "Only Draft orders can be deleted" });
  await po.deleteOne();
  res.json({ success: true, message: "Purchase order deleted" });
});

/* ================= USED MATERIALS ================= */

export const createUsage = wrap(async (req, res) => {
  const { material, project, quantity, date, notes } = req.body;
  const qty = Number(quantity);

  // atomic: only deduct if enough stock
  const mat = await Material.findOneAndUpdate(
    { _id: material, company: req.companyId, quantity: { $gte: qty } },
    { $inc: { quantity: -qty } },
    { new: true }
  );
  if (!mat)
    return res
      .status(400)
      .json({ success: false, message: "Material not found or insufficient stock" });

  const usage = await MaterialUsage.create({
    company: req.companyId,
    material,
    project,
    quantity: qty,
    unitCost: mat.unitCost,
    totalCost: qty * mat.unitCost,
    usedBy: req.user._id,
    date,
    notes,
  });

  res.status(201).json({
    success: true,
    usage,
    lowStockAlert: mat.quantity <= mat.lowStockThreshold
      ? `${mat.name} is low on stock (${mat.quantity} ${mat.unit} left)`
      : null,
  });
});

export const getUsages = wrap(async (req, res) => {
  const filter = { company: req.companyId };
  if (req.query.project) filter.project = req.query.project;
  if (req.query.material) filter.material = req.query.material;

  const usages = await MaterialUsage.find(filter)
    .populate("material", "name unit")
    .populate("project", "name")
    .sort({ date: -1 });
  res.json({ success: true, count: usages.length, usages });
});

export const deleteUsage = wrap(async (req, res) => {
  const usage = await MaterialUsage.findOneAndDelete({
    _id: req.params.id,
    company: req.companyId,
  });
  if (!usage) return res.status(404).json({ success: false, message: "Usage not found" });

  // stock wapas add
  await Material.findOneAndUpdate(
    { _id: usage.material, company: req.companyId },
    { $inc: { quantity: usage.quantity } }
  );
  res.json({ success: true, message: "Usage removed, stock restored" });
});