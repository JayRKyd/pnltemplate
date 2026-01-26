"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PLStatement } from "@/testcode/plstatement";
import { getPnlData, PnlData, updateRevenue } from "@/app/actions/pnl-data";
import { saveBudgetTemplate } from "@/app/actions/budget-template";
import { BudgetTemplate } from "@/testcode/budgettemplateform";
import { Loader2 } from "lucide-react";

export default function PnlPage() {
  const router = useRouter();
  const params = useParams<{ teamId: string }>();
  const plRef = useRef<{ resetCategory: () => void }>(null);
  
  const [loading, setLoading] = useState(true);
  const [pnlData, setPnlData] = useState<PnlData | null>(null);
  const [venituri, setVenituri] = useState<number[]>(Array(24).fill(0));
  const [error, setError] = useState<string | null>(null);

  const currentYear = new Date().getFullYear();

  // Fetch P&L data on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getPnlData(params.teamId, currentYear);
        setPnlData(data);
        setVenituri(data.venituri);
      } catch (err) {
        console.error("Error fetching P&L data:", err);
        setError("Eroare la încărcarea datelor P&L");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [params.teamId, currentYear]);

  // Handle revenue updates
  const handleVenituriChange = async (newVenituri: number[]) => {
    setVenituri(newVenituri);
    
    // Find which month changed and update in database
    for (let i = 0; i < 24; i++) {
      if (pnlData && newVenituri[i] !== pnlData.venituri[i]) {
        const year = i < 12 ? currentYear - 1 : currentYear;
        const month = (i % 12) + 1;
        await updateRevenue(params.teamId, year, month, newVenituri[i]);
      }
    }
  };

  // Handle budget template save
  const handleSaveBudgetTemplate = async (teamId: string, template: BudgetTemplate) => {
    try {
      const result = await saveBudgetTemplate(teamId, {
        year: template.year,
        venituriCategories: template.venituriCategories.map(c => ({
          name: c.name,
          subcategories: c.subcategories.map(s => ({ name: s.name })),
        })),
        cheltuieliCategories: template.cheltuieliCategories.map(c => ({
          name: c.name,
          subcategories: c.subcategories.map(s => ({ name: s.name })),
        })),
      });
      return result;
    } catch (err) {
      console.error("Error saving budget template:", err);
      return { success: false, error: "Eroare la salvarea template-ului" };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
          <p className="text-gray-500">Se încarcă datele P&L...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-4">
      <PLStatement
        ref={plRef}
        onBack={() => router.back()}
        venituri={venituri}
        setVenituri={handleVenituriChange}
        // Pass real data
        realData={pnlData || undefined}
        teamId={params.teamId}
        onSaveBudgetTemplate={handleSaveBudgetTemplate}
      />
    </div>
  );
}
