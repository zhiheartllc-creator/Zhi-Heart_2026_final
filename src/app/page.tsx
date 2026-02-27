'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { ArrowRight, Volume2, VolumeX } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { SplashScreen } from '@/components/splash-screen';
import animationData from '@/lib/lottie-animation.json';

import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { LoadingAnimation } from '@/components/loading-animation';
import { useSpeech } from '@/hooks/use-speech';

export default function Home() {
  const [showSplash, setShowSplash] = useState(true);
  const { user, loading: authLoading } = useAuth();
  const { speak, isMuted, toggleMute } = useSpeech();

  const hasStartedMusicRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      audioRef.current = new Audio('/Zhi_music.mp3');
      audioRef.current.volume = 0.3;
      audioRef.current.loop = false;
    }
  }, []);

  useEffect(() => {
    if (!showSplash && !authLoading && !user && !isMuted && !hasStartedMusicRef.current) {
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.play()
            .then(() => { hasStartedMusicRef.current = true; })
            .catch((e: any) => console.log("Music play blocked:", e));
        }
      }, 500);
    }
  }, [showSplash, authLoading, user, isMuted]);

  const handleSplashFinished = () => setShowSplash(false);
  const router = useRouter();

  useEffect(() => {
    if (user && !showSplash && !authLoading) {
      router.push('/dashboard');
    }
  }, [user, showSplash, authLoading, router]);

  if (authLoading) return <LoadingAnimation />;
  if (showSplash) return <SplashScreen animationData={animationData} onFinished={handleSplashFinished} />;

  return (
    // h-[100dvh] = altura exacta de la pantalla visible, sin scroll
    <div className="h-[100dvh] flex flex-col items-center bg-slate-50 relative overflow-hidden px-5"
         style={{ paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>

      {/* Fondo suave */}
      <div className="absolute top-0 left-0 right-0 h-48 bg-gradient-to-b from-slate-100 to-transparent pointer-events-none" />

      {/* Botón de silencio — top right */}
      <div className="absolute top-3 right-4 z-20">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleMute}
          className="rounded-full bg-white/50 backdrop-blur-sm hover:bg-slate-200/50 text-slate-600 w-9 h-9"
          title={isMuted ? "Activar música" : "Silenciar música"}
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </Button>
      </div>

      {/* Logo — compacto */}
      <div className="w-full flex justify-center pt-8 pb-3 z-10 relative shrink-0">
        <Image src="/nombre_zhi.png" width={160} height={55} alt="Zhi" className="object-contain" priority />
      </div>

      {/* Imagen hero — flex-1 para ocupar el espacio disponible, sin desbordarse */}
      <div className="w-full max-w-md relative rounded-3xl overflow-hidden shadow-md ring-1 ring-slate-200/50 z-10 shrink-0"
           style={{ height: '36vh' }}>
        <Image
          src="/Corazon_Zhi.jpg"
          alt="Corazón Zhi"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/10" />
      </div>

      {/* Texto — compacto, sin márgenes grandes */}
      <div className="text-center z-10 relative mt-4 shrink-0 px-2">
        <h1 className="font-display text-slate-800 font-medium text-[22px] leading-snug">
          Tu compañero emocional,
        </h1>
        <h2 className="font-display text-slate-900 font-bold text-[22px] leading-snug">
          <span className="inline-block animate-float">siempre contigo</span>
        </h2>
        <p className="text-[12.5px] leading-relaxed text-slate-500 mt-2 max-w-xs mx-auto">
          Zhi te escucha sin juzgar, te acompaña en tus días difíciles y te guía hacia el bienestar emocional.
        </p>
      </div>

      {/* Botones de acción */}
      <div className="flex flex-col w-full max-w-xs gap-3 z-10 relative mt-5 shrink-0">
        <Button asChild className="w-full h-12 rounded-full bg-[#0F2040] hover:bg-[#162f5e] text-white font-medium text-base shadow-md">
          <Link href="/signup">
            Comienza gratis <ArrowRight className="ml-2 w-4 h-4" />
          </Link>
        </Button>

        <Button asChild variant="outline" className="w-full h-12 rounded-full bg-white border-slate-200 text-slate-700 font-medium text-base hover:bg-slate-50">
          <Link href="/login">
            Iniciar Sesión
          </Link>
        </Button>
      </div>

      {/* Footer minimalista */}
      <p className="text-[10px] text-slate-400 text-center mt-auto pb-2 z-10 relative shrink-0">
        © 2026 Zhi Heart Enterprises LLC · Rafael Hurtado
      </p>

    </div>
  );
}