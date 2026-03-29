'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, getCountFromServer } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Users, UserCheck, Stethoscope, MailWarning, Gem, DollarSign, User, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { LoadingAnimation } from '@/components/loading-animation';

export default function AdminDashboard() {
  const { userProfile, loading, signOut } = useAuth();
  const router = useRouter();
  
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeToday: 0,
    activePsychologists: 0,
    pendingRequests: 0,
    premiumUsers: 0,
    estimatedRevenue: 0,
  });
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  useEffect(() => {
    if (!userProfile || userProfile.role !== 'admin') return;

    const fetchDashboardStats = async () => {
      try {
        // Since getCountFromServer might fail on very complex queries or lack of indexes, 
        // we'll fetch docs and size them manually where simple getCountFromServer isn't ideal yet, 
        // or we use aggregate queries for optimal reads.
        
        // 1. Total Registered Users
        const usersRef = collection(db, 'users');
        const countUsersSnap = await getCountFromServer(usersRef);
        const totalUsers = countUsersSnap.data().count;

        // 2. Premium Users
        const premiumQ = query(usersRef, where('isPremium', '==', true));
        const countPremiumSnap = await getCountFromServer(premiumQ);
        const premiumUsers = countPremiumSnap.data().count;

        // 3. Psychologists
        const psychQ = query(usersRef, where('role', '==', 'psychologist'));
        const countPsychSnap = await getDocs(psychQ);
        const activePsychologists = countPsychSnap.size; // We can iterate to check 'verified' later

        // 4. Pending Requests
        const reqRef = collection(db, 'requests');
        const pendingReqQ = query(reqRef, where('status', '==', 'pending'));
        const countReqSnap = await getCountFromServer(pendingReqQ);
        const pendingRequests = countReqSnap.data().count;

        // 5. Active Today (we would query by lastLogin >= today's start, but for now we simulate or calculate if possible)
        // Simulated: 15% of total users
        const activeToday = Math.floor(totalUsers * 0.15);

        // 6. Estimated Revenue
        // Assuming $14.99 per premium user per month
        const estimatedRevenue = premiumUsers * 14.99;

        setStats({
          totalUsers,
          activeToday,
          activePsychologists,
          pendingRequests,
          premiumUsers,
          estimatedRevenue,
        });

      } catch (error) {
         console.error("Error fetching stats:", error);
      } finally {
         setIsLoadingStats(false);
      }
    };

    fetchDashboardStats();
  }, [userProfile]);

  if (loading || isLoadingStats) return <LoadingAnimation />;

  const statCards = [
    { title: 'Usuarios Registrados', value: stats.totalUsers, icon: Users, color: 'text-blue-500', bg: 'bg-blue-50' },
    { title: 'Activos Hoy', value: stats.activeToday, icon: UserCheck, color: 'text-emerald-500', bg: 'bg-emerald-50' },
    { title: 'Psicólogos Activos', value: stats.activePsychologists, icon: Stethoscope, color: 'text-indigo-500', bg: 'bg-indigo-50' },
    { title: 'Solicitudes Pendientes', value: stats.pendingRequests, icon: MailWarning, color: 'text-amber-500', bg: 'bg-amber-50' },
    { title: 'Usuarios Premium', value: stats.premiumUsers, icon: Gem, color: 'text-purple-500', bg: 'bg-purple-50' },
    { title: 'Ingresos Estimados (Mes)', value: `$${stats.estimatedRevenue.toFixed(2)}`, icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-100' },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 relative pb-20">
      <div className="bg-[#112240] pt-12 pb-24 px-6 relative flex justify-between items-start">
         <div>
            <h1 className="text-2xl font-bold text-white mb-2 leading-tight">Panel<br/>Administrativo</h1>
            <p className="text-indigo-200 text-xs mt-1">Resumen del estado general de Zhi.</p>
         </div>
         <div className="flex flex-col gap-2">
            <Button 
               size="sm" 
               variant="outline" 
               className="bg-white/10 text-white border-white/20 hover:bg-white/20 h-auto py-2 rounded-xl justify-start"
               onClick={() => {
                  sessionStorage.setItem('adminViewingUser', 'true');
                  window.location.href = '/dashboard';
               }}
            >
               <User className="w-4 h-4 mr-1.5" />
               Modo Usuario
            </Button>
            <Button 
               size="sm" 
               variant="outline" 
               className="bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20 hover:text-red-300 h-auto py-2 rounded-xl justify-start"
               onClick={async () => {
                  await signOut();
                  router.push('/login');
               }}
            >
               <LogOut className="w-4 h-4 mr-1.5" />
               Cerrar Sesión
            </Button>
         </div>
      </div>

      <div className="px-5 -mt-16 relative z-10 w-full max-w-4xl mx-auto">
         <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {statCards.map((stat, idx) => {
               const Icon = stat.icon;
               const isClickable = stat.title === 'Activos Hoy';
               
               const CardComponent = (
                  <Card className={`border-none shadow-sm rounded-2xl overflow-hidden hover:shadow-md transition-shadow h-full ${isClickable ? 'cursor-pointer' : ''}`}>
                     <CardContent className="p-5 flex flex-col items-center justify-center text-center h-full">
                        <div className={`w-12 h-12 rounded-full ${stat.bg} ${stat.color} flex items-center justify-center mb-3`}>
                           <Icon className="w-6 h-6" />
                        </div>
                        <h3 className="text-2xl font-extrabold text-slate-800 mb-1">{stat.value}</h3>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">{stat.title}</p>
                     </CardContent>
                  </Card>
               );

               if (isClickable) {
                  return (
                     <Dialog key={idx}>
                        <DialogTrigger asChild>
                           <div>{CardComponent}</div>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md w-[95vw] rounded-2xl p-0 border-none bg-white">
                           <DialogHeader className="px-6 py-4 border-b border-slate-100">
                              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                                 <UserCheck className="w-5 h-5 text-emerald-500" />
                                 Usuarios Activos (Mockup)
                              </DialogTitle>
                           </DialogHeader>
                           <div className="p-6">
                              <p className="text-sm text-slate-500 mb-4">
                                 De momento, la base de datos no registra en tiempo real el evento de inicio de sesión o apertura de la app (LastLogin) para todos. 
                                 Este es un cálculo estimado del 15% que pronto se reemplazará por la lista real de usuarios que entraron hoy.
                              </p>
                              <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100 flex flex-col items-center text-center">
                                 <span className="text-3xl font-extrabold text-emerald-600 mb-1">{stat.value}</span>
                                 <span className="text-xs uppercase tracking-widest font-bold text-emerald-700/70">Personas Estimadas</span>
                              </div>
                           </div>
                        </DialogContent>
                     </Dialog>
                  );
               }

               return (
                  <div key={idx} className="h-full">
                     {CardComponent}
                  </div>
               );
            })}
         </div>

         <div className="mt-8 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center">
            <h3 className="text-lg font-bold text-slate-800 mb-2">Panel en Crecimiento</h3>
            <p className="text-sm text-slate-500 max-w-sm">Utiliza la barra de navegación inferior para explorar en detalle cada rubro de la aplicación y gestionar cuentas.</p>
         </div>
      </div>
    </div>
  );
}
