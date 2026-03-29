'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { LoadingAnimation } from '@/components/loading-animation';

export function RoleGuard({ children }: { children: React.ReactNode }) {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    if (loading) return;

    // If not authenticated, let the individual pages/auth hook handle it (or handle it here)
    if (!user) {
      if (pathname?.startsWith('/psychologist') || pathname?.startsWith('/admin')) {
        router.push('/login');
      } else {
        setIsAuthorized(true); // Public pages or login will handle themselves
      }
      return;
    }

    // Wait until profile is loaded before enforcing role guards
    if (user && userProfile === null) {
      // Do nothing, wait for userProfile to populate from Firestore
      return;
    }

    const role = userProfile?.role || 'user';

    // Route guards
    if (pathname?.startsWith('/psychologist')) {
      if (role !== 'psychologist' && role !== 'admin') {
        router.push('/dashboard');
        return;
      }
    } else if (pathname?.startsWith('/admin')) {
      if (role !== 'admin') {
        router.push('/dashboard');
        return;
      }
    } else if (pathname === '/dashboard' || pathname === '/' || pathname === '/chat') {
      // If a professional signs in and goes to the default app, redirect them to their portal
      if (role === 'psychologist' && !pathname.includes('psychologist')) {
        router.push('/psychologist/dashboard');
        return;
      }
      if (role === 'admin' && !pathname.includes('admin')) {
        if (typeof window !== 'undefined' && sessionStorage.getItem('adminViewingUser') !== 'true') {
          router.push('/admin/dashboard');
          return;
        }
      }
    }

    setIsAuthorized(true);
  }, [user, userProfile, loading, pathname, router]);

  if (loading || (!isAuthorized && user && userProfile === null) || !isAuthorized) {
    return <LoadingAnimation />;
  }

  return <>{children}</>;
}
