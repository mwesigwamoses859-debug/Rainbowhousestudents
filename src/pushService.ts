// Uganda National EMIS - Web Push Notification Client Service

/**
 * Utility to convert VAPID base64 public key to Uint8Array for PushManager subscription.
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Register the Service Worker.
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service workers are not supported in this browser.');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    });
    console.log('[Push Service] Service Worker registered with scope:', registration.scope);
    return registration;
  } catch (error) {
    console.error('[Push Service] Service Worker registration failed:', error);
    return null;
  }
}

/**
 * Check if the browser supports notifications and push.
 */
export function isPushSupported(): boolean {
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/**
 * Check existing subscription state.
 */
export async function getActiveSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;

  const registration = await navigator.serviceWorker.ready;
  if (!registration) return null;

  return await registration.pushManager.getSubscription();
}

/**
 * Subscribe the user to Push notifications.
 */
export async function subscribeToPushNotifications(username: string): Promise<PushSubscription | null> {
  if (!isPushSupported()) {
    throw new Error('Push notifications are not supported in this browser/environment.');
  }

  // 1. Request notification permissions
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Notification permission denied by user.');
  }

  // 2. Register/Get Service Worker
  const registration = await registerServiceWorker();
  if (!registration) {
    throw new Error('Failed to register or retrieve Service Worker.');
  }

  // Wait until Service Worker is fully active
  await navigator.serviceWorker.ready;

  // 3. Fetch VAPID Public Key from the National EMIS Node API
  const vapidRes = await fetch('/api/push/vapid-public-key');
  if (!vapidRes.ok) {
    throw new Error('Failed to fetch VAPID public key from the backend.');
  }
  const { publicKey } = await vapidRes.json();

  if (!publicKey) {
    throw new Error('VAPID public key was empty or not generated.');
  }

  // 4. Subscribe with the browser's PushManager
  const applicationServerKey = urlBase64ToUint8Array(publicKey);
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey
  });

  // 5. Send subscription details to the National Node back-end registry
  const registerRes = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      subscription,
      username
    })
  });

  if (!registerRes.ok) {
    const errData = await registerRes.json();
    throw new Error(errData.message || 'Failed to register subscription with the backend database.');
  }

  console.log('[Push Service] Successfully subscribed to Push API.');
  return subscription;
}

/**
 * Unsubscribe from push notifications.
 */
export async function unsubscribeFromPushNotifications(): Promise<boolean> {
  if (!isPushSupported()) return false;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
      const unsubscribed = await subscription.unsubscribe();
      console.log('[Push Service] Unsubscribed state:', unsubscribed);
      return unsubscribed;
    }
    return false;
  } catch (error) {
    console.error('[Push Service] Failed to unsubscribe:', error);
    return false;
  }
}
