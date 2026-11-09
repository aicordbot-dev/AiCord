'use client';

/**
 * src/components/discord-mock/SelectMenu.tsx
 * Authentic Discord select menu dropdown component.
 */

import React, { useState, useRef, useEffect } from 'react';

export interface SelectMenuOption {
  label: string;
  value: string;
  description?: string;
  emoji?: string;
  default?: boolean;
}

export interface DiscordSelectMenuProps {
  placeholder?: string;
  options: SelectMenuOption[];
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

export function DiscordSelectMenu({
  placeholder = 'Select an option...',
  options,
  value,
  onChange,
  disabled = false,
  className = '',
}: DiscordSelectMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value) ||
    options.find((opt) => opt.default);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (optionValue: string) => {
    if (disabled) return;
    setIsOpen(false);
    onChange?.(optionValue);
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-md bg-[#1E1F22] border border-[#2B2D31] hover:border-[#3F4147] text-left transition-colors select-none focus:outline-none focus:ring-1 focus:ring-[#5865F2] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {selectedOption ? (
            <>
              {selectedOption.emoji && (
                <span className="text-base shrink-0 leading-none">{selectedOption.emoji}</span>
              )}
              <span className="text-xs sm:text-sm font-sans font-medium text-gray-200 truncate">
                {selectedOption.label}
              </span>
            </>
          ) : (
            <span className="text-xs sm:text-sm font-sans text-gray-400 truncate">
              {placeholder}
            </span>
          )}
        </div>

        {/* Chevron Icon */}
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform duration-150 shrink-0 ${
            isOpen ? 'rotate-180 text-gray-200' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-md bg-[#2B2D31] border border-[#1E1F22] shadow-2xl overflow-hidden py-1 max-h-60 overflow-y-auto animate-in fade-in-50 zoom-in-95">
          {options.map((option) => {
            const isSelected = option.value === value;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => handleSelect(option.value)}
                className={`w-full flex items-center justify-between gap-3 px-3.5 py-2 text-left transition-colors select-none ${
                  isSelected
                    ? 'bg-[#35373C] text-white'
                    : 'text-gray-300 hover:bg-[#313338] hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  {option.emoji && (
                    <span className="text-base shrink-0 leading-none">{option.emoji}</span>
                  )}
                  <div className="min-w-0">
                    <div className="text-xs sm:text-sm font-medium font-sans truncate">
                      {option.label}
                    </div>
                    {option.description && (
                      <div className="text-[11px] text-gray-400 font-sans truncate">
                        {option.description}
                      </div>
                    )}
                  </div>
                </div>

                {isSelected && (
                  <svg
                    className="w-4 h-4 text-[#5865F2] shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default DiscordSelectMenu;
