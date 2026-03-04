import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import {
  createDraftFromEmail,
  getCompanyByInvoiceEmail,
  notifyTeamAdmins,
  type EmailAttachment,
  type InboundEmailData,
} from "@/app/actions/email-invoice";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Verify a Resend/Svix webhook signature.
 *
 * Resend delivers webhooks via Svix. The signed content is:
 *   `${svix-id}.${svix-timestamp}.${rawBody}`
 *
 * The secret in the Resend dashboard is base64-encoded and prefixed with
 * "whsec_".
 */
function verifyResendSignature(
  rawBody: string,
  svixId: string,
  svixTimestamp: string,
  svixSignature: string,
  secret: string
): boolean {
  try {
    const keyBytes = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
    const signed = `${svixId}.${svixTimestamp}.${rawBody}`;
    const computed = crypto
      .createHmac("sha256", keyBytes)
      .update(signed)
      .digest("base64");

    // svixSignature may contain multiple "v1,<base64>" entries separated by spaces
    return svixSignature
      .split(" ")
      .some((sig) => sig.replace(/^v1,/, "") === computed);
  } catch {
    return false;
  }
}

/**
 * Resend inbound-email webhook handler.
 *
 * Resend sends a JSON POST with this shape for email.received events:
 * {
 *   type: "email.received",
 *   data: {
 *     from: "sender@example.com",
 *     to: "facturi-abc123@bono.ro",   // or an array
 *     subject: "Invoice #42",
 *     html: "...",
 *     text: "...",
 *     created_at: "2024-01-01T00:00:00.000Z",
 *     attachments: [
 *       { filename: "invoice.pdf", content: "<base64>", contentType: "application/pdf", size: 12345 }
 *     ]
 *   }
 * }
 *
 * Set RESEND_WEBHOOK_SECRET in your environment to enable signature verification.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const rawBody = await req.text();

  // --- Signature verification (optional but strongly recommended in production)
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
  if (webhookSecret) {
    const svixId = req.headers.get("svix-id") ?? "";
    const svixTimestamp = req.headers.get("svix-timestamp") ?? "";
    const svixSignature = req.headers.get("svix-signature") ?? "";

    if (!svixId || !svixTimestamp || !svixSignature) {
      return NextResponse.json(
        { error: "Missing webhook signature headers" },
        { status: 401 }
      );
    }

    const isValid = verifyResendSignature(
      rawBody,
      svixId,
      svixTimestamp,
      svixSignature,
      webhookSecret
    );

    if (!isValid) {
      console.warn("[email-invoice] Invalid webhook signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  // --- Parse payload
  let event: { type?: string; data?: Record<string, unknown> };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Acknowledge non-email events immediately
  if (event.type !== "email.received") {
    return NextResponse.json({ received: true });
  }

  const d = (event.data ?? {}) as {
    from?: string;
    to?: string | string[];
    subject?: string;
    html?: string;
    text?: string;
    created_at?: string;
    attachments?: Array<{
      filename?: string;
      content?: string;
      contentType?: string;
      size?: number;
    }>;
  };

  // Normalise "to" to an array and strip display names ("Name <addr@domain>")
  const rawTo = Array.isArray(d.to) ? d.to : [d.to ?? ""];
  const toAddresses = rawTo.map((addr) =>
    (addr.match(/<(.+)>$/)?.[1] ?? addr).trim().toLowerCase()
  );

  // --- Match the destination address to a company
  let company: { team_id: string; name: string } | null = null;
  for (const addr of toAddresses) {
    company = await getCompanyByInvoiceEmail(addr);
    if (company) break;
  }

  if (!company) {
    console.log("[email-invoice] No company matched for:", toAddresses);
    // Return 200 so Resend doesn't retry
    return NextResponse.json({ received: true, matched: false });
  }

  // --- Build the email data object
  const emailData: InboundEmailData = {
    from: d.from ?? "",
    to: toAddresses[0] ?? "",
    subject: d.subject ?? "",
    html: d.html,
    text: d.text,
    receivedAt: d.created_at ?? new Date().toISOString(),
    attachments: (d.attachments ?? []).map<EmailAttachment>((att) => ({
      filename: att.filename ?? "attachment.pdf",
      content: att.content ?? "",
      contentType: att.contentType ?? "application/octet-stream",
      size: att.size ?? 0,
    })),
  };

  // --- Create draft expense + upload attachments
  try {
    const { expenseId, attachmentCount } = await createDraftFromEmail(
      company.team_id,
      emailData
    );

    console.log(
      `[email-invoice] Draft created: ${expenseId} (${attachmentCount} attachment(s)) for team ${company.team_id}`
    );

    // Fire-and-forget admin notification — don't block the webhook response
    notifyTeamAdmins(
      company.team_id,
      company.name,
      { from: emailData.from, subject: emailData.subject },
      expenseId
    ).catch((err) =>
      console.error("[email-invoice] Admin notification error:", err)
    );

    return NextResponse.json({ received: true, expenseId, attachmentCount });
  } catch (err) {
    console.error("[email-invoice] Processing error:", err);
    return NextResponse.json(
      { error: "Failed to process email" },
      { status: 500 }
    );
  }
}
