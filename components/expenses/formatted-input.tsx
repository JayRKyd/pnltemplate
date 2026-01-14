"use client";

import React from "react";

type Props = {
  value: string | number;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  type?: string;
  className?: string;
  hasError?: boolean;
  disabled?: boolean;
  required?: boolean;
};

export function FormattedInput({
  value,
  onChange,
  placeholder,
  label,
  type = "text",
  className,
  hasError = false,
  disabled = false,
  required = false,
}: Props) {
  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed ${
          hasError ? "border-red-500" : "border-gray-300"
        }`}
      />
    </div>
  );
}
