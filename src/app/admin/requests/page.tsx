'use client';

import { useState, useEffect } from 'react';
import { collection, query, getDocs, updateDoc, doc, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingAnimation } from '@/components/loading-animation';
import { useToast } from '@/hooks/use-toast';
import { MessageSquare, ArrowRight, UserCircle2, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function AdminRequestsPage() {
  const { userProfile, loading } = useAuth();
  const { toast } = useToast();
  
  const [requests, setRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRequests = async () => {
    setIsLoading(true);
    try {
      const q = query(collection(db, 'requests'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      const data: any[] = [];
      snap.forEach(doc => {
         data.push({ id: doc.id, ...doc.data() });
      });
      setRequests(data);
    } catch (error) {
      console.error("Error fetching requests:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!userProfile || userProfile.role !== 'admin') return;
    fetchRequests();
  }, [userProfile]);

  const forceStatus = async (id: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'requests', id), { status: newStatus });
      setRequests(requests.map(r => r.id === id ? { ...r, status: newStatus } : r));
      toast({ title: "Solicitud Actualizada", description: `El estado ha sido forzado a: ${newStatus}.` });
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo cambiar el estado de la conexión." });
    }
  };

  if (loading || (isLoading && requests.length === 0)) return <LoadingAnimation />;

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 relative pb-20">
      <div className="bg-[#112240] pt-10 pb-6 px-6 sticky top-0 z-20 shadow-sm border-b border-indigo-900 flex justify-between items-center">
         <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-indigo-400" />
            Control de Conexiones
         </h1>
      </div>

      <div className="px-3 mt-4 space-y-3 relative z-10 w-full max-w-4xl mx-auto">
         {requests.length === 0 && !isLoading && (
            <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-slate-200">
               <p className="text-slate-500 font-medium">No hay solicitudes en el sistema.</p>
            </div>
         )}
         
         {requests.map((r) => {
            let reqDate = "Desconocida";
            if (r.createdAt?.toDate) {
               reqDate = format(r.createdAt.toDate(), "dd MMM yyyy, h:mm a", { locale: es });
            }

            const status = r.status || 'pending';
            
            return (
               <Card key={r.id} className="border border-slate-100 shadow-sm rounded-2xl overflow-hidden">
                  <CardContent className="p-4">
                     <div className="flex items-center gap-3 justify-between mb-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <div className="flex flex-col text-center flex-1">
                           <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Paciente</span>
                           <h4 className="font-semibold text-sm text-slate-800 line-clamp-1">{r.userName || 'Usuario'}</h4>
                        </div>
                        <div className="shrink-0 flex items-center justify-center">
                           <ArrowRight className="w-4 h-4 text-emerald-400" />
                        </div>
                        <div className="flex flex-col text-center flex-1">
                           <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Profesional</span>
                           <h4 className="font-semibold text-sm text-indigo-700 line-clamp-1">{r.psychologistName || 'Psicólogo'}</h4>
                        </div>
                     </div>

                     <div className="flex justify-between items-center px-1 mb-4">
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                           <Clock className="w-3.5 h-3.5" /> {reqDate}
                        </div>
                        <div>
                           {status === 'pending' && <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold uppercase tracking-wider rounded-md">Pendiente</span>}
                           {status === 'accepted' && <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase tracking-wider rounded-md">Aceptada</span>}
                           {status === 'rejected' && <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold uppercase tracking-wider rounded-md">Rechazada</span>}
                           {status === 'closed' && <span className="px-2 py-0.5 bg-slate-200 text-slate-700 text-[10px] font-bold uppercase tracking-wider rounded-md">Cerrada</span>}
                        </div>
                     </div>
                     
                     <div className="flex gap-2">
                        {status !== 'closed' && status !== 'rejected' && (
                           <Button
                              variant="outline"
                              onClick={() => forceStatus(r.id, 'closed')}
                              className="h-8 text-xs font-semibold flex-1 border-slate-200 text-slate-600 bg-white hover:bg-slate-50"
                           >
                              Forzar Cierre
                           </Button>
                        )}
                        {(status === 'pending' || status === 'rejected') && (
                           <Button
                              variant="outline"
                              onClick={() => forceStatus(r.id, 'accepted')}
                              className="h-8 text-xs font-semibold flex-1 border-emerald-200 text-emerald-600 bg-emerald-50 hover:bg-emerald-100"
                           >
                              Forzar Aprobación
                           </Button>
                        )}
                     </div>
                  </CardContent>
               </Card>
            )
         })}
      </div>
    </div>
  );
}
