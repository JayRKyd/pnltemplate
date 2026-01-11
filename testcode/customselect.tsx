"use client";

import React from "react";

type Option = { value: string; label: string };

type Props = {
  value: string | string[];
  onChange: (value: any) => void;
  options: Option[];
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
  hasError?: boolean;
  multiple?: boolean;
};

export function CustomSelect({
  value,
  onChange,
  options,
  placeholder = "Selecteaza...",
  className = "",
  style,
  hasError = false,
  multiple = false,
}: Props) {
  const isMultiple = multiple;
  const normalizedValue = isMultiple
    ? (Array.isArray(value) ? value : value ? [value] : [])
    : (Array.isArray(value) ? value[0] ?? "" : value ?? "");

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (isMultiple) {
      const selected = Array.from(e.target.selectedOptions).map((o) => o.value);
      onChange(selected);
    } else {
      onChange(e.target.value);
    }
  };

  return (
    <select
      multiple={isMultiple}
      value={normalizedValue}
      onChange={handleChange}
      className={`w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500 ${
        hasError ? "border-red-500" : "border-gray-300"
      } ${className}`}
      style={style}
    >
      {!isMultiple && (
        <option key="placeholder" value="" disabled>
          {placeholder}
        </option>
      )}
      {options.map((opt, idx) => (
        <option key={`${opt.value}-${idx}`} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}