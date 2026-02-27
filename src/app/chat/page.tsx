'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { useSpeech } from '@/hooks/use-speech';
import { Mic, Keyboard, ShieldCheck, Send, SmilePlus, User } from 'lucide-react';
// AI flows are now called via API routes to prevent browser API Key errors
// import { zhiChat } from '@/ai/flows/zhi-chat-flow'; // DELETED

import { auth, db } from '@/lib/firebase';
import { doc, getDoc, collection, addDoc, Timestamp, query, orderBy, limit, getDocs, updateDoc } from 'firebase/firestore';
import { BottomNavBar } from '@/components/bottom-nav-bar';
import { cn, getApiBaseUrl } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

type ChatMode = 'home' | 'text' | 'voice';

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><p className="text-slate-400">Cargando...</p></div>}>
      <ChatPageContent />
    </Suspense>
  );
}

function ChatPageContent() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<ChatMode>('home');
  const [userProfileData, setUserProfileData] = useState<any>(null);
  const [longTermHistory, setLongTermHistory] = useState<string>('');
  const [continueMessages, setContinueMessages] = useState<{role:'user'|'zhi', text:string}[] | null>(null);
  const { speak } = useSpeech();

  // Fetch complete user profile & past chat history from Firestore for AI Context
  useEffect(() => {
    if (user?.uid) {
      getDoc(doc(db, 'users', user.uid)).then((document) => {
        if (document.exists()) {
          const sanitizedData = JSON.parse(JSON.stringify(document.data()));
          setUserProfileData(sanitizedData);
        }
      }).catch((err) => {
        if (err.code !== 'permission-denied') {
          console.error("Profile fetch error:", err);
        }
      });

      const q = query(collection(db, 'users', user.uid, 'chatHistory'), orderBy('date', 'desc'), limit(10));
      getDocs(q).then((snapshot: any) => {
         const pastChats = snapshot.docs.map((doc: any) => {
            const data = doc.data();
            const msgs = data.messages || [];
            return msgs.map((m: any) => `${m.role === 'user' ? 'Usuario' : 'Zhi'}: ${m.text}`).join('\n');
         }).reverse().join('\n---\n');
         setLongTermHistory(pastChats);
      }).catch((err) => {
        if (err.code !== 'permission-denied') {
          console.error("History fetch error:", err);
        }
      });
    }
  }, [user]);

  // Handle continueId from URL — load previous conversation
  const [continueLoading, setContinueLoading] = useState(false);
  useEffect(() => {
    const continueId = searchParams?.get('continueId');
    const urlMode = searchParams?.get('mode');
    if (!continueId) return;
    if (!user?.uid) return;

    setContinueLoading(true);
    getDoc(doc(db, 'users', user.uid, 'chatHistory', continueId)).then((snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const msgs: {role:'user'|'zhi', text:string}[] = (data.messages || []).map((m: any) => ({
          role: (m.role || m.sender) === 'user' ? 'user' : 'zhi',
          text: m.text || ''
        }));
        if (msgs.length > 0) setContinueMessages(msgs);
      }
    }).catch(console.error).finally(() => {
      setContinueLoading(false);
      if (urlMode === 'text') setMode('text');
    });
  }, [user, searchParams]);

  const zhiGenderPreference = userProfileData?.emotionalIdentity?.zhiGender || 'female';
  const welcomeAudioPath = zhiGenderPreference === 'male'
    ? "/ElevenLabs_2026-02-21T14_40_54_Zhi Hombre_gen_sp109_s66_sb75_v3.mp3"
    : "/ElevenLabs_2026-02-21T13_35_44_Zhi Mujer_gen_sp109_s66_sb75_v3.mp3";

  useEffect(() => {
    if (mode === 'home' && user?.displayName) {
      setTimeout(() => {
        const hasHeardPrivacy = sessionStorage.getItem('zhi_privacy_heard');
        if (!hasHeardPrivacy && user?.displayName) { // added check to satisfy TS
          const audio = new Audio(welcomeAudioPath);
          audio.play().catch(console.error);
          sessionStorage.setItem('zhi_privacy_heard', 'true');
        }
      }, 800);
    }
  }, [mode, user?.displayName, welcomeAudioPath]);

  if (mode === 'text') {
    return <TextChatMode onBack={() => setMode('home')} user={user} userProfileData={userProfileData} longTermHistory={longTermHistory} initialMessages={continueMessages ?? undefined} />;
  }

  if (mode === 'voice') {
    return <VoiceChatMode onBack={() => setMode('home')} user={user} userProfileData={userProfileData} longTermHistory={longTermHistory} />;
  }

  // SUB-HOME SCREEN
  return (
    <div className="flex flex-col items-center justify-between min-h-screen bg-slate-50 relative overflow-hidden pb-20 pt-10 px-6">
      <div className="absolute top-0 w-full opacity-100 pointer-events-none z-0" style={{ height: '35vh' }}>
        <Image src="/fondo_chat.jpg" alt="Zhi Background" fill className="object-cover object-top" priority />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-50/50 to-slate-50" />
      </div>
      
      <div className="z-10 flex flex-col items-center mt-24 w-full max-w-md">
        <h1 className="text-3xl font-bold text-slate-800 mb-2 mt-8">
          Hola, {user?.displayName?.split(' ')[0] || 'amigo'}
        </h1>
        <p className="text-slate-500 font-medium mb-12">¿Cómo prefieres interactuar hoy?</p>

        <div className="grid grid-cols-2 gap-4 w-full mb-12">
          <Button 
            onClick={() => setMode('voice')}
            className="h-32 flex flex-col items-center justify-center gap-4 bg-white hover:bg-slate-100 text-slate-800 border shadow-sm rounded-2xl"
            variant="outline"
          >
            <div className="w-12 h-12 rounded-full bg-[#4EF2C8]/20 flex items-center justify-center text-[#25b591]">
                <Mic className="w-6 h-6" />
            </div>
            <span className="font-semibold">Modo Voz</span>
          </Button>

          <Button 
            onClick={() => setMode('text')}
            className="h-32 flex flex-col items-center justify-center gap-4 bg-white hover:bg-slate-100 text-slate-800 border shadow-sm rounded-2xl"
            variant="outline"
          >
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
                <Keyboard className="w-6 h-6" />
            </div>
            <span className="font-semibold">Modo Texto</span>
          </Button>
        </div>

        <div className="bg-white/60 backdrop-blur-sm border rounded-xl p-5 text-center shadow-sm">
            <ShieldCheck className="w-6 h-6 mx-auto mb-2 text-slate-400" />
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              Lo que compartes aquí es tuyo y se mantiene en privado.<br /><br />
              Estoy para acompañarte emocionalmente, pero no reemplazo a un profesional. Si estás pasando por un momento muy difícil, busca ayuda especializada; no tienes que enfrentarlo solo.
            </p>
        </div>
      </div>
      <BottomNavBar forceShow={true} />
    </div>
  );
}

