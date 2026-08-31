/**
 * Google Drive file management
 */

function uploadFile(base64Data, mimeType, fileName, userId) {
  if (!base64Data || !fileName) {
    throw new Error('Missing file data or name');
  }
  
  const folderId = getDriveFolderId();
  if (!folderId) {
    throw new Error('DRIVE_FOLDER_ID not configured');
  }
  
  let folder;
  try {
    folder = DriveApp.getFolderById(folderId);
  } catch (e) {
    throw new Error('Invalid drive folder ID or missing permissions');
  }
  
  // Clean base64 string if it contains data URL prefix
  let cleanBase64 = base64Data;
  if (base64Data.indexOf(',') > -1) {
    cleanBase64 = base64Data.split(',')[1];
  }
  
  // Create Blob and File
  const blob = Utilities.newBlob(Utilities.base64Decode(cleanBase64), mimeType, fileName);
  const file = folder.createFile(blob);
  
  // Set sharing permissions
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  
  return {
    fileId: file.getId(),
    fileName: file.getName(),
    fileUrl: file.getUrl(),
    mimeType: mimeType
  };
}

function deleteFile(fileId) {
  if (!fileId) return jsonResponse(false, 'File ID required');
  
  try {
    const file = DriveApp.getFileById(fileId);
    file.setTrashed(true);
    return jsonResponse(true, 'File deleted successfully');
  } catch (e) {
    return jsonResponse(false, 'Error deleting file: ' + e.toString());
  }
}
