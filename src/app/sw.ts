/// <reference lib="webworker" />
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const filteredCache = defaultCache.filter(
  (entry) => {
    if ('matcher' in entry && entry.matcher instanceof RegExp) {
      return !entry.matcher.source.includes('/api/');
    }
    return true;
  }
);

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: filteredCache,
  cleanupOutdatedCaches: true,
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith('serwist-precache-') === false && key !== 'pages' && key !== 'static-resources')
          .filter((key) => key.includes('apis'))
          .map((key) => caches.delete(key))
      )
    )
  );
});

serwist.addEventListeners();
