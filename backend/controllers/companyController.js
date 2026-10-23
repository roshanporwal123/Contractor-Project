import fs from "fs";
import path from "path";
import Company from "../models/Company.js";
import Employee from "../models/Employee.js";
import CompanyDocument from "../models/CompanyDocument.js";

const h = (fn, needCompany = true) => async (req, res) => {
  try {
    if (needCompany) {
      req.company = await Company.findOne({ owner: req.user._id });
      if (!req.company) return res.status(404).json({ message: "Company not found" });
    }
    await fn(req, res);
  } catch (e) {
    res.status(e.code === 11000 ? 400 : 500).json({
      message: e.code === 11000 ? "Duplicate entry" : e.message,
    });
  }
};

const removeFile = (relUrl) => {
  if (!relUrl) return;
  fs.unlink(path.join(process.cwd(), relUrl.replace(/^\//, "")), () => {});
};

const pick = (obj, keys) =>
  keys.reduce((a, k) => (obj[k] !== undefined ? { ...a, [k]: obj[k] } : a), {});

const PROFILE_KEYS = ["name", "email", "phone", "website", "businessInfo"];
const EMP_KEYS = ["name", "email", "phone", "designation", "department", "status"];

// ---------- Company profile ----------
export const createCompany = h(async (req, res) => {
  const exists = await Company.findOne({ owner: req.user._id });
  if (exists) return res.status(400).json({ message: "Company already exists" });
  const company = await Company.create({
    ...pick(req.body, PROFILE_KEYS),
    owner: req.user._id,
  });
  res.status(201).json(company);
}, false);

export const getMyCompany = h(async (req, res) => res.json(req.company));

export const updateCompany = h(async (req, res) => {
  req.company.set(pick(req.body, PROFILE_KEYS));
  await req.company.save();
  res.json(req.company);
});

export const updateBilling = h(async (req, res) => {
  req.company.billing = pick(req.body, [
    "billingEmail",
    "billingName",
    "currency",
    "paymentTerms",
    "address",
  ]);
  await req.company.save();
  res.json(req.company);
});

export const uploadLogo = h(async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "Logo file required" });
  removeFile(req.company.logo?.url);
  req.company.logo = {
    url: `/uploads/logos/${req.file.filename}`,
    filename: req.file.filename,
  };
  await req.company.save();
  res.json(req.company);
});

// ---------- Departments ----------
export const addDepartment = h(async (req, res) => {
  if (!req.body.name) return res.status(400).json({ message: "Name required" });
  req.company.departments.push(pick(req.body, ["name", "description"]));
  await req.company.save();
  res.status(201).json(req.company.departments);
});

export const updateDepartment = h(async (req, res) => {
  const dep = req.company.departments.id(req.params.deptId);
  if (!dep) return res.status(404).json({ message: "Department not found" });
  dep.set(pick(req.body, ["name", "description"]));
  await req.company.save();
  res.json(req.company.departments);
});

export const deleteDepartment = h(async (req, res) => {
  const dep = req.company.departments.id(req.params.deptId);
  if (!dep) return res.status(404).json({ message: "Department not found" });
  dep.deleteOne();
  await req.company.save();
  res.json(req.company.departments);
});

// ---------- Employees ----------
export const getEmployees = h(async (req, res) => {
  res.json(await Employee.find({ company: req.company._id }).sort("-createdAt"));
});

export const addEmployee = h(async (req, res) => {
  const emp = await Employee.create({
    ...pick(req.body, EMP_KEYS),
    company: req.company._id,
  });
  res.status(201).json(emp);
});

export const updateEmployee = h(async (req, res) => {
  const emp = await Employee.findOneAndUpdate(
    { _id: req.params.id, company: req.company._id },
    pick(req.body, EMP_KEYS),
    { new: true, runValidators: true }
  );
  if (!emp) return res.status(404).json({ message: "Employee not found" });
  res.json(emp);
});

export const deleteEmployee = h(async (req, res) => {
  const emp = await Employee.findOneAndDelete({
    _id: req.params.id,
    company: req.company._id,
  });
  if (!emp) return res.status(404).json({ message: "Employee not found" });
  res.json({ message: "Deleted" });
});

// ---------- Company documents ----------
export const getDocuments = h(async (req, res) => {
  res.json(await CompanyDocument.find({ company: req.company._id }).sort("-createdAt"));
});

export const addDocument = h(async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "File required" });
  const doc = await CompanyDocument.create({
    company: req.company._id,
    title: req.body.title || req.file.originalname,
    type: req.body.type || "other",
    expiryDate: req.body.expiryDate || undefined,
    fileUrl: `/uploads/company-docs/${req.file.filename}`,
    fileName: req.file.originalname,
    uploadedBy: req.user._id,
  });
  res.status(201).json(doc);
});

export const deleteDocument = h(async (req, res) => {
  const doc = await CompanyDocument.findOneAndDelete({
    _id: req.params.id,
    company: req.company._id,
  });
  if (!doc) return res.status(404).json({ message: "Document not found" });
  removeFile(doc.fileUrl);
  res.json({ message: "Deleted" });
});