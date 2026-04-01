/**
 * Google Drive Service - Handles file operations for MongoDB backups
 *
 * Auth methods (in order of priority):
 * 1. OAuth (GOOGLE_OAUTH_*) - Works with personal Gmail. Run: node scripts/get-google-refresh-token.js
 * 2. Domain-wide delegation (GOOGLE_IMPERSONATE_USER) - Works with Google Workspace
 * 3. Service account (google-key.json) - Requires folder in Shared Drive
 */

const { google } = require('googleapis');
const { JWT, OAuth2Client } = require('google-auth-library');
const fs = require('fs');
const path = require('path');

const KEY_FILE_PATH = path.join(__dirname, '../config/google-key.json');
const SCOPES = ['https://www.googleapis.com/auth/drive'];

let driveClient = null;

/**
 * Ensure dotenv is loaded (service may be required before app entry point)
 */
function ensureEnvLoaded() {
  if (typeof process.env.GOOGLE_DRIVE_FOLDER_ID !== 'undefined') return;
  const envPath = path.join(__dirname, '../.env');
  if (fs.existsSync(envPath)) {
    require('dotenv').config({ path: envPath });
  }
}

/**
 * Check which auth method to use
 */
function getAuthMode() {
  const oauthRefresh = (process.env.GOOGLE_OAUTH_REFRESH_TOKEN || '').trim();
  const impersonate = (process.env.GOOGLE_IMPERSONATE_USER || '').trim();
  if (oauthRefresh && process.env.GOOGLE_OAUTH_CLIENT_ID && process.env.GOOGLE_OAUTH_CLIENT_SECRET) {
    return 'oauth';
  }
  if (impersonate) return 'impersonate';
  return 'service_account';
}

/**
 * Get or initialize the Google Drive API client
 * @returns {Object} drive instance
 */
function getDriveClient() {
  ensureEnvLoaded();

  const folderId = (process.env.GOOGLE_DRIVE_FOLDER_ID || '').trim();
  if (!folderId) {
    throw new Error('GOOGLE_DRIVE_FOLDER_ID is not set in environment variables');
  }

  if (driveClient) {
    return driveClient;
  }

  const authMode = getAuthMode();

  if (authMode === 'oauth') {
    // OAuth - works with personal Gmail, uploads to user's Drive (their quota)
    const oauth2Client = new OAuth2Client(
      process.env.GOOGLE_OAUTH_CLIENT_ID,
      process.env.GOOGLE_OAUTH_CLIENT_SECRET,
      'urn:ietf:wg:oauth:2.0:oob'
    );
    oauth2Client.setCredentials({
      refresh_token: process.env.GOOGLE_OAUTH_REFRESH_TOKEN.trim(),
    });
    driveClient = google.drive({ version: 'v3', auth: oauth2Client });
  } else if (authMode === 'impersonate') {
    // Domain-wide delegation - Workspace only
    if (!fs.existsSync(KEY_FILE_PATH)) {
      throw new Error(`Service account key not found at: ${KEY_FILE_PATH}`);
    }
    const key = JSON.parse(fs.readFileSync(KEY_FILE_PATH, 'utf8'));
    const jwtClient = new JWT({
      email: key.client_email,
      key: key.private_key,
      scopes: SCOPES,
      subject: process.env.GOOGLE_IMPERSONATE_USER.trim(),
    });
    driveClient = google.drive({ version: 'v3', auth: jwtClient });
  } else {
    // Service account - folder MUST be in Shared Drive
    if (!fs.existsSync(KEY_FILE_PATH)) {
      throw new Error(`Service account key not found at: ${KEY_FILE_PATH}`);
    }
    const auth = new google.auth.GoogleAuth({
      keyFile: KEY_FILE_PATH,
      scopes: SCOPES,
    });
    driveClient = google.drive({ version: 'v3', auth });
  }

  return driveClient;
}

/**
 * Verify folder is accessible. Skip for OAuth/impersonate (user's Drive). For service account, require Shared Drive.
 */
