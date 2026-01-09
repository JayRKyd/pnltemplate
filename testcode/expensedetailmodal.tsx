import { X } from 'lucide-react';

interface ExpenseDetail {
  description: string;
  invoiceDate: string;
  amount: number;
  addedBy: string;
  supplier: string;
}

interface ExpenseDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  subcategoryName: string;
  month: string;
  year: string;
  expenses: ExpenseDetail[];
  currency: 'EUR' | 'RON';
}

export function ExpenseDetailModal({ isOpen, onClose, subcategoryName, month, year, expenses, currency }: ExpenseDetailModalProps) {
  if (!isOpen) return null;

  const formatAmount = (amount: number) => {
    const integerPart = Math.floor(amount).toLocaleString('ro-RO');
    const decimalPart = (amount % 1).toFixed(2).slice(2);
    return (
      <span>
        {integerPart}
        {decimalPart !== '00' && (
          <span style={{ fontSize: '0.7rem' }}>,{decimalPart}</span>
        )}
      </span>
    );
  };

  const total = expenses.reduce((sum, exp) => sum + exp.amount, 0);

  const CurrencyFlag = () => {
    if (currency === 'RON') {
      return (
        <div className="w-5 h-3 rounded-full overflow-hidden flex">
          <div className="w-[6.67px] h-3 bg-[#002B7F]"></div>
          <div className="w-[6.67px] h-3 bg-[#FCD116]"></div>
          <div className="w-[6.67px] h-3 bg-[#CE1126]"></div>
        </div>
      );
    } else {
      return (
        <div className="w-5 h-3 rounded-full overflow-hidden bg-[#003399] flex items-center justify-center relative">
          <div className="absolute inset-0 flex items-center justify-center">
            <svg width="20" height="12" viewBox="0 0 20 12" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="10" cy="6" r="1.5" fill="#FFCC00"/>
              <circle cx="7" cy="3" r="0.8" fill="#FFCC00"/>
              <circle cx="13" cy="3" r="0.8" fill="#FFCC00"/>
              <circle cx="5.5" cy="6" r="0.8" fill="#FFCC00"/>
              <circle cx="14.5" cy="6" r="0.8" fill="#FFCC00"/>
              <circle cx="7" cy="9" r="0.8" fill="#FFCC00"/>
              <circle cx="13" cy="9" r="0.8" fill="#FFCC00"/>
              <circle cx="4.5" cy="9.5" r="0.8" fill="#FFCC00"/>
              <circle cx="15.5" cy="9.5" r="0.8" fill="#FFCC00"/>
              <circle cx="4.5" cy="2.5" r="0.8" fill="#FFCC00"/>
              <circle cx="15.5" cy="2.5" r="0.8" fill="#FFCC00"/>
              <circle cx="10" cy="2" r="0.8" fill="#FFCC00"/>
            </svg>
          </div>
        </div>
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/10 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="bg-white/80 backdrop-blur-3xl rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.08)] border border-white/40 w-full max-w-4xl max-h-[80vh] overflow-hidden mx-4 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button - X in Circle */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center rounded-full bg-white/80 hover:bg-white/95 text-gray-600 hover:text-gray-800 transition-all z-10 backdrop-blur-md"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="px-8 py-6 border-b border-white/30 bg-white/30 relative">
          <h2 className="text-gray-900" style={{ fontSize: '1.25rem', fontWeight: 600 }}>
            {subcategoryName}
          </h2>
          <p className="text-gray-600 mt-1" style={{ fontSize: '0.875rem', fontWeight: 400 }}>
            {month.charAt(0).toUpperCase() + month.slice(1)} {year}
          </p>
          
          {/* Currency Badge - Top Right */}
          <div className="absolute top-6 right-20 flex items-center gap-2 px-3 py-1.5 bg-white/80 backdrop-blur-md rounded-lg border border-white/50">
            <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#4B5563' }}>
              {currency}
            </span>
            <CurrencyFlag />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-y-auto max-h-[calc(80vh-180px)] px-8 py-4">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/30">
                <th className="px-4 py-3 text-left bg-white/20" style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#4B5563' }}>
                  Furnizor
                </th>
                <th className="px-4 py-3 text-left bg-white/20" style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#4B5563' }}>
                  Descriere
                </th>
                <th className="px-4 py-3 text-right bg-white/20" style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#4B5563' }}>
                  Sumă
                </th>
                <th className="px-4 py-3 text-center bg-white/20" style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#4B5563' }}>
                  Date
                </th>
                <th className="px-4 py-3 text-center bg-white/20" style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#4B5563' }}>
                  Responsabil
                </th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((expense, index) => (
                <tr key={index} className="border-b border-white/20 hover:bg-white/30 transition-colors">
                  <td className="px-4 py-3" style={{ fontSize: '0.875rem', fontWeight: 400, color: '#374151' }}>
                    {expense.supplier}
                  </td>
                  <td className="px-4 py-3" style={{ fontSize: '0.875rem', fontWeight: 400, color: '#374151' }}>
                    {expense.description}
                  </td>
                  <td className="px-4 py-3 text-right" style={{ fontSize: '0.875rem', fontWeight: 400, color: '#374151' }}>
                    {formatAmount(expense.amount)}
                  </td>
                  <td className="px-4 py-3 text-center" style={{ fontSize: '0.875rem', fontWeight: 400, color: '#374151' }}>
                    {expense.invoiceDate}
                  </td>
                  <td className="px-4 py-3 text-center" style={{ fontSize: '0.875rem', fontWeight: 400, color: '#374151' }}>
                    {expense.addedBy}
                  </td>
                </tr>
              ))}
              {/* Total Row */}
              <tr className="border-t-2 border-white/40 bg-white/40">
                <td colSpan={2} className="px-4 py-3 text-right" style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1F2937' }}>
                  TOTAL:
                </td>
                <td className="px-4 py-3 text-right" style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1F2937' }}>
                  {formatAmount(total)}
                </td>
                <td colSpan={2}></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}