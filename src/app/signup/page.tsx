'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { auth, db, signInWithGoogle, signInWithGoogleNative, createUserProfileDocument } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { createUserWithEmailAndPassword, updateProfile, User } from 'firebase/auth';
import { doc, setDoc, updateDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, ArrowRight, Heart, Search, Check } from 'lucide-react';
import Image from 'next/image';

const COUNTRIES = [
  { value: 'ag', label: 'Antigua y Barbuda' },
  { value: 'ar', label: 'Argentina' },
  { value: 'bs', label: 'Bahamas' },
  { value: 'bb', label: 'Barbados' },
  { value: 'bz', label: 'Belice' },
  { value: 'bo', label: 'Bolivia' },
  { value: 'br', label: 'Brasil' },
  { value: 'ca', label: 'Canadá' },
  { value: 'cl', label: 'Chile' },
  { value: 'co', label: 'Colombia' },
  { value: 'cr', label: 'Costa Rica' },
  { value: 'cu', label: 'Cuba' },
  { value: 'dm', label: 'Dominica' },
  { value: 'ec', label: 'Ecuador' },
  { value: 'sv', label: 'El Salvador' },
  { value: 'es', label: 'España' },
  { value: 'us', label: 'Estados Unidos' },
  { value: 'gd', label: 'Granada' },
  { value: 'gt', label: 'Guatemala' },
  { value: 'gy', label: 'Guyana' },
  { value: 'ht', label: 'Haití' },
  { value: 'hn', label: 'Honduras' },
  { value: 'jm', label: 'Jamaica' },
  { value: 'mx', label: 'México' },
  { value: 'ni', label: 'Nicaragua' },
  { value: 'pa', label: 'Panamá' },
  { value: 'py', label: 'Paraguay' },
  { value: 'pe', label: 'Perú' },
  { value: 'pr', label: 'Puerto Rico' },
  { value: 'do', label: 'República Dominicana' },
  { value: 'kn', label: 'San Cristóbal y Nieves' },
  { value: 'vc', label: 'San Vicente y las Granadinas' },
  { value: 'lc', label: 'Santa Lucía' },
  { value: 'sr', label: 'Surinam' },
  { value: 'tt', label: 'Trinidad y Tobago' },
  { value: 'uy', label: 'Uruguay' },
  { value: 've', label: 'Venezuela' }
];

