"use client";

import { useRouter, useParams } from "next/navigation";
import { NewExpenseForm } from "@/testcode/newexpenseform";

export default function NewExpensePage() {
  const router = useRouter();
  const params = useParams<{ teamId: string }>();

  const goBack = () => router.push(`/dashboard/${params.teamId}/expenses`);

  return (
    <div className="p-6 md:p-8 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">New Expense</h2>
          <p className="text-sm text-muted-foreground">
            Mock form experience; no backend yet.
          </p>
        </div>
        <button
          onClick={goBack}
          className="rounded-md border px-3 py-2 text-sm"
        >
          Back
        </button>
      </div>
      <NewExpenseForm onBack={goBack} />
    </div>
  );
}
