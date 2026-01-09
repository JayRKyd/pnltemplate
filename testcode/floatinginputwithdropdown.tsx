import { useState } from 'react';

interface FloatingInputWithDropdownProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  suggestions?: string[];
  showDropdown?: boolean;
  onSelectSuggestion?: (suggestion: string) => void;
  className?: string;
  style?: React.CSSProperties;
}

export function FloatingInputWithDropdown({
  label,
  value,
  onChange,
  onBlur,
  suggestions = [],
  showDropdown = false,
  onSelectSuggestion,
  className = '',
  style,
}: FloatingInputWithDropdownProps) {
  const [isFocused, setIsFocused] = useState(false);
  const hasValue = value && value.length > 0;
  const isActive = isFocused || hasValue;

  return (
    <div className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => {
          setIsFocused(false);
          onBlur?.();
        }}
        className={`w-full h-12 px-4 pt-5 pb-1 border border-gray-300/40 bg-white/80 backdrop-blur-xl rounded-3xl text-gray-900 focus:outline-none focus:border-gray-400 shadow-[0_1px_3px_rgba(0,0,0,0.03)] transition-all ${className}`}
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

      {/* Dropdown suggestions */}
      {showDropdown && suggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white/95 backdrop-blur-xl rounded-2xl border border-gray-300/50 shadow-[0_4px_16px_rgba(0,0,0,0.12)] overflow-hidden z-50">
          {suggestions.map((suggestion, idx) => (
            <button
              key={idx}
              onClick={() => onSelectSuggestion?.(suggestion)}
              className="w-full px-4 py-3 text-left text-gray-900 hover:bg-teal-50/80 transition-colors"
              style={{ fontSize: '15px', fontWeight: 400 }}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}