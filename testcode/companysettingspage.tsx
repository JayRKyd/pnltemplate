// @ts-nocheck
import { useState } from 'react';
import { ArrowLeft, Upload, Plus, X, FileText, Calendar, ChevronRight, ChevronDown } from 'lucide-react';
import { CustomSelect } from './customselect';
import { FormattedAmount } from './formattedamount';

interface CompanySettingsPageProps {
  onBack: () => void;
}

interface ChartAccount {
  id: string;
  code: string;
  name: string;
  amount: number;
  vat: number;
  level: number;
  parentId?: string;
  subcategories?: ChartAccount[];
}

export function CompanySettingsPage({ onBack }: CompanySettingsPageProps) {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear.toString());
  const [selectedDate, setSelectedDate] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['1', '2', '3', '4', '5', '6']);

  // Mock data - planul de conturi cu structură arbore
  const chartOfAccounts: ChartAccount[] = [
    {
      id: '1',
      code: '1',
      name: 'Echipa',
      amount: 550000,
      vat: 0,
      level: 0,
      subcategories: [
        { id: '1.1', code: '1.1', name: 'Salarii', amount: 480000, vat: 0, level: 1, parentId: '1' },
        { id: '1.2', code: '1.2', name: 'Bonusuri', amount: 48000, vat: 0, level: 1, parentId: '1' },
        { id: '1.3', code: '1.3', name: 'Training', amount: 18000, vat: 3420, level: 1, parentId: '1' },
        { id: '1.4', code: '1.4', name: 'Team events', amount: 4000, vat: 760, level: 1, parentId: '1' },
      ]
    },
    {
      id: '2',
      code: '2',
      name: 'Marketing',
      amount: 18000,
      vat: 3420,
      level: 0,
      subcategories: [
        { id: '2.1', code: '20', name: 'Social media ads', amount: 0, vat: 0, level: 1, parentId: '2' },
        { id: '2.2', code: '21', name: 'Google ads', amount: 12000, vat: 2280, level: 1, parentId: '2' },
        { id: '2.3', code: '22', name: 'Fee agentie', amount: 6000, vat: 1140, level: 1, parentId: '2' },
      ]
    },
    {
      id: '3',
      code: '3',
      name: 'IT',
      amount: 28000,
      vat: 5320,
      level: 0,
      subcategories: [
        { id: '3.1', code: '5', name: 'Cloud hosting', amount: 18000, vat: 3420, level: 1, parentId: '3' },
        { id: '3.2', code: '6', name: 'Software licenses', amount: 10000, vat: 1900, level: 1, parentId: '3' },
      ]
    },
    {
      id: '4',
      code: '4',
      name: 'Sediu',
      amount: 66000,
      vat: 12540,
      level: 0,
      subcategories: [
        { id: '4.1', code: '7', name: 'Chirie', amount: 30000, vat: 5700, level: 1, parentId: '4' },
        { id: '4.2', code: '8', name: 'Utilitati', amount: 10000, vat: 1900, level: 1, parentId: '4' },
        { id: '4.3', code: '9', name: 'Investitii amenajare', amount: 25000, vat: 4750, level: 1, parentId: '4' },
        { id: '4.4', code: '10', name: 'Altele', amount: 1000, vat: 190, level: 1, parentId: '4' },
      ]
    },
    {
      id: '5',
      code: '5',
      name: 'Servicii',
      amount: 5000,
      vat: 950,
      level: 0,
      subcategories: [
        { id: '5.1', code: '417', name: 'Recurutare', amount: 2000, vat: 380, level: 1, parentId: '5' },
        { id: '5.2', code: '418', name: 'Contabilitate', amount: 2500, vat: 475, level: 1, parentId: '5' },
        { id: '5.3', code: '419', name: 'Avocati', amount: 500, vat: 95, level: 1, parentId: '5' },
        { id: '5.4', code: '420', name: 'Altele', amount: 0, vat: 0, level: 1, parentId: '5' },
      ]
    },
    {
      id: '6',
      code: '6',
      name: 'Altele',
      amount: 53000,
      vat: 1140,
      level: 0,
      subcategories: [
        { id: '6.1', code: '13', name: 'Asigurari', amount: 3000, vat: 570, level: 1, parentId: '6' },
        { id: '6.2', code: '14', name: 'Taxe si impozite', amount: 50000, vat: 570, level: 1, parentId: '6' },
      ]
    },
  ];

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const getTotalAmount = () => {
    return chartOfAccounts.reduce((sum, cat) => sum + cat.amount, 0);
  };

  const getTotalVat = () => {
    return chartOfAccounts.reduce((sum, cat) => sum + cat.vat, 0);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100/50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.08)] border border-gray-200/30 p-12 relative max-w-xl mx-auto">
          {/* Close button - top left inside card */}
          <button
            onClick={onBack}
            className="absolute top-6 left-6 p-2 bg-white/70 backdrop-blur-xl rounded-full shadow-[0_4px_16px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.1)] border border-gray-200/50 transition-all hover:bg-gray-100/70 z-10"
          >
            <X size={20} className="text-gray-600" />
          </button>

          {/* Title */}
          <h1 className="text-gray-900 mb-3 text-center" style={{ fontSize: '1.875rem', fontWeight: 600 }}>
            Curs valutar
          </h1>
          <p className="text-gray-600 mb-8 text-center" style={{ fontSize: '0.9375rem', fontWeight: 400 }}>
            Cursuri de schimb în RON
          </p>

          {/* Exchange Rates Table */}
          <div className="overflow-x-auto">
            <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-[0_4px_16px_rgba(0,0,0,0.06)] border border-gray-200/30">
              {/* Table Header */}
              <div 
                className="bg-gray-50/70 backdrop-blur-xl px-6 py-3 border-b border-gray-200/50"
                style={{ 
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '1.5rem',
                  paddingTop: '14px',
                  paddingBottom: '10px',
                  alignItems: 'center'
                }}
              >
                {/* Date Selector Button */}
                <div className="flex justify-center">
                  {selectedDate ? (
                    <div className="inline-flex items-center gap-2 bg-white/70 backdrop-blur-xl rounded-full px-4 py-2 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-300/50">
                      <span className="text-gray-900" style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                        {(() => {
                          const date = new Date(selectedDate);
                          const months = ['ian', 'feb', 'mar', 'apr', 'mai', 'iun', 'iul', 'aug', 'sep', 'oct', 'nov', 'dec'];
                          const day = date.getDate().toString().padStart(2, '0');
                          const month = months[date.getMonth()];
                          const year = date.getFullYear().toString().slice(-2);
                          return `${day}.${month}.${year}`;
                        })()}
                      </span>
                      <button
                        onClick={() => setSelectedDate('')}
                        className="p-0.5 hover:bg-gray-200/50 rounded-full transition-colors"
                      >
                        <X size={14} className="text-gray-600" />
                      </button>
                    </div>
                  ) : (
                    <div className="relative inline-block">
                      <div className="flex items-center gap-2 px-4 py-2 border border-gray-300/50 rounded-full bg-white/70 backdrop-blur-xl transition-all shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] text-gray-600 hover:text-gray-900 pointer-events-none">
                        <Calendar size={14} />
                        <span style={{ fontSize: '0.875rem', fontWeight: 400 }}>Data</span>
                      </div>
                      <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="absolute inset-0 opacity-0 cursor-pointer z-10"
                        style={{ width: '100%', height: '100%', pointerEvents: 'auto' }}
                      />
                    </div>
                  )}
                </div>
                
                <div className="text-center text-gray-600" style={{ fontSize: '0.9375rem', fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                  RON
                </div>
              </div>

              {/* Table Body */}
              <div>
                {/* EUR Row */}
                <div
                  className="px-6 border-b border-gray-200/30 hover:bg-gray-50/30 transition-colors"
                  style={{ 
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '1.5rem',
                    alignItems: 'center',
                    height: '50px'
                  }}
                >
                  <div className="text-center" style={{ fontSize: '0.875rem', fontWeight: 500, color: '#374151' }}>
                    EUR
                  </div>
                  <div className="text-center" style={{ fontSize: '0.875rem', fontWeight: 400, color: '#374151' }}>
                    4,9762
                  </div>
                </div>

                {/* USD Row */}
                <div
                  className="px-6 border-b border-gray-200/30 hover:bg-gray-50/30 transition-colors"
                  style={{ 
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '1.5rem',
                    alignItems: 'center',
                    height: '50px'
                  }}
                >
                  <div className="text-center" style={{ fontSize: '0.875rem', fontWeight: 500, color: '#374151' }}>
                    USD
                  </div>
                  <div className="text-center" style={{ fontSize: '0.875rem', fontWeight: 400, color: '#374151' }}>
                    4,8156
                  </div>
                </div>

                {/* GBP Row */}
                <div
                  className="px-6 hover:bg-gray-50/30 transition-colors"
                  style={{ 
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '1.5rem',
                    alignItems: 'center',
                    height: '50px'
                  }}
                >
                  <div className="text-center" style={{ fontSize: '0.875rem', fontWeight: 500, color: '#374151' }}>
                    GBP
                  </div>
                  <div className="text-center" style={{ fontSize: '0.875rem', fontWeight: 400, color: '#374151' }}>
                    6,0523
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Info Footer */}
          <div className="mt-8 text-center">
          </div>
        </div>
      </div>
    </div>
  );
}