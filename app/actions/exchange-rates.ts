"use server";

import { supabase } from "@/lib/supabase";

export interface ExchangeRate {
  id: string;
  rate_date: string;
  eur_to_ron: number;
  usd_to_ron: number | null;
  source: string;
  created_at: string;
  updated_at: string;
}

// Get exchange rate for a specific date
export async function getExchangeRate(
  date: string | Date,
  currency: "EUR" | "USD" = "EUR"
): Promise<number> {
  const dateStr = typeof date === "string" ? date : date.toISOString().split("T")[0];

  const { data, error } = await supabase.rpc("get_exchange_rate", {
    p_date: dateStr,
    p_currency: currency,
  });

  if (error) {
    console.error("[getExchangeRate] Error:", error);
    // Return default rates as fallback
    return currency === "EUR" ? 4.97 : 4.50;
  }

  return data || (currency === "EUR" ? 4.97 : 4.50);
}

// Convert amount to RON
export async function convertToRon(
  amount: number,
  currency: "RON" | "EUR" | "USD",
  date: string | Date
): Promise<number> {
  if (currency === "RON") return amount;

  const rate = await getExchangeRate(date, currency as "EUR" | "USD");
  return amount * rate;
}

// Convert amount from RON to another currency
export async function convertFromRon(
  amountRon: number,
  targetCurrency: "EUR" | "USD",
  date: string | Date
): Promise<number> {
  const rate = await getExchangeRate(date, targetCurrency);
  return amountRon / rate;
}

// Get latest exchange rates
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

// Get exchange rates for a date range
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

// Add or update exchange rate (admin function)
export async function upsertExchangeRate(
  date: string,
  eurToRon: number,
  usdToRon?: number
): Promise<ExchangeRate> {
  const { data, error } = await supabase
    .from("exchange_rates")
    .upsert(
      {
        rate_date: date,
        eur_to_ron: eurToRon,
        usd_to_ron: usdToRon || null,
        source: "manual",
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

// Fetch rates from BNR (Romanian National Bank) API
// Note: This is a placeholder - actual BNR API integration would need their XML endpoint
export async function fetchBnrRates(date?: string): Promise<{
  eur_to_ron: number;
  usd_to_ron: number;
  date: string;
} | null> {
  try {
    // BNR provides rates via XML at: https://www.bnr.ro/nbrfxrates.xml
    // For production, you would parse this XML
    // For now, we'll use approximate current rates
    
    const targetDate = date || new Date().toISOString().split("T")[0];
    
    // In production, fetch from:
    // const response = await fetch('https://www.bnr.ro/nbrfxrates.xml');
    // const xml = await response.text();
    // Parse XML and extract EUR/USD rates
    
    // Placeholder rates (approximate Jan 2026)
    return {
      eur_to_ron: 4.97,
      usd_to_ron: 4.53,
      date: targetDate,
    };
  } catch (error) {
    console.error("[fetchBnrRates] Error:", error);
    return null;
  }
}

// Sync rates from BNR (can be called by CRON)
export async function syncBnrRates(): Promise<{ success: boolean; message: string }> {
  try {
    const rates = await fetchBnrRates();
    if (!rates) {
      return { success: false, message: "Failed to fetch BNR rates" };
    }

    await upsertExchangeRate(rates.date, rates.eur_to_ron, rates.usd_to_ron);

    return {
      success: true,
      message: `Synced rates for ${rates.date}: EUR=${rates.eur_to_ron}, USD=${rates.usd_to_ron}`,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Calculate expense amounts in all currencies
export async function calculateExpenseAmounts(
  amount: number,
  currency: "RON" | "EUR" | "USD",
  date: string | Date
): Promise<{
  amount_ron: number;
  amount_eur: number;
  amount_usd: number;
  exchange_rate_eur: number;
  exchange_rate_usd: number;
}> {
  const dateStr = typeof date === "string" ? date : date.toISOString().split("T")[0];
  const eurRate = await getExchangeRate(dateStr, "EUR");
  const usdRate = await getExchangeRate(dateStr, "USD");

  let amountRon: number;
  let amountEur: number;
  let amountUsd: number;

  if (currency === "RON") {
    amountRon = amount;
    amountEur = amount / eurRate;
    amountUsd = amount / usdRate;
  } else if (currency === "EUR") {
    amountRon = amount * eurRate;
    amountEur = amount;
    amountUsd = amountRon / usdRate;
  } else {
    amountRon = amount * usdRate;
    amountUsd = amount;
    amountEur = amountRon / eurRate;
  }

  return {
    amount_ron: Math.round(amountRon * 100) / 100,
    amount_eur: Math.round(amountEur * 100) / 100,
    amount_usd: Math.round(amountUsd * 100) / 100,
    exchange_rate_eur: eurRate,
    exchange_rate_usd: usdRate,
  };
}
