import express from "express";
import { protect } from "../middleware/auth.js";
import { uploadLogo, uploadDoc } from "../middleware/upload.js";
import * as c from "../controllers/companyController.js";

const router = express.Router();

router.use(protect);

router.post("/", c.createCompany);
router.get("/me", c.getMyCompany);
router.put("/me", c.updateCompany);
router.put("/me/billing", c.updateBilling);
router.post("/me/logo", uploadLogo.single("logo"), c.uploadLogo);

router.post("/me/departments", c.addDepartment);
router.put("/me/departments/:deptId", c.updateDepartment);
router.delete("/me/departments/:deptId", c.deleteDepartment);

router.route("/me/employees").get(c.getEmployees).post(c.addEmployee);
router.route("/me/employees/:id").put(c.updateEmployee).delete(c.deleteEmployee);

router.route("/me/documents").get(c.getDocuments).post(uploadDoc.single("file"), c.addDocument);
router.delete("/me/documents/:id", c.deleteDocument);

export default router;