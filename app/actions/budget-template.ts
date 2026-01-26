"use server";

import { supabase } from "@/lib/supabase";
import { stackServerApp } from "@/stack";

export interface TemplateSubcategory {
  name: string;
}

export interface TemplateCategory {
  name: string;
  subcategories: TemplateSubcategory[];
  expanded?: boolean;
}

export interface BudgetTemplateData {
  year: string;
  venituriCategories: TemplateCategory[];
  cheltuieliCategories: TemplateCategory[];
}

interface DbCategory {
  id: string;
  team_id: string;
  name: string;
  parent_id: string | null;
  sort_order: number | null;
  is_active: boolean | null;
  category_type: 'venituri' | 'cheltuieli';
}

/**
 * Load budget template structure from database
 */
export async function loadBudgetTemplate(teamId: string): Promise<BudgetTemplateData | null> {
  // Get all categories for this team
  const { data: categories, error } = await supabase
    .from("team_expense_categories")
    .select("*")
    .eq("team_id", teamId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("[loadBudgetTemplate] Error:", error);
    return null;
  }

  if (!categories || categories.length === 0) {
    return null;
  }

  // Separate by type
  const venituriParents = categories.filter(
    (c: DbCategory) => c.category_type === 'venituri' && !c.parent_id
  );
  const cheltuieliParents = categories.filter(
    (c: DbCategory) => c.category_type === 'cheltuieli' && !c.parent_id
  );

  // Build venituri categories
  const venituriCategories: TemplateCategory[] = venituriParents.map((parent: DbCategory) => {
    const subs = categories.filter((c: DbCategory) => c.parent_id === parent.id);
    // Remove number prefix if present (e.g., "1. Echipa" -> "Echipa")
    const cleanName = parent.name.replace(/^\d+\.\s*/, '');
    return {
      name: cleanName,
      subcategories: subs.map((s: DbCategory) => ({ name: s.name })),
      expanded: false,
    };
  });

  // Build cheltuieli categories
  const cheltuieliCategories: TemplateCategory[] = cheltuieliParents.map((parent: DbCategory) => {
    const subs = categories.filter((c: DbCategory) => c.parent_id === parent.id);
    // Remove number prefix if present
    const cleanName = parent.name.replace(/^\d+\.\s*/, '');
    return {
      name: cleanName,
      subcategories: subs.map((s: DbCategory) => ({ name: s.name })),
      expanded: false,
    };
  });

  return {
    year: new Date().getFullYear().toString(),
    venituriCategories,
    cheltuieliCategories,
  };
}

/**
 * Save budget template structure to database
 * This will replace all existing categories for the team
 */
