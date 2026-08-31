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
    return jsonResponse(true, 'If email exists, OTP sent');
  }
  
  // Generate 6-digit numeric OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const hashedOtp = hashString(otp);
  const now = new Date();
  const expiry = new Date(now.getTime() + (10 * 60 * 1000)); // 10 minutes
  
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const resetSheet = getSheetByName('PasswordResets');
    const newReset = {
      id: generateId(),
      email: email.toLowerCase(),
      token_hash: hashedOtp,
      expiry: expiry.toISOString(),
      used: false,
      created_at: now.toISOString()
    };
    resetSheet.appendRow(objectToRow(resetSheet.getDataRange().getValues()[0], newReset));
    
    // Send professional HTML email using Apps Script MailApp
    const subject = "DocVault - Password Reset Verification OTP";
    const currentYear = new Date().getFullYear();
    const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #f4f5f7; margin: 0; padding: 0; color: #2d3748; }
        .email-container { max-width: 580px; margin: 40px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; }
        .email-header { background: linear-gradient(135deg, #4361ee, #1e2139); padding: 30px; text-align: center; color: #ffffff; }
        .email-header h1 { margin: 0; font-size: 1.8rem; font-weight: 700; letter-spacing: 0.5px; }
        .email-body { padding: 40px 35px; line-height: 1.6; }
        .email-body h2 { font-size: 1.25rem; font-weight: 600; color: #1a202c; margin-top: 0; margin-bottom: 16px; }
        .email-body p { margin-bottom: 24px; color: #4a5568; font-size: 0.95rem; }
        .otp-container { background-color: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 12px; padding: 24px; text-align: center; margin: 30px 0; }
        .otp-code { font-size: 2.2rem; font-weight: 800; letter-spacing: 6px; color: #4361ee; font-family: monospace; line-height: 1; }
        .otp-expiry { font-size: 0.78rem; color: #e53e3e; margin-top: 8px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
        .email-footer { background-color: #f8fafc; padding: 25px; text-align: center; border-top: 1px solid #edf2f7; font-size: 0.78rem; color: #a0aec0; }
        .email-footer p { margin: 5px 0; }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="email-header">
          <h1>DocVault</h1>
        </div>
        <div class="email-body">
          <h2>Password Reset Request</h2>
          <p>Hello,</p>
          <p>We received a request to reset your DocVault account password. Please use the following 6-digit verification OTP to complete the password reset process:</p>
          
          <div class="otp-container">
            <div class="otp-code">${otp}</div>
            <div class="otp-expiry">Valid for 10 minutes only</div>
          </div>
          
          <p>If you did not request this change, you can safely ignore this email. Your password will remain secure and unchanged.</p>
          <p>Best regards,<br><strong>DocVault Security Team</strong></p>
        </div>
        <div class="email-footer">
          <p>This is an automated security email. Please do not reply directly to this message.</p>
          <p>&copy; ${currentYear} DocVault. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
    `;

    MailApp.sendEmail({
      to: email,
      subject: subject,
      htmlBody: htmlBody
    });
    
    Logger.log("Password reset OTP for " + email + ": " + otp);
    return jsonResponse(true, 'Verification OTP sent to your email.');
  } catch (e) {
    return jsonResponse(false, 'Failed to process request: ' + e.toString());
  } finally {
    lock.releaseLock();
  }
}

function resetPassword(email, otp, newPassword) {
  if (!email || !otp || !newPassword) return jsonResponse(false, 'Email, OTP, and new password required');
  
  const hashedOtp = hashString(otp);
  const lock = LockService.getScriptLock();
  
  try {
    lock.waitLock(10000);
    const resetSheet = getSheetByName('PasswordResets');
    const resetData = resetSheet.getDataRange().getValues();
    const resetHeaders = resetData[0];
    const now = new Date();
    
    let resetRowIdx = -1;
    
    for (let i = 1; i < resetData.length; i++) {
      const row = rowToObject(resetHeaders, resetData[i]);
      if (row.email.toLowerCase() === email.toLowerCase() && row.token_hash === hashedOtp && !row.used && new Date(row.expiry) > now) {
        resetRowIdx = i + 1;
        break;
      }
    }
    
    if (resetRowIdx === -1) {
      return jsonResponse(false, 'Invalid or expired OTP');
    }
    
    const userSheet = getSheetByName('Users');
    const userData = userSheet.getDataRange().getValues();
    const userHeaders = userData[0];
    let userRowIdx = -1;
    
    for (let i = 1; i < userData.length; i++) {
      if (userData[i][userHeaders.indexOf('email')].toLowerCase() === email.toLowerCase()) {
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
    
    // Mark OTP as used
    resetSheet.getRange(resetRowIdx, resetHeaders.indexOf('used') + 1).setValue(true);
    
    return jsonResponse(true, 'Password successfully reset');
  } catch (e) {
    return jsonResponse(false, 'Error resetting password: ' + e.toString());
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
