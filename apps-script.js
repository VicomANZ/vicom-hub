// ============================================================
// Vicom Hub — Google Apps Script (Write-Back API)
// ============================================================
// Deploy: Extensions → Apps Script → paste this → Deploy → Web App
// Execute as: Me | Who has access: Anyone
// Copy the Web App URL into APPS_SCRIPT_URL in the dashboard
// ============================================================

// Sheet ID from the URL
const SHEET_ID = '1nkMtdwKhOvxEuSEMvqroZsW6QtS0N07rbMQpDnLzHB0';
const REGISTER_TAB = 'Equipment Register';
const LOG_TAB = 'Loan Log';

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;

    if (action === 'update') {
      return handleUpdate(data);
    } else if (action === 'return') {
      return handleReturn(data);
    } else if (action === 'newLoan') {
      return handleNewLoan(data);
    }

    return jsonResponse({ success: false, error: 'Unknown action' });
  } catch (err) {
    return jsonResponse({ success: false, error: err.message });
  }
}

function doGet(e) {
  return jsonResponse({ status: 'Vicom Hub API is running' });
}

// ── UPDATE: Change salesperson, dates, etc. on a kit ──
function handleUpdate(data) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName(REGISTER_TAB);
  const kitId = data.kitId;
  const fields = data.fields;

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const allData = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();

  // Find Kit ID column index
  const kitIdCol = headers.indexOf('Kit ID');
  if (kitIdCol === -1) return jsonResponse({ success: false, error: 'Kit ID column not found' });

  // Find the row
  let targetRow = -1;
  for (let i = 0; i < allData.length; i++) {
    if (allData[i][kitIdCol] === kitId) {
      targetRow = i + 2; // +2 for header row + 0-index
      break;
    }
  }

  if (targetRow === -1) return jsonResponse({ success: false, error: 'Kit not found: ' + kitId });

  // Update each field
  for (const [fieldName, value] of Object.entries(fields)) {
    const colIndex = headers.indexOf(fieldName);
    if (colIndex !== -1) {
      sheet.getRange(targetRow, colIndex + 1).setValue(value);
    }
  }

  return jsonResponse({ success: true, kitId: kitId, updated: Object.keys(fields) });
}

// ── RETURN: Mark a kit as returned ──
function handleReturn(data) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName(REGISTER_TAB);
  const kitId = data.kitId;

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const allData = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();

  const kitIdCol = headers.indexOf('Kit ID');
  if (kitIdCol === -1) return jsonResponse({ success: false, error: 'Kit ID column not found' });

  let targetRow = -1;
  let rowData = null;
  for (let i = 0; i < allData.length; i++) {
    if (allData[i][kitIdCol] === kitId) {
      targetRow = i + 2;
      rowData = allData[i];
      break;
    }
  }

  if (targetRow === -1) return jsonResponse({ success: false, error: 'Kit not found: ' + kitId });

  // Log the return in the Loan Log tab before clearing
  logReturn(ss, headers, rowData);

  // Clear loan fields
  const clearFields = ['Status', 'Currently With', 'Customer Loaned To', 'Loan Start', 'Loan End', 'Signed Out By'];
  for (const fieldName of clearFields) {
    const colIndex = headers.indexOf(fieldName);
    if (colIndex !== -1) {
      if (fieldName === 'Status') {
        sheet.getRange(targetRow, colIndex + 1).setValue('Available');
      } else if (fieldName === 'Currently With') {
        // Reset to the owner
        const ownerCol = headers.indexOf('Owner (Sales Rep)');
        const owner = ownerCol !== -1 ? rowData[ownerCol] : '';
        sheet.getRange(targetRow, colIndex + 1).setValue(owner);
      } else {
        sheet.getRange(targetRow, colIndex + 1).setValue('');
      }
    }
  }

  return jsonResponse({ success: true, kitId: kitId, action: 'returned' });
}

// ── NEW LOAN: Create a new loan from form submission ──
function handleNewLoan(data) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName(REGISTER_TAB);
  const kitId = data.kitId;

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const allData = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();

  const kitIdCol = headers.indexOf('Kit ID');
  if (kitIdCol === -1) return jsonResponse({ success: false, error: 'Kit ID column not found' });

  let targetRow = -1;
  for (let i = 0; i < allData.length; i++) {
    if (allData[i][kitIdCol] === kitId) {
      targetRow = i + 2;
      break;
    }
  }

  if (targetRow === -1) return jsonResponse({ success: false, error: 'Kit not found: ' + kitId });

  // Update loan fields
  const loanFields = {
    'Status': 'On Loan',
    'Customer Loaned To': data.customerCompany || '',
    'Currently With': data.customerName || data.customerCompany || '',
    'Signed Out By': data.salesperson || '',
    'Loan Start': data.loanStart || '',
    'Loan End': data.loanEnd || '',
  };

  for (const [fieldName, value] of Object.entries(loanFields)) {
    const colIndex = headers.indexOf(fieldName);
    if (colIndex !== -1) {
      sheet.getRange(targetRow, colIndex + 1).setValue(value);
    }
  }

  // Also log in Loan Log
  const logSheet = ss.getSheetByName(LOG_TAB);
  if (logSheet) {
    const logRow = [
      'LOAN-' + Date.now(),          // Loan ID
      kitId,                          // Kit ID
      data.model || '',               // Model
      data.customerName || '',        // Customer Name
      data.customerCompany || '',     // Customer Company
      data.customerEmail || '',       // Customer Email
      data.customerPhone || '',       // Customer Phone
      data.loanStart || '',           // Loan Start
      data.loanEnd || '',             // Loan End
      '',                             // Actual Return Date (blank)
      data.salesperson || '',         // Salesperson
      data.purpose || '',             // Purpose
      '',                             // Condition on Return (blank)
      data.notes || '',               // Notes
    ];
    logSheet.appendRow(logRow);
  }

  return jsonResponse({ success: true, kitId: kitId, action: 'loaned' });
}

// ── Helper: Log a return to the Loan Log ──
function logReturn(ss, headers, rowData) {
  const logSheet = ss.getSheetByName(LOG_TAB);
  if (!logSheet) return;

  const get = (name) => {
    const idx = headers.indexOf(name);
    return idx !== -1 ? rowData[idx] : '';
  };

  const logRow = [
    'RET-' + Date.now(),              // Loan ID
    get('Kit ID'),                    // Kit ID
    get('Model'),                     // Model
    get('Currently With'),            // Customer Name
    get('Customer Loaned To'),        // Customer Company
    '',                               // Customer Email
    '',                               // Customer Phone
    get('Loan Start'),                // Loan Start
    get('Loan End'),                  // Loan End
    new Date().toISOString().split('T')[0], // Actual Return Date
    get('Owner (Sales Rep)'),         // Salesperson
    '',                               // Purpose
    '',                               // Condition on Return
    'Returned via dashboard',         // Notes
  ];
  logSheet.appendRow(logRow);
}

// ── Helper: JSON response ──
function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
