"use server";

import { supabase } from "@/lib/supabase";

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

  // Get categories structure
  const { data: categoriesData } = await supabase
    .from("team_expense_categories")
    .select("id, name, parent_id, sort_order, category_type")
    .eq("team_id", teamId)
    .eq("is_active", true)
    .eq("category_type", "cheltuieli")
    .order("sort_order", { ascending: true });

  // Build category tree
  const parentCategories = categoriesData?.filter(c => !c.parent_id) || [];
  const childCategories = categoriesData?.filter(c => c.parent_id) || [];

  // Get all expenses for both years
  const { data: expensesData } = await supabase
    .from("team_expenses")
    .select(`
      id,
      expense_date,
      supplier_name,
      description,
      document_number,
      amount,
      amount_with_vat,
      amount_without_vat,
      vat_deductible,
      status,
      category_id,
      subcategory_id,
      is_recurring
    `)
    .eq("team_id", teamId)
    .is("deleted_at", null)
    .gte("expense_date", `${prevYear}-01-01`)
    .lte("expense_date", `${baseYear}-12-31`)
    .in("status", ["approved", "paid", "pending"]);

  // Get revenues for both years
  const { data: revenuesData } = await supabase
    .from("team_revenues")
    .select("year, month, amount")
    .eq("team_id", teamId)
    .gte("year", prevYear)
    .lte("year", baseYear);

  // Get budgets for both years
  const { data: budgetsData } = await supabase
    .from("team_budgets")
    .select("year, category_id, subcategory_id, jan, feb, mar, apr, may, jun, jul, aug, sep, oct, nov, dec")
    .eq("team_id", teamId)
    .gte("year", prevYear)
    .lte("year", baseYear);

  // Helper to get month index (0-23) from date
  const getMonthIndex = (dateStr: string): number => {
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
    supplier_name: string | null;
    description: string | null;
    document_number: string | null;
    amount: number | null;
    amount_with_vat: number | null;
    amount_without_vat: number | null;
    vat_deductible: boolean | null;
    status: string | null;
    category_id: string | null;
    subcategory_id: string | null;
    is_recurring: boolean | null;
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
    const idx = getMonthIndex(expense.expense_date);
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
          const idx = getMonthIndex(expense.expense_date);
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
            const idx = getMonthIndex(expense.expense_date);
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
          const idx = getMonthIndex(expense.expense_date);
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

  // Build expenses list for invoice popup
  const expenses: PnlExpense[] = (expensesData || []).map(e => {
    const cat = categoriesData?.find(c => c.id === e.category_id);
    const subcat = categoriesData?.find(c => c.id === e.subcategory_id);
    
    return {
      id: e.id,
      date: e.expense_date,
      supplier: e.supplier_name || 'Unknown',
      description: e.description || '',
      invoiceNumber: e.document_number || '',
      amount: getExpenseAmount(e),
      status: e.status || 'pending',
      category: cat?.name || 'Uncategorized',
      subcategory: subcat?.name || '',
      type: e.is_recurring ? 'recurente' : 'reale',
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
  const category = categories?.find(c => 
    c.name.toLowerCase().includes(categoryName.toLowerCase()) ||
    categoryName.toLowerCase().includes(c.name.toLowerCase())
  );

  if (!category) {
    return [];
  }

  // Get expenses for this category in the specified month
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = new Date(year, month, 0).toISOString().split('T')[0]; // Last day of month

  const { data: expenses } = await supabase
    .from("team_expenses")
    .select(`
      id,
      expense_date,
      supplier_name,
      description,
      document_number,
      amount,
      amount_with_vat,
      amount_without_vat,
      vat_deductible,
      status,
      is_recurring
    `)
    .eq("team_id", teamId)
    .is("deleted_at", null)
    .or(`category_id.eq.${category.id},subcategory_id.eq.${category.id}`)
    .gte("expense_date", startDate)
    .lte("expense_date", endDate);

  return (expenses || []).map(e => ({
    id: e.id,
    date: e.expense_date,
    supplier: e.supplier_name || 'Unknown',
    description: e.description || '',
    invoiceNumber: e.document_number || '',
    amount: e.vat_deductible ? (e.amount_without_vat || e.amount || 0) : (e.amount_with_vat || e.amount || 0),
    status: e.status || 'pending',
    category: categoryName,
    subcategory: '',
    type: e.is_recurring ? 'recurente' : 'reale',
  }));
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
  const { error } = await supabase
    .from("team_revenues")
    .upsert(
      {
        team_id: teamId,
        year,
        month,
        amount,
        source: 'manual',
      },
      {
        onConflict: "team_id,year,month,source",
      }
    );

  if (error) {
    console.error("[updateRevenue] Error:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}
