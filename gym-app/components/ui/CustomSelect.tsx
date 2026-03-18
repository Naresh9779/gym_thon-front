"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check } from "lucide-react";

interface Option {
  value: string;
  label: string;
}

interface Props {
  value: string;
  onChange: (val: string) => void;
  options: Option[];
  placeholder?: string;
  className?: string;
  required?: boolean;
}

export default function CustomSelect({ value, onChange, options, placeholder = "Select…", className = "" }: Props) {
  const [open, setOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Only include real options (skip the empty-value placeholder option if passed in options)
  const realOptions = options.filter(o => o.value !== '');
  const hasEmptyOption = options.some(o => o.value === '');
  const selected = options.find(o => o.value === value);

  const calcPosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const dropdownHeight = Math.min(240, (realOptions.length + (hasEmptyOption ? 1 : 0)) * 44 + 8);
    const openUp = spaceBelow < dropdownHeight + 8;

    setDropdownStyle({
      position: 'fixed',
      left: rect.left,
      width: rect.width,
      zIndex: 9999,
      ...(openUp
        ? { bottom: window.innerHeight - rect.top + 4 }
        : { top: rect.bottom + 4 }),
    });
  }, [realOptions.length, hasEmptyOption]);

  const handleOpen = () => {
    calcPosition();
    setOpen(o => !o);
  };

  useEffect(() => {
    if (!open) return;
    const onScroll = () => { calcPosition(); };
    const onResize = () => { calcPosition(); };
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };
  }, [open, calcPosition]);

  useEffect(() => {
    if (!open) return;
    function onMouseDown(e: MouseEvent) {
      const target = e.target as Node;
      if (
        buttonRef.current && !buttonRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [open]);

  const dropdown = open && typeof window !== 'undefined' ? createPortal(
    <div
      ref={dropdownRef}
      style={dropdownStyle}
      className="bg-white rounded-2xl border border-gray-100 shadow-xl overflow-hidden"
    >
      <div className="max-h-60 overflow-y-auto py-1">
        {/* Empty / placeholder option */}
        {hasEmptyOption && (
          <button
            type="button"
            onClick={() => { onChange(''); setOpen(false); }}
            className={`w-full px-4 py-2.5 text-left text-sm font-medium transition-colors flex items-center justify-between gap-2 ${
              value === '' ? 'bg-black text-[#00E676]' : 'text-gray-400 hover:bg-gray-50'
            }`}
          >
            <span>{options.find(o => o.value === '')?.label ?? placeholder}</span>
            {value === '' && <Check className="w-3.5 h-3.5 flex-shrink-0" />}
          </button>
        )}
        {realOptions.map(opt => (
          <button
            key={opt.value}
            type="button"
            onClick={() => { onChange(opt.value); setOpen(false); }}
            className={`w-full px-4 py-2.5 text-left text-sm font-bold transition-colors flex items-center justify-between gap-2 ${
              value === opt.value ? 'bg-black text-[#00E676]' : 'text-gray-800 hover:bg-gray-50'
            }`}
          >
            <span className="truncate">{opt.label}</span>
            {value === opt.value && <Check className="w-3.5 h-3.5 flex-shrink-0" />}
          </button>
        ))}
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <div className={`relative ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleOpen}
        className={`w-full flex items-center justify-between px-3 py-2.5 border-2 rounded-xl bg-white text-sm font-medium text-left transition-all hover:border-gray-300 focus:outline-none ${
          open ? 'border-gray-900' : 'border-gray-200'
        }`}
      >
        <span className={selected && selected.value !== '' ? 'text-gray-900 font-bold' : 'text-gray-400'}>
          {selected && selected.value !== '' ? selected.label : placeholder}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {dropdown}
    </div>
  );
}
