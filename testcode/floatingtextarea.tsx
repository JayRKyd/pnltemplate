import { useState } from 'react';

interface FloatingTextareaProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function FloatingTextarea({
  label,
  value,
  onChange,
  rows = 4,
  className = '',
  style,
}: FloatingTextareaProps) {
  const [isFocused, setIsFocused] = useState(false);
  const hasValue = value && value.length > 0;
  const isActive = isFocused || hasValue;

  return (
    <div className="relative">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        rows={rows}
        className={`w-full px-4 pt-6 pb-3 border border-gray-300/40 bg-white/80 backdrop-blur-xl rounded-3xl text-gray-900 resize-none focus:outline-none focus:border-gray-400 shadow-[0_1px_3px_rgba(0,0,0,0.03)] transition-all ${className}`}
        style={{ fontSize: '15px', fontWeight: 400, lineHeight: '1.5', ...style }}
      />
      <label
        className={`absolute left-4 text-gray-400 pointer-events-none transition-all duration-200 ${
          isActive
            ? 'top-1.5 text-[11px]'
            : 'top-5 text-[15px]'
        }`}
        style={{ fontWeight: isActive ? 400 : 300 }}
      >
        {label}
      </label>
    </div>
  );
}