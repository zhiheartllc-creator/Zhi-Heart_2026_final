'use client';

import { useEffect } from 'react';
import { scheduleMoodReminders } from '@/lib/notifications';

/**
 * Hook that auto-schedules mood reminders when the user is logged in
 * and has previously enabled notifications.
 *
 * The actual scheduling logic lives in /lib/notifications.ts.
 */
export function useMoodReminder(enabled: boolean = true) {
  useEffect(() => {
    if (!enabled) return;
    if (typeof window === 'undefined') return;

    // Only auto-schedule if user previously activated notifications
    const wasEnabled = localStorage.getItem('zhi_notifications_enabled') === 'true';
    if (!wasEnabled) return;

    // Re-schedule on app open (Capacitor clears schedules on some Android versions
    // after app update, so we refresh them every session)
    scheduleMoodReminders().catch(console.error);
  }, [enabled]);
}
