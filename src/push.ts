import { supabase } from './supabase';

// Clave publica VAPID: por diseno se entrega al navegador y al servicio de
// push, no es un secreto. La privada vive solo en la base de datos.
const VAPID_PUBLIC_KEY =
  'BO0mGvhRtOZtJYKl0IwdrFaANLg1n9IUQ7zVCADvI08sXievCjxgvf7AhVJLmOhVUdxiCSC71TVjnJwZVi4q7Fs';

function urlBase64ToBuffer(base64: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out.buffer;
}

export function pushSupported(): boolean {
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export async function isPushEnabled(): Promise<boolean> {
  if (!pushSupported() || Notification.permission !== 'granted') return false;
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return false;
  return !!(await reg.pushManager.getSubscription());
}

export async function enablePush(userId: string): Promise<void> {
  if (!pushSupported()) throw new Error('no soportado');

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('permiso denegado');

  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToBuffer(VAPID_PUBLIC_KEY),
    });
  }

  const keys = sub.toJSON().keys;
  if (!keys?.p256dh || !keys?.auth) throw new Error('suscripcion invalida');

  const { error } = await supabase.from('push_subscriptions').upsert(
    { user_id: userId, endpoint: sub.endpoint, p256dh: keys.p256dh, auth: keys.auth },
    { onConflict: 'endpoint' }
  );
  if (error) throw error;
}

export async function disablePush(): Promise<void> {
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return;
  await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
  await sub.unsubscribe();
}
