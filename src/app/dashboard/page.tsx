'use client';

import { useAuth } from '@/hooks/use-auth';
import { redirect, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { History, MessageSquare, Plus, Bell, Loader2, Heart, CheckCircle, Smile, Meh, Frown, Annoyed, Angry, ChevronLeft, ChevronRight, FileWarning, HeartHandshake, BookOpen, ArrowUp, ArrowDown, Minus, User, Brain } from 'lucide-react';
import Link from 'next/link';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Image from 'next/image';
import { doc, getDoc, setDoc, collection, onSnapshot, getDocs, Timestamp, query, where, orderBy, addDoc, limit, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { UserProfile, MoodEntry, ChatHistoryEntry, Notification } from '@/lib/types';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { Carousel, CarouselContent, CarouselItem } from '@/components/ui/carousel';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useToast } from '@/hooks/use-toast';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, addWeeks, subWeeks, isToday, startOfMonth, endOfMonth, addDays, subDays, startOfDay, endOfDay, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AnimatePresence, motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip as RechartsTooltip } from 'recharts';
import type { ChartConfig } from '@/components/ui/chart';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { LoadingAnimation } from '@/components/loading-animation';
import { Logo } from '@/components/logo';
import { useMoodReminder } from '@/hooks/use-mood-reminder';

// --- CONSTANTES ---

const moods = [
  { name: 'Feliz', bgColor: 'bg-green-100', imageUrl: '/icon_feliz.jpg', color: 'text-green-500', darkColor: 'text-green-400', ring: 'ring-green-400' },
  { name: 'Normal', bgColor: 'bg-blue-100', imageUrl: '/icon_normal.jpg', color: 'text-blue-500', darkColor: 'text-blue-400', ring: 'ring-blue-400' },
  { name: 'Triste', bgColor: 'bg-gray-100', imageUrl: '/icon_triste.jpg', color: 'text-gray-500', darkColor: 'text-gray-400', ring: 'ring-gray-400' },
  { name: 'Ansioso', bgColor: 'bg-purple-100', imageUrl: '/icon_ansioso.jpg', color: 'text-purple-500', darkColor: 'text-purple-400', ring: 'ring-purple-400' },
  { name: 'Enojado', bgColor: 'bg-red-100', imageUrl: '/icon_enojado.jpg', color: 'text-red-500', darkColor: 'text-red-400', ring: 'ring-red-400' },
  { name: 'Preocupado', bgColor: 'bg-yellow-100', imageUrl: '/icon_preocupado.jpg', color: 'text-yellow-500', darkColor: 'text-yellow-400', ring: 'ring-yellow-400' },
];

const moodImages: { [key: string]: string } = {
  'Feliz': '/icon_feliz.jpg', 'Triste': '/icon_triste.jpg', 'Normal': '/icon_normal.jpg', 'Ansioso': '/icon_ansioso.jpg', 'Enojado': '/icon_enojado.jpg', 'Preocupado': '/icon_preocupado.jpg',
};

const moodColors: { [key: string]: string } = {
  'Feliz': 'text-green-500', 'Normal': 'text-blue-500', 'Triste': 'text-gray-500', 'Ansioso': 'text-purple-500', 'Enojado': 'text-red-500', 'Preocupado': 'text-yellow-500',
};

const moodDarkColors: { [key: string]: string } = {
  'Feliz': 'dark:text-green-400', 'Normal': 'dark:text-blue-400', 'Triste': 'dark:text-gray-400', 'Ansioso': 'dark:text-purple-400', 'Enojado': 'dark:text-red-400', 'Preocupado': 'dark:text-yellow-400',
};

const moodBgColors: { [key: string]: string } = {
  'Feliz': 'bg-green-100', 'Normal': 'bg-blue-100', 'Triste': 'bg-gray-100', 'Ansioso': 'bg-purple-100', 'Enojado': 'bg-red-100', 'Preocupado': 'bg-yellow-100',
};

