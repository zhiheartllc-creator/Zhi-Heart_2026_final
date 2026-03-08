import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// URL de producción del servidor Firebase App Hosting.
// Se usa como fallback en caso de que la variable de entorno no esté inyectada en el build.
const PRODUCTION_API_URL = 'https://zhi-heart--main-studio-2141942949-c8e1e.us-central1.hosted.app';

/**
 * Returns the base URL for API calls.
 * - Web (SSR via App Hosting): empty string (relative routes like /api/chat)
 * - Capacitor (Android): points to the deployed App Hosting server.
 *   Falls back to the production URL hardcoded above so the app works
 *   even if NEXT_PUBLIC_API_BASE_URL was not injected during the build.
 */
export function getApiBaseUrl(): string {
  if (typeof window === 'undefined') return '';

  const isNative = !!(window as any).Capacitor?.isNativePlatform();
  if (isNative || process.env.NEXT_PUBLIC_IS_STATIC === 'true') {
    return process.env.NEXT_PUBLIC_API_BASE_URL || PRODUCTION_API_URL;
  }

  return '';
}