export const TYPE_META = {
  new_project: { icon: "📁", label: "Project" },
  task_assigned: { icon: "✅", label: "Task" },
  invoice_generated: { icon: "🧾", label: "Invoice" },
  payment_received: { icon: "💳", label: "Payment" },
  document_expiry: { icon: "📄", label: "Document" },
  schedule_change: { icon: "📅", label: "Schedule" },
  new_message: { icon: "💬", label: "Message" },
  general: { icon: "🔔", label: "General" },
};

export const timeAgo = (date) => {
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(date).toLocaleDateString();
};