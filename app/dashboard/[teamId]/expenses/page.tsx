"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Check, Plus, Search, ChevronDown, ChevronLeft, ChevronRight, Calendar, X, Hourglass, ArrowUp, ArrowDown } from "lucide-react";
import { getTeamExpenses, TeamExpense, ExpenseFilters } from "@/app/actions/expenses";
import { formatAmount } from "@/lib/formatters";

type StatusType = 'Final' | 'Draft' | 'Recurent' | 'draft' | 'pending' | 'approved' | 'rejected' | 'paid';
type TabType = 'cheltuieli' | 'recurente';

// Mock data for recurring expenses
const mockRecurringExpenses = [
  { 
    id: 1, 
    furnizor: 'Adobe Systems Software', 
    descriere: 'Creative Cloud All Apps - 15 users', 
    suma: 1259.00,
    payments: { jul: true, aug: true, sep: true, oct: true, nov: true, dec: true }
  },
  { 
    id: 2, 
    furnizor: 'Slack Technologies LLC', 
    descriere: 'Slack Business+ - 45 users', 
    suma: 1750.00,
    payments: { jul: true, aug: true, sep: true, oct: true, nov: true, dec: true }
  },
  { 
    id: 3, 
    furnizor: 'Google Ireland Limited', 
    descriere: 'Google Workspace Business - 50 users', 
    suma: 3850.00,
    payments: { jul: false, aug: false, sep: true, oct: true, nov: true, dec: true }
  },
  { 
    id: 4, 
    furnizor: 'Zoom Video Communications', 
    descriere: 'Zoom Business - 20 host licenses', 
    suma: 1890.00,
    payments: { jul: true, aug: true, sep: true, oct: false, nov: true, dec: true }
  },
  { 
    id: 5, 
    furnizor: 'AWS Europe SARL', 
    descriere: 'Cloud hosting & storage infrastructure', 
    suma: 2200.00,
    payments: { jul: true, aug: true, sep: true, oct: true, nov: false, dec: true }
  },
];

interface FilterDropdownProps {
  label: string;
  icon?: React.ReactNode;
  options?: { value: string; label: string }[];
  value?: string;
  onChange?: (value: string) => void;
}

