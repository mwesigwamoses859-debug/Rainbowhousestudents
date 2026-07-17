// Uganda EMIS - National Node Service Worker for Push Notifications
self.addEventListener('install', (event) => {
  self.skipWaiting();
  console.log('[Service Worker] Installed');
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
  console.log('[Service Worker] Activated');
});

// Listen to push events from the National Node Push Subsystem
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push event received:', event);
  
  let data = { 
    title: 'Uganda EMIS Alert', 
    body: 'A system alert has been published by the National EMIS Node.',
    icon: 'https://images.unsplash.com/photo-1544717297-fa95b6ee9643?w=120&h=120&fit=crop&q=80',
    tag: 'emis-general',
    data: { clickAction: '/' }
  };

  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = {
        title: 'Uganda EMIS Alert',
        body: event.data.text(),
        icon: 'https://images.unsplash.com/photo-1544717297-fa95b6ee9643?w=120&h=120&fit=crop&q=80',
        tag: 'emis-general',
        data: { clickAction: '/' }
      };
    }
  }

  // Set visual properties based on notification type
  let badgeIcon = 'https://images.unsplash.com/photo-1544717297-fa95b6ee9643?w=40&h=40&fit=crop&q=80';
  let vibratePattern = [100, 50, 100];
  
  if (data.tag === 'safeguarding-urgent' || data.title.toLowerCase().includes('safeguarding')) {
    vibratePattern = [300, 100, 300, 100, 300];
  } else if (data.tag === 'mark-reminder' || data.title.toLowerCase().includes('reminder')) {
    vibratePattern = [100, 100, 100];
  }

  const options = {
    body: data.body,
    icon: data.icon || 'https://images.unsplash.com/photo-1544717297-fa95b6ee9643?w=120&h=120&fit=crop&q=80',
    badge: badgeIcon,
    vibrate: vibratePattern,
    data: data.data || { clickAction: '/' },
    tag: data.tag || 'emis-alert',
    requireInteraction: data.tag === 'safeguarding-urgent', // keeps urgent notifications on screen until acknowledged
    actions: data.actions || [
      { action: 'open', title: 'Open Dashboard' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );

  // Broadcast the push notification data to all active tabs
  self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
    clients.forEach((client) => {
      client.postMessage({
        type: 'PUSH_NOTIFICATION_RECEIVED',
        payload: data
      });
    });
  });
});

// Handle clicks on push notifications
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification clicked:', event);
  event.notification.close();

  // If the user clicked "Dismiss", do nothing
  if (event.action === 'dismiss') {
    return;
  }

  // Determine target URL from notification data
  const clickAction = event.notification.data?.clickAction || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Look for an existing open window matching our app and focus it
      for (const client of clientList) {
        if (client.url.includes(clickAction) && 'focus' in client) {
          return client.focus();
        }
      }
      // If no open window found, open a new one
      if (self.clients.openWindow) {
        return self.clients.openWindow(clickAction);
      }
    })
  );
});
