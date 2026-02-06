"use server";

import { supabase, supabaseAdmin } from "@/lib/supabase";
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

export interface TeamMember {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  role: string;
  status: 'active' | 'pending' | 'inactive';
  joined_at: string | null;
  avatar_url?: string | null;
}

/**
 * Get all companies with user counts (Super Admin only)
 */
export async function getCompanies(): Promise<CompanyWithUsers[]> {
  const currentUser = await stackServerApp.getUser();
  if (!currentUser) return [];

  const isSuper = await isSuperAdmin(currentUser.id);
  if (!isSuper) return [];

  // OPTIMIZED: Fetch all data in parallel with batch queries (fixes N+1 problem)
  // Instead of 2 queries per company, we now run only 4 queries total
  const [companiesResult, membershipsResult, whitelistResult, superAdminsResult] = await Promise.all([
    // Get companies
    supabase
      .from("companies")
      .select("*")
      .order("created_at", { ascending: false }),

    // Get ALL memberships with user_id to filter super-admins
    supabase
      .from("team_memberships")
      .select("team_id, user_id"),

    // Get ALL pending whitelist counts in one query
    supabase
      .from("user_whitelist")
      .select("team_id")
      .eq("status", "pending"),

    // Get super-admin user IDs to exclude from counts
    supabase
      .from("super_admins")
      .select("user_id"),
  ]);

  if (companiesResult.error || !companiesResult.data) {
    console.error("Error fetching companies:", companiesResult.error);
    return [];
  }

  const companies = companiesResult.data;
  const memberships = membershipsResult.data || [];
  const whitelist = whitelistResult.data || [];
  const superAdminIds = new Set((superAdminsResult.data || []).map(sa => sa.user_id));

  // Build count maps for O(1) lookups (excluding super-admins)
  const memberCountMap = new Map<string, number>();
  memberships.forEach(m => {
    // Skip super-admins - they shouldn't be counted in company user lists
    if (superAdminIds.has(m.user_id)) return;
    memberCountMap.set(m.team_id, (memberCountMap.get(m.team_id) || 0) + 1);
  });

  const pendingCountMap = new Map<string, number>();
  whitelist.forEach(w => {
    pendingCountMap.set(w.team_id, (pendingCountMap.get(w.team_id) || 0) + 1);
  });

  // Build result with counts (no additional queries needed)
  const companiesWithCounts: CompanyWithUsers[] = companies.map(company => ({
    ...company,
    user_count: (memberCountMap.get(company.team_id) || 0) + (pendingCountMap.get(company.team_id) || 0)
  }));

  return companiesWithCounts;
}

/**
 * Get a single company by ID (Super Admin or team member)
 */
export async function getCompany(companyId: string): Promise<Company | null> {
  const currentUser = await stackServerApp.getUser();
  if (!currentUser) return null;

  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .eq("id", companyId)
    .single();

  if (error) {
    console.error("Error fetching company:", error);
    return null;
  }

  // Check permissions - Super Admin or team member
  const isSuper = await isSuperAdmin(currentUser.id);
  if (!isSuper) {
    // Check if user is member of this team
    const { data: membership } = await supabase
      .from("team_memberships")
      .select("role")
      .eq("team_id", data.team_id)
      .eq("user_id", currentUser.id)
      .single();

    if (!membership) {
      return null; // User is not part of this company
    }
  }

  return data;
}

/**
 * Get company by team_id (for any authenticated user in that team)
 */
export async function getCompanyByTeamId(teamId: string): Promise<Company | null> {
  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .eq("team_id", teamId)
    .single();

  if (error) {
    console.error("Error fetching company by team_id:", error);
    return null;
  }

  return data;
}

/**
 * Get the current user's companies (server-side, bypasses RLS)
 * Returns all companies + roles for the current authenticated user
 * Includes companies from active team_memberships AND pending whitelist invites
 */
