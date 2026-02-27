'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, MessageSquare, HeartHandshake, History, Menu, User, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

export function BottomNavBar({ forceShow }: { forceShow?: boolean } = {}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // No mostrar la barra de navegación si el usuario no ha iniciado sesión 
  // o si está en la landing page, login, signup o chat (donde la barra quita espacio útil)
  if (!user || (!forceShow && (pathname === '/' || pathname === '/login' || pathname === '/signup' || pathname === '/chat'))) {
    return null;
  }

  const navItems = [
    { name: 'Inicio', href: '/dashboard', icon: Home },
    { name: 'Chat', href: '/chat', icon: MessageSquare },
    { name: 'Psicólogo', href: '/contact', icon: HeartHandshake },
    { name: 'Historial', href: '/history', icon: History },
    { name: 'Menú', href: '#', icon: Menu },
  ];

  return (
    <div
      className="fixed bottom-0 w-full bg-background border-t border-border z-50"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex justify-around items-center h-16 max-w-md mx-auto px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          
          if (item.name === 'Menú') {
            const isMenuActive = pathname === '/settings';
            return (
               <Dialog key="menu-dialog" open={isMenuOpen} onOpenChange={setIsMenuOpen}>
                  <DialogTrigger asChild>
                    <button className={cn(
                        "flex flex-col items-center justify-center w-full h-full gap-1 transition-colors outline-none",
                         isMenuActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                    )}>
                      <Icon className={cn("w-6 h-6", isMenuActive && "fill-primary/20")} />
                      <span className="text-[10px] font-medium">{item.name}</span>
                    </button>
                  </DialogTrigger>
                  <DialogContent className="w-[90vw] max-w-md rounded-2xl gap-0 p-0 border-none shadow-xl">
                    <DialogHeader className="p-4 border-b border-slate-100 flex flex-row items-center justify-center relative">
                       <DialogTitle className="text-center text-lg font-bold text-slate-800">Menú</DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col py-2">
                       <Link href="/settings" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 transition-colors">
                          <User className="w-5 h-5 text-slate-800" />
                          <span className="font-semibold text-slate-700">Mi Perfil</span>
                       </Link>
                       <div className="h-[1px] bg-slate-100 w-[85%] mx-auto my-1" />
                       <button onClick={() => { setIsMenuOpen(false); signOut(); router.push('/login'); }} className="flex items-center gap-4 px-6 py-4 hover:bg-red-50 transition-colors text-red-500 w-full text-left">
                          <LogOut className="w-5 h-5" />
                          <span className="font-semibold">Cerrar Sesión</span>
                       </button>
                    </div>
                  </DialogContent>
               </Dialog>
            );
          }

          return (
            <Link 
              key={item.href} 
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center w-full h-full gap-1 transition-colors",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className={cn("w-6 h-6", isActive && "fill-primary/20")} />
              <span className="text-[10px] font-medium">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