export async function saveBudgetTemplate(
  teamId: string,
  template: BudgetTemplateData
): Promise<{ success: boolean; error?: string }> {
  const user = await stackServerApp.getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  try {
    // Start transaction by soft-deleting existing categories
    const { error: deactivateError } = await supabase
      .from("team_expense_categories")
      .update({ is_active: false })
      .eq("team_id", teamId);

    if (deactivateError) {
      console.error("[saveBudgetTemplate] Deactivate error:", deactivateError);
      return { success: false, error: deactivateError.message };
    }

    // Save Venituri categories
    let sortOrder = 1;
    for (const category of template.venituriCategories) {
      if (!category.name.trim()) continue;

      // Insert parent category
      const { data: parentData, error: parentError } = await supabase
        .from("team_expense_categories")
        .insert({
          team_id: teamId,
          name: `${sortOrder}. ${category.name}`,
          parent_id: null,
          sort_order: sortOrder,
          is_active: true,
          category_type: 'venituri',
        })
        .select()
        .single();

      if (parentError) {
        console.error("[saveBudgetTemplate] Parent insert error:", parentError);
        return { success: false, error: parentError.message };
      }

      // Insert subcategories
      let subOrder = 1;
      for (const sub of category.subcategories) {
        if (!sub.name.trim()) continue;

        const { error: subError } = await supabase
          .from("team_expense_categories")
          .insert({
            team_id: teamId,
            name: sub.name,
            parent_id: parentData.id,
            sort_order: subOrder,
            is_active: true,
            category_type: 'venituri',
          });

        if (subError) {
          console.error("[saveBudgetTemplate] Sub insert error:", subError);
          return { success: false, error: subError.message };
        }
        subOrder++;
      }
      sortOrder++;
    }

    // Save Cheltuieli categories
    sortOrder = 1;
    for (const category of template.cheltuieliCategories) {
      if (!category.name.trim()) continue;

      // Insert parent category
      const { data: parentData, error: parentError } = await supabase
        .from("team_expense_categories")
        .insert({
          team_id: teamId,
          name: `${sortOrder}. ${category.name}`,
          parent_id: null,
          sort_order: sortOrder,
          is_active: true,
          category_type: 'cheltuieli',
        })
        .select()
        .single();

      if (parentError) {
        console.error("[saveBudgetTemplate] Parent insert error:", parentError);
        return { success: false, error: parentError.message };
      }

      // Insert subcategories
      let subOrder = 1;
      for (const sub of category.subcategories) {
        if (!sub.name.trim()) continue;

        const { error: subError } = await supabase
          .from("team_expense_categories")
          .insert({
            team_id: teamId,
            name: sub.name,
            parent_id: parentData.id,
            sort_order: subOrder,
            is_active: true,
            category_type: 'cheltuieli',
          });

        if (subError) {
          console.error("[saveBudgetTemplate] Sub insert error:", subError);
          return { success: false, error: subError.message };
        }
        subOrder++;
      }
      sortOrder++;
    }

    return { success: true };
  } catch (err) {
    console.error("[saveBudgetTemplate] Error:", err);
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

/**
 * Get categories for expense forms (only cheltuieli type)
 */
export async function getExpenseCategories(teamId: string): Promise<{
  categories: { id: string; name: string }[];
  subcategories: { id: string; name: string; parentId: string }[];
}> {
  const { data: categories, error } = await supabase
    .from("team_expense_categories")
    .select("id, name, parent_id, sort_order")
    .eq("team_id", teamId)
    .eq("is_active", true)
    .eq("category_type", "cheltuieli")
    .order("sort_order", { ascending: true });

  if (error || !categories) {
    console.error("[getExpenseCategories] Error:", error);
    return { categories: [], subcategories: [] };
  }

  const parents = categories.filter((c) => !c.parent_id);
  const children = categories.filter((c) => c.parent_id);

  return {
    categories: parents.map((c) => ({ id: c.id, name: c.name })),
    subcategories: children.map((c) => ({
      id: c.id,
      name: c.name,
      parentId: c.parent_id!,
    })),
  };
}

/**
 * Get categories for P&L display (both venituri and cheltuieli)
 */
export async function getPnlCategories(teamId: string): Promise<{
  venituri: { id: string; name: string; subcategories: { id: string; name: string }[] }[];
  cheltuieli: { id: string; name: string; subcategories: { id: string; name: string }[] }[];
}> {
  const { data: categories, error } = await supabase
    .from("team_expense_categories")
    .select("id, name, parent_id, sort_order, category_type")
    .eq("team_id", teamId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error || !categories) {
    console.error("[getPnlCategories] Error:", error);
    return { venituri: [], cheltuieli: [] };
  }

  const buildTree = (type: string) => {
    const parents = categories.filter((c) => c.category_type === type && !c.parent_id);
    return parents.map((parent) => ({
      id: parent.id,
      name: parent.name,
      subcategories: categories
        .filter((c) => c.parent_id === parent.id)
        .map((sub) => ({ id: sub.id, name: sub.name })),
    }));
  };

  return {
    venituri: buildTree('venituri'),
    cheltuieli: buildTree('cheltuieli'),
  };
}
