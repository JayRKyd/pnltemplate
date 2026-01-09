// @ts-nocheck
import { useState } from 'react';
import { ChevronDown, Calendar, Search, CheckCircle2, ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, X, Hourglass, Check } from 'lucide-react';
import { formatAmount } from '../utils/formatters';
import { FormattedAmount } from './formattedamount';

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

interface RecurringExpense {
  id: number;
  supplier: string;
  description: string;
  amount: number;
  createdDate: Date;
  category: string;
  subcategory: string;
  status: 'Activ' | 'Inactiv';
  months: {
    dec: boolean;
    nov: boolean;
    oct: boolean;
    sep: boolean;
    aug: boolean;
    jul: boolean;
  };
}

const expenses: Expense[] = [
  {
    id: 1,
    date: new Date('2025-03-15'),
    supplier: 'Expert Conta SRL',
    description: 'Servicii contabilitate - Trimestrul 1',
    amount: 1270,
    type: 'Factura',
    operator: 'Octav',
    status: 'Final',
  },
  {
    id: 2,
    date: new Date('2025-11-20'),
    supplier: 'OpenAI OpCo LLC',
    description: 'API Credits - ChatGPT & GPT-4',
    amount: 320,
    type: 'Factura',
    operator: 'Otilia',
    status: 'Draft',
  },
  {
    id: 3,
    date: new Date('2025-11-18'),
    supplier: 'IKEA Business Romania',
    description: 'Mobilier birou - 4 birouri ergonomice',
    amount: 4899,
    type: 'Factura',
    operator: 'Otilia',
    status: 'Final',
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
    date: new Date('2025-11-25'),
    supplier: 'Adobe Systems Software',
    description: 'Creative Cloud All Apps - 15 users',
    amount: 1259,
    type: 'Factura',
    operator: 'Sanda',
    status: 'Final',
  },
  {
    id: 6,
    date: new Date('2025-11-22'),
    supplier: 'Trattoria Il Calcio',
    description: 'Team building lunch - 22 persoane',
    amount: 1450,
    type: 'Bon',
    operator: 'Chris',
    status: 'Draft',
  },
  {
    id: 7,
    date: new Date('2025-10-18'),
    supplier: 'Office Depot Romania',
    description: 'Materiale birou & papetarie',
    amount: 840,
    type: 'Factura',
    operator: 'Ralu',
    status: 'Final',
  },
  {
    id: 8,
    date: new Date('2025-10-12'),
    supplier: 'Google Ireland Limited',
    description: 'Google Workspace Business - 50 users',
    amount: 3850,
    type: 'Factura',
    operator: 'BGN',
    status: 'Final',
  },
  {
    id: 9,
    date: new Date('2025-09-30'),
    supplier: 'Fan Courier SA',
    description: 'Servicii curierat septembrie',
    amount: 678,
    type: 'Factura',
    operator: 'Sanda',
    status: 'Recurent',
  },
  {
    id: 10,
    date: new Date('2025-09-15'),
    supplier: 'Starbucks Romania',
    description: 'Intalniri cu clienti & catering',
    amount: 445,
    type: 'Bon',
    operator: 'Chris',
    status: 'Final',
  },
  {
    id: 11,
    date: new Date('2025-08-28'),
    supplier: 'Zoom Video Communications',
    description: 'Zoom Business - 20 host licenses',
    amount: 1890,
    type: 'Factura',
    operator: 'Ralu',
    status: 'Final',
  },
  {
    id: 12,
    date: new Date('2025-08-10'),
    supplier: 'OMV Petrom SA',
    description: 'Combustibil auto - card flotă',
    amount: 1520,
    type: 'Bon',
    operator: 'BGN',
    status: 'Draft',
  },
];

const recurringExpenses: RecurringExpense[] = [
  {
    id: 1,
    supplier: 'Adobe Systems Software',
    description: 'Creative Cloud All Apps - 15 users',
    amount: 1259,
    createdDate: new Date('2025-01-15'),
    category: '3. IT',
    subcategory: '3.2 Software licenses',
    status: 'Activ',
    months: {
      dec: true,
      nov: true,
      oct: true,
      sep: true,
      aug: true,
      jul: true,
    },
  },
  {
    id: 2,
    supplier: 'Slack Technologies LLC',
    description: 'Slack Business+ - 45 users',
    amount: 1750,
    createdDate: new Date('2025-02-01'),
    category: '3. IT',
    subcategory: '3.2 Software licenses',
    status: 'Activ',
    months: {
      dec: true,
      nov: true,
      oct: true,
      sep: true,
      aug: true,
      jul: true,
    },
  },
  {
    id: 3,
    supplier: 'Google Ireland Limited',
    description: 'Google Workspace Business - 50 users',
    amount: 3850,
    createdDate: new Date('2024-08-10'),
    category: '3. IT',
    subcategory: '3.2 Software licenses',
    status: 'Activ',
    months: {
      dec: true,
      nov: true,
      oct: true,
      sep: true,
      aug: false,
      jul: false,
    },
  },
  {
    id: 4,
    supplier: 'Zoom Video Communications',
    description: 'Zoom Business - 20 host licenses',
    amount: 1890,
    createdDate: new Date('2024-07-20'),
    category: '3. IT',
    subcategory: '3.2 Software licenses',
    status: 'Inactiv',
    months: {
      dec: true,
      nov: true,
      oct: false,
      sep: true,
      aug: true,
      jul: true,
    },
  },
  {
    id: 5,
    supplier: 'AWS Europe SARL',
    description: 'Cloud hosting & storage infrastructure',
    amount: 2200,
    createdDate: new Date('2024-06-05'),
    category: '3. IT',
    subcategory: '3.1 Cloud hosting',
    status: 'Activ',
    months: {
      dec: true,
      nov: false,
      oct: true,
      sep: true,
      aug: true,
      jul: true,
    },
  },
];

// Mock supplier list for search
const allSuppliers = [
  'Expert Conta SRL',
  'OpenAI OpCo LLC',
  'IKEA Business Romania',
  'Construct & Renovate SRL',
  'Adobe Systems Software',
  'Google Ireland Limited',
  'Microsoft Ireland Ltd',
  'Slack Technologies LLC',
  'AWS Europe SARL',
  'DigitalOcean LLC',
  'Zoom Video Communications',
  'Atlassian Corporation',
  'GitHub Inc',
  'Notion Labs Inc',
  'Trattoria Il Calcio',
  'Office Depot Romania',
  'Fan Courier SA',
  'Starbucks Romania',
  'OMV Petrom SA',
  'Carrefour Romania SA',
];

// Categories from P&L Statement
const categories = [
  '1. Echipa',
  '2. Marketing',
  '3. IT',
  '4. Sediu',
  '5. Servicii',
  '6. Altele'
];

