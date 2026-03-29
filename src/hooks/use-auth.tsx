"use client";

import { useState, useEffect, createContext, useContext, useCallback, useRef } from 'react';
import { User, onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { auth, initGoogleAuth } from '@/lib/firebase';

// Definimos qué información nos dará este hook
interface AuthContextType {
  user: User | null;
  loading: boolean;
  initializing: boolean;
  justSignedIn: boolean;
  signOut: () => Promise<void>;
  markJustSignedIn: () => void;
  userProfile: any | null;
}

// Creamos el contexto con valores por defecto
const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  initializing: true,
  justSignedIn: false,
  signOut: async () => {},
  markJustSignedIn: () => {},
  userProfile: null,
});

// Este proveedor envolverá tu aplicación (lo usaremos en el layout)
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  // initializing: true hasta que Firebase resuelva el estado de auth persistido.
  // Esto previene redireciones falsas (user=null transitorio) en Android static export.
  const [initializing, setInitializing] = useState(true);
  // justSignedIn: flag temporal que indica que un login acaba de ocurrir.
  // Esto previene que dashboard redirija a login antes de que onAuthStateChanged propague el usuario.
  const [justSignedIn, setJustSignedIn] = useState(false);
  const [userProfile, setUserProfile] = useState<any | null>(null);
  const justSignedInTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const markJustSignedIn = useCallback(() => {
    console.log('[USE-AUTH] markJustSignedIn() called — dashboard redirect protection active');
    setJustSignedIn(true);
    // Auto-limpiar después de 10 segundos por seguridad
    if (justSignedInTimerRef.current) clearTimeout(justSignedInTimerRef.current);
    justSignedInTimerRef.current = setTimeout(() => {
      console.log('[USE-AUTH] justSignedIn auto-cleared after 10s');
      setJustSignedIn(false);
    }, 10000);
  }, []);

  useEffect(() => {
    // Inicializar Google Auth para plataformas nativas
    initGoogleAuth();

    // authStateReady() es una Promise que se resuelve cuando Firebase
    // ha terminado de restaurar la sesión persistida (IndexedDB/cookie).
    // Sin esto, onAuthStateChanged dispara null antes de resolver el usuario real.
    auth.authStateReady().then(() => {
      console.log('[USE-AUTH] authStateReady resolved, user:', auth.currentUser?.email || 'null');
      setInitializing(false);
    });

    // Escuchamos los cambios de sesión en Firebase
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      console.log('[USE-AUTH] onAuthStateChanged -> currentUser:', currentUser?.email || 'null');
      setUser(currentUser);
      setLoading(false);
      // Fetch user profile from Firestore to get `role` and other details
      if (currentUser) {
         import('firebase/firestore').then(({ doc, getDoc }) => {
            import('@/lib/firebase').then(({ db }) => {
               getDoc(doc(db, 'users', currentUser.uid)).then((document) => {
                  if (document.exists()) {
                     const data = document.data();
                     
                     setUserProfile(data);
                  }
               }).catch(console.error);
            }).catch(console.error);
         }).catch(console.error);
      } else {
         setUserProfile(null);
      }

      // Si detectamos un usuario después de un login reciente, limpiamos el flag
      if (currentUser && justSignedInTimerRef.current) {
        console.log('[USE-AUTH] User detected after sign-in, clearing justSignedIn flag');
        setJustSignedIn(false);
        clearTimeout(justSignedInTimerRef.current);
        justSignedInTimerRef.current = null;
      }
    });

    // Limpiamos la escucha cuando el componente se desmonta
    return () => {
      unsubscribe();
      if (justSignedInTimerRef.current) clearTimeout(justSignedInTimerRef.current);
    };
  }, []);

  const signOut = async () => {
    await firebaseSignOut(auth);
    setUserProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, initializing, justSignedIn, signOut, markJustSignedIn, userProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

// Exportamos el hook para que page.tsx y otras páginas lo puedan usar
export const useAuth = () => useContext(AuthContext);