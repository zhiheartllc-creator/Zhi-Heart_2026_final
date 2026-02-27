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

  // Web fallback
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
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
  return typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted';
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
  // En web no hay forma de cancelar las Web Notifications ya mostradas,
  // pero el flag en localStorage evitará que se muestren de nuevo.
  localStorage.removeItem('zhi_notifications_enabled');
}

/**
 * Programa recordatorios diarios:
 * - Mañana: 8:00 AM
 * - Tarde-noche: 7:00 PM
 *
 * Estos se repiten automáticamente cada día usando el schedule nativo.
 */
export async function scheduleMoodReminders(): Promise<boolean> {
  const granted = await requestNotificationPermission();
  if (!granted) return false;

  if (isNativePlatform()) {
    try {
      const LN = await getLocalNotifications();

      // Cancelamos los anteriores primero para evitar duplicados
      await LN.cancel({ notifications: [{ id: MORNING_NOTIF_ID }, { id: EVENING_NOTIF_ID }] });

      // Calculamos la próxima 8:00 AM
      const nextMorning = new Date();
      nextMorning.setHours(8, 0, 0, 0);
      if (nextMorning <= new Date()) {
        nextMorning.setDate(nextMorning.getDate() + 1); // Si ya pasó, mañana
      }

      // Calculamos la próxima 7:00 PM
      const nextEvening = new Date();
      nextEvening.setHours(19, 0, 0, 0);
      if (nextEvening <= new Date()) {
        nextEvening.setDate(nextEvening.getDate() + 1); // Si ya pasó, mañana
      }

      await LN.schedule({
        notifications: [
          {
            id: MORNING_NOTIF_ID,
            title: '🌅 Buenos días, ¿cómo amaneciste?',
            body: 'Registra cómo te sientes este momento. Tu bienestar importa.',
            iconColor: '#4EF2C8',
            schedule: {
              on: {
                hour: 8,
                minute: 0,
              },
              repeats: true,
              allowWhileIdle: true,
            },
            actionTypeId: '',
            extra: { action: 'mood' },
          },
          {
            id: EVENING_NOTIF_ID,
            title: '🌙 Pausa emocional de la tarde',
            body: '¿Cómo terminó tu día? Tómate un momento para registrarlo con Zhi.',
            iconColor: '#4EF2C8',
            schedule: {
              on: {
                hour: 19,
                minute: 0,
              },
              repeats: true,
              allowWhileIdle: true,
            },
            actionTypeId: '',
            extra: { action: 'mood' },
          },
        ],
      });

      console.log('[NOTIF] Recordatorios programados: 8:00 AM y 7:00 PM diario ✅');
      localStorage.setItem('zhi_notifications_enabled', 'true');
      return true;
    } catch (e) {
      console.error('[NOTIF] Error scheduling notifications:', e);
      return false;
    }
  }

  // ── Web fallback (funciona mientras la app está abierta / con SW) ──
  localStorage.setItem('zhi_notifications_enabled', 'true');
  // En web programamos con setTimeout para la próxima vez que aplique en esta sesión
  scheduleWebFallback();
  return true;
}

/** Fallback para web: programa una notificación usando setTimeout basado en la hora actual */
function scheduleWebFallback() {
  const now = new Date();
  const times = [
    { hour: 8, title: '🌅 Buenos días, ¿cómo amaneciste?', body: 'Registra cómo te sientes este momento.' },
    { hour: 19, title: '🌙 Pausa emocional de la tarde', body: '¿Cómo terminó tu día? Regístralo con Zhi.' },
  ];

  for (const t of times) {
    const target = new Date();
    target.setHours(t.hour, 0, 0, 0);
    if (target <= now) target.setDate(target.getDate() + 1);
    const ms = target.getTime() - now.getTime();

    setTimeout(() => {
      if (localStorage.getItem('zhi_notifications_enabled') !== 'true') return;
      if (Notification.permission !== 'granted') return;
      try {
        new Notification(t.title, { body: t.body, icon: '/icon_zhi.png', tag: `zhi-mood-${t.hour}` });
      } catch (e) {
        console.log('[NOTIF] Web notification failed:', e);
      }
    }, ms);
  }
}
