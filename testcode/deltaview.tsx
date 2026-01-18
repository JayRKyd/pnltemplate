// @ts-nocheck
import { useState } from 'react';
import React from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { CustomSelect } from './customselect';

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
  const [cheltuieliExpanded, setCheltuieliExpanded] = useState(true);

  const months = [
    'Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie',
    'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie'
  ];

  const monthsShort = [
    'IAN', 'FEB', 'MAR', 'APR', 'MAI', 'IUN',
    'IUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'
  ];

  // Generate Month-Year options for the dropdown (2024-2025)
  const monthYearOptions = [];
  [2024, 2025].forEach(year => {
    monthsShort.forEach((month, index) => {
      monthYearOptions.push({
        value: `${index}-${year}`,
        label: `${month} ${year}`
      });
    });
  });

  const handleMonthYearSelectChange = (value: string) => {
    const [month, year] = value.split('-').map(Number);
    onMonthYearChange(month, year);
  };

  const formatAmount = (amount: number) => {
    return Math.abs(amount).toLocaleString('ro-RO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  const formatPercent = (value: number) => {
    return value.toFixed(2) + ' %';
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

  // Profit rates
  const rataProfitMonth = venituriMonth > 0 ? (profitMonth / venituriMonth) * 100 : 0;
  const rataProfitYTD = venituriYTD > 0 ? (profitYTD / venituriYTD) * 100 : 0;
  const budgetRataProfitMonth = budgetVenituriMonth > 0 ? (budgetProfitMonth / budgetVenituriMonth) * 100 : 0;
  const budgetRataProfitYTD = budgetVenituriYTD > 0 ? (budgetProfitYTD / budgetVenituriYTD) * 100 : 0;

  // Delta colors logic
  const getDeltaColor = (delta: number, isExpense: boolean = false) => {
    if (delta === 0) return '#374151';
    if (isExpense) {
      return delta > 0 ? '#EF4444' : '#10B981';
    }
    return delta > 0 ? '#10B981' : '#EF4444';
  };

  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: '250px 1fr 1fr 1fr 1fr 1fr 1fr',
    alignItems: 'center'
  };

  return (
    <div className="bg-white rounded-[24px] shadow-sm border border-gray-100 overflow-hidden font-sans mx-auto max-w-[1100px]">
      {/* Top Controls Row */}
      <div className="px-8 py-6 flex items-center justify-between bg-white">
        <div className="flex items-center gap-4">
          <span className="text-[14px] font-medium text-gray-500">Luna:</span>
          <CustomSelect
            value={`${selectedMonth}-${selectedYear}`}
            onChange={handleMonthYearSelectChange}
            options={monthYearOptions}
            className="w-[140px] pl-4 py-2 border border-gray-200 bg-white rounded-full text-sm font-medium text-gray-700 shadow-sm focus:ring-2 focus:ring-blue-100 outline-none"
            style={{ paddingRight: '2rem' }}
          />
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[14px] font-medium text-gray-500">Valută:</span>
          <CustomSelect
            value={selectedCurrency}
            onChange={(value) => onCurrencyChange(value as 'EUR' | 'RON')}
            options={[{ value: 'EUR', label: 'EUR' }, { value: 'RON', label: 'RON' }]}
            className="w-[100px] pl-4 py-2 border border-gray-200 bg-white rounded-full text-sm font-medium text-gray-700 shadow-sm focus:ring-2 focus:ring-blue-100 outline-none"
            style={{ paddingRight: '2rem' }}
          />
        </div>
      </div>

      {/* Table Container */}
      <div className="px-8 pb-8">
        {/* Main Section Headers */}
        <div style={gridStyle}>
          {/* Monthly Section Header - spans first 4 columns (label + 3 data columns) */}
          <div 
            className="col-span-4 py-5 text-center text-[12px] font-bold text-gray-600 tracking-wider uppercase"
            style={{ backgroundColor: '#F9FAFB', gridColumn: '1 / 5' }}
          >
            {monthName} {selectedYear}
          </div>
          {/* YTD Section Header */}
          <div 
            className="col-span-3 py-5 text-center text-[12px] font-bold text-gray-600 tracking-wider uppercase"
            style={{ backgroundColor: '#F0FDFA', borderLeft: '3px solid #0EA5E9' }}
          >
            Year-To-{monthName} {selectedYear}
          </div>
        </div>

        {/* Column Label Headers */}
        <div style={gridStyle} className="mb-1">
          <div className="py-3"></div>
          {/* Monthly */}
          <div className="py-3 text-right text-[11px] font-bold text-gray-400 uppercase tracking-widest pr-6">Buget</div>
          <div className="py-3 text-right text-[11px] font-bold text-gray-400 uppercase tracking-widest pr-6">Realizat</div>
          <div className="py-3 text-right text-[11px] font-bold text-gray-400 uppercase tracking-widest pr-6">Delta</div>
          {/* YTD */}
          <div className="py-3 text-right text-[11px] font-bold text-gray-400 uppercase tracking-widest pr-6" style={{ borderLeft: '3px solid #0EA5E9' }}>Buget</div>
          <div className="py-3 text-right text-[11px] font-bold text-gray-400 uppercase tracking-widest pr-6">Realizat</div>
          <div className="py-3 text-right text-[11px] font-bold text-gray-400 uppercase tracking-widest pr-6">Delta</div>
        </div>

        {/* VENITURI Row */}
        {!cheltuieliExpanded && (
          <div style={{ backgroundColor: '#EFF6FF80', ...gridStyle }} className="hover:bg-blue-50/30 transition-colors">
            <div className="py-4 pl-2 text-[14px] font-bold text-gray-900 uppercase tracking-tight">Venituri</div>
            {/* Monthly */}
            <div className="py-4 text-right text-[14px] font-medium text-gray-600 pr-6">{formatAmount(budgetVenituriMonth)}</div>
            <div className="py-4 text-right text-[14px] font-medium text-gray-900 pr-6">{formatAmount(venituriMonth)}</div>
            <div className="py-4 text-right text-[14px] font-bold pr-6" style={{ color: getDeltaColor(venituriMonth - budgetVenituriMonth) }}>
              {(venituriMonth - budgetVenituriMonth) < 0 ? '-' : ''}{formatAmount(venituriMonth - budgetVenituriMonth)}
            </div>
            {/* YTD */}
            <div className="py-4 text-right text-[14px] font-medium text-gray-600 pr-6" style={{ borderLeft: '3px solid #0EA5E9' }}>{formatAmount(budgetVenituriYTD)}</div>
            <div className="py-4 text-right text-[14px] font-medium text-gray-900 pr-6">{formatAmount(venituriYTD)}</div>
            <div className="py-4 text-right text-[14px] font-bold pr-6" style={{ color: getDeltaColor(venituriYTD - budgetVenituriYTD) }}>
              {(venituriYTD - budgetVenituriYTD) < 0 ? '-' : ''}{formatAmount(venituriYTD - budgetVenituriYTD)}
            </div>
          </div>
        )}

        {/* CHELTUIELI Row */}
        <div 
          style={{ backgroundColor: '#FFF7ED', ...gridStyle }}
          className="cursor-pointer transition-colors"
          onClick={() => setCheltuieliExpanded(!cheltuieliExpanded)}
        >
          <div className="py-4 pl-2 text-[14px] font-bold text-gray-900 uppercase tracking-tight flex items-center gap-2">
            Cheltuieli
            {cheltuieliExpanded ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
          </div>
          {/* Monthly */}
          <div className="py-4 text-right text-[14px] font-medium text-gray-900 pr-6">{formatAmount(budgetCheltuieliMonth)}</div>
          <div className="py-4 text-right text-[14px] font-medium text-gray-900 pr-6">{formatAmount(cheltuieliMonth)}</div>
          <div className="py-4 text-right text-[14px] font-bold pr-6" style={{ color: getDeltaColor(cheltuieliMonth - budgetCheltuieliMonth, true) }}>
            {formatAmount(cheltuieliMonth - budgetCheltuieliMonth)}
          </div>
          {/* YTD */}
          <div className="py-4 text-right text-[14px] font-medium text-gray-900 pr-6" style={{ borderLeft: '3px solid #0EA5E9' }}>{formatAmount(budgetCheltuieliYTD)}</div>
          <div className="py-4 text-right text-[14px] font-medium text-gray-900 pr-6">{formatAmount(cheltuieliYTD)}</div>
          <div className="py-4 text-right text-[14px] font-bold pr-6" style={{ color: getDeltaColor(cheltuieliYTD - budgetCheltuieliYTD, true) }}>
            {formatAmount(cheltuieliYTD - budgetCheltuieliYTD)}
          </div>
        </div>

        {/* Gray bar separator */}
        {cheltuieliExpanded && (
          <div style={{ backgroundColor: '#E5E7EB66', height: '4px' }}></div>
        )}

        {/* Categories - Only show when expanded */}
        {cheltuieliExpanded && categories.map((category, index) => {
          const categoryMonth = category.values[monthIndex] || 0;
          const categoryYTD = calculateYTD(category.values);
          const budgetCategoryMonth = budgetCategories[index].values[monthIndex] || 0;
          const budgetCategoryYTD = calculateYTD(budgetCategories[index].values);
          const isExpanded = expandedCategories.includes(category.name);

          return (
            <React.Fragment key={category.name}>
              <div 
                className="hover:bg-gray-50 transition-colors cursor-pointer"
                style={{ backgroundColor: '#F0FDFA66', ...gridStyle }}
                onClick={() => category.subcategories && toggleCategory(category.name)}
              >
                <div className="py-4 pl-8 text-[14px] font-medium text-gray-800 flex items-center gap-2">
                  {category.subcategories && (
                    isExpanded ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400" />
                  )}
                  {category.name}
                </div>
                {/* Monthly */}
                <div className="py-4 text-right text-[14px] font-light text-gray-600 pr-6">{formatAmount(budgetCategoryMonth)}</div>
                <div className="py-4 text-right text-[14px] font-light text-gray-600 pr-6">{formatAmount(categoryMonth)}</div>
                <div className="py-4 text-right text-[14px] font-bold pr-6" style={{ color: getDeltaColor(categoryMonth - budgetCategoryMonth, true) }}>
                  {formatAmount(categoryMonth - budgetCategoryMonth)}
                </div>
                {/* YTD */}
                <div className="py-4 text-right text-[14px] font-light text-gray-600 pr-6" style={{ borderLeft: '3px solid #0EA5E9' }}>{formatAmount(budgetCategoryYTD)}</div>
                <div className="py-4 text-right text-[14px] font-light text-gray-600 pr-6">{formatAmount(categoryYTD)}</div>
                <div className="py-4 text-right text-[14px] font-bold pr-6" style={{ color: getDeltaColor(categoryYTD - budgetCategoryYTD, true) }}>
                  {formatAmount(categoryYTD - budgetCategoryYTD)}
                </div>
              </div>
              
              {/* Subcategories */}
              {isExpanded && category.subcategories && category.subcategories.map((sub) => {
                const subMonth = sub.values[monthIndex] || 0;
                const subYTD = calculateYTD(sub.values);
                const budgetSubMonth = Math.round(subMonth * 0.95);
                const budgetSubYTD = Math.round(subYTD * 0.95);

                return (
                  <div key={sub.name} style={{ backgroundColor: '#FAFAFA', ...gridStyle }}>
                    <div className="py-3 pl-14 text-[13px] text-gray-500">{sub.name}</div>
                    <div className="py-3 text-right text-[13px] text-gray-500 pr-6">{formatAmount(budgetSubMonth)}</div>
                    <div className="py-3 text-right text-[13px] text-gray-500 pr-6">{formatAmount(subMonth)}</div>
                    <div className="py-3 text-right text-[13px] font-medium pr-6" style={{ color: getDeltaColor(subMonth - budgetSubMonth, true) }}>
                      {formatAmount(subMonth - budgetSubMonth)}
                    </div>
                    <div className="py-3 text-right text-[13px] text-gray-500 pr-6" style={{ borderLeft: '3px solid #0EA5E9' }}>{formatAmount(budgetSubYTD)}</div>
                    <div className="py-3 text-right text-[13px] text-gray-500 pr-6">{formatAmount(subYTD)}</div>
                    <div className="py-3 text-right text-[13px] font-medium pr-6" style={{ color: getDeltaColor(subYTD - budgetSubYTD, true) }}>
                      {formatAmount(subYTD - budgetSubYTD)}
                    </div>
                  </div>
                );
              })}
            </React.Fragment>
          );
        })}

        {/* PROFIT Row */}
        {!cheltuieliExpanded && (
          <div style={{ backgroundColor: '#ECFDF580', ...gridStyle }} className="hover:bg-emerald-50/30 transition-colors">
            <div className="py-4 pl-2 text-[14px] font-bold text-gray-900 uppercase tracking-tight">Profit</div>
            {/* Monthly */}
            <div className="py-4 text-right text-[14px] font-medium text-gray-600 pr-6">{formatAmount(budgetProfitMonth)}</div>
            <div className="py-4 text-right text-[14px] font-medium text-gray-900 pr-6">{formatAmount(profitMonth)}</div>
            <div className="py-4 text-right text-[14px] font-bold pr-6" style={{ color: getDeltaColor(profitMonth - budgetProfitMonth) }}>
              {(profitMonth - budgetProfitMonth) < 0 ? '-' : ''}{formatAmount(profitMonth - budgetProfitMonth)}
            </div>
            {/* YTD */}
            <div className="py-4 text-right text-[14px] font-medium text-gray-600 pr-6" style={{ borderLeft: '3px solid #0EA5E9' }}>{formatAmount(budgetProfitYTD)}</div>
            <div className="py-4 text-right text-[14px] font-medium text-gray-900 pr-6">{formatAmount(profitYTD)}</div>
            <div className="py-4 text-right text-[14px] font-bold pr-6" style={{ color: getDeltaColor(profitYTD - budgetProfitYTD) }}>
              {(profitYTD - budgetProfitYTD) < 0 ? '-' : ''}{formatAmount(profitYTD - budgetProfitYTD)}
            </div>
          </div>
        )}

        {/* RATA PROFITULUI Row */}
        {!cheltuieliExpanded && (
          <div style={gridStyle} className="bg-white hover:bg-gray-50 transition-colors">
            <div className="py-4 pl-2 text-[14px] font-bold text-gray-900 uppercase tracking-tight">Rata Profitului</div>
            {/* Monthly */}
            <div className="py-4 text-right text-[14px] font-medium text-gray-600 pr-6">{formatPercent(budgetRataProfitMonth)}</div>
            <div className="py-4 text-right text-[14px] font-medium text-emerald-500 pr-6">{formatPercent(rataProfitMonth)}</div>
            <div className="py-4 text-right text-[14px] font-bold pr-6" style={{ color: getDeltaColor(rataProfitMonth - budgetRataProfitMonth) }}>
              {(rataProfitMonth - budgetRataProfitMonth) < 0 ? '-' : ''}{Math.abs(rataProfitMonth - budgetRataProfitMonth).toFixed(2)} %
            </div>
            {/* YTD */}
            <div className="py-4 text-right text-[14px] font-medium text-gray-600 pr-6" style={{ borderLeft: '3px solid #0EA5E9' }}>{formatPercent(budgetRataProfitYTD)}</div>
            <div className="py-4 text-right text-[14px] font-medium text-emerald-500 pr-6">{formatPercent(rataProfitYTD)}</div>
            <div className="py-4 text-right text-[14px] font-bold pr-6" style={{ color: getDeltaColor(rataProfitYTD - budgetRataProfitYTD) }}>
              {(rataProfitYTD - budgetRataProfitYTD) < 0 ? '-' : ''}{Math.abs(rataProfitYTD - budgetRataProfitYTD).toFixed(2)} %
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
