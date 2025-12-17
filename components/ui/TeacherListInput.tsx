import React, { useState, useEffect } from 'react';

interface TeacherListInputProps {
  label: string;
  name: string;
  value: string; // Comma separated names
  countValue: string; // The expected total count from the other field
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; // Mimic standard event for compatibility
  error?: string;
  required?: boolean;
  className?: string;
}

export const TeacherListInput: React.FC<TeacherListInputProps> = ({
  label,
  name,
  value,
  countValue,
  onChange,
  error,
  required,
  className = "",
}) => {
  const [currentName, setCurrentName] = useState('');
  // Parse expected count. Default to 0 if invalid.
  const maxCount = parseInt(countValue, 10) || 0;
  
  // Parse current names from the comma-separated string
  const names = value ? value.split(',').map(s => s.trim()).filter(Boolean) : [];
  
  const isCountMet = names.length >= maxCount;
  const isCountExceeded = names.length > maxCount;

  // Internal handler to update parent state with comma-separated string
  const updateParent = (newNames: string[]) => {
    const stringValue = newNames.join(', ');
    // Create a synthetic event to match the parent's handleChange expectation
    const event = {
      target: {
        name,
        value: stringValue,
      },
    } as React.ChangeEvent<HTMLInputElement>;
    onChange(event);
  };

  const handleAdd = () => {
    if (!currentName.trim()) return;
    if (names.length >= maxCount) return;

    const newNames = [...names, currentName.trim()];
    updateParent(newNames);
    setCurrentName('');
  };

  const handleRemove = (index: number) => {
    const newNames = [...names];
    newNames.splice(index, 1);
    updateParent(newNames);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div className={`mb-8 ${className}`}>
      <label 
        htmlFor={name} 
        className={`block text-base font-medium mb-3 transition-colors duration-200 ${error ? 'text-red-600' : 'text-gray-700 dark:text-gray-300'}`}
      >
        {label}
        {required && <span className="text-red-500 ml-1 font-bold" aria-hidden="true">*</span>}
      </label>
      
      {/* Helper Text / Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between items-center text-sm mb-1.5">
          <span className={`font-semibold transition-colors duration-300 ${
              isCountExceeded 
                ? 'text-red-500' 
                : names.length === maxCount 
                  ? 'text-green-600 dark:text-green-400' 
                  : 'text-primary'
            }`}>
            {names.length} / {maxCount} teachers added
          </span>
          <span className="text-gray-400 text-xs uppercase tracking-wider font-semibold">
            {names.length < maxCount ? 'Action Required' : 'Completed'}
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
          <div 
            className={`h-2 rounded-full transition-all duration-500 ease-out ${
              isCountExceeded ? 'bg-red-500' : (names.length === maxCount ? 'bg-green-500' : 'bg-primary')
            }`}
            style={{ width: `${Math.min((names.length / Math.max(maxCount, 1)) * 100, 100)}%` }}
          ></div>
        </div>
      </div>

      {/* Input Group */}
      <div className="flex shadow-sm rounded-xl mb-5 group focus-within:ring-4 focus-within:ring-primary/10 transition-shadow">
        <input
          type="text"
          id={name + "-input"}
          value={currentName}
          onChange={(e) => setCurrentName(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isCountMet && !isCountExceeded}
          placeholder={isCountMet ? (maxCount === 0 ? "Set total teacher count above" : "✓ List complete") : "Type teacher name..."}
          className={`
            flex-1 min-w-0 block w-full px-5 py-3.5 rounded-l-xl border transition-all duration-200 text-base
            bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 outline-none
            ${error 
              ? 'border-red-500 placeholder-red-300' 
              : 'border-gray-300 dark:border-gray-600 focus:border-primary'}
            ${(isCountMet || maxCount === 0) ? 'bg-gray-50 dark:bg-gray-900 text-gray-400 cursor-not-allowed' : ''}
          `}
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={!currentName.trim() || isCountMet}
          className={`
            inline-flex items-center px-6 py-3.5 border border-l-0 rounded-r-xl 
            text-base font-bold text-white transition-all duration-200
            ${(!currentName.trim() || isCountMet)
              ? 'bg-gray-300 dark:bg-gray-700 border-gray-300 dark:border-gray-600 cursor-not-allowed' 
              : 'bg-primary border-primary hover:bg-blue-700 hover:shadow-md active:scale-95'}
          `}
        >
          <svg className={`h-6 w-6 mr-1 ${(!currentName.trim() || isCountMet) ? 'hidden' : 'block'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          Add
        </button>
      </div>

      {/* Name List - Modern Cards */}
      {names.length > 0 && (
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-2">
          {names.map((n, idx) => (
            <li 
              key={idx} 
              className="group flex justify-between items-center bg-white dark:bg-gray-700/40 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md hover:border-primary/30 transition-all duration-200 hover:-translate-y-0.5"
            >
              <div className="flex items-center overflow-hidden">
                <span className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-full bg-blue-50 dark:bg-blue-900/50 text-sm font-bold text-primary mr-3 border border-blue-100 dark:border-blue-800">
                  {idx + 1}
                </span>
                <span className="text-base font-medium text-gray-700 dark:text-gray-200 truncate">{n}</span>
              </div>
              <button
                type="button"
                onClick={() => handleRemove(idx)}
                className="p-1.5 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200 focus:outline-none opacity-60 group-hover:opacity-100"
                aria-label={`Remove ${n}`}
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Validation Error */}
      {(error || isCountExceeded) && (
        <div className="mt-3 flex items-start text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-100 dark:border-red-900/30">
          <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span className="font-medium">{error || (isCountExceeded ? `Limit reached: You listed more teachers than the total count (${maxCount}).` : "")}</span>
        </div>
      )}
      
      {/* Hidden input to ensure this field is focusable for standard validation scrolling */}
      <input 
        type="text" 
        name={name} 
        value={value} 
        readOnly 
        className="sr-only" 
        aria-invalid={!!error}
      />
    </div>
  );
};