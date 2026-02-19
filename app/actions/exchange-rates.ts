"use server";

import { supabase } from "@/lib/supabase";
import { fetchForexRates } from "@/lib/forex-client";

export interface ExchangeRate {
  id: string;
  rate_date: string;
  eur_to_ron: number;
  usd_to_ron: number | null;
  gbp_to_ron: number | null;
  source: string;
  created_at: string;
  updated_at: string;
}

// Default fallback rates (approximate Jan 2026)
const DEFAULT_RATES: Record<"EUR" | "USD" | "GBP", number> = {
  EUR: 4.97,
  USD: 4.50,
  GBP: 5.83,
};

// ── Core rate lookup ─────────────────────────────────────────────────────────

/**
 * Get exchange rate for a specific date and currency.
 *
 * Resolution order:
 *  1. Supabase `exchange_rates` table (cached rates)
 *  2. Bono forex API (live fetch → also caches to Supabase)
 *  3. Hardcoded defaults
 */
export async function getExchangeRate(
  date: string | Date,
  currency: "EUR" | "USD" | "GBP" = "EUR"
): Promise<number> {
  const dateStr =
    typeof date === "string" ? date : date.toISOString().split("T")[0];

  // 1. Try Supabase cache first
  const { data, error } = await supabase.rpc("get_exchange_rate", {
    p_date: dateStr,
    p_currency: currency,
  });

  if (!error && data) {
    return data;
  }

  // 2. Try Supabase table directly (covers cases where the RPC doesn't exist yet)
  const cached = await getCachedRate(dateStr, currency);
  if (cached !== null) {
    return cached;
  }

  // 3. Live fetch from Bono API and cache
  const live = await fetchAndCacheRates(dateStr);
  if (live) {
    const key = `${currency.toLowerCase()}_to_ron` as keyof typeof live;
    const rate = live[key];
    if (typeof rate === "number" && rate > 0) {
      return rate;
    }
  }

  // 4. Hardcoded default
  console.warn(
    `[getExchangeRate] Using default rate for ${currency} on ${dateStr}`
  );
  return DEFAULT_RATES[currency];
}

// ── Conversion helpers ───────────────────────────────────────────────────────

/** Convert amount to RON */
export async function convertToRon(
  amount: number,
  currency: "RON" | "EUR" | "USD" | "GBP",
  date: string | Date
): Promise<number> {
  if (currency === "RON") return amount;
  const rate = await getExchangeRate(date, currency);
  return amount * rate;
}

/** Convert amount from RON to another currency */
export async function convertFromRon(
  amountRon: number,
  targetCurrency: "EUR" | "USD" | "GBP",
  date: string | Date
): Promise<number> {
  const rate = await getExchangeRate(date, targetCurrency);
  return amountRon / rate;
}

// ── Table queries ────────────────────────────────────────────────────────────

/** Get latest exchange rates from the cache table */
export async function getLatestRates(): Promise<ExchangeRate | null> {
  const { data, error } = await supabase
    .from("exchange_rates")
    .select("*")
    .order("rate_date", { ascending: false })
    .limit(1)
    .single();

  if (error) {
    console.error("[getLatestRates] Error:", error);
    return null;
  }

  return data;
}

/** Get exchange rates for a date range */
export async function getRatesInRange(
  startDate: string,
  endDate: string
): Promise<ExchangeRate[]> {
  const { data, error } = await supabase
    .from("exchange_rates")
    .select("*")
    .gte("rate_date", startDate)
    .lte("rate_date", endDate)
    .order("rate_date", { ascending: false });

  if (error) {
    console.error("[getRatesInRange] Error:", error);
    return [];
  }

  return data || [];
}

// ── Upsert / sync ────────────────────────────────────────────────────────────

/** Add or update exchange rate in Supabase (admin / sync function) */
export async function upsertExchangeRate(
  date: string,
  eurToRon: number,
  usdToRon?: number,
  gbpToRon?: number,
  source: string = "bono_forex"
): Promise<ExchangeRate> {
  const { data, error } = await supabase
    .from("exchange_rates")
    .upsert(
      {
        rate_date: date,
        eur_to_ron: eurToRon,
        usd_to_ron: usdToRon ?? null,
        gbp_to_ron: gbpToRon ?? null,
        source,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "rate_date" }
    )
    .select()
    .single();

  if (error) {
    console.error("[upsertExchangeRate] Error:", error);
    throw new Error(error.message);
  }

  return data;
}

