"use server";

import { supabaseAdmin } from "@/lib/supabase";

export interface EmailAttachment {
  filename: string;
  content: string; // base64-encoded
  contentType: string;
  size: number;
}

export interface InboundEmailData {
  from: string;
  to: string;
  subject: string;
  html?: string;
  text?: string;
  attachments?: EmailAttachment[];
  receivedAt: string;
}

/** Find a company by its unique inbound invoice email address. */
export async function getCompanyByInvoiceEmail(
  invoiceEmail: string
): Promise<{ team_id: string; name: string } | null> {
  const { data, error } = await supabaseAdmin
    .from("companies")
    .select("team_id, name")
    .eq("invoice_email", invoiceEmail.toLowerCase())
    .maybeSingle();

  if (error) {
    console.error("[email-invoice] getCompanyByInvoiceEmail error:", error);
    return null;
  }
  return data ?? null;
}

/** Return the emails of all admin members of a team. */
export async function getTeamAdminEmails(teamId: string): Promise<string[]> {
  const { data } = await supabaseAdmin
    .from("team_members_with_profiles")
    .select("email, role")
    .eq("team_id", teamId)
    .eq("role", "admin");

  return (data ?? []).map((m) => m.email).filter(Boolean) as string[];
}

async function getNextExpenseUid(teamId: string): Promise<string> {
  const { data, error } = await supabaseAdmin.rpc("get_next_expense_id", {
    p_team_id: teamId,
  });

  if (error) {
    console.error("[email-invoice] Failed to get next expense ID:", error);
    return `EXP-${Date.now().toString(36).toUpperCase()}`;
  }

  return data as string;
}

/**
 * Creates a draft expense from an inbound email and uploads any PDF
 * attachments to Supabase Storage.
 *
 * Returns the new expense ID and the number of attachments uploaded.
 */
export async function createDraftFromEmail(
  teamId: string,
  emailData: InboundEmailData
): Promise<{ expenseId: string; attachmentCount: number }> {
  // Resolve a real user ID so the expense is owned by a human (the first admin).
  const { data: adminMembership } = await supabaseAdmin
    .from("team_memberships")
    .select("user_id")
    .eq("team_id", teamId)
    .eq("role", "admin")
    .limit(1)
    .maybeSingle();

  const ownerId = adminMembership?.user_id ?? "system";
  const expenseUid = await getNextExpenseUid(teamId);
  const today = new Date().toISOString().split("T")[0];

  const { data: expense, error: expenseError } = await supabaseAdmin
    .from("team_expenses")
    .insert({
      expense_uid: expenseUid,
      team_id: teamId,
      user_id: ownerId,
      amount: 0,
      currency: "RON",
      status: "draft",
      payment_status: "unpaid",
      expense_date: today,
      source: "email",
      email_from: emailData.from,
      email_subject: emailData.subject,
      email_received_at: emailData.receivedAt,
      description: emailData.subject || "Factură primită via email",
    })
    .select()
    .single();

  if (expenseError || !expense) {
    throw new Error(
      `[email-invoice] Failed to create draft: ${expenseError?.message}`
    );
  }

  // Upload PDF attachments to Storage and create attachment records.
  let attachmentCount = 0;
  const pdfs = (emailData.attachments ?? []).filter(
    (att) =>
      att.contentType === "application/pdf" ||
      att.filename.toLowerCase().endsWith(".pdf")
  );

  for (const att of pdfs) {
    try {
      const fileBuffer = Buffer.from(att.content, "base64");
      if (fileBuffer.length === 0) continue;

      const safeName = att.filename.replace(/[^a-zA-Z0-9.-]/g, "_");
      const filePath = `${teamId}/${expense.id}/${Date.now()}-${safeName}`;

      const { error: uploadError } = await supabaseAdmin.storage
        .from("expense-attachments")
        .upload(filePath, fileBuffer, {
          contentType: "application/pdf",
          upsert: false,
        });

      if (uploadError) {
        console.error("[email-invoice] Storage upload failed:", uploadError);
        continue;
      }

      await supabaseAdmin.from("expense_attachments").insert({
        expense_id: expense.id,
        file_name: att.filename,
        file_path: filePath,
        file_type: "application/pdf",
        file_size: att.size || fileBuffer.length,
        uploaded_by: ownerId,
      });

      attachmentCount++;
    } catch (err) {
      console.error("[email-invoice] Error uploading attachment:", err);
    }
  }

  return { expenseId: expense.id as string, attachmentCount };
}

/**
 * Sends a notification email to all team admins informing them that a new
 * draft expense was created from an inbound email.
 */
export async function notifyTeamAdmins(
  teamId: string,
  companyName: string,
  emailData: Pick<InboundEmailData, "from" | "subject">,
  expenseId: string
): Promise<void> {
  const adminEmails = await getTeamAdminEmails(teamId);
  if (adminEmails.length === 0) return;

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "https://app.bono.ro";
  const expenseUrl = `${baseUrl}/dashboard/${teamId}/expenses/${expenseId}`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL ?? "noreply@bono.ro",
        to: adminEmails,
        subject: `Factură nouă primită — ${emailData.subject || companyName}`,
        html: `
          <div style="font-family:'Inter',Arial,sans-serif;max-width:600px;margin:0 auto;padding:40px 20px;">
            <h2 style="color:#101828;font-size:20px;font-weight:600;margin-bottom:16px;">
              Factură primită via email
            </h2>
            <p style="color:#475467;font-size:15px;margin-bottom:8px;">
              <strong>De la:</strong> ${emailData.from}
            </p>
            <p style="color:#475467;font-size:15px;margin-bottom:8px;">
              <strong>Subiect:</strong> ${emailData.subject || "(fără subiect)"}
            </p>
            <p style="color:#475467;font-size:15px;margin-bottom:24px;">
              O cheltuială <em>Draft</em> a fost creată automat în Bono.
              Deschideți-o pentru a completa detaliile.
            </p>
            <a href="${expenseUrl}"
               style="display:inline-block;background:linear-gradient(180deg,#00D492 0%,#51A2FF 100%);
                      color:white;text-decoration:none;padding:12px 28px;border-radius:9999px;
                      font-weight:500;font-size:14px;">
              Deschide cheltuiala
            </a>
            <p style="color:#98A2B3;font-size:12px;margin-top:32px;">
              Bono · <a href="${expenseUrl}" style="color:#98A2B3;">${expenseUrl}</a>
            </p>
          </div>
        `,
      }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      console.error("[email-invoice] Resend notification failed:", body);
    }
  } catch (err) {
    console.error("[email-invoice] notifyTeamAdmins error:", err);
  }
}
