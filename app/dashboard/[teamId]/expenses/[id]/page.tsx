"use client";

import { useParams } from "next/navigation";
import { NewExpenseForm } from "@/components/expenses/new-expense-form";

export default function EditExpensePage() {
  const params = useParams<{ teamId: string; id: string }>();

  return <NewExpenseForm teamId={params.teamId} expenseId={params.id} />;
}
