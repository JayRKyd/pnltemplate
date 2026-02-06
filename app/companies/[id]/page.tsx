"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser } from '@stackframe/stack';
import {
  Send,
  Loader2,
  ChevronRight,
  ChevronDown,
  X,
  Plus,
  Pencil,
  Trash2,
  Check
} from 'lucide-react';
import {
  getCompany,
  sendCompanyInvitation,
  getCompanyBudgetStructure,
  updateCompany,
  addBudgetCategory,
  updateBudgetCategory,
  deleteBudgetCategory,
  addBudgetSubcategory,
  updateBudgetSubcategory,
  deleteBudgetSubcategory,
  Company,
  BudgetCategory
} from '@/app/actions/companies';
import { checkCurrentUserIsSuperAdmin } from '@/app/actions/super-admin';
import { getUserRole } from '@/app/actions/permissions';

type UserRole = 'super_admin' | 'company_admin' | 'company_user' | null;

export default function CompanyDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  useUser({ or: 'redirect' });

  const [company, setCompany] = useState<Company | null>(null);
  const [budgetCategories, setBudgetCategories] = useState<BudgetCategory[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [sendingInvite, setSendingInvite] = useState(false);
  const [saving, setSaving] = useState(false);

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editAdminName, setEditAdminName] = useState('');
  const [editAdminPhone, setEditAdminPhone] = useState('');

  // Budget structure editing state
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [addingSubcategoryTo, setAddingSubcategoryTo] = useState<string | null>(null);
  const [newSubcategoryName, setNewSubcategoryName] = useState('');
  const [savingBudget, setSavingBudget] = useState(false);

  const currentYear = new Date().getFullYear();

  useEffect(() => {
    const init = async () => {
      // Get company data
      const companyData = await getCompany(params.id);
      if (!companyData) {
        router.push('/dashboard');
        return;
      }
      setCompany(companyData);
      setEditName(companyData.name);
      setEditAdminName(companyData.admin_name || '');
      setEditAdminPhone(companyData.admin_phone || '');

      // Check user role and permissions
      const isSuper = await checkCurrentUserIsSuperAdmin();
      if (isSuper) {
        setUserRole('super_admin');
      } else {
        // Check if user is member of this company's team
        const role = await getUserRole(companyData.team_id);

        if (!role) {
          // User doesn't belong to this company
          router.push('/dashboard');
          return;
        }

        // Determine if admin or regular user
        if (role === 'admin') {
          setUserRole('company_admin');
        } else {
          setUserRole('company_user');
        }
      }

      // Fetch budget structure
      const budget = await getCompanyBudgetStructure(companyData.team_id, currentYear);
      setBudgetCategories(budget);

      setLoading(false);
    };
    init();
  }, [params.id, router, currentYear]);

  const handleSendInvitation = async () => {
    if (!company) return;

    setSendingInvite(true);
    const result = await sendCompanyInvitation(company.id);
    if (result.success) {
      // Refresh company data
      const refreshed = await getCompany(company.id);
      if (refreshed) setCompany(refreshed);
    } else {
      alert(result.error || 'Nu s-a putut trimite invitația');
    }
    setSendingInvite(false);
  };

  const handleSaveEdit = async () => {
    if (!company) return;

    setSaving(true);
    const result = await updateCompany(company.id, {
      name: editName,
      admin_name: editAdminName,
      admin_phone: editAdminPhone || undefined,
    });

    if (result.success) {
      // Refresh company data
      const refreshed = await getCompany(company.id);
      if (refreshed) {
        setCompany(refreshed);
        setEditName(refreshed.name);
        setEditAdminName(refreshed.admin_name || '');
        setEditAdminPhone(refreshed.admin_phone || '');
      }
      // Navigate back after successful save
      if (userRole === 'super_admin') {
        router.push('/companies');
      } else {
        router.push(`/dashboard/${company.team_id}/expenses`);
      }
    } else {
      alert(result.error || 'Eroare la salvare');
    }
    setSaving(false);
  };

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  // Budget structure handlers
  const handleAddCategory = async () => {
    if (!company || !newCategoryName.trim()) return;
    setSavingBudget(true);
    const result = await addBudgetCategory(company.team_id, newCategoryName.trim());
    if (result.success && result.category) {
      setBudgetCategories([...budgetCategories, result.category]);
      setNewCategoryName('');
      setAddingCategory(false);
    } else {
      alert(result.error || 'Eroare la adăugare');
    }
    setSavingBudget(false);
  };

  const handleUpdateCategory = async (categoryId: string) => {
    if (!editingCategoryName.trim()) return;
    setSavingBudget(true);
    const result = await updateBudgetCategory(categoryId, editingCategoryName.trim());
    if (result.success) {
      setBudgetCategories(budgetCategories.map(cat =>
        cat.id === categoryId ? { ...cat, name: editingCategoryName.trim() } : cat
      ));
      setEditingCategoryId(null);
      setEditingCategoryName('');
    } else {
      alert(result.error || 'Eroare la actualizare');
    }
    setSavingBudget(false);
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!confirm('Sigur doriți să ștergeți această categorie?')) return;
    setSavingBudget(true);
    const result = await deleteBudgetCategory(categoryId);
    if (result.success) {
      setBudgetCategories(budgetCategories.filter(cat => cat.id !== categoryId));
    } else {
      alert(result.error || 'Eroare la ștergere');
    }
    setSavingBudget(false);
  };

  const handleAddSubcategory = async (parentId: string) => {
    if (!newSubcategoryName.trim()) return;
    setSavingBudget(true);
    const result = await addBudgetSubcategory(parentId, newSubcategoryName.trim());
    if (result.success && result.subcategory) {
      setBudgetCategories(budgetCategories.map(cat => {
        if (cat.id === parentId) {
          return {
            ...cat,
            subcategories: [...(cat.subcategories || []), result.subcategory!]
          };
        }
        return cat;
      }));
      setNewSubcategoryName('');
      setAddingSubcategoryTo(null);
      // Auto-expand to show new subcategory
      setExpandedCategories(prev => new Set(prev).add(parentId));
    } else {
      alert(result.error || 'Eroare la adăugare');
    }
    setSavingBudget(false);
  };

  const handleUpdateSubcategory = async (categoryId: string, subcategoryId: string) => {
    if (!editingCategoryName.trim()) return;
    setSavingBudget(true);
    const result = await updateBudgetSubcategory(subcategoryId, editingCategoryName.trim());
    if (result.success) {
      setBudgetCategories(budgetCategories.map(cat => {
        if (cat.id === categoryId) {
          return {
            ...cat,
            subcategories: cat.subcategories?.map(sub =>
              sub.id === subcategoryId ? { ...sub, name: editingCategoryName.trim() } : sub
            )
          };
        }
        return cat;
      }));
      setEditingCategoryId(null);
      setEditingCategoryName('');
    } else {
      alert(result.error || 'Eroare la actualizare');
    }
    setSavingBudget(false);
  };

  const handleDeleteSubcategory = async (categoryId: string, subcategoryId: string) => {
    if (!confirm('Sigur doriți să ștergeți această subcategorie?')) return;
    setSavingBudget(true);
    const result = await deleteBudgetSubcategory(subcategoryId);
    if (result.success) {
      setBudgetCategories(budgetCategories.map(cat => {
        if (cat.id === categoryId) {
          return {
            ...cat,
            subcategories: cat.subcategories?.filter(sub => sub.id !== subcategoryId)
          };
        }
        return cat;
      }));
    } else {
      alert(result.error || 'Eroare la ștergere');
    }
    setSavingBudget(false);
  };

  const startEditingCategory = (categoryId: string, currentName: string) => {
    setEditingCategoryId(categoryId);
    setEditingCategoryName(currentName);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F8F8] flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 bg-teal-100 rounded-full" />
          <div className="h-4 w-32 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  if (!company || !userRole) {
    return null;
  }

  const canEdit = userRole === 'super_admin' || userRole === 'company_admin';
  const canSendInvite = userRole === 'super_admin';

  return (
    <div className="min-h-screen bg-[#F8F8F8]">
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-6">
        <button
          onClick={() => {
            if (userRole === 'super_admin') {
              router.push('/companies');
            } else {
              // Navigate back to the team's expenses page
              router.push(`/dashboard/${company.team_id}/expenses`);
            }
          }}
          className="w-10 h-10 flex items-center justify-center rounded-full border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
        >
          <X size={18} className="text-gray-500" />
        </button>

        <h1 className="text-2xl font-semibold text-gray-900">Editează companie</h1>

        <div className="w-10" /> {/* Spacer for centering */}
      </div>

      {/* Content */}
      <div className="px-8 pb-8">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Company Info Form */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Informatii companie</h2>

              <div className="space-y-5">
                {/* Companie */}
                <div className="flex items-center gap-6">
                  <label className="w-24 text-sm text-gray-600 shrink-0">Companie</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    disabled={!canEdit}
                    placeholder="Compania SRL"
                    className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all disabled:bg-gray-50 disabled:text-gray-500"
                  />
                </div>

                {/* Admin */}
                <div className="flex items-center gap-6">
                  <label className="w-24 text-sm text-gray-600 shrink-0">Admin</label>
                  <input
                    type="text"
                    value={editAdminName}
                    onChange={(e) => setEditAdminName(e.target.value)}
                    disabled={!canEdit}
                    placeholder="Ana Popescu"
                    className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all disabled:bg-gray-50 disabled:text-gray-500"
                  />
                </div>

                {/* Mobil */}
                <div className="flex items-center gap-6">
                  <label className="w-24 text-sm text-gray-600 shrink-0">Mobil</label>
                  <input
                    type="tel"
                    value={editAdminPhone}
                    onChange={(e) => setEditAdminPhone(e.target.value)}
                    disabled={!canEdit}
                    placeholder="+40 712 345 678"
                    className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all disabled:bg-gray-50 disabled:text-gray-500"
                  />
                </div>

                {/* Rol */}
                <div className="flex items-center gap-6">
                  <label className="w-24 text-sm text-gray-600 shrink-0">Rol</label>
                  <div className="flex-1 px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-500 capitalize">
                    {company.admin_role}
                  </div>
                </div>

                {/* Email */}
                <div className="flex items-center gap-6">
                  <label className="w-24 text-sm text-gray-600 shrink-0">Email</label>
                  <div className="flex-1 px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-500">
                    {company.admin_email}
                  </div>
                </div>

                {/* Action Buttons - Only show if user has edit permission */}
                {canEdit && (
                  <div className="flex flex-col gap-3 pt-4">
                    {canSendInvite && company.status === 'pending' && (
                      <button
                        onClick={handleSendInvitation}
                        disabled={sendingInvite}
                        className="w-full flex items-center justify-center gap-2 px-5 py-3.5 bg-white border border-gray-200 text-gray-700 rounded-full font-medium hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {sendingInvite ? (
                          <Loader2 size={18} className="animate-spin" />
                        ) : (
                          <>
                            Trimite invitație
                            <Send size={16} />
                          </>
                        )}
                      </button>
                    )}
                    <button
                      onClick={handleSaveEdit}
                      disabled={saving}
                      className="w-full flex items-center justify-center gap-2 px-5 py-3.5 bg-gradient-to-r from-[#00C9A7] to-[#00D4AA] text-white rounded-full font-medium hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {saving ? (
                        <Loader2 size={18} className="animate-spin" />
                      ) : (
                        'Salveaza'
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column - Budget Structure */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900">Structura buget {currentYear}</h2>
                {canEdit && !addingCategory && (
                  <button
                    onClick={() => setAddingCategory(true)}
                    className="flex items-center gap-1.5 text-sm text-teal-600 hover:text-teal-700 font-medium"
                  >
                    <Plus size={16} />
                    Adaugă categorie
                  </button>
                )}
              </div>

              {/* Add new category form */}
              {addingCategory && (
                <div className="mb-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="Nume categorie nouă"
                      className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddCategory();
                        if (e.key === 'Escape') { setAddingCategory(false); setNewCategoryName(''); }
                      }}
                    />
                    <button
                      onClick={handleAddCategory}
                      disabled={savingBudget || !newCategoryName.trim()}
                      className="p-2 text-white bg-teal-500 rounded-lg hover:bg-teal-600 disabled:opacity-50"
                    >
                      {savingBudget ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                    </button>
                    <button
                      onClick={() => { setAddingCategory(false); setNewCategoryName(''); }}
                      className="p-2 text-gray-500 hover:text-gray-700"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              )}

              {budgetCategories.length === 0 && !addingCategory ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-400">
                      <path d="M9 17H7A5 5 0 0 1 7 7h2" />
                      <path d="M15 7h2a5 5 0 1 1 0 10h-2" />
                      <line x1="8" y1="12" x2="16" y2="12" />
                    </svg>
                  </div>
                  <p className="text-gray-500 text-sm mb-1">
                    Structura buget nu a fost definită încă.
                  </p>
                  {canEdit ? (
                    <button
                      onClick={() => setAddingCategory(true)}
                      className="mt-3 flex items-center gap-1.5 text-sm text-teal-600 hover:text-teal-700 font-medium"
                    >
                      <Plus size={16} />
                      Adaugă prima categorie
                    </button>
                  ) : (
                    <p className="text-gray-400 text-xs">
                      Administratorul companiei o poate configura.
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 mb-3">
                    Categorie
                  </div>
                  {budgetCategories.map((category, catIndex) => (
                    <div key={category.id} className="border border-gray-100 rounded-xl overflow-hidden">
                      {/* Category Header */}
                      <div className="flex items-center group">
                        {editingCategoryId === category.id ? (
                          <div className="flex-1 flex items-center gap-2 px-4 py-3">
                            <input
                              type="text"
                              value={editingCategoryName}
                              onChange={(e) => setEditingCategoryName(e.target.value)}
                              className="flex-1 px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleUpdateCategory(category.id);
                                if (e.key === 'Escape') { setEditingCategoryId(null); setEditingCategoryName(''); }
                              }}
                            />
                            <button
                              onClick={() => handleUpdateCategory(category.id)}
                              disabled={savingBudget}
                              className="p-1 text-teal-600 hover:text-teal-700"
                            >
                              <Check size={16} />
                            </button>
                            <button
                              onClick={() => { setEditingCategoryId(null); setEditingCategoryName(''); }}
                              className="p-1 text-gray-400 hover:text-gray-600"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={() => toggleCategory(category.id)}
                              className="flex-1 flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                            >
                              {expandedCategories.has(category.id) ? (
                                <ChevronDown size={16} className="text-gray-400" />
                              ) : (
                                <ChevronRight size={16} className="text-gray-400" />
                              )}
                              <span className="text-sm font-medium text-gray-600">{(catIndex + 1) * 100}</span>
                              <span className="text-sm text-gray-700">{catIndex + 1}. {category.name}</span>
                            </button>
                            {canEdit && (
                              <div className="flex items-center gap-1 pr-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => startEditingCategory(category.id, category.name)}
                                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                                  title="Editează"
                                >
                                  <Pencil size={14} />
                                </button>
                                <button
                                  onClick={() => handleDeleteCategory(category.id)}
                                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                                  title="Șterge"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </div>

                      {/* Subcategories */}
                      {expandedCategories.has(category.id) && (
                        <div className="border-t border-gray-100 bg-gray-50/50">
                          {category.subcategories && category.subcategories.map((sub, subIndex) => (
                            <div
                              key={sub.id}
                              className="flex items-center group"
                            >
                              {editingCategoryId === sub.id ? (
                                <div className="flex-1 flex items-center gap-2 px-4 py-2.5 pl-12">
                                  <input
                                    type="text"
                                    value={editingCategoryName}
                                    onChange={(e) => setEditingCategoryName(e.target.value)}
                                    className="flex-1 px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                                    autoFocus
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleUpdateSubcategory(category.id, sub.id);
                                      if (e.key === 'Escape') { setEditingCategoryId(null); setEditingCategoryName(''); }
                                    }}
                                  />
                                  <button
                                    onClick={() => handleUpdateSubcategory(category.id, sub.id)}
                                    disabled={savingBudget}
                                    className="p-1 text-teal-600 hover:text-teal-700"
                                  >
                                    <Check size={16} />
                                  </button>
                                  <button
                                    onClick={() => { setEditingCategoryId(null); setEditingCategoryName(''); }}
                                    className="p-1 text-gray-400 hover:text-gray-600"
                                  >
                                    <X size={16} />
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <div className="flex-1 flex items-center gap-3 px-4 py-2.5 pl-12">
                                    <span className="text-xs font-mono text-gray-400">{(catIndex + 1) * 100 + subIndex + 1}</span>
                                    <span className="text-sm text-gray-600">{sub.name}</span>
                                  </div>
                                  {canEdit && (
                                    <div className="flex items-center gap-1 pr-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button
                                        onClick={() => startEditingCategory(sub.id, sub.name)}
                                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                                        title="Editează"
                                      >
                                        <Pencil size={14} />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteSubcategory(category.id, sub.id)}
                                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                                        title="Șterge"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          ))}

                          {/* Add subcategory form */}
                          {addingSubcategoryTo === category.id ? (
                            <div className="flex items-center gap-2 px-4 py-2.5 pl-12">
                              <input
                                type="text"
                                value={newSubcategoryName}
                                onChange={(e) => setNewSubcategoryName(e.target.value)}
                                placeholder="Nume subcategorie"
                                className="flex-1 px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleAddSubcategory(category.id);
                                  if (e.key === 'Escape') { setAddingSubcategoryTo(null); setNewSubcategoryName(''); }
                                }}
                              />
                              <button
                                onClick={() => handleAddSubcategory(category.id)}
                                disabled={savingBudget || !newSubcategoryName.trim()}
                                className="p-1 text-teal-600 hover:text-teal-700 disabled:opacity-50"
                              >
                                <Check size={16} />
                              </button>
                              <button
                                onClick={() => { setAddingSubcategoryTo(null); setNewSubcategoryName(''); }}
                                className="p-1 text-gray-400 hover:text-gray-600"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          ) : canEdit ? (
                            <button
                              onClick={() => setAddingSubcategoryTo(category.id)}
                              className="flex items-center gap-1.5 px-4 py-2 pl-12 text-xs text-teal-600 hover:text-teal-700 hover:bg-teal-50/50 w-full text-left"
                            >
                              <Plus size={14} />
                              Adaugă subcategorie
                            </button>
                          ) : null}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
