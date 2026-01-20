"use client";

import { useParams, useRouter } from "next/navigation";
import { PnlDashboard } from "@/components/pnl/pnl-dashboard";

export default function BudgetPage() {
  const router = useRouter();
  const params = useParams<{ teamId: string }>();

  return (
    <div className="p-6 md:p-8 space-y-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Budget Management</h2>
          <p className="text-sm text-muted-foreground">
            Upload and manage your annual budget
          </p>
        </div>
        <button
          onClick={() => router.push(`/dashboard/${params.teamId}/pnl`)}
          className="rounded-md border px-4 py-2 text-sm hover:bg-gray-50"
        >
          View Full P&L →
        </button>
      </div>
      
      {/* Reuse the P&L dashboard which has budget tab */}
      <PnlDashboard teamId={params.teamId} />
    </div>
  );
}
