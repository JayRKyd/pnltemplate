"use server";

import { Resend } from "resend";
import { supabase } from "@/lib/supabase";
import { markInvitationSent } from "./whitelist";

// Initialize Resend with API key
const resend = new Resend(process.env.RESEND_API_KEY);

interface SendInvitationResult {
  success: boolean;
  error?: string;
}

// Get the base URL for invitation links
function getBaseUrl(): string {
  // In production, use environment variable
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  // Fallback for development
  return "http://localhost:3000";
}

// Send invitation email to whitelisted user
export async function sendInvitationEmail(
  whitelistId: string,
  teamId: string,
  teamName: string
): Promise<SendInvitationResult> {
  try {
    // Get the whitelisted user details
    const { data: user, error: fetchError } = await supabase
      .from("user_whitelist")
      .select("*")
      .eq("id", whitelistId)
      .eq("team_id", teamId)
      .single();

    if (fetchError || !user) {
      return { success: false, error: "User not found in whitelist" };
    }

    const baseUrl = getBaseUrl();
    const inviteLink = `${baseUrl}/invite/${user.invitation_token}`;
    
    // Build auth method descriptions
    const authMethods: string[] = [];
    if (user.auth_methods?.includes("password")) {
      authMethods.push("setează o parolă");
    }
    if (user.auth_methods?.includes("google")) {
      authMethods.push("folosește contul Google");
    }
    if (user.auth_methods?.includes("magic_link")) {
      authMethods.push("folosește Magic Link");
    }

    const authMethodsText = authMethods.join(" sau ");

    // Email content (HTML)
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invitație - ${teamName}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="background-color: white; border-radius: 16px; padding: 40px; box-shadow: 0 2px 10px rgba(0,0,0,0.05);">
      <!-- Logo/Header -->
      <div style="text-align: center; margin-bottom: 32px;">
        <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #11C6B6 0%, #00BFA5 100%); border-radius: 12px; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
          <span style="color: white; font-size: 24px; font-weight: bold;">✓</span>
        </div>
        <h1 style="color: #111827; font-size: 24px; font-weight: 600; margin: 0;">Ești invitat!</h1>
      </div>

      <!-- Content -->
      <div style="color: #4b5563; font-size: 16px; line-height: 1.6;">
        <p>Bună ziua, <strong>${user.full_name}</strong>!</p>
        
        <p>Ai fost invitat să te alături echipei <strong>${teamName}</strong> în platforma noastră de gestionare a cheltuielilor.</p>
        
        <p>Rolul tău va fi: <span style="background-color: #f3f4f6; padding: 2px 8px; border-radius: 4px; font-weight: 500;">${user.role === "owner" ? "Admin" : user.role === "admin" ? "Editor" : "Viewer"}</span></p>

        <div style="background-color: #f9fafb; border-radius: 12px; padding: 20px; margin: 24px 0;">
          <p style="margin: 0 0 12px 0; font-weight: 500; color: #374151;">Pentru a accesa contul, poți:</p>
          <ul style="margin: 0; padding-left: 20px; color: #6b7280;">
            ${user.auth_methods?.includes("password") ? '<li style="margin-bottom: 8px;">Să îți setezi o parolă nouă</li>' : ''}
            ${user.auth_methods?.includes("google") ? '<li style="margin-bottom: 8px;">Să te autentifici cu Google (același email)</li>' : ''}
            ${user.auth_methods?.includes("magic_link") ? '<li style="margin-bottom: 8px;">Să folosești Magic Link (link trimis pe email)</li>' : ''}
          </ul>
        </div>

        ${user.two_factor_enabled ? `
        <div style="background-color: #fef3c7; border-radius: 12px; padding: 16px; margin: 24px 0; border-left: 4px solid #f59e0b;">
          <p style="margin: 0; color: #92400e; font-size: 14px;">
            <strong>Notă:</strong> Autentificarea în 2 pași (2FA) este activată pentru contul tău.
          </p>
        </div>
        ` : ''}

        <!-- CTA Button -->
        <div style="text-align: center; margin: 32px 0;">
          <a href="${inviteLink}" style="display: inline-block; background: linear-gradient(135deg, #11C6B6 0%, #00BFA5 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 50px; font-weight: 600; font-size: 16px;">
            Accesează contul
          </a>
        </div>

        <p style="font-size: 14px; color: #9ca3af;">
          Acest link expiră în 7 zile. Dacă ai probleme, contactează administratorul echipei.
        </p>
      </div>

      <!-- Footer -->
      <div style="border-top: 1px solid #e5e7eb; margin-top: 32px; padding-top: 24px; text-align: center;">
        <p style="color: #9ca3af; font-size: 13px; margin: 0;">
          Ai primit acest email deoarece ai fost adăugat în echipa ${teamName}.<br>
          Dacă nu recunoști această invitație, poți ignora acest email.
        </p>
      </div>
    </div>
  </div>
</body>
</html>
    `.trim();

    // Plain text version
    const emailText = `
Bună ziua, ${user.full_name}!

Ai fost invitat să te alături echipei ${teamName}.

Rolul tău: ${user.role === "owner" ? "Admin" : user.role === "admin" ? "Editor" : "Viewer"}

Pentru a accesa contul, poți ${authMethodsText}.

Accesează acest link pentru a începe: ${inviteLink}

Acest link expiră în 7 zile.

---
Ai primit acest email deoarece ai fost adăugat în echipa ${teamName}.
    `.trim();

    // Get sender email from env or use default
    const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
    const fromName = process.env.RESEND_FROM_NAME || teamName;

    // Send email via Resend
    const { data, error: sendError } = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: user.email,
      subject: `Invitație - ${teamName}`,
      html: emailHtml,
      text: emailText,
    });

    if (sendError) {
      console.error("[sendInvitationEmail] Resend error:", sendError);
      return { 
        success: false, 
        error: `Failed to send email: ${sendError.message}` 
      };
    }

    console.log("[sendInvitationEmail] Email sent successfully:", data?.id);

    // Mark invitation as sent
    await markInvitationSent(whitelistId, teamId);

    return { success: true };
  } catch (error) {
    console.error("[sendInvitationEmail] Error:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to send email" 
    };
  }
}

// Resend invitation with new token
export async function resendInvitationEmail(
  whitelistId: string,
  teamId: string,
  teamName: string
): Promise<SendInvitationResult> {
  // The resendInvitation action already regenerates the token
  // So we just need to send the email
  return sendInvitationEmail(whitelistId, teamId, teamName);
}

// Batch send invitations
export async function sendBulkInvitations(
  whitelistIds: string[],
  teamId: string,
  teamName: string
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  for (const id of whitelistIds) {
    const result = await sendInvitationEmail(id, teamId, teamName);
    if (result.success) {
      sent++;
    } else {
      failed++;
    }
  }

  return { sent, failed };
}
