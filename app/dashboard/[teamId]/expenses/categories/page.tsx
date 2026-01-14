"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Plus, Edit2, Trash2, ChevronRight, Loader2 } from "lucide-react";
import {
  getTeamCategories,
  getCategoryTree,
  createCategory,
  updateCategory,
  deleteCategory,
  ExpenseCategory,
  CategoryWithChildren,
} from "@/app/actions/categories";

export default function CategoriesPage() {
  const params = useParams<{ teamId: string }>();
  const [categories, setCategories] = useState<CategoryWithChildren[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formParentId, setFormParentId] = useState<string>("");
  const [formLoading, setFormLoading] = useState(false);

  // Flat list for parent dropdown
  const [flatCategories, setFlatCategories] = useState<ExpenseCategory[]>([]);

  useEffect(() => {
    loadCategories();
  }, [params.teamId]);

  const loadCategories = async () => {
    if (!params.teamId) return;
    setLoading(true);
    try {
      const [tree, flat] = await Promise.all([
        getCategoryTree(params.teamId),
        getTeamCategories(params.teamId),
      ]);
      setCategories(tree);
      setFlatCategories(flat.filter((c) => !c.parent_id)); // Only parents for dropdown
      setError(null);
    } catch (err) {
      console.error("Failed to load categories:", err);
      setError("Failed to load categories");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formName.trim()) {
      setError("Category name is required");
      return;
    }

    setFormLoading(true);
    setError(null);
    try {
      await createCategory({
        teamId: params.teamId,
        name: formName.trim(),
        parentId: formParentId || undefined,
      });
      setSuccess("Category created successfully");
      resetForm();
      loadCategories();
    } catch (err: any) {
      setError(err.message || "Failed to create category");
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingId || !formName.trim()) return;

    setFormLoading(true);
    setError(null);
    try {
      await updateCategory(editingId, params.teamId, { name: formName.trim() });
      setSuccess("Category updated successfully");
      resetForm();
      loadCategories();
    } catch (err: any) {
      setError(err.message || "Failed to update category");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (categoryId: string, name: string) => {
    if (!confirm(`Delete category "${name}"? This will also delete all subcategories.`)) {
      return;
    }

    try {
      await deleteCategory(categoryId, params.teamId);
      setSuccess("Category deleted successfully");
      loadCategories();
    } catch (err: any) {
      setError(err.message || "Failed to delete category");
    }
  };

  const startEdit = (category: ExpenseCategory) => {
    setEditingId(category.id);
    setFormName(category.name);
    setFormParentId(category.parent_id || "");
    setShowForm(true);
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormName("");
    setFormParentId("");
  };

  const renderCategory = (category: CategoryWithChildren, depth: number = 0) => (
    <div key={category.id}>
      <div
        className={`flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 ${
          depth > 0 ? "ml-6 border-l" : ""
        }`}
      >
        <div className="flex items-center gap-2">
          {category.children && category.children.length > 0 && (
            <ChevronRight size={16} className="text-muted-foreground" />
          )}
          <span className={depth > 0 ? "text-sm" : "font-medium"}>
            {category.name}
          </span>
          {category.children && category.children.length > 0 && (
            <span className="text-xs text-muted-foreground">
              ({category.children.length})
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => startEdit(category)}
            className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-muted-foreground"
          >
            <Edit2 size={14} />
          </button>
          <button
            onClick={() => handleDelete(category.id, category.name)}
            className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded text-red-500"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      {category.children?.map((child) => renderCategory(child, depth + 1))}
    </div>
  );

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Expense Categories</h2>
          <p className="text-sm text-muted-foreground">
            Manage expense categories and subcategories
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="flex items-center gap-2 rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
        >
          <Plus size={16} />
          Add Category
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-md bg-green-50 border border-green-200 p-3 text-sm text-green-700">
          {success}
        </div>
      )}

      {/* Create/Edit Form */}
      {showForm && (
        <div className="rounded-lg border bg-white/50 dark:bg-black/30 p-4 space-y-4">
          <h3 className="font-semibold">
            {editingId ? "Edit Category" : "New Category"}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name *</label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Category name"
                className="w-full rounded-md border px-3 py-2 text-sm"
              />
            </div>
            {!editingId && (
              <div>
                <label className="block text-sm font-medium mb-1">
                  Parent Category (optional)
                </label>
                <select
                  value={formParentId}
                  onChange={(e) => setFormParentId(e.target.value)}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                >
                  <option value="">None (top-level category)</option>
                  {flatCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={editingId ? handleUpdate : handleCreate}
              disabled={formLoading}
              className="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
            >
              {formLoading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : editingId ? (
                "Update"
              ) : (
                "Create"
              )}
            </button>
            <button
              onClick={resetForm}
              className="rounded-md border px-4 py-2 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Categories List */}
      <div className="rounded-lg border bg-white/50 dark:bg-black/30 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">
            <Loader2 size={24} className="animate-spin mx-auto mb-2" />
            Loading categories...
          </div>
        ) : categories.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            No categories found. Create your first category above.
          </div>
        ) : (
          <div className="divide-y">
            {categories.map((cat) => renderCategory(cat))}
          </div>
        )}
      </div>
    </div>
  );
}