function FilterDropdown({ label, icon, options, value, onChange }: FilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (options && onChange) {
    return (
      <div className="relative">
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-full border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors bg-white"
        >
          {icon}
          <span>{value ? options.find(o => o.value === value)?.label || label : label}</span>
          <ChevronDown size={16} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <div className="absolute left-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50">
              {options.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    onChange(value === opt.value ? '' : opt.value);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors ${
                    value === opt.value ? 'text-[#11C6B6]' : 'text-gray-700'
                  }`}
                >
                  <span>{opt.label}</span>
                  {value === opt.value && (
                    <Check size={16} className="text-[#11C6B6]" />
                  )}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <button className="flex items-center gap-2 px-4 py-2.5 rounded-full border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors bg-white">
      {icon}
      <span>{label}</span>
      <ChevronDown size={16} className="text-gray-400" />
    </button>
  );
}

// Date Range Picker Modal
interface DateRangePickerProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (startDate: Date | null, endDate: Date | null) => void;
  startDate: Date | null;
  endDate: Date | null;
}

function DateRangePicker({ isOpen, onClose, onApply, startDate: initialStart, endDate: initialEnd }: DateRangePickerProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [startDate, setStartDate] = useState<Date | null>(initialStart);
  const [endDate, setEndDate] = useState<Date | null>(initialEnd);
  const [selectingStart, setSelectingStart] = useState(true);

  if (!isOpen) return null;

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();
    return { daysInMonth, startingDay };
  };

  const { daysInMonth, startingDay } = getDaysInMonth(currentMonth);

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const handleDayClick = (day: number) => {
    const selectedDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    
    if (selectingStart) {
      setStartDate(selectedDate);
      setEndDate(null);
      setSelectingStart(false);
    } else {
      if (startDate && selectedDate < startDate) {
        setStartDate(selectedDate);
        setEndDate(null);
      } else {
        setEndDate(selectedDate);
        setSelectingStart(true);
      }
    }
  };

  const isInRange = (day: number) => {
    if (!startDate || !endDate) return false;
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    return date > startDate && date < endDate;
  };

  const isSelected = (day: number) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    if (startDate && date.toDateString() === startDate.toDateString()) return true;
    if (endDate && date.toDateString() === endDate.toDateString()) return true;
    return false;
  };

  const handleClear = () => {
    setStartDate(null);
    setEndDate(null);
    setSelectingStart(true);
  };

  const handleApply = () => {
    onApply(startDate, endDate);
    onClose();
  };

  const days = [];
  for (let i = 0; i < startingDay; i++) {
    days.push(<div key={`empty-${i}`} className="w-9 h-9" />);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const selected = isSelected(day);
    const inRange = isInRange(day);
    days.push(
      <button
        key={day}
        onClick={() => handleDayClick(day)}
        className={`w-9 h-9 rounded-full text-sm font-medium transition-colors ${
          selected
            ? 'bg-[#11C6B6] text-white'
            : inRange
            ? 'bg-[#D1FAE5] text-gray-700'
            : 'text-gray-700 hover:bg-gray-100'
        }`}
      >
        {day}
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-[340px] mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Select Date Range</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center justify-between px-6 py-4">
          <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <ChevronLeft size={20} className="text-gray-600" />
          </button>
          <span className="text-base font-medium text-gray-900">
            {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </span>
          <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <ChevronRight size={20} className="text-gray-600" />
          </button>
        </div>

        {/* Calendar Grid */}
        <div className="px-6 pb-4">
          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="w-9 h-9 flex items-center justify-center text-xs font-medium text-gray-400">
                {day}
              </div>
            ))}
          </div>
          
          {/* Days */}
          <div className="grid grid-cols-7 gap-1">
            {days}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
          <span className="text-sm text-gray-500">
            {selectingStart ? 'Select start date' : 'Select end date'}
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={handleClear}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              Clear
            </button>
            <button
              onClick={handleApply}
              className="px-5 py-2 bg-[#11C6B6] hover:bg-[#0FB2A3] text-white text-sm font-medium rounded-full transition-colors"
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const normalizedStatus = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
  
  const styles: Record<string, string> = {
    Final: 'bg-[#BEF2E5] text-[#00695C]',
    Draft: 'bg-[#FDE68A] text-[#92400E]',
    Recurent: 'bg-[#FBCFE8] text-[#9D174D]',
    Pending: 'bg-[#FEF3C7] text-[#92400E]',
    Approved: 'bg-[#BEF2E5] text-[#00695C]',
    Rejected: 'bg-[#FEE2E2] text-[#991B1B]',
    Paid: 'bg-[#DBEAFE] text-[#1E40AF]',
  };

  const displayStatus = normalizedStatus === 'Approved' ? 'Final' : normalizedStatus;

  return (
    <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${styles[normalizedStatus] || styles.Draft}`}>
      {displayStatus}
    </span>
  );
}

function PaymentIcon({ paid }: { paid: boolean }) {
  if (paid) {
    return (
      <div className="w-7 h-7 rounded-full bg-[#D1FAE5] flex items-center justify-center border border-[#A7F3D0]">
        <Check size={14} className="text-[#059669]" />
      </div>
    );
  }
  return (
    <div className="w-7 h-7 rounded-full bg-[#FCE7F3] flex items-center justify-center border border-[#FBCFE8]">
      <Hourglass size={14} className="text-[#BE185D]" />
    </div>
  );
}

// Sort Icon Component
function SortIcon({ active, direction }: { active: boolean; direction: 'asc' | 'desc' }) {
  if (!active) {
    return (
      <div className="flex flex-col ml-1">
        <ArrowUp size={10} className="text-gray-300 -mb-0.5" />
        <ArrowDown size={10} className="text-gray-300" />
      </div>
    );
  }
  return direction === 'asc' ? (
    <ArrowUp size={12} className="text-[#11C6B6] ml-1" />
  ) : (
    <ArrowDown size={12} className="text-[#11C6B6] ml-1" />
  );
}

function MonthPaymentIcon({ paid }: { paid: boolean }) {
  if (paid) {
    return (
      <div className="w-7 h-7 rounded-full bg-[#D1FAE5] flex items-center justify-center">
        <Check size={14} className="text-[#059669]" />
      </div>
    );
  }
  return (
    <div className="w-7 h-7 rounded-full bg-[#FEE2E2] flex items-center justify-center">
      <X size={14} className="text-[#DC2626]" />
    </div>
  );
}

// Payment Status Confirmation Modal
interface PaymentStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  supplierName: string;
  amount: number;
  currentlyPaid: boolean;
}

