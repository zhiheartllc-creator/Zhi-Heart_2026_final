'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera, User, Mail, MapPin, Palette, LogOut, ChevronDown, Bell, Shield, Users, ShieldCheck } from 'lucide-react';
import Image from 'next/image';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { LoadingAnimation } from '@/components/loading-animation';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useSpeech } from '@/hooks/use-speech';
import { scheduleMoodReminders, cancelMoodReminders } from '@/lib/notifications';
import { BottomNavBar } from '@/components/bottom-nav-bar';

export default function SettingsPage() {
  const { user, userProfile, loading, signOut } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [country, setCountry] = useState('');
  const [dailyReminders, setDailyReminders] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const { isMuted, toggleMute } = useSpeech();

  useEffect(() => {
    if (!user) return;
    
    setName(user.displayName || '');
    setEmail(user.email || '');

    const fetchProfile = async () => {
      try {
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.country) setCountry(data.country);
          if (data.dailyReminders !== undefined) setDailyReminders(data.dailyReminders);
          setIsPremium(data.isPremium || false);
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
      }
    };

    fetchProfile();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        name: name,
        country: country,
        dailyReminders: dailyReminders
      });
      // Importante: No actualizamos el displayName de auth aquí por simplicidad de este ejemplo, 
      // solo los datos adicionales en Firestore.
      
      toast({
        title: "Cambios guardados",
        description: "Tu perfil ha sido actualizado exitosamente.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron guardar los cambios.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      router.push('/login');
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error al cerrar sesión",
        description: "Inténtalo de nuevo.",
      });
    }
  };

  const handleToggleReminders = async (checked: boolean) => {
    if (checked) {
      // Intentamos programar las notificaciones nativas
      const scheduled = await scheduleMoodReminders();
      
      if (scheduled) {
        setDailyReminders(true);
        toast({
          title: "✅ Recordatorios activados",
          description: "Recibirás un aviso a las 8:00 AM y a las 7:00 PM cada día para registrar tu ánimo.",
        });
        // Guardar preferencia en Firestore
        if (user) {
          updateDoc(doc(db, 'users', user.uid), { dailyReminders: true }).catch(console.error);
        }
      } else {
        setDailyReminders(false);
        toast({
          variant: "destructive",
          title: "Permiso denegado",
          description: "Debes permitir las notificaciones en Ajustes de tu dispositivo para activar los recordatorios.",
        });
      }
    } else {
      // Cancelar recordatorios
      await cancelMoodReminders();
      setDailyReminders(false);
      if (user) {
        updateDoc(doc(db, 'users', user.uid), { dailyReminders: false }).catch(console.error);
      }
      toast({
        title: "Recordatorios desactivados",
        description: "Ya no recibirás avisos de registro de ánimo.",
      });
    }
  };

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [loading, user, router]);

  if (loading || !user) return <LoadingAnimation />;
  return (
    <div className="flex flex-col min-h-screen bg-slate-50 relative pb-24">
      
      {/* HEADER SECTION (Background + Avatar) */}
      <div className="relative h-48 w-full shrink-0">
        <Image 
          src="/Corazon_Zhi.jpg" 
          alt="Profile Background" 
          fill 
          className="object-cover opacity-80"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-50 to-transparent" />
        
        {/* Avatar Overlay */}
        <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center">
          <div className="relative">
            <Avatar className="h-28 w-28 border-4 border-white shadow-xl">
              <AvatarImage src={user.photoURL || ""} alt={name} className="object-cover" />
              <AvatarFallback className="bg-primary/10 text-primary text-3xl">
                {name ? name.charAt(0).toUpperCase() : <User />}
              </AvatarFallback>
            </Avatar>
            <button className="absolute bottom-1 right-0 bg-slate-900 text-white p-2 rounded-full shadow-lg border-2 border-white hover:bg-slate-800 transition-colors">
              <Camera className="w-4 h-4" />
            </button>
          </div>
          {isPremium ? (
             <div className="mt-2 flex items-center justify-center gap-1 bg-[#4EF2C8]/10 text-[#25b591] px-3 py-1 rounded-full border border-[#4EF2C8]/30 shadow-sm backdrop-blur-sm">
                 <ShieldCheck className="w-4 h-4" />
                 <span className="text-xs font-bold tracking-wide">Zhi Premium</span>
             </div>
          ) : (
             <button onClick={() => router.push('/premium')} className="mt-2 flex items-center justify-center gap-1 bg-white text-slate-500 px-3 py-1 rounded-full border border-slate-200 shadow-sm backdrop-blur-sm hover:border-[#4EF2C8] hover:text-[#25b591] transition-colors">
                 <span className="text-[10px] font-bold tracking-wide uppercase">Plan Gratuito</span>
             </button>
          )}
        </div>
      </div>

      {/* BODY CONTENT */}
      <div className="px-4 sm:px-6 mt-20 max-w-2xl mx-auto w-full space-y-8 relative z-20">
        
        {/* Profile Form */}
        <section className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-900 block ml-1">Nombre Completo</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input 
                type="text" 
                value={name} 
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                className="pl-9 bg-slate-100 border-none shadow-sm focus-visible:ring-1 focus-visible:ring-slate-300"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-900 block ml-1">Correo Electrónico</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input 
                type="email" 
                value={email} 
                disabled
                className="pl-9 bg-slate-100 border-none shadow-sm text-slate-500 opacity-80"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-900 block ml-1">País</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 z-10" />
              <Select value={country} onValueChange={setCountry}>
                <SelectTrigger className="pl-9 bg-slate-100 border-none shadow-sm focus:ring-1 focus:ring-slate-300">
                  <SelectValue placeholder="Selecciona tu país" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ve">Venezuela</SelectItem>
                  <SelectItem value="co">Colombia</SelectItem>
                  <SelectItem value="es">España</SelectItem>
                  <SelectItem value="mx">México</SelectItem>
                  <SelectItem value="ar">Argentina</SelectItem>
                  <SelectItem value="cl">Chile</SelectItem>
                  <SelectItem value="pe">Perú</SelectItem>
                  <SelectItem value="us">Estados Unidos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>

        {/* Settings Cards */}
        <section className="space-y-4">

          <Card className="border shadow-sm rounded-xl overflow-hidden">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex-1 pr-4">
                <h3 className="font-semibold text-slate-900 text-sm">Recordatorios diarios de ánimo</h3>
                <p className="text-xs text-slate-500 mt-0.5">Recibirás un aviso a las <strong>8:00 AM</strong> y a las <strong>7:00 PM</strong> para registrar cómo te sientes.</p>
              </div>
              <Switch checked={dailyReminders} onCheckedChange={handleToggleReminders} />
            </CardContent>
          </Card>

          <Card className="border shadow-sm rounded-xl overflow-hidden">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-slate-900 text-sm">Voz de Zhi</h3>
                <p className="text-xs text-slate-500">Activa o desactiva la voz de tu compañero emocional.</p>
              </div>
              <Switch checked={!isMuted} onCheckedChange={toggleMute} />
            </CardContent>
          </Card>

          <Card className="border shadow-sm rounded-xl overflow-hidden">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-5 h-5 text-slate-800" />
                <h3 className="font-bold text-slate-900 text-lg">Mi Psicólogo</h3>
              </div>
              <p className="text-xs text-slate-500 -mt-3">Gestiona tu psicólogo asignado.</p>
              <div className="flex items-center gap-2 mt-1">
                {isPremium ? (
                  <span className="text-[10px] font-bold tracking-wide uppercase text-[#25b591] bg-[#4EF2C8]/10 border border-[#4EF2C8]/30 px-2.5 py-0.5 rounded-full">✨ Acceso Premium Total</span>
                ) : (
                  <span className="text-[10px] font-bold tracking-wide uppercase text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">🔒 Premium: Contacta a tu psicólogo</span>
                )}
              </div>

              <div className="border border-slate-200 rounded-lg p-3 flex justify-between items-center bg-slate-50">
                <div>
                  <h4 className="font-bold text-sm text-slate-900">Dr. Angarita</h4>
                  <p className="text-xs text-slate-400">Psicólogo Clínico</p>
                </div>
                <Button variant="outline" size="sm" className="bg-white border-slate-200 text-slate-800 text-xs shadow-sm">
                  Ver Perfil
                </Button>
              </div>

              <Button className="w-full bg-[#4EF2C8] hover:bg-[#3ce5bb] text-slate-900 font-semibold shadow-sm">
                <Users className="w-4 h-4 mr-2" />
                Cambiar de Psicólogo
              </Button>
            </CardContent>
          </Card>

          <Card className="border shadow-sm rounded-xl overflow-hidden">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-5 h-5 text-slate-800" />
                <h3 className="font-bold text-slate-900 text-lg">Cuenta y Privacidad</h3>
              </div>
              <p className="text-xs text-slate-500 -mt-3">Gestiona tu cuenta y tus datos.</p>

              <Button 
                variant="outline" 
                className="w-full bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800 shadow-sm text-sm"
                onClick={() => window.open('https://zhiheart.net/es/contacto-bienestar-emocional', '_blank')}
              >
                Solicitar eliminación de cuenta y datos
              </Button>
            </CardContent>
          </Card>
          
        </section>

        {/* Guardar Cambios + Cerrar Sesión */}
        <section className="pt-4 pb-8 space-y-3">
          {userProfile?.role === 'admin' && (
            <Button 
               className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-6 rounded-2xl shadow-md transition-all mb-2"
               onClick={() => {
                  sessionStorage.removeItem('adminViewingUser');
                  router.push('/admin/dashboard');
               }}
            >
               <ShieldCheck className="w-5 h-5 mr-2" />
               Volver al Panel de Administrador
            </Button>
          )}

          <Button 
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-6 rounded-2xl shadow-xl transition-all"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? "Guardando..." : "Guardar Cambios"}
          </Button>
          <div className="flex justify-center">
            <Button variant="ghost" className="text-red-500 hover:text-red-600 hover:bg-red-50 flex items-center" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Cerrar Sesión
            </Button>
          </div>
        </section>

      </div>
      
      <BottomNavBar forceShow={true} />
    </div>
  );
}
