'use client';

import { useState, useEffect } from 'react';
import { collection, query, getDocs, updateDoc, doc, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingAnimation } from '@/components/loading-animation';
import { useToast } from '@/hooks/use-toast';
import { User, ShieldAlert, ShieldCheck, Gem, UserX, UserSearch } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Input } from '@/components/ui/input';

export default function AdminUsersPage() {
  const { userProfile, loading } = useAuth();
  const { toast } = useToast();
  
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const usersRef = collection(db, 'users');
      // For a real production app we'd paginate, but for the scope of the admin panel we fetch recent users
      const q = query(usersRef, orderBy('createdAt', 'desc'), limit(100));
      const snap = await getDocs(q);
      const data: any[] = [];
      snap.forEach(doc => {
         const user = doc.data();
         if (user.role !== 'psychologist' && user.role !== 'admin') {
            data.push({ uid: doc.id, ...user });
         }
      });
      setUsers(data);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!userProfile || userProfile.role !== 'admin') return;
    fetchUsers();
  }, [userProfile]);

  const toggleStatus = async (uid: string, currentStatus: string) => {
    const newStatus = currentStatus === 'suspended' ? 'active' : 'suspended';
    try {
      await updateDoc(doc(db, 'users', uid), { status: newStatus });
      setUsers(users.map(u => u.uid === uid ? { ...u, status: newStatus } : u));
      toast({ title: "Estado Actualizado", description: `El usuario ahora está ${newStatus}.` });
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo cambiar el estado." });
    }
  };

  const togglePremium = async (uid: string, isPremium: boolean) => {
    try {
      await updateDoc(doc(db, 'users', uid), { isPremium: !isPremium });
      setUsers(users.map(u => u.uid === uid ? { ...u, isPremium: !isPremium } : u));
      toast({ title: "Plan Actualizado", description: `El usuario ${!isPremium ? 'ahora es Premium' : 'ya no es Premium'}.` });
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo actualizar el plan." });
    }
  };

  const filteredUsers = users.filter((u) => {
     const search = searchTerm.toLowerCase();
     const nameMatch = (u.name || u.displayName || '').toLowerCase().includes(search);
     const emailMatch = (u.email || '').toLowerCase().includes(search);
     return nameMatch || emailMatch;
  });

  if (loading || (isLoading && users.length === 0)) return <LoadingAnimation />;

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 relative pb-20">
      <div className="bg-[#112240] pt-10 pb-6 px-6 sticky top-0 z-20 shadow-sm border-b border-indigo-900">
         <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <UserSearch className="w-5 h-5 text-indigo-400" />
            Control de Usuarios
         </h1>
         <div className="mt-4">
            <Input 
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               placeholder="Buscar por nombre o correo..."
               className="bg-white/10 border-white/20 text-white placeholder:text-slate-400 h-11"
            />
         </div>
      </div>

      <div className="px-3 mt-4 space-y-3 relative z-10 w-full max-w-4xl mx-auto">
         {filteredUsers.length === 0 && !isLoading && (
            <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-slate-200">
               <p className="text-slate-500 font-medium">No se encontraron usuarios.</p>
            </div>
         )}
         
         {filteredUsers.map((u) => {
            let joinDate = "Desconocida";
            if (u.createdAt?.toDate) {
               joinDate = format(u.createdAt.toDate(), "dd MMM yyyy", { locale: es });
            }

            const isSuspended = u.status === 'suspended';
            const isPremium = !!u.isPremium;

            return (
               <Card key={u.uid} className={`border ${isSuspended ? 'border-red-200 bg-red-50/30' : 'border-slate-100'} shadow-sm rounded-2xl overflow-hidden`}>
                  <CardContent className="p-4">
                     <div className="flex justify-between items-start mb-2">
                        <div className="flex gap-3">
                           <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isPremium ? 'bg-purple-100 text-purple-600' : 'bg-slate-100 text-slate-500'}`}>
                              {isPremium ? <Gem className="w-5 h-5" /> : <User className="w-5 h-5" />}
                           </div>
                           <div>
                              <h3 className={`font-bold text-base ${isSuspended ? 'text-red-700' : 'text-slate-800'}`}>
                                 {u.name || u.displayName || 'Usuario Desconocido'}
                              </h3>
                              <p className="text-xs text-slate-500 font-medium">{u.email || 'Sin correo registrado'}</p>
                           </div>
                        </div>
                        {isSuspended && (
                           <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold uppercase tracking-wider rounded-md border border-red-200">
                              Suspendido
                           </span>
                        )}
                     </div>

                     <div className="grid grid-cols-2 gap-y-1 gap-x-4 ml-12 mb-3">
                        <div className="text-[11px] text-slate-500"><span className="font-semibold">Registro:</span> {joinDate}</div>
                        <div className="text-[11px] text-slate-500"><span className="font-semibold">Plan:</span> {isPremium ? 'Premium' : 'Gratis'}</div>
                        <div className="text-[11px] text-slate-500"><span className="font-semibold">País:</span> {u.country?.toUpperCase() || 'N/A'}</div>
                     </div>

                     <div className="flex gap-2 ml-12">
                        <Button
                           variant={isPremium ? "outline" : "default"}
                           onClick={() => togglePremium(u.uid, isPremium)}
                           className={`h-8 text-xs font-semibold flex-1 ${!isPremium ? 'bg-[#4EF2C8] hover:bg-[#3ce5bb] text-slate-900 border-none' : 'border-purple-200 text-purple-700 hover:bg-purple-50'}`}
                        >
                           {isPremium ? 'Remover Premium' : 'Hacer Premium'}
                        </Button>
                        <Button
                           variant="outline"
                           onClick={() => toggleStatus(u.uid, u.status)}
                           className={`h-8 text-xs font-semibold w-9 p-0 shrink-0 ${isSuspended ? 'border-emerald-200 text-emerald-600 bg-emerald-50 hover:bg-emerald-100' : 'border-red-200 text-red-600 bg-red-50 hover:bg-red-100'}`}
                           title={isSuspended ? "Reactivar Cuenta" : "Suspender Cuenta"}
                        >
                           {isSuspended ? <ShieldCheck className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
                        </Button>
                     </div>
                  </CardContent>
               </Card>
            )
         })}
      </div>
    </div>
  );
}
