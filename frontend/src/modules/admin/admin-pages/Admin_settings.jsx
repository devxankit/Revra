import React, { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import Admin_navbar from '../admin-components/Admin_navbar'
import Admin_sidebar from '../admin-components/Admin_sidebar'
import {
  Settings,
  Database,
  Cloud,
  RefreshCw,
  Trash2,
  Clock,
  AlertTriangle,
  Loader2,
  FileArchive,
  Info,
  Square,
} from 'lucide-react'
import { useToast } from '../../../contexts/ToastContext'
import Loading from '../../../components/ui/loading'
import adminBackupService from '../admin-services/adminBackupService'
import { Button } from '../../../components/ui/button'

const POLL_INTERVAL_MS = 2000

const BACKUP_STEPS = {
  starting: { label: 'Initializing...', progress: 5 },
  dump: { label: 'Creating database dump...', progress: 30 },
  upload: { label: 'Uploading to Google Drive...', progress: 70 },
  cleanup: { label: 'Finalizing...', progress: 90 },
  done: { label: 'Complete', progress: 100 },
  error: { label: 'Error', progress: 0 },
}

const formatBytes = (bytes) => {
  if (bytes == null) return '-'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const formatDate = (dateString) => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

const Admin_settings = () => {
  const { toast } = useToast()
  const [backups, setBackups] = useState([])
  const [isLoadingBackups, setIsLoadingBackups] = useState(true)
  const [isTriggering, setIsTriggering] = useState(false)
  const [isCleaning, setIsCleaning] = useState(false)
  const [backupStatus, setBackupStatus] = useState(null)
  const [showCleanupConfirm, setShowCleanupConfirm] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [isStopping, setIsStopping] = useState(false)
  const [showLog, setShowLog] = useState(false)
  const [logLines, setLogLines] = useState([])
  const [isLoadingLog, setIsLoadingLog] = useState(false)
  const pollIntervalRef = useRef(null)

  const fetchBackups = async () => {
    try {
      setIsLoadingBackups(true)
      const response = await adminBackupService.listBackups()
      if (response.success && response.data) {
        setBackups(response.data)
      } else {
        setBackups([])
      }
    } catch (err) {
      console.error('Error fetching backups:', err)
      toast.error(err.message || 'Failed to load backup history')
      setBackups([])
    } finally {
      setIsLoadingBackups(false)
    }
  }

  const fetchStatus = async () => {
    try {
      const response = await adminBackupService.getBackupStatus()
      if (response.success && response.data) {
        setBackupStatus(response.data)
        return response.data
      }
      return null
    } catch (err) {
      console.error('Error fetching status:', err)
      return null
    }
  }

  useEffect(() => {
    fetchBackups()
    fetchStatus()
  }, [])

  const startPolling = () => {
    if (pollIntervalRef.current) return
    pollIntervalRef.current = setInterval(async () => {
      const status = await fetchStatus()
      if (status && !status.running) {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current)
          pollIntervalRef.current = null
        }
        setIsTriggering(false)
        if (status.lastError) {
          toast.error(status.lastError)
        } else {
          toast.success('Backup completed successfully')
          fetchBackups()
        }
      }
    }, POLL_INTERVAL_MS)
  }

  const stopPolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }
  }

  useEffect(() => {
    return () => stopPolling()
  }, [])

  const handleBackupNow = async () => {
    try {
      setIsTriggering(true)
      setBackupStatus(null)
      const response = await adminBackupService.triggerBackup()
      if (response.success) {
        toast.info('Backup started. Please wait...')
        setBackupStatus((prev) => ({ ...prev, running: true, step: 'starting', progress: 0 }))
        fetchStatus()
        startPolling()
      } else {
        setIsTriggering(false)
        toast.error(response.message || 'Failed to start backup')
      }
    } catch (err) {
      setIsTriggering(false)
      if (err.message?.includes('already running')) {
        toast.warning('Backup is already running. Please wait.')
      } else {
        toast.error(err.message || 'Failed to start backup')
      }
    }
  }

  const handleDeleteBackup = async (fileId, fileName) => {
    try {
      setDeletingId(fileId)
      await adminBackupService.deleteBackup(fileId)
      toast.success(`Deleted ${fileName}`)
      fetchBackups()
    } catch (err) {
      toast.error(err.message || 'Failed to delete backup')
    } finally {
      setDeletingId(null)
    }
  }

  const fetchLog = async () => {
    try {
      setIsLoadingLog(true)
      const response = await adminBackupService.getBackupLog()
      if (response.success && response.data?.lines) {
        setLogLines(response.data.lines)
      } else {
        setLogLines([response.data?.message || 'No log available'])
      }
    } catch (err) {
      setLogLines([`Error: ${err.message}`])
    } finally {
      setIsLoadingLog(false)
    }
  }

  const handleShowLog = () => {
    setShowLog(!showLog)
    if (!showLog) fetchLog()
  }

  const handleStopBackup = async () => {
    try {
      setIsStopping(true)
      await adminBackupService.stopBackup()
      toast.info('Stopping backup...')
      setBackupStatus((prev) => (prev ? { ...prev, running: false } : null))
      setIsTriggering(false)
      stopPolling()
      fetchStatus()
    } catch (err) {
      toast.error(err.message || 'Failed to stop backup')
    } finally {
      setIsStopping(false)
    }
  }

  const handleCleanup = async () => {
    try {
      setIsCleaning(true)
      setShowCleanupConfirm(false)
      const response = await adminBackupService.cleanupOldBackups(30)
      if (response.success) {
        toast.success(response.message || 'Cleanup completed')
        fetchBackups()
      } else {
        toast.error(response.message || 'Cleanup failed')
      }
    } catch (err) {
      toast.error(err.message || 'Failed to cleanup old backups')
    } finally {
      setIsCleaning(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <Admin_navbar />
      <Admin_sidebar />

      <div className="ml-0 lg:ml-64 pt-16 lg:pt-20 p-4 lg:p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center justify-between"
          >
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Settings</h1>
              <p className="text-gray-600">Database backup and system configuration</p>
            </div>
            <div className="p-3 rounded-xl bg-gradient-to-br from-teal-100 to-cyan-100">
              <Settings className="h-6 w-6 text-teal-600" />
            </div>
          </motion.div>

          {/* Backup Now Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 shadow-xl border border-gray-200/50"
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-teal-100">
                  <Database className="h-8 w-8 text-teal-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-semibold text-gray-900 mb-1">Manual Backup</h2>
                  <p className="text-sm text-gray-600">
                    Create a backup now and upload it to Google Drive. This may take several minutes for large databases.
                  </p>
                  {backupStatus?.lastRun && !backupStatus?.running && (
                    <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Last backup: {formatDate(backupStatus.lastRun)}
                      {backupStatus.lastFileName && ` (${backupStatus.lastFileName})`}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button
                  onClick={handleBackupNow}
                  disabled={isTriggering || backupStatus?.running}
                >
                  {isTriggering || backupStatus?.running ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Backup in progress...
                    </>
                  ) : (
                    <>
                      <Cloud className="h-4 w-4 mr-2" />
                      Backup Now
                    </>
                  )}
                </Button>
                {(isTriggering || backupStatus?.running) && (
                  <Button
                    variant="outline"
                    onClick={handleStopBackup}
                    disabled={isStopping}
                    className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                  >
                    {isStopping ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Square className="h-4 w-4 mr-2" />
                        Stop Backup
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>

            {/* View Log - for debugging when backup fails */}
            <div className="mt-3">
              <Button variant="ghost" size="sm" onClick={handleShowLog} className="text-gray-500 hover:text-gray-700">
                {showLog ? 'Hide' : 'View'} backup log
              </Button>
              {showLog && (
                <div className="mt-2">
                  <Button variant="ghost" size="sm" onClick={fetchLog} disabled={isLoadingLog} className="mb-1 text-gray-500">
                    Refresh
                  </Button>
                  <div className="p-3 rounded-lg bg-gray-900 text-gray-100 font-mono text-xs max-h-48 overflow-y-auto">
                    {isLoadingLog ? (
                      <span className="text-gray-400">Loading...</span>
                    ) : logLines.length > 0 ? (
                      logLines.map((line, i) => (
                        <div key={i} className="whitespace-pre-wrap break-all">
                          {line}
                        </div>
                      ))
                    ) : (
                      <span className="text-gray-400">No log entries. Run a backup first.</span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Progress bar - shown when backup is running */}
            {(isTriggering || backupStatus?.running) && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-teal-700">
                    {BACKUP_STEPS[backupStatus?.step]?.label || 'Processing...'}
                  </span>
                  <span className="text-sm text-gray-500">
                    {backupStatus?.progress ?? 0}%
                  </span>
                </div>
                <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-teal-500 rounded-full transition-all duration-500 ease-out"
                    style={{
                      width: `${Math.min(100, Math.max(0, backupStatus?.progress ?? 0))}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </motion.div>

          {/* Backup History */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 shadow-xl border border-gray-200/50"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <FileArchive className="h-5 w-5 text-teal-600" />
                Backup History
              </h2>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchBackups}
                disabled={isLoadingBackups}
              >
                <RefreshCw className={`h-4 w-4 mr-1 ${isLoadingBackups ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>

            {isLoadingBackups ? (
              <div className="py-12 flex justify-center">
                <Loading />
              </div>
            ) : backups.length === 0 ? (
              <div className="py-12 text-center text-gray-500">
                <FileArchive className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p>No backups found in Google Drive</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-gray-700">File</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-700">Date</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-700">Size</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {backups.map((b) => (
                      <tr key={b.id} className="border-t border-gray-100 hover:bg-gray-50/50">
                        <td className="px-4 py-3 text-gray-900">{b.name}</td>
                        <td className="px-4 py-3 text-gray-600">{formatDate(b.createdTime)}</td>
                        <td className="px-4 py-3 text-gray-600">{formatBytes(b.size)}</td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleDeleteBackup(b.id, b.name)}
                            disabled={deletingId === b.id}
                          >
                            {deletingId === b.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>

          {/* Cleanup Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 shadow-xl border border-gray-200/50"
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-amber-100">
                  <Trash2 className="h-8 w-8 text-amber-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-1">Cleanup Old Backups</h2>
                  <p className="text-sm text-gray-600">
                    Remove backups older than 30 days from Google Drive to free up space.
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={() => setShowCleanupConfirm(true)}
                disabled={isCleaning}
                className="shrink-0 border-amber-200 text-amber-700 hover:bg-amber-50"
              >
                {isCleaning ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Old Backups
                  </>
                )}
              </Button>
            </div>

            {showCleanupConfirm && (
              <div className="mt-4 p-4 rounded-xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
                <p className="text-sm text-amber-800">
                  Are you sure? This will permanently delete all backups older than 30 days.
                </p>
                <div className="flex gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowCleanupConfirm(false)}
                    disabled={isCleaning}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    className="bg-amber-600 hover:bg-amber-700"
                    onClick={handleCleanup}
                    disabled={isCleaning}
                  >
                    {isCleaning ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm'}
                  </Button>
                </div>
              </div>
            )}
          </motion.div>

          {/* Automated Backup Info Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 shadow-xl border border-gray-200/50"
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Info className="h-5 w-5 text-teal-600" />
              Automated Daily Backup
            </h2>
            <p className="text-sm text-gray-600">
              Backups run automatically every day at 2:00 AM (server time).
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  )
}

export default Admin_settings
