'use client';

/**
 * NotificationManager
 * -------------------
 * Este componente gestiona las notificaciones push en Android (Capacitor nativo).
 * - Solo actúa cuando Capacitor detecta que estamos en una plataforma nativa.
 * - Espera a que el usuario esté autenticado antes de registrar el token FCM.
 * - En web/PWA, no hace nada (return null).
 */

import { useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { initializePushNotifications } from '@/lib/firebase';

export function NotificationManager() {
  const { user } = useAuth();

  useEffect(() => {
    // Solo ejecutar en plataforma nativa (Android/iOS)
    const isNative =
      typeof window !== 'undefined' &&
      !!(window as any).Capacitor?.isNativePlatform();

    if (!isNative) return;
    if (!user) return; // Esperar a que el usuario esté autenticado

    // Pequeño delay para no bloquear la carga inicial de la app
    const timer = setTimeout(() => {
      initializePushNotifications().catch((err) => {
        console.warn('[NotificationManager] Push notification init failed:', err);
      });
    }, 2000);

    return () => clearTimeout(timer);
  }, [user]);

  // Este componente no renderiza nada visible
  return null;
}
