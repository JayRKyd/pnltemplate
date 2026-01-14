"use client";

import React from "react";

type Props = {
  status: string;
  className?: string;
};

const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
  draft: { bg: "bg-gray-100", text: "text-gray-700", label: "Draft" },
  pending: { bg: "bg-yellow-100", text: "text-yellow-700", label: "Pending" },
  approved: { bg: "bg-green-100", text: "text-green-700", label: "Approved" },
  rejected: { bg: "bg-red-100", text: "text-red-700", label: "Rejected" },
  paid: { bg: "bg-blue-100", text: "text-blue-700", label: "Paid" },
};

export function ExpenseStatusBadge({ status, className = "" }: Props) {
  const config = statusConfig[status] || statusConfig.draft;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text} ${className}`}
    >
      {config.label}
    </span>
  );
}
