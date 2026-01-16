"use client";

import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';

interface MonthYearPickerProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  style?: React.CSSProperties;
}

export function MonthYearPicker({ value, onChange, className, style }: MonthYearPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [year, setYear] = useState(2025); // Default start year
  const dropdownRef = useRef<HTMLDivElement>(null);

  const months = [
    'Ianuarie', 'Februarie', 'Martie',
    'Aprilie', 'Mai', 'Iunie',
    'Iulie', 'August', 'Septembrie',
    'Octombrie', 'Noiembrie', 'Decembrie'
  ];

  // Parse current value if it exists
  useEffect(() => {
    if (value) {
      const parts = value.split(' ');
      if (parts.length === 2) {
        const y = parseInt(parts[1]);
        if (!isNaN(y)) setYear(y);
      }
    }
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMonthSelect = (month: string) => {
    onChange(`${month.toLowerCase()} ${year}`);
    setIsOpen(false);
  };

  const handlePrevYear = () => setYear(year - 1);
  const handleNextYear = () => setYear(year + 1);

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-4 py-2.5 bg-[#F8F9FA] border-none rounded-xl text-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-200 transition-all text-left flex items-center justify-between font-medium ${className}`}
        style={{ fontSize: "0.875rem", ...style }}
      >
        <span>{value || "Select month..."}</span>
        <ChevronDown size={16} className="text-gray-400" />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.08)] border border-gray-100 p-4 z-50 w-[320px] animate-in fade-in zoom-in-95 duration-100">
          {/* Year Header */}
          <div className="flex items-center justify-between mb-4 px-2">
            <button 
              onClick={handlePrevYear}
              className="p-1 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            
            <span className="text-gray-900 font-semibold text-lg">{year}</span>
            
            <button 
              onClick={handleNextYear}
              className="p-1 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Months Grid */}
          <div className="grid grid-cols-3 gap-2">
            {months.map((month) => {
              const isSelected = value?.toLowerCase() === `${month.toLowerCase()} ${year}`;
              return (
                <button
                  key={month}
                  onClick={() => handleMonthSelect(month)}
                  className={`
                    py-2.5 px-2 rounded-xl text-sm font-medium transition-all
                    ${isSelected 
                      ? 'bg-gray-100 text-gray-900' 
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }
                  `}
                >
                  {month}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
