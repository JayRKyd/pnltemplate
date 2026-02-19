/**
 * Bono Forex API Client
 *
 * Thin HTTP wrapper around the internal forex microservice at
 * https://forex.bono.ro/forex/rates
 *
 * Returns EUR/RON, USD/RON, and GBP/RON rates for a given effective date.
 * If no rates exist for the exact date (weekend/holiday), the API returns
 * the most recent available rate.
 */

// ── Types ────────────────────────────────────────────────────────────────────

export interface ForexRate {
  FromCurrencyCode: string;
  ToCurrencyCode: string;
  RateValue: number;
}

export interface ForexApiResponse {
  EffectiveDate: string;
  MostRecentRateDate: string;
  Rates: ForexRate[];
}

/** Parsed result used by the rest of the app */
export interface ParsedForexRates {
  effectiveDate: string;
  mostRecentRateDate: string;
  eur_to_ron: number;
  usd_to_ron: number;
  gbp_to_ron: number;
}

// ── Config ───────────────────────────────────────────────────────────────────

const FOREX_API_URL = "https://forex.bono.ro/forex/rates";
const FOREX_TIMEOUT_MS = 5_000;

function getApiKey(): string {
  const key = process.env.BONO_FOREX_API_KEY;
  if (!key) {
    throw new Error(
      "Missing BONO_FOREX_API_KEY environment variable. " +
        "Set it in .env.local or your deployment secrets."
    );
  }
  return key;
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Fetch exchange rates from the Bono forex microservice.
 *
 * @param effectiveDate  Target date in YYYY-MM-DD format.
 * @returns Parsed rates or `null` if the request fails.
 */
export async function fetchForexRates(
  effectiveDate: string
): Promise<ParsedForexRates | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FOREX_TIMEOUT_MS);

    const response = await fetch(FOREX_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Bono-SecretKey": getApiKey(),
      },
      body: JSON.stringify({ EffectiveDate: effectiveDate }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      console.error(
        `[forex-client] API returned ${response.status}: ${response.statusText}`
      );
      return null;
    }

    const data: ForexApiResponse = await response.json();
    return parseForexResponse(data);
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      console.error("[forex-client] Request timed out");
    } else {
      console.error("[forex-client] Request failed:", error);
    }
    return null;
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function parseForexResponse(data: ForexApiResponse): ParsedForexRates {
  const rateMap: Record<string, number> = {};

  for (const rate of data.Rates) {
    // Key by "FROM" currency, e.g. "EUR", "USD", "GBP"
    rateMap[rate.FromCurrencyCode] = rate.RateValue;
  }

  return {
    effectiveDate: data.EffectiveDate,
    mostRecentRateDate: data.MostRecentRateDate,
    eur_to_ron: rateMap["EUR"] ?? 0,
    usd_to_ron: rateMap["USD"] ?? 0,
    gbp_to_ron: rateMap["GBP"] ?? 0,
  };
}
