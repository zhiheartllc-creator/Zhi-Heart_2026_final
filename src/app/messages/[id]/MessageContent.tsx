'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, getDoc, setDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Send, User as UserIcon } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LoadingAnimation } from '@/components/loading-animation';
import { PinLock } from '@/components/pin-lock';

interface Message {
  id: string;
  senderId: string;
  text: string;
  createdAt: any;
}

export default function DirectMessagePage() {
  const { user, userProfile, loading } = useAuth();
  const params = useParams();
  const router = useRouter();
  const otherUserId = params.id as string;
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [otherUser, setOtherUser] = useState<any>(null);
  const [isLoadingChat, setIsLoadingChat] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!user || !otherUserId) return;

    // Fetch other user's profile
    const fetchOtherUser = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'users', otherUserId));
        if (docSnap.exists()) {
          setOtherUser(docSnap.data());
        }
      } catch (error) {
        console.error("Error fetching other user:", error);
      }
    };
    fetchOtherUser();

    // Generate a unique chat room ID based on both UIDs
    const chatId = user.uid < otherUserId ? `${user.uid}_${otherUserId}` : `${otherUserId}_${user.uid}`;
    
    const q = query(
      collection(db, 'direct_messages', chatId, 'messages'),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs: Message[] = [];
      snapshot.forEach((doc) => {
        msgs.push({ id: doc.id, ...doc.data() } as Message);
      });
      setMessages(msgs);
      setIsLoadingChat(false);
    });

    return () => unsubscribe();
  }, [user, otherUserId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    const chatId = user.uid < otherUserId ? `${user.uid}_${otherUserId}` : `${otherUserId}_${user.uid}`;
    const textToSend = newMessage.trim();
    setNewMessage('');

    try {
      // 1. Send the message to the subcollection
      await addDoc(collection(db, 'direct_messages', chatId, 'messages'), {
        senderId: user.uid,
        text: textToSend,
        createdAt: serverTimestamp()
      });
      
      // 2. Update the parent document metadata so the Inbox can query it
      const parentDocRef = doc(db, 'direct_messages', chatId);
      await setDoc(parentDocRef, {
        participants: [user.uid, otherUserId],
        lastMessage: textToSend,
        lastUpdatedAt: serverTimestamp(),
        // We save basic identifiers so the Inbox doesn't have to fetch each user again immediately
        [`participant_${user.uid}_name`]: userProfile?.name || userProfile?.displayName || 'Usuario',
        [`participant_${otherUserId}_name`]: otherUser?.name || 'Usuario',
        [`participant_${user.uid}_photo`]: userProfile?.photoURL || '',
        [`participant_${otherUserId}_photo`]: otherUser?.photoURL || ''
      }, { merge: true });

    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  if (loading || isLoadingChat) return <LoadingAnimation />;

  return (
    <PinLock>
      <div className="flex flex-col h-[100dvh] bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 flex items-center px-4 py-3 shadow-sm z-10 sticky top-0" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}>
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="mr-2 text-slate-500 hover:bg-slate-100 rounded-full">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-3">
          <Avatar className="w-10 h-10 border border-slate-100 shadow-sm">
            <AvatarImage src={otherUser?.photoURL || ""} className="object-cover" />
            <AvatarFallback className="bg-slate-100 text-slate-400">
              <UserIcon className="w-5 h-5" />
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="font-bold text-slate-800 leading-tight truncate max-w-[200px]">
              {otherUser?.name || 'Cargando...'}
            </h2>
            <p className="text-[11px] text-emerald-500 font-semibold tracking-wide">
              {otherUser?.role === 'psychologist' ? 'Especialista' : 'Paciente'}
            </p>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-70">
            <div className="w-16 h-16 bg-[#4EF2C8]/20 rounded-full flex items-center justify-center mb-3">
              <UserIcon className="w-8 h-8 text-[#25b591]" />
            </div>
            <p className="text-slate-500 font-medium">Este es el inicio de tu conversación segura.</p>
            <p className="text-xs text-slate-400 mt-1 max-w-[250px] mx-auto">
              Los mensajes enviados aquí son privados y encriptados en tránsito.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === user?.uid;
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div 
                  className={`max-w-[75%] rounded-2xl p-3 shadow-sm text-[15px] leading-relaxed break-words ${
                    isMe 
                      ? 'bg-[#1e3a5f] text-white rounded-tr-none' 
                      : 'bg-white text-slate-700 rounded-tl-none border border-slate-100'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 bg-white border-t border-slate-100 relative z-20 pb-safe">
        <form onSubmit={handleSendMessage} className="flex gap-2 max-w-3xl mx-auto items-center">
          <Input 
            type="text" 
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Escribe tu mensaje..."
            className="flex-1 border-slate-200 rounded-full px-5 h-12 focus-visible:ring-[#4EF2C8] bg-slate-50 shadow-inner"
          />
          <Button 
            type="submit" 
            disabled={!newMessage.trim()} 
            className="rounded-full w-12 h-12 p-0 flex-shrink-0 bg-[#4EF2C8] hover:bg-[#3ce5bb] text-[#112240] shadow-sm transition-transform active:scale-95 disabled:opacity-50"
          >
            <Send className="w-5 h-5 ml-1" />
          </Button>
        </form>
      </div>
    </div>
    </PinLock>
  );
}
