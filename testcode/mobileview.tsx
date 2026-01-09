import { useState } from 'react';
import { Plus, Calendar, Building2, FileText, Search, User, SlidersHorizontal, ChevronDown, X } from 'lucide-react';

interface Expense {
  id: number;
  date: Date;
  supplier: string;
  description: string;
  amount: number;
  type: string;
  operator: string;
  status: 'Final' | 'Draft' | 'Recurent';
}

interface MobileViewProps {
  onNewExpense: () => void;
  onEditExpense: (expense: Expense) => void;
  onBackToDesktop?: () => void;
}

const mockExpenses: Expense[] = [
  {
    id: 1,
    date: new Date('2025-12-15'),
    supplier: 'eMAG Marketplace',
    description: 'Laptop Dell Latitude 5540',
    amount: 4250,
    type: 'Factura',
    operator: 'Andrei',
    status: 'Final',
  },
  {
    id: 2,
    date: new Date('2025-12-10'),
    supplier: 'Orange Romania',
    description: 'Abonament telefonie decembrie',
    amount: 890,
    type: 'Factura',
    operator: 'Maria',
    status: 'Final',
  },
  {
    id: 3,
    date: new Date('2025-12-08'),
    supplier: 'Kaufland Romania',
    description: 'Produse curatenie birou',
    amount: 234.50,
    type: 'Bon fiscal',
    operator: 'Sanda',
    status: 'Draft',
  },
  {
    id: 4,
    date: new Date('2025-10-05'),
    supplier: 'Construct & Renovate SRL',
    description: 'Renovare spatiu lucru - Etaj 1',
    amount: 27000,
    type: 'Factura',
    operator: 'Otilia',
    status: 'Recurent',
  },
  {
    id: 5,
    date: new Date('2025-12-01'),
    supplier: 'Contabilitate Expert SRL',
    description: 'Servicii contabilitate noiembrie',
    amount: 1500,
    type: 'Factura',
    operator: 'Andrei',
    status: 'Final',
  },
];

