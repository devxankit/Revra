#!/usr/bin/env node
/**
 * MongoDB Backup Script - Creates compressed backup and uploads to Google Drive
 * Run via cron: 0 2 * * * cd /path/to/backend && node backup/backup.js
 * Or manually: node backup/backup.js
 */

const path = require('path');
const fs = require('fs');
const { execSync, spawnSync } = require('child_process');

// Load environment variables (script runs standalone)
const envPath = path.join(__dirname, '../.env');
require('dotenv').config({ path: envPath });

const STATUS_FILE = path.join(__dirname, 'status.json');
const PID_FILE = path.join(__dirname, 'backup.pid');
const LOG_FILE = path.join(__dirname, 'backup.log');
const LOCAL_BACKUP_DIR = path.join(__dirname, 'local');
const RETENTION_DAYS = parseInt(process.env.BACKUP_RETENTION_DAYS || '30', 10);
const MONGODUMP_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes max for dump

/**
 * Debug logger - writes to console AND backup.log (so we can trace when spawned with stdio: 'ignore')
 */
function log(msg, data = null) {
  const ts = new Date().toISOString();
  const line = data != null ? `[${ts}] [Backup] ${msg} ${JSON.stringify(data)}` : `[${ts}] [Backup] ${msg}`;
  console.log(line);
  try {
    fs.appendFileSync(LOG_FILE, line + '\n', 'utf8');
  } catch (e) {
    console.error('Could not write to log file:', e.message);
  }
}

// Handle SIGTERM (when admin clicks Stop)
process.on('SIGTERM', () => {
  log('Received stop signal. Cancelling...');
  let startTime = new Date().toISOString();
  if (fs.existsSync(STATUS_FILE)) {
    try {
      const d = JSON.parse(fs.readFileSync(STATUS_FILE, 'utf8'));
      startTime = d.startedAt || startTime;
    } catch (_) {}
  }
  writeStatus({
    running: false,
    lastRun: startTime,
    lastError: 'Backup cancelled by user',
    lastFileName: null,
    step: 'error',
    progress: 0,
    startedAt: startTime,
  });
  if (fs.existsSync(PID_FILE)) {
    try {
      fs.unlinkSync(PID_FILE);
    } catch (e) {
      console.warn('[Backup] Could not remove pid file:', e.message);
    }
  }
  process.exit(130);
});

/**
 * Write status to status.json for API polling
 * step: 'starting' | 'dump' | 'upload' | 'cleanup' | 'done' | 'error'
 * progress: 0-100
 */