/**
 * Fetch live rates from the Bono forex API and persist to Supabase.
 * Can be called manually or by a CRON job.
 */
export async function syncForexRates(
  date?: string
): Promise<{ success: boolean; message: string }> {
  try {
    const targetDate = date || new Date().toISOString().split("T")[0];

    const rates = await fetchForexRates(targetDate);
    if (!rates) {
      return { success: false, message: "Failed to fetch rates from Bono forex API" };
    }

    await upsertExchangeRate(
      rates.mostRecentRateDate,
      rates.eur_to_ron,
      rates.usd_to_ron,
      rates.gbp_to_ron,
      "bono_forex"
    );

    return {
      success: true,
      message:
        `Synced rates for ${rates.mostRecentRateDate} ` +
        `(requested ${rates.effectiveDate}): ` +
        `EUR=${rates.eur_to_ron}, USD=${rates.usd_to_ron}, GBP=${rates.gbp_to_ron}`,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ── Expense amount calculation ───────────────────────────────────────────────

/**
 * Calculate expense amounts in all currencies.
 * Fetches EUR, USD, and GBP rates in parallel.
 */
export async function calculateExpenseAmounts(
  amount: number,
  currency: "RON" | "EUR" | "USD" | "GBP",
  date: string | Date
): Promise<{
  amount_ron: number;
  amount_eur: number;
  amount_usd: number;
  amount_gbp: number;
  exchange_rate_eur: number;
  exchange_rate_usd: number;
  exchange_rate_gbp: number;
}> {
  const dateStr =
    typeof date === "string" ? date : date.toISOString().split("T")[0];

  // Fetch all rates in parallel
  const [eurRate, usdRate, gbpRate] = await Promise.all([
    getExchangeRate(dateStr, "EUR"),
    getExchangeRate(dateStr, "USD"),
    getExchangeRate(dateStr, "GBP"),
  ]);

  let amountRon: number;

  // Convert input amount to RON first
  switch (currency) {
    case "RON":
      amountRon = amount;
      break;
    case "EUR":
      amountRon = amount * eurRate;
      break;
    case "USD":
      amountRon = amount * usdRate;
      break;
    case "GBP":
      amountRon = amount * gbpRate;
      break;
  }

  return {
    amount_ron: Math.round(amountRon * 100) / 100,
    amount_eur: Math.round((amountRon / eurRate) * 100) / 100,
    amount_usd: Math.round((amountRon / usdRate) * 100) / 100,
    amount_gbp: Math.round((amountRon / gbpRate) * 100) / 100,
    exchange_rate_eur: eurRate,
    exchange_rate_usd: usdRate,
    exchange_rate_gbp: gbpRate,
  };
}

// ── Private helpers ──────────────────────────────────────────────────────────

/** Look up a cached rate from the exchange_rates table */
async function getCachedRate(
  dateStr: string,
  currency: "EUR" | "USD" | "GBP"
): Promise<number | null> {
  const column =
    currency === "EUR"
      ? "eur_to_ron"
      : currency === "USD"
        ? "usd_to_ron"
        : "gbp_to_ron";

  const { data, error } = await supabase
    .from("exchange_rates")
    .select(column)
    .lte("rate_date", dateStr)
    .order("rate_date", { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return null;

  const value = (data as Record<string, number | null>)[column];
  return typeof value === "number" ? value : null;
}

/** Fetch rates from Bono API and cache in Supabase */
async function fetchAndCacheRates(
  dateStr: string
): Promise<{ eur_to_ron: number; usd_to_ron: number; gbp_to_ron: number } | null> {
  const rates = await fetchForexRates(dateStr);
  if (!rates) return null;

  // Fire-and-forget cache write (don't block the caller)
  upsertExchangeRate(
    rates.mostRecentRateDate,
    rates.eur_to_ron,
    rates.usd_to_ron,
    rates.gbp_to_ron,
    "bono_forex"
  ).catch((err) =>
    console.error("[fetchAndCacheRates] Failed to cache rates:", err)
  );

  return {
    eur_to_ron: rates.eur_to_ron,
    usd_to_ron: rates.usd_to_ron,
    gbp_to_ron: rates.gbp_to_ron,
  };
}
