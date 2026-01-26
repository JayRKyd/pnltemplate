"use server";

import { supabase } from "@/lib/supabase";
import { stackServerApp } from "@/stack";
import { isSuperAdmin } from "./super-admin";
import crypto from "crypto";

export interface Company {
  id: string;
  team_id: string;
  name: string;
  admin_name: string | null;
  admin_email: string;
  admin_phone: string | null;
  admin_user_id: string | null;
  admin_role: string;
  status: "pending" | "active" | "suspended";
  invitation_token: string | null;
  invitation_sent_at: string | null;
  invitation_accepted_at: string | null;
  created_at: string;
  updated_at: string;
  created_by: string;
  user_count?: number;
}

export interface CompanyWithUsers extends Company {
  user_count: number;
}

export interface CreateCompanyInput {
  name: string;
  adminName: string;
  adminEmail: string;
  adminPhone?: string;
  adminRole: string;
}

export interface BudgetCategory {
  id: string;
  code: string;
  name: string;
  subcategories?: { id: string; code: string; name: string }[];
}

/**
 * Get all companies with user counts (Super Admin only)
 */
export async function getCompanies(): Promise<CompanyWithUsers[]> {
  const currentUser = await stackServerApp.getUser();
  if (!currentUser) return [];

  const isSuper = await isSuperAdmin(currentUser.id);
  if (!isSuper) return [];

  // Get companies
  const { data: companies, error } = await supabase
    .from("companies")
    .select("*")
    .order("created_at", { ascending: false });

  if (error || !companies) {
    console.error("Error fetching companies:", error);
    return [];
  }

  // Get user counts for each company from team_memberships
  const companiesWithCounts: CompanyWithUsers[] = await Promise.all(
    companies.map(async (company) => {
      // Count from team_memberships
      const { count: memberCount } = await supabase
        .from("team_memberships")
        .select("user_id", { count: "exact" })
        .eq("team_id", company.team_id);

      // Count pending invitations from user_whitelist
      const { count: pendingCount } = await supabase
        .from("user_whitelist")
        .select("id", { count: "exact" })
        .eq("team_id", company.team_id)
        .eq("status", "pending");

      return {
        ...company,
        user_count: (memberCount || 0) + (pendingCount || 0)
      };
    })
  );

  return companiesWithCounts;
}

/**
 * Get a single company by ID (Super Admin only)
 */
export async function getCompany(companyId: string): Promise<Company | null> {
  const currentUser = await stackServerApp.getUser();
  if (!currentUser) return null;

  const isSuper = await isSuperAdmin(currentUser.id);
  if (!isSuper) return null;

  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .eq("id", companyId)
    .single();

  if (error) {
    console.error("Error fetching company:", error);
    return null;
  }

  return data;
}

/**
 * Create a new company (Super Admin only)
 */
