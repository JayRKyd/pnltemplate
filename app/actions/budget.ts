"use server";

import { supabase } from "@/lib/supabase";
import { stackServerApp } from "@/stack";
import * as XLSX from "xlsx";

export interface Budget {
  id: string;
  team_id: string;
  year: number;
  category_id: string | null;
  subcategory_id: string | null;
  monthly_values: Record<string, number>;
  jan: number;
  feb: number;
  mar: number;
  apr: number;
  may: number;
  jun: number;
  jul: number;
  aug: number;
  sep: number;
  oct: number;
  nov: number;
  dec: number;
  annual_total: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  uploaded_by: string | null;
}

export interface BudgetWithCategory extends Budget {
  category_name?: string;
  subcategory_name?: string;
}

export interface Revenue {
  id: string;
  team_id: string;
  year: number;
  month: number;
  amount: number;
  currency: string;
  description: string | null;
  source: string | null;
  entered_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PnlSummary {
  month: number;
  revenue: number;
  expenses: number;
  budget: number;
  profit: number;
  delta: number;
}

export interface CategoryExpense {
  category_id: string | null;
  category_name: string | null;
  subcategory_id: string | null;
  subcategory_name: string | null;
  total_amount: number;
  expense_count: number;
}

// =============== BUDGET CRUD ===============

// Get all budgets for a team/year
export async function getBudgets(
  teamId: string,
  year: number
): Promise<BudgetWithCategory[]> {
  const { data, error } = await supabase
    .from("team_budgets")
    .select(`
      *,
      category:team_expense_categories!team_budgets_category_id_fkey(name),
      subcategory:team_expense_categories!team_budgets_subcategory_id_fkey(name)
    `)
    .eq("team_id", teamId)
    .eq("year", year)
    .order("category_id");

  if (error) {
    console.error("[getBudgets] Error:", error);
    throw new Error(error.message);
  }

  return (data || []).map((b) => ({
    ...b,
    category_name: b.category?.name,
    subcategory_name: b.subcategory?.name,
  }));
}

// Get budget for specific category
export async function getCategoryBudget(
  teamId: string,
  year: number,
  categoryId: string,
  subcategoryId?: string
): Promise<Budget | null> {
  let query = supabase
    .from("team_budgets")
    .select("*")
    .eq("team_id", teamId)
    .eq("year", year)
    .eq("category_id", categoryId);

  if (subcategoryId) {
    query = query.eq("subcategory_id", subcategoryId);
  } else {
    query = query.is("subcategory_id", null);
  }

  const { data, error } = await query.single();

  if (error) {
    if (error.code === "PGRST116") return null;
    console.error("[getCategoryBudget] Error:", error);
    throw new Error(error.message);
  }

  return data;
}

// Upsert budget (create or update)
export async function upsertBudget(
  teamId: string,
  year: number,
  categoryId: string,
  subcategoryId: string | null,
  monthlyValues: {
    jan?: number;
    feb?: number;
    mar?: number;
    apr?: number;
    may?: number;
    jun?: number;
    jul?: number;
    aug?: number;
    sep?: number;
    oct?: number;
    nov?: number;
    dec?: number;
  },
  notes?: string
): Promise<Budget> {
  const user = await stackServerApp.getUser();

  const { data, error } = await supabase
    .from("team_budgets")
    .upsert(
      {
        team_id: teamId,
        year,
        category_id: categoryId,
        subcategory_id: subcategoryId,
        jan: monthlyValues.jan ?? 0,
        feb: monthlyValues.feb ?? 0,
        mar: monthlyValues.mar ?? 0,
        apr: monthlyValues.apr ?? 0,
        may: monthlyValues.may ?? 0,
        jun: monthlyValues.jun ?? 0,
        jul: monthlyValues.jul ?? 0,
        aug: monthlyValues.aug ?? 0,
        sep: monthlyValues.sep ?? 0,
        oct: monthlyValues.oct ?? 0,
        nov: monthlyValues.nov ?? 0,
        dec: monthlyValues.dec ?? 0,
        monthly_values: monthlyValues,
        notes,
        uploaded_by: user?.id,
      },
      {
        onConflict: "team_id,year,category_id,subcategory_id",
      }
    )
    .select()
    .single();

  if (error) {
    console.error("[upsertBudget] Error:", error);
    throw new Error(error.message);
  }

  return data;
}

// Delete budget
export async function deleteBudget(id: string, teamId: string): Promise<void> {
  const { error } = await supabase
    .from("team_budgets")
    .delete()
    .eq("id", id)
    .eq("team_id", teamId);

  if (error) {
    console.error("[deleteBudget] Error:", error);
    throw new Error(error.message);
  }
}

// =============== EXCEL IMPORT/EXPORT ===============

interface BudgetRow {
  category: string;
  subcategory: string;
  jan: number;
  feb: number;
  mar: number;
  apr: number;
  may: number;
  jun: number;
  jul: number;
  aug: number;
  sep: number;
  oct: number;
  nov: number;
  dec: number;
}

// Generate budget template for download
export async function generateBudgetTemplate(teamId: string): Promise<string> {
  // Get all categories for this team
  const { data: categories } = await supabase
    .from("team_expense_categories")
    .select("id, name, parent_id")
    .eq("team_id", teamId)
    .order("name");

  const rows: BudgetRow[] = [];

  // Build category/subcategory pairs
  const parents = categories?.filter((c) => !c.parent_id) || [];
  const children = categories?.filter((c) => c.parent_id) || [];

  for (const parent of parents) {
    const subs = children.filter((c) => c.parent_id === parent.id);
    if (subs.length === 0) {
      // Category with no subcategories
      rows.push({
        category: parent.name,
        subcategory: "",
        jan: 0, feb: 0, mar: 0, apr: 0, may: 0, jun: 0,
        jul: 0, aug: 0, sep: 0, oct: 0, nov: 0, dec: 0,
      });
    } else {
      for (const sub of subs) {
        rows.push({
          category: parent.name,
          subcategory: sub.name,
          jan: 0, feb: 0, mar: 0, apr: 0, may: 0, jun: 0,
          jul: 0, aug: 0, sep: 0, oct: 0, nov: 0, dec: 0,
        });
      }
    }
  }

  // Create workbook
  const ws = XLSX.utils.json_to_sheet(rows, {
    header: ["category", "subcategory", "jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"],
  });

  // Set column widths
  ws["!cols"] = [
    { wch: 25 }, // category
    { wch: 25 }, // subcategory
    { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, // jan-apr
    { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, // may-aug
    { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, // sep-dec
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Budget");

  // Generate base64 string
  const buffer = XLSX.write(wb, { type: "base64", bookType: "xlsx" });
  return buffer;
}

// Parse uploaded budget Excel file
export async function parseBudgetExcel(
  base64Data: string
): Promise<BudgetRow[]> {
  const buffer = Buffer.from(base64Data, "base64");
  const workbook = XLSX.read(buffer, { type: "buffer" });

  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  const rows = XLSX.utils.sheet_to_json<BudgetRow>(worksheet);

  return rows.map((row) => ({
    category: String(row.category || "").trim(),
    subcategory: String(row.subcategory || "").trim(),
    jan: Number(row.jan) || 0,
    feb: Number(row.feb) || 0,
    mar: Number(row.mar) || 0,
    apr: Number(row.apr) || 0,
    may: Number(row.may) || 0,
    jun: Number(row.jun) || 0,
    jul: Number(row.jul) || 0,
    aug: Number(row.aug) || 0,
    sep: Number(row.sep) || 0,
    oct: Number(row.oct) || 0,
    nov: Number(row.nov) || 0,
    dec: Number(row.dec) || 0,
  }));
}

// Import budget from Excel
export async function importBudgetFromExcel(
  teamId: string,
  year: number,
  base64Data: string,
  fileName: string
): Promise<{ imported: number; failed: number; errors: string[] }> {
  const user = await stackServerApp.getUser();
  if (!user) throw new Error("No user in session");

  // Create upload record
  const { data: upload, error: uploadError } = await supabase
    .from("team_budget_uploads")
    .insert({
      team_id: teamId,
      year,
      file_name: fileName,
      status: "processing",
      uploaded_by: user.id,
    })
    .select()
    .single();

  if (uploadError) {
    console.error("[importBudgetFromExcel] Upload record error:", uploadError);
  }

  try {
    const rows = await parseBudgetExcel(base64Data);

  // Get categories for mapping
  const { data: categories } = await supabase
    .from("team_expense_categories")
    .select("id, name, parent_id")
    .eq("team_id", teamId);

    const categoryMap = new Map<string, string>();
    const subcategoryMap = new Map<string, { id: string; parentId: string }>();

    categories?.forEach((c) => {
      if (!c.parent_id) {
        categoryMap.set(c.name.toLowerCase(), c.id);
      } else {
        subcategoryMap.set(c.name.toLowerCase(), { id: c.id, parentId: c.parent_id });
      }
    });

    let imported = 0;
    let failed = 0;
    const errors: string[] = [];

    // Delete existing budgets for this year (replace mode)
    await supabase
      .from("team_budgets")
      .delete()
      .eq("team_id", teamId)
      .eq("year", year);

    for (const row of rows) {
      try {
        const categoryId = categoryMap.get(row.category.toLowerCase());
        if (!categoryId) {
          errors.push(`Category not found: ${row.category}`);
          failed++;
          continue;
        }

        let subcategoryId: string | null = null;
        if (row.subcategory) {
          const sub = subcategoryMap.get(row.subcategory.toLowerCase());
          if (!sub) {
            errors.push(`Subcategory not found: ${row.subcategory}`);
            failed++;
            continue;
          }
          if (sub.parentId !== categoryId) {
            errors.push(`Subcategory "${row.subcategory}" doesn't belong to category "${row.category}"`);
            failed++;
            continue;
          }
          subcategoryId = sub.id;
        }

        await upsertBudget(teamId, year, categoryId, subcategoryId, {
          jan: row.jan,
          feb: row.feb,
          mar: row.mar,
          apr: row.apr,
          may: row.may,
          jun: row.jun,
          jul: row.jul,
          aug: row.aug,
          sep: row.sep,
          oct: row.oct,
          nov: row.nov,
          dec: row.dec,
        });

        imported++;
      } catch (err) {
        errors.push(`Row error: ${row.category}/${row.subcategory} - ${err}`);
        failed++;
      }
    }

    // Update upload record
    if (upload) {
      await supabase
        .from("team_budget_uploads")
        .update({
          status: "completed",
          rows_imported: imported,
          rows_failed: failed,
          error_message: errors.length > 0 ? errors.join("; ") : null,
          completed_at: new Date().toISOString(),
        })
        .eq("id", upload.id);
    }

    return { imported, failed, errors };
  } catch (err) {
    // Update upload record with error
    if (upload) {
      await supabase
        .from("team_budget_uploads")
        .update({
          status: "failed",
          error_message: err instanceof Error ? err.message : "Unknown error",
          completed_at: new Date().toISOString(),
        })
        .eq("id", upload.id);
    }

    throw err;
  }
}

// =============== REVENUE ===============

// Get revenues for a team/year
export async function getRevenues(teamId: string, year: number): Promise<Revenue[]> {
  const { data, error } = await supabase
    .from("team_revenues")
    .select("*")
    .eq("team_id", teamId)
    .eq("year", year)
    .order("month");

  if (error) {
    console.error("[getRevenues] Error:", error);
    throw new Error(error.message);
  }

  return data || [];
}

// Upsert revenue for a month
export async function upsertRevenue(
  teamId: string,
  year: number,
  month: number,
  amount: number,
  description?: string,
  source: string = "general"
): Promise<Revenue> {
  const user = await stackServerApp.getUser();

  const { data, error } = await supabase
    .from("team_revenues")
    .upsert(
      {
        team_id: teamId,
        year,
        month,
        amount,
        description,
        source,
        entered_by: user?.id,
      },
      {
        onConflict: "team_id,year,month,source",
      }
    )
    .select()
    .single();

  if (error) {
    console.error("[upsertRevenue] Error:", error);
    throw new Error(error.message);
  }

  return data;
}

// =============== P&L FUNCTIONS ===============

// Get P&L summary using DB function
export async function getPnlSummary(
  teamId: string,
  year: number
): Promise<PnlSummary[]> {
  const { data, error } = await supabase.rpc("get_team_pnl_summary", {
    p_team_id: teamId,
    p_year: year,
  });

  if (error) {
    console.error("[getPnlSummary] Error:", error);
    // Fallback to manual calculation if function doesn't exist
    return await calculatePnlManually(teamId, year);
  }

  return data || [];
}

// Manual P&L calculation (fallback)
// OPTIMIZED: Run all 3 queries in parallel instead of sequentially
async function calculatePnlManually(
  teamId: string,
  year: number
): Promise<PnlSummary[]> {
  // Run all queries in parallel for better performance
  const [expensesResult, revenuesResult, budgetsResult] = await Promise.all([
    // Get expenses
    supabase
      .from("team_expenses")
      .select("expense_date, amount, amount_without_vat, amount_with_vat, vat_deductible, status")
      .eq("team_id", teamId)
      .is("deleted_at", null)
      .not("status", "in", '("draft","rejected","skipped")'),

    // Get revenues
    supabase
      .from("team_revenues")
      .select("month, amount")
      .eq("team_id", teamId)
      .eq("year", year),

    // Get budgets
    supabase
      .from("team_budgets")
      .select("jan, feb, mar, apr, may, jun, jul, aug, sep, oct, nov, dec")
      .eq("team_id", teamId)
      .eq("year", year),
  ]);

  const expenses = expensesResult.data;
  const revenues = revenuesResult.data;
  const budgets = budgetsResult.data;

  const result: PnlSummary[] = [];

  for (let month = 1; month <= 12; month++) {
    // Sum expenses for this month
    const monthExpenses = expenses?.filter((e) => {
      const d = new Date(e.expense_date);
      return d.getFullYear() === year && d.getMonth() + 1 === month;
    }) || [];

    const expenseTotal = monthExpenses.reduce((sum, e) => {
      const amt = e.vat_deductible
        ? (e.amount_without_vat || e.amount)
        : (e.amount_with_vat || e.amount);
      return sum + amt;
    }, 0);

    // Sum revenue for this month
    const monthRevenue = revenues?.filter((r) => r.month === month) || [];
    const revenueTotal = monthRevenue.reduce((sum, r) => sum + r.amount, 0);

    // Sum budget for this month
    const monthKeys = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
    const budgetTotal = budgets?.reduce((sum, b) => {
      const key = monthKeys[month - 1] as keyof typeof b;
      return sum + (Number(b[key]) || 0);
    }, 0) || 0;

    result.push({
      month,
      revenue: revenueTotal,
      expenses: expenseTotal,
      budget: budgetTotal,
      profit: revenueTotal - expenseTotal,
      delta: budgetTotal - expenseTotal,
    });
  }

  return result;
}

// Get expenses grouped by category
export async function getExpensesByCategory(
  teamId: string,
  year: number,
  month?: number
): Promise<CategoryExpense[]> {
  const { data, error } = await supabase.rpc("get_team_expenses_by_category", {
    p_team_id: teamId,
    p_year: year,
    p_month: month || null,
  });

  if (error) {
    console.error("[getExpensesByCategory] Error:", error);
    // Fallback to manual query
    return await getExpensesByCategoryManual(teamId, year, month);
  }

  return data || [];
}

// Manual category grouping (fallback)
// OPTIMIZED: Run both queries in parallel instead of sequentially
async function getExpensesByCategoryManual(
  teamId: string,
  year: number,
  month?: number
): Promise<CategoryExpense[]> {
  // Run both queries in parallel for better performance
  const [expensesResult, categoriesResult] = await Promise.all([
    supabase
      .from("team_expenses")
      .select(`
        id,
        amount,
        amount_without_vat,
        amount_with_vat,
        vat_deductible,
        expense_date,
        category_id,
        subcategory_id
      `)
      .eq("team_id", teamId)
      .is("deleted_at", null)
      .not("status", "in", '("draft","rejected","skipped")'),

    supabase
      .from("team_expense_categories")
      .select("id, name, parent_id")
      .eq("team_id", teamId),
  ]);

  const expenses = expensesResult.data;
  const categories = categoriesResult.data;

  // Filter by year/month
  const filtered = expenses?.filter((e) => {
    const d = new Date(e.expense_date);
    if (d.getFullYear() !== year) return false;
    if (month && d.getMonth() + 1 !== month) return false;
    return true;
  }) || [];

  const catMap = new Map(categories?.map((c) => [c.id, c]) || []);

  // Group by category/subcategory
  const groups = new Map<string, CategoryExpense>();

  for (const exp of filtered) {
    const key = `${exp.category_id || "none"}-${exp.subcategory_id || "none"}`;
    const cat = exp.category_id ? catMap.get(exp.category_id) : null;
    const sub = exp.subcategory_id ? catMap.get(exp.subcategory_id) : null;

    const amt = exp.vat_deductible
      ? (exp.amount_without_vat || exp.amount)
      : (exp.amount_with_vat || exp.amount);

    if (!groups.has(key)) {
      groups.set(key, {
        category_id: exp.category_id,
        category_name: cat?.name || null,
        subcategory_id: exp.subcategory_id,
        subcategory_name: sub?.name || null,
        total_amount: 0,
        expense_count: 0,
      });
    }

    const group = groups.get(key)!;
    group.total_amount += amt;
    group.expense_count += 1;
  }

  return Array.from(groups.values());
}

// Get available years for budget/P&L
export async function getAvailableYears(teamId: string): Promise<number[]> {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  // Years with expenses
  const { data: expenseYears } = await supabase
    .from("team_expenses")
    .select("expense_date")
    .eq("team_id", teamId)
    .is("deleted_at", null);

  const years = new Set<number>();

  // Add current year
  years.add(currentYear);

  // Add next year if after October
  if (currentMonth >= 10) {
    years.add(currentYear + 1);
  }

  // Add years from expenses
  expenseYears?.forEach((e) => {
    const y = new Date(e.expense_date).getFullYear();
    if (y >= 2020 && y <= 2100) {
      years.add(y);
    }
  });

  return Array.from(years).sort((a, b) => b - a);
}
