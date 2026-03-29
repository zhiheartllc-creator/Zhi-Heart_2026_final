import { AdminNavBar } from '@/components/admin-nav-bar';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Main content, padding bottom for the mobile bottom bar */}
      <main className="pb-16 md:pb-0">
        {children}
      </main>
      
      {/* Admin specific navigation replacing standard nav */}
      <AdminNavBar />
    </div>
  );
}
