"use client";

import React, { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { X, Upload, ChevronDown, Plus, Check, AlertTriangle, Loader2 } from "lucide-react";
import { createExpense, createMultiLineExpense, submitForApproval, ExpenseInput, ExpenseLineInput } from "@/app/actions/expenses";
import { uploadAttachment } from "@/app/actions/attachments";
import { CalendarModal } from "@/components/ui/calendar-modal";
import { MonthYearPicker } from "@/components/ui/month-year-picker";
import { getCategoryTree, CategoryWithChildren } from "@/app/actions/categories";
import { searchSuppliers, SupplierSearchResult } from "@/app/actions/suppliers";
import { getTagSuggestions, TagSuggestion } from "@/app/actions/tags";
import { validateTags } from "@/lib/utils/tags";
import { checkForDuplicates } from "@/app/actions/duplicate-detection";
import { PotentialDuplicate, formatDuplicateWarning } from "@/lib/utils/duplicate-detection";

// Updated doc types as per spec
const DOC_TYPES = ["Bon", "Factura", "eFactura", "Chitanta", "Altceva"];
const PAYMENT_STATUS = ["Platit", "Neplatit", "Partial"];
const TVA_DEDUCTIBIL_OPTIONS = ["Nu", "Da"];

// Date validation constants
const MIN_DATE = new Date("2026-01-01");

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
  // Track which fields were manually entered (for smart auto-calc)
  manualFields: ("sumaCuTVA" | "sumaFaraTVA" | "tva")[];
  // Track which field is calculated (read-only)
  calculatedField: "sumaCuTVA" | "sumaFaraTVA" | "tva" | null;
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

// Smart VAT auto-calculation: when 2 of 3 fields are entered, calculate the 3rd
function calculateVATFromTwoFields(
  field1: "sumaCuTVA" | "sumaFaraTVA" | "tva",
  value1: number,
  field2: "sumaCuTVA" | "sumaFaraTVA" | "tva",
  value2: number
): { sumaCuTVA: number; sumaFaraTVA: number; tva: number; cotaTVA: number; calculatedField: "sumaCuTVA" | "sumaFaraTVA" | "tva" } {
  let sumaCuTVA = 0, sumaFaraTVA = 0, tva = 0;
  let calculatedField: "sumaCuTVA" | "sumaFaraTVA" | "tva";

  // Assign known values
  if (field1 === "sumaCuTVA") sumaCuTVA = value1;
  else if (field1 === "sumaFaraTVA") sumaFaraTVA = value1;
  else tva = value1;

  if (field2 === "sumaCuTVA") sumaCuTVA = value2;
  else if (field2 === "sumaFaraTVA") sumaFaraTVA = value2;
  else tva = value2;

  // Calculate the missing field
  if (field1 !== "sumaCuTVA" && field2 !== "sumaCuTVA") {
    // Calculate sumaCuTVA from sumaFaraTVA + tva
    sumaCuTVA = sumaFaraTVA + tva;
    calculatedField = "sumaCuTVA";
  } else if (field1 !== "sumaFaraTVA" && field2 !== "sumaFaraTVA") {
    // Calculate sumaFaraTVA from sumaCuTVA - tva
    sumaFaraTVA = sumaCuTVA - tva;
    calculatedField = "sumaFaraTVA";
  } else {
    // Calculate tva from sumaCuTVA - sumaFaraTVA
    tva = sumaCuTVA - sumaFaraTVA;
    calculatedField = "tva";
  }

  // Calculate VAT rate
  const cotaTVA = sumaFaraTVA > 0 ? (tva / sumaFaraTVA) * 100 : 0;

  return { sumaCuTVA, sumaFaraTVA, tva, cotaTVA, calculatedField };
}

// Legacy function for backward compatibility
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
  const [furnizorCui, setFurnizorCui] = useState("");
  const [furnizorLocked, setFurnizorLocked] = useState(false);
  const [docType, setDocType] = useState("Factura");
  const [nrDoc, setNrDoc] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [plata, setPlata] = useState("Neplatit"); // Default per spec: Neplătit
  
  // Document upload - support multiple files
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; preview: string; type: string; size: number }[]>([]);
  const [activePreviewIndex, setActivePreviewIndex] = useState(0);
  
  // Dropdown states
  const [showDocTypeDropdown, setShowDocTypeDropdown] = useState(false);
  const [showPlataDropdown, setShowPlataDropdown] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Supplier search state
  const [supplierSearchResults, setSupplierSearchResults] = useState<SupplierSearchResult[]>([]);
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
  const [searchingSupplier, setSearchingSupplier] = useState(false);
  const [supplierSearchError, setSupplierSearchError] = useState(false);
  const [lastSupplierQuery, setLastSupplierQuery] = useState("");
  const supplierSearchTimeout = useRef<NodeJS.Timeout | null>(null);

  // Tags autocomplete state
  const [tagSuggestions, setTagSuggestions] = useState<TagSuggestion[]>([]);
  const [showTagSuggestions, setShowTagSuggestions] = useState<number | null>(null);
  const [searchingTags, setSearchingTags] = useState(false);
  const tagSearchTimeout = useRef<NodeJS.Timeout | null>(null);

  // Duplicate detection
  const [potentialDuplicates, setPotentialDuplicates] = useState<PotentialDuplicate[]>([]);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [duplicateCheckPending, setDuplicateCheckPending] = useState(false);

  // Draft confirmation modal
  const [showDraftConfirmModal, setShowDraftConfirmModal] = useState(false);
  const [missingFields, setMissingFields] = useState<string[]>([]);

  // Success modal and validation
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [validationError, setValidationError] = useState("");
  const [showServerErrorModal, setShowServerErrorModal] = useState(false);
  const [lastSaveAttempt, setLastSaveAttempt] = useState<{ forceDraft: boolean } | null>(null);

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

  // Update Luna P&L when date changes
  useEffect(() => {
    const months = ["ianuarie", "februarie", "martie", "aprilie", "mai", "iunie", 
                    "iulie", "august", "septembrie", "octombrie", "noiembrie", "decembrie"];
    const newMonthYear = `${months[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`;
    
    setLines(prevLines => prevLines.map(line => ({
      ...line,
      lunaP: line.lunaP || newMonthYear, // Only set if not already set
    })));
  }, [selectedDate]);

  // Supplier search handler
  const handleSupplierSearch = useCallback(async (query: string) => {
    if (furnizorLocked) return;
    
    setFurnizor(query);
    setLastSupplierQuery(query);
    setSupplierSearchError(false);
    
    // Clear previous timeout
    if (supplierSearchTimeout.current) {
      clearTimeout(supplierSearchTimeout.current);
    }

    // Hide dropdown if query is too short
    if (query.length < 3) {
      setShowSupplierDropdown(false);
      setSupplierSearchResults([]);
      return;
    }

    // Debounce search
    supplierSearchTimeout.current = setTimeout(async () => {
      setSearchingSupplier(true);
      try {
        const results = await searchSuppliers(query, teamId);
        setSupplierSearchResults(results);
        setShowSupplierDropdown(true);
        setSupplierSearchError(false);
      } catch (error) {
        console.error("Supplier search error:", error);
        setSupplierSearchError(true);
        setShowSupplierDropdown(true);
      } finally {
        setSearchingSupplier(false);
      }
    }, 300);
  }, [teamId, furnizorLocked]);

  // Retry supplier search
  const retrySupplierSearch = useCallback(() => {
    if (lastSupplierQuery) {
      handleSupplierSearch(lastSupplierQuery);
    }
  }, [lastSupplierQuery, handleSupplierSearch]);

  // Select supplier from dropdown
  const handleSupplierSelect = useCallback((supplier: SupplierSearchResult) => {
    setFurnizor(supplier.name);
    setFurnizorCui(supplier.cui);
    setFurnizorLocked(true);
    setShowSupplierDropdown(false);
  }, []);

  // Unlock supplier field to allow re-search
  const handleSupplierUnlock = useCallback(() => {
    setFurnizorLocked(false);
    setFurnizor("");
    setFurnizorCui("");
  }, []);

  // Tags search handler
  const handleTagsSearch = useCallback(async (query: string, lineIndex: number) => {
    // Clear previous timeout
    if (tagSearchTimeout.current) {
      clearTimeout(tagSearchTimeout.current);
    }

    // Get the last tag being typed
    const tags = query.split(/[,\s]+/);
    const currentTag = tags[tags.length - 1];

    if (currentTag.length < 1) {
      setShowTagSuggestions(null);
      setTagSuggestions([]);
      return;
    }

    // Debounce search
    tagSearchTimeout.current = setTimeout(async () => {
      setSearchingTags(true);
      try {
        const results = await getTagSuggestions(currentTag, teamId);
        setTagSuggestions(results);
        setShowTagSuggestions(results.length > 0 ? lineIndex : null);
      } catch (error) {
        console.error("Tags search error:", error);
      } finally {
        setSearchingTags(false);
      }
    }, 200);
  }, [teamId]);

  // Select tag from suggestions
  const handleTagSelect = useCallback((tag: string, lineIndex: number) => {
    setLines(prevLines => {
      const newLines = [...prevLines];
      const currentTags = newLines[lineIndex].tags;
      const tagParts = currentTags.split(/[,\s]+/).filter(t => t.length > 0);
      tagParts.pop(); // Remove the partial tag being typed
      tagParts.push(tag);
      newLines[lineIndex].tags = tagParts.join(", ");
      return newLines;
    });
    setShowTagSuggestions(null);
  }, []);

  // Reset all amount fields in a line
  const resetAmountFields = useCallback((lineIndex: number) => {
    setLines(prevLines => {
      const newLines = [...prevLines];
      newLines[lineIndex] = {
        ...newLines[lineIndex],
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

  // Validate date: must be after Jan 1 2026 and not in the future
  const validateDate = useCallback((date: Date): { valid: boolean; error?: string } => {
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today
    
    if (date > today) {
      return { valid: false, error: "Data nu poate fi in viitor" };
    }
    
    if (date < MIN_DATE) {
      return { valid: false, error: "Data trebuie sa fie dupa 1 ianuarie 2026" };
    }
    
    return { valid: true };
  }, []);

  // Handle date selection with validation
  const handleDateSelect = useCallback((date: Date) => {
    const validation = validateDate(date);
    if (!validation.valid) {
      setValidationError(validation.error || "Data invalida");
      return;
    }
    setSelectedDate(date);
    setShowDatePicker(false);
    setValidationError("");
  }, [validateDate]);

  // Check for duplicates (debounced)
  const duplicateCheckTimeout = useRef<NodeJS.Timeout | null>(null);
  
  const checkDuplicates = useCallback(async () => {
    if (duplicateCheckTimeout.current) {
      clearTimeout(duplicateCheckTimeout.current);
    }
    
    duplicateCheckTimeout.current = setTimeout(async () => {
      setDuplicateCheckPending(true);
      try {
        const duplicates = await checkForDuplicates(teamId, {
          docNumber: nrDoc || undefined,
          supplier: furnizor || undefined,
          expenseDate: selectedDate.toISOString().split("T")[0],
          amountWithVat: lines[0]?.sumaCuTVA ? parseAmount(lines[0].sumaCuTVA) : undefined,
        });
        setPotentialDuplicates(duplicates);
      } catch (error) {
        console.error("Duplicate check error:", error);
      } finally {
        setDuplicateCheckPending(false);
      }
    }, 500);
  }, [teamId, nrDoc, furnizor, selectedDate, lines]);

  // Run duplicate check when relevant fields change
  useEffect(() => {
    if (nrDoc || furnizor || lines[0]?.sumaCuTVA) {
      checkDuplicates();
    }
  }, [nrDoc, furnizor, selectedDate, lines, checkDuplicates]);

  // Close supplier dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-supplier-dropdown]")) {
        setShowSupplierDropdown(false);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  // Helper to get subcategories for a selected parent category
  const getSubcategoriesForCategory = (categoryId: string): CategoryWithChildren[] => {
    const parent = categories.find(c => c.id === categoryId);
    return parent?.children || [];
  };

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
      tvaDeductibil: "Da", // Default per spec: Yes
      tags: "",
      manualFields: [],
      calculatedField: null,
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
      const line = { ...newLines[index] };
      
      // Type-safe assignment for amount fields
      if (field === "sumaCuTVA" || field === "sumaFaraTVA" || field === "tva") {
        line[field] = value;
        
        // Track manually entered fields
        const amountField = field as "sumaCuTVA" | "sumaFaraTVA" | "tva";
        if (!line.manualFields.includes(amountField) && value.trim() !== "") {
          line.manualFields = [...line.manualFields, amountField];
        }
        
        // Remove from manual if cleared
        if (value.trim() === "" || value === "0" || value === "0,00") {
          line.manualFields = line.manualFields.filter(f => f !== amountField);
        }
        
        // Smart auto-calculation: when exactly 2 fields are filled, calculate the 3rd
        const filledFields = line.manualFields.filter(f => {
          const val = line[f];
          return val && val.trim() !== "" && val !== "0" && val !== "0,00";
        });
        
        if (filledFields.length === 2) {
          const [field1, field2] = filledFields;
          const value1 = parseAmount(line[field1]);
          const value2 = parseAmount(line[field2]);
          
          if (value1 > 0 || value2 > 0) {
            const result = calculateVATFromTwoFields(field1, value1, field2, value2);
            
            // Update the calculated field
            if (result.calculatedField === "sumaCuTVA") {
              line.sumaCuTVA = formatAmount(result.sumaCuTVA.toFixed(2));
            } else if (result.calculatedField === "sumaFaraTVA") {
              line.sumaFaraTVA = formatAmount(result.sumaFaraTVA.toFixed(2));
            } else {
              line.tva = formatAmount(result.tva.toFixed(2));
            }
            
            line.calculatedField = result.calculatedField;
            line.cotaTVA = result.cotaTVA.toFixed(2) + "%";
          }
        } else if (filledFields.length < 2) {
          // Not enough fields to calculate
          line.calculatedField = null;
          line.cotaTVA = "";
        }
      } else {
        // Non-amount field update
        (line as Record<string, unknown>)[field] = value;
      }
      
      newLines[index] = line;
      return newLines;
    });
  }, []);

  const addLine = () => {
    // Enforce max 5 line items
    if (lines.length >= MAX_LINE_ITEMS) {
      setValidationError(`Maximum ${MAX_LINE_ITEMS} produse per document`);
      return;
    }
    
    const newLines = [
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
    ];
    setLines(newLines);
    
    // Scroll to new section
    setTimeout(() => {
      const lastCard = document.querySelector(`[data-line-index="${newLines.length - 1}"]`);
      lastCard?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const newFiles: { name: string; preview: string; type: string; size: number }[] = [];
      let hasError = false;
      
      Array.from(files).forEach((file) => {
        // Validate file size (max 10MB)
        if (file.size > MAX_FILE_SIZE) {
          setValidationError(`Fisierul "${file.name}" este prea mare. Dimensiune maxima: 10MB`);
          hasError = true;
          return;
        }
        
        const reader = new FileReader();
        reader.onload = (event) => {
          newFiles.push({
            name: file.name,
            preview: event.target?.result as string,
            type: file.type,
            size: file.size,
          });
          
          // When all files are read, update state
          if (newFiles.length === files.length) {
            setUploadedFiles(prev => [...prev, ...newFiles]);
            setActivePreviewIndex(uploadedFiles.length); // Show first new file
            if (!hasError) setValidationError("");
          }
        };
        reader.readAsDataURL(file);
      });
      
      e.target.value = ""; // Reset input for future uploads
    }
  };

  // Remove a specific uploaded file
  const removeUploadedFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
    if (activePreviewIndex >= uploadedFiles.length - 1) {
      setActivePreviewIndex(Math.max(0, uploadedFiles.length - 2));
    }
  };

  // Check for missing required fields
  const checkMissingFields = useCallback((): string[] => {
    const missing: string[] = [];
    
    if (!furnizor.trim()) missing.push("Furnizor");
    if (!docType) missing.push("Tip document");
    if (uploadedFiles.length === 0) missing.push("Document");
    
    lines.forEach((line, idx) => {
      const linePrefix = lines.length > 1 ? `Produs ${idx + 1}: ` : "";
      
      // Description is required per spec
      if (!line.descriere.trim()) {
        missing.push(`${linePrefix}Descriere`);
      }
      
      // Check that at least 2 amount fields are filled
      const filledAmounts = [line.sumaCuTVA, line.sumaFaraTVA, line.tva].filter(
        v => v && v.trim() !== "" && v !== "0" && v !== "0,00"
      ).length;
      if (filledAmounts < 2) {
        missing.push(`${linePrefix}Minim 2 campuri pentru sume`);
      }
      
      if (!line.categoryId) missing.push(`${linePrefix}Cont`);
      if (!line.subcategoryId) missing.push(`${linePrefix}Subcont`);
    });
    
    return missing;
  }, [furnizor, docType, uploadedFiles.length, lines]);

  // Validate tags format
  const validateAllTags = useCallback((): { valid: boolean; errors: string[] } => {
    const allErrors: string[] = [];
    
    lines.forEach((line, idx) => {
      if (line.tags.trim()) {
        const validation = validateTags(line.tags);
        if (!validation.valid) {
          const linePrefix = lines.length > 1 ? `Produs ${idx + 1}: ` : "";
          allErrors.push(...validation.errors.map(e => `${linePrefix}${e}`));
        }
      }
    });
    
    return { valid: allErrors.length === 0, errors: allErrors };
  }, [lines]);

  // Handle save with draft support
  const handleSave = async (forceDraft = false) => {
    setValidationError("");
    
    // Check for potential duplicates
    if (potentialDuplicates.length > 0 && !showDuplicateWarning && !forceDraft) {
      setShowDuplicateWarning(true);
      return;
    }
    
    // Validate tags format
    const tagValidation = validateAllTags();
    if (!tagValidation.valid) {
      setValidationError(tagValidation.errors.join("; "));
      return;
    }
    
    // Check for missing fields
    const missing = checkMissingFields();
    const isDraft = missing.length > 0;
    
    // If there are missing fields and not forcing draft, show confirmation
    if (isDraft && !forceDraft) {
      setMissingFields(missing);
      setShowDraftConfirmModal(true);
      return;
    }

    setLoading(true);
    setShowDuplicateWarning(false);
    setShowDraftConfirmModal(false);
    
    try {
      // Validate and normalize tags
      const normalizedTags = lines[0].tags.trim()
        ? validateTags(lines[0].tags).tags
        : undefined;
      
      // Convert to API format and save
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
        paymentStatus: plata.toLowerCase() === "platit" ? "paid" : plata.toLowerCase() === "partial" ? "partial" : "unpaid",
        expenseDate: selectedDate.toISOString().split("T")[0],
        tags: normalizedTags,
        categoryId: lines[0].categoryId || undefined,
        subcategoryId: lines[0].subcategoryId || undefined,
        accountingPeriod: convertToAccountingPeriod(lines[0].lunaP) || undefined,
        status: isDraft ? "draft" : "draft", // Always start as draft, then submit
      };

      let expenseId: string;
      
      if (lines.length === 1) {
        const result = await createExpense(baseInput);
        expenseId = result.id;
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
        expenseId = results[0].id;
      }

      // Upload all attachments
      for (const file of uploadedFiles) {
        const base64Data = file.preview.split(",")[1]; // Remove data:type;base64, prefix
        await uploadAttachment(expenseId, teamId, {
          name: file.name,
          type: file.type,
          size: file.size,
          base64: base64Data,
        });
      }

      // Submit for approval only if not a draft
      if (!isDraft) {
        await submitForApproval(expenseId, teamId);
      }

      // Show success modal
      setShowSuccessModal(true);
    } catch (err) {
      console.error("Failed to save expense:", err);
      setLastSaveAttempt({ forceDraft });
      setShowServerErrorModal(true);
    } finally {
      setLoading(false);
    }
  };

  // Retry last save attempt
  const retrySave = useCallback(() => {
    setShowServerErrorModal(false);
    if (lastSaveAttempt) {
      handleSave(lastSaveAttempt.forceDraft);
    }
  }, [lastSaveAttempt]);

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
                {uploadedFiles.length > 0 ? `${uploadedFiles.length} fisier${uploadedFiles.length > 1 ? 'e' : ''}` : 'Incarcă'}
              </span>
              <Upload size={18} className="text-gray-400" />
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={handleFileUpload}
                multiple
                className="hidden"
              />
            </label>
          </MobileFormRow>

          {/* Furnizor with Smart Search */}
          <MobileFormRow label="Furnizor">
            <div className="relative" data-supplier-dropdown>
              <div className="flex items-center">
                <input
                  type="text"
                  value={furnizorLocked ? `${furnizor}${furnizorCui ? ` / ${furnizorCui}` : ""}` : furnizor}
                  onChange={(e) => handleSupplierSearch(e.target.value)}
                  onFocus={() => furnizor.length >= 3 && !furnizorLocked && setShowSupplierDropdown(true)}
                  placeholder="Furnizor (nume sau CUI)"
                  disabled={furnizorLocked}
                  className={`w-full bg-transparent text-gray-700 placeholder-gray-400 text-sm focus:outline-none ${furnizorLocked ? "text-gray-600" : ""}`}
                />
                {searchingSupplier && <Loader2 size={14} className="animate-spin text-gray-400 ml-2" />}
                {furnizorLocked && (
                  <button type="button" onClick={handleSupplierUnlock} className="text-gray-400 ml-2">
                    <X size={14} />
                  </button>
                )}
              </div>
              
              {/* Mobile Supplier Dropdown */}
              {showSupplierDropdown && supplierSearchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-50 max-h-48 overflow-y-auto">
                  {supplierSearchResults.map((supplier, idx) => (
                    <button
                      key={supplier.cui || idx}
                      type="button"
                      onClick={() => handleSupplierSelect(supplier)}
                      className="w-full px-3 py-2 text-left hover:bg-gray-50"
                    >
                      <span className="text-gray-800 text-sm font-medium block">{supplier.name}</span>
                      {supplier.cui && <span className="text-gray-500 text-xs">CUI: {supplier.cui}</span>}
                    </button>
                  ))}
                </div>
              )}
              
              {/* Mobile No Results or Error */}
              {showSupplierDropdown && supplierSearchResults.length === 0 && furnizor.length >= 3 && !searchingSupplier && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-lg border border-gray-200 p-3 z-50">
                  {supplierSearchError ? (
                    <div className="flex items-center justify-between">
                      <span className="text-red-500 text-sm">Eroare</span>
                      <button type="button" onClick={retrySupplierSearch} className="text-teal-600 text-sm font-medium">
                        Reincearca
                      </button>
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">Nu s-au gasit rezultate</p>
                  )}
                </div>
              )}
            </div>
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

          {/* Data Doc with Validation */}
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
                  onDateSelect={handleDateSelect}
                  onClose={() => setShowDatePicker(false)}
                  minDate={MIN_DATE}
                  maxDate={new Date()}
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
                value={lines[0]?.sumaCuTVA || ''}
                onChange={(e) => updateLine(0, "sumaCuTVA", e.target.value)}
                onFocus={(e) => e.target.value === "0,00" && updateLine(0, "sumaCuTVA", "")}
                placeholder="0,00"
                readOnly={lines[0]?.calculatedField === "sumaCuTVA"}
                className={`flex-1 bg-transparent font-medium text-sm focus:outline-none ${lines[0]?.calculatedField === "sumaCuTVA" ? "text-gray-500" : "text-gray-900"}`}
              />
              {lines[0]?.calculatedField === "sumaCuTVA" && (
                <button type="button" onClick={() => resetAmountFields(0)} className="text-gray-400 mr-2">
                  <X size={12} />
                </button>
              )}
              <span className="text-gray-400 text-sm flex items-center gap-1">
                Lei <span className="text-xs">🇷🇴</span>
              </span>
            </div>
          </MobileFormRow>

          {/* Suma fara TVA */}
          <MobileFormRow label="Suma fara TVA">
            <div className="flex items-center justify-between">
              <input
                type="text"
                value={lines[0]?.sumaFaraTVA || ''}
                onChange={(e) => updateLine(0, "sumaFaraTVA", e.target.value)}
                onFocus={(e) => e.target.value === "0,00" && updateLine(0, "sumaFaraTVA", "")}
                placeholder="0,00"
                readOnly={lines[0]?.calculatedField === "sumaFaraTVA"}
                className={`flex-1 bg-transparent font-medium text-sm focus:outline-none ${lines[0]?.calculatedField === "sumaFaraTVA" ? "text-gray-500" : "text-gray-900"}`}
              />
              {lines[0]?.calculatedField === "sumaFaraTVA" && (
                <button type="button" onClick={() => resetAmountFields(0)} className="text-gray-400 mr-2">
                  <X size={12} />
                </button>
              )}
              <span className="text-gray-400 text-sm flex items-center gap-1">
                Lei <span className="text-xs">🇷🇴</span>
              </span>
            </div>
          </MobileFormRow>

          {/* TVA */}
          <MobileFormRow label="TVA">
            <div className="flex items-center justify-between">
              <input
                type="text"
                value={lines[0]?.tva || ''}
                onChange={(e) => updateLine(0, "tva", e.target.value)}
                onFocus={(e) => e.target.value === "0,00" && updateLine(0, "tva", "")}
                placeholder="0,00"
                readOnly={lines[0]?.calculatedField === "tva"}
                className={`flex-1 bg-transparent text-sm focus:outline-none ${lines[0]?.calculatedField === "tva" ? "text-gray-400" : "text-gray-500"}`}
              />
              {lines[0]?.calculatedField === "tva" && (
                <button type="button" onClick={() => resetAmountFields(0)} className="text-gray-400 mr-2">
                  <X size={12} />
                </button>
              )}
              <span className="text-gray-400 text-sm flex items-center gap-1">
                Lei <span className="text-xs">🇷🇴</span>
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

          {/* Tags with Autocomplete */}
          <MobileFormRow label="Tags" noBorder>
            <div className="relative">
              <input
                type="text"
                value={lines[0]?.tags || ''}
                onChange={(e) => {
                  updateLine(0, "tags", e.target.value);
                  handleTagsSearch(e.target.value, 0);
                }}
                onFocus={() => lines[0]?.tags && handleTagsSearch(lines[0].tags, 0)}
                onBlur={() => setTimeout(() => setShowTagSuggestions(null), 200)}
                placeholder="#tag1, #tag2"
                className="w-full bg-transparent text-gray-700 placeholder-gray-400 text-sm focus:outline-none"
              />
              
              {/* Mobile Tag Suggestions */}
              {showTagSuggestions === 0 && tagSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-50 max-h-32 overflow-y-auto">
                  {tagSuggestions.map((suggestion) => (
                    <button
                      key={suggestion.tag}
                      type="button"
                      onClick={() => handleTagSelect(suggestion.tag, 0)}
                      className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center justify-between"
                    >
                      <span className="text-gray-700 text-sm">{suggestion.tag}</span>
                      <span className="text-gray-400 text-xs">{suggestion.count}x</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
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
            onClick={() => handleSave()}
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

        {/* Mobile Duplicate Warning Modal */}
        {showDuplicateWarning && potentialDuplicates.length > 0 && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
              <div className="w-14 h-14 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle size={28} className="text-yellow-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2 text-center">Posibil duplicat</h3>
              <p className="text-gray-500 text-sm mb-4 text-center">
                Exista o cheltuiala similara cu aceleasi date.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDuplicateWarning(false)}
                  className="flex-1 py-3 border border-gray-200 text-gray-700 rounded-full text-sm font-medium"
                >
                  Anuleaza
                </button>
                <button
                  onClick={() => handleSave(true)}
                  className="flex-1 py-3 bg-[#00BFA5] text-white rounded-full text-sm font-medium"
                >
                  Salveaza
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Mobile Draft Confirmation Modal */}
        {showDraftConfirmModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
              <div className="w-14 h-14 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle size={28} className="text-orange-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2 text-center">Campuri lipsa</h3>
              <div className="bg-gray-50 rounded-xl p-3 mb-4 max-h-24 overflow-y-auto">
                <ul className="text-xs text-gray-600 space-y-1">
                  {missingFields.slice(0, 5).map((field, idx) => (
                    <li key={idx}>• {field}</li>
                  ))}
                  {missingFields.length > 5 && (
                    <li className="text-gray-400">...si altele</li>
                  )}
                </ul>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDraftConfirmModal(false)}
                  className="flex-1 py-3 border border-gray-200 text-gray-700 rounded-full text-sm font-medium"
                >
                  Inapoi
                </button>
                <button
                  onClick={() => handleSave(true)}
                  className="flex-1 py-3 bg-orange-500 text-white rounded-full text-sm font-medium"
                >
                  Salveaza Draft
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Mobile Server Error Modal */}
        {showServerErrorModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
              <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle size={28} className="text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2 text-center">Eroare server</h3>
              <p className="text-gray-500 text-sm mb-4 text-center">
                A aparut o eroare. Va rugam incercati din nou.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowServerErrorModal(false)}
                  className="flex-1 py-3 border border-gray-200 text-gray-700 rounded-full text-sm font-medium"
                >
                  Anuleaza
                </button>
                <button
                  onClick={retrySave}
                  className="flex-1 py-3 bg-teal-500 text-white rounded-full text-sm font-medium"
                >
                  Reincearca
                </button>
              </div>
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

      {/* Duplicate Warning Modal */}
      {showDuplicateWarning && potentialDuplicates.length > 0 && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-xl">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={32} className="text-yellow-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2 text-center">Posibil duplicat</h3>
            <p className="text-gray-500 mb-4 text-center">
              {formatDuplicateWarning(potentialDuplicates)}
            </p>
            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <p className="text-sm text-gray-600 mb-2">Cheltuiala existenta:</p>
              <p className="text-sm font-medium text-gray-800">
                {potentialDuplicates[0].supplier} - {potentialDuplicates[0].docNumber || "N/A"}
              </p>
              <p className="text-sm text-gray-500">
                {potentialDuplicates[0].expenseDate} | {potentialDuplicates[0].amountWithVat.toLocaleString("ro-RO", { minimumFractionDigits: 2 })} Lei
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDuplicateWarning(false)}
                className="flex-1 px-6 py-3 border border-gray-200 text-gray-700 rounded-full hover:bg-gray-50 transition-all font-medium"
              >
                Anuleaza
              </button>
              <button
                onClick={() => handleSave(true)}
                className="flex-1 px-6 py-3 bg-[#00BFA5] hover:bg-[#00AC95] text-white rounded-full transition-all font-medium"
              >
                Salveaza oricum
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Draft Confirmation Modal */}
      {showDraftConfirmModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-xl">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={32} className="text-orange-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2 text-center">Campuri lipsa</h3>
            <p className="text-gray-500 mb-4 text-center">
              Urmatoarele campuri nu sunt completate:
            </p>
            <div className="bg-gray-50 rounded-xl p-4 mb-6 max-h-32 overflow-y-auto">
              <ul className="text-sm text-gray-600 space-y-1">
                {missingFields.map((field, idx) => (
                  <li key={idx}>• {field}</li>
                ))}
              </ul>
            </div>
            <p className="text-gray-500 mb-6 text-center text-sm">
              Doriti sa salvati ca ciorna (Draft)?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDraftConfirmModal(false)}
                className="flex-1 px-6 py-3 border border-gray-200 text-gray-700 rounded-full hover:bg-gray-50 transition-all font-medium"
              >
                Inapoi
              </button>
              <button
                onClick={() => handleSave(true)}
                className="flex-1 px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-full transition-all font-medium"
              >
                Salveaza Draft
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Server Error Modal with Retry */}
      {showServerErrorModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-xl">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={32} className="text-red-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2 text-center">Eroare server</h3>
            <p className="text-gray-500 mb-6 text-center">
              A aparut o eroare la salvare. Va rugam incercati din nou.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowServerErrorModal(false)}
                className="flex-1 px-6 py-3 border border-gray-200 text-gray-700 rounded-full hover:bg-gray-50 transition-all font-medium"
              >
                Anuleaza
              </button>
              <button
                onClick={retrySave}
                className="flex-1 px-6 py-3 bg-teal-500 hover:bg-teal-600 text-white rounded-full transition-all font-medium"
              >
                Reincearca
              </button>
            </div>
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
            {/* Furnizor Input with Smart Search */}
            <div className="relative" data-supplier-dropdown>
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                {searchingSupplier ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                )}
              </div>
              <input
                type="text"
                value={furnizorLocked ? `${furnizor}${furnizorCui ? ` / ${furnizorCui}` : ""}` : furnizor}
                onChange={(e) => handleSupplierSearch(e.target.value)}
                onFocus={() => furnizor.length >= 3 && !furnizorLocked && setShowSupplierDropdown(true)}
                placeholder="Furnizor (nume sau CUI)"
                disabled={furnizorLocked}
                className={`pl-10 pr-8 py-2.5 bg-white border border-gray-100 rounded-full text-gray-700 placeholder-gray-400 focus:outline-none focus:border-gray-300 transition-all shadow-sm w-64 ${furnizorLocked ? "bg-gray-50" : ""}`}
                style={{ fontSize: "0.875rem", fontWeight: 400 }}
              />
              {furnizorLocked && (
                <button
                  type="button"
                  onClick={handleSupplierUnlock}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={14} />
                </button>
              )}
              
              {/* Supplier Search Dropdown */}
              {showSupplierDropdown && supplierSearchResults.length > 0 && (
                <div className="absolute top-full left-0 mt-1 w-80 bg-white rounded-xl shadow-lg border border-gray-200/60 py-1 z-50 max-h-64 overflow-y-auto">
                  {supplierSearchResults.map((supplier, idx) => (
                    <button
                      key={supplier.cui || idx}
                      type="button"
                      onClick={() => handleSupplierSelect(supplier)}
                      className="w-full px-4 py-2.5 text-left hover:bg-gray-50 flex flex-col"
                    >
                      <span className="text-gray-800 font-medium" style={{ fontSize: "0.875rem" }}>
                        {supplier.name}
                      </span>
                      {supplier.cui && (
                        <span className="text-gray-500" style={{ fontSize: "0.75rem" }}>
                          CUI: {supplier.cui}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
              
              {/* No results or error message */}
              {showSupplierDropdown && supplierSearchResults.length === 0 && furnizor.length >= 3 && !searchingSupplier && (
                <div className="absolute top-full left-0 mt-1 w-80 bg-white rounded-xl shadow-lg border border-gray-200/60 p-4 z-50">
                  {supplierSearchError ? (
                    <div className="flex items-center justify-between">
                      <p className="text-red-500 text-sm">Eroare la cautare</p>
                      <button
                        type="button"
                        onClick={retrySupplierSearch}
                        className="text-teal-600 hover:text-teal-700 text-sm font-medium"
                      >
                        Reincearca
                      </button>
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">Nu s-au gasit rezultate</p>
                  )}
                </div>
              )}
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

            {/* Date Picker with Validation */}
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
                  onDateSelect={handleDateSelect}
                  onClose={() => setShowDatePicker(false)}
                  minDate={MIN_DATE}
                  maxDate={new Date()}
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
            <span style={{ fontSize: "0.875rem", fontWeight: 400 }}>
              {uploadedFiles.length > 0 ? `${uploadedFiles.length} fisier${uploadedFiles.length > 1 ? 'e' : ''}` : 'Incarcă document'}
            </span>
            <Upload size={16} className="text-gray-400" />
            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={handleFileUpload}
              multiple
              className="hidden"
            />
          </label>
        </div>

        {/* Main Content - Two Separate Columns */}
        <div className="flex gap-4 mb-4 items-start">
          {/* Left Column - Stack of Form Cards */}
          <div className="flex-shrink-0 w-[480px] space-y-4">
            {lines.map((line, index) => (
              <div key={index} data-line-index={index} className="bg-white rounded-[24px] p-8 pb-10 shadow-[0_2px_10px_rgba(0,0,0,0.02)] relative group">
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
                    <div className={`flex-1 flex items-center justify-between px-4 py-2 rounded-xl ${line.calculatedField === "sumaCuTVA" ? "bg-gray-100" : "bg-white"}`}>
                      <input
                        type="text"
                        value={line.sumaCuTVA}
                        onChange={(e) => updateLine(index, "sumaCuTVA", e.target.value)}
                        onFocus={(e) => e.target.value === "0,00" && updateLine(index, "sumaCuTVA", "")}
                        placeholder="0,00"
                        readOnly={line.calculatedField === "sumaCuTVA"}
                        className={`w-full bg-transparent border-none focus:outline-none font-medium ${line.calculatedField === "sumaCuTVA" ? "text-gray-500" : "text-gray-900"}`}
                        style={{ fontSize: "0.9375rem" }}
                      />
                      {line.calculatedField === "sumaCuTVA" && (
                        <button
                          type="button"
                          onClick={() => resetAmountFields(index)}
                          className="text-gray-400 hover:text-gray-600 mr-2"
                          title="Reseteaza toate campurile"
                        >
                          <X size={14} />
                        </button>
                      )}
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
                    <div className={`flex-1 flex items-center justify-between px-4 py-2 rounded-xl ${line.calculatedField === "sumaFaraTVA" ? "bg-gray-100" : "bg-white"}`}>
                      <input
                        type="text"
                        value={line.sumaFaraTVA}
                        onChange={(e) => updateLine(index, "sumaFaraTVA", e.target.value)}
                        onFocus={(e) => e.target.value === "0,00" && updateLine(index, "sumaFaraTVA", "")}
                        placeholder="0,00"
                        readOnly={line.calculatedField === "sumaFaraTVA"}
                        className={`w-full bg-transparent border-none focus:outline-none font-medium ${line.calculatedField === "sumaFaraTVA" ? "text-gray-500" : "text-gray-900"}`}
                        style={{ fontSize: "0.9375rem" }}
                      />
                      {line.calculatedField === "sumaFaraTVA" && (
                        <button
                          type="button"
                          onClick={() => resetAmountFields(index)}
                          className="text-gray-400 hover:text-gray-600 mr-2"
                          title="Reseteaza toate campurile"
                        >
                          <X size={14} />
                        </button>
                      )}
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
                    <div className={`flex-1 flex items-center justify-between px-4 py-2 rounded-xl ${line.calculatedField === "tva" ? "bg-gray-100" : "bg-white"}`}>
                      <input
                        type="text"
                        value={line.tva}
                        onChange={(e) => updateLine(index, "tva", e.target.value)}
                        onFocus={(e) => e.target.value === "0,00" && updateLine(index, "tva", "")}
                        placeholder="0,00"
                        readOnly={line.calculatedField === "tva"}
                        className={`w-full bg-transparent border-none focus:outline-none ${line.calculatedField === "tva" ? "text-gray-400" : "text-gray-500"}`}
                        style={{ fontSize: "0.9375rem" }}
                      />
                      {line.calculatedField === "tva" && (
                        <button
                          type="button"
                          onClick={() => resetAmountFields(index)}
                          className="text-gray-400 hover:text-gray-600 mr-2"
                          title="Reseteaza toate campurile"
                        >
                          <X size={14} />
                        </button>
                      )}
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

                  {/* Tags with Autocomplete */}
                  <div className="flex items-center gap-4">
                    <label className="text-gray-500 w-28 flex-shrink-0" style={{ fontSize: "0.8125rem", fontWeight: 400 }}>
                      Tags
                    </label>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={line.tags}
                        onChange={(e) => {
                          updateLine(index, "tags", e.target.value);
                          handleTagsSearch(e.target.value, index);
                        }}
                        onFocus={() => line.tags && handleTagsSearch(line.tags, index)}
                        onBlur={() => setTimeout(() => setShowTagSuggestions(null), 200)}
                        placeholder="#tag1, #tag2"
                        className="w-full px-4 py-2.5 bg-[#F8F9FA] border-none rounded-xl text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-200 transition-all"
                        style={{ fontSize: "0.875rem", fontWeight: 400 }}
                      />
                      
                      {/* Tag Suggestions Dropdown */}
                      {showTagSuggestions === index && tagSuggestions.length > 0 && (
                        <div className="absolute top-full left-0 mt-1 w-full bg-white rounded-xl shadow-lg border border-gray-200/60 py-1 z-50 max-h-48 overflow-y-auto">
                          {tagSuggestions.map((suggestion) => (
                            <button
                              key={suggestion.tag}
                              type="button"
                              onClick={() => handleTagSelect(suggestion.tag, index)}
                              className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center justify-between"
                            >
                              <span className="text-gray-700" style={{ fontSize: "0.875rem" }}>
                                {suggestion.tag}
                              </span>
                              <span className="text-gray-400" style={{ fontSize: "0.75rem" }}>
                                {suggestion.count}x
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Right Card - Document Upload Area */}
          <div className="flex-1">
            <div className="bg-white rounded-[24px] p-8 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col items-center justify-center min-h-[500px]">
              {uploadedFiles.length > 0 ? (
                <div className="w-full h-full flex flex-col">
                  {/* File navigation for multiple files */}
                  {uploadedFiles.length > 1 && (
                    <div className="flex items-center justify-between mb-4 px-2">
                      <button
                        type="button"
                        onClick={() => setActivePreviewIndex(Math.max(0, activePreviewIndex - 1))}
                        disabled={activePreviewIndex === 0}
                        className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-30"
                      >
                        <ChevronDown size={20} className="rotate-90" />
                      </button>
                      <span className="text-sm text-gray-500">
                        {activePreviewIndex + 1} / {uploadedFiles.length}
                      </span>
                      <button
                        type="button"
                        onClick={() => setActivePreviewIndex(Math.min(uploadedFiles.length - 1, activePreviewIndex + 1))}
                        disabled={activePreviewIndex === uploadedFiles.length - 1}
                        className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-30"
                      >
                        <ChevronDown size={20} className="-rotate-90" />
                      </button>
                    </div>
                  )}
                  
                  {/* Preview area */}
                  <div className="flex-1 flex items-center justify-center">
                    {uploadedFiles[activePreviewIndex]?.preview.startsWith("data:image") ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={uploadedFiles[activePreviewIndex].preview}
                        alt="Document preview"
                        className="max-w-full max-h-[400px] object-contain rounded-lg"
                      />
                    ) : (
                      <div className="text-center">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                          <Upload size={24} className="text-gray-400" />
                        </div>
                        <p className="text-gray-600 text-sm">{uploadedFiles[activePreviewIndex]?.name}</p>
                      </div>
                    )}
                  </div>
                  
                  {/* File list */}
                  <div className="mt-4 space-y-2 max-h-32 overflow-y-auto">
                    {uploadedFiles.map((file, idx) => (
                      <div 
                        key={idx} 
                        className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer ${idx === activePreviewIndex ? 'bg-teal-50 border border-teal-200' : 'bg-gray-50 hover:bg-gray-100'}`}
                        onClick={() => setActivePreviewIndex(idx)}
                      >
                        <span className="text-sm text-gray-700 truncate flex-1">{file.name}</span>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); removeUploadedFile(idx); }}
                          className="ml-2 text-red-400 hover:text-red-600"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
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
            onClick={() => handleSave()}
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
