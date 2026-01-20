"use client";

import { useParams, useRouter } from "next/navigation";
import { PnlDashboard } from "@/components/pnl/pnl-dashboard";

export default function DeltaPage() {
  const router = useRouter();
  const params = useParams<{ teamId: string }>();

  return (
    <div className="p-6 md:p-8 space-y-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Delta View</h2>
          <p className="text-sm text-muted-foreground">
            Compare budget vs actual spending
          </p>
        </div>
        <button
          onClick={() => router.back()}
          className="rounded-md border px-4 py-2 text-sm hover:bg-gray-50"
        >
          ← Back
        </button>
      </div>

      {/* The P&L dashboard has a Delta tab */}
      <PnlDashboard teamId={params.teamId} />
    </div>
  );
}
