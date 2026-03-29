'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { 
  BarChart, 
  Users, 
  UserPlus, 
  Settings, 
  ShieldAlert, 
  CreditCard,
  MessageSquare
} from 'lucide-react';

export function AdminNavBar() {
  const pathname = usePathname();
  const { userProfile } = useAuth();

  // For security, do not render if the user is not an admin
  // (Though RoleGuard also catches this)
  if (userProfile?.role !== 'admin') {
    return null;
  }

  const routes = [
    { name: 'Inicio', path: '/admin/dashboard', icon: BarChart },
    { name: 'Usuarios', path: '/admin/users', icon: Users },
    { name: 'Psicólogos', path: '/admin/psychologists', icon: UserPlus },
    { name: 'Conexiones', path: '/admin/requests', icon: MessageSquare },
  ];

  return (
    <>
      {/* Spacer for bottom navbar */}
      <div className="h-16 md:h-0" />
      
      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-[90] pb-safe h-16 md:hidden">
        <div className="flex justify-around items-center h-full px-2">
          {routes.map((route) => {
            const Icon = route.icon;
            const isActive = pathname === route.path;
            
            return (
              <Link 
                key={route.path} 
                href={route.path}
                className={`flex flex-col items-center justify-center w-16 h-full gap-1 transition-colors ${
                  isActive ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <div className={`relative flex items-center justify-center w-8 h-8 rounded-full ${isActive ? 'bg-indigo-50' : ''}`}>
                   <Icon className={`w-5 h-5 ${isActive ? 'fill-indigo-100' : ''}`} />
                </div>
                <span className={`text-[10px] font-medium ${isActive ? 'font-bold' : ''}`}>
                  {route.name}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Desktop/Tablet Sidebar Navbar (Optional upgrade later if responsive is needed, for now standard bottom nav) */}
    </>
  );
}
