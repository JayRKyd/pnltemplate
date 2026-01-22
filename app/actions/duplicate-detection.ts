"use server";

import { supabase } from "@/lib/supabase";
import { PotentialDuplicate } from "@/lib/utils/duplicate-detection";

// Re-export for convenience
export type { PotentialDuplicate } from "@/lib/utils/duplicate-detection";

// Check for potential duplicate expenses
// A duplicate is detected when at least 2 of these fields match:
// - Document number
// - Supplier
// - Date
// - Amount with VAT
export async function checkForDuplicates(
  teamId: string,
  expense: {
    docNumber?: string;
    supplier?: string;
    expenseDate?: string;
    amountWithVat?: number;
  },
  excludeExpenseId?: string
): Promise<PotentialDuplicate[]> {
  // Need at least one field to check
  if (!expense.docNumber && !expense.supplier && !expense.expenseDate && !expense.amountWithVat) {
    return [];
  }

  // Build query to find potential matches
  let query = supabase
    .from("team_expenses")
    .select("id, uid, supplier, doc_number, expense_date, amount_with_vat")
    .eq("team_id", teamId);

  // Exclude current expense if editing
  if (excludeExpenseId) {
    query = query.neq("id", excludeExpenseId);
  }

  // Add OR conditions for each field that has a value
  const conditions: string[] = [];
  
  if (expense.docNumber) {
    conditions.push(`doc_number.eq.${expense.docNumber}`);
  }
  if (expense.supplier) {
    conditions.push(`supplier.ilike.%${expense.supplier}%`);
  }
  if (expense.expenseDate) {
    conditions.push(`expense_date.eq.${expense.expenseDate}`);
  }
  if (expense.amountWithVat !== undefined) {
    // Allow small variance (within 0.01)
    const minAmount = expense.amountWithVat - 0.01;
    const maxAmount = expense.amountWithVat + 0.01;
    conditions.push(`amount_with_vat.gte.${minAmount}`);
    conditions.push(`amount_with_vat.lte.${maxAmount}`);
  }

  // Execute query
  const { data: potentialMatches, error } = await query.limit(50);

  if (error || !potentialMatches) {
    console.error("Duplicate check error:", error);
    return [];
  }

  // Score each potential match
  const duplicates: PotentialDuplicate[] = [];

  for (const match of potentialMatches) {
    const matchedFields: string[] = [];
    
    // Check each field
    if (expense.docNumber && match.doc_number === expense.docNumber) {
      matchedFields.push("Nr. Document");
    }
    
    if (expense.supplier && match.supplier?.toLowerCase().includes(expense.supplier.toLowerCase())) {
      matchedFields.push("Furnizor");
    }
    
    if (expense.expenseDate && match.expense_date === expense.expenseDate) {
      matchedFields.push("Data");
    }
    
    if (expense.amountWithVat !== undefined && match.amount_with_vat !== null) {
      const diff = Math.abs(match.amount_with_vat - expense.amountWithVat);
      if (diff <= 0.01) {
        matchedFields.push("Suma cu TVA");
      }
    }

    // Only report if at least 2 fields match
    if (matchedFields.length >= 2) {
      duplicates.push({
        id: match.id,
        uid: match.uid || "",
        supplier: match.supplier || "",
        docNumber: match.doc_number || "",
        expenseDate: match.expense_date || "",
        amountWithVat: match.amount_with_vat || 0,
        matchScore: matchedFields.length,
        matchedFields,
      });
    }
  }

  // Sort by match score (highest first)
  duplicates.sort((a, b) => b.matchScore - a.matchScore);

  return duplicates.slice(0, 5); // Return max 5 potential duplicates
}