const AVAILABLE_PSYCHOLOGISTS: Record<string, { id: string, name: string, title: string, img: string }[]> = {
  've': [
    { id: '1', name: 'Dr. Alejandro Angarita', title: 'Psicólogo Clínico', img: '/mi_psicologo.jpg' }
  ],
  'co': [
    { id: '2', name: 'Dra. Isabel Castillo', title: 'Psicóloga Especialista', img: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=200&auto=format&fit=crop' }
  ]
};

export default function SignupWizard() {
  const router = useRouter();
  const { toast } = useToast();

  const { user: authUser, loading: authLoading } = useAuth();

  // Navigation State
  const [step, setStep] = useState(1);
  const [authMethod, setAuthMethod] = useState<'google' | 'email' | null>(null);
  const [loading, setLoading] = useState(false);

  // Ref para evitar que el useEffect interfiera mientras el handler de Google está activo
  const isHandlingGoogleAuth = useRef(false);
  // Ref para leer el step actual sin tornarlo dependencia del effect
  const stepRef = useRef(step);
  useEffect(() => { stepRef.current = step; }, [step]);

  // Si detectamos que ya hay sesión (ej. tras autenticación nativa), verificamos si el perfil está completo.
  // IMPORTANTE: 'step' NO está en las deps para evitar el loop. Usamos stepRef.
  useEffect(() => {
    if (isHandlingGoogleAuth.current) {
      console.log('[SIGNUP] useEffect ignorado: handler de Google en progreso.');
      return;
    }
    const checkProfileCompletion = async () => {
      if (!authLoading && authUser && stepRef.current === 1) {
        try {
          console.log('[SIGNUP] Usuario detectado, verificando integridad del perfil...');
          const userDoc = await getDoc(doc(db, 'users', authUser.uid));
          
          if (userDoc.exists() && userDoc.data().country) {
            console.log('[SIGNUP] Perfil completo encontrado, redirigiendo a dashboard...');
            router.push('/dashboard');
          } else {
            console.log('[SIGNUP] Perfil incompleto o nuevo usuario, avanzando a paso 4...');
            if (authUser.displayName) setName(authUser.displayName);
            if (authUser.email) setEmail(authUser.email);
            setStep(4);
          }
        } catch (error) {
          console.error('[SIGNUP] Error verificando perfil:', error);
          setStep(4);
        }
      }
    };
    
    checkProfileCompletion();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser, authLoading, router]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [country, setCountry] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  // Assessment State
  const [q1, setQ1] = useState('');
  const [q2, setQ2] = useState('');
  const [q3, setQ3] = useState('');
  const [zhiGender, setZhiGender] = useState<'male' | 'female' | ''>('');
  const [countrySearch, setCountrySearch] = useState('');



  const pageVariants = {
    initial: { opacity: 0, x: 20 },
    in: { opacity: 1, x: 0 },
    out: { opacity: 0, x: -20 }
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [step]);

  const handleNext = () => setStep(s => s + 1);
  const handleBack = () => setStep(s => s - 1);

  const handleGoogleSignup = async () => {
    setLoading(true);
    // Bloqueamos el useEffect de detección mientras gestionamos el auth
    isHandlingGoogleAuth.current = true;
    try {
      const isNative = typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform();
      setAuthMethod('google');
      
      let result;
      if (isNative) {
        console.log('[SIGNUP] iniciando Google signup nativo');
        result = await signInWithGoogleNative();
      } else {
        console.log('[SIGNUP] iniciando Google signup web');
        result = await signInWithGoogle();
      }

      // En nativo, Firebase actualiza auth.currentUser, aunque result?.user pueda ser undefined.
      // Tomamos el usuario de auth.currentUser como fallback seguro.
      const signedInUser = result?.user ?? auth.currentUser;
      if (signedInUser) {
        console.log('[SIGNUP] Google auth exitoso para:', signedInUser.email);
        setName(signedInUser.displayName || '');
        setEmail(signedInUser.email || '');
        setStep(4);
      } else {
        console.warn('[SIGNUP] Google auth completado pero no se obtuvo usuario.');
      }
    } catch (error: any) {
      console.error('[SIGNUP] Error:', error);
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      isHandlingGoogleAuth.current = false;
      setLoading(false);
    }
  };



  const handeEmailFlowStart = () => {
    setAuthMethod('email');
    setStep(2);
  };

  const handleCreateUser = async () => {
    if (!acceptedTerms) {
      toast({ variant: 'destructive', title: 'Aviso', description: 'Debes aceptar los términos para continuar.' });
      return;
    }

    setLoading(true);
    try {
      let currentUser: User | null = auth.currentUser;

      if (authMethod === 'email') {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        currentUser = cred.user;
        await updateProfile(currentUser, { displayName: name });
      }

      if (currentUser) {
        // Create/Update user document con merge para no borrar datos de Google (como photoURL)
        await setDoc(doc(db, 'users', currentUser.uid), {
          uid: currentUser.uid,
          name,
          email,
          country,
          termsAccepted: true,
          authMethod: authMethod || 'google',
          updatedAt: serverTimestamp(),
          createdAt: serverTimestamp(), // Firestore ignorará esto si usamos merge y ya existe? No, mejor setDoc con merge
          role: 'user'
        }, { merge: true });
        setStep(6); // Go to Welcome Screen
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error de Registro', description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleFinishAssessment = async () => {
    setLoading(true);
    try {
      const currentUser = auth.currentUser;
      if (currentUser) {
        await updateDoc(doc(db, 'users', currentUser.uid), {
          emotionalIdentity: { q1, q2, q3, zhiGender, completedAt: new Date() }
        });
        router.push('/dashboard');
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pt-12 pb-20 justify-center items-center relative overflow-hidden px-4">
      {/* Background Decorators */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <Image src="/Corazon_Zhi.jpg" alt="Background" fill className="object-cover opacity-20" priority />
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-white/40 to-white/10 pointer-events-none z-0" />

      {/* Zhi Logo */}
      <div className="mb-8 z-10 flex flex-col items-center">
        <Image src="https://i.imgur.com/SN7UgJ3.jpeg" alt="Zhi.io" width={64} height={64} className="rounded-2xl shadow-sm mb-3" />
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Zhi</h1>
      </div>

      <div className="w-full max-w-md relative z-10">
        <AnimatePresence mode="wait">
          
          {/* STEP 1: Intro */}
          {step === 1 && (
            <motion.div key="s1" initial="initial" animate="in" exit="out" variants={pageVariants} className="space-y-6">
              <div className="text-center space-y-2 mb-8">
                <h2 className="text-2xl font-bold text-slate-800">Crea tu cuenta gratis</h2>
                <p className="text-slate-500">Comienza hoy tu viaje hacia el bienestar emocional.</p>
              </div>

              <div className="space-y-4">
                <Button 
                  onClick={handleGoogleSignup} 
                  disabled={loading}
                  className="w-full h-14 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-xl shadow-md text-lg transition-all"
                >
                  <svg className="w-5 h-5 mr-3 bg-white rounded-full p-0.5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.58c2.08-1.92 3.27-4.74 3.27-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Registrarse con Google
                </Button>
                
                <Button 
                  onClick={handeEmailFlowStart}
                  variant="outline"
                  className="w-full h-14 bg-white hover:bg-slate-50 border-slate-200 text-slate-700 font-medium rounded-xl shadow-sm text-lg transition-all"
                >
                  Continuar con correo electrónico
                </Button>
              </div>
            </motion.div>
          )}

          {/* STEP 2: Name */}
          {step === 2 && (
            <motion.div key="s2" initial="initial" animate="in" exit="out" variants={pageVariants} className="space-y-6">
              <div className="text-center space-y-2 mb-8">
                <h2 className="text-2xl font-bold text-slate-800">Primero, ¿cómo te llamas?</h2>
              </div>
              <Input 
                value={name} 
                onChange={e => setName(e.target.value)} 
                placeholder="Escribe tu nombre..."
                className="h-14 text-center text-lg bg-white shadow-sm border-slate-200 rounded-xl"
              />
              <div className="flex justify-between items-center mt-6">
                <Button variant="ghost" onClick={handleBack}><ArrowLeft className="w-5 h-5" /></Button>
                <Button 
                  onClick={handleNext} 
                  disabled={!name.trim()}
                  className="bg-slate-900 rounded-full w-14 h-14 shadow-lg"
                >
                  <ArrowRight className="w-5 h-5 text-white" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* STEP 3: Credentials */}
          {step === 3 && (
            <motion.div key="s3" initial="initial" animate="in" exit="out" variants={pageVariants} className="space-y-6">
              <div className="text-center space-y-2 mb-8">
                <h2 className="text-2xl font-bold text-slate-800">Tus datos de acceso</h2>
                <p className="text-slate-500">Crea credenciales seguras para tu cuenta.</p>
              </div>
              <div className="space-y-4">
                <Input 
                  type="email"
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  placeholder="Correo electrónico"
                  className="h-14 text-lg bg-white shadow-sm border-slate-200 rounded-xl"
                />
                <Input 
                  type="password"
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  placeholder="Contraseña segura"
                  className="h-14 text-lg bg-white shadow-sm border-slate-200 rounded-xl"
                />
              </div>
              <div className="flex justify-between items-center mt-6">
                <Button variant="ghost" onClick={handleBack}><ArrowLeft className="w-5 h-5" /></Button>
                <Button 
                  onClick={handleNext} 
                  disabled={!email || password.length < 6}
                  className="bg-slate-900 rounded-full w-14 h-14 shadow-lg"
                >
                  <ArrowRight className="w-5 h-5 text-white" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* STEP 4: Country */}
          {step === 4 && (
            <motion.div key="s4" initial="initial" animate="in" exit="out" variants={pageVariants} className="space-y-4">
              <div className="text-center space-y-2 mb-4">
                <h2 className="text-2xl font-bold text-slate-800">¿Dónde te encuentras?</h2>
                <p className="text-slate-500">Esto nos ayuda a personalizar tu experiencia.</p>
              </div>

              {/* Search Input */}
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  value={countrySearch}
                  onChange={(e) => setCountrySearch(e.target.value)}
                  placeholder="Buscar país..."
                  className="h-12 pl-10 text-base bg-white shadow-sm border-slate-200 rounded-xl"
                />
              </div>

              {/* Scrollable Country List */}
              <div className="max-h-[280px] overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                {COUNTRIES
                  .filter(c => c.label.toLowerCase().includes(countrySearch.toLowerCase()))
                  .map(c => {
                    const isSelected = country === c.value;
                    return (
                      <button
                        key={c.value}
                        onClick={() => { setCountry(c.value); setCountrySearch(''); }}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-left text-[15px] font-medium transition-all ${
                          isSelected
                            ? 'bg-slate-900 text-white shadow-md'
                            : 'bg-white text-slate-700 border border-slate-100 hover:bg-slate-50'
                        }`}
                      >
                        {c.label}
                        {isSelected && <Check className="w-4 h-4 shrink-0" />}
                      </button>
                    );
                  })}
                {COUNTRIES.filter(c => c.label.toLowerCase().includes(countrySearch.toLowerCase())).length === 0 && (
                  <p className="text-center text-sm text-slate-400 py-4">No se encontró ningún país.</p>
                )}
              </div>

              <div className="flex justify-between items-center mt-4">
                <Button variant="ghost" onClick={authMethod === 'google' ? () => setStep(1) : handleBack}><ArrowLeft className="w-5 h-5" /></Button>
                <Button 
                  onClick={handleNext} 
                  disabled={!country}
                  className="bg-slate-900 rounded-full w-14 h-14 shadow-lg"
                >
                  <ArrowRight className="w-5 h-5 text-white" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* STEP 5: Legal */}
          {step === 5 && (
            <motion.div key="s5" initial="initial" animate="in" exit="out" variants={pageVariants} className="space-y-6">
              <div className="text-center space-y-2 mb-6">
                <h2 className="text-2xl font-bold text-slate-800">Un último paso...</h2>
              </div>
              
              <Card className="bg-white/80 backdrop-blur-sm border-slate-200 shadow-sm">
                <CardContent className="pt-6 text-sm text-slate-600 leading-relaxed text-justify">
                  <span className="font-semibold block mb-2">Autorización de tratamiento de datos personales:</span>
                  Al registrarme, declaro que he leído y acepto la Política de Privacidad y los Términos de Uso de Zhi, autorizando de forma libre, previa, expresa e informada el tratamiento de mis datos personales y emocionales conforme a lo establecido en la legislación de Colombia y Venezuela. Mis datos serán confidenciales y solo mi psicólogo o profesional autorizado tendrá acceso a ellos.
                </CardContent>
              </Card>

              <div className="flex items-start space-x-3 pt-2">
                <Checkbox id="terms" checked={acceptedTerms} onCheckedChange={(c) => setAcceptedTerms(!!c)} className="mt-1" />
                <label htmlFor="terms" className="text-sm font-medium leading-tight text-slate-700">
                  He leído y acepto la <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Política de Privacidad</a> y los <a href="/terms-of-use" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Términos de Uso</a>.
                </label>
              </div>

              <div className="flex justify-between items-center mt-6">
                <Button variant="ghost" onClick={handleBack} disabled={loading}><ArrowLeft className="w-5 h-5" /></Button>
                <Button 
                  onClick={handleCreateUser} 
                  disabled={!acceptedTerms || loading}
                  className="bg-[#4EF2C8] hover:bg-[#3ce5bb] text-slate-900 font-bold rounded-full h-14 px-8 shadow-lg"
                >
                  {loading ? 'Procesando...' : 'Crear Cuenta'}
                </Button>
              </div>
            </motion.div>
          )}

          {/* STEP 6: Welcome */}
          {step === 6 && (
            <motion.div key="s6" initial="initial" animate="in" exit="out" variants={pageVariants} className="space-y-6 text-center">
              <div className="flex justify-center mb-6">
                <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center">
                  <Heart className="w-10 h-10 text-primary" fill="currentColor" />
                </div>
              </div>
              <h2 className="text-3xl font-bold text-slate-800">¡Bienvenido/a, {name.split(' ')[0]}!</h2>
              <p className="text-slate-600 text-lg">Para ofrecerte una experiencia más personal, nos gustaría conocerte un poco mejor. Tus respuestas nos ayudarán a adaptar el apoyo a tus necesidades.</p>
              
              <div className="pt-8">
                <Button 
                  onClick={handleNext} 
                  className="bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-full h-14 w-full shadow-lg text-lg"
                >
                  Comenzar evaluación
                </Button>
              </div>
            </motion.div>
          )}

          {/* STEP 7: Gender Choice */}
          {step === 7 && (
            <motion.div key="s7_gender" initial="initial" animate="in" exit="out" variants={pageVariants} className="space-y-6">
              <div className="text-center space-y-2 mb-8">
                <span className="text-sm font-medium text-primary uppercase tracking-widest">Personaliza tu experiencia</span>
                <h2 className="text-2xl font-bold text-slate-800 leading-tight">¿Qué voz prefieres para Zhi?</h2>
              </div>
              <div className="grid grid-cols-1 gap-4">
                <Button 
                  variant={zhiGender === 'female' ? "default" : "outline"}
                  className={`h-24 justify-start px-6 gap-4 rounded-xl transition-all ${zhiGender === 'female' ? 'bg-slate-900 text-white shadow-md' : 'bg-white text-slate-700'}`}
                  onClick={() => { setZhiGender('female'); setTimeout(handleNext, 300); }}
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${zhiGender === 'female' ? 'bg-slate-700' : 'bg-slate-100 text-slate-500'}`}>
                    <span className="text-xl">👩</span>
                  </div>
                  <div className="text-left">
                    <p className="font-bold">Voz Femenina</p>
                    <p className="text-xs opacity-70">Una presencia serena y empática</p>
                  </div>
                </Button>

                <Button 
                  variant={zhiGender === 'male' ? "default" : "outline"}
                  className={`h-24 justify-start px-6 gap-4 rounded-xl transition-all ${zhiGender === 'male' ? 'bg-slate-900 text-white shadow-md' : 'bg-white text-slate-700'}`}
                  onClick={() => { setZhiGender('male'); setTimeout(handleNext, 300); }}
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${zhiGender === 'male' ? 'bg-slate-700' : 'bg-slate-100 text-slate-500'}`}>
                    <span className="text-xl">👨</span>
                  </div>
                  <div className="text-left">
                    <p className="font-bold">Voz Masculina</p>
                    <p className="text-xs opacity-70">Una presencia firme y compasiva</p>
                  </div>
                </Button>
              </div>
              <div className="pt-4"><Button variant="ghost" onClick={handleBack} className="text-slate-400">Atrás</Button></div>
            </motion.div>
          )}

          {/* STEP 8: Q1 */}
          {step === 8 && (
            <motion.div key="s8" initial="initial" animate="in" exit="out" variants={pageVariants} className="space-y-6">
              <div className="text-center space-y-2 mb-8">
                <span className="text-sm font-medium text-primary uppercase tracking-widest">Identidad Emocional (1/3)</span>
                <h2 className="text-2xl font-bold text-slate-800 leading-tight">¿Cómo te gustaría que te acompañe?</h2>
              </div>
              <div className="space-y-3">
                {[
                  'Como un hermano mayor que entiende y guía', 
                  'Como una presencia tranquila que solo escucha', 
                  'Como alguien firme pero compasivo', 
                  'Como una energía neutral y reflexiva'
                ].map(opt => (
                  <Button 
                    key={opt}
                    variant={q1 === opt ? "default" : "outline"}
                    className={`w-full h-auto py-4 min-h-[56px] justify-start px-6 text-left text-base whitespace-normal rounded-xl transition-all ${q1 === opt ? 'bg-slate-900 text-white shadow-md' : 'bg-white text-slate-700'}`}
                    onClick={() => { setQ1(opt); setTimeout(handleNext, 300); }}
                  >
                    {opt}
                  </Button>
                ))}
              </div>
            </motion.div>
          )}

          {/* STEP 9: Q2 */}
          {step === 9 && (
            <motion.div key="s9" initial="initial" animate="in" exit="out" variants={pageVariants} className="space-y-6">
              <div className="text-center space-y-2 mb-8">
                <span className="text-sm font-medium text-primary uppercase tracking-widest">La Voz de ZHI (2/3)</span>
                <h2 className="text-2xl font-bold text-slate-800 leading-tight">¿Qué voz te hace sentir más cómodo?</h2>
              </div>
              <div className="space-y-3">
                {[
                  '🌿 ZHI Presencia Serena', 
                  '🧭 ZHI Presencia Guía', 
                  '🤍 ZHI Presencia Contención', 
                  '🔥 ZHI Presencia Fortaleza'
                ].map(opt => (
                  <Button 
                    key={opt}
                    variant={q2 === opt ? "default" : "outline"}
                    className={`w-full h-auto py-4 min-h-[56px] justify-start px-6 text-left text-base whitespace-normal rounded-xl transition-all ${q2 === opt ? 'bg-slate-900 text-white shadow-md' : 'bg-white text-slate-700'}`}
                    onClick={() => { setQ2(opt); setTimeout(handleNext, 300); }}
                  >
                    {opt}
                  </Button>
                ))}
              </div>
              <div className="pt-4"><Button variant="ghost" onClick={handleBack} className="text-slate-400">Atrás</Button></div>
            </motion.div>
          )}

          {/* STEP 10: Q3 */}
          {step === 10 && (
            <motion.div key="s10" initial="initial" animate="in" exit="out" variants={pageVariants} className="space-y-6">
              <div className="text-center space-y-2 mb-8">
                <span className="text-sm font-medium text-primary uppercase tracking-widest">Ritmo Emocional (3/3)</span>
                <h2 className="text-2xl font-bold text-slate-800 leading-tight">Cuando hablas de lo que sientes, prefieres que:</h2>
              </div>
              <div className="space-y-3">
                {[
                  'Te escuche sin interrumpir mucho', 
                  'Te haga preguntas suaves', 
                  'Te ayude a organizar tus pensamientos'
                ].map(opt => (
                  <Button 
                    key={opt}
                    variant={q3 === opt ? "default" : "outline"}
                    className={`w-full h-auto py-4 min-h-[56px] justify-start px-6 text-left text-base whitespace-normal rounded-xl transition-all ${q3 === opt ? 'bg-slate-900 text-white shadow-md' : 'bg-white text-slate-700'}`}
                    onClick={() => setQ3(opt)}
                  >
                    {opt}
                  </Button>
                ))}
              </div>
              <div className="flex justify-between items-center mt-8">
                <Button variant="ghost" onClick={handleBack} disabled={loading} className="text-slate-400">Atrás</Button>
                <Button 
                  onClick={handleFinishAssessment} 
                  disabled={!q3 || loading}
                  className="bg-[#4EF2C8] hover:bg-[#3ce5bb] text-slate-900 font-bold rounded-full h-14 px-8 shadow-lg"
                >
                  {loading ? 'Finalizando...' : 'Finalizar y Entrar'}
                </Button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
