'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingAnimation } from '@/components/loading-animation';
import { Users, UserPlus, FileText, CheckCircle, Clock, CalendarDays, ChevronRight, Bell, MessageSquare } from 'lucide-react';
import Image from 'next/image';
import { collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Link from 'next/link';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface PatientRequest {
  id: string;
  userId: string;
  userName: string;
  reason: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: any;
  modality?: string;
}

export default function PsychologistDashboard() {
  const { user, userProfile, loading } = useAuth();
  const [requests, setRequests] = useState<PatientRequest[]>([]);
  const [activePatients, setActivePatients] = useState(0);
  const [isLoadingData, setIsLoadingData] = useState(true);

  useEffect(() => {
    if (!user || userProfile?.role !== 'psychologist') return;

    const fetchDashboardData = async () => {
      setIsLoadingData(true);
      try {
        // Fetch pending requests without orderBy to avoid needing a complex index
        const reqQuery = query(
          collection(db, 'requests'),
          where('psychologistId', '==', user.uid),
          where('status', '==', 'pending')
        );
        const reqSnap = await getDocs(reqQuery);
        const fetchedRequests: PatientRequest[] = [];
        reqSnap.forEach((doc) => {
          fetchedRequests.push({ id: doc.id, ...doc.data() } as PatientRequest);
        });
        
        // Sort manually by createdAt (descending)
        fetchedRequests.sort((a, b) => {
           const timeA = a.createdAt?.seconds || 0;
           const timeB = b.createdAt?.seconds || 0;
           return timeB - timeA;
        });
        
        setRequests(fetchedRequests);

        // Fetch active patients (Placeholder until patients collection is wired)
        const patientQuery = query(
          collection(db, 'requests'),
          where('psychologistId', '==', user.uid),
          where('status', '==', 'accepted')
        );
        const patientSnap = await getDocs(patientQuery);
        setActivePatients(patientSnap.size);

      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchDashboardData();
  }, [user, userProfile]);

  if (loading || isLoadingData) return <LoadingAnimation />;

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 relative pb-20">
      
      {/* Header */}
      <div className="bg-white px-6 pt-12 pb-6 rounded-b-3xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] border-b border-slate-100 z-10 relative">
        <div className="flex items-center gap-4">
          <div className="relative w-14 h-14 rounded-full overflow-hidden border-2 border-[#4EF2C8]">
            <Image
              src={user?.photoURL || "/Corazon_Zhi.jpg"}
              alt="Psychologist profile"
              fill
              className="object-cover"
            />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Hola, Dr. {userProfile?.name?.split(' ')[0] || 'Psicólogo'}</h1>
            <p className="text-sm text-slate-500">Panel de Control Zhi</p>
          </div>
        </div>
      </div>

      <div className="px-5 mt-6 space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="block cursor-pointer" onClick={() => document.getElementById('requests-section')?.scrollIntoView({ behavior: 'smooth' })}>
            <Card className="border-none shadow-sm rounded-2xl bg-gradient-to-br from-[#4EF2C8]/20 to-[#4EF2C8]/5 h-full hover:shadow-md transition-shadow">
              <CardContent className="p-4 flex flex-col items-center justify-center text-center h-full">
                 <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm mb-2 text-[#25b591]">
                   <UserPlus className="w-5 h-5" />
                 </div>
                 <h3 className="text-2xl font-bold text-slate-800">{requests.length}</h3>
                 <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Solicitudes</p>
              </CardContent>
            </Card>
          </div>
          
          <Link href="/psychologist/patients" className="block">
            <Card className="border-none shadow-sm rounded-2xl bg-white h-full hover:shadow-md transition-shadow">
              <CardContent className="p-4 flex flex-col items-center justify-center text-center h-full">
                 <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center shadow-sm mb-2 text-indigo-500 border border-slate-100">
                   <Users className="w-5 h-5" />
                 </div>
                 <h3 className="text-2xl font-bold text-slate-800">{activePatients}</h3>
                 <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Pacientes</p>
              </CardContent>
            </Card>
          </Link>
          
          <Link href="/messages" className="block col-span-2 sm:col-span-1">
            <Card className="border-none shadow-sm rounded-2xl bg-gradient-to-br from-[#1e3a5f] to-slate-800 h-full hover:shadow-md transition-shadow">
              <CardContent className="p-4 flex flex-col items-center justify-center text-center h-full">
                 <div className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center shadow-sm mb-2 text-white">
                   <MessageSquare className="w-5 h-5" />
                 </div>
                 <h3 className="text-lg font-bold text-white mt-1">Mensajes</h3>
                 <p className="text-xs font-semibold text-slate-300 uppercase tracking-wide">Bandeja Segura</p>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Pending Requests Section */}
        <div id="requests-section">
           <div className="flex items-center justify-between mb-4 px-1">
             <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Bell className="w-5 h-5 text-amber-500 fill-amber-500/20" />
                Nuevas Solicitudes
             </h2>
             {requests.length > 0 && (
                <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full">
                  {requests.length}
                </span>
             )}
           </div>

           {requests.length === 0 ? (
             <Card className="border-dashed border-2 bg-slate-50 border-slate-200">
                <CardContent className="flex flex-col items-center justify-center p-8 text-center min-h-[160px]">
                  <CheckCircle className="w-12 h-12 text-slate-300 mb-3" />
                  <p className="text-slate-500 font-medium text-sm">No tienes solicitudes pendientes en este momento.</p>
                </CardContent>
             </Card>
           ) : (
             <div className="space-y-3">
               {requests.map((req) => (
                 <Card key={req.id} className="border-none shadow-sm rounded-2xl overflow-hidden cursor-pointer hover:shadow-md transition-all active:scale-[0.98]">
                    <div className="border-l-4 border-amber-400 p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-bold text-slate-800">{req.userName}</h3>
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                             <Clock className="w-3.5 h-3.5" /> 
                             {req.createdAt?.seconds ? format(new Date(req.createdAt.seconds * 1000), "d MMM yyyy, h:mm a", { locale: es }) : 'Reciente'}
                          </div>
                        </div>
                        <span className="bg-amber-50 text-amber-600 border border-amber-200 text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-md">
                          Nueva
                        </span>
                      </div>
                      
                      <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100 mb-3">
                        <span className="font-semibold text-slate-700">Motivo:</span> {req.reason || 'No especificado'}
                      </p>

                      <div className="flex justify-end mt-2">
                        <Link href={`/psychologist/requests/${req.id}`}>
                           <Button size="sm" className="bg-slate-900 hover:bg-slate-800 rounded-xl text-xs px-4 h-9">
                              Ver Detalle
                           </Button>
                        </Link>
                      </div>
                    </div>
                 </Card>
               ))}
             </div>
           )}
        </div>

        {/* Schedule / Approaching Sessions Placeholder */}
        <div className="pt-2">
           <div className="flex items-center justify-between mb-4 px-1">
             <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-indigo-500" />
                Próximas Sesiones
             </h2>
             <Link href="/psychologist/agenda" className="text-sm font-semibold text-[#25b591] flex items-center">
                Ver agenda <ChevronRight className="w-4 h-4" />
             </Link>
           </div>
           
           <Card className="border border-slate-100 shadow-sm bg-white rounded-2xl">
              <CardContent className="p-5 flex flex-col items-center justify-center text-center">
                 <p className="text-sm text-slate-500 font-medium">Aún no hay sesiones programadas para hoy.</p>
              </CardContent>
           </Card>
        </div>

      </div>
    </div>
  );
}
