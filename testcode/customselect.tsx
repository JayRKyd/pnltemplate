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

  // Check if custom classes override defaults
  const hasCustomWidth = className.includes('w-[') || className.includes('w-full');
  const hasCustomRounding = className.includes('rounded-');
  const hasCustomPadding = className.includes('px-') || className.includes('py-') || className.includes('p-');
  const hasCustomBorder = className.includes('border-gray-') || className.includes('border-white');

  const baseClasses = [
    !hasCustomWidth && 'w-full',
    !hasCustomRounding && 'rounded-md',
    'border',
    !hasCustomPadding && 'px-3 py-2',
    'text-sm outline-none focus:ring-2 focus:ring-teal-500',
    !hasCustomBorder && (hasError ? 'border-red-500' : 'border-gray-300'),
    hasError && hasCustomBorder && 'border-red-500',
  ].filter(Boolean).join(' ');

  return (
    <select
      multiple={isMultiple}
      value={normalizedValue}
      onChange={handleChange}
      className={`${baseClasses} ${className}`}
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