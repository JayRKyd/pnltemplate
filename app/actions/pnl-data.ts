"use server";

import { supabase } from "@/lib/supabase";
import { unstable_cache } from "next/cache";

// Helper to build expense list for P&L
// All expenses (including RE-Forms with status 'recurent') are real team_expenses rows.
// No more instance stitching needed.
async function buildPnlExpenses(teamId: string, prevYear: number, baseYear: number) {
  const { data: allExpenses, error } = await supabase
    .from("team_expenses")
    .select(`
      id,
      expense_date,
      accounting_period,
      supplier,
      description,
      doc_number,
      amount,
      amount_with_vat,
      amount_without_vat,
      vat_deductible,
      status,
      category_id,
      subcategory_id
    `)
    .eq("team_id", teamId)
    .is("deleted_at", null)
    .in("status", ["approved", "paid", "pending", "draft", "final", "recurent"]);

  if (error) {
    console.error("Error fetching expenses:", error);
    return [];
  }

  // Filter by date range using accounting_period (preferred) or expense_date
  return (allExpenses || []).filter(expense => {
    if (expense.accounting_period) {
      const [yearStr] = expense.accounting_period.split('-');
      const year = parseInt(yearStr);
      return year >= prevYear && year <= baseYear;
    }
    if (expense.expense_date) {
      const year = new Date(expense.expense_date).getFullYear();
      return year >= prevYear && year <= baseYear;
    }
    return false;
  });
}

export interface PnlCategory {
  id: string;
  name: string;
  values: number[]; // 24 months (12 for previous year + 12 for current year)
  subcategories: {
    id: string;
    name: string;
    values: number[];
  }[];
}

export interface PnlExpense {
  id: string;
  date: string;
  supplier: string;
  description: string;
  invoiceNumber: string;
  amount: number;
  status: string;
  category: string;
  subcategory: string;
  type: 'reale' | 'recurente';
}

export interface PnlData {
  // Total expenses per month (24 months)
  cheltuieli: number[];
  // Categories with their monthly values
  categories: PnlCategory[];
  // Revenue per month (24 months)
  venituri: number[];
  // Budget per month (24 months)
  budget: number[];
  // Budget by category
  budgetCategories: PnlCategory[];
  // Detailed expenses for invoice popup
  expenses: PnlExpense[];
}

/**
 * Get complete P&L data for a team
 * Returns 24 months of data: 12 for baseYear-1 and 12 for baseYear
 */
