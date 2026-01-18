// @ts-nocheck
"use client";

import React, { useState } from 'react';
import { Check, Plus, Search, ChevronDown, ChevronLeft, ChevronRight, Calendar, X } from 'lucide-react';

// Mock data for expenses
const mockExpenses = [
  { id: 1, status: 'Final', date: '15.mar.25', tip: 'Factura', furnizor: 'Expert Conta SRL', descriere: 'Servicii contabilitate - Trimestrul 1', suma: 1270.00, plata: false },
  { id: 2, status: 'Draft', date: '20.nov.25', tip: 'Factura', furnizor: 'OpenAI OpCo LLC', descriere: 'API Credits - ChatGPT & GPT-4', suma: 320.00, plata: true },
  { id: 3, status: 'Final', date: '18.nov.25', tip: 'Factura', furnizor: 'IKEA Business Romania', descriere: 'Mobilier birou - 4 birouri ergonomice', suma: 4899.00, plata: false },
  { id: 4, status: 'Recurent', date: '05.oct.25', tip: 'Factura', furnizor: 'Construct & Renovate SRL', descriere: 'Renovare spatiu lucru - Etaj 1', suma: 27000.00, plata: true },
  { id: 5, status: 'Final', date: '25.nov.25', tip: 'Factura', furnizor: 'Adobe Systems Software', descriere: 'Creative Cloud All Apps - 15 users', suma: 1259.00, plata: false },
  { id: 6, status: 'Draft', date: '22.nov.25', tip: 'Bon', furnizor: 'Trattoria Il Calcio', descriere: 'Team building lunch - 22 persoane', suma: 1450.00, plata: true },
  { id: 7, status: 'Final', date: '18.oct.25', tip: 'Factura', furnizor: 'Office Depot Romania', descriere: 'Materiale birou & papetarie', suma: 840.00, plata: false },
  { id: 8, status: 'Final', date: '12.oct.25', tip: 'Factura', furnizor: 'Google Ireland Limited', descriere: 'Google Workspace Business - 50 users', suma: 3850.00, plata: true },
  { id: 9, status: 'Recurent', date: '30.sep.25', tip: 'Factura', furnizor: 'Fan Courier SA', descriere: 'Servicii curierat septembrie', suma: 678.00, plata: false },
  { id: 10, status: 'Final', date: '15.sep.25', tip: 'Bon', furnizor: 'Starbucks Romania', descriere: 'Intalniri cu clienti & catering', suma: 445.00, plata: true },
  { id: 11, status: 'Final', date: '28.aug.25', tip: 'Factura', furnizor: 'Zoom Video Communications', descriere: 'Zoom Business - 20 host licenses', suma: 1890.00, plata: false },
  { id: 12, status: 'Draft', date: '10.aug.25', tip: 'Bon', furnizor: 'OMV Petrom SA', descriere: 'Combustibil auto - card flota', suma: 1520.00, plata: true },
  { id: 13, status: 'Final', date: '22.iul.25', tip: 'Factura', furnizor: 'AWS Europe SARL', descriere: 'Cloud hosting & storage infrastructure', suma: 2200.00, plata: false },
  { id: 14, status: 'Final', date: '05.iul.25', tip: 'Chitanta', furnizor: 'Carrefour Romania SA', descriere: 'Materiale prezentari & conferinte', suma: 585.00, plata: true },
  { id: 15, status: 'Final', date: '18.iun.25', tip: 'Factura', furnizor: 'Slack Technologies LLC', descriere: 'Slack Business+ - 45 users', suma: 1750.00, plata: false },
];

type StatusType = 'Final' | 'Draft' | 'Recurent';
type TabType = 'cheltuieli' | 'recurente';

interface FilterDropdownProps {
  label: string;
  icon?: React.ReactNode;
}

function FilterDropdown({ label, icon }: FilterDropdownProps) {
  return (
    <button className="flex items-center gap-2 px-4 py-2.5 rounded-full border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors bg-white">
      {icon}
      <span>{label}</span>
      <ChevronDown size={16} className="text-gray-400" />
    </button>
  );
}

