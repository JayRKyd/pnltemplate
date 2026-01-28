"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { X, Check, User, RefreshCcw, Ban, Loader2 } from 'lucide-react';
import { 
  getTeamMembers, 
  setMemberActiveStatus,
  TeamMemberWithProfile 
} from '@/app/actions/team-members';

type Role = 'Admin' | 'Editor' | 'Viewer';

interface UserType {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
  active: boolean;
  hasAvatar: boolean;
  avatarUrl?: string | null;
  lastChanged?: string;
}

interface UtilizatoriProps {
  onClose?: () => void;
  teamId?: string;
}

// Map database roles to UI roles
function mapRole(dbRole: string): Role {
  switch (dbRole.toLowerCase()) {
    case 'owner':
    case 'admin':
      return 'Admin';
    case 'viewer':
      return 'Viewer';
    case 'member':
    case 'editor':
    default:
      return 'Editor';
  }
}

// Format date to Romanian format (DD-MMM-YY)
function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  const months = ['Ian', 'Feb', 'Mar', 'Apr', 'Mai', 'Iun', 'Iul', 'Aug', 'Sep', 'Oct', 'Noi', 'Dec'];
  const day = date.getDate().toString().padStart(2, '0');
  const month = months[date.getMonth()];
  const year = date.getFullYear().toString().slice(-2);
  return `${day}-${month}-${year}`;
}

