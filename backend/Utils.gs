/**
 * Utility functions
 */

function sanitizeCell(value) {
  if (typeof value !== 'string') return value;
  // Prevent formula injection
  if (/^[=+\-@]/.test(value)) {
    return "'" + value;
  }
  return value;
}

function generateId() {
  return Utilities.getUuid();
}

function jsonResponse(success, message, data = null, statusCode = null) {
  const response = {
    success: success,
    message: message
  };
  if (data !== null) {
    response.data = data;
  }
  return response;
}

function getSpreadsheetId() {
  return PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID')
      || '1hmDyaebqSK2BqvtMtzIEi5iC1Ju4FF11_wyglyYAuTY';
}

function getDriveFolderId() {
  return PropertiesService.getScriptProperties().getProperty('DRIVE_FOLDER_ID')
      || '1uAs49CwV9TiRAPq1Z2ok3Q2SNHw6Fucz';
}

/**
 * Run this once from the Apps Script editor to save properties permanently.
 */
function initProperties() {
  const props = PropertiesService.getScriptProperties();
  props.setProperty('SPREADSHEET_ID', '1hmDyaebqSK2BqvtMtzIEi5iC1Ju4FF11_wyglyYAuTY');
  props.setProperty('DRIVE_FOLDER_ID', '1uAs49CwV9TiRAPq1Z2ok3Q2SNHw6Fucz');
  Logger.log('✅ SPREADSHEET_ID = ' + props.getProperty('SPREADSHEET_ID'));
  Logger.log('✅ DRIVE_FOLDER_ID = ' + props.getProperty('DRIVE_FOLDER_ID'));
}

function getSheetByName(name) {
  const ssId = getSpreadsheetId();
  if (!ssId) throw new Error('SPREADSHEET_ID property is not set');
  const sheet = SpreadsheetApp.openById(ssId).getSheetByName(name);
  if (!sheet) throw new Error('Sheet not found: ' + name);
  return sheet;
}

function rowToObject(headers, row) {
  const obj = {};
  for (let i = 0; i < headers.length; i++) {
    obj[headers[i]] = row[i];
  }
  return obj;
}

function objectToRow(headers, obj) {
  const row = [];
  for (let i = 0; i < headers.length; i++) {
    row.push(obj[headers[i]] !== undefined ? obj[headers[i]] : '');
  }
  return row;
}

function getCurrentISOString() {
  return new Date().toISOString();
}

function parseDate(str) {
  return new Date(str);
}

function cacheGet(key) {
  const val = CacheService.getScriptCache().get(key);
  if (val) {
    try {
      return JSON.parse(val);
    } catch (e) {
      return val;
    }
  }
  return null;
}

function cachePut(key, value, seconds = 600) {
  const valToStore = typeof value === 'string' ? value : JSON.stringify(value);
  CacheService.getScriptCache().put(key, valToStore, seconds);
}

function cacheRemove(key) {
  CacheService.getScriptCache().remove(key);
}
