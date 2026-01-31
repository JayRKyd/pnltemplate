"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Download,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart,
  BarChart3,
  Upload,
  Loader2,
  Check,
} from "lucide-react";
import {
  getPnlSummary,
  getExpensesByCategory,
  getBudgets,
  getRevenues,
  upsertRevenue,
  getAvailableYears,
  generateBudgetTemplate,
  importBudgetFromExcel,
  PnlSummary,
  CategoryExpense,
  BudgetWithCategory,
  Revenue,
} from "@/app/actions/budget";
import { getPnlData, PnlCategory } from "@/app/actions/pnl-data";
import { exportPnlToExcel } from "@/app/actions/export";
import { getUserPermissions } from "@/app/actions/permissions";

const MONTH_NAMES = [
  "IAN", "FEB", "MAR", "APR", "MAI", "IUN",
  "IUL", "AUG", "SEP", "OCT", "NOI", "DEC"
];

const MONTH_FULL_NAMES = [
  "Ianuarie", "Februarie", "Martie", "Aprilie", "Mai", "Iunie",
  "Iulie", "August", "Septembrie", "Octombrie", "Noiembrie", "Decembrie"
];

// Current month highlight style
const CURRENT_MONTH_STYLE = {
  backgroundColor: "#FFF1E6",
  fontWeight: 700,
  color: "#1F2937",
};

interface PnlDashboardProps {
  teamId: string;
}

// Helper to get current month (0-indexed) and year
const getCurrentMonthInfo = () => {
  const now = new Date();
  return {
    month: now.getMonth(), // 0-11
    year: now.getFullYear(),
  };
};

