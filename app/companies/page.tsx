"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@stackframe/stack';
import { Plus, Building2, X, Users, UserPlus, MoreVertical, Mail, UserX, UserCheck, Pencil, Trash2, Loader2 } from 'lucide-react';
import {
  getCompanies,
  CompanyWithUsers,
  getCompanyTeamMembers,
  TeamMember,
  inviteCompanyUser,
  resendUserInvitation,
  updateCompanyUser,
  toggleUserActive,
  removeCompanyUser,
  getCompanyByTeamId
} from '@/app/actions/companies';
import { checkCurrentUserIsSuperAdmin } from '@/app/actions/super-admin';
import { isCompanyAdmin } from '@/app/actions/permissions';

export default function CompaniesPage() {
  const router = useRouter();
  const user = useUser({ or: 'redirect' });
  const [companies, setCompanies] = useState<CompanyWithUsers[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);

  // Users modal state
  const [usersModalOpen, setUsersModalOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<CompanyWithUsers | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'inactive'>('active');

  // Add user form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState('member');
  const [addingUser, setAddingUser] = useState(false);

  // Edit user state
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [editRole, setEditRole] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Action menu state
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Get user's selected team for navigation
  const selectedTeam = user.selectedTeam;

  // Refresh team members
  const refreshMembers = async () => {
    if (!selectedCompany) return;
    setLoadingMembers(true);
    const members = await getCompanyTeamMembers(selectedCompany.id);
    setTeamMembers(members);
    setLoadingMembers(false);
  };

  // Open users modal and load team members
  const openUsersModal = async (company: CompanyWithUsers, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row click
    setSelectedCompany(company);
    setUsersModalOpen(true);
    setLoadingMembers(true);
    setActiveTab('active');
    setShowAddForm(false);
    setEditingMember(null);

    const members = await getCompanyTeamMembers(company.id);
    setTeamMembers(members);
    setLoadingMembers(false);
  };

  // Close modal and reset state
  const closeModal = () => {
    setUsersModalOpen(false);
    setShowAddForm(false);
    setEditingMember(null);
    setActionMenuOpen(null);
    setNewUserEmail('');
    setNewUserName('');
    setNewUserRole('member');
  };

  // Handle add user
  const handleAddUser = async () => {
    if (!selectedCompany || !newUserEmail.trim()) return;
    setAddingUser(true);

    const result = await inviteCompanyUser(selectedCompany.id, {
      email: newUserEmail.trim(),
      fullName: newUserName.trim() || undefined,
      role: newUserRole,
    });

    if (result.success) {
      setNewUserEmail('');
      setNewUserName('');
      setNewUserRole('member');
      setShowAddForm(false);
      await refreshMembers();
      // Update company user count
      setCompanies(companies.map(c =>
        c.id === selectedCompany.id ? { ...c, user_count: c.user_count + 1 } : c
      ));
    } else {
      alert(result.error || 'Eroare la adăugarea utilizatorului');
    }

    setAddingUser(false);
  };

  // Handle resend invite
  const handleResendInvite = async (memberId: string) => {
    if (!selectedCompany) return;
    setActionLoading(memberId);

    const result = await resendUserInvitation(selectedCompany.id, memberId);
    if (result.success) {
      alert('Invitația a fost retrimisă');
    } else {
      alert(result.error || 'Eroare la retrimiterea invitației');
    }

    setActionLoading(null);
    setActionMenuOpen(null);
  };

  // Handle edit user
  const handleEditUser = async (memberId: string) => {
    if (!selectedCompany || !editRole) return;
    setSavingEdit(true);

    const result = await updateCompanyUser(selectedCompany.id, memberId, { role: editRole });
    if (result.success) {
      setEditingMember(null);
      await refreshMembers();
    } else {
      alert(result.error || 'Eroare la actualizarea utilizatorului');
    }

    setSavingEdit(false);
  };

  // Handle toggle active
  const handleToggleActive = async (memberId: string, activate: boolean) => {
    if (!selectedCompany) return;
    setActionLoading(memberId);

    const result = await toggleUserActive(selectedCompany.id, memberId, activate);
    if (result.success) {
      await refreshMembers();
    } else {
      alert(result.error || 'Eroare la schimbarea statusului');
    }

    setActionLoading(null);
    setActionMenuOpen(null);
  };

  // Handle remove user
  const handleRemoveUser = async (memberId: string) => {
    if (!selectedCompany) return;
    if (!confirm('Sigur doriți să eliminați această invitație?')) return;

    setActionLoading(memberId);

    const result = await removeCompanyUser(selectedCompany.id, memberId);
    if (result.success) {
      await refreshMembers();
      // Update company user count
      setCompanies(companies.map(c =>
        c.id === selectedCompany.id ? { ...c, user_count: Math.max(0, c.user_count - 1) } : c
      ));
    } else {
      alert(result.error || 'Eroare la eliminarea utilizatorului');
    }

    setActionLoading(null);
    setActionMenuOpen(null);
  };

  // Start editing member
  const startEditMember = (member: TeamMember) => {
    setEditingMember(member);
    setEditRole(member.role);
    setActionMenuOpen(null);
  };

  // Filter members by status
  const activeMembers = teamMembers.filter(m => m.status === 'active' || m.status === 'pending');
  const inactiveMembers = teamMembers.filter(m => m.status === 'inactive');

  // Close action menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (actionMenuOpen && !(e.target as Element).closest('.action-menu-container')) {
        setActionMenuOpen(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [actionMenuOpen]);

  useEffect(() => {
    const init = async () => {
      const isSuper = await checkCurrentUserIsSuperAdmin();
      if (isSuper) {
        setIsSuperAdmin(true);
        setIsAdmin(true);
        setHasAccess(true);
        const data = await getCompanies();
        setCompanies(data);
        setLoading(false);
        return;
      }

      // Non-super-admin: any team member can view their company
      const selectedTeamId = selectedTeam?.id;
      if (selectedTeamId) {
        const myCompany = await getCompanyByTeamId(selectedTeamId);
        if (myCompany) {
          setHasAccess(true);
          // Check if company admin for edit rights
          const adminStatus = await isCompanyAdmin(selectedTeamId);
          setIsAdmin(adminStatus);
          // Load only their own company with member count
          const members = await getCompanyTeamMembers(myCompany.id);
          setCompanies([{ ...myCompany, user_count: members.length } as CompanyWithUsers]);
          setLoading(false);
          return;
        }
      }

      // No company found — redirect
      router.replace(selectedTeamId ? `/dashboard/${selectedTeamId}` : '/');
    };
    init();
  }, [router, selectedTeam]);

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

  if (!hasAccess) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#F8F8F8]">
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-6">
        <button
          onClick={() => {
            // Navigate to selected team's expenses page, or first available team
            if (selectedTeam) {
              router.push(`/dashboard/${selectedTeam.id}/expenses`);
            } else {
              router.back();
            }
          }}
          className="w-10 h-10 flex items-center justify-center rounded-full border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
        >
          <X size={18} className="text-gray-500" />
        </button>

        <h1 className="text-2xl font-semibold text-gray-900">Companii</h1>

        <div className="w-10" /> {/* Spacer for centering */}
      </div>

      {/* Content */}
      <div className="px-8 pb-8">
        <div className="max-w-5xl mx-auto">
          {/* Card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Card Header with Add Button - Super Admin only */}
            {isSuperAdmin && (
              <div className="flex justify-end px-6 py-5">
                <button
                  onClick={() => router.push('/companies/new')}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#00C9A7] to-[#00D4AA] text-white rounded-full font-medium hover:opacity-90 transition-all text-sm"
                >
                  <Plus size={16} />
                  Adauga companie
                </button>
              </div>
            )}

            {/* Table */}
            <div className="px-6 pb-6">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Companie
                    </th>
                    <th className="text-left py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Admin
                    </th>
                    <th className="text-left py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="text-center py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Useri
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {companies.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-12 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                            <Building2 size={24} className="text-gray-400" />
                          </div>
                          <p className="text-gray-500">Nu există companii încă</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    companies.map((company) => (
                      <tr 
                        key={company.id} 
                        className="border-b border-gray-50 last:border-b-0 hover:bg-gray-50/50 transition-colors cursor-pointer"
                        onClick={() => router.push(`/companies/${company.id}`)}
                      >
                        <td className="py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-[#00C9A7] to-[#00D4AA] rounded-full flex items-center justify-center">
                              <Building2 size={18} className="text-white" />
                            </div>
                            <span className="font-medium text-gray-900">{company.name}</span>
                          </div>
                        </td>
                        <td className="py-4">
                          <span className="text-gray-700">{company.admin_name || '-'}</span>
                        </td>
                        <td className="py-4">
                          <span className="text-gray-500">{company.admin_email}</span>
                        </td>
                        <td className="py-4 text-center">
                          <button
                            onClick={(e) => openUsersModal(company, e)}
                            className="inline-flex items-center justify-center w-10 h-10 rounded-full border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:border-gray-300 transition-colors"
                          >
                            {company.user_count}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Users Modal */}
      {usersModalOpen && selectedCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={closeModal}
          />

          {/* Modal */}
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-3xl mx-4 max-h-[85vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-[#00C9A7] to-[#00D4AA] rounded-full flex items-center justify-center">
                  <Users size={18} className="text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Membri echipă</h2>
                  <p className="text-sm text-gray-500">{selectedCompany.name}</p>
                </div>
              </div>
              <button
                onClick={closeModal}
                className="w-10 h-10 flex items-center justify-center rounded-full border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <X size={18} className="text-gray-500" />
              </button>
            </div>

            {/* Tabs */}
            <div className="px-6 pt-4 border-b border-gray-100">
              <div className="flex gap-6">
                <button
                  onClick={() => setActiveTab('active')}
                  className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'active'
                      ? 'text-[#00C9A7] border-[#00C9A7]'
                      : 'text-gray-500 border-transparent hover:text-gray-700'
                  }`}
                >
                  Activi ({activeMembers.length})
                </button>
                <button
                  onClick={() => setActiveTab('inactive')}
                  className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'inactive'
                      ? 'text-[#00C9A7] border-[#00C9A7]'
                      : 'text-gray-500 border-transparent hover:text-gray-700'
                  }`}
                >
                  Inactivi ({inactiveMembers.length})
                </button>
              </div>
            </div>

            {/* Add User Form - Admin only */}
            {isAdmin && showAddForm && (
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="email"
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      placeholder="Email *"
                      className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                      autoFocus
                    />
                    <input
                      type="text"
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                      placeholder="Nume complet"
                      className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <select
                      value={newUserRole}
                      onChange={(e) => setNewUserRole(e.target.value)}
                      className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 bg-white"
                    >
                      <option value="admin">Company Admin</option>
                      <option value="member">Regular User</option>
                      <option value="accountant">Accountant</option>
                    </select>
                    <div className="flex-1" />
                    <button
                      onClick={() => setShowAddForm(false)}
                      className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                    >
                      Anulează
                    </button>
                    <button
                      onClick={handleAddUser}
                      disabled={addingUser || !newUserEmail.trim()}
                      className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#00C9A7] to-[#00D4AA] text-white rounded-full font-medium hover:opacity-90 transition-all text-sm disabled:opacity-50"
                    >
                      {addingUser ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
                      Trimite invitație
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Edit User Form - Admin only */}
            {isAdmin && editingMember && (
              <div className="px-6 py-4 border-b border-gray-100 bg-blue-50">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-600">Editează rol pentru <strong>{editingMember.email}</strong>:</span>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value)}
                    className="px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 bg-white"
                  >
                    <option value="admin">Company Admin</option>
                    <option value="member">Regular User</option>
                    <option value="accountant">Accountant</option>
                  </select>
                  <div className="flex-1" />
                  <button
                    onClick={() => setEditingMember(null)}
                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                  >
                    Anulează
                  </button>
                  <button
                    onClick={() => handleEditUser(editingMember.id)}
                    disabled={savingEdit}
                    className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-full font-medium hover:bg-blue-700 transition-all text-sm disabled:opacity-50"
                  >
                    {savingEdit ? <Loader2 size={16} className="animate-spin" /> : null}
                    Salvează
                  </button>
                </div>
              </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-auto px-6 py-4">
              {loadingMembers ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-pulse flex flex-col items-center gap-4">
                    <div className="w-12 h-12 bg-teal-100 rounded-full" />
                    <div className="h-4 w-32 bg-gray-200 rounded" />
                  </div>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Utilizator
                      </th>
                      <th className="text-left py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="text-left py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Rol
                      </th>
                      <th className="text-left py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Data adăugării
                      </th>
                      <th className="text-center py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Status
                      </th>
                      {isAdmin && <th className="w-12"></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {(activeTab === 'active' ? activeMembers : inactiveMembers).length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center">
                          <div className="flex flex-col items-center gap-3">
                            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                              <Users size={24} className="text-gray-400" />
                            </div>
                            <p className="text-gray-500">
                              {activeTab === 'active'
                                ? 'Nu există membri activi'
                                : 'Nu există membri inactivi'}
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      (activeTab === 'active' ? activeMembers : inactiveMembers).map((member) => (
                        <tr
                          key={member.id}
                          className="border-b border-gray-50 last:border-b-0 group"
                        >
                          <td className="py-4">
                            <div className="flex items-center gap-3">
                              {member.avatar_url ? (
                                <img
                                  src={member.avatar_url}
                                  alt=""
                                  className="w-9 h-9 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center">
                                  <span className="text-sm font-medium text-gray-500">
                                    {(member.full_name || member.email || '?')[0].toUpperCase()}
                                  </span>
                                </div>
                              )}
                              <span className="font-medium text-gray-900">
                                {member.full_name || '-'}
                              </span>
                            </div>
                          </td>
                          <td className="py-4">
                            <span className="text-gray-500">{member.email}</span>
                          </td>
                          <td className="py-4">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                              member.role === 'admin'
                                ? 'bg-purple-100 text-purple-700'
                                : 'bg-gray-100 text-gray-700'
                            }`}>
                              {member.role === 'admin' ? 'Admin' : 'Membru'}
                            </span>
                          </td>
                          <td className="py-4">
                            <span className="text-gray-500 text-sm">
                              {member.joined_at
                                ? new Date(member.joined_at).toLocaleDateString('ro-RO', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric'
                                  })
                                : '-'}
                            </span>
                          </td>
                          <td className="py-4 text-center">
                            {member.status === 'pending' ? (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                                În așteptare
                              </span>
                            ) : member.status === 'active' ? (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                Activ
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                                Inactiv
                              </span>
                            )}
                          </td>
                          {isAdmin && (
                          <td className="py-4 relative">
                            {actionLoading === member.id ? (
                              <Loader2 size={18} className="animate-spin text-gray-400" />
                            ) : (
                              <div className="relative action-menu-container">
                                <button
                                  onClick={() => setActionMenuOpen(actionMenuOpen === member.id ? null : member.id)}
                                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <MoreVertical size={18} />
                                </button>

                                {/* Action Menu */}
                                {actionMenuOpen === member.id && (
                                  <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-10">
                                    {/* Edit Role */}
                                    <button
                                      onClick={() => startEditMember(member)}
                                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                    >
                                      <Pencil size={14} />
                                      Schimbă rol
                                    </button>

                                    {/* Resend Invite - only for pending */}
                                    {member.status === 'pending' && (
                                      <button
                                        onClick={() => handleResendInvite(member.id)}
                                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                      >
                                        <Mail size={14} />
                                        Retrimite invitație
                                      </button>
                                    )}

                                    {/* Activate - only for inactive */}
                                    {member.status === 'inactive' && (
                                      <button
                                        onClick={() => handleToggleActive(member.id, true)}
                                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-green-600 hover:bg-green-50"
                                      >
                                        <UserCheck size={14} />
                                        Activează
                                      </button>
                                    )}

                                    {/* Deactivate - only for active */}
                                    {member.status === 'active' && (
                                      <button
                                        onClick={() => handleToggleActive(member.id, false)}
                                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-orange-600 hover:bg-orange-50"
                                      >
                                        <UserX size={14} />
                                        Dezactivează
                                      </button>
                                    )}

                                    {/* Remove - only for pending */}
                                    {member.status === 'pending' && (
                                      <button
                                        onClick={() => handleRemoveUser(member.id)}
                                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                                      >
                                        <Trash2 size={14} />
                                        Elimină invitație
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>

            {/* Footer with Add button - Admin only */}
            {isAdmin && (
              <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
                {!showAddForm && !editingMember && (
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#00C9A7] to-[#00D4AA] text-white rounded-full font-medium hover:opacity-90 transition-all text-sm"
                  >
                    <UserPlus size={16} />
                    Adaugă coleg
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
