'use client';

import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageSquare, Lock, Unlock, ChevronDown, ChevronUp, MessageCirclePlus, Trash2 } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { doc, collection, onSnapshot, query, orderBy, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { ChatHistoryEntry } from '@/lib/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { LoadingAnimation } from '@/components/loading-animation';
import { useToast } from '@/hooks/use-toast';

export default function HistoryPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [history, setHistory] = useState<ChatHistoryEntry[]>([]);
  const [fetching, setFetching] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) {
      setFetching(false);
      return;
    }
    setFetching(true);
    const q = query(collection(db, 'users', user.uid, 'chatHistory'), orderBy('date', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatHistoryEntry));
      setHistory(docs);
      setFetching(false);
    }, (error) => {
      console.error(error);
      setFetching(false);
      toast({ variant: "destructive", title: "Error", description: "No se pudo cargar el historial." });
    });
    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleToggleShare = async (entryId: string, currentStatus: boolean) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid, 'chatHistory', entryId), {
        sharedWithTherapist: !currentStatus
      });
      toast({
        title: !currentStatus ? "Compartido" : "Oculto",
        description: !currentStatus ? "Conversación compartida con tu terapeuta." : "Conversación ya no es visible para tu terapeuta."
      });
    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", title: "Error", description: "No se pudo actualizar el estado de privacidad." });
    }
  };

  const handleDelete = async (entryId: string) => {
    if (!user) return;
    const confirmed = window.confirm('¿Estás seguro de que deseas eliminar esta conversación? Esta acción no se puede deshacer.');
    if (!confirmed) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'chatHistory', entryId));
      toast({ title: 'Eliminada', description: 'La conversación fue eliminada.' });
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo eliminar la conversación.' });
    }
  };

  if (loading || (!user && fetching)) return <LoadingAnimation />;

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 relative overflow-x-hidden pb-20">
      
      {/* Header Section */}
      <div className="relative w-full h-[250px] shrink-0">
        <Image src="/fondo_chat.jpg" alt="Historial" fill className="object-cover object-top" priority />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-slate-50 to-transparent" />
        <div className="absolute inset-x-0 bottom-2 flex flex-col items-center justify-end px-4 text-center">
            <h1 className="text-3xl font-extrabold text-[#1e3a5f] drop-shadow-md mb-2">Mi Historial</h1>
            <p className="text-sm text-[#3b5b7e] font-medium max-w-sm drop-shadow-sm">
                Un espacio para revisar y compartir tus conversaciones con tu psicólogo.
            </p>
        </div>
      </div>

      {/* Content Section */}
      <main className="flex-1 px-4 -mt-8 relative z-10 w-full max-w-xl mx-auto space-y-4">
        {fetching ? (
            Array(4).fill(0).map((_, i) => (
                <Card key={i} className="p-4 space-y-4">
                    <div className="flex gap-4">
                        <Skeleton className="w-12 h-12 rounded-xl" />
                        <div className="space-y-2 flex-1">
                            <Skeleton className="h-5 w-3/4" />
                            <Skeleton className="h-4 w-1/2" />
                        </div>
                    </div>
                </Card>
            ))
        ) : history.length === 0 ? (
            <Card className="p-8 text-center bg-white border-dashed border-2 border-slate-200 shadow-sm">
                <MessageSquare className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                <h3 className="text-lg font-bold text-slate-700">Sin conversaciones</h3>
                <p className="text-sm text-slate-500 mt-1">Aún no has tenido conversaciones con Zhi. Ve a la sección de Chat para comenzar.</p>
                <Button onClick={() => router.push('/chat')} className="mt-4 bg-[#4EF2C8] hover:bg-[#3ce5bb] text-slate-900 rounded-full">
                    Ir al Chat
                </Button>
            </Card>
        ) : (
            [...history].sort((a, b) => {
                const getTime = (d: any) => d?.toDate ? d.toDate().getTime() : new Date(d || 0).getTime();
                return getTime(b.date) - getTime(a.date);
            }).map((entry) => {
                const isExpanded = expandedId === entry.id;
                let dateObj = new Date();
                if (entry.date?.toDate) {
                    dateObj = entry.date.toDate();
                } else if (typeof entry.date === 'string') {
                    dateObj = new Date(entry.date);
                } else if (entry.date) {
                    dateObj = new Date(entry.date);
                }
                const formattedDate = format(dateObj, "d 'de' MMMM, yyyy", { locale: es });
                const isShared = !!entry.sharedWithTherapist;

                return (
                    <Card key={entry.id} className="border border-slate-100 shadow-sm rounded-2xl overflow-hidden bg-white">
                        <div className="p-4 flex items-start gap-4">
                            {/* Icon */}
                            <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                                <MessageSquare className="w-6 h-6 text-slate-600" />
                            </div>
                            
                            {/* Title & Date */}
                            <div className="flex-1 min-w-0 pr-2">
                                <h3 className="text-base font-bold text-slate-800 truncate mb-1">
                                    {entry.title || "Nueva Conversación..."}
                                </h3>
                                <p className="text-xs text-slate-400 font-medium">{formattedDate}</p>
                            </div>

                            {/* Share Toggle */}
                            <div className="flex flex-col items-center gap-1 shrink-0">
                                <div className="flex items-center gap-2 mb-1">
                                    {isShared ? (
                                        <Unlock className="w-4 h-4 text-green-500" />
                                    ) : (
                                        <Lock className="w-4 h-4 text-red-500" />
                                    )}
                                    <Switch 
                                        checked={isShared} 
                                        onCheckedChange={() => handleToggleShare(entry.id, isShared)} 
                                        className={cn("data-[state=checked]:bg-[#4EF2C8]")}
                                    />
                                </div>
                                <span className="text-[9px] text-slate-400 text-center leading-tight max-w-[60px]">
                                    Compartir con<br/>mi terapeuta
                                </span>
                            </div>
                        </div>

                        {/* Continue & Delete - subtle minimal style */}
                        <div className="px-4 pb-2 pt-1 flex items-center justify-between">
                            <button
                                onClick={() => router.push(`/chat?continueId=${entry.id}&mode=text`)}
                                className="flex items-center gap-1.5 text-xs font-semibold text-[#0F2040] hover:text-[#162f5e] transition-colors"
                            >
                                <MessageCirclePlus className="w-3.5 h-3.5" />
                                Continuar conversación
                            </button>
                            <button
                                onClick={() => handleDelete(entry.id)}
                                className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-red-500 transition-colors"
                            >
                                <Trash2 className="w-3 h-3" />
                                Eliminar
                            </button>
                        </div>

                        {/* Expandable Section */}
                        <div className="border-t border-slate-50">
                            <button 
                                onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                                className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
                            >
                                <span className="text-xs font-semibold italic text-slate-400">Ver conversación</span>
                                {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                            </button>
                            
                            {isExpanded && (
                                <div className="p-4 bg-slate-50/50 border-t border-slate-100 max-h-60 overflow-y-auto space-y-3">
                                    {entry.messages && Array.isArray(entry.messages) && entry.messages.length > 0 ? (
                                        entry.messages.map((msg: any, idx: number) => {
                                            const role = msg.role || msg.sender;
                                            const isUser = role === 'user';
                                            return (
                                                <div key={idx} className={cn("flex", isUser ? "justify-end" : "justify-start")}>
                                                    <div className={cn(
                                                        "max-w-[85%] rounded-2xl p-3 text-sm shadow-sm",
                                                        isUser 
                                                            ? "bg-[#4EF2C8] text-slate-900 rounded-tr-none" 
                                                            : "bg-white border border-slate-100 text-slate-700 rounded-tl-none"
                                                    )}>
                                                        {msg.text}
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <p className="text-center text-sm text-slate-400 italic">No hay mensajes guardados en esta sesión.</p>
                                    )}
                                </div>
                            )}
                        </div>
                    </Card>
                );
            })
        )}
      </main>
    </div>
  );
}
