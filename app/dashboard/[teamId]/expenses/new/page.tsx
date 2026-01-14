"use client";

import { useParams } from "next/navigation";
import { ExpenseForm } from "@/components/expenses/expense-form";

export default function NewExpensePage() {
  const params = useParams<{ teamId: string }>();

  return (
    <div className="p-6 md:p-8">
      <ExpenseForm teamId={params.teamId} />
    </div>
  );
}