function writeStatus(status) {
  try {
    const data = {
      running: status.running ?? false,
      lastRun: status.lastRun ?? null,
      lastError: status.lastError ?? null,
      lastFileName: status.lastFileName ?? null,
      step: status.step ?? null,
      progress: status.progress ?? 0,
      startedAt: status.startedAt ?? null,
    };
    fs.writeFileSync(STATUS_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to write status file:', err.message);
  }
}

/**
 * Find mongodump executable path.
 * Node.js often has a different PATH than the user's shell (e.g. when run from VS Code).
 * Returns path string or null if not found.
 */
function getMongodumpPath() {
  if (process.env.MONGODUMP_PATH) {
    const p = process.env.MONGODUMP_PATH.trim();
    if (fs.existsSync(p)) return p;
    const withExe = p.endsWith('.exe') ? p : p + '.exe';
    if (fs.existsSync(withExe)) return withExe;
    log('MONGODUMP_PATH set but not found', { path: p });
  }

  if (process.platform === 'win32') {
    const programFiles = process.env['ProgramFiles'] || 'C:\\Program Files';
    const programFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
    const searchDirs = [
      path.join(programFiles, 'MongoDB', 'Tools'),
      path.join(programFiles, 'MongoDB', 'Database Tools'),
      path.join(programFilesX86, 'MongoDB', 'Tools'),
    ];
    for (const dir of searchDirs) {
      if (!fs.existsSync(dir)) continue;
      try {
        const versions = fs.readdirSync(dir);
        for (const v of versions) {
          const binPath = path.join(dir, v, 'bin', 'mongodump.exe');
          if (fs.existsSync(binPath)) {
            log('Found mongodump at', { path: binPath });
            return binPath;
          }
        }
      } catch (_) {}
    }
  }

  return null;
}

/**
 * Check if mongodump is available and return its path
 */
function checkMongodump() {
  const explicitPath = getMongodumpPath();
  if (explicitPath) {
    try {
      execSync(`"${explicitPath}" --version`, { stdio: 'pipe', timeout: 5000 });
      log('mongodump found and working', { path: explicitPath });
      return explicitPath;
    } catch (err) {
      log('mongodump at path failed', { path: explicitPath, error: err.message });
      return false;
    }
  }

  const commands = process.platform === 'win32' ? ['mongodump --version', 'mongodump.cmd --version'] : ['mongodump --version'];
  for (const cmd of commands) {
    try {
      log('Checking mongodump:', { cmd });
      execSync(cmd, { stdio: 'pipe', timeout: 5000 });
      log('mongodump found in PATH');
      return 'mongodump';
    } catch (err) {
      log('mongodump check failed:', { cmd, error: err.message });
    }
  }
  return false;
}

/**
 * Create MongoDB backup using mongodump
 * @param {string} mongodumpPath - Path to mongodump executable (or 'mongodump' if in PATH)
 * @returns {string} Path to the backup file
 */
function createBackup(mongodumpPath) {
  const timestamp = new Date().toISOString().replace(/[:.T]/g, '-').slice(0, 19);
  const fileName = `crm-backup-${timestamp}.gz`;
  const filePath = path.join(__dirname, fileName);

  let uri = (process.env.MONGODB_URI || '').trim();
  if (!uri) {
    throw new Error('MONGODB_URI is not set in environment variables');
  }

  const useShell = process.platform === 'win32' && mongodumpPath === 'mongodump';
  const argStyle = process.platform === 'win32' ? 'windows' : 'posix';
  const args = argStyle === 'windows'
    ? [`/uri:${uri}`, `/archive:${filePath}`, '/gzip']
    : ['--uri', uri, '--archive', filePath, '--gzip'];

  log('Starting mongodump', { mongodumpPath, filePath, uriMasked: uri ? `${uri.slice(0, 25)}...` : 'missing', timeoutMin: MONGODUMP_TIMEOUT_MS / 60000, argStyle });

  const result = spawnSync(mongodumpPath, args, {
    stdio: 'pipe',
    encoding: 'utf8',
    timeout: MONGODUMP_TIMEOUT_MS,
    maxBuffer: 10 * 1024 * 1024,
    shell: useShell,
  });

  if (result.error) {
    log('mongodump spawn error', { error: result.error.message, code: result.error.code });
    throw new Error(`mongodump failed: ${result.error.message}. Ensure MongoDB Database Tools are installed.`);
  }

  if (result.status !== 0) {
    const stderr = (result.stderr || '').slice(0, 500);
    const stdout = (result.stdout || '').slice(0, 500);
    log('mongodump failed', { status: result.status, stderr, stdout });
    throw new Error(`mongodump failed with code ${result.status}: ${stderr || stdout}`);
  }

  if (!fs.existsSync(filePath)) {
    throw new Error('Backup file was not created');
  }

  const size = fs.statSync(filePath).size;
  log('mongodump completed', { filePath, size });
  return filePath;
}

/**
 * Main backup workflow
 */
async function runBackup() {
  const startTime = new Date().toISOString();
  log('===== Backup started =====', { envPath, hasEnv: fs.existsSync(envPath) });

  writeStatus({
    running: true,
    lastRun: startTime,
    lastError: null,
    lastFileName: null,
    step: 'starting',
    progress: 5,
    startedAt: startTime,
  });

  let backupFilePath = null;
  let uploadedFileName = null;

  try {
    log('Step: Validating environment');
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is not set. Add it to your .env file.');
    }
    if (!process.env.GOOGLE_DRIVE_FOLDER_ID) {
      throw new Error('GOOGLE_DRIVE_FOLDER_ID is not set. Add it to your .env file.');
    }
    log('Env validation OK');

    log('Step: Checking mongodump');
    const mongodumpPath = checkMongodump();
    if (!mongodumpPath) {
      const installHint = process.platform === 'win32'
        ? 'Install MongoDB Database Tools for Windows from https://www.mongodb.com/try/download/database-tools. Or set MONGODUMP_PATH in .env to the full path (e.g. C:\\Program Files\\MongoDB\\Tools\\100\\bin\\mongodump.exe)'
        : 'Run: sudo apt install mongodb-database-tools (Ubuntu/Debian)';
      throw new Error(`mongodump is not installed. ${installHint}`);
    }

    writeStatus({ running: true, step: 'dump', progress: 15, startedAt: startTime });
    log('Step: Creating MongoDB dump (this may take several minutes)...');
    backupFilePath = createBackup(mongodumpPath);
    uploadedFileName = path.basename(backupFilePath);
    log('Dump created', { uploadedFileName });

    writeStatus({ running: true, step: 'upload', progress: 50, startedAt: startTime });
    log('Step: Uploading to Google Drive');
    const { uploadFile } = require('../services/googleDriveService');
    try {
      await uploadFile(backupFilePath, uploadedFileName);
      log('Upload complete');
    } catch (uploadErr) {
      log('Drive upload failed, saving locally', { error: uploadErr.message });
      if (!fs.existsSync(LOCAL_BACKUP_DIR)) {
        fs.mkdirSync(LOCAL_BACKUP_DIR, { recursive: true });
      }
      const localPath = path.join(LOCAL_BACKUP_DIR, uploadedFileName);
      fs.copyFileSync(backupFilePath, localPath);
      fs.unlinkSync(backupFilePath);
      backupFilePath = null;
      writeStatus({
        running: false,
        lastRun: startTime,
        lastError: `Drive upload failed (saved locally to backup/local/): ${uploadErr.message}`,
        lastFileName: uploadedFileName,
        step: 'error',
        progress: 50,
        startedAt: startTime,
      });
      log('Backup saved locally at', { path: localPath });
      process.exit(1);
    }

    writeStatus({ running: true, step: 'cleanup', progress: 85, startedAt: startTime });
    fs.unlinkSync(backupFilePath);
    backupFilePath = null;
    log('Local file removed');

    if (RETENTION_DAYS > 0) {
      try {
        const { deleteOlderThanDays } = require('../services/googleDriveService');
        const { deleted } = await deleteOlderThanDays(RETENTION_DAYS);
        if (deleted > 0) {
          log('Cleaned up old backups', { deleted });
        }
      } catch (cleanupErr) {
        log('Cleanup warning', { error: cleanupErr.message });
      }
    }

    writeStatus({
      running: false,
      lastRun: startTime,
      lastError: null,
      lastFileName: uploadedFileName,
      step: 'done',
      progress: 100,
      startedAt: startTime,
    });

    log('===== Backup completed successfully =====');
    if (fs.existsSync(PID_FILE)) {
      try {
        fs.unlinkSync(PID_FILE);
      } catch (e) {
        console.warn('[Backup] Could not remove pid file:', e.message);
      }
    }
    process.exit(0);
  } catch (err) {
    log('===== Backup FAILED =====', { error: err.message, stack: err.stack?.slice(0, 300) });

    writeStatus({
      running: false,
      lastRun: startTime,
      lastError: err.message,
      lastFileName: uploadedFileName || null,
      step: 'error',
      progress: 0,
      startedAt: startTime,
    });

    // Clean up local file on error
    if (backupFilePath && fs.existsSync(backupFilePath)) {
      try {
        fs.unlinkSync(backupFilePath);
      } catch (e) {
        console.warn('[Backup] Could not remove temp file:', e.message);
      }
    }

    if (fs.existsSync(PID_FILE)) {
      try {
        fs.unlinkSync(PID_FILE);
      } catch (e) {
        console.warn('[Backup] Could not remove pid file:', e.message);
      }
    }
    process.exit(1);
  }
}

log('Script started', { cwd: process.cwd(), platform: process.platform, nodeVersion: process.version });
runBackup().catch((err) => {
  log('Unhandled error', { error: err.message });
  process.exit(1);
});