// ---------------------------------------------------------
// TEXT CHAT MODE
// ---------------------------------------------------------
function TextChatMode({ onBack, user, userProfileData, longTermHistory, initialMessages }: { onBack: () => void, user: any, userProfileData?: any, longTermHistory?: string, initialMessages?: {role:'user'|'zhi', text:string}[] }) {
  const defaultWelcome = { role: 'zhi' as const, text: "Hola... estoy aquí contigo. Toma un respiro profundo... Lo que compartes aquí es tuyo y se mantiene en privado. Si necesitas desahogarte... te escucho, sin juzgar." };
  const [messages, setMessages] = useState<{role: 'user'|'zhi', text: string}[]>(
    initialMessages && initialMessages.length > 0 ? initialMessages : [defaultWelcome]
  );

  // Sync if initialMessages arrives after mount (shouldn't happen now, but safety net)
  useEffect(() => {
    if (initialMessages && initialMessages.length > 0) {
      setMessages(initialMessages);
    }
  }, [initialMessages]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showEmojis, setShowEmojis] = useState(false);
  const [isShared, setIsShared] = useState(false);

  const messagesRef = useRef(messages);
  const hasSavedRef = useRef(false);

  useEffect(() => {
    messagesRef.current = messages;
    if (messages.length > 1) {
      hasSavedRef.current = false;
    }
  }, [messages]);

  useEffect(() => {
    return () => {
      const currentMessages = messagesRef.current;
      if (currentMessages.length > 1 && !hasSavedRef.current && user) {
        hasSavedRef.current = true;
        const save = async () => {
          // Extra verification of auth state before save
          if (!auth.currentUser || auth.currentUser.uid !== user.uid) return;
          
          try {
            const titleFetch = await fetch(`${getApiBaseUrl()}/api/generate-title`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ messages: currentMessages })
            });
            const titleRes = titleFetch.ok ? await titleFetch.json() : null;
            const title = titleRes?.title || 'Conversación con Zhi';
            await addDoc(collection(db, 'users', user.uid, 'chatHistory'), {
              title,
              messages: currentMessages,
              date: Timestamp.now(),
              sharedWithTherapist: isShared
            });

            // Extract core insights from this conversation
            const insightsRes = await fetch(`${getApiBaseUrl()}/api/extract-insights`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                messages: currentMessages,
                existingInsights: userProfileData?.coreInsights || []
              })
            });
            if (insightsRes.ok) {
              const { updatedInsights } = await insightsRes.json();
              await updateDoc(doc(db, 'users', user.uid), {
                coreInsights: updatedInsights
              });
            }
          } catch (err: any) {
            if (err.code === 'permission-denied') return;
             // Fallback save with generic title if title gen fails
             await addDoc(collection(db, 'users', user.uid, 'chatHistory'), {
              title: 'Conversación con Zhi',
              messages: currentMessages,
              date: Timestamp.now(),
              sharedWithTherapist: isShared
            });
          }
        };
        save();
      }
    };
  }, [user]);

  const handleBack = async () => {
    if (messages.length > 1 && !hasSavedRef.current && !isSaving) {
      setIsSaving(true);
      hasSavedRef.current = true;
      try {
        const titleFetch = await fetch(`${getApiBaseUrl()}/api/generate-title`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages })
        });
        const titleRes = titleFetch.ok ? await titleFetch.json() : null;
        const title = titleRes?.title || 'Conversación con Zhi';
        await addDoc(collection(db, 'users', user.uid, 'chatHistory'), {
          title,
          messages,
          date: Timestamp.now(),
          sharedWithTherapist: isShared
        });

        // Extract and update core insights
        const insightsRes = await fetch(`${getApiBaseUrl()}/api/extract-insights`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages,
            existingInsights: userProfileData?.coreInsights || []
          })
        });
        if (insightsRes.ok) {
          const { updatedInsights } = await insightsRes.json();
          await updateDoc(doc(db, 'users', user.uid), {
            coreInsights: updatedInsights
          });
        }
      } catch (err) {
        console.error("Error al guardar el historial:", err);
      } finally {
        setIsSaving(false);
        onBack();
      }
    } else {
      onBack();
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const userMessage = input.trim();
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setInput('');
    setIsLoading(true);

    const historyText = messages.map(m => `${m.role === 'user' ? 'Usuario' : 'Zhi'}: ${m.text}`).join('\n');
    const fullHistory = longTermHistory ? `--- CONVERSACIONES PASADAS ---\n${longTermHistory}\n--- CONVERSACIÓN ACTUAL ---\n${historyText}` : historyText;

    try {
      const rawPayload = {
        userInput: userMessage,
        userProfile: userProfileData ? { name: user?.displayName || '', ...userProfileData } : { name: user?.displayName || '' },
        chatHistorySummary: fullHistory,
        coreInsights: userProfileData?.coreInsights || []
      };
      
      const res = await fetch(`${getApiBaseUrl()}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rawPayload)
      });
      
      if (!res.ok) throw new Error("API Route Failed");
      
      const response = await res.json();
      const zhiText = response?.zhiHeartResponse || "Lo siento, tuve un problema de conexión. ¿Podemos intentarlo de nuevo?";
      setMessages(prev => [...prev, { role: 'zhi', text: zhiText }]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'zhi', text: "Lo siento, tuve un problema de conexión. ¿Podemos intentarlo de nuevo?" }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-slate-50">
      <div className="p-4 border-b flex items-center justify-between bg-white shadow-sm z-10 sticky top-0">
        <Button variant="ghost" size="sm" onClick={handleBack} disabled={isSaving} className="text-slate-500 w-[80px] justify-start pl-0">
            {isSaving ? '...' : '← Volver'}
        </Button>
        <div className="text-center font-bold text-slate-800 truncate">Chat con Zhi</div>
        <div className="flex flex-col items-center justify-center w-[80px]">
          <Switch 
            checked={isShared} 
            onCheckedChange={setIsShared} 
            className="data-[state=checked]:bg-[#4EF2C8] scale-75 m-0"
          />
          <span className="text-[8px] text-slate-400 font-medium text-center leading-tight mt-0.5">
            Compartir<br/>Terapeuta
          </span>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'zhi' && (
              <Avatar className="w-8 h-8 mr-2 mt-1 shrink-0 border border-slate-100 shadow-sm bg-white p-1">
                 <AvatarImage src="/icon_zhi.png" className="object-contain" />
              </Avatar>
            )}
            <div className={`max-w-[75%] rounded-2xl p-3 shadow-sm text-[16px] leading-relaxed whitespace-pre-line ${msg.role === 'user' ? 'bg-[#4EF2C8] text-slate-900 rounded-tr-none' : 'bg-white text-slate-700 rounded-tl-none border border-slate-100 font-display'}`}>
              {msg.text}
            </div>
            {msg.role === 'user' && (
              <Avatar className="w-8 h-8 ml-2 mt-1 shrink-0 border border-slate-100 shadow-sm">
                 <AvatarImage src={user?.photoURL || ""} />
                 <AvatarFallback><User className="w-4 h-4 text-slate-400" /></AvatarFallback>
              </Avatar>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-2xl p-4 bg-white text-slate-400 rounded-tl-none border animate-pulse flex space-x-2">
              <div className="w-2 h-2 bg-slate-300 rounded-full"></div>
              <div className="w-2 h-2 bg-slate-300 rounded-full animation-delay-200"></div>
              <div className="w-2 h-2 bg-slate-300 rounded-full animation-delay-400"></div>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 bg-white border-t border-slate-100 shadow-lg pb-6">
        {showEmojis && (
          <div className="w-full max-w-3xl mx-auto flex gap-3 mb-3 px-2 overflow-x-auto no-scrollbar py-1 animate-in fade-in slide-in-from-bottom-2 duration-200">
            {[
              { emoji: '😄', label: 'Feliz' },
              { emoji: '😐', label: 'Normal' },
              { emoji: '😔', label: 'Triste' },
              { emoji: '😰', label: 'Ansioso' },
              { emoji: '😡', label: 'Enojado' },
              { emoji: '😟', label: 'Preocupado' }
            ].map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => { setInput(prev => prev + item.emoji); setShowEmojis(false); }}
                className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-xl transition-colors border border-slate-200"
                title={item.label}
              >
                {item.emoji}
              </button>
            ))}
          </div>
        )}
        <div className="flex gap-2 w-full max-w-3xl mx-auto items-center relative">
          <button 
            type="button"
            onClick={() => setShowEmojis(prev => !prev)}
            className={cn("absolute left-1.5 top-1.5 rounded-full w-9 h-9 flex items-center justify-center transition-colors z-10", showEmojis ? "bg-slate-200 text-slate-800" : "text-slate-400 hover:bg-slate-100 hover:text-slate-600")}
            title="Añadir emoción"
          >
            <SmilePlus className="w-5 h-5" />
          </button>
          
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Escribe tu mensaje..."
            className="flex-1 border border-slate-200 shadow-inner rounded-full px-5 py-3 pl-12 focus:outline-none focus:ring-2 focus:ring-[#4EF2C8]/50 focus:border-[#4EF2C8] bg-slate-50 text-slate-800 pr-14"
          />
          <Button 
            onClick={handleSend} 
            disabled={isLoading || !input.trim()} 
            className="absolute right-1 top-1 rounded-full w-10 h-10 p-0 flex-shrink-0 bg-slate-800 hover:bg-slate-700 shadow-md transition-transform active:scale-95 z-10"
          >
            <Send className="w-4 h-4 text-white" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------
// VOICE CHAT MODE
// ---------------------------------------------------------
function VoiceChatMode({ onBack, user, userProfileData, longTermHistory }: { onBack: () => void, user: any, userProfileData?: any, longTermHistory?: string }) {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [zhiResponse, setZhiResponse] = useState('');
  const [messages, setMessages] = useState<{role: 'user'|'zhi', text: string}[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const { speak } = useSpeech();
  const [recognitionInstance, setRecognitionInstance] = useState<any>(null);

  const messagesRef = useRef(messages);
  const hasSavedRef = useRef(false);

  useEffect(() => {
    messagesRef.current = messages;
    if (messages.length > 1) hasSavedRef.current = false;
  }, [messages]);

  useEffect(() => {
    // Stop speaking if leaving
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
         window.speechSynthesis.cancel();
      }
      if (recognitionInstance) {
          recognitionInstance.stop();
      }

      const currentMessages = messagesRef.current;
      if (currentMessages.length > 1 && !hasSavedRef.current && user) {
        hasSavedRef.current = true;
        const save = async () => {
          try {
            const titleFetch = await fetch(`${getApiBaseUrl()}/api/generate-title`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ messages: currentMessages })
            });
            const titleRes = titleFetch.ok ? await titleFetch.json() : null;
            const title = titleRes?.title || 'Conversación de Voz';
            await addDoc(collection(db, 'users', user.uid, 'chatHistory'), {
              title,
              messages: currentMessages,
              date: Timestamp.now(),
              sharedWithTherapist: false
            });
          } catch (err) {
             await addDoc(collection(db, 'users', user.uid, 'chatHistory'), {
              title: 'Conversación de Voz',
              messages: currentMessages,
              date: Timestamp.now(),
              sharedWithTherapist: false
            });
          }
        };
        save();
      }
    };
  }, [recognitionInstance, user]);

  const toggleListen = () => {
    if (isListening && recognitionInstance) {
      recognitionInstance.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Tu navegador no soporta reconocimiento de voz. Usa Google Chrome o Edge.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'es-ES';
    recognition.interimResults = false;
    recognition.continuous = false; 
    
    setRecognitionInstance(recognition);

    recognition.onstart = () => {
      setIsListening(true);
      setTranscript('');
      setZhiResponse('');
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
          window.speechSynthesis.cancel(); // Stop Zhi if she was talking
      }
    };

    recognition.onresult = async (event: any) => {
      const text = event.results[0][0].transcript;
      setTranscript(text);
      setIsListening(false);
      processVoiceInput(text);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    try {
      recognition.start();
    } catch(e) { }
  };

  const processVoiceInput = async (text: string) => {
    setIsProcessing(true);
    const userMsg = { role: 'user', text };
    setMessages(prev => [...prev, userMsg as any]);
    try {
      const historyText = messages.map(m => `${m.role === 'user' ? 'Usuario' : 'Zhi'}: ${m.text}`).join('\n');
      const fullHistory = longTermHistory ? `--- CONVERSACIONES PASADAS ---\n${longTermHistory}\n--- CONVERSACIÓN ACTUAL ---\n${historyText}` : historyText;
      
      const rawPayload = {
        userInput: text,
        userProfile: userProfileData ? { name: user?.displayName || '', ...userProfileData } : { name: user?.displayName || '' },
        chatHistorySummary: fullHistory,
        coreInsights: userProfileData?.coreInsights || []
      };
      
      const res = await fetch(`${getApiBaseUrl()}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rawPayload)
      });
      
      if (!res.ok) throw new Error("API Route Failed");
      
      const response = await res.json();
      const zhiText = response?.zhiHeartResponse || "Lo siento, tuve un problema para procesar tu voz. ¿Podemos intentarlo de nuevo?";
      setZhiResponse(zhiText);
      setMessages(prev => [...prev, { role: 'zhi', text: zhiText } as any]);
      speak(zhiText);
    } catch (error) {
      console.error(error);
      const fallbackMsg = "Lo siento, tuve un problema para procesar tu voz. ¿Podemos intentarlo de nuevo?";
      setZhiResponse(fallbackMsg);
      setMessages(prev => [...prev, { role: 'zhi', text: fallbackMsg } as any]);
      speak(fallbackMsg);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBack = async () => {
    if (messages.length > 0 && !hasSavedRef.current && !isSaving) {
      setIsSaving(true);
      hasSavedRef.current = true;
      try {
        const titleFetch = await fetch(`${getApiBaseUrl()}/api/generate-title`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages })
        });
        const titleRes = titleFetch.ok ? await titleFetch.json() : null;
        const title = titleRes?.title || 'Conversación de Voz';
        await addDoc(collection(db, 'users', user.uid, 'chatHistory'), {
          title,
          messages,
          date: Timestamp.now(),
          sharedWithTherapist: false
        });

        // Extract and update core insights
        const insightsRes = await fetch(`${getApiBaseUrl()}/api/extract-insights`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages,
            existingInsights: userProfileData?.coreInsights || []
          })
        });
        if (insightsRes.ok) {
          const { updatedInsights } = await insightsRes.json();
          await updateDoc(doc(db, 'users', user.uid), {
            coreInsights: updatedInsights
          });
        }
      } catch (err) {
        console.error("Error al guardar el historial:", err);
      } finally {
        setIsSaving(false);
        onBack();
      }
    } else {
      onBack();
    }
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-slate-900 text-white relative overflow-hidden">
        <div className="absolute top-4 left-4 z-50">
            <Button variant="ghost" onClick={handleBack} disabled={isSaving} size="sm" className="bg-white/10 hover:bg-white/20 backdrop-blur text-white rounded-full shadow-sm">
                {isSaving ? 'Guardando...' : '← Terminar charla'}
            </Button>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center relative px-6 text-center">
            
            <div className="mb-12 h-32 overflow-y-auto w-full max-w-md flex flex-col justify-end items-center">
               {transcript && <p className="text-slate-400 italic text-sm mb-4">"{transcript}"</p>}
               {zhiResponse && <p className="text-white font-medium text-lg leading-relaxed whitespace-pre-line">{zhiResponse}</p>}
               {!transcript && !zhiResponse && <p className="text-slate-500 font-medium opacity-50">Zhi está lista para escucharte.</p>}
            </div>

            <button 
              onClick={toggleListen}
              disabled={isProcessing}
              className={`relative w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300 ${isListening ? 'bg-[#4EF2C8]/30 scale-110' : 'bg-slate-800 hover:bg-slate-700'} ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''} shadow-2xl`}
            >
               {isListening && (
                 <div className="absolute inset-0 rounded-full bg-[#4EF2C8] animate-ping opacity-20"></div>
               )}
                <div className="w-24 h-24 rounded-full bg-white shadow-lg overflow-hidden relative flex items-center justify-center border-4 border-[#4EF2C8]/10">
                    <Image src="/icon_zhi.png" alt="Zhi Listening" fill className="p-3 object-contain" />
                </div>
            </button>
            
            <div className="mt-12 h-6 flex items-center justify-center">
                <p className={`text-slate-400 font-medium transition-opacity ${isListening ? 'animate-pulse text-[#4EF2C8]' : ''}`}>
                {isListening ? 'Escuchando... Di algo.' : isProcessing ? 'Zhi está pensando...' : 'Toca el centro para hablar'}
                </p>
            </div>
        </div>
    </div>
  );
}
