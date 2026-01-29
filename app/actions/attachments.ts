"use server";

import { supabase, supabaseAdmin } from "@/lib/supabase";
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

  // Validate base64 data
  if (!file.base64 || file.base64.trim() === "") {
    console.error("Empty base64 data received for file:", file.name);
    throw new Error("Empty file content");
  }

  // Generate unique file path
  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
  const filePath = `${teamId}/${expenseId}/${timestamp}-${safeName}`;

  // Decode base64 and upload to storage
  let fileBuffer: Buffer;
  try {
    fileBuffer = Buffer.from(file.base64, "base64");
    if (fileBuffer.length === 0) {
      throw new Error("Decoded buffer is empty");
    }
  } catch (decodeError) {
    console.error("Failed to decode base64:", decodeError);
    throw new Error("Invalid file encoding");
  }

  // Check file size (10MB limit)
  if (fileBuffer.length > 10 * 1024 * 1024) {
    throw new Error("File too large. Maximum size is 10MB.");
  }

  console.log(`Uploading file: ${file.name}, size: ${fileBuffer.length} bytes, type: ${file.type}, path: ${filePath}`);
  
  const { error: uploadError } = await supabaseAdmin.storage
    .from("expense-attachments")
    .upload(filePath, fileBuffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    console.error("Failed to upload file to storage:", uploadError);
    throw new Error(`Storage upload failed: ${uploadError.message}`);
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
  const { error: storageError } = await supabaseAdmin.storage
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
  const { data, error } = await supabaseAdmin.storage
    .from("expense-attachments")
    .createSignedUrl(filePath, 3600); // 1 hour expiry

  if (error) {
    console.error("Failed to create signed URL", error);
    console.error("File path:", filePath);
    // Common errors:
    // - "Object not found" - file was deleted or path is wrong
    // - "Not found" - file doesn't exist
    // - "Invalid API key" - service role key issue
    if (error.message?.includes("not found") || error.message?.includes("Not found")) {
      throw new Error(`File not found in storage: ${filePath}`);
    }
    throw new Error(`Failed to create signed URL: ${error.message}`);
  }

  if (!data?.signedUrl) {
    throw new Error("Signed URL was not returned from storage");
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
