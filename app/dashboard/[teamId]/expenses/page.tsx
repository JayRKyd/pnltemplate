"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Check, X, ChevronDown, Calendar } from "lucide-react";
import { getTeamExpenses, TeamExpense, ExpenseFilters } from "@/app/actions/expenses";
import { 
  getRecurringExpensesWithPayments, 
  RecurringExpenseWithPayments,
  updateRecurringPaymentStatus 
} from "@/app/actions/recurring-expenses";
import { getTeamCategories, ExpenseCategory } from "@/app/actions/categories";

type TabType = 'Cheltuieli' | 'Recurente';

// Mock data matching the Figma exactly
const mockTableData = [
  {
    status: 'Final' as const,
    date: '15.mar.25',
    type: 'Factura',
    provider: 'Expert Conta SRL',
    description: 'Servicii contabilitate - Trimestrul 1',
    amount: '1.270',
    decimals: '00',
    paid: false,
  },
  {
    status: 'Draft' as const,
    date: '20.nov.25',
    type: 'Factura',
    provider: 'OpenAI OpCo LLC',
    description: 'API Credits - ChatGPT & GPT-4',
    amount: '320',
    decimals: '00',
    paid: true,
  },
  {
    status: 'Final' as const,
    date: '18.nov.25',
    type: 'Factura',
    provider: 'IKEA Business Romania',
    description: 'Mobilier birou - 4 birouri ergonomice',
    amount: '4.899',
    decimals: '00',
    paid: false,
  },
  {
    status: 'Recurent' as const,
    date: '05.oct.25',
    type: 'Factura',
    provider: 'Construct & Renovate SRL',
    description: 'Renovare spatiu lucru - Etaj 1',
    amount: '27.000',
    decimals: '00',
    paid: true,
  },
  {
    status: 'Final' as const,
    date: '25.nov.25',
    type: 'Factura',
    provider: 'Adobe Systems Software',
    description: 'Creative Cloud All Apps - 15 users',
    amount: '1.259',
    decimals: '00',
    paid: false,
  },
  {
    status: 'Draft' as const,
    date: '22.nov.25',
    type: 'Bon',
    provider: 'Trattoria Il Calcio',
    description: 'Team building lunch - 22 persoane',
    amount: '1.450',
    decimals: '00',
    paid: true,
  },
  {
    status: 'Final' as const,
    date: '18.oct.25',
    type: 'Factura',
    provider: 'Office Depot Romania',
    description: 'Materiale birou & papetarie',
    amount: '840',
    decimals: '00',
    paid: false,
  },
  {
    status: 'Final' as const,
    date: '12.oct.25',
    type: 'Factura',
    provider: 'Google Ireland Limited',
    description: 'Google Workspace Business - 50 users',
    amount: '3.850',
    decimals: '00',
    paid: true,
  },
  {
    status: 'Recurent' as const,
    date: '30.sep.25',
    type: 'Factura',
    provider: 'Fan Courier SA',
    description: 'Servicii curierat septembrie',
    amount: '678',
    decimals: '00',
    paid: false,
  },
  {
    status: 'Final' as const,
    date: '15.sep.25',
    type: 'Bon',
    provider: 'Starbucks Romania',
    description: 'Intalniri cu clienti & catering',
    amount: '445',
    decimals: '00',
    paid: true,
  },
  {
    status: 'Final' as const,
    date: '28.aug.25',
    type: 'Factura',
    provider: 'Zoom Video Communications',
    description: 'Zoom Business - 20 host licenses',
    amount: '1.890',
    decimals: '00',
    paid: false,
  },
  {
    status: 'Draft' as const,
    date: '10.aug.25',
    type: 'Bon',
    provider: 'OMV Petrom SA',
    description: 'Combustibil auto - card flotă',
    amount: '1.520',
    decimals: '00',
    paid: true,
  },
  {
    status: 'Final' as const,
    date: '22.iul.25',
    type: 'Factura',
    provider: 'AWS Europe SARL',
    description: 'Cloud hosting & storage infrastructure',
    amount: '2.200',
    decimals: '00',
    paid: false,
  },
  {
    status: 'Final' as const,
    date: '05.iul.25',
    type: 'Chitanta',
    provider: 'Carrefour Romania SA',
    description: 'Materiale prezentari & conferinte',
    amount: '585',
    decimals: '00',
    paid: true,
  },
  {
    status: 'Final' as const,
    date: '18.iun.25',
    type: 'Factura',
    provider: 'Slack Technologies LLC',
    description: 'Slack Business+ - 45 users',
    amount: '1.750',
    decimals: '00',
    paid: false,
  },
];


const getStatusStyles = (status: string) => {
  switch (status) {
    case 'Final':
      return {
        background: 'linear-gradient(180deg, rgba(192, 245, 229, 1.00) 0%, rgba(122, 231, 201, 1.00) 100%)',
        borderColor: 'rgba(164, 244, 207, 0.3)'
      };
    case 'Draft':
      return {
        background: 'linear-gradient(180deg, rgba(255, 247, 196, 1.00) 0%, rgba(255, 209, 111, 1.00) 100%)',
        borderColor: 'rgba(255, 240, 133, 0.3)'
      };
    case 'Recurent':
      return {
        background: 'linear-gradient(180deg, rgba(255, 224, 238, 1.00) 0%, rgba(255, 179, 217, 1.00) 100%)',
        borderColor: 'rgba(252, 206, 232, 0.3)'
      };
    default:
      return {
        background: 'linear-gradient(180deg, rgba(192, 245, 229, 1.00) 0%, rgba(122, 231, 201, 1.00) 100%)',
        borderColor: 'rgba(164, 244, 207, 0.3)'
      };
  }
};