// Subcategories (accounts) grouped by category
const accountsByCategory: { [key: string]: string[] } = {
  '1. Echipa': ['1.1 Salarii', '1.2 Bonusuri', '1.3 Training', '1.4 Team events'],
  '2. Marketing': ['2.1 Social media ads', '2.2 Google ads', '2.3 Fee agentie'],
  '3. IT': ['3.1 Cloud hosting', '3.2 Software licenses'],
  '4. Sediu': ['4.1 Chirie', '4.2 Utilitati', '4.3 Investitii amenajare', '4.4 Altele'],
  '5. Servicii': ['5.1 Recurutare', '5.2 Contabilitate', '5.3 Avocati', '5.4 Altele'],
  '6. Altele': ['6.1 Asigurari', '6.2 Taxe si impozite']
};

// All accounts for dropdown
const accounts = Object.values(accountsByCategory).flat();

// Format date as dd.mmm.yy (ex: 15.mar.25)
const formatDate = (date: Date) => {
  const months = ['ian', 'feb', 'mar', 'apr', 'mai', 'iun', 'iul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  const day = date.getDate().toString().padStart(2, '0');
  const month = months[date.getMonth()];
  const year = date.getFullYear().toString().slice(-2);
  return `${day}.${month}.${year}`;
};

interface RecurringExpenseData {
  supplier: string;
  description: string;
  amount: number;
  month: string;
}

export function ExpenseTable({ onEditExpense, onNewExpense, onCreateFromRecurring, onEditRecurringTemplate, onEditCompletedRecurring }: { 
  onEditExpense: (expense: Expense) => void; 
  onNewExpense: (isRecurring: boolean) => void;
  onCreateFromRecurring: (data: RecurringExpenseData) => void;
  onEditRecurringTemplate: (expense: RecurringExpense) => void;
  onEditCompletedRecurring: (expense: RecurringExpense, month: string) => void;
}) {
  const [activeTab, setActiveTab] = useState<'expenses' | 'recurring'>('expenses');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedStartDate, setSelectedStartDate] = useState<Date | null>(null);
  const [selectedEndDate, setSelectedEndDate] = useState<Date | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [supplierSearch, setSupplierSearch] = useState('');
  const [showSupplierResults, setShowSupplierResults] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showAccountDropdown, setShowAccountDropdown] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [searchPlaceholder, setSearchPlaceholder] = useState('Cauta dupa companie sau coleg');
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<'Activ' | 'Inactiv' | null>('Activ');
  const [showExpenseStatusDropdown, setShowExpenseStatusDropdown] = useState(false);
  const [selectedExpenseStatus, setSelectedExpenseStatus] = useState<'Final' | 'Draft' | 'Recurent' | 'Status'>('Status');
  const [showPaymentStatusDropdown, setShowPaymentStatusDropdown] = useState(false);
  const [selectedPaymentStatuses, setSelectedPaymentStatuses] = useState<('Platit' | 'Neplatit')[]>(['Platit', 'Neplatit']);
  const [showPaymentConfirm, setShowPaymentConfirm] = useState(false);
  const [paymentConfirmExpense, setPaymentConfirmExpense] = useState<Expense | null>(null);
  const [expenseData, setExpenseData] = useState<Expense[]>(expenses);

  // Handle payment status toggle
  const handlePaymentStatusClick = (expense: Expense) => {
    setPaymentConfirmExpense(expense);
    setShowPaymentConfirm(true);
  };

  const confirmPaymentStatusChange = () => {
    if (paymentConfirmExpense) {
      // Toggle payment status (using id % 2 logic as proxy)
      setExpenseData(expenseData.map(exp => 
        exp.id === paymentConfirmExpense.id 
          ? { ...exp, id: exp.id % 2 === 0 ? exp.id + 1000 : exp.id - 1000 } // Simple toggle hack
          : exp
      ));
    }
    setShowPaymentConfirm(false);
    setPaymentConfirmExpense(null);
  };

  const cancelPaymentConfirm = () => {
    setShowPaymentConfirm(false);
    setPaymentConfirmExpense(null);
  };

  // Get filtered accounts based on selected category
  const getFilteredAccounts = () => {
    if (selectedCategory && accountsByCategory[selectedCategory]) {
      return accountsByCategory[selectedCategory];
    }
    return accounts; // Show all accounts if no category selected
  };

  // Handle category selection
  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
    setShowCategoryDropdown(false);
    // Reset account if it doesn't belong to the new category
    if (selectedAccount && selectedCategory !== category) {
      const categoryAccounts = accountsByCategory[category] || [];
      if (!categoryAccounts.includes(selectedAccount)) {
        setSelectedAccount(null);
      }
    }
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      // Cycle through: desc -> asc -> null (reset)
      if (sortDirection === 'desc') {
        setSortDirection('asc');
      } else {
        setSortColumn(null);
        setSortDirection('desc');
      }
    } else {
      // First click: set column and descending
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  // Calendar helper functions
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    return { daysInMonth, firstDayOfMonth };
  };

  const handleDateClick = (day: number) => {
    const clickedDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    
    if (!selectedStartDate || (selectedStartDate && selectedEndDate)) {
      setSelectedStartDate(clickedDate);
      setSelectedEndDate(null);
    } else if (clickedDate >= selectedStartDate) {
      setSelectedEndDate(clickedDate);
    } else {
      setSelectedEndDate(selectedStartDate);
      setSelectedStartDate(clickedDate);
    }
  };

  const isDateInRange = (day: number) => {
    if (!selectedStartDate) return false;
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    if (!selectedEndDate) {
      return date.getTime() === selectedStartDate.getTime();
    }
    return date >= selectedStartDate && date <= selectedEndDate;
  };

  const isDateStart = (day: number) => {
    if (!selectedStartDate) return false;
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    return date.getTime() === selectedStartDate.getTime();
  };

  const isDateEnd = (day: number) => {
    if (!selectedEndDate) return false;
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    return date.getTime() === selectedEndDate.getTime();
  };

  const monthNames = ['Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie', 'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie'];
  const dayNames = ['Dum', 'Lun', 'Mar', 'Mie', 'Joi', 'Vin', 'Sâm'];

  return (
    <div className="px-4 md:px-8 py-4 md:py-6">
      {/* Tabs */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mb-6 md:mb-8">
        {/* Tabs - Hidden on Mobile */}
        <div className="hidden md:inline-flex bg-white/70 backdrop-blur-xl rounded-full p-1.5 shadow-lg border border-gray-200/50 w-full md:w-auto">
          <button
            onClick={() => setActiveTab('expenses')}
            className={`flex-1 md:flex-initial px-6 md:px-8 py-2.5 rounded-full transition-all duration-200 flex items-center justify-center gap-2 ${
              activeTab === 'expenses'
                ? 'bg-gray-200/80 text-gray-900 shadow-[0_4px_20px_rgba(0,0,0,0.08)]'
                : 'bg-transparent text-gray-500 hover:text-gray-900'
            }`}
            style={{ fontWeight: activeTab === 'expenses' ? 600 : 500 }}
          >
            {activeTab === 'expenses' && (
              <span className="bg-white rounded-full p-0.5 flex items-center justify-center">
                <Check size={12} className="text-gray-900" />
              </span>
            )}
            Cheltuieli
          </button>
          <button
            onClick={() => setActiveTab('recurring')}
            className={`flex-1 md:flex-initial px-6 md:px-8 py-2.5 rounded-full transition-all duration-200 flex items-center justify-center gap-2 ${
              activeTab === 'recurring'
                ? 'bg-gray-200/80 text-gray-900 shadow-[0_4px_20px_rgba(0,0,0,0.08)]'
                : 'bg-transparent text-gray-500 hover:text-gray-900'
            }`}
            style={{ fontWeight: activeTab === 'recurring' ? 600 : 500 }}
          >
            {activeTab === 'recurring' && (
              <span className="bg-white rounded-full p-0.5 flex items-center justify-center">
                <Check size={12} className="text-gray-900" />
              </span>
            )}
            Recurente
          </button>
        </div>
        
        {/* Decont Nou Button - Now visible on Mobile and Desktop */}
        <button 
          onClick={() => onNewExpense(activeTab === 'recurring')}
          className="flex px-8 py-2 bg-gradient-to-br from-emerald-400 to-blue-400 text-white rounded-full shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.98] items-center justify-center gap-2 w-full md:w-auto transition-all duration-150 ease-in"
          style={{ fontSize: '0.9375rem', fontWeight: 300 }}
        >
          {activeTab === 'recurring' ? 'Recurent Nou +' : 'Decont Nou +'}
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 md:gap-4 mb-6">
        {/* Filters - Left */}
        <div className="relative">
          <button 
            onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
            className={`flex items-center gap-2 px-6 py-2 border border-gray-300/50 rounded-full bg-white/70 backdrop-blur-xl transition-all shadow-[0_4px_16px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.1)] hover:-translate-y-0.5 ${
              showCategoryDropdown ? 'border-gray-400' : ''
            } ${
              selectedCategory ? 'text-gray-900' : 'text-gray-400 hover:text-gray-900'
            }`}
            style={{ fontSize: '0.9375rem', fontWeight: 400 }}
          >
            <span className="hidden sm:inline">
              {selectedCategory ? selectedCategory : 'Categorie'}
            </span>
            <span className="sm:hidden">
              {selectedCategory ? selectedCategory : 'Cat'}
            </span>
            <ChevronDown size={16} />
          </button>
          
          {/* Category Dropdown */}
          {showCategoryDropdown && (
            <>
              {/* Backdrop */}
              <div 
                className="fixed inset-0 z-40"
                onClick={() => setShowCategoryDropdown(false)}
              />
              
              {/* Dropdown List */}
              <div className="absolute left-0 top-[calc(100%+8px)] w-48 bg-white/80 backdrop-blur-3xl rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.15)] border border-white/60 overflow-hidden z-50">
                {categories.map((category, index) => (
                  <button
                    key={category}
                    onClick={() => handleCategorySelect(category)}
                    className={`w-full px-4 py-3 text-left text-gray-700 hover:bg-white/70 transition-colors ${
                      index !== categories.length - 1 ? 'border-b border-gray-200/40' : ''
                    } ${selectedCategory === category ? 'bg-white/50' : ''}`}
                    style={{ fontSize: '0.9375rem', fontWeight: 400 }}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        
        <div className="relative">
          <button 
            onClick={() => {
              if (selectedCategory) {
                setShowAccountDropdown(!showAccountDropdown);
              }
            }}
            disabled={!selectedCategory}
            className={`flex items-center gap-2 px-6 py-2 border border-gray-300/50 rounded-full bg-white/70 backdrop-blur-xl transition-all shadow-[0_4px_16px_rgba(0,0,0,0.06)] ${
              selectedCategory ? 'hover:shadow-[0_8px_24px_rgba(0,0,0,0.1)] hover:-translate-y-0.5 cursor-pointer' : 'opacity-40 cursor-not-allowed'
            } ${
              showAccountDropdown ? 'border-gray-400' : ''
            } ${
              selectedAccount ? 'text-gray-900' : 'text-gray-400 hover:text-gray-900'
            }`}
            style={{ fontSize: '0.9375rem', fontWeight: 400 }}
          >
            <span className="hidden sm:inline">
              {selectedAccount ? selectedAccount : 'Cont'}
            </span>
            <span className="sm:hidden">
              {selectedAccount ? selectedAccount : 'Acc'}
            </span>
            <ChevronDown size={16} />
          </button>
          
          {/* Account Dropdown */}
          {showAccountDropdown && selectedCategory && (
            <>
              {/* Backdrop */}
              <div 
                className="fixed inset-0 z-40"
                onClick={() => setShowAccountDropdown(false)}
              />
              
              {/* Dropdown List */}
              <div className="absolute left-0 top-[calc(100%+8px)] w-48 bg-white/80 backdrop-blur-3xl rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.15)] border border-white/60 overflow-hidden z-50">
                {getFilteredAccounts().map((account, index) => (
                  <button
                    key={account}
                    onClick={() => {
                      setSelectedAccount(account);
                      setShowAccountDropdown(false);
                    }}
                    className={`w-full px-4 py-3 text-left text-gray-700 hover:bg-white/70 transition-colors ${
                      index !== getFilteredAccounts().length - 1 ? 'border-b border-gray-200/40' : ''
                    } ${selectedAccount === account ? 'bg-white/50' : ''}`}
                    style={{ fontSize: '0.9375rem', fontWeight: 400 }}
                  >
                    {account}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        
        {/* Active/Inactive filter for Recurring tab */}
        {activeTab === 'recurring' && (
          <div className="relative">
            <button 
              onClick={() => setShowStatusDropdown(!showStatusDropdown)}
              className={`flex items-center gap-2 px-6 py-2 border border-gray-300/50 rounded-full bg-white/70 backdrop-blur-xl transition-all shadow-[0_4px_16px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.1)] hover:-translate-y-0.5 ${
                showStatusDropdown ? 'border-gray-400' : ''
              } ${
                selectedStatus ? 'text-gray-900' : 'text-gray-400 hover:text-gray-900'
              }`}
              style={{ fontSize: '0.9375rem', fontWeight: 400 }}
            >
              <span>
                {selectedStatus ? selectedStatus : 'Status'}
              </span>
              <ChevronDown size={16} />
            </button>
            
            {/* Status Dropdown */}
            {showStatusDropdown && (
              <>
                {/* Backdrop */}
                <div 
                  className="fixed inset-0 z-40"
                  onClick={() => setShowStatusDropdown(false)}
                />
                
                {/* Dropdown List */}
                <div className="absolute left-0 top-[calc(100%+8px)] w-[108px] bg-white/80 backdrop-blur-3xl rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.15)] border border-white/60 overflow-hidden z-50">
                  {['Activ', 'Inactiv'].map((status, index) => (
                    <button
                      key={status}
                      onClick={() => {
                        setSelectedStatus(status as 'Activ' | 'Inactiv');
                        setShowStatusDropdown(false);
                      }}
                      className={`w-full px-4 py-3 text-left text-gray-700 hover:bg-white/70 transition-colors flex items-center justify-between ${
                        index !== 1 ? 'border-b border-gray-200/40' : ''
                      } ${selectedStatus === status ? 'bg-white/50' : ''}`}
                      style={{ fontSize: '0.9375rem', fontWeight: 400 }}
                    >
                      <span>{status}</span>
                      {selectedStatus === status && (
                        <Check size={16} className="text-gray-900" />
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
        
        {/* Date filter for Expenses tab only */}
        {activeTab === 'expenses' && (
          <div className="relative">
            <button 
              onClick={() => setShowDatePicker(!showDatePicker)}
              className={`flex items-center gap-2 px-6 py-2 border border-gray-300/50 rounded-full bg-white/70 backdrop-blur-xl transition-all shadow-[0_4px_16px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.1)] hover:-translate-y-0.5 ${
                showDatePicker ? 'border-gray-400' : ''
              } ${
                selectedStartDate ? 'text-gray-900' : 'text-gray-400 hover:text-gray-900'
              }`}
              style={{ fontSize: '0.9375rem', fontWeight: 400 }}
            >
              <span className="hidden sm:inline">
                {selectedStartDate && selectedEndDate 
                  ? `${selectedStartDate.getDate().toString().padStart(2, '0')} ${monthNames[selectedStartDate.getMonth()].substring(0, 3).toLowerCase()} ${selectedStartDate.getFullYear().toString().slice(-2)} - ${selectedEndDate.getDate().toString().padStart(2, '0')} ${monthNames[selectedEndDate.getMonth()].substring(0, 3).toLowerCase()} ${selectedEndDate.getFullYear().toString().slice(-2)}` 
                  : selectedStartDate 
                    ? `${selectedStartDate.getDate().toString().padStart(2, '0')} ${monthNames[selectedStartDate.getMonth()].substring(0, 3).toLowerCase()} ${selectedStartDate.getFullYear().toString().slice(-2)}` 
                    : 'Data'
                }
              </span>
              <span className="sm:hidden">
                {selectedStartDate && selectedEndDate 
                  ? `${selectedStartDate.getDate().toString().padStart(2, '0')}.${monthNames[selectedStartDate.getMonth()].substring(0, 3).toLowerCase()}.${selectedStartDate.getFullYear().toString().slice(-2)} - ${selectedEndDate.getDate().toString().padStart(2, '0')}.${monthNames[selectedEndDate.getMonth()].substring(0, 3).toLowerCase()}.${selectedEndDate.getFullYear().toString().slice(-2)}` 
                  : selectedStartDate 
                    ? `${selectedStartDate.getDate().toString().padStart(2, '0')}.${monthNames[selectedStartDate.getMonth()].substring(0, 3).toLowerCase()}.${selectedStartDate.getFullYear().toString().slice(-2)}` 
                    : 'Data'
                }
              </span>
              <Calendar size={16} />
            </button>
          </div>
        )}
        
        {/* Status filter for Expenses tab only */}
        {activeTab === 'expenses' && (
          <div className="relative">
            <button 
              onClick={() => setShowExpenseStatusDropdown(!showExpenseStatusDropdown)}
              className={`flex items-center gap-2 px-6 py-2 border border-gray-300/50 rounded-full bg-white/70 backdrop-blur-xl transition-all shadow-[0_4px_16px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.1)] hover:-translate-y-0.5 ${
                showExpenseStatusDropdown ? 'border-gray-400' : ''
              } ${
                selectedExpenseStatus !== 'Status' ? 'text-gray-900' : 'text-gray-400 hover:text-gray-900'
              }`}
              style={{ fontSize: '0.9375rem', fontWeight: 400 }}
            >
              {selectedExpenseStatus}
              <ChevronDown size={16} />
            </button>
            
            {showExpenseStatusDropdown && (
              <>
                <div 
                  className="fixed inset-0 z-30" 
                  onClick={() => setShowExpenseStatusDropdown(false)}
                />
                <div className="absolute left-0 top-[calc(100%+8px)] w-48 bg-white/80 backdrop-blur-3xl rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.15)] border border-white/60 overflow-hidden z-40">
                  {['Status', 'Final', 'Draft', 'Recurent'].map((status) => (
                    <button
                      key={status}
                      onClick={() => {
                        setSelectedExpenseStatus(status as 'Final' | 'Draft' | 'Recurent' | 'Status');
                        setShowExpenseStatusDropdown(false);
                      }}
                      className={`w-full px-4 py-3 text-left hover:bg-white/70 transition-colors ${
                        selectedExpenseStatus === status ? 'bg-teal-50/70' : ''
                      }`}
                      style={{ fontSize: '0.9375rem', fontWeight: 350 }}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
        
        {/* Payment filter for Expenses tab only */}
        {activeTab === 'expenses' && (
          <div className="relative">
            <button 
              onClick={() => setShowPaymentStatusDropdown(!showPaymentStatusDropdown)}
              className={`flex items-center gap-2 px-6 py-2 border border-gray-300/50 rounded-full bg-white/70 backdrop-blur-xl transition-all shadow-[0_4px_16px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.1)] hover:-translate-y-0.5 ${
                showPaymentStatusDropdown ? 'border-gray-400' : ''
              } ${
                selectedPaymentStatuses.length < 2 ? 'text-gray-900' : 'text-gray-400 hover:text-gray-900'
              }`}
              style={{ fontSize: '0.9375rem', fontWeight: 400 }}
            >
              {selectedPaymentStatuses.length === 2 
                ? 'Plata' 
                : selectedPaymentStatuses.length === 1 
                  ? selectedPaymentStatuses[0] 
                  : 'Plata'}
              <ChevronDown size={16} />
            </button>
            
            {showPaymentStatusDropdown && (
              <>
                <div 
                  className="fixed inset-0 z-30" 
                  onClick={() => setShowPaymentStatusDropdown(false)}
                />
                <div className="absolute left-0 top-[calc(100%+8px)] w-[140px] bg-white/80 backdrop-blur-3xl rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.15)] border border-white/60 overflow-hidden z-40">
                  {['Platit', 'Neplatit'].map((status, index) => (
                    <button
                      key={status}
                      onClick={(e) => {
                        e.stopPropagation();
                        const typedStatus = status as 'Platit' | 'Neplatit';
                        if (selectedPaymentStatuses.includes(typedStatus)) {
                          if (selectedPaymentStatuses.length > 1) {
                            setSelectedPaymentStatuses(selectedPaymentStatuses.filter(s => s !== typedStatus));
                          }
                        } else {
                          setSelectedPaymentStatuses([...selectedPaymentStatuses, typedStatus]);
                        }
                      }}
                      className={`w-full px-4 py-3 text-left hover:bg-white/70 transition-colors flex items-center justify-between ${
                        index !== 1 ? 'border-b border-gray-200/40' : ''
                      }`}
                      style={{ fontSize: '0.9375rem', fontWeight: 350 }}
                    >
                      <span>{status}</span>
                      {selectedPaymentStatuses.includes(status as 'Platit' | 'Neplatit') && (
                        <Check size={16} className="text-gray-900" />
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
        
        {/* Spacer */}
        <div className="hidden md:flex md:flex-1"></div>
        
        {/* Search Field - Right */}
        <div 
          className="relative w-full md:w-auto md:ml-auto group"
        >
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 z-10 pointer-events-none" size={20} />
          <input
            type="text"
            placeholder="Furnizor, coleg sau tag"
            className="w-full md:w-[281px] pl-10 pr-4 py-2 border border-gray-300/50 bg-white/70 backdrop-blur-xl rounded-full text-gray-600 placeholder-gray-400 focus:outline-none focus:border-gray-400 transition-all duration-300 shadow-[0_4px_16px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.1)] focus:shadow-[0_8px_24px_rgba(0,0,0,0.1)] relative z-0"
            style={{ fontSize: '0.9375rem', fontWeight: 200 }}
            value={supplierSearch}
            onChange={(e) => {
              setSupplierSearch(e.target.value);
              setShowSupplierResults(e.target.value.length >= 3);
            }}
            onBlur={() => {
              setTimeout(() => setShowSupplierResults(false), 200);
            }}
          />
          {showSupplierResults && supplierSearch.length >= 3 && (
            <div className="absolute left-0 top-[calc(100%+8px)] w-full bg-white/80 backdrop-blur-3xl rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.15)] border border-white/60 overflow-hidden z-20 max-h-[300px] overflow-y-auto">
              {allSuppliers
                .filter(supplier => supplier.toLowerCase().includes(supplierSearch.toLowerCase()))
                .map((supplier, index, filtered) => (
                  <div
                    key={supplier}
                    className={`px-4 py-3 text-gray-700 hover:bg-white/70 cursor-pointer transition-colors ${
                      index !== filtered.length - 1 ? 'border-b border-gray-200/40' : ''
                    }`}
                    style={{ fontSize: '0.9375rem', fontWeight: 350 }}
                    onClick={() => {
                      setSupplierSearch(supplier);
                      setShowSupplierResults(false);
                    }}
                  >
                    {supplier}
                  </div>
                ))}
              {allSuppliers.filter(supplier => supplier.toLowerCase().includes(supplierSearch.toLowerCase())).length === 0 && (
                <div className="px-4 py-3 text-gray-500 text-center" style={{ fontSize: '0.9375rem', fontWeight: 350 }}>
                  No results found
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Date Picker Modal */}
      {showDatePicker && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/30 backdrop-blur-md z-40 transition-all duration-300"
            onClick={() => setShowDatePicker(false)}
          />
          
          {/* Calendar Popup */}
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 w-[380px]">
            <div className="bg-white/90 backdrop-blur-3xl rounded-[32px] shadow-[0_24px_80px_rgba(0,0,0,0.2),0_8px_24px_rgba(0,0,0,0.12)] border border-white/80 p-8 animate-in">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-gray-900" style={{ fontSize: '1.125rem', fontWeight: 600, letterSpacing: '-0.02em' }}>Select Date Range</h3>
                <button 
                  onClick={() => setShowDatePicker(false)}
                  className="p-2 hover:bg-white/80 rounded-full transition-all duration-200 hover:scale-110 active:scale-95"
                >
                  <X size={18} className="text-gray-500" />
                </button>
              </div>

              {/* Month Navigation */}
              <div className="flex items-center justify-between mb-6">
                <button
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                  className="p-2.5 bg-gradient-to-br from-white/80 to-gray-50/60 hover:from-white hover:to-teal-50/40 rounded-2xl transition-all duration-200 hover:scale-105 active:scale-95 shadow-[0_2px_8px_rgba(0,0,0,0.06)] border border-white/60"
                >
                  <ChevronLeft size={18} className="text-gray-700" />
                </button>
                <div className="px-5 py-2 bg-gradient-to-br from-teal-500/10 to-teal-600/10 rounded-2xl border border-teal-200/30">
                  <span className="text-gray-900" style={{ fontSize: '0.9375rem', fontWeight: 600, letterSpacing: '-0.01em' }}>
                    {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                  </span>
                </div>
                <button
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                  className="p-2.5 bg-gradient-to-br from-white/80 to-gray-50/60 hover:from-white hover:to-teal-50/40 rounded-2xl transition-all duration-200 hover:scale-105 active:scale-95 shadow-[0_2px_8px_rgba(0,0,0,0.06)] border border-white/60"
                >
                  <ChevronRight size={18} className="text-gray-700" />
                </button>
              </div>

              {/* Day Names */}
              <div className="grid grid-cols-7 gap-1.5 mb-3">
                {dayNames.map(day => (
                  <div key={day} className="text-center text-gray-500" style={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.05em', paddingTop: '8px', paddingBottom: '8px' }}>
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1.5">
                {Array.from({ length: getDaysInMonth(currentMonth).firstDayOfMonth }).map((_, index) => (
                  <div key={`empty-${index}`} className="aspect-square" />
                ))}
                {Array.from({ length: getDaysInMonth(currentMonth).daysInMonth }).map((_, index) => {
                  const day = index + 1;
                  const inRange = isDateInRange(day);
                  const isStart = isDateStart(day);
                  const isEnd = isDateEnd(day);
                  
                  return (
                    <button
                      key={day}
                      onClick={() => handleDateClick(day)}
                      className={`aspect-square rounded-2xl flex items-center justify-center transition-all duration-200 ${
                        isStart || isEnd
                          ? 'bg-gradient-to-br from-teal-500 to-teal-600 text-white shadow-[0_4px_16px_rgba(20,184,166,0.4)] hover:shadow-[0_6px_20px_rgba(20,184,166,0.5)] scale-105 hover:scale-110'
                          : inRange
                          ? 'bg-gradient-to-br from-teal-50/80 to-teal-50/60 text-gray-900 border border-teal-200/30'
                          : 'text-gray-700 hover:bg-white/90 hover:shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:scale-105 hover:border hover:border-gray-200/40'
                      } active:scale-95`}
                      style={{ fontSize: '0.8125rem', fontWeight: isStart || isEnd ? 600 : 500 }}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200/50">
                <div style={{ fontSize: '0.8125rem', fontWeight: 500 }} className="text-gray-600">
                  {selectedStartDate && selectedEndDate ? (
                    <span>
                      {selectedStartDate.toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', year: '2-digit' }).replace(/ /g, '.')} - {selectedEndDate.toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', year: '2-digit' }).replace(/ /g, '.')}
                    </span>
                  ) : selectedStartDate ? (
                    <span>Select end date</span>
                  ) : (
                    <span>Select start date</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setSelectedStartDate(null);
                      setSelectedEndDate(null);
                    }}
                    className="px-4 py-2 text-xs text-gray-600 hover:text-gray-900 hover:bg-white/70 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95"
                    style={{ fontWeight: 500 }}
                  >
                    Clear
                  </button>
                  <button
                    onClick={() => setShowDatePicker(false)}
                    className="px-5 py-2 text-xs bg-gradient-to-br from-teal-500 to-teal-600 text-white rounded-xl hover:from-teal-600 hover:to-teal-700 transition-all duration-200 shadow-[0_4px_16px_rgba(20,184,166,0.3)] hover:shadow-[0_6px_20px_rgba(20,184,166,0.4)] hover:scale-105 active:scale-95"
                    style={{ fontWeight: 600 }}
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Tables */}
      <div className="space-y-2">
        {activeTab === 'expenses' ? (
          (() => {
            // Filter expenses by date range
            let filteredExpenses = expenseData.filter(expense => {
              // Date filter
              if (selectedStartDate && selectedEndDate) {
                const expenseDate = expense.date;
                return expenseDate >= selectedStartDate && expenseDate <= selectedEndDate;
              } else if (selectedStartDate) {
                return expense.date >= selectedStartDate;
              }
              return true;
            });

            // Filter by status
            if (selectedExpenseStatus !== 'Status') {
              filteredExpenses = filteredExpenses.filter(expense => expense.status === selectedExpenseStatus);
            }

            // Filter by payment status
            if (selectedPaymentStatuses.length < 2) {
              filteredExpenses = filteredExpenses.filter(expense => {
                const isPaid = expense.id % 2 === 0;
                if (selectedPaymentStatuses.includes('Platit')) {
                  return isPaid;
                } else {
                  return !isPaid;
                }
              });
            }

            // Filter by supplier search
            if (supplierSearch.trim()) {
              filteredExpenses = filteredExpenses.filter(expense => 
                expense.supplier.toLowerCase().includes(supplierSearch.toLowerCase()) ||
                expense.operator.toLowerCase().includes(supplierSearch.toLowerCase())
              );
            }

            // Sort expenses
            if (sortColumn) {
              filteredExpenses = [...filteredExpenses].sort((a, b) => {
                let aValue: any = a[sortColumn as keyof Expense];
                let bValue: any = b[sortColumn as keyof Expense];

                if (sortColumn === 'date') {
                  aValue = new Date(aValue).getTime();
                  bValue = new Date(bValue).getTime();
                } else if (sortColumn === 'amount') {
                  aValue = Number(aValue);
                  bValue = Number(bValue);
                } else if (typeof aValue === 'string') {
                  aValue = aValue.toLowerCase();
                  bValue = bValue.toLowerCase();
                }

                if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
                return 0;
              });
            }

            return (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block bg-white/70 backdrop-blur-xl rounded-2xl border border-gray-200/50 overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200/50" style={{ background: 'linear-gradient(90deg, rgba(240, 253, 250, 0.8), rgba(204, 251, 241, 0.8))' }}>
                    <th className="text-center px-6 text-gray-600" style={{ fontSize: '0.9375rem', fontWeight: 500, letterSpacing: '0.05em', paddingTop: '8px', paddingBottom: '8px' }}>
                      STATUS
                    </th>
                    <th className="text-left px-6 text-gray-600" style={{ fontSize: '0.9375rem', fontWeight: 500, letterSpacing: '0.05em', paddingTop: '8px', paddingBottom: '8px' }}>
                      DATA
                    </th>
                    <th className="text-left px-6 text-gray-600" style={{ fontSize: '0.9375rem', fontWeight: 500, letterSpacing: '0.05em', paddingTop: '8px', paddingBottom: '8px' }}>
                      TIP
                    </th>
                    <th className="text-left px-6 text-gray-600" style={{ fontSize: '0.9375rem', fontWeight: 500, letterSpacing: '0.05em', paddingTop: '8px', paddingBottom: '8px' }}>
                      FURNIZOR
                    </th>
                    <th className="text-left px-6 text-gray-600" style={{ fontSize: '0.9375rem', fontWeight: 500, letterSpacing: '0.05em', paddingTop: '8px', paddingBottom: '8px' }}>
                      DESCRIERE
                    </th>
                    <th className="text-center px-6 text-gray-600" style={{ fontSize: '0.9375rem', fontWeight: 500, letterSpacing: '0.05em', paddingTop: '8px', paddingBottom: '8px' }}>
                      <div className="flex flex-col items-center leading-tight">
                        <span>SUMA</span>
                        <span className="whitespace-nowrap">fara TVA</span>
                      </div>
                    </th>
                    <th className="text-center px-6 text-gray-600" style={{ fontSize: '0.9375rem', fontWeight: 500, letterSpacing: '0.05em', paddingTop: '8px', paddingBottom: '8px' }}>
                      PLATA
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExpenses.map((expense, index) => (
                    <tr 
                      key={expense.id}
                      onClick={() => onEditExpense(expense)}
                      className={`group border-b border-gray-200/30 hover:bg-teal-50/75 transition-colors cursor-pointer ${
                        index === filteredExpenses.length - 1 ? 'border-b-0' : ''
                      }`}
                    >
                      <td className="px-6 text-center" style={{ paddingTop: '8px', paddingBottom: '8px' }}>
                        <span
                          className={`inline-flex items-center justify-center px-3 py-1.5 w-24 border ${
                            expense.status === 'Final'
                              ? 'border-emerald-200/30'
                              : expense.status === 'Draft'
                              ? 'border-yellow-200/30'
                              : 'border-pink-200/30'
                          }`}
                          style={{ 
                            fontSize: '0.75rem', 
                            fontWeight: 250, 
                            color: '#475569', 
                            boxShadow: '0px 4px 10px rgba(0, 0, 0, 0.05)',
                            borderRadius: '999px',
                            background: expense.status === 'Final'
                              ? 'radial-gradient(circle at 30% 30%, #A8F0CE, #4EC9A2)'
                              : expense.status === 'Draft'
                              ? 'radial-gradient(circle at 30% 30%, #FFF7C4, #FFD16F)'
                              : 'radial-gradient(circle at 30% 30%, #FFE0EE, #FFB3D9)'
                          }}
                        >
                          {expense.status}
                        </span>
                      </td>
                      <td className="px-6" style={{ paddingTop: '8px', paddingBottom: '8px' }}>
                        <span className="text-gray-900" style={{ fontSize: '0.875rem', fontWeight: 400 }}>
                          {formatDate(expense.date)}
                        </span>
                      </td>
                      <td className="px-6" style={{ paddingTop: '8px', paddingBottom: '8px' }}>
                        <span className="text-gray-700" style={{ fontSize: '0.875rem', fontWeight: 400 }}>
                          {expense.type}
                        </span>
                      </td>
                      <td className="px-6" style={{ paddingTop: '8px', paddingBottom: '8px' }}>
                        <span className="text-gray-900" style={{ fontSize: '0.875rem', fontWeight: 400 }}>
                          {expense.supplier}
                        </span>
                      </td>
                      <td className="px-6" style={{ paddingTop: '8px', paddingBottom: '8px' }}>
                        <span className="text-gray-700" style={{ fontSize: '0.875rem', fontWeight: 400 }}>
                          {expense.description}
                        </span>
                      </td>
                      <td className="px-6 text-center" style={{ paddingTop: '8px', paddingBottom: '8px' }}>
                        <FormattedAmount value={expense.amount} fontSize="0.875rem" fontWeight={400} />
                      </td>
                      <td className="px-6 text-center" style={{ paddingTop: '8px', paddingBottom: '8px' }}>
                        <div className="flex items-center justify-center">
                          {expense.id % 2 === 0 ? (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePaymentStatusClick(expense);
                              }}
                              className="w-8 h-8 rounded-full bg-emerald-50/80 border border-emerald-200/50 flex items-center justify-center hover:scale-110 hover:shadow-md transition-all cursor-pointer"
                            >
                              <CheckCircle2 size={18} className="text-gray-700" strokeWidth={2} />
                            </button>
                          ) : (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePaymentStatusClick(expense);
                              }}
                              className="w-8 h-8 rounded-full bg-rose-50/80 border border-rose-200/50 flex items-center justify-center hover:scale-110 hover:shadow-md transition-all cursor-pointer"
                            >
                              <Hourglass size={18} className="text-gray-700" strokeWidth={2} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-3">
              {filteredExpenses.map((expense) => (
                <div 
                  key={expense.id}
                  onClick={() => onEditExpense(expense)}
                  className="group bg-white/70 backdrop-blur-xl rounded-2xl p-4 shadow-[0_4px_16px_rgba(0,0,0,0.06)] active:shadow-[0_8px_24px_rgba(0,0,0,0.1)] active:scale-[0.98] transition-all border border-gray-200/30 cursor-pointer"
                >
                  {/* Header Row */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-gray-500" style={{ fontSize: '0.75rem', fontWeight: 400 }}>
                          {formatDate(expense.date)}
                        </span>
                        <span className="text-gray-400">•</span>
                        <span className="text-gray-500" style={{ fontSize: '0.75rem', fontWeight: 400 }}>
                          {expense.type}
                        </span>
                      </div>
                      <div className="text-gray-900 mb-1" style={{ fontSize: '0.9375rem', fontWeight: 500 }}>
                        {expense.supplier}
                      </div>
                      <div className="text-gray-600" style={{ fontSize: '0.8125rem', fontWeight: 350 }}>
                        {expense.description}
                      </div>
                    </div>
                  </div>

                  {/* Amount and Status Row */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-200/40">
                    <div className="text-gray-900" style={{ fontSize: '1.0625rem', fontWeight: 600 }}>
                      <FormattedAmount value={expense.amount} fontSize="1.0625rem" fontWeight={600} />
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center justify-center px-3 py-1.5 rounded-full border text-gray-700 w-24 ${
                          expense.status === 'Final'
                            ? 'bg-emerald-50/80 border-emerald-200/50'
                            : expense.status === 'Draft'
                            ? 'bg-amber-50/80 border-amber-200/50'
                            : 'bg-rose-50/80 border-rose-200/50'
                        }`}
                        style={{ fontSize: '0.8125rem', fontWeight: 500 }}
                      >
                        {expense.status}
                      </span>
                      {expense.id % 2 === 0 ? (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePaymentStatusClick(expense);
                          }}
                          className="w-8 h-8 rounded-full bg-emerald-50/80 border border-emerald-200/50 flex items-center justify-center hover:scale-110 hover:shadow-md transition-all cursor-pointer"
                        >
                          <CheckCircle2 size={18} className="text-gray-700" strokeWidth={2} />
                        </button>
                      ) : (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePaymentStatusClick(expense);
                          }}
                          className="w-8 h-8 rounded-full bg-rose-50/80 border border-rose-200/50 flex items-center justify-center hover:scale-110 hover:shadow-md transition-all cursor-pointer"
                        >
                          <Hourglass size={18} className="text-gray-700" strokeWidth={2} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
            );
          })()
        ) : (
          <>
            {/* Recurring Expenses Table */}
            <div className="hidden md:block bg-white/70 backdrop-blur-xl rounded-2xl border border-gray-200/50 overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200/50" style={{ background: 'linear-gradient(90deg, rgba(240, 253, 250, 0.8), rgba(204, 251, 241, 0.8))' }}>
                    <th className="text-left px-6 py-4 text-gray-600" style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em' }}>
                      FURNIZOR
                    </th>
                    <th className="text-left px-6 py-4 text-gray-600" style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em' }}>
                      DESCRIERE
                    </th>
                    <th className="text-left px-6 py-4 text-gray-600" style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em' }}>
                      CATEGORIE
                    </th>
                    <th className="text-left px-6 py-4 text-gray-600" style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em' }}>
                      SUBCATEGORIE
                    </th>
                    <th className="text-center px-6 py-4 text-gray-600" style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em' }}>
                      RON
                    </th>
                    <th className="text-center px-3 py-4 text-gray-600" style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em' }}>
                      JUL
                    </th>
                    <th className="text-center px-3 py-4 text-gray-600" style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em' }}>
                      AUG
                    </th>
                    <th className="text-center px-3 py-4 text-gray-600" style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em' }}>
                      SEP
                    </th>
                    <th className="text-center px-3 py-4 text-gray-600" style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em' }}>
                      OCT
                    </th>
                    <th className="text-center px-3 py-4 text-gray-600" style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em' }}>
                      NOV
                    </th>
                    <th className="text-center px-3 py-4 text-gray-600" style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em' }}>
                      DEC
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recurringExpenses.map((expense, index) => (
                    <tr 
                      key={expense.id}
                      className={`border-b border-gray-200/30 hover:bg-teal-50/75 transition-colors ${
                        index === recurringExpenses.length - 1 ? 'border-b-0' : ''
                      }`}
                    >
                      <td 
                        className="px-6 py-4 cursor-pointer hover:text-teal-600 transition-colors"
                        onClick={() => onEditRecurringTemplate(expense)}
                      >
                        <span className="text-gray-900" style={{ fontSize: '0.9375rem', fontWeight: 500 }}>
                          {expense.supplier}
                        </span>
                      </td>
                      <td 
                        className="px-6 py-4 cursor-pointer hover:text-teal-600 transition-colors"
                        onClick={() => onEditRecurringTemplate(expense)}
                      >
                        <span className="text-gray-700" style={{ fontSize: '0.875rem', fontWeight: 400 }}>
                          {expense.description}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-gray-700" style={{ fontSize: '0.875rem', fontWeight: 400 }}>
                          {expense.category}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-gray-700" style={{ fontSize: '0.875rem', fontWeight: 400 }}>
                          {expense.subcategory}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <FormattedAmount value={expense.amount} fontSize="0.9375rem" fontWeight={500} />
                      </td>
                      <td className="px-3 py-4 text-center">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            if (expense.months.jul) {
                              onEditCompletedRecurring(expense, 'iulie 2025');
                            } else {
                              onCreateFromRecurring({
                                supplier: expense.supplier,
                                description: expense.description,
                                amount: expense.amount,
                                month: 'iulie 2025'
                              });
                            }
                          }}
                          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                            expense.months.jul 
                              ? 'bg-emerald-100/80 hover:bg-emerald-200/80' 
                              : 'bg-rose-100/80 hover:bg-rose-200/80'
                          }`}
                        >
                          {expense.months.jul ? (
                            <Check size={14} className="text-gray-700" />
                          ) : (
                            <X size={14} className="text-gray-700" />
                          )}
                        </button>
                      </td>
                      <td className="px-3 py-4 text-center">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            if (expense.months.aug) {
                              onEditCompletedRecurring(expense, 'august 2025');
                            } else {
                              onCreateFromRecurring({
                                supplier: expense.supplier,
                                description: expense.description,
                                amount: expense.amount,
                                month: 'august 2025'
                              });
                            }
                          }}
                          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                            expense.months.aug 
                              ? 'bg-emerald-100/80 hover:bg-emerald-200/80' 
                              : 'bg-rose-100/80 hover:bg-rose-200/80'
                          }`}
                        >
                          {expense.months.aug ? (
                            <Check size={14} className="text-gray-700" />
                          ) : (
                            <X size={14} className="text-gray-700" />
                          )}
                        </button>
                      </td>
                      <td className="px-3 py-4 text-center">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            if (expense.months.sep) {
                              onEditCompletedRecurring(expense, 'septembrie 2025');
                            } else {
                              onCreateFromRecurring({
                                supplier: expense.supplier,
                                description: expense.description,
                                amount: expense.amount,
                                month: 'septembrie 2025'
                              });
                            }
                          }}
                          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                            expense.months.sep 
                              ? 'bg-emerald-100/80 hover:bg-emerald-200/80' 
                              : 'bg-rose-100/80 hover:bg-rose-200/80'
                          }`}
                        >
                          {expense.months.sep ? (
                            <Check size={14} className="text-gray-700" />
                          ) : (
                            <X size={14} className="text-gray-700" />
                          )}
                        </button>
                      </td>
                      <td className="px-3 py-4 text-center">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            if (expense.months.oct) {
                              onEditCompletedRecurring(expense, 'octombrie 2025');
                            } else {
                              onCreateFromRecurring({
                                supplier: expense.supplier,
                                description: expense.description,
                                amount: expense.amount,
                                month: 'octombrie 2025'
                              });
                            }
                          }}
                          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                            expense.months.oct 
                              ? 'bg-emerald-100/80 hover:bg-emerald-200/80' 
                              : 'bg-rose-100/80 hover:bg-rose-200/80'
                          }`}
                        >
                          {expense.months.oct ? (
                            <Check size={14} className="text-gray-700" />
                          ) : (
                            <X size={14} className="text-gray-700" />
                          )}
                        </button>
                      </td>
                      <td className="px-3 py-4 text-center">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            if (expense.months.nov) {
                              onEditCompletedRecurring(expense, 'noiembrie 2025');
                            } else {
                              onCreateFromRecurring({
                                supplier: expense.supplier,
                                description: expense.description,
                                amount: expense.amount,
                                month: 'noiembrie 2025'
                              });
                            }
                          }}
                          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                            expense.months.nov 
                              ? 'bg-emerald-100/80 hover:bg-emerald-200/80' 
                              : 'bg-rose-100/80 hover:bg-rose-200/80'
                          }`}
                        >
                          {expense.months.nov ? (
                            <Check size={14} className="text-gray-700" />
                          ) : (
                            <X size={14} className="text-gray-700" />
                          )}
                        </button>
                      </td>
                      <td className="px-3 py-4 text-center">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            if (expense.months.dec) {
                              onEditCompletedRecurring(expense, 'decembrie 2025');
                            } else {
                              onCreateFromRecurring({
                                supplier: expense.supplier,
                                description: expense.description,
                                amount: expense.amount,
                                month: 'decembrie 2025'
                              });
                            }
                          }}
                          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                            expense.months.dec 
                              ? 'bg-emerald-100/80 hover:bg-emerald-200/80' 
                              : 'bg-rose-100/80 hover:bg-rose-200/80'
                          }`}
                        >
                          {expense.months.dec ? (
                            <Check size={14} className="text-gray-700" />
                          ) : (
                            <X size={14} className="text-gray-700" />
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-3">
              {recurringExpenses.map((expense) => (
                <div 
                  key={expense.id}
                  className="bg-white/70 backdrop-blur-xl rounded-2xl p-4 shadow-[0_4px_16px_rgba(0,0,0,0.06)] active:shadow-[0_8px_24px_rgba(0,0,0,0.1)] active:scale-[0.98] transition-all border border-gray-200/30 cursor-pointer"
                >
                  {/* Header Row */}
                  <div className="flex items-start justify-between mb-3 pb-3 border-b border-gray-200/40">
                    <div>
                      <div className="text-gray-900 font-medium mb-1" style={{ fontSize: '0.9375rem', fontWeight: 500 }}>
                        {expense.supplier}
                      </div>
                      <div className="text-gray-600" style={{ fontSize: '0.8125rem', fontWeight: 350 }}>
                        {expense.description}
                      </div>
                    </div>
                    <div className="text-gray-900 text-right ml-4" style={{ fontSize: '1.0625rem', fontWeight: 600 }}>
                      <FormattedAmount value={expense.amount} fontSize="1.0625rem" fontWeight={600} />
                    </div>
                  </div>

                  {/* Month Buttons Grid */}
                  <div className="grid grid-cols-6 gap-2">
                    {[
                      { key: 'jul', label: 'Jul' },
                      { key: 'aug', label: 'Aug' },
                      { key: 'sep', label: 'Sep' },
                      { key: 'oct', label: 'Oct' },
                      { key: 'nov', label: 'Nov' },
                      { key: 'dec', label: 'Dec' },
                    ].map(({ key, label }) => (
                      <div key={key} className="flex flex-col items-center gap-1">
                        <span className="text-gray-500 uppercase tracking-wide" style={{ fontSize: '0.6875rem', fontWeight: 500 }}>
                          {label}
                        </span>
                        <button className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                          expense.months[key as keyof typeof expense.months]
                            ? 'bg-emerald-100/80'
                            : 'bg-rose-100/80'
                        }`}>
                          {expense.months[key as keyof typeof expense.months] ? (
                            <Check size={14} className="text-gray-700" />
                          ) : (
                            <X size={14} className="text-gray-700" />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Payment Status Confirmation Popup */}
        {showPaymentConfirm && paymentConfirmExpense && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl max-w-md w-full p-8 border border-gray-200/50">
              <h3 className="text-gray-900 mb-4" style={{ fontSize: '1.25rem', fontWeight: 600 }}>
                Confirmă schimbarea statusului
              </h3>
              <p className="text-gray-700 mb-2" style={{ fontSize: '0.9375rem', fontWeight: 400 }}>
                Ești sigur că vrei să schimbi statusul de plată pentru:
              </p>
              <p className="text-gray-900 mb-6" style={{ fontSize: '1rem', fontWeight: 500 }}>
                {paymentConfirmExpense.supplier} - <FormattedAmount value={paymentConfirmExpense.amount} fontSize="1rem" fontWeight={500} />
              </p>
              <p className="text-gray-600 mb-8" style={{ fontSize: '0.875rem', fontWeight: 400 }}>
                Statusul va fi schimbat {paymentConfirmExpense.id % 2 === 0 ? 'din „Plătit" în „Neplătit"' : 'din „Neplătit" în „Plătit"'}.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={cancelPaymentConfirm}
                  className="flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-xl transition-all"
                  style={{ fontSize: '0.9375rem', fontWeight: 500 }}
                >
                  Anulează
                </button>
                <button
                  onClick={confirmPaymentStatusChange}
                  className="flex-1 px-6 py-3 bg-gradient-to-br from-emerald-400 to-blue-400 hover:from-emerald-500 hover:to-blue-500 text-white rounded-xl shadow-lg hover:shadow-xl transition-all"
                  style={{ fontSize: '0.9375rem', fontWeight: 500 }}
                >
                  Confirmă
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}