const moodChartColors: { [key: string]: string } = {
  'Feliz': '#22c55e', // green-500
  'Normal': '#3b82f6', // blue-500
  'Triste': '#6b7280', // gray-500
  'Ansioso': '#a855f7', // purple-500
  'Enojado': '#ef4444', // red-500
  'Preocupado': '#eab308' // yellow-500
};



// --- COMPONENTES ---

function MoodCalendar() {
  const { user } = useAuth();
  const [allMoodEntries, setAllMoodEntries] = useState<MoodEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    const moodsQuery = query(collection(db, 'users', user.uid, 'moodEntries'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(moodsQuery, (snapshot) => {
      const moodData = snapshot.docs.map(doc => {
        const data = doc.data();
        if (data.createdAt && typeof data.createdAt.toDate === 'function') {
          return { id: doc.id, ...data } as MoodEntry;
        }
        return null;
      }).filter(Boolean) as MoodEntry[];
      setAllMoodEntries(moodData);
      setLoading(false);
    }, (err) => {
      console.error('[DASHBOARD] Error loading MoodCalendar:', err);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  const days = eachDayOfInterval({ start: subDays(currentDate, 2), end: addDays(currentDate, 2) });
  const getMoodsForDay = (day: Date) => allMoodEntries.filter(e => e.createdAt && isSameDay((e.createdAt as any).toDate(), day));

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <Card className="relative overflow-hidden">
        <Image src="/fondo_tarjeta_calendario.jpg" alt="bg" fill className="absolute inset-0 z-0 object-cover" />
        <div className="absolute inset-0 bg-background/60 backdrop-blur-sm z-0" />
        <div className="relative z-10">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-semibold">Mi Calendario de Ánimo</h3>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={() => setCurrentDate(subDays(currentDate, 5))} className="h-8 w-8"><ChevronLeft className="w-4 h-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => setCurrentDate(addDays(currentDate, 5))} className="h-8 w-8"><ChevronRight className="w-4 h-4" /></Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 gap-2 w-full">
              {days.map(day => {
                const moodsForDay = getMoodsForDay(day);
                const latestMood = moodsForDay.length > 0 ? moodsForDay[0] : null;
                const imageSrc = latestMood ? moodImages[latestMood.mood] : null;
                return (
                  <button key={day.toString()} onClick={() => { setSelectedDay(day); setIsDialogOpen(true); }}
                    className={cn("flex flex-col items-center gap-1 p-3 rounded-xl transition-all shadow-sm", isToday(day) ? "bg-blue-400 text-white" : "bg-white/60")}> 
                    <span className="text-[10px] uppercase font-bold opacity-80">{format(day, 'E', { locale: es })}</span>
                    {imageSrc ? <Image src={imageSrc} alt="mood" width={24} height={24} className="rounded-full object-cover aspect-square" /> : <div className="w-6 h-6" />}
                    <span className="text-lg font-bold">{format(day, 'd')}</span>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </div>
      </Card>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registros de {selectedDay && format(selectedDay, 'd MMMM', { locale: es })}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 mt-4">
          {selectedDay && getMoodsForDay(selectedDay).map(e => (
            <div key={e.id} className={cn("p-3 rounded-lg flex justify-between items-center", moodBgColors[e.mood])}>
              <div className="flex items-center gap-2">
                {moodImages[e.mood] && <Image src={moodImages[e.mood]} alt={e.mood} width={20} height={20} className="rounded-full object-cover aspect-square" />}
                <span className="font-medium">{e.mood}</span>
              </div>
              <span className="text-xs opacity-70">{format((e.createdAt as any).toDate(), 'p')}</span>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function generateInspirationalQuote(tendency: string, predominantMood: string) {
  if (tendency === 'Mejorando') {
    return "¡Qué bien! Sigue así, cada pequeño paso cuenta hacia tu bienestar.";
  }
  if (tendency === 'Empeorando') {
    return "Recuerda que los días difíciles son temporales. Sé amable contigo mismo.";
  }
  
  if (predominantMood === 'Ansioso' || predominantMood === 'Preocupado') {
      return "Respira profundo. Estás haciendo lo mejor que puedes hoy.";
  }
  if (predominantMood === 'Triste') {
      return "Tus emociones son válidas. Date permiso para sentir y sanar.";
  }
  if (predominantMood === 'Enojado') {
      return "Tómate un momento para ti. La calma siempre regresa.";
  }
  
  return "La constancia es clave. Un paso a la vez en tu camino emocional.";
}

function EmotionalAnalyticsCard() {
  const { user } = useAuth();
  const [moodData, setMoodData] = useState<MoodEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    // Traemos datos de las últimas 2 semanas para poder comparar
    const moodQuery = query(collection(db, 'users', user.uid, 'moodEntries'), where('createdAt', '>=', Timestamp.fromDate(subWeeks(new Date(), 2))));
    return onSnapshot(moodQuery, (s) => {
      setMoodData(s.docs.map(d => d.data() as MoodEntry));
      setLoading(false);
    }, (err) => {
      console.error('[DASHBOARD] Error loading EmotionalAnalytics:', err);
      setLoading(false);
    });
  }, [user]);

  // Dividimos en Semana Actual y Semana Anterior
  const thisWeekData = useMemo(() => {
    const startOfThisWeek = startOfWeek(new Date(), { weekStartsOn: 1 });
    return moodData.filter(e => e.createdAt && (e.createdAt as any).toDate() >= startOfThisWeek);
  }, [moodData]);

  const lastWeekData = useMemo(() => {
    const startOfThisWeek = startOfWeek(new Date(), { weekStartsOn: 1 });
    const startOfLastWeek = subWeeks(startOfThisWeek, 1);
    return moodData.filter(e => {
        if (!e.createdAt) return false;
        const d = (e.createdAt as any).toDate();
        return d >= startOfLastWeek && d < startOfThisWeek;
    });
  }, [moodData]);

  // Calculamos predominant mood de esta semana
  const predominantMood = useMemo(() => {
    if (thisWeekData.length === 0) return 'Normal';
    const counts = thisWeekData.reduce((acc, curr) => {
      acc[curr.mood] = (acc[curr.mood] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
  }, [thisWeekData]);

  const weeklyChartData = useMemo(() => {
    const counts = thisWeekData.reduce((acc, curr) => {
      acc[curr.mood] = (acc[curr.mood] || 0) + 1;
      return acc;
    }, {} as any);
    return Object.entries(counts).map(([mood, count]) => ({
      mood, count, fill: moodChartColors[mood] || '#999999'
    }));
  }, [thisWeekData]);

  // Tendencia
  const getPositiveRatio = (data: MoodEntry[]) => {
      if (data.length === 0) return 0;
      const positive = data.filter(d => ['Feliz', 'Normal'].includes(d.mood)).length;
      return positive / data.length;
  };

  const currentRatio = getPositiveRatio(thisWeekData);
  const previousRatio = getPositiveRatio(lastWeekData);

  let tendency = 'Estable';
  let TendencyIcon = Minus;
  let tendencyColor = 'text-muted-foreground';

  if (lastWeekData.length > 0 && thisWeekData.length > 0) {
      if (currentRatio > previousRatio + 0.1) {
          tendency = 'Mejorando';
          TendencyIcon = ArrowUp;
          tendencyColor = 'text-green-500';
      } else if (currentRatio < previousRatio - 0.1) {
          tendency = 'Bajando';
          TendencyIcon = ArrowDown;
          tendencyColor = 'text-red-500';
      }
  }

  const dynamicQuote = useMemo(() => generateInspirationalQuote(tendency, predominantMood), [tendency, predominantMood]);

  const chartConfig = { count: { label: "Registros" } } as ChartConfig;

  return (
    <Card className="relative overflow-hidden border-none shadow-md">
      <Image src="/Corazon_Zhi.jpg" alt="bg" fill className="absolute inset-0 z-0 object-cover opacity-80" priority />
      <div className="absolute inset-0 bg-white/20 backdrop-blur-sm z-0" />
      <div className="relative z-10 flex flex-col h-full min-h-[400px]">
        <CardHeader className="pb-0 text-center">
          <CardTitle className="text-slate-900 text-xl font-bold">Resumen Semanal</CardTitle>
          <CardDescription className="text-slate-800 font-medium pt-1">Tu balance emocional de esta semana.</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col items-center justify-center pt-6 pb-2">
          {weeklyChartData.length === 0 ? (
            <div className="text-center opacity-50 space-y-2 my-auto">
              <p className="text-sm">Aún no hay registros esta semana.</p>
              <p className="text-xs">¡Selecciona cómo te sientes arriba para empezar!</p>
            </div>
          ) : (
            <>
              <ChartContainer config={chartConfig} className="h-64 w-full mb-2">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart margin={{ top: 20, right: 0, bottom: 20, left: 0 }}>
                    <RechartsTooltip content={<ChartTooltipContent nameKey="mood" hideLabel />} />
                    <Pie data={weeklyChartData} dataKey="count" nameKey="mood" innerRadius={60} outerRadius={80} paddingAngle={2} />
                    <Legend 
                      verticalAlign="bottom" 
                      height={36} 
                      iconType="circle" 
                      formatter={(value) => <span className="text-slate-800 font-medium">{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>

              <div className="text-center space-y-1 w-full mt-4">
                <p className="text-sm font-medium text-slate-800">Tendencia del ánimo</p>
                <div className="flex items-center justify-center gap-2">
                  <TendencyIcon className={cn("w-6 h-6 font-bold", tendencyColor)} />
                  <span className={cn("text-2xl font-bold", tendencyColor)}>{tendency}</span>
                </div>
                <p className="text-xs text-slate-700">Comparado con la semana pasada.</p>
              </div>
            </>
          )}
        </CardContent>
        <div className="w-full text-center p-4 pt-2 mt-auto min-h-[64px] flex items-center justify-center bg-white/10 backdrop-blur-sm rounded-b-xl border-t border-white/20">
            <p className="text-xs italic text-slate-800 font-medium leading-relaxed">"{dynamicQuote}"</p>
        </div>
      </div>
    </Card>
  );
}

const dynamicPhrases = [
  { categoria: "mañana", frases: ["Hoy es un buen día para escucharte con cariño.", "Cada emoción que sientes merece espacio.", "Respira. Estás haciendo lo mejor que puedes."] },
  { categoria: "noche", frases: ["Lo que sentiste hoy también cuenta.", "Descansa. Tu corazón también necesita pausa.", "Gracias por cuidar de ti hoy."] },
  { categoria: "momentos_dificiles", frases: ["Sentir no te hace débil, te hace humano.", "No estás solo. Aquí hay espacio para ti."] }
];

function WelcomeCard() {
  const { user } = useAuth();
  const router = useRouter();
  const [phrase, setPhrase] = useState("");
  const [currentDateTime, setCurrentDateTime] = useState('');
  useEffect(() => {
    if (user?.uid) {
      const hasGreeted = sessionStorage.getItem('zhi_greeted');
      if (!hasGreeted) {
        sessionStorage.setItem('zhi_greeted', 'true');
      }
    }
  }, [user?.uid]);

  useEffect(() => {
    const hour = new Date().getHours();
    const cat = hour >= 18 || hour < 5 ? 'noche' : 'mañana';
    const list = dynamicPhrases.find(p => p.categoria === cat)?.frases || [];
    setPhrase(list[Math.floor(Math.random() * list.length)]);
    
    const update = () => setCurrentDateTime(new Intl.DateTimeFormat('es-VE', { 
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true 
    }).format(new Date()));
    update();
    const id = setInterval(update, 60000);
    return () => clearInterval(id);
  }, []);

  return (
    <Card className="rounded-t-none bg-primary text-white relative overflow-hidden border-none" style={{ borderBottomLeftRadius: '35px', borderBottomRightRadius: '35px' }}>
      <Image src="/fondo_tarjeta1_zhi.jpg" alt="bg" fill className="object-cover opacity-60" priority />
      <div className="relative z-10 p-8">
        <p className="text-[10px] opacity-70 mb-4">{currentDateTime}</p>
        <div className="flex items-center gap-4 mb-6">
          <Avatar className="h-16 w-16 border-2 border-white/50">
            <AvatarImage src={user?.photoURL || ""} className="object-cover" />
            <AvatarFallback><User className="text-primary" /></AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm opacity-80">Bienvenido,</p>
            <h1 className="font-display text-3xl font-bold text-white drop-shadow-sm">{user?.displayName?.split(' ')[0] || 'Usuario'}</h1>
          </div>
        </div>
        <p className="font-display text-[16px] italic mb-6 opacity-95 min-h-[1.5rem] tracking-wide">"{phrase}"</p>
        <div className="relative group/btn">
          {/* Efecto de "Presencia" (Humo/Desenfoque) */}
          <motion.div
            className="absolute -inset-1 bg-white/40 rounded-full blur-xl z-0"
            animate={{
              scale: [0.95, 1.15, 0.95],
              opacity: [0.2, 0.5, 0.2],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          <motion.div
            className="absolute -inset-2 bg-white/20 rounded-full blur-2xl z-0"
            animate={{
              scale: [1, 1.25, 1],
              opacity: [0.1, 0.3, 0.1],
            }}
            transition={{
              duration: 6,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 1
            }}
          />
          
          <Button 
            className="relative z-10 w-full rounded-full bg-white/20 hover:bg-white/30 border-none backdrop-blur-md text-white h-12 transition-all duration-300 group-hover/btn:scale-[1.02] group-active/btn:scale-[0.98]" 
            onClick={() => router.push('/chat')}
          >
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white/10 mr-3">
              <Image src="/icon_zhi.png" alt="Zhi" width={20} height={20} className="object-contain" />
            </div>
            Iniciar conversación con Zhi...
          </Button>
        </div>
      </div>
    </Card>
  );
}

function RecentHistoryCard() {
  const { user } = useAuth();
  const [history, setHistory] = useState<ChatHistoryEntry[]>([]);
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'users', user.uid, 'chatHistory'), orderBy('date', 'desc'));
    return onSnapshot(q, (s) => {
      const docs = s.docs.map(d => ({ id: d.id, ...d.data() } as ChatHistoryEntry));
      // Ordenamos localmente para manejar tipos de 'date' mixtos (Strings vs Timestamps de versiones viejas)
      const sorted = docs.sort((a, b) => {
        const getTime = (d: any) => d?.toDate ? d.toDate().getTime() : new Date(d || 0).getTime();
        return getTime(b.date) - getTime(a.date);
      });
      setHistory(sorted.slice(0, 2));
    }, (err) => {
      console.error('[DASHBOARD] Error loading RecentHistory:', err);
    });
  }, [user]);

  return (
    <Card className="relative overflow-hidden h-40 group rounded-3xl border-none shadow-md">
      <Image src="/fondo_mis_historial.jpg" alt="hist" fill className="object-cover" />
      <div className="absolute inset-0 bg-black/50 z-10" />
      <div className="relative z-20 p-4 text-white">
        <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold uppercase">Historial Reciente</span>
            <History className="w-4 h-4 opacity-70" />
        </div>
        {history.map(e => (
          <Link key={e.id} href="/history" className="block text-sm truncate py-1 hover:text-secondary transition-colors">• {e.title || "Nueva Conversación..."}</Link>
        ))}
      </div>
    </Card>
  );
}

function DashboardCard({ icon: Icon, title, description, href, imageUrl }: { icon: React.ElementType, title: string, description: string, href: string, imageUrl?: string }) {
  return (
    <Card className="relative overflow-hidden h-40 group">
      <Image src={imageUrl || "https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?q=80&w=2000&auto=format&fit=crop"} alt="card" fill className="object-cover" />
      <div className="absolute inset-0 bg-black/50 z-10" />
      <div className="relative z-20 p-4 text-white flex flex-col h-full">
        <div className="flex justify-between">
            <span className="text-sm font-bold">{title}</span>
            <Icon className="w-4 h-4" />
        </div>
        <p className="text-[10px] opacity-80 mt-1">{description}</p>
        <Button asChild size="sm" className="mt-auto rounded-full bg-white/20 hover:bg-white/30 w-fit">
            <Link href={href}>Contactar</Link>
        </Button>
      </div>
    </Card>
  );
}

export default function DashboardPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    // hasLoadedOnce: asegura que solo redirijamos a /login cuando el SDK de Auth
    // ha tenido al menos un ciclo completo para resolver el estado. Esto previene
    // un redirect falso durante la navegación desde /login antes de que el usuario
    // se propague en onAuthStateChanged.
    const hasLoadedOnce = useRef(false);
    if (!loading) hasLoadedOnce.current = true;

    useEffect(() => {
      // Solo redirigir si: el SDK ya terminó de cargar (loading===false),
      // y además ya había cargado antes (hasLoadedOnce asegura un ciclo completo),
      // y no hay ningún usuario autenticado.
      if (hasLoadedOnce.current && loading === false && user === null) {
        console.log('[DASHBOARD] Sin usuario detectado, redirigiendo a login...');
        router.push('/login');
      }
    }, [user, loading, router]);
  const { toast } = useToast();
  const [selectedMood, setSelectedMood] = useState<string | null>(null);

  // Activate daily mood reminder notifications
  useMoodReminder(!!user);
  
  const handleMoodClick = async (moodName: string) => {
    if (!user) return;
    setSelectedMood(moodName);
    
    // Voice feedback based on mood
    // Let's rely on text or local audio for mood tracking if needed later.
    // For now we removed TTS here since it's being globally replaced.

    try {
        await addDoc(collection(db, 'users', user.uid, 'moodEntries'), {
            uid: user.uid, mood: moodName, date: format(new Date(), 'yyyy-MM-dd'), createdAt: Timestamp.now()
        });
        toast({ title: '¡Ánimo registrado!', description: `Te sientes ${moodName}.` });
    } catch (e) {
        toast({ variant: "destructive", title: "Error", description: "No se pudo guardar." });
    }
  };

  if (loading || !user) return <LoadingAnimation />;

  return (
    <div className="flex flex-col min-h-screen bg-white pb-10">
      <WelcomeCard />
      <main className="px-4 mt-6 relative z-20 max-w-7xl mx-auto w-full space-y-6">
        <section>
          <h2 className="font-display text-[22px] font-semibold mb-3 px-1 text-slate-800">¿Cómo te sientes ahora?</h2>
          <Carousel opts={{ align: 'start' }} className="w-full">
            <CarouselContent className="-ml-2 py-2">
              {moods.map((mood, i) => (
                <CarouselItem key={i} className="basis-[22%] md:basis-[12%] pl-2">
                  <div className="flex flex-col items-center gap-2">
                    <Card onClick={() => handleMoodClick(mood.name)} 
                      className={cn("relative aspect-square w-full max-w-[80px] overflow-hidden flex flex-col items-center justify-center cursor-pointer transition-all hover:scale-105", 
                      mood.bgColor,
                      selectedMood === mood.name ? cn("ring-4", mood.ring) : "border-none")}>
                      <Image src={mood.imageUrl} alt={mood.name} width={64} height={64} className="object-cover rounded-2xl drop-shadow-md transition-transform group-hover:scale-105" />
                    </Card>
                    <span className="text-[10px] font-medium text-slate-600">{mood.name}</span>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
        </section>

        <MoodCalendar />
        <EmotionalAnalyticsCard />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <RecentHistoryCard />
          <DashboardCard icon={HeartHandshake} title="Psicólogo" description="Inicia una conversación segura." href="/contact" imageUrl="/TARJETA_CONTACTAR_PSICOLOGO.jpg" />
        </div>
      </main>
    </div>
  );
}