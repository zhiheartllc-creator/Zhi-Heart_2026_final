'use client';

import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <h2 className="text-2xl font-bold mb-4">Página no encontrada</h2>
      <p className="text-muted-foreground mb-8">
        Lo sentimos, no pudimos encontrar lo que buscabas.
      </p>
      <Link 
        href="/dashboard"
        className="px-6 py-3 bg-primary text-primary-foreground rounded-full font-medium"
      >
        Volver al Inicio
      </Link>
    </div>
  );
}
