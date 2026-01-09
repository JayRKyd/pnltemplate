// @ts-nocheck
import { useState } from 'react';
import React from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { CustomSelect } from './customselect';
import { MonthYearPicker } from './monthyearpicker';

interface Category {
  name: string;
  values: number[];
  subcategories?: { name: string; values: number[] }[];
}

interface DeltaViewProps {
  selectedMonth: number;
  selectedYear: number;
  selectedCurrency: 'EUR' | 'RON';
  venituri: number[];
  cheltuieli: number[];
  categories: Category[];
  onMonthYearChange: (month: number, year: number) => void;
  onCurrencyChange: (currency: 'EUR' | 'RON') => void;
}

export function DeltaView({
  selectedMonth,
  selectedYear,
  selectedCurrency,
  venituri,
  cheltuieli,
  categories,
  onMonthYearChange,
  onCurrencyChange
}: DeltaViewProps) {
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [cheltuieliExpanded, setCheltuieliExpanded] = useState(false);

  const months = [
    'Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie',
    'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie'
  ];

  const formatAmount = (amount: number) => {
    return amount.toLocaleString('ro-RO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  // Budget data (5% higher for revenue, 5% lower for expenses)
  const budgetVenituri = venituri.map(v => Math.round(v * 1.05));
  const budgetCheltuieli = cheltuieli.map(c => Math.round(c * 0.95));
  const budgetCategories = categories.map(cat => ({
    ...cat,
    values: cat.values.map(v => Math.round(v * 0.95)),
    subcategories: cat.subcategories?.map(sub => ({
      ...sub,
      values: sub.values.map(v => Math.round(v * 0.95))
    }))
  }));

  // Get index for selected month based on year
  const getMonthIndex = () => {
    return selectedYear === 2025 ? selectedMonth + 12 : selectedMonth;
  };

  const monthIndex = getMonthIndex();

  // Calculate Year-To-Date (YTD) - sum from start of year to selected month
  const calculateYTD = (values: number[]) => {
    const startIndex = selectedYear === 2025 ? 12 : 0;
    const endIndex = monthIndex;
    let sum = 0;
    for (let i = startIndex; i <= endIndex; i++) {
      sum += values[i] || 0;
    }
    return sum;
  };

  const toggleCategory = (categoryName: string) => {
    setExpandedCategories(prev =>
      prev.includes(categoryName)
        ? prev.filter(name => name !== categoryName)
        : [...prev, categoryName]
    );
  };

  const CurrencyFlag = () => {
    if (selectedCurrency === 'RON') {
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

  // Calculate values
  const venituriMonth = venituri[monthIndex] || 0;
  const venituriYTD = calculateYTD(venituri);
  const budgetVenituriMonth = budgetVenituri[monthIndex] || 0;
  const budgetVenituriYTD = calculateYTD(budgetVenituri);

  const cheltuieliMonth = cheltuieli[monthIndex] || 0;
  const cheltuieliYTD = calculateYTD(cheltuieli);
  const budgetCheltuieliMonth = budgetCheltuieli[monthIndex] || 0;
  const budgetCheltuieliYTD = calculateYTD(budgetCheltuieli);

  const profitMonth = venituriMonth - cheltuieliMonth;
  const profitYTD = venituriYTD - cheltuieliYTD;
  const budgetProfitMonth = budgetVenituriMonth - budgetCheltuieliMonth;
  const budgetProfitYTD = budgetVenituriYTD - budgetCheltuieliYTD;

  const monthName = months[selectedMonth];

  // Helper function to get delta color
  const getDeltaColor = (delta: number, forProfit: boolean) => {
    if (delta === 0) return '#4B5563';
    if (forProfit) {
      return delta > 0 ? '#16A34A' : '#DC2626';
    } else {
      return delta < 0 ? '#16A34A' : '#DC2626';
    }
  };

  // Render a simple data row
  const renderSimpleRow = (
    label: string,
    budgetMonth: number,
    realizatMonth: number,
    budgetYTD: number,
    realizatYTD: number,
    isProfit: boolean = false,
    bgColor?: string
  ) => {
    const deltaMonth = realizatMonth - budgetMonth;
    const deltaYTD = realizatYTD - budgetYTD;

    return (
      <tr className={`border-b border-gray-200/20 ${bgColor || ''}`}>
        <td className="px-4 py-3" style={{ fontSize: '16px', fontWeight: 600, color: '#1F2937' }}>
          {label}
        </td>
        <td className="px-3 py-3 text-right" style={{ fontSize: '16px', fontWeight: 600, color: '#4B5563' }}>
          {formatAmount(budgetMonth)}
        </td>
        <td className="px-3 py-3 text-right" style={{ fontSize: '16px', fontWeight: 600, color: '#4B5563' }}>
          {formatAmount(realizatMonth)}
        </td>
        <td className="px-3 py-3 text-right" style={{ fontSize: '16px', fontWeight: 600, color: getDeltaColor(deltaMonth, isProfit) }}>
          {deltaMonth < 0 ? '-' : ''}{formatAmount(Math.abs(deltaMonth))}
        </td>
        {/* YTD columns with vertical separator */}
        <td className="px-3 py-3 text-right border-l-2 border-blue-200/50" style={{ fontSize: '16px', fontWeight: 600, color: '#4B5563' }}>
          {formatAmount(budgetYTD)}
        </td>
        <td className="px-3 py-3 text-right" style={{ fontSize: '16px', fontWeight: 600, color: '#4B5563' }}>
          {formatAmount(realizatYTD)}
        </td>
        <td className="px-3 py-3 text-right" style={{ fontSize: '16px', fontWeight: 600, color: getDeltaColor(deltaYTD, isProfit) }}>
          {deltaYTD < 0 ? '-' : ''}{formatAmount(Math.abs(deltaYTD))}
        </td>
      </tr>
    );
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white/60 backdrop-blur-2xl rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.04)] border border-white/50 overflow-hidden">
        {/* Filters Row - Inside Card */}
        <div className="px-6 py-5 border-b border-gray-200/30 flex items-center gap-4 bg-gray-50/30">
          <div className="flex items-center gap-3">
            <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#6B7280' }}>Luna:</span>
            <MonthYearPicker
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
              onChange={onMonthYearChange}
            />
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-3">
            <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#6B7280' }}>Valută:</span>
            <CustomSelect
              value={selectedCurrency}
              onChange={(value) => onCurrencyChange(value as 'EUR' | 'RON')}
              options={['EUR', 'RON']}
              className="w-[118px] px-6 py-1.5 border border-gray-300/50 bg-white/70 backdrop-blur-xl rounded-full text-gray-900 focus:outline-none focus:border-gray-400 transition-all shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
              style={{ fontSize: '13px', fontWeight: 400 }}
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto px-6 pb-6">
          <table className="w-full" style={{ tableLayout: 'auto', minWidth: '900px' }}>
            <thead>
              {/* Main header row with month and YTD sections */}
              <tr className="border-b border-gray-200/30">
                <th className="px-4 py-4 text-left bg-gradient-to-br from-gray-50/80 to-gray-100/60" style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', width: '180px' }}>
                </th>
                {/* Month Section */}
                <th colSpan={3} className="px-3 py-4 text-center bg-gradient-to-br from-blue-50/60 to-purple-50/40" style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {monthName} {selectedYear}
                </th>
                {/* YTD Section */}
                <th colSpan={3} className="px-3 py-4 text-center bg-gradient-to-br from-teal-50/50 to-emerald-50/40 border-l-2 border-blue-200/50" style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Year-To-{monthName} {selectedYear}
                </th>
              </tr>
              {/* Subheader row with column labels */}
              <tr className="border-b border-gray-200/50">
                <th className="px-4 py-3 text-left bg-white/40" style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                </th>
                {/* Month columns */}
                <th className="px-3 py-3 text-right bg-white/40" style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', width: '110px' }}>
                  Buget
                </th>
                <th className="px-3 py-3 text-right bg-white/40" style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', width: '110px' }}>
                  Realizat
                </th>
                <th className="px-3 py-3 text-right bg-white/40" style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', width: '110px' }}>
                  Delta
                </th>
                {/* YTD columns */}
                <th className="px-3 py-3 text-right bg-white/40 border-l-2 border-blue-200/50" style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', width: '110px' }}>
                  Buget
                </th>
                <th className="px-3 py-3 text-right bg-white/40" style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', width: '110px' }}>
                  Realizat
                </th>
                <th className="px-3 py-3 text-right bg-white/40" style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', width: '110px' }}>
                  Delta
                </th>
              </tr>
            </thead>
            <tbody>
              {/* Venituri - Only show when not expanded */}
              {!cheltuieliExpanded && renderSimpleRow('VENITURI', budgetVenituriMonth, venituriMonth, budgetVenituriYTD, venituriYTD, true, 'bg-blue-50/50')}
              
              {/* Cheltuieli - Always show, but clickable */}
              <tr 
                className="border-b border-gray-200/30 bg-orange-50/60 hover:bg-orange-100/50 transition-colors cursor-pointer"
                onClick={() => setCheltuieliExpanded(!cheltuieliExpanded)}
              >
                <td className="px-4 py-3" style={{ fontSize: '16px', fontWeight: 600, color: '#1F2937', textTransform: 'uppercase' }}>
                  <div className="flex items-center gap-2">
                    Cheltuieli
                    {cheltuieliExpanded ? <ChevronDown size={16} className="text-gray-500" /> : <ChevronRight size={16} className="text-gray-500" />}
                  </div>
                </td>
                {/* Month columns */}
                <td className="px-3 py-3 text-right" style={{ fontSize: '16px', fontWeight: 600, color: '#4B5563' }}>
                  {formatAmount(budgetCheltuieliMonth)}
                </td>
                <td className="px-3 py-3 text-right" style={{ fontSize: '16px', fontWeight: 600, color: '#4B5563' }}>
                  {formatAmount(cheltuieliMonth)}
                </td>
                <td className="px-3 py-3 text-right" style={{ fontSize: '16px', fontWeight: 600, color: getDeltaColor(cheltuieliMonth - budgetCheltuieliMonth, false) }}>
                  {(cheltuieliMonth - budgetCheltuieliMonth) < 0 ? '-' : ''}{formatAmount(Math.abs(cheltuieliMonth - budgetCheltuieliMonth))}
                </td>
                {/* YTD columns with vertical separator */}
                <td className="px-3 py-3 text-right border-l-2 border-blue-200/50" style={{ fontSize: '16px', fontWeight: 600, color: '#4B5563' }}>
                  {formatAmount(budgetCheltuieliYTD)}
                </td>
                <td className="px-3 py-3 text-right" style={{ fontSize: '16px', fontWeight: 600, color: '#4B5563' }}>
                  {formatAmount(cheltuieliYTD)}
                </td>
                <td className="px-3 py-3 text-right" style={{ fontSize: '16px', fontWeight: 600, color: getDeltaColor(cheltuieliYTD - budgetCheltuieliYTD, false) }}>
                  {(cheltuieliYTD - budgetCheltuieliYTD) < 0 ? '-' : ''}{formatAmount(Math.abs(cheltuieliYTD - budgetCheltuieliYTD))}
                </td>
              </tr>
              
              {/* Profit - Only show when not expanded */}
              {!cheltuieliExpanded && renderSimpleRow('PROFIT', budgetProfitMonth, profitMonth, budgetProfitYTD, profitYTD, true, 'bg-emerald-50/50')}
              
              {/* Rata profitului - Only show when not expanded */}
              {!cheltuieliExpanded && (
              <tr className="border-b border-gray-200/50 bg-gray-50/30">
                <td className="px-4 py-3" style={{ fontSize: '16px', fontWeight: 600, color: '#1F2937', textTransform: 'uppercase' }}>
                  Rata profitului
                </td>
                {/* Month columns */}
                <td className="px-3 py-3 text-right" style={{ fontSize: '16px', fontWeight: 600, color: '#4B5563' }}>
                  {budgetVenituriMonth > 0 ? ((budgetProfitMonth / budgetVenituriMonth) * 100).toFixed(2) : '0.00'} %
                </td>
                <td className="px-3 py-3 text-right" style={{ fontSize: '16px', fontWeight: 600, color: profitMonth > 0 ? '#16A34A' : '#4B5563' }}>
                  {venituriMonth > 0 ? ((profitMonth / venituriMonth) * 100).toFixed(2) : '0.00'} %
                </td>
                <td className="px-3 py-3 text-right" style={{ fontSize: '16px', fontWeight: 600, color: '#4B5563' }}>
                  {venituriMonth > 0 ? (((profitMonth / venituriMonth) - (budgetProfitMonth / budgetVenituriMonth)) * 100).toFixed(2) : '0.00'} %
                </td>
                {/* YTD columns with vertical separator */}
                <td className="px-3 py-3 text-right border-l-2 border-blue-200/50" style={{ fontSize: '16px', fontWeight: 600, color: '#4B5563' }}>
                  {budgetVenituriYTD > 0 ? ((budgetProfitYTD / budgetVenituriYTD) * 100).toFixed(2) : '0.00'} %
                </td>
                <td className="px-3 py-3 text-right" style={{ fontSize: '16px', fontWeight: 600, color: profitYTD > 0 ? '#16A34A' : '#4B5563' }}>
                  {venituriYTD > 0 ? ((profitYTD / venituriYTD) * 100).toFixed(2) : '0.00'} %
                </td>
                <td className="px-3 py-3 text-right" style={{ fontSize: '16px', fontWeight: 600, color: venituriYTD > 0 && ((profitYTD / venituriYTD) - (budgetProfitYTD / budgetVenituriYTD)) > 0 ? '#16A34A' : '#DC2626' }}>
                  {venituriYTD > 0 ? (((profitYTD / venituriYTD) - (budgetProfitYTD / budgetVenituriYTD)) * 100).toFixed(2) : '0.00'} %
                </td>
              </tr>
              )}

              {/* Separator row - Only show when expanded */}
              {cheltuieliExpanded && (
              <tr>
                <td colSpan={7} className="bg-gray-200/40" style={{ height: '8px' }}></td>
              </tr>
              )}

              {/* Categories - Only show when expanded */}
              {cheltuieliExpanded && categories.map((category, index) => {
                const categoryMonth = category.values[monthIndex] || 0;
                const categoryYTD = calculateYTD(category.values);
                const budgetCategoryMonth = budgetCategories[index].values[monthIndex] || 0;
                const budgetCategoryYTD = calculateYTD(budgetCategories[index].values);
                const isExpanded = expandedCategories.includes(category.name);
                const deltaMonth = categoryMonth - budgetCategoryMonth;
                const deltaYTD = categoryYTD - budgetCategoryYTD;

                return (
                  <React.Fragment key={category.name}>
                    <tr 
                      className="border-b border-gray-200/20 bg-teal-50/40 hover:bg-teal-50/60 transition-colors cursor-pointer"
                      onClick={() => category.subcategories && toggleCategory(category.name)}
                    >
                      <td className="px-4 py-3 pl-6" style={{ fontSize: '15px', fontWeight: 500, color: '#1F2937' }}>
                        <div className="flex items-center gap-2">
                          {category.subcategories && (
                            isExpanded ? <ChevronDown size={16} className="text-gray-500" /> : <ChevronRight size={16} className="text-gray-500" />
                          )}
                          {category.name}
                        </div>
                      </td>
                      {/* Month columns */}
                      <td className="px-3 py-3 text-right" style={{ fontSize: '15px', fontWeight: 400, color: '#4B5563' }}>
                        {formatAmount(budgetCategoryMonth)}
                      </td>
                      <td className="px-3 py-3 text-right" style={{ fontSize: '15px', fontWeight: 400, color: '#4B5563' }}>
                        {formatAmount(categoryMonth)}
                      </td>
                      <td className="px-3 py-3 text-right" style={{ fontSize: '15px', fontWeight: 600, color: getDeltaColor(deltaMonth, false) }}>
                        {deltaMonth < 0 ? '-' : ''}{formatAmount(Math.abs(deltaMonth))}
                      </td>
                      {/* YTD columns with vertical separator */}
                      <td className="px-3 py-3 text-right border-l-2 border-blue-200/50" style={{ fontSize: '15px', fontWeight: 400, color: '#4B5563' }}>
                        {formatAmount(budgetCategoryYTD)}
                      </td>
                      <td className="px-3 py-3 text-right" style={{ fontSize: '15px', fontWeight: 400, color: '#4B5563' }}>
                        {formatAmount(categoryYTD)}
                      </td>
                      <td className="px-3 py-3 text-right" style={{ fontSize: '15px', fontWeight: 600, color: getDeltaColor(deltaYTD, false) }}>
                        {deltaYTD < 0 ? '-' : ''}{formatAmount(Math.abs(deltaYTD))}
                      </td>
                    </tr>
                    
                    {/* Subcategories */}
                    {isExpanded && category.subcategories && category.subcategories.map((sub) => {
                      const subMonth = sub.values[monthIndex] || 0;
                      const subYTD = calculateYTD(sub.values);
                      const budgetSubMonth = Math.round(subMonth * 0.95);
                      const budgetSubYTD = Math.round(subYTD * 0.95);
                      const subDeltaMonth = subMonth - budgetSubMonth;
                      const subDeltaYTD = subYTD - budgetSubYTD;

                      return (
                        <tr key={sub.name} className="border-b border-gray-200/10 bg-gray-50/30">
                          <td className="px-4 py-2.5 pl-12" style={{ fontSize: '13px', fontWeight: 300, color: '#6B7280' }}>
                            {sub.name}
                          </td>
                          {/* Month columns */}
                          <td className="px-3 py-2.5 text-right" style={{ fontSize: '13px', fontWeight: 300, color: '#6B7280' }}>
                            {formatAmount(budgetSubMonth)}
                          </td>
                          <td className="px-3 py-2.5 text-right" style={{ fontSize: '13px', fontWeight: 300, color: '#6B7280' }}>
                            {formatAmount(subMonth)}
                          </td>
                          <td className="px-3 py-2.5 text-right" style={{ fontSize: '13px', fontWeight: 500, color: getDeltaColor(subDeltaMonth, false) }}>
                            {subDeltaMonth < 0 ? '-' : ''}{formatAmount(Math.abs(subDeltaMonth))}
                          </td>
                          {/* YTD columns with vertical separator */}
                          <td className="px-3 py-2.5 text-right border-l-2 border-blue-200/50" style={{ fontSize: '13px', fontWeight: 300, color: '#6B7280' }}>
                            {formatAmount(budgetSubYTD)}
                          </td>
                          <td className="px-3 py-2.5 text-right" style={{ fontSize: '13px', fontWeight: 300, color: '#6B7280' }}>
                            {formatAmount(subYTD)}
                          </td>
                          <td className="px-3 py-2.5 text-right" style={{ fontSize: '13px', fontWeight: 500, color: getDeltaColor(subDeltaYTD, false) }}>
                            {subDeltaYTD < 0 ? '-' : ''}{formatAmount(Math.abs(subDeltaYTD))}
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}