import { NextResponse } from "next/server";
import { fetchForexRates } from "@/lib/forex-client";
import { syncForexRates, getLatestRates } from "@/app/actions/exchange-rates";

/**
 * GET /api/test-forex
 *
 * Quick smoke-test endpoint to verify the Bono forex integration.
 * Calls the live API, syncs to DB, then reads back from cache.
 *
 * ⚠️  Remove this route before going to production.
 */
export async function GET() {
    const today = new Date().toISOString().split("T")[0];

    // 1. Live API call
    const liveRates = await fetchForexRates(today);

    // 2. Sync to Supabase
    const syncResult = await syncForexRates(today);

    // 3. Read back from cache
    const cached = await getLatestRates();

    return NextResponse.json(
        {
            timestamp: new Date().toISOString(),
            requestedDate: today,
            liveApiResponse: liveRates,
            syncResult,
            cachedInSupabase: cached,
        },
        { status: 200 }
    );
}
