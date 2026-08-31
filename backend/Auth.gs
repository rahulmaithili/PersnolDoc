/**
 * Authentication and User Management functions
 */

function hashString(str) {
  if (!str) return null;
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, str);
  let hexString = '';
  for (let i = 0; i < digest.length; i++) {
    let byte = digest[i];
    if (byte < 0) byte += 256;
    let hex = byte.toString(16);
    if (hex.length === 1) hex = '0' + hex;
    hexString += hex;
  }
  return hexString.toLowerCase();
}

function generateToken() {
  return (Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '')).toLowerCase();
}

function login(email, password) {
  if (!email || !password) return jsonResponse(false, 'Email and password required');
  
  const sheet = getSheetByName('Users');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  let user = null;
  for (let i = 1; i < data.length; i++) {
    const rowObj = rowToObject(headers, data[i]);
    if (rowObj.email.toLowerCase() === email.toLowerCase()) {
      user = rowObj;
      break;
    }
  }
  
  if (!user || user.password_hash !== hashString(password)) {
    return jsonResponse(false, 'Invalid email or password');
  }
  
  const token = generateToken();
  const hashedToken = hashString(token);
  const now = new Date();
  const expiry = new Date(now.getTime() + (24 * 60 * 60 * 1000)); // 24 hours
  
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const sessionSheet = getSheetByName('Sessions');
    const newSession = {
      id: generateId(),
      user_id: user.id,
      token_hash: hashedToken,
      expiry: expiry.toISOString(),
      created_at: now.toISOString()
    };
    sessionSheet.appendRow(objectToRow(sessionSheet.getDataRange().getValues()[0], newSession));
  } catch (e) {
    return jsonResponse(false, 'Failed to create session');
  } finally {
    lock.releaseLock();
  }
  
  const userData = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    profile_photo: user.profile_photo
  };
  
  return jsonResponse(true, 'Login successful', { token: token, user: userData });
}

function logout(token) {
  if (!token) return jsonResponse(false, 'Token required');
  
  const hashedToken = hashString(token);
  const lock = LockService.getScriptLock();
  
  try {
    lock.waitLock(10000);
    const sheet = getSheetByName('Sessions');
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    
    for (let i = 1; i < data.length; i++) {
      const row = rowToObject(headers, data[i]);
      if (row.token_hash === hashedToken) {
        // Mark as expired immediately
        sheet.getRange(i + 1, headers.indexOf('expiry') + 1).setValue(new Date().toISOString());
        return jsonResponse(true, 'Logged out');
      }
    }
    return jsonResponse(false, 'Session not found');
  } catch (e) {
    return jsonResponse(false, 'Error during logout');
  } finally {
    lock.releaseLock();
  }
}

function validateSession(token) {
  if (!token) return null;
  const hashedToken = hashString(token);
  const sheet = getSheetByName('Sessions');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const now = new Date();
  
  for (let i = 1; i < data.length; i++) {
    const row = rowToObject(headers, data[i]);
    if (row.token_hash === hashedToken) {
      if (new Date(row.expiry) > now) {
        return row.user_id;
      }
      return null; // Expired
    }
  }
  return null;
}

function forgotPassword(email) {
  if (!email) return jsonResponse(false, 'Email required');
  
  const sheet = getSheetByName('Users');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  let userExists = false;
  for (let i = 1; i < data.length; i++) {
    if (data[i][headers.indexOf('email')].toLowerCase() === email.toLowerCase()) {
      userExists = true;
      break;
    }
  }
  
  if (!userExists) {
    return jsonResponse(true, 'If email exists, reset link sent'); // Generic message for security
  }
  
  const token = generateToken();
  const hashedToken = hashString(token);
  const now = new Date();
  const expiry = new Date(now.getTime() + (60 * 60 * 1000)); // 1 hour
  
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const resetSheet = getSheetByName('PasswordResets');
    const newReset = {
      id: generateId(),
      email: email.toLowerCase(),
      token_hash: hashedToken,
      expiry: expiry.toISOString(),
      used: false,
      created_at: now.toISOString()
    };
    resetSheet.appendRow(objectToRow(resetSheet.getDataRange().getValues()[0], newReset));
    
    // In real usage, send email here: MailApp.sendEmail(email, "Password Reset", "Your reset token is: " + token);
    Logger.log("Password reset token for " + email + ": " + token);
    
    return jsonResponse(true, 'If email exists, reset link sent', { resetToken: token }); // Including token for dev mode
  } catch (e) {
    return jsonResponse(false, 'Failed to process request');
  } finally {
    lock.releaseLock();
  }
}

