"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { BudgetTemplate, BudgetTemplateForm } from "@/testcode/budgettemplateform";
import { loadBudgetTemplate, saveBudgetTemplate } from "@/app/actions/budget-template";
import { Loader2 } from "lucide-react";

export default function BudgetPage() {
  const router = useRouter();
  const params = useParams<{ teamId: string }>();
  const [template, setTemplate] = useState<BudgetTemplate | undefined>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const currentYear = new Date().getFullYear().toString();

  // Load existing template on mount
  useEffect(() => {
    const loadTemplate = async () => {
      try {
        const data = await loadBudgetTemplate(params.teamId);
        if (data) {
          // Convert to BudgetTemplate format
          setTemplate({
            year: data.year,
            venituriCategories: data.venituriCategories.map(c => ({
              name: c.name,
              subcategories: c.subcategories,
              expanded: false,
            })),
            cheltuieliCategories: data.cheltuieliCategories.map(c => ({
              name: c.name,
              subcategories: c.subcategories,
              expanded: false,
            })),
          });
        }
      } catch (err) {
        console.error("Error loading template:", err);
        setError("Eroare la încărcarea template-ului");
      } finally {
        setLoading(false);
      }
    };

    loadTemplate();
  }, [params.teamId]);

  const handleSave = async (tpl: BudgetTemplate) => {
    setSaving(true);
    setError(null);
    
    try {
      const result = await saveBudgetTemplate(params.teamId, {
        year: tpl.year,
        venituriCategories: tpl.venituriCategories.map(c => ({
          name: c.name,
          subcategories: c.subcategories.map(s => ({ name: s.name })),
        })),
        cheltuieliCategories: tpl.cheltuieliCategories.map(c => ({
          name: c.name,
          subcategories: c.subcategories.map(s => ({ name: s.name })),
        })),
      });

      if (result.success) {
        setTemplate(tpl);
        // Show success message or redirect
        alert("Template salvat cu succes!");
      } else {
        setError(result.error || "Eroare la salvarea template-ului");
      }
    } catch (err) {
      console.error("Error saving template:", err);
      setError("Eroare la salvarea template-ului");
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    router.push(`/dashboard/${params.teamId}/pnl`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
          <p className="text-gray-500">Se încarcă template-ul...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {saving && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl p-6 flex items-center gap-3 shadow-xl">
            <Loader2 className="w-5 h-5 animate-spin text-teal-600" />
            <span className="text-gray-700">Se salvează...</span>
          </div>
        </div>
      )}
      
      {error && (
        <div className="fixed top-4 right-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg z-50">
          {error}
        </div>
      )}

      <BudgetTemplateForm
        year={currentYear}
        onClose={handleClose}
        onSave={handleSave}
        initialTemplate={template}
      />
    </div>
  );
}
