import { messaging, getToken, onMessage } from '../firebase';
import { getApiUrl } from '../config/env';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

/**
 * Get or register service worker for push notifications.
 * Reuses existing registration when possible. Never calls registration.update()
 * so the app does not reload after login.
 */
async function getOrRegisterServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    throw new Error('Service Workers are not supported in this browser');
  }
  try {
    const existing = await navigator.serviceWorker.getRegistration('/');
    if (existing) {
      return existing;
    }
    return await navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: '/' });
  } catch (error) {
    console.error('❌ Service Worker registration failed:', error?.message || error);
    throw error;
  }
}

/**
 * Request notification permission from user
 */
async function requestNotificationPermission() {
  if ('Notification' in window) {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      return true;
    }
    return false;
  }
  return false;
}

/**
 * Get FCM token
 */
async function getFCMToken() {
  try {
    if (!messaging) {
      throw new Error('Firebase messaging is not initialized');
    }

    const registration = await getOrRegisterServiceWorker();
    await registration.update(); // Update service worker

    const trimmedVapidKey = VAPID_KEY ? VAPID_KEY.trim() : null;

    if (!trimmedVapidKey) {
      console.error('❌ VAPID key is missing or empty');
      throw new Error('VAPID key is not configured. Please set VITE_FIREBASE_VAPID_KEY in .env');
    }

    if (import.meta.env.DEV) {
      console.log('📬 Getting FCM token with VAPID key:', trimmedVapidKey.substring(0, 10) + '...');
    }

    const token = await getToken(messaging, {
      vapidKey: trimmedVapidKey,
      serviceWorkerRegistration: registration
    });

    if (token) {
      return token;
    }
    return null;
  } catch (error) {
    console.error('FCM token error:', error?.message || error);
    throw error;
  }
}

/**
 * Get authentication token from localStorage based on current context.
 * Replaces the generic getAuthToken with contextual logic as per the guide.
 */
function getAuthTokenForCurrentContext() {
  const path = window.location.pathname.toLowerCase();

  if (path.startsWith('/admin')) {
    return localStorage.getItem('adminToken');
  }
  if (path.startsWith('/sales')) {
    return localStorage.getItem('salesToken');
  }
  if (path.startsWith('/cp')) {
    return localStorage.getItem('cpToken') || localStorage.getItem('token');
  }
  if (path.startsWith('/pm')) {
    return localStorage.getItem('pmToken');
  }
  if (path.startsWith('/employee')) {
    return localStorage.getItem('employeeToken');
  }
  if (path.startsWith('/client')) {
    return localStorage.getItem('clientToken');
  }

  // Fallback to any available token if path is not specific
  return (
    localStorage.getItem('adminToken') ||
    localStorage.getItem('salesToken') ||
    localStorage.getItem('cpToken') ||
    localStorage.getItem('pmToken') ||
    localStorage.getItem('employeeToken') ||
    localStorage.getItem('clientToken') ||
    localStorage.getItem('token')
  );
}

/**
 * Register FCM token with backend
 */
async function registerFCMToken(forceUpdate = false) {
  try {
    // Check if already registered
    const savedToken = localStorage.getItem('fcm_token_web');
    if (savedToken && !forceUpdate) {
      return savedToken;
    }

    // Request permission
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) {
      throw new Error('Notification permission not granted');
    }

    // Get token
    const token = await getFCMToken();
    if (!token) {
      throw new Error('Failed to get FCM token');
    }

    // Get auth token - wait a bit to ensure it's saved
    await new Promise(resolve => setTimeout(resolve, 200)); // Small delay

    const authToken = getAuthTokenForCurrentContext();
    if (!authToken) {
      return null;
    }

    const cleanToken = authToken.trim();

    const apiUrl = getApiUrl('/fcm-tokens/save');
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${cleanToken}`
      },
      credentials: 'include', // Include cookies
      body: JSON.stringify({
        token: token,
        platform: 'web'
      })
    });

    // Read response body once
    const responseText = await response.text();
    let responseData = {};

    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      // Not JSON, that's okay
      responseData = { message: responseText || `Server error: ${response.status}` };
    }

    if (response.ok) {
      localStorage.setItem('fcm_token_web', token);

      // Optional: send test notification later so it doesn't feel tied to registration
      setTimeout(() => {
        sendTestNotification().catch(() => { });
      }, 8000);

      return token;
    } else {
      throw new Error(responseData.message || `Failed to register token: ${response.status}`);
    }
  } catch (error) {
    console.error('FCM registration failed:', error?.message || error);
    return null;
  }
}

/**
 * Send test notification after login
 */
async function sendTestNotification() {
  try {
    const authToken = getAuthTokenForCurrentContext();
    if (!authToken) return;

    const apiUrl = getApiUrl('/fcm-tokens/test');
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Test notification failed:', errorData.message || response.status);
    }
  } catch (error) {
    console.error('Test notification error:', error?.message || error);
  }
}

/**
 * Remove FCM token from backend
 */
async function removeFCMToken() {
  try {
    const token = localStorage.getItem('fcm_token_web');
    if (!token) {
      return;
    }

    const authToken = getAuthTokenForCurrentContext();
    if (!authToken) {
      return;
    }

    const apiUrl = getApiUrl('/fcm-tokens/remove');
    await fetch(apiUrl, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        token: token,
        platform: 'web'
      })
    });

    localStorage.removeItem('fcm_token_web');
  } catch (error) {
    console.error('FCM token remove failed:', error?.message || error);
  }
}

/**
 * Setup foreground notification handler
 */
function setupForegroundNotificationHandler(handler) {
  if (!messaging) return;

  onMessage(messaging, async (payload) => {
    const notificationTitle = payload.notification?.title || payload.data?.title || 'Appzeto Notification';
    const notificationBody = payload.notification?.body || payload.data?.body || '';
    const notificationOptions = {
      body: notificationBody,
      icon: payload.notification?.icon || payload.data?.icon || '/vite.svg',
      badge: '/vite.svg',
      data: payload.data || {},
      tag: (payload.data?.type || 'default') + '-' + (payload.data?.timestamp || Date.now()),
      requireInteraction: false
    };

    // Prefer showing via service worker so click handling works; fallback to page Notification
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        const reg = await navigator.serviceWorker.ready;
        if (reg && reg.showNotification) {
          await reg.showNotification(notificationTitle, notificationOptions);
        } else {
          new Notification(notificationTitle, notificationOptions);
        }
      } catch (e) {
        new Notification(notificationTitle, notificationOptions);
      }
    }

    if (handler && typeof handler === 'function') {
      handler(payload);
    }
  });
}

/**
 * Initialize push notifications (register SW in background, no reload).
 * Does not call update() or force activation; FCM token is obtained later when needed.
 */
async function initializePushNotifications() {
  try {
    const authToken = getAuthTokenForCurrentContext();
    if (!authToken) return;

    await getOrRegisterServiceWorker();
  } catch (error) {
    console.error('Push notifications init failed:', error?.message || error);
    // Don't throw - allow app to continue
  }
}

export {
  initializePushNotifications,
  registerFCMToken,
  removeFCMToken,
  sendTestNotification,
  setupForegroundNotificationHandler,
  requestNotificationPermission,
  getFCMToken
};
