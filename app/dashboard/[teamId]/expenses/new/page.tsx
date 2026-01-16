"use client";

import { useParams } from "next/navigation";
import { NewExpenseForm } from "@/components/expenses/new-expense-form";

export default function NewExpensePage() {
  const params = useParams<{ teamId: string }>();

  return <NewExpenseForm teamId={params.teamId} />;
}
