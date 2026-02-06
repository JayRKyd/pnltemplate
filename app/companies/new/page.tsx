"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@stackframe/stack';
import { X, ChevronDown, Send, Loader2 } from 'lucide-react';
import { createCompany, sendCompanyInvitation } from '@/app/actions/companies';
import { checkCurrentUserIsSuperAdmin } from '@/app/actions/super-admin';

const ROLES = [
  { value: 'admin', label: 'Company Admin' },
  { value: 'member', label: 'Regular User' },
  { value: 'accountant', label: 'Accountant' },
];

const SUPER_ADMIN_ROLE = { value: 'super_admin', label: 'Super Admin' };


export default function NewCompanyPage() {
  const router = useRouter();
  const user = useUser({ or: 'redirect' });
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingInvite, setSendingInvite] = useState(false);

  // Form state
  const [companyName, setCompanyName] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminPhone, setAdminPhone] = useState('');
  const [adminRole, setAdminRole] = useState('admin');
  const [adminEmail, setAdminEmail] = useState('');
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);

  const currentYear = new Date().getFullYear();

  useEffect(() => {
    const init = async () => {
      const isSuper = await checkCurrentUserIsSuperAdmin();
      if (!isSuper) {
        router.push('/dashboard');
        return;
      }
      setIsSuperAdmin(true);
      setLoading(false);
    };
    init();
  }, [router]);

  const handleSave = async () => {
    if (!companyName.trim() || !adminName.trim() || !adminEmail.trim()) {
      alert('Completează toate câmpurile obligatorii');
      return;
    }

    setSaving(true);
    try {
      const result = await createCompany({
        name: companyName,
        adminName,
        adminEmail,
        adminPhone: adminPhone || undefined,
        adminRole
      });

      if (result.success && result.company) {
        router.push('/companies');
      } else {
        alert(result.error || 'Eroare la salvarea companiei');
      }
    } catch (error) {
      console.error('Error creating company:', error);
      alert('Eroare la salvarea companiei');
    } finally {
      setSaving(false);
    }
  };

  const handleSendInvite = async () => {
    if (!companyName.trim() || !adminName.trim() || !adminEmail.trim()) {
      alert('Completează toate câmpurile obligatorii');
      return;
    }

    setSendingInvite(true);
    try {
      const result = await createCompany({
        name: companyName,
        adminName,
        adminEmail,
        adminPhone: adminPhone || undefined,
        adminRole
      });

      if (result.success && result.company) {
        const inviteResult = await sendCompanyInvitation(result.company.id);
        if (inviteResult.success) {
          router.push('/companies');
        } else {
          alert('Compania a fost creată, dar invitația nu a putut fi trimisă: ' + inviteResult.error);
          router.push('/companies');
        }
      } else {
        alert(result.error || 'Eroare la salvarea companiei');
      }
    } catch (error) {
      console.error('Error creating company:', error);
      alert('Eroare la salvarea companiei');
    } finally {
      setSendingInvite(false);
    }
  };

  const availableRoles = isSuperAdmin ? [...ROLES, SUPER_ADMIN_ROLE] : ROLES;
  const selectedRole = availableRoles.find(r => r.value === adminRole);

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

  if (!isSuperAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#F8F8F8]">
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-6">
        <button
          onClick={() => router.back()}
          className="w-10 h-10 flex items-center justify-center rounded-full border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
        >
          <X size={18} className="text-gray-500" />
        </button>
        
        <h1 className="text-2xl font-semibold text-gray-900">Adauga companie</h1>
        
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
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Compania SRL"
                    className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                  />
                </div>

                {/* Admin */}
                <div className="flex items-center gap-6">
                  <label className="w-24 text-sm text-gray-600 shrink-0">Admin</label>
                  <input
                    type="text"
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    placeholder="Ana Popescu"
                    className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                  />
                </div>

                {/* Mobil */}
                <div className="flex items-center gap-6">
                  <label className="w-24 text-sm text-gray-600 shrink-0">Mobil</label>
                  <input
                    type="tel"
                    value={adminPhone}
                    onChange={(e) => setAdminPhone(e.target.value)}
                    placeholder="+40 712 345 678"
                    className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                  />
                </div>

                {/* Rol */}
                <div className="flex items-center gap-6">
                  <label className="w-24 text-sm text-gray-600 shrink-0">Rol</label>
                  <div className="flex-1 relative">
                    <button
                      type="button"
                      onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all bg-white"
                    >
                      <span className="text-gray-900">{selectedRole?.label || 'Admin'}</span>
                      <ChevronDown size={18} className={`text-gray-400 transition-transform ${roleDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {roleDropdownOpen && (
                      <>
                        <div 
                          className="fixed inset-0 z-40"
                          onClick={() => setRoleDropdownOpen(false)}
                        />
                        <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl border border-gray-200 shadow-lg z-50 py-1">
                          {availableRoles.map((role) => (
                            <button
                              key={role.value}
                              type="button"
                              onClick={() => {
                                setAdminRole(role.value);
                                setRoleDropdownOpen(false);
                              }}
                              className={`w-full px-4 py-2.5 text-sm text-left hover:bg-gray-50 transition-colors ${
                                adminRole === role.value ? 'bg-teal-50 text-teal-700' : 'text-gray-700'
                              }`}
                            >
                              {role.label}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Email */}
                <div className="flex items-center gap-6">
                  <label className="w-24 text-sm text-gray-600 shrink-0">Email</label>
                  <input
                    type="email"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder="email@companie.ro"
                    className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                  />
                </div>

                {/* Action Buttons - Stacked */}
                <div className="flex flex-col gap-3 pt-4">
                  <button
                    onClick={handleSendInvite}
                    disabled={sendingInvite || saving}
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
                  <button
                    onClick={handleSave}
                    disabled={saving || sendingInvite}
                    className="w-full flex items-center justify-center gap-2 px-5 py-3.5 bg-gradient-to-r from-[#00C9A7] to-[#00D4AA] text-white rounded-full font-medium hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      'Salveaza'
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column - Budget Structure */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Structura buget {currentYear}</h2>

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
                <p className="text-gray-400 text-xs">
                  Administratorul companiei o poate configura din secțiunea P&L.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
