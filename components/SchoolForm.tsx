import React, { useState, useCallback } from 'react';
import { SchoolData, SchoolDataKey, BLOCKS, SCHOOL_LEVELS, ApiResponse, SHEET_HEADERS } from '../types';
import { submitSchoolData } from '../services/api';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { FileInput } from './ui/FileInput';
import { Section } from './ui/Section';
import { ChatBot } from './ChatBot';

const INITIAL_DATA: SchoolData = {
  schoolName: '',
  udiseCode: '',
  block: '',
  district: '',
  level: '',
  principalName: '',
  societyTrustName: '',
  phone: '',
  email: '',
  schoolPicture: '',
  principalPicture: '',
  registrationCertificatePrimary: '',
  registrationCertificateUpper: '',
};

export const SchoolForm: React.FC = () => {
  const [formData, setFormData] = useState<SchoolData>(INITIAL_DATA);
  const [lastSubmittedData, setLastSubmittedData] = useState<SchoolData | null>(null);
  const [errors, setErrors] = useState<Partial<Record<SchoolDataKey, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<ApiResponse | null>(null);

  // --- Validation Logic ---
  const validateField = (name: string, value: string): string | undefined => {
    const requiredFields = [
      'schoolName', 'udiseCode', 'block', 'district', 'level', 
      'principalName', 'societyTrustName', 'phone', 'email'
    ];

    if (requiredFields.includes(name) && !value.trim()) {
      return 'This field is required.';
    }

    if (name === 'phone') {
       if (!/^\d{10}$/.test(value.replace(/\D/g, ''))) return 'Please enter a valid 10-digit phone number.';
    }

    if (name === 'email') {
       if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Please enter a valid email address.';
    }

    if (name === 'udiseCode') {
       if (value.length < 5) return 'UDISE Code seems too short.';
    }

    // Required Files validation
    if (name === 'schoolPicture' && !value) return 'School picture is required.';
    if (name === 'principalPicture' && !value) return 'Principal picture is required.';
    
    // Primary Certificate is always required
    if (name === 'registrationCertificatePrimary' && !value) return 'Primary Registration Certificate (PDF) is required.';

    // Upper Primary Certificate logic: Required only if level is Upper Primary
    if (name === 'registrationCertificateUpper') {
        if (formData.level === 'Upper Primary (1-8)' && !value) {
            return 'Upper Primary Registration Certificate (PDF) is required for this level.';
        }
    }

    return undefined;
  };

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    setFormData(prev => {
        const newData = { ...prev, [name]: value };
        // If level changes to Primary, clear the Upper Primary certificate
        if (name === 'level' && value === 'Primary (1-5)') {
            newData.registrationCertificateUpper = '';
        }
        return newData;
    });
    
    if (errors[name as SchoolDataKey]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name as SchoolDataKey];
        return newErrors;
      });
    }
  }, [errors]);

  const handleFileChange = useCallback((name: string, base64: string) => {
    setFormData(prev => ({ ...prev, [name]: base64 }));
    
    if (errors[name as SchoolDataKey]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name as SchoolDataKey];
        return newErrors;
      });
    }
  }, [errors]);

  // Method for AI to update fields
  const handleVoiceUpdate = useCallback((updates: Partial<SchoolData>) => {
    setFormData(prev => {
        const newData = { ...prev, ...updates };
         // If level changes to Primary via voice, clear the Upper Primary certificate
         if (updates.level && updates.level === 'Primary (1-5)') {
            newData.registrationCertificateUpper = '';
        }
        return newData;
    });
    const newErrors = { ...errors };
    Object.keys(updates).forEach(key => {
        delete newErrors[key as SchoolDataKey];
    });
    setErrors(newErrors);
  }, [errors]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSubmitResult(null);
    setLastSubmittedData(null);
    
    const newErrors: Partial<Record<SchoolDataKey, string>> = {};
    let isValid = true;

    (Object.keys(formData) as Array<keyof SchoolData>).forEach(key => {
        // Skip validation for fields that shouldn't be filled
        if (key === 'registrationCertificateUpper' && formData.level !== 'Upper Primary (1-8)') {
            return;
        }

        const val = formData[key] as string || '';
        const error = validateField(key, val);
        if (error) {
            newErrors[key] = error;
            isValid = false;
        }
    });

    if (!isValid) {
      setErrors(newErrors);
      const firstError = document.querySelector('[aria-invalid="true"]');
      firstError?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setIsSubmitting(true);
    
    try {
        const dataToSubmit = { ...formData };
        const response = await submitSchoolData(dataToSubmit);
        setSubmitResult(response);

        if (response.success) {
            setLastSubmittedData(dataToSubmit);
            setFormData(INITIAL_DATA);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else if (response.errors) {
            setErrors(response.errors as any);
        }
    } catch (error) {
        setSubmitResult({ 
            success: false, 
            message: "An unexpected error occurred during submission." 
        });
    } finally {
        setIsSubmitting(false);
    }
  };

  const downloadReceipt = () => {
    if (!lastSubmittedData) return;

    // Simplified CSV generation for the new fields
    // Note: Files are Base64, which are too large for CSV cells usually. 
    // We will just indicate "File Attached" for CSV download.
    const csvHeader = SHEET_HEADERS.join(",");
    const csvRow = SHEET_HEADERS.map(header => {
        if (header === 'Timestamp') return `"${new Date().toLocaleString()}"`;
        
        let val = '';
        switch(header) {
            case 'School Name': val = lastSubmittedData.schoolName; break;
            case 'UDISE Code': val = lastSubmittedData.udiseCode; break;
            case 'Block': val = lastSubmittedData.block; break;
            case 'District': val = lastSubmittedData.district; break;
            case 'Level': val = lastSubmittedData.level; break;
            case 'Principal Name': val = lastSubmittedData.principalName; break;
            case 'Name of Society/Trust': val = lastSubmittedData.societyTrustName; break;
            case 'Phone': val = lastSubmittedData.phone; break;
            case 'Email': val = lastSubmittedData.email; break;
            case 'School Picture': val = lastSubmittedData.schoolPicture ? "[Image Data]" : "No"; break;
            case 'Principal Picture': val = lastSubmittedData.principalPicture ? "[Image Data]" : "No"; break;
            case 'Registration Certificate Primary': val = lastSubmittedData.registrationCertificatePrimary ? "[PDF Data]" : "No"; break;
            case 'Registration Certificate Upper Primary': val = lastSubmittedData.registrationCertificateUpper ? "[PDF Data]" : "No"; break;
        }
        return `"${val.replace(/"/g, '""')}"`;
    }).join(",");

    const csvContent = csvHeader + "\n" + csvRow;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `school_registration_${lastSubmittedData.udiseCode}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (submitResult?.success) {
    return (
      <div className="max-w-3xl mx-auto mt-16 p-10 bg-green-50 dark:bg-green-900/20 rounded-3xl shadow-xl border border-green-200 dark:border-green-800 text-center animate-fade-in-down">
        <div className="w-24 h-24 bg-green-100 dark:bg-green-800 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
            <svg className="w-12 h-12 text-green-600 dark:text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
            </svg>
        </div>
        <h2 className="text-4xl font-extrabold text-green-800 dark:text-green-100 mb-4 tracking-tight">Success!</h2>
        <p className="text-green-700 dark:text-green-300 mb-8 text-xl font-medium">{submitResult.message}</p>
        <div className="text-base font-mono text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/50 py-3 px-6 rounded-lg inline-block mb-10 border border-green-200 dark:border-green-800/50">Ref ID: {submitResult.rowId}</div>
        <br/>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button 
            type="button"
            onClick={downloadReceipt}
            className="px-8 py-4 text-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-bold rounded-xl shadow border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 hover:-translate-y-1 flex items-center justify-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download Info (CSV)
          </button>

          <button 
            type="button"
            onClick={() => setSubmitResult(null)}
            className="px-10 py-4 text-lg bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-lg hover:shadow-green-500/30 transition-all duration-200 hover:-translate-y-1"
          >
            Register Another School
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-5xl mx-auto pb-32" noValidate id="schoolDataForm">
      
      {submitResult && !submitResult.success && (
        <div className="mb-10 p-6 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 rounded-lg shadow-sm animate-fade-in-down">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-bold text-red-800 dark:text-red-200">Submission Failed</h3>
              <p className="mt-1 text-red-700 dark:text-red-300">{submitResult.message}</p>
            </div>
          </div>
        </div>
      )}

      <Section title="1. School Details">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Input name="schoolName" label="School Name" value={formData.schoolName} onChange={handleChange} error={errors.schoolName} required className="md:col-span-2" placeholder="e.g. Government High School" />
          <Input name="udiseCode" label="UDISE Code" value={formData.udiseCode} onChange={handleChange} error={errors.udiseCode} required placeholder="Enter 11-digit code" />
          <Select 
            name="block" 
            label="Block" 
            value={formData.block} 
            onChange={handleChange} 
            error={errors.block} 
            required 
            options={BLOCKS} 
            placeholder="Select Block"
          />
          <Input name="district" label="District" value={formData.district} onChange={handleChange} error={errors.district} required placeholder="e.g. West Tripura" />
          <Select 
            name="level" 
            label="Level" 
            value={formData.level} 
            onChange={handleChange} 
            error={errors.level} 
            required 
            options={SCHOOL_LEVELS}
          />
        </div>
      </Section>

      <Section title="2. Administrative & Contact Info">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Input name="principalName" label="Principal Name" value={formData.principalName} onChange={handleChange} error={errors.principalName} required placeholder="Full Name" />
          <Input name="societyTrustName" label="Name of Society/Trust" value={formData.societyTrustName} onChange={handleChange} error={errors.societyTrustName} required placeholder="e.g. Example Education Trust" />
          <Input name="phone" label="Phone" value={formData.phone} onChange={handleChange} error={errors.phone} required type="tel" placeholder="10-digit Mobile Number" />
          <Input name="email" label="Email" value={formData.email} onChange={handleChange} error={errors.email} required type="email" placeholder="school@example.com" />
        </div>
      </Section>

      <Section title="3. Documents & Uploads">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
           <FileInput 
             name="schoolPicture" 
             label="School Picture" 
             accept="image/*" 
             capture="environment"
             value={formData.schoolPicture} 
             onChange={handleFileChange} 
             error={errors.schoolPicture} 
             required 
           />
           <FileInput 
             name="principalPicture" 
             label="Principal Picture" 
             accept="image/*" 
             capture="environment"
             value={formData.principalPicture} 
             onChange={handleFileChange} 
             error={errors.principalPicture} 
             required 
           />
           <div className="md:col-span-2">
             <FileInput 
               name="registrationCertificatePrimary" 
               label="Registration Certificate Primary (PDF)" 
               accept="application/pdf" 
               value={formData.registrationCertificatePrimary} 
               onChange={handleFileChange} 
               error={errors.registrationCertificatePrimary} 
               required 
             />
           </div>
           
           {formData.level === 'Upper Primary (1-8)' && (
             <div className="md:col-span-2 animate-fade-in-down">
               <FileInput 
                 name="registrationCertificateUpper" 
                 label="Registration Certificate Upper Primary (PDF)" 
                 accept="application/pdf" 
                 value={formData.registrationCertificateUpper} 
                 onChange={handleFileChange} 
                 error={errors.registrationCertificateUpper} 
                 required
               />
             </div>
           )}
        </div>
      </Section>

      <div className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-t border-gray-200 dark:border-gray-800 p-4 md:p-6 shadow-[0_-5px_20px_-5px_rgba(0,0,0,0.1)] z-40 transition-all">
        <div className="max-w-5xl mx-auto flex justify-between items-center gap-4">
            <ChatBot 
                onUpdateForm={handleVoiceUpdate} 
                onSubmitForm={() => handleSubmit()} 
                currentData={formData}
            />
            <button
            type="submit"
            disabled={isSubmitting}
            className={`
                px-8 md:px-12 py-3 md:py-4 rounded-full font-bold text-lg md:text-xl shadow-lg transition-all duration-300 transform border
                ${isSubmitting 
                ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 border-gray-200 dark:border-gray-700 cursor-not-allowed scale-95' 
                : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:via-indigo-500 hover:to-purple-500 text-white border-transparent hover:-translate-y-1 hover:shadow-indigo-500/50 active:scale-95'}
            `}
            >
            {isSubmitting ? (
                <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Uploading...
                </span>
            ) : 'Submit Registration'}
            </button>
        </div>
      </div>
    </form>
  );
};