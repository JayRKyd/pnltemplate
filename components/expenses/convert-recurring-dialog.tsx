"use client";

import React, { useState, useRef, useEffect } from "react";
import { X, Upload, Check, AlertTriangle } from "lucide-react";
import { RecurringInstance, convertToFinalExpense, ConvertResult } from "@/app/actions/recurring-instances";
import { uploadAttachment } from "@/app/actions/attachments";
import { TeamExpense } from "@/app/actions/expenses";
import { AmountDifferenceDialog } from "./amount-difference-dialog";

interface ConvertRecurringDialogProps {
  isOpen: boolean;
  onClose: () => void;
  instance: RecurringInstance;
  teamId: string;
  userId: string;
  onSuccess: (expense: TeamExpense) => void;
}

// Romanian number formatting
function formatAmount(value: string | number): string {
  if (typeof value === "number") {
    return value.toLocaleString("ro-RO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  const num = parseAmount(value);
  if (num === 0 && value.trim() === "") return "";
  return num.toLocaleString("ro-RO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function parseAmount(value: string): number {
  if (!value || value.trim() === "") return 0;
  let cleaned = value.replace(/\s/g, "");
  const hasRomanianFormat = cleaned.includes(",") && (cleaned.indexOf(",") > cleaned.lastIndexOf(".") || !cleaned.includes("."));
  if (hasRomanianFormat) {
    cleaned = cleaned.replace(/\./g, "").replace(",", ".");
  } else if (cleaned.includes(",") && cleaned.includes(".")) {
    cleaned = cleaned.replace(/,/g, "");
  }
  return parseFloat(cleaned) || 0;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function ConvertRecurringDialog({
  isOpen,
  onClose,
  instance,
  teamId,
  userId,
  onSuccess,
}: ConvertRecurringDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [furnizor, setFurnizor] = useState(instance.expected_supplier || "");
  const [sumaCuTVA, setSumaCuTVA] = useState(
    formatAmount(instance.expected_amount_with_vat || instance.expected_amount)
  );
  const [sumaFaraTVA, setSumaFaraTVA] = useState(
    formatAmount(instance.expected_amount_without_vat || instance.expected_amount)
  );
  const [tva, setTva] = useState("");
  const [tvaDeductibil, setTvaDeductibil] = useState(instance.expected_vat_deductible ? "Da" : "Nu");
  const [docNumber, setDocNumber] = useState("");
  const [files, setFiles] = useState<File[]>([]);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showAmountDiff, setShowAmountDiff] = useState(false);
  const [amountDiffData, setAmountDiffData] = useState<ConvertResult | null>(null);

  // Calculate TVA when amounts change
  useEffect(() => {
    const cuTVA = parseAmount(sumaCuTVA);
    const faraTVA = parseAmount(sumaFaraTVA);
    if (cuTVA > 0 && faraTVA > 0) {
      const tvaAmount = cuTVA - faraTVA;
      setTva(formatAmount(tvaAmount));
    }
  }, [sumaCuTVA, sumaFaraTVA]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;

    const selectedFiles = Array.from(e.target.files);
    const validFiles = selectedFiles.filter(f => f.size <= MAX_FILE_SIZE);

    if (validFiles.length !== selectedFiles.length) {
      setError("Unele fișiere depășesc 10MB și au fost ignorate");
    }

    setFiles(prev => [...prev, ...validFiles].slice(0, 5)); // Max 5 files
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (confirmDiff: boolean = false) => {
    setError("");

    // Validation
    if (files.length === 0) {
      setError("Trebuie să încarci cel puțin un document");
      return;
    }

    if (!furnizor.trim()) {
      setError("Furnizorul este obligatoriu");
      return;
    }

    const cuTVA = parseAmount(sumaCuTVA);
    const faraTVA = parseAmount(sumaFaraTVA);

    if (cuTVA <= 0 && faraTVA <= 0) {
      setError("Suma trebuie să fie mai mare ca 0");
      return;
    }

    setLoading(true);

    try {
      // 1. Convert to final expense
      const result = await convertToFinalExpense(
        instance.id,
        teamId,
        userId,
        {
          teamId,
          amount: tvaDeductibil === "Da" ? faraTVA : cuTVA,
          amountWithoutVat: faraTVA > 0 ? faraTVA : undefined,
          amountWithVat: cuTVA > 0 ? cuTVA : undefined,
          vatDeductible: tvaDeductibil === "Da",
          supplier: furnizor,
          docNumber,
          currency: instance.expected_currency,
          categoryId: instance.expected_category_id || undefined,
          subcategoryId: instance.expected_subcategory_id || undefined,
          expenseDate: `${instance.instance_year}-${String(instance.instance_month).padStart(2, '0')}-01`,
        },
        confirmDiff
      );

      // 2. Check if confirmation needed
      if (result.requiresConfirmation) {
        setAmountDiffData(result);
        setShowAmountDiff(true);
        setLoading(false);
        return;
      }

      // 3. Upload attachments
      if (result.expense && files.length > 0) {
        await Promise.all(
          files.map(file => uploadAttachment(result.expense!.id, teamId, file))
        );
      }

      // 4. Success
      if (result.expense) {
        onSuccess(result.expense);
      }
    } catch (err: any) {
      console.error("[ConvertRecurringDialog] Error:", err);
      setError(err.message || "Eroare la confirmarea cheltuielii");
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const monthNames = [
    'Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie',
    'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie'
  ];
  const monthName = monthNames[instance.instance_month - 1];

  return (
    <>
      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            backdropFilter: 'blur(4px)'
          }}
          onClick={onClose}
        />

        <div style={{
          position: 'relative',
          backgroundColor: 'white',
          borderRadius: '16px',
          boxShadow: '0px 25px 50px -12px rgba(0, 0, 0, 0.25)',
          width: '100%',
          maxWidth: '640px',
          margin: '16px',
          maxHeight: '90vh',
          overflowY: 'auto'
        }}>
          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '24px 28px',
            borderBottom: '1px solid rgba(229, 231, 235, 0.5)'
          }}>
            <h2 style={{
              fontSize: '18px',
              fontWeight: 600,
              color: 'rgba(16, 24, 40, 1)',
              margin: 0
            }}>
              Confirmă Cheltuială Recurentă
            </h2>
            <button
              onClick={onClose}
              style={{
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'white',
                border: '1px solid rgba(229, 231, 235, 0.8)',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              <X size={16} style={{ color: 'rgba(156, 163, 175, 1)' }} />
            </button>
          </div>

          {/* Content */}
          <div style={{ padding: '24px 28px' }}>
            {/* Month Info */}
            <div style={{
              padding: '12px 16px',
              backgroundColor: 'rgba(240, 253, 250, 1)',
              borderRadius: '10px',
              marginBottom: '20px',
              border: '1px solid rgba(17, 198, 182, 0.2)'
            }}>
              <div style={{ fontSize: '13px', color: 'rgba(107, 114, 128, 1)', marginBottom: '4px' }}>
                Luna:
              </div>
              <div style={{ fontSize: '15px', fontWeight: 600, color: 'rgba(17, 198, 182, 1)' }}>
                {monthName} {instance.instance_year}
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div style={{
                padding: '12px 16px',
                backgroundColor: 'rgba(254, 242, 242, 1)',
                borderRadius: '10px',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <AlertTriangle size={16} style={{ color: 'rgba(239, 68, 68, 1)' }} />
                <span style={{ fontSize: '14px', color: 'rgba(239, 68, 68, 1)' }}>
                  {error}
                </span>
              </div>
            )}

            {/* Form Fields */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Furnizor */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: 'rgba(55, 65, 81, 1)',
                  marginBottom: '6px'
                }}>
                  Furnizor *
                </label>
                <input
                  type="text"
                  value={furnizor}
                  onChange={(e) => setFurnizor(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    backgroundColor: 'white',
                    border: '1px solid rgba(209, 213, 220, 0.6)',
                    borderRadius: '10px',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Document Number */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: 'rgba(55, 65, 81, 1)',
                  marginBottom: '6px'
                }}>
                  Număr Document
                </label>
                <input
                  type="text"
                  value={docNumber}
                  onChange={(e) => setDocNumber(e.target.value)}
                  placeholder="ex: FAC-12345"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    backgroundColor: 'white',
                    border: '1px solid rgba(209, 213, 220, 0.6)',
                    borderRadius: '10px',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* File Upload */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: 'rgba(55, 65, 81, 1)',
                  marginBottom: '6px'
                }}>
                  Documente * (max 5, max 10MB fiecare)
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    padding: '16px',
                    border: '2px dashed rgba(209, 213, 220, 0.6)',
                    borderRadius: '10px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    backgroundColor: 'rgba(249, 250, 251, 1)'
                  }}
                >
                  <Upload size={24} style={{ color: 'rgba(156, 163, 175, 1)', margin: '0 auto 8px' }} />
                  <p style={{ fontSize: '14px', color: 'rgba(107, 114, 128, 1)', margin: 0 }}>
                    Click pentru a încărca documente
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,application/pdf"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />

                {files.length > 0 && (
                  <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {files.map((file, i) => (
                      <div
                        key={i}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 12px',
                          backgroundColor: 'rgba(240, 253, 250, 1)',
                          borderRadius: '8px',
                          fontSize: '13px'
                        }}
                      >
                        <span style={{ color: 'rgba(16, 24, 40, 1)' }}>{file.name}</span>
                        <button
                          onClick={() => removeFile(i)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '4px'
                          }}
                        >
                          <X size={14} style={{ color: 'rgba(239, 68, 68, 1)' }} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* TVA Deductibil */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: 'rgba(55, 65, 81, 1)',
                  marginBottom: '6px'
                }}>
                  TVA Deductibil
                </label>
                <div style={{
                  display: 'flex',
                  backgroundColor: 'rgba(243, 244, 246, 0.5)',
                  borderRadius: '10px',
                  padding: '4px',
                  height: '44px',
                  alignItems: 'center'
                }}>
                  <button
                    onClick={() => setTvaDeductibil('Da')}
                    style={{
                      flex: 1,
                      height: '36px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      borderRadius: '8px',
                      border: 'none',
                      cursor: 'pointer',
                      backgroundColor: tvaDeductibil === 'Da' ? 'white' : 'transparent',
                      color: tvaDeductibil === 'Da' ? 'rgba(16, 24, 40, 1)' : 'rgba(107, 114, 128, 1)',
                      fontSize: '14px',
                      fontWeight: 500,
                      boxShadow: tvaDeductibil === 'Da' ? '0px 1px 3px rgba(0, 0, 0, 0.1)' : 'none',
                      transition: 'all 0.2s'
                    }}
                  >
                    Da
                    {tvaDeductibil === 'Da' && <Check size={14} style={{ color: 'rgba(17, 198, 182, 1)' }} />}
                  </button>
                  <button
                    onClick={() => setTvaDeductibil('Nu')}
                    style={{
                      flex: 1,
                      height: '36px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '8px',
                      border: 'none',
                      cursor: 'pointer',
                      backgroundColor: tvaDeductibil === 'Nu' ? 'white' : 'transparent',
                      color: tvaDeductibil === 'Nu' ? 'rgba(16, 24, 40, 1)' : 'rgba(107, 114, 128, 1)',
                      fontSize: '14px',
                      fontWeight: 500,
                      boxShadow: tvaDeductibil === 'Nu' ? '0px 1px 3px rgba(0, 0, 0, 0.1)' : 'none',
                      transition: 'all 0.2s'
                    }}
                  >
                    Nu
                  </button>
                </div>
              </div>

              {/* Amounts */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: 'rgba(55, 65, 81, 1)',
                    marginBottom: '6px'
                  }}>
                    Suma cu TVA
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      value={sumaCuTVA}
                      onChange={(e) => setSumaCuTVA(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 60px 10px 14px',
                        backgroundColor: 'white',
                        border: '1px solid rgba(209, 213, 220, 0.6)',
                        borderRadius: '10px',
                        fontSize: '14px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                    <div style={{
                      position: 'absolute',
                      right: '14px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <span style={{ fontSize: '12px', color: 'rgba(107, 114, 128, 1)', fontWeight: 500 }}>Lei</span>
                      <span style={{ fontSize: '13px' }}>🇷🇴</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: 'rgba(55, 65, 81, 1)',
                    marginBottom: '6px'
                  }}>
                    Suma fără TVA
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      value={sumaFaraTVA}
                      onChange={(e) => setSumaFaraTVA(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 60px 10px 14px',
                        backgroundColor: 'white',
                        border: '1px solid rgba(209, 213, 220, 0.6)',
                        borderRadius: '10px',
                        fontSize: '14px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                    <div style={{
                      position: 'absolute',
                      right: '14px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <span style={{ fontSize: '12px', color: 'rgba(107, 114, 128, 1)', fontWeight: 500 }}>Lei</span>
                      <span style={{ fontSize: '13px' }}>🇷🇴</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* TVA (readonly) */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: 'rgba(55, 65, 81, 1)',
                  marginBottom: '6px'
                }}>
                  TVA (calculat automat)
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    value={tva}
                    readOnly
                    style={{
                      width: '100%',
                      padding: '10px 60px 10px 14px',
                      backgroundColor: 'rgba(249, 250, 251, 1)',
                      border: '1px solid rgba(209, 213, 220, 0.6)',
                      borderRadius: '10px',
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box',
                      color: 'rgba(107, 114, 128, 1)'
                    }}
                  />
                  <div style={{
                    position: 'absolute',
                    right: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <span style={{ fontSize: '12px', color: 'rgba(107, 114, 128, 1)', fontWeight: 500 }}>Lei</span>
                    <span style={{ fontSize: '13px' }}>🇷🇴</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{
            padding: '20px 28px',
            borderTop: '1px solid rgba(229, 231, 235, 0.5)',
            display: 'flex',
            gap: '12px',
            justifyContent: 'flex-end'
          }}>
            <button
              onClick={onClose}
              disabled={loading}
              style={{
                padding: '12px 24px',
                border: '1px solid rgba(229, 231, 235, 1)',
                borderRadius: '9999px',
                color: 'rgba(55, 65, 81, 1)',
                fontWeight: 500,
                backgroundColor: 'white',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                opacity: loading ? 0.5 : 1
              }}
            >
              Anulează
            </button>
            <button
              onClick={() => handleSubmit(false)}
              disabled={loading}
              style={{
                padding: '12px 32px',
                background: loading
                  ? 'rgba(156, 163, 175, 1)'
                  : 'linear-gradient(180deg, rgba(0, 212, 146, 1) 0%, rgba(81, 162, 255, 1) 100%)',
                color: 'white',
                borderRadius: '9999px',
                fontWeight: 500,
                border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: '0px 4px 15px rgba(0, 180, 150, 0.25)',
                fontSize: '14px'
              }}
            >
              {loading ? 'Se procesează...' : 'Confirmă'}
            </button>
          </div>
        </div>
      </div>

      {/* Amount Difference Dialog */}
      {showAmountDiff && amountDiffData && (
        <AmountDifferenceDialog
          isOpen={showAmountDiff}
          onClose={() => {
            setShowAmountDiff(false);
            setLoading(false);
          }}
          expectedAmount={amountDiffData.expectedAmount!}
          actualAmount={amountDiffData.actualAmount!}
          differencePercent={amountDiffData.amountDifferencePercent!}
          onConfirm={() => {
            setShowAmountDiff(false);
            handleSubmit(true);
          }}
          onUpdateTemplate={() => {
            // TODO: Implement update template flow
            setShowAmountDiff(false);
            handleSubmit(true);
          }}
        />
      )}
    </>
  );
}
