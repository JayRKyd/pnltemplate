"use client";

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { X, ChevronDown, Check } from 'lucide-react';

export default function NewRecurringExpensePage() {
  const params = useParams<{ teamId: string }>();
  const router = useRouter();
  
  const [activeStatus, setActiveStatus] = useState<'activ' | 'inactiv'>('activ');
  const [furnizor, setFurnizor] = useState('');
  const [sumaCuTVA, setSumaCuTVA] = useState('0,00');
  const [sumaFaraTVA, setSumaFaraTVA] = useState('0,00');
  const [tvaDeductibil, setTvaDeductibil] = useState('nu');
  const [cotaTVA, setCotaTVA] = useState('0.00%');
  const [cont, setCont] = useState('');
  const [subcont, setSubcont] = useState('');
  const [descriere, setDescriere] = useState('');

  const handleClose = () => {
    router.push(`/dashboard/${params.teamId}/expenses`);
  };

  const handleSave = () => {
    const data = {
      furnizor,
      sumaCuTVA,
      sumaFaraTVA,
      tvaDeductibil,
      cotaTVA,
      cont,
      subcont,
      descriere,
      status: activeStatus,
    };
    console.log('Saving recurring expense:', data);
    // TODO: Save to database
    router.push(`/dashboard/${params.teamId}/expenses`);
  };

  return (
    <div className="min-h-screen bg-gray-50/50 flex items-start justify-center pt-12 pb-12">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 w-full max-w-[700px] mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-gray-100">
          <button 
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} className="text-gray-400" />
          </button>
          
          <h2 className="text-lg font-semibold text-gray-800 tracking-wide">
            DECONT RECURENT
          </h2>
          
          {/* Activ/Inactiv Toggle */}
          <div className="flex items-center bg-gray-100 rounded-full p-1">
            <button
              onClick={() => setActiveStatus('activ')}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                activeStatus === 'activ'
                  ? 'bg-[#11C6B6] text-white'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {activeStatus === 'activ' && <Check size={14} />}
              Activ
            </button>
            <button
              onClick={() => setActiveStatus('inactiv')}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                activeStatus === 'inactiv'
                  ? 'bg-[#11C6B6] text-white'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Inactiv
            </button>
          </div>
        </div>

        {/* Form */}
        <div className="px-8 py-6 space-y-5">
          {/* Furnizor */}
          <div className="flex items-center gap-4">
            <label className="w-32 text-sm text-gray-600 shrink-0">Furnizor</label>
            <input
              type="text"
              value={furnizor}
              onChange={(e) => setFurnizor(e.target.value)}
              placeholder="Cauta dupa nume sau CUI"
              className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#11C6B6]/20 focus:border-[#11C6B6]"
            />
          </div>

          {/* Suma cu TVA & Suma fara TVA */}
          <div className="flex items-center gap-4">
            <label className="w-32 text-sm text-gray-600 shrink-0">Suma cu TVA</label>
            <div className="flex-1 relative">
              <input
                type="text"
                value={sumaCuTVA}
                onChange={(e) => setSumaCuTVA(e.target.value)}
                className="w-full px-4 py-3 pr-16 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#11C6B6]/20 focus:border-[#11C6B6]"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                <span className="text-sm text-gray-400">RON</span>
                <div className="w-3 h-3 rounded-full bg-orange-400"></div>
              </div>
            </div>
            
            <label className="w-28 text-sm text-gray-600 shrink-0 text-right">Suma fara TVA</label>
            <div className="flex-1 relative">
              <input
                type="text"
                value={sumaFaraTVA}
                onChange={(e) => setSumaFaraTVA(e.target.value)}
                className="w-full px-4 py-3 pr-16 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#11C6B6]/20 focus:border-[#11C6B6]"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                <span className="text-sm text-gray-400">RON</span>
                <div className="w-3 h-3 rounded-full bg-orange-400"></div>
              </div>
            </div>
          </div>

          {/* TVA Deductibil & Cota TVA */}
          <div className="flex items-center gap-4">
            <label className="w-32 text-sm text-gray-600 shrink-0">TVA Deductibil</label>
            <div className="flex-1 relative">
              <select
                value={tvaDeductibil}
                onChange={(e) => setTvaDeductibil(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-[#11C6B6]/20 focus:border-[#11C6B6]"
              >
                <option value="nu">Nu</option>
                <option value="da">Da</option>
              </select>
              <ChevronDown size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
            
            <label className="w-28 text-sm text-gray-600 shrink-0 text-right">Cota TVA (%)</label>
            <input
              type="text"
              value={cotaTVA}
              onChange={(e) => setCotaTVA(e.target.value)}
              className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#11C6B6]/20 focus:border-[#11C6B6]"
            />
          </div>

          {/* Cont & Subcont */}
          <div className="flex items-center gap-4">
            <label className="w-32 text-sm text-gray-600 shrink-0">Cont</label>
            <div className="flex-1 relative">
              <select
                value={cont}
                onChange={(e) => setCont(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-[#11C6B6]/20 focus:border-[#11C6B6] text-gray-500"
              >
                <option value="">- Please Choose -</option>
                <option value="operational">Operational</option>
                <option value="marketing">Marketing</option>
                <option value="development">Development</option>
              </select>
              <ChevronDown size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
            
            <label className="w-28 text-sm text-gray-600 shrink-0 text-right">Subcont</label>
            <div className="flex-1 relative">
              <select
                value={subcont}
                onChange={(e) => setSubcont(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-[#11C6B6]/20 focus:border-[#11C6B6] text-gray-500"
              >
                <option value="">- Please choose -</option>
                <option value="sub1">Subcont 1</option>
                <option value="sub2">Subcont 2</option>
              </select>
              <ChevronDown size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Descriere */}
          <div className="flex items-start gap-4">
            <label className="w-32 text-sm text-gray-600 shrink-0 pt-3">Descriere</label>
            <textarea
              value={descriere}
              onChange={(e) => setDescriere(e.target.value)}
              placeholder="Adauga descriere..."
              rows={3}
              className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-sm placeholder:text-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-[#11C6B6]/20 focus:border-[#11C6B6]"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-6 flex justify-center border-t border-gray-100">
          <button
            onClick={handleSave}
            className="px-10 py-3 bg-[#11C6B6] hover:bg-[#0FB2A3] text-white font-medium rounded-full transition-colors shadow-sm"
          >
            Salveaza
          </button>
        </div>
      </div>
    </div>
  );
}
