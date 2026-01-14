"use client";

import React, { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { FormattedInput } from "./formatted-input";
import { CustomSelect } from "./custom-select";
import { CategorySelect } from "./category-select";
import { FileUploader, UploadedFile } from "./file-uploader";
import { createExpense, createMultiLineExpense, ExpenseInput, ExpenseLineInput } from "@/app/actions/expenses";
import { uploadAttachment } from "@/app/actions/attachments";
import { formatDateISO } from "@/lib/formatters";

const DOC_TYPES = [
  { value: "factura", label: "Factura" },
  { value: "bon", label: "Bon" },
  { value: "chitanta", label: "Chitanta" },
  { value: "alt_document", label: "Alt document" },
];

const PAYMENT_STATUS = [
  { value: "unpaid", label: "Neplatit" },
  { value: "paid", label: "Platit" },
  { value: "partial", label: "Partial platit" },
];

interface TransactionLine {
  amount: string;
  amountWithoutVat: string;
  vatDeductible: boolean;
  categoryId: string;
  subcategoryId: string;
  description: string;
  accountingPeriod: string;
}

interface Props {
  teamId: string;
  onBack?: () => void;
}

export function ExpenseForm({ teamId, onBack }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Header fields (shared across lines)
  const [supplier, setSupplier] = useState("");
  const [docNumber, setDocNumber] = useState("");
  const [docType, setDocType] = useState("");
  const [expenseDate, setExpenseDate] = useState(formatDateISO(new Date()));
  const [paymentStatus, setPaymentStatus] = useState("unpaid");

  // Transaction lines
  const [lines, setLines] = useState<TransactionLine[]>([
    {
      amount: "",
      amountWithoutVat: "",
      vatDeductible: false,
      categoryId: "",
      subcategoryId: "",
      description: "",
      accountingPeriod: "",
    },
  ]);

  // File attachments
  const [files, setFiles] = useState<UploadedFile[]>([]);

  // Validation errors
  const [errors, setErrors] = useState<{
    supplier?: boolean;
    docNumber?: boolean;
    expenseDate?: boolean;
    lines?: { [key: number]: { amount?: boolean; category?: boolean } };
  }>({});

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.push(`/dashboard/${teamId}/expenses`);
    }
  };

  const updateLine = useCallback((index: number, field: keyof TransactionLine, value: any) => {
    setLines(prevLines => {
      const newLines = [...prevLines];
      newLines[index] = { ...newLines[index], [field]: value };

      // Auto-calculate amount without VAT (19% VAT rate)
      if (field === "amount" && value) {
        const amount = parseFloat(value) || 0;
        const withoutVat = Math.round((amount / 1.19) * 100) / 100;
        newLines[index].amountWithoutVat = withoutVat.toString();
      }

      return newLines;
    });
  }, []);

  const addLine = () => {
    setLines([
      ...lines,
      {
        amount: "",
        amountWithoutVat: "",
        vatDeductible: false,
        categoryId: "",
        subcategoryId: "",
        description: "",
        accountingPeriod: "",
      },
    ]);
  };

  const removeLine = (index: number) => {
    if (lines.length > 1) {
      setLines(lines.filter((_, i) => i !== index));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};

    if (!supplier.trim()) newErrors.supplier = true;
    if (!expenseDate) newErrors.expenseDate = true;

    const lineErrors: { [key: number]: { amount?: boolean; category?: boolean } } = {};
    lines.forEach((line, index) => {
      const errs: { amount?: boolean; category?: boolean } = {};
      if (!line.amount || parseFloat(line.amount) <= 0) errs.amount = true;
      if (!line.categoryId || !line.subcategoryId) errs.category = true;
      if (errs.amount || errs.category) lineErrors[index] = errs;
    });

    if (Object.keys(lineErrors).length > 0) {
      newErrors.lines = lineErrors;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (asDraft: boolean = true) => {
    if (!validateForm()) {
      setError("Please fill in all required fields");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const baseInput: ExpenseInput = {
        teamId,
        amount: 0, // Will be set per line
        supplier,
        docNumber: docNumber || undefined,
        docType: docType || undefined,
        paymentStatus,
        expenseDate,
        status: asDraft ? "draft" : "pending",
      };

      let createdExpenseId: string;

      if (lines.length === 1) {
        // Single line expense
        const line = lines[0];
        const expense = await createExpense({
          ...baseInput,
          amount: parseFloat(line.amount) || 0,
          amountWithoutVat: parseFloat(line.amountWithoutVat) || undefined,
          vatDeductible: line.vatDeductible,
          categoryId: line.categoryId || undefined,
          subcategoryId: line.subcategoryId || undefined,
          description: line.description || undefined,
          accountingPeriod: line.accountingPeriod || undefined,
        });
        createdExpenseId = expense.id;
      } else {
        // Multi-line expense
        const lineInputs: ExpenseLineInput[] = lines.map((line) => ({
          amount: parseFloat(line.amount) || 0,
          amountWithoutVat: parseFloat(line.amountWithoutVat) || undefined,
          vatDeductible: line.vatDeductible,
          categoryId: line.categoryId || undefined,
          subcategoryId: line.subcategoryId || undefined,
          description: line.description || undefined,
          accountingPeriod: line.accountingPeriod || undefined,
        }));

        const expenses = await createMultiLineExpense(baseInput, lineInputs);
        createdExpenseId = expenses[0]?.id;
      }

      // Upload attachments if any
      if (files.length > 0 && createdExpenseId) {
        for (const file of files) {
          try {
            await uploadAttachment(createdExpenseId, teamId, {
              name: file.name,
              type: file.type,
              size: file.size,
              base64: file.base64,
            });
          } catch (uploadErr) {
            console.error("Failed to upload attachment:", uploadErr);
            // Continue with other files even if one fails
          }
        }
      }

      router.push(`/dashboard/${teamId}/expenses`);
    } catch (err: any) {
      console.error("Failed to create expense:", err);
      setError(err.message || "Failed to create expense");
    } finally {
      setLoading(false);
    }
  };

  const totalAmount = lines.reduce((sum, line) => sum + (parseFloat(line.amount) || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
            className="p-2 hover:bg-gray-100 rounded-md"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-xl font-bold">New Expense</h2>
            <p className="text-sm text-muted-foreground">
              {lines.length > 1 ? `${lines.length} lines` : "Single line"} • Total: {totalAmount.toLocaleString()} RON
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Document Info */}
      <div className="rounded-lg border bg-white/50 dark:bg-black/30 p-4 space-y-4">
        <h3 className="font-semibold">Document Information</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <FormattedInput
            label="Supplier"
            value={supplier}
            onChange={setSupplier}
            placeholder="e.g., Enel, Orange"
            hasError={errors.supplier}
            required
          />
          
          <FormattedInput
            label="Document Number"
            value={docNumber}
            onChange={setDocNumber}
            placeholder="e.g., INV-12345"
          />

          <div>
            <label className="block text-sm font-medium mb-1">Document Type</label>
            <CustomSelect
              value={docType}
              onChange={setDocType}
              options={DOC_TYPES}
              placeholder="Select type"
            />
          </div>

          <FormattedInput
            label="Date"
            type="date"
            value={expenseDate}
            onChange={setExpenseDate}
            hasError={errors.expenseDate}
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Payment Status</label>
            <CustomSelect
              value={paymentStatus}
              onChange={setPaymentStatus}
              options={PAYMENT_STATUS}
            />
          </div>
        </div>
      </div>

      {/* Transaction Lines */}
      <div className="rounded-lg border bg-white/50 dark:bg-black/30 p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Transaction Lines</h3>
          <button
            type="button"
            onClick={addLine}
            className="flex items-center gap-1 text-sm text-teal-600 hover:text-teal-700"
          >
            <Plus size={16} />
            Add Line
          </button>
        </div>

        {lines.map((line, index) => (
          <div
            key={index}
            className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-800/50 space-y-4"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">
                Line {index + 1}
              </span>
              {lines.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeLine(index)}
                  className="p-1 text-red-500 hover:bg-red-50 rounded"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormattedInput
                label="Amount (with VAT)"
                type="number"
                value={line.amount}
                onChange={(v) => updateLine(index, "amount", v)}
                placeholder="0.00"
                hasError={errors.lines?.[index]?.amount}
                required
              />

              <FormattedInput
                label="Amount (without VAT)"
                type="number"
                value={line.amountWithoutVat}
                onChange={(v) => updateLine(index, "amountWithoutVat", v)}
                placeholder="Auto-calculated"
                disabled
              />

              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={line.vatDeductible}
                    onChange={(e) => updateLine(index, "vatDeductible", e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm">VAT Deductible</span>
                </label>
              </div>
            </div>

            <CategorySelect
              teamId={teamId}
              categoryId={line.categoryId}
              subcategoryId={line.subcategoryId}
              onCategoryChange={(v) => updateLine(index, "categoryId", v)}
              onSubcategoryChange={(v) => updateLine(index, "subcategoryId", v)}
              hasError={errors.lines?.[index]?.category}
            />

            <FormattedInput
              label="Description"
              value={line.description}
              onChange={(v) => updateLine(index, "description", v)}
              placeholder="What is this expense for?"
            />
          </div>
        ))}
      </div>

      {/* Attachments */}
      <div className="rounded-lg border bg-white/50 dark:bg-black/30 p-4 space-y-4">
        <h3 className="font-semibold">Attachments</h3>
        <FileUploader
          files={files}
          onFilesChange={setFiles}
          maxFiles={5}
          maxSizeMB={10}
          disabled={loading}
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => handleSubmit(true)}
          disabled={loading}
          className="rounded-md bg-gray-600 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
        >
          {loading ? "Saving..." : "Save as Draft"}
        </button>
        <button
          type="button"
          onClick={() => handleSubmit(false)}
          disabled={loading}
          className="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
        >
          {loading ? "Submitting..." : "Submit for Approval"}
        </button>
        <button
          type="button"
          onClick={handleBack}
          className="rounded-md border px-4 py-2 text-sm"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
