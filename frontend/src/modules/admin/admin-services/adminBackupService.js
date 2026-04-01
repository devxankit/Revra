import { apiRequest } from './baseApiService';

class AdminBackupService {
  /**
   * Trigger a manual backup (runs in background)
   */
  async triggerBackup() {
    const response = await apiRequest('/admin/backup/trigger', { method: 'POST' });
    return response;
  }

  /**
   * Stop the running backup
   */
  async stopBackup() {
    const response = await apiRequest('/admin/backup/stop', { method: 'POST' });
    return response;
  }

  /**
   * Get backup log for debugging
   */
  async getBackupLog() {
    const response = await apiRequest('/admin/backup/log', { method: 'GET' });
    return response;
  }

  /**
   * Get current backup status (for polling)
   */
  async getBackupStatus() {
    const response = await apiRequest('/admin/backup/status', { method: 'GET' });
    return response;
  }

  /**
   * List backup files from Google Drive
   */
  async listBackups() {
    const response = await apiRequest('/admin/backup/list', { method: 'GET' });
    return response;
  }

  /**
   * Delete a backup by file ID
   */
  async deleteBackup(fileId) {
    const response = await apiRequest(`/admin/backup/${fileId}`, { method: 'DELETE' });
    return response;
  }

  /**
   * Delete backups older than specified days (default 30)
   */
  async cleanupOldBackups(days = 30) {
    const response = await apiRequest('/admin/backup/cleanup', {
      method: 'POST',
      body: JSON.stringify({ days }),
    });
    return response;
  }
}

const adminBackupService = new AdminBackupService();
export default adminBackupService;
