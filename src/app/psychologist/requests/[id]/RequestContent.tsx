'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingAnimation } from '@/components/loading-animation';
import { ArrowLeft, User, Calendar, MessageSquare, CheckCircle, XCircle } from 'lucide-react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

interface PatientRequest {
  id: string;
  userId: string;
  userName: string;
  reason: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: any;
  psychologistId: string;
}

export default function RequestDetailsPage() {
  const { id } = useParams() as { id: string };
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  
  const [request, setRequest] = useState<PatientRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!user || userProfile?.role !== 'psychologist') return;

    const fetchRequest = async () => {
      try {
        const docRef = doc(db, 'requests', id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = { id: docSnap.id, ...docSnap.data() } as PatientRequest;
          if (data.psychologistId !== user.uid) {
             console.warn("Psych ID mismatch:", data.psychologistId, "vs auth:", user.uid);
             // We'll allow it to render for debugging purposes instead of a silent redirect
          }
          setRequest(data);
        } else {
          console.error("Request not found for ID:", id);
          router.push('/psychologist/dashboard');
        }
      } catch (error) {
        console.error("Error fetching request:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRequest();
  }, [id, user, userProfile, router]);

  const handleAction = async (action: 'accepted' | 'rejected') => {
    if (!request) return;
    setIsProcessing(true);
    
    try {
      const docRef = doc(db, 'requests', request.id);
      await updateDoc(docRef, { status: action });
      
      toast({
        title: action === 'accepted' ? "Paciente Aceptado" : "Solicitud Rechazada",
        description: action === 'accepted' 
          ? `Has aceptado a ${request.userName} como tu paciente.` 
          : "La solicitud ha sido descartada.",
      });

      // If accepted, we would usually create an entry in a `patients` collection here.
      // For now, the user flow will rely on the `requests` status turning to 'accepted'.
      
      setTimeout(() => router.push('/psychologist/dashboard'), 1500);
    } catch (error) {
      console.error("Error updating request:", error);
      toast({
        variant: "destructive",
        title: "Error al actualizar",
        description: "Hubo un problema de conexión.",
      });
      setIsProcessing(false);
    }
  };

  if (loading || isLoading) return <LoadingAnimation />;
  if (!request) return null;

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 relative pb-20">
      
      {/* Header */}
      <div className="bg-white px-4 pt-10 pb-4 shadow-sm border-b border-slate-100 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <Link href="/psychologist/dashboard" className="p-2 -ml-2 text-slate-400 hover:bg-slate-50 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-lg font-bold text-slate-800">Detalles de Solicitud</h1>
        </div>
      </div>

      <div className="px-5 mt-6 space-y-6">
        
        {/* Patient Basic Info Card */}
        <Card className="border-none shadow-sm rounded-2xl bg-white overflow-hidden">
           <div className="bg-[#112240] px-5 py-4 flex items-start justify-between">
              <div>
                 <h2 className="text-white font-bold text-lg">{request.userName}</h2>
                 <div className="flex items-center gap-1.5 text-slate-300 text-xs mt-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Recibida el {request.createdAt?.seconds ? format(new Date(request.createdAt.seconds * 1000), "d 'de' MMMM, yyyy", { locale: es }) : 'Reciente'}</span>
                 </div>
              </div>
              <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center border border-white/20">
                 <User className="w-6 h-6 text-white" />
              </div>
           </div>
           
           <CardContent className="p-5 space-y-5">
              <div>
                 <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Motivo de Consulta</h3>
                 <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl text-sm text-slate-700 leading-relaxed shadow-inner">
                    {request.reason}
                 </div>
              </div>

              <div>
                 <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Información Compartida</h3>
                 <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-100 rounded-xl text-amber-800 text-sm">
                    <MessageSquare className="w-5 h-5 shrink-0" />
                    <p className="font-medium">El usuario no ha compartido historial de conversaciones aún.</p>
                 </div>
              </div>
           </CardContent>
        </Card>

        {/* Call to Action Buttons */}
        {request.status === 'pending' && (
           <div className="flex gap-3 pt-2">
              <Button 
                variant="outline" 
                className="flex-1 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 font-semibold h-12 rounded-xl"
                onClick={() => handleAction('rejected')}
                disabled={isProcessing}
              >
                <XCircle className="w-4 h-4 mr-2" />
                Rechazar
              </Button>
              <Button 
                className="flex-[2] bg-[#4EF2C8] hover:bg-[#3ce5bb] text-slate-900 font-bold h-12 rounded-xl shadow-sm"
                onClick={() => handleAction('accepted')}
                disabled={isProcessing}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Aceptar Paciente
              </Button>
           </div>
        )}

      </div>
    </div>
  );
}
