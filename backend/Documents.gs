/**
 * Document CRUD operations
 */

function addDocument(userId, data) {
  if (!data) return jsonResponse(false, 'Data required');
  
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const sheet = getSheetByName('Documents');
    const headers = sheet.getDataRange().getValues()[0];
    const now = getCurrentISOString();
    
    const doc = {
      id: generateId(),
      user_id: userId,
      title: sanitizeCell(data.title || ''),
      category: sanitizeCell(data.category || ''),
      sub_category: sanitizeCell(data.sub_category || ''),
      document_number: sanitizeCell(data.document_number || ''),
      institution_name: sanitizeCell(data.institution_name || ''),
      course_name: sanitizeCell(data.course_name || ''),
      semester: sanitizeCell(data.semester || ''),
      month: sanitizeCell(data.month || ''),
      year: sanitizeCell(data.year || ''),
      receipt_number: sanitizeCell(data.receipt_number || ''),
      issue_date: sanitizeCell(data.issue_date || ''),
      expiry_date: sanitizeCell(data.expiry_date || ''),
      document_url: sanitizeCell(data.document_url || ''),
      drive_file_id: sanitizeCell(data.drive_file_id || ''),
      file_name: sanitizeCell(data.file_name || ''),
      file_type: sanitizeCell(data.file_type || ''),
      description: sanitizeCell(data.description || ''),
      tags: sanitizeCell(data.tags || ''),
      notes: sanitizeCell(data.notes || ''),
      favorite: !!data.favorite,
      created_at: now,
      updated_at: now
    };
    
    sheet.appendRow(objectToRow(headers, doc));
    return jsonResponse(true, 'Document added', { document: doc });
  } catch (e) {
    return jsonResponse(false, 'Error adding document: ' + e.toString());
  } finally {
    lock.releaseLock();
  }
}

function getDocuments(userId, page, pageSize) {
  page = Math.max(1, page || 1);
  pageSize = Math.max(1, pageSize || 20);
  
  const sheet = getSheetByName('Documents');
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return jsonResponse(true, 'Documents fetched', { documents: [], total: 0, page: page, pageSize: pageSize });
  
  const headers = data[0];
  let userDocs = [];
  
  for (let i = 1; i < data.length; i++) {
    const doc = rowToObject(headers, data[i]);
    if (doc.user_id === userId) {
      userDocs.push(doc);
    }
  }
  
  // Sort descending by created_at
  userDocs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  
  const total = userDocs.length;
  const start = (page - 1) * pageSize;
  const paginatedDocs = userDocs.slice(start, start + pageSize);
  
  return jsonResponse(true, 'Documents fetched', { documents: paginatedDocs, total: total, page: page, pageSize: pageSize });
}

function getDocument(userId, docId) {
  if (!docId) return jsonResponse(false, 'Document ID required');
  
  const sheet = getSheetByName('Documents');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  for (let i = 1; i < data.length; i++) {
    const doc = rowToObject(headers, data[i]);
    if (doc.id === docId) {
      if (doc.user_id !== userId) {
        return jsonResponse(false, 'Unauthorized access to document', null, 403);
      }
      return jsonResponse(true, 'Document fetched', doc);
    }
  }
  
  return jsonResponse(false, 'Document not found', null, 404);
}

function updateDocument(userId, docId, data) {
  if (!docId || !data) return jsonResponse(false, 'Document ID and data required');
  
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const sheet = getSheetByName('Documents');
    const sheetData = sheet.getDataRange().getValues();
    const headers = sheetData[0];
    
    let targetRowIdx = -1;
    let existingDoc = null;
    
    for (let i = 1; i < sheetData.length; i++) {
      const doc = rowToObject(headers, sheetData[i]);
      if (doc.id === docId) {
        if (doc.user_id !== userId) {
          return jsonResponse(false, 'Unauthorized access to document', null, 403);
        }
        targetRowIdx = i + 1;
        existingDoc = doc;
        break;
      }
    }
    
    if (targetRowIdx === -1) return jsonResponse(false, 'Document not found');
    
    const updatableFields = ['title', 'category', 'sub_category', 'document_number', 'institution_name', 'course_name', 'semester', 'month', 'year', 'receipt_number', 'issue_date', 'expiry_date', 'document_url', 'drive_file_id', 'file_name', 'file_type', 'description', 'tags', 'notes', 'favorite'];
    
    for (const field of updatableFields) {
      if (data[field] !== undefined) {
        const val = typeof data[field] === 'string' ? sanitizeCell(data[field]) : data[field];
        sheet.getRange(targetRowIdx, headers.indexOf(field) + 1).setValue(val);
        existingDoc[field] = val;
      }
    }
    
    const now = getCurrentISOString();
    sheet.getRange(targetRowIdx, headers.indexOf('updated_at') + 1).setValue(now);
    existingDoc.updated_at = now;
    
    return jsonResponse(true, 'Document updated', { document: existingDoc });
  } catch (e) {
    return jsonResponse(false, 'Error updating document: ' + e.toString());
  } finally {
    lock.releaseLock();
  }
}

