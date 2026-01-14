"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { getExpense, updateExpense, TeamExpense } from "@/app/actions/expenses";
import { FormattedInput } from "@/components/expenses/formatted-input";
import { CustomSelect } from "@/components/expenses/custom-select";
import { CategorySelect } from "@/components/expenses/category-select";
import { canEditExpense } from "@/app/actions/permissions";
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

export default function EditExpensePage() {
  const params = useParams<{ teamId: string; id: string }>();
  const router = useRouter();

  const [expense, setExpense] = useState<TeamExpense | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canEdit, setCanEdit] = useState(false);

  // Form state
  const [supplier, setSupplier] = useState("");
  const [docNumber, setDocNumber] = useState("");
  const [docType, setDocType] = useState("");
  const [expenseDate, setExpenseDate] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("unpaid");
  const [amount, setAmount] = useState("");
  const [amountWithoutVat, setAmountWithoutVat] = useState("");
  const [vatDeductible, setVatDeductible] = useState(false);
  const [categoryId, setCategoryId] = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    loadExpense();
  }, [params.id, params.teamId]);

  const loadExpense = async () => {
    if (!params.id || !params.teamId) return;

    setLoading(true);
    try {
      const data = await getExpense(params.id);
      if (!data) {
        setError("Expense not found");
        return;
      }

      // Check if user can edit
      const canEditResult = await canEditExpense(params.teamId, data.user_id, data.status);
      setCanEdit(canEditResult);

      if (!canEditResult) {
        setError("You don't have permission to edit this expense");
        return;
      }

      setExpense(data);

      // Populate form
      setSupplier(data.supplier || "");
      setDocNumber(data.doc_number || "");
      setDocType(data.doc_type || "");
      setExpenseDate(data.expense_date || formatDateISO(new Date()));
      setPaymentStatus(data.payment_status || "unpaid");
      setAmount(data.amount?.toString() || "");
      setAmountWithoutVat(data.amount_without_vat?.toString() || "");
      setVatDeductible(data.vat_deductible || false);
      setCategoryId(data.category_id || "");
      setSubcategoryId(data.subcategory_id || "");
      setDescription(data.description || "");
    } catch (err) {
      console.error("Failed to load expense:", err);
      setError("Failed to load expense");
    } finally {
      setLoading(false);
    }
  };

  const handleAmountChange = (value: string) => {
    setAmount(value);
    // Auto-calculate without VAT (19%)
    const num = parseFloat(value) || 0;
    const withoutVat = Math.round((num / 1.19) * 100) / 100;
    setAmountWithoutVat(withoutVat.toString());
  };

  const handleSave = async () => {
    if (!expense) return;

    setSaving(true);
    setError(null);

    try {
      await updateExpense(params.id, params.teamId, {
        supplier: supplier || undefined,
        docNumber: docNumber || undefined,
        docType: docType || undefined,
        expenseDate: expenseDate || undefined,
        paymentStatus: paymentStatus || undefined,
        amount: parseFloat(amount) || undefined,
        amountWithoutVat: parseFloat(amountWithoutVat) || undefined,
        vatDeductible,
        categoryId: categoryId || undefined,
        subcategoryId: subcategoryId || undefined,
        description: description || undefined,
      });

      router.push(`/dashboard/${params.teamId}/expenses/${params.id}`);
    } catch (err: any) {
      console.error("Failed to save expense:", err);
      setError(err.message || "Failed to save expense");
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    router.push(`/dashboard/${params.teamId}/expenses/${params.id}`);
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <Loader2 size={24} className="animate-spin mx-auto mb-2" />
        Loading expense...
      </div>
    );
  }

  if (!canEdit || !expense) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600 mb-4">{error || "Cannot edit this expense"}</p>
        <button onClick={handleBack} className="text-teal-600 hover:underline">
          Back to expense
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={handleBack} className="p-2 hover:bg-gray-100 rounded-md">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-xl font-bold">Edit Expense</h2>
          <p className="text-sm text-muted-foreground">
            {expense.expense_uid || expense.id.slice(0, 8)}
          </p>
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

      {/* Financial Details */}
      <div className="rounded-lg border bg-white/50 dark:bg-black/30 p-4 space-y-4">
        <h3 className="font-semibold">Financial Details</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormattedInput
            label="Amount (with VAT)"
            type="number"
            value={amount}
            onChange={handleAmountChange}
            placeholder="0.00"
            required
          />

          <FormattedInput
            label="Amount (without VAT)"
            type="number"
            value={amountWithoutVat}
            onChange={setAmountWithoutVat}
            placeholder="Auto-calculated"
          />

          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={vatDeductible}
                onChange={(e) => setVatDeductible(e.target.checked)}
                className="rounded border-gray-300"
              />
              <span className="text-sm">VAT Deductible</span>
            </label>
          </div>
        </div>

        <CategorySelect
          teamId={params.teamId}
          categoryId={categoryId}
          subcategoryId={subcategoryId}
          onCategoryChange={setCategoryId}
          onSubcategoryChange={setSubcategoryId}
        />

        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What is this expense for?"
            className="w-full rounded-md border px-3 py-2 text-sm"
            rows={3}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
        <button
          onClick={handleBack}
          className="rounded-md border px-4 py-2 text-sm"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
