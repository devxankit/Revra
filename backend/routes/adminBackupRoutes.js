const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const { protect, authorize } = require('../middlewares/auth');
const googleDriveService = require('../services/googleDriveService');

const STATUS_FILE = path.join(__dirname, '../backup/status.json');
const PID_FILE = path.join(__dirname, '../backup/backup.pid');
const BACKUP_SCRIPT = path.join(__dirname, '../backup/backup.js');

// All routes are protected and admin-only
router.use(protect);
router.use(authorize('admin'));

/**
 * POST /admin/backup/trigger
 * Spawn backup.js in background. Return 202 if started, 409 if already running.
 */
router.post('/trigger', async (req, res) => {
  try {
    // Check if backup is already running
    if (fs.existsSync(STATUS_FILE)) {
      const statusData = JSON.parse(fs.readFileSync(STATUS_FILE, 'utf8'));
      if (statusData.running) {
        return res.status(409).json({
          success: false,
          message: 'Backup is already running. Please wait for it to complete.',
          code: 'BACKUP_IN_PROGRESS',
        });
      }
    }

    // Write initial status so first poll shows backup started
    const startTime = new Date().toISOString();
    const statusDir = path.dirname(STATUS_FILE);
    if (!fs.existsSync(statusDir)) {
      fs.mkdirSync(statusDir, { recursive: true });
    }
    fs.writeFileSync(
      STATUS_FILE,
      JSON.stringify({
        running: true,
        lastRun: startTime,
        lastError: null,
        lastFileName: null,
        step: 'starting',
        progress: 0,
        startedAt: startTime,
      }, null, 2),
      'utf8'
    );

    const nodePath = process.execPath;
    const backendDir = path.join(__dirname, '..');
    const child = spawn(nodePath, [BACKUP_SCRIPT], {
      detached: true,
      stdio: 'ignore',
      cwd: backendDir,
      env: { ...process.env },
    });

    child.on('error', (err) => {
      console.error('[Backup API] Failed to start backup process:', err);
      try {
        fs.writeFileSync(
          STATUS_FILE,
          JSON.stringify({
            running: false,
            lastRun: startTime,
            lastError: `Failed to start backup: ${err.message}`,
            lastFileName: null,
            step: 'error',
            progress: 0,
            startedAt: startTime,
          }, null, 2),
          'utf8'
        );
        if (fs.existsSync(PID_FILE)) fs.unlinkSync(PID_FILE);
      } catch (e) {
        console.error('[Backup API] Failed to write error status:', e);
      }
    });

    fs.writeFileSync(PID_FILE, String(child.pid), 'utf8');
    child.unref();

    res.status(202).json({
      success: true,
      message: 'Backup started. It will run in the background. Use /status to poll for completion.',
      jobId: `backup-${Date.now()}`,
    });
  } catch (err) {
    console.error('[Backup API] Trigger error:', err);
    res.status(500).json({
      success: false,
      message: err.message || 'Failed to start backup',
    });
  }
});

/**
 * POST /admin/backup/stop
 * Stop the running backup process
 */
router.post('/stop', (req, res) => {
  try {
    if (!fs.existsSync(STATUS_FILE)) {
      return res.json({
        success: true,
        message: 'No backup is running.',
      });
    }

    const statusData = JSON.parse(fs.readFileSync(STATUS_FILE, 'utf8'));
    if (!statusData.running) {
      return res.json({
        success: true,
        message: 'No backup is running.',
      });
    }

    let stopped = false;
    if (fs.existsSync(PID_FILE)) {
      try {
        const pid = parseInt(fs.readFileSync(PID_FILE, 'utf8'), 10);
        if (pid && !isNaN(pid)) {
          try {
            process.kill(pid, 'SIGTERM');
            stopped = true;
          } catch (killErr) {
            if (killErr.code !== 'ESRCH') throw killErr;
          }
        }
      } finally {
        try {
          if (fs.existsSync(PID_FILE)) fs.unlinkSync(PID_FILE);
        } catch (_) {}
      }
    }

    const startTime = statusData.startedAt || new Date().toISOString();
    fs.writeFileSync(
      STATUS_FILE,
      JSON.stringify({
        running: false,
        lastRun: startTime,
        lastError: 'Backup cancelled by user',
        lastFileName: null,
        step: 'error',
        progress: 0,
        startedAt: startTime,
      }, null, 2),
      'utf8'
    );

    res.json({
      success: true,
      message: stopped ? 'Backup stopped.' : 'Backup stop requested.',
    });
  } catch (err) {
    console.error('[Backup API] Stop error:', err);
    res.status(500).json({
      success: false,
      message: err.message || 'Failed to stop backup',
    });
  }
});

