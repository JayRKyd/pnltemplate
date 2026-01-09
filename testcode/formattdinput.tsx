import { useState, useRef, useEffect } from 'react';
import { formatAmount, parseAmount } from '../utils/formatters';

interface FormattedInputProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  style?: React.CSSProperties;
  placeholder?: string;
  readOnly?: boolean;
  suffix?: string;
  align?: 'left' | 'right' | 'center';
}

export function FormattedInput({ 
  value, 
  onChange, 
  className = '', 
  style = {},
  placeholder = '',
  readOnly = false,
  suffix = '',
  align = 'left'
}: FormattedInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Când nu e focalizat, afișăm valoarea formatată
  const displayValue = isFocused ? value : formatAmount(parseFloat(value) || 0);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Permitem doar cifre, punct, virgulă
    const newValue = e.target.value.replace(/[^\d.,]/g, '');
    onChange(newValue);
  };
  
  const handleFocus = () => {
    setIsFocused(true);
  };
  
  const handleBlur = () => {
    setIsFocused(false);
    // Formatăm valoarea când pierde focus-ul
    const numValue = parseFloat(value) || 0;
    onChange(numValue.toString());
  };

  // Split pentru zecimale mai mici
  const parts = displayValue.split(',');
  const integerPart = parts[0];
  const decimalPart = parts[1] || '00';
  
  // Calculăm fontSize-ul pentru zecimale
  const fontSize = style.fontSize || '0.9375rem';
  const baseFontSize = parseFloat(fontSize.toString());
  const unit = fontSize.toString().replace(/[\d.]/g, '');
  const decimalFontSize = `${baseFontSize - (unit === 'rem' ? 0.125 : 2)}${unit}`;

  // Determinăm clasa de aliniere
  const alignClass = align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';
  const justifyContent = align === 'right' ? 'flex-end' : align === 'center' ? 'center' : 'flex-start';

  return (
    <div className="relative">
      {readOnly ? (
        <div 
          className={`${className} flex items-center`}
          style={{ ...style, justifyContent }}
        >
          <span style={{ fontSize: style.fontSize, fontWeight: style.fontWeight }}>
            {integerPart},
            <span style={{ fontSize: decimalFontSize }}>{decimalPart}</span>
          </span>
        </div>
      ) : (
        <>
          <input
            ref={inputRef}
            type="text"
            value={isFocused ? value : ''}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={placeholder}
            className={`${className} ${alignClass} ${isFocused ? '' : 'text-transparent caret-gray-900'}`}
            style={style}
          />
          {!isFocused && (
            <div 
              className="absolute inset-0 flex items-center pointer-events-none"
              style={{ 
                paddingLeft: '1rem',
                paddingRight: '1rem',
                justifyContent 
              }}
            >
              <span style={{ fontSize: style.fontSize, fontWeight: style.fontWeight, color: 'rgb(17, 24, 39)' }}>
                {integerPart},
                <span style={{ fontSize: decimalFontSize }}>{decimalPart}</span>
              </span>
            </div>
          )}
        </>
      )}
      {suffix && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none flex items-center gap-[6px]">
          <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'rgb(107, 114, 128)' }}>
            Lei
          </span>
          <svg 
            width="12" 
            height="12" 
            viewBox="0 0 12 12" 
            className="inline-block"
          >
            <circle cx="6" cy="6" r="6" fill="url(#romanianFlag)" />
            <defs>
              <linearGradient id="romanianFlag" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#002B7F" />
                <stop offset="33.33%" stopColor="#002B7F" />
                <stop offset="33.33%" stopColor="#FCD116" />
                <stop offset="66.66%" stopColor="#FCD116" />
                <stop offset="66.66%" stopColor="#CE1126" />
                <stop offset="100%" stopColor="#CE1126" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      )}
    </div>
  );
}