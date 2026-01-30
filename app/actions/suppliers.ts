"use server";

import { supabase } from "@/lib/supabase";
import { searchPredefinedSuppliers } from "@/lib/data/suppliers";

// Romanian company data from ANAF API (openapi.ro as proxy)
interface ANAFCompanyResult {
  cui: string;
  denumire: string;
  adresa?: string;
  judet?: string;
  localitate?: string;
  stare?: string;
}

export interface SupplierSearchResult {
  cui: string;
  name: string;
  displayName: string; // "Company Name / CUI"
  address?: string;
  county?: string;
  city?: string;
  status?: string;
  source?: "predefined" | "local" | "anaf"; // Source of the supplier data
}

// Search suppliers by CUI or company name
// Priority: 1. Predefined suppliers (from Excel), 2. Local DB, 3. ANAF API
export async function searchSuppliers(
  query: string,
  teamId: string
): Promise<SupplierSearchResult[]> {
  if (!query || query.length < 2) {
    return [];
  }

  const results: SupplierSearchResult[] = [];
  const seen = new Set<string>();

  // First, search predefined suppliers from Excel file (Furnizori P&L.xlsx)
  const predefinedResults = searchPredefinedSuppliers(query);
  for (const supplier of predefinedResults.slice(0, 10)) {
    const key = supplier.cui || supplier.name.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      results.push({
        cui: supplier.cui || "",
        name: supplier.name,
        displayName: supplier.cui
          ? `${supplier.name} / ${supplier.cui}`
          : supplier.name,
        source: "predefined",
      });
    }
  }

  // Then search in our local database for previously used suppliers
  if (query.length >= 3) {
    const { data: localSuppliers } = await supabase
      .from("team_expenses")
      .select("supplier, supplier_cui")
      .eq("team_id", teamId)
      .or(`supplier.ilike.%${query}%,supplier_cui.ilike.%${query}%`)
      .limit(5);

    // Add local results (previously used suppliers not in predefined)
    if (localSuppliers) {
      for (const s of localSuppliers) {
        const key = s.supplier_cui || s.supplier?.toLowerCase();
        if (key && !seen.has(key)) {
          seen.add(key);
          results.push({
            cui: s.supplier_cui || "",
            name: s.supplier || "",
            displayName: s.supplier_cui
              ? `${s.supplier} / ${s.supplier_cui}`
              : s.supplier || "",
            source: "local",
          });
        }
      }
    }
  }

  // Then try to search Romanian company registry (ANAF via openapi.ro)
  // This is a free API that provides Romanian company data
  try {
    // Check if query looks like a CUI (numeric)
    const isCUI = /^\d+$/.test(query.replace(/\s/g, ""));
    
    if (isCUI) {
      // Search by CUI directly
      const response = await fetch(
        `https://api.openapi.ro/api/companies/${query.replace(/\s/g, "")}`,
        {
          headers: {
            "x-api-key": process.env.OPENAPI_RO_KEY || "",
          },
          next: { revalidate: 86400 }, // Cache for 24 hours
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data && data.denumire) {
          const company: SupplierSearchResult = {
            cui: data.cui || data.cif || query,
            name: data.denumire,
            displayName: `${data.denumire} / ${data.cui || data.cif || query}`,
            address: data.adresa,
            county: data.judet,
            city: data.localitate,
            status: data.stare_inregistrare,
            source: "anaf",
          };

          // Add if not already in results
          if (!results.find(r => r.cui === company.cui)) {
            results.push(company);
          }
        }
      }
    } else {
      // Search by company name - use the search endpoint
      const response = await fetch(
        `https://api.openapi.ro/api/companies/search?query=${encodeURIComponent(query)}`,
        {
          headers: {
            "x-api-key": process.env.OPENAPI_RO_KEY || "",
          },
          next: { revalidate: 86400 },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          for (const item of data.slice(0, 5)) {
            const company: SupplierSearchResult = {
              cui: item.cui || item.cif || "",
              name: item.denumire || item.name || "",
              displayName: `${item.denumire || item.name} / ${item.cui || item.cif}`,
              address: item.adresa,
              county: item.judet,
              city: item.localitate,
              source: "anaf",
            };

            if (company.cui && !results.find(r => r.cui === company.cui)) {
              results.push(company);
            }
          }
        }
      }
    }
  } catch (error) {
    // API error - just return local results
    console.error("Supplier API search error:", error);
  }

  return results.slice(0, 10); // Return max 10 results
}

// Get supplier details by CUI
export async function getSupplierByCUI(cui: string): Promise<SupplierSearchResult | null> {
  if (!cui) return null;

  try {
    const response = await fetch(
      `https://api.openapi.ro/api/companies/${cui.replace(/\s/g, "")}`,
      {
        headers: {
          "x-api-key": process.env.OPENAPI_RO_KEY || "",
        },
        next: { revalidate: 86400 },
      }
    );

    if (response.ok) {
      const data = await response.json();
      if (data && data.denumire) {
        return {
          cui: data.cui || data.cif || cui,
          name: data.denumire,
          displayName: `${data.denumire} / ${data.cui || data.cif || cui}`,
          address: data.adresa,
          county: data.judet,
          city: data.localitate,
          status: data.stare_inregistrare,
        };
      }
    }
  } catch (error) {
    console.error("Get supplier by CUI error:", error);
  }

  return null;
}

// Save supplier to team's supplier list for faster future lookups
export async function saveSupplierToTeam(
  teamId: string,
  supplier: { name: string; cui?: string }
): Promise<void> {
  // This is handled automatically when expenses are created
  // The supplier info is stored with each expense
}
