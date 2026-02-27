'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';
import { auth, signInWithGoogle, signInWithGoogleNative } from '@/lib/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { Capacitor } from '@capacitor/core'; 

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Redirigir al dashboard si ya hay sesión iniciada
  useEffect(() => {
    if (!authLoading && user) {
      console.log('[LOGIN] Usuario ya autenticado, redirigiendo a dashboard...');
      router.push('/dashboard');
    }
  }, [user, authLoading, router]);


  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push('/dashboard');
    } catch (error: any) {
      toast({ 
        variant: 'destructive', 
        title: 'Error de inicio de sesión', 
        description: 'Credenciales inválidas. Por favor, inténtalo de nuevo.' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      if (Capacitor.isNativePlatform()) {
        console.log('[LOGIN] iniciando Google login nativo');
        await signInWithGoogleNative();
        // En nativo, NO hacemos router.push aquí. La redirección la maneja el
        // useEffect de abajo que observa el estado de autenticación confirmado.
        console.log('[LOGIN] Google nativo completado, esperando onAuthStateChanged...');
      } else {
        console.log('[LOGIN] iniciando Google login web');
        await signInWithGoogle();
        // En web el popup es sincrónico con el state, podemos navegar directamente.
        router.push('/dashboard');
      }
    } catch (error: any) {
      console.error('[LOGIN] Error:', error);
      toast({ 
        variant: 'destructive', 
        title: 'Error de inicio de sesión', 
        description: error.message || 'Error al conectar con Google'
      });
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-4 relative overflow-hidden">
      {/* Background Decorators */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <Image src="/Corazon_Zhi.jpg" alt="Background" fill className="object-cover opacity-20" priority />
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-white/40 to-white/10 pointer-events-none z-0" />

      {/* Zhi Logo */}
      <div className="mb-6 z-10 flex flex-col items-center">
        <Image src="https://i.imgur.com/SN7UgJ3.jpeg" alt="Zhi" width={64} height={64} className="rounded-2xl shadow-sm mb-3" />
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Zhi</h1>
      </div>

      <div className="w-full max-w-[420px] relative z-10">
        <Card className="border-slate-200 shadow-sm rounded-xl overflow-hidden bg-white/95 backdrop-blur-sm">
          <CardContent className="p-6 flex flex-col gap-4">
            <div className="text-center space-y-2 mb-4">
              <h2 className="text-2xl font-bold text-slate-800">Bienvenido</h2>
              <p className="text-slate-400">Inicia sesión para continuar</p>
            </div>

            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-800">Correo Electrónico</label>
                <Input 
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@ejemplo.com"
                  className="h-12 bg-slate-50 border-slate-200"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-slate-800">Contraseña</label>
                  <a href="#" className="text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors">
                    ¿Olvidaste tu contraseña?
                  </a>
                </div>
                <Input 
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-12 bg-slate-50 border-slate-200 tracking-widest"
                  required
                />
              </div>

              <Button 
                type="submit" 
                disabled={loading || googleLoading}
                className="w-full h-12 bg-[#0F2040] hover:bg-[#162f5e] text-white font-medium rounded-lg mt-2"
              >
                {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
              </Button>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-3 text-slate-400 font-medium bg-white/95 backdrop-blur-sm">O</span>
              </div>
            </div>

            <Button 
              variant="outline" 
              onClick={handleGoogleLogin}
              disabled={loading || googleLoading}
              className="w-full h-12 bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700 font-medium rounded-lg"
            >
              <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.58c2.08-1.92 3.27-4.74 3.27-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Iniciar sesión con Google
            </Button>

            <div className="mt-6 text-center text-sm text-slate-400">
              ¿No tienes una cuenta? <Link href="/signup" className="text-slate-400 underline decoration-slate-300 font-medium hover:text-slate-600 transition-colors">Regístrate aquí</Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer legal */}
      <footer className="w-full max-w-[420px] mx-auto mt-8 mb-4 text-xs text-center text-slate-400 z-20">
        © 2026 Zhi Heart Enterprises LLC • Creado con propósito por Rafael Hurtado • zhiheart.llc@gmail.com
      </footer>
    </div>
  );
}