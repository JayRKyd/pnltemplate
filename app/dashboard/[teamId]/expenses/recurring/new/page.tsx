"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { X, ChevronDown, Check, Pencil } from 'lucide-react';
import { getCategoryTree, CategoryWithChildren } from '@/app/actions/categories';
import { createRecurringExpense, generateRecurringForms } from '@/app/actions/recurring-expenses';

const ROMANIAN_MONTHS = [
  'Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie',
  'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie'
];

export default function NewRecurringExpensePage() {
  const params = useParams<{ teamId: string }>();
  const router = useRouter();
  
  const [saving, setSaving] = useState(false);
  const [activeStatus, setActiveStatus] = useState<'activ' | 'inactiv'>('activ');
  const [numeFurnizor, setNumeFurnizor] = useState('');
  const [cuiFurnizor, setCuiFurnizor] = useState('');
  const [descriere, setDescriere] = useState('');
  const [tags, setTags] = useState('');
  const [cont, setCont] = useState('');
  const [subcont, setSubcont] = useState('');
  const [tvaDeductibil, setTvaDeductibil] = useState('Da');
  const [sumaCuTVA, setSumaCuTVA] = useState('');
  const [sumaFaraTVA, setSumaFaraTVA] = useState('');
  const [tva, setTva] = useState('');
  const [cotaTVA, setCotaTVA] = useState('');
  const [manualFields, setManualFields] = useState<string[]>([]);
  const [vatError, setVatError] = useState('');
  
  const [categories, setCategories] = useState<CategoryWithChildren[]>([]);
  const [showContDropdown, setShowContDropdown] = useState(false);
  const [showSubcontDropdown, setShowSubcontDropdown] = useState(false);
  
  // ACTIV DIN month picker state
  const [selectedStartMonth, setSelectedStartMonth] = useState<number | null>(null); // 0-indexed
  const [selectedStartYear, setSelectedStartYear] = useState<number>(new Date().getFullYear());
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [pickerYear, setPickerYear] = useState<number>(new Date().getFullYear());

  // Load categories
  useEffect(() => {
    async function loadCategories() {
      if (params.teamId) {
        const cats = await getCategoryTree(params.teamId);
        setCategories(cats);
      }
    }
    loadCategories();
  }, [params.teamId]);

  const formatAmount = (amount: number): string => {
    return amount.toLocaleString('ro-RO', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const parseAmount = (value: string): number => {
    const cleaned = value.replace(/\./g, '').replace(',', '.');
    return parseFloat(cleaned) || 0;
  };

  // Get subcategories for selected category
  const getSubcategories = useCallback(() => {
    const category = categories.find(c => c.id === cont);
    return category?.children || [];
  }, [categories, cont]);

  // VAT field helpers
  type AmountField = 'sumaCuTVA' | 'sumaFaraTVA' | 'tva' | 'cotaTVA';
  const ALL_FIELDS: AmountField[] = ['sumaCuTVA', 'sumaFaraTVA', 'tva', 'cotaTVA'];

  const getFieldValue = (field: AmountField): string => {
    if (field === 'sumaCuTVA') return sumaCuTVA;
    if (field === 'sumaFaraTVA') return sumaFaraTVA;
    if (field === 'tva') return tva;
    return cotaTVA;
  };

  const setFieldValue = (field: AmountField, value: string) => {
    if (field === 'sumaCuTVA') setSumaCuTVA(value);
    else if (field === 'sumaFaraTVA') setSumaFaraTVA(value);
    else if (field === 'tva') setTva(value);
    else setCotaTVA(value);
  };

  const isFieldCalculated = (field: AmountField): boolean => {
    return manualFields.length >= 2 && !manualFields.includes(field);
  };

  const isVatRateValid = (rate: string): boolean => {
    if (!rate || rate.trim() === '') return true;
    const num = parseFloat(rate.replace('%', '').replace(',', '.').trim());
    if (isNaN(num)) return true;
    return Math.abs(num - 11) < 0.01 || Math.abs(num - 21) < 0.01;
  };

  // Calculate remaining 2 fields from any 2 known fields
  const calculateVATFields = (
    f1: AmountField, v1: number, f2: AmountField, v2: number
  ): Record<AmountField, number> => {
    const known: Partial<Record<AmountField, number>> = {};
    known[f1] = v1; known[f2] = v2;
    const S = known.sumaCuTVA, F = known.sumaFaraTVA, T = known.tva, C = known.cotaTVA;
    let sR = 0, fR = 0, tR = 0, cR = 0;

    if (S !== undefined && F !== undefined) {
      sR = S; fR = F; tR = S - F; cR = F > 0 ? (tR / F) * 100 : 0;
    } else if (S !== undefined && T !== undefined) {
      sR = S; tR = T; fR = S - T; cR = fR > 0 ? (tR / fR) * 100 : 0;
    } else if (S !== undefined && C !== undefined) {
      sR = S; cR = C; fR = C > 0 ? S / (1 + C / 100) : S; tR = sR - fR;
    } else if (F !== undefined && T !== undefined) {
      fR = F; tR = T; sR = F + T; cR = F > 0 ? (T / F) * 100 : 0;
    } else if (F !== undefined && C !== undefined) {
      fR = F; cR = C; tR = F * (C / 100); sR = F + tR;
    } else if (T !== undefined && C !== undefined) {
      tR = T; cR = C; fR = C > 0 ? T / (C / 100) : 0; sR = fR + tR;
    }
    return { sumaCuTVA: sR, sumaFaraTVA: fR, tva: tR, cotaTVA: cR };
  };

  const handleAmountChange = (field: AmountField, value: string) => {
    // If editing a calculated field, reset all
    if (isFieldCalculated(field) && value.trim() !== '') {
      setSumaCuTVA(''); setSumaFaraTVA(''); setTva(''); setCotaTVA('');
      setManualFields([]);
      setVatError('');
    }

    setFieldValue(field, value);

    setManualFields(prev => {
      let updated = [...prev];
      if (value.trim() === '' || value === '0' || value === '0,00') {
        updated = updated.filter(f => f !== field);
      } else if (!updated.includes(field) && updated.length < 2) {
        updated = [...updated, field];
      }
      return updated;
    });
  };

  // Run calculation whenever manual fields or their values change
  useEffect(() => {
    const filled = manualFields.filter(f => {
      const v = getFieldValue(f as AmountField);
      return v && v.trim() !== '' && v !== '0' && v !== '0,00';
    });

    if (filled.length === 2) {
      const [f1, f2] = filled as AmountField[];
      const v1 = f1 === 'cotaTVA' ? parseFloat(getFieldValue(f1).replace('%','').replace(',','.')) || 0 : parseAmount(getFieldValue(f1));
      const v2 = f2 === 'cotaTVA' ? parseFloat(getFieldValue(f2).replace('%','').replace(',','.')) || 0 : parseAmount(getFieldValue(f2));

      if (v1 > 0 || v2 > 0) {
        const result = calculateVATFields(f1, v1, f2, v2);
        ALL_FIELDS.forEach(f => {
          if (!filled.includes(f)) {
            if (f === 'cotaTVA') {
              setCotaTVA(result.cotaTVA.toFixed(2));
            } else {
              setFieldValue(f, formatAmount(result[f]));
            }
          }
        });
        // Validate VAT rate
        const rateVal = filled.includes('cotaTVA') ? getFieldValue('cotaTVA') : result.cotaTVA.toFixed(2);
        if (!isVatRateValid(rateVal)) {
          setVatError('Cota TVA trebuie sa fie 11% sau 21%');
        } else {
          setVatError('');
        }
      }
    } else {
      // Clear calculated fields
      ALL_FIELDS.forEach(f => {
        if (!manualFields.includes(f)) {
          setFieldValue(f as AmountField, '');
        }
      });
      setVatError('');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manualFields, sumaCuTVA, sumaFaraTVA, tva, cotaTVA]);

  const resetAmountFields = () => {
    setSumaCuTVA(''); setSumaFaraTVA(''); setTva(''); setCotaTVA('');
    setManualFields([]);
    setVatError('');
  };

  const handleClose = () => {
    router.push(`/dashboard/${params.teamId}/expenses?tab=Recurente`);
  };

  const handleSave = async () => {
    if (saving) return;
    
    // Require month selection
    if (selectedStartMonth === null) {
      alert('Selectează luna de start (Activ din)');
      return;
    }
    
    // Block save on invalid VAT rate
    if (vatError) {
      alert(vatError);
      return;
    }
    
    setSaving(true);
    try {
      const amountWithVat = parseAmount(sumaCuTVA);
      const amountWithoutVat = parseAmount(sumaFaraTVA);
      const amount = amountWithoutVat || amountWithVat;
      const vatRate = cotaTVA ? parseFloat(cotaTVA.replace('%', '').replace(',', '.')) : undefined;
      
      // Create the recurring expense template
      const recurring = await createRecurringExpense({
        teamId: params.teamId,
        amount: amount,
        amountWithVat: amountWithVat || undefined,
        amountWithoutVat: amountWithoutVat || undefined,
        vatRate: vatRate,
        vatDeductible: tvaDeductibil === 'Da',
        categoryId: cont || undefined,
        subcategoryId: subcont || undefined,
        supplier: numeFurnizor || undefined,
        description: descriere || undefined,
        tags: tags ? tags.split(',').map(t => t.trim()) : undefined,
        recurrenceType: 'monthly',
        dayOfMonth: 1,
        startDate: `${selectedStartYear}-${String((selectedStartMonth ?? 0) + 1).padStart(2, '0')}-01`,
      });
      
      // Generate RE-Forms for the current month (and any past months from start_date)
      const now = new Date();
      const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startDate = new Date(recurring.start_date);
      const startMonth = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
      for (let d = new Date(startMonth); d <= currentMonth; d.setMonth(d.getMonth() + 1)) {
        try {
          await generateRecurringForms(params.teamId, new Date(d));
        } catch (genErr) {
          console.error('Failed to generate RE-Form for', d, genErr);
        }
      }

      // Note: No payment status updates here — RE-Forms are generated with status 'recurent'
      // and payment_status 'unpaid'. Users toggle payment status from the template detail page.
      
      router.push(`/dashboard/${params.teamId}/expenses?tab=Recurente`);
    } catch (error) {
      console.error('Failed to save recurring expense:', error);
      alert('Eroare la salvare. Încearcă din nou.');
    } finally {
      setSaving(false);
    }
  };

  const selectedCategory = categories.find(c => c.id === cont);
  const selectedSubcategory = getSubcategories().find(s => s.id === subcont);

  const inputStyle: React.CSSProperties = {
    width: '100%',
    height: '44px',
    padding: '0 16px',
    backgroundColor: 'white',
    border: '1px solid rgba(209, 213, 220, 0.6)',
    borderRadius: '10px',
    fontSize: '14px',
    fontFamily: '"Inter", sans-serif',
    outline: 'none',
    color: 'rgba(16, 24, 40, 1)',
    boxSizing: 'border-box' as const
  };

  const labelStyle: React.CSSProperties = {
    width: '120px',
    flexShrink: 0,
    fontSize: '14px',
    color: 'rgba(107, 114, 128, 1)',
    fontWeight: 400
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'rgba(248, 250, 252, 1)',
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'center',
      padding: '40px 24px',
      fontFamily: '"Inter", sans-serif'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '1060px',
        backgroundColor: 'white',
        borderRadius: '20px',
        boxShadow: '0px 4px 24px rgba(0, 0, 0, 0.06)',
        border: '1px solid rgba(229, 231, 235, 0.6)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 28px',
          borderBottom: '1px solid rgba(229, 231, 235, 0.5)'
        }}>
          {/* Close Button */}
          <button 
            onClick={handleClose}
            style={{
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'white',
              border: '1px solid rgba(229, 231, 235, 0.8)',
              borderRadius: '10px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <X size={18} style={{ color: 'rgba(156, 163, 175, 1)' }} />
          </button>
          
          {/* Title */}
          <h2 style={{
            fontSize: '15px',
            fontWeight: 600,
            color: 'rgba(55, 65, 81, 1)',
            letterSpacing: '1.5px',
            margin: 0
          }}>
            DECONT RECURENT
          </h2>
          
          {/* Activ/Inactiv Toggle */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: 'rgba(243, 244, 246, 0.7)',
            borderRadius: '9999px',
            padding: '3px'
          }}>
            <button
              onClick={() => setActiveStatus('activ')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '7px 14px',
                borderRadius: '9999px',
                border: 'none',
                cursor: 'pointer',
                backgroundColor: activeStatus === 'activ' ? 'rgba(17, 198, 182, 1)' : 'transparent',
                color: activeStatus === 'activ' ? 'white' : 'rgba(107, 114, 128, 1)',
                fontSize: '13px',
                fontWeight: 500,
                transition: 'all 0.2s'
              }}
            >
              {activeStatus === 'activ' && <Check size={13} strokeWidth={2.5} />}
              Activ
            </button>
            <button
              onClick={() => setActiveStatus('inactiv')}
              style={{
                padding: '7px 14px',
                borderRadius: '9999px',
                border: 'none',
                cursor: 'pointer',
                backgroundColor: activeStatus === 'inactiv' ? 'rgba(17, 198, 182, 1)' : 'transparent',
                color: activeStatus === 'inactiv' ? 'white' : 'rgba(107, 114, 128, 1)',
                fontSize: '13px',
                fontWeight: 500,
                transition: 'all 0.2s'
              }}
            >
              Inactiv
            </button>
          </div>
        </div>

        {/* Content - Two columns */}
        <div style={{ display: 'flex', padding: '28px' }}>
          {/* Left Column - Form */}
          <div style={{ flex: 1, paddingRight: '32px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* Nume Furnizor */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <label style={labelStyle}>Nume Furnizor</label>
              <input
                type="text"
                value={numeFurnizor}
                onChange={(e) => setNumeFurnizor(e.target.value)}
                placeholder="Numele furnizorului"
                style={inputStyle}
              />
            </div>

            {/* CUI Furnizor */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <label style={labelStyle}>CUI Furnizor</label>
              <input
                type="text"
                value={cuiFurnizor}
                onChange={(e) => setCuiFurnizor(e.target.value)}
                placeholder="CUI furnizor"
                style={{
                  ...inputStyle,
                  borderColor: cuiFurnizor ? 'rgba(17, 198, 182, 0.6)' : 'rgba(209, 213, 220, 0.6)'
                }}
              />
            </div>

            {/* Descriere */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <label style={labelStyle}>Descriere</label>
              <input
                type="text"
                value={descriere}
                onChange={(e) => setDescriere(e.target.value)}
                placeholder="Descriere serviciu"
                style={inputStyle}
              />
            </div>

            {/* Tags */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <label style={labelStyle}>Tags</label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="#tag1, #tag2"
                style={inputStyle}
              />
            </div>

            {/* Cont */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <label style={labelStyle}>Cont</label>
              <div style={{ flex: 1, position: 'relative' }}>
                <button
                  onClick={() => setShowContDropdown(!showContDropdown)}
                  style={{
                    ...inputStyle,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    color: cont ? 'rgba(16, 24, 40, 1)' : 'rgba(156, 163, 175, 1)',
                    textAlign: 'left' as const
                  }}
                >
                  <span>{selectedCategory?.name || 'Selectează cont...'}</span>
                  <ChevronDown size={18} style={{ color: 'rgba(156, 163, 175, 1)' }} />
                </button>
                {showContDropdown && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    marginTop: '4px',
                    backgroundColor: 'white',
                    borderRadius: '10px',
                    boxShadow: '0px 10px 25px rgba(0, 0, 0, 0.15)',
                    border: '1px solid rgba(229, 231, 235, 1)',
                    zIndex: 50,
                    maxHeight: '200px',
                    overflowY: 'auto' as const
                  }}>
                    {categories.map(cat => (
                      <button
                        key={cat.id}
                        onClick={() => { setCont(cat.id); setSubcont(''); setShowContDropdown(false); }}
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          textAlign: 'left' as const,
                          backgroundColor: cont === cat.id ? 'rgba(240, 253, 250, 1)' : 'white',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '14px',
                          color: 'rgba(16, 24, 40, 1)'
                        }}
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Subcont */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <label style={labelStyle}>Subcont</label>
              <div style={{ flex: 1, position: 'relative' }}>
                <button
                  onClick={() => cont && setShowSubcontDropdown(!showSubcontDropdown)}
                  disabled={!cont}
                  style={{
                    ...inputStyle,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: cont ? 'pointer' : 'not-allowed',
                    color: subcont ? 'rgba(16, 24, 40, 1)' : 'rgba(156, 163, 175, 1)',
                    opacity: cont ? 1 : 0.6,
                    textAlign: 'left' as const
                  }}
                >
                  <span>{selectedSubcategory?.name || 'Selectează subcont...'}</span>
                  <ChevronDown size={18} style={{ color: 'rgba(156, 163, 175, 1)' }} />
                </button>
                {showSubcontDropdown && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    marginTop: '4px',
                    backgroundColor: 'white',
                    borderRadius: '10px',
                    boxShadow: '0px 10px 25px rgba(0, 0, 0, 0.15)',
                    border: '1px solid rgba(229, 231, 235, 1)',
                    zIndex: 50,
                    maxHeight: '200px',
                    overflowY: 'auto' as const
                  }}>
                    {getSubcategories().map(sub => (
                      <button
                        key={sub.id}
                        onClick={() => { setSubcont(sub.id); setShowSubcontDropdown(false); }}
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          textAlign: 'left' as const,
                          backgroundColor: subcont === sub.id ? 'rgba(240, 253, 250, 1)' : 'white',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '14px',
                          color: 'rgba(16, 24, 40, 1)'
                        }}
                      >
                        {sub.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* TVA Deductibil */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <label style={labelStyle}>TVA Deductibil</label>
              <div style={{
                flex: 1,
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
                  {tvaDeductibil === 'Da' && <Check size={14} style={{ color: 'rgba(16, 198, 182, 1)' }} />}
                </button>
                <button
                  onClick={() => {
                    setTvaDeductibil('Nu');
                    // Clear VAT detail fields when switching to non-deductible
                    setSumaFaraTVA('');
                    setTva('');
                    setCotaTVA('');
                    setManualFields([]);
                  }}
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

            {/* Suma cu TVA */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <label style={labelStyle}>Suma cu TVA</label>
              <div style={{ flex: 1, position: 'relative' }}>
                <input
                  type="text"
                  value={sumaCuTVA}
                  onChange={(e) => handleAmountChange('sumaCuTVA', e.target.value)}
                  readOnly={isFieldCalculated('sumaCuTVA')}
                  placeholder="0,00"
                  style={{ ...inputStyle, paddingRight: '70px', backgroundColor: isFieldCalculated('sumaCuTVA') ? 'rgba(249, 250, 251, 1)' : 'white' }}
                />
                <div style={{
                  position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)',
                  display: 'flex', alignItems: 'center', gap: '6px'
                }}>
                  {isFieldCalculated('sumaCuTVA') && (
                    <button onClick={resetAmountFields} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }}>
                      <X size={12} style={{ color: 'rgba(156, 163, 175, 1)' }} />
                    </button>
                  )}
                  <span style={{ fontSize: '12px', color: 'rgba(107, 114, 128, 1)', fontWeight: 500 }}>Lei</span>
                  <span style={{ fontSize: '13px' }}>🇷🇴</span>
                </div>
              </div>
            </div>

            {/* Suma fara TVA - only show when deductible */}
            {tvaDeductibil === 'Da' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <label style={labelStyle}>Suma fara TVA</label>
              <div style={{ flex: 1, position: 'relative' }}>
                <input
                  type="text"
                  value={sumaFaraTVA}
                  onChange={(e) => handleAmountChange('sumaFaraTVA', e.target.value)}
                  readOnly={isFieldCalculated('sumaFaraTVA')}
                  placeholder="0,00"
                  style={{ ...inputStyle, paddingRight: '70px', backgroundColor: isFieldCalculated('sumaFaraTVA') ? 'rgba(249, 250, 251, 1)' : 'white' }}
                />
                <div style={{
                  position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)',
                  display: 'flex', alignItems: 'center', gap: '6px'
                }}>
                  {isFieldCalculated('sumaFaraTVA') && (
                    <button onClick={resetAmountFields} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }}>
                      <X size={12} style={{ color: 'rgba(156, 163, 175, 1)' }} />
                    </button>
                  )}
                  <span style={{ fontSize: '12px', color: 'rgba(107, 114, 128, 1)', fontWeight: 500 }}>Lei</span>
                  <span style={{ fontSize: '13px' }}>🇷🇴</span>
                </div>
              </div>
            </div>
            )}

            {/* TVA - only show when deductible */}
            {tvaDeductibil === 'Da' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <label style={labelStyle}>TVA</label>
              <div style={{ flex: 1, position: 'relative' }}>
                <input
                  type="text"
                  value={tva}
                  onChange={(e) => handleAmountChange('tva', e.target.value)}
                  readOnly={isFieldCalculated('tva')}
                  placeholder="0,00"
                  style={{ ...inputStyle, paddingRight: '70px', backgroundColor: isFieldCalculated('tva') ? 'rgba(249, 250, 251, 1)' : 'white' }}
                />
                <div style={{
                  position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)',
                  display: 'flex', alignItems: 'center', gap: '6px'
                }}>
                  {isFieldCalculated('tva') && (
                    <button onClick={resetAmountFields} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }}>
                      <X size={12} style={{ color: 'rgba(156, 163, 175, 1)' }} />
                    </button>
                  )}
                  <span style={{ fontSize: '12px', color: 'rgba(107, 114, 128, 1)', fontWeight: 500 }}>Lei</span>
                  <span style={{ fontSize: '13px' }}>🇷🇴</span>
                </div>
              </div>
            </div>
            )}

            {/* Cota TVA - only show when deductible */}
            {tvaDeductibil === 'Da' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <label style={{ ...labelStyle, color: vatError ? 'rgba(239, 68, 68, 1)' : labelStyle.color }}>Cota TVA (%)</label>
              <div style={{ flex: 1, position: 'relative' }}>
                <input
                  type="text"
                  value={cotaTVA}
                  onChange={(e) => handleAmountChange('cotaTVA', e.target.value)}
                  readOnly={isFieldCalculated('cotaTVA')}
                  placeholder="ex: 21"
                  style={{ 
                    ...inputStyle, 
                    paddingRight: '50px', 
                    backgroundColor: isFieldCalculated('cotaTVA') ? 'rgba(249, 250, 251, 1)' : 'white',
                    borderColor: vatError ? 'rgba(252, 165, 165, 1)' : inputStyle.border ? undefined : 'rgba(209, 213, 220, 0.6)'
                  }}
                />
                <div style={{
                  position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)',
                  display: 'flex', alignItems: 'center', gap: '6px'
                }}>
                  {isFieldCalculated('cotaTVA') && (
                    <button onClick={resetAmountFields} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }}>
                      <X size={12} style={{ color: 'rgba(156, 163, 175, 1)' }} />
                    </button>
                  )}
                  <span style={{ fontSize: '12px', color: 'rgba(107, 114, 128, 1)', fontWeight: 500 }}>%</span>
                </div>
              </div>
              {vatError && (
                <span style={{ color: 'rgba(239, 68, 68, 1)', fontSize: '11px', whiteSpace: 'nowrap' }}>Doar 11% sau 21%</span>
              )}
            </div>
            )}
          </div>

          {/* Right Column - ACTIV DIN month picker */}
          <div style={{ 
            width: '300px', 
            borderLeft: '1px solid rgba(229, 231, 235, 0.5)',
            paddingLeft: '28px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            {/* State A: No month selected yet — show picker */}
            {selectedStartMonth === null || showMonthPicker ? (
              <>
                <span style={{ 
                  fontSize: '11px', 
                  fontWeight: 600, 
                  color: 'rgba(107, 114, 128, 1)', 
                  letterSpacing: '0.5px',
                  textTransform: 'uppercase'
                }}>
                  ACTIV DIN
                </span>

                {/* Dropdown trigger */}
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={() => { setShowMonthPicker(!showMonthPicker); setPickerYear(selectedStartYear); }}
                    style={{
                      width: '100%',
                      height: '40px',
                      padding: '0 14px',
                      backgroundColor: 'white',
                      border: '1px solid rgba(209, 213, 220, 0.6)',
                      borderRadius: '10px',
                      fontSize: '14px',
                      fontFamily: '"Inter", sans-serif',
                      color: selectedStartMonth !== null ? 'rgba(16, 24, 40, 1)' : 'rgba(156, 163, 175, 1)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      outline: 'none'
                    }}
                  >
                    <span>
                      {selectedStartMonth !== null 
                        ? `${ROMANIAN_MONTHS[selectedStartMonth]} ${selectedStartYear}` 
                        : 'Selectează luna...'}
                    </span>
                    <ChevronDown size={16} style={{ color: 'rgba(156, 163, 175, 1)' }} />
                  </button>

                  {/* Month picker dropdown */}
                  {showMonthPicker && (
                    <div style={{
                      position: 'absolute',
                      top: '46px',
                      left: '0',
                      width: '280px',
                      backgroundColor: 'white',
                      borderRadius: '12px',
                      boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.12)',
                      border: '1px solid rgba(229, 231, 235, 0.5)',
                      padding: '16px',
                      zIndex: 50
                    }}>
                      {/* Year navigation */}
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        marginBottom: '14px'
                      }}>
                        <button
                          onClick={() => setPickerYear(pickerYear - 1)}
                          style={{ 
                            background: 'none', border: 'none', cursor: 'pointer', padding: '4px',
                            color: 'rgba(107, 114, 128, 1)', fontSize: '16px'
                          }}
                        >
                          ‹
                        </button>
                        <span style={{ fontSize: '15px', fontWeight: 600, color: 'rgba(16, 24, 40, 1)' }}>
                          {pickerYear}
                        </span>
                        <button
                          onClick={() => setPickerYear(pickerYear + 1)}
                          style={{ 
                            background: 'none', border: 'none', cursor: 'pointer', padding: '4px',
                            color: 'rgba(107, 114, 128, 1)', fontSize: '16px'
                          }}
                        >
                          ›
                        </button>
                      </div>

                      {/* Month grid - 4 rows x 3 cols */}
                      <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(3, 1fr)', 
                        gap: '6px' 
                      }}>
                        {ROMANIAN_MONTHS.map((monthName, monthIndex) => {
                          const isSelected = selectedStartMonth === monthIndex && selectedStartYear === pickerYear;
                          return (
                            <button
                              key={monthName}
                              onClick={() => {
                                setSelectedStartMonth(monthIndex);
                                setSelectedStartYear(pickerYear);
                                setShowMonthPicker(false);
                              }}
                              style={{
                                padding: '8px 4px',
                                borderRadius: '8px',
                                border: isSelected ? '2px solid rgba(0, 212, 146, 1)' : '1px solid transparent',
                                backgroundColor: isSelected ? 'rgba(0, 212, 146, 0.08)' : 'transparent',
                                color: isSelected ? 'rgba(0, 180, 130, 1)' : 'rgba(55, 65, 81, 1)',
                                fontSize: '13px',
                                fontWeight: isSelected ? 600 : 400,
                                cursor: 'pointer',
                                fontFamily: '"Inter", sans-serif',
                                transition: 'all 0.15s'
                              }}
                              onMouseEnter={(e) => {
                                if (!isSelected) e.currentTarget.style.backgroundColor = 'rgba(243, 244, 246, 1)';
                              }}
                              onMouseLeave={(e) => {
                                if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                              }}
                            >
                              {monthName}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                {/* State B: Month selected — show month list with pencil edit button */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => { setShowMonthPicker(true); setPickerYear(selectedStartYear); }}
                    title="Modifică luna de start"
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '4px',
                      color: 'rgba(156, 163, 175, 1)',
                      transition: 'color 0.15s'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = 'rgba(107, 114, 128, 1)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(156, 163, 175, 1)'; }}
                  >
                    <Pencil size={14} />
                  </button>
                </div>

                {/* Month list — from current month backwards to selected start, max 12 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0px' }}>
                  {(() => {
                    const now = new Date();
                    const currentYear = now.getFullYear();
                    const currentMonthIdx = now.getMonth();
                    const startYear = selectedStartYear;
                    const startMonthIdx = selectedStartMonth!;
                    
                    // Build list from current month backwards to start month
                    const months: { month: number; year: number }[] = [];
                    let y = currentYear;
                    let m = currentMonthIdx;
                    const startDate = new Date(startYear, startMonthIdx, 1);
                    
                    while (months.length < 12) {
                      const thisDate = new Date(y, m, 1);
                      if (thisDate < startDate) break;
                      months.push({ month: m, year: y });
                      m--;
                      if (m < 0) { m = 11; y--; }
                    }
                    
                    // Reverse so oldest is at bottom, newest at top
                    // Actually per the Figma: newest at top
                    return months.map((item) => (
                      <div
                        key={`${item.year}-${item.month}`}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '11px 0'
                        }}
                      >
                        <span style={{ 
                          fontSize: '14px', 
                          color: 'rgba(55, 65, 81, 1)',
                          fontWeight: 400
                        }}>
                          {ROMANIAN_MONTHS[item.month]} {item.year}
                        </span>
                        {/* Red X circle — template placeholder, no real data yet */}
                        <div style={{
                          width: '26px',
                          height: '26px',
                          borderRadius: '50%',
                          backgroundColor: 'rgba(239, 68, 68, 0.1)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <X size={13} strokeWidth={2.5} style={{ color: 'rgba(239, 68, 68, 0.8)' }} />
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer - Save Button */}
        <div style={{
          padding: '20px 28px 28px',
          display: 'flex',
          justifyContent: 'center'
        }}>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '14px 56px',
              background: saving 
                ? 'rgba(156, 163, 175, 1)'
                : 'linear-gradient(180deg, rgba(0, 212, 146, 1) 0%, rgba(81, 162, 255, 1) 100%)',
              color: 'white',
              fontSize: '15px',
              fontWeight: 500,
              border: 'none',
              borderRadius: '9999px',
              cursor: saving ? 'not-allowed' : 'pointer',
              boxShadow: '0px 4px 15px rgba(0, 180, 150, 0.25)',
              transition: 'all 0.2s'
            }}
          >
            {saving ? 'Se salvează...' : 'Salveaza'}
          </button>
        </div>
      </div>
    </div>
  );
}
