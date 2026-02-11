"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { X, Upload, ChevronDown, Plus, Check, AlertTriangle, Loader2 } from "lucide-react";
import { createExpense, createMultiLineExpense, updateExpense, getExpense, deleteExpense, submitForApproval, ExpenseInput, ExpenseLineInput, TeamExpense } from "@/app/actions/expenses";
import { uploadAttachment, getExpenseAttachments, getAttachmentUrl } from "@/app/actions/attachments";
import { CalendarModal } from "@/components/ui/calendar-modal";
import { getCategoryTree, CategoryWithChildren } from "@/app/actions/categories";
import { searchSuppliers, SupplierSearchResult } from "@/app/actions/suppliers";
import { getTagSuggestions, TagSuggestion } from "@/app/actions/tags";
import { validateTags } from "@/lib/utils/tags";
import { checkForDuplicates } from "@/app/actions/duplicate-detection";
import { PotentialDuplicate, formatDuplicateWarning } from "@/lib/utils/duplicate-detection";
import { AmountDifferenceDialog } from "@/components/expenses/amount-difference-dialog";
import { getRecurringExpense, updateRecurringTemplateVersioned } from "@/app/actions/recurring-expenses";

// Updated doc types as per spec
const DOC_TYPES = ["Bon", "Factura", "eFactura", "Chitanta", "Altceva"];
const PAYMENT_STATUS = ["Platit", "Neplatit"];
const TVA_DEDUCTIBIL_OPTIONS = ["Nu", "Da"];

// No date restrictions - fully open calendar

// Max file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Max line items per document
const MAX_LINE_ITEMS = 5;

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
  manualFields: ("sumaCuTVA" | "sumaFaraTVA" | "tva")[];
  calculatedField: "sumaCuTVA" | "sumaFaraTVA" | "tva" | null;
}

interface Props {
  teamId: string;
  expenseId?: string; // If provided, load existing expense for editing
  onBack?: () => void;
}

