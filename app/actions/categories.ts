"use server";

import { supabase } from "@/lib/supabase";
import { stackServerApp } from "@/stack";

export interface ExpenseCategory {
  id: string;
  team_id: string;
  name: string;
  parent_id: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CategoryWithChildren extends ExpenseCategory {
  children?: CategoryWithChildren[];
}

// Get all categories for a team (flat list)
export async function getTeamCategories(teamId: string): Promise<ExpenseCategory[]> {
  const { data, error } = await supabase
    .from("team_expense_categories")
    .select("*")
    .eq("team_id", teamId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Failed to fetch categories", error);
    return [];
  }

  return data || [];
}

// Get categories as hierarchical tree
export async function getCategoryTree(teamId: string): Promise<CategoryWithChildren[]> {
  const categories = await getTeamCategories(teamId);
  
  // Build tree from flat list
  const categoryMap = new Map<string, CategoryWithChildren>();
  const roots: CategoryWithChildren[] = [];

  // First pass: create map
  categories.forEach((cat) => {
    categoryMap.set(cat.id, { ...cat, children: [] });
  });

  // Second pass: build tree
  categories.forEach((cat) => {
    const node = categoryMap.get(cat.id)!;
    if (cat.parent_id && categoryMap.has(cat.parent_id)) {
      categoryMap.get(cat.parent_id)!.children!.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
}

// Get subcategories for a parent category
export async function getSubcategories(
  teamId: string,
  parentId: string
): Promise<ExpenseCategory[]> {
  const { data, error } = await supabase
    .from("team_expense_categories")
    .select("*")
    .eq("team_id", teamId)
    .eq("parent_id", parentId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Failed to fetch subcategories", error);
    return [];
  }

  return data || [];
}

// Create a category
export async function createCategory(input: {
  teamId: string;
  name: string;
  parentId?: string;
  sortOrder?: number;
}): Promise<ExpenseCategory> {
  const user = await stackServerApp.getUser();
  if (!user) {
    throw new Error("No user in session");
  }

  const { data, error } = await supabase
    .from("team_expense_categories")
    .insert({
      team_id: input.teamId,
      name: input.name,
      parent_id: input.parentId ?? null,
      sort_order: input.sortOrder ?? 0,
    })
    .select()
    .single();

  if (error) {
    console.error("Failed to create category", error);
    throw new Error(error.message);
  }

  return data;
}

// Update a category
export async function updateCategory(
  categoryId: string,
  teamId: string,
  updates: Partial<{
    name: string;
    parentId: string | null;
    sortOrder: number;
    isActive: boolean;
  }>
): Promise<ExpenseCategory> {
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.parentId !== undefined) updateData.parent_id = updates.parentId;
  if (updates.sortOrder !== undefined) updateData.sort_order = updates.sortOrder;
  if (updates.isActive !== undefined) updateData.is_active = updates.isActive;

  const { data, error } = await supabase
    .from("team_expense_categories")
    .update(updateData)
    .eq("id", categoryId)
    .eq("team_id", teamId)
    .select()
    .single();

  if (error) {
    console.error("Failed to update category", error);
    throw new Error(error.message);
  }

  return data;
}

// Delete a category (soft delete by setting is_active = false)
export async function deleteCategory(categoryId: string, teamId: string): Promise<void> {
  const { error } = await supabase
    .from("team_expense_categories")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", categoryId)
    .eq("team_id", teamId);

  if (error) {
    console.error("Failed to delete category", error);
    throw new Error(error.message);
  }
}

// Seed default categories for a team
export async function seedDefaultCategories(teamId: string): Promise<void> {
  const existingCategories = await getTeamCategories(teamId);
  if (existingCategories.length > 0) {
    console.log("Categories already exist for team", teamId);
    return;
  }

  const defaultCategories = [
    { name: "1. Echipa", sortOrder: 1, subcategories: ["Salarii", "Bonusuri", "Training", "Beneficii"] },
    { name: "2. Marketing", sortOrder: 2, subcategories: ["Publicitate", "Social Media", "Evenimente", "Branding"] },
    { name: "3. IT", sortOrder: 3, subcategories: ["Software", "Hardware", "Cloud", "Licente"] },
    { name: "4. Sediu", sortOrder: 4, subcategories: ["Chirie", "Utilitati", "Curatenie", "Reparatii"] },
    { name: "5. Servicii", sortOrder: 5, subcategories: ["Contabilitate", "Juridic", "Consultanta", "Alte servicii"] },
    { name: "6. Altele", sortOrder: 6, subcategories: ["Diverse", "Neprevazute"] },
  ];

  for (const cat of defaultCategories) {
    try {
      // Create parent category
      const parent = await createCategory({
        teamId,
        name: cat.name,
        sortOrder: cat.sortOrder,
      });

      // Create subcategories
      for (let i = 0; i < cat.subcategories.length; i++) {
        await createCategory({
          teamId,
          name: cat.subcategories[i],
          parentId: parent.id,
          sortOrder: i + 1,
        });
      }
    } catch (err) {
      console.error(`Failed to seed category ${cat.name}:`, err);
    }
  }

  console.log("Default categories seeded for team", teamId);
}
