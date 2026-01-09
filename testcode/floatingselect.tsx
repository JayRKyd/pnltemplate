import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface FloatingSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  className?: string;
  style?: React.CSSProperties;
  hasError?: boolean;
}

export function FloatingSelect({
  label,
  value,
  onChange,
  options,
  className = '',
  style,
  hasError = false,
}: FloatingSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const hasValue = value && value.length > 0;
  const isActive = isFocused || isOpen || hasValue;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsFocused(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (option: string) => {
    onChange(option);
    setIsOpen(false);
    setIsFocused(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          setIsFocused(true);
        }}
        className={`w-full h-12 px-4 pt-5 pb-1 pr-10 border bg-white/80 backdrop-blur-xl rounded-3xl text-left focus:outline-none focus:border-gray-400 shadow-[0_1px_3px_rgba(0,0,0,0.03)] transition-all ${
          hasError ? 'border-red-400' : 'border-gray-300/40'
        } ${className}`}
        style={{ fontSize: '15px', fontWeight: 400, ...style }}
      >
        <span className={value ? 'text-gray-900' : 'text-transparent'}>
          {value || label}
        </span>
      </button>
      
      <label
        className={`absolute left-4 text-gray-400 pointer-events-none transition-all duration-200 ${
          isActive
            ? 'top-1.5 text-[11px]'
            : 'top-1/2 -translate-y-1/2 text-[15px]'
        }`}
        style={{ fontWeight: isActive ? 400 : 300 }}
      >
        {label}
      </label>

      <ChevronDown
        size={16}
        className={`absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 transition-transform duration-200 ${
          isOpen ? 'rotate-180' : ''
        }`}
      />

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white/95 backdrop-blur-xl rounded-2xl border border-gray-300/50 shadow-[0_4px_16px_rgba(0,0,0,0.12)] overflow-hidden z-50 max-h-64 overflow-y-auto">
          {options.map((option, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelect(option)}
              className="w-full px-4 py-3 text-left text-gray-900 hover:bg-teal-50/80 transition-colors"
              style={{ fontSize: '15px', fontWeight: 400 }}
            >
              {option}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}