// Format number with Romanian locale
function formatAmount(value: string | number): string {
  if (typeof value === "number") {
    return value.toLocaleString("ro-RO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  const num = parseAmount(value);
  if (num === 0 && value.trim() === "") return "";
  return num.toLocaleString("ro-RO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Parse Romanian formatted number back to standard number
function parseAmount(value: string): number {
  if (!value || value.trim() === "") return 0;
  let cleaned = value.replace(/\s/g, "");
  const hasRomanianFormat = cleaned.includes(",") && (cleaned.indexOf(",") > cleaned.lastIndexOf(".") || !cleaned.includes("."));
  if (hasRomanianFormat) {
    cleaned = cleaned.replace(/\./g, "").replace(",", ".");
  } else if (cleaned.includes(",") && cleaned.includes(".")) {
    cleaned = cleaned.replace(/,/g, "");
  } else if (cleaned.includes(",") && !cleaned.includes(".")) {
    const commaPos = cleaned.indexOf(",");
    const afterComma = cleaned.substring(commaPos + 1);
    if (afterComma.length === 3 && /^\d+$/.test(afterComma)) {
      cleaned = cleaned.replace(",", "");
    } else {
      cleaned = cleaned.replace(",", ".");
    }
  }
  return parseFloat(cleaned) || 0;
}

// Format tags input: ensure each tag starts with # and has no spaces
function formatTagsInput(value: string): string {
  if (!value.trim()) return "";

  // Split by comma to get individual tags
  const tags = value.split(",");

  return tags.map((tag, index) => {
    // Remove all spaces within the tag
    const cleanTag = tag.replace(/\s+/g, "").toLowerCase();
    if (!cleanTag) return "";
    // Remove # if present, then add it back (handles ##tag case)
    const withoutHash = cleanTag.replace(/^#+/, "");
    if (!withoutHash) return "#";
    // Add comma separator for tags after the first
    const prefix = index > 0 ? ", " : "";
    return `${prefix}#${withoutHash}`;
  }).filter(t => t).join("");
}

// Smart VAT auto-calculation
function calculateVATFromTwoFields(
  field1: "sumaCuTVA" | "sumaFaraTVA" | "tva",
  value1: number,
  field2: "sumaCuTVA" | "sumaFaraTVA" | "tva",
  value2: number
): { sumaCuTVA: number; sumaFaraTVA: number; tva: number; cotaTVA: number; calculatedField: "sumaCuTVA" | "sumaFaraTVA" | "tva" } {
  let sumaCuTVA = 0, sumaFaraTVA = 0, tva = 0;
  let calculatedField: "sumaCuTVA" | "sumaFaraTVA" | "tva";

  if (field1 === "sumaCuTVA") sumaCuTVA = value1;
  else if (field1 === "sumaFaraTVA") sumaFaraTVA = value1;
  else tva = value1;

  if (field2 === "sumaCuTVA") sumaCuTVA = value2;
  else if (field2 === "sumaFaraTVA") sumaFaraTVA = value2;
  else tva = value2;

  if (field1 !== "sumaCuTVA" && field2 !== "sumaCuTVA") {
    sumaCuTVA = sumaFaraTVA + tva;
    calculatedField = "sumaCuTVA";
  } else if (field1 !== "sumaFaraTVA" && field2 !== "sumaFaraTVA") {
    sumaFaraTVA = sumaCuTVA - tva;
    calculatedField = "sumaFaraTVA";
  } else {
    tva = sumaCuTVA - sumaFaraTVA;
    calculatedField = "tva";
  }

  const cotaTVA = sumaFaraTVA > 0 ? (tva / sumaFaraTVA) * 100 : 0;
  return { sumaCuTVA, sumaFaraTVA, tva, cotaTVA, calculatedField };
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

// Convert "2025-11" back to "noiembrie 2025" for display
function convertFromAccountingPeriod(accountingPeriod: string | null, defaultMonthYear: string): string {
  if (!accountingPeriod) return defaultMonthYear;
  const monthMap: Record<string, string> = {
    "01": "ianuarie", "02": "februarie", "03": "martie", "04": "aprilie",
    "05": "mai", "06": "iunie", "07": "iulie", "08": "august",
    "09": "septembrie", "10": "octombrie", "11": "noiembrie", "12": "decembrie",
  };
  const parts = accountingPeriod.split("-");
  if (parts.length !== 2) return defaultMonthYear;
  const year = parts[0];
  const month = monthMap[parts[1]] || "";
  return month && year ? `${month} ${year}` : defaultMonthYear;
}

// Reusable Text Input Component matching Figma
const TextInput = ({
  style,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { style?: React.CSSProperties }) => (
  <input
    {...props}
    style={{
      width: '296px',
      height: '36px',
      backgroundColor: 'rgba(255, 255, 255, 0.7)',
      borderColor: 'rgba(209, 213, 220, 0.5)',
      borderStyle: 'solid',
      borderWidth: '1px',
      boxSizing: 'border-box',
      boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.04)',
      borderRadius: '9999px',
      padding: '0 16px',
      fontSize: '14px',
      fontFamily: '"Inter", sans-serif',
      outline: 'none',
      ...style
    }}
  />
);

export function NewExpenseForm({ teamId, expenseId, onBack }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [loadingExpense, setLoadingExpense] = useState(!!expenseId);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // RE-Form mode: when editing a recurring expense form, certain fields are locked
  const [isRecurringForm, setIsRecurringForm] = useState(false);
  const [recurringTemplateId, setRecurringTemplateId] = useState<string | null>(null);
  const [originalExpenseStatus, setOriginalExpenseStatus] = useState<string | null>(null);
  const [templateExpectedAmount, setTemplateExpectedAmount] = useState<number | null>(null);

  // §11: Amount difference dialog (±10% from RE-Template)
  const [showAmountDiffDialog, setShowAmountDiffDialog] = useState(false);
  const [amountDiffData, setAmountDiffData] = useState<{ expected: number; actual: number; percent: number } | null>(null);

  // Header fields
  const [furnizor, setFurnizor] = useState("");
  const [furnizorCui, setFurnizorCui] = useState("");
  const [furnizorLocked, setFurnizorLocked] = useState(false);
  const [docType, setDocType] = useState("Factura");
  const [nrDoc, setNrDoc] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [plata, setPlata] = useState("Neplatit");
  
  // Document upload
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; preview: string; type: string; size: number; isExisting?: boolean }[]>([]);
  const [activePreviewIndex, setActivePreviewIndex] = useState(0);
  const [imageZoom, setImageZoom] = useState(1);
  
  // Dropdown states
  const [showDocTypeDropdown, setShowDocTypeDropdown] = useState(false);
  const [showPlataDropdown, setShowPlataDropdown] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  // Supplier search
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
  const [supplierSearchResults, setSupplierSearchResults] = useState<SupplierSearchResult[]>([]);
  const [searchingSupplier, setSearchingSupplier] = useState(false);
  const [supplierSearchError, setSupplierSearchError] = useState(false);
  const supplierSearchTimeout = useRef<NodeJS.Timeout | null>(null);
  const supplierSelectedRef = useRef(false); // Track if a selection was made (avoids stale closure in blur)

  // Tags autocomplete
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const [tagSuggestions, setTagSuggestions] = useState<TagSuggestion[]>([]);
  const [searchingTags, setSearchingTags] = useState(false);

  // Duplicate detection
  const [potentialDuplicates, setPotentialDuplicates] = useState<PotentialDuplicate[]>([]);
  const [duplicateCheckPending, setDuplicateCheckPending] = useState(false);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);

  // Validation
  const [validationError, setValidationError] = useState("");
  const [showDraftConfirmModal, setShowDraftConfirmModal] = useState(false);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [showValidationErrors, setShowValidationErrors] = useState(false);

  // Server error handling
  const [showServerErrorModal, setShowServerErrorModal] = useState(false);
  const [lastSaveAttempt, setLastSaveAttempt] = useState<{ forceDraft: boolean } | null>(null);

  // Success modal
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Categories
  const [categories, setCategories] = useState<CategoryWithChildren[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  // Hover states
  const [isHoveredBack, setIsHoveredBack] = useState(false);

  // Month picker state - tracks which line index has its picker open (-1 = none)
  const [openMonthPickerIndex, setOpenMonthPickerIndex] = useState<number>(-1);
  const [monthPickerYear, setMonthPickerYear] = useState<number>(new Date().getFullYear());

  // Romanian month names
  const MONTHS_RO = ["Ianuarie", "Februarie", "Martie", "Aprilie", "Mai", "Iunie", 
                     "Iulie", "August", "Septembrie", "Octombrie", "Noiembrie", "Decembrie"];
  const MONTHS_RO_LOWER = ["ianuarie", "februarie", "martie", "aprilie", "mai", "iunie", 
                           "iulie", "august", "septembrie", "octombrie", "noiembrie", "decembrie"];

  // Helper to get current month/year in Romanian format
  const getCurrentMonthYear = useCallback(() => {
    const months = ["ianuarie", "februarie", "martie", "aprilie", "mai", "iunie", 
                    "iulie", "august", "septembrie", "octombrie", "noiembrie", "decembrie"];
    const date = selectedDate || new Date();
    return `${months[date.getMonth()]} ${date.getFullYear()}`;
  }, [selectedDate]);

  // Transaction lines
  const [lines, setLines] = useState<TransactionLine[]>([
    {
      descriere: "",
      sumaCuTVA: "",
      sumaFaraTVA: "",
      tva: "",
      cotaTVA: "",
      lunaP: getCurrentMonthYear(),
      categoryId: "",
      subcategoryId: "",
      tvaDeductibil: "Da",
      tags: "",
      manualFields: [],
      calculatedField: null,
    },
  ]);

  // Load categories on mount
  useEffect(() => {
    async function loadCategories() {
      try {
        const tree = await getCategoryTree(teamId);
        setCategories(tree);
      } catch (err) {
        console.error("Failed to load categories:", err);
      } finally {
        setLoadingCategories(false);
      }
    }
    loadCategories();
  }, [teamId]);

  // Load existing expense data if editing
  useEffect(() => {
    async function loadExpense() {
      if (!expenseId) return;
      
      setLoadingExpense(true);
      try {
        const expense = await getExpense(expenseId);
        if (!expense) {
          console.error("Expense not found");
          setLoadingExpense(false);
          // Redirect back to expenses list
          router.push(`/dashboard/${teamId}/expenses`);
          return;
        }

        // Load attachments with error handling for each
        const attachments = await getExpenseAttachments(expenseId);
        const attachmentPromises = attachments.map(async (att) => {
          try {
            const url = await getAttachmentUrl(att.file_path);
            
            // Add timeout to fetch (10 seconds)
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);
            
            let response: Response;
            try {
              response = await fetch(url, { signal: controller.signal });
              clearTimeout(timeoutId);
            } catch (fetchErr: any) {
              clearTimeout(timeoutId);
              if (fetchErr.name === 'AbortError') {
                throw new Error('Request timeout - file may not exist or URL is invalid');
              }
              throw fetchErr;
            }
            
            if (!response.ok) {
              console.error(`Failed to fetch attachment ${att.file_name}: ${response.status} ${response.statusText}`);
              return null;
            }
            
            const blob = await response.blob();
            const base64 = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.onerror = () => reject(new Error('Failed to read file'));
              reader.readAsDataURL(blob);
            });
            return {
              name: att.file_name,
              preview: base64,
              type: att.file_type || 'image/png',
              size: att.file_size || 0,
              isExisting: true // Mark as existing attachment
            };
          } catch (err) {
            console.error(`Failed to load attachment ${att.file_name}:`, err);
            return null;
          }
        });
        const attachmentResults = await Promise.all(attachmentPromises);
        const attachmentFiles = attachmentResults.filter((file): file is NonNullable<typeof file> => file !== null);
        setUploadedFiles(attachmentFiles);

        // Detect RE-Form mode (expense linked to a recurring template)
        if (expense.recurring_expense_id) {
          setIsRecurringForm(true);
          setRecurringTemplateId(expense.recurring_expense_id);
          setOriginalExpenseStatus(expense.status);
          // Fetch RE-Template expected amount for §11 (±10% check)
          try {
            const template = await getRecurringExpense(expense.recurring_expense_id);
            if (template) {
              setTemplateExpectedAmount(template.amount_with_vat ?? template.amount ?? 0);
            }
          } catch { /* template may be deleted/inactive, skip */ }
        }

        // Populate header fields
        setFurnizor(expense.supplier || "");
        setFurnizorCui(expense.supplier_cui || "");
        setFurnizorLocked(!!expense.supplier);
        if (expense.supplier) {
          supplierSelectedRef.current = true; // Mark as selected when loading existing
        }
        setDocType(expense.doc_type ? expense.doc_type.charAt(0).toUpperCase() + expense.doc_type.slice(1) : "Factura");
        setNrDoc(expense.doc_number || "");
        setSelectedDate(new Date(expense.expense_date));
        setPlata(expense.payment_status === "paid" ? "Platit" : "Neplatit");

        // Populate line data
        const defaultMonthYear = getCurrentMonthYear();
        setLines([{
          descriere: expense.description || "",
          sumaCuTVA: expense.amount_with_vat ? formatAmount(expense.amount_with_vat) : "",
          sumaFaraTVA: expense.amount_without_vat ? formatAmount(expense.amount_without_vat) : "",
          tva: expense.amount_with_vat && expense.amount_without_vat 
            ? formatAmount(expense.amount_with_vat - expense.amount_without_vat) 
            : "",
          cotaTVA: expense.vat_rate ? `${expense.vat_rate.toFixed(2)}%` : "",
          lunaP: convertFromAccountingPeriod(expense.accounting_period, defaultMonthYear),
          categoryId: expense.category_id || "",
          subcategoryId: expense.subcategory_id || "",
          tvaDeductibil: expense.vat_deductible ? "Da" : "Nu",
          tags: expense.tags?.join(", ") || "",
          manualFields: [],
          calculatedField: null,
        }]);
      } catch (err) {
        console.error("Failed to load expense:", err);
        setShowServerErrorModal(true);
      } finally {
        setLoadingExpense(false);
      }
    }
    loadExpense();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expenseId, teamId]);

  const [deleting, setDeleting] = useState(false);

  // Handle back navigation
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.push(`/dashboard/${teamId}/expenses`);
    }
  };

  // Handle delete expense (FR-7: also reopens linked recurring instance)
  const handleDelete = async () => {
    if (!expenseId || deleting) return;
    if (!confirm('Sigur dorești să ștergi această cheltuială?')) return;
    
    setDeleting(true);
    try {
      await deleteExpense(expenseId, teamId);
      router.push(`/dashboard/${teamId}/expenses`);
    } catch (err) {
      console.error('Failed to delete expense:', err);
      alert('Eroare la ștergere. Încearcă din nou.');
      setDeleting(false);
    }
  };

  // Format date for display
  const formatDateDisplay = (date: Date) => {
    const day = date.getDate().toString().padStart(2, "0");
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = months[date.getMonth()];
    const year = date.getFullYear().toString().slice(-2);
    return `${day}-${month}-${year}`;
  };

  // Date validation - no restrictions, any date is valid
  const validateDate = useCallback((date: Date) => {
    return { valid: true };
  }, []);

  const handleDateSelect = useCallback((date: Date) => {
    setSelectedDate(date);
    setShowDatePicker(false);
    setValidationError("");
  }, []);

  // Supplier search handlers
  const handleSupplierSearch = useCallback(async (query: string) => {
    setFurnizor(query);
    setFurnizorLocked(false);
    setFurnizorCui("");
    setSupplierSearchError(false);

    if (supplierSearchTimeout.current) {
      clearTimeout(supplierSearchTimeout.current);
    }

    if (query.length < 2) {
      setShowSupplierDropdown(false);
      setSupplierSearchResults([]);
      return;
    }

    setSearchingSupplier(true);
    setShowSupplierDropdown(true);

    supplierSearchTimeout.current = setTimeout(async () => {
      try {
        const results = await searchSuppliers(query, teamId);
        setSupplierSearchResults(results);
        setSupplierSearchError(false);
      } catch (err) {
        console.error("Supplier search error:", err);
        setSupplierSearchError(true);
        setSupplierSearchResults([]);
      } finally {
        setSearchingSupplier(false);
      }
    }, 300);
  }, [teamId]);

  const handleSupplierSelect = useCallback((supplier: SupplierSearchResult) => {
    supplierSelectedRef.current = true; // Mark that selection was made
    setFurnizor(supplier.name);
    setFurnizorCui(supplier.cui || "");
    setFurnizorLocked(true);
    setShowSupplierDropdown(false);
    setSupplierSearchResults([]);
  }, []);

  const handleSupplierUnlock = useCallback(() => {
    supplierSelectedRef.current = false; // Reset ref when unlocking
    setFurnizorLocked(false);
    setFurnizorCui("");
  }, []);

  const retrySupplierSearch = useCallback(() => {
    handleSupplierSearch(furnizor);
  }, [furnizor, handleSupplierSearch]);

  // File upload handler
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      if (file.size > MAX_FILE_SIZE) {
        setValidationError(`Fisierul ${file.name} depaseste 10MB`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (ev) => {
        const preview = ev.target?.result as string;
        setUploadedFiles(prev => [...prev, {
          name: file.name,
          preview,
          type: file.type,
          size: file.size
        }]);
        setActivePreviewIndex(prev => uploadedFiles.length);
      };
      reader.readAsDataURL(file);
    });

    e.target.value = "";
  }, [uploadedFiles.length]);

  const removeUploadedFile = useCallback((index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
    if (activePreviewIndex >= index && activePreviewIndex > 0) {
      setActivePreviewIndex(prev => prev - 1);
    }
  }, [activePreviewIndex]);

  // Update line fields
  const updateLine = useCallback((index: number, field: keyof TransactionLine, value: string) => {
    setLines(prevLines => {
      const newLines = [...prevLines];
      const line = { ...newLines[index] };
      
      if (field === "sumaCuTVA" || field === "sumaFaraTVA" || field === "tva") {
        // TVA is always calculated, never manually editable
        if (field === "tva") {
          // Don't allow manual editing of TVA
          return newLines;
        }
        
        line[field] = value;
        
        const amountField = field as "sumaCuTVA" | "sumaFaraTVA";
        // Only sumaCuTVA and sumaFaraTVA can be manual fields
        if (!line.manualFields.includes(amountField) && value.trim() !== "") {
          line.manualFields = [...line.manualFields.filter(f => f !== "tva"), amountField];
        }
        
        if (value.trim() === "" || value === "0" || value === "0,00") {
          line.manualFields = line.manualFields.filter(f => f !== amountField);
        }
        
        // Remove TVA from manualFields if it was somehow added
        line.manualFields = line.manualFields.filter(f => f !== "tva");
        
        const filledFields = line.manualFields.filter(f => {
          const val = line[f];
          return val && val.trim() !== "" && val !== "0" && val !== "0,00";
        });
        
        // Always calculate TVA when both sumaCuTVA and sumaFaraTVA are filled
        if (filledFields.length === 2) {
          const [field1, field2] = filledFields;
          const value1 = parseAmount(line[field1]);
          const value2 = parseAmount(line[field2]);
          
          if (value1 > 0 || value2 > 0) {
            const result = calculateVATFromTwoFields(field1, value1, field2, value2);
            
            if (result.calculatedField === "sumaCuTVA") {
              line.sumaCuTVA = formatAmount(result.sumaCuTVA.toFixed(2));
            } else if (result.calculatedField === "sumaFaraTVA") {
              line.sumaFaraTVA = formatAmount(result.sumaFaraTVA.toFixed(2));
            } else {
              // TVA is always calculated
              line.tva = formatAmount(result.tva.toFixed(2));
            }
            
            line.calculatedField = result.calculatedField;
            line.cotaTVA = result.cotaTVA.toFixed(2) + "%";
          }
        } else if (filledFields.length < 2) {
          line.calculatedField = null;
          line.cotaTVA = "";
          line.tva = ""; // Clear TVA when not enough fields are filled
        }
      } else if (field === "tags") {
        // Auto-format tags: ensure each tag starts with #
        const formattedTags = formatTagsInput(value);
        (line as Record<string, unknown>)[field] = formattedTags;
      } else {
        (line as Record<string, unknown>)[field] = value;
      }

      newLines[index] = line;
      return newLines;
    });
  }, []);

  // Format amount on blur
  const handleAmountBlur = useCallback((index: number, field: "sumaCuTVA" | "sumaFaraTVA" | "tva") => {
    setLines(prevLines => {
      const newLines = [...prevLines];
      const line = { ...newLines[index] };
      const currentValue = line[field];
      
      if (currentValue && currentValue.trim() !== "" && line.calculatedField !== field) {
        const numValue = parseAmount(currentValue);
        if (numValue > 0) {
          line[field] = formatAmount(numValue);
        } else if (currentValue.trim() !== "") {
          line[field] = "";
          line.manualFields = line.manualFields.filter(f => f !== field);
        }
      }
      
      newLines[index] = line;
      return newLines;
    });
  }, []);

  // Reset amount fields
  const resetAmountFields = useCallback((index: number) => {
    setLines(prevLines => {
      const newLines = [...prevLines];
      newLines[index] = {
        ...newLines[index],
        sumaCuTVA: "",
        sumaFaraTVA: "",
        tva: "",
        cotaTVA: "",
        manualFields: [],
        calculatedField: null,
      };
      return newLines;
    });
  }, []);

  // Add new line
  const addLine = () => {
    if (lines.length >= MAX_LINE_ITEMS) {
      setValidationError(`Maximum ${MAX_LINE_ITEMS} produse per document`);
      return;
    }
    
    setLines([
      ...lines,
      {
        descriere: "",
        sumaCuTVA: "",
        sumaFaraTVA: "",
        tva: "",
        cotaTVA: "",
        lunaP: getCurrentMonthYear(),
        categoryId: "",
        subcategoryId: "",
        tvaDeductibil: "Da",
        tags: "",
        manualFields: [],
        calculatedField: null,
      },
    ]);
  };

  // Check for missing required fields
  const checkMissingFields = useCallback(() => {
    const missing: string[] = [];

    // Furnizor must be selected from the list (locked), not just typed
    if (!furnizorLocked || !furnizor.trim()) missing.push("Furnizor (selecteaza din lista)");
    if (!docType) missing.push("Tip Document");
    if (uploadedFiles.length === 0) missing.push("Document");
    
    lines.forEach((line, idx) => {
      const linePrefix = lines.length > 1 ? `Produs ${idx + 1}: ` : "";
      
      if (!line.descriere.trim()) missing.push(`${linePrefix}Descriere`);
      
      const filledAmounts = [line.sumaCuTVA, line.sumaFaraTVA, line.tva].filter(
        v => v && v.trim() !== "" && v !== "0" && v !== "0,00"
      ).length;
      if (filledAmounts < 2) {
        missing.push(`${linePrefix}Minim 2 campuri pentru sume`);
      }
      
      if (!line.categoryId) missing.push(`${linePrefix}Cont`);
    });
    
    return missing;
  }, [furnizor, docType, uploadedFiles.length, lines]);

  // Helper to check if a field should show validation error
  const hasFieldError = useCallback((lineIndex: number, field: string) => {
    if (!showValidationErrors) return false;
    const line = lines[lineIndex];
    
    switch (field) {
      case 'descriere':
        return !line.descriere.trim();
      case 'sumaCuTVA':
      case 'sumaFaraTVA':
      case 'tva':
        // Check if at least 2 amount fields are filled
        const filledAmounts = [line.sumaCuTVA, line.sumaFaraTVA, line.tva].filter(
          v => v && v.trim() !== "" && v !== "0" && v !== "0,00"
        ).length;
        return filledAmounts < 2;
      case 'categoryId':
        return !line.categoryId;
      case 'subcategoryId':
        // Subcont is only required if cont is selected and has subcategories
        return false; // Optional field
      case 'tags':
        return false; // Optional field
      default:
        return false;
    }
  }, [showValidationErrors, lines]);

  // Validation error styles
  const errorBorderStyle = 'rgba(252, 165, 165, 1)';
  const errorBgStyle = 'rgba(254, 242, 242, 0.5)';
  const errorTextStyle = 'rgba(239, 68, 68, 1)';

  // Helper to check header field validation errors
  const hasHeaderFieldError = useCallback((field: string) => {
    if (!showValidationErrors) return false;

    switch (field) {
      case 'furnizor':
        // Must be selected from list (locked), not just typed
        return !furnizorLocked || !furnizor.trim();
      case 'docType':
        return !docType;
      case 'document':
        return uploadedFiles.length === 0;
      default:
        return false;
    }
  }, [showValidationErrors, furnizor, furnizorLocked, docType, uploadedFiles.length]);

  // Clear supplier field if user didn't select from list
  const handleSupplierBlur = useCallback(() => {
    // Small delay to allow click on dropdown item to register first
    setTimeout(() => {
      // Check the ref instead of stale closure state
      if (supplierSelectedRef.current) {
        // Selection was made, don't clear - reset the ref for next time
        supplierSelectedRef.current = false;
        return;
      }
      // No selection was made, clear the input
      setFurnizor("");
      setFurnizorCui("");
      setShowSupplierDropdown(false);
      setSupplierSearchResults([]);
    }, 200);
  }, []);

  // Track if save is in progress to prevent double-clicks
  const [saveInProgress, setSaveInProgress] = useState(false);

  // Handle save
  const handleSave = async (forceDraft = false) => {
    // Prevent double-clicks
    if (saveInProgress || loading) {
      console.log("Save already in progress, ignoring click");
      return;
    }
    
    const missing = checkMissingFields();
    
    // Show validation errors on fields
    setShowValidationErrors(true);
    
    if (missing.length > 0 && !forceDraft) {
      setMissingFields(missing);
      setShowDraftConfirmModal(true);
      return;
    }

    // Check for duplicates
    if (potentialDuplicates.length > 0 && !showDuplicateWarning) {
      setShowDuplicateWarning(true);
      return;
    }

    const isDraft = forceDraft || missing.length > 0;
    setSaveInProgress(true);
    setLoading(true);
    setShowDuplicateWarning(false);
    setShowDraftConfirmModal(false);
    
    try {
      const normalizedTags = lines[0].tags.trim()
        ? validateTags(lines[0].tags).tags
        : undefined;
      
      const baseInput: ExpenseInput = {
        teamId,
        amount: parseAmount(lines[0].sumaCuTVA) || parseAmount(lines[0].sumaFaraTVA),
        amountWithVat: parseAmount(lines[0].sumaCuTVA) || 0,
        amountWithoutVat: parseAmount(lines[0].sumaFaraTVA) || 0,
        vatRate: lines[0].cotaTVA ? parseFloat(lines[0].cotaTVA.replace("%", "").replace(",", ".")) : undefined,
        vatDeductible: lines[0].tvaDeductibil === "Da",
        supplier: furnizor || undefined,
        supplierCui: furnizorCui || undefined,
        description: lines[0].descriere || undefined,
        docNumber: nrDoc || undefined,
        docType: docType.toLowerCase(),
        paymentStatus: plata.toLowerCase() === "platit" ? "paid" : "unpaid",
        expenseDate: selectedDate.toISOString().split("T")[0],
        tags: normalizedTags,
        categoryId: lines[0].categoryId || undefined,
        subcategoryId: lines[0].subcategoryId || undefined,
        accountingPeriod: convertToAccountingPeriod(lines[0].lunaP) || undefined,
        status: isDraft ? "draft" : "final",
      };

      let savedExpenseId: string;
      
      // If editing, update existing expense
      if (expenseId) {
        await updateExpense(expenseId, teamId, baseInput);
        savedExpenseId = expenseId;
      } else {
        // Creating new expense
        if (lines.length === 1) {
          const result = await createExpense(baseInput);
          savedExpenseId = result.id;
        } else {
          const lineInputs: ExpenseLineInput[] = lines.map(line => {
            const lineTags = line.tags.trim() ? validateTags(line.tags).tags : undefined;
            return {
              amount: parseAmount(line.sumaCuTVA) || parseAmount(line.sumaFaraTVA),
              amountWithVat: parseAmount(line.sumaCuTVA) || 0,
              amountWithoutVat: parseAmount(line.sumaFaraTVA) || 0,
              vatRate: line.cotaTVA ? parseFloat(line.cotaTVA.replace("%", "").replace(",", ".")) : undefined,
              vatDeductible: line.tvaDeductibil === "Da",
              description: line.descriere || undefined,
              categoryId: line.categoryId || undefined,
              subcategoryId: line.subcategoryId || undefined,
              accountingPeriod: convertToAccountingPeriod(line.lunaP) || undefined,
            };
          });
          const results = await createMultiLineExpense(baseInput, lineInputs);
          savedExpenseId = results[0].id;
        }
      }

      // Upload new attachments (only files that aren't already uploaded)
      let attachmentUploadFailed = false;
      for (const file of uploadedFiles) {
        // Skip existing attachments that were loaded from the server
        if (file.isExisting) {
          continue;
        }
        
        // Extract base64 data from data URL
        const base64Data = file.preview.includes(",") 
          ? file.preview.split(",")[1] 
          : file.preview;
        
        if (!base64Data || base64Data.trim() === "") {
          console.error("Empty base64 data for file:", file.name);
          attachmentUploadFailed = true;
          continue;
        }
        
        try {
          await uploadAttachment(savedExpenseId, teamId, {
            name: file.name,
            type: file.type,
            size: file.size,
            base64: base64Data,
          });
        } catch (err) {
          console.error("Failed to upload attachment:", err);
          attachmentUploadFailed = true;
          // Continue with other files even if one fails
        }
      }
      
      if (attachmentUploadFailed) {
        console.warn("Some attachments failed to upload. Expense saved but attachments may be missing.");
      }

      // §11: Check for ±10% amount difference when RE-Form transitions from Recurent
      const isRecurentTransition = isRecurringForm && recurringTemplateId && 
        (originalExpenseStatus === 'recurent' || originalExpenseStatus === 'placeholder');
      
      if (isRecurentTransition && templateExpectedAmount && templateExpectedAmount > 0) {
        const actualAmount = parseAmount(lines[0].sumaCuTVA) || parseAmount(lines[0].sumaFaraTVA) || 0;
        if (actualAmount > 0) {
          const diffPercent = Math.abs((actualAmount - templateExpectedAmount) / templateExpectedAmount * 100);
          if (diffPercent > 10) {
            setAmountDiffData({ expected: templateExpectedAmount, actual: actualAmount, percent: diffPercent });
            setShowAmountDiffDialog(true);
            return; // Don't show success yet — wait for user decision
          }
        }
      }

      setShowSuccessModal(true);
    } catch (err) {
      console.error("Failed to save expense:", err);
      setLastSaveAttempt({ forceDraft });
      setShowServerErrorModal(true);
    } finally {
      setLoading(false);
      setSaveInProgress(false);
    }
  };

  const retrySave = useCallback(() => {
    setShowServerErrorModal(false);
    setSaveInProgress(false); // Reset to allow retry
    if (lastSaveAttempt) {
      // Small delay to ensure state is updated before retry
      setTimeout(() => handleSave(lastSaveAttempt.forceDraft), 100);
    }
  }, [lastSaveAttempt]);

  // §11: Handle amount difference dialog actions
  const handleAmountDiffConfirm = () => {
    // User chose to keep the amount without updating the template
    setShowAmountDiffDialog(false);
    setAmountDiffData(null);
    setShowSuccessModal(true);
  };

  const handleAmountDiffUpdateTemplate = async () => {
    if (!recurringTemplateId || !amountDiffData) return;
    try {
      setLoading(true);
      await updateRecurringTemplateVersioned(recurringTemplateId, teamId, {
        amount: amountDiffData.actual,
        amountWithVat: amountDiffData.actual,
      });
      setShowAmountDiffDialog(false);
      setAmountDiffData(null);
      setShowSuccessModal(true);
    } catch (err) {
      console.error('Failed to update template:', err);
      // Still show success for the expense save itself
      setShowAmountDiffDialog(false);
      setAmountDiffData(null);
      setShowSuccessModal(true);
    } finally {
      setLoading(false);
    }
  };

  // Get subcategories for a selected parent category
  const getSubcategoriesForCategory = (categoryId: string): CategoryWithChildren[] => {
    const parent = categories.find(c => c.id === categoryId);
    return parent?.children || [];
  };

  // Common button style
  const buttonBaseStyle: React.CSSProperties = {
    cursor: 'pointer',
    border: 'none',
    transition: 'all 0.2s ease'
  };

  // Show loading state when loading existing expense
  if (loadingExpense) {
    return (
      <div style={{
        width: '100%',
        minHeight: '100vh',
        backgroundColor: 'rgba(248, 248, 248, 1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: '"Inter", sans-serif'
      }}>
        <div style={{ textAlign: 'center' }}>
          <Loader2 size={32} className="animate-spin" style={{ color: 'rgba(30, 172, 200, 1)', margin: '0 auto 16px' }} />
          <p style={{ color: 'rgba(107, 114, 128, 1)', fontSize: '14px' }}>Se incarca...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      width: '100%',
      minWidth: '1728px',
      minHeight: '100vh',
      backgroundColor: 'rgba(248, 248, 248, 1)',
      boxSizing: 'border-box',
      overflowX: 'auto',
      position: 'relative',
      fontFamily: '"Inter", sans-serif'
    }}>
      {/* Dynamic styles for error placeholders */}
      <style>{`
        .error-placeholder::placeholder {
          color: rgba(239, 140, 140, 1) !important;
        }
        .normal-placeholder::placeholder {
          color: rgba(153, 161, 175, 1);
        }
      `}</style>
      {/* Modals */}
      {showDraftConfirmModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.3)', backdropFilter: 'blur(4px)' }} onClick={() => setShowDraftConfirmModal(false)} />
          <div style={{ position: 'relative', backgroundColor: 'white', borderRadius: '16px', boxShadow: '0px 25px 50px -12px rgba(0, 0, 0, 0.25)', width: '100%', maxWidth: '480px', margin: '16px', padding: '32px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '16px' }}>Salvare ca Draft?</h2>
            <p style={{ color: 'rgba(107, 114, 128, 1)', marginBottom: '16px' }}>Urmatoarele campuri nu sunt completate:</p>
            <ul style={{ marginBottom: '24px', paddingLeft: '20px' }}>
              {missingFields.map((field, i) => (
                <li key={i} style={{ color: 'rgba(239, 68, 68, 1)', fontSize: '14px' }}>{field}</li>
              ))}
            </ul>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setShowDraftConfirmModal(false)} style={{ ...buttonBaseStyle, flex: 1, padding: '12px 24px', border: '1px solid rgba(229, 231, 235, 1)', borderRadius: '9999px', backgroundColor: 'white' }}>Anulează</button>
              <button onClick={() => handleSave(true)} style={{ ...buttonBaseStyle, flex: 1, padding: '12px 24px', background: 'linear-gradient(180deg, #00D492 0%, #51A2FF 100%)', color: 'white', borderRadius: '9999px' }}>Salvează Draft</button>
            </div>
          </div>
        </div>
      )}

      {showServerErrorModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.3)', backdropFilter: 'blur(4px)' }} onClick={() => setShowServerErrorModal(false)} />
          <div style={{ position: 'relative', backgroundColor: 'white', borderRadius: '16px', boxShadow: '0px 25px 50px -12px rgba(0, 0, 0, 0.25)', width: '100%', maxWidth: '400px', margin: '16px', padding: '32px', textAlign: 'center' }}>
            <AlertTriangle size={48} style={{ color: 'rgba(239, 68, 68, 1)', marginBottom: '16px' }} />
            <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '8px' }}>Eroare la salvare</h2>
            <p style={{ color: 'rgba(107, 114, 128, 1)', marginBottom: '24px' }}>A aparut o eroare. Incercati din nou.</p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setShowServerErrorModal(false)} style={{ ...buttonBaseStyle, flex: 1, padding: '12px 24px', border: '1px solid rgba(229, 231, 235, 1)', borderRadius: '9999px', backgroundColor: 'white' }}>Inchide</button>
              <button onClick={retrySave} style={{ ...buttonBaseStyle, flex: 1, padding: '12px 24px', background: 'linear-gradient(180deg, #00D492 0%, #51A2FF 100%)', color: 'white', borderRadius: '9999px' }}>Reincearca</button>
            </div>
          </div>
        </div>
      )}

      {showSuccessModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.3)', backdropFilter: 'blur(4px)' }} />
          <div style={{ position: 'relative', backgroundColor: 'white', borderRadius: '16px', boxShadow: '0px 25px 50px -12px rgba(0, 0, 0, 0.25)', width: '100%', maxWidth: '400px', margin: '16px', padding: '32px', textAlign: 'center' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'rgba(209, 250, 229, 1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Check size={32} style={{ color: 'rgba(5, 150, 105, 1)' }} />
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '8px' }}>Salvat cu succes!</h2>
            <p style={{ color: 'rgba(107, 114, 128, 1)', marginBottom: '24px' }}>Decontul a fost creat.</p>
            <button onClick={() => router.push(`/dashboard/${teamId}/expenses`)} style={{ ...buttonBaseStyle, width: '100%', padding: '12px 24px', background: 'linear-gradient(180deg, #00D492 0%, #51A2FF 100%)', color: 'white', borderRadius: '9999px' }}>Inapoi la lista</button>
          </div>
        </div>
      )}

      {/* §11: Amount difference dialog (±10% from RE-Template) */}
      {amountDiffData && (
        <AmountDifferenceDialog
          isOpen={showAmountDiffDialog}
          onClose={handleAmountDiffConfirm}
          expectedAmount={amountDiffData.expected}
          actualAmount={amountDiffData.actual}
          differencePercent={amountDiffData.percent}
          onConfirm={handleAmountDiffConfirm}
          onUpdateTemplate={handleAmountDiffUpdateTemplate}
        />
      )}

      {/* Validation Error Toast */}
      {validationError && (
        <div style={{ position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)', zIndex: 100, backgroundColor: 'rgba(254, 226, 226, 1)', border: '1px solid rgba(252, 165, 165, 1)', borderRadius: '12px', padding: '12px 24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <AlertTriangle size={20} style={{ color: 'rgba(220, 38, 38, 1)' }} />
          <span style={{ color: 'rgba(153, 27, 27, 1)', fontSize: '14px' }}>{validationError}</span>
          <button onClick={() => setValidationError("")} style={{ ...buttonBaseStyle, background: 'none', padding: '4px' }}>
            <X size={16} style={{ color: 'rgba(153, 27, 27, 1)' }} />
          </button>
        </div>
      )}

      {/* Back Button */}
      <button 
        onMouseEnter={() => setIsHoveredBack(true)} 
        onMouseLeave={() => setIsHoveredBack(false)}
        onClick={handleBack}
        style={{
          ...buttonBaseStyle,
          width: '45px',
          height: '45px',
          backgroundColor: isHoveredBack ? 'rgba(243, 244, 246, 1)' : 'rgba(255, 255, 255, 0.7)',
          borderColor: 'rgba(229, 231, 235, 0.3)',
          borderStyle: 'solid',
          borderWidth: '1px',
          borderRadius: '12px',
          position: 'absolute',
          left: '128px',
          top: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <X size={24} style={{ color: 'rgba(107, 114, 128, 1)' }} />
      </button>

      {/* Main Form Container */}
      <div style={{
        width: '1250px',
        position: 'absolute',
        left: '239px',
        top: '60px'
      }}>
        
        {/* Top Form Header */}
        <div style={{
          width: '1250px',
          height: '90px',
          display: 'flex',
          flexDirection: 'column',
          padding: '25px',
          backgroundColor: 'rgba(255, 255, 255, 0.7)',
          borderColor: 'rgba(229, 231, 235, 0.3)',
          borderStyle: 'solid',
          borderWidth: '1px',
          boxShadow: '0px 4px 16px rgba(0, 0, 0, 0.06)',
          borderRadius: '16px',
          boxSizing: 'border-box'
        }}>
          <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
            {/* RE-Form Badge - show actual status */}
            {isRecurringForm && (() => {
              const expStatus = originalExpenseStatus;
              const label = expStatus === 'draft' ? 'Draft' : expStatus === 'approved' || expStatus === 'final' ? 'Final' : 'Recurent';
              const badgeStyles = label === 'Draft'
                ? { backgroundColor: 'rgba(255, 247, 196, 1)', borderColor: 'rgba(255, 209, 111, 0.3)', color: 'rgba(161, 120, 0, 1)' }
                : label === 'Final'
                ? { backgroundColor: 'rgba(192, 245, 229, 1)', borderColor: 'rgba(122, 231, 201, 0.3)', color: 'rgba(5, 150, 105, 1)' }
                : { backgroundColor: 'rgba(255, 224, 238, 1)', borderColor: 'rgba(255, 179, 217, 0.3)', color: 'rgba(190, 24, 93, 1)' };
              return (
                <span style={{ padding: '4px 12px', backgroundColor: badgeStyles.backgroundColor, border: `1px solid ${badgeStyles.borderColor}`, borderRadius: '9999px', fontSize: '12px', fontWeight: 600, color: badgeStyles.color, whiteSpace: 'nowrap' }}>{label}</span>
              );
            })()}
            {/* Supplier Search */}
            <div style={{ position: 'relative' }} data-supplier-dropdown>
              <img src="https://storage.googleapis.com/storage.magicpath.ai/user/365266140869578752/figma-assets/199be80d-8f1c-421a-8a15-baed1b4f7d0a.svg" alt="Search" style={{ position: 'absolute', left: '12px', top: '12px', width: '16px', zIndex: 1 }} />
              <TextInput
                placeholder="Cauta si selecteaza furnizor"
                value={furnizorLocked ? `${furnizor}${furnizorCui ? ` / ${furnizorCui}` : ""}` : furnizor}
                onChange={(e) => handleSupplierSearch(e.target.value)}
                onFocus={() => furnizor.length >= 2 && !furnizorLocked && setShowSupplierDropdown(true)}
                onBlur={handleSupplierBlur}
                disabled={furnizorLocked}
                className={hasHeaderFieldError('furnizor') ? 'error-placeholder' : 'normal-placeholder'}
                style={{
                  width: '220px',
                  height: '40px',
                  paddingLeft: '36px',
                  backgroundColor: hasHeaderFieldError('furnizor') ? errorBgStyle : 'rgba(255, 255, 255, 0.7)',
                  borderColor: hasHeaderFieldError('furnizor') ? errorBorderStyle : 'rgba(209, 213, 220, 0.5)'
                }}
              />
              {searchingSupplier && <Loader2 size={14} className="animate-spin" style={{ position: 'absolute', right: '12px', top: '13px', color: 'rgba(156, 163, 175, 1)' }} />}
              {furnizorLocked && !isRecurringForm && (
                <button onClick={handleSupplierUnlock} style={{ ...buttonBaseStyle, position: 'absolute', right: '12px', top: '12px', background: 'none', padding: '2px' }}>
                  <X size={14} style={{ color: 'rgba(156, 163, 175, 1)' }} />
                </button>
              )}
              
              {/* Supplier Dropdown */}
              {showSupplierDropdown && supplierSearchResults.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '8px', backgroundColor: 'white', borderRadius: '12px', boxShadow: '0px 10px 25px rgba(0, 0, 0, 0.15)', border: '1px solid rgba(229, 231, 235, 1)', padding: '4px 0', zIndex: 50, maxHeight: '200px', overflowY: 'auto' }}>
                  {supplierSearchResults.map((supplier, idx) => (
                    <button key={supplier.cui || idx} onClick={() => handleSupplierSelect(supplier)} style={{ ...buttonBaseStyle, width: '100%', padding: '10px 16px', textAlign: 'left', background: 'none', display: 'block' }}>
                      <span style={{ display: 'block', fontWeight: 500, color: 'rgba(17, 24, 39, 1)', fontSize: '14px' }}>{supplier.name}</span>
                      {supplier.cui && <span style={{ display: 'block', fontSize: '12px', color: 'rgba(107, 114, 128, 1)' }}>CUI: {supplier.cui}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            {/* Doc Type Dropdown */}
            <div style={{ position: 'relative' }}>
              <button 
                onClick={() => setShowDocTypeDropdown(!showDocTypeDropdown)}
                style={{
                  ...buttonBaseStyle,
                  width: '140px',
                  height: '40px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0 16px',
                  backgroundColor: 'white',
                  border: '1px solid rgba(209, 213, 220, 0.5)',
                  borderRadius: '9999px',
                  boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.04)'
                }}
              >
                <span style={{ color: docType ? 'rgba(16, 24, 40, 1)' : 'rgba(153, 161, 175, 1)', fontSize: '14px' }}>{docType || 'Tip'}</span>
                <ChevronDown size={18} style={{ color: 'rgba(156, 163, 175, 1)' }} />
              </button>
              {showDocTypeDropdown && (
                <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '8px', backgroundColor: 'white', borderRadius: '12px', boxShadow: '0px 10px 25px rgba(0, 0, 0, 0.15)', border: '1px solid rgba(229, 231, 235, 1)', padding: '4px 0', zIndex: 50, minWidth: '140px' }}>
                  {DOC_TYPES.map(type => (
                    <button key={type} onClick={() => { setDocType(type); setShowDocTypeDropdown(false); }} style={{ ...buttonBaseStyle, width: '100%', padding: '10px 16px', textAlign: 'left', background: docType === type ? 'rgba(240, 253, 250, 1)' : 'none', color: docType === type ? 'rgba(13, 148, 136, 1)' : 'rgba(55, 65, 81, 1)', fontSize: '14px' }}>
                      {type}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <TextInput placeholder="NrDoc" value={nrDoc} onChange={(e) => setNrDoc(e.target.value)} style={{ width: '120px', height: '40px' }} />
            
            {/* Date Picker */}
            <div style={{ position: 'relative' }}>
              <button onClick={() => setShowDatePicker(true)} style={{ ...buttonBaseStyle, width: '140px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', backgroundColor: 'rgba(255, 255, 255, 0.7)', border: '1px solid rgba(209, 213, 220, 0.5)', borderRadius: '9999px', boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.04)' }}>
                <span style={{ color: 'rgba(16, 24, 40, 1)', fontSize: '14px' }}>{formatDateDisplay(selectedDate)}</span>
              </button>
              {showDatePicker && (
                <CalendarModal
                  selectedDate={selectedDate}
                  onDateSelect={handleDateSelect}
                  onClose={() => setShowDatePicker(false)}
                />
              )}
            </div>

            {/* Payment Status */}
            <div style={{ position: 'relative' }}>
              <button 
                onClick={() => setShowPlataDropdown(!showPlataDropdown)}
                style={{
                  ...buttonBaseStyle,
                  width: '120px',
                  height: '40px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0 16px',
                  backgroundColor: 'white',
                  border: '1px solid rgba(209, 213, 220, 0.5)',
                  borderRadius: '9999px',
                  boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.04)'
                }}
              >
                <span style={{ color: 'rgba(16, 24, 40, 1)', fontSize: '14px' }}>{plata}</span>
                <ChevronDown size={18} style={{ color: 'rgba(156, 163, 175, 1)' }} />
              </button>
              {showPlataDropdown && (
                <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '8px', backgroundColor: 'white', borderRadius: '12px', boxShadow: '0px 10px 25px rgba(0, 0, 0, 0.15)', border: '1px solid rgba(229, 231, 235, 1)', padding: '4px 0', zIndex: 50, minWidth: '120px' }}>
                  {PAYMENT_STATUS.map(status => (
                    <button key={status} onClick={() => { setPlata(status); setShowPlataDropdown(false); }} style={{ ...buttonBaseStyle, width: '100%', padding: '10px 16px', textAlign: 'left', background: plata === status ? 'rgba(240, 253, 250, 1)' : 'none', color: plata === status ? 'rgba(13, 148, 136, 1)' : 'rgba(55, 65, 81, 1)', fontSize: '14px' }}>
                      {status}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Upload Button */}
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} multiple accept="image/*,application/pdf" style={{ display: 'none' }} />
            <button 
              onClick={() => fileInputRef.current?.click()}
              style={{
                ...buttonBaseStyle,
                marginLeft: 'auto',
                width: '177px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                backgroundColor: hasHeaderFieldError('document') ? errorBgStyle : 'white',
                border: `1px solid ${hasHeaderFieldError('document') ? errorBorderStyle : 'rgba(209, 213, 220, 0.5)'}`,
                borderRadius: '9999px',
                boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.04)'
              }}
            >
              <span style={{ color: hasHeaderFieldError('document') ? errorTextStyle : 'rgba(74, 85, 101, 1)', fontSize: '14px' }}>
                {uploadedFiles.length > 0 ? `${uploadedFiles.length} fisier${uploadedFiles.length > 1 ? 'e' : ''}` : 'Încarcă document'}
              </span>
              <Upload size={16} style={{ color: hasHeaderFieldError('document') ? errorTextStyle : 'rgba(107, 114, 128, 1)' }} />
            </button>
          </div>
        </div>

        {/* Form Details Area */}
        <div style={{ display: 'flex', gap: '16px', marginTop: '12px', alignItems: 'flex-start' }}>
          {/* Left Column - Form Fields */}
          <div style={{ width: '493.5px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {lines.map((line, index) => (
              <div key={index} style={{
                padding: '33px 25px 25px 25px',
                backgroundColor: 'rgba(255, 255, 255, 0.7)',
                border: '1px solid rgba(229, 231, 235, 0.3)',
                borderRadius: '16px',
                boxShadow: '0px 4px 16px rgba(0, 0, 0, 0.06)',
                position: 'relative'
              }}>
                {lines.length > 1 && (
                  <button onClick={() => setLines(lines.filter((_, i) => i !== index))} style={{ ...buttonBaseStyle, position: 'absolute', right: '-10px', top: '-10px', width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'white', border: '1px solid rgba(229, 231, 235, 1)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)' }}>
                    <X size={14} style={{ color: 'rgba(239, 68, 68, 1)' }} />
                  </button>
                )}
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Descriere */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <label style={{ width: '128px', color: hasFieldError(index, 'descriere') ? errorTextStyle : 'rgba(74, 85, 101, 1)', fontSize: '13px', fontWeight: 200, paddingTop: '10px' }}>Descriere</label>
                    <textarea 
                      placeholder="Adauga descriere..." 
                      value={line.descriere}
                      onChange={(e) => updateLine(index, "descriere", e.target.value)}
                      className={hasFieldError(index, 'descriere') ? 'error-placeholder' : 'normal-placeholder'}
                      style={{ 
                        width: '296px', 
                        height: '64px', 
                        padding: '10px 16px', 
                        backgroundColor: hasFieldError(index, 'descriere') ? errorBgStyle : 'rgba(255, 255, 255, 0.7)', 
                        border: `1px solid ${hasFieldError(index, 'descriere') ? errorBorderStyle : 'rgba(209, 213, 220, 0.5)'}`, 
                        borderRadius: '16px', 
                        fontSize: '14px', 
                        fontFamily: 'inherit', 
                        resize: 'none', 
                        outline: 'none'
                      }} 
                    />
                  </div>

                  {/* Suma cu TVA */}
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <label style={{ width: '128px', color: hasFieldError(index, 'sumaCuTVA') ? errorTextStyle : 'rgba(74, 85, 101, 1)', fontSize: '13px', fontWeight: 200 }}>Suma cu TVA</label>
                    <div style={{ position: 'relative', width: '296px' }}>
                      <TextInput 
                        placeholder="0,00"
                        value={line.sumaCuTVA}
                        onChange={(e) => updateLine(index, "sumaCuTVA", e.target.value)}
                        onBlur={() => handleAmountBlur(index, "sumaCuTVA")}
                        readOnly={line.calculatedField === "sumaCuTVA"}
                        className={hasFieldError(index, 'sumaCuTVA') ? 'error-placeholder' : 'normal-placeholder'}
                        style={{ 
                          paddingRight: '70px', 
                          backgroundColor: line.calculatedField === "sumaCuTVA" ? 'rgba(243, 244, 246, 0.5)' : hasFieldError(index, 'sumaCuTVA') ? errorBgStyle : 'rgba(255, 255, 255, 0.7)',
                          borderColor: hasFieldError(index, 'sumaCuTVA') ? errorBorderStyle : 'rgba(209, 213, 220, 0.5)'
                        }} 
                      />
                      <div style={{ position: 'absolute', right: '16px', top: '9px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {line.calculatedField === "sumaCuTVA" && (
                          <button onClick={() => resetAmountFields(index)} style={{ ...buttonBaseStyle, background: 'none', padding: '2px' }}>
                            <X size={12} style={{ color: 'rgba(156, 163, 175, 1)' }} />
                          </button>
                        )}
                        <span style={{ color: 'rgba(107, 114, 128, 1)', fontSize: '12px', fontWeight: 500 }}>Lei</span>
                        <span style={{ fontSize: '12px' }}>🇷🇴</span>
                      </div>
                    </div>
                  </div>

                  {/* Suma fara TVA */}
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <label style={{ width: '128px', color: hasFieldError(index, 'sumaFaraTVA') ? errorTextStyle : 'rgba(74, 85, 101, 1)', fontSize: '13px', fontWeight: 200 }}>Suma fara TVA</label>
                    <div style={{ position: 'relative', width: '296px' }}>
                      <TextInput 
                        placeholder="0,00"
                        value={line.sumaFaraTVA}
                        onChange={(e) => updateLine(index, "sumaFaraTVA", e.target.value)}
                        onBlur={() => handleAmountBlur(index, "sumaFaraTVA")}
                        readOnly={line.calculatedField === "sumaFaraTVA"}
                        className={hasFieldError(index, 'sumaFaraTVA') ? 'error-placeholder' : 'normal-placeholder'}
                        style={{ 
                          paddingRight: '70px', 
                          backgroundColor: line.calculatedField === "sumaFaraTVA" ? 'rgba(243, 244, 246, 0.5)' : hasFieldError(index, 'sumaFaraTVA') ? errorBgStyle : 'rgba(255, 255, 255, 0.7)',
                          borderColor: hasFieldError(index, 'sumaFaraTVA') ? errorBorderStyle : 'rgba(209, 213, 220, 0.5)'
                        }} 
                      />
                      <div style={{ position: 'absolute', right: '16px', top: '9px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {line.calculatedField === "sumaFaraTVA" && (
                          <button onClick={() => resetAmountFields(index)} style={{ ...buttonBaseStyle, background: 'none', padding: '2px' }}>
                            <X size={12} style={{ color: 'rgba(156, 163, 175, 1)' }} />
                          </button>
                        )}
                        <span style={{ color: 'rgba(107, 114, 128, 1)', fontSize: '12px', fontWeight: 500 }}>Lei</span>
                        <span style={{ fontSize: '12px' }}>🇷🇴</span>
                      </div>
                    </div>
                  </div>

                  {/* TVA */}
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <label style={{ width: '128px', color: hasFieldError(index, 'tva') ? errorTextStyle : 'rgba(74, 85, 101, 1)', fontSize: '13px', fontWeight: 200 }}>TVA</label>
                    <div style={{ position: 'relative', width: '296px' }}>
                      <TextInput 
                        placeholder="0,00"
                        value={line.tva}
                        readOnly={true}
                        disabled={true}
                        className={hasFieldError(index, 'tva') ? 'error-placeholder' : 'normal-placeholder'}
                        style={{ 
                          paddingRight: '70px', 
                          backgroundColor: 'rgba(243, 244, 246, 0.5)',
                          borderColor: hasFieldError(index, 'tva') ? errorBorderStyle : 'rgba(209, 213, 220, 0.5)',
                          cursor: 'not-allowed'
                        }} 
                      />
                      <div style={{ position: 'absolute', right: '16px', top: '9px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ color: 'rgba(107, 114, 128, 1)', fontSize: '12px', fontWeight: 500 }}>Lei</span>
                        <span style={{ fontSize: '12px' }}>🇷🇴</span>
                      </div>
                    </div>
                  </div>

                  {/* Cota TVA */}
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <label style={{ width: '128px', color: 'rgba(74, 85, 101, 1)', fontSize: '13px', fontWeight: 200 }}>Cota TVA (%)</label>
                    <div style={{ width: '296px', height: '36px', padding: '0 16px', backgroundColor: 'rgba(243, 244, 246, 0.5)', border: '1px solid rgba(209, 213, 220, 0.5)', borderRadius: '9999px', display: 'flex', alignItems: 'center' }}>
                      <span style={{ color: 'rgba(74, 85, 101, 0.5)', fontSize: '14px' }}>{line.cotaTVA || '-'}</span>
                    </div>
                  </div>

                  {/* Luna P&L */}
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <label style={{ width: '128px', color: 'rgba(74, 85, 101, 1)', fontSize: '13px', fontWeight: 200 }}>Luna P&L</label>
                    <div style={{ position: 'relative', width: '296px' }}>
                      <button 
                        disabled={isRecurringForm}
                        onClick={() => {
                          if (isRecurringForm) return;
                          if (openMonthPickerIndex === index) {
                            setOpenMonthPickerIndex(-1);
                          } else {
                            // Parse current lunaP to set the year
                            const parts = line.lunaP.split(' ');
                            if (parts.length === 2) {
                              setMonthPickerYear(parseInt(parts[1]) || new Date().getFullYear());
                            }
                            setOpenMonthPickerIndex(index);
                          }
                        }}
                        style={{ ...buttonBaseStyle, width: '100%', height: '36px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 16px', backgroundColor: isRecurringForm ? 'rgba(243, 244, 246, 0.5)' : 'white', border: '1px solid rgba(209, 213, 220, 0.5)', borderRadius: '9999px', boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.04)', cursor: isRecurringForm ? 'not-allowed' : 'pointer', opacity: isRecurringForm ? 0.7 : 1 }}
                      >
                        <span style={{ color: 'rgba(16, 24, 40, 1)', fontSize: '14px' }}>{line.lunaP}</span>
                        <ChevronDown size={18} style={{ color: 'rgba(156, 163, 175, 1)' }} />
                      </button>
                      
                      {/* Month Picker Dropdown */}
                      {openMonthPickerIndex === index && (
                        <>
                          <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setOpenMonthPickerIndex(-1)} />
                          <div style={{ 
                            position: 'absolute', 
                            top: '100%', 
                            left: 0, 
                            marginTop: '8px', 
                            backgroundColor: 'white', 
                            borderRadius: '16px', 
                            boxShadow: '0px 10px 25px rgba(0, 0, 0, 0.15)', 
                            border: '1px solid rgba(229, 231, 235, 1)', 
                            padding: '16px',
                            zIndex: 50,
                            width: '280px'
                          }}>
                            {/* Year Navigation */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                              <button 
                                onClick={(e) => { e.stopPropagation(); setMonthPickerYear(y => y - 1); }}
                                style={{ ...buttonBaseStyle, background: 'none', padding: '8px', color: 'rgba(107, 114, 128, 1)' }}
                              >
                                <ChevronDown size={18} style={{ transform: 'rotate(90deg)' }} />
                              </button>
                              <span style={{ fontSize: '16px', fontWeight: 600, color: 'rgba(17, 24, 39, 1)' }}>{monthPickerYear}</span>
                              <button 
                                onClick={(e) => { e.stopPropagation(); setMonthPickerYear(y => y + 1); }}
                                style={{ ...buttonBaseStyle, background: 'none', padding: '8px', color: 'rgba(107, 114, 128, 1)' }}
                              >
                                <ChevronDown size={18} style={{ transform: 'rotate(-90deg)' }} />
                              </button>
                            </div>
                            
                            {/* Month Grid */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                              {MONTHS_RO.map((month, monthIdx) => {
                                const isSelected = line.lunaP === `${MONTHS_RO_LOWER[monthIdx]} ${monthPickerYear}`;
                                return (
                                  <button
                                    key={month}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      updateLine(index, "lunaP", `${MONTHS_RO_LOWER[monthIdx]} ${monthPickerYear}`);
                                      setOpenMonthPickerIndex(-1);
                                    }}
                                    style={{
                                      ...buttonBaseStyle,
                                      padding: '10px 8px',
                                      backgroundColor: isSelected ? 'rgba(240, 253, 250, 1)' : 'transparent',
                                      border: isSelected ? '1px solid rgba(13, 148, 136, 0.3)' : '1px solid transparent',
                                      borderRadius: '8px',
                                      color: isSelected ? 'rgba(13, 148, 136, 1)' : 'rgba(55, 65, 81, 1)',
                                      fontSize: '13px',
                                      fontWeight: isSelected ? 500 : 400,
                                      textAlign: 'center'
                                    }}
                                  >
                                    {month}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Cont */}
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <label style={{ width: '128px', color: hasFieldError(index, 'categoryId') ? errorTextStyle : 'rgba(74, 85, 101, 1)', fontSize: '13px', fontWeight: 200 }}>Cont</label>
                    <div style={{ position: 'relative', width: '296px' }}>
                      <select 
                        value={line.categoryId} 
                        disabled={isRecurringForm}
                        onChange={(e) => {
                          updateLine(index, "categoryId", e.target.value);
                          updateLine(index, "subcategoryId", "");
                        }}
                        style={{ 
                          width: '100%', 
                          height: '36px', 
                          padding: '0 32px 0 16px', 
                          backgroundColor: isRecurringForm ? 'rgba(243, 244, 246, 0.5)' : hasFieldError(index, 'categoryId') ? errorBgStyle : 'white', 
                          border: `1px solid ${hasFieldError(index, 'categoryId') ? errorBorderStyle : 'rgba(209, 213, 220, 0.5)'}`, 
                          borderRadius: '9999px', 
                          fontSize: '14px', 
                          appearance: 'none', 
                          cursor: isRecurringForm ? 'not-allowed' : 'pointer', 
                          outline: 'none', 
                          color: hasFieldError(index, 'categoryId') ? errorTextStyle : line.categoryId ? 'rgba(16, 24, 40, 1)' : 'rgba(153, 161, 175, 1)' 
                        }}
                      >
                        <option value="">Select...</option>
                        {categories.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                      <ChevronDown size={18} style={{ position: 'absolute', right: '12px', top: '9px', color: 'rgba(156, 163, 175, 1)', pointerEvents: 'none' }} />
                    </div>
                  </div>

                  {/* Subcont */}
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <label style={{ width: '128px', color: 'rgba(74, 85, 101, 1)', fontSize: '13px', fontWeight: 200 }}>Subcont</label>
                    <div style={{ position: 'relative', width: '296px' }}>
                      <select 
                        value={line.subcategoryId} 
                        onChange={(e) => updateLine(index, "subcategoryId", e.target.value)}
                        disabled={isRecurringForm || !line.categoryId}
                        style={{ 
                          width: '100%', 
                          height: '36px', 
                          padding: '0 32px 0 16px', 
                          backgroundColor: line.categoryId ? 'white' : 'rgba(243, 244, 246, 0.5)', 
                          border: '1px solid rgba(209, 213, 220, 0.5)', 
                          borderRadius: '9999px', 
                          fontSize: '14px', 
                          appearance: 'none', 
                          cursor: line.categoryId ? 'pointer' : 'not-allowed', 
                          outline: 'none', 
                          color: line.subcategoryId ? 'rgba(16, 24, 40, 1)' : 'rgba(153, 161, 175, 1)' 
                        }}
                      >
                        <option value="">Select...</option>
                        {getSubcategoriesForCategory(line.categoryId).map(sub => (
                          <option key={sub.id} value={sub.id}>{sub.name}</option>
                        ))}
                      </select>
                      <ChevronDown size={18} style={{ position: 'absolute', right: '12px', top: '9px', color: 'rgba(156, 163, 175, 1)', pointerEvents: 'none' }} />
                    </div>
                  </div>

                  {/* TVA Deductibil */}
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <label style={{ width: '128px', color: 'rgba(74, 85, 101, 1)', fontSize: '13px', fontWeight: 200 }}>TVA Deductibil</label>
                    <div style={{ position: 'relative', width: '296px' }}>
                      <select 
                        value={line.tvaDeductibil} 
                        onChange={(e) => updateLine(index, "tvaDeductibil", e.target.value)}
                        style={{ width: '100%', height: '36px', padding: '0 32px 0 16px', backgroundColor: 'white', border: '1px solid rgba(209, 213, 220, 0.5)', borderRadius: '9999px', fontSize: '14px', appearance: 'none', cursor: 'pointer', outline: 'none', color: 'rgba(16, 24, 40, 1)' }}
                      >
                        {TVA_DEDUCTIBIL_OPTIONS.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                      <ChevronDown size={18} style={{ position: 'absolute', right: '12px', top: '9px', color: 'rgba(156, 163, 175, 1)', pointerEvents: 'none' }} />
                    </div>
                  </div>

                  {/* Tags */}
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <label style={{ width: '128px', color: 'rgba(74, 85, 101, 1)', fontSize: '13px', fontWeight: 200 }}>Tags</label>
                    <TextInput 
                      placeholder="#tags" 
                      value={line.tags}
                      onChange={(e) => updateLine(index, "tags", e.target.value)}
                      className="normal-placeholder"
                    />
                  </div>
                </div>
              </div>
            ))}

            {/* Delete button (edit mode only) */}
            {expenseId && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button 
                  onClick={handleDelete}
                  disabled={deleting}
                  style={{
                    ...buttonBaseStyle,
                    padding: '8px 24px',
                    height: '40px',
                    backgroundColor: 'white',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                    borderRadius: '9999px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    opacity: deleting ? 0.5 : 1
                  }}
                >
                  {deleting ? (
                    <Loader2 size={14} className="animate-spin" style={{ color: 'rgba(239, 68, 68, 1)' }} />
                  ) : (
                    <span style={{ color: 'rgba(239, 68, 68, 1)', fontSize: '13px', fontWeight: 500 }}>Șterge cheltuială</span>
                  )}
                </button>
              </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '30px', marginTop: '12px' }}>
              <button 
                onClick={addLine}
                disabled={lines.length >= MAX_LINE_ITEMS}
                style={{
                  ...buttonBaseStyle,
                  flex: 1,
                  height: '54.5px',
                  backgroundColor: 'white',
                  border: '2px solid rgba(0, 187, 167, 1)',
                  borderRadius: '9999px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  opacity: lines.length >= MAX_LINE_ITEMS ? 0.5 : 1
                }}
              >
                <span style={{ color: 'rgba(54, 65, 83, 1)', fontSize: '15px', fontWeight: 500 }}>Adauga produs</span>
                <Plus size={18} style={{ color: 'rgba(54, 65, 83, 1)' }} />
              </button>
              <button 
                onClick={() => handleSave(false)}
                disabled={loading}
                style={{
                  ...buttonBaseStyle,
                  flex: 1,
                  height: '50.5px',
                  background: 'linear-gradient(180deg, #00D492 0%, #51A2FF 100%)',
                  borderRadius: '9999px',
                  boxShadow: '0px 10px 15px -3px rgba(0, 0, 0, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: loading ? 0.7 : 1
                }}
              >
                {loading ? (
                  <Loader2 size={20} className="animate-spin" style={{ color: 'white' }} />
                ) : (
                  <span style={{ color: 'white', fontSize: '15px', fontWeight: 500 }}>Salveaza</span>
                )}
              </button>
            </div>
          </div>

          {/* Right Side Document Preview */}
          <div style={{
            width: '740px',
            backgroundColor: 'rgba(255, 255, 255, 0.7)',
            border: '1px solid rgba(229, 231, 235, 0.3)',
            borderRadius: '16px',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0px 4px 16px rgba(0, 0, 0, 0.06)',
            flexShrink: 0,
            alignSelf: 'flex-start',
            position: 'relative'
          }}>
            {uploadedFiles.length > 0 ? (
              <>
                {/* Image Zoom Controls - Only show for images */}
                {uploadedFiles[activePreviewIndex]?.type.startsWith('image/') && (
                  <div style={{ 
                    position: 'absolute', 
                    top: '16px', 
                    left: '16px', 
                    display: 'flex', 
                    gap: '8px', 
                    backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                    padding: '8px 12px', 
                    borderRadius: '9999px', 
                    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.15)',
                    zIndex: 10
                  }}>
                    <button 
                      onClick={() => setImageZoom(prev => Math.max(0.5, prev - 0.25))}
                      style={{ ...buttonBaseStyle, width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'rgba(243, 244, 246, 1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 600, color: 'rgba(55, 65, 81, 1)' }}
                      title="Zoom out"
                    >
                      −
                    </button>
                    <span style={{ display: 'flex', alignItems: 'center', fontSize: '12px', fontWeight: 500, color: 'rgba(55, 65, 81, 1)', minWidth: '45px', justifyContent: 'center' }}>
                      {Math.round(imageZoom * 100)}%
                    </span>
                    <button 
                      onClick={() => setImageZoom(prev => Math.min(3, prev + 0.25))}
                      style={{ ...buttonBaseStyle, width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'rgba(243, 244, 246, 1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 600, color: 'rgba(55, 65, 81, 1)' }}
                      title="Zoom in"
                    >
                      +
                    </button>
                    <div style={{ width: '1px', backgroundColor: 'rgba(209, 213, 220, 1)', margin: '0 4px' }} />
                    <button 
                      onClick={() => setImageZoom(1)}
                      style={{ ...buttonBaseStyle, padding: '4px 10px', borderRadius: '9999px', backgroundColor: imageZoom === 1 ? 'rgba(13, 148, 136, 0.1)' : 'rgba(243, 244, 246, 1)', fontSize: '11px', fontWeight: 500, color: imageZoom === 1 ? 'rgba(13, 148, 136, 1)' : 'rgba(55, 65, 81, 1)' }}
                      title="Fit to view"
                    >
                      Fit
                    </button>
                    <button 
                      onClick={() => setImageZoom(1.5)}
                      style={{ ...buttonBaseStyle, padding: '4px 10px', borderRadius: '9999px', backgroundColor: imageZoom === 1.5 ? 'rgba(13, 148, 136, 0.1)' : 'rgba(243, 244, 246, 1)', fontSize: '11px', fontWeight: 500, color: imageZoom === 1.5 ? 'rgba(13, 148, 136, 1)' : 'rgba(55, 65, 81, 1)' }}
                      title="150% zoom"
                    >
                      150%
                    </button>
                    <button 
                      onClick={() => setImageZoom(2)}
                      style={{ ...buttonBaseStyle, padding: '4px 10px', borderRadius: '9999px', backgroundColor: imageZoom === 2 ? 'rgba(13, 148, 136, 0.1)' : 'rgba(243, 244, 246, 1)', fontSize: '11px', fontWeight: 500, color: imageZoom === 2 ? 'rgba(13, 148, 136, 1)' : 'rgba(55, 65, 81, 1)' }}
                      title="200% zoom"
                    >
                      200%
                    </button>
                  </div>
                )}

                {/* Preview Area - image takes full width */}
                <div style={{ 
                  position: 'relative',
                  padding: uploadedFiles[activePreviewIndex]?.type.startsWith('image/') ? '60px 16px 16px 16px' : '0'
                }}>
                  {/* Preview Image/PDF */}
                  {uploadedFiles[activePreviewIndex]?.type.startsWith('image/') ? (
                    <img 
                      src={uploadedFiles[activePreviewIndex].preview} 
                      alt="Document preview" 
                      style={{ 
                        width: `${100 * imageZoom}%`,
                        height: 'auto',
                        display: 'block',
                        transition: 'all 0.2s ease'
                      }} 
                    />
                  ) : (
                    <embed 
                      src={`${uploadedFiles[activePreviewIndex].preview}#toolbar=0&navpanes=0&scrollbar=1`}
                      type="application/pdf"
                      style={{ width: '100%', height: '800px', border: 'none', borderRadius: '8px' }}
                      title="Document preview"
                    />
                  )}
                </div>
                
                {/* File Navigation */}
                {uploadedFiles.length > 1 && (
                  <div style={{ position: 'absolute', bottom: '16px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '8px', backgroundColor: 'rgba(255, 255, 255, 0.95)', padding: '8px 16px', borderRadius: '9999px', boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.15)', zIndex: 10 }}>
                    {uploadedFiles.map((_, idx) => (
                      <button 
                        key={idx} 
                        onClick={() => { setActivePreviewIndex(idx); setImageZoom(1); }}
                        style={{ 
                          ...buttonBaseStyle, 
                          width: '8px', 
                          height: '8px', 
                          borderRadius: '50%', 
                          backgroundColor: idx === activePreviewIndex ? 'rgba(13, 148, 136, 1)' : 'rgba(209, 213, 220, 1)',
                          padding: 0
                        }} 
                      />
                    ))}
                  </div>
                )}
                
                {/* Remove Button */}
                <button 
                  onClick={() => removeUploadedFile(activePreviewIndex)}
                  style={{ ...buttonBaseStyle, position: 'absolute', top: '16px', right: '16px', width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'rgba(255, 255, 255, 0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.15)', zIndex: 10 }}
                >
                  <X size={16} style={{ color: 'rgba(239, 68, 68, 1)' }} />
                </button>
              </>
            ) : (
              <div style={{ minHeight: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
                <Upload size={48} style={{ color: 'rgba(209, 213, 220, 1)' }} />
                <span style={{ color: 'rgba(153, 161, 175, 1)', fontSize: '15px', fontWeight: 300 }}>Documentul va aparea aici</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
