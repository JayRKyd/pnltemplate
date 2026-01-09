"use client";

import { ExpenseTable } from "@/testcode/expensetable";
import { useParams, useRouter } from "next/navigation";

export default function ExpensesPage() {
  const params = useParams<{ teamId: string }>();
  const router = useRouter();

  return (
    <div className="p-8 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Expenses</h2>
          <p className="text-sm text-muted-foreground">
            Mock data, filtered by the active team context.
          </p>
        </div>
        <button
          className="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
          onClick={() => router.push(`/dashboard/${params.teamId}/expenses/new`)}
        >
          New expense
        </button>
      </div>

      <div className="rounded-lg border bg-white/50 dark:bg-black/30 p-4">
        <ExpenseTable
          onEditExpense={(exp) =>
            alert(`Edit expense ${"id" in exp ? (exp as any).id : ""}`)
          }
          onNewExpense={() =>
            router.push(`/dashboard/${params.teamId}/expenses/new`)
          }
          onCreateFromRecurring={() => alert("Create from recurring (mock)")}
          onEditRecurringTemplate={() => alert("Edit recurring template (mock)")}
          onEditCompletedRecurring={() => alert("Edit completed recurring (mock)")}
        />
      </div>
    </div>
  );
}
