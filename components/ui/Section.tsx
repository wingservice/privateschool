import React from 'react';

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

export const Section: React.FC<SectionProps> = ({ title, children }) => {
  return (
    <div className="mb-8 md:mb-12 relative group">
      {/* Decorative background blur */}
      <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl opacity-0 group-hover:opacity-20 transition duration-500 blur-lg"></div>
      
      <div className="relative p-6 md:p-10 bg-white dark:bg-gray-800/95 backdrop-blur-sm rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-gray-700">
        {/* Left accent bar with gradient */}
        <div className="absolute left-0 top-6 bottom-6 w-1.5 bg-gradient-to-b from-blue-500 to-indigo-600 rounded-r-full"></div>
        
        <h2 className="text-2xl md:text-3xl font-bold mb-8 pl-4 flex items-center text-gray-800 dark:text-gray-100">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-500 dark:from-blue-400 dark:to-indigo-300">
            {title}
          </span>
        </h2>
        
        <div className="space-y-6 pl-2 md:pl-4">
          {children}
        </div>
      </div>
    </div>
  );
};