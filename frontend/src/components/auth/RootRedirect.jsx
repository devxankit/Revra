import React from 'react'
import { Navigate } from 'react-router-dom'

const TOKEN_KEYS = [
  { key: 'adminToken', path: '/admin-dashboard' },
  { key: 'salesToken', path: '/dashboard' },
  { key: 'cpToken', path: '/cp-dashboard' },
  { key: 'pmToken', path: '/pm-dashboard' },
  { key: 'employeeToken', path: '/employee-dashboard' },
  { key: 'clientToken', path: '/client-dashboard' }
]

function isTokenValid(token) {
  if (!token || typeof token !== 'string') return false
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    const exp = payload.exp
    if (!exp) return true
    return exp > Date.now() / 1000
  } catch {
    return false
  }
}

/**
 * Root "/" redirect: send user to the dashboard of whichever role they're logged in as.
 * Prevents CP (or Sales/PM/etc.) from being sent to admin-login after login or reload
 * (e.g. when push notification / service worker causes a reload at "/").
 */
function RootRedirect() {
  for (const { key, path } of TOKEN_KEYS) {
    const token = localStorage.getItem(key)
    if (token && isTokenValid(token)) {
      return <Navigate to={path} replace />
    }
  }
  return <Navigate to="/admin-login" replace />
}

export default RootRedirect
