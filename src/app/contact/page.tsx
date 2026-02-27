'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { BottomNavBar } from '@/components/bottom-nav-bar';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { ChatHistoryEntry } from '@/lib/types';
import { 
  User, 
  MessageSquare, 
  Share2, 
  CalendarPlus, 
  Users, 
  Star, 
  BriefcaseMedical,
  Calendar,
  History as HistoryIcon,
  Clock
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

export default function ContactPage() {
  const { user } = useAuth();
  const [sharedHistory, setSharedHistory] = useState<ChatHistoryEntry[]>([]);
  
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'users', user.uid, 'chatHistory'),
      where('sharedWithTherapist', '==', true)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatHistoryEntry));
      
      // Sort manually descending by date
      const sorted = [...docs].sort((a, b) => {
          const getTime = (d: any) => d?.toDate ? d.toDate().getTime() : new Date(d || 0).getTime();
          return getTime(b.date) - getTime(a.date);
      });
      setSharedHistory(sorted);
    }, (error) => {
      console.error("Error fetching shared history:", error);
    });

    return () => unsubscribe();
  }, [user]);

  // As requested, the "Agendar Cita" and "Enviar Mensaje" feature will be a mock for now
  const handleAction = (action: string) => {
    console.log(`Acción seleccionada: ${action}`);
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#F8FAFC] relative pb-20 overflow-x-hidden">
      
      {/* Hero Section */}
      <div className="relative w-full h-[320px] shrink-0">
        <Image 
          src="/mi_psicologo.jpg" 
          alt="Conecta con tu Psicólogo" 
          fill 
          className="object-cover object-center" 
          priority 
        />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#F8FAFC] to-transparent" />
        <div className="absolute inset-x-0 bottom-2 flex flex-col items-center justify-end px-4 text-center">
            <h1 className="text-sm uppercase tracking-widest font-semibold text-slate-700 mb-1 drop-shadow-sm">Conecta con</h1>
            <h2 className="text-3xl font-extrabold text-[#1e3a5f] drop-shadow-md mb-2">tu Psicólogo</h2>
            <p className="text-sm text-slate-700 font-medium max-w-sm drop-shadow-sm">
                Tu espacio seguro para encontrar y comunicarte con un profesional.
            </p>
        </div>
      </div>

      <main className="flex-1 w-full max-w-2xl mx-auto px-4 mt-2 relative z-10 space-y-8">
        
        {/* Assigned Psychologist Section */}
        <section>
          <div className="flex items-center gap-2 mb-4 px-1">
            <User className="w-6 h-6 text-slate-800" />
            <h2 className="text-xl font-bold text-slate-800">Mi Psicólogo Asignado</h2>
          </div>
          
          <Card className="p-5 md:p-6 bg-white shadow-sm border border-slate-100 rounded-2xl">
            <div className="flex items-center gap-4 mb-5">
              <div className="relative w-24 h-24 rounded-full overflow-hidden border-4 border-slate-50 shrink-0 shadow-sm bg-slate-100">
                {/* Fallback to generic image or icon if specific avatar isn't available, but we'll use a placeholder URL for the mockup */}
                <Image 
                  src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=600&auto=format&fit=crop" 
                  alt="Dr. Angarita" 
                  fill 
                  className="object-cover" 
                />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-slate-900">Dr. Angarita</h3>
                <p className="text-sm text-slate-400 font-medium mt-1">Psicólogo Clínico, Esp. en Terapia Cognitivo-Conductual</p>
              </div>
            </div>
            
            <p className="text-sm text-slate-500 mb-6 leading-relaxed">
              Con más de 10 años de experiencia, el Dr. Angarita se especializa en ayudar a adultos a manejar la ansiedad, el estrés y procesos de cambio. Su enfoque se basa en la empatía y en proporcionar herramientas prácticas para el día a día.
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Dialog>
                <DialogTrigger asChild>
                  <Button className="w-full bg-[#112240] hover:bg-[#0a1526] text-white rounded-xl shadow-sm h-11">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Enviar Mensaje
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md bg-white rounded-3xl p-6">
                  <DialogHeader>
                    <DialogTitle className="text-xl font-bold flex items-center gap-2 text-[#1e3a5f]">
                      <MessageSquare className="w-5 h-5 text-blue-500" />
                      Mensaje Directo
                    </DialogTitle>
                    <DialogDescription className="text-slate-500 mt-2">
                      Inicia una conversación privada con el Dr. Angarita. (Función de ejemplo)
                    </DialogDescription>
                  </DialogHeader>
                  <div className="mt-4 bg-slate-50 border border-slate-100 p-4 rounded-xl flex items-center gap-3">
                    <div className="bg-blue-100 p-2 rounded-full"><Clock className="w-5 h-5 text-blue-600" /></div>
                    <div className="text-sm text-slate-700">El tiempo promedio de respuesta es de 2 a 4 horas laborables.</div>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog>
                <DialogTrigger asChild>
                  <Button className="w-full bg-[#4EF2C8] hover:bg-[#3ce5bb] text-slate-900 border-none rounded-xl shadow-sm h-11 font-medium">
                    <HistoryIcon className="w-4 h-4 mr-2" />
                    Historial Compartido
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md bg-white rounded-3xl p-6">
                  <DialogHeader>
                    <DialogTitle className="text-xl font-bold flex items-center gap-2 text-[#1e3a5f]">
                      <HistoryIcon className="w-5 h-5 text-[#25b591]" />
                      Historial Compartido
                    </DialogTitle>
                    <DialogDescription className="text-slate-500 mt-2">
                      Estos son los resúmenes y sesiones de chat que has compartido con tu terapeuta.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="mt-4 space-y-3 max-h-[300px] overflow-y-auto pr-2">
                    {sharedHistory.length > 0 ? (
                      sharedHistory.map(entry => {
                        let dateObj = new Date();
                        if (entry.date?.toDate) dateObj = entry.date.toDate();
                        else if (typeof entry.date === 'string' || entry.date) dateObj = new Date(entry.date);
                        
                        return (
                          <div key={entry.id} className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-sm flex justify-between items-center">
                            <span className="font-medium text-slate-700 truncate mr-2">{entry.title || "Conversación"}</span>
                            <span className="text-slate-400 text-xs shrink-0">{format(dateObj, "d MMM yyyy", { locale: es })}</span>
                          </div>
                        )
                      })
                    ) : (
                      <div className="text-center p-4 bg-slate-50 rounded-lg border border-slate-100">
                        <p className="text-sm text-slate-500">Aún no has compartido ninguna conversación.</p>
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl shadow-sm h-11">
                    <CalendarPlus className="w-4 h-4 mr-2" />
                    Agendar Cita
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md bg-white rounded-3xl p-6">
                  <DialogHeader>
                    <DialogTitle className="text-xl font-bold flex items-center gap-2 text-[#1e3a5f]">
                      <CalendarPlus className="w-5 h-5 text-indigo-500" />
                      Próxima Cita
                    </DialogTitle>
                    <DialogDescription className="text-slate-500 mt-2">
                       Aún no tienes citas agendadas. (Función de ejemplo)
                    </DialogDescription>
                  </DialogHeader>
                  <div className="mt-4 flex flex-col items-center justify-center p-6 bg-slate-50 border border-slate-100 rounded-xl">
                    <Calendar className="w-10 h-10 text-slate-300 mb-2" />
                    <p className="text-sm text-slate-500 text-center">Selecciona un horario disponible para tu próxima sesión online.</p>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </Card>
        </section>

        <div className="h-px bg-slate-200 w-full" />

        {/* Available Psychologists List Section */}
        <section className="pb-6">
          <div className="flex items-center gap-2 mb-4 px-1">
            <Users className="w-6 h-6 text-slate-800" />
            {/* Adding "en ve" as the user's mockup says, though dynamically it could be via user location later */}
            <h2 className="text-xl font-bold text-slate-800">Psicólogos Disponibles en ve</h2>
          </div>
          
          <div className="space-y-4">
            {/* Example Card 1 */}
            <Card className="p-4 md:p-5 bg-white shadow-sm border border-slate-100 rounded-2xl hover:border-slate-300 transition-colors">
              <div className="flex gap-4">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200">
                  <User className="w-8 h-8 text-slate-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="text-lg font-bold text-slate-900 truncate pr-2">Dra. Isabel Castillo</h3>
                    <div className="flex items-center gap-1 text-amber-500 bg-amber-50 px-2 py-0.5 rounded-full">
                      <Star className="w-3.5 h-3.5 fill-current" />
                      <span className="text-xs font-bold">4.9</span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 font-medium mb-2">Terapia de Pareja y Familiar</p>
                  
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-3">
                    <BriefcaseMedical className="w-3.5 h-3.5" />
                    <span>8 años de experiencia</span>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="px-3 py-1 bg-[#4EF2C8]/20 text-[#25b591] text-[10px] font-bold uppercase tracking-wider rounded-full">
                      Terapia Online
                    </span>
                  </div>
                  
                  <div className="flex gap-2 w-full mt-auto">
                    <Button variant="outline" className="flex-1 border-slate-200 text-slate-700 hover:bg-slate-50 text-xs h-9 rounded-lg">
                      Ver Perfil
                    </Button>
                    <Button className="flex-1 bg-[#4EF2C8] hover:bg-[#3ce5bb] text-slate-900 text-xs h-9 rounded-lg shadow-sm w-full font-medium">
                      Agendar Cita
                    </Button>
                  </div>
                </div>
              </div>
            </Card>

            {/* Example Card 2 */}
            <Card className="p-4 md:p-5 bg-white shadow-sm border border-slate-100 rounded-2xl hover:border-slate-300 transition-colors">
              <div className="flex gap-4">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200">
                  <User className="w-8 h-8 text-slate-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="text-lg font-bold text-slate-900 truncate pr-2">Psic. Carlos Mendoza</h3>
                    <div className="flex items-center gap-1 text-amber-500 bg-amber-50 px-2 py-0.5 rounded-full">
                      <Star className="w-3.5 h-3.5 fill-current" />
                      <span className="text-xs font-bold">4.8</span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 font-medium mb-2">Psicólogo Clínico, Adicciones</p>
                  
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-3">
                    <BriefcaseMedical className="w-3.5 h-3.5" />
                    <span>5 años de experiencia</span>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="px-3 py-1 bg-[#4EF2C8]/20 text-[#25b591] text-[10px] font-bold uppercase tracking-wider rounded-full">
                      Terapia Online
                    </span>
                    <span className="px-3 py-1 bg-blue-100 text-blue-600 text-[10px] font-bold uppercase tracking-wider rounded-full">
                      Presencial
                    </span>
                  </div>
                  
                  <div className="flex gap-2 w-full mt-auto">
                    <Button variant="outline" className="flex-1 border-slate-200 text-slate-700 hover:bg-slate-50 text-xs h-9 rounded-lg">
                      Ver Perfil
                    </Button>
                    <Button className="flex-1 bg-[#4EF2C8] hover:bg-[#3ce5bb] text-slate-900 text-xs h-9 rounded-lg shadow-sm w-full font-medium">
                      Agendar Cita
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </section>

      </main>

      <BottomNavBar forceShow={true} />
    </div>
  );
}
