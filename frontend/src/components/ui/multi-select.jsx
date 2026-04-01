import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown, X, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const MultiSelect = ({ 
  options = [], 
  value = [], 
  onChange, 
  placeholder = "Select options...",
  className,
  disabled = false,
  error = false,
  maxDisplay = 2
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const selectedOptions = options.filter(option => value.includes(option.value));
  const displayCount = selectedOptions.length;
  const hiddenCount = Math.max(0, displayCount - maxDisplay);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = (optionValue) => {
    const newValue = value.includes(optionValue)
      ? value.filter(v => v !== optionValue)
      : [...value, optionValue];
    onChange(newValue);
  };

  const handleRemove = (optionValue) => {
    onChange(value.filter(v => v !== optionValue));
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
        <div className="flex items-center space-x-2 flex-1 min-w-0">
          {displayCount === 0 ? (
            <span className="text-gray-500">{placeholder}</span>
          ) : (
            <div className="flex items-center space-x-2 flex-1 min-w-0">
              <Users className="h-4 w-4 text-gray-400 flex-shrink-0" />
              <div className="flex items-center space-x-1 flex-1 min-w-0">
                {selectedOptions.slice(0, maxDisplay).map((option) => (
                  <span
                    key={option.value}
                    className="inline-flex items-center space-x-1 bg-primary/10 text-primary px-2 py-1 rounded-lg text-xs font-medium"
                  >
                    <span className="truncate max-w-20">{option.label}</span>
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemove(option.value);
                      }}
                      className="hover:text-primary-dark cursor-pointer select-none"
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          e.stopPropagation();
                          handleRemove(option.value);
                        }
                      }}
                    >
                      <X className="h-3 w-3" />
                    </span>
                  </span>
                ))}
                {hiddenCount > 0 && (
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-lg">
                    +{hiddenCount} more
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
        <ChevronDown className={cn(
          "h-4 w-4 text-gray-400 transition-transform duration-200 flex-shrink-0",
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
            <div className="max-h-64 overflow-y-auto">
              {options.map((option, index) => (
                <motion.button
                  key={option.value}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                  type="button"
                  onClick={() => handleToggle(option.value)}
                  className={cn(
                    "flex w-full items-center justify-between px-4 py-3 text-left text-sm transition-colors duration-150",
                    "hover:bg-gray-50",
                    value.includes(option.value) && "bg-primary/5"
                  )}
                >
                  <div className="flex items-center space-x-3">
                    {option.avatar && (
                      <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center text-xs font-medium text-primary">
                        {option.avatar}
                      </div>
                    )}
                    {option.icon && <option.icon className="h-4 w-4" />}
                    <div>
                      <div className="font-medium">{option.label}</div>
                      {option.subtitle && (
                        <div className="text-xs text-gray-500">{option.subtitle}</div>
                      )}
                    </div>
                  </div>
                  {value.includes(option.value) && (
                    <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    </div>
                  )}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export { MultiSelect };
