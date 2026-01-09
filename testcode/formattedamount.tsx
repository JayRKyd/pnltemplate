"use client";

import React from "react";
import { formatAmount } from "./utils/formatters";

type FormattedAmountProps = {
  value: number | string;
  currency?: string;
  className?: string;
  fontSize?: string | number;
  fontWeight?: number | string;
};

export function FormattedAmount({
  value,
  currency = "RON",
  className = "",
  fontSize,
  fontWeight,
}: FormattedAmountProps) {
  const formatted = formatAmount(typeof value === "string" ? Number(value) : value);
  return (
    <span className={className} style={{ fontSize: fontSize as any, fontWeight }}>
      {formatted}
      {currency ? ` ${currency}` : ""}
    </span>
  );
}