export async function createCompany(
  input: CreateCompanyInput
): Promise<{ success: boolean; company?: Company; error?: string }> {
  const currentUser = await stackServerApp.getUser();
  if (!currentUser) {
    return { success: false, error: "Not authenticated" };
  }

  const isSuper = await isSuperAdmin(currentUser.id);
  if (!isSuper) {
    return { success: false, error: "Only Super Admins can create companies" };
  }

  // Check if email already used for another company admin
  const { data: existingCompany } = await supabase
    .from("companies")
    .select("id")
    .eq("admin_email", input.adminEmail)
    .single();

  if (existingCompany) {
    return { success: false, error: "This email is already used as admin for another company" };
  }

  // Generate a unique team_id (will be used to create Stack Auth team)
  const teamId = crypto.randomUUID();
  
  // Generate invitation token
  const invitationToken = crypto.randomBytes(32).toString("hex");

  const { data, error } = await supabase
    .from("companies")
    .insert({
      team_id: teamId,
      name: input.name,
      admin_name: input.adminName,
      admin_email: input.adminEmail,
      admin_phone: input.adminPhone || null,
      admin_role: input.adminRole,
      status: "pending",
      invitation_token: invitationToken,
      created_by: currentUser.id
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating company:", error);
    return { success: false, error: error.message };
  }

  return { success: true, company: data };
}

/**
 * Send invitation email to company admin (Super Admin only)
 */
export async function sendCompanyInvitation(
  companyId: string
): Promise<{ success: boolean; error?: string }> {
  const currentUser = await stackServerApp.getUser();
  if (!currentUser) {
    return { success: false, error: "Not authenticated" };
  }

  const isSuper = await isSuperAdmin(currentUser.id);
  if (!isSuper) {
    return { success: false, error: "Only Super Admins can send invitations" };
  }

  // Get company details
  const { data: company, error: fetchError } = await supabase
    .from("companies")
    .select("*")
    .eq("id", companyId)
    .single();

  if (fetchError || !company) {
    return { success: false, error: "Company not found" };
  }

  if (!company.invitation_token) {
    // Generate new token if missing
    const newToken = crypto.randomBytes(32).toString("hex");
    await supabase
      .from("companies")
      .update({ invitation_token: newToken })
      .eq("id", companyId);
    company.invitation_token = newToken;
  }

  // Build invitation URL
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const invitationUrl = `${baseUrl}/invite/company/${company.invitation_token}`;

  // Send email using Resend
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || "noreply@bono.ro",
        to: company.admin_email,
        subject: `Invitație - Administrare ${company.name}`,
        html: `
          <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <img src="${baseUrl}/bono-logo.png" alt="Bono" style="height: 40px; margin-bottom: 32px;" />
            
            <h1 style="color: #101828; font-size: 24px; font-weight: 600; margin-bottom: 16px;">
              Bun venit la Bono!
            </h1>
            
            <p style="color: #475467; font-size: 16px; line-height: 24px; margin-bottom: 24px;">
              Ați fost invitat/ă să administrați compania <strong>${company.name}</strong> în platforma Bono.
            </p>
            
            <p style="color: #475467; font-size: 16px; line-height: 24px; margin-bottom: 32px;">
              Click pe butonul de mai jos pentru a accepta invitația și a configura contul:
            </p>
            
            <a href="${invitationUrl}" 
               style="display: inline-block; background: linear-gradient(180deg, #00D492 0%, #51A2FF 100%); 
                      color: white; text-decoration: none; padding: 14px 32px; border-radius: 9999px; 
                      font-weight: 500; font-size: 15px;">
              Acceptă invitația
            </a>
            
            <p style="color: #98A2B3; font-size: 14px; margin-top: 40px;">
              Dacă nu ați solicitat această invitație, puteți ignora acest email.
            </p>
            
            <hr style="border: none; border-top: 1px solid #E4E7EC; margin: 40px 0;" />
            
            <p style="color: #98A2B3; font-size: 12px;">
              Acest email a fost trimis de Bono. 
              <br />Link direct: <a href="${invitationUrl}" style="color: #11C6B6;">${invitationUrl}</a>
            </p>
          </div>
        `,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Resend error:", errorData);
      return { success: false, error: "Failed to send invitation email" };
    }

    // Update invitation_sent_at
    await supabase
      .from("companies")
      .update({ invitation_sent_at: new Date().toISOString() })
      .eq("id", companyId);

    return { success: true };
  } catch (error) {
    console.error("Error sending invitation:", error);
    return { success: false, error: "Failed to send invitation email" };
  }
}

/**
 * Accept company invitation
 */
