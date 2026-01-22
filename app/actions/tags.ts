"use server";

import { supabase } from "@/lib/supabase";

export interface TagSuggestion {
  tag: string;
  count: number;
}

// Get tag suggestions based on partial input
// Returns previously used tags that match the query
export async function getTagSuggestions(
  query: string,
  teamId: string
): Promise<TagSuggestion[]> {
  // Get all expenses with tags for this team
  const { data: expenses } = await supabase
    .from("team_expenses")
    .select("tags")
    .eq("team_id", teamId)
    .not("tags", "is", null);

  if (!expenses) return [];

  // Extract and count all tags
  const tagCounts = new Map<string, number>();
  
  for (const expense of expenses) {
    if (expense.tags && Array.isArray(expense.tags)) {
      for (const tag of expense.tags) {
        const normalizedTag = tag.toLowerCase().trim();
        if (normalizedTag) {
          tagCounts.set(normalizedTag, (tagCounts.get(normalizedTag) || 0) + 1);
        }
      }
    }
  }

  // Filter by query if provided
  const searchQuery = query.toLowerCase().replace(/^#/, "").trim();
  
  const results: TagSuggestion[] = [];
  
  for (const [tag, count] of tagCounts.entries()) {
    if (!searchQuery || tag.includes(searchQuery)) {
      results.push({ tag: `#${tag}`, count });
    }
  }

  // Sort by usage count (most used first)
  results.sort((a, b) => b.count - a.count);

  return results.slice(0, 10); // Return max 10 suggestions
}

// Get all unique tags for a team
export async function getAllTeamTags(teamId: string): Promise<string[]> {
  const { data: expenses } = await supabase
    .from("team_expenses")
    .select("tags")
    .eq("team_id", teamId)
    .not("tags", "is", null);

  if (!expenses) return [];

  const uniqueTags = new Set<string>();
  
  for (const expense of expenses) {
    if (expense.tags && Array.isArray(expense.tags)) {
      for (const tag of expense.tags) {
        const normalizedTag = tag.toLowerCase().trim();
        if (normalizedTag) {
          uniqueTags.add(`#${normalizedTag}`);
        }
      }
    }
  }

  return Array.from(uniqueTags).sort();
}
