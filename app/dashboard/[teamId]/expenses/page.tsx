"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Check, X, Hourglass } from "lucide-react";
import { getTeamExpenses, TeamExpense, ExpenseFilters } from "@/app/actions/expenses";
import { 
  getRecurringExpensesWithPayments, 
  RecurringExpenseWithPayments,
  updateRecurringPaymentStatus 
} from "@/app/actions/recurring-expenses";

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

// Fallback mock data for recurring expenses (used when no real data)
const mockRecurringExpenses = [
  { 
    id: '1', 
    furnizor: 'Adobe Systems Software', 
    descriere: 'Creative Cloud All Apps - 15 users', 
    suma: 1259.00,
    payments: { jul: true, aug: true, sep: true, oct: true, nov: true, dec: true }
  },
  { 
    id: '2', 
    furnizor: 'Slack Technologies LLC', 
    descriere: 'Slack Business+ - 45 users', 
    suma: 1750.00,
    payments: { jul: true, aug: true, sep: true, oct: true, nov: true, dec: true }
  },
  { 
    id: '3', 
    furnizor: 'Google Ireland Limited', 
    descriere: 'Google Workspace Business - 50 users', 
    suma: 3850.00,
    payments: { jul: false, aug: false, sep: true, oct: true, nov: true, dec: true }
  },
  { 
    id: '4', 
    furnizor: 'Zoom Video Communications', 
    descriere: 'Zoom Business - 20 host licenses', 
    suma: 1890.00,
    payments: { jul: true, aug: true, sep: true, oct: false, nov: true, dec: true }
  },
  { 
    id: '5', 
    furnizor: 'AWS Europe SARL', 
    descriere: 'Cloud hosting & storage infrastructure', 
    suma: 2200.00,
    payments: { jul: true, aug: true, sep: true, oct: true, nov: false, dec: true }
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

export default function ExpensesPage() {
  const params = useParams<{ teamId: string }>();
  const router = useRouter();
  const [expenses, setExpenses] = useState<TeamExpense[]>([]);
  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpenseWithPayments[]>([]);
  const [loading, setLoading] = useState(true);
  const [recurringLoading, setRecurringLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<TabType>('Cheltuieli');
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
  
  const itemsPerPage = 15;
  const totalItems = 100; // Mock total

  const loadExpenses = useCallback(async () => {
    if (!params.teamId) return;

    setLoading(true);
    try {
      const filters: ExpenseFilters = {};
      if (searchValue) filters.search = searchValue;

      const data = await getTeamExpenses(params.teamId, filters);
      setExpenses(data);
    } catch (err) {
      console.error("Failed to fetch expenses:", err);
    } finally {
      setLoading(false);
    }
  }, [params.teamId, searchValue]);

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

  useEffect(() => {
    loadExpenses();
    loadRecurringExpenses();
  }, [loadExpenses, loadRecurringExpenses]);

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
              onClick={() => setActiveSubTab('Cheltuieli')} 
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
              onClick={() => setActiveSubTab('Recurente')} 
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
          {/* Different filters based on active tab */}
          {(activeSubTab === 'Cheltuieli' 
            ? ['Categorie', 'Cont', 'Data', 'Status', 'Plata'] 
            : ['Categorie', 'Cont', 'Data']
          ).map((filter, idx) => (
            <button 
              key={filter} 
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '0 25px',
                height: '40.5px',
                backgroundColor: 'rgba(255, 255, 255, 0.7)',
                border: '1px solid rgba(209, 213, 220, 0.5)',
                borderRadius: '9999px',
                cursor: 'pointer',
                color: 'rgba(153, 161, 175, 1)',
                fontSize: '15px',
                boxShadow: '0px 4px 16px rgba(0, 0, 0, 0.06)',
                opacity: activeSubTab === 'Recurente' && filter === 'Cont' ? 0.4 : 1
              }}
            >
              {filter}
              {filter === 'Data' ? (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="2" y="3" width="12" height="11" rx="2" stroke="rgba(153, 161, 175, 1)" strokeWidth="1.2"/>
                  <path d="M2 6H14" stroke="rgba(153, 161, 175, 1)" strokeWidth="1.2"/>
                  <path d="M5 1V4" stroke="rgba(153, 161, 175, 1)" strokeWidth="1.2" strokeLinecap="round"/>
                  <path d="M11 1V4" stroke="rgba(153, 161, 175, 1)" strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M4 6L8 10L12 6" stroke="rgba(153, 161, 175, 1)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </button>
          ))}
          
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
                  {displayData.map((row, index) => (
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
                  {(recurringExpenses.length > 0 ? recurringExpenses.map((expense) => {
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
                              style={{ display: 'flex', justifyContent: 'center' }}
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
                  }) : mockRecurringExpenses.map((expense) => {
                    const amountParts = formatDisplayAmount(expense.suma).split(',');
                    const mainAmount = amountParts[0] + ',';
                    const decimals = amountParts[1] || '00';
                    
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
                      >
                        <td style={{ 
                          width: '379.2px',
                          paddingLeft: '24px', 
                          fontSize: '15px', 
                          fontWeight: 500, 
                          color: 'rgba(16, 24, 40, 1)' 
                        }}>
                          {expense.furnizor}
                        </td>
                        <td style={{ 
                          width: '452px',
                          paddingLeft: '24px', 
                          fontSize: '14px', 
                          fontWeight: 400, 
                          color: 'rgba(54, 65, 83, 1)' 
                        }}>
                          {expense.descriere}
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
                        <td style={{ width: '81.8px' }}>
                          <div style={{ display: 'flex', justifyContent: 'center' }}>
                            <MonthPaymentIcon paid={expense.payments.jul} />
                          </div>
                        </td>
                        <td style={{ width: '81.8px' }}>
                          <div style={{ display: 'flex', justifyContent: 'center' }}>
                            <MonthPaymentIcon paid={expense.payments.aug} />
                          </div>
                        </td>
                        <td style={{ width: '81.8px' }}>
                          <div style={{ display: 'flex', justifyContent: 'center' }}>
                            <MonthPaymentIcon paid={expense.payments.sep} />
                          </div>
                        </td>
                        <td style={{ width: '81.8px' }}>
                          <div style={{ display: 'flex', justifyContent: 'center' }}>
                            <MonthPaymentIcon paid={expense.payments.oct} />
                          </div>
                        </td>
                        <td style={{ width: '81.8px' }}>
                          <div style={{ display: 'flex', justifyContent: 'center' }}>
                            <MonthPaymentIcon paid={expense.payments.nov} />
                          </div>
                        </td>
                        <td style={{ width: '81.8px' }}>
                          <div style={{ display: 'flex', justifyContent: 'center' }}>
                            <MonthPaymentIcon paid={expense.payments.dec} />
                          </div>
                        </td>
                      </tr>
                    );
                  }))}
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
              ? (recurringExpenses.length > 0 ? recurringExpenses.length : mockRecurringExpenses.length) 
              : displayData.length} of {activeSubTab === 'Recurente' 
              ? (recurringExpenses.length > 0 ? recurringExpenses.length : mockRecurringExpenses.length) 
              : totalItems} results
          </span>
          
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
            {[1, 2, 3, 4, 5].map(page => (
              <button 
                key={page} 
                onClick={() => setCurrentPage(page)} 
                style={{
                  width: '56px',
                  height: '36px',
                  border: 'none',
                  borderRadius: '28px',
                  cursor: 'pointer',
                  backgroundColor: currentPage === page ? 'rgba(34, 211, 238, 1)' : 'rgba(225, 244, 245, 1)',
                  color: currentPage === page ? 'white' : 'rgba(23, 26, 28, 0.4)',
                  fontSize: '14px',
                  fontWeight: 500
                }}
              >
                {page}
              </button>
            ))}
            <button 
              onClick={() => setCurrentPage(Math.min(5, currentPage + 1))}
              disabled={currentPage === 5}
              style={{
                width: '56px',
                height: '36px',
                backgroundColor: 'white',
                border: 'none',
                borderRadius: '28px',
                cursor: currentPage === 5 ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: currentPage === 5 ? 0.5 : 1
              }}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M7.5 15L12.5 10L7.5 5" stroke="rgba(107, 114, 128, 1)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
