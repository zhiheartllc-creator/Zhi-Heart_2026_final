'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingAnimation } from '@/components/loading-animation';
import { ArrowLeft, User, FileText, Lock, Save, History as HistoryIcon, ShieldAlert, MessageSquare } from 'lucide-react';
import { doc, getDoc, collection, query, where, getDocs, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Textarea } from '@/components/ui/textarea';

interface PatientRequest {
  id: string;
  userId: string;
  userName: string;
  reason: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: any;
  psychologistId: string;
}

export default function PatientProfilePage() {
  const { id } = useParams() as { id: string };
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  
  const [patientData, setPatientData] = useState<PatientRequest | null>(null);
  const [privateNotes, setPrivateNotes] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [sharedFiles, setSharedFiles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user || userProfile?.role !== 'psychologist') return;

    const fetchPatientData = async () => {
      try {
        // Technically this `id` is the request ID that became 'accepted'
        // In a fully scaled DB, we'd query the `patients` assigned to this psychologist instead
        const docRef = doc(db, 'requests', id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = { id: docSnap.id, ...docSnap.data() } as PatientRequest;
          if (data.psychologistId === user.uid && data.status === 'accepted') {
            setPatientData(data);
            
            // Try fetch private notes for this specific relationship
            const notesRef = doc(db, 'users', user.uid, 'privateNotes', data.userId);
            const notesSnap = await getDoc(notesRef);
            if (notesSnap.exists()) {
              setPrivateNotes(notesSnap.data().notes || '');
            }

            // Try fetch shared items from the user (simulate sharing protocol)
            const sharedQ = query(
               collection(db, 'users', data.userId, 'chatHistory'),
               where('sharedWithTherapist', '==', true)
            );
            const sharedSnap = await getDocs(sharedQ);
            const items: any[] = [];
            sharedSnap.forEach((ds) => {
               items.push({ id: ds.id, ...ds.data() });
            });
            setSharedFiles(items);

          } else {
            router.push('/psychologist/dashboard');
          }
        } else {
          router.push('/psychologist/dashboard');
        }
      } catch (error) {
        console.error("Error fetching patient:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPatientData();
  }, [id, user, userProfile, router]);

  const handleSaveNotes = async () => {
    if (!user || !patientData) return;
    setIsSavingNotes(true);
    try {
      const notesRef = doc(db, 'users', user.uid, 'privateNotes', patientData.userId);
      await setDoc(notesRef, {
         patientId: patientData.userId,
         notes: privateNotes,
         updatedAt: new Date()
      }, { merge: true });
      
      toast({
        title: "Notas Guardadas",
        description: "Tus anotaciones privadas se han guardado con éxito.",
      });
    } catch (error) {
      console.error("Error saving notes:", error);
      toast({
        variant: "destructive",
        title: "Error al guardar",
        description: "No se pudieron guardar las notas.",
      });
    } finally {
      setIsSavingNotes(false);
    }
  };

  if (loading || isLoading) return <LoadingAnimation />;
  if (!patientData) return null;

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 relative pb-20">
      
      {/* Header */}
      <div className="bg-[#1e3a5f] px-4 pt-10 pb-6 shadow-sm border-b border-indigo-900 sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <Link href="/psychologist/dashboard" className="p-2 -ml-2 text-slate-300 hover:bg-slate-800/50 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1">
             <h1 className="text-xl font-bold text-white">{patientData.userName}</h1>
             <p className="text-xs text-slate-400 font-medium tracking-wide uppercase mt-0.5">Paciente Activo</p>
          </div>
          <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center border border-white/20">
             <User className="w-5 h-5 text-white" />
          </div>
        </div>
      </div>

      <div className="px-5 mt-6 space-y-6">

        <div className="flex gap-3 mb-2">
          <Button onClick={() => window.location.href = `/messages/${patientData.userId}`} className="bg-[#4EF2C8] hover:bg-[#3ce5bb] text-slate-900 font-bold h-11 rounded-xl flex-1 shadow-sm">
            <MessageSquare className="w-4 h-4 mr-2" />  Enviar Mensaje
          </Button>
        </div>
        
        <Card className="border border-slate-200 shadow-sm rounded-2xl bg-white overflow-hidden">
           <CardContent className="p-5">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-3">
                 <FileText className="w-4 h-4 text-[#25b591]" />
                 Motivo Principal de Consulta
              </h3>
              <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                 {patientData.reason}
              </p>
           </CardContent>
        </Card>

        <section>
           <h3 className="text-sm font-bold text-slate-800 px-1 mb-3 flex items-center justify-between">
              <span className="flex items-center gap-2">
                 <Lock className="w-4 h-4 text-amber-500" /> Notas Privadas
              </span>
           </h3>
           <Card className="border-none shadow-[0_4px_15px_rgba(0,0,0,0.03)] bg-amber-50/50 rounded-2xl overflow-hidden">
             <div className="bg-amber-100/50 p-3 border-b border-amber-100 flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800 leading-relaxed font-medium">Estas notas son encriptadas y 100% privadas. El paciente nunca tendrá acceso a ellas.</p>
             </div>
             <CardContent className="p-4 flex flex-col gap-3">
                <Textarea 
                   value={privateNotes}
                   onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setPrivateNotes(e.target.value)}
                   placeholder="Anotaciones de la sesión, seguimiento clínico u observaciones..."
                   className="min-h-[180px] border-none bg-white shadow-sm resize-none focus-visible:ring-1 focus-visible:ring-amber-300 rounded-xl"
                />
                <div className="flex justify-end mt-1">
                   <Button 
                      onClick={handleSaveNotes}
                      disabled={isSavingNotes}
                      className="bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-xl h-10 shadow-sm px-6"
                   >
                     {isSavingNotes ? 'Guardando...' : <><Save className="w-4 h-4 mr-2" /> Guardar Notas</>}
                   </Button>
                </div>
             </CardContent>
           </Card>
        </section>

        <section>
           <h3 className="text-sm font-bold text-slate-800 px-1 mb-3 flex items-center gap-2">
              <HistoryIcon className="w-4 h-4 text-indigo-500" /> Material Autorizado
           </h3>
           
           <Card className="border border-slate-100 shadow-sm bg-white rounded-2xl overflow-hidden">
              <CardContent className="p-1">
                 {sharedFiles.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-8 text-center bg-slate-50 m-3 rounded-xl border-dashed border-2 border-slate-200">
                       <FileText className="w-10 h-10 text-slate-300 mb-2" />
                       <p className="text-sm font-medium text-slate-500">El paciente aún no ha compartido resúmenes o historiales de chat contigo.</p>
                    </div>
                 ) : (
                    <div className="divide-y divide-slate-100">
                       {sharedFiles.map(file => {
                          let dateObj = new Date();
                          if (file.date?.toDate) dateObj = file.date.toDate();
                          else if (typeof file.date === 'string' || file.date) dateObj = new Date(file.date);

                          return (
                             <div key={file.id} className="p-4 hover:bg-slate-50 transition-colors">
                                <div className="flex justify-between items-start mb-2">
                                   <span className="font-bold text-sm text-slate-800">{file.title || 'Resumen de Conversación'}</span>
                                   <span className="text-xs font-semibold text-slate-400 shrink-0 bg-slate-100 px-2 py-0.5 rounded-full">{format(dateObj, "d MMM yyyy", { locale: es })}</span>
                                </div>
                                <p className="text-sm text-slate-600 line-clamp-3 bg-white p-3 border border-slate-100 rounded-lg shadow-sm">
                                   {file.aiSummary || file.content || 'Sin contenido registrado'}
                                </p>
                             </div>
                          )
                       })}
                    </div>
                 )}
              </CardContent>
           </Card>
        </section>

      </div>
    </div>
  );
}
