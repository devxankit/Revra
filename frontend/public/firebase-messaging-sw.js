// Import Firebase scripts
importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js');

// Firebase configuration
const firebaseConfig = {
  apiKey: 'AIzaSyDCABaZBQkyM6tQSxKPbtkVTfbbhE-xfvo',
  authDomain: 'appzeto-afa29.firebaseapp.com',
  projectId: 'appzeto-afa29',
  storageBucket: 'appzeto-afa29.firebasestorage.app',
  messagingSenderId: '761563654142',
  appId: '1:761563654142:web:e83be0c6cebb08623f42af',
  measurementId: 'G-XDE5YPP55W'
};

console.log('[firebase-messaging-sw.js] Firebase config loaded:', {
  projectId: firebaseConfig.projectId,
  messagingSenderId: firebaseConfig.messagingSenderId
});

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Get messaging instance
const messaging = firebase.messaging();

// Handle background messages (tab in background or app closed)
messaging.onBackgroundMessage(async (payload) => {
  const notificationTitle = payload.notification?.title || payload.data?.title || 'Appzeto Notification';
  const notificationBody = payload.notification?.body || payload.data?.body || '';
  const notificationOptions = {
    body: notificationBody,
    icon: payload.notification?.icon || payload.data?.icon || '/vite.svg',
    badge: '/vite.svg',
    data: payload.data || {},
    tag: (payload.data?.type || 'default') + '-' + (payload.data?.timestamp || Date.now()),
    requireInteraction: false,
    silent: false
  };

  await self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  const path = (data.link && String(data.link)) || '/';
  const fullUrl = path.startsWith('http') ? path : new URL(path, self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(fullUrl);
      }
    })
  );
});