export async function getPnlData(
  teamId: string,
  baseYear: number = new Date().getFullYear()
): Promise<PnlData> {
  const prevYear = baseYear - 1;

  // Initialize empty arrays for 24 months
  const emptyMonths = () => Array(24).fill(0);

  // OPTIMIZED: Fetch all data in parallel
  const [categoriesResult, expensesData, revenuesResult, budgetsResult] = await Promise.all([
    // Get categories structure
    supabase
      .from("team_expense_categories")
      .select("id, name, parent_id, sort_order, category_type")
      .eq("team_id", teamId)
      .eq("is_active", true)
      .eq("category_type", "cheltuieli")
      .order("sort_order", { ascending: true }),

    // Get all expenses with instance/final logic
    buildPnlExpenses(teamId, prevYear, baseYear),

    // Get revenues for both years
    supabase
      .from("team_revenues")
      .select("year, month, amount")
      .eq("team_id", teamId)
      .gte("year", prevYear)
      .lte("year", baseYear),

    // Get budgets for both years
    supabase
      .from("team_budgets")
      .select("year, category_id, subcategory_id, jan, feb, mar, apr, may, jun, jul, aug, sep, oct, nov, dec")
      .eq("team_id", teamId)
      .gte("year", prevYear)
      .lte("year", baseYear),
  ]);

  const categoriesData = categoriesResult.data;
  const revenuesData = revenuesResult.data;
  const budgetsData = budgetsResult.data;

  // Build category tree
  const parentCategories = categoriesData?.filter(c => !c.parent_id) || [];
  const childCategories = categoriesData?.filter(c => c.parent_id) || [];

  // Helper to get month index (0-23) from date
  // Uses accounting_period (Luna P&L) if available, otherwise falls back to expense_date
  const getMonthIndex = (dateStr: string, accountingPeriodStr: string | null): number => {
    // Use accounting_period if available (format: "YYYY-MM")
    if (accountingPeriodStr) {
      const parts = accountingPeriodStr.split('-');
      if (parts.length === 2) {
        const year = parseInt(parts[0]);
        const month = parseInt(parts[1]) - 1; // 0-11
        if (year === prevYear) return month;
        if (year === baseYear) return month + 12;
      }
    }
    
    // Fallback to expense_date
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = date.getMonth(); // 0-11
    if (year === prevYear) return month;
    if (year === baseYear) return month + 12;
    return -1; // Out of range
  };

  // Type for expense data
  interface ExpenseRecord {
    id: string;
    expense_date: string;
    accounting_period: string | null;
    supplier: string | null;
    description: string | null;
    doc_number: string | null;
    amount: number | null;
    amount_with_vat: number | null;
    amount_without_vat: number | null;
    vat_deductible: boolean | null;
    status: string | null;
    category_id: string | null;
    subcategory_id: string | null;
  }

  // Helper to get expense amount based on VAT deductibility
  const getExpenseAmount = (expense: ExpenseRecord): number => {
    if (expense.vat_deductible) {
      return expense.amount_without_vat || expense.amount || 0;
    }
    return expense.amount_with_vat || expense.amount || 0;
  };

  // Calculate total expenses per month
  const cheltuieli = emptyMonths();
  expensesData?.forEach(expense => {
    const idx = getMonthIndex(expense.expense_date, expense.accounting_period);
    if (idx >= 0 && idx < 24) {
      cheltuieli[idx] += getExpenseAmount(expense);
    }
  });

  // Build categories with monthly values
  const categories: PnlCategory[] = parentCategories.map((parent, pIndex) => {
    const catValues = emptyMonths();
    const subcats = childCategories.filter(c => c.parent_id === parent.id);
    
    const subcategories = subcats.map((sub, sIndex) => {
      const subValues = emptyMonths();
      
      // Sum expenses for this subcategory
      expensesData?.forEach(expense => {
        if (expense.subcategory_id === sub.id || 
            (expense.category_id === parent.id && expense.subcategory_id === sub.id)) {
          const idx = getMonthIndex(expense.expense_date, expense.accounting_period);
          if (idx >= 0 && idx < 24) {
            const amount = getExpenseAmount(expense);
            subValues[idx] += amount;
            catValues[idx] += amount;
          }
        }
      });

      // Also check for expenses with just category_id (no subcategory)
      if (subcats.length === 0) {
        expensesData?.forEach(expense => {
          if (expense.category_id === parent.id && !expense.subcategory_id) {
            const idx = getMonthIndex(expense.expense_date, expense.accounting_period);
            if (idx >= 0 && idx < 24) {
              const amount = getExpenseAmount(expense);
              catValues[idx] += amount;
            }
          }
        });
      }

      return {
        id: sub.id,
        name: `${pIndex + 1}.${sIndex + 1} ${sub.name}`,
        values: subValues,
      };
    });

    // If no subcategories, sum direct expenses to category
    if (subcats.length === 0) {
      expensesData?.forEach(expense => {
        if (expense.category_id === parent.id) {
          const idx = getMonthIndex(expense.expense_date, expense.accounting_period);
          if (idx >= 0 && idx < 24) {
            catValues[idx] += getExpenseAmount(expense);
          }
        }
      });
    }

    return {
      id: parent.id,
      name: parent.name,
      values: catValues,
      subcategories,
    };
  });

  // Calculate revenue per month
  const venituri = emptyMonths();
  revenuesData?.forEach(rev => {
    const idx = rev.year === prevYear ? rev.month - 1 : rev.month - 1 + 12;
    if (idx >= 0 && idx < 24) {
      venituri[idx] += rev.amount || 0;
    }
  });

  // Calculate total budget per month
  const budget = emptyMonths();
  const monthKeys = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  
  budgetsData?.forEach(b => {
    monthKeys.forEach((key, monthIdx) => {
      const value = (b as any)[key] || 0;
      const idx = b.year === prevYear ? monthIdx : monthIdx + 12;
      if (idx >= 0 && idx < 24) {
        budget[idx] += value;
      }
    });
  });

  // Build budget categories (similar structure to expense categories)
  const budgetCategories: PnlCategory[] = parentCategories.map((parent, pIndex) => {
    const catValues = emptyMonths();
    const subcats = childCategories.filter(c => c.parent_id === parent.id);
    
    const subcategories = subcats.map((sub, sIndex) => {
      const subValues = emptyMonths();
      
      // Get budget for this subcategory
      budgetsData?.forEach(b => {
        if (b.subcategory_id === sub.id) {
          monthKeys.forEach((key, monthIdx) => {
            const value = (b as any)[key] || 0;
            const idx = b.year === prevYear ? monthIdx : monthIdx + 12;
            if (idx >= 0 && idx < 24) {
              subValues[idx] += value;
              catValues[idx] += value;
            }
          });
        }
      });

      return {
        id: sub.id,
        name: `${pIndex + 1}.${sIndex + 1} ${sub.name}`,
        values: subValues,
      };
    });

    // Get budget for category-level (no subcategory)
    budgetsData?.forEach(b => {
      if (b.category_id === parent.id && !b.subcategory_id) {
        monthKeys.forEach((key, monthIdx) => {
          const value = (b as any)[key] || 0;
          const idx = b.year === prevYear ? monthIdx : monthIdx + 12;
          if (idx >= 0 && idx < 24) {
            catValues[idx] += value;
          }
        });
      }
    });

    return {
      id: parent.id,
      name: parent.name,
      values: catValues,
      subcategories,
    };
  });

  // Build category lookup Map for O(1) access (fixes O(n²) lookup)
  const categoryMap = new Map<string, string>();
  categoriesData?.forEach(c => categoryMap.set(c.id, c.name));

  // Build expenses list for invoice popup
  const expenses: PnlExpense[] = (expensesData || []).map(e => {
    return {
      id: e.id,
      date: e.expense_date,
      supplier: e.supplier || 'Unknown',
      description: e.description || '',
      invoiceNumber: e.doc_number || '',
      amount: getExpenseAmount(e),
      status: e.status || 'pending',
      category: (e.category_id && categoryMap.get(e.category_id)) || 'Uncategorized',
      subcategory: (e.subcategory_id && categoryMap.get(e.subcategory_id)) || '',
      type: e.status === 'recurent' ? 'recurente' : 'reale',
    };
  });

  return {
    cheltuieli,
    categories,
    venituri,
    budget,
    budgetCategories,
    expenses,
  };
}

