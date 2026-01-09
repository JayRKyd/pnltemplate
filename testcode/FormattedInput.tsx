import React from "react";

type Props = {
  value: string | number;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  type?: string;
  className?: string;
};

export function FormattedInput({
  value,
  onChange,
  placeholder,
  label,
  type = "text",
  className,
}: Props) {
  return (
    <div className={className}>
      {label && <label className="block text-sm mb-1 text-gray-600">{label}</label>}
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500"
      />
    </div>
  );
}