export async function getMyCompanies(): Promise<{ company: Company; role: string }[]> {
  const currentUser = await stackServerApp.getUser();
  if (!currentUser) return [];

  // Collect team IDs from two sources
  const teamRoleMap = new Map<string, string>();

  // 1. Active team memberships
  const { data: memberships } = await supabaseAdmin
    .from("team_memberships")
    .select("team_id, role")
    .eq("user_id", currentUser.id);

  if (memberships) {
    for (const m of memberships) {
      teamRoleMap.set(m.team_id, m.role);
    }
  }

  // 2. Pending whitelist invites (by email)
  const userEmail = currentUser.primaryEmail;
  if (userEmail) {
    const { data: invites } = await supabaseAdmin
      .from("user_whitelist")
      .select("team_id, role")
      .eq("email", userEmail)
      .eq("status", "pending");

    if (invites) {
      for (const inv of invites) {
        if (!teamRoleMap.has(inv.team_id)) {
          teamRoleMap.set(inv.team_id, inv.role || "member");
        }
      }
    }
  }

  if (teamRoleMap.size === 0) {
    console.log("[getMyCompanies] No memberships or invites for user:", currentUser.id);
    return [];
  }

  // Find companies for all collected team IDs
  const teamIds = Array.from(teamRoleMap.keys());
  const { data: companies, error: compError } = await supabaseAdmin
    .from("companies")
    .select("*")
    .in("team_id", teamIds);

  if (compError || !companies || companies.length === 0) {
    console.log("[getMyCompanies] No companies found for teams:", teamIds);
    return [];
  }

  // Return all companies with roles
  return companies.map(company => {
    const role = teamRoleMap.get(company.team_id) || "member";
    return { company, role };
  });
}

/**
 * Create a new company (Super Admin only)
 * Creates both Stack Auth team AND Supabase company record
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

  // Create Stack Auth team first
  let stackTeam;
  try {
    stackTeam = await stackServerApp.createTeam({
      displayName: input.name,
    });
    
    // Add creator (super admin) as member of the new team
    await stackTeam.addUser(currentUser.id);
  } catch (e) {
    console.error("Error creating Stack Auth team:", e);
    return { success: false, error: "Failed to create team in authentication system" };
  }

  const teamId = stackTeam.id;
  
  // Also add to team_memberships in Supabase for consistency
  await supabase.from("team_memberships").insert({
    team_id: teamId,
    user_id: currentUser.id,
    role: "admin",
    is_active: true,
  });
  
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
    // Try to clean up the Stack Auth team if Supabase insert failed
    try {
      await stackTeam.delete();
    } catch (cleanupError) {
      console.error("Failed to cleanup Stack Auth team:", cleanupError);
    }
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

  // Add user to Stack Auth team
  try {
    const stackTeam = await stackServerApp.getTeam(company.team_id);
    if (stackTeam) {
      await stackTeam.addUser(currentUser.id);
    }
  } catch (e) {
    console.error("Error adding user to Stack Auth team:", e);
    // Don't fail - Supabase membership is the source of truth
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

  // Fall back to team_expense_categories (uses parent_id for hierarchy)
  const { data: allCategories, error } = await supabase
    .from("team_expense_categories")
    .select("id, name, parent_id, sort_order")
    .eq("team_id", teamId)
    .eq("category_type", "cheltuieli")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Error fetching categories:", error);
    return [];
  }

  if (!allCategories || allCategories.length === 0) {
    return [];
  }

  // Separate parent categories and subcategories
  const parentCategories = allCategories.filter(c => !c.parent_id);
  const childCategories = allCategories.filter(c => c.parent_id);

  // Build hierarchical structure
  const result: BudgetCategory[] = parentCategories.map((parent, index) => {
    const subcats = childCategories
      .filter(c => c.parent_id === parent.id)
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

    return {
      id: parent.id,
      code: `${(index + 1) * 100}`,
      name: parent.name,
      subcategories: subcats.map((sub, subIndex) => ({
        id: sub.id,
        code: `${(index + 1) * 100 + subIndex + 1}`,
        name: sub.name
      }))
    };
  });

  return result;
}

/**
 * Get team members for a company
 * Uses team_members_with_profiles view for reliable data
 */
