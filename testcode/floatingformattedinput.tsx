import { useState } from 'react';

interface FloatingFormattedInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  className?: string;
  style?: React.CSSProperties;
  suffix?: React.ReactNode;
}

export function FloatingFormattedInput({
  label,
  value,
  onChange,
  readOnly = false,
  className = '',
  style,
  suffix,
}: FloatingFormattedInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [displayValue, setDisplayValue] = useState('');

  const hasValue = value && value.length > 0 && parseFloat(value) !== 0;
  const isActive = isFocused || hasValue;

  const formatNumber = (num: string) => {
    if (!num || num === '0') return '';
    const number = parseFloat(num);
    if (isNaN(number)) return '';
    return number.toLocaleString('ro-RO', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const handleFocus = () => {
    setIsFocused(true);
    setDisplayValue(value);
  };

  const handleBlur = () => {
    setIsFocused(false);
    setDisplayValue('');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/[^\d.-]/g, '');
    onChange(rawValue);
    setDisplayValue(rawValue);
  };

  return (
    <div className="relative">
      <input
        type="text"
        value={isFocused ? displayValue : formatNumber(value)}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        readOnly={readOnly}
        className={`w-full h-12 px-4 pt-5 pb-1 pr-20 border border-gray-300/40 bg-white/80 backdrop-blur-xl rounded-3xl text-gray-900 focus:outline-none focus:border-gray-400 shadow-[0_1px_3px_rgba(0,0,0,0.03)] transition-all ${
          readOnly ? 'cursor-not-allowed bg-gray-50/70' : ''
        } ${className}`}
        style={{ fontSize: '15px', fontWeight: 400, ...style }}
      />
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
      {suffix && (
        <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
          {suffix}
        </div>
      )}
    </div>
  );
}