function StatusBadge({ status }: { status: StatusType }) {
  const styles = {
    Final: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Draft: 'bg-amber-50 text-amber-700 border-amber-200',
    Recurent: 'bg-orange-50 text-orange-700 border-orange-200',
  };

  return (
    <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium border ${styles[status]}`}>
      {status}
    </span>
  );
}

function PaymentIcon({ paid }: { paid: boolean }) {
  if (paid) {
    return (
      <div className="w-7 h-7 rounded-full bg-emerald-50 flex items-center justify-center">
        <Check size={14} className="text-emerald-500" />
      </div>
    );
  }
  return (
    <div className="w-7 h-7 rounded-full bg-red-50 flex items-center justify-center">
      <X size={14} className="text-red-500" />
    </div>
  );
}

export function Cheltuieli() {
  const [activeTab, setActiveTab] = useState<TabType>('cheltuieli');
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const itemsPerPage = 15;
  const totalItems = 100;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const formatAmount = (amount: number) => {
    return amount.toLocaleString('ro-RO', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).replace('.', ',');
  };

  return (
    <div className="p-6 md:p-8 space-y-6 bg-gray-50/30 min-h-screen">
      {/* Top Section - Tabs & New Button */}
      <div className="flex items-center justify-between">
        {/* Tab Switcher */}
        <div className="flex items-center bg-gray-100 rounded-full p-1">
          <button
            onClick={() => setActiveTab('cheltuieli')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-medium transition-all ${
              activeTab === 'cheltuieli'
                ? 'bg-teal-500 text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {activeTab === 'cheltuieli' && <Check size={16} />}
            Cheltuieli
          </button>
          <button
            onClick={() => setActiveTab('recurente')}
            className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all ${
              activeTab === 'recurente'
                ? 'bg-teal-500 text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Recurente
          </button>
        </div>

        {/* New Expense Button */}
        <button className="flex items-center gap-2 px-5 py-2.5 bg-teal-500 hover:bg-teal-600 text-white font-medium rounded-full transition-colors shadow-sm">
          Decont Nou
          <Plus size={18} />
        </button>
      </div>

      {/* Filters Row */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <FilterDropdown label="Categorie" />
          <FilterDropdown label="Cont" />
          <FilterDropdown label="Data" icon={<Calendar size={16} className="text-gray-400" />} />
          <FilterDropdown label="Status" />
          <FilterDropdown label="Plata" />
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Furnizor, coleg sau tag"
            className="w-64 pl-11 pr-4 py-2.5 rounded-full border border-gray-200 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 bg-white"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100" style={{ backgroundColor: '#F9FAFBB2' }}>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Data
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Tip
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Furnizor
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Descriere
              </th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">
                <div className="flex flex-col items-end">
                  <span>Suma</span>
                  <span className="font-normal">fara TVA</span>
                </div>
              </th>
              <th className="px-6 py-4 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Plata
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {mockExpenses.map((expense) => (
              <tr 
                key={expense.id} 
                className="hover:bg-gray-50/50 transition-colors cursor-pointer"
              >
                <td className="px-6 py-4">
                  <StatusBadge status={expense.status as StatusType} />
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {expense.date}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {expense.tip}
                </td>
                <td className="px-6 py-4 text-sm font-medium text-gray-900">
                  {expense.furnizor}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 max-w-[250px] truncate">
                  {expense.descriere}
                </td>
                <td className="px-6 py-4 text-sm font-medium text-gray-900 text-right">
                  {formatAmount(expense.suma)}
                </td>
                <td className="px-6 py-4">
                  <div className="flex justify-center">
                    <PaymentIcon paid={expense.plata} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          Showing {itemsPerPage} of {totalItems} results
        </p>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={20} className="text-gray-400" />
          </button>

          {[1, 2, 3, 4, 5].map((page) => (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              className={`w-10 h-10 rounded-full text-sm font-medium transition-colors ${
                currentPage === page
                  ? 'bg-teal-500 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {page}
            </button>
          ))}

          <button 
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight size={20} className="text-gray-400" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default Cheltuieli;
