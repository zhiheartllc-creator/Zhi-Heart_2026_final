"use client";

import { AuthProvider } from "@/hooks/use-auth";
import React from "react";
import { Toaster } from "@/components/ui/toaster";

const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || Date.now().toString();

export function ClientLayout({ children }: { children: React.ReactNode }) {
  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    // CAPGO UPDATE LOGIC
    const initUpdater = async () => {
      try {
        const { CapacitorUpdater } = await import('@capgo/capacitor-updater');
        await CapacitorUpdater.notifyAppReady();
        console.log('[CAPGO] App ready for updates');
      } catch (e) {
        console.log('[CAPGO] Not running in a native Capgo environment (or error):', e);
      }
    };
    initUpdater();

    if (process.env.NODE_ENV === 'development') {
      if (navigator.serviceWorker) {
        navigator.serviceWorker.getRegistrations().then((regs) => {
          regs.forEach((reg) => {
            reg.unregister().then((ok) => console.log('[SW] unregistered', reg.scope, ok));
          });
        }).catch((err) => console.error('[SW] getRegistrations error', err));
      }
      if ('caches' in window) {
        caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k)))).then(() => console.log('[SW] caches cleared')).catch(() => {});
      }
      return;
    }

    const storedVersion = localStorage.getItem('zhi_app_version');
    if (storedVersion && storedVersion !== APP_VERSION) {
      console.log('[SW] New version detected, clearing caches...');
      if (navigator.serviceWorker) {
        navigator.serviceWorker.getRegistrations().then((regs) => {
          regs.forEach((reg) => reg.unregister());
        }).catch(() => {});
      }
      if ('caches' in window) {
        caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k)))).then(() => {
          localStorage.setItem('zhi_app_version', APP_VERSION);
          window.location.reload();
        }).catch(() => {});
      }
    } else {
      localStorage.setItem('zhi_app_version', APP_VERSION);
    }

    if (navigator.serviceWorker) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (reg) {
          reg.update().catch(() => {});
        }
      });
    }
  }, []);

  return (
    <AuthProvider>
      {children}
      <Toaster />
    </AuthProvider>
  );
}