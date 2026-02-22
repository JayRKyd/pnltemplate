"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { X, ChevronDown, Check, Trash2 } from 'lucide-react';
import { getCategoryTree, CategoryWithChildren } from '@/app/actions/categories';
import {
  getRecurringExpense,
  updateRecurringExpense,
  updateRecurringTemplateVersioned,
  migrateClosedInstances,
  RecurringExpense,
  deactivateRecurringExpense,
  reactivateRecurringExpense,
  deleteRecurringExpense,
  getTemplateExpenses,
  TemplateExpense,
  generateRecurringForms,
  getTemplateVersionHistory,
  skipRecurringMonth,
  unskipRecurringMonth
} from '@/app/actions/recurring-expenses';
import { useUser } from '@stackframe/stack';
import { getUserPermissions } from '@/app/actions/permissions';

export default function RecurringExpenseDetailPage() {
  const params = useParams<{ teamId: string; id: string }>();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDeleteStep2, setShowDeleteStep2] = useState(false);
  const [showInactivateConfirm, setShowInactivateConfirm] = useState(false);
  const [showInactivateStep2, setShowInactivateStep2] = useState(false);
  const [recurringExpense, setRecurringExpense] = useState<RecurringExpense | null>(null);

  // §10: Double confirmation + month picker for template versioning
  const [showVersionConfirm, setShowVersionConfirm] = useState(false);
  const [showVersionStep2, setShowVersionStep2] = useState(false);
  const [versionStartMonth, setVersionStartMonth] = useState<number>(new Date().getMonth());
  const [versionStartYear, setVersionStartYear] = useState<number>(new Date().getFullYear());
  const [pendingUpdatePayload, setPendingUpdatePayload] = useState<any>(null);

  // §10: Version history
  const [versionHistory, setVersionHistory] = useState<RecurringExpense[]>([]);

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

  // RE-Forms state (team_expenses linked to this template)
  const [templateExpenses, setTemplateExpenses] = useState<TemplateExpense[]>([]);

  // Get user from hook
  const user = useUser();
  const [isAdmin, setIsAdmin] = useState(false);

  // Check admin status
  useEffect(() => {
    if (!params.teamId) return;
    getUserPermissions(params.teamId).then(perms => {
      setIsAdmin(perms.role === 'admin');
    }).catch(() => {});
  }, [params.teamId]);

  // §13: Only creator or admin can delete/inactivate
  const canDeleteOrInactivate = isAdmin || (user?.id === recurringExpense?.user_id);

  // Load recurring expense data and instances
  useEffect(() => {
    async function loadData() {
      if (!params.id || !params.teamId) return;

      setLoading(true);
      try {
        const currentYear = new Date().getFullYear();
        const [expense, cats, reForms] = await Promise.all([
          getRecurringExpense(params.id),
          getCategoryTree(params.teamId),
          getTemplateExpenses(params.id, params.teamId, currentYear)
        ]);

        setCategories(cats);

        // Auto-generate RE-Forms if none exist for this template
        // Only generate for months up to and including the current month (not future)
        // Use Date.UTC throughout to avoid local timezone shifting midnight back to the
        // previous day in UTC+2, which would cause the wrong month to be generated.
        let finalForms = reForms;
        if (expense && expense.is_active && reForms.length === 0) {
          try {
            const now = new Date();
            const currentMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
            const startDate = new Date(expense.start_date + 'T00:00:00Z');
            const startMonth = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), 1));
            for (let d = new Date(startMonth); d <= currentMonth; d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1))) {
              await generateRecurringForms(params.teamId, new Date(d));
            }
            finalForms = await getTemplateExpenses(params.id, params.teamId, currentYear);
          } catch (genError) {
            console.error('Failed to auto-generate RE-Forms:', genError);
          }
        }

        setTemplateExpenses(finalForms);

        // Load version history (previous inactive templates)
        try {
          const history = await getTemplateVersionHistory(params.id, params.teamId);
          // Filter out current template, show only predecessors
          setVersionHistory(history.filter(v => v.id !== params.id));
        } catch { /* version history is optional */ }

        if (expense) {
          setRecurringExpense(expense);
          setActiveStatus(expense.is_active ? 'activ' : 'inactiv');
          setNumeFurnizor(expense.supplier || '');
          setCuiFurnizor(expense.supplier_cui || '');
          setDescriere(expense.description || '');
          setTags(expense.tags?.join(', ') || '');
          setCont(expense.category_id || '');
          setSubcont(expense.subcategory_id || '');
          setTvaDeductibil(expense.vat_deductible ? 'Da' : 'Nu');

          // Use Number() to coerce values — Supabase can return numeric columns as
          // strings at runtime even though the TypeScript type says number.
          const amtWithVat = Number(expense.amount_with_vat);
          const amtWithoutVat = Number(expense.amount_without_vat);
          const vatRate = Number(expense.vat_rate);
          if (amtWithVat) {
            setSumaCuTVA(formatAmount(amtWithVat));
          }
          if (amtWithoutVat) {
            setSumaFaraTVA(formatAmount(amtWithoutVat));
          }
          if (amtWithVat && amtWithoutVat) {
            setTva(formatAmount(amtWithVat - amtWithoutVat));
          }
          if (vatRate) {
            setCotaTVA(vatRate.toFixed(2));
          }
          // Prime manualFields so the calculation useEffect treats these as user-entered
          // values rather than wiping them (the effect clears all non-manual fields when
          // manualFields is empty).
          if (amtWithVat && vatRate) {
            setManualFields(['sumaCuTVA', 'cotaTVA']);
          } else if (amtWithVat && amtWithoutVat) {
            setManualFields(['sumaCuTVA', 'sumaFaraTVA']);
          } else if (amtWithVat) {
            setManualFields(['sumaCuTVA']);
          }
        }
      } catch (error) {
        console.error('Failed to load recurring expense:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [params.id, params.teamId]);

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

  // Navigate to the expense form for a RE-Form
  const handleOpenExpenseForm = (expenseId: string) => {
    router.push(`/dashboard/${params.teamId}/expenses/${expenseId}`);
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
        const rateVal = filled.includes('cotaTVA') ? getFieldValue('cotaTVA') : result.cotaTVA.toFixed(2);
        if (!isVatRateValid(rateVal)) {
          setVatError('Cota TVA trebuie sa fie 11% sau 21%');
        } else {
          setVatError('');
        }
      }
    } else {
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

  // §10 Phase 2: Determine the earliest month a new version can start from
  // Rule: cannot pick past months. If current month's RE-Form is finalized (status !== 'recurent'), 
  // current month is also disabled — earliest becomes next month.
  const getEarliestVersionMonth = useCallback((): { month: number; year: number } => {
    const now = new Date();
    let month = now.getMonth(); // 0-indexed
    let year = now.getFullYear();

    // Check if current month's RE-Form has been finalized
    const currentMonthForm = templateExpenses.find(
      te => te.month === month + 1 && te.year === year // te.month is 1-indexed
    );
    if (currentMonthForm && currentMonthForm.status !== 'recurent') {
      // Current month is finalized — push to next month
      month++;
      if (month > 11) { month = 0; year++; }
    }

    return { month, year };
  }, [templateExpenses]);

  // Check if a specific month/year is disabled in the version picker
  const isMonthDisabledForVersion = useCallback((monthIdx: number, year: number): boolean => {
    const { month: minMonth, year: minYear } = getEarliestVersionMonth();
    const minDate = new Date(minYear, minMonth, 1);
    const thisDate = new Date(year, monthIdx, 1);
    return thisDate < minDate;
  }, [getEarliestVersionMonth]);

  const handleSave = async () => {
    if (!recurringExpense) return;
    
    // Block save on invalid VAT rate
    if (vatError) {
      alert(vatError);
      return;
    }
    
    const newAmountWithVat = parseAmount(sumaCuTVA) || undefined;
    const newAmountWithoutVat = parseAmount(sumaFaraTVA) || undefined;
    const newAmount = parseAmount(sumaFaraTVA) || parseAmount(sumaCuTVA);
    const newVatRate = cotaTVA ? parseFloat(cotaTVA.replace('%', '').replace(',', '.')) : undefined;

    // Detect if amounts changed → need versioned update with confirmation
    const amountsChanged = 
      (newAmountWithVat ?? 0) !== (recurringExpense.amount_with_vat ?? 0) ||
      (newAmountWithoutVat ?? 0) !== (recurringExpense.amount_without_vat ?? 0);

    const updatePayload = {
      supplier: numeFurnizor || undefined,
      supplierCui: cuiFurnizor || undefined,
      description: descriere || undefined,
      tags: tags ? tags.split(',').map(t => t.trim()) : undefined,
      categoryId: cont || undefined,
      subcategoryId: subcont || undefined,
      vatDeductible: tvaDeductibil === 'Da',
      vatRate: newVatRate,
      amountWithVat: newAmountWithVat,
      amountWithoutVat: newAmountWithoutVat,
      amount: newAmount,
    };

    // Handle inactivation with double confirmation (§13)
    if (activeStatus === 'inactiv' && recurringExpense.is_active) {
      setPendingUpdatePayload({ ...updatePayload, amountsChanged });
      setShowInactivateConfirm(true);
      return;
    }

    if (amountsChanged) {
      // §10: Show double confirmation + month picker
      // Auto-set to earliest valid month
      const { month: minMonth, year: minYear } = getEarliestVersionMonth();
      setVersionStartMonth(minMonth);
      setVersionStartYear(minYear);
      setPendingUpdatePayload(updatePayload);
      setShowVersionConfirm(true);
      return;
    }

    // Simple in-place update (no amount change, no inactivation)
    setSaving(true);
    try {
      await updateRecurringExpense(params.id, params.teamId, updatePayload);

      if (activeStatus === 'activ' && !recurringExpense.is_active) {
        await reactivateRecurringExpense(params.id, params.teamId);
      }
      
      router.push(`/dashboard/${params.teamId}/expenses?tab=Recurente`);
    } catch (error) {
      console.error('Failed to save recurring expense:', error);
      alert('Eroare la salvare. Încearcă din nou.');
    } finally {
      setSaving(false);
    }
  };

  // §10: Execute versioned update after double confirmation + month selection
  const executeVersionedUpdate = async () => {
    if (!pendingUpdatePayload) return;
    
    setSaving(true);
    setShowVersionStep2(false);
    setShowVersionConfirm(false);
    try {
      const startDate = `${versionStartYear}-${String(versionStartMonth + 1).padStart(2, '0')}-01`;
      const payload = { ...pendingUpdatePayload, startDate };
      
      const newTemplate = await updateRecurringTemplateVersioned(params.id, params.teamId, payload);

      // Generate RE-Forms for the new template (only up to current month, not future)
      // Use Date.UTC to avoid local timezone shifting midnight back to previous day in UTC+2.
      const now = new Date();
      const currentMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      const newStart = new Date(newTemplate.start_date + 'T00:00:00Z');
      const newStartMonth = new Date(Date.UTC(newStart.getUTCFullYear(), newStart.getUTCMonth(), 1));
      for (let d = new Date(newStartMonth); d <= currentMonth; d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1))) {
        await generateRecurringForms(params.teamId, new Date(d));
      }

      await migrateClosedInstances(params.id, newTemplate.id, params.teamId);
      
      router.push(`/dashboard/${params.teamId}/expenses?tab=Recurente`);
    } catch (error) {
      console.error('Failed to save recurring expense:', error);
      alert('Eroare la salvare. Încearcă din nou.');
    } finally {
      setSaving(false);
      setPendingUpdatePayload(null);
    }
  };

  // §13: Execute inactivation after double confirmation
  const executeInactivation = async () => {
    setSaving(true);
    setShowInactivateStep2(false);
    setShowInactivateConfirm(false);
    try {
      // Also save any field updates
      if (pendingUpdatePayload) {
        const { amountsChanged, ...payload } = pendingUpdatePayload;
        if (amountsChanged) {
          const newTemplate = await updateRecurringTemplateVersioned(params.id, params.teamId, payload);
          await migrateClosedInstances(params.id, newTemplate.id, params.teamId);
        } else {
          await updateRecurringExpense(params.id, params.teamId, payload);
        }
      }
      await deactivateRecurringExpense(params.id, params.teamId);
      router.push(`/dashboard/${params.teamId}/expenses?tab=Recurente`);
    } catch (error) {
      console.error('Failed to inactivate:', error);
      alert('Eroare. Încearcă din nou.');
    } finally {
      setSaving(false);
      setPendingUpdatePayload(null);
    }
  };

  const handleDelete = async () => {
    if (!params.id || !params.teamId) return;

    setDeleting(true);
    try {
      await deleteRecurringExpense(params.id, params.teamId);
      router.push(`/dashboard/${params.teamId}/expenses?tab=Recurente`);
    } catch (error) {
      console.error('Failed to delete recurring expense:', error);
      alert('Eroare la ștergere. Încearcă din nou.');
      setShowDeleteConfirm(false);
    } finally {
      setDeleting(false);
    }
  };

  // Skip/unskip a month for this template
  const handleSkipMonth = async (monthIndex: number, year: number, currentStatus: string) => {
    if (!recurringExpense) return;
    const month1 = monthIndex + 1; // convert 0-indexed to 1-indexed
    try {
      if (currentStatus === 'skipped') {
        await unskipRecurringMonth(recurringExpense.id, params.teamId, year, month1);
      } else {
        await skipRecurringMonth(recurringExpense.id, params.teamId, year, month1);
      }
      // Refresh template expenses
      const currentYear = new Date().getFullYear();
      const updated = await getTemplateExpenses(params.id, params.teamId, currentYear);
      setTemplateExpenses(updated);
    } catch (err) {
      console.error('Failed to skip/unskip month:', err);
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

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'rgba(248, 250, 252, 1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: '"Inter", sans-serif'
      }}>
        <div style={{ color: 'rgba(107, 114, 128, 1)', fontSize: '16px' }}>
          Se încarcă...
        </div>
      </div>
    );
  }

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
        maxWidth: '920px',
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
              onClick={() => canDeleteOrInactivate && setActiveStatus('inactiv')}
              disabled={!canDeleteOrInactivate}
              title={!canDeleteOrInactivate ? 'Doar creatorul sau un admin poate dezactiva' : ''}
              style={{
                padding: '7px 14px',
                borderRadius: '9999px',
                border: 'none',
                cursor: !canDeleteOrInactivate ? 'not-allowed' : 'pointer',
                backgroundColor: activeStatus === 'inactiv' ? 'rgba(17, 198, 182, 1)' : 'transparent',
                color: activeStatus === 'inactiv' ? 'white' : 'rgba(107, 114, 128, 1)',
                fontSize: '13px',
                fontWeight: 500,
                transition: 'all 0.2s',
                opacity: !canDeleteOrInactivate ? 0.5 : 1
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
                    borderColor: vatError ? 'rgba(252, 165, 165, 1)' : undefined
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

          {/* Right Column - Instance Status Grid */}
          <div style={{
            width: '240px',
            borderLeft: '1px solid rgba(229, 231, 235, 0.5)',
            paddingLeft: '28px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            {(() => {
              const romanianMonths = [
                'Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie',
                'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie'
              ];

              // Show current month and past 11 months (12 total, newest first)
              const now = new Date();
              const currentMonth = now.getMonth(); // 0-indexed
              const currentYear = now.getFullYear();

              const months: { month: number; year: number }[] = [];
              let m = currentMonth;
              let y = currentYear;
              for (let i = 0; i < 12; i++) {
                months.push({ month: m, year: y });
                m--;
                if (m < 0) { m = 11; y--; }
              }

              return months.map((entry, idx) => {
                const monthName = romanianMonths[entry.month];
                const reForm = templateExpenses.find((e: TemplateExpense) => e.month === entry.month + 1 && e.year === entry.year);
                const isDone = reForm?.status === 'draft' || reForm?.status === 'final';
                const isRecurent = reForm?.status === 'recurent';
                const isSkipped = reForm?.status === 'skipped';
                const hasExpense = !!reForm;

                return (
                  <div
                    key={`${entry.year}-${entry.month}`}
                    onClick={() => {
                      if (isSkipped) return;
                      if (reForm) handleOpenExpenseForm(reForm.id);
                    }}
                    onContextMenu={(e) => {
                      if (reForm && (isRecurent || isSkipped)) {
                        e.preventDefault();
                        handleSkipMonth(entry.month, entry.year, reForm.status);
                      }
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 0',
                      cursor: hasExpense && !isSkipped ? 'pointer' : 'default',
                      borderBottom: idx < months.length - 1 ? '1px solid rgba(243, 244, 246, 1)' : 'none',
                      transition: 'background-color 0.2s',
                      backgroundColor: 'transparent',
                      opacity: isSkipped ? 0.5 : 1,
                    }}
                    onMouseEnter={(e) => {
                      if (hasExpense && !isSkipped) e.currentTarget.style.backgroundColor = 'rgba(240, 253, 250, 0.5)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <span style={{
                      fontSize: '14px',
                      color: isSkipped ? 'rgba(156, 163, 175, 1)' : 'rgba(55, 65, 81, 1)',
                      fontWeight: 400,
                      textDecoration: isSkipped ? 'line-through' : 'none'
                    }}>
                      {monthName} {entry.year}
                    </span>

                    {isDone && (
                      <div style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '50%',
                        backgroundColor: 'rgba(209, 250, 229, 1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <Check size={14} style={{ color: 'rgba(5, 150, 105, 1)' }} />
                      </div>
                    )}

                    {isRecurent && (
                      <div style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '50%',
                        backgroundColor: 'rgba(254, 226, 226, 1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <X size={14} style={{ color: 'rgba(220, 38, 38, 1)' }} />
                      </div>
                    )}

                    {isSkipped && (
                      <div style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '50%',
                        backgroundColor: 'rgba(243, 244, 246, 1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <span style={{ color: 'rgba(156, 163, 175, 1)', fontSize: '16px', fontWeight: 600, lineHeight: 1 }}>–</span>
                      </div>
                    )}

                    {!hasExpense && (
                      <div style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '50%',
                        backgroundColor: 'rgba(243, 244, 246, 1)',
                        border: '1px dashed rgba(209, 213, 220, 1)'
                      }} />
                    )}
                  </div>
                );
              });
            })()}
          </div>
        </div>

        {/* §10: Version History Links */}
        {versionHistory.length > 0 && (
          <div style={{
            padding: '0 28px 16px',
            borderTop: '1px solid rgba(229, 231, 235, 0.3)'
          }}>
            <p style={{ fontSize: '13px', color: 'rgba(107, 114, 128, 1)', marginBottom: '8px', marginTop: '16px' }}>Versiuni anterioare (inactive):</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {versionHistory.map(v => (
                <button
                  key={v.id}
                  onClick={() => router.push(`/dashboard/${params.teamId}/expenses/recurring/${v.id}`)}
                  style={{
                    background: 'none',
                    border: '1px solid rgba(229, 231, 235, 0.5)',
                    borderRadius: '8px',
                    padding: '8px 14px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'background-color 0.15s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(243, 244, 246, 0.5)'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <span style={{ fontSize: '13px', color: 'rgba(55, 65, 81, 1)' }}>
                    v{v.version || 1} — {v.supplier || 'Fără furnizor'} — {v.amount_with_vat ? formatAmount(v.amount_with_vat) : formatAmount(v.amount)} Lei
                  </span>
                  <span style={{ fontSize: '12px', color: 'rgba(156, 163, 175, 1)' }}>
                    {v.superseded_at ? `Inactiv din ${new Date(v.superseded_at).toLocaleDateString('ro-RO')}` : 'Inactiv'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Footer - Delete and Save Buttons */}
        <div style={{
          padding: '20px 28px 28px',
          display: 'flex',
          justifyContent: 'center',
          gap: '16px'
        }}>
          {canDeleteOrInactivate && (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            disabled={saving || deleting}
            style={{
              padding: '14px 32px',
              backgroundColor: 'white',
              border: '1px solid rgba(239, 68, 68, 0.5)',
              color: 'rgba(239, 68, 68, 1)',
              fontSize: '15px',
              fontWeight: 500,
              borderRadius: '9999px',
              cursor: saving || deleting ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s'
            }}
          >
            <Trash2 size={16} />
            Șterge
          </button>
          )}
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

      {/* Delete Confirmation Modal - Step 1 */}
      {showDeleteConfirm && !showDeleteStep2 && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.3)', backdropFilter: 'blur(4px)' }} onClick={() => setShowDeleteConfirm(false)} />
          <div style={{ position: 'relative', backgroundColor: 'white', borderRadius: '16px', boxShadow: '0px 25px 50px -12px rgba(0, 0, 0, 0.25)', width: '100%', maxWidth: '480px', margin: '16px', padding: '32px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'rgba(16, 24, 40, 1)', marginBottom: '16px' }}>Confirmă ștergerea</h2>
            <p style={{ color: 'rgba(107, 114, 128, 1)', marginBottom: '24px' }}>Ești sigur că vrei să ștergi această cheltuială recurentă?</p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setShowDeleteConfirm(false)} style={{ flex: 1, padding: '12px 24px', border: '1px solid rgba(229, 231, 235, 1)', borderRadius: '9999px', color: 'rgba(55, 65, 81, 1)', fontWeight: 500, backgroundColor: 'white', cursor: 'pointer' }}>Anulează</button>
              <button onClick={() => setShowDeleteStep2(true)} style={{ flex: 1, padding: '12px 24px', backgroundColor: 'rgba(239, 68, 68, 1)', color: 'white', borderRadius: '9999px', fontWeight: 500, border: 'none', cursor: 'pointer' }}>Da, continuă</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal - Step 2 (final) */}
      {showDeleteConfirm && showDeleteStep2 && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.3)', backdropFilter: 'blur(4px)' }} onClick={() => !deleting && (setShowDeleteStep2(false), setShowDeleteConfirm(false))} />
          <div style={{ position: 'relative', backgroundColor: 'white', borderRadius: '16px', boxShadow: '0px 25px 50px -12px rgba(0, 0, 0, 0.25)', width: '100%', maxWidth: '480px', margin: '16px', padding: '32px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'rgba(239, 68, 68, 1)', marginBottom: '16px' }}>Confirmare finală</h2>
            <p style={{ color: 'rgba(239, 68, 68, 1)', fontWeight: 500, fontSize: '14px', marginBottom: '24px', backgroundColor: 'rgba(254, 242, 242, 1)', padding: '12px 16px', borderRadius: '8px' }}>
              Aceasta va șterge template-ul și toate înregistrările asociate din Cheltuieli. Acțiunea nu poate fi anulată.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => { setShowDeleteStep2(false); setShowDeleteConfirm(false); }} disabled={deleting} style={{ flex: 1, padding: '12px 24px', border: '1px solid rgba(229, 231, 235, 1)', borderRadius: '9999px', color: 'rgba(55, 65, 81, 1)', fontWeight: 500, backgroundColor: 'white', cursor: deleting ? 'not-allowed' : 'pointer', opacity: deleting ? 0.5 : 1 }}>Anulează</button>
              <button onClick={handleDelete} disabled={deleting} style={{ flex: 1, padding: '12px 24px', backgroundColor: 'rgba(239, 68, 68, 1)', color: 'white', borderRadius: '9999px', fontWeight: 500, border: 'none', cursor: deleting ? 'not-allowed' : 'pointer', opacity: deleting ? 0.7 : 1 }}>{deleting ? 'Se șterge...' : 'Șterge definitiv'}</button>
            </div>
          </div>
        </div>
      )}

      {/* §13: Inactivation Confirmation - Step 1 */}
      {showInactivateConfirm && !showInactivateStep2 && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.3)', backdropFilter: 'blur(4px)' }} onClick={() => setShowInactivateConfirm(false)} />
          <div style={{ position: 'relative', backgroundColor: 'white', borderRadius: '16px', boxShadow: '0px 25px 50px -12px rgba(0, 0, 0, 0.25)', width: '100%', maxWidth: '480px', margin: '16px', padding: '32px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'rgba(16, 24, 40, 1)', marginBottom: '16px' }}>Dezactivare template</h2>
            <p style={{ color: 'rgba(107, 114, 128, 1)', marginBottom: '24px' }}>Template-ul va deveni inactiv și nu va mai genera RE-Form-uri noi. Cheltuielile existente nu vor fi modificate.</p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setShowInactivateConfirm(false)} style={{ flex: 1, padding: '12px 24px', border: '1px solid rgba(229, 231, 235, 1)', borderRadius: '9999px', color: 'rgba(55, 65, 81, 1)', fontWeight: 500, backgroundColor: 'white', cursor: 'pointer' }}>Anulează</button>
              <button onClick={() => setShowInactivateStep2(true)} style={{ flex: 1, padding: '12px 24px', background: 'linear-gradient(180deg, rgba(245, 158, 11, 1) 0%, rgba(234, 88, 12, 1) 100%)', color: 'white', borderRadius: '9999px', fontWeight: 500, border: 'none', cursor: 'pointer' }}>Da, dezactivează</button>
            </div>
          </div>
        </div>
      )}

      {/* §13: Inactivation Confirmation - Step 2 (final) */}
      {showInactivateConfirm && showInactivateStep2 && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.3)', backdropFilter: 'blur(4px)' }} />
          <div style={{ position: 'relative', backgroundColor: 'white', borderRadius: '16px', boxShadow: '0px 25px 50px -12px rgba(0, 0, 0, 0.25)', width: '100%', maxWidth: '480px', margin: '16px', padding: '32px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'rgba(245, 158, 11, 1)', marginBottom: '16px' }}>Confirmare finală dezactivare</h2>
            <p style={{ color: 'rgba(107, 114, 128, 1)', marginBottom: '24px' }}>Ești absolut sigur? Template-ul nu va mai genera cheltuieli recurente din această lună.</p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => { setShowInactivateStep2(false); setShowInactivateConfirm(false); }} disabled={saving} style={{ flex: 1, padding: '12px 24px', border: '1px solid rgba(229, 231, 235, 1)', borderRadius: '9999px', color: 'rgba(55, 65, 81, 1)', fontWeight: 500, backgroundColor: 'white', cursor: saving ? 'not-allowed' : 'pointer' }}>Anulează</button>
              <button onClick={executeInactivation} disabled={saving} style={{ flex: 1, padding: '12px 24px', background: 'linear-gradient(180deg, rgba(245, 158, 11, 1) 0%, rgba(234, 88, 12, 1) 100%)', color: 'white', borderRadius: '9999px', fontWeight: 500, border: 'none', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>{saving ? 'Se salvează...' : 'Confirmă dezactivare'}</button>
            </div>
          </div>
        </div>
      )}

      {/* §10: Version Confirmation - Step 1 */}
      {showVersionConfirm && !showVersionStep2 && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.3)', backdropFilter: 'blur(4px)' }} onClick={() => { setShowVersionConfirm(false); setPendingUpdatePayload(null); if (recurringExpense) { setSumaCuTVA(recurringExpense.amount_with_vat ? formatAmount(recurringExpense.amount_with_vat) : ''); setSumaFaraTVA(recurringExpense.amount_without_vat ? formatAmount(recurringExpense.amount_without_vat) : ''); setTva(recurringExpense.amount_with_vat && recurringExpense.amount_without_vat ? formatAmount(recurringExpense.amount_with_vat - recurringExpense.amount_without_vat) : ''); setNumeFurnizor(recurringExpense.supplier || ''); setDescriere(recurringExpense.description || ''); setTags(recurringExpense.tags?.join(', ') || ''); setCont(recurringExpense.category_id || ''); setSubcont(recurringExpense.subcategory_id || ''); setTvaDeductibil(recurringExpense.vat_deductible ? 'Da' : 'Nu'); } }} />
          <div style={{ position: 'relative', backgroundColor: 'white', borderRadius: '16px', boxShadow: '0px 25px 50px -12px rgba(0, 0, 0, 0.25)', width: '100%', maxWidth: '520px', margin: '16px', padding: '32px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'rgba(16, 24, 40, 1)', marginBottom: '16px' }}>Modificare template</h2>
            <p style={{ color: 'rgba(107, 114, 128, 1)', marginBottom: '8px' }}>Ai modificat sumele template-ului. Aceasta va crea o versiune nouă a template-ului.</p>
            <p style={{ color: 'rgba(245, 158, 11, 1)', fontWeight: 500, fontSize: '14px', marginBottom: '24px', backgroundColor: 'rgba(254, 243, 199, 0.5)', padding: '12px 16px', borderRadius: '8px' }}>
              Template-ul curent va deveni inactiv. Cheltuielile generate anterior NU vor fi modificate.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => { setShowVersionConfirm(false); setPendingUpdatePayload(null); if (recurringExpense) { setSumaCuTVA(recurringExpense.amount_with_vat ? formatAmount(recurringExpense.amount_with_vat) : ''); setSumaFaraTVA(recurringExpense.amount_without_vat ? formatAmount(recurringExpense.amount_without_vat) : ''); setTva(recurringExpense.amount_with_vat && recurringExpense.amount_without_vat ? formatAmount(recurringExpense.amount_with_vat - recurringExpense.amount_without_vat) : ''); setNumeFurnizor(recurringExpense.supplier || ''); setDescriere(recurringExpense.description || ''); setTags(recurringExpense.tags?.join(', ') || ''); setCont(recurringExpense.category_id || ''); setSubcont(recurringExpense.subcategory_id || ''); setTvaDeductibil(recurringExpense.vat_deductible ? 'Da' : 'Nu'); } }} style={{ flex: 1, padding: '12px 24px', border: '1px solid rgba(229, 231, 235, 1)', borderRadius: '9999px', color: 'rgba(55, 65, 81, 1)', fontWeight: 500, backgroundColor: 'white', cursor: 'pointer' }}>Anulează</button>
              <button onClick={() => setShowVersionStep2(true)} style={{ flex: 1, padding: '12px 24px', background: 'linear-gradient(180deg, rgba(0, 212, 146, 1) 0%, rgba(81, 162, 255, 1) 100%)', color: 'white', borderRadius: '9999px', fontWeight: 500, border: 'none', cursor: 'pointer' }}>Da, continuă</button>
            </div>
          </div>
        </div>
      )}

      {/* §10: Version Confirmation - Step 2 with Month Picker */}
      {showVersionConfirm && showVersionStep2 && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.3)', backdropFilter: 'blur(4px)' }} />
          <div style={{ position: 'relative', backgroundColor: 'white', borderRadius: '16px', boxShadow: '0px 25px 50px -12px rgba(0, 0, 0, 0.25)', width: '100%', maxWidth: '520px', margin: '16px', padding: '32px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'rgba(16, 24, 40, 1)', marginBottom: '16px' }}>Selectează prima lună activă</h2>
            <p style={{ color: 'rgba(107, 114, 128, 1)', marginBottom: '20px' }}>Din ce lună va fi activ noul template? Cheltuielile generate anterior nu vor fi afectate.</p>
            
            {/* Year navigation */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <button onClick={() => setVersionStartYear(y => y - 1)} style={{ background: 'none', border: 'none', padding: '8px', cursor: 'pointer', color: 'rgba(107, 114, 128, 1)' }}>
                <ChevronDown size={18} style={{ transform: 'rotate(90deg)' }} />
              </button>
              <span style={{ fontSize: '16px', fontWeight: 600, color: 'rgba(17, 24, 39, 1)' }}>{versionStartYear}</span>
              <button onClick={() => setVersionStartYear(y => y + 1)} style={{ background: 'none', border: 'none', padding: '8px', cursor: 'pointer', color: 'rgba(107, 114, 128, 1)' }}>
                <ChevronDown size={18} style={{ transform: 'rotate(-90deg)' }} />
              </button>
            </div>

            {/* Month grid — months before earliest valid month are disabled */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '24px' }}>
              {['Ian', 'Feb', 'Mar', 'Apr', 'Mai', 'Iun', 'Iul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((month, idx) => {
                const isSelected = versionStartMonth === idx;
                const isDisabled = isMonthDisabledForVersion(idx, versionStartYear);
                return (
                  <button
                    key={month}
                    onClick={() => { if (!isDisabled) setVersionStartMonth(idx); }}
                    disabled={isDisabled}
                    style={{
                      padding: '12px 8px',
                      backgroundColor: isDisabled ? 'rgba(243, 244, 246, 0.5)' : isSelected ? 'rgba(240, 253, 250, 1)' : 'transparent',
                      border: isSelected && !isDisabled ? '2px solid rgba(13, 148, 136, 0.6)' : '1px solid rgba(229, 231, 235, 0.6)',
                      borderRadius: '10px',
                      color: isDisabled ? 'rgba(209, 213, 220, 1)' : isSelected ? 'rgba(13, 148, 136, 1)' : 'rgba(55, 65, 81, 1)',
                      fontSize: '14px',
                      fontWeight: isSelected && !isDisabled ? 600 : 400,
                      cursor: isDisabled ? 'not-allowed' : 'pointer',
                      transition: 'all 0.15s'
                    }}
                  >
                    {month}
                  </button>
                );
              })}
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => { setShowVersionStep2(false); setShowVersionConfirm(false); setPendingUpdatePayload(null); }} style={{ flex: 1, padding: '12px 24px', border: '1px solid rgba(229, 231, 235, 1)', borderRadius: '9999px', color: 'rgba(55, 65, 81, 1)', fontWeight: 500, backgroundColor: 'white', cursor: 'pointer' }}>Anulează</button>
              <button onClick={executeVersionedUpdate} disabled={saving} style={{ flex: 1, padding: '12px 24px', background: saving ? 'rgba(156, 163, 175, 1)' : 'linear-gradient(180deg, rgba(0, 212, 146, 1) 0%, rgba(81, 162, 255, 1) 100%)', color: 'white', borderRadius: '9999px', fontWeight: 500, border: 'none', cursor: saving ? 'not-allowed' : 'pointer' }}>{saving ? 'Se salvează...' : 'Confirmă și salvează'}</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
