// @ts-nocheck
"use client";

import React, { useState } from 'react';
import { ChevronDown, Menu } from 'lucide-react';

interface NavbarProps {
  companyName?: string;
  activeTab?: 'cheltuieli' | 'pnl';
  onTabChange?: (tab: 'cheltuieli' | 'pnl') => void;
  onCompanyClick?: () => void;
  onMenuClick?: () => void;
  userAvatar?: string;
}

export function Navbar({ 
  companyName = 'Bono',
  activeTab = 'cheltuieli',
  onTabChange,
  onCompanyClick,
  onMenuClick,
  userAvatar
}: NavbarProps) {
  const [currentTab, setCurrentTab] = useState(activeTab);

  const handleTabChange = (tab: 'cheltuieli' | 'pnl') => {
    setCurrentTab(tab);
    onTabChange?.(tab);
  };

  return (
    <div className="w-full bg-white border-b border-gray-100">
      <div className="flex items-center justify-between px-6 py-3">
        {/* Left - Company Dropdown */}
        <button 
          onClick={onCompanyClick}
          className="flex items-center gap-2 px-4 py-2 rounded-full border border-gray-200 hover:bg-gray-50 transition-colors"
        >
          <span className="text-sm font-medium text-gray-700">{companyName}</span>
          <ChevronDown size={16} className="text-gray-400" />
        </button>

        {/* Center - Tab Switcher */}
        <div className="flex items-center bg-gray-100 rounded-full p-1">
          <button
            onClick={() => handleTabChange('cheltuieli')}
            className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
              currentTab === 'cheltuieli'
                ? 'bg-teal-500 text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Cheltuieli
          </button>
          <button
            onClick={() => handleTabChange('pnl')}
            className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
              currentTab === 'pnl'
                ? 'bg-teal-500 text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            P&L
          </button>
        </div>

        {/* Right - Menu & Avatar */}
        <div className="flex items-center gap-4">
          <button 
            onClick={onMenuClick}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Menu size={20} className="text-gray-500" />
          </button>
          
          {userAvatar ? (
            <img 
              src={userAvatar} 
              alt="User" 
              className="w-9 h-9 rounded-full object-cover border-2 border-gray-100"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center border-2 border-gray-100">
              <img 
                src="https://i.pravatar.cc/36?img=3" 
                alt="User" 
                className="w-full h-full rounded-full object-cover"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Navbar;
