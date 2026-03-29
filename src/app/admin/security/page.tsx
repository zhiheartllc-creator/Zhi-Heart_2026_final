'use client';

import { useState, useEffect } from 'react';
import { collection, query, getDocs, updateDoc, doc, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingAnimation } from '@/components/loading-animation';
import { useToast } from '@/hooks/use-toast';
import { ShieldAlert, ShieldCheck, AlertOctagon } from 'lucide-react';

export default function AdminSecurityPage() {
  const { userProfile, loading } = useAuth();
  const { toast } = useToast();
  
  const [suspendedUsers, setSuspendedUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSuspended = async () => {
    setIsLoading(true);
    try {
      const usersRef = collection(db, 'users');
      // Look for both suspended users and rejected psychologists
      const suspendedQ = query(usersRef, where('status', '==', 'suspended'));
      const rejectedQ = query(usersRef, where('verificationStatus', '==', 'rejected'));
      
      const [suspSnap, rejSnap] = await Promise.all([getDocs(suspendedQ), getDocs(rejectedQ)]);
      
      const data: any[] = [];
      suspSnap.forEach(doc => data.push({ uid: doc.id, type: 'Suspendido', ...doc.data() }));
      rejSnap.forEach(doc => {
         // Prevent duplicates if a user somehow falls into both categories (unlikely if rules are structured tightly, but safe)
         if (!data.find(u => u.uid === doc.id)) {
            data.push({ uid: doc.id, type: 'Profesional Rechazado', ...doc.data() });
         }
      });
      
      setSuspendedUsers(data);
    } catch (error) {
      console.error("Error fetching blocked accounts:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!userProfile || userProfile.role !== 'admin') return;
    fetchSuspended();
  }, [userProfile]);

  const reactivateAccount = async (uid: string, currentRole: string) => {
    try {
      if (currentRole === 'psychologist') {
         await updateDoc(doc(db, 'users', uid), { verificationStatus: 'verified', status: 'active' });
      } else {
         await updateDoc(doc(db, 'users', uid), { status: 'active' });
      }
      setSuspendedUsers(suspendedUsers.filter(u => u.uid !== uid));
      toast({ title: "Cuenta Reactivada", description: "El usuario ha recuperado el acceso." });
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo reactivar la cuenta." });
    }
  };

  if (loading || (isLoading && suspendedUsers.length === 0)) return <LoadingAnimation />;

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 relative pb-20">
      <div className="bg-[#112240] pt-10 pb-16 px-6 sticky top-0 z-20 shadow-sm border-b border-indigo-900 flex justify-between items-start">
         <h1 className="text-xl font-bold text-white flex items-center gap-2 mb-1">
            <ShieldAlert className="w-5 h-5 text-red-400" />
            Seguridad y Moderación
         </h1>
      </div>

      <div className="px-3 -mt-6 space-y-3 relative z-10 w-full max-w-4xl mx-auto">
         {suspendedUsers.length === 0 && !isLoading && (
            <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-emerald-200">
               <ShieldCheck className="w-10 h-10 text-emerald-300 mx-auto mb-2" />
               <p className="text-slate-500 font-medium">No hay cuentas suspendidas o marcadas por seguridad.</p>
            </div>
         )}
         
         {suspendedUsers.map((u) => {
            return (
               <Card key={u.uid} className="border border-red-200 bg-red-50/10 shadow-sm rounded-2xl overflow-hidden">
                  <CardContent className="p-4">
                     <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-red-100 text-red-600">
                           <AlertOctagon className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                           <h3 className="font-bold text-base text-slate-800 line-clamp-1">
                              {u.name || u.displayName || 'Usuario Zhi'}
                           </h3>
                           <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[9px] font-bold tracking-wider uppercase bg-red-100 text-red-700 px-2 py-0.5 rounded-full border border-red-200">
                                 {u.type}
                              </span>
                              <span className="text-xs text-slate-500 font-medium">{u.email || 'Sin correo'}</span>
                           </div>
                        </div>
                     </div>

                     <div className="flex gap-2 border-t border-red-100 pt-3">
                        <Button
                           variant="outline"
                           onClick={() => reactivateAccount(u.uid, u.role)}
                           className="h-9 text-xs font-semibold flex-1 border-slate-200 text-slate-600 bg-white hover:bg-slate-50"
                        >
                           <ShieldCheck className="w-4 h-4 mr-1.5 text-emerald-500" /> Reactivar y Permitir Acceso
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