/**
 * Get expenses for a specific category and month (for invoice popup)
 * Uses accounting_period (Luna P&L) if available, otherwise falls back to expense_date
 */
export async function getCategoryExpenses(
  teamId: string,
  categoryName: string,
  year: number,
  month: number
): Promise<PnlExpense[]> {
  // Get category by name
  const { data: categories } = await supabase
    .from("team_expense_categories")
    .select("id, name, parent_id")
    .eq("team_id", teamId)
    .eq("is_active", true);

  // Find matching category (could be parent or child)
  // Category names in P&L may be prefixed with numbers like "3.2 Hardware" but DB has just "Hardware"
  // Also handle "3. IT" matching "IT"
  const normalizedCategoryName = categoryName.toLowerCase();
  
  // Extract the actual name without numbering prefix (e.g., "3.2 Hardware" -> "hardware", "3. IT" -> "it")
  const nameWithoutPrefix = normalizedCategoryName.replace(/^\d+\.\d*\s*/, '').trim();
  
  const category = categories?.find(c => {
    const dbName = c.name.toLowerCase().trim();
    return (
      dbName === normalizedCategoryName ||
      dbName === nameWithoutPrefix ||
      dbName.includes(nameWithoutPrefix) ||
      nameWithoutPrefix.includes(dbName)
    );
  });

  if (!category) {
    console.log(`[getCategoryExpenses] No category found for: "${categoryName}" (normalized: "${nameWithoutPrefix}")`);
    return [];
  }

  // Get all expenses for this category (we'll filter by month in code)
  // Include 'draft', 'recurent', 'final' status so all expenses show up
  const { data: expenses } = await supabase
    .from("team_expenses")
    .select(`
      id,
      expense_date,
      accounting_period,
      supplier,
      description,
      doc_number,
      amount,
      amount_with_vat,
      amount_without_vat,
      vat_deductible,
      status
    `)
    .eq("team_id", teamId)
    .is("deleted_at", null)
    .or(`category_id.eq.${category.id},subcategory_id.eq.${category.id}`)
    .in("status", ["approved", "paid", "pending", "draft", "recurent", "final"]);

  // Filter expenses by accounting_period (Luna P&L) or expense_date
  const targetMonthStr = String(month).padStart(2, '0');
  const targetAccountingPeriod = `${year}-${targetMonthStr}`;
  
  const filteredExpenses = (expenses || []).filter(e => {
    // First check if accounting_period matches (priority)
    if (e.accounting_period) {
      return e.accounting_period === targetAccountingPeriod;
    }
    // Fallback to expense_date
    const expenseDate = new Date(e.expense_date);
    return expenseDate.getFullYear() === year && expenseDate.getMonth() + 1 === month;
  });

  const realExpenses: PnlExpense[] = filteredExpenses.map(e => ({
    id: e.id,
    date: e.expense_date,
    supplier: e.supplier || 'Unknown',
    description: e.description || '',
    invoiceNumber: e.doc_number || '',
    amount: e.vat_deductible ? (e.amount_without_vat || e.amount || 0) : (e.amount_with_vat || e.amount || 0),
    status: e.status || 'pending',
    category: categoryName,
    subcategory: '',
    type: e.status === 'recurent' ? 'recurente' : 'reale',
  }));

  return realExpenses;
}

