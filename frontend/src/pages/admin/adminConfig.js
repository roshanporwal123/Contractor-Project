export const ADMIN_RESOURCES = {
  users: {
    title: "Users",
    canCreate: true,
    columns: [
      { key: "name", label: "Name" },
      { key: "email", label: "Email" },
      { key: "role", label: "Role", type: "badge" },
      { key: "isBlocked", label: "Blocked", type: "bool" },
      { key: "createdAt", label: "Joined", type: "date" },
    ],
    fields: [
      { name: "name", label: "Name", type: "text" },
      { name: "email", label: "Email", type: "email", createOnly: true },
      { name: "password", label: "Password", type: "password", createOnly: true },
      { name: "role", label: "Role", type: "select", options: ["customer", "contractor", "admin"] },
      { name: "isBlocked", label: "Blocked", type: "checkbox" },
    ],
  },
  companies: {
    title: "Companies",
    columns: [
      { key: "name", label: "Company" },
      { key: "email", label: "Email" },
      { key: "createdAt", label: "Created", type: "date" },
    ],
    fields: [{ name: "name", label: "Company Name", type: "text" }],
  },
  contractors: {
    title: "Contractors",
    columns: [
      { key: "name", label: "Name" },
      { key: "email", label: "Email" },
      { key: "status", label: "Status", type: "badge" },
      { key: "createdAt", label: "Added", type: "date" },
    ],
    fields: [
      { name: "status", label: "Status", type: "select", options: ["Active", "Inactive", "Pending"] },
    ],
  },
  projects: {
    title: "Projects",
    columns: [
      { key: "name", label: "Project" },
      { key: "status", label: "Status", type: "badge" },
      { key: "budget", label: "Budget" },
      { key: "createdAt", label: "Created", type: "date" },
    ],
    fields: [{ name: "status", label: "Status", type: "text" }],
  },
  services: {
    title: "Services",
    canCreate: true,
    columns: [
      { key: "name", label: "Service" },
      { key: "category", label: "Category" },
      { key: "isActive", label: "Active", type: "bool" },
    ],
    fields: [
      { name: "name", label: "Name", type: "text" },
      { name: "category", label: "Category", type: "text" },
      { name: "description", label: "Description", type: "textarea" },
      { name: "isActive", label: "Active", type: "checkbox" },
    ],
  },
  payments: {
    title: "Payments",
    columns: [
      { key: "_id", label: "ID" },
      { key: "amount", label: "Amount" },
      { key: "status", label: "Status", type: "badge" },
      { key: "createdAt", label: "Date", type: "date" },
    ],
    fields: [{ name: "status", label: "Status", type: "text" }],
  },
  invoices: {
    title: "Invoices",
    columns: [
      { key: "invoiceNumber", label: "Invoice #" },
      { key: "total", label: "Total" },
      { key: "status", label: "Status", type: "badge" },
      { key: "dueDate", label: "Due", type: "date" },
    ],
    fields: [
      { name: "status", label: "Status", type: "select", options: ["Paid", "Unpaid", "Overdue"] },
    ],
  },
  documents: {
    title: "Documents",
    columns: [
      { key: "name", label: "Name" },
      { key: "type", label: "Type", type: "badge" },
      { key: "expiryDate", label: "Expiry", type: "date" },
      { key: "createdAt", label: "Uploaded", type: "date" },
    ],
    fields: [],
  },
  reviews: {
    title: "Reviews",
    columns: [
      { key: "rating", label: "Rating" },
      { key: "comment", label: "Comment" },
      { key: "status", label: "Status", type: "badge" },
      { key: "createdAt", label: "Date", type: "date" },
    ],
    fields: [
      { name: "status", label: "Moderation Status", type: "select", options: ["pending", "approved", "rejected"] },
    ],
  },
  subscriptions: {
    title: "Subscriptions",
    columns: [
      { key: "plan", label: "Plan", type: "badge" },
      { key: "status", label: "Status", type: "badge" },
      { key: "createdAt", label: "Started", type: "date" },
    ],
    fields: [
      { name: "plan", label: "Plan", type: "select", options: ["free", "basic", "professional", "enterprise"] },
      { name: "status", label: "Status", type: "text" },
    ],
  },
};