import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Info, 
  X,
  LogOut,
  LogIn,
  User
} from 'lucide-react'

const Toast = ({ toast, onRemove }) => {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false)
      setTimeout(() => onRemove(toast.id), 300) // Wait for animation to complete
    }, toast.duration || 4000)

    return () => clearTimeout(timer)
  }, [toast.id, toast.duration, onRemove])

  const getToastConfig = () => {
    switch (toast.type) {
      case 'success':
        return {
          icon: <CheckCircle className="h-4 w-4" />,
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          iconColor: 'text-green-500',
          textColor: 'text-green-800',
          titleColor: 'text-green-900'
        }
      case 'error':
        return {
          icon: <XCircle className="h-4 w-4" />,
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          iconColor: 'text-red-500',
          textColor: 'text-red-800',
          titleColor: 'text-red-900'
        }
      case 'warning':
        return {
          icon: <AlertCircle className="h-4 w-4" />,
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          iconColor: 'text-yellow-500',
          textColor: 'text-yellow-800',
          titleColor: 'text-yellow-900'
        }
      case 'info':
        return {
          icon: <Info className="h-4 w-4" />,
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          iconColor: 'text-blue-500',
          textColor: 'text-blue-800',
          titleColor: 'text-blue-900'
        }
      case 'logout':
        return {
          icon: <LogOut className="h-4 w-4" />,
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          iconColor: 'text-gray-500',
          textColor: 'text-gray-800',
          titleColor: 'text-gray-900'
        }
      case 'login':
        return {
          icon: <LogIn className="h-4 w-4" />,
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          iconColor: 'text-green-500',
          textColor: 'text-green-800',
          titleColor: 'text-green-900'
        }
      default:
        return {
          icon: <Info className="h-4 w-4" />,
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          iconColor: 'text-blue-500',
          textColor: 'text-blue-800',
          titleColor: 'text-blue-900'
        }
    }
  }

  const config = getToastConfig()

  const handleClose = () => {
    setIsVisible(false)
    setTimeout(() => onRemove(toast.id), 300)
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, x: 300, scale: 0.8 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 300, scale: 0.8 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className={`
            relative max-w-xs w-full ${config.bgColor} ${config.borderColor} 
            border rounded-md shadow-md p-3 mb-2 cursor-pointer
            hover:shadow-lg transition-shadow duration-200
          `}
          onClick={handleClose}
        >
          {/* Close Button */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleClose()
            }}
            className="absolute top-1.5 right-1.5 p-0.5 rounded-full hover:bg-white/50 transition-colors"
          >
            <X className="h-3 w-3 text-gray-400 hover:text-gray-600" />
          </button>

          {/* Toast Content */}
          <div className="flex items-start space-x-2 pr-5">
            {/* Icon */}
            <div className={`flex-shrink-0 ${config.iconColor}`}>
              <div className="h-4 w-4">
                {config.icon}
              </div>
            </div>

            {/* Text Content */}
            <div className="flex-1 min-w-0">
              {toast.title && (
                <h4 className={`text-xs font-semibold ${config.titleColor} mb-0.5`}>
                  {toast.title}
                </h4>
              )}
              <p className={`text-xs ${config.textColor} leading-tight`}>
                {toast.message}
              </p>
              
              {/* Progress Bar */}
              <div className="mt-1.5 w-full bg-white/30 rounded-full h-0.5">
                <motion.div
                  className={`h-0.5 rounded-full ${config.iconColor.replace('text-', 'bg-')}`}
                  initial={{ width: "100%" }}
                  animate={{ width: "0%" }}
                  transition={{ duration: (toast.duration || 4000) / 1000, ease: "linear" }}
                />
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default Toast
