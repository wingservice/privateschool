import { SchoolData, ApiResponse } from '../types';

// ==============================================================================
// 🚀 CONNECTION INSTRUCTIONS
// ==============================================================================
// 1. Create a file named .env in the root directory (next to package.json).
// 2. Add this line: SHEET_API_URL=https://script.google.com/macros/s/...../exec
// 3. Restart your dev server.
// 
// Alternatively, replace the empty string below with your Web App URL.
// ==============================================================================

// Updated with the user's provided Web App URL
const API_URL: string = process.env.SHEET_API_URL || 'https://script.google.com/macros/s/AKfycbyo-AS6mAz8IYskz_hYowdu8JhmOl8OPACz3r6p5FoNqekYZI1018sqnQ8ktnINpmF_Ew/exec';

export const submitSchoolData = async (data: SchoolData): Promise<ApiResponse> => {
  // 1. Simulation Mode (If URL is not configured)
  if (!API_URL || API_URL.includes('YOUR_GOOGLE_APPS_SCRIPT') || API_URL === '') {
      console.warn("API URL not configured. Running in SIMULATION MODE.");
      
      // Simulate network latency (1.5 seconds)
      await new Promise(resolve => setTimeout(resolve, 1500));

      return { 
          success: true, 
          message: 'Simulation Success: API URL was not configured. Please see README.md to setup Google Sheets.', 
          rowId: 'SIM-' + Math.floor(Math.random() * 100000)
      };
  }

  // 2. Timeout setup (120 seconds) to allow time for 10MB file uploads to Drive
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120000);

  try {
    const isGoogleAppsScript = API_URL.includes('script.google.com');

    // For Google Apps Script, we must send as "text/plain" to avoid CORS preflight (OPTIONS) requests.
    const headers = isGoogleAppsScript 
      ? { 'Content-Type': 'text/plain;charset=utf-8' }
      : { 'Content-Type': 'application/json' };

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(data),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);

    // Handle generic server errors before parsing
    if (!response.ok) {
        return {
            success: false,
            message: `Server returned error status: ${response.status}`,
        };
    }

    // Safely parse text instead of direct .json() calls to avoid crashing on HTML responses
    const text = await response.text();
    try {
        const result = JSON.parse(text);

        // Enhance error message for common Google Script issue (Sheet1 not found)
        if (!result.success && result.message && result.message.includes("reading 'getRange'")) {
            result.message = "Backend Error: The script could not find the sheet tab named 'Sheet1'. Please rename your sheet tab to 'Sheet1'.";
        }

        return result;
    } catch (e) {
        // If parsing fails, it's usually because the script returned HTML (error page) instead of JSON
        console.error("Invalid JSON received:", text.slice(0, 200));
        return {
            success: false,
            message: "Submission failed. The server returned an invalid response. Ensure your Google Script permissions are set to 'Anyone' can access.",
        };
    }

  } catch (error: any) {
    clearTimeout(timeoutId);
    console.error('Submission error:', error);
    
    if (error.name === 'AbortError') {
        return { success: false, message: 'Request timed out. File uploads might be taking too long.' };
    }

    return {
      success: false,
      message: 'Network error. Please check your internet connection.',
    };
  }
};