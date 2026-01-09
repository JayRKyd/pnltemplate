import { Bell, Settings, User, Menu, Plus, X, Building2, Users, LogOut, Smartphone } from 'lucide-react';
import bonoLogo from 'figma:asset/c84a88abdf237daf96f6c84ae7d712b5a36fd98e.png';
import { useState, useEffect, useRef } from 'react';
import { CustomSelect } from './customselect';
import { Palette } from 'lucide-react';

interface HeaderProps {
  onNewExpense: () => void;
  onListExpenses: () => void;
  onPL: () => void;
  onProfile: () => void;
  onSettings: () => void;
  onUsers: () => void;
  onDesign: () => void;
  onWireflow: () => void;
  onMobile: () => void;
  currentView: 'list' | 'new' | 'pl' | 'profile' | 'settings' | 'users' | 'design' | 'wireflow' | 'mobile';
  selectedCompany: string;
  onCompanyChange: (company: string) => void;
}

export function Header({ onNewExpense, onListExpenses, onPL, onProfile, onSettings, onUsers, onDesign, onWireflow, onMobile, currentView, selectedCompany, onCompanyChange }: HeaderProps) {
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const accountButtonRef = useRef<HTMLButtonElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 });

  // Calculate dropdown position
  useEffect(() => {
    if (isAccountMenuOpen && accountButtonRef.current) {
      const rect = accountButtonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 12,
        right: window.innerWidth - rect.right
      });
    }
  }, [isAccountMenuOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target as Node) &&
          accountButtonRef.current && !accountButtonRef.current.contains(event.target as Node)) {
        setIsAccountMenuOpen(false);
      }
    }

    if (isAccountMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isAccountMenuOpen]);

  return (
    <>
      <header className="bg-white/70 backdrop-blur-xl border-b border-gray-200/50 px-4 md:px-8 py-4 shadow-sm">
        <div className="flex items-center justify-between">
          {/* Left side - Company Selector */}
          <div className="flex items-center gap-4">
            {/* Company Selector */}
            <div className="hidden md:block" style={{ width: '200px' }}>
              <CustomSelect
                value={selectedCompany}
                onChange={onCompanyChange}
                options={[
                  { value: "Bono", label: "Bono" },
                  { value: "Graffiti PR", label: "Graffiti PR" },
                  { value: "ROCA", label: "ROCA" },
                ]}
                className="w-full px-6 py-3 border border-gray-300/50 bg-white/70 backdrop-blur-xl rounded-full text-gray-900 focus:outline-none focus:border-gray-400 transition-all shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
                style={{ fontSize: '0.9375rem', fontWeight: 400 }}
              />
            </div>
          </div>

          <div className="flex items-center gap-4 md:gap-6">
            {/* Mobile View button - first */}
            <button 
              onClick={onMobile}
              className={`px-8 py-3 rounded-full transition-all hidden md:block ${
                currentView === 'mobile'
                  ? 'bg-gray-200/80 text-gray-900 shadow-[0_4px_20px_rgba(0,0,0,0.08)]'
                  : 'text-gray-600 hover:bg-gray-100/70'
              }`}
              style={{ fontSize: '1rem', fontWeight: currentView === 'mobile' ? 500 : 400 }}
            >
              Mobile View
            </button>
            
            {/* Cheltuieli button - second */}
            <button 
              onClick={onListExpenses}
              className={`px-8 py-3 rounded-full transition-all hidden md:block ${
                currentView === 'list'
                  ? 'bg-gray-200/80 text-gray-900 shadow-[0_4px_20px_rgba(0,0,0,0.08)]'
                  : 'text-gray-600 hover:bg-gray-100/70'
              }`}
              style={{ fontSize: '1rem', fontWeight: currentView === 'list' ? 500 : 400 }}
            >
              Cheltuieli
            </button>
            
            {/* P&L button - third */}
            <button 
              onClick={onPL}
              className={`px-8 py-3 rounded-full transition-all hidden md:block ${
                currentView === 'pl'
                  ? 'bg-gray-200/80 text-gray-900'
                  : 'text-gray-600 hover:bg-gray-100/70'
              }`}
              style={{ fontSize: '1rem', fontWeight: currentView === 'pl' ? 500 : 400 }}
            >
              P&L
            </button>
            
            {/* Right side icons */}
            <div className="flex items-center gap-3 ml-4">
              {/* Desktop version - expands on hover and opens dropdown */}
              <div className="relative hidden md:block">
                <button 
                  onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)}
                  className="group flex items-center gap-5 px-4 py-2 bg-gray-100/70 hover:bg-gray-200/70 rounded-full transition-all hover:px-7"
                  ref={accountButtonRef}
                >
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="text-gray-600 flex-shrink-0">
                    <line x1="2" y1="4" x2="16" y2="4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    <line x1="2" y1="9" x2="16" y2="9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    <line x1="2" y1="14" x2="16" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  <span className="text-gray-900 max-w-0 overflow-hidden opacity-0 group-hover:max-w-xs group-hover:opacity-100 transition-all duration-300 ease-in-out whitespace-nowrap" style={{ fontSize: '0.9375rem', fontWeight: 400 }}>
                    Bogdan Georgescu
                  </span>
                  <img src="https://images.unsplash.com/photo-1672685667592-0392f458f46f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBtYW4lMjBwb3J0cmFpdHxlbnwxfHx8fDE3NjQ2NDkyMDd8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral" alt="Bogdan Georgescu" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                </button>
              </div>
              
              {/* Mobile version - doesn't expand, opens menu */}
              <button 
                onClick={() => setShowMobileMenu(true)}
                className="flex md:hidden items-center gap-2 px-4 py-2 bg-gray-100/70 rounded-full"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="text-gray-600 flex-shrink-0">
                  <line x1="2" y1="4" x2="16" y2="4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  <line x1="4" y1="9" x2="14" y2="9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  <line x1="6" y1="14" x2="12" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                <img src="https://images.unsplash.com/photo-1672685667592-0392f458f46f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBtYW4lMjBwb3J0cmFpdHxlbnwxfHx8fDE3NjQ2NDkyMDd8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral" alt="Bogdan Georgescu" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      {showMobileMenu && (
        <>
          <div 
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity"
            onClick={() => setShowMobileMenu(false)}
          />
          
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white/80 backdrop-blur-3xl rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.15)] border border-white/60 w-full max-w-sm">
              <div className="p-8 space-y-4">
                {/* Profil */}
                <button
                  onClick={() => {
                    setShowMobileMenu(false);
                    // Handle profile
                  }}
                  className="w-full flex items-center gap-4 px-6 py-4 text-left bg-white/70 hover:bg-gray-100/70 rounded-2xl transition-all shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
                >
                  <User size={20} className="text-gray-600 flex-shrink-0" />
                  <span className="text-gray-900" style={{ fontSize: '0.9375rem', fontWeight: 500 }}>
                    Profil
                  </span>
                </button>

                {/* Setari companie */}
                <button
                  onClick={() => {
                    setShowMobileMenu(false);
                    // Handle company settings
                  }}
                  className="w-full flex items-center gap-4 px-6 py-4 text-left bg-white/70 hover:bg-gray-100/70 rounded-2xl transition-all shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
                >
                  <Building2 size={20} className="text-gray-600 flex-shrink-0" />
                  <span className="text-gray-900" style={{ fontSize: '0.9375rem', fontWeight: 500 }}>
                    Setari companie
                  </span>
                </button>

                {/* Utilizatori */}
                <button
                  onClick={() => {
                    setShowMobileMenu(false);
                    onUsers();
                  }}
                  className="w-full flex items-center gap-4 px-6 py-4 text-left bg-white/70 hover:bg-gray-100/70 rounded-2xl transition-all shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
                >
                  <Users size={20} className="text-gray-600 flex-shrink-0" />
                  <span className="text-gray-900" style={{ fontSize: '0.9375rem', fontWeight: 500 }}>
                    Utilizatori
                  </span>
                </button>

                {/* Divider */}
                <div className="border-t border-gray-200/50 my-2"></div>
                
                {/* Log out */}
                <button
                  onClick={() => {
                    setShowMobileMenu(false);
                    // Handle logout
                  }}
                  className="w-full flex items-center gap-4 px-6 py-4 text-left bg-white/70 hover:bg-red-50/70 rounded-2xl transition-all shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
                >
                  <LogOut size={20} className="text-red-600 flex-shrink-0" />
                  <span className="text-red-600" style={{ fontSize: '0.9375rem', fontWeight: 500 }}>
                    Log out
                  </span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Desktop Account Dropdown */}
      {isAccountMenuOpen && (
        <div 
          ref={accountMenuRef}
          className="fixed w-96 bg-white/80 backdrop-blur-3xl rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.15)] border border-white/60 p-8 z-[9999]"
          style={{ top: `${dropdownPosition.top}px`, right: `${dropdownPosition.right}px` }}
        >
          <div className="space-y-4">
            {/* Profil */}
            <button
              onClick={() => {
                setIsAccountMenuOpen(false);
                onProfile();
              }}
              className="w-full flex items-center gap-4 px-6 py-4 text-left bg-white/70 hover:bg-gray-100/70 rounded-2xl transition-all shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] hover:-translate-y-0.5"
            >
              <User size={20} className="text-gray-600 flex-shrink-0" />
              <span className="text-gray-900" style={{ fontSize: '0.9375rem', fontWeight: 500 }}>
                Profil
              </span>
            </button>

            {/* Setari companie */}
            <button
              onClick={() => {
                setIsAccountMenuOpen(false);
                onSettings();
              }}
              className="w-full flex items-center gap-4 px-6 py-4 text-left bg-white/70 hover:bg-gray-100/70 rounded-2xl transition-all shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] hover:-translate-y-0.5"
            >
              <Building2 size={20} className="text-gray-600 flex-shrink-0" />
              <span className="text-gray-900" style={{ fontSize: '0.9375rem', fontWeight: 500 }}>
                Setari
              </span>
            </button>

            {/* Utilizatori */}
            <button
              onClick={() => {
                setIsAccountMenuOpen(false);
                onUsers();
              }}
              className="w-full flex items-center gap-4 px-6 py-4 text-left bg-white/70 hover:bg-gray-100/70 rounded-2xl transition-all shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] hover:-translate-y-0.5"
            >
              <Users size={20} className="text-gray-600 flex-shrink-0" />
              <span className="text-gray-900" style={{ fontSize: '0.9375rem', fontWeight: 500 }}>
                Utilizatori
              </span>
            </button>

            {/* Design System */}
            <button
              onClick={() => {
                setIsAccountMenuOpen(false);
                onDesign();
              }}
              className="w-full flex items-center gap-4 px-6 py-4 text-left bg-white/70 hover:bg-gray-100/70 rounded-2xl transition-all shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] hover:-translate-y-0.5"
            >
              <Palette size={20} className="text-gray-600 flex-shrink-0" />
              <span className="text-gray-900" style={{ fontSize: '0.9375rem', fontWeight: 500 }}>
                Design System
              </span>
            </button>

            {/* Wireflow */}
            <button
              onClick={() => {
                setIsAccountMenuOpen(false);
                onWireflow();
              }}
              className="w-full flex items-center gap-4 px-6 py-4 text-left bg-white/70 hover:bg-gray-100/70 rounded-2xl transition-all shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] hover:-translate-y-0.5"
            >
              <Palette size={20} className="text-gray-600 flex-shrink-0" />
              <span className="text-gray-900" style={{ fontSize: '0.9375rem', fontWeight: 500 }}>
                Wireflow
              </span>
            </button>

            {/* Divider */}
            <div className="border-t border-gray-200/50 my-2"></div>

            {/* Log out */}
            <button
              onClick={() => {
                setIsAccountMenuOpen(false);
                // Handle logout
              }}
              className="w-full flex items-center gap-4 px-6 py-4 text-left bg-white/70 hover:bg-red-50/70 rounded-2xl transition-all shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] hover:-translate-y-0.5"
            >
              <LogOut size={20} className="text-red-600 flex-shrink-0" />
              <span className="text-red-600" style={{ fontSize: '0.9375rem', fontWeight: 500 }}>
                Log out
              </span>
            </button>
          </div>
        </div>
      )}
    </>
  );
}