function PaymentIcon({ paid }: { paid: boolean }) {
  if (paid) {
    return (
      <div 
        style={{
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          backgroundColor: '#D1FAE5',
          border: '1px solid #A7F3D0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer'
        }}
      >
        <Check size={12} style={{ color: '#059669' }} />
      </div>
    );
  }
  return (
    <div 
      style={{
        width: '24px',
        height: '24px',
        borderRadius: '50%',
        backgroundColor: '#FCE7F3',
        border: '1px solid #FBCFE8',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer'
      }}
    >
      <X size={12} style={{ color: '#BE185D' }} />
    </div>
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
  amount: string;
  currentlyPaid: boolean;
}

function PaymentStatusModal({ isOpen, onClose, onConfirm, supplierName, amount, currentlyPaid }: PaymentStatusModalProps) {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 200,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div 
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
          backdropFilter: 'blur(4px)'
        }}
        onClick={onClose}
      />
      
      <div style={{
        position: 'relative',
        backgroundColor: 'white',
        borderRadius: '16px',
        boxShadow: '0px 25px 50px -12px rgba(0, 0, 0, 0.25)',
        width: '100%',
        maxWidth: '480px',
        margin: '16px',
        padding: '32px'
      }}>
        <h2 style={{
          fontSize: '20px',
          fontWeight: 600,
          color: 'rgba(16, 24, 40, 1)',
          marginBottom: '16px'
        }}>
          Confirmă schimbarea statusului
        </h2>
        
        <p style={{ color: 'rgba(107, 114, 128, 1)', marginBottom: '8px' }}>
          Ești sigur că vrei să schimbi statusul de plată pentru:
        </p>
        
        <p style={{
          color: 'rgba(16, 24, 40, 1)',
          fontWeight: 600,
          marginBottom: '16px'
        }}>
          {supplierName} - {amount} Lei
        </p>
        
        <p style={{
          color: 'rgba(107, 114, 128, 1)',
          fontSize: '14px',
          marginBottom: '32px'
        }}>
          Statusul va fi schimbat din &ldquo;{currentlyPaid ? 'Plătit' : 'Neplătit'}&rdquo; în &ldquo;{currentlyPaid ? 'Neplătit' : 'Plătit'}&rdquo;.
        </p>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '12px 24px',
              border: '1px solid rgba(229, 231, 235, 1)',
              borderRadius: '9999px',
              color: 'rgba(55, 65, 81, 1)',
              fontWeight: 500,
              backgroundColor: 'white',
              cursor: 'pointer'
            }}
          >
            Anulează
          </button>
          <button
            onClick={onConfirm}
            style={{
              flex: 1,
              padding: '12px 24px',
              background: 'linear-gradient(180deg, rgba(0, 212, 146, 1.00) 0%, rgba(81, 162, 255, 1.00) 100%)',
              color: 'white',
              borderRadius: '9999px',
              fontWeight: 500,
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0px 10px 15px -3px rgba(0, 0, 0, 0.1)'
            }}
          >
            Confirmă
          </button>
        </div>
      </div>
    </div>
  );
}

// Filter dropdown option types
interface FilterOption {
  value: string;
  label: string;
}

