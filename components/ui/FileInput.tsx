import React, { useState, useRef } from 'react';

interface FileInputProps {
  label: string;
  name: string;
  accept: string;
  onChange: (name: string, base64: string) => void;
  error?: string;
  required?: boolean;
  value?: string; // Base64 string if already selected
  capture?: "user" | "environment"; // Enable camera capture
}

export const FileInput: React.FC<FileInputProps> = ({
  label,
  name,
  accept,
  onChange,
  error,
  required,
  value,
  capture
}) => {
  const [fileName, setFileName] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    processFile(file);
  };

  const processFile = (file: File | undefined) => {
    if (file) {
      // Updated limit: 10MB check
      if (file.size > 10 * 1024 * 1024) { 
        alert("File size exceeds 10MB. Please upload a smaller file.");
        return;
      }

      setFileName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        onChange(name, base64String);
      };
      reader.readAsDataURL(file);
    } else {
      setFileName("");
      onChange(name, "");
    }
  };

  const clearFile = () => {
    setFileName("");
    onChange(name, "");
    if (inputRef.current) inputRef.current.value = "";
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    processFile(file);
  };

  const isPDF = accept.includes("pdf");

  return (
    <div className="mb-8 relative group">
      <label className={`block text-sm font-semibold mb-2 transition-colors duration-200 tracking-wide ${error ? 'text-red-600' : 'text-gray-700 dark:text-gray-300'}`}>
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      
      <div 
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`
          relative border-2 border-dashed rounded-2xl p-8 transition-all duration-300 ease-out text-center overflow-hidden
          ${error 
            ? 'border-red-300 bg-red-50/50 dark:bg-red-900/10' 
            : value 
              ? 'border-green-500 bg-green-50/50 dark:bg-green-900/10' 
              : isDragging
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 scale-[1.02]'
                : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 bg-gray-50 dark:bg-gray-800/50 hover:bg-white dark:hover:bg-gray-800'
          }
        `}
      >
        <input
          ref={inputRef}
          type="file"
          id={name}
          name={name}
          accept={accept}
          capture={capture}
          onChange={handleFileChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        />
        
        {value ? (
          <div className="relative z-20 flex flex-col items-center animate-fade-in-down">
             <div className="bg-white dark:bg-gray-700 p-4 rounded-2xl shadow-md mb-3 ring-4 ring-green-100 dark:ring-green-900/30">
                {isPDF ? (
                    <svg className="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                ) : (
                    <img src={value} alt="Preview" className="w-20 h-20 object-cover rounded-xl" />
                )}
             </div>
             <p className="text-sm font-bold text-gray-800 dark:text-gray-100 truncate max-w-xs px-4 py-1 bg-white/50 dark:bg-black/20 rounded-full">{fileName || "File Selected"}</p>
             <button 
                type="button" 
                onClick={(e) => { e.stopPropagation(); clearFile(); }}
                className="mt-3 inline-flex items-center text-xs font-semibold text-red-500 hover:text-red-600 bg-red-50 dark:bg-red-900/20 px-3 py-1.5 rounded-full hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors z-30 relative"
             >
               <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
               Remove file
             </button>
          </div>
        ) : (
          <div className="flex flex-col items-center pointer-events-none group-hover:scale-105 transition-transform duration-300">
            <div className={`p-4 rounded-full mb-3 ${capture ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
              {capture ? (
                 <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                 </svg>
              ) : (
                 <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                 </svg>
              )}
            </div>
            
            <p className="text-base font-medium text-gray-700 dark:text-gray-200">
              {capture ? "Tap to Take Photo" : "Click to upload"}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {capture ? "Using your camera" : "or drag and drop here"}
            </p>
            <p className="text-[10px] text-gray-400 mt-2 uppercase tracking-wide font-bold">
              {isPDF ? "PDF (Max 10MB)" : "IMG (Max 10MB)"}
            </p>
          </div>
        )}
      </div>

      {error && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center animate-pulse">
          <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
};