
export interface SchoolData {
  schoolName: string;
  udiseCode: string;
  block: string;
  district: string;
  level: string;
  principalName: string;
  societyTrustName: string;
  phone: string;
  email: string;
  // File fields will store Base64 strings
  schoolPicture: string;
  principalPicture: string;
  registrationCertificatePrimary: string;
  registrationCertificateUpper: string;
}

export type SchoolDataKey = keyof SchoolData;

export interface ValidationErrors {
  [key: string]: string;
}

export interface ApiResponse {
  success: boolean;
  message?: string;
  rowId?: string;
  errors?: ValidationErrors;
}

export const BLOCKS = [
  { value: 'Khowai', label: 'Khowai' },
  { value: 'Tulashikhar', label: 'Tulashikhar' },
  { value: 'Teliamura', label: 'Teliamura' },
  { value: 'Mungiakami', label: 'Mungiakami' },
  { value: 'Padmabil', label: 'Padmabil' },
  { value: 'Kalyanpur', label: 'Kalyanpur' },
];

export const SCHOOL_LEVELS = [
  { value: 'Primary (1-5)', label: 'Primary (1-5)' },
  { value: 'Upper Primary (1-8)', label: 'Upper Primary (1-8)' },
];

export const SHEET_HEADERS = [
  'Timestamp',
  'School Name',
  'UDISE Code',
  'Block',
  'District',
  'Level',
  'Principal Name',
  'Name of Society/Trust',
  'Phone',
  'Email',
  'School Picture',
  'Principal Picture',
  'Registration Certificate Primary',
  'Registration Certificate Upper Primary'
];
