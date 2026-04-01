import React, { createContext, useContext, useState, useCallback } from 'react'
import Toast from '../components/ui/toast'

const ToastContext = createContext()

export const useToast = () => {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([])

  // Supports both:
  // - addToast({ message, type, ... })
  // - addToast(message, type?, options?)
  const addToast = useCallback((toastOrMessage, maybeType = 'info', maybeOptions = {}) => {
    const id = Date.now() + Math.random()
    const normalizedToast =
      typeof toastOrMessage === 'string'
        ? { message: toastOrMessage, type: maybeType, ...(maybeOptions || {}) }
        : (toastOrMessage || {})

    const newToast = {
      id,
      type: 'info',
      duration: 4000,
      ...normalizedToast
    }

    setToasts(prev => [...prev, newToast])
    return id
  }, [])

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])

  const clearAllToasts = useCallback(() => {
    setToasts([])
  }, [])

  // Convenience methods for different toast types
  // Convenience methods for different toast types
  const toast = React.useMemo(() => ({
    success: (message, options = {}) =>
      addToast({ type: 'success', message, ...options }),

    error: (message, options = {}) =>
      addToast({ type: 'error', message, ...options }),

    warning: (message, options = {}) =>
      addToast({ type: 'warning', message, ...options }),

    info: (message, options = {}) =>
      addToast({ type: 'info', message, ...options }),

    logout: (message, options = {}) =>
      addToast({ type: 'logout', message, ...options }),

    login: (message, options = {}) =>
      addToast({ type: 'login', message, ...options }),

    custom: (toastData) => addToast(toastData),

    clear: clearAllToasts
  }), [addToast, clearAllToasts])

  return (
    <ToastContext.Provider value={{ toast, addToast, removeToast, clearAllToasts }}>
      {children}

      {/* Toast Container */}
      <div className="fixed top-3 right-3 z-[9999] space-y-1">
        {toasts.map((toastItem) => (
          <Toast
            key={toastItem.id}
            toast={toastItem}
            onRemove={removeToast}
          />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export default ToastContext
