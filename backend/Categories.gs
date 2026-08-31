/**
 * Category management
 */

function getCategories() {
  const sheet = getSheetByName('Categories');
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  
  const headers = data[0];
  let categories = [];
  
  for (let i = 1; i < data.length; i++) {
    const cat = rowToObject(headers, data[i]);
    if (cat.active !== false && cat.active !== 'false') {
      categories.push(cat);
    }
  }
  
  return categories;
}

function addCategory(name, icon) {
  if (!name) return jsonResponse(false, 'Category name required');
  
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const sheet = getSheetByName('Categories');
    const headers = sheet.getDataRange().getValues()[0];
    
    const cat = {
      id: generateId(),
      name: sanitizeCell(name),
      icon: sanitizeCell(icon || 'fa-file'),
      active: true,
      created_at: getCurrentISOString()
    };
    
    sheet.appendRow(objectToRow(headers, cat));
    return jsonResponse(true, 'Category added', { category: cat });
  } catch (e) {
    return jsonResponse(false, 'Error adding category: ' + e.toString());
  } finally {
    lock.releaseLock();
  }
}

function seedDefaultCategories() {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const sheet = getSheetByName('Categories');
    const data = sheet.getDataRange().getValues();
    if (data.length > 1) return; // Already seeded
    
    const headers = data[0];
    const defaultCategories = [
      { name: 'College', icon: 'fa-graduation-cap' },
      { name: 'High School', icon: 'fa-school' },
      { name: 'Intermediate', icon: 'fa-book' },
      { name: 'Land Records', icon: 'fa-map' },
      { name: 'Certificates', icon: 'fa-certificate' },
      { name: 'Others', icon: 'fa-file' }
    ];
    
    for (const cat of defaultCategories) {
      sheet.appendRow(objectToRow(headers, {
        id: generateId(),
        name: cat.name,
        icon: cat.icon,
        active: true,
        created_at: getCurrentISOString()
      }));
    }
  } catch (e) {
    Logger.log('Error seeding categories: ' + e.toString());
  } finally {
    lock.releaseLock();
  }
}
