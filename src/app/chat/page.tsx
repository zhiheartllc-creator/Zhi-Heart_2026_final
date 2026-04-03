'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { useSpeech } from '@/hooks/use-speech';
import { Mic, Keyboard, ShieldCheck, Send, SmilePlus, User, Lock, Volume2, Loader2 } from 'lucide-react';
// En PWA: las llamadas IA van al servidor via /api/chat
// En Android (nativo): las llamadas van directo a Gemini via zhiChatClient
import { zhiChatClient, generateTitleClient, extractInsightsClient } from '@/lib/zhi-chat-client';
import { Capacitor } from '@capacitor/core';

import { auth, db } from '@/lib/firebase';
import { doc, getDoc, collection, addDoc, Timestamp, query, orderBy, limit, getDocs, updateDoc, onSnapshot } from 'firebase/firestore';
import { BottomNavBar } from '@/components/bottom-nav-bar';
import { cn, getApiBaseUrl } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

type ChatMode = 'home' | 'text' | 'voice';

const speakTextWithTTS = async (text: string, voiceIdOverride?: string) => {
  try {
    const baseUrl = getApiBaseUrl();
    console.log(`[TTS] Requesting audio for: "${text.substring(0, 30)}..." at ${baseUrl}/api/tts`);
    const res = await fetch(`${baseUrl}/api/tts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, voiceIdOverride }),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || "No audio");
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    await audio.play();
  } catch (err: any) {
    // We use console.log instead of console.error to avoid triggering Next.js 15 Error Overlay in dev
    console.log("[TTS] Play error:", err.message);
    alert(
      "Error al generar/reproducir la voz: " + err.message
    );
  }
};

/**
 * Returns a robust YYYY-MM-DD string in the user's local time,
 * independent of the browser's locale-specific toLocaleDateString implementation.
 */
const getTodayDateString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const FREE_tier_LIMIT = 3;

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

  const hasFetchedHistory = useRef(false);

  // Fetch complete user profile & past chat history from Firestore for AI Context
  useEffect(() => {
    if (!user?.uid) return;

    const unsubscribe = onSnapshot(doc(db, 'users', user.uid), (document) => {
      if (document.exists()) {
        const sanitizedData = JSON.parse(JSON.stringify(document.data()));
        setUserProfileData(sanitizedData);
        
        const isPremium = sanitizedData.premiumStatus === 'active' || sanitizedData.isPremium || false;
        
        if (!hasFetchedHistory.current) {
          hasFetchedHistory.current = true;
          const q = query(collection(db, 'users', user.uid, 'chatHistory'), orderBy('date', 'desc'), limit(isPremium ? 50 : 10));
          getDocs(q).then((snapshot: any) => {
             let docs = snapshot.docs;
             if (!isPremium) {
                 const threeDaysAgo = new Date();
                 threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
                 docs = docs.filter((d: any) => {
                     const t = d.data().date;
                     const date = t?.toDate ? t.toDate() : new Date(t || 0);
                     return date >= threeDaysAgo;
                 });
             }
             const pastChats = docs.map((doc: any) => {
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
      }
    }, (err) => {
      console.error("[DEBUG-CHAT] Error fetching profile:", err);
    });

    return () => unsubscribe();
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
    return <TextChatMode onBack={() => setMode('home')} user={user} userProfileData={userProfileData} longTermHistory={longTermHistory} initialMessages={continueMessages ?? undefined} searchParams={searchParams} />;
  }

  if (mode === 'voice') {
    return <VoiceChatMode onBack={() => setMode('home')} user={user} userProfileData={userProfileData} longTermHistory={longTermHistory} />;
  }

  // SUB-HOME SCREEN
  return (
    <div className="flex flex-col items-center justify-between min-h-screen bg-slate-50 relative overflow-hidden pb-20 px-6"
         style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 40px)' }}>
      <div className="absolute top-0 w-full opacity-100 pointer-events-none z-0" style={{ height: '35vh' }}>
        <Image src="/fondo_chat.jpg" alt="Zhi Background" fill sizes="100vw" className="object-cover object-top" priority />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-50/50 to-slate-50" />
      </div>
      
      <div className="z-10 flex flex-col items-center mt-24 w-full max-w-md">
        <h1 className="text-3xl font-bold text-slate-800 mb-2 mt-8">
          Hola, {user?.displayName?.split(' ')[0] || 'amigo'}
        </h1>
        <p className="text-slate-500 font-medium mb-12">¿Cómo prefieres interactuar hoy?</p>

        <div className="grid grid-cols-2 gap-4 w-full mb-12">
          <Button 
            disabled
            className="h-32 flex flex-col items-center justify-center gap-2 bg-slate-50/50 text-slate-400 border border-slate-200 shadow-none rounded-2xl cursor-not-allowed opacity-80"
            variant="outline"
          >
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-300">
                <Mic className="w-6 h-6" />
            </div>
            <span className="font-semibold text-slate-400">Modo Voz</span>
            <span className="text-[9px] font-bold tracking-tight uppercase text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200/50">Próximamente disponible</span>
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
function TextChatMode({ onBack, user, userProfileData, longTermHistory, initialMessages, searchParams }: { onBack: () => void, user: any, userProfileData?: any, longTermHistory?: string, initialMessages?: {role:'user'|'zhi', text:string}[], searchParams: any }) {
  const router = useRouter();
  const defaultWelcome = { role: 'zhi' as const, text: "Hola... estoy aquí contigo. Toma un respiro profundo... Lo que compartes aquí es tuyo y se mantiene en privado. Si necesitas desahogarte... te escucho, sin juzgar." };
  const [messages, setMessages] = useState<{role: 'user'|'zhi', text: string, isPremiumUpsell?: boolean}[]>(
    initialMessages && initialMessages.length > 0 ? initialMessages : [defaultWelcome]
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll cuando llegan nuevos mensajes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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

  // Use a state to track the ID of the current conversation to update it incrementally
  const [activeChatId, setActiveChatId] = useState<string | null>(
    searchParams?.get('continueId') || null
  );

  const isSharedRef = useRef(isShared);
  const titleGeneratedRef = useRef(false);
  const messagesRef = useRef(messages);
  const activeChatIdRef = useRef(activeChatId);
  const userRef = useRef(user);
  const userProfileDataRef = useRef(userProfileData);

  useEffect(() => { isSharedRef.current = isShared; }, [isShared]);
  useEffect(() => { messagesRef.current = messages; }, [messages]);
  useEffect(() => { activeChatIdRef.current = activeChatId; }, [activeChatId]);
  useEffect(() => { userRef.current = user; }, [user]);
  useEffect(() => { userProfileDataRef.current = userProfileData; }, [userProfileData]);

  // Update share status directly in DB if we already have an active chat
  useEffect(() => {
    if (activeChatId && user?.uid) {
      updateDoc(doc(db, 'users', user.uid, 'chatHistory', activeChatId), {
        sharedWithTherapist: isShared
      }).catch(console.error);
    }
  }, [isShared, activeChatId, user?.uid]);

  // Helper: generate title eagerly (only once per conversation)
  const generateAndSaveTitle = async (msgs: {role: string, text: string}[], chatId: string, uid: string) => {
    if (titleGeneratedRef.current) return;
    titleGeneratedRef.current = true;
    try {
      let finalTitle = 'Conversación con Zhi';
      if (Capacitor.isNativePlatform()) {
        finalTitle = await generateTitleClient(msgs);
      } else {
        const titleFetch = await fetch(`${getApiBaseUrl()}/api/generate-title`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: msgs })
        });
        if (titleFetch.ok) {
          const titleRes = await titleFetch.json();
          if (titleRes?.title) finalTitle = titleRes.title;
        }
      }
      await updateDoc(doc(db, 'users', uid, 'chatHistory', chatId), { title: finalTitle });
      console.log('[CHAT] Title generated:', finalTitle);
    } catch (err) {
      console.warn('[CHAT] Error generating title (non-blocking):', err);
      titleGeneratedRef.current = false; // allow retry
    }
  };

  // Helper: extract and save insights
  const extractAndSaveInsights = async (msgs: {role: string, text: string}[], uid: string, profileData: any) => {
    try {
      if (Capacitor.isNativePlatform()) {
        const updatedInsights = await extractInsightsClient(msgs, profileData?.coreInsights || []);
        await updateDoc(doc(db, 'users', uid), { coreInsights: updatedInsights });
      } else {
        const insightsRes = await fetch(`${getApiBaseUrl()}/api/extract-insights`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: msgs,
            existingInsights: profileData?.coreInsights || []
          })
        });
        if (insightsRes.ok) {
          const { updatedInsights } = await insightsRes.json();
          await updateDoc(doc(db, 'users', uid), { coreInsights: updatedInsights });
        }
      }
    } catch (err) {
      console.warn('[CHAT] Error extracting insights (non-blocking):', err);
    }
  };

  // Cleanup: when component unmounts (e.g. user navigates via bottom nav),
  // generate title and extract insights if not done yet
  useEffect(() => {
    return () => {
      const msgs = messagesRef.current;
      const chatId = activeChatIdRef.current;
      const uid = userRef.current?.uid;
      const profile = userProfileDataRef.current;
      if (msgs.length > 1 && chatId && uid) {
        generateAndSaveTitle(msgs, chatId, uid);
        extractAndSaveInsights(msgs, uid, profile);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Function to save/update the conversation in Firestore
  const saveConversationProgress = async (currentMessages: {role: 'user'|'zhi', text: string, isPremiumUpsell?: boolean}[]) => {
    if (!user?.uid) return null;
    
    try {
      if (activeChatId) {
        // Update existing conversation
        await updateDoc(doc(db, 'users', user.uid, 'chatHistory', activeChatId), {
          messages: currentMessages,
          date: Timestamp.now()
        });
        return activeChatId;
      } else {
        // Create new conversation
        const docRef = await addDoc(collection(db, 'users', user.uid, 'chatHistory'), {
          title: 'Nueva Conversación...',
          messages: currentMessages,
          date: Timestamp.now(),
          sharedWithTherapist: isSharedRef.current
        });
        setActiveChatId(docRef.id);
        return docRef.id;
      }
    } catch (error) {
      console.error("Error saving conversation progress:", error);
      return activeChatId;
    }
  };

  const handleBack = async () => {
    if (messages.length > 1 && activeChatId && !isSaving) {
      setIsSaving(true);
      try {
        // Save latest messages
        await saveConversationProgress(messages);
        // Title + insights are generated by the cleanup effect on unmount,
        // but also eagerly after first AI response. If not done yet, trigger now.
        if (!titleGeneratedRef.current && user?.uid) {
          await generateAndSaveTitle(messages, activeChatId, user.uid);
        }
        if (user?.uid) {
          await extractAndSaveInsights(messages, user.uid, userProfileData);
        }
      } catch (err) {
        console.error("Error during finalize chat:", err);
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
    
    const todayString = getTodayDateString();
    const isPremium = userProfileDataRef.current?.premiumStatus === 'active' || userProfileDataRef.current?.isPremium;
    let sentToday = userProfileDataRef.current?.messagesSentToday || 0;
    const lastDate = userProfileDataRef.current?.lastMessageDate;
    
    // Reset if date changed
    if (lastDate !== todayString) {
        sentToday = 0;
    }

    if (!isPremium && sentToday >= FREE_tier_LIMIT) {
       console.log("[CHAT] Free limit reached:", sentToday);
       return;
    }
    
    const newMessages = [...messages, { role: 'user' as const, text: userMessage }];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    // Eagerly save the user's message so we don't lose it if they exit immediately
    await saveConversationProgress(newMessages);

    const historyText = messages.map(m => `${m.role === 'user' ? 'Usuario' : 'Zhi'}: ${m.text}`).join('\n');
    const fullHistory = longTermHistory ? `--- CONVERSACIONES PASADAS ---\n${longTermHistory}\n--- CONVERSACIÓN ACTUAL ---\n${historyText}` : historyText;

    try {
      const rawPayload = {
        userInput: userMessage,
        userProfile: userProfileDataRef.current ? { name: user?.displayName || '', ...userProfileDataRef.current } : { name: user?.displayName || '' },
        chatHistorySummary: fullHistory,
        coreInsights: userProfileDataRef.current?.coreInsights || []
      };

      let zhiText: string;

      if (Capacitor.isNativePlatform()) {
        // Android: llamar a Gemini directamente desde el cliente
        console.log('[CHAT-TEXT] Usando llamada directa a Gemini (nativo)');
        const result = await zhiChatClient(rawPayload);
        zhiText = result.zhiHeartResponse;
      } else {
        // PWA: usar la ruta del servidor
        const res = await fetch(`${getApiBaseUrl()}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(rawPayload)
        });
        if (!res.ok) throw new Error("API Route Failed");
        const response = await res.json();
        zhiText = response?.zhiHeartResponse || "Lo siento, tuve un problema de conexión. ¿Podemos intentarlo de nuevo?";
      }

      sentToday += 1;
      if (user?.uid) {
         updateDoc(doc(db, 'users', user.uid), {
             messagesSentToday: sentToday,
             lastMessageDate: todayString
         }).catch(console.error);
      }
      
      if (userProfileDataRef.current) {
          userProfileDataRef.current.messagesSentToday = sentToday;
          userProfileDataRef.current.lastMessageDate = todayString;
      }

      const finalMessages: {role: 'user'|'zhi', text: string, isPremiumUpsell?: boolean}[] = [...newMessages, { role: 'zhi' as const, text: zhiText }];
      
      if (!isPremium && sentToday >= FREE_tier_LIMIT) {
          finalMessages.push({ 
              role: 'zhi' as const, 
              text: "¿Quieres contarme qué pasó o qué te hizo sentir así?" 
          });
          finalMessages.push({ 
              role: 'zhi' as const, 
              text: "Puedes pausar aquí si lo necesitas.\n\nEste espacio sigue disponible para ti.\n\nSi deseas continuar ahora, puedes abrir acceso completo.", 
              isPremiumUpsell: true 
          });
      }

      setMessages(finalMessages);
      // Eagerly save AI's response
      const savedId = await saveConversationProgress(finalMessages);

      // Eagerly generate title after first meaningful exchange (user + AI)
      // This ensures the title exists even if the user navigates away without clicking back
      if (savedId && !titleGeneratedRef.current && user?.uid) {
        const userMsgCount = finalMessages.filter(m => m.role === 'user').length;
        if (userMsgCount >= 1) {
          generateAndSaveTitle(finalMessages, savedId, user.uid);
        }
      }

    } catch (error) {
      console.error('[CHAT-TEXT] Error:', error);
      const fallbackMessages: {role: 'user'|'zhi', text: string}[] = [...newMessages, { role: 'zhi' as const, text: "Lo siento, tuve un problema de conexión. ¿Podemos intentarlo de nuevo?" }];
      setMessages(fallbackMessages);
      await saveConversationProgress(fallbackMessages);
    } finally {
      setIsLoading(false);
    }
  };

  const isPremiumUser = userProfileData?.premiumStatus === 'active' || userProfileData?.isPremium;
  const sentToday = userProfileData?.lastMessageDate === getTodayDateString() ? (userProfileData?.messagesSentToday || 0) : 0;
  const reachedLimit = !isPremiumUser && sentToday >= FREE_tier_LIMIT;

  return (
    <div className="flex flex-col h-[100dvh] bg-slate-50">
      <div className="p-4 border-b flex items-center justify-between bg-white shadow-sm z-10 sticky top-0"
           style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 16px)' }}>
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
        {messages.map((msg, idx) => {
          if (msg.isPremiumUpsell && isPremiumUser) return null;
          return (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'zhi' && !msg.isPremiumUpsell && (
              <Avatar className="w-8 h-8 mr-2 mt-1 shrink-0 border border-slate-100 shadow-sm bg-white p-1">
                 <AvatarImage src="/icon_zhi.png" className="object-contain" />
              </Avatar>
            )}
            {msg.role === 'zhi' && msg.isPremiumUpsell && (
              <div className="w-8 mr-2 shrink-0"></div>
            )}
            
            {msg.isPremiumUpsell ? (
              <div className="max-w-[85%] rounded-3xl p-5 shadow-sm bg-slate-50 transition-all border border-slate-200 text-slate-800 mt-4 mb-2 w-full mx-auto relative overflow-hidden">
                <div className="flex items-center gap-2 mb-3 relative z-10">
                  <span className="font-semibold text-slate-700 text-[15px]">Zhi continúa contigo</span>
                </div>
                <p className="text-[15px] text-slate-600 leading-relaxed mb-6 whitespace-pre-line relative z-10">
                  {msg.text}
                </p>
                <div className="flex flex-col gap-3 relative z-10">
                  <Button onClick={() => router.push('/premium')} className="w-full bg-slate-800 hover:bg-slate-700 text-white font-medium h-11 rounded-xl">
                    Abrir acceso completo
                  </Button>
                  <Button variant="ghost" onClick={handleBack} className="w-full text-slate-500 hover:bg-slate-200/50 hover:text-slate-700 font-medium h-11 rounded-xl">
                    Volver más tarde
                  </Button>
                </div>
                <p className="text-[11px] text-slate-400 text-center mt-4 mb-1 relative z-10 tracking-wide">
                  No tienes que decidir ahora.
                </p>
              </div>
            ) : (
              <div className={`max-w-[75%] rounded-2xl p-3 shadow-sm text-[16px] leading-relaxed whitespace-pre-line ${msg.role === 'user' ? 'bg-[#4EF2C8] text-slate-900 rounded-tr-none' : 'bg-white text-slate-700 rounded-tl-none border border-slate-100 font-display'}`}>
                {msg.text}
                {msg.role === 'zhi' && isPremiumUser && !msg.isPremiumUpsell && (
                  <div className="mt-2 flex justify-end">
                    <button 
                      onClick={() => speakTextWithTTS(msg.text)}
                      className="flex items-center gap-1.5 text-xs text-[#25b591] font-medium hover:bg-[#4EF2C8]/10 px-2.5 py-1.5 rounded-full transition-colors active:scale-95"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      Escuchar
                    </button>
                  </div>
                )}
              </div>
            )}
            
            {msg.role === 'user' && (
              <Avatar className="w-8 h-8 ml-2 mt-1 shrink-0 border border-slate-100 shadow-sm">
                 <AvatarImage src={user?.photoURL || ""} />
                 <AvatarFallback><User className="w-4 h-4 text-slate-400" /></AvatarFallback>
              </Avatar>
            )}
          </div>
          );
        })}
         <div ref={messagesEndRef} />
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

      <div className="p-4 bg-white border-t border-slate-100 shadow-lg relative z-20">
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
            placeholder={reachedLimit ? "Límite gratuito alcanzado hoy" : "Escribe tu mensaje..."}
            disabled={isLoading || reachedLimit}
            className="flex-1 border border-slate-200 shadow-inner rounded-full px-5 py-3 pl-12 focus:outline-none focus:ring-2 focus:ring-[#4EF2C8]/50 focus:border-[#4EF2C8] bg-slate-50 text-slate-800 pr-14 disabled:opacity-50"
          />
          <Button 
            onClick={handleSend} 
            disabled={isLoading || !input.trim() || reachedLimit} 
            className="absolute right-1 top-1 rounded-full w-10 h-10 p-0 flex-shrink-0 bg-slate-800 hover:bg-slate-700 shadow-md transition-transform active:scale-95 z-10 disabled:opacity-50"
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
  const [recognitionInstance, setRecognitionInstance] = useState<any>(null);

  const [activeChatId, setActiveChatId] = useState<string | null>(null);

  const titleGeneratedRef = useRef(false);
  const messagesRef = useRef(messages);
  const activeChatIdRef = useRef(activeChatId);
  const userRef = useRef(user);
  const userProfileDataRef = useRef(userProfileData);

  useEffect(() => { messagesRef.current = messages; }, [messages]);
  useEffect(() => { activeChatIdRef.current = activeChatId; }, [activeChatId]);
  useEffect(() => { userRef.current = user; }, [user]);
  useEffect(() => { userProfileDataRef.current = userProfileData; }, [userProfileData]);

  // Helper: generate title eagerly (only once per conversation)
  const generateAndSaveTitleVoice = async (msgs: {role: string, text: string}[], chatId: string, uid: string) => {
    if (titleGeneratedRef.current) return;
    titleGeneratedRef.current = true;
    try {
      let finalTitle = 'Conversación de Voz';
      if (Capacitor.isNativePlatform()) {
        finalTitle = await generateTitleClient(msgs);
      } else {
        const titleFetch = await fetch(`${getApiBaseUrl()}/api/generate-title`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: msgs })
        });
        if (titleFetch.ok) {
          const titleRes = await titleFetch.json();
          if (titleRes?.title) finalTitle = titleRes.title;
        }
      }
      await updateDoc(doc(db, 'users', uid, 'chatHistory', chatId), { title: finalTitle });
      console.log('[CHAT-VOICE] Title generated:', finalTitle);
    } catch (err) {
      console.warn('[CHAT-VOICE] Error generating title (non-blocking):', err);
      titleGeneratedRef.current = false;
    }
  };

  const extractAndSaveInsightsVoice = async (msgs: {role: string, text: string}[], uid: string, profileData: any) => {
    try {
      if (Capacitor.isNativePlatform()) {
        const updatedInsights = await extractInsightsClient(msgs, profileData?.coreInsights || []);
        await updateDoc(doc(db, 'users', uid), { coreInsights: updatedInsights });
      } else {
        const insightsRes = await fetch(`${getApiBaseUrl()}/api/extract-insights`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: msgs,
            existingInsights: profileData?.coreInsights || []
          })
        });
        if (insightsRes.ok) {
          const { updatedInsights } = await insightsRes.json();
          await updateDoc(doc(db, 'users', uid), { coreInsights: updatedInsights });
        }
      }
    } catch (err) {
      console.warn('[CHAT-VOICE] Error extracting insights (non-blocking):', err);
    }
  };

  // Function to save/update the conversation in Firestore
  const saveConversationProgress = async (currentMessages: {role: 'user'|'zhi', text: string}[]) => {
    if (!user?.uid) return null;
    
    try {
      if (activeChatId) {
        await updateDoc(doc(db, 'users', user.uid, 'chatHistory', activeChatId), {
          messages: currentMessages,
          date: Timestamp.now()
        });
        return activeChatId;
      } else {
        const docRef = await addDoc(collection(db, 'users', user.uid, 'chatHistory'), {
          title: 'Conversación de Voz...',
          messages: currentMessages,
          date: Timestamp.now(),
          sharedWithTherapist: false
        });
        setActiveChatId(docRef.id);
        return docRef.id;
      }
    } catch (error) {
      console.error("Error saving voice conversation progress:", error);
      return activeChatId;
    }
  };

  useEffect(() => {
    // Stop speaking if leaving + generate title/insights
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
         window.speechSynthesis.cancel();
      }
      if (recognitionInstance) {
          recognitionInstance.stop();
      }
      // Generate title + insights on unmount
      const msgs = messagesRef.current;
      const chatId = activeChatIdRef.current;
      const uid = userRef.current?.uid;
      const profile = userProfileDataRef.current;
      if (msgs.length > 0 && chatId && uid) {
        generateAndSaveTitleVoice(msgs, chatId, uid);
        extractAndSaveInsightsVoice(msgs, uid, profile);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recognitionInstance]);

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
    recognition.interimResults = true;
    recognition.continuous = true; 
    
    setRecognitionInstance(recognition);

    recognition.onstart = () => {
      console.log("[CHAT-VOICE] Web Speech API Listening started");
      setIsListening(true);
      setTranscript('');
      setZhiResponse('');
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
          window.speechSynthesis.cancel(); // Stop Zhi if she was talking
      }
    };

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript + ' ';
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      // We use functional state update to append to any existing transcript 
      // since the session started, because earlier results might be 'final' and overwritten in 'event.results' sometimes, 
      // but usually continuous=true keeps them all.
      let fullTranscript = '';
      for (let i = 0; i < event.results.length; ++i) {
        fullTranscript += event.results[i][0].transcript;
      }
      
      setTranscript(fullTranscript);
    };

    recognition.onerror = (event: any) => {
      if (event.error !== 'no-speech' && event.error !== 'network') {
        console.error("[CHAT-VOICE] Speech recognition error:", event.error);
      } else {
        console.log(`[CHAT-VOICE] Speech recognition stopped (${event.error}).`);
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      console.log("[CHAT-VOICE] Web Speech API Listening ended");
      setIsListening(false);
      
      // Get the latest transcript state by using a setState updater function 
      // or simply rely on the latest state if it matches, but since onend might have a stale closure, we can't reliably read 'transcript' state directly.
      // Easiest fix: use a document query or state hook update trick
      setTranscript((currentTranscript) => {
         if (currentTranscript.trim()) {
           processVoiceInput(currentTranscript.trim());
         }
         return currentTranscript; // Keep it on screen while processing
      });
    };

    try {
      console.log("[CHAT-VOICE] Attempting to start Web Speech API...");
      recognition.start();
    } catch(e) {
      console.error("[CHAT-VOICE] Failed to start Web Speech API", e);
    }
  };

  const processVoiceInput = async (text: string) => {
    setIsProcessing(true);
    const userMsg = { role: 'user' as const, text };
    
    const todayString = getTodayDateString();
    const isPremium = userProfileDataRef.current?.premiumStatus === 'active' || userProfileDataRef.current?.isPremium;
    let sentTodayCount = userProfileDataRef.current?.messagesSentToday || 0;
    const lastDate = userProfileDataRef.current?.lastMessageDate;
    
    if (lastDate !== todayString) {
        sentTodayCount = 0;
    }

    if (!isPremium && sentTodayCount >= FREE_tier_LIMIT) {
       setZhiResponse("Has alcanzado tu límite de mensajes gratuitos por hoy. Podrás continuar mañana o si prefieres, puedes abrir acceso completo.");
       setIsProcessing(false);
       return;
    }

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    await saveConversationProgress(newMessages);

    try {
      const historyText = messages.map(m => `${m.role === 'user' ? 'Usuario' : 'Zhi'}: ${m.text}`).join('\n');
      const fullHistory = longTermHistory ? `--- CONVERSACIONES PASADAS ---\n${longTermHistory}\n--- CONVERSACIÓN ACTUAL ---\n${historyText}` : historyText;
      
      const rawPayload = {
        userInput: text,
        userProfile: userProfileData ? { name: user?.displayName || '', ...userProfileData } : { name: user?.displayName || '' },
        chatHistorySummary: fullHistory,
        coreInsights: userProfileData?.coreInsights || []
      };

      let zhiText: string;

      if (Capacitor.isNativePlatform()) {
        console.log('[CHAT-VOICE] Usando llamada directa a Gemini (nativo)');
        const result = await zhiChatClient(rawPayload);
        zhiText = result.zhiHeartResponse;
      } else {
        const res = await fetch(`${getApiBaseUrl()}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(rawPayload)
        });
        if (!res.ok) throw new Error("API Route Failed");
        const response = await res.json();
        zhiText = response?.zhiHeartResponse || "Lo siento, tuve un problema para procesar tu voz. ¿Podemos intentarlo de nuevo?";
      }

      // Increment limit
      sentTodayCount += 1;
      if (user?.uid) {
         updateDoc(doc(db, 'users', user.uid), {
             messagesSentToday: sentTodayCount,
             lastMessageDate: todayString
         }).catch(console.error);
      }
      
      if (userProfileDataRef.current) {
          userProfileDataRef.current.messagesSentToday = sentTodayCount;
          userProfileDataRef.current.lastMessageDate = todayString;
      }

      setZhiResponse(zhiText);
      const finalMessages = [...newMessages, { role: 'zhi' as const, text: zhiText }];
      setMessages(finalMessages);
      const savedId = await saveConversationProgress(finalMessages);
      
      // Auto-play high-quality voice for a seamless experience
      speakTextWithTTS(zhiText);

      // Eagerly generate title after first voice exchange
      if (savedId && !titleGeneratedRef.current && user?.uid) {
        generateAndSaveTitleVoice(finalMessages, savedId, user.uid);
      }
    } catch (error) {
      console.error('[CHAT-VOICE] Error:', error);
      const fallbackMsg = "Lo siento, tuve un problema para procesar tu voz. ¿Podemos intentarlo de nuevo?";
      setZhiResponse(fallbackMsg);
      const fallbackMessages = [...newMessages, { role: 'zhi' as const, text: fallbackMsg }];
      setMessages(fallbackMessages);
      await saveConversationProgress(fallbackMessages);
      
      speakTextWithTTS(fallbackMsg);
    } finally {
      setIsProcessing(false);
    }
  };

  const isPremiumUser = userProfileData?.premiumStatus === 'active' || userProfileData?.isPremium;
  const sentToday = userProfileData?.lastMessageDate === getTodayDateString() ? (userProfileData?.messagesSentToday || 0) : 0;
  const reachedLimit = !isPremiumUser && sentToday >= FREE_tier_LIMIT;

  const handleBack = async () => {
    if (messages.length > 0 && activeChatId && !isSaving) {
      setIsSaving(true);
      try {
        await saveConversationProgress(messages);
        if (!titleGeneratedRef.current && user?.uid) {
          await generateAndSaveTitleVoice(messages, activeChatId, user.uid);
        }
        if (user?.uid) {
          await extractAndSaveInsightsVoice(messages, user.uid, userProfileData);
        }
      } catch (err) {
        console.error("Error al finalizar historial de voz:", err);
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
        <div className="absolute left-4 z-50" style={{ top: 'calc(env(safe-area-inset-top, 0px) + 16px)' }}>
            <Button variant="ghost" onClick={handleBack} disabled={isSaving} size="sm" className="bg-white/10 hover:bg-white/20 backdrop-blur text-white rounded-full shadow-sm">
                {isSaving ? 'Guardando...' : '← Terminar charla'}
            </Button>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center relative px-6 text-center">
            
            <div className="mb-12 h-32 overflow-y-auto w-full max-w-md flex flex-col justify-end items-center">
               {transcript && <p className="text-slate-400 italic text-sm mb-4">"{transcript}"</p>}
               {transcript && <p className="text-slate-400 italic text-sm mb-4">"{transcript}"</p>}
               {zhiResponse && (
                  <div className="flex flex-col items-center">
                    <p className="text-white font-medium text-lg leading-relaxed whitespace-pre-line">{zhiResponse}</p>
                    {userProfileData?.isPremium && (
                      <button 
                        onClick={() => speakTextWithTTS(zhiResponse)}
                        className="mt-4 flex items-center gap-2 text-sm text-[#4EF2C8] font-bold bg-[#4EF2C8]/10 hover:bg-[#4EF2C8]/20 px-4 py-2 rounded-full transition-colors active:scale-95"
                      >
                        <Volume2 className="w-4 h-4" />
                        Escuchar Respuesta
                      </button>
                    )}
                  </div>
               )}
               {!transcript && !zhiResponse && <p className="text-slate-500 font-medium opacity-50">Zhi está lista para escucharte.</p>}
            </div>

            <button 
              onClick={toggleListen}
              disabled={isProcessing || reachedLimit}
              className={`relative w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300 ${isListening ? 'bg-[#4EF2C8]/30 scale-110' : 'bg-slate-800 hover:bg-slate-700'} ${isProcessing || reachedLimit ? 'opacity-50 cursor-not-allowed' : ''} shadow-2xl`}
            >
               {isListening && (
                 <div className="absolute inset-0 rounded-full bg-[#4EF2C8] animate-ping opacity-20"></div>
               )}
                <div className="w-24 h-24 rounded-full bg-white shadow-lg overflow-hidden relative flex items-center justify-center border-4 border-[#4EF2C8]/10">
                    <Image src="/icon_zhi.png" alt="Zhi Listening" fill sizes="100px" className="p-3 object-contain" />
                </div>
            </button>
            
            <div className="mt-12 h-6 flex items-center justify-center">
                <p className={`text-slate-400 font-medium transition-opacity ${isListening ? 'animate-pulse text-[#4EF2C8]' : ''}`}>
                {reachedLimit ? 'Límite diario alcanzado' : isListening ? 'Escuchando... Di algo.' : isProcessing ? 'Zhi está pensando...' : 'Toca el centro para hablar'}
                </p>
            </div>
        </div>
    </div>
  );
}
