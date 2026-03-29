'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Users, Settings, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';

export function PsychologistNavBar() {
  const pathname = usePathname();
  const { userProfile } = useAuth();

  // Only show for psychologists
  if (userProfile?.role !== 'psychologist') {
    return null;
  }

  const navItems = [
    { name: 'Panel', href: '/psychologist/dashboard', icon: Home },
    { name: 'Pacientes', href: '/psychologist/patients', icon: Users },
    { name: 'Perfil', href: '/psychologist/profile', icon: Settings },
  ];

  return (
    <div
      className="fixed bottom-0 w-full bg-background border-t border-border z-50 shadow-[0_-4px_10px_rgba(0,0,0,0.02)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex justify-around items-center h-16 max-w-md mx-auto px-2">
        {navItems.map((item) => {
          const isActive = pathname?.startsWith(item.href);
          const Icon = item.icon;
          
          return (
            <Link 
              key={item.href} 
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center w-full h-full gap-1 transition-colors",
                isActive ? "text-[#25b591]" : "text-slate-400 hover:text-slate-600"
              )}
            >
              <Icon className={cn("w-6 h-6", isActive && "fill-[#4EF2C8]/20")} />
              <span className="text-[10px] font-medium">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
