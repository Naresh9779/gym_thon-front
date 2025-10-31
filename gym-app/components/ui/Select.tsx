import React from 'react';

interface Option {
  value: string;
  label: string;
}

interface SelectProps {
  id?: string;
  label?: string;
  value?: string;
  onChange?: (value: string) => void;
  options: Option[];
  helper?: string;
  className?: string;
}

export default function Select({
  id,
  label,
  value,
  onChange,
  options,
  helper,
  className = '',
}: SelectProps) {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange?.(e.target.value);
  };

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={handleChange}
          className="input-field appearance-none pr-8"
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
          <svg className="h-4 w-4 text-gray-400" viewBox="0 0 20 20" fill="none" stroke="currentColor">
            <path d="M7 7l3-3 3 3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M7 13l3 3 3-3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
      {helper && <p className="mt-1 text-xs text-gray-500">{helper}</p>}
    </div>
  );
}
