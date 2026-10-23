import mongoose from "mongoose";

const files = [
  "User", "Company", "Contractor", "Project", "Task", "Invoice",
  "Payment", "Document", "Review", "Subscription", "Service", "Setting",
];

let loaded = false;

export const loadModels = async () => {
  if (loaded) return;
  await Promise.all(files.map((f) => import(`../models/${f}.js`).catch(() => null)));
  loaded = true;
};

export const getModel = (name) => mongoose.models[name] || null;