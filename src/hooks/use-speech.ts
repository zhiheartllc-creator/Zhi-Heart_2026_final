'use client';

import { useEffect, useCallback, useState } from 'react';

export function useSpeech() {
  const [isMuted, setIsMuted] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    if (typeof window !== 'undefined') {
      const storedMute = localStorage.getItem('zhi_voice_muted');
      if (storedMute === 'true') {
        setIsMuted(true);
      }
      
      // Pre-load voices on mount
      if ('speechSynthesis' in window) {
        window.speechSynthesis.getVoices();
      }
    }
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const newState = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('zhi_voice_muted', String(newState));
        if (newState && 'speechSynthesis' in window) {
           window.speechSynthesis.cancel();
        }
      }
      return newState;
    });
  }, []);

  const speak = useCallback((text: string) => {
    if (!isClient || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    
    if (isMuted || !text) {
        return;
    }

    try {
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'es-MX'; 
      utterance.rate = 0.85; 
      utterance.pitch = 0.95; 
      
      const voices = window.speechSynthesis.getVoices();
      
      // Priorities for Latin Female Voices
      const preferredNames = [
        'sabina', 'paulina', 'google español de estados unidos', 'mia', 'sofia', 'victoria', 'lucia'
      ];
      
      let selectedVoice = voices.find(v => 
        preferredNames.some(name => v.name.toLowerCase().includes(name))
      );

      if (!selectedVoice) {
        const latinVoices = voices.filter(v => 
          v.lang.includes('es-') && !v.lang.includes('es-ES')
        );
        
        selectedVoice = latinVoices.find(v => 
          v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('mujer')
        );
        
        if (!selectedVoice && latinVoices.length > 0) {
          selectedVoice = latinVoices[0];
        }
      }

      if (!selectedVoice) {
        selectedVoice = voices.find(v => 
          v.name.toLowerCase().includes('laura') || 
          v.name.toLowerCase().includes('monica') || 
          v.name.toLowerCase().includes('helena')
        );
      }
      
      if (!selectedVoice) {
        selectedVoice = voices.find(v => v.lang.startsWith('es'));
      }
      
      if (selectedVoice) {
        utterance.voice = selectedVoice;
        utterance.lang = selectedVoice.lang;
      }
      
      window.speechSynthesis.speak(utterance);
    } catch (error) {
       console.error("Speech synthesis error:", error);
    }

  }, [isMuted, isClient]);

  const cancelSpeech = useCallback(() => {
    if (isClient && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }, [isClient]);

  return { speak, cancelSpeech, isMuted, toggleMute };
}
