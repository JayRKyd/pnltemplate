// @ts-nocheck
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { CustomSelect } from "./customselect";
import { ExpenseDetailModal } from "./expensedetailmodal";

interface CategoryDetailProps {
  categoryName: string;
  onBack: () => void;
  selectedYear: string;
  selectedCurrency: "EUR" | "RON";
}

interface ExpenseDetail {
  description: string;
  invoiceDate: string;
  amount: number;
  addedBy: string;
  supplier: string;
}

// Mock data for subcategories - different for each main category
const categorySubcategories: Record<
  string,
  Array<{ name: string; values: number[]; color?: string }>
> = {
  "1. Echipa": [
    {
      name: "1. Salarii",
      values: [
        30000, 31000, 36000, 38000, 40000, 42000, 48000, 41000,
        39000, 36000, 22000, 0, 32367, 33856, 38881, 41579,
        44176, 45691, 52704, 44248, 41606, 39205, 24407, 0,
      ],
      color: "#EF4444",
    },
    {
      name: "2. Bonusuri",
      values: [
        3000, 3000, 4000, 4000, 4000, 4000, 4000, 4000, 4000,
        4000, 3000, 0, 3237, 3278, 4321, 4376, 4416, 4352, 4393,
        4318, 4267, 4357, 3328, 0,
      ],
      color: "#F59E0B",
    },
    {
      name: "3. Training",
      values: [
        1500, 1500, 1500, 1500, 1500, 1500, 1500, 1500, 1500,
        1500, 1500, 0, 1619, 1639, 1621, 1641, 1641, 1632, 1648,
        1619, 1600, 1634, 1665, 0,
      ],
      color: "#10B981",
    },
    {
      name: "4. Team events",
      values: [
        500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500,
        0, 540, 546, 540, 547, 552, 544, 549, 540, 533, 545,
        540, 0,
      ],
      color: "#3B82F6",
    },
  ],
  "2. Marketing": [
    {
      name: "20. Social media ads (Meta & TikTok)",
      values: [
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 3000, 0,
      ],
      color: "#EF4444",
    },
    {
      name: "21. Google ads",
      values: [
        0, 0, 0, 2400, 2080, 5689, 5030, 1095, 0, 0, 0, 0, 0, 0,
        0, 7497, 6080, 5689, 5030, 1095, 0, 0, 0, 0,
      ],
      color: "#F59E0B",
    },
    {
      name: "22. Fee agentie performance",
      values: [
        1105, 0, 1777, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1777,
        1777, 1805, 6909, 1843, 1843, 0, 0, 0, 0,
      ],
      color: "#10B981",
    },
    {
      name: "23. SEO",
      values: [
        0, 0, 0, 0, 0, 0, 0, 0, 750, 750, 0, 0, 3880, 3791,
        3791, 3791, 4482, 3867, 3865, 3928, 3933, 3936, 0, 0,
      ],
      color: "#3B82F6",
    },
    {
      name: "24. PR",
      values: [
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0,
      ],
      color: "#8B5CF6",
    },
    {
      name: "25. Influencer marketing",
      values: [
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0,
      ],
      color: "#EC4899",
    },
    {
      name: "26. Content creation",
      values: [
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 5000, 0,
      ],
      color: "#06B6D4",
    },
    {
      name: "27. Productie materiale",
      values: [
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0,
      ],
      color: "#84CC16",
    },
    {
      name: "28. Parteneriate",
      values: [
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0,
      ],
      color: "#F97316",
    },
    {
      name: "29. Altele",
      values: [
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 1000, 0,
      ],
      color: "#64748B",
    },
  ],
  "3. IT": [
    {
      name: "5. Cloud hosting",
      values: [
        300, 500, 300, 1500, 1300, 1800, 1500, 1800, 1600, 1800,
        1200, 0, 323, 546, 315, 1642, 1404, 1951, 1590, 1928,
        1674, 1900, 1281, 0,
      ],
      color: "#EF4444",
    },
    {
      name: "6. Software licenses",
      values: [
        200, 300, 200, 1000, 1000, 1500, 1300, 1300, 1300, 1500,
        1200, 0, 210, 326, 210, 1094, 1079, 1623, 1378, 1387,
        1363, 1584, 1280, 0,
      ],
      color: "#F59E0B",
    },
  ],
  "4. Sediu": [
    {
      name: "7. Chirie",
      values: [
        3500, 2500, 2100, 2300, 2200, 1900, 2000, 1900, 2100,
        3000, 2900, 0, 3770, 2685, 2257, 2497, 2380, 2061, 2120,
        2034, 2261, 3165, 3099, 0,
      ],
      color: "#EF4444",
    },
    {
      name: "8. Utilitati",
      values: [
        800, 800, 800, 800, 800, 800, 800, 800, 800, 900, 800,
        0, 861, 859, 860, 869, 865, 869, 849, 856, 861, 949,
        855, 0,
      ],
      color: "#F59E0B",
    },
    {
      name: "9. Investitii amenajare",
      values: [
        0, 0, 0, 0, 0, 0, 0, 0, 0, 24000, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 25882, 0, 0,
      ],
      color: "#10B981",
    },
    {
      name: "10. Altele",
      values: [
        200, 200, 200, 200, 200, 200, 200, 200, 200, 100, 200,
        0, 180, 197, 213, 216, 220, 148, 245, 206, 216, 114,
        243, 0,
      ],
      color: "#3B82F6",
    },
  ],
  "5. Servicii": [
    {
      name: "11. Contabilitate",
      values: [
        80, 0, 320, 35, 500, 380, 50, 75, 350, 300, 230, 0, 83,
        0, 342, 40, 545, 408, 53, 81, 369, 315, 246, 0,
      ],
      color: "#EF4444",
    },
    {
      name: "12. Consultanta",
      values: [
        0, 0, 0, 0, 0, 0, 0, 0, 1000, 1000, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 1050, 1050, 0, 0,
      ],
      color: "#F59E0B",
    },
  ],
  "6. Altele": [
    {
      name: "13. Asigurari",
      values: [
        0, 0, 160, 180, 240, 420, 85, 0, 600, 400, 0, 0, 0, 0,
        170, 196, 254, 446, 92, 0, 618, 416, 0, 0,
      ],
      color: "#EF4444",
    },
    {
      name: "14. Taxe si impozite",
      values: [
        0, 0, 0, 0, 0, 0, 0, 0, 3000, 3000, 20000, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 3250, 3200, 21278, 0,
      ],
      color: "#F59E0B",
    },
  ],
};

