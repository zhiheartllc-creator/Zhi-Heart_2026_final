import type { Metadata, Viewport } from 'next';
import './globals.css';
// Cambiamos a importación con llaves para asegurar que React encuentre la función exacta
import { ClientLayout } from "@/components/client-layout";
import { BottomNavBar } from "@/components/bottom-nav-bar";

const APP_NAME = "Zhi";
const APP_DESCRIPTION = "Your companion for emotional well-being.";

export const metadata: Metadata = {
  title: APP_NAME,
  description: APP_DESCRIPTION,
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "https://i.imgur.com/SN7UgJ3.jpeg",
  }
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: 'white',
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased min-h-screen flex flex-col leading-relaxed" style={{ paddingBottom: 'calc(4rem + env(safe-area-inset-bottom, 0px))' }}>
        {/* Usamos el componente importado con llaves */}
        <ClientLayout>
          {children}
          <BottomNavBar />
        </ClientLayout>
      </body>
    </html>
  );
}