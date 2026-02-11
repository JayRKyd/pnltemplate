import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// §5: Monthly auto-generation of RE-Forms
// This endpoint is called by a cron scheduler at 00:01 on the 1st of each month
// It generates RE-Forms (team_expenses with status='recurent') for all active templates
//
// Security: Protected by CRON_SECRET header to prevent unauthorized access
// Schedule: 1 0 1 * * (00:01 on the 1st of every month)

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const targetMonth = new Date();
    targetMonth.setDate(1); // First of current month
    const targetDate = targetMonth.toISOString().split("T")[0];

    // Call the DB function that generates RE-Forms for all teams
    const { data, error } = await supabase.rpc("generate_all_recurring_forms", {
      p_target_month: targetDate,
    });

    if (error) {
      console.error("[cron/generate-recurring] Error:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    const totalGenerated = (data || []).reduce(
      (sum: number, row: { generated_count: number }) => sum + row.generated_count,
      0
    );

    console.log(
      `[cron/generate-recurring] Generated ${totalGenerated} RE-Forms across ${(data || []).length} teams for ${targetDate}`
    );

    return NextResponse.json({
      success: true,
      targetMonth: targetDate,
      teamsProcessed: (data || []).length,
      totalFormsGenerated: totalGenerated,
      details: data || [],
    });
  } catch (err) {
    console.error("[cron/generate-recurring] Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
