'use client';

import { useState, useEffect } from 'react';
import { collection, query, getDocs, updateDoc, doc, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingAnimation } from '@/components/loading-animation';
import { useToast } from '@/hooks/use-toast';
import { Gem, Crown, CalendarOff } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function AdminSubscriptionsPage() {
  const { userProfile, loading } = useAuth();
  const { toast } = useToast();
  
  const [premiumUsers, setPremiumUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPremiumUsers = async () => {
    setIsLoading(true);
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('isPremium', '==', true));
      const snap = await getDocs(q);
      const data: any[] = [];
      snap.forEach(doc => {
         data.push({ uid: doc.id, ...doc.data() });
      });
      // Sort manually as we combined where isPremium
      data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setPremiumUsers(data);
    } catch (error) {
      console.error("Error fetching subs:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!userProfile || userProfile.role !== 'admin') return;
    fetchPremiumUsers();
  }, [userProfile]);

  const revokePremium = async (uid: string) => {
    try {
      await updateDoc(doc(db, 'users', uid), { isPremium: false });
      setPremiumUsers(premiumUsers.filter(u => u.uid !== uid));
      toast({ title: "Suscripción Revocada", description: "El plan premium ha sido eliminado." });
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo actualizar." });
    }
  };

  if (loading || (isLoading && premiumUsers.length === 0)) return <LoadingAnimation />;

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 relative pb-20">
      <div className="bg-[#112240] pt-10 pb-16 px-6 sticky top-0 z-20 shadow-sm border-b border-indigo-900 flex justify-between items-start">
         <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2 mb-1">
               <Gem className="w-5 h-5 text-indigo-400" />
               Suscripciones Activas
            </h1>
            <p className="text-indigo-200 text-sm">Gestiona usuarios Premium.</p>
         </div>
      </div>

      <div className="px-3 -mt-6 space-y-3 relative z-10 w-full max-w-4xl mx-auto">
         {premiumUsers.length === 0 && !isLoading && (
            <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-slate-200">
               <p className="text-slate-500 font-medium">No hay usuarios premium actualmente.</p>
            </div>
         )}
         
         {premiumUsers.map((u) => {
            return (
               <Card key={u.uid} className="border border-purple-200 shadow-sm rounded-2xl overflow-hidden relative">
                  <div className="absolute top-0 right-0 w-16 h-16 overflow-hidden">
                     <div className="bg-purple-500 text-white text-[9px] font-bold uppercase tracking-widest text-center py-1 w-24 transform rotate-45 translate-x-4 translate-y-2 shadow-sm">
                        PREMIUM
                     </div>
                  </div>
                  <CardContent className="p-4 pt-5">
                     <div className="flex items-center gap-3 mb-3 pr-10">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-purple-100 text-purple-600">
                           <Crown className="w-5 h-5" />
                        </div>
                        <div>
                           <h3 className="font-bold text-base text-slate-800 line-clamp-1">
                              {u.name || u.displayName || 'Usuario Zhi'}
                           </h3>
                           <p className="text-xs text-slate-500 font-medium">{u.email || '@'}</p>
                        </div>
                     </div>

                     <div className="flex gap-2 mt-4 border-t border-slate-50 pt-3">
                        <Button
                           variant="outline"
                           onClick={() => revokePremium(u.uid)}
                           className="h-9 text-xs font-semibold flex-1 border-red-200 text-red-600 bg-red-50 hover:bg-red-100"
                        >
                           <CalendarOff className="w-4 h-4 mr-1.5" /> Revocar Suscripción
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
