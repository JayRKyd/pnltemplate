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
import { exportPnlToExcel } from "@/app/actions/export";
import { getUserPermissions } from "@/app/actions/permissions";

const MONTH_NAMES = [
  "Ian", "Feb", "Mar", "Apr", "Mai", "Iun",
  "Iul", "Aug", "Sep", "Oct", "Noi", "Dec"
];

const MONTH_FULL_NAMES = [
  "Ianuarie", "Februarie", "Martie", "Aprilie", "Mai", "Iunie",
  "Iulie", "August", "Septembrie", "Octombrie", "Noiembrie", "Decembrie"
];

interface PnlDashboardProps {
  teamId: string;
}

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

  // UI State
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [editingRevenue, setEditingRevenue] = useState<number | null>(null);
  const [revenueInputs, setRevenueInputs] = useState<Record<number, string>>({});

  // Budget upload
  const [uploadingBudget, setUploadingBudget] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ success: boolean; message: string } | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [years, permissions, summary, expenses, budgetData, revenueData] = await Promise.all([
        getAvailableYears(teamId),
        getUserPermissions(teamId),
        getPnlSummary(teamId, selectedYear),
        getExpensesByCategory(teamId, selectedYear),
        getBudgets(teamId, selectedYear),
        getRevenues(teamId, selectedYear),
      ]);

      setAvailableYears(years);
      setIsAdmin(permissions.role === "admin");
      setPnlSummary(summary);
      setCategoryExpenses(expenses);
      setBudgets(budgetData);
      setRevenues(revenueData);

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
            <div className="space-y-6">
              {/* Monthly Summary Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="text-left py-3 px-4 font-semibold text-gray-600">Luna</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-600">Venituri</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-600">Cheltuieli</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-600">Profit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pnlSummary.map((row) => (
                      <tr key={row.month} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium">{MONTH_FULL_NAMES[row.month - 1]}</td>
                        <td className="py-3 px-4 text-right">
                          {editingRevenue === row.month ? (
                            <div className="flex items-center justify-end gap-2">
                              <input
                                type="number"
                                value={revenueInputs[row.month]}
                                onChange={(e) => handleRevenueChange(row.month, e.target.value)}
                                className="w-24 px-2 py-1 border rounded text-right"
                                autoFocus
                              />
                              <button
                                onClick={() => handleRevenueSave(row.month)}
                                className="p-1 text-green-600 hover:bg-green-50 rounded"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <span
                              onClick={() => isAdmin && setEditingRevenue(row.month)}
                              className={`${isAdmin ? "cursor-pointer hover:text-teal-600" : ""}`}
                            >
                              {formatCurrency(row.revenue)}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right text-red-600">
                          {formatCurrency(row.expenses)}
                        </td>
                        <td
                          className={`py-3 px-4 text-right font-semibold ${
                            row.profit >= 0 ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          {formatCurrency(row.profit)}
                        </td>
                      </tr>
                    ))}
                    {/* YTD Total */}
                    <tr className="bg-gray-100 font-bold">
                      <td className="py-3 px-4">YTD Total</td>
                      <td className="py-3 px-4 text-right">{formatCurrency(ytdRevenue)}</td>
                      <td className="py-3 px-4 text-right text-red-600">{formatCurrency(ytdExpenses)}</td>
                      <td
                        className={`py-3 px-4 text-right ${
                          ytdProfit >= 0 ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {formatCurrency(ytdProfit)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Expenses by Category */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Cheltuieli pe Categorii</h3>
                <div className="space-y-2">
                  {Array.from(categoryGroups.entries()).map(([catName, items]) => {
                    const catTotal = items.reduce((sum, i) => sum + i.total_amount, 0);
                    const isExpanded = expandedCategories.has(catName);

                    return (
                      <div key={catName} className="border border-gray-200 rounded-lg overflow-hidden">
                        <button
                          onClick={() => toggleCategory(catName)}
                          className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100"
                        >
                          <div className="flex items-center gap-2">
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-gray-400" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-gray-400" />
                            )}
                            <span className="font-medium">{catName}</span>
                            <span className="text-gray-400 text-sm">({items.length})</span>
                          </div>
                          <span className="font-semibold">{formatCurrency(catTotal)} RON</span>
                        </button>
                        {isExpanded && (
                          <div className="divide-y divide-gray-100">
                            {items.map((item, idx) => (
                              <div
                                key={idx}
                                className="flex justify-between px-4 py-2 pl-10 text-sm"
                              >
                                <span className="text-gray-600">
                                  {item.subcategory_name || "-"}
                                </span>
                                <span>{formatCurrency(item.total_amount)} RON</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
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
                        {MONTH_NAMES.map((m) => (
                          <th key={m} className="text-right py-3 px-3 font-semibold text-gray-600">
                            {m}
                          </th>
                        ))}
                        <th className="text-right py-3 px-4 font-semibold text-gray-600">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {budgets.map((b) => (
                        <tr key={b.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4 sticky left-0 bg-white">
                            <span className="font-medium">{b.category_name}</span>
                            {b.subcategory_name && (
                              <span className="text-gray-400 ml-2">/ {b.subcategory_name}</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right">{formatCurrency(b.jan)}</td>
                          <td className="py-3 px-3 text-right">{formatCurrency(b.feb)}</td>
                          <td className="py-3 px-3 text-right">{formatCurrency(b.mar)}</td>
                          <td className="py-3 px-3 text-right">{formatCurrency(b.apr)}</td>
                          <td className="py-3 px-3 text-right">{formatCurrency(b.may)}</td>
                          <td className="py-3 px-3 text-right">{formatCurrency(b.jun)}</td>
                          <td className="py-3 px-3 text-right">{formatCurrency(b.jul)}</td>
                          <td className="py-3 px-3 text-right">{formatCurrency(b.aug)}</td>
                          <td className="py-3 px-3 text-right">{formatCurrency(b.sep)}</td>
                          <td className="py-3 px-3 text-right">{formatCurrency(b.oct)}</td>
                          <td className="py-3 px-3 text-right">{formatCurrency(b.nov)}</td>
                          <td className="py-3 px-3 text-right">{formatCurrency(b.dec)}</td>
                          <td className="py-3 px-4 text-right font-semibold">
                            {formatCurrency(b.annual_total)}
                          </td>
                        </tr>
                      ))}
                      {/* Total row */}
                      <tr className="bg-gray-100 font-bold">
                        <td className="py-3 px-4 sticky left-0 bg-gray-100">TOTAL</td>
                        {MONTH_NAMES.map((_, idx) => {
                          const monthKey = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"][idx] as keyof BudgetWithCategory;
                          const total = budgets.reduce((sum, b) => sum + (Number(b[monthKey]) || 0), 0);
                          return (
                            <td key={idx} className="py-3 px-3 text-right">
                              {formatCurrency(total)}
                            </td>
                          );
                        })}
                        <td className="py-3 px-4 text-right">{formatCurrency(ytdBudget)}</td>
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
                    {pnlSummary.map((row) => {
                      const deltaPercent = row.budget > 0 
                        ? ((row.budget - row.expenses) / row.budget * 100) 
                        : 0;
                      
                      return (
                        <tr key={row.month} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4 font-medium">{MONTH_FULL_NAMES[row.month - 1]}</td>
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
                    <tr className="bg-gray-100 font-bold">
                      <td className="py-3 px-4">YTD Total</td>
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
