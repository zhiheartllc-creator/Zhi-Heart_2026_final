'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingAnimation } from '@/components/loading-animation';
import { CalendarDays, ArrowLeft, Clock, Save } from 'lucide-react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

interface DayAvailability {
  active: boolean;
  startTime: string;
  endTime: string;
}

interface Availability {
  [key: string]: DayAvailability;
}

const DAYS_OF_WEEK = [
  { id: 'monday', label: 'Lunes' },
  { id: 'tuesday', label: 'Martes' },
  { id: 'wednesday', label: 'Miércoles' },
  { id: 'thursday', label: 'Jueves' },
  { id: 'friday', label: 'Viernes' },
  { id: 'saturday', label: 'Sábado' },
  { id: 'sunday', label: 'Domingo' },
];

const DEFAULT_AVAILABILITY: Availability = DAYS_OF_WEEK.reduce((acc, day) => {
  acc[day.id] = { active: false, startTime: '09:00', endTime: '17:00' };
  return acc;
}, {} as Availability);

export default function AgendaPage() {
  const { user, userProfile, loading } = useAuth();
  const { toast } = useToast();
  
  const [availability, setAvailability] = useState<Availability>(DEFAULT_AVAILABILITY);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!user || userProfile?.role !== 'psychologist') return;

    const fetchAvailability = async () => {
      try {
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().availability) {
          setAvailability({ ...DEFAULT_AVAILABILITY, ...docSnap.data().availability });
        }
      } catch (error) {
        console.error("Error fetching availability:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAvailability();
  }, [user, userProfile]);

  const handleToggleDay = (dayId: string) => {
    setAvailability(prev => ({
      ...prev,
      [dayId]: { ...prev[dayId], active: !prev[dayId].active }
    }));
  };

  const handleChangeTime = (dayId: string, field: 'startTime' | 'endTime', value: string) => {
    setAvailability(prev => ({
      ...prev,
      [dayId]: { ...prev[dayId], [field]: value }
    }));
  };

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        availability
      });
      toast({
        title: "Agenda Actualizada",
        description: "Tus horarios de disponibilidad han sido guardados."
      });
    } catch (error) {
      console.error("Error saving agenda:", error);
      toast({
        variant: "destructive",
        title: "Error al guardar",
        description: "Hubo un problema al actualizar tu agenda."
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading || isLoading) return <LoadingAnimation />;

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 relative pb-20">
      {/* Header */}
      <div className="bg-[#112240] px-4 pt-10 pb-6 shadow-md border-b border-indigo-900 sticky top-0 z-20 flex items-center gap-3">
        <Link href="/psychologist/dashboard" className="p-2 -ml-2 text-indigo-200 hover:text-white hover:bg-white/10 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
           <CalendarDays className="w-5 h-5 text-[#4EF2C8]" />
           Mi Agenda
        </h1>
      </div>

      <div className="px-5 mt-6 space-y-6 max-w-lg mx-auto w-full">
        <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl">
           <p className="text-sm text-indigo-800 font-medium">Configura los días y las horas en los que estás disponible para atender pacientes. Esto determinará cuándo pueden agendar sesiones contigo.</p>
        </div>

        <Card className="border-none shadow-sm rounded-2xl bg-white overflow-hidden">
           <CardContent className="p-0">
             <div className="divide-y divide-slate-100">
                {DAYS_OF_WEEK.map((day) => {
                  const dayData = availability[day.id];
                  return (
                    <div key={day.id} className={`p-4 transition-colors ${dayData.active ? 'bg-white' : 'bg-slate-50/50'}`}>
                       <div className="flex items-center justify-between mb-3">
                         <div className="flex items-center gap-3">
                            <button
                              onClick={() => handleToggleDay(day.id)}
                              className={`w-10 h-6 rounded-full transition-colors relative ${dayData.active ? 'bg-[#4EF2C8]' : 'bg-slate-300'}`}
                            >
                               <span className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${dayData.active ? 'translate-x-4' : ''}`} />
                            </button>
                            <span className={`font-bold ${dayData.active ? 'text-slate-800' : 'text-slate-400'}`}>
                               {day.label}
                            </span>
                         </div>
                         {dayData.active && <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100">Disponible</span>}
                       </div>
                       
                       {dayData.active && (
                         <div className="flex items-center gap-3 pl-14 opacity-100 transition-opacity animate-in fade-in slide-in-from-top-2">
                            <div className="flex-1">
                               <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Desde</label>
                               <div className="relative">
                                  <Clock className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                  <input 
                                    type="time" 
                                    value={dayData.startTime}
                                    onChange={(e) => handleChangeTime(day.id, 'startTime', e.target.value)}
                                    className="w-full text-sm font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg py-1.5 pl-8 pr-2 focus:outline-none focus:ring-2 focus:ring-[#4EF2C8]" 
                                  />
                               </div>
                            </div>
                            <span className="text-slate-300 font-bold mt-4">-</span>
                            <div className="flex-1">
                               <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Hasta</label>
                               <div className="relative">
                                  <Clock className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                  <input 
                                    type="time" 
                                    value={dayData.endTime}
                                    onChange={(e) => handleChangeTime(day.id, 'endTime', e.target.value)}
                                    className="w-full text-sm font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg py-1.5 pl-8 pr-2 focus:outline-none focus:ring-2 focus:ring-[#4EF2C8]" 
                                  />
                               </div>
                            </div>
                         </div>
                       )}
                    </div>
                  );
                })}
             </div>
           </CardContent>
        </Card>

        <Button 
          onClick={handleSave} 
          disabled={isSaving}
          className="w-full bg-[#112240] hover:bg-slate-800 text-white font-bold h-12 rounded-xl shadow-md text-base"
        >
          {isSaving ? "Guardando..." : (
             <>
                <Save className="w-5 h-5 mr-2 text-[#4EF2C8]" />
                Guardar Horarios
             </>
          )}
        </Button>
      </div>
    </div>
  );
}
