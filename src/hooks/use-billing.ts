'use client';

import { Capacitor } from '@capacitor/core';
import { useAuth } from './use-auth';
import { db } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { useState, useEffect } from 'react';

// Dynamically import RevenueCat so webpack doesn't bundle it at build time
// (it's a native-only Capacitor plugin that only works on Android/iOS)
// @ts-ignore
type PurchasesType = typeof import('@revenuecat/purchases-capacitor');

let PurchasesModule: PurchasesType | null = null;

async function getPurchases(): Promise<PurchasesType | null> {
  if (PurchasesModule) return PurchasesModule;
  try {
    // @ts-ignore
    PurchasesModule = await import('@revenuecat/purchases-capacitor');
    return PurchasesModule;
  } catch (e) {
    console.warn('RevenueCat not available:', e);
    return null;
  }
}

export const useBilling = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isNative, setIsNative] = useState(false);

  useEffect(() => {
    const platform = Capacitor.getPlatform();
    const isNativePlatform = platform === 'android' || platform === 'ios';
    setIsNative(isNativePlatform);

    if (isNativePlatform) {
      // Initialize RevenueCat dynamically
      const apiKey = process.env.NEXT_PUBLIC_RC_API_KEY_ANDROID || 'REPLACE_WITH_YOUR_RC_KEY';

      getPurchases().then((rc) => {
        if (!rc) return;
        rc.Purchases.setLogLevel({ level: rc.LOG_LEVEL.DEBUG });
        rc.Purchases.configure({
          apiKey,
          appUserID: user?.uid || undefined,
        });
      });
    }
  }, [user?.uid]);

  /**
   * Procesa la compra de un paquete específico (identificador configurado en RevenueCat)
   */
  const purchasePackage = async (packageIdentifier: string) => {
    if (!isNative) {
      alert('Las compras solo están disponibles en la aplicación móvil.');
      return false;
    }

    if (!user) {
      alert('Debes iniciar sesión para realizar una compra.');
      return false;
    }

    setIsLoading(true);
    try {
      const rc = await getPurchases();
      if (!rc) throw new Error('RevenueCat no disponible.');

      // Asegurar que el usuario está identificado en RC
      await rc.Purchases.logIn({ appUserID: user.uid });

      const offerings = await rc.Purchases.getOfferings();
      if (!offerings.current || offerings.current.availablePackages.length === 0) {
        throw new Error('No hay productos disponibles.');
      }

      const pkg = offerings.current.availablePackages.find(
        (p: any) => p.identifier === packageIdentifier
      );
      if (!pkg) {
        throw new Error(`Paquete ${packageIdentifier} no encontrado.`);
      }

      const { customerInfo } = await rc.Purchases.purchasePackage({ aPackage: pkg });

      // Verificamos si el entitlement "premium" está activo
      if (customerInfo.entitlements.active['premium'] !== undefined) {
        await updateDoc(doc(db, 'users', user.uid), {
          isPremium: true,
        });
        return true;
      }
    } catch (e: any) {
      // Los errores de cancelación del usuario suelen tener códigos específicos en RC
      if (e.code !== '1') {
        // 1 es a menudo USER_CANCELLED
        console.error('Error en la compra:', e);
        alert(e.message || 'Hubo un error al procesar la compra.');
      }
    } finally {
      setIsLoading(false);
    }
    return false;
  };

  /**
   * Restaura compras anteriores
   */
  const restorePurchases = async () => {
    if (!isNative || !user) return false;

    setIsLoading(true);
    try {
      const rc = await getPurchases();
      if (!rc) throw new Error('RevenueCat no disponible.');

      const { customerInfo } = await rc.Purchases.restorePurchases();
      if (customerInfo.entitlements.active['premium'] !== undefined) {
        await updateDoc(doc(db, 'users', user.uid), {
          isPremium: true,
        });
        alert('Tus compras han sido restauradas exitosamente.');
        return true;
      } else {
        alert('No se encontraron compras activas para restaurar.');
      }
    } catch (e: any) {
      console.error('Error al restaurar compras:', e);
      alert('Hubo un error al intentar restaurar tus compras.');
    } finally {
      setIsLoading(false);
    }
    return false;
  };

  return {
    purchasePackage,
    restorePurchases,
    isLoading,
    isNative,
  };
};
