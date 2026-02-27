"use client";

import React, { useEffect, useState } from 'react';
import Lottie from 'lottie-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SplashScreenProps {
  animationData: any;
  onFinished: () => void;
}

export function SplashScreen({ animationData, onFinished }: SplashScreenProps) {
  const [isShowing, setIsShowing] = useState(true);

  // Un respaldo de seguridad: si la animación falla o se queda pegada, 
  // quitamos el splash screen después de 3.5 segundos para no bloquear al usuario.
  useEffect(() => {
    const timer = setTimeout(() => {
      handleComplete();
    }, 3500);
    return () => clearTimeout(timer);
  }, []);

  const handleComplete = () => {
    setIsShowing(false);
    // Esperamos 500ms para que termine la animación de opacidad antes de avisarle al page.tsx
    setTimeout(onFinished, 500);
  };

  return (
    <AnimatePresence>
      {isShowing && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background"
        >
          <div className="w-64 h-64 md:w-96 md:h-96">
            {/* Validamos que el JSON de la animación no esté vacío */}
            {animationData && Object.keys(animationData).length > 0 ? (
              <Lottie 
                animationData={animationData} 
                loop={false} 
                onComplete={handleComplete}
              />
            ) : (
              // Si no hay animación, mostramos un texto pulsante elegante
              <div className="flex items-center justify-center h-full text-2xl font-headline text-primary animate-pulse">
                Zhi.io
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}