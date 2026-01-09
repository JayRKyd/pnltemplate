"use client";

import { CategoryDetail } from "@/testcode/categorydetail";
import { useParams, useRouter } from "next/navigation";

export default function CategoryDetailPage() {
  const router = useRouter();
  const params = useParams<{ teamId: string; id: string }>();
  const categoryName = decodeURIComponent(params.id);

  return (
    <div className="p-6 md:p-8 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Category Detail</h2>
          <p className="text-sm text-muted-foreground">
            Mock drill-down for {categoryName}.
          </p>
        </div>
        <button
          onClick={() => router.push(`/dashboard/${params.teamId}/pnl`)}
          className="rounded-md border px-3 py-2 text-sm"
        >
          Back to P&amp;L
        </button>
      </div>
      <CategoryDetail
        categoryName={categoryName || "1. Echipa"}
        onBack={() => router.back()}
        selectedYear="2025"
        selectedCurrency="EUR"
      />
    </div>
  );
}
