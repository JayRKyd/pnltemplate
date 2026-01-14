"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Edit, Trash2, Check, X, Clock } from "lucide-react";
import {
  getExpense,
  deleteExpense,
  submitForApproval,
  approveExpense,
  rejectExpense,
  markAsPaid,
  TeamExpense,
} from "@/app/actions/expenses";
import { ExpenseStatusBadge } from "@/components/expenses/expense-status-badge";
import { AttachmentGallery } from "@/components/expenses/attachment-gallery";
import { formatAmount, formatDate } from "@/lib/formatters";
import { getUserPermissions, UserPermissions } from "@/app/actions/permissions";

export default function ExpenseDetailPage() {
  const params = useParams<{ teamId: string; id: string }>();
  const router = useRouter();
  const [expense, setExpense] = useState<TeamExpense | null>(null);
  const [permissions, setPermissions] = useState<UserPermissions | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);

  useEffect(() => {
    if (params.id && params.teamId) {
      setLoading(true);
      Promise.all([
        getExpense(params.id),
        getUserPermissions(params.teamId),
      ])
        .then(([expenseData, perms]) => {
          setExpense(expenseData);
          setPermissions(perms);
          setError(null);
        })
        .catch((err) => {
          console.error("Failed to fetch expense:", err);
          setError("Failed to load expense");
        })
        .finally(() => setLoading(false));
    }
  }, [params.id, params.teamId]);

  const handleBack = () => {
    router.push(`/dashboard/${params.teamId}/expenses`);
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this expense?")) return;

    setActionLoading(true);
    try {
      await deleteExpense(params.id, params.teamId);
      router.push(`/dashboard/${params.teamId}/expenses`);
    } catch (err: any) {
      setError(err.message || "Failed to delete expense");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitForApproval = async () => {
    setActionLoading(true);
    try {
      const updated = await submitForApproval(params.id, params.teamId);
      setExpense(updated);
    } catch (err: any) {
      setError(err.message || "Failed to submit for approval");
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = async () => {
    setActionLoading(true);
    try {
      const updated = await approveExpense(params.id, params.teamId);
      setExpense(updated);
    } catch (err: any) {
      setError(err.message || "Failed to approve expense");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      setError("Please provide a reason for rejection");
      return;
    }
    setActionLoading(true);
    try {
      const updated = await rejectExpense(params.id, params.teamId, rejectReason);
      setExpense(updated);
      setShowRejectModal(false);
      setRejectReason("");
    } catch (err: any) {
      setError(err.message || "Failed to reject expense");
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkPaid = async () => {
    setActionLoading(true);
    try {
      const updated = await markAsPaid(params.id, params.teamId);
      setExpense(updated);
    } catch (err: any) {
      setError(err.message || "Failed to mark as paid");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-muted-foreground">Loading...</div>
    );
  }

  if (!expense) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground mb-4">Expense not found</p>
        <button onClick={handleBack} className="text-teal-600 hover:underline">
          Back to expenses
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={handleBack} className="p-2 hover:bg-gray-100 rounded-md">
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold">
                {expense.expense_uid || `Expense ${expense.id.slice(0, 8)}`}
              </h2>
              <ExpenseStatusBadge status={expense.status} />
            </div>
            <p className="text-sm text-muted-foreground">
              Created {formatDate(expense.created_at)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {expense.status === "draft" && (
            <>
              <button
                onClick={() => router.push(`/dashboard/${params.teamId}/expenses/${params.id}/edit`)}
                className="flex items-center gap-1 rounded-md border px-3 py-2 text-sm hover:bg-gray-50"
              >
                <Edit size={16} />
                Edit
              </button>
              <button
                onClick={handleDelete}
                disabled={actionLoading}
                className="flex items-center gap-1 rounded-md border border-red-200 text-red-600 px-3 py-2 text-sm hover:bg-red-50"
              >
                <Trash2 size={16} />
                Delete
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-lg border bg-white/50 dark:bg-black/30 p-6 space-y-4">
          <h3 className="font-semibold">Document Information</h3>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-muted-foreground">Supplier</dt>
              <dd className="font-medium">{expense.supplier || "-"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Document Number</dt>
              <dd className="font-medium">{expense.doc_number || "-"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Document Type</dt>
              <dd className="font-medium capitalize">{expense.doc_type || "-"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Date</dt>
              <dd className="font-medium">{expense.expense_date}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Payment Status</dt>
              <dd className="font-medium capitalize">{expense.payment_status || "unpaid"}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-lg border bg-white/50 dark:bg-black/30 p-6 space-y-4">
          <h3 className="font-semibold">Financial Details</h3>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-muted-foreground">Amount (with VAT)</dt>
              <dd className="text-xl font-bold">{formatAmount(expense.amount)} RON</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Amount (without VAT)</dt>
              <dd className="font-medium">
                {expense.amount_without_vat ? formatAmount(expense.amount_without_vat) : "-"} RON
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">VAT Deductible</dt>
              <dd className="font-medium">{expense.vat_deductible ? "Yes" : "No"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Accounting Period</dt>
              <dd className="font-medium">{expense.accounting_period || "-"}</dd>
            </div>
          </dl>
        </div>

        <div className="lg:col-span-2 rounded-lg border bg-white/50 dark:bg-black/30 p-6 space-y-4">
          <h3 className="font-semibold">Description</h3>
          <p className="text-sm">{expense.description || "No description provided"}</p>
        </div>

        {expense.rejection_reason && (
          <div className="lg:col-span-2 rounded-lg border border-red-200 bg-red-50 p-6 space-y-2">
            <h3 className="font-semibold text-red-700">Rejection Reason</h3>
            <p className="text-sm text-red-600">{expense.rejection_reason}</p>
          </div>
        )}

        {/* Attachments */}
        <div className="lg:col-span-2 rounded-lg border bg-white/50 dark:bg-black/30 p-6 space-y-4">
          <h3 className="font-semibold">Attachments</h3>
          <AttachmentGallery
            expenseId={expense.id}
            canDelete={expense.status === "draft"}
          />
        </div>
      </div>

      {/* Workflow Actions */}
      <div className="rounded-lg border bg-white/50 dark:bg-black/30 p-6">
        <h3 className="font-semibold mb-4">Actions</h3>
        <div className="flex flex-wrap gap-3">
          {expense.status === "draft" && permissions?.canSubmitForApproval && (
            <button
              onClick={handleSubmitForApproval}
              disabled={actionLoading}
              className="flex items-center gap-2 rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
            >
              <Clock size={16} />
              Submit for Approval
            </button>
          )}

          {expense.status === "pending" && permissions?.canApprove && (
            <>
              <button
                onClick={handleApprove}
                disabled={actionLoading}
                className="flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                <Check size={16} />
                Approve
              </button>
              <button
                onClick={() => setShowRejectModal(true)}
                disabled={actionLoading}
                className="flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                <X size={16} />
                Reject
              </button>
            </>
          )}

          {expense.status === "pending" && !permissions?.canApprove && (
            <p className="text-sm text-muted-foreground">
              Awaiting approval from an approver or admin.
            </p>
          )}

          {expense.status === "approved" && permissions?.canMarkPaid && (
            <button
              onClick={handleMarkPaid}
              disabled={actionLoading}
              className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              <Check size={16} />
              Mark as Paid
            </button>
          )}

          {expense.status === "approved" && !permissions?.canMarkPaid && (
            <p className="text-sm text-green-600 font-medium">
              ✓ Approved - awaiting payment processing
            </p>
          )}

          {expense.status === "rejected" && (
            <p className="text-sm text-muted-foreground">
              This expense was rejected. Edit and resubmit to continue the workflow.
            </p>
          )}

          {expense.status === "paid" && (
            <p className="text-sm text-green-600 font-medium">
              ✓ This expense has been paid
            </p>
          )}
        </div>

        {permissions && (
          <p className="text-xs text-muted-foreground mt-4">
            Your role: <span className="font-medium capitalize">{permissions.role}</span>
          </p>
        )}
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 space-y-4">
            <h3 className="text-lg font-semibold">Reject Expense</h3>
            <p className="text-sm text-muted-foreground">
              Please provide a reason for rejecting this expense.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Rejection reason..."
              className="w-full rounded-md border px-3 py-2 text-sm"
              rows={3}
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectReason("");
                }}
                className="rounded-md border px-4 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={actionLoading || !rejectReason.trim()}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
