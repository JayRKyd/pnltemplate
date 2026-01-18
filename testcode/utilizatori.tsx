// @ts-nocheck
"use client";

import React, { useState } from 'react';
import { X, Check, User, RefreshCcw, Ban } from 'lucide-react';

// Mock user data based on the image
const mockUsers = [
  { id: 1, firstName: 'Ana', lastName: 'Popescu', email: 'ana.popescu@companie.ro', role: 'Admin', active: true, hasAvatar: true, lastChanged: '15-Noi-24' },
  { id: 2, firstName: 'Mihai', lastName: 'Ionescu', email: 'mihai.ionescu@companie.ro', role: 'Editor', active: true, hasAvatar: true, lastChanged: '22-Oct-24' },
  { id: 3, firstName: 'Elena', lastName: 'Marinescu', email: 'elena.marinescu@companie.ro', role: 'Viewer', active: true, hasAvatar: true, lastChanged: '10-Sep-24' },
  { id: 4, firstName: 'Gabriel', lastName: 'Popa', email: 'gabriel.popa@companie.ro', role: 'Editor', active: true, hasAvatar: true, lastChanged: '05-Dec-24' },
  { id: 5, firstName: 'Andreea', lastName: 'Diaconu', email: 'andreea.diaconu@companie.ro', role: 'Admin', active: true, hasAvatar: true, lastChanged: '20-Aug-24' },
  { id: 6, firstName: 'Cristian', lastName: 'Stanciu', email: 'cristian.stanciu@companie.ro', role: 'Viewer', active: true, hasAvatar: false, lastChanged: '14-Noi-24' },
  { id: 7, firstName: 'Maria', lastName: 'Radu', email: 'maria.radu@companie.ro', role: 'Editor', active: true, hasAvatar: false, lastChanged: '08-Oct-24' },
  { id: 8, firstName: 'Ioana', lastName: 'Vasile', email: 'ioana.vasile@companie.ro', role: 'Editor', active: true, hasAvatar: false, lastChanged: '25-Sep-24' },
  { id: 9, firstName: 'Daniel', lastName: 'Constantin', email: 'daniel.constantin@companie.ro', role: 'Admin', active: true, hasAvatar: false, lastChanged: '12-Iul-24' },
  { id: 10, firstName: 'Adrian', lastName: 'Niculae', email: 'adrian.niculae@companie.ro', role: 'Editor', active: true, hasAvatar: false, lastChanged: '05-Dec-24' },
  { id: 11, firstName: 'Simona', lastName: 'Tudor', email: 'simona.tudor@companie.ro', role: 'Viewer', active: true, hasAvatar: false, lastChanged: '15-Aug-24' },
  { id: 12, firstName: 'Laura', lastName: 'Stoica', email: 'laura.stoica@companie.ro', role: 'Admin', active: true, hasAvatar: false, lastChanged: '11-Noi-24' },
];

const inactiveUsers = [
  { id: 13, firstName: 'Ion', lastName: 'Gheorghe', email: 'ion.gheorghe@companie.ro', role: 'Viewer', active: false, hasAvatar: false, lastChanged: '24-Noi-24' },
  { id: 14, firstName: 'Carmen', lastName: 'Dumitru', email: 'carmen.dumitru@companie.ro', role: 'Editor', active: false, hasAvatar: false, lastChanged: '12-Oct-24' },
];

type Role = 'Admin' | 'Editor' | 'Viewer';

interface UserType {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
  active: boolean;
  hasAvatar: boolean;
  lastChanged?: string;
}

interface UtilizatoriProps {
  onClose?: () => void;
}

interface ActivateModalProps {
  onClose: () => void;
  onConfirm: () => void;
}

interface DeactivateModalProps {
  onClose: () => void;
  onConfirm: () => void;
}

function DeactivateModal({ onClose, onConfirm }: DeactivateModalProps) {
  return (
    <div className="absolute inset-0 bg-black/20 backdrop-blur-[1px] flex items-center justify-center z-50">
      <div className="bg-white rounded-[24px] p-8 w-[400px] shadow-xl flex flex-col items-center text-center relative animate-in fade-in zoom-in duration-200">
        <button 
          onClick={onClose}
          className="absolute left-6 top-6 p-1 hover:bg-gray-100 rounded-lg transition-colors"
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
            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-full text-gray-700 font-medium hover:bg-gray-50 transition-colors"
          >
            Anuleaza
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-full font-medium hover:bg-red-600 transition-colors shadow-sm"
          >
            Inactiveaza
          </button>
        </div>
      </div>
    </div>
  );
}

function ActivateModal({ onClose, onConfirm }: ActivateModalProps) {
  return (
    <div className="absolute inset-0 bg-black/20 backdrop-blur-[1px] flex items-center justify-center z-50">
      <div className="bg-white rounded-[24px] p-8 w-[400px] shadow-xl flex flex-col items-center text-center relative animate-in fade-in zoom-in duration-200">
        <button 
          onClick={onClose}
          className="absolute left-6 top-6 p-1 hover:bg-gray-100 rounded-lg transition-colors"
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
            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-full text-gray-700 font-medium hover:bg-gray-50 transition-colors"
          >
            Anuleaza
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2.5 bg-teal-500 text-white rounded-full font-medium hover:bg-teal-600 transition-colors shadow-sm"
          >
            Activeaza
          </button>
        </div>
      </div>
    </div>
  );
}

export function Utilizatori({ onClose }: UtilizatoriProps) {
  const [activeTab, setActiveTab] = useState<'activi' | 'inactivi'>('activi');
  const [activatingUser, setActivatingUser] = useState<UserType | null>(null);
  const [deactivatingUser, setDeactivatingUser] = useState<UserType | null>(null);

  const users = activeTab === 'activi' ? mockUsers : inactiveUsers;

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

  const getAvatarColor = (id: number) => {
    const colors = [
      'bg-amber-100',
      'bg-blue-100',
      'bg-emerald-100',
      'bg-purple-100',
      'bg-pink-100',
      'bg-cyan-100',
    ];
    return colors[id % colors.length];
  };

  return (
    <div className="bg-white rounded-[24px] shadow-lg border border-gray-100 overflow-hidden font-sans w-full max-w-[900px] mx-auto relative min-h-[600px]">
      {activatingUser && (
        <ActivateModal 
          onClose={() => setActivatingUser(null)} 
          onConfirm={() => {
            console.log('Activating user:', activatingUser);
            setActivatingUser(null);
          }} 
        />
      )}

      {deactivatingUser && (
        <DeactivateModal 
          onClose={() => setDeactivatingUser(null)} 
          onConfirm={() => {
            console.log('Deactivating user:', deactivatingUser);
            setDeactivatingUser(null);
          }} 
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
          {users.map((user) => (
            <div 
              key={user.id} 
              className={`grid ${'grid-cols-[1fr_1.5fr_100px_140px_80px]'} gap-4 py-4 items-center hover:bg-gray-50/50 transition-colors pl-4`}
            >
              {/* User Avatar + Name */}
              <div className="flex items-center gap-3">
                {user.hasAvatar ? (
                  <div className={`w-10 h-10 rounded-full ${getAvatarColor(user.id)} flex items-center justify-center overflow-hidden`}>
                    <img 
                      src={`https://i.pravatar.cc/40?img=${user.id}`} 
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
