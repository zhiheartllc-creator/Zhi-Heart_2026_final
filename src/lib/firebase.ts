'use client';

import { initializeApp, getApps, getApp, FirebaseOptions } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, linkWithPopup, updateProfile, type User, EmailAuthProvider, reauthenticateWithCredential, sendPasswordResetEmail } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, getDoc, serverTimestamp, deleteDoc, initializeFirestore, persistentLocalCache, persistentMultipleTabManager, updateDoc } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
// ⚠️ NOTA DE RUTA: Asegúrate de que las carpetas "@/firebase/error-emitter" y "@/firebase/errors" existan, 
// o cambia la ruta a "@/lib/..." si guardaste esos archivos allí.
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

// ---------------------------------------------------------------------------
// 1. CONFIGURACIÓN PRINCIPAL DE FIREBASE
// Aquí están las llaves de tu proyecto "studio-2141942949-c8e1e" (Zhi.io)
// ---------------------------------------------------------------------------
const firebaseConfig: FirebaseOptions = {
  apiKey: "AIzaSyBGjpAon3Ubav2uNkyGOa_8TWFlrmbbCSM",
  authDomain: "studio-2141942949-c8e1e.firebaseapp.com",
  projectId: "studio-2141942949-c8e1e",
  storageBucket: "studio-2141942949-c8e1e.firebasestorage.app",
  messagingSenderId: "535312456048",
  appId: "1:535312456048:web:9f2e5bff353b3ea3ab57b5",
  measurementId: "G-MH0KYT3EF6",
};

// Inicializamos la app. El condicional !getApps().length evita que Next.js 
// intente inicializar Firebase varias veces y cause un error de "App already exists".
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// ---------------------------------------------------------------------------
// 2. CONFIGURACIÓN DE BASE DE DATOS (Con soporte Offline Multipesataña)
// ---------------------------------------------------------------------------
let db: any;
try {
  // Intentamos activar la caché local persistente con soporte multi-pestaña. 
  // Esto permite que el usuario lea y escriba en el diario aunque no tenga internet,
  // y previene el error 'failed-precondition' cuando abre la app en varias pestañas.
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  });
} catch (error: any) {
  console.error("Firebase persistence error", error);
  // Si el navegador no soporta caché (ej. modo incógnito estricto), 
  // usamos la base de datos estándar en memoria.
  db = getFirestore(app); 
}

// ---------------------------------------------------------------------------
// 3. INICIALIZACIÓN DE SERVICIOS ADICIONALES
// ---------------------------------------------------------------------------
const auth = getAuth(app);
const storage = getStorage(app);
const googleProvider = new GoogleAuthProvider();

// El mensajero (Push Notifications) solo funciona en el cliente (navegador).
// Comprobamos que 'window' exista para que Next.js no falle al compilar en el servidor.
const messaging = typeof window !== 'undefined' ? getMessaging(app) : null;

// ---------------------------------------------------------------------------
// 4. FUNCIONES DE GESTIÓN DE USUARIOS
// ---------------------------------------------------------------------------

/**
 * Crea o actualiza el documento de perfil del usuario en Firestore.
 * Si el usuario se registra por primera vez, guarda su email, nombre y foto.
 */
const createUserProfileDocument = async (user: import('firebase/auth').User, additionalData: object = {}) => {
  if (!user) return;
  
  const userRef = doc(db, 'users', user.uid);
  
  try {
    const snapshot = await getDoc(userRef);

    // Si el documento NO existe (es un usuario nuevo), lo creamos.
    if (!snapshot.exists()) {
      const { email, displayName, photoURL } = user;
      const createdAt = serverTimestamp();
      
      await setDoc(userRef, {
        uid: user.uid,
        name: displayName,
        email,
        photoURL,
        createdAt,
        ...additionalData,
      });
    }
  } catch (error) {
    console.error('[FIREBASE] Error in createUserProfileDocument:', error);
    // No lanzamos el error para no bloquear el login si Firestore falla momentáneamente
  }
  return userRef;
};