export function CategoryDetail({
  categoryName,
  onBack,
  selectedYear: initialYear,
  selectedCurrency: initialCurrency,
}: CategoryDetailProps) {
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: "asc" | "desc";
  } | null>(null);
  const [selectedExpense, setSelectedExpense] =
    useState<ExpenseDetail | null>(null);
  const [selectedCell, setSelectedCell] = useState<{
    subcategoryName: string;
    monthIndex: number;
    amount: number;
  } | null>(null);
  const [selectedYear, setSelectedYear] = useState(initialYear);
  const [selectedCurrency, setSelectedCurrency] = useState<
    "EUR" | "RON"
  >(initialCurrency);

  const months = [
    "ianuarie",
    "februarie",
    "martie",
    "aprilie",
    "mai",
    "iunie",
    "iulie",
    "august",
    "septembrie",
    "octombrie",
    "noiembrie",
    "decembrie",
  ];

  const formatAmount = (amount: number) => {
    return amount.toLocaleString("ro-RO", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  };

  const calculateTotal = (values: number[]) => {
    return values.reduce((sum, val) => sum + val, 0);
  };

  // Get year offset for data (0 for 2024, 12 for 2025)
  const getYearOffset = () => {
    return selectedYear === "2024" ? 0 : 12;
  };

  // Get the 12 months of data for the selected year
  const getYearData = (values: number[]) => {
    const offset = getYearOffset();
    return values.slice(offset, offset + 12);
  };

  const subcategories =
    categorySubcategories[categoryName] || [];

  // Calculate category total for each month
  const getCategoryMonthlyTotals = () => {
    const totals = Array(24).fill(0);
    subcategories.forEach((sub) => {
      sub.values.forEach((val, idx) => {
        totals[idx] += val;
      });
    });
    return totals;
  };

  const categoryTotals = getCategoryMonthlyTotals();

  // Calculate Delta Dec (last month vs December previous year)
  const getDeltaDec = (values: number[]) => {
    const offset = getYearOffset();
    const currentDec = offset === 12 ? values[23] : values[11]; // Dec 2025 or Dec 2024
    const prevDec = offset === 12 ? values[11] : 0; // Dec 2024 or 0 for 2024
    return currentDec - prevDec;
  };

  // Calculate YTD (year to date - sum of all months in selected year)
  const getYTD = (values: number[]) => {
    return calculateTotal(getYearData(values));
  };

  // Calculate Delta YTD (current year YTD vs previous year YTD)
  const getDeltaYTD = (values: number[]) => {
    const currentYTD = getYTD(values);
    const prevOffset = selectedYear === "2024" ? 0 : 0; // For 2024, no previous year data
    const prevYTD =
      selectedYear === "2025"
        ? calculateTotal(values.slice(0, 12))
        : 0;
    return currentYTD - prevYTD;
  };

  const CurrencyFlag = () => {
    if (selectedCurrency === "RON") {
      return (
        <div className="w-5 h-3 rounded-full overflow-hidden flex">
          <div className="w-[6.67px] h-3 bg-[#002B7F]"></div>
          <div className="w-[6.67px] h-3 bg-[#FCD116]"></div>
          <div className="w-[6.67px] h-3 bg-[#CE1126]"></div>
        </div>
      );
    } else {
      return (
        <div className="w-5 h-3 rounded-full overflow-hidden bg-[#003399] flex items-center justify-center relative">
          <div className="absolute inset-0 flex items-center justify-center">
            <svg
              width="20"
              height="12"
              viewBox="0 0 20 12"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="10" cy="6" r="1.5" fill="#FFCC00" />
              <circle cx="7" cy="3" r="0.8" fill="#FFCC00" />
              <circle cx="13" cy="3" r="0.8" fill="#FFCC00" />
              <circle cx="5.5" cy="6" r="0.8" fill="#FFCC00" />
              <circle cx="14.5" cy="6" r="0.8" fill="#FFCC00" />
              <circle cx="7" cy="9" r="0.8" fill="#FFCC00" />
              <circle cx="13" cy="9" r="0.8" fill="#FFCC00" />
              <circle
                cx="4.5"
                cy="9.5"
                r="0.8"
                fill="#FFCC00"
              />
              <circle
                cx="15.5"
                cy="9.5"
                r="0.8"
                fill="#FFCC00"
              />
              <circle
                cx="4.5"
                cy="2.5"
                r="0.8"
                fill="#FFCC00"
              />
              <circle
                cx="15.5"
                cy="2.5"
                r="0.8"
                fill="#FFCC00"
              />
              <circle cx="10" cy="2" r="0.8" fill="#FFCC00" />
            </svg>
          </div>
        </div>
      );
    }
  };

  // Generate mock expense details for a subcategory and month
  const generateExpenseDetails = (
    subcategoryName: string,
    monthIndex: number,
    totalAmount: number,
  ): ExpenseDetail[] => {
    if (totalAmount === 0) return [];

    const suppliers: Record<string, string[]> = {
      Google: ["Google", "Google Ads", "Google Ireland Ltd"],
      Meta: ["Meta", "Facebook", "Meta Platforms"],
      Default: ["Supplier A", "Supplier B", "Supplier C"],
    };

    const operators = ["Chris", "Ana", "Mihai", "Elena"];
    const numExpenses = Math.floor(Math.random() * 3) + 1; // 1-3 expenses
    const expenses: ExpenseDetail[] = [];

    // Generate random expenses that sum to totalAmount
    let remaining = totalAmount;
    for (let i = 0; i < numExpenses; i++) {
      const isLast = i === numExpenses - 1;
      const amount = isLast
        ? remaining
        : Math.floor(
            (remaining / (numExpenses - i)) *
              (0.5 + Math.random()),
          );
      remaining -= amount;

      // Determine supplier based on subcategory
      let supplierList = suppliers.Default;
      if (subcategoryName.includes("Google")) {
        supplierList = suppliers.Google;
      } else if (
        subcategoryName.includes("Meta") ||
        subcategoryName.includes("TikTok")
      ) {
        supplierList = suppliers.Meta;
      }

      const day = Math.floor(Math.random() * 28) + 1;
      const year = parseInt(selectedYear);
      const month = monthIndex + 1;

      expenses.push({
        description: `${subcategoryName.split(". ")[1] || subcategoryName} - ${months[monthIndex].charAt(0).toUpperCase() + months[monthIndex].slice(1)} ${day}`,
        invoiceDate: `${day.toString().padStart(2, "0")}.${month.toString().padStart(2, "0")}.${year}`,
        amount: amount,
        addedBy:
          operators[
            Math.floor(Math.random() * operators.length)
          ],
        supplier:
          supplierList[
            Math.floor(Math.random() * supplierList.length)
          ],
      });
    }

    return expenses.sort((a, b) => b.amount - a.amount);
  };

  const handleCellClick = (
    subcategoryName: string,
    monthIndex: number,
    amount: number,
  ) => {
    if (amount === 0) return; // Don't open modal for zero amounts

    const subcat = subcategories.find(
      (s) => s.name === subcategoryName,
    );
    if (!subcat) return;

    setSelectedCell({ subcategoryName, monthIndex, amount });
    const expenseDetails = generateExpenseDetails(
      subcategoryName,
      monthIndex,
      amount,
    );
    setSelectedExpense(expenseDetails[0] || null);
  };

  const getExpensesForModal = (): ExpenseDetail[] => {
    if (!selectedCell) return [];

    return generateExpenseDetails(
      selectedCell.subcategoryName,
      selectedCell.monthIndex,
      selectedCell.amount,
    );
  };

  return (
    <div className="px-4 md:px-8 py-4 md:py-6">
      {/* Header with Category Title and Currency Filter */}
      <div className="flex items-center justify-between mb-6">
        <h1
          className="text-gray-900"
          style={{ fontSize: "1.5rem", fontWeight: 600 }}
        >
          {categoryName}
        </h1>

        {/* Currency Buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedCurrency("EUR")}
            className={`px-4 py-2 rounded-lg transition-all ${
              selectedCurrency === "EUR"
                ? "bg-teal-500 text-white shadow-[0_2px_8px_rgba(20,184,166,0.3)]"
                : "bg-white/70 backdrop-blur-xl text-gray-700 border border-gray-300/50 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
            }`}
            style={{
              fontSize: "0.9375rem",
              fontWeight:
                selectedCurrency === "EUR" ? 500 : 400,
            }}
          >
            EUR
          </button>
          <button
            onClick={() => setSelectedCurrency("RON")}
            className={`px-4 py-2 rounded-lg transition-all ${
              selectedCurrency === "RON"
                ? "bg-teal-500 text-white shadow-[0_2px_8px_rgba(20,184,166,0.3)]"
                : "bg-white/70 backdrop-blur-xl text-gray-700 border border-gray-300/50 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
            }`}
            style={{
              fontSize: "0.9375rem",
              fontWeight:
                selectedCurrency === "RON" ? 500 : 400,
            }}
          >
            RON
          </button>
        </div>
      </div>

      {/* Category Detail Table */}
      <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-[0_4px_16px_rgba(0,0,0,0.06)] border border-gray-200/30 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200/50">
                <th
                  className="px-6 py-4 text-left bg-gray-50/50"
                  style={{ minWidth: "200px" }}
                >
                  <div className="w-28">
                    <CustomSelect
                      value={selectedYear}
                      onChange={setSelectedYear}
                      options={["2025", "2024", "2023"]}
                      className="w-full px-3 py-2 border border-gray-300/50 bg-white/70 backdrop-blur-xl rounded-lg text-gray-900 focus:outline-none focus:border-gray-400 transition-all shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
                      style={{
                        fontSize: "0.9375rem",
                        fontWeight: 400,
                      }}
                    />
                  </div>
                </th>
                {months.map((month) => (
                  <th
                    key={month}
                    className="px-4 py-4 text-right bg-gray-50/50"
                    style={{
                      fontSize: "0.9375rem",
                      fontWeight: 500,
                      color: "#4B5563",
                      minWidth: "88px",
                    }}
                  >
                    {month.charAt(0).toUpperCase() +
                      month.slice(1, 3)}
                  </th>
                ))}
                <th
                  className="px-4 py-4 text-right bg-gray-50/50"
                  style={{
                    fontSize: "0.9375rem",
                    fontWeight: 500,
                    color: "#4B5563",
                    minWidth: "88px",
                  }}
                >
                  YTD
                </th>
              </tr>
            </thead>
            <tbody>
              {/* Subcategory Rows */}
              {subcategories.map((subcat, index) => (
                <tr
                  key={index}
                  className="border-b border-gray-200/20 hover:bg-gray-50/30 transition-colors"
                >
                  <td
                    className="px-6 py-3"
                    style={{
                      fontSize: "0.8125rem",
                      fontWeight: 400,
                      color: "#4B5563",
                    }}
                  >
                    {subcat.name}
                  </td>
                  {getYearData(subcat.values).map(
                    (amount, idx) => (
                      <td
                        key={idx}
                        className="px-4 py-3 text-right cursor-pointer hover:bg-teal-50/50 transition-colors"
                        style={{
                          fontSize: "0.875rem",
                          fontWeight: 400,
                          color: "#1F2937",
                        }}
                        onClick={() =>
                          handleCellClick(
                            subcat.name,
                            idx,
                            amount,
                          )
                        }
                      >
                        {amount > 0
                          ? formatAmount(amount)
                          : "0"}
                      </td>
                    ),
                  )}
                  <td
                    className="px-4 py-3 text-right"
                    style={{
                      fontSize: "0.8125rem",
                      fontWeight: 400,
                      color: "#4B5563",
                    }}
                  >
                    {formatAmount(getYTD(subcat.values))}
                  </td>
                </tr>
              ))}

              {/* Total Row */}
              <tr className="border-t-2 border-gray-300/50 bg-gray-50/50">
                <td
                  className="px-6 py-3"
                  style={{
                    fontSize: "0.875rem",
                    fontWeight: 600,
                    color: "#1F2937",
                  }}
                >
                  TOTAL
                </td>
                {getYearData(categoryTotals).map(
                  (amount, idx) => (
                    <td
                      key={idx}
                      className="px-4 py-3 text-right"
                      style={{
                        fontSize: "0.8125rem",
                        fontWeight: 600,
                        color: "#1F2937",
                      }}
                    >
                      {formatAmount(amount)}
                    </td>
                  ),
                )}
                <td
                  className="px-4 py-3 text-right"
                  style={{
                    fontSize: "0.8125rem",
                    fontWeight: 600,
                    color: "#1F2937",
                  }}
                >
                  {formatAmount(getYTD(categoryTotals))}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Expense Detail Modal */}
      <ExpenseDetailModal
        isOpen={selectedExpense !== null}
        onClose={() => setSelectedExpense(null)}
        subcategoryName={
          selectedExpense?.description.split(" - ")[0] || ""
        }
        month={
          selectedExpense?.description
            .split(" - ")[1]
            .split(" ")[0] || ""
        }
        year={selectedYear}
        expenses={getExpensesForModal()}
        currency={selectedCurrency}
      />
    </div>
  );
}