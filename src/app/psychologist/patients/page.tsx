'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingAnimation } from '@/components/loading-animation';
import { Users, Search, MessageSquare, ChevronRight, User } from 'lucide-react';
import { Input } from '@/components/ui/input';
import Link from 'next/link';

interface Patient {
  id: string;
  userId: string;
  userName: string;
  reason: string;
  createdAt: any;
}

export default function PatientsListPage() {
  const { user, userProfile, loading } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user || userProfile?.role !== 'psychologist') return;

    const q = query(
      collection(db, 'requests'),
      where('psychologistId', '==', user.uid),
      where('status', '==', 'accepted')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedPatients: Patient[] = [];
      snapshot.forEach((doc) => {
        fetchedPatients.push({ id: doc.id, ...doc.data() } as Patient);
      });
      
      // Sort manually by date if needed, or by name
      fetchedPatients.sort((a, b) => a.userName.localeCompare(b.userName));
      
      setPatients(fetchedPatients);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching patients:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user, userProfile]);

  const filteredPatients = patients.filter(p => 
    p.userName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading || isLoading) return <LoadingAnimation />;

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <div className="bg-white px-6 pt-12 pb-6 rounded-b-3xl shadow-sm border-b border-slate-100 sticky top-0 z-20">
        <h1 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Users className="w-6 h-6 text-[#25b591]" />
          Mis Pacientes
        </h1>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre..."
            className="pl-10 h-11 bg-slate-50 border-slate-200 rounded-xl focus-visible:ring-[#4EF2C8]"
          />
        </div>
      </div>

      <div className="px-5 mt-6 flex-1">
        {patients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center text-slate-400">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <Users className="w-10 h-10 opacity-20" />
            </div>
            <p className="font-medium">Aún no tienes pacientes asignados.</p>
            <p className="text-sm mt-1 max-w-[200px]">Acepta solicitudes en tu panel para comenzar atendiendo a la comunidad.</p>
            <Link href="/psychologist/dashboard">
              <Button variant="outline" className="mt-6 border-[#4EF2C8] text-[#25b591] hover:bg-[#4EF2C8]/10 rounded-xl">
                Ir al Panel
              </Button>
            </Link>
          </div>
        ) : filteredPatients.length === 0 ? (
          <div className="text-center py-10 text-slate-400">
            <p>No se encontraron pacientes con "{searchTerm}"</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredPatients.map((patient) => (
              <Link key={patient.id} href={`/psychologist/patients/${patient.id}`}>
                <Card className="border-none shadow-sm rounded-2xl overflow-hidden hover:shadow-md transition-all active:scale-[0.98] mb-4">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-100">
                      <User className="w-6 h-6" />
                    </div>
                    
                    <div className="flex-1">
                      <h3 className="font-bold text-slate-800 leading-tight">{patient.userName}</h3>
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                        {patient.reason || 'Seguimiento general'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link href={`/messages/${patient.userId}`} className="p-2 text-slate-400 hover:text-[#25b591] transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MessageSquare className="w-5 h-5" />
                      </Link>
                      <ChevronRight className="w-5 h-5 text-slate-300" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