// Reorder months for rolling 12-month view (current month at end)
// For current year: shows rolling 12 months with current month at the end
// For past years: shows Jan-Dec in normal order
const getOrderedMonths = (selectedYear: number): number[] => {
  const { month: currentMonth, year: currentYear } = getCurrentMonthInfo();

  if (selectedYear === currentYear) {
    // Rolling 12 months: current month at end
    // E.g., if current month is March (2), order is: Apr(3), May(4)...Dec(11), Jan(0), Feb(1), Mar(2)
    const ordered: number[] = [];
    for (let i = 1; i <= 12; i++) {
      const monthIndex = (currentMonth + i) % 12;
      ordered.push(monthIndex);
    }
    return ordered;
  }

  // Past years: Jan-Dec in normal order (0-11)
  return [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
};

// Check if a month index is the current month (for highlighting)
const isCurrentMonthCheck = (monthIndex: number, selectedYear: number): boolean => {
  const { month: currentMonth, year: currentYear } = getCurrentMonthInfo();
  return selectedYear === currentYear && monthIndex === currentMonth;
};

export function PnlDashboard({ teamId }: PnlDashboardProps) {
  const [activeTab, setActiveTab] = useState<"realized" | "budget" | "delta">("realized");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Data
  const [pnlSummary, setPnlSummary] = useState<PnlSummary[]>([]);
  const [categoryExpenses, setCategoryExpenses] = useState<CategoryExpense[]>([]);
  const [budgets, setBudgets] = useState<BudgetWithCategory[]>([]);
  const [revenues, setRevenues] = useState<Revenue[]>([]);
  // P&L grid data (monthly by category)
  const [pnlCategories, setPnlCategories] = useState<PnlCategory[]>([]);
  const [cheltuieliTotal, setCheltuieliTotal] = useState<number[]>(Array(24).fill(0));

  // UI State
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [editingRevenue, setEditingRevenue] = useState<number | null>(null);
  const [revenueInputs, setRevenueInputs] = useState<Record<number, string>>({});
  // Track if component is mounted (for client-side only calculations)
  const [isMounted, setIsMounted] = useState(false);
  // Ordered month indices with rolling logic for current year
  const [orderedMonthIndices, setOrderedMonthIndices] = useState([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);

  // Budget upload
  const [uploadingBudget, setUploadingBudget] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ success: boolean; message: string } | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [years, permissions, summary, expenses, budgetData, revenueData, pnlData] = await Promise.all([
        getAvailableYears(teamId),
        getUserPermissions(teamId),
        getPnlSummary(teamId, selectedYear),
        getExpensesByCategory(teamId, selectedYear),
        getBudgets(teamId, selectedYear),
        getRevenues(teamId, selectedYear),
        getPnlData(teamId, selectedYear),
      ]);

      setAvailableYears(years);
      setIsAdmin(permissions.role === "admin");
      setPnlSummary(summary);
      setCategoryExpenses(expenses);
      setBudgets(budgetData);
      setRevenues(revenueData);
      setPnlCategories(pnlData.categories);
      setCheltuieliTotal(pnlData.cheltuieli);

      // Initialize revenue inputs
      const inputs: Record<number, string> = {};
      for (let m = 1; m <= 12; m++) {
        const rev = revenueData.find((r) => r.month === m);
        inputs[m] = rev ? rev.amount.toString() : "0";
      }
      setRevenueInputs(inputs);
    } catch (err) {
      console.error("Failed to load P&L data:", err);
    } finally {
      setLoading(false);
    }
  }, [teamId, selectedYear]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Mark component as mounted (client-side only)
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Calculate ordered months - default order on server, rolling order on client
  useEffect(() => {
    const { month: currentMonth, year: currentYear } = getCurrentMonthInfo();
    console.log('useEffect fired:', { selectedYear, currentYear, currentMonth });
    if (selectedYear === currentYear) {
      const ordered: number[] = [];
      for (let i = 1; i <= 12; i++) {
        ordered.push((currentMonth + i) % 12);
      }
      console.log('Setting rolling order for current year:', ordered);
      setOrderedMonthIndices(ordered);
    } else {
      console.log('Setting standard order for past year');
      setOrderedMonthIndices([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    }
  }, [selectedYear]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const result = await exportPnlToExcel(teamId, selectedYear);
      if (result.success && result.data) {
        // Download file
        const byteCharacters = atob(result.data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `PnL_${selectedYear}.xlsx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        alert(result.error || "Export failed");
      }
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setExporting(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const base64 = await generateBudgetTemplate(teamId);
      const byteCharacters = atob(base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `Budget_Template_${selectedYear}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Template download failed:", err);
    }
  };

  const handleBudgetUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingBudget(true);
    setUploadResult(null);

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = (event.target?.result as string).split(",")[1];
        const result = await importBudgetFromExcel(teamId, selectedYear, base64, file.name);
        setUploadResult({
          success: result.failed === 0,
          message: `Importat: ${result.imported} rânduri. Eșuate: ${result.failed}${
            result.errors.length > 0 ? `. Erori: ${result.errors.slice(0, 3).join("; ")}` : ""
          }`,
        });
        await loadData();
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setUploadResult({
        success: false,
        message: err instanceof Error ? err.message : "Upload failed",
      });
    } finally {
      setUploadingBudget(false);
      e.target.value = "";
    }
  };

  const handleRevenueChange = async (month: number, value: string) => {
    setRevenueInputs((prev) => ({ ...prev, [month]: value }));
  };

  const handleRevenueSave = async (month: number) => {
    const amount = parseFloat(revenueInputs[month]) || 0;
    await upsertRevenue(teamId, selectedYear, month, amount);
    setEditingRevenue(null);
    await loadData();
  };

  const toggleCategory = (categoryName: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryName)) {
        next.delete(categoryName);
      } else {
        next.add(categoryName);
      }
      return next;
    });
  };

  // Calculate totals
  const ytdRevenue = pnlSummary.reduce((sum, m) => sum + m.revenue, 0);
  const ytdExpenses = pnlSummary.reduce((sum, m) => sum + m.expenses, 0);
  const ytdBudget = pnlSummary.reduce((sum, m) => sum + m.budget, 0);
  const ytdProfit = ytdRevenue - ytdExpenses;
  const ytdDelta = ytdBudget - ytdExpenses;
  const profitMargin = ytdRevenue > 0 ? (ytdProfit / ytdRevenue) * 100 : 0;

  // Group expenses by category
  const categoryGroups = new Map<string, CategoryExpense[]>();
  categoryExpenses.forEach((exp) => {
    const catName = exp.category_name || "Fără categorie";
    if (!categoryGroups.has(catName)) {
      categoryGroups.set(catName, []);
    }
    categoryGroups.get(catName)!.push(exp);
  });

  // Reorder pnlSummary based on rolling 12-month logic
  const orderedPnlSummary = orderedMonthIndices
    .map((monthIndex) => pnlSummary.find((row) => row.month === monthIndex + 1))
    .filter((row): row is PnlSummary => row !== undefined);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("ro-RO", {
      style: "decimal",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">P&L Statement</h1>
          <p className="text-gray-500">Profit & Loss pentru anul {selectedYear}</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Year selector */}
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-4 py-2 border border-gray-200 rounded-lg text-sm bg-white"
          >
            {availableYears.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>

          {/* Refresh */}
          <button
            onClick={loadData}
            className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <RefreshCw className="w-5 h-5 text-gray-500" />
          </button>

          {/* Export (Admin only) */}
          {isAdmin && (
            <button
              onClick={handleExport}
              disabled={exporting}
              className="flex items-center gap-2 px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 disabled:opacity-50"
            >
              {exporting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              Export Excel
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-50 rounded-lg">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <span className="text-sm text-gray-500">Venituri YTD</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(ytdRevenue)} RON</p>
        </div>

        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-red-50 rounded-lg">
              <TrendingDown className="w-5 h-5 text-red-600" />
            </div>
            <span className="text-sm text-gray-500">Cheltuieli YTD</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(ytdExpenses)} RON</p>
        </div>

        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-50 rounded-lg">
              <DollarSign className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-sm text-gray-500">Profit YTD</span>
          </div>
          <p className={`text-2xl font-bold ${ytdProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
            {formatCurrency(ytdProfit)} RON
          </p>
        </div>

        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-50 rounded-lg">
              <PieChart className="w-5 h-5 text-purple-600" />
            </div>
            <span className="text-sm text-gray-500">Marjă Profit</span>
          </div>
          <p className={`text-2xl font-bold ${profitMargin >= 0 ? "text-green-600" : "text-red-600"}`}>
            {profitMargin.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex border-b border-gray-100">
          <button
            onClick={() => setActiveTab("realized")}
            className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
              activeTab === "realized"
                ? "text-teal-600 border-b-2 border-teal-500 bg-teal-50/50"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <BarChart3 className="w-4 h-4 inline mr-2" />
            Realizat
          </button>
          <button
            onClick={() => setActiveTab("budget")}
            className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
              activeTab === "budget"
                ? "text-teal-600 border-b-2 border-teal-500 bg-teal-50/50"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <PieChart className="w-4 h-4 inline mr-2" />
            Budget
          </button>
          <button
            onClick={() => setActiveTab("delta")}
            className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
              activeTab === "delta"
                ? "text-teal-600 border-b-2 border-teal-500 bg-teal-50/50"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <TrendingUp className="w-4 h-4 inline mr-2" />
            Delta
          </button>
        </div>

        <div className="p-6">
          {/* ====== REALIZED TAB ====== */}
          {activeTab === "realized" && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left py-3 px-4 font-semibold text-gray-600 sticky left-0 bg-gray-50 min-w-[180px]">
                      EUR
                    </th>
                    {orderedMonthIndices.map((monthIndex) => {
                      const isCurrentMonth = isCurrentMonthCheck(monthIndex, selectedYear);
                      return (
                        <th
                          key={monthIndex}
                          className="text-right py-3 px-3 font-semibold min-w-[70px]"
                          style={isCurrentMonth
                            ? { backgroundColor: CURRENT_MONTH_STYLE.backgroundColor, color: CURRENT_MONTH_STYLE.color }
                            : { color: "#4B5563" }}
                        >
                          {MONTH_NAMES[monthIndex]}
                        </th>
                      );
                    })}
                    <th className="text-right py-3 px-4 font-semibold text-gray-600 bg-[#E6F4EA] min-w-[90px]">YTD</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Cheltuieli Total Row (expandable) */}
                  <tr
                    className="border-b border-gray-200 cursor-pointer hover:bg-gray-50"
                    onClick={() => toggleCategory("Cheltuieli")}
                  >
                    <td className="py-3 px-4 sticky left-0 bg-white font-semibold flex items-center gap-2">
                      {expandedCategories.has("Cheltuieli") ? (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      )}
                      Cheltuieli
                    </td>
                    {orderedMonthIndices.map((monthIndex) => {
                      const isCurrentMonth = isCurrentMonthCheck(monthIndex, selectedYear);
                      // Use indices 12-23 for current year data
                      const value = cheltuieliTotal[12 + monthIndex] || 0;
                      return (
                        <td
                          key={monthIndex}
                          className="py-3 px-3 text-right font-semibold"
                          style={isCurrentMonth ? { backgroundColor: CURRENT_MONTH_STYLE.backgroundColor } : {}}
                        >
                          {formatCurrency(value)}
                        </td>
                      );
                    })}
                    <td className="py-3 px-4 text-right font-semibold bg-[#E6F4EA]">
                      {formatCurrency(cheltuieliTotal.slice(12, 24).reduce((a, b) => a + b, 0))}
                    </td>
                  </tr>

                  {/* Category Rows (shown when Cheltuieli is expanded) */}
                  {expandedCategories.has("Cheltuieli") && pnlCategories.map((category) => (
                    <React.Fragment key={category.id}>
                      {/* Category Row */}
                      <tr
                        className="border-b border-gray-100 cursor-pointer hover:bg-gray-50"
                        onClick={() => toggleCategory(category.name)}
                      >
                        <td className="py-2 px-4 sticky left-0 bg-white pl-8 flex items-center gap-2">
                          {category.subcategories && category.subcategories.length > 0 && (
                            expandedCategories.has(category.name) ? (
                              <ChevronDown className="w-3 h-3 text-gray-400" />
                            ) : (
                              <ChevronRight className="w-3 h-3 text-gray-400" />
                            )
                          )}
                          <span className="font-medium text-gray-700">{category.name}</span>
                        </td>
                        {orderedMonthIndices.map((monthIndex) => {
                          const isCurrentMonth = isCurrentMonthCheck(monthIndex, selectedYear);
                          // Use indices 12-23 for current year data
                          const value = category.values[12 + monthIndex] || 0;
                          return (
                            <td
                              key={monthIndex}
                              className="py-2 px-3 text-right"
                              style={isCurrentMonth ? { backgroundColor: CURRENT_MONTH_STYLE.backgroundColor } : {}}
                            >
                              {value > 0 ? formatCurrency(value) : "0"}
                            </td>
                          );
                        })}
                        <td className="py-2 px-4 text-right font-medium bg-[#E6F4EA]">
                          {formatCurrency(category.values.slice(12, 24).reduce((a, b) => a + b, 0))}
                        </td>
                      </tr>

                      {/* Subcategory Rows */}
                      {expandedCategories.has(category.name) && category.subcategories?.map((sub) => (
                        <tr key={sub.id} className="border-b border-gray-50 bg-gray-50/50">
                          <td className="py-2 px-4 sticky left-0 bg-gray-50/50 pl-14 text-gray-500 text-xs">
                            {sub.name}
                          </td>
                          {orderedMonthIndices.map((monthIndex) => {
                            const isCurrentMonth = isCurrentMonthCheck(monthIndex, selectedYear);
                            // Use indices 12-23 for current year data
                            const value = sub.values[12 + monthIndex] || 0;
                            return (
                              <td
                                key={monthIndex}
                                className="py-2 px-3 text-right text-gray-500 text-xs"
                                style={isCurrentMonth ? { backgroundColor: CURRENT_MONTH_STYLE.backgroundColor } : {}}
                              >
                                {value > 0 ? formatCurrency(value) : "0"}
                              </td>
                            );
                          })}
                          <td className="py-2 px-4 text-right text-xs text-gray-600 bg-[#E6F4EA]">
                            {formatCurrency(sub.values.slice(12, 24).reduce((a, b) => a + b, 0))}
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}

                  {/* Neclasificate row for expenses without category */}
                  {expandedCategories.has("Cheltuieli") && (
                    <tr className="border-b border-gray-100">
                      <td className="py-2 px-4 sticky left-0 bg-white pl-8 text-gray-500">
                        Neclasificate
                      </td>
                      {orderedMonthIndices.map((monthIndex) => {
                        const isCurrentMonth = isCurrentMonthCheck(monthIndex, selectedYear);
                        // Calculate unclassified as total minus sum of all categories
                        const totalForMonth = cheltuieliTotal[12 + monthIndex] || 0;
                        const categorizedForMonth = pnlCategories.reduce(
                          (sum, cat) => sum + (cat.values[12 + monthIndex] || 0),
                          0
                        );
                        const unclassified = Math.max(0, totalForMonth - categorizedForMonth);
                        return (
                          <td
                            key={monthIndex}
                            className="py-2 px-3 text-right text-gray-500"
                            style={isCurrentMonth ? { backgroundColor: CURRENT_MONTH_STYLE.backgroundColor } : {}}
                          >
                            {unclassified > 0 ? formatCurrency(unclassified) : "0"}
                          </td>
                        );
                      })}
                      <td className="py-2 px-4 text-right text-gray-500 bg-[#E6F4EA]">
                        {(() => {
                          const totalYtd = cheltuieliTotal.slice(12, 24).reduce((a, b) => a + b, 0);
                          const categorizedYtd = pnlCategories.reduce(
                            (sum, cat) => sum + cat.values.slice(12, 24).reduce((a, b) => a + b, 0),
                            0
                          );
                          return formatCurrency(Math.max(0, totalYtd - categorizedYtd));
                        })()}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* ====== BUDGET TAB ====== */}
          {activeTab === "budget" && (
            <div className="space-y-6">
              {/* Budget Actions */}
              {isAdmin && (
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                  <button
                    onClick={handleDownloadTemplate}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-white"
                  >
                    <Download className="w-4 h-4" />
                    Descarcă Template
                  </button>

                  <label className="flex items-center gap-2 px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 cursor-pointer">
                    {uploadingBudget ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    Încarcă Budget
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleBudgetUpload}
                      className="hidden"
                      disabled={uploadingBudget}
                    />
                  </label>

                  {uploadResult && (
                    <span
                      className={`text-sm ${
                        uploadResult.success ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {uploadResult.message}
                    </span>
                  )}
                </div>
              )}

              {/* Budget Table */}
              {budgets.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <PieChart className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>Nu există budget pentru {selectedYear}</p>
                  {isAdmin && (
                    <p className="text-sm mt-2">
                      Descarcă template-ul și încarcă-l completat.
                    </p>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="text-left py-3 px-4 font-semibold text-gray-600 sticky left-0 bg-gray-50">
                          Categorie
                        </th>
                        {orderedMonthIndices.map((monthIndex) => {
                          const isCurrentMonth = isCurrentMonthCheck(monthIndex, selectedYear);
                          return (
                            <th
                              key={monthIndex}
                              className="text-right py-3 px-3 font-semibold"
                              style={isCurrentMonth
                                ? { backgroundColor: CURRENT_MONTH_STYLE.backgroundColor, color: CURRENT_MONTH_STYLE.color }
                                : { color: "#4B5563" }}
                            >
                              {MONTH_NAMES[monthIndex]}
                            </th>
                          );
                        })}
                        <th className="text-right py-3 px-4 font-semibold text-gray-600 bg-[#E6F4EA]">YTD</th>
                      </tr>
                    </thead>
                    <tbody>
                      {budgets.map((b) => {
                        const monthKeys = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"] as const;
                        return (
                          <tr key={b.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3 px-4 sticky left-0 bg-white">
                              <span className="font-medium">{b.category_name}</span>
                              {b.subcategory_name && (
                                <span className="text-gray-400 ml-2">/ {b.subcategory_name}</span>
                              )}
                            </td>
                            {orderedMonthIndices.map((monthIndex) => {
                              const monthKey = monthKeys[monthIndex];
                              const isCurrentMonth = isCurrentMonthCheck(monthIndex, selectedYear);
                              return (
                                <td
                                  key={monthIndex}
                                  className="py-3 px-3 text-right"
                                  style={isCurrentMonth ? { backgroundColor: CURRENT_MONTH_STYLE.backgroundColor } : {}}
                                >
                                  {formatCurrency(Number(b[monthKey]) || 0)}
                                </td>
                              );
                            })}
                            <td className="py-3 px-4 text-right font-semibold bg-[#E6F4EA]">
                              {formatCurrency(b.annual_total)}
                            </td>
                          </tr>
                        );
                      })}
                      {/* Total row */}
                      <tr className="bg-gray-100 font-bold">
                        <td className="py-3 px-4 sticky left-0 bg-gray-100">TOTAL</td>
                        {orderedMonthIndices.map((monthIndex) => {
                          const monthKeys = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"] as const;
                          const monthKey = monthKeys[monthIndex];
                          const total = budgets.reduce((sum, b) => sum + (Number(b[monthKey]) || 0), 0);
                          const isCurrentMonth = isCurrentMonthCheck(monthIndex, selectedYear);
                          return (
                            <td
                              key={monthIndex}
                              className="py-3 px-3 text-right"
                              style={isCurrentMonth ? { backgroundColor: CURRENT_MONTH_STYLE.backgroundColor } : {}}
                            >
                              {formatCurrency(total)}
                            </td>
                          );
                        })}
                        <td className="py-3 px-4 text-right bg-[#E6F4EA]">{formatCurrency(ytdBudget)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ====== DELTA TAB ====== */}
          {activeTab === "delta" && (
            <div className="space-y-6">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="text-left py-3 px-4 font-semibold text-gray-600">Luna</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-600">Budget</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-600">Realizat</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-600">Delta</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-600">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orderedPnlSummary.map((row) => {
                      const deltaPercent = row.budget > 0
                        ? ((row.budget - row.expenses) / row.budget * 100)
                        : 0;
                      const isCurrentMonth = isCurrentMonthCheck(row.month - 1, selectedYear);

                      return (
                        <tr
                          key={row.month}
                          className={`border-b border-gray-100 ${!isCurrentMonth ? "hover:bg-gray-50" : ""}`}
                          style={isCurrentMonth ? { backgroundColor: CURRENT_MONTH_STYLE.backgroundColor } : {}}
                        >
                          <td
                            className="py-3 px-4"
                            style={isCurrentMonth ? { fontWeight: CURRENT_MONTH_STYLE.fontWeight, color: CURRENT_MONTH_STYLE.color } : { fontWeight: 500 }}
                          >
                            {MONTH_NAMES[row.month - 1]}
                          </td>
                          <td className="py-3 px-4 text-right">{formatCurrency(row.budget)}</td>
                          <td className="py-3 px-4 text-right">{formatCurrency(row.expenses)}</td>
                          <td
                            className={`py-3 px-4 text-right font-semibold ${
                              row.delta >= 0 ? "text-green-600" : "text-red-600"
                            }`}
                          >
                            {row.delta >= 0 ? "+" : ""}{formatCurrency(row.delta)}
                          </td>
                          <td
                            className={`py-3 px-4 text-right ${
                              deltaPercent >= 0 ? "text-green-600" : "text-red-600"
                            }`}
                          >
                            {deltaPercent >= 0 ? "+" : ""}{deltaPercent.toFixed(1)}%
                          </td>
                        </tr>
                      );
                    })}
                    {/* YTD Total */}
                    <tr className="font-bold" style={{ backgroundColor: "#E6F4EA" }}>
                      <td className="py-3 px-4" style={{ fontWeight: 700 }}>YTD</td>
                      <td className="py-3 px-4 text-right">{formatCurrency(ytdBudget)}</td>
                      <td className="py-3 px-4 text-right">{formatCurrency(ytdExpenses)}</td>
                      <td
                        className={`py-3 px-4 text-right ${
                          ytdDelta >= 0 ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {ytdDelta >= 0 ? "+" : ""}{formatCurrency(ytdDelta)}
                      </td>
                      <td
                        className={`py-3 px-4 text-right ${
                          ytdBudget > 0 && ytdDelta >= 0 ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {ytdBudget > 0
                          ? `${ytdDelta >= 0 ? "+" : ""}${((ytdDelta / ytdBudget) * 100).toFixed(1)}%`
                          : "N/A"
                        }
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Visual Delta Indicator */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h4 className="text-sm font-semibold text-gray-600 mb-4">
                  Status Budget YTD
                </h4>
                <div className="relative h-8 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`absolute left-0 top-0 h-full transition-all ${
                      ytdExpenses <= ytdBudget ? "bg-green-500" : "bg-red-500"
                    }`}
                    style={{
                      width: `${Math.min((ytdExpenses / (ytdBudget || 1)) * 100, 100)}%`,
                    }}
                  />
                  <div
                    className="absolute top-0 h-full w-0.5 bg-gray-700"
                    style={{ left: "100%" }}
                  />
                </div>
                <div className="flex justify-between mt-2 text-sm text-gray-500">
                  <span>0 RON</span>
                  <span>Budget: {formatCurrency(ytdBudget)} RON</span>
                </div>
                <p className="mt-4 text-center">
                  {ytdExpenses <= ytdBudget ? (
                    <span className="text-green-600 font-medium">
                      ✓ Sub buget cu {formatCurrency(ytdDelta)} RON
                    </span>
                  ) : (
                    <span className="text-red-600 font-medium">
                      ⚠ Peste buget cu {formatCurrency(Math.abs(ytdDelta))} RON
                    </span>
                  )}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PnlDashboard;