// Split name into firstName and lastName
function splitName(fullName: string | null): { firstName: string; lastName: string } {
  if (!fullName) return { firstName: 'Unknown', lastName: '' };
  const parts = fullName.trim().split(' ');
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

// Transform database member to UI user type
function transformMember(member: TeamMemberWithProfile): UserType {
  const { firstName, lastName } = splitName(member.name);
  return {
    id: member.user_id,
    firstName,
    lastName,
    email: member.email || '',
    role: mapRole(member.role),
    active: member.is_active,
    hasAvatar: !!member.avatar_url,
    avatarUrl: member.avatar_url,
    lastChanged: formatDate(member.updated_at || member.joined_at),
  };
}

interface ActivateModalProps {
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
}

interface DeactivateModalProps {
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
}

function DeactivateModal({ onClose, onConfirm, loading }: DeactivateModalProps) {
  return (
    <div className="absolute inset-0 bg-black/20 backdrop-blur-[1px] flex items-center justify-center z-50">
      <div className="bg-white rounded-[24px] p-8 w-[400px] shadow-xl flex flex-col items-center text-center relative animate-in fade-in zoom-in duration-200">
        <button 
          onClick={onClose}
          disabled={loading}
          className="absolute left-6 top-6 p-1 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
        >
          <X size={20} className="text-gray-400" />
        </button>

        <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-6 mt-4">
          <Ban size={32} className="text-red-500" />
        </div>

        <h3 className="text-xl font-semibold text-gray-900 mb-3">
          Inactiveaza utilizator?
        </h3>
        
        <p className="text-gray-500 text-sm leading-relaxed mb-8">
          Esti sigur ca vrei sa inactivezi acest utilizator? Il vei putea reactiva oricand din tab-ul "Inactivi".
        </p>

        <div className="flex gap-3 w-full">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-full text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Anuleaza
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-full font-medium hover:bg-red-600 transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            Inactiveaza
          </button>
        </div>
      </div>
    </div>
  );
}

function ActivateModal({ onClose, onConfirm, loading }: ActivateModalProps) {
  return (
    <div className="absolute inset-0 bg-black/20 backdrop-blur-[1px] flex items-center justify-center z-50">
      <div className="bg-white rounded-[24px] p-8 w-[400px] shadow-xl flex flex-col items-center text-center relative animate-in fade-in zoom-in duration-200">
        <button 
          onClick={onClose}
          disabled={loading}
          className="absolute left-6 top-6 p-1 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
        >
          <X size={20} className="text-gray-400" />
        </button>

        <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mb-6 mt-4">
          <RefreshCcw size={32} className="text-emerald-500" />
        </div>

        <h3 className="text-xl font-semibold text-gray-900 mb-3">
          Activeaza utilizator?
        </h3>
        
        <p className="text-gray-500 text-sm leading-relaxed mb-8">
          Esti sigur ca vrei sa activezi acest utilizator? Il vei putea inactiva oricand din tab-ul "Activi".
        </p>

        <div className="flex gap-3 w-full">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-full text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Anuleaza
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 px-4 py-2.5 bg-teal-500 text-white rounded-full font-medium hover:bg-teal-600 transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            Activeaza
          </button>
        </div>
      </div>
    </div>
  );
}

export function Utilizatori({ onClose, teamId }: UtilizatoriProps) {
  const [activeTab, setActiveTab] = useState<'activi' | 'inactivi'>('activi');
  const [activatingUser, setActivatingUser] = useState<UserType | null>(null);
  const [deactivatingUser, setDeactivatingUser] = useState<UserType | null>(null);
  const [allUsers, setAllUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Load team members
  const loadMembers = useCallback(async () => {
    if (!teamId) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      const members = await getTeamMembers(teamId);
      const transformed = members.map(transformMember);
      setAllUsers(transformed);
    } catch (error) {
      console.error('Failed to load team members:', error);
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  // Handle activate user
  const handleActivate = async () => {
    if (!activatingUser || !teamId) return;
    
    try {
      setActionLoading(true);
      await setMemberActiveStatus(teamId, activatingUser.id, true);
      await loadMembers();
      setActivatingUser(null);
    } catch (error) {
      console.error('Failed to activate user:', error);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle deactivate user
  const handleDeactivate = async () => {
    if (!deactivatingUser || !teamId) return;
    
    try {
      setActionLoading(true);
      await setMemberActiveStatus(teamId, deactivatingUser.id, false);
      await loadMembers();
      setDeactivatingUser(null);
    } catch (error) {
      console.error('Failed to deactivate user:', error);
    } finally {
      setActionLoading(false);
    }
  };

  // Filter users by active status
  const activeUsers = allUsers.filter(u => u.active);
  const inactiveUsers = allUsers.filter(u => !u.active);
  const users = activeTab === 'activi' ? activeUsers : inactiveUsers;

  const getRoleBadgeStyle = (role: Role) => {
    switch (role) {
      case 'Admin':
        return {
          backgroundColor: '#F3E8FFB2',
          color: '#374151',
          border: '1px solid #E5E7EB'
        };
      case 'Editor':
        return {
          backgroundColor: '#DBEAFEB2',
          color: '#374151',
          border: '1px solid #E5E7EB'
        };
      case 'Viewer':
        return {
          backgroundColor: '#F3F4F6',
          color: '#374151',
          border: '1px solid #E5E7EB'
        };
      default:
        return {
          backgroundColor: '#F3F4F6',
          color: '#374151',
          border: '1px solid #E5E7EB'
        };
    }
  };

  const getAvatarColor = (id: string) => {
    const colors = [
      'bg-amber-100',
      'bg-blue-100',
      'bg-emerald-100',
      'bg-purple-100',
      'bg-pink-100',
      'bg-cyan-100',
    ];
    // Hash the string id to get a consistent index
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div className="bg-white rounded-[24px] shadow-lg border border-gray-100 overflow-hidden font-sans w-full max-w-[900px] mx-auto relative min-h-[600px]">
      {activatingUser && (
        <ActivateModal 
          onClose={() => setActivatingUser(null)} 
          onConfirm={handleActivate}
          loading={actionLoading}
        />
      )}

      {deactivatingUser && (
        <DeactivateModal 
          onClose={() => setDeactivatingUser(null)} 
          onConfirm={handleDeactivate}
          loading={actionLoading}
        />
      )}
      {/* Header */}
      <div className="px-8 py-6 flex items-center justify-between border-b border-gray-100">
        <div className="flex items-center gap-4">
          <button 
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-400" />
          </button>
          <h1 className="text-2xl font-semibold text-gray-900">Utilizatori</h1>
        </div>

        {/* Toggle Tabs */}
        <div className="flex items-center bg-gray-100 rounded-full p-1">
          <button
            onClick={() => setActiveTab('activi')}
            className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium transition-all ${
              activeTab === 'activi'
                ? 'bg-teal-500 text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {activeTab === 'activi' && <Check size={16} />}
            Activi
          </button>
          <button
            onClick={() => setActiveTab('inactivi')}
            className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
              activeTab === 'inactivi'
                ? 'bg-teal-500 text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Inactivi
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="px-8 py-4">
        {/* Table Header */}
        <div 
          className={`grid ${'grid-cols-[1fr_1.5fr_100px_140px_80px]'} gap-4 py-3 border-y border-gray-100 rounded-t-lg`}
          style={{ backgroundColor: '#F9FAFBB2' }}
        >
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider pl-4">
            Utilizator
          </div>
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Email
          </div>
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider text-center">
            Rol
          </div>
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider text-center">
            Data Schimbare
          </div>
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider text-center">
            Activ
          </div>
        </div>

        {/* Table Body */}
        <div className="divide-y divide-gray-50">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="animate-spin text-teal-500" />
              <span className="ml-2 text-gray-500">Se incarca...</span>
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <User size={48} className="text-gray-300 mb-3" />
              <p>{activeTab === 'activi' ? 'Nu exista utilizatori activi' : 'Nu exista utilizatori inactivi'}</p>
            </div>
          ) : users.map((user) => (
            <div 
              key={user.id} 
              className={`grid ${'grid-cols-[1fr_1.5fr_100px_140px_80px]'} gap-4 py-4 items-center hover:bg-gray-50/50 transition-colors pl-4`}
            >
              {/* User Avatar + Name */}
              <div className="flex items-center gap-3">
                {user.hasAvatar && user.avatarUrl ? (
                  <div className="w-10 h-10 rounded-full overflow-hidden">
                    <img 
                      src={user.avatarUrl} 
                      alt={`${user.firstName} ${user.lastName}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-full bg-teal-50 flex items-center justify-center">
                    <User size={20} className="text-teal-500" />
                  </div>
                )}
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-900">{user.firstName}</span>
                  <span className="text-sm font-medium text-gray-900">{user.lastName}</span>
                </div>
              </div>

              {/* Email */}
              <div className="text-sm text-gray-500">
                {user.email}
              </div>

              {/* Role Badge */}
              <div className="flex justify-center">
                <span 
                  className="px-3 py-1 rounded-full text-xs font-medium"
                  style={getRoleBadgeStyle(user.role)}
                >
                  {user.role}
                </span>
              </div>

              {/* Last Changed Date (Both tabs) */}
              <div className="text-sm text-gray-500 text-center">
                {user.lastChanged}
              </div>

              {/* Active Status */}
              <div className="flex justify-center">
                {user.active ? (
                  <button 
                    onClick={() => setDeactivatingUser(user)}
                    className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center hover:bg-emerald-100 transition-colors"
                  >
                    <Check size={16} className="text-emerald-500" />
                  </button>
                ) : (
                  <button 
                    onClick={() => setActivatingUser(user)}
                    className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center hover:bg-red-100 transition-colors"
                  >
                    <X size={16} className="text-red-500" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer with Add Button */}
      {activeTab === 'activi' && (
        <div className="px-8 py-6 flex justify-center border-t border-gray-100">
          <button className="px-8 py-3 bg-teal-500 hover:bg-teal-600 text-white font-medium rounded-full transition-colors shadow-sm">
            Adauga coleg
          </button>
        </div>
      )}
    </div>
  );
}

export default Utilizatori;
