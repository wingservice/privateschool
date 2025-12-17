// ============================================================================
// GOOGLE APPS SCRIPT CODE
// ============================================================================
// 1. Create a new Google Sheet.
// 2. Extensions > Apps Script.
// 3. Paste this code into Code.gs.
// 4. Save and Deploy as Web App (Execute as: Me, Who has access: Anyone).
// ============================================================================

const SHEET_NAME = "Sheet1";
const UPLOAD_FOLDER_NAME = "School_Registration_Documents";

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(30000); // Wait up to 30 seconds for concurrent requests

  try {
    const doc = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = doc.getSheetByName(SHEET_NAME);
    if (!sheet) {
      // Create sheet if missing
      sheet = doc.insertSheet(SHEET_NAME);
      // Set Header Row
      sheet.appendRow([
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
      ]);
      // Formatting header
      sheet.getRange(1, 1, 1, 14).setFontWeight("bold").setBackground("#e0e0e0");
      sheet.setFrozenRows(1);
    }

    const rawData = e.postData.contents;
    const jsonData = JSON.parse(rawData);
    const timestamp = new Date().toISOString();

    // 1. Get or Create Upload Folder in Drive
    const folder = getOrCreateFolder(UPLOAD_FOLDER_NAME);

    // 2. Helper to Upload File
    const processFile = (base64String, fileNamePrefix) => {
      // Skip if empty or placeholder
      if (!base64String || base64String.length < 100) return "No File";
      
      try {
        // Extract content type and base64 data
        // Format: "data:image/png;base64,iVBOR..."
        const parts = base64String.split(',');
        const contentType = parts[0].split(':')[1].split(';')[0];
        const base64 = parts[1];
        const extension = contentType.split('/')[1];

        // Create Blob
        // Filename: Type_UDISE_Timestamp
        const fileName = `${fileNamePrefix}_${jsonData.udiseCode || 'Unknown'}_${Date.now()}.${extension}`;
        const blob = Utilities.newBlob(Utilities.base64Decode(base64), contentType, fileName);
        
        // Save to Drive
        const file = folder.createFile(blob);
        
        // Make public (Optional - allows the link to work for anyone with the link)
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        
        return file.getUrl();
      } catch (err) {
        return "Upload Error: " + err.toString();
      }
    };

    // 3. Process Uploads
    // These match the field names in your frontend `SchoolData` interface
    const schoolPicUrl = processFile(jsonData.schoolPicture, "SchoolPic");
    const principalPicUrl = processFile(jsonData.principalPicture, "PrincipalPic");
    const certPrimaryUrl = processFile(jsonData.registrationCertificatePrimary, "Cert_Primary");
    const certUpperUrl = processFile(jsonData.registrationCertificateUpper, "Cert_Upper");

    // 4. Append Data to Sheet
    const newRow = [
      timestamp,
      jsonData.schoolName || '',
      jsonData.udiseCode || '',
      jsonData.block || '',
      jsonData.district || '',
      jsonData.level || '',
      jsonData.principalName || '',
      jsonData.societyTrustName || '',
      // Force phone to string to prevent scientific notation or dropping leading zeros
      "'"+(jsonData.phone || ''), 
      jsonData.email || '',
      schoolPicUrl,
      principalPicUrl,
      certPrimaryUrl,
      certUpperUrl
    ];

    sheet.appendRow(newRow);

    return ContentService.createTextOutput(JSON.stringify({ 
      success: true, 
      rowId: sheet.getLastRow(), 
      message: "Data saved and files uploaded to Drive successfully." 
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (e) {
    return ContentService.createTextOutput(JSON.stringify({ 
      success: false, 
      message: "Server Error: " + e.toString() 
    })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function getOrCreateFolder(folderName) {
  const folders = DriveApp.getFoldersByName(folderName);
  if (folders.hasNext()) {
    return folders.next();
  } else {
    return DriveApp.createFolder(folderName);
  }
}