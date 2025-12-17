import React from 'react';

interface Option {
  value: string;
  label: string;
}

interface CheckboxGroupProps {
  label: string;
  name: string;
  options: Option[];
  value: string; // Comma separated values
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  className?: string;
}

export const CheckboxGroup: React.FC<CheckboxGroupProps> = ({
  label,
  name,
  options,
  value,
  onChange,
  error,
  className = ""
}) => {
  const selectedValues = value ? value.split(',').map(s => s.trim()).filter(Boolean) : [];

  const handleCheckboxChange = (optionValue: string, checked: boolean) => {
    let newValues = [...selectedValues];
    if (checked) {
      if (!newValues.includes(optionValue)) newValues.push(optionValue);
    } else {
      newValues = newValues.filter(v => v !== optionValue);
    }
    const newValueString = newValues.join(', ');
    
    // Create a synthetic event that mimics a standard input change event
    // This allows re-using the existing handleChange handler in the parent form
    const event = {
      target: {
        name,
        value: newValueString,
        type: 'checkbox'
      }
    } as unknown as React.ChangeEvent<HTMLInputElement>;
    
    onChange(event);
  };

  return (
    <div className={`mb-5 relative group ${className}`}>
      <label className={`block text-base font-medium mb-3 transition-colors duration-200 ${error ? 'text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-gray-300'}`}>
        {label}
      </label>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {options.map((option) => {
           const isChecked = selectedValues.includes(option.value);
           return (
             <label 
               key={option.value} 
               className={`
                 relative flex items-center p-3.5 rounded-xl border cursor-pointer transition-all duration-200 select-none
                 ${isChecked 
                   ? 'bg-blue-50 dark:bg-blue-900/20 border-primary shadow-sm ring-1 ring-primary/30' 
                   : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:border-primary/50 dark:hover:border-primary/50 hover:bg-gray-50 dark:hover:bg-gray-750'}
               `}
             >
               <div className="relative flex items-center justify-center h-5 w-5 mr-3">
                 <input
                   type="checkbox"
                   name={`${name}_${option.value}`}
                   value={option.value}
                   checked={isChecked}
                   onChange={(e) => handleCheckboxChange(option.value, e.target.checked)}
                   className="peer appearance-none h-5 w-5 border border-gray-300 dark:border-gray-500 rounded bg-white dark:bg-gray-700 checked:bg-primary checked:border-primary transition-colors focus:ring-2 focus:ring-offset-1 focus:ring-primary/50"
                 />
                 <svg className="absolute w-3.5 h-3.5 text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                 </svg>
               </div>
               <span className={`text-sm font-medium transition-colors ${isChecked ? 'text-primary dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}>
                 {option.label}
               </span>
             </label>
           );
        })}
      </div>
      {error && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center animate-pulse">
          <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
};