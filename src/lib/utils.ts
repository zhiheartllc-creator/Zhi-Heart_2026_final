import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Returns the base URL for API calls.
 * - Web (SSR via App Hosting): empty string (relative routes like /api/chat)
 * - Capacitor (Android): points to the deployed App Hosting server
 */
export function getApiBaseUrl(): string {
  if (typeof window === 'undefined') return '';

  const isNative = !!(window as any).Capacitor?.isNativePlatform();
  if (isNative || process.env.NEXT_PUBLIC_IS_STATIC === 'true') {
    return process.env.NEXT_PUBLIC_API_BASE_URL || '';
  }

  return '';
}