export async function getCompanyTeamMembers(
  companyId: string
): Promise<TeamMember[]> {
  const currentUser = await stackServerApp.getUser();
  if (!currentUser) return [];

  // Get company to find team_id
  const { data: company } = await supabaseAdmin
    .from("companies")
    .select("team_id")
    .eq("id", companyId)
    .single();

  if (!company) return [];

  // Check permissions - Super Admin or team member
  const isSuper = await isSuperAdmin(currentUser.id);
  if (!isSuper) {
    const { data: membership } = await supabaseAdmin
      .from("team_memberships")
      .select("role")
      .eq("team_id", company.team_id)
      .eq("user_id", currentUser.id)
      .single();

    if (!membership) return [];
  }

  // Use team_members_with_profiles view - this joins memberships with stack_users
  const { data: viewMembers, error: viewError } = await supabaseAdmin
    .from("team_members_with_profiles")
    .select("membership_id, user_id, email, name, avatar_url, role, joined_at, is_active")
    .eq("team_id", company.team_id);

  if (viewError) {
    console.error("[getCompanyTeamMembers] View error:", viewError);
    return [];
  }

  // Get list of super-admin user IDs to exclude them from company user lists
  const { data: superAdmins } = await supabaseAdmin
    .from("super_admins")
    .select("user_id");
  const superAdminIds = new Set((superAdmins || []).map(sa => sa.user_id));

  // Filter out super-admins from the members list
  const filteredMembers = (viewMembers || []).filter(m => !superAdminIds.has(m.user_id));

  const members: TeamMember[] = filteredMembers.map(m => ({
    id: m.membership_id,
    user_id: m.user_id,
    email: m.email || '',
    full_name: m.name || null,
    role: m.role || 'member',
    status: m.is_active === false ? 'inactive' : 'active',
    joined_at: m.joined_at,
    avatar_url: m.avatar_url || null,
  }));

  // Also get pending invites from user_whitelist
  const { data: pendingInvites } = await supabaseAdmin
    .from("user_whitelist")
    .select("id, email, full_name, role, created_at")
    .eq("team_id", company.team_id)
    .eq("status", "pending");

  if (pendingInvites) {
    const existingEmails = new Set(members.map(m => m.email.toLowerCase()));
    for (const invite of pendingInvites) {
      if (!existingEmails.has(invite.email.toLowerCase())) {
        members.push({
          id: invite.id,
          user_id: '',
          email: invite.email,
          full_name: invite.full_name || null,
          role: invite.role || 'member',
          status: 'pending',
          joined_at: invite.created_at,
          avatar_url: null,
        });
      }
    }
  }

  return members;
}

/**
 * Update company details (Super Admin or Company Admin)
 */