function deleteDocument(userId, docId, deleteDriveFile) {
  if (!docId) return jsonResponse(false, 'Document ID required');
  
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const sheet = getSheetByName('Documents');
    const sheetData = sheet.getDataRange().getValues();
    const headers = sheetData[0];
    
    let targetRowIdx = -1;
    let driveFileId = null;
    
    for (let i = 1; i < sheetData.length; i++) {
      const doc = rowToObject(headers, sheetData[i]);
      if (doc.id === docId) {
        if (doc.user_id !== userId) {
          return jsonResponse(false, 'Unauthorized access to document', null, 403);
        }
        targetRowIdx = i + 1;
        driveFileId = doc.drive_file_id;
        break;
      }
    }
    
    if (targetRowIdx === -1) return jsonResponse(false, 'Document not found');
    
    sheet.deleteRow(targetRowIdx);
    
    if (deleteDriveFile && driveFileId) {
      try {
        DriveApp.getFileById(driveFileId).setTrashed(true);
      } catch (err) {
        Logger.log('Could not trash file: ' + driveFileId);
      }
    }
    
    return jsonResponse(true, 'Document deleted');
  } catch (e) {
    return jsonResponse(false, 'Error deleting document: ' + e.toString());
  } finally {
    lock.releaseLock();
  }
}

function searchDocuments(userId, query) {
  if (!query) return jsonResponse(false, 'Query required');
  const q = query.toLowerCase();
  
  const sheet = getSheetByName('Documents');
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return jsonResponse(true, 'Search complete', { documents: [] });
  
  const headers = data[0];
  let results = [];
  
  for (let i = 1; i < data.length; i++) {
    const doc = rowToObject(headers, data[i]);
    if (doc.user_id !== userId) continue;
    
    const searchString = [doc.title, doc.document_number, doc.institution_name, doc.receipt_number, doc.tags, doc.description].join(' ').toLowerCase();
    
    if (searchString.indexOf(q) !== -1) {
      results.push(doc);
    }
  }
  
  return jsonResponse(true, 'Search complete', { documents: results });
}

function filterDocuments(userId, filters) {
  const sheet = getSheetByName('Documents');
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return jsonResponse(true, 'Filter complete', { documents: [] });
  
  const headers = data[0];
  let results = [];
  
  for (let i = 1; i < data.length; i++) {
    const doc = rowToObject(headers, data[i]);
    if (doc.user_id !== userId) continue;
    
    let match = true;
    if (filters.category && doc.category !== filters.category) match = false;
    if (filters.sub_category && doc.sub_category !== filters.sub_category) match = false;
    if (filters.semester && doc.semester !== filters.semester) match = false;
    if (filters.month && doc.month !== filters.month) match = false;
    if (filters.year && doc.year != filters.year) match = false;
    if (filters.favorite !== undefined && !!doc.favorite !== !!filters.favorite) match = false;
    
    if (filters.date_from && new Date(doc.created_at) < new Date(filters.date_from)) match = false;
    if (filters.date_to && new Date(doc.created_at) > new Date(filters.date_to)) match = false;
    
    if (match) {
      results.push(doc);
    }
  }
  
  if (filters.sort === 'oldest') {
    results.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  } else {
    results.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }
  
  return jsonResponse(true, 'Filter complete', { documents: results });
}

function toggleFavorite(userId, docId) {
  if (!docId) return jsonResponse(false, 'Document ID required');
  
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const sheet = getSheetByName('Documents');
    const sheetData = sheet.getDataRange().getValues();
    const headers = sheetData[0];
    
    for (let i = 1; i < sheetData.length; i++) {
      const doc = rowToObject(headers, sheetData[i]);
      if (doc.id === docId) {
        if (doc.user_id !== userId) {
          return jsonResponse(false, 'Unauthorized', null, 403);
        }
        
        const rowIdx = i + 1;
        const currentFavorite = !!doc.favorite;
        const newFavorite = !currentFavorite;
        
        sheet.getRange(rowIdx, headers.indexOf('favorite') + 1).setValue(newFavorite);
        sheet.getRange(rowIdx, headers.indexOf('updated_at') + 1).setValue(getCurrentISOString());
        
        return jsonResponse(true, 'Favorite toggled', { favorite: newFavorite });
      }
    }
    
    return jsonResponse(false, 'Document not found');
  } catch (e) {
    return jsonResponse(false, 'Error toggling favorite: ' + e.toString());
  } finally {
    lock.releaseLock();
  }
}