export function MobileView({ onNewExpense, onEditExpense, onBackToDesktop }: MobileViewProps) {
  const [showFiltersPopup, setShowFiltersPopup] = useState(false);
  const [filterCategorie, setFilterCategorie] = useState('');
  const [filterCont, setFilterCont] = useState('');
  const [filterData, setFilterData] = useState<Date | null>(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPlata, setFilterPlata] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  const formatAmount = (amount: number) => {
    return amount.toLocaleString('ro-RO', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('ro-RO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).format(date);
  };

  const getStatusBadge = (status: 'Final' | 'Draft' | 'Recurent') => {
    if (status === 'Final') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs" style={{ 
          backgroundColor: '#D4F4DD', 
          color: '#0D7C2D',
          fontSize: '11px',
          fontWeight: 500
        }}>
          Final
        </span>
      );
    } else if (status === 'Draft') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs" style={{ 
          backgroundColor: '#FFF4E6', 
          color: '#B8860B',
          fontSize: '11px',
          fontWeight: 500
        }}>
          Draft
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs" style={{ 
          backgroundColor: '#FFE5E5', 
          color: '#D32F2F',
          fontSize: '11px',
          fontWeight: 500
        }}>
          Recurent
        </span>
      );
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F8F8]" style={{ maxWidth: '430px', margin: '0 auto' }}>
      {/* Overlay for filters */}
      {showFiltersPopup && (
        <div 
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[15]" 
          onClick={() => setShowFiltersPopup(false)}
        />
      )}

      {/* Mobile Header */}
      <div className="bg-white/80 backdrop-blur-xl border-b border-[#EEEEEE] sticky top-0 z-20">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            {onBackToDesktop && (
              <button 
                onClick={onBackToDesktop}
                className="w-8 h-8 rounded-full bg-white/70 backdrop-blur-xl border border-gray-200/50 flex items-center justify-center active:scale-95 transition-all shadow-[0_2px_8px_rgba(0,0,0,0.04)] mr-3"
              >
                <X size={18} className="text-gray-600" />
              </button>
            )}
            <h1 className="text-[#1A1A1A] flex-1" style={{ fontSize: '24px', fontWeight: 600 }}>
              Deconturi
            </h1>
            <button className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/70 backdrop-blur-xl border border-gray-200/50 active:scale-95 transition-all shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
              <User size={16} className="text-gray-600" />
              <span className="text-gray-700" style={{ fontSize: '13px', fontWeight: 500 }}>Account</span>
            </button>
          </div>
          
          {/* Search and Filter Row */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Caută furnizor..."
                className="w-full h-11 pl-10 pr-4 bg-white/70 backdrop-blur-xl border border-gray-200/50 rounded-2xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-300 transition-all shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
                style={{ fontSize: '14px', fontWeight: 400 }}
              />
            </div>
            <button
              onClick={() => setShowFiltersPopup(!showFiltersPopup)}
              className="flex-shrink-0 flex items-center gap-2 px-4 h-11 rounded-2xl bg-white/70 backdrop-blur-xl border border-gray-200/50 active:scale-95 transition-all shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
            >
              <SlidersHorizontal size={18} className="text-gray-600" />
              <span className="text-gray-700" style={{ fontSize: '14px', fontWeight: 500 }}>Filtre</span>
            </button>
          </div>

          {/* Filters Popup */}
          {showFiltersPopup && (
            <>
              {/* Filters Panel */}
              <div className="mt-3 bg-white/90 backdrop-blur-xl rounded-2xl p-4 border border-gray-200/50 shadow-[0_8px_24px_rgba(0,0,0,0.12)] space-y-3 relative z-[25]">
                {/* Categorie */}
                <div className="relative">
                  <select
                    value={filterCategorie}
                    onChange={(e) => setFilterCategorie(e.target.value)}
                    className="w-full h-12 px-4 pr-10 bg-white/70 backdrop-blur-xl border border-gray-200/50 rounded-2xl text-gray-900 appearance-none focus:outline-none focus:border-gray-300"
                    style={{ fontSize: '16px', fontWeight: 400, color: filterCategorie ? '#1A1A1A' : '#9CA3AF' }}
                  >
                    <option value="" disabled hidden>Categorie</option>
                    <option value="Cheltuieli generale">Cheltuieli generale</option>
                    <option value="Marketing">Marketing</option>
                    <option value="IT & Software">IT & Software</option>
                    <option value="Salarii">Salarii</option>
                  </select>
                  <ChevronDown size={18} className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>

                {/* Cont */}
                <div className="relative">
                  <select
                    value={filterCont}
                    onChange={(e) => setFilterCont(e.target.value)}
                    className="w-full h-12 px-4 pr-10 bg-white/70 backdrop-blur-xl border border-gray-200/50 rounded-2xl text-gray-900 appearance-none focus:outline-none focus:border-gray-300"
                    style={{ fontSize: '16px', fontWeight: 400, color: filterCont ? '#1A1A1A' : '#9CA3AF' }}
                  >
                    <option value="" disabled hidden>Cont</option>
                    <option value="601 - Cheltuieli cu materiale">601 - Cheltuieli cu materiale</option>
                    <option value="611 - Cheltuieli cu întreținerea">611 - Cheltuieli cu întreținerea</option>
                    <option value="628 - Alte cheltuieli">628 - Alte cheltuieli</option>
                  </select>
                  <ChevronDown size={18} className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>

                {/* Data */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Data"
                    value={filterData ? formatDate(filterData) : ''}
                    className="w-full h-12 px-4 pr-10 bg-white/70 backdrop-blur-xl border border-gray-200/50 rounded-2xl placeholder-gray-400 focus:outline-none focus:border-gray-300 cursor-pointer"
                    style={{ fontSize: '16px', fontWeight: 400, color: filterData ? '#1A1A1A' : '#9CA3AF' }}
                    readOnly
                    onClick={() => setShowDatePicker(!showDatePicker)}
                  />
                  <Calendar size={18} className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
                  {showDatePicker && (
                    <>
                      <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setShowDatePicker(false)}
                      />
                      <div className="absolute top-full left-0 right-0 mt-2 bg-white/95 backdrop-blur-xl rounded-2xl p-4 border border-gray-200/50 shadow-[0_8px_24px_rgba(0,0,0,0.12)] z-50">
                        <input
                          type="date"
                          value={filterData ? filterData.toISOString().split('T')[0] : ''}
                          className="w-full h-10 px-3 bg-white/70 backdrop-blur-xl border border-gray-200/50 rounded-xl text-gray-900 focus:outline-none focus:border-gray-300"
                          style={{ fontSize: '14px', fontWeight: 400 }}
                          onChange={(e) => {
                            const selectedDate = e.target.value;
                            setFilterData(selectedDate ? new Date(selectedDate) : null);
                            setShowDatePicker(false);
                          }}
                        />
                      </div>
                    </>
                  )}
                </div>

                {/* Status */}
                <div className="relative">
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full h-12 px-4 pr-10 bg-white/70 backdrop-blur-xl border border-gray-200/50 rounded-2xl text-gray-900 appearance-none focus:outline-none focus:border-gray-300"
                    style={{ fontSize: '16px', fontWeight: 400, color: filterStatus ? '#1A1A1A' : '#9CA3AF' }}
                  >
                    <option value="" disabled hidden>Status</option>
                    <option value="Final">Final</option>
                    <option value="Draft">Draft</option>
                    <option value="Recurent">Recurent</option>
                  </select>
                  <ChevronDown size={18} className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>

                {/* Plata */}
                <div className="relative">
                  <select
                    value={filterPlata}
                    onChange={(e) => setFilterPlata(e.target.value)}
                    className="w-full h-12 px-4 pr-10 bg-white/70 backdrop-blur-xl border border-gray-200/50 rounded-2xl text-gray-900 appearance-none focus:outline-none focus:border-gray-300"
                    style={{ fontSize: '16px', fontWeight: 400, color: filterPlata ? '#1A1A1A' : '#9CA3AF' }}
                  >
                    <option value="" disabled hidden>Plata</option>
                    <option value="Platit">Platit</option>
                    <option value="Neplatit">Neplatit</option>
                  </select>
                  <ChevronDown size={18} className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>

                {/* Aplica Button */}
                <button
                  onClick={() => {
                    setShowFiltersPopup(false);
                    // Apply filters logic here
                  }}
                  className="w-full h-12 bg-gradient-to-br from-teal-400 to-teal-500 text-white rounded-2xl active:scale-95 transition-all shadow-[0_4px_12px_rgba(20,184,166,0.3)]"
                  style={{ fontSize: '16px', fontWeight: 600 }}
                >
                  Aplică
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Expenses List */}
      <div className="px-4 py-4 space-y-3 pb-24">
        {mockExpenses.map((expense) => (
          <div
            key={expense.id}
            className="bg-white/80 backdrop-blur-xl rounded-2xl p-4 border border-white/60 shadow-[0_2px_12px_rgba(0,0,0,0.04)]"
          >
            {/* Header row */}
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 min-w-0 mr-3">
                <div className="text-[#1A1A1A] truncate" style={{ fontSize: '15px', fontWeight: 600, marginBottom: '2px' }}>
                  {expense.supplier}
                </div>
                <div className="text-[#7A7A7A] text-sm" style={{ fontSize: '13px', fontWeight: 400 }}>
                  {expense.description}
                </div>
              </div>
              <div className="flex-shrink-0">
                {getStatusBadge(expense.status)}
              </div>
            </div>

            {/* Amount */}
            <div className="text-[#1A1A1A] mb-3" style={{ fontSize: '20px', fontWeight: 700 }}>
              {formatAmount(expense.amount)} <span className="text-[#7A7A7A]" style={{ fontSize: '14px', fontWeight: 400 }}>EUR</span>
            </div>

            {/* Meta info */}
            <div className="flex items-center gap-4 text-[#999999]" style={{ fontSize: '12px', fontWeight: 400 }}>
              <div className="flex items-center gap-1.5">
                <Calendar size={12} />
                <span>{formatDate(expense.date)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <FileText size={12} />
                <span>{expense.type}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Building2 size={12} />
                <span>{expense.operator}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Floating Action Button */}
      <div className="fixed bottom-6 left-0 right-0 flex justify-center" style={{ maxWidth: '430px', margin: '0 auto' }}>
        <button
          onClick={onNewExpense}
          className="bg-gradient-to-br from-teal-400 to-teal-500 text-white rounded-full px-6 py-4 shadow-[0_8px_24px_rgba(20,184,166,0.35)] active:scale-95 transition-all flex items-center gap-2"
          style={{ fontSize: '16px', fontWeight: 600 }}
        >
          <Plus size={20} strokeWidth={2.5} />
          Decont nou
        </button>
      </div>
    </div>
  );
}