async function verifyFolder() {
  const authMode = getAuthMode();
  if (authMode === 'oauth' || authMode === 'impersonate') {
    return; // User's Drive - no quota check
  }

  const drive = getDriveClient();
  const folderId = (process.env.GOOGLE_DRIVE_FOLDER_ID || '').trim();

  const folder = await drive.files.get({
    fileId: folderId,
    fields: 'id, name, driveId',
    supportsAllDrives: true,
  });

  if (!folder.data.driveId) {
    const key = JSON.parse(fs.readFileSync(KEY_FILE_PATH, 'utf8'));
    const email = key.client_email || 'your-service-account@....iam.gserviceaccount.com';
    throw new Error(
      'Folder must be in a Shared Drive. Service accounts have no storage. ' +
        'Use OAuth for personal Drive: run "node scripts/get-google-refresh-token.js" and add GOOGLE_OAUTH_* to .env'
    );
  }
}

/**
 * Validate that we have credentials for the current auth mode
 */
function validateCredentials() {
  const authMode = getAuthMode();
  if (authMode === 'oauth') return;
  if (authMode === 'impersonate' || authMode === 'service_account') {
    if (!fs.existsSync(KEY_FILE_PATH)) {
      throw new Error(`Service account key not found: ${KEY_FILE_PATH}`);
    }
  }
}

/**
 * Upload a file to the configured Google Drive folder.
 *
 * @param {string} filePath - Full path to the local file
 * @param {string} fileName - Name for the file in Drive
 * @returns {Promise<Object>} Uploaded file metadata
 */
async function uploadToDrive(filePath, fileName) {
  ensureEnvLoaded();

  const folderId = (process.env.GOOGLE_DRIVE_FOLDER_ID || '').trim();
  if (!folderId) {
    const err = new Error('GOOGLE_DRIVE_FOLDER_ID is not set in .env');
    console.error('[Drive] Upload failed:', err.message);
    throw err;
  }

  if (!fs.existsSync(filePath)) {
    const err = new Error(`File not found: ${filePath}`);
    console.error('[Drive] Upload failed:', err.message);
    throw err;
  }

  try {
    validateCredentials();
  } catch (err) {
    console.error('[Drive] Upload failed:', err.message);
    throw err;
  }

  console.log('[Drive] Upload started', { fileName, folderId });

  const drive = getDriveClient();
  await verifyFolder();

  const fileMetadata = {
    name: fileName,
    parents: [folderId],
  };

  const media = {
    mimeType: 'application/gzip',
    body: fs.createReadStream(filePath),
  };

  try {
    const response = await drive.files.create({
      requestBody: fileMetadata,
      media,
      fields: 'id, name, size, createdTime, webViewLink',
      supportsAllDrives: true,
    });

    const data = response.data;
    console.log('[Drive] Upload success', {
      fileId: data.id,
      name: data.name,
      size: data.size,
      createdTime: data.createdTime,
    });
    return data;
  } catch (err) {
    console.error('[Drive] Upload failed', { error: err.message });
    throw err;
  }
}

/**
 * Alias for uploadToDrive (backward compatibility)
 */
async function uploadFile(filePath, fileName) {
  return uploadToDrive(filePath, fileName);
}

/**
 * List all files in the backup folder
 */
async function listFiles() {
  const drive = getDriveClient();
  const folderId = (process.env.GOOGLE_DRIVE_FOLDER_ID || '').trim();

  const response = await drive.files.list({
    q: `'${folderId}' in parents and trashed = false`,
    fields: 'files(id, name, size, createdTime, mimeType)',
    orderBy: 'createdTime desc',
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  return response.data.files || [];
}

/**
 * Delete a file from Google Drive by ID
 */
async function deleteFile(fileId) {
  const drive = getDriveClient();
  await drive.files.delete({ fileId, supportsAllDrives: true });
}

/**
 * Delete backups older than specified days
 */
async function deleteOlderThanDays(days = 30) {
  const files = await listFiles();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const toDelete = files.filter((file) => {
    const createdTime = file.createdTime ? new Date(file.createdTime) : null;
    return createdTime && createdTime < cutoffDate;
  });

  const deleted = [];
  for (const file of toDelete) {
    await deleteFile(file.id);
    deleted.push(file.id);
  }

  return { deleted: deleted.length, fileIds: deleted };
}

module.exports = {
  getDriveClient,
  uploadToDrive,
  uploadFile,
  listFiles,
  deleteFile,
  deleteOlderThanDays,
};
