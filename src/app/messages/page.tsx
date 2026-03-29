'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { PinLock } from '@/components/pin-lock';
import { BottomNavBar } from '@/components/bottom-nav-bar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LoadingAnimation } from '@/components/loading-animation';
import { User, MessageSquare, ChevronRight, InboxIcon } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface ChatThread {
  id: string; // The chat document ID
  participants: string[];
  lastMessage: string;
  lastUpdatedAt: any;
  // Metadata fields we added dynamically
  [key: string]: any;
}

export default function MessagesIndexPage() {
  const { user, userProfile, loading } = useAuth();
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [isLoadingChats, setIsLoadingChats] = useState(true);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'direct_messages'),
      where('participants', 'array-contains', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatThread));
      
      // Client-side sorting to bypass the need for a composite index
      docs.sort((a, b) => {
        const timeA = a.lastUpdatedAt?.seconds || 0;
        const timeB = b.lastUpdatedAt?.seconds || 0;
        return timeB - timeA;
      });

      setThreads(docs);
      setIsLoadingChats(false);
    }, (error) => {
      console.error("Error fetching threads:", error);
      setIsLoadingChats(false); // don't permanently block UI on index error
    });

    return () => unsubscribe();
  }, [user]);

  if (loading) return <LoadingAnimation />;

  return (
    <PinLock>
      <div className="flex flex-col min-h-screen bg-slate-50 relative pb-20">
        <div className="bg-[#1e3a5f] px-5 pt-12 pb-8 shadow-sm rounded-b-3xl relative z-10 sticky top-0">
          <div className="flex items-center gap-3">
             <div className="w-12 h-12 bg-white/10 rounded-full flex flex-col items-center justify-center border border-white/20 shadow-inner">
               <MessageSquare className="w-6 h-6 text-white" />
             </div>
             <div>
                <h1 className="text-2xl font-extrabold text-white tracking-tight">Bandeja de Entrada</h1>
                <p className="text-sm font-medium text-slate-300">Tus conversaciones seguras</p>
             </div>
          </div>
        </div>

        <div className="flex-1 px-4 mt-6">
          {isLoadingChats ? (
            <div className="flex justify-center p-8">
              <div className="w-8 h-8 border-4 border-[#4EF2C8] border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : threads.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-3xl border border-slate-100 shadow-sm mt-8">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
                <InboxIcon className="w-10 h-10 text-slate-300" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">Aún no hay mensajes</h3>
              <p className="text-sm text-slate-500 max-w-[250px] mx-auto">
                {userProfile?.role === 'psychologist' 
                  ? 'Aquí aparecerán los chats con tus pacientes asignados.'
                  : 'Cuando inicies una conversación con tu psicólogo, aparecerá aquí.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {threads.map(thread => {
                const otherParticipantId = thread.participants.find(p => p !== user?.uid);
                if (!otherParticipantId) return null; // Safeguard
                
                // Fetch the dynamic metadata we saved during message send
                const name = thread[`participant_${otherParticipantId}_name`] || 'Usuario Misterioso';
                const photo = thread[`participant_${otherParticipantId}_photo`] || '';
                
                let timeString = '';
                if (thread.lastUpdatedAt?.toDate) {
                  timeString = formatDistanceToNow(thread.lastUpdatedAt.toDate(), { addSuffix: true, locale: es });
                }

                return (
                  <Link href={`/messages/${otherParticipantId}`} key={thread.id}>
                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 hover:border-[#4EF2C8]/50 hover:bg-slate-50 transition-colors active:scale-[0.98]">
                      <Avatar className="w-14 h-14 border-2 border-slate-50 shadow-sm shrink-0">
                        <AvatarImage src={photo} className="object-cover" />
                        <AvatarFallback className="bg-slate-100 text-slate-400">
                          <User className="w-6 h-6" />
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1">
                          <h3 className="font-bold text-slate-800 text-base truncate pr-2">{name}</h3>
                          <span className="text-[10px] uppercase font-bold text-slate-400 shrink-0 mt-1">{timeString}</span>
                        </div>
                        <p className="text-sm text-slate-500 line-clamp-2 leading-snug break-words">
                          {thread.lastMessage}
                        </p>
                      </div>
                      
                      <div className="shrink-0 text-slate-300">
                         <ChevronRight className="w-5 h-5" />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
        
        <BottomNavBar forceShow={userProfile?.role !== 'psychologist'} />
      </div>
    </PinLock>
  );
}
