"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { BudgetTemplate, BudgetTemplateForm } from "@/testcode/budgettemplateform";

export default function BudgetPage() {
  const router = useRouter();
  const params = useParams<{ teamId: string }>();
  const [template, setTemplate] = useState<BudgetTemplate | undefined>();

  const handleSave = (tpl: BudgetTemplate) => {
    setTemplate(tpl);
  };

  return (
    <div className="p-6 md:p-8 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Budget Template</h2>
          <p className="text-sm text-muted-foreground">
            Mock budget editor (local state only).
          </p>
        </div>
        <button
          onClick={() => router.push(`/dashboard/${params.teamId}/pnl`)}
          className="rounded-md border px-3 py-2 text-sm"
        >
          Go to P&amp;L
        </button>
      </div>
      <BudgetTemplateForm
        year="2025"
        onClose={() => router.back()}
        onSave={handleSave}
        initialTemplate={template}
      />
    </div>
  );
}
