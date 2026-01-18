"use client";

import React, { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X, Upload, ChevronDown, Plus, Check } from "lucide-react";
import { createExpense, createMultiLineExpense, submitForApproval, ExpenseInput, ExpenseLineInput } from "@/app/actions/expenses";
import { uploadAttachment } from "@/app/actions/attachments";
import { CalendarModal } from "@/components/ui/calendar-modal";
import { MonthYearPicker } from "@/components/ui/month-year-picker";
import { getCategoryTree, CategoryWithChildren } from "@/app/actions/categories";

const DOC_TYPES = ["Factura", "Bon", "Chitanta", "Alt document"];
const PAYMENT_STATUS = ["Platit", "Neplatit", "Partial"];
const TVA_DEDUCTIBIL_OPTIONS = ["Nu", "Da"];

interface TransactionLine {
  descriere: string;
  sumaCuTVA: string;
  sumaFaraTVA: string;
  tva: string;
  cotaTVA: string;
  lunaP: string;
  categoryId: string;
  subcategoryId: string;
  tvaDeductibil: string;
  tags: string;
}

interface Props {
  teamId: string;
  onBack?: () => void;
}

// Format number with Romanian locale (comma as decimal separator)
function formatAmount(value: string): string {
  const num = parseFloat(value.replace(",", ".")) || 0;
  return num.toLocaleString("ro-RO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Parse Romanian formatted number back to standard
function parseAmount(value: string): number {
  return parseFloat(value.replace(/\./g, "").replace(",", ".")) || 0;
}

// Calculate VAT values
function calculateVATValues(sumaCuTVA: string) {
  const total = parseAmount(sumaCuTVA);
  const sumaFaraTVA = total / 1.19;
  const tva = total - sumaFaraTVA;
  const cotaTVA = total > 0 ? ((tva / sumaFaraTVA) * 100) : 0;
  
  return {
    sumaFaraTVA: formatAmount(sumaFaraTVA.toFixed(2)),
    tva: formatAmount(tva.toFixed(2)),
    cotaTVA: cotaTVA.toFixed(2) + "%",
  };
}

// Convert "noiembrie 2025" to "2025-11" for accountingPeriod
function convertToAccountingPeriod(lunaP: string): string {
  const monthMap: Record<string, string> = {
    ianuarie: "01", februarie: "02", martie: "03", aprilie: "04",
    mai: "05", iunie: "06", iulie: "07", august: "08",
    septembrie: "09", octombrie: "10", noiembrie: "11", decembrie: "12",
  };
  const parts = lunaP.toLowerCase().split(" ");
  if (parts.length !== 2) return "";
  const month = monthMap[parts[0]] || "";
  const year = parts[1];
  return month && year ? `${year}-${month}` : "";
}

export function NewExpenseForm({ teamId, onBack }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Header fields
  const [furnizor, setFurnizor] = useState("");
  const [docType, setDocType] = useState("Factura");
  const [nrDoc, setNrDoc] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [plata, setPlata] = useState("Platit");
  
  // Document upload
  const [uploadedFile, setUploadedFile] = useState<{ name: string; preview: string; type: string; size: number } | null>(null);
  
  // Dropdown states
  const [showDocTypeDropdown, setShowDocTypeDropdown] = useState(false);
  const [showPlataDropdown, setShowPlataDropdown] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Success modal and validation
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [validationError, setValidationError] = useState("");

  // Categories from database
  const [categories, setCategories] = useState<CategoryWithChildren[]>([]);

  // Fetch categories on mount
  useEffect(() => {
    async function loadCategories() {
      const cats = await getCategoryTree(teamId);
      setCategories(cats);
    }
    loadCategories();
  }, [teamId]);

  // Helper to get subcategories for a selected parent category
  const getSubcategoriesForCategory = (categoryId: string): CategoryWithChildren[] => {
    const parent = categories.find(c => c.id === categoryId);
    return parent?.children || [];
  };

  // Transaction lines
  const [lines, setLines] = useState<TransactionLine[]>([
    {
      descriere: "",
      sumaCuTVA: "6.500,00",
      sumaFaraTVA: "5.430,00",
      tva: "1.070,00",
      cotaTVA: "19.71%",
      lunaP: "noiembrie 2025",
      categoryId: "",
      subcategoryId: "",
      tvaDeductibil: "Nu",
      tags: "",
    },
  ]);

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.push(`/dashboard/${teamId}/expenses`);
    }
  };

  const formatDateDisplay = (date: Date) => {
    const day = date.getDate().toString().padStart(2, "0");
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = months[date.getMonth()];
    const year = date.getFullYear().toString().slice(-2);
    return `${day}-${month}-${year}`;
  };

  const updateLine = useCallback((index: number, field: keyof TransactionLine, value: string) => {
    setLines(prevLines => {
      const newLines = [...prevLines];
      newLines[index] = { ...newLines[index], [field]: value };

      // Auto-calculate VAT values when sumaCuTVA changes
      if (field === "sumaCuTVA") {
        const calculated = calculateVATValues(value);
        newLines[index].sumaFaraTVA = calculated.sumaFaraTVA;
        newLines[index].tva = calculated.tva;
        newLines[index].cotaTVA = calculated.cotaTVA;
      }

      return newLines;
    });
  }, []);

  const addLine = () => {
    setLines([
      ...lines,
      {
        descriere: "",
        sumaCuTVA: "0,00",
        sumaFaraTVA: "0,00",
        tva: "0,00",
        cotaTVA: "0,00%",
        lunaP: "noiembrie 2025",
        categoryId: "",
        subcategoryId: "",
        tvaDeductibil: "Nu",
        tags: "",
      },
    ]);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setUploadedFile({
          name: file.name,
          preview: event.target?.result as string,
          type: file.type,
          size: file.size,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    // Validation
    setValidationError("");
    if (!furnizor.trim()) {
      setValidationError("Furnizorul este obligatoriu");
      return;
    }

    setLoading(true);
    try {
      // Convert to API format and save
      const baseInput: ExpenseInput = {
        teamId,
        amount: parseAmount(lines[0].sumaCuTVA),
        amountWithVat: parseAmount(lines[0].sumaCuTVA),
        amountWithoutVat: parseAmount(lines[0].sumaFaraTVA),
        vatRate: parseFloat(lines[0].cotaTVA.replace("%", "").replace(",", ".")),
        vatDeductible: lines[0].tvaDeductibil === "Da",
        supplier: furnizor,
        description: lines[0].descriere,
        docNumber: nrDoc,
        docType: docType.toLowerCase(),
        paymentStatus: plata.toLowerCase() === "platit" ? "paid" : "unpaid",
        expenseDate: selectedDate.toISOString().split("T")[0],
        tags: lines[0].tags ? lines[0].tags.split(",").map(t => t.trim()) : undefined,
        categoryId: lines[0].categoryId || undefined,
        subcategoryId: lines[0].subcategoryId || undefined,
        accountingPeriod: convertToAccountingPeriod(lines[0].lunaP) || undefined,
        status: "draft",
      };

      let expenseId: string;
      
      if (lines.length === 1) {
        const result = await createExpense(baseInput);
        expenseId = result.id;
      } else {
        const lineInputs: ExpenseLineInput[] = lines.map(line => ({
          amount: parseAmount(line.sumaCuTVA),
          amountWithVat: parseAmount(line.sumaCuTVA),
          amountWithoutVat: parseAmount(line.sumaFaraTVA),
          vatRate: parseFloat(line.cotaTVA.replace("%", "").replace(",", ".")),
          vatDeductible: line.tvaDeductibil === "Da",
          description: line.descriere,
          categoryId: line.categoryId || undefined,
          subcategoryId: line.subcategoryId || undefined,
          accountingPeriod: convertToAccountingPeriod(line.lunaP) || undefined,
        }));
        const results = await createMultiLineExpense(baseInput, lineInputs);
        expenseId = results[0].id;
      }

      // Upload attachment if file was selected
      if (uploadedFile) {
        const base64Data = uploadedFile.preview.split(",")[1]; // Remove data:type;base64, prefix
        await uploadAttachment(expenseId, teamId, {
          name: uploadedFile.name,
          type: uploadedFile.type,
          size: uploadedFile.size,
          base64: base64Data,
        });
      }

      // Submit for approval
      await submitForApproval(expenseId, teamId);

      // Show success modal
      setShowSuccessModal(true);
    } catch (err) {
      console.error("Failed to save expense:", err);
      setValidationError("A aparut o eroare. Va rugam incercati din nou.");
    } finally {
      setLoading(false);
    }
  };

  // Custom Select Dropdown Component
  const SelectDropdown = ({ 
    value, 
    options, 
    isOpen, 
    onToggle, 
    onChange 
  }: { 
    value: string; 
    options: string[]; 
    isOpen: boolean; 
    onToggle: () => void; 
    onChange: (v: string) => void;
  }) => (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center gap-2 px-4 py-2.5 bg-white/80 backdrop-blur-xl border border-gray-200/60 rounded-full text-gray-700 hover:bg-white transition-all shadow-sm"
        style={{ fontSize: "0.875rem", fontWeight: 400 }}
      >
        {value}
        <ChevronDown size={16} className="text-gray-400" />
      </button>
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-40 bg-white rounded-xl shadow-lg border border-gray-200/60 py-1 z-50">
          {options.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => {
                onChange(option);
                onToggle();
              }}
              className={`w-full px-4 py-2 text-left hover:bg-gray-50 ${
                value === option ? "bg-teal-50 text-teal-600" : "text-gray-700"
              }`}
              style={{ fontSize: "0.875rem" }}
            >
              {option}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  // Mobile Form Row Component
  const MobileFormRow = ({ 
    label, 
    children, 
    noBorder = false 
  }: { 
    label: string; 
    children: React.ReactNode; 
    noBorder?: boolean;
  }) => (
    <div className={`flex items-center py-4 ${noBorder ? '' : 'border-b border-gray-100'}`}>
      <span className="text-gray-500 text-sm w-24 flex-shrink-0">{label}</span>
      <div className="flex-1">{children}</div>
    </div>
  );

  return (
    <>
      {/* ========== MOBILE VIEW ========== */}
      <div className="md:hidden min-h-screen bg-white flex flex-col">
        {/* Mobile Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
          <div className="flex items-center gap-4">
            <button onClick={handleBack} className="p-1">
              <X size={20} className="text-gray-600" />
            </button>
            <h1 className="text-base font-semibold text-gray-900">Decont nou</h1>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#EF4444]" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#3B82F6]" />
          </div>
        </div>

        {/* Mobile Form Content */}
        <div className="flex-1 overflow-y-auto px-4">
          {/* Document Upload */}
          <MobileFormRow label="Document">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-gray-400 text-sm">
                {uploadedFile ? uploadedFile.name : 'Incarcă'}
              </span>
              <Upload size={18} className="text-gray-400" />
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </MobileFormRow>

          {/* Furnizor */}
          <MobileFormRow label="Furnizor">
            <input
              type="text"
              value={furnizor}
              onChange={(e) => setFurnizor(e.target.value)}
              placeholder="Furnizor, coleg sau tag"
              className="w-full bg-transparent text-gray-700 placeholder-gray-400 text-sm focus:outline-none"
            />
          </MobileFormRow>

          {/* Tip Doc */}
          <MobileFormRow label="Tip Doc">
            <div className="relative">
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                className="w-full bg-transparent text-gray-700 text-sm focus:outline-none appearance-none cursor-pointer pr-6"
              >
                <option value="">Selecteaza</option>
                {DOC_TYPES.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              <ChevronDown size={16} className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </MobileFormRow>

          {/* Nr. Doc */}
          <MobileFormRow label="Nr. Doc">
            <input
              type="text"
              value={nrDoc}
              onChange={(e) => setNrDoc(e.target.value)}
              placeholder="Numar"
              className="w-full bg-transparent text-gray-700 placeholder-gray-400 text-sm focus:outline-none"
            />
          </MobileFormRow>

          {/* Data Doc */}
          <MobileFormRow label="Data Doc">
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowDatePicker(true)}
                className="w-full text-left text-gray-700 text-sm flex items-center justify-between"
              >
                <span>{selectedDate ? formatDateDisplay(selectedDate) : 'Selecteaza'}</span>
                <ChevronDown size={16} className="text-gray-400" />
              </button>
              {showDatePicker && (
                <CalendarModal
                  selectedDate={selectedDate}
                  onDateSelect={(date) => {
                    setSelectedDate(date);
                    setShowDatePicker(false);
                  }}
                  onClose={() => setShowDatePicker(false)}
                />
              )}
            </div>
          </MobileFormRow>

          {/* Plata */}
          <MobileFormRow label="Plata">
            <div className="relative">
              <select
                value={plata}
                onChange={(e) => setPlata(e.target.value)}
                className="w-full bg-transparent text-gray-700 text-sm focus:outline-none appearance-none cursor-pointer pr-6"
              >
                {PAYMENT_STATUS.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
              <ChevronDown size={16} className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </MobileFormRow>

          {/* Divider */}
          <div className="h-px bg-gray-200 my-2" />

          {/* Descriere */}
          <MobileFormRow label="Descriere">
            <textarea
              value={lines[0]?.descriere || ''}
              onChange={(e) => updateLine(0, "descriere", e.target.value)}
              placeholder="Adauga descriere..."
              rows={3}
              className="w-full bg-transparent text-gray-700 placeholder-gray-400 text-sm focus:outline-none resize-none"
            />
          </MobileFormRow>

          {/* Divider */}
          <div className="h-px bg-gray-200 my-2" />

          {/* Suma cu TVA */}
          <MobileFormRow label="Suma cu TVA">
            <div className="flex items-center justify-between">
              <input
                type="text"
                value={lines[0]?.sumaCuTVA || '0,00'}
                onChange={(e) => updateLine(0, "sumaCuTVA", e.target.value)}
                className="flex-1 bg-transparent text-gray-900 font-medium text-sm focus:outline-none"
              />
              <span className="text-gray-400 text-sm flex items-center gap-1">
                Lei <span className="text-xs">🟡🔴</span>
              </span>
            </div>
          </MobileFormRow>

          {/* Suma fara TVA */}
          <MobileFormRow label="Suma fara TVA">
            <div className="flex items-center justify-between">
              <input
                type="text"
                value={lines[0]?.sumaFaraTVA || '0,00'}
                readOnly
                className="flex-1 bg-transparent text-gray-900 font-medium text-sm focus:outline-none"
              />
              <span className="text-gray-400 text-sm flex items-center gap-1">
                Lei <span className="text-xs">🟡🔴</span>
              </span>
            </div>
          </MobileFormRow>

          {/* TVA */}
          <MobileFormRow label="TVA">
            <div className="flex items-center justify-between">
              <input
                type="text"
                value={lines[0]?.tva || '0,00'}
                readOnly
                className="flex-1 bg-transparent text-gray-500 text-sm focus:outline-none"
              />
              <span className="text-gray-400 text-sm flex items-center gap-1">
                Lei <span className="text-xs">🟡🔴</span>
              </span>
            </div>
          </MobileFormRow>

          {/* Cota TVA */}
          <MobileFormRow label="Cota TVA (%)">
            <span className="text-gray-700 text-sm">{lines[0]?.cotaTVA || '0%'}</span>
          </MobileFormRow>

          {/* Luna P&L */}
          <MobileFormRow label="Luna P&L">
            <div className="relative">
              <MonthYearPicker
                value={lines[0]?.lunaP || ''}
                onChange={(value) => updateLine(0, "lunaP", value)}
              />
            </div>
          </MobileFormRow>

          {/* Cont */}
          <MobileFormRow label="Cont">
            <div className="relative">
              <select
                value={lines[0]?.categoryId || ''}
                onChange={(e) => {
                  updateLine(0, "categoryId", e.target.value);
                  updateLine(0, "subcategoryId", "");
                }}
                className="w-full bg-transparent text-gray-700 text-sm focus:outline-none appearance-none cursor-pointer pr-6"
              >
                <option value="">Select...</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
              <ChevronDown size={16} className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </MobileFormRow>

          {/* Subcont */}
          <MobileFormRow label="Subcont">
            <div className="relative">
              <select
                value={lines[0]?.subcategoryId || ''}
                onChange={(e) => updateLine(0, "subcategoryId", e.target.value)}
                disabled={!lines[0]?.categoryId}
                className="w-full bg-transparent text-gray-400 text-sm focus:outline-none appearance-none cursor-pointer pr-6 disabled:opacity-50"
              >
                <option value="">Select...</option>
                {getSubcategoriesForCategory(lines[0]?.categoryId || '').map((sub) => (
                  <option key={sub.id} value={sub.id}>{sub.name}</option>
                ))}
              </select>
              <ChevronDown size={16} className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </MobileFormRow>

          {/* TVA Deductibil */}
          <MobileFormRow label="TVA Deductibil">
            <div className="relative">
              <select
                value={lines[0]?.tvaDeductibil || 'Nu'}
                onChange={(e) => updateLine(0, "tvaDeductibil", e.target.value)}
                className="w-full bg-transparent text-gray-700 text-sm focus:outline-none appearance-none cursor-pointer pr-6"
              >
                {TVA_DEDUCTIBIL_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
              <ChevronDown size={16} className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </MobileFormRow>

          {/* Tags */}
          <MobileFormRow label="Tags" noBorder>
            <input
              type="text"
              value={lines[0]?.tags || ''}
              onChange={(e) => updateLine(0, "tags", e.target.value)}
              placeholder="#platitdeSOLO"
              className="w-full bg-transparent text-gray-700 placeholder-gray-400 text-sm focus:outline-none"
            />
          </MobileFormRow>
        </div>

        {/* Mobile Bottom Buttons */}
        <div className="px-4 py-4 border-t border-gray-100 space-y-3">
          <button
            type="button"
            onClick={addLine}
            className="w-full flex items-center justify-center gap-2 py-3 border border-gray-200 rounded-xl text-gray-600 text-sm font-medium"
          >
            <Plus size={18} />
            Adaugă produs
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-[#11C6B6] to-[#00BFA5] text-white rounded-full text-sm font-semibold disabled:opacity-50"
          >
            {loading ? "Se salveaza..." : "Salvează"}
          </button>
        </div>

        {/* Mobile Success Modal */}
        {showSuccessModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-sm text-center shadow-xl">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check size={28} className="text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Cheltuiala a fost trimisa!</h3>
              <p className="text-gray-500 text-sm mb-5">Cheltuiala a fost salvata si trimisa pentru aprobare.</p>
              <button
                onClick={() => router.push(`/dashboard/${teamId}/expenses`)}
                className="w-full py-3 bg-[#00BFA5] hover:bg-[#00AC95] text-white rounded-full transition-all font-medium text-sm"
              >
                Inapoi la cheltuieli
              </button>
            </div>
          </div>
        )}

        {/* Mobile Validation Error */}
        {validationError && (
          <div className="fixed top-4 left-4 right-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl shadow-lg z-50 flex items-center gap-3">
            <span className="text-sm flex-1">{validationError}</span>
            <button onClick={() => setValidationError("")} className="text-red-500 hover:text-red-700">
              <X size={18} />
            </button>
          </div>
        )}
      </div>

      {/* ========== DESKTOP VIEW ========== */}
      <div className="hidden md:block min-h-screen bg-[#F8F9FA] p-4 md:p-6">
        {/* Success Modal */}
        {showSuccessModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 text-center shadow-xl">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check size={32} className="text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Cheltuiala a fost trimisa!</h3>
              <p className="text-gray-500 mb-6">Cheltuiala a fost salvata si trimisa pentru aprobare.</p>
              <button
                onClick={() => router.push(`/dashboard/${teamId}/expenses`)}
                className="px-8 py-3 bg-[#00BFA5] hover:bg-[#00AC95] text-white rounded-full transition-all font-medium"
              >
                Inapoi la cheltuieli
              </button>
            </div>
          </div>
        )}

        {/* Validation Error Toast */}
        {validationError && (
          <div className="fixed top-4 right-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl shadow-lg z-50 flex items-center gap-3">
            <span>{validationError}</span>
            <button onClick={() => setValidationError("")} className="text-red-500 hover:text-red-700">
              <X size={18} />
            </button>
          </div>
        )}

        <div className="max-w-[1600px] mx-auto">
          {/* Close Button - Above header */}
          <button
            onClick={handleBack}
            className="mb-3 p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>

          {/* Top Header Card */}
          <div className="bg-white rounded-[24px] p-3 mb-4 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1">
              {/* Furnizor Input */}
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                </div>
                <input
                  type="text"
                  value={furnizor}
                  onChange={(e) => setFurnizor(e.target.value)}
                  placeholder="Furnizor"
                  className="pl-10 pr-5 py-2.5 bg-white border border-gray-100 rounded-full text-gray-700 placeholder-gray-400 focus:outline-none focus:border-gray-300 transition-all shadow-sm w-64"
                  style={{ fontSize: "0.875rem", fontWeight: 400 }}
                />
              </div>

              {/* Doc Type Dropdown */}
              <SelectDropdown
                value={docType}
                options={DOC_TYPES}
                isOpen={showDocTypeDropdown}
                onToggle={() => setShowDocTypeDropdown(!showDocTypeDropdown)}
                onChange={setDocType}
              />

              {/* NrDoc Input */}
              <input
                type="text"
                value={nrDoc}
                onChange={(e) => setNrDoc(e.target.value)}
                placeholder="NrDoc"
                className="px-5 py-2.5 bg-white border border-gray-100 rounded-full text-gray-700 placeholder-gray-400 focus:outline-none focus:border-gray-300 transition-all shadow-sm w-32"
                style={{ fontSize: "0.875rem", fontWeight: 400 }}
              />

              {/* Date Picker */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowDatePicker(true)}
                  className="px-5 py-2.5 bg-white border border-gray-100 rounded-full text-gray-700 hover:bg-gray-50 transition-all shadow-sm min-w-[120px]"
                  style={{ fontSize: "0.875rem", fontWeight: 400 }}
                >
                  {formatDateDisplay(selectedDate)}
                </button>
                {showDatePicker && (
                  <CalendarModal
                    selectedDate={selectedDate}
                    onDateSelect={(date) => {
                      setSelectedDate(date);
                      setShowDatePicker(false);
                    }}
                    onClose={() => setShowDatePicker(false)}
                  />
                )}
              </div>

              {/* Plata Dropdown */}
              <SelectDropdown
                value={plata}
                options={PAYMENT_STATUS}
                isOpen={showPlataDropdown}
                onToggle={() => setShowPlataDropdown(!showPlataDropdown)}
                onChange={setPlata}
              />
            </div>

            {/* Upload Document Button - Top Right */}
            <label className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-100 rounded-full text-gray-600 hover:bg-gray-50 transition-all shadow-sm cursor-pointer ml-auto">
              <span style={{ fontSize: "0.875rem", fontWeight: 400 }}>Incarcă document</span>
              <Upload size={16} className="text-gray-400" />
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

        {/* Main Content - Two Separate Columns */}
        <div className="flex gap-4 mb-4 items-start">
          {/* Left Column - Stack of Form Cards */}
          <div className="flex-shrink-0 w-[480px] space-y-4">
            {lines.map((line, index) => (
              <div key={index} className="bg-white rounded-[24px] p-8 pb-10 shadow-[0_2px_10px_rgba(0,0,0,0.02)] relative group">
                {lines.length > 1 && (
                  <button
                    onClick={() => {
                      const newLines = [...lines];
                      newLines.splice(index, 1);
                      setLines(newLines);
                    }}
                    className="absolute -right-3 -top-3 p-2 bg-white rounded-full shadow-md text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all z-10"
                  >
                    <X size={16} />
                  </button>
                )}
                <div className="flex flex-col gap-3">
                  {/* Descriere */}
                  <div className="flex items-start gap-4">
                    <label className="text-gray-500 w-28 flex-shrink-0 pt-3" style={{ fontSize: "0.8125rem", fontWeight: 400 }}>
                      Descriere
                    </label>
                    <textarea
                      value={line.descriere}
                      onChange={(e) => updateLine(index, "descriere", e.target.value)}
                      placeholder="Adauga descriere..."
                      rows={1}
                      className="flex-1 px-4 py-2.5 bg-[#F8F9FA] border-none rounded-2xl text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-200 transition-all resize-none overflow-y-auto min-h-[42px] max-h-[120px]"
                      style={{ fontSize: "0.875rem", fontWeight: 400 }}
                      onInput={(e) => {
                        const target = e.target as HTMLTextAreaElement;
                        target.style.height = "auto";
                        target.style.height = Math.min(target.scrollHeight, 120) + "px";
                      }}
                    />
                  </div>

                  {/* Suma cu TVA */}
                  <div className="flex items-center gap-4">
                    <label className="text-gray-500 w-28 flex-shrink-0" style={{ fontSize: "0.8125rem", fontWeight: 400 }}>
                      Suma cu TVA
                    </label>
                    <div className="flex-1 flex items-center justify-between px-4 py-2 bg-white rounded-xl">
                      <input
                        type="text"
                        value={line.sumaCuTVA}
                        onChange={(e) => updateLine(index, "sumaCuTVA", e.target.value)}
                        className="w-full bg-transparent border-none text-gray-900 focus:outline-none font-medium"
                        style={{ fontSize: "0.9375rem" }}
                      />
                      <span className="text-gray-400 flex items-center gap-1.5 flex-shrink-0 ml-2" style={{ fontSize: "0.8125rem" }}>
                        Lei <span className="text-sm">🇷🇴</span>
                      </span>
                    </div>
                  </div>

                  {/* Suma fara TVA */}
                  <div className="flex items-center gap-4">
                    <label className="text-gray-500 w-28 flex-shrink-0" style={{ fontSize: "0.8125rem", fontWeight: 400 }}>
                      Suma fara TVA
                    </label>
                    <div className="flex-1 flex items-center justify-between px-4 py-2 bg-white rounded-xl">
                      <input
                        type="text"
                        value={line.sumaFaraTVA}
                        readOnly
                        className="w-full bg-transparent border-none text-gray-900 focus:outline-none font-medium"
                        style={{ fontSize: "0.9375rem" }}
                      />
                      <span className="text-gray-400 flex items-center gap-1.5 flex-shrink-0 ml-2" style={{ fontSize: "0.8125rem" }}>
                        Lei <span className="text-sm">🇷🇴</span>
                      </span>
                    </div>
                  </div>

                  {/* TVA */}
                  <div className="flex items-center gap-4">
                    <label className="text-gray-500 w-28 flex-shrink-0" style={{ fontSize: "0.8125rem", fontWeight: 400 }}>
                      TVA
                    </label>
                    <div className="flex-1 flex items-center justify-between px-4 py-2 bg-white rounded-xl">
                      <input
                        type="text"
                        value={line.tva}
                        readOnly
                        className="w-full bg-transparent border-none text-gray-500 focus:outline-none"
                        style={{ fontSize: "0.9375rem" }}
                      />
                      <span className="text-gray-400 flex items-center gap-1.5 flex-shrink-0 ml-2" style={{ fontSize: "0.8125rem" }}>
                        Lei <span className="text-sm">🇷🇴</span>
                      </span>
                    </div>
                  </div>

                  {/* Cota TVA */}
                  <div className="flex items-center gap-4">
                    <label className="text-gray-500 w-28 flex-shrink-0" style={{ fontSize: "0.8125rem", fontWeight: 400 }}>
                      Cota TVA (%)
                    </label>
                    <div className="flex-1 px-4 py-2.5 bg-[#F8F9FA] rounded-xl text-gray-700">
                      {line.cotaTVA}
                    </div>
                  </div>

                  {/* Luna P&L */}
                  <div className="flex items-center gap-4">
                    <label className="text-gray-500 w-28 flex-shrink-0" style={{ fontSize: "0.8125rem", fontWeight: 400 }}>
                      Luna P&L
                    </label>
                    <div className="flex-1">
                      <MonthYearPicker
                        value={line.lunaP}
                        onChange={(value) => updateLine(index, "lunaP", value)}
                      />
                    </div>
                  </div>

                  {/* Cont */}
                  <div className="flex items-center gap-4">
                    <label className="text-gray-500 w-28 flex-shrink-0" style={{ fontSize: "0.8125rem", fontWeight: 400 }}>
                      Cont
                    </label>
                    <div className="relative flex-1">
                      <select
                        value={line.categoryId}
                        onChange={(e) => {
                          updateLine(index, "categoryId", e.target.value);
                          updateLine(index, "subcategoryId", "");
                        }}
                        className="w-full px-4 py-2.5 bg-[#F8F9FA] border-none rounded-xl text-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-200 transition-all appearance-none cursor-pointer"
                        style={{ fontSize: "0.875rem" }}
                      >
                        <option value="">Select...</option>
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                      <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* Subcont */}
                  <div className="flex items-center gap-4">
                    <label className="text-gray-500 w-28 flex-shrink-0" style={{ fontSize: "0.8125rem", fontWeight: 400 }}>
                      Subcont
                    </label>
                    <div className="relative flex-1">
                      <select
                        value={line.subcategoryId}
                        onChange={(e) => updateLine(index, "subcategoryId", e.target.value)}
                        disabled={!line.categoryId}
                        className="w-full px-4 py-2.5 bg-[#F8F9FA] border-none rounded-xl text-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-200 transition-all appearance-none cursor-pointer disabled:opacity-50"
                        style={{ fontSize: "0.875rem" }}
                      >
                        <option value="">Select...</option>
                        {getSubcategoriesForCategory(line.categoryId).map((sub) => (
                          <option key={sub.id} value={sub.id}>{sub.name}</option>
                        ))}
                      </select>
                      <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* TVA Deductibil */}
                  <div className="flex items-center gap-4">
                    <label className="text-gray-500 w-28 flex-shrink-0" style={{ fontSize: "0.8125rem", fontWeight: 400 }}>
                      TVA Deductibil
                    </label>
                    <div className="relative flex-1">
                      <select
                        value={line.tvaDeductibil}
                        onChange={(e) => updateLine(index, "tvaDeductibil", e.target.value)}
                        className="w-full px-4 py-2.5 bg-white border border-gray-100 rounded-xl text-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-200 transition-all appearance-none cursor-pointer font-medium"
                        style={{ fontSize: "0.875rem" }}
                      >
                        {TVA_DEDUCTIBIL_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                      <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="flex items-center gap-4">
                    <label className="text-gray-500 w-28 flex-shrink-0" style={{ fontSize: "0.8125rem", fontWeight: 400 }}>
                      Tags
                    </label>
                    <input
                      type="text"
                      value={line.tags}
                      onChange={(e) => updateLine(index, "tags", e.target.value)}
                      placeholder="#tags"
                      className="flex-1 px-4 py-2.5 bg-[#F8F9FA] border-none rounded-xl text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-200 transition-all"
                      style={{ fontSize: "0.875rem", fontWeight: 400 }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Right Card - Document Upload Area */}
          <div className="flex-1">
            <div className="bg-white rounded-[24px] p-8 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col items-center justify-center min-h-[500px]">
              {uploadedFile ? (
                <div className="w-full h-full flex flex-col items-center justify-center">
                  {uploadedFile.preview.startsWith("data:image") ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={uploadedFile.preview}
                      alt="Document preview"
                      className="max-w-full max-h-full object-contain rounded-lg"
                    />
                  ) : (
                    <div className="text-center">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Upload size={24} className="text-gray-400" />
                      </div>
                      <p className="text-gray-600 text-sm">{uploadedFile.name}</p>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setUploadedFile(null)}
                    className="mt-4 text-sm text-red-500 hover:text-red-600"
                  >
                    Sterge
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center">
                  <div className="mb-6">
                    <Upload size={48} className="text-gray-200" strokeWidth={1.5} />
                  </div>
                  <p className="text-gray-400" style={{ fontSize: "0.9375rem", fontWeight: 400 }}>
                    Documentul va aparea aici
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

          {/* Bottom Buttons - Outside cards */}
          <div className="w-[480px] flex items-center gap-4 mt-2 mb-6">
            <button
              type="button"
              onClick={addLine}
              className="flex items-center gap-2 px-8 py-3 bg-white border border-teal-500 text-gray-700 rounded-full hover:bg-teal-50 transition-all shadow-sm w-[48%]"
              style={{ fontSize: "0.9375rem", fontWeight: 500 }}
            >
              Adauga produs
              <Plus size={18} className="ml-auto" />
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={loading}
              className="px-12 py-3 bg-[#00BFA5] hover:bg-[#00AC95] text-white rounded-full transition-all shadow-sm disabled:opacity-50 w-[48%]"
              style={{ fontSize: "0.9375rem", fontWeight: 600 }}
            >
              {loading ? "Se salveaza..." : "Salveaza"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
