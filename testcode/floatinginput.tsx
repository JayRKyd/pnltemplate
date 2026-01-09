import { useState } from 'react';

interface FloatingInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  className?: string;
  style?: React.CSSProperties;
  readOnly?: boolean;
  onClick?: () => void;
}

export function FloatingInput({
  label,
  value,
  onChange,
  type = 'text',
  className = '',
  style,
  readOnly = false,
  onClick,
}: FloatingInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const hasValue = value && value.length > 0;
  const isActive = isFocused || hasValue;

  return (
    <div className="relative">
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        readOnly={readOnly}
        onClick={onClick}
        className={`w-full h-12 px-4 pt-5 pb-1 border border-gray-300/40 bg-white/80 backdrop-blur-xl rounded-3xl text-gray-900 focus:outline-none focus:border-gray-400 shadow-[0_1px_3px_rgba(0,0,0,0.03)] transition-all ${
          readOnly ? 'cursor-pointer' : ''
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
    </div>
  );
}