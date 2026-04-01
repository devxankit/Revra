import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown, Check, Search, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Combobox = ({
  options = [],
  value,
  onChange,
  placeholder = "Select an option...",
  searchable = false,
  allowCustom = false,
  onAddCustom,
  className,
  disabled = false,
  error = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [customValue, setCustomValue] = useState('');
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  const filteredOptions = options.filter(option =>
    option && option.label && option.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedOption = options.find(option => option && option.value === value);

  useEffect(() => {
    // Debug logging for Combobox selection issues
    if (options.length > 0 && value && !selectedOption) {
      console.warn('Combobox: Value provided but no option found', { value, optionsSample: options.slice(0, 3) });
    }
    if (value) {

    }
  }, [value, options, selectedOption]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
        setCustomValue('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (option) => {
    onChange(option.value);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleAddCustom = () => {
    if (customValue.trim() && onAddCustom) {
      onAddCustom(customValue.trim());
      setCustomValue('');
      setIsOpen(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          "flex h-12 w-full items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 text-left text-sm transition-all duration-200",
          "hover:border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none",
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-50",
          error && "border-red-500 focus:border-red-500 focus:ring-red-500/20",
          className
        )}
      >
        <span className={cn(
          "truncate",
          !selectedOption && "text-gray-500"
        )}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown className={cn(
          "h-4 w-4 text-gray-400 transition-transform duration-200",
          isOpen && "rotate-180"
        )} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 right-0 z-50 mt-2 max-h-64 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg"
          >
            {searchable && (
              <div className="border-b border-gray-100 p-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-10 pr-3 text-sm focus:border-primary focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary/20"
                  />
                </div>
              </div>
            )}

            <div className="max-h-48 overflow-y-auto">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option, index) => (
                  <motion.button
                    key={option?.value || `option-${index}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    type="button"
                    onClick={() => handleSelect(option)}
                    className={cn(
                      "flex w-full items-center justify-between px-4 py-3 text-left text-sm transition-colors duration-150",
                      "hover:bg-gray-50",
                      value === option.value && "bg-primary/5 text-primary"
                    )}
                  >
                    <span className="flex items-center space-x-3">
                      {option.icon && <option.icon className="h-4 w-4" />}
                      <span>{option.label}</span>
                    </span>
                    {value === option.value && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </motion.button>
                ))
              ) : (
                <div className="px-4 py-3 text-sm text-gray-500">
                  No options found
                </div>
              )}
            </div>

            {allowCustom && onAddCustom && (
              <div className="border-t border-gray-100 p-3">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    placeholder="Add new..."
                    value={customValue}
                    onChange={(e) => setCustomValue(e.target.value)}
                    className="flex-1 rounded-lg border border-gray-200 bg-gray-50 py-2 px-3 text-sm focus:border-primary focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary/20"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustom}
                    disabled={!customValue.trim()}
                    className="rounded-lg bg-primary px-3 py-2 text-white transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary-dark"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export { Combobox };
