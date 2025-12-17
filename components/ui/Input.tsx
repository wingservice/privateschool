import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  name: string;
  error?: string;
  required?: boolean;
}

export const Input: React.FC<InputProps> = ({ 
  label, 
  name, 
  error, 
  required, 
  className = "", 
  ...props 
}) => {
  return (
    <div className="mb-6 relative group">
      <label 
        htmlFor={name} 
        className={`block text-sm font-semibold mb-2 transition-colors duration-200 tracking-wide
          ${error ? 'text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-gray-300 group-focus-within:text-blue-600 dark:group-focus-within:text-blue-400'}
        `}
      >
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="relative">
        <input
          id={name}
          name={name}
          className={`
            w-full px-5 py-4 rounded-xl border-2 outline-none transition-all duration-300 ease-out text-base
            bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-gray-100
            placeholder-gray-400 dark:placeholder-gray-500
            ${error 
              ? 'border-red-300 dark:border-red-800 focus:border-red-500 focus:bg-red-50/50 dark:focus:bg-red-900/20' 
              : 'border-transparent hover:border-gray-300 dark:hover:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400 focus:bg-white dark:focus:bg-gray-900 focus:shadow-[0_0_0_4px_rgba(59,130,246,0.1)]'}
            ${className}
          `}
          aria-invalid={!!error}
          aria-describedby={error ? `${name}-error` : undefined}
          {...props}
        />
        {/* Status Indicator Icon (Optional checkmark valid state could go here) */}
      </div>
      {error && (
        <p id={`${name}-error`} className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center animate-pulse">
          <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
};