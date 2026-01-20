"use server";

import * as XLSX from "xlsx";
import { getPnlSummary, getExpensesByCategory, getBudgets, getRevenues } from "./budget";
import { getUserPermissions } from "./permissions";

const MONTH_NAMES = [
  "Ianuarie", "Februarie", "Martie", "Aprilie", "Mai", "Iunie",
  "Iulie", "August", "Septembrie", "Octombrie", "Noiembrie", "Decembrie"
];

const MONTH_KEYS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

// Export P&L to Excel (Admin only)
export async function exportPnlToExcel(
  teamId: string,
  year: number
): Promise<{ success: boolean; data?: string; error?: string }> {
  // Check permissions
  const permissions = await getUserPermissions(teamId);
  if (permissions.role !== "admin") {
    return { success: false, error: "Only admins can export P&L data" };
  }

  try {
    // Fetch all data
    const [pnlSummary, categoryExpenses, budgets, revenues] = await Promise.all([
      getPnlSummary(teamId, year),
      getExpensesByCategory(teamId, year),
      getBudgets(teamId, year),
      getRevenues(teamId, year),
    ]);

    const wb = XLSX.utils.book_new();

    // ========== Sheet 1: P&L Summary ==========
    const summaryData: (string | number)[][] = [
      ["P&L Summary - " + year],
      [],
      ["Luna", "Venituri", "Cheltuieli", "Budget", "Profit", "Delta (Budget - Cheltuieli)"],
    ];

    let ytdRevenue = 0, ytdExpenses = 0, ytdBudget = 0;

    pnlSummary.forEach((row) => {
      ytdRevenue += row.revenue;
      ytdExpenses += row.expenses;
      ytdBudget += row.budget;

      summaryData.push([
        MONTH_NAMES[row.month - 1],
        row.revenue,
        row.expenses,
        row.budget,
        row.profit,
        row.delta,
      ]);
    });

    // YTD row
    summaryData.push([]);
    summaryData.push([
      "YTD Total",
      ytdRevenue,
      ytdExpenses,
      ytdBudget,
      ytdRevenue - ytdExpenses,
      ytdBudget - ytdExpenses,
    ]);

    // Profit margin
    const profitMargin = ytdRevenue > 0 ? ((ytdRevenue - ytdExpenses) / ytdRevenue * 100).toFixed(2) + "%" : "N/A";
    summaryData.push(["Profit Margin", profitMargin]);

    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    wsSummary["!cols"] = [
      { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 25 },
    ];
    XLSX.utils.book_append_sheet(wb, wsSummary, "P&L Summary");

    // ========== Sheet 2: Expenses by Category ==========
    const categoryData: (string | number)[][] = [
      ["Cheltuieli pe Categorii - " + year],
      [],
      ["Categorie", "Subcategorie", "Total (RON)", "Nr. Cheltuieli"],
    ];

    // Group by category
    const categoryGroups = new Map<string, typeof categoryExpenses>();
    categoryExpenses.forEach((exp) => {
      const catName = exp.category_name || "Fără categorie";
      if (!categoryGroups.has(catName)) {
        categoryGroups.set(catName, []);
      }
      categoryGroups.get(catName)!.push(exp);
    });

    categoryGroups.forEach((items, catName) => {
      let catTotal = 0;
      let catCount = 0;

      items.forEach((item) => {
        categoryData.push([
          catName,
          item.subcategory_name || "-",
          item.total_amount,
          item.expense_count,
        ]);
        catTotal += item.total_amount;
        catCount += item.expense_count;
      });

      // Category subtotal
      categoryData.push([catName + " - SUBTOTAL", "", catTotal, catCount]);
      categoryData.push([]);
    });

    const wsCategory = XLSX.utils.aoa_to_sheet(categoryData);
    wsCategory["!cols"] = [
      { wch: 25 }, { wch: 25 }, { wch: 15 }, { wch: 15 },
    ];
    XLSX.utils.book_append_sheet(wb, wsCategory, "Expenses by Category");

    // ========== Sheet 3: Budget Detail ==========
    const budgetData: (string | number)[][] = [
      ["Budget - " + year],
      [],
      ["Categorie", "Subcategorie", ...MONTH_NAMES, "Total Anual"],
    ];

    budgets.forEach((b) => {
      budgetData.push([
        b.category_name || "N/A",
        b.subcategory_name || "-",
        b.jan, b.feb, b.mar, b.apr, b.may, b.jun,
        b.jul, b.aug, b.sep, b.oct, b.nov, b.dec,
        b.annual_total,
      ]);
    });

    const wsBudget = XLSX.utils.aoa_to_sheet(budgetData);
    wsBudget["!cols"] = [
      { wch: 20 }, { wch: 20 },
      ...MONTH_NAMES.map(() => ({ wch: 12 })),
      { wch: 15 },
    ];
    XLSX.utils.book_append_sheet(wb, wsBudget, "Budget");

    // ========== Sheet 4: Revenue Detail ==========
    const revenueData: (string | number)[][] = [
      ["Venituri - " + year],
      [],
      ["Luna", "Suma (RON)", "Descriere", "Sursa"],
    ];

    for (let m = 1; m <= 12; m++) {
      const monthRevenues = revenues.filter((r) => r.month === m);
      if (monthRevenues.length > 0) {
        monthRevenues.forEach((r) => {
          revenueData.push([
            MONTH_NAMES[m - 1],
            r.amount,
            r.description || "",
            r.source || "general",
          ]);
        });
      } else {
        revenueData.push([MONTH_NAMES[m - 1], 0, "", ""]);
      }
    }

    const wsRevenue = XLSX.utils.aoa_to_sheet(revenueData);
    wsRevenue["!cols"] = [
      { wch: 15 }, { wch: 15 }, { wch: 30 }, { wch: 15 },
    ];
    XLSX.utils.book_append_sheet(wb, wsRevenue, "Revenue");

    // Generate base64
    const buffer = XLSX.write(wb, { type: "base64", bookType: "xlsx" });

    return { success: true, data: buffer };
  } catch (error) {
    console.error("[exportPnlToExcel] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Export failed",
    };
  }
}