/**
 * GET /admin/backup/log
 * Get recent backup log for debugging
 */
const LOG_FILE = path.join(__dirname, '../backup/backup.log');
router.get('/log', (req, res) => {
  try {
    if (!fs.existsSync(LOG_FILE)) {
      return res.json({ success: true, data: { lines: [], message: 'No log file yet. Run a backup first.' } });
    }
    const content = fs.readFileSync(LOG_FILE, 'utf8');
    const lines = content.trim().split('\n').slice(-100);
    res.json({ success: true, data: { lines } });
  } catch (err) {
    console.error('[Backup API] Log error:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to read log' });
  }
});

/**
 * GET /admin/backup/status
 * Read status.json for polling
 */
router.get('/status', (req, res) => {
  try {
    if (!fs.existsSync(STATUS_FILE)) {
      return res.json({
        success: true,
        data: {
          running: false,
          lastRun: null,
          lastError: null,
          lastFileName: null,
          step: null,
          progress: 0,
          startedAt: null,
        },
      });
    }

    const data = JSON.parse(fs.readFileSync(STATUS_FILE, 'utf8'));
    res.json({
      success: true,
      data: {
        running: data.running ?? false,
        lastRun: data.lastRun ?? null,
        lastError: data.lastError ?? null,
        lastFileName: data.lastFileName ?? null,
        step: data.step ?? null,
        progress: data.progress ?? 0,
        startedAt: data.startedAt ?? null,
      },
    });
  } catch (err) {
    console.error('[Backup API] Status error:', err);
    res.status(500).json({
      success: false,
      message: err.message || 'Failed to read backup status',
    });
  }
});

/**
 * GET /admin/backup/list
 * List backup files from Google Drive
 */
router.get('/list', async (req, res) => {
  try {
    const files = await googleDriveService.listFiles();
    res.json({
      success: true,
      data: files.map((f) => ({
        id: f.id,
        name: f.name,
        size: f.size ? parseInt(f.size, 10) : null,
        createdTime: f.createdTime,
      })),
    });
  } catch (err) {
    console.error('[Backup API] List error:', err);
    res.status(500).json({
      success: false,
      message: err.message || 'Failed to list backups from Google Drive',
    });
  }
});

/**
 * DELETE /admin/backup/:fileId
 * Delete a specific backup from Google Drive
 */
router.delete('/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    if (!fileId) {
      return res.status(400).json({
        success: false,
        message: 'File ID is required',
      });
    }

    await googleDriveService.deleteFile(fileId);
    res.json({
      success: true,
      message: 'Backup deleted successfully',
    });
  } catch (err) {
    console.error('[Backup API] Delete error:', err);
    res.status(500).json({
      success: false,
      message: err.message || 'Failed to delete backup',
    });
  }
});

/**
 * POST /admin/backup/cleanup
 * Delete backups older than 30 days from Google Drive
 */
router.post('/cleanup', async (req, res) => {
  try {
    const days = parseInt(req.body.days || req.query.days || '30', 10);
    const { deleted, fileIds } = await googleDriveService.deleteOlderThanDays(days);
    res.json({
      success: true,
      message: `Deleted ${deleted} backup(s) older than ${days} days`,
      data: { deleted, fileIds },
    });
  } catch (err) {
    console.error('[Backup API] Cleanup error:', err);
    res.status(500).json({
      success: false,
      message: err.message || 'Failed to cleanup old backups',
    });
  }
});

module.exports = router;