// ---------------------------------------------------------------------------
// 5. FUNCIONES DE AUTENTICACIÓN (Login / Registro)
// ---------------------------------------------------------------------------

/**
 * Inicializa el plugin de Google Auth para plataformas nativas.
 */
const initGoogleAuth = async () => {
  const isNative = typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform();
  if (!isNative) return;

  try {
    const { GoogleAuth } = await import('@codetrix-studio/capacitor-google-auth');
    await GoogleAuth.initialize({
      clientId: '535312456048-3p0o2d6boen6g01qcool6g7l0t761pmr.apps.googleusercontent.com',
      scopes: ['profile', 'email'],
      grantOfflineAccess: true,
    });
    console.log('[FIREBASE] GoogleAuth initialized successfully');
  } catch (err) {
    console.error('[FIREBASE] Failed to initialize GoogleAuth:', err);
  }
};

const signInWithGoogle = async () => {
  const result = await signInWithPopup(auth, googleProvider);
  await createUserProfileDocument(result.user);
  return result;
};

const signInWithGoogleNative = async () => {
  try {
    const { GoogleAuth } = await import('@codetrix-studio/capacitor-google-auth');
    const { GoogleAuthProvider: FirebaseAuthProvider, signInWithCredential } = await import('firebase/auth');

    // Aseguramos que esté inicializado
    await initGoogleAuth();

    console.log('[FIREBASE] Starting GoogleAuth.signIn()...');
    const googleUser = await GoogleAuth.signIn();
    console.log('[FIREBASE] googleUser data received:', JSON.stringify(googleUser));

    const idToken = googleUser?.authentication?.idToken;
    if (!idToken) {
      console.error('[FIREBASE] Missing idToken in googleUser:', googleUser);
      throw new Error('Google Sign-In no devolvió un idToken. Verifica la configuración en Firebase.');
    }

    const credential = FirebaseAuthProvider.credential(idToken);
    const result = await signInWithCredential(auth, credential);
    console.log('[FIREBASE] Firebase Sign-In successful for:', result.user.email);
    
    await createUserProfileDocument(result.user);
    return result;
  } catch (error) {
    console.error('[FIREBASE] Error in native Google Auth:', error);
    throw error;
  }
};

const signUpWithEmail = async (email: string, password: string, name?: string, profileData?: any) => {
  const result = await createUserWithEmailAndPassword(auth, email, password);
  // Si nos pasaron un nombre en el formulario, actualizamos el perfil de Firebase Auth
  if (name) {
    await updateProfile(result.user, { displayName: name });
  }
  // Guardamos los datos extra (como edad, país, etc.) en Firestore
  await createUserProfileDocument(result.user, { 
      name: name || email.split('@')[0], // Si no hay nombre, usa la primera parte del correo
      ...profileData 
  });
  return result;
};

const signInWithEmail = (email: string, password: string) => {
  return signInWithEmailAndPassword(auth, email, password);
};

const signOutUser = () => signOut(auth);

