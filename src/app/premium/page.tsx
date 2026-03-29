'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ShieldCheck, Mic, Infinity, Lock, CheckCircle2, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useState } from 'react';
import { BottomNavBar } from '@/components/bottom-nav-bar';
import { useBilling } from '@/hooks/use-billing';

export default function PremiumPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { purchasePackage, restorePurchases, isLoading: isBillingLoading, isNative } = useBilling();
  const [isActivating, setIsActivating] = useState(false);

  const handlePurchase = async (type: 'monthly' | 'lifetime') => {
    if (!user?.uid) return;
    
    const success = await purchasePackage(type);
    if (success) {
      alert("¡Zhi Premium ha sido activado exitosamente!");
      router.push('/chat');
    }
  };

  // Keep original handleActivatePremium as fallback or for manual activation if needed
  const handleActivatePremium = async () => {
    if (!user?.uid) return;
    if (isNative) {
      // On native, always force the real flow
      return handlePurchase('monthly');
    }
    
    setIsActivating(true);
    try {
      // For demonstration/web, we just update the user's profile in Firestore
      await updateDoc(doc(db, 'users', user.uid), {
        isPremium: true
      });
      alert("¡Zhi Premium ha sido activado (Simulado/Web)!");
      router.push('/chat');
    } catch (error) {
      console.error("Error al activar premium:", error);
      alert("Hubo un error al intentar activar Zhi Premium.");
    } finally {
      setIsActivating(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-900 text-white relative overflow-x-hidden pb-24">
      
      {/* Background elements */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#4EF2C8] rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute top-0 left-0 w-64 h-64 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-32 left-20 w-64 h-64 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      <div className="p-4 z-10 sticky top-0" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 16px)' }}>
        <Button 
          variant="ghost" 
          onClick={() => router.back()} 
          className="text-white hover:bg-white/10 rounded-full px-4 justify-start"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Volver
        </Button>
      </div>

      <div className="flex-1 w-full max-w-md mx-auto flex flex-col items-center justify-start px-6 pt-6 z-10 relative">
        <div className="mb-6 inline-flex items-center justify-center p-3 bg-[#4EF2C8]/10 rounded-2xl border border-[#4EF2C8]/20">
          <ShieldCheck className="w-8 h-8 text-[#4EF2C8]" />
        </div>
        
        <h1 className="text-4xl font-extrabold text-[#4EF2C8] text-center mb-4 tracking-tight">
          Acceso anticipado
        </h1>
        
        <div className="text-center text-slate-300 mb-10 text-lg leading-relaxed max-w-sm flex flex-col gap-1 mx-auto">
          <p>Puedes seguir cuando lo necesites.</p>
          <p>Este espacio está disponible para ti.</p>
        </div>

        <div className="w-full space-y-4 mb-10">
          <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
            <div className="mt-1 bg-[#4EF2C8]/20 p-2 rounded-full">
              <Infinity className="w-5 h-5 text-[#4EF2C8]" />
            </div>
            <div>
              <h3 className="font-bold text-white text-lg">Conversaciones ilimitadas</h3>
              <p className="text-slate-400 text-sm mt-1 leading-relaxed">Habla todo lo que necesites, las veces que quieras. Sin límite de mensajes diarios.</p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
             <div className="mt-1 bg-purple-500/20 p-2 rounded-full">
              <Lock className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h3 className="font-bold text-white text-lg">Memoria emocional</h3>
              <p className="text-slate-400 text-sm mt-1 leading-relaxed">Acceso completo al directorio de psicólogos y memoria de tus conversaciones pasadas sin límite de días.</p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md opacity-60">
            <div className="mt-1 bg-blue-500/10 p-2 rounded-full">
              <Mic className="w-5 h-5 text-blue-400/60" />
            </div>
            <div>
              <h3 className="font-bold text-white text-lg flex items-center gap-2">
                 Voz <span className="text-[9px] uppercase tracking-widest bg-white/10 px-2 py-0.5 rounded-full text-slate-300">Próximamente</span>
              </h3>
              <p className="text-slate-400 text-sm mt-1 leading-relaxed">Exprésate libremente hablando con Zhi a través del chat de voz fluido y natural. Muy pronto.</p>
            </div>
          </div>
        </div>

        <div className="w-full p-6 rounded-3xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 shadow-2xl relative overflow-hidden mt-4">
          <div className="absolute top-0 right-0 p-4 opacity-10">
             <ShieldCheck className="w-24 h-24" />
          </div>
          
          <div className="flex flex-col items-center text-center mb-8 relative z-10 pt-4">
            <span className="text-[#4EF2C8] text-sm font-bold uppercase tracking-widest mb-3">Acceso anticipado — pago único</span>
            <div className="flex items-end gap-1 justify-center">
               <span className="text-6xl font-extrabold text-white">$29</span>
            </div>
            
            <p className="text-slate-400 text-sm font-medium mt-6 leading-relaxed">
              Acceso completo durante esta etapa inicial.<br/>Sin suscripción.
            </p>
          </div>

          <Button 
            onClick={handleActivatePremium}
            disabled={isActivating || isBillingLoading}
            className="w-full bg-[#4EF2C8] hover:bg-[#3ce5bb] text-slate-900 font-bold text-lg h-14 rounded-xl transition-all shadow-lg active:scale-95 z-10 relative"
          >
            {isActivating ? 'Activando...' : 'Abrir acceso anticipado'}
          </Button>
          
          <p className="text-center text-[11px] text-slate-500 mt-5 relative z-10 font-medium">
            Este acceso forma parte del inicio de Zhi.
          </p>
        </div>

        {isNative && (
          <button 
            onClick={restorePurchases}
            disabled={isBillingLoading}
            className="mt-6 text-slate-500 text-xs font-medium hover:text-slate-300 transition-colors underline underline-offset-4"
          >
            Restaurar compras
          </button>
        )}

        <div className="mt-10 mb-6 text-center max-w-xs mx-auto opacity-60">
          <p className="text-slate-500 text-[11px] leading-relaxed">
            No reemplaza ayuda profesional.<br />
            Está aquí cuando aún no está disponible.
          </p>
        </div>
      </div>
      <BottomNavBar forceShow={true} />
    </div>
  );
}
