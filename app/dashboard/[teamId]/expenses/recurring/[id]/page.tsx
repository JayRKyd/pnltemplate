"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { X, ChevronDown, Check } from 'lucide-react';
import { getCategoryTree, CategoryWithChildren } from '@/app/actions/categories';
import { 
  getRecurringExpense, 
  updateRecurringExpense, 
  RecurringExpense,
  deactivateRecurringExpense,
  reactivateRecurringExpense,
  getGeneratedExpenses,
  updateRecurringPaymentStatus
} from '@/app/actions/recurring-expenses';

interface MonthPayment {
  month: string;
  year: number;
  paid: boolean;
}

export default function RecurringExpenseDetailPage() {
  const params = useParams<{ teamId: string; id: string }>();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [recurringExpense, setRecurringExpense] = useState<RecurringExpense | null>(null);
  
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
  
  const [categories, setCategories] = useState<CategoryWithChildren[]>([]);
  const [showContDropdown, setShowContDropdown] = useState(false);
  const [showSubcontDropdown, setShowSubcontDropdown] = useState(false);
  
  // Monthly payments state - 12 months
  const [monthlyPayments, setMonthlyPayments] = useState<MonthPayment[]>([]);
  const [updatingPayment, setUpdatingPayment] = useState<number | null>(null);

  // Generate months for current year (same as list view shows Jul-Dec)
  // Show all 12 months of current year for consistency
  useEffect(() => {
    const months: MonthPayment[] = [];
    const currentYear = new Date().getFullYear();
    const romanianMonths = [
      'Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie',
      'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie'
    ];
    
    // Show all 12 months of the current year (Jan-Dec)
    for (let i = 0; i < 12; i++) {
      months.push({
        month: romanianMonths[i],
        year: currentYear,
        paid: false // Default to unpaid, will be loaded from DB
      });
    }
    setMonthlyPayments(months);
  }, []);

  // Load recurring expense data and payment status
  useEffect(() => {
    async function loadData() {
      if (!params.id || !params.teamId) return;
      
      setLoading(true);
      try {
        const currentYear = new Date().getFullYear();
        const [expense, cats, generatedExpenses] = await Promise.all([
          getRecurringExpense(params.id),
          getCategoryTree(params.teamId),
          getGeneratedExpenses(params.id, params.teamId, currentYear)
        ]);
        
        setCategories(cats);
        
        if (expense) {
          setRecurringExpense(expense);
          setActiveStatus(expense.is_active ? 'activ' : 'inactiv');
          setNumeFurnizor(expense.supplier || '');
          setCuiFurnizor(''); // CUI not stored in recurring expense
          setDescriere(expense.description || '');
          setTags(expense.tags?.join(', ') || '');
          setCont(expense.category_id || '');
          setSubcont(expense.subcategory_id || '');
          setTvaDeductibil(expense.vat_deductible ? 'Da' : 'Nu');
          
          if (expense.amount_with_vat) {
            setSumaCuTVA(formatAmount(expense.amount_with_vat));
          }
          if (expense.amount_without_vat) {
            setSumaFaraTVA(formatAmount(expense.amount_without_vat));
          }
          if (expense.amount_with_vat && expense.amount_without_vat) {
            const vatAmount = expense.amount_with_vat - expense.amount_without_vat;
            setTva(formatAmount(vatAmount));
          }

          // Load actual payment status for each month using same logic as list view
          // Build payment map from database
          const expenseMap = new Map<number, boolean>();
          
          // Build payment map using same logic as getRecurringExpensesWithPayments
          generatedExpenses.forEach(exp => {
            const expDate = new Date(exp.expense_date);
            // Use getUTCMonth() to avoid timezone issues - dates are stored as UTC
            const month = expDate.getUTCMonth();
            // Same logic as list view: paid if not placeholder OR status is 'paid'
            // If multiple expenses exist for same month, mark as paid if ANY meet criteria
            const currentStatus = expenseMap.get(month);
            const newStatus = !exp.is_recurring_placeholder || exp.status === 'paid';
            // Set to true if current is true OR new is true (OR logic)
            expenseMap.set(month, currentStatus || newStatus);
          });

          // Generate all 12 months with payment status from DB
          // This avoids race condition with the initialization useEffect
          const romanianMonths = [
            'Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie',
            'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie'
          ];
          
          const updatedPayments: MonthPayment[] = romanianMonths.map((month, index) => ({
            month,
            year: currentYear,
            paid: expenseMap.get(index) || false
          }));
          
          setMonthlyPayments(updatedPayments);
        }
      } catch (error) {
        console.error('Failed to load recurring expense:', error);
      } finally {
        setLoading(false);
      }
    }
    
    loadData();
  }, [params.id, params.teamId]);

  // Helper to get month index from Romanian name
  const getMonthIndex = (monthName: string): number => {
    const romanianMonths = [
      'Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie',
      'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie'
    ];
    return romanianMonths.indexOf(monthName);
  };

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

  // Calculate TVA when amounts change
  useEffect(() => {
    const cuTVA = parseAmount(sumaCuTVA);
    const faraTVA = parseAmount(sumaFaraTVA);
    
    if (cuTVA > 0 && faraTVA > 0) {
      const tvaAmount = cuTVA - faraTVA;
      setTva(formatAmount(tvaAmount));
    }
  }, [sumaCuTVA, sumaFaraTVA]);

  const handleClose = () => {
    router.push(`/dashboard/${params.teamId}/expenses?tab=Recurente`);
  };

  const toggleMonthPayment = async (index: number) => {
    if (!params.id || !params.teamId || updatingPayment === index) return;
    
    const mp = monthlyPayments[index];
    const newPaidStatus = !mp.paid;
    
    // Optimistically update UI
    setMonthlyPayments(prev => prev.map((m, i) => 
      i === index ? { ...m, paid: newPaidStatus } : m
    ));
    setUpdatingPayment(index);

    try {
      const monthIndex = getMonthIndex(mp.month);
      await updateRecurringPaymentStatus(
        params.id,
        params.teamId,
        mp.year,
        monthIndex,
        newPaidStatus
      );
    } catch (error) {
      console.error('Failed to update payment status:', error);
      // Revert on error
      setMonthlyPayments(prev => prev.map((m, i) => 
        i === index ? { ...m, paid: !newPaidStatus } : m
      ));
      alert('Eroare la actualizarea statusului de plată. Încearcă din nou.');
    } finally {
      setUpdatingPayment(null);
    }
  };

  const handleSave = async () => {
    if (!recurringExpense) return;
    
    setSaving(true);
    try {
      // Update the recurring expense
      await updateRecurringExpense(params.id, params.teamId, {
        supplier: numeFurnizor || undefined,
        description: descriere || undefined,
        tags: tags ? tags.split(',').map(t => t.trim()) : undefined,
        categoryId: cont || undefined,
        subcategoryId: subcont || undefined,
        vatDeductible: tvaDeductibil === 'Da',
        amountWithVat: parseAmount(sumaCuTVA) || undefined,
        amountWithoutVat: parseAmount(sumaFaraTVA) || undefined,
        amount: parseAmount(sumaFaraTVA) || parseAmount(sumaCuTVA),
      });
      
      // Handle active/inactive status
      if (activeStatus === 'activ' && !recurringExpense.is_active) {
        await reactivateRecurringExpense(params.id, params.teamId);
      } else if (activeStatus === 'inactiv' && recurringExpense.is_active) {
        await deactivateRecurringExpense(params.id, params.teamId);
      }
      
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

            {/* Suma cu TVA */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <label style={labelStyle}>Suma cu TVA</label>
              <div style={{ flex: 1, position: 'relative' }}>
                <input
                  type="text"
                  value={sumaCuTVA}
                  onChange={(e) => setSumaCuTVA(e.target.value)}
                  placeholder="0,00"
                  style={{ ...inputStyle, paddingRight: '70px' }}
                />
                <div style={{
                  position: 'absolute',
                  right: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <span style={{ fontSize: '12px', color: 'rgba(107, 114, 128, 1)', fontWeight: 500 }}>Lei</span>
                  <span style={{ fontSize: '13px' }}>🇷🇴</span>
                </div>
              </div>
            </div>

            {/* Suma fara TVA */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <label style={labelStyle}>Suma fara TVA</label>
              <div style={{ flex: 1, position: 'relative' }}>
                <input
                  type="text"
                  value={sumaFaraTVA}
                  onChange={(e) => setSumaFaraTVA(e.target.value)}
                  placeholder="0,00"
                  style={{ ...inputStyle, paddingRight: '70px' }}
                />
                <div style={{
                  position: 'absolute',
                  right: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <span style={{ fontSize: '12px', color: 'rgba(107, 114, 128, 1)', fontWeight: 500 }}>Lei</span>
                  <span style={{ fontSize: '13px' }}>🇷🇴</span>
                </div>
              </div>
            </div>

            {/* TVA */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <label style={labelStyle}>TVA</label>
              <div style={{ flex: 1, position: 'relative' }}>
                <input
                  type="text"
                  value={tva}
                  readOnly
                  placeholder="0,00"
                  style={{ 
                    ...inputStyle, 
                    paddingRight: '70px',
                    backgroundColor: 'rgba(249, 250, 251, 1)',
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
                  gap: '6px'
                }}>
                  <span style={{ fontSize: '12px', color: 'rgba(107, 114, 128, 1)', fontWeight: 500 }}>Lei</span>
                  <span style={{ fontSize: '13px' }}>🇷🇴</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Monthly Payments */}
          <div style={{ 
            width: '240px', 
            borderLeft: '1px solid rgba(229, 231, 235, 0.5)',
            paddingLeft: '28px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            {monthlyPayments.map((mp, index) => {
              const isUpdating = updatingPayment === index;
              return (
                <div 
                  key={`${mp.month}-${mp.year}`}
                  onClick={() => !isUpdating && toggleMonthPayment(index)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 0',
                    cursor: isUpdating ? 'wait' : 'pointer',
                    opacity: isUpdating ? 0.6 : 1,
                    borderBottom: index < monthlyPayments.length - 1 ? '1px solid rgba(243, 244, 246, 1)' : 'none'
                  }}
                >
                  <span style={{ 
                    fontSize: '14px', 
                    color: 'rgba(55, 65, 81, 1)',
                    fontWeight: 400
                  }}>
                    {mp.month} {mp.year}
                  </span>
                  {mp.paid ? (
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
                  ) : (
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
                </div>
              );
            })}
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
