"use client";

import React, { useState, useEffect, useCallback } from "react";
import { File, FileText, Image as ImageIcon, Download, Trash2, X, Loader2 } from "lucide-react";
import {
  getExpenseAttachments,
  getAttachmentUrl,
  deleteAttachment,
  ExpenseAttachment,
} from "@/app/actions/attachments";

interface Props {
  expenseId: string;
  canDelete?: boolean;
  onAttachmentDeleted?: () => void;
}

export function AttachmentGallery({ expenseId, canDelete = false, onAttachmentDeleted }: Props) {
  const [attachments, setAttachments] = useState<ExpenseAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [urls, setUrls] = useState<Map<string, string>>(new Map());
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const loadAttachments = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getExpenseAttachments(expenseId);
      setAttachments(data);

      // Load signed URLs for each attachment
      const urlMap = new Map<string, string>();
      for (const att of data) {
        try {
          const url = await getAttachmentUrl(att.file_path);
          urlMap.set(att.id, url);
        } catch (err) {
          console.error("Failed to get URL for", att.id, err);
        }
      }
      setUrls(urlMap);
    } catch (err) {
      console.error("Failed to load attachments:", err);
    } finally {
      setLoading(false);
    }
  }, [expenseId]);

  useEffect(() => {
    loadAttachments();
  }, [loadAttachments]);

  const handleDelete = async (attachmentId: string) => {
    if (!confirm("Delete this attachment?")) return;

    setDeleting(attachmentId);
    try {
      await deleteAttachment(attachmentId);
      setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
      onAttachmentDeleted?.();
    } catch (err) {
      console.error("Failed to delete attachment:", err);
    } finally {
      setDeleting(null);
    }
  };

  const openPreview = (attachment: ExpenseAttachment) => {
    const url = urls.get(attachment.id);
    if (url) {
      setPreviewUrl(url);
      setPreviewType(attachment.file_type);
    }
  };

  const getFileIcon = (type: string | null) => {
    if (type?.startsWith("image/")) return <ImageIcon size={24} className="text-blue-500" />;
    if (type === "application/pdf") return <FileText size={24} className="text-red-500" />;
    return <File size={24} className="text-gray-500" />;
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "-";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 size={16} className="animate-spin" />
        Loading attachments...
      </div>
    );
  }

  if (attachments.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No attachments</p>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {attachments.map((attachment) => {
          const url = urls.get(attachment.id);
          const isImage = attachment.file_type?.startsWith("image/");

          return (
            <div
              key={attachment.id}
              className="relative group border rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-800/50"
            >
              {/* Preview thumbnail or icon */}
              <div
                className="aspect-video flex items-center justify-center cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
                onClick={() => openPreview(attachment)}
              >
                {isImage && url ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={url}
                    alt={attachment.file_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="p-4">
                    {getFileIcon(attachment.file_type)}
                  </div>
                )}
              </div>

              {/* Info bar */}
              <div className="p-2 border-t bg-white dark:bg-gray-800">
                <p className="text-xs font-medium truncate" title={attachment.file_name}>
                  {attachment.file_name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(attachment.file_size)}
                </p>
              </div>

              {/* Actions */}
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {url && (
                  <a
                    href={url}
                    download={attachment.file_name}
                    className="p-1.5 bg-white rounded shadow hover:bg-gray-100"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Download size={14} />
                  </a>
                )}
                {canDelete && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(attachment.id);
                    }}
                    disabled={deleting === attachment.id}
                    className="p-1.5 bg-white rounded shadow hover:bg-red-50 text-red-500 disabled:opacity-50"
                  >
                    {deleting === attachment.id ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Trash2 size={14} />
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Preview Modal */}
      {previewUrl && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setPreviewUrl(null)}
        >
          <button
            className="absolute top-4 right-4 p-2 bg-white rounded-full hover:bg-gray-100"
            onClick={() => setPreviewUrl(null)}
          >
            <X size={20} />
          </button>

          <div
            className="max-w-4xl max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {previewType?.startsWith("image/") ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={previewUrl} alt="Preview" className="max-w-full h-auto" />
            ) : previewType === "application/pdf" ? (
              <iframe
                src={previewUrl}
                className="w-[800px] h-[600px] bg-white"
                title="PDF Preview"
              />
            ) : (
              <div className="p-8 bg-white rounded-lg text-center">
                <p>Preview not available</p>
                <a
                  href={previewUrl}
                  download
                  className="text-teal-600 hover:underline mt-2 inline-block"
                >
                  Download file
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
