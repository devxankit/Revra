/**
 * Daily backup scheduler - runs backup at 2 AM every day
 * Same pattern as dailyPointsScheduler - runs inside the Node.js app when server starts
 * No VPS crontab needed - just deploy and it works
 */

const path = require('path');
const { spawn } = require('child_process');

const BACKUP_SCRIPT = path.join(__dirname, '../backup/backup.js');
const BACKUP_HOUR = parseInt(process.env.BACKUP_HOUR || '2', 10); // 2 AM server local time

/**
 * Run the backup script
 */
const runBackup = () => {
  if (!process.env.GOOGLE_DRIVE_FOLDER_ID) {
    console.log('[Backup Scheduler] Skipped - GOOGLE_DRIVE_FOLDER_ID not configured');
    return;
  }

  const nodePath = process.execPath;
  const child = spawn(nodePath, [BACKUP_SCRIPT], {
    detached: true,
    stdio: 'ignore',
    cwd: path.join(__dirname, '..'),
    env: { ...process.env },
  });

  child.unref();
  console.log('[Backup Scheduler] Daily backup started at', new Date().toISOString());
};

/**
 * Calculate milliseconds until next 2 AM (server local time)
 */
const getMsUntil2AM = () => {
  const now = new Date();
  const next = new Date(now);
  next.setHours(BACKUP_HOUR, 0, 0, 0);

  if (now >= next) {
    next.setDate(next.getDate() + 1);
  }

  return next.getTime() - now.getTime();
};

/**
 * Start the daily backup scheduler
 * Runs at 2 AM every day - no crontab needed on VPS
 */
const startBackupScheduler = () => {
  if (!process.env.GOOGLE_DRIVE_FOLDER_ID) {
    console.log('[Backup Scheduler] Not started - GOOGLE_DRIVE_FOLDER_ID not in .env');
    return;
  }

  const msUntil2AM = getMsUntil2AM();
  const nextRun = new Date(Date.now() + msUntil2AM);

  console.log('[Backup Scheduler] Starting... Next backup at', nextRun.toLocaleString());

  setTimeout(() => {
    runBackup();
    setInterval(runBackup, 24 * 60 * 60 * 1000); // Every 24 hours
  }, msUntil2AM);
};

module.exports = {
  startBackupScheduler,
  runBackup,
};
