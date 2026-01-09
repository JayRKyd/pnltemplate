"use client";

import React from "react";

type Props = {
  selectedDate?: Date;
  onDateChange?: (date: Date) => void;
  selectedMonth?: number; // 0-based
  selectedYear?: number;
  onMonthYearChange?: (month: number, year: number) => void;
};

const months = [
  "Ianuarie",
  "Februarie",
  "Martie",
  "Aprilie",
  "Mai",
  "Iunie",
  "Iulie",
  "August",
  "Septembrie",
  "Octombrie",
  "Noiembrie",
  "Decembrie",
];

export function MonthYearPicker({
  selectedDate,
  onDateChange,
  selectedMonth,
  selectedYear,
  onMonthYearChange,
}: Props) {
  const monthValue =
    selectedMonth ?? (selectedDate ? selectedDate.getMonth() : new Date().getMonth());
  const yearValue =
    selectedYear ?? (selectedDate ? selectedDate.getFullYear() : new Date().getFullYear());

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const month = Number(e.target.value);
    const year = yearValue;
    if (onMonthYearChange) {
      onMonthYearChange(month, year);
    } else if (onDateChange) {
      const next = new Date(year, month, selectedDate?.getDate() ?? 1);
      onDateChange(next);
    }
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const year = Number(e.target.value);
    const month = monthValue;
    if (onMonthYearChange) {
      onMonthYearChange(month, year);
    } else if (onDateChange) {
      const next = new Date(year, month, selectedDate?.getDate() ?? 1);
      onDateChange(next);
    }
  };

  const years = [];
  const currentYear = new Date().getFullYear();
  for (let y = currentYear + 1; y >= currentYear - 5; y--) {
    years.push(y);
  }

  return (
    <div className="flex gap-2">
      <select
        value={monthValue}
        onChange={handleMonthChange}
        className="rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500"
      >
        {months.map((m, idx) => (
          <option key={m} value={idx}>
            {m}
          </option>
        ))}
      </select>
      <select
        value={yearValue}
        onChange={handleYearChange}
        className="rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500"
      >
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
    </div>
  );
}
