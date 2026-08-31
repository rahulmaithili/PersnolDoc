/**
 * Main router for the Personal Document Management System backend.
 * 
 * Available GET actions:
 * - getDocuments (protected): Retrieve user documents with pagination.
 * - getDocument (protected): Retrieve a specific document by ID.
 * - searchDocuments (protected): Search user documents based on query.
 * - filterDocuments (protected): Filter user documents based on criteria.
 * - getCategories (public): Get list of all categories.
 * - getProfile (protected): Get current user's profile information.
 * 
 * Available POST actions:
 * - login (public): Authenticate user and return token.
 * - logout (protected): Invalidate user session.
 * - forgotPassword (public): Request password reset token.
 * - resetPassword (public): Reset password using token.
 * - addDocument (protected): Create a new document.
 * - updateDocument (protected): Update an existing document.
 * - deleteDocument (protected): Delete a document and optionally drive file.
 * - toggleFavorite (protected): Toggle favorite status of a document.
 * - addCategory (protected): Add a new category.
 * - uploadFile (protected): Upload a file to Drive and return details.
 * - updateProfile (protected): Update user's profile information.
 */

function setup() {
  const ssId = getSpreadsheetId();
  if (!ssId) {
    Logger.log('SPREADSHEET_ID property is not set.');
    return;
  }
  const ss = SpreadsheetApp.openById(ssId);
  
  const sheetsConfig = {
    'Users': ['id', 'name', 'email', 'password_hash', 'profile_photo', 'role', 'status', 'created_at', 'updated_at'],
    'Sessions': ['id', 'user_id', 'token_hash', 'expiry', 'created_at'],
    'PasswordResets': ['id', 'email', 'token_hash', 'expiry', 'used', 'created_at'],
    'Documents': ['id', 'user_id', 'title', 'category', 'sub_category', 'document_number', 'institution_name', 'course_name', 'semester', 'month', 'year', 'receipt_number', 'issue_date', 'expiry_date', 'document_url', 'drive_file_id', 'file_name', 'file_type', 'description', 'tags', 'notes', 'favorite', 'created_at', 'updated_at'],
    'Categories': ['id', 'name', 'icon', 'active', 'created_at']
  };

  for (const sheetName in sheetsConfig) {
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      sheet.appendRow(sheetsConfig[sheetName]);
      // Freeze header row
      sheet.setFrozenRows(1);
    }
  }

  seedDefaultCategories();
  Logger.log('Setup completed successfully.');
}

function doGet(e) {
  return handleRequest(e, 'GET');
}

function doPost(e) {
  return handleRequest(e, 'POST');
}

function handleRequest(e, method) {
  try {
    let action = e.parameter.action;
    let params = e.parameter;
    let body = {};

    if (method === 'POST' && e.postData && e.postData.contents) {
      try {
        body = JSON.parse(e.postData.contents);
        if (body.action) {
          action = body.action;
        }
      } catch (err) {
        return createJsonResponse({ success: false, message: 'Invalid JSON body' });
      }
    }

    if (!action) {
      return createJsonResponse({ success: false, message: 'Action not specified' });
    }

    const publicActions = ['login', 'forgotPassword', 'resetPassword', 'getCategories'];
    let userId = null;

    if (!publicActions.includes(action)) {
      const authHeader = params.token || body.token || (e.headers && e.headers['Authorization']) || (e.headers && e.headers['authorization']);
      let token = authHeader;
      if (token && token.startsWith('Bearer ')) {
        token = token.substring(7);
      }
      
      if (!token) {
        return createJsonResponse({ success: false, message: 'Authentication required' }, 401);
      }
      
      userId = validateSession(token);
      if (!userId) {
        return createJsonResponse({ success: false, message: 'Invalid or expired session' }, 401);
      }
    }

    let response;

    switch (action) {
      case 'getCategories':
        response = jsonResponse(true, 'Categories fetched', getCategories());
        break;
      case 'login':
        response = login(body.email, body.password);
        break;
      case 'forgotPassword':
        response = forgotPassword(body.email);
        break;
      case 'resetPassword':
        response = resetPassword(body.email, body.otp, body.newPassword);
        break;
      case 'logout':
        const tokenToLogout = params.token || body.token || (e.headers && (e.headers['Authorization'] || e.headers['authorization'])).replace('Bearer ', '');
        response = logout(tokenToLogout);
        break;
      case 'getProfile':
        response = jsonResponse(true, 'Profile fetched', getProfile(userId));
        break;
      case 'updateProfile':
        response = updateProfile(userId, body.data);
        break;
      case 'getDocuments':
        response = getDocuments(userId, params.page ? parseInt(params.page) : 1, params.pageSize ? parseInt(params.pageSize) : 20);
        break;
      case 'getDocument':
        response = getDocument(userId, params.docId || body.docId);
        break;
      case 'searchDocuments':
        response = searchDocuments(userId, params.query || body.query);
        break;
      case 'filterDocuments':
        response = filterDocuments(userId, body.filters || {});
        break;
      case 'addDocument':
        response = addDocument(userId, body.data);
        break;
      case 'updateDocument':
        response = updateDocument(userId, body.docId, body.data);
        break;
      case 'deleteDocument':
        response = deleteDocument(userId, body.docId, body.deleteDriveFile);
        break;
      case 'toggleFavorite':
        response = toggleFavorite(userId, body.docId);
        break;
      case 'addCategory':
        response = addCategory(body.name, body.icon);
        break;
      case 'uploadFile':
        response = jsonResponse(true, 'File uploaded', uploadFile(body.base64Data, body.mimeType, body.fileName, userId));
        break;
      default:
        response = { success: false, message: 'Unknown action: ' + action };
    }

    return createJsonResponse(response);
  } catch (error) {
    return createJsonResponse({ success: false, message: 'Server error', error: error.toString(), stack: error.stack }, 500);
  }
}

function createJsonResponse(data, statusCode = 200) {
  // Apps Script doesn't let us easily set status codes via ContentService other than modifying the payload
  // In a real proxy setup we could handle this, but here we just return JSON with success flag.
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Diagnostic function to test email sending and trigger authorization popup.
 * Select 'testEmail' in the Apps Script editor and click 'Run'.
 */
function testEmail() {
  const email = Session.getActiveUser().getEmail();
  MailApp.sendEmail(email, "DocVault Test Email", "If you receive this email, Gmail authorization is working successfully!");
  Logger.log("Test email successfully sent to: " + email);
}