export async function updateCompany(
  companyId: string,
  updates: Partial<Pick<Company, "name" | "admin_name" | "admin_phone" | "status">>
): Promise<{ success: boolean; error?: string }> {
  const currentUser = await stackServerApp.getUser();
  if (!currentUser) {
    return { success: false, error: "Not authenticated" };
  }

  // Get company to check team_id
  const { data: company } = await supabase
    .from("companies")
    .select("team_id")
    .eq("id", companyId)
    .single();

  if (!company) {
    return { success: false, error: "Company not found" };
  }

  // Check permissions - Super Admin or team admin
  const isSuper = await isSuperAdmin(currentUser.id);
  if (!isSuper) {
    // Check if user is admin of this team
    const { data: membership } = await supabase
      .from("team_memberships")
      .select("role")
      .eq("team_id", company.team_id)
      .eq("user_id", currentUser.id)
      .single();

    if (!membership || membership.role !== "admin") {
      return { success: false, error: "Only admins can update company details" };
    }

    // Company Admins cannot change status
    if (updates.status) {
      delete updates.status;
    }
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

// ============================================================
// Budget Structure Management (Categories & Subcategories)
// ============================================================

/**
 * Add a new category to the budget structure
 */
export async function addBudgetCategory(
  teamId: string,
  name: string
): Promise<{ success: boolean; category?: BudgetCategory; error?: string }> {
  const currentUser = await stackServerApp.getUser();
  if (!currentUser) {
    return { success: false, error: "Not authenticated" };
  }

  // Check permissions - Super Admin or team admin
  const isSuper = await isSuperAdmin(currentUser.id);
  if (!isSuper) {
    // Check if user is admin of this team
    const { data: membership } = await supabase
      .from("team_memberships")
      .select("role")
      .eq("team_id", teamId)
      .eq("user_id", currentUser.id)
      .single();

    if (!membership || membership.role !== "admin") {
      return { success: false, error: "Only admins can manage budget structure" };
    }
  }

  // Get max sort_order for existing categories
  const { data: existing } = await supabase
    .from("team_expense_categories")
    .select("sort_order")
    .eq("team_id", teamId)
    .eq("category_type", "cheltuieli")
    .is("parent_id", null)
    .order("sort_order", { ascending: false })
    .limit(1);

  const nextSortOrder = existing && existing.length > 0 ? (existing[0].sort_order || 0) + 1 : 1;

  const { data, error } = await supabase
    .from("team_expense_categories")
    .insert({
      team_id: teamId,
      name: name,
      category_type: "cheltuieli",
      is_active: true,
      sort_order: nextSortOrder,
      parent_id: null
    })
    .select()
    .single();

  if (error) {
    console.error("Error adding category:", error);
    return { success: false, error: error.message };
  }

  return {
    success: true,
    category: {
      id: data.id,
      code: `${nextSortOrder * 100}`,
      name: data.name,
      subcategories: []
    }
  };
}

/**
 * Update a category name
 */
export async function updateBudgetCategory(
  categoryId: string,
  name: string
): Promise<{ success: boolean; error?: string }> {
  const currentUser = await stackServerApp.getUser();
  if (!currentUser) {
    return { success: false, error: "Not authenticated" };
  }

  // Get category to check team
  const { data: category } = await supabase
    .from("team_expense_categories")
    .select("team_id")
    .eq("id", categoryId)
    .single();

  if (!category) {
    return { success: false, error: "Category not found" };
  }

  // Check permissions
  const isSuper = await isSuperAdmin(currentUser.id);
  if (!isSuper) {
    const { data: membership } = await supabase
      .from("team_memberships")
      .select("role")
      .eq("team_id", category.team_id)
      .eq("user_id", currentUser.id)
      .single();

    if (!membership || membership.role !== "admin") {
      return { success: false, error: "Only admins can manage budget structure" };
    }
  }

  const { error } = await supabase
    .from("team_expense_categories")
    .update({ name })
    .eq("id", categoryId);

  if (error) {
    console.error("Error updating category:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Delete a category (and its subcategories)
 */
export async function deleteBudgetCategory(
  categoryId: string
): Promise<{ success: boolean; error?: string }> {
  const currentUser = await stackServerApp.getUser();
  if (!currentUser) {
    return { success: false, error: "Not authenticated" };
  }

  // Get category to check team
  const { data: category } = await supabase
    .from("team_expense_categories")
    .select("team_id")
    .eq("id", categoryId)
    .single();

  if (!category) {
    return { success: false, error: "Category not found" };
  }

  // Check permissions
  const isSuper = await isSuperAdmin(currentUser.id);
  if (!isSuper) {
    const { data: membership } = await supabase
      .from("team_memberships")
      .select("role")
      .eq("team_id", category.team_id)
      .eq("user_id", currentUser.id)
      .single();

    if (!membership || membership.role !== "admin") {
      return { success: false, error: "Only admins can manage budget structure" };
    }
  }

  // Soft delete: set is_active to false instead of deleting
  // This preserves historical data in expenses
  const { error: subError } = await supabase
    .from("team_expense_categories")
    .update({ is_active: false })
    .eq("parent_id", categoryId);

  if (subError) {
    console.error("Error deleting subcategories:", subError);
  }

  const { error } = await supabase
    .from("team_expense_categories")
    .update({ is_active: false })
    .eq("id", categoryId);

  if (error) {
    console.error("Error deleting category:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Add a subcategory to a category
 */
export async function addBudgetSubcategory(
  parentCategoryId: string,
  name: string
): Promise<{ success: boolean; subcategory?: { id: string; code: string; name: string }; error?: string }> {
  const currentUser = await stackServerApp.getUser();
  if (!currentUser) {
    return { success: false, error: "Not authenticated" };
  }

  // Get parent category
  const { data: parent } = await supabase
    .from("team_expense_categories")
    .select("team_id, sort_order")
    .eq("id", parentCategoryId)
    .single();

  if (!parent) {
    return { success: false, error: "Parent category not found" };
  }

  // Check permissions
  const isSuper = await isSuperAdmin(currentUser.id);
  if (!isSuper) {
    const { data: membership } = await supabase
      .from("team_memberships")
      .select("role")
      .eq("team_id", parent.team_id)
      .eq("user_id", currentUser.id)
      .single();

    if (!membership || membership.role !== "admin") {
      return { success: false, error: "Only admins can manage budget structure" };
    }
  }

  // Get max sort_order for existing subcategories
  const { data: existingSubs } = await supabase
    .from("team_expense_categories")
    .select("sort_order")
    .eq("parent_id", parentCategoryId)
    .eq("is_active", true)
    .order("sort_order", { ascending: false })
    .limit(1);

  const nextSubSortOrder = existingSubs && existingSubs.length > 0 ? (existingSubs[0].sort_order || 0) + 1 : 1;

  const { data, error } = await supabase
    .from("team_expense_categories")
    .insert({
      team_id: parent.team_id,
      name: name,
      category_type: "cheltuieli",
      is_active: true,
      sort_order: nextSubSortOrder,
      parent_id: parentCategoryId
    })
    .select()
    .single();

  if (error) {
    console.error("Error adding subcategory:", error);
    return { success: false, error: error.message };
  }

  // Calculate code based on parent's sort_order
  const parentCode = (parent.sort_order || 1) * 100;
  const subCode = `${parentCode + nextSubSortOrder}`;

  return {
    success: true,
    subcategory: {
      id: data.id,
      code: subCode,
      name: data.name
    }
  };
}

/**
 * Update a subcategory name
 */
export async function updateBudgetSubcategory(
  subcategoryId: string,
  name: string
): Promise<{ success: boolean; error?: string }> {
  // Same logic as updateBudgetCategory
  return updateBudgetCategory(subcategoryId, name);
}

/**
 * Delete a subcategory
 */
export async function deleteBudgetSubcategory(
  subcategoryId: string
): Promise<{ success: boolean; error?: string }> {
  const currentUser = await stackServerApp.getUser();
  if (!currentUser) {
    return { success: false, error: "Not authenticated" };
  }

  // Get subcategory to check team
  const { data: subcategory } = await supabase
    .from("team_expense_categories")
    .select("team_id")
    .eq("id", subcategoryId)
    .single();

  if (!subcategory) {
    return { success: false, error: "Subcategory not found" };
  }

  // Check permissions
  const isSuper = await isSuperAdmin(currentUser.id);
  if (!isSuper) {
    const { data: membership } = await supabase
      .from("team_memberships")
      .select("role")
      .eq("team_id", subcategory.team_id)
      .eq("user_id", currentUser.id)
      .single();

    if (!membership || membership.role !== "admin") {
      return { success: false, error: "Only admins can manage budget structure" };
    }
  }

  // Soft delete
  const { error } = await supabase
    .from("team_expense_categories")
    .update({ is_active: false })
    .eq("id", subcategoryId);

  if (error) {
    console.error("Error deleting subcategory:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

// ============================================================
// User Management (Add, Edit, Invite, Activate/Deactivate)
// ============================================================

export interface InviteUserInput {
  email: string;
  fullName?: string;
  role: string;
}

/**
 * Invite a new user to the company
 */
export async function inviteCompanyUser(
  companyId: string,
  input: InviteUserInput
): Promise<{ success: boolean; error?: string }> {
  const currentUser = await stackServerApp.getUser();
  if (!currentUser) {
    return { success: false, error: "Not authenticated" };
  }

  // Get company
  const { data: company } = await supabase
    .from("companies")
    .select("team_id, name")
    .eq("id", companyId)
    .single();

  if (!company) {
    return { success: false, error: "Company not found" };
  }

  // Check permissions - Super Admin or team admin
  const isSuper = await isSuperAdmin(currentUser.id);
  if (!isSuper) {
    const { data: membership } = await supabase
      .from("team_memberships")
      .select("role")
      .eq("team_id", company.team_id)
      .eq("user_id", currentUser.id)
      .single();

    if (!membership || membership.role !== "admin") {
      return { success: false, error: "Only admins can invite users" };
    }
  }

  // Check if user already exists in whitelist
  const { data: existing } = await supabase
    .from("user_whitelist")
    .select("id, status")
    .eq("team_id", company.team_id)
    .eq("email", input.email.toLowerCase())
    .single();

  if (existing) {
    if (existing.status === "active") {
      return { success: false, error: "This user is already a member" };
    }
    // Update existing pending invite
    await supabase
      .from("user_whitelist")
      .update({
        full_name: input.fullName || null,
        access_level: input.role,
        status: "pending",
        created_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
  } else {
    // Create new whitelist entry
    const { error } = await supabase
      .from("user_whitelist")
      .insert({
        team_id: company.team_id,
        email: input.email.toLowerCase(),
        full_name: input.fullName || null,
        access_level: input.role,
        status: "pending",
        invited_by: currentUser.id,
      });

    if (error) {
      console.error("Error inviting user:", error);
      return { success: false, error: error.message };
    }
  }

  // Send invitation email
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const invitationUrl = `${baseUrl}/handler/sign-in`;

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || "noreply@bono.ro",
        to: input.email,
        subject: `Invitație - ${company.name}`,
        html: `
          <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <img src="${baseUrl}/bono-logo.png" alt="Bono" style="height: 40px; margin-bottom: 32px;" />

            <h1 style="color: #101828; font-size: 24px; font-weight: 600; margin-bottom: 16px;">
              Bun venit la Bono!
            </h1>

            <p style="color: #475467; font-size: 16px; line-height: 24px; margin-bottom: 24px;">
              Ați fost invitat/ă să vă alăturați echipei <strong>${company.name}</strong> în platforma Bono.
            </p>

            <p style="color: #475467; font-size: 16px; line-height: 24px; margin-bottom: 32px;">
              Click pe butonul de mai jos pentru a accepta invitația și a vă crea contul:
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
          </div>
        `,
      }),
    });
  } catch (e) {
    console.error("Error sending invitation email:", e);
    // Don't fail the whole operation if email fails
  }

  return { success: true };
}

/**
 * Resend invitation to a pending user
 */
export async function resendUserInvitation(
  companyId: string,
  memberId: string
): Promise<{ success: boolean; error?: string }> {
  const currentUser = await stackServerApp.getUser();
  if (!currentUser) {
    return { success: false, error: "Not authenticated" };
  }

  // Get company
  const { data: company } = await supabase
    .from("companies")
    .select("team_id, name")
    .eq("id", companyId)
    .single();

  if (!company) {
    return { success: false, error: "Company not found" };
  }

  // Check permissions
  const isSuper = await isSuperAdmin(currentUser.id);
  if (!isSuper) {
    const { data: membership } = await supabase
      .from("team_memberships")
      .select("role")
      .eq("team_id", company.team_id)
      .eq("user_id", currentUser.id)
      .single();

    if (!membership || membership.role !== "admin") {
      return { success: false, error: "Only admins can resend invitations" };
    }
  }

  // Get the whitelist entry
  const { data: whitelistEntry } = await supabase
    .from("user_whitelist")
    .select("*")
    .eq("id", memberId)
    .eq("team_id", company.team_id)
    .single();

  if (!whitelistEntry) {
    return { success: false, error: "User not found" };
  }

  if (whitelistEntry.status !== "pending") {
    return { success: false, error: "User is already active" };
  }

  // Send invitation email
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const invitationUrl = `${baseUrl}/handler/sign-in`;

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || "noreply@bono.ro",
        to: whitelistEntry.email,
        subject: `Reamintire invitație - ${company.name}`,
        html: `
          <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <img src="${baseUrl}/bono-logo.png" alt="Bono" style="height: 40px; margin-bottom: 32px;" />

            <h1 style="color: #101828; font-size: 24px; font-weight: 600; margin-bottom: 16px;">
              Reamintire invitație
            </h1>

            <p style="color: #475467; font-size: 16px; line-height: 24px; margin-bottom: 24px;">
              Vă reamintim că ați fost invitat/ă să vă alăturați echipei <strong>${company.name}</strong> în platforma Bono.
            </p>

            <a href="${invitationUrl}"
               style="display: inline-block; background: linear-gradient(180deg, #00D492 0%, #51A2FF 100%);
                      color: white; text-decoration: none; padding: 14px 32px; border-radius: 9999px;
                      font-weight: 500; font-size: 15px;">
              Acceptă invitația
            </a>
          </div>
        `,
      }),
    });
  } catch (e) {
    console.error("Error sending invitation email:", e);
    return { success: false, error: "Failed to send email" };
  }

  return { success: true };
}

/**
 * Update a user's role
 */
export async function updateCompanyUser(
  companyId: string,
  memberId: string,
  updates: { role?: string; fullName?: string }
): Promise<{ success: boolean; error?: string }> {
  const currentUser = await stackServerApp.getUser();
  if (!currentUser) {
    return { success: false, error: "Not authenticated" };
  }

  // Get company
  const { data: company } = await supabaseAdmin
    .from("companies")
    .select("team_id")
    .eq("id", companyId)
    .single();

  if (!company) {
    return { success: false, error: "Company not found" };
  }

  // Check permissions
  const isSuper = await isSuperAdmin(currentUser.id);
  if (!isSuper) {
    const { data: membership } = await supabaseAdmin
      .from("team_memberships")
      .select("role")
      .eq("team_id", company.team_id)
      .eq("user_id", currentUser.id)
      .single();

    if (!membership || membership.role !== "admin") {
      return { success: false, error: "Only admins can edit users" };
    }
  }

  // Update whitelist entry (both role and access_level columns)
  const whitelistUpdates: Record<string, string> = {};
  if (updates.role) {
    whitelistUpdates.access_level = updates.role;
    whitelistUpdates.role = updates.role;
  }
  if (updates.fullName !== undefined) whitelistUpdates.full_name = updates.fullName;

  if (Object.keys(whitelistUpdates).length > 0) {
    const { error: wlError } = await supabaseAdmin
      .from("user_whitelist")
      .update(whitelistUpdates)
      .eq("id", memberId)
      .eq("team_id", company.team_id);

    if (wlError) {
      console.error("Error updating whitelist:", wlError);
    }
  }

  // Also update team_memberships role if user is active
  if (updates.role) {
    const { data: wlEntry } = await supabaseAdmin
      .from("user_whitelist")
      .select("user_id")
      .eq("id", memberId)
      .single();

    if (wlEntry?.user_id) {
      await supabaseAdmin
        .from("team_memberships")
        .update({ role: updates.role })
        .eq("team_id", company.team_id)
        .eq("user_id", wlEntry.user_id);
    }
  }

  return { success: true };
}

/**
 * Activate or deactivate a user
 */
export async function toggleUserActive(
  companyId: string,
  memberId: string,
  activate: boolean
): Promise<{ success: boolean; error?: string }> {
  const currentUser = await stackServerApp.getUser();
  if (!currentUser) {
    return { success: false, error: "Not authenticated" };
  }

  // Get company
  const { data: company } = await supabase
    .from("companies")
    .select("team_id")
    .eq("id", companyId)
    .single();

  if (!company) {
    return { success: false, error: "Company not found" };
  }

  // Check permissions
  const isSuper = await isSuperAdmin(currentUser.id);
  if (!isSuper) {
    const { data: membership } = await supabase
      .from("team_memberships")
      .select("role")
      .eq("team_id", company.team_id)
      .eq("user_id", currentUser.id)
      .single();

    if (!membership || membership.role !== "admin") {
      return { success: false, error: "Only admins can activate/deactivate users" };
    }
  }

  // memberId could be a team_memberships.id or a user_whitelist.id
  // First try to find by team_memberships.id (this is what the UI passes)
  const { data: membership } = await supabase
    .from("team_memberships")
    .select("id, user_id, is_active")
    .eq("id", memberId)
    .eq("team_id", company.team_id)
    .single();

  if (membership) {
    // Found via team_memberships - update membership directly
    const { error: tmError } = await supabase
      .from("team_memberships")
      .update({ is_active: activate })
      .eq("id", memberId);

    if (tmError) {
      console.error("Error updating membership:", tmError);
      return { success: false, error: tmError.message };
    }

    // Also update user_whitelist if entry exists
    const { data: whitelistEntry } = await supabase
      .from("user_whitelist")
      .select("id, status")
      .eq("team_id", company.team_id)
      .eq("user_id", membership.user_id)
      .single();

    if (whitelistEntry) {
      const newStatus = activate ? "active" : "deactivated";
      await supabase
        .from("user_whitelist")
        .update({ status: newStatus })
        .eq("id", whitelistEntry.id);
    }
  } else {
    // Fallback: try user_whitelist.id (for pending invites)
    const { data: whitelistEntry } = await supabase
      .from("user_whitelist")
      .select("user_id, status")
      .eq("id", memberId)
      .eq("team_id", company.team_id)
      .single();

    if (!whitelistEntry) {
      return { success: false, error: "User not found" };
    }

    if (whitelistEntry.status === "pending" && activate) {
      return { success: false, error: "Cannot activate a user who hasn't accepted their invitation" };
    }

    const newStatus = activate ? "active" : "deactivated";
    const { error: wlError } = await supabase
      .from("user_whitelist")
      .update({ status: newStatus })
      .eq("id", memberId);

    if (wlError) {
      console.error("Error updating whitelist status:", wlError);
      return { success: false, error: wlError.message };
    }

    // Update team_memberships if user has one
    if (whitelistEntry.user_id) {
      await supabase
        .from("team_memberships")
        .update({ is_active: activate })
        .eq("team_id", company.team_id)
        .eq("user_id", whitelistEntry.user_id);
    }
  }

  return { success: true };
}

/**
 * Remove a user from the company (for pending invites only)
 */
export async function removeCompanyUser(
  companyId: string,
  memberId: string
): Promise<{ success: boolean; error?: string }> {
  const currentUser = await stackServerApp.getUser();
  if (!currentUser) {
    return { success: false, error: "Not authenticated" };
  }

  // Get company
  const { data: company } = await supabase
    .from("companies")
    .select("team_id")
    .eq("id", companyId)
    .single();

  if (!company) {
    return { success: false, error: "Company not found" };
  }

  // Check permissions
  const isSuper = await isSuperAdmin(currentUser.id);
  if (!isSuper) {
    const { data: membership } = await supabase
      .from("team_memberships")
      .select("role")
      .eq("team_id", company.team_id)
      .eq("user_id", currentUser.id)
      .single();

    if (!membership || membership.role !== "admin") {
      return { success: false, error: "Only admins can remove users" };
    }
  }

  // Get the whitelist entry
  const { data: whitelistEntry } = await supabase
    .from("user_whitelist")
    .select("status")
    .eq("id", memberId)
    .eq("team_id", company.team_id)
    .single();

  if (!whitelistEntry) {
    return { success: false, error: "User not found" };
  }

  // Only allow removing pending invites
  if (whitelistEntry.status !== "pending") {
    return { success: false, error: "Can only remove pending invitations. Use deactivate for active users." };
  }

  // Delete the whitelist entry
  const { error } = await supabase
    .from("user_whitelist")
    .delete()
    .eq("id", memberId);

  if (error) {
    console.error("Error removing user:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}
