"use server";

import { supabase } from "@/lib/supabase";
import { stackServerApp } from "@/stack";

export interface ExpenseAttachment {
  id: string;
  expense_id: string;
  file_name: string;
  file_path: string;
  file_type: string | null;
  file_size: number | null;
  uploaded_by: string;
  created_at: string;
}

// Get attachments for an expense
export async function getExpenseAttachments(expenseId: string): Promise<ExpenseAttachment[]> {
  const { data, error } = await supabase
    .from("expense_attachments")
    .select("*")
    .eq("expense_id", expenseId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Failed to fetch attachments", error);
    return [];
  }

  return data || [];
}

// Upload attachment to Supabase Storage and create record
export async function uploadAttachment(
  expenseId: string,
  teamId: string,
  file: {
    name: string;
    type: string;
    size: number;
    base64: string; // Base64 encoded file content
  }
): Promise<ExpenseAttachment> {
  const user = await stackServerApp.getUser();
  if (!user) {
    throw new Error("No user in session");
  }

  // Generate unique file path
  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
  const filePath = `${teamId}/${expenseId}/${timestamp}-${safeName}`;

  // Decode base64 and upload to storage
  const fileBuffer = Buffer.from(file.base64, "base64");
  
  const { error: uploadError } = await supabase.storage
    .from("expense-attachments")
    .upload(filePath, fileBuffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    console.error("Failed to upload file to storage", uploadError);
    throw new Error(uploadError.message);
  }

  // Create attachment record
  const { data, error } = await supabase
    .from("expense_attachments")
    .insert({
      expense_id: expenseId,
      file_name: file.name,
      file_path: filePath,
      file_type: file.type,
      file_size: file.size,
      uploaded_by: user.id,
    })
    .select()
    .single();

  if (error) {
    console.error("Failed to create attachment record", error);
    // Try to clean up uploaded file
    await supabase.storage.from("expense-attachments").remove([filePath]);
    throw new Error(error.message);
  }

  return data;
}

// Delete attachment
export async function deleteAttachment(attachmentId: string): Promise<void> {
  const user = await stackServerApp.getUser();
  if (!user) {
    throw new Error("No user in session");
  }

  // Get attachment to find file path
  const { data: attachment, error: fetchError } = await supabase
    .from("expense_attachments")
    .select("*")
    .eq("id", attachmentId)
    .single();

  if (fetchError || !attachment) {
    throw new Error("Attachment not found");
  }

  // Delete from storage
  const { error: storageError } = await supabase.storage
    .from("expense-attachments")
    .remove([attachment.file_path]);

  if (storageError) {
    console.error("Failed to delete file from storage", storageError);
    // Continue anyway to delete record
  }

  // Delete record
  const { error } = await supabase
    .from("expense_attachments")
    .delete()
    .eq("id", attachmentId);

  if (error) {
    console.error("Failed to delete attachment record", error);
    throw new Error(error.message);
  }
}

// Get signed URL for viewing/downloading attachment
export async function getAttachmentUrl(filePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from("expense-attachments")
    .createSignedUrl(filePath, 3600); // 1 hour expiry

  if (error) {
    console.error("Failed to create signed URL", error);
    throw new Error(error.message);
  }

  return data.signedUrl;
}

// Get multiple signed URLs
export async function getAttachmentUrls(
  attachments: ExpenseAttachment[]
): Promise<Map<string, string>> {
  const urls = new Map<string, string>();

  for (const attachment of attachments) {
    try {
      const url = await getAttachmentUrl(attachment.file_path);
      urls.set(attachment.id, url);
    } catch (err) {
      console.error(`Failed to get URL for ${attachment.id}`, err);
    }
  }

  return urls;
}