function PaymentStatusModal({ isOpen, onClose, onConfirm, supplierName, amount, currentlyPaid }: PaymentStatusModalProps) {
  if (!isOpen) return null;

  const formatDisplayAmount = (amt: number) => {
    return amt.toLocaleString('ro-RO', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).replace('.', ',');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-[480px] mx-4 p-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Confirmă schimbarea statusului
        </h2>
        
        <p className="text-gray-600 mb-2">
          Ești sigur că vrei să schimbi statusul de plată pentru:
        </p>
        
        <p className="text-gray-900 font-semibold mb-4">
          {supplierName} - {formatDisplayAmount(amount)}
        </p>
        
        <p className="text-gray-500 text-sm mb-8">
          Statusul va fi schimbat din &ldquo;{currentlyPaid ? 'Plătit' : 'Neplătit'}&rdquo; în &ldquo;{currentlyPaid ? 'Neplătit' : 'Plătit'}&rdquo;.
        </p>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 border border-gray-200 rounded-full text-gray-700 font-medium hover:bg-gray-50 transition-colors"
          >
            Anulează
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-[#11C6B6] to-[#0E9F92] text-white rounded-full font-medium hover:from-[#0FB2A3] hover:to-[#0D9285] transition-all shadow-sm"
          >
            Confirmă
          </button>
        </div>
      </div>
    </div>
  );
}

const STATUS_OPTIONS = [
  { value: "", label: "Toate" },
  { value: "draft", label: "Draft" },
  { value: "pending", label: "In asteptare" },
  { value: "approved", label: "Aprobat" },
  { value: "rejected", label: "Respins" },
  { value: "paid", label: "Platit" },
];

const CATEGORY_OPTIONS = [
  { value: "echipa", label: "Echipa" },
  { value: "marketing", label: "Marketing" },
  { value: "it", label: "IT" },
  { value: "sediu", label: "Sediu" },
  { value: "servicii", label: "Servicii" },
  { value: "altele", label: "Altele" },
];

const CONT_OPTIONS = [
  { value: "salarii", label: "Salarii" },
  { value: "bonusuri", label: "Bonusuri" },
  { value: "training", label: "Training" },
  { value: "team-events", label: "Team events" },
];

export default function ExpensesPage() {
  const params = useParams<{ teamId: string }>();
  const router = useRouter();
  const [expenses, setExpenses] = useState<TeamExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('cheltuieli');
  const [currentPage, setCurrentPage] = useState(1);
  const [paymentModalData, setPaymentModalData] = useState<{
    isOpen: boolean;
    expenseId: string;
    supplierName: string;
    amount: number;
    currentlyPaid: boolean;
  } | null>(null);
  const itemsPerPage = 15;

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [contFilter, setContFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [selectedStartDate, setSelectedStartDate] = useState<Date | null>(null);
  const [selectedEndDate, setSelectedEndDate] = useState<Date | null>(null);

  // Sorting state
  type SortColumn = 'status' | 'expense_date' | 'doc_type' | 'supplier' | 'description' | 'amount' | 'payment_status';
  type SortDirection = 'asc' | 'desc';
  const [sortColumn, setSortColumn] = useState<SortColumn>('expense_date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const handleDateApply = (startDate: Date | null, endDate: Date | null) => {
    setSelectedStartDate(startDate);
    setSelectedEndDate(endDate);
    if (startDate) {
      setDateFrom(startDate.toISOString().split('T')[0]);
    } else {
      setDateFrom("");
    }
    if (endDate) {
      setDateTo(endDate.toISOString().split('T')[0]);
    } else {
      setDateTo("");
    }
  };

  const formatDateDisplay = () => {
    if (selectedStartDate && selectedEndDate) {
      const formatDate = (d: Date) => `${d.getDate()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getFullYear()).slice(-2)}`;
      return `${formatDate(selectedStartDate)} - ${formatDate(selectedEndDate)}`;
    }
    if (selectedStartDate) {
      const formatDate = (d: Date) => `${d.getDate()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getFullYear()).slice(-2)}`;
      return formatDate(selectedStartDate);
    }
    return "Data";
  };

  const loadExpenses = useCallback(async () => {
    if (!params.teamId) return;

    setLoading(true);
    try {
      const filters: ExpenseFilters = {};
      if (search) filters.search = search;
      if (statusFilter) filters.status = statusFilter;
      if (dateFrom) filters.dateFrom = dateFrom;
      if (dateTo) filters.dateTo = dateTo;

      const data = await getTeamExpenses(params.teamId, filters);
      setExpenses(data);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch expenses:", err);
      setError("Failed to load expenses");
    } finally {
      setLoading(false);
    }
  }, [params.teamId, search, statusFilter, dateFrom, dateTo]);

  useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);

  const formatDisplayAmount = (amount: number) => {
    return amount.toLocaleString('ro-RO', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).replace('.', ',');
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    const months = ['ian', 'feb', 'mar', 'apr', 'mai', 'iun', 'iul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const day = date.getDate().toString().padStart(2, '0');
    const month = months[date.getMonth()];
    const year = date.getFullYear().toString().slice(-2);
    return `${day}.${month}.${year}`;
  };

  // Sort expenses
  const sortedExpenses = [...expenses].sort((a, b) => {
    let aValue: string | number | null = null;
    let bValue: string | number | null = null;

    switch (sortColumn) {
      case 'status':
        aValue = a.status || '';
        bValue = b.status || '';
        break;
      case 'expense_date':
        aValue = a.expense_date || '';
        bValue = b.expense_date || '';
        break;
      case 'doc_type':
        aValue = a.doc_type || '';
        bValue = b.doc_type || '';
        break;
      case 'supplier':
        aValue = a.supplier || '';
        bValue = b.supplier || '';
        break;
      case 'description':
        aValue = a.description || '';
        bValue = b.description || '';
        break;
      case 'amount':
        aValue = a.amount || 0;
        bValue = b.amount || 0;
        break;
      case 'payment_status':
        aValue = a.payment_status || '';
        bValue = b.payment_status || '';
        break;
    }

    if (aValue === null || bValue === null) return 0;
    
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
    }
    
    const comparison = String(aValue).localeCompare(String(bValue));
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const totalItems = sortedExpenses.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const paginatedExpenses = sortedExpenses.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  return (
    <div className="p-6 md:p-8 space-y-6 bg-gray-50/30 min-h-screen">
      {/* Payment Status Confirmation Modal */}
      {paymentModalData && (
        <PaymentStatusModal
          isOpen={paymentModalData.isOpen}
          onClose={() => setPaymentModalData(null)}
          onConfirm={() => {
            // TODO: Update payment status in database
            console.log('Toggling payment status for expense:', paymentModalData.expenseId);
            setPaymentModalData(null);
            // Reload expenses to reflect change
            loadExpenses();
          }}
          supplierName={paymentModalData.supplierName}
          amount={paymentModalData.amount}
          currentlyPaid={paymentModalData.currentlyPaid}
        />
      )}

      {/* Date Range Picker Modal */}
      <DateRangePicker
        isOpen={datePickerOpen}
        onClose={() => setDatePickerOpen(false)}
        onApply={handleDateApply}
        startDate={selectedStartDate}
        endDate={selectedEndDate}
      />

      {/* Top Section - Tabs & New Button */}
      <div className="flex items-center justify-between">
        {/* Tab Switcher */}
        <div className="flex items-center bg-gray-100 rounded-full p-1">
          <button
            onClick={() => setActiveTab('cheltuieli')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-medium transition-all ${
              activeTab === 'cheltuieli'
                ? 'bg-[#11C6B6] text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {activeTab === 'cheltuieli' && <Check size={16} />}
            Cheltuieli
          </button>
          <button
            onClick={() => setActiveTab('recurente')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-medium transition-all ${
              activeTab === 'recurente'
                ? 'bg-[#11C6B6] text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {activeTab === 'recurente' && <Check size={16} />}
            Recurente
          </button>
        </div>

        {/* New Button */}
        <button 
          onClick={() => {
            if (activeTab === 'cheltuieli') {
              router.push(`/dashboard/${params.teamId}/expenses/new`);
            } else {
              router.push(`/dashboard/${params.teamId}/expenses/recurring/new`);
            }
          }}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#11C6B6] hover:bg-[#0FB2A3] text-white font-medium rounded-full transition-colors shadow-sm"
        >
          {activeTab === 'cheltuieli' ? 'Decont Nou' : 'Recurent Nou'}
          <Plus size={18} />
        </button>
      </div>

      {/* Filters Row */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <FilterDropdown 
            label="Categorie" 
            options={CATEGORY_OPTIONS}
            value={categoryFilter}
            onChange={setCategoryFilter}
          />
          <FilterDropdown 
            label="Cont" 
            options={CONT_OPTIONS}
            value={contFilter}
            onChange={setContFilter}
          />
          <button 
            onClick={() => setDatePickerOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors bg-white"
          >
            <Calendar size={16} className="text-gray-400" />
            <span>{formatDateDisplay()}</span>
          </button>
          {activeTab === 'cheltuieli' && (
            <>
              <FilterDropdown 
                label="Status" 
                options={STATUS_OPTIONS}
                value={statusFilter}
                onChange={setStatusFilter}
              />
              <FilterDropdown label="Plata" />
            </>
          )}
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={activeTab === 'cheltuieli' ? "Furnizor, coleg sau tag" : "Cauta dupa companie sau coleg"}
            className="w-72 pl-11 pr-4 py-2.5 rounded-full border border-gray-200 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 bg-white"
          />
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Cheltuieli Table */}
      {activeTab === 'cheltuieli' && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          {loading ? (
            <div className="p-12 text-center text-gray-500">Se incarca...</div>
          ) : paginatedExpenses.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-500 mb-4">Nu exista cheltuieli</p>
              <button
                onClick={() => router.push(`/dashboard/${params.teamId}/expenses/new`)}
                className="text-teal-600 hover:underline font-medium"
              >
                Creeaza prima cheltuiala
              </button>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100" style={{ backgroundColor: '#D1FAE5' }}>
                  <th 
                    onClick={() => handleSort('status')}
                    className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-[#A7F3D0]/30 transition-colors"
                  >
                    <div className="flex items-center">
                      Status
                      <SortIcon active={sortColumn === 'status'} direction={sortDirection} />
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('expense_date')}
                    className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-[#A7F3D0]/30 transition-colors"
                  >
                    <div className="flex items-center">
                      Data
                      <SortIcon active={sortColumn === 'expense_date'} direction={sortDirection} />
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('doc_type')}
                    className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-[#A7F3D0]/30 transition-colors"
                  >
                    <div className="flex items-center">
                      Tip
                      <SortIcon active={sortColumn === 'doc_type'} direction={sortDirection} />
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('supplier')}
                    className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-[#A7F3D0]/30 transition-colors"
                  >
                    <div className="flex items-center">
                      Furnizor
                      <SortIcon active={sortColumn === 'supplier'} direction={sortDirection} />
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('description')}
                    className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-[#A7F3D0]/30 transition-colors"
                  >
                    <div className="flex items-center">
                      Descriere
                      <SortIcon active={sortColumn === 'description'} direction={sortDirection} />
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('amount')}
                    className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-[#A7F3D0]/30 transition-colors"
                  >
                    <div className="flex flex-col items-end">
                      <div className="flex items-center">
                        <span>RON</span>
                        <SortIcon active={sortColumn === 'amount'} direction={sortDirection} />
                      </div>
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('payment_status')}
                    className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-[#A7F3D0]/30 transition-colors"
                  >
                    <div className="flex items-center justify-center">
                      Plata
                      <SortIcon active={sortColumn === 'payment_status'} direction={sortDirection} />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {paginatedExpenses.map((expense) => (
                  <tr 
                    key={expense.id} 
                    className="hover:bg-gray-50/50 transition-colors cursor-pointer"
                    onClick={() => router.push(`/dashboard/${params.teamId}/expenses/${expense.id}`)}
                  >
                    <td className="px-6 py-4">
                      <StatusBadge status={expense.status} />
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {formatDate(expense.expense_date)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {expense.doc_type || 'Factura'}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {expense.supplier || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-[250px] truncate">
                      {expense.description || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 text-right">
                      {formatDisplayAmount(expense.amount || 0)}
                    </td>
                    <td className="px-6 py-4">
                      <div 
                        className="flex justify-center"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPaymentModalData({
                            isOpen: true,
                            expenseId: expense.id,
                            supplierName: expense.supplier || 'Unknown',
                            amount: expense.amount || 0,
                            currentlyPaid: expense.status === 'paid',
                          });
                        }}
                      >
                        <button className="hover:scale-110 transition-transform">
                          <PaymentIcon paid={expense.status === 'paid'} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Recurente Table */}
      {activeTab === 'recurente' && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100" style={{ backgroundColor: '#D1FAE5' }}>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Furnizor
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Descriere
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  RON
                </th>
                <th className="px-4 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  JUL
                </th>
                <th className="px-4 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  AUG
                </th>
                <th className="px-4 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  SEP
                </th>
                <th className="px-4 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  OCT
                </th>
                <th className="px-4 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  NOV
                </th>
                <th className="px-4 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  DEC
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {mockRecurringExpenses.map((expense) => (
                <tr 
                  key={expense.id} 
                  className="hover:bg-gray-50/50 transition-colors cursor-pointer"
                >
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {expense.furnizor}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {expense.descriere}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900 text-right">
                    {formatDisplayAmount(expense.suma)}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex justify-center">
                      <MonthPaymentIcon paid={expense.payments.jul} />
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex justify-center">
                      <MonthPaymentIcon paid={expense.payments.aug} />
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex justify-center">
                      <MonthPaymentIcon paid={expense.payments.sep} />
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex justify-center">
                      <MonthPaymentIcon paid={expense.payments.oct} />
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex justify-center">
                      <MonthPaymentIcon paid={expense.payments.nov} />
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex justify-center">
                      <MonthPaymentIcon paid={expense.payments.dec} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {!loading && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            {activeTab === 'cheltuieli' 
              ? `Showing ${Math.min(itemsPerPage, paginatedExpenses.length)} of ${totalItems} results`
              : `Showing ${mockRecurringExpenses.length} of ${mockRecurringExpenses.length} results`
            }
          </p>

          {((activeTab === 'cheltuieli' && totalPages > 1) || activeTab === 'recurente') && (
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={20} className="text-gray-400" />
              </button>

              {(activeTab === 'cheltuieli' ? getPageNumbers() : [1]).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-10 h-10 rounded-full text-sm font-medium transition-colors ${
                    currentPage === page
                      ? 'bg-[#11C6B6] text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {page}
                </button>
              ))}

              <button 
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={activeTab === 'recurente' || currentPage === totalPages}
                className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={20} className="text-gray-400" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}