// Export expenses list to Excel
export async function exportExpensesToExcel(
  teamId: string,
  year: number,
  month?: number
): Promise<{ success: boolean; data?: string; error?: string }> {
  const permissions = await getUserPermissions(teamId);
  if (permissions.role !== "admin") {
    return { success: false, error: "Only admins can export expense data" };
  }

  try {
    // Import supabase here to avoid circular deps
    const { supabase } = await import("@/lib/supabase");

    let query = supabase
      .from("team_expenses")
      .select(`
        expense_uid,
        expense_date,
        supplier,
        description,
        amount,
        amount_without_vat,
        amount_with_vat,
        vat_rate,
        vat_deductible,
        currency,
        status,
        payment_status,
        doc_number,
        doc_type,
        tags,
        category:team_expense_categories!fk_expense_category(name),
        subcategory:team_expense_categories!fk_expense_subcategory(name)
      `)
      .eq("team_id", teamId)
      .is("deleted_at", null)
      .order("expense_date", { ascending: false });

    const { data: expenses, error } = await query;

    if (error) throw error;

    // Filter by year/month
    const filtered = expenses?.filter((e) => {
      const d = new Date(e.expense_date);
      if (d.getFullYear() !== year) return false;
      if (month && d.getMonth() + 1 !== month) return false;
      return true;
    }) || [];

    const exportData: (string | number | boolean)[][] = [
      ["Cheltuieli - " + year + (month ? ` / ${MONTH_NAMES[month - 1]}` : "")],
      [],
      [
        "ID",
        "Data",
        "Furnizor",
        "Descriere",
        "Categorie",
        "Subcategorie",
        "Suma",
        "Fără TVA",
        "Cu TVA",
        "TVA %",
        "TVA Deductibil",
        "Status",
        "Plată",
        "Nr. Document",
        "Tip Document",
        "Tags",
      ],
    ];

    filtered.forEach((e) => {
      exportData.push([
        e.expense_uid || "",
        e.expense_date,
        e.supplier || "",
        e.description || "",
        (e.category as { name?: string })?.name || "",
        (e.subcategory as { name?: string })?.name || "",
        e.amount,
        e.amount_without_vat || "",
        e.amount_with_vat || "",
        e.vat_rate ? `${e.vat_rate}%` : "",
        e.vat_deductible ? "Da" : "Nu",
        e.status,
        e.payment_status,
        e.doc_number || "",
        e.doc_type || "",
        e.tags?.join(", ") || "",
      ]);
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(exportData);
    ws["!cols"] = [
      { wch: 12 }, { wch: 12 }, { wch: 25 }, { wch: 35 }, { wch: 20 }, { wch: 20 },
      { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 8 }, { wch: 12 },
      { wch: 10 }, { wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 20 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, "Expenses");

    const buffer = XLSX.write(wb, { type: "base64", bookType: "xlsx" });

    return { success: true, data: buffer };
  } catch (error) {
    console.error("[exportExpensesToExcel] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Export failed",
    };
  }
}

// Note: Download helper is implemented directly in client components
// since it requires browser APIs (document, atob, URL.createObjectURL)
