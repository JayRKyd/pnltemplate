"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser } from '@stackframe/stack';
import { 
  ChevronLeft, 
  Building2, 
  User, 
  Mail, 
  Phone,
  Shield,
  Clock,
  Check,
  Send,
  Loader2,
  ChevronRight,
  Users,
  Calendar
} from 'lucide-react';
import { getCompany, sendCompanyInvitation, getCompanyBudgetStructure, Company, BudgetCategory } from '@/app/actions/companies';
import { checkCurrentUserIsSuperAdmin } from '@/app/actions/super-admin';

export default function CompanyDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const user = useUser({ or: 'redirect' });
  
  const [company, setCompany] = useState<Company | null>(null);
  const [budgetCategories, setBudgetCategories] = useState<BudgetCategory[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [sendingInvite, setSendingInvite] = useState(false);
  
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    const init = async () => {
      const isSuper = await checkCurrentUserIsSuperAdmin();
      if (!isSuper) {
        router.push('/dashboard');
        return;
      }
      setIsSuperAdmin(true);

      const companyData = await getCompany(params.id);
      if (!companyData) {
        router.push('/companies');
        return;
      }
      setCompany(companyData);

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

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('ro-RO', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 bg-teal-100 rounded-full" />
          <div className="h-4 w-32 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  if (!company || !isSuperAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/companies')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeft size={20} className="text-gray-500" />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-teal-100 to-cyan-100 rounded-xl flex items-center justify-center">
                  <span className="text-lg font-bold text-teal-600">
                    {company.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">{company.name}</h1>
                  <div className="flex items-center gap-2">
                    {company.status === 'active' ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600">
                        <Check size={12} />
                        Activ
                      </span>
                    ) : company.status === 'pending' ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600">
                        <Clock size={12} />
                        În așteptare
                      </span>
                    ) : (
                      <span className="text-xs font-medium text-red-600">
                        Suspendat
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {company.status === 'pending' && (
              <button
                onClick={handleSendInvitation}
                disabled={sendingInvite}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-full font-medium hover:from-teal-600 hover:to-cyan-600 transition-all shadow-sm disabled:opacity-50"
              >
                {sendingInvite ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Send size={18} />
                )}
                {company.invitation_sent_at ? 'Retrimite invitația' : 'Trimite invitația'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Company & Admin Info */}
          <div className="space-y-6">
            {/* Admin Info Card */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900">Informații administrator</h2>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                    <User size={18} className="text-gray-500" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Nume</p>
                    <p className="font-medium text-gray-900">{company.admin_name || '-'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                    <Mail size={18} className="text-gray-500" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-medium text-gray-900">{company.admin_email}</p>
                  </div>
                </div>

                {company.admin_phone && (
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                      <Phone size={18} className="text-gray-500" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Telefon</p>
                      <p className="font-medium text-gray-900">{company.admin_phone}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                    <Shield size={18} className="text-gray-500" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Rol</p>
                    <p className="font-medium text-gray-900 capitalize">{company.admin_role}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Timeline Card */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900">Istoric</h2>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center shrink-0">
                      <Building2 size={14} className="text-teal-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Companie creată</p>
                      <p className="text-xs text-gray-500">{formatDate(company.created_at)}</p>
                    </div>
                  </div>

                  {company.invitation_sent_at && (
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                        <Send size={14} className="text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Invitație trimisă</p>
                        <p className="text-xs text-gray-500">{formatDate(company.invitation_sent_at)}</p>
                      </div>
                    </div>
                  )}

                  {company.invitation_accepted_at && (
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center shrink-0">
                        <Check size={14} className="text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Invitație acceptată</p>
                        <p className="text-xs text-gray-500">{formatDate(company.invitation_accepted_at)}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Budget Structure */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Structura buget {currentYear}</h2>
            </div>

            <div className="p-6">
              {budgetCategories.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Building2 size={24} className="text-gray-400" />
                  </div>
                  <p className="text-gray-500 text-sm">
                    Structura buget nu a fost definită încă.
                  </p>
                  <p className="text-gray-400 text-xs mt-2">
                    Administratorul companiei poate să o creeze în secțiunea P&L.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 mb-3">
                    Categorie
                  </div>
                  {budgetCategories.map((category) => (
                    <div key={category.id} className="border border-gray-100 rounded-xl overflow-hidden">
                      <button
                        onClick={() => toggleCategory(category.id)}
                        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-mono text-gray-400">{category.code}</span>
                          <span className="text-sm font-medium text-gray-700">{category.name}</span>
                        </div>
                        {category.subcategories && category.subcategories.length > 0 && (
                          <ChevronRight 
                            size={16} 
                            className={`text-gray-400 transition-transform ${
                              expandedCategories.has(category.id) ? 'rotate-90' : ''
                            }`} 
                          />
                        )}
                      </button>
                      
                      {expandedCategories.has(category.id) && category.subcategories && (
                        <div className="border-t border-gray-100 bg-gray-50/50">
                          {category.subcategories.map((sub) => (
                            <div 
                              key={sub.id}
                              className="flex items-center gap-3 px-4 py-2.5 pl-8"
                            >
                              <span className="text-xs font-mono text-gray-400">{sub.code}</span>
                              <span className="text-sm text-gray-600">{sub.name}</span>
                            </div>
                          ))}
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