function resetPassword(token, newPassword) {
  if (!token || !newPassword) return jsonResponse(false, 'Token and new password required');
  
  const hashedToken = hashString(token);
  const lock = LockService.getScriptLock();
  
  try {
    lock.waitLock(10000);
    const resetSheet = getSheetByName('PasswordResets');
    const resetData = resetSheet.getDataRange().getValues();
    const resetHeaders = resetData[0];
    const now = new Date();
    
    let resetRowIdx = -1;
    let email = '';
    
    for (let i = 1; i < resetData.length; i++) {
      const row = rowToObject(resetHeaders, resetData[i]);
      if (row.token_hash === hashedToken && !row.used && new Date(row.expiry) > now) {
        resetRowIdx = i + 1;
        email = row.email;
        break;
      }
    }
    
    if (resetRowIdx === -1) {
      return jsonResponse(false, 'Invalid or expired reset token');
    }
    
    const userSheet = getSheetByName('Users');
    const userData = userSheet.getDataRange().getValues();
    const userHeaders = userData[0];
    let userRowIdx = -1;
    
    for (let i = 1; i < userData.length; i++) {
      if (userData[i][userHeaders.indexOf('email')].toLowerCase() === email) {
        userRowIdx = i + 1;
        break;
      }
    }
    
    if (userRowIdx === -1) {
      return jsonResponse(false, 'User not found');
    }
    
    // Update password
    userSheet.getRange(userRowIdx, userHeaders.indexOf('password_hash') + 1).setValue(hashString(newPassword));
    userSheet.getRange(userRowIdx, userHeaders.indexOf('updated_at') + 1).setValue(now.toISOString());
    
    // Mark token as used
    resetSheet.getRange(resetRowIdx, resetHeaders.indexOf('used') + 1).setValue(true);
    
    return jsonResponse(true, 'Password successfully reset');
  } catch (e) {
    return jsonResponse(false, 'Error resetting password');
  } finally {
    lock.releaseLock();
  }
}

function getProfile(userId) {
  const sheet = getSheetByName('Users');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  for (let i = 1; i < data.length; i++) {
    const row = rowToObject(headers, data[i]);
    if (row.id === userId) {
      return {
        id: row.id,
        name: row.name,
        email: row.email,
        role: row.role,
        profile_photo: row.profile_photo,
        created_at: row.created_at
      };
    }
  }
  return null;
}

function updateProfile(userId, data) {
  if (!data) return jsonResponse(false, 'Data required');
  
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const sheet = getSheetByName('Users');
    const sheetData = sheet.getDataRange().getValues();
    const headers = sheetData[0];
    
    for (let i = 1; i < sheetData.length; i++) {
      const row = rowToObject(headers, sheetData[i]);
      if (row.id === userId) {
        const rowIdx = i + 1;
        if (data.name !== undefined) {
          sheet.getRange(rowIdx, headers.indexOf('name') + 1).setValue(sanitizeCell(data.name));
        }
        if (data.profile_photo !== undefined) {
          sheet.getRange(rowIdx, headers.indexOf('profile_photo') + 1).setValue(sanitizeCell(data.profile_photo));
        }
        sheet.getRange(rowIdx, headers.indexOf('updated_at') + 1).setValue(getCurrentISOString());
        return jsonResponse(true, 'Profile updated', getProfile(userId));
      }
    }
    return jsonResponse(false, 'User not found');
  } catch (e) {
    return jsonResponse(false, 'Error updating profile');
  } finally {
    lock.releaseLock();
  }
}