/**
 * Update revenue for a specific month
 */
export async function updateRevenue(
  teamId: string,
  year: number,
  month: number,
  amount: number
): Promise<{ success: boolean; error?: string }> {
  // First check if a record exists
  const { data: existing } = await supabase
    .from("team_revenues")
    .select("id")
    .eq("team_id", teamId)
    .eq("year", year)
    .eq("month", month)
    .eq("source", "manual")
    .single();

  let error;
  if (existing) {
    // Update existing record
    const result = await supabase
      .from("team_revenues")
      .update({ amount, updated_at: new Date().toISOString() })
      .eq("id", existing.id);
    error = result.error;
  } else {
    // Insert new record
    const result = await supabase
      .from("team_revenues")
      .insert({
        team_id: teamId,
        year,
        month,
        amount,
        source: 'manual',
      });
    error = result.error;
  }

  if (error) {
    console.error("[updateRevenue] Error:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * OPTIMIZED: Get all P&L dashboard data in a single call
 * Combines: getPnlData + available years + user permissions
 * Reduces 7+ API calls to 1 server action with parallel DB queries
 */
export interface BudgetRow {
  id: string;
  category_name: string;
  subcategory_name: string | null;
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
}

export interface PnlDashboardData {
  pnlData: PnlData;
  availableYears: number[];
  isAdmin: boolean;
  budgets: BudgetRow[];
  pnlSummary: {
    month: number;
    revenue: number;
    expenses: number;
    budget: number;
    profit: number;
    delta: number;
  }[];
}

// Internal function that does the actual data fetching
async function _fetchPnlDashboardData(
  teamId: string,
  baseYear: number
): Promise<PnlDashboardData> {
  const prevYear = baseYear - 1;
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  // Initialize empty arrays for 24 months
  const emptyMonths = () => Array(24).fill(0);

  // OPTIMIZED: Run ALL queries in parallel including RPC
  // This eliminates the sequential waterfall that was slowing down first load
  const [
    rpcResult,
    categoriesResult,
    expensesData,
    revenuesResult,
    budgetsResult,
    expenseYearsResult,
    membershipResult,
  ] = await Promise.all([
    // RPC for aggregated data (fastest path if available)
    (async () => {
      try {
        return await supabase.rpc('get_pnl_aggregated', {
          p_team_id: teamId,
          p_base_year: baseYear
        });
      } catch {
        return { data: null, error: { message: 'RPC not available' } };
      }
    })(),

    // Categories (always needed for structure)
    supabase
      .from("team_expense_categories")
      .select("id, name, parent_id, sort_order, category_type")
      .eq("team_id", teamId)
      .eq("is_active", true)
      .eq("category_type", "cheltuieli")
      .order("sort_order", { ascending: true }),

    // Expenses with instance/final logic (fallback if RPC fails)
    buildPnlExpenses(teamId, prevYear, baseYear),

    // Revenues (fallback if RPC fails)
    supabase
      .from("team_revenues")
      .select("year, month, amount")
      .eq("team_id", teamId)
      .gte("year", prevYear)
      .lte("year", baseYear),

    // Budgets with category names
    supabase
      .from("team_budgets")
      .select(`
        *,
        category:team_expense_categories!team_budgets_category_id_fkey(name),
        subcategory:team_expense_categories!team_budgets_subcategory_id_fkey(name)
      `)
      .eq("team_id", teamId)
      .eq("year", baseYear),

    // Years from expenses (for available years) - lightweight query
    supabase
      .from("team_expenses")
      .select("expense_date")
      .eq("team_id", teamId)
      .is("deleted_at", null)
      .limit(1000), // Limit for performance

    // User membership (for admin check)
    supabase
      .from("memberships")
      .select("role")
      .eq("team_id", teamId)
      .single(),
  ]);

  // Check if RPC succeeded - use aggregated data if available
  const useRpcData = !rpcResult.error && rpcResult.data;
  const rpcData = rpcResult.data as { cheltuieli: number[]; venituri: number[]; categories: PnlCategory[] } | null;

  if (useRpcData) {
    console.log('[getPnlDashboardData] Using optimized RPC function');
  }

  const categoriesData = categoriesResult.data;
  const revenuesData = revenuesResult.data;
  const budgetsData = budgetsResult.data;

  // Build available years
  const years = new Set<number>();
  years.add(currentYear);
  if (currentMonth >= 10) years.add(currentYear + 1);
  expenseYearsResult.data?.forEach((e) => {
    const y = new Date(e.expense_date).getFullYear();
    if (y >= 2020 && y <= 2100) years.add(y);
  });
  const availableYears = Array.from(years).sort((a, b) => b - a);

  // Check admin status
  const isAdmin = membershipResult.data?.role === "admin";

  // Build category tree
  const parentCategories = categoriesData?.filter(c => !c.parent_id) || [];
  const childCategories = categoriesData?.filter(c => c.parent_id) || [];

  // Helper to get month index (0-23)
  const getMonthIndex = (dateStr: string, accountingPeriodStr: string | null): number => {
    if (accountingPeriodStr) {
      const parts = accountingPeriodStr.split('-');
      if (parts.length === 2) {
        const year = parseInt(parts[0]);
        const month = parseInt(parts[1]) - 1;
        if (year === prevYear) return month;
        if (year === baseYear) return month + 12;
      }
    }
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = date.getMonth();
    if (year === prevYear) return month;
    if (year === baseYear) return month + 12;
    return -1;
  };

  interface ExpenseRecord {
    amount: number | null;
    amount_with_vat: number | null;
    amount_without_vat: number | null;
    vat_deductible: boolean | null;
  }

  const getExpenseAmount = (expense: ExpenseRecord): number => {
    if (expense.vat_deductible) {
      return expense.amount_without_vat || expense.amount || 0;
    }
    return expense.amount_with_vat || expense.amount || 0;
  };

  // Use RPC data if available, otherwise calculate from expenses
  let cheltuieli: number[];
  let categories: PnlCategory[];
  let venituri: number[];

  if (useRpcData && rpcData) {
    // Use pre-aggregated data from RPC (much faster)
    cheltuieli = rpcData.cheltuieli || emptyMonths();
    venituri = rpcData.venituri || emptyMonths();
    categories = (rpcData.categories || []).map((cat: any) => ({
      id: cat.id,
      name: cat.name,
      values: cat.values || emptyMonths(),
      subcategories: (cat.subcategories || []).map((sub: any) => ({
        id: sub.id,
        name: sub.name,
        values: sub.values || emptyMonths(),
      })),
    }));
  } else {
    // Fallback: Calculate totals from raw expenses
    cheltuieli = emptyMonths();
    expensesData?.forEach(expense => {
      const idx = getMonthIndex(expense.expense_date, expense.accounting_period);
      if (idx >= 0 && idx < 24) {
        cheltuieli[idx] += getExpenseAmount(expense);
      }
    });

    // Build categories with monthly values
    categories = parentCategories.map((parent) => {
      const catValues = emptyMonths();
      const subcats = childCategories.filter(c => c.parent_id === parent.id);

      const subcategories = subcats.map((sub) => {
        const subValues = emptyMonths();
        expensesData?.forEach(expense => {
          if (expense.subcategory_id === sub.id) {
            const idx = getMonthIndex(expense.expense_date, expense.accounting_period);
            if (idx >= 0 && idx < 24) {
              const amount = getExpenseAmount(expense);
              subValues[idx] += amount;
              catValues[idx] += amount;
            }
          }
        });
        return { id: sub.id, name: sub.name, values: subValues };
      });

      if (subcats.length === 0) {
        expensesData?.forEach(expense => {
          if (expense.category_id === parent.id) {
            const idx = getMonthIndex(expense.expense_date, expense.accounting_period);
            if (idx >= 0 && idx < 24) {
              catValues[idx] += getExpenseAmount(expense);
            }
          }
        });
      }

      return { id: parent.id, name: parent.name, values: catValues, subcategories };
    });

    // Revenue per month (fallback)
    venituri = emptyMonths();
    revenuesData?.forEach(rev => {
      const idx = rev.year === prevYear ? rev.month - 1 : rev.month - 1 + 12;
      if (idx >= 0 && idx < 24) venituri[idx] += rev.amount || 0;
    });
  }

  // Budget per month
  const budget = emptyMonths();
  const monthKeys = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  budgetsData?.forEach(b => {
    monthKeys.forEach((key, monthIdx) => {
      const value = (b as any)[key] || 0;
      budget[monthIdx + 12] += value; // Only current year budgets
    });
  });

  // Build P&L summary (12 months for selected year)
  const pnlSummary = [];
  for (let month = 1; month <= 12; month++) {
    const idx = month - 1 + 12; // Index in 24-month array for current year
    const revenue = venituri[idx];
    const expenses = cheltuieli[idx];
    const budgetAmt = budget[idx];
    pnlSummary.push({
      month,
      revenue,
      expenses,
      budget: budgetAmt,
      profit: revenue - expenses,
      delta: budgetAmt - expenses,
    });
  }

  return {
    pnlData: {
      cheltuieli,
      categories,
      venituri,
      budget,
      budgetCategories: categories, // Reuse for budget view
      expenses: (() => {
        // Build category lookup Map for O(1) access (fixes O(n²) lookup)
        const catMap = new Map<string, string>();
        categoriesData?.forEach(c => catMap.set(c.id, c.name));

        return (expensesData || []).map(e => ({
          id: e.id,
          date: e.expense_date,
          supplier: e.supplier || 'Unknown',
          description: e.description || '',
          invoiceNumber: e.doc_number || '',
          amount: getExpenseAmount(e),
          status: e.status || 'pending',
          category: (e.category_id && catMap.get(e.category_id)) || 'Uncategorized',
          subcategory: (e.subcategory_id && catMap.get(e.subcategory_id)) || '',
          type: e.status === 'recurent' ? 'recurente' : 'reale',
        }));
      })(),
    },
    availableYears,
    isAdmin,
    budgets: (budgetsData || []).map((b: any) => ({
      id: b.id,
      category_name: b.category?.name || 'Unknown',
      subcategory_name: b.subcategory?.name || null,
      jan: Number(b.jan) || 0,
      feb: Number(b.feb) || 0,
      mar: Number(b.mar) || 0,
      apr: Number(b.apr) || 0,
      may: Number(b.may) || 0,
      jun: Number(b.jun) || 0,
      jul: Number(b.jul) || 0,
      aug: Number(b.aug) || 0,
      sep: Number(b.sep) || 0,
      oct: Number(b.oct) || 0,
      nov: Number(b.nov) || 0,
      dec: Number(b.dec) || 0,
      annual_total: Number(b.annual_total) || 0,
    })),
    pnlSummary,
  };
}

// OPTIMIZED: Cached version of getPnlDashboardData
// Cache for 60 seconds to make subsequent loads instant while keeping data fresh
export const getPnlDashboardData = async (
  teamId: string,
  baseYear: number = new Date().getFullYear()
): Promise<PnlDashboardData> => {
  // Create cached function with team-specific cache key
  const cachedFetch = unstable_cache(
    async () => _fetchPnlDashboardData(teamId, baseYear),
    [`pnl-dashboard-${teamId}-${baseYear}`],
    {
      revalidate: 60, // Cache for 60 seconds
      tags: [`pnl-${teamId}`], // Tag for manual invalidation
    }
  );

  return cachedFetch();
};
