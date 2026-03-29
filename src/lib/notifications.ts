'use client';

/**
 * notifications.ts
 * Servicio de notificaciones locales programadas para Zhi.
 *
 * En Android (Capacitor): usa @capacitor/local-notifications → funciona
 * aunque la app esté cerrada, programando alarmas nativas.
 *
 * En web (browser): usa la Web Notifications API como fallback
 * (solo funciona mientras la app está abierta/en segundo plano con SW).
 */

// IDs fijos para poder cancelar/reprogramar sin duplicar
const MORNING_NOTIF_ID = 1001;
const EVENING_NOTIF_ID = 1002;

const isNativePlatform = (): boolean => {
  if (typeof window === 'undefined') return false;
  return !!(window as any).Capacitor?.isNativePlatform();
};

// ─── NATIVE (Capacitor Local Notifications) ────────────────────────────────

async function getLocalNotifications() {
  const { LocalNotifications } = await import('@capacitor/local-notifications');
  return LocalNotifications;
}

/**
 * Pide permiso de notificaciones al usuario.
 * Retorna true si fue aprobado.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (isNativePlatform()) {
    try {
      const LN = await getLocalNotifications();
      const { display } = await LN.checkPermissions();
      if (display === 'granted') return true;
      const { display: result } = await LN.requestPermissions();
      return result === 'granted';
    } catch (e) {
      console.error('[NOTIF] Error requesting native permission:', e);
      return false;
    }
  }

  // Web/PWA fallback: usar Notification API del navegador
  if (typeof window !== 'undefined' && 'Notification' in window) {
    if (Notification.permission === 'granted') return true;
    const result = await Notification.requestPermission();
    return result === 'granted';
  }

  return false;
}

/**
 * Verifica si ya tenemos permiso (sin pedir).
 */
export async function hasNotificationPermission(): Promise<boolean> {
  if (isNativePlatform()) {
    try {
      const LN = await getLocalNotifications();
      const { display } = await LN.checkPermissions();
      return display === 'granted';
    } catch {
      return false;
    }
  }
  // Web/PWA fallback
  if (typeof window !== 'undefined' && 'Notification' in window) {
    return Notification.permission === 'granted';
  }
  return false;
}

/**
 * Cancela cualquier recordatorio existente de Zhi.
 */
export async function cancelMoodReminders(): Promise<void> {
  if (isNativePlatform()) {
    try {
      const LN = await getLocalNotifications();
      await LN.cancel({ notifications: [{ id: MORNING_NOTIF_ID }, { id: EVENING_NOTIF_ID }] });
      console.log('[NOTIF] Recordatorios cancelados');
    } catch (e) {
      console.error('[NOTIF] Error cancelling notifications:', e);
    }
  }
  localStorage.removeItem('zhi_notifications_enabled');
}

/**
 * Programa recordatorios diarios:
 * - Mediodía: 12:00 PM (hora local del dispositivo)
 * - Tarde: 5:00 PM (hora local del dispositivo)
 *
 * IMPORTANTE: Usamos `at` con un Date concreto en vez de `on: { hour, minute }`
 * porque `on` se interpreta como UTC en algunos dispositivos Android,
 * causando que las notificaciones lleguen a las 3 AM en vez de la hora local.
 * `at` siempre usa la zona horaria local del dispositivo.
 */
export async function scheduleMoodReminders(): Promise<boolean> {
  const granted = await requestNotificationPermission();
  if (!granted) return false;

  if (isNativePlatform()) {
    try {
      const LN = await getLocalNotifications();

      // Cancelamos los anteriores primero para evitar duplicados
      await LN.cancel({ notifications: [{ id: MORNING_NOTIF_ID }, { id: EVENING_NOTIF_ID }] });

      // Calculamos la próxima tarde (6:00 PM) hora LOCAL del dispositivo
      const nextAfternoon = new Date();
      nextAfternoon.setHours(18, 0, 0, 0);
      if (nextAfternoon <= new Date()) {
        nextAfternoon.setDate(nextAfternoon.getDate() + 1); // Si ya pasó, mañana
      }

      // Calculamos la próxima noche (9:00 PM) hora LOCAL del dispositivo
      const nextNight = new Date();
      nextNight.setHours(21, 0, 0, 0);
      if (nextNight <= new Date()) {
        nextNight.setDate(nextNight.getDate() + 1); // Si ya pasó, mañana
      }

      console.log('[NOTIF] Programando: tarde =', nextAfternoon.toLocaleString(), '| noche =', nextNight.toLocaleString());

      await LN.schedule({
        notifications: [
          {
            id: MORNING_NOTIF_ID,
            title: '🌅 Buenas tardes, ¿cómo va tu día?',
            body: 'Tómate un descanso y registra cómo te sientes en este momento.',
            iconColor: '#4EF2C8',
            schedule: {
              at: nextAfternoon,
              every: 'day',
              allowWhileIdle: true,
            },
            actionTypeId: '',
            extra: { action: 'mood' },
          },
          {
            id: EVENING_NOTIF_ID,
            title: '🌙 Reflexión de la noche',
            body: 'El día termina. Tómate un momento final para registrar tu estado.',
            iconColor: '#4EF2C8',
            schedule: {
              at: nextNight,
              every: 'day',
              allowWhileIdle: true,
            },
            actionTypeId: '',
            extra: { action: 'mood' },
          },
        ],
      });

      console.log('[NOTIF] Recordatorios programados: 6:00 PM y 9:00 PM hora local diario ✅');
      localStorage.setItem('zhi_notifications_enabled', 'true');
      return true;
    } catch (e) {
      console.error('[NOTIF] Error scheduling native notifications:', e);
      return false;
    }
  }
  // ── Web/PWA fallback: guardar preferencia, el Service Worker maneja las notificaciones ──
  localStorage.setItem('zhi_notifications_enabled', 'true');
  console.log('[NOTIF] Recordatorios activados (web/PWA) ✅');
  return true;
}
