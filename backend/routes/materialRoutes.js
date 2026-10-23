// import express from "express";
// import { protect } from "../middleware/auth.js";
// import { attachCompany } from "../middleware/auth.js"; // apna actual path/name daalna
// import {
//   createMaterial, getMaterials, getLowStock, getMaterialSummary, getMaterial,
//   updateMaterial, deleteMaterial,
//   createSupplier, getSuppliers, updateSupplier, deleteSupplier,
//   createPurchaseOrder, getPurchaseOrders, getPurchaseOrder,
//   updatePurchaseOrderStatus, deletePurchaseOrder,
//   createUsage, getUsages, deleteUsage,
// } from "../controllers/materialController.js";

// const router = express.Router();

// router.use(protect, attachCompany);

// // Fixed paths pehle, /:id sabse last me
// router.get("/low-stock", getLowStock);
// router.get("/summary", getMaterialSummary);

// router.route("/suppliers").get(getSuppliers).post(createSupplier);
// router.route("/suppliers/:id").put(updateSupplier).delete(deleteSupplier);

// router.route("/purchase-orders").get(getPurchaseOrders).post(createPurchaseOrder);
// router.route("/purchase-orders/:id").get(getPurchaseOrder).delete(deletePurchaseOrder);
// router.patch("/purchase-orders/:id/status", updatePurchaseOrderStatus);

// router.route("/usage").get(getUsages).post(createUsage);
// router.delete("/usage/:id", deleteUsage);

// router.route("/").get(getMaterials).post(createMaterial);
// router.route("/:id").get(getMaterial).put(updateMaterial).delete(deleteMaterial);

// export default router;

import express from "express";
import { protect } from "../middleware/auth.js";
import Company from "../models/Company.js";
import {
  createMaterial, getMaterials, getLowStock, getMaterialSummary, getMaterial,
  updateMaterial, deleteMaterial,
  createSupplier, getSuppliers, updateSupplier, deleteSupplier,
  createPurchaseOrder, getPurchaseOrders, getPurchaseOrder,
  updatePurchaseOrderStatus, deletePurchaseOrder,
  createUsage, getUsages, deleteUsage,
} from "../controllers/materialController.js";

const router = express.Router();

const attachCompany = async (req, res, next) => {
  try {
    const company = await Company.findOne({ owner: req.user._id });
    if (!company) {
      return res
        .status(404)
        .json({ success: false, message: "Pehle company profile banao" });
    }
    req.company = company;
    req.companyId = company._id;
    next();
  } catch (err) {
    next(err);
  }
};

router.use(protect, attachCompany);

// Fixed paths pehle, /:id sabse last me
router.get("/low-stock", getLowStock);
router.get("/summary", getMaterialSummary);

router.route("/suppliers").get(getSuppliers).post(createSupplier);
router.route("/suppliers/:id").put(updateSupplier).delete(deleteSupplier);

router.route("/purchase-orders").get(getPurchaseOrders).post(createPurchaseOrder);
router.route("/purchase-orders/:id").get(getPurchaseOrder).delete(deletePurchaseOrder);
router.patch("/purchase-orders/:id/status", updatePurchaseOrderStatus);

router.route("/usage").get(getUsages).post(createUsage);
router.delete("/usage/:id", deleteUsage);

router.route("/").get(getMaterials).post(createMaterial);
router.route("/:id").get(getMaterial).put(updateMaterial).delete(deleteMaterial);

export default router;