"use client";

import React, { useEffect, useState } from "react";
import { getTeamCategories, getSubcategories, ExpenseCategory } from "@/app/actions/categories";

type Props = {
  teamId: string;
  categoryId: string;
  subcategoryId: string;
  onCategoryChange: (categoryId: string) => void;
  onSubcategoryChange: (subcategoryId: string) => void;
  hasError?: boolean;
  disabled?: boolean;
};

export function CategorySelect({
  teamId,
  categoryId,
  subcategoryId,
  onCategoryChange,
  onSubcategoryChange,
  hasError = false,
  disabled = false,
}: Props) {
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [subcategories, setSubcategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);

  // Load parent categories
  useEffect(() => {
    if (teamId) {
      setLoading(true);
      getTeamCategories(teamId)
        .then((cats) => {
          // Filter to only parent categories (no parent_id)
          const parents = cats.filter((c) => !c.parent_id);
          setCategories(parents);
        })
        .finally(() => setLoading(false));
    }
  }, [teamId]);

  // Load subcategories when category changes
  useEffect(() => {
    if (categoryId && teamId) {
      getSubcategories(teamId, categoryId).then(setSubcategories);
    } else {
      setSubcategories([]);
    }
  }, [categoryId, teamId]);

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCategoryId = e.target.value;
    onCategoryChange(newCategoryId);
    onSubcategoryChange(""); // Reset subcategory when category changes
  };

  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className="block text-sm font-medium mb-1">
          Category <span className="text-red-500">*</span>
        </label>
        <select
          value={categoryId}
          onChange={handleCategoryChange}
          disabled={disabled || loading}
          className={`w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50 ${
            hasError && !categoryId ? "border-red-500" : "border-gray-300"
          }`}
        >
          <option value="">Select category</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          Subcategory <span className="text-red-500">*</span>
        </label>
        <select
          value={subcategoryId}
          onChange={(e) => onSubcategoryChange(e.target.value)}
          disabled={disabled || !categoryId || subcategories.length === 0}
          className={`w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50 ${
            hasError && !subcategoryId ? "border-red-500" : "border-gray-300"
          }`}
        >
          <option value="">Select subcategory</option>
          {subcategories.map((sub) => (
            <option key={sub.id} value={sub.id}>
              {sub.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
