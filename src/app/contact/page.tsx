'use client';

// Prevent Next.js from prerendering this page during SSR build.
// Firebase client SDK (onSnapshot) can't run in Node.js.
// This is ignored during static export (build:android) since all pages are static.


import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { BottomNavBar } from '@/components/bottom-nav-bar';
import { collection, query, where, onSnapshot, doc, getDoc, addDoc, serverTimestamp } from 'firebase/firestore';
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
  Clock,
  Lock
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
import { useToast } from '@/hooks/use-toast';

export default function ContactPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [userProfileData, setUserProfileData] = useState<any>(null);
  const [sharedHistory, setSharedHistory] = useState<ChatHistoryEntry[]>([]);
  const [psychologists, setPsychologists] = useState<any[]>([]);
  const [isRequesting, setIsRequesting] = useState<string | null>(null);
  const [userRequests, setUserRequests] = useState<any[]>([]);
  
  useEffect(() => {
    if (!user) return;

    getDoc(doc(db, 'users', user.uid)).then((document) => {
      if (document.exists()) {
        setUserProfileData(document.data());
      }
    }).catch(console.error);

    const qHistory = query(
      collection(db, 'users', user.uid, 'chatHistory'),
      where('sharedWithTherapist', '==', true)
    );
    const unsubscribeHistory = onSnapshot(qHistory, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatHistoryEntry));
      
      const sorted = [...docs].sort((a, b) => {
          const getTime = (d: any) => d?.toDate ? d.toDate().getTime() : new Date(d || 0).getTime();
          return getTime(b.date) - getTime(a.date);
      });
      setSharedHistory(sorted);
    }, (error) => {
      console.error("Error fetching shared history:", error);
    });

    // Fetch verified psychologists
    const qPsychs = query(
      collection(db, 'users'),
      where('role', '==', 'psychologist'),
      where('verificationStatus', '==', 'verified')
    );
    const unsubscribePsychs = onSnapshot(qPsychs, (snapshot) => {
      const psychDocs = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
      setPsychologists(psychDocs);
    }, (error) => {
      console.error("Error fetching psychologists:", error);
    });

    // Fetch user requests
    const qUserReqs = query(
      collection(db, 'requests'),
      where('userId', '==', user.uid)
    );
    const unsubscribeUserReqs = onSnapshot(qUserReqs, (snapshot) => {
      setUserRequests(snapshot.docs.map(doc => doc.data()));
    }, (error) => {
      console.error("Error fetching user requests:", error);
    });

    return () => {
       unsubscribeHistory();
       unsubscribePsychs();
       unsubscribeUserReqs();
    };
  }, [user]);

  const handleRequestPsychologist = async (psychologistId: string, psychologistName: string) => {
    if (!user || !userProfileData?.isPremium) {
      window.location.href = '/premium';
      return;
    }

    setIsRequesting(psychologistId);
    try {
      await addDoc(collection(db, 'requests'), {
        userId: user.uid,
        userName: userProfileData?.name || userProfileData?.displayName || 'Usuario de Zhi',
        psychologistId: psychologistId,
        psychologistName: psychologistName,
        status: 'pending',
        reason: 'Solicitud general de inicio de terapia',
        createdAt: serverTimestamp()
      });
      
      toast({
        title: "¡Solicitud enviada!",
        description: `El ${psychologistName} ha recibido tu solicitud y se pondrá en contacto pronto.`,
      });
    } catch (error) {
      console.error("Error creating request:", error);
      toast({
        variant: "destructive",
        title: "Error al enviar la solicitud",
        description: "Hubo un problema de conexión. Inténtalo más tarde.",
      });
    } finally {
      setIsRequesting(null);
    }
  };

  const acceptedRequests = userRequests.filter(r => r.status === 'accepted');
  const acceptedPsychologists = psychologists.filter(p => acceptedRequests.some(r => r.psychologistId === p.uid));

  const drAngarita = {
    id: 'mock-psychologist-id-1',
    name: 'Dr. Angarita',
    specialties: 'Psicólogo Clínico, Esp. en Terapia Cognitivo-Conductual',
    bio: 'Con más de 10 años de experiencia, el Dr. Angarita se especializa en ayudar a adultos a manejar la ansiedad, el estrés y procesos de cambio. Su enfoque se basa en la empatía y en proporcionar herramientas prácticas para el día a día.',
    photoURL: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=600&auto=format&fit=crop',
    isDefault: true
  };

  const renderAssignedCard = (psych: { id: string, name: string, specialties: string, bio: string, photoURL: string, isDefault?: boolean }) => (
    <Card key={psych.id} className="p-5 md:p-6 bg-white shadow-sm border border-slate-100 rounded-2xl mb-4">
      <div className="flex items-center gap-4 mb-5">
        <div className="relative w-24 h-24 rounded-full overflow-hidden border-4 border-slate-50 shrink-0 shadow-sm bg-slate-100">
          <Image 
            src={psych.photoURL} 
            alt={psych.name} 
            fill 
            className="object-cover" 
          />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-slate-900">{psych.name}</h3>
          <p className="text-sm text-slate-400 font-medium mt-1">{psych.specialties}</p>
        </div>
      </div>
      
      <p className="text-sm text-slate-500 mb-6 leading-relaxed">
        {psych.bio}
      </p>
      
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Dialog>
          <DialogTrigger asChild>
            <Button className="w-full bg-[#112240] hover:bg-[#0a1526] text-white rounded-xl shadow-sm h-11 relative">
              {!userProfileData?.isPremium && <Lock className="w-3 h-3 absolute top-2 right-2 text-white/50" />}
              <MessageSquare className="w-4 h-4 mr-2" />
              Enviar Mensaje
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md bg-white rounded-3xl p-6">
            {userProfileData?.isPremium ? (
              <>
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold flex items-center gap-2 text-[#1e3a5f]">
                    <MessageSquare className="w-5 h-5 text-blue-500" />
                    Mensaje Directo
                  </DialogTitle>
                  <DialogDescription className="text-slate-500 mt-2">
                    Inicia una conversación privada con {psych.name}. (Función de ejemplo)
                  </DialogDescription>
                </DialogHeader>
                <div className="mt-4 bg-slate-50 border border-slate-100 p-4 rounded-xl flex items-center gap-3">
                  <div className="bg-blue-100 p-2 rounded-full"><Clock className="w-5 h-5 text-blue-600" /></div>
                  <div className="text-sm text-slate-700">El tiempo promedio de respuesta es de 2 a 4 horas laborables.</div>
                </div>
              </>
            ) : (
              <>
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold flex items-center gap-2 text-[#1e3a5f]">
                    <Lock className="w-5 h-5 text-purple-500" />
                    Función Premium
                  </DialogTitle>
                  <DialogDescription className="text-slate-500 mt-2">
                    El contacto directo con especialistas es un beneficio exclusivo de Zhi Premium.
                  </DialogDescription>
                </DialogHeader>
                <div className="mt-6">
                  <Button onClick={() => window.location.href = '/premium'} className="w-full bg-[#4EF2C8] hover:bg-[#3ce5bb] text-slate-900 font-bold h-12 rounded-xl">
                    Desbloquear Premium
                  </Button>
                </div>
              </>
            )}
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
                sharedHistory.map((entry: any) => {
                  let dateObj = new Date();
                  if (entry.date?.toDate) dateObj = entry.date.toDate();
                  else if (typeof entry.date === 'string' || entry.date) dateObj = new Date(entry.date);
                  
                  return (
                    <div key={entry.id} className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-sm flex justify-between items-center">
                      <span className="font-medium text-slate-700 truncate mr-2">{entry.title || 'Conversación'}</span>
                      <span className="text-slate-400 text-xs shrink-0">{format(dateObj, 'd MMM yyyy', { locale: es })}</span>
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
            <Button variant="outline" className="w-full border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl shadow-sm h-11 relative">
              {!userProfileData?.isPremium && <Lock className="w-3 h-3 absolute top-2 right-2 text-slate-400" />}
              <CalendarPlus className="w-4 h-4 mr-2" />
              Agendar Cita
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md bg-white rounded-3xl p-6">
            {userProfileData?.isPremium ? (
              <>
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold flex items-center gap-2 text-[#1e3a5f]">
                    <CalendarPlus className="w-5 h-5 text-indigo-500" />
                    Próxima Cita
                  </DialogTitle>
                  <DialogDescription className="text-slate-500 mt-2">
                     Aún no tienes citas agendadas con {psych.name}. (Función de ejemplo)
                  </DialogDescription>
                </DialogHeader>
                <div className="mt-4 flex flex-col items-center justify-center p-6 bg-slate-50 border border-slate-100 rounded-xl">
                  <Calendar className="w-10 h-10 text-slate-300 mb-2" />
                  {psych.isDefault ? (
                    <>
                      <p className="text-sm text-slate-500 text-center mb-4">Envía una solicitud para iniciar un proceso terapéutico.</p>
                      <Button 
                        onClick={() => handleRequestPsychologist(psych.id, psych.name)}
                        disabled={isRequesting === psych.id}
                        className="w-full bg-[#4EF2C8] hover:bg-[#3ce5bb] text-slate-900 font-bold"
                      >
                        {isRequesting === psych.id ? 'Enviando...' : `Enviar Solicitud a ${psych.name}`}
                      </Button>
                    </>
                  ) : (
                     <p className="text-sm text-slate-500 text-center mb-4">Pronto podrás agendar tus citas directamente aquí.</p>
                  )}
                </div>
              </>
            ) : (
              <>
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold flex items-center gap-2 text-[#1e3a5f]">
                    <Lock className="w-5 h-5 text-purple-500" />
                    Función Premium
                  </DialogTitle>
                  <DialogDescription className="text-slate-500 mt-2">
                    El agendamiento de citas en línea es un beneficio exclusivo de Zhi Premium.
                  </DialogDescription>
                </DialogHeader>
                <div className="mt-6">
                  <Button onClick={() => window.location.href = '/premium'} className="w-full bg-[#4EF2C8] hover:bg-[#3ce5bb] text-slate-900 font-bold h-12 rounded-xl">
                    Desbloquear Premium
                  </Button>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Card>
  );

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
          <div className="flex items-center gap-2 mb-2 px-1">
            <User className="w-6 h-6 text-slate-800" />
            <h2 className="text-xl font-bold text-slate-800">Mi Psicólogo Asignado</h2>
          </div>
          <div className="flex items-center gap-2 mb-4 px-1">
            {userProfileData?.isPremium ? (
               <span className="text-[10px] font-bold tracking-wide uppercase text-[#25b591] bg-[#4EF2C8]/10 border border-[#4EF2C8]/30 px-2.5 py-0.5 rounded-full">✨ Acceso Premium Total</span>
            ) : (
               <span className="text-[10px] font-bold tracking-wide uppercase text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">🔒 Premium: Contacta a tu psicólogo</span>
            )}
          </div>
          
          <div className="space-y-4">
            {acceptedPsychologists.length > 0 ? (
              acceptedPsychologists.map(psych => renderAssignedCard({
                 id: psych.uid,
                 name: psych.name || 'Profesional Registrado',
                 specialties: psych.specialties || 'Psicólogo Clínico',
                 bio: psych.bio || 'Este profesional no ha añadido una biografía todavía.',
                 photoURL: psych.photoURL || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=600&auto=format&fit=crop',
                 isDefault: false
              }))
            ) : (
              renderAssignedCard(drAngarita)
            )}
          </div>
        </section>

        <div className="h-px bg-slate-200 w-full" />

        {/* Available Psychologists List Section */}
        <section className="pb-6">
          <div className="flex items-center gap-2 mb-4 px-1">
            <Users className="w-6 h-6 text-slate-800" />
            <h2 className="text-xl font-bold text-slate-800">
               Psicólogos Disponibles {userProfileData?.country ? `en ${userProfileData.country.toUpperCase()}` : ''}
            </h2>
          </div>
          
          <div className="space-y-4">
            {psychologists.length === 0 ? (
               <div className="text-center p-6 bg-white rounded-2xl border border-dashed border-slate-200">
                  <p className="text-slate-500 font-medium">Próximamente habrá profesionales disponibles en esta área.</p>
               </div>
            ) : (
               psychologists.map(psych => (
                  <Card key={psych.uid} className="p-4 md:p-5 bg-white shadow-sm border border-slate-100 rounded-2xl hover:border-slate-300 transition-colors">
                    <div className="flex gap-4">
                      {psych.photoURL ? (
                         <div className="w-16 h-16 rounded-full overflow-hidden shrink-0 border border-slate-200 shadow-sm">
                            <img src={psych.photoURL} alt={psych.name} className="w-full h-full object-cover" />
                         </div>
                      ) : (
                         <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200">
                           <User className="w-8 h-8 text-slate-300" />
                         </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1">
                          <h3 className="text-lg font-bold text-slate-900 truncate pr-2">{psych.name || 'Profesional Registrado'}</h3>
                          <div className="flex items-center gap-1 text-amber-500 bg-amber-50 px-2 py-0.5 rounded-full">
                            <Star className="w-3.5 h-3.5 fill-current" />
                            <span className="text-xs font-bold">5.0</span>
                          </div>
                        </div>
                        <p className="text-xs text-slate-500 font-medium mb-1 truncate">{psych.specialties || 'Sin especialidades listadas'}</p>
                        {psych.bio && (
                           <p className="text-xs text-slate-400 mb-2 line-clamp-2">{psych.bio}</p>
                        )}
                        
                        <div className="flex items-center gap-3 text-xs text-slate-400 mb-3 flex-wrap">
                           {psych.city || psych.country ? (
                              <div className="flex items-center gap-1">
                                 <span className="font-semibold text-slate-500">{psych.city || ''}{psych.city && psych.country ? ', ' : ''}{psych.country || ''}</span>
                              </div>
                           ) : null}
                           <div className="flex items-center gap-1 text-emerald-600 font-semibold">
                              <span>{psych.price || 'Consultar Tarifa'}</span>
                           </div>
                        </div>
                        
                        <div className="flex flex-wrap gap-2 mb-4">
                          <span className="px-3 py-1 bg-[#4EF2C8]/20 text-[#25b591] text-[10px] font-bold uppercase tracking-wider rounded-full">
                            {psych.modality || 'Consultar Modalidad'}
                          </span>
                        </div>
                        
                        {(() => {
                           const req = userRequests.find(r => r.psychologistId === psych.uid);
                           if (req) {
                             return (
                               <div className="flex flex-col w-full mt-auto gap-2">
                                 {req.status === 'pending' && (
                                   <div className="bg-amber-50 text-amber-700 text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg border border-amber-200 text-center flex items-center justify-center gap-1.5">
                                     <Clock className="w-3.5 h-3.5" /> Solicitud enviada, en espera de respuesta
                                   </div>
                                 )}
                                 {req.status === 'accepted' && (
                                   <div className="bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg border border-emerald-200 text-center flex items-center justify-center gap-1.5">
                                     <User className="w-3.5 h-3.5" /> Tu Psicólogo Actual
                                   </div>
                                 )}
                                 <div className="flex gap-2 w-full">
                                   <Button variant="outline" className="flex-1 border-slate-200 text-slate-700 hover:bg-slate-50 text-xs h-9 rounded-lg" onClick={() => window.location.href = `/messages/${psych.uid}`}>
                                     <MessageSquare className="w-3.5 h-3.5 mr-1" /> Mensaje
                                   </Button>
                                   <Button className="flex-1 bg-[#112240] hover:bg-[#0a1526] text-white text-xs h-9 rounded-lg" onClick={() => toast({ title: "Agenda", description: "Buscando horarios disponibles..." })}>
                                     <CalendarPlus className="w-3.5 h-3.5 mr-1" /> Agendar
                                   </Button>
                                 </div>
                               </div>
                             );
                           }
                           
                           return (
                             <div className="flex gap-2 w-full mt-auto">
                               <Button variant="outline" className="flex-1 border-slate-200 text-slate-700 hover:bg-slate-50 text-xs h-9 rounded-lg" onClick={() => toast({ title: 'Perfil en desarrollo', description: 'Pronto podrás ver el currículum completo del profesional.'})}>
                                 Ver Perfil
                               </Button>
                               <Button 
                                 onClick={() => handleRequestPsychologist(psych.uid, psych.name)}
                                 disabled={isRequesting === psych.uid}
                                 className="flex-1 bg-[#4EF2C8] hover:bg-[#3ce5bb] text-slate-900 text-xs h-9 rounded-lg shadow-sm w-full font-medium"
                               >
                                 {userProfileData?.isPremium ? (isRequesting === psych.uid ? 'Enviando...' : 'Enviar Solicitud') : <><Lock className="w-3 h-3 mr-1 inline" /> Premium</>}
                               </Button>
                             </div>
                           );
                        })()}
                      </div>
                    </div>
                  </Card>
               ))
            )}
          </div>
        </section>

      </main>

      <BottomNavBar forceShow={true} />
    </div>
  );
}
