"use client";

import { useState, useEffect, createContext, useContext } from 'react';
import { User, onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { auth, initGoogleAuth } from '@/lib/firebase';

// Definimos qué información nos dará este hook
interface AuthContextType {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

// Creamos el contexto con valores por defecto
const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signOut: async () => {},
});

// Este proveedor envolverá tu aplicación (lo usaremos en el layout)
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Inicializar Google Auth para plataformas nativas
    initGoogleAuth();

    // Escuchamos los cambios de sesión en Firebase
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      console.log('[USE-AUTH] onAuthStateChanged -> currentUser:', currentUser);
      setUser(currentUser);
      setLoading(false);
    });

    // Limpiamos la escucha cuando el componente se desmonta
    return () => unsubscribe();
  }, []);

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

// Exportamos el hook para que page.tsx y otras páginas lo puedan usar
export const useAuth = () => useContext(AuthContext);