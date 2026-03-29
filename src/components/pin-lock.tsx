'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Lock, Unlock, ShieldCheck, KeyRound, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { LoadingAnimation } from '@/components/loading-animation';

interface PinLockProps {
  children: React.ReactNode;
}

export function PinLock({ children }: PinLockProps) {
  const { user, userProfile, loading } = useAuth();
  const { toast } = useToast();
  
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [checking, setChecking] = useState(true);
  
  // PIN states
  const [pinValue, setPinValue] = useState('');
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [confirmPinValue, setConfirmPinValue] = useState('');
  const [setupStep, setSetupStep] = useState<'create' | 'confirm'>('create');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (loading) return;
    
    // Check if session storage already has the unlocked token for this session
    const unlocked = sessionStorage.getItem(`zhi_chat_unlocked_${user?.uid}`);
    if (unlocked === 'true') {
      setIsUnlocked(true);
    }
    
    // Check if user needs to setup PIN
    if (userProfile && !userProfile.chatPin) {
      setIsSettingUp(true);
    }
    
    setChecking(false);
  }, [user, userProfile, loading]);

  const handleCreatePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pinValue.length !== 4) {
      toast({ title: "Atención", description: "El PIN debe tener 4 dígitos numéricos." });
      return;
    }
    setSetupStep('confirm');
  };

  const handleConfirmPinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (confirmPinValue !== pinValue) {
      toast({ variant: "destructive", title: "Error", description: "Los PINs no coinciden. Intenta de nuevo." });
      setConfirmPinValue('');
      setSetupStep('create');
      setPinValue('');
      return;
    }

    if (!user) return;
    
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        chatPin: pinValue
      });
      sessionStorage.setItem(`zhi_chat_unlocked_${user.uid}`, 'true');
      setIsUnlocked(true);
      setIsSettingUp(false);
      
      toast({
        title: "Seguridad Activada",
        description: "Tu PIN de acceso ha sido configurado.",
      });
      
      // Update local profile object so if we navigate away and back, we know it exists
      if (userProfile) {
        userProfile.chatPin = pinValue;
      }

    } catch (error) {
      console.error("Error setting pin:", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudo guardar el PIN." });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUnlockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile) return;
    
    if (pinValue === userProfile.chatPin) {
      sessionStorage.setItem(`zhi_chat_unlocked_${user?.uid}`, 'true');
      setIsUnlocked(true);
    } else {
      toast({ variant: "destructive", title: "PIN Incorrecto", description: "Por favor, intenta de nuevo." });
      setPinValue('');
    }
  };

  if (loading || checking) return <LoadingAnimation />;

  if (isUnlocked) {
    return <>{children}</>;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-6 relative overflow-hidden">
      <div className="absolute top-0 w-full h-64 bg-gradient-to-b from-[#1e3a5f] to-slate-50 pointer-events-none" />
      
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl overflow-hidden relative z-10 border border-slate-100">
        
        <div className="p-8 text-center pt-10">
          <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner border border-emerald-100">
            {isSettingUp ? <KeyRound className="w-8 h-8 text-emerald-500" /> : <Lock className="w-8 h-8 text-[#1e3a5f]" />}
          </div>
          
          <h2 className="text-2xl font-bold text-slate-800 mb-2">
            {isSettingUp ? 'Configura tu PIN' : 'Mensajes Seguros'}
          </h2>
          <p className="text-sm text-slate-500 font-medium mb-8">
            {isSettingUp 
              ? (setupStep === 'create' ? 'Crea un PIN de 4 dígitos para proteger tus conversaciones.' : 'Confirma tu PIN para asegurarnos de que sea el correcto.')
              : 'Ingresa tu PIN de 4 dígitos para acceder a tus conversaciones privadas.'}
          </p>

          <form onSubmit={isSettingUp ? (setupStep === 'create' ? handleCreatePinSubmit : handleConfirmPinSubmit) : handleUnlockSubmit}>
            <div className="mb-8">
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                autoFocus
                value={isSettingUp && setupStep === 'confirm' ? confirmPinValue : pinValue}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '');
                  if (isSettingUp && setupStep === 'confirm') {
                    setConfirmPinValue(val);
                  } else {
                    setPinValue(val);
                  }
                }}
                className="w-full text-center text-4xl tracking-widest font-bold border-b-2 border-slate-200 focus:border-[#4EF2C8] focus:outline-none bg-transparent py-2 text-slate-700 transition-colors"
                placeholder="••••"
              />
            </div>

            <Button 
              type="submit" 
              disabled={isSaving || (isSettingUp && setupStep === 'confirm' ? confirmPinValue.length !== 4 : pinValue.length !== 4)}
              className="w-full bg-[#112240] hover:bg-[#0a1526] text-white rounded-xl h-12 text-base font-bold shadow-md"
            >
              {isSaving ? 'Guardando...' : (isSettingUp ? (setupStep === 'create' ? 'Continuar' : 'Confirmar PIN') : 'Desbloquear')}
              {!isSaving && <ArrowRight className="w-4 h-4 ml-2" />}
            </Button>
          </form>
        </div>
        
        <div className="bg-slate-50 p-4 border-t border-slate-100 flex items-center justify-center gap-2">
           <ShieldCheck className="w-4 h-4 text-emerald-500" />
           <span className="text-xs font-medium text-slate-500">
             Protección de confidencialidad activa
           </span>
        </div>
      </div>
    </div>
  );
}
