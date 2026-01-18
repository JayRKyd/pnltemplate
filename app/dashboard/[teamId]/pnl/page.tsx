"use client";

import { useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PLStatement } from "@/testcode/plstatement";

export default function PnlPage() {
  const router = useRouter();
  const params = useParams<{ teamId: string }>();
  const [venituri, setVenituri] = useState<number[]>(Array(24).fill(20000));
  const plRef = useRef<{ resetCategory: () => void }>(null);

  return (
    <div className="p-6 md:p-8 space-y-4">
      <div>
        <h2 className="text-2xl font-bold">P&amp;L Statement</h2>
        <p className="text-sm text-muted-foreground">
          Mock P&amp;L with tabs (expenses, budget, delta).
        </p>
      </div>

      <PLStatement
        ref={plRef}
        onBack={() => router.back()}
        venituri={venituri}
        setVenituri={setVenituri}
      />
    </div>
  );
}
