"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DeltaView } from "@/testcode/deltaview";

const mockCategories = [
  {
    name: "Echipa",
    values: [30000, 32000, 28000, 31000, 29000, 30000],
    subcategories: [
      { name: "Salarii", values: [20000, 21000, 19000, 20500, 19500, 20000] },
      { name: "Bonusuri", values: [2000, 2200, 1800, 2100, 1900, 2000] },
    ],
  },
];

export default function DeltaPage() {
  const router = useRouter();
  const [selectedMonth, setSelectedMonth] = useState(0);
  const [selectedYear, setSelectedYear] = useState(2025);
  const [selectedCurrency, setSelectedCurrency] = useState<"EUR" | "RON">("EUR");

  return (
    <div className="p-6 md:p-8 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Delta View</h2>
          <p className="text-sm text-muted-foreground">
            Mock month-over-month view using sample data.
          </p>
        </div>
        <button
          onClick={() => router.back()}
          className="rounded-md border px-3 py-2 text-sm"
        >
          Back
        </button>
      </div>

      <DeltaView
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        selectedCurrency={selectedCurrency}
        venituri={[50000, 52000, 48000, 51000, 49500, 50500]}
        cheltuieli={[30000, 32000, 28000, 31000, 29000, 30000]}
        categories={mockCategories}
        onMonthYearChange={(m, y) => {
          setSelectedMonth(m);
          setSelectedYear(y);
        }}
        onCurrencyChange={(c) => setSelectedCurrency(c)}
      />
    </div>
  );
}