// ---------------------------------------------------------------------------
// 6. FUNCIÓN AVANZADA: VINCULAR CUENTAS (Linking)
// Permite a un usuario que entró con Email conectarse luego con Google sin perder datos.
// ---------------------------------------------------------------------------
const linkWithGoogle = async () => {
  if (!auth.currentUser) {
    throw new Error('No user is currently signed in.');
  }

  try {
    const result = await linkWithPopup(auth.currentUser, googleProvider);
    const user = result.user;
    // Buscamos si Google nos devolvió datos extra de perfil
    const googleData = result.providerId === 'google.com' ? result.user.providerData.find(p => p.providerId === 'google.com') : null;

    if (googleData) {
      const userRef = doc(db, 'users', user.uid);
      const dataToUpdate: { name?: string | null; photoURL?: string | null } = {};

      // Solo actualizamos si Google tiene mejor información que la que ya teníamos
      if (!user.displayName || user.displayName !== googleData.displayName) {
          dataToUpdate.name = googleData.displayName;
      }
      if (!user.photoURL || user.photoURL !== googleData.photoURL) {
          dataToUpdate.photoURL = googleData.photoURL;
      }

      // Si hubo cambios, los guardamos en Firestore (merge: true evita borrar lo que ya existía)
      if (Object.keys(dataToUpdate).length > 0) {
          await updateProfile(user, {
              displayName: dataToUpdate.name ?? user.displayName,
              photoURL: dataToUpdate.photoURL ?? user.photoURL,
          });
          await setDoc(userRef, dataToUpdate, { merge: true });
      }
    }
    return result;

  } catch (error: any) {
    // Si Firebase exige que el usuario confirme su identidad antes de vincular...
    if (error.code === 'auth/requires-recent-login' && auth.currentUser?.email) {
      const password = prompt('Para vincular tu cuenta, por favor, introduce tu contraseña actual.');
      if (password) {
        const credential = EmailAuthProvider.credential(auth.currentUser.email, password);
        await reauthenticateWithCredential(auth.currentUser, credential);
        return await linkWithGoogle(); // Reintentamos después de confirmar
      } else {
        throw new Error('Contraseña requerida para vincular la cuenta.');
      }
    }
    throw error;
  }
};

const sendPasswordReset = async (email: string) => {
    return sendPasswordResetEmail(auth, email);
};

// ---------------------------------------------------------------------------
// 7. FUNCIONES DE NOTIFICACIONES PUSH (FCM)
// Estas funciones ligan el navegador del usuario con tu servidor para enviarle alertas.
// ---------------------------------------------------------------------------
const saveSubscription = async (userId: string, fcmToken: string) => {
  const userDocRef = doc(db, 'users', userId);
  await updateDoc(userDocRef, {
    fcmToken: fcmToken,
    fcmTokenTimestamp: serverTimestamp() // Saber cuándo se generó el token
  });
};

const deleteFcmToken = async (userId: string) => {
    const userDocRef = doc(db, 'users', userId);
    await updateDoc(userDocRef, {
        fcmToken: null,
        fcmTokenTimestamp: serverTimestamp()
    });
};

// PushNotifications is lazy-loaded inside initializePushNotifications to avoid crashing in web

const initializePushNotifications = async () => {
  try {
    const isNative = typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform();
    if (!isNative) return;

    // Dynamic import to avoid crashing in web/PWA environment
    const { PushNotifications } = await import('@capacitor/push-notifications');

    let permStatus = await PushNotifications.checkPermissions();

    if (permStatus.receive === 'prompt') {
      permStatus = await PushNotifications.requestPermissions();
    }

    if (permStatus.receive !== 'granted') {
      console.warn('[FIREBASE] User denied push notifications permissions');
      return;
    }

    await PushNotifications.register();

    PushNotifications.addListener('registration', async (token) => {
      console.log('[FIREBASE] Push registration success, token:', token.value);
      if (auth.currentUser) {
        await saveSubscription(auth.currentUser.uid, token.value);
      }
    });

    PushNotifications.addListener('registrationError', (error) => {
      console.error('[FIREBASE] Error on push registration:', error);
    });

    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('[FIREBASE] Push received:', notification);
    });

    PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
      console.log('[FIREBASE] Push action performed:', notification);
    });

  } catch (err) {
    console.error('[FIREBASE] Error initializing push notifications:', err);
  }
};


// ---------------------------------------------------------------------------
// 8. EXPORTACIONES
// Hacemos que todas estas herramientas estén disponibles para el resto de la app.
// ---------------------------------------------------------------------------
export {
  app,
  auth,
  db,
  storage,
  messaging,
  getToken,
  onMessage,
  googleProvider,
  createUserProfileDocument,
  signInWithGoogle,
  signInWithGoogleNative,
  initGoogleAuth,
  signUpWithEmail,
  signInWithEmail,
  signOutUser,
  linkWithGoogle,
  updateProfile,
  sendPasswordReset,
  saveSubscription,
  deleteFcmToken,
  initializePushNotifications,
};