export default function ExpensesPage() {
  const params = useParams<{ teamId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [expenses, setExpenses] = useState<TeamExpense[]>([]);
  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpenseWithPayments[]>([]);
  const [loading, setLoading] = useState(true);
  const [recurringLoading, setRecurringLoading] = useState(true);
  
  // Initialize tab from URL or default to 'Cheltuieli'
  const initialTab = (searchParams.get('tab') as TabType) || 'Cheltuieli';
  const [activeSubTab, setActiveSubTab] = useState<TabType>(initialTab);
  
  // Update tab when URL changes
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'Recurente' || tabParam === 'Cheltuieli') {
      setActiveSubTab(tabParam);
    }
  }, [searchParams]);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchValue, setSearchValue] = useState('');
  const [selectedYear] = useState(new Date().getFullYear());
  const [paymentModalData, setPaymentModalData] = useState<{
    isOpen: boolean;
    index: number;
    supplierName: string;
    amount: string;
    currentlyPaid: boolean;
  } | null>(null);
  const [recurringPaymentModal, setRecurringPaymentModal] = useState<{
    isOpen: boolean;
    recurringId: string;
    supplierName: string;
    monthKey: string;
    monthIndex: number;
    currentlyPaid: boolean;
  } | null>(null);

  // Filter states
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedPayment, setSelectedPayment] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  
  // Dropdown open states
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const dropdownRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  
  const itemsPerPage = 20;

  // Status options
  const statusOptions: FilterOption[] = [
    { value: '', label: 'Toate' },
    { value: 'draft', label: 'Draft' },
    { value: 'pending', label: 'In asteptare' },
    { value: 'approved', label: 'Aprobat' },
    { value: 'rejected', label: 'Respins' },
    { value: 'paid', label: 'Platit' },
  ];

  // Payment options
  const paymentOptions: FilterOption[] = [
    { value: '', label: 'Toate' },
    { value: 'paid', label: 'Platit' },
    { value: 'unpaid', label: 'Neplatit' },
  ];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openDropdown) {
        const ref = dropdownRefs.current[openDropdown];
        if (ref && !ref.contains(event.target as Node)) {
          setOpenDropdown(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openDropdown]);

  // Load categories (part of parallel load)
  const loadCategories = useCallback(async () => {
    if (!params.teamId) return;
    try {
      const cats = await getTeamCategories(params.teamId);
      setCategories(cats);
    } catch (err) {
      console.error("Failed to fetch categories:", err);
    }
  }, [params.teamId]);

  const loadExpenses = useCallback(async () => {
    if (!params.teamId) return;

    setLoading(true);
    try {
      const filters: ExpenseFilters = {};
      if (searchValue) filters.search = searchValue;
      if (selectedCategory) filters.categoryId = selectedCategory;
      if (selectedStatus) filters.status = selectedStatus;
      if (dateFrom) filters.dateFrom = dateFrom;
      if (dateTo) filters.dateTo = dateTo;

      const data = await getTeamExpenses(params.teamId, filters);
      
      // Apply payment filter client-side (since backend filters by status, not payment_status)
      let filteredData = data;
      if (selectedPayment === 'paid') {
        filteredData = data.filter(exp => exp.payment_status === 'paid');
      } else if (selectedPayment === 'unpaid') {
        filteredData = data.filter(exp => exp.payment_status !== 'paid');
      }
      
      setExpenses(filteredData);
    } catch (err) {
      console.error("Failed to fetch expenses:", err);
    } finally {
      setLoading(false);
    }
  }, [params.teamId, searchValue, selectedCategory, selectedStatus, selectedPayment, dateFrom, dateTo]);

  const loadRecurringExpenses = useCallback(async () => {
    if (!params.teamId) return;

    setRecurringLoading(true);
    try {
      const data = await getRecurringExpensesWithPayments(params.teamId, selectedYear);
      setRecurringExpenses(data);
    } catch (err) {
      console.error("Failed to fetch recurring expenses:", err);
    } finally {
      setRecurringLoading(false);
    }
  }, [params.teamId, selectedYear]);

  // Load all data in parallel for better performance
  useEffect(() => {
    Promise.all([
      loadExpenses(),
      loadRecurringExpenses(),
      loadCategories(),
    ]);
  }, [loadExpenses, loadRecurringExpenses, loadCategories]);

  const handleRecurringPaymentToggle = async () => {
    if (!recurringPaymentModal) return;

    try {
      await updateRecurringPaymentStatus(
        recurringPaymentModal.recurringId,
        params.teamId,
        selectedYear,
        recurringPaymentModal.monthIndex,
        !recurringPaymentModal.currentlyPaid
      );
      // Reload data
      await loadRecurringExpenses();
    } catch (err) {
      console.error("Failed to update payment status:", err);
    } finally {
      setRecurringPaymentModal(null);
    }
  };

  // Use real data if available, otherwise fall back to mock
  const displayData = expenses.length > 0 
    ? expenses.map(exp => ({
        status: (exp.status === 'approved' ? 'Final' : exp.status === 'draft' ? 'Draft' : 'Final') as 'Final' | 'Draft' | 'Recurent',
        date: formatExpenseDate(exp.expense_date),
        type: exp.doc_type || 'Factura',
        provider: exp.supplier || '-',
        description: exp.description || '-',
        amount: formatAmountMain(exp.amount || 0),
        decimals: formatAmountDecimals(exp.amount || 0),
        paid: exp.status === 'paid',
        id: exp.id
      }))
    : mockTableData;

  // Pagination calculations
  const totalItems = displayData.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = displayData.slice(startIndex, endIndex);

  // Reset to page 1 when filters change and current page is out of bounds
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [currentPage, totalPages]);

  function formatExpenseDate(dateStr: string | null): string {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    const months = ['ian', 'feb', 'mar', 'apr', 'mai', 'iun', 'iul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const day = date.getDate().toString().padStart(2, '0');
    const month = months[date.getMonth()];
    const year = date.getFullYear().toString().slice(-2);
    return `${day}.${month}.${year}`;
  }

  function formatAmountMain(amount: number): string {
    const whole = Math.floor(amount);
    return whole.toLocaleString('ro-RO');
  }

  function formatAmountDecimals(amount: number): string {
    const decimals = Math.round((amount % 1) * 100);
    return decimals.toString().padStart(2, '0');
  }

  const formatDisplayAmount = (amt: number) => {
    return amt.toLocaleString('ro-RO', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).replace('.', ',');
  };

  return (
    <div style={{
      width: '100%',
      minHeight: '100vh',
      backgroundColor: 'rgba(248, 248, 248, 1)',
      fontFamily: '"Inter", sans-serif',
      position: 'relative',
      overflowX: 'hidden'
    }}>
      {/* Payment Status Confirmation Modal */}
      {paymentModalData && (
        <PaymentStatusModal
          isOpen={paymentModalData.isOpen}
          onClose={() => setPaymentModalData(null)}
          onConfirm={() => {
            console.log('Toggling payment status for expense:', paymentModalData.index);
            setPaymentModalData(null);
            loadExpenses();
          }}
          supplierName={paymentModalData.supplierName}
          amount={paymentModalData.amount}
          currentlyPaid={paymentModalData.currentlyPaid}
        />
      )}

      {/* Main Content Wrapper */}
      <div style={{
        padding: '24px 128px 40px 128px',
        maxWidth: '1728px',
        margin: '0 auto'
      }}>
        
        {/* Sub-navigation & CTA */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px'
        }}>
          <div style={{
            display: 'flex',
            padding: '6px',
            backgroundColor: 'rgba(255, 255, 255, 0.7)',
            border: '1px solid rgba(229, 231, 235, 0.5)',
            borderRadius: '9999px',
            boxShadow: '0px 4px 6px -4px rgba(0, 0, 0, 0.07)'
          }}>
            <button 
              onClick={() => {
                setActiveSubTab('Cheltuieli');
                router.push(`/dashboard/${params.teamId}/expenses?tab=Cheltuieli`);
              }} 
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '0 28px',
                height: '44px',
                border: 'none',
                borderRadius: '9999px',
                cursor: 'pointer',
                backgroundColor: activeSubTab === 'Cheltuieli' ? 'rgba(30, 172, 200, 1)' : 'transparent',
                color: activeSubTab === 'Cheltuieli' ? 'white' : 'rgba(106, 114, 130, 1)',
                fontWeight: 600,
                fontSize: '16px'
              }}
            >
              {activeSubTab === 'Cheltuieli' && (
                <div style={{
                  width: '22px',
                  height: '22px',
                  backgroundColor: 'white',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Check size={12} style={{ color: 'rgba(30, 172, 200, 1)' }} />
                </div>
              )}
              Cheltuieli
            </button>
            <button 
              onClick={() => {
                setActiveSubTab('Recurente');
                router.push(`/dashboard/${params.teamId}/expenses?tab=Recurente`);
              }} 
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '9px',
                padding: '0 24px',
                height: '44px',
                border: 'none',
                backgroundColor: activeSubTab === 'Recurente' ? 'rgba(30, 172, 200, 1)' : 'transparent',
                borderRadius: '9999px',
                cursor: 'pointer',
                color: activeSubTab === 'Recurente' ? 'white' : 'rgba(106, 114, 130, 1)',
                fontWeight: 600,
                fontSize: '16px'
              }}
            >
              {activeSubTab === 'Recurente' && (
                <div style={{
                  width: '22px',
                  height: '22px',
                  backgroundColor: 'white',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Check size={12} style={{ color: 'rgba(30, 172, 200, 1)' }} />
                </div>
              )}
              Recurente
            </button>
          </div>
          
          <button 
            onClick={() => {
              if (activeSubTab === 'Cheltuieli') {
                router.push(`/dashboard/${params.teamId}/expenses/new`);
              } else {
                router.push(`/dashboard/${params.teamId}/expenses/recurring/new`);
              }
            }}
            style={{
              padding: '8px 32px',
              height: '50px',
              border: 'none',
              borderRadius: '9999px',
              cursor: 'pointer',
              background: 'linear-gradient(180deg, rgba(0, 212, 146, 1.00) 0%, rgba(81, 162, 255, 1.00) 100%)',
              color: 'white',
              fontWeight: 500,
              fontSize: '16px',
              boxShadow: '0px 4px 6px -4px rgba(0, 0, 0, 0.1), 0px 10px 15px -3px rgba(0, 0, 0, 0.1)'
            }}
          >
            {activeSubTab === 'Cheltuieli' ? 'Decont Nou +' : 'Recurent Nou +'}
          </button>
        </div>

        {/* Filters Bar */}
        <div style={{
          display: 'flex',
          gap: '16px',
          marginBottom: '24px',
          alignItems: 'center'
        }}>
          {/* Category Filter */}
          <div 
            ref={(el) => { dropdownRefs.current['category'] = el; }}
            style={{ position: 'relative' }}
          >
            <button 
              onClick={() => setOpenDropdown(openDropdown === 'category' ? null : 'category')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '0 25px',
                height: '40.5px',
                backgroundColor: selectedCategory ? 'rgba(30, 172, 200, 0.1)' : 'rgba(255, 255, 255, 0.7)',
                border: selectedCategory ? '1px solid rgba(30, 172, 200, 0.5)' : '1px solid rgba(209, 213, 220, 0.5)',
                borderRadius: '9999px',
                cursor: 'pointer',
                color: selectedCategory ? 'rgba(30, 172, 200, 1)' : 'rgba(153, 161, 175, 1)',
                fontSize: '15px',
                boxShadow: '0px 4px 16px rgba(0, 0, 0, 0.06)'
              }}
            >
              {selectedCategory ? categories.find(c => c.id === selectedCategory)?.name || 'Categorie' : 'Categorie'}
              <ChevronDown size={16} />
            </button>
            {openDropdown === 'category' && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                marginTop: '4px',
                backgroundColor: 'white',
                borderRadius: '12px',
                boxShadow: '0px 10px 30px rgba(0, 0, 0, 0.15)',
                border: '1px solid rgba(229, 231, 235, 0.5)',
                minWidth: '200px',
                maxHeight: '300px',
                overflowY: 'auto',
                zIndex: 100
              }}>
                <div
                  onClick={() => { setSelectedCategory(''); setOpenDropdown(null); }}
                  style={{
                    padding: '12px 16px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    color: !selectedCategory ? 'rgba(30, 172, 200, 1)' : 'rgba(55, 65, 81, 1)',
                    backgroundColor: !selectedCategory ? 'rgba(30, 172, 200, 0.05)' : 'transparent',
                    borderBottom: '1px solid rgba(229, 231, 235, 0.5)'
                  }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(30, 172, 200, 0.05)')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = !selectedCategory ? 'rgba(30, 172, 200, 0.05)' : 'transparent')}
                >
                  Toate
                </div>
                {categories.filter(c => !c.parent_id).map(cat => (
                  <div
                    key={cat.id}
                    onClick={() => { setSelectedCategory(cat.id); setOpenDropdown(null); }}
                    style={{
                      padding: '12px 16px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      color: selectedCategory === cat.id ? 'rgba(30, 172, 200, 1)' : 'rgba(55, 65, 81, 1)',
                      backgroundColor: selectedCategory === cat.id ? 'rgba(30, 172, 200, 0.05)' : 'transparent'
                    }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(30, 172, 200, 0.05)')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = selectedCategory === cat.id ? 'rgba(30, 172, 200, 0.05)' : 'transparent')}
                  >
                    {cat.name}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cont Filter - placeholder for now */}
          <button 
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '0 25px',
              height: '40.5px',
              backgroundColor: 'rgba(255, 255, 255, 0.7)',
              border: '1px solid rgba(209, 213, 220, 0.5)',
              borderRadius: '9999px',
              cursor: 'not-allowed',
              color: 'rgba(153, 161, 175, 1)',
              fontSize: '15px',
              boxShadow: '0px 4px 16px rgba(0, 0, 0, 0.06)',
              opacity: 0.4
            }}
          >
            Cont
            <ChevronDown size={16} />
          </button>

          {/* Date Filter */}
          <div 
            ref={(el) => { dropdownRefs.current['date'] = el; }}
            style={{ position: 'relative' }}
          >
            <button 
              onClick={() => setOpenDropdown(openDropdown === 'date' ? null : 'date')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '0 25px',
                height: '40.5px',
                backgroundColor: (dateFrom || dateTo) ? 'rgba(30, 172, 200, 0.1)' : 'rgba(255, 255, 255, 0.7)',
                border: (dateFrom || dateTo) ? '1px solid rgba(30, 172, 200, 0.5)' : '1px solid rgba(209, 213, 220, 0.5)',
                borderRadius: '9999px',
                cursor: 'pointer',
                color: (dateFrom || dateTo) ? 'rgba(30, 172, 200, 1)' : 'rgba(153, 161, 175, 1)',
                fontSize: '15px',
                boxShadow: '0px 4px 16px rgba(0, 0, 0, 0.06)'
              }}
            >
              Data
              <Calendar size={16} />
            </button>
            {openDropdown === 'date' && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                marginTop: '4px',
                backgroundColor: 'white',
                borderRadius: '12px',
                boxShadow: '0px 10px 30px rgba(0, 0, 0, 0.15)',
                border: '1px solid rgba(229, 231, 235, 0.5)',
                padding: '16px',
                zIndex: 100,
                minWidth: '280px'
              }}>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '12px', color: 'rgba(107, 114, 128, 1)', marginBottom: '4px' }}>De la</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={e => setDateFrom(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid rgba(209, 213, 220, 1)',
                      borderRadius: '8px',
                      fontSize: '14px'
                    }}
                  />
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '12px', color: 'rgba(107, 114, 128, 1)', marginBottom: '4px' }}>Pana la</label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={e => setDateTo(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid rgba(209, 213, 220, 1)',
                      borderRadius: '8px',
                      fontSize: '14px'
                    }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => { setDateFrom(''); setDateTo(''); }}
                    style={{
                      flex: 1,
                      padding: '8px',
                      border: '1px solid rgba(209, 213, 220, 1)',
                      borderRadius: '8px',
                      backgroundColor: 'white',
                      cursor: 'pointer',
                      fontSize: '13px',
                      color: 'rgba(55, 65, 81, 1)'
                    }}
                  >
                    Reseteaza
                  </button>
                  <button
                    onClick={() => setOpenDropdown(null)}
                    style={{
                      flex: 1,
                      padding: '8px',
                      border: 'none',
                      borderRadius: '8px',
                      background: 'linear-gradient(180deg, rgba(0, 212, 146, 1) 0%, rgba(81, 162, 255, 1) 100%)',
                      cursor: 'pointer',
                      fontSize: '13px',
                      color: 'white',
                      fontWeight: 500
                    }}
                  >
                    Aplica
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Status Filter - only for Cheltuieli tab */}
          {activeSubTab === 'Cheltuieli' && (
            <div 
              ref={(el) => { dropdownRefs.current['status'] = el; }}
              style={{ position: 'relative' }}
            >
              <button 
                onClick={() => setOpenDropdown(openDropdown === 'status' ? null : 'status')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '0 25px',
                  height: '40.5px',
                  backgroundColor: selectedStatus ? 'rgba(30, 172, 200, 0.1)' : 'rgba(255, 255, 255, 0.7)',
                  border: selectedStatus ? '1px solid rgba(30, 172, 200, 0.5)' : '1px solid rgba(209, 213, 220, 0.5)',
                  borderRadius: '9999px',
                  cursor: 'pointer',
                  color: selectedStatus ? 'rgba(30, 172, 200, 1)' : 'rgba(153, 161, 175, 1)',
                  fontSize: '15px',
                  boxShadow: '0px 4px 16px rgba(0, 0, 0, 0.06)'
                }}
              >
                {selectedStatus ? statusOptions.find(o => o.value === selectedStatus)?.label || 'Status' : 'Status'}
                <ChevronDown size={16} />
              </button>
              {openDropdown === 'status' && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  marginTop: '4px',
                  backgroundColor: 'white',
                  borderRadius: '12px',
                  boxShadow: '0px 10px 30px rgba(0, 0, 0, 0.15)',
                  border: '1px solid rgba(229, 231, 235, 0.5)',
                  minWidth: '160px',
                  zIndex: 100
                }}>
                  {statusOptions.map(option => (
                    <div
                      key={option.value}
                      onClick={() => { setSelectedStatus(option.value); setOpenDropdown(null); }}
                      style={{
                        padding: '12px 16px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        color: selectedStatus === option.value ? 'rgba(30, 172, 200, 1)' : 'rgba(55, 65, 81, 1)',
                        backgroundColor: selectedStatus === option.value ? 'rgba(30, 172, 200, 0.05)' : 'transparent'
                      }}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(30, 172, 200, 0.05)')}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = selectedStatus === option.value ? 'rgba(30, 172, 200, 0.05)' : 'transparent')}
                    >
                      {option.label}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Payment Filter - only for Cheltuieli tab */}
          {activeSubTab === 'Cheltuieli' && (
            <div 
              ref={(el) => { dropdownRefs.current['payment'] = el; }}
              style={{ position: 'relative' }}
            >
              <button 
                onClick={() => setOpenDropdown(openDropdown === 'payment' ? null : 'payment')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '0 25px',
                  height: '40.5px',
                  backgroundColor: selectedPayment ? 'rgba(30, 172, 200, 0.1)' : 'rgba(255, 255, 255, 0.7)',
                  border: selectedPayment ? '1px solid rgba(30, 172, 200, 0.5)' : '1px solid rgba(209, 213, 220, 0.5)',
                  borderRadius: '9999px',
                  cursor: 'pointer',
                  color: selectedPayment ? 'rgba(30, 172, 200, 1)' : 'rgba(153, 161, 175, 1)',
                  fontSize: '15px',
                  boxShadow: '0px 4px 16px rgba(0, 0, 0, 0.06)'
                }}
              >
                {selectedPayment ? paymentOptions.find(o => o.value === selectedPayment)?.label || 'Plata' : 'Plata'}
                <ChevronDown size={16} />
              </button>
              {openDropdown === 'payment' && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  marginTop: '4px',
                  backgroundColor: 'white',
                  borderRadius: '12px',
                  boxShadow: '0px 10px 30px rgba(0, 0, 0, 0.15)',
                  border: '1px solid rgba(229, 231, 235, 0.5)',
                  minWidth: '140px',
                  zIndex: 100
                }}>
                  {paymentOptions.map(option => (
                    <div
                      key={option.value}
                      onClick={() => { setSelectedPayment(option.value); setOpenDropdown(null); }}
                      style={{
                        padding: '12px 16px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        color: selectedPayment === option.value ? 'rgba(30, 172, 200, 1)' : 'rgba(55, 65, 81, 1)',
                        backgroundColor: selectedPayment === option.value ? 'rgba(30, 172, 200, 0.05)' : 'transparent'
                      }}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(30, 172, 200, 0.05)')}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = selectedPayment === option.value ? 'rgba(30, 172, 200, 0.05)' : 'transparent')}
                    >
                      {option.label}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          
          <div style={{
            marginLeft: 'auto',
            position: 'relative',
            width: activeSubTab === 'Recurente' ? '484px' : '281px'
          }}>
            <svg 
              style={{
                position: 'absolute',
                left: '12px',
                top: '10px',
                width: '20px',
                height: '20px'
              }}
              viewBox="0 0 20 20" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M17.5 17.5L13.875 13.875M15.8333 9.16667C15.8333 12.8486 12.8486 15.8333 9.16667 15.8333C5.48477 15.8333 2.5 12.8486 2.5 9.16667C2.5 5.48477 5.48477 2.5 9.16667 2.5C12.8486 2.5 15.8333 5.48477 15.8333 9.16667Z" stroke="rgba(153, 161, 175, 1)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <input 
              type="text" 
              placeholder={activeSubTab === 'Cheltuieli' ? 'Furnizor, coleg sau tag' : 'Cauta dupa companie sau coleg'} 
              value={searchValue} 
              onChange={e => setSearchValue(e.target.value)} 
              style={{
                width: '100%',
                height: '41px',
                padding: '0 16px 0 40px',
                backgroundColor: 'rgba(255, 255, 255, 0.7)',
                border: '1px solid rgba(209, 213, 220, 0.5)',
                borderRadius: '9999px',
                fontSize: '15px',
                color: 'rgba(16, 24, 40, 1)',
                boxShadow: '0px 4px 16px rgba(0, 0, 0, 0.06)',
                outline: 'none',
                fontFamily: '"Inter", sans-serif'
              }} 
            />
          </div>
        </div>

        {/* Cheltuieli Table */}
        {activeSubTab === 'Cheltuieli' && (
          <div style={{
            backgroundColor: 'rgba(255, 255, 255, 0.7)',
            border: '1px solid rgba(229, 231, 235, 0.5)',
            borderRadius: '16px',
            overflow: 'hidden',
            boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.04)'
          }}>
            {loading ? (
              <div style={{ padding: '48px', textAlign: 'center', color: 'rgba(107, 114, 128, 1)' }}>
                Se incarca...
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{
                    height: '54px',
                    background: 'linear-gradient(180deg, rgba(240, 253, 250, 0.80) 0%, rgba(204, 251, 241, 0.80) 100%)',
                    borderBottom: '1px solid rgba(229, 231, 235, 0.5)'
                  }}>
                    {['STATUS', 'DATA', 'TIP', 'FURNIZOR', 'DESCRIERE', 'SUMA fara TVA', 'PLATA'].map((header, i) => (
                      <th 
                        key={header} 
                        style={{
                          textAlign: i === 0 || i === 5 || i === 6 ? 'center' : 'left',
                          padding: '0 24px',
                          fontSize: '15px',
                          fontWeight: 500,
                          color: 'rgba(74, 85, 101, 1)',
                          letterSpacing: '0.75px',
                          width: i === 0 ? '187px' : i === 1 ? '149px' : i === 2 ? '134px' : i === 3 ? '316px' : i === 4 ? '402px' : i === 5 ? '151px' : '128px'
                        }}
                      >
                        {header === 'SUMA fara TVA' ? (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <span>SUMA</span>
                            <span style={{ fontSize: '15px' }}>fara TVA</span>
                          </div>
                        ) : header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map((row, index) => (
                    <tr 
                      key={index} 
                      style={{
                        height: '49px',
                        borderBottom: '1px solid rgba(229, 231, 235, 0.3)',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(240, 253, 250, 0.3)')}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                      onClick={() => {
                        if ('id' in row && row.id) {
                          router.push(`/dashboard/${params.teamId}/expenses/${row.id}`);
                        }
                      }}
                    >
                      <td style={{ textAlign: 'center' }}>
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '96px',
                          height: '32px',
                          borderRadius: '999px',
                          border: '1px solid',
                          fontSize: '12px',
                          fontWeight: 200,
                          color: 'rgba(71, 85, 105, 1)',
                          boxShadow: '0px 4px 10px rgba(0, 0, 0, 0.05)',
                          ...getStatusStyles(row.status)
                        }}>
                          {row.status}
                        </div>
                      </td>
                      <td style={{ padding: '0 24px', fontSize: '14px', color: 'rgba(16, 24, 40, 1)' }}>
                        {row.date}
                      </td>
                      <td style={{ padding: '0 24px', fontSize: '14px', color: 'rgba(54, 65, 83, 1)' }}>
                        {row.type}
                      </td>
                      <td style={{ padding: '0 24px', fontSize: '14px', color: 'rgba(16, 24, 40, 1)' }}>
                        {row.provider}
                      </td>
                      <td style={{ padding: '0 24px', fontSize: '14px', color: 'rgba(54, 65, 83, 1)' }}>
                        {row.description}
                      </td>
                      <td style={{ padding: '0 24px', textAlign: 'center' }}>
                        <span style={{ fontSize: '14px', fontWeight: 400, color: 'rgba(19, 7, 14, 1)' }}>
                          {row.amount},
                        </span>
                        <span style={{ fontSize: '12px', color: 'rgba(19, 7, 14, 1)' }}>
                          {row.decimals}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div 
                          onClick={(e) => {
                            e.stopPropagation();
                            setPaymentModalData({
                              isOpen: true,
                              index,
                              supplierName: row.provider,
                              amount: `${row.amount},${row.decimals}`,
                              currentlyPaid: row.paid
                            });
                          }}
                          style={{ display: 'flex', justifyContent: 'center' }}
                        >
                          <PaymentIcon paid={row.paid} />
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
        {activeSubTab === 'Recurente' && (
          <div style={{
            backgroundColor: 'rgba(255, 255, 255, 0.7)',
            border: '1px solid rgba(229, 231, 235, 0.5)',
            borderRadius: '16px',
            overflow: 'hidden',
            boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.04)'
          }}>
            {recurringLoading ? (
              <div style={{ padding: '48px', textAlign: 'center', color: 'rgba(107, 114, 128, 1)' }}>
                Se incarca...
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{
                    height: '50.5px',
                    backgroundColor: 'rgba(44, 173, 189, 0.08)',
                    borderBottom: '1px solid rgba(229, 231, 235, 0.5)'
                  }}>
                    <th style={{ 
                      width: '379.2px',
                      textAlign: 'left', 
                      paddingLeft: '24px', 
                      fontSize: '12px', 
                      fontWeight: 600, 
                      color: 'rgba(74, 85, 101, 1)',
                      letterSpacing: '0.6px'
                    }}>
                      FURNIZOR
                    </th>
                    <th style={{ 
                      width: '452px',
                      textAlign: 'left', 
                      paddingLeft: '24px', 
                      fontSize: '12px', 
                      fontWeight: 600, 
                      color: 'rgba(74, 85, 101, 1)',
                      letterSpacing: '0.6px'
                    }}>
                      DESCRIERE
                    </th>
                    <th style={{ 
                      width: '162.7px',
                      textAlign: 'center', 
                      fontSize: '12px', 
                      fontWeight: 600, 
                      color: 'rgba(74, 85, 101, 1)',
                      letterSpacing: '0.6px'
                    }}>
                      RON
                    </th>
                    {['JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'].map(month => (
                      <th 
                        key={month} 
                        style={{ 
                          width: '81.8px',
                          textAlign: 'center', 
                          fontSize: '12px', 
                          fontWeight: 600, 
                          color: 'rgba(74, 85, 101, 1)',
                          letterSpacing: '0.6px'
                        }}
                      >
                        {month}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recurringExpenses.length > 0 ? recurringExpenses.map((expense) => {
                    const amount = expense.amount_with_vat || expense.amount || 0;
                    const amountParts = formatDisplayAmount(amount).split(',');
                    const mainAmount = amountParts[0] + ',';
                    const decimals = amountParts[1] || '00';
                    const monthKeys = ['jul', 'aug', 'sep', 'oct', 'nov', 'dec'] as const;
                    const monthIndices = [6, 7, 8, 9, 10, 11]; // July to December
                    
                    return (
                      <tr 
                        key={expense.id} 
                        style={{
                          height: '65px',
                          borderBottom: '1px solid rgba(229, 231, 235, 0.3)',
                          cursor: 'pointer',
                          transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(44, 173, 189, 0.02)')}
                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                        onClick={() => router.push(`/dashboard/${params.teamId}/expenses/recurring/${expense.id}`)}
                      >
                        <td style={{ 
                          width: '379.2px',
                          paddingLeft: '24px', 
                          fontSize: '15px', 
                          fontWeight: 500, 
                          color: 'rgba(16, 24, 40, 1)' 
                        }}>
                          {expense.supplier || '-'}
                        </td>
                        <td style={{ 
                          width: '452px',
                          paddingLeft: '24px', 
                          fontSize: '14px', 
                          fontWeight: 400, 
                          color: 'rgba(54, 65, 83, 1)' 
                        }}>
                          {expense.description || '-'}
                        </td>
                        <td style={{ width: '162.7px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'baseline', gap: '1px' }}>
                            <span style={{ fontSize: '15px', fontWeight: 500, color: 'rgba(10, 10, 10, 1)' }}>
                              {mainAmount}
                            </span>
                            <span style={{ fontSize: '13px', fontWeight: 500, color: 'rgba(10, 10, 10, 1)' }}>
                              {decimals}
                            </span>
                          </div>
                        </td>
                        {monthKeys.map((monthKey, idx) => (
                          <td key={monthKey} style={{ width: '81.8px' }}>
                            <div 
                              style={{ display: 'flex', justifyContent: 'center', cursor: 'pointer' }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setRecurringPaymentModal({
                                  isOpen: true,
                                  recurringId: expense.id,
                                  supplierName: expense.supplier || '-',
                                  monthKey,
                                  monthIndex: monthIndices[idx],
                                  currentlyPaid: !!expense.payments[monthKey]
                                });
                              }}
                            >
                              <MonthPaymentIcon paid={!!expense.payments[monthKey]} />
                            </div>
                          </td>
                        ))}
                      </tr>
                    );
                  }) : (
                    <tr>
                      <td colSpan={9} style={{ padding: '48px', textAlign: 'center', color: 'rgba(107, 114, 128, 1)' }}>
                        Nu exista cheltuieli recurente. Apasa &quot;Recurent Nou +&quot; pentru a adauga.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Recurring Payment Status Modal */}
        {recurringPaymentModal && (
          <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <div 
              style={{
                position: 'absolute',
                inset: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.3)',
                backdropFilter: 'blur(4px)'
              }}
              onClick={() => setRecurringPaymentModal(null)}
            />
            
            <div style={{
              position: 'relative',
              backgroundColor: 'white',
              borderRadius: '16px',
              boxShadow: '0px 25px 50px -12px rgba(0, 0, 0, 0.25)',
              width: '100%',
              maxWidth: '480px',
              margin: '16px',
              padding: '32px'
            }}>
              <h2 style={{
                fontSize: '20px',
                fontWeight: 600,
                color: 'rgba(16, 24, 40, 1)',
                marginBottom: '16px'
              }}>
                Confirmă schimbarea statusului
              </h2>
              
              <p style={{ color: 'rgba(107, 114, 128, 1)', marginBottom: '8px' }}>
                Ești sigur că vrei să schimbi statusul de plată pentru:
              </p>
              
              <p style={{
                color: 'rgba(16, 24, 40, 1)',
                fontWeight: 600,
                marginBottom: '16px'
              }}>
                {recurringPaymentModal.supplierName} - {recurringPaymentModal.monthKey.toUpperCase()}
              </p>
              
              <p style={{
                color: 'rgba(107, 114, 128, 1)',
                fontSize: '14px',
                marginBottom: '32px'
              }}>
                Statusul va fi schimbat din &ldquo;{recurringPaymentModal.currentlyPaid ? 'Plătit' : 'Neplătit'}&rdquo; în &ldquo;{recurringPaymentModal.currentlyPaid ? 'Neplătit' : 'Plătit'}&rdquo;.
              </p>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => setRecurringPaymentModal(null)}
                  style={{
                    flex: 1,
                    padding: '12px 24px',
                    border: '1px solid rgba(229, 231, 235, 1)',
                    borderRadius: '9999px',
                    color: 'rgba(55, 65, 81, 1)',
                    fontWeight: 500,
                    backgroundColor: 'white',
                    cursor: 'pointer'
                  }}
                >
                  Anulează
                </button>
                <button
                  onClick={handleRecurringPaymentToggle}
                  style={{
                    flex: 1,
                    padding: '12px 24px',
                    background: 'linear-gradient(180deg, rgba(0, 212, 146, 1.00) 0%, rgba(81, 162, 255, 1.00) 100%)',
                    color: 'white',
                    borderRadius: '9999px',
                    fontWeight: 500,
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0px 10px 15px -3px rgba(0, 0, 0, 0.1)'
                  }}
                >
                  Confirmă
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer / Pagination */}
        <div style={{
          marginTop: '32px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span style={{ fontSize: '14px', color: 'rgba(0, 0, 0, 1)' }}>
            Showing {activeSubTab === 'Recurente' 
              ? recurringExpenses.length 
              : `${Math.min(startIndex + 1, totalItems)}-${Math.min(endIndex, totalItems)}`} of {activeSubTab === 'Recurente' 
              ? recurringExpenses.length 
              : totalItems} results
          </span>
          
          {activeSubTab === 'Cheltuieli' && totalPages > 1 && (
            <div style={{ display: 'flex', gap: '7px' }}>
              <button 
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                style={{
                  width: '56px',
                  height: '36px',
                  backgroundColor: 'white',
                  border: 'none',
                  borderRadius: '28px',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: currentPage === 1 ? 0.5 : 1
                }}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12.5 15L7.5 10L12.5 5" stroke="rgba(107, 114, 128, 1)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                // Show pages around current page
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                return (
                  <button 
                    key={pageNum} 
                    onClick={() => setCurrentPage(pageNum)} 
                    style={{
                      width: '56px',
                      height: '36px',
                      border: 'none',
                      borderRadius: '28px',
                      cursor: 'pointer',
                      backgroundColor: currentPage === pageNum ? 'rgba(34, 211, 238, 1)' : 'rgba(225, 244, 245, 1)',
                      color: currentPage === pageNum ? 'white' : 'rgba(23, 26, 28, 0.4)',
                      fontSize: '14px',
                      fontWeight: 500
                    }}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button 
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                style={{
                  width: '56px',
                  height: '36px',
                  backgroundColor: 'white',
                  border: 'none',
                  borderRadius: '28px',
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: currentPage === totalPages ? 0.5 : 1
                }}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M7.5 15L12.5 10L7.5 5" stroke="rgba(107, 114, 128, 1)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