export async function acceptCompanyInvitation(
  token: string
): Promise<{ success: boolean; company?: Company; error?: string }> {
  const currentUser = await stackServerApp.getUser();
  if (!currentUser) {
    return { success: false, error: "Please sign in to accept this invitation" };
  }

  // Find company by token
  const { data: company, error: fetchError } = await supabase
    .from("companies")
    .select("*")
    .eq("invitation_token", token)
    .single();

  if (fetchError || !company) {
    return { success: false, error: "Invalid or expired invitation" };
  }

  if (company.status === "active") {
    return { success: false, error: "This invitation has already been accepted" };
  }

  // Verify email matches
  if (currentUser.primaryEmail !== company.admin_email) {
    return { 
      success: false, 
      error: `Please sign in with ${company.admin_email} to accept this invitation` 
    };
  }

  // Update company to active
  const { error: updateError } = await supabase
    .from("companies")
    .update({
      admin_user_id: currentUser.id,
      status: "active",
      invitation_accepted_at: new Date().toISOString(),
      invitation_token: null // Clear token after use
    })
    .eq("id", company.id);

  if (updateError) {
    console.error("Error accepting invitation:", updateError);
    return { success: false, error: "Failed to accept invitation" };
  }

  // Add user to team_memberships with their role
  const { error: membershipError } = await supabase
    .from("team_memberships")
    .insert({
      team_id: company.team_id,
      user_id: currentUser.id,
      role: company.admin_role
    });

  if (membershipError && !membershipError.message.includes("duplicate")) {
    console.error("Error adding team membership:", membershipError);
    // Don't fail the whole operation for this
  }

  // Also add to user_whitelist if not already there
  const { error: whitelistError } = await supabase
    .from("user_whitelist")
    .insert({
      team_id: company.team_id,
      email: company.admin_email,
      full_name: company.admin_name,
      access_level: company.admin_role,
      status: "active",
      invited_by: company.created_by
    });

  if (whitelistError && !whitelistError.message.includes("duplicate")) {
    console.error("Error adding to whitelist:", whitelistError);
    // Don't fail the whole operation for this
  }

  return { success: true, company: { ...company, status: "active" } };
}

/**
 * Get budget structure for a company
 */
export async function getCompanyBudgetStructure(
  teamId: string,
  year?: number
): Promise<BudgetCategory[]> {
  const currentYear = year || new Date().getFullYear();

  // First try to get from team_budgets
  const { data: budgetData } = await supabase
    .from("team_budgets")
    .select("categories")
    .eq("team_id", teamId)
    .eq("year", currentYear)
    .single();

  if (budgetData?.categories) {
    // Parse and return budget categories
    const categories = budgetData.categories as Record<string, { name: string; subcategories: Record<string, { name: string }> }>;
    return Object.entries(categories).map(([code, data]) => ({
      id: code,
      code,
      name: data.name,
      subcategories: data.subcategories 
        ? Object.entries(data.subcategories).map(([subCode, subData]) => ({
            id: subCode,
            code: subCode,
            name: subData.name
          }))
        : []
    }));
  }

  // Fall back to team_expense_categories
  const { data: categories } = await supabase
    .from("team_expense_categories")
    .select("id, name, display_order")
    .eq("team_id", teamId)
    .order("display_order", { ascending: true });

  if (!categories || categories.length === 0) {
    return [];
  }

  // Get subcategories
  const result: BudgetCategory[] = await Promise.all(
    categories.map(async (cat, index) => {
      const { data: subcategories } = await supabase
        .from("team_expense_subcategories")
        .select("id, name")
        .eq("category_id", cat.id)
        .order("display_order", { ascending: true });

      return {
        id: cat.id,
        code: `${(index + 1) * 100}`,
        name: cat.name,
        subcategories: subcategories?.map((sub, subIndex) => ({
          id: sub.id,
          code: `${(index + 1) * 100 + subIndex + 1}`,
          name: sub.name
        })) || []
      };
    })
  );

  return result;
}

/**
 * Update company details (Super Admin only)
 */
export async function updateCompany(
  companyId: string,
  updates: Partial<Pick<Company, "name" | "admin_name" | "admin_phone" | "status">>
): Promise<{ success: boolean; error?: string }> {
  const currentUser = await stackServerApp.getUser();
  if (!currentUser) {
    return { success: false, error: "Not authenticated" };
  }

  const isSuper = await isSuperAdmin(currentUser.id);
  if (!isSuper) {
    return { success: false, error: "Only Super Admins can update companies" };
  }

  const { error } = await supabase
    .from("companies")
    .update(updates)
    .eq("id", companyId);

  if (error) {
    console.error("Error updating company:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Delete/suspend a company (Super Admin only)
 */
export async function suspendCompany(
  companyId: string
): Promise<{ success: boolean; error?: string }> {
  const currentUser = await stackServerApp.getUser();
  if (!currentUser) {
    return { success: false, error: "Not authenticated" };
  }

  const isSuper = await isSuperAdmin(currentUser.id);
  if (!isSuper) {
    return { success: false, error: "Only Super Admins can suspend companies" };
  }

  const { error } = await supabase
    .from("companies")
    .update({ status: "suspended" })
    .eq("id", companyId);

  if (error) {
    console.error("Error suspending company:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}
