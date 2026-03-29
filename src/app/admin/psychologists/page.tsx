'use client';

import { useState, useEffect } from 'react';
import { collection, query, getDocs, updateDoc, doc, where, setDoc, serverTimestamp } from 'firebase/firestore';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut as authSignOut } from 'firebase/auth';
import { db, app as primaryApp } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingAnimation } from '@/components/loading-animation';
import { useToast } from '@/hooks/use-toast';
import { BriefcaseMedical, CheckCircle, XCircle, ShieldAlert, BadgeInfo, UserPlus, Edit2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function AdminPsychologistsPage() {
  const { userProfile, loading } = useAuth();
  const { toast } = useToast();
  
  const [psychologists, setPsychologists] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // States for creating a new psychologist
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newPsych, setNewPsych] = useState({
     name: '', email: '', password: '', specialties: '', modality: '', price: '', commission: '20',
     photoURL: '', bio: '', city: '', country: ''
  });

  // States for editing an existing psychologist
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editPsych, setEditPsych] = useState<any>(null);

  const fetchPsychologists = async () => {
    setIsLoading(true);
    try {
      const usersRef = collection(db, 'users');
      // Eliminamos el orderBy de Firestore para evitar pedir un índice compuesto obligatorio
      const q = query(usersRef, where('role', '==', 'psychologist'));
      const snap = await getDocs(q);
      const data: any[] = [];
      snap.forEach(doc => {
         data.push({ uid: doc.id, ...doc.data() });
      });
      // Ordenamos manualmente los resultados de más reciente a más antiguo
      data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setPsychologists(data);
    } catch (error) {
      console.error("Error fetching psychologists:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!userProfile || userProfile.role !== 'admin') return;
    fetchPsychologists();
  }, [userProfile]);

  const updateVerification = async (uid: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'users', uid), { verificationStatus: newStatus });
      setPsychologists(psychologists.map(p => p.uid === uid ? { ...p, verificationStatus: newStatus } : p));
      toast({ title: "Estado Actualizado", description: `El profesional ahora está marcado como: ${newStatus}.` });
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo cambiar el estado de verificación." });
    }
  };

  const handleUpdatePsychologist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editPsych) return;
    
    setIsUpdating(true);
    try {
      const updateData = {
        name: editPsych.name,
        specialties: editPsych.specialties,
        modality: editPsych.modality,
        price: editPsych.price,
        zhiCommission: parseInt(editPsych.commission) || 0,
        photoURL: editPsych.photoURL,
        bio: editPsych.bio,
        city: editPsych.city,
        country: editPsych.country,
      };

      await updateDoc(doc(db, 'users', editPsych.uid), updateData);
      
      setPsychologists(psychologists.map(p => 
        p.uid === editPsych.uid ? { ...p, ...updateData } : p
      ));
      
      toast({ title: "Perfil Actualizado", description: "Los datos del psicólogo se han actualizado correctamente." });
      setIsEditOpen(false);
      setEditPsych(null);
    } catch (error) {
       console.error("Error actualizando perfil:", error);
       toast({ variant: "destructive", title: "Error", description: "No se pudieron guardar los cambios." });
    } finally {
       setIsUpdating(false);
    }
  };

  const handleCreatePsychologist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPsych.email || !newPsych.password || !newPsych.name) {
       toast({ variant: "destructive", title: "Incompleto", description: "Llena nombre, correo y contraseña obligatoriamente." });
       return;
    }
    
    setIsCreating(true);
    try {
      // 1. Iniciar App secundaria para no desloguear al Admin
      let secondaryApp;
      const apps = getApps();
      const secondaryAppName = 'SecondaryAuthApp';
      const existing = apps.find(a => a.name === secondaryAppName);
      
      if (existing) {
         secondaryApp = existing;
      } else {
         const config = primaryApp.options;
         secondaryApp = initializeApp(config, secondaryAppName);
      }

      const secondaryAuth = getAuth(secondaryApp);

      // 2. Crear usuario en Auth
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, newPsych.email, newPsych.password);
      const newUid = userCredential.user.uid;

      // Cerrar sesión en la secundaria y limpiarla para que no haya fugas
      await authSignOut(secondaryAuth);

      // 3. Crear el documento en Firestore con el cliente principal
      const newDoc = {
         uid: newUid,
         name: newPsych.name,
         email: newPsych.email,
         role: 'psychologist',
         verificationStatus: 'verified', // Pre-aprobado al ser creado por admin
         specialties: newPsych.specialties,
         modality: newPsych.modality,
         price: newPsych.price,
         zhiCommission: parseInt(newPsych.commission) || 0,
         photoURL: newPsych.photoURL,
         bio: newPsych.bio,
         city: newPsych.city,
         country: newPsych.country,
         createdAt: serverTimestamp(),
      };

      await setDoc(doc(db, 'users', newUid), newDoc);

      // 4. Actualizar tabla local
      setPsychologists([{ ...newDoc, createdAt: { seconds: Date.now() / 1000 } }, ...psychologists]);
      
      toast({ title: "Éxito", description: "Psicólogo registrado y verificado correctamente." });
      setIsAddOpen(false);
      setNewPsych({ name: '', email: '', password: '', specialties: '', modality: '', price: '', commission: '20', photoURL: '', bio: '', city: '', country: '' });

    } catch (error: any) {
      console.error("Creación falló:", error);
      
      let errorMessage = "Fallo al crear la cuenta.";
      if (error.code === 'auth/email-already-in-use') {
         errorMessage = "Ese correo electrónico ya está registrado en Zhi. Intenta con otro o inicia sesión.";
      } else if (error.code === 'auth/weak-password') {
         errorMessage = "La contraseña es muy débil. Debe tener al menos 6 caracteres.";
      } else if (error.message) {
         errorMessage = error.message;
      }
      
      toast({ variant: "destructive", title: "Error en el Registro", description: errorMessage });
    } finally {
      setIsCreating(false);
    }
  };

  if (loading || (isLoading && psychologists.length === 0)) return <LoadingAnimation />;

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 relative pb-20">
      <div className="bg-[#112240] pt-10 pb-6 px-6 sticky top-0 z-20 shadow-sm border-b border-indigo-900 flex justify-between items-center">
         <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <BriefcaseMedical className="w-5 h-5 text-indigo-400" />
            Control de Psicólogos
         </h1>
         <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
               <Button size="sm" className="bg-[#4EF2C8] hover:bg-[#3ce5bb] text-slate-900 font-bold border-none h-8 rounded-lg shadow-md px-3">
                  <UserPlus className="w-4 h-4 mr-1.5" />
                  Añadir
               </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md w-[95vw] rounded-2xl max-h-[90vh] overflow-y-auto">
               <DialogHeader>
                  <DialogTitle className="text-xl font-bold text-slate-800">Registrar Psicólogo</DialogTitle>
               </DialogHeader>
               <form onSubmit={handleCreatePsychologist} className="space-y-3 mt-2">
                  <div className="space-y-1">
                     <label className="text-xs font-bold text-slate-500 uppercase">Nombre Completo</label>
                     <Input required value={newPsych.name} onChange={e => setNewPsych({...newPsych, name: e.target.value})} placeholder="Dr. Juan Pérez" />
                  </div>
                  <div className="space-y-1">
                     <label className="text-xs font-bold text-slate-500 uppercase">Foto (URL)</label>
                     <Input value={newPsych.photoURL} onChange={e => setNewPsych({...newPsych, photoURL: e.target.value})} placeholder="https://ejemplo.com/foto.jpg" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                     <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Correo Electrónico</label>
                        <Input required type="email" value={newPsych.email} onChange={e => setNewPsych({...newPsych, email: e.target.value})} placeholder="juan@clinica.com" />
                     </div>
                     <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Contraseña Temporal</label>
                        <Input required type="text" value={newPsych.password} onChange={e => setNewPsych({...newPsych, password: e.target.value})} placeholder="minimo 6 caracteres" />
                     </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                     <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Tarifa</label>
                        <Input value={newPsych.price} onChange={e => setNewPsych({...newPsych, price: e.target.value})} placeholder="$30 / sesión" />
                     </div>
                     <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Comisión Zhi (%)</label>
                        <Input type="number" min="0" max="100" value={newPsych.commission} onChange={e => setNewPsych({...newPsych, commission: e.target.value})} placeholder="Ej. 20" />
                     </div>
                  </div>
                  <div className="space-y-1">
                     <label className="text-xs font-bold text-slate-500 uppercase">Especialidades</label>
                     <Input value={newPsych.specialties} onChange={e => setNewPsych({...newPsych, specialties: e.target.value})} placeholder="Ansiedad, Depresión..." />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                     <div className="space-y-1 col-span-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">País</label>
                        <Input value={newPsych.country} onChange={e => setNewPsych({...newPsych, country: e.target.value})} placeholder="Ej: MX" />
                     </div>
                     <div className="space-y-1 col-span-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">Ciudad</label>
                        <Input value={newPsych.city} onChange={e => setNewPsych({...newPsych, city: e.target.value})} placeholder="Ciudad de México" />
                     </div>
                  </div>
                  <div className="space-y-1">
                     <label className="text-xs font-bold text-slate-500 uppercase">Modalidad</label>
                     <Input value={newPsych.modality} onChange={e => setNewPsych({...newPsych, modality: e.target.value})} placeholder="Online y Presencial" />
                  </div>
                  <div className="space-y-1">
                     <label className="text-xs font-bold text-slate-500 uppercase">Descripción / Bio</label>
                     <Input value={newPsych.bio} onChange={e => setNewPsych({...newPsych, bio: e.target.value})} placeholder="Breve biografía del profesional" />
                  </div>
                  
                  <div className="pt-4 flex gap-2 w-full">
                     <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)} className="flex-1">Cancelar</Button>
                     <Button type="submit" disabled={isCreating} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white">
                        {isCreating ? "Registrando..." : "Crear Perfil"}
                     </Button>
                  </div>
               </form>
            </DialogContent>
         </Dialog>
      </div>

      <div className="px-3 mt-4 space-y-3 relative z-10 w-full max-w-4xl mx-auto">
         {psychologists.length === 0 && !isLoading && (
            <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-slate-200">
               <p className="text-slate-500 font-medium">No hay profesionales registrados.</p>
            </div>
         )}
         
         {psychologists.map((p) => {
            let joinDate = "Desconocida";
            if (p.createdAt?.toDate) {
               joinDate = format(p.createdAt.toDate(), "dd MMM yyyy", { locale: es });
            }

            // Status defaults to 'pending' if not explicitly set
            const status = p.verificationStatus || 'pending';
            const isAccepted = status === 'verified';
            const isRejected = status === 'rejected';
            const isSuspended = status === 'suspended';

            return (
               <Card key={p.uid} className={`border ${isSuspended || isRejected ? 'border-red-200 bg-red-50/20' : isAccepted ? 'border-emerald-200' : 'border-amber-200'} shadow-sm rounded-2xl overflow-hidden`}>
                  <CardContent className="p-4">
                     <div className="flex justify-between items-start mb-2">
                        <div className="flex gap-3">
                           {p.photoURL ? (
                              <img src={p.photoURL} alt={p.name} className="w-12 h-12 rounded-full object-cover shrink-0 border border-slate-200" />
                           ) : (
                              <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${isAccepted ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                                 <BriefcaseMedical className="w-6 h-6" />
                              </div>
                           )}
                           <div>
                              <h3 className="font-bold text-lg text-slate-800 leading-tight">
                                 {p.name || p.displayName || 'Profesional Sin Nombre'}
                              </h3>
                              <p className="text-xs text-slate-500 font-medium tracking-wide mt-0.5">
                                 {p.specialties || 'Sin especialidades registradas'}
                              </p>
                           </div>
                        </div>
                        <div className="flex flex-col gap-1 items-end">
                           {status === 'pending' && <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold uppercase tracking-wider rounded-md border border-amber-200">En Revisión</span>}
                           {isAccepted && <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase tracking-wider rounded-md border border-emerald-200">Verificado</span>}
                           {isRejected && <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold uppercase tracking-wider rounded-md border border-red-200">Rechazado</span>}
                           {isSuspended && <span className="px-2 py-0.5 bg-slate-200 text-slate-700 text-[10px] font-bold uppercase tracking-wider rounded-md border border-slate-300">Suspendido</span>}
                           {p.bio && <span className="text-[10px] text-indigo-500 truncate max-w-[100px] text-right" title={p.bio}>Tiene Bio</span>}
                           
                           <Button 
                             variant="ghost" 
                             size="sm" 
                             className="h-6 mt-1 px-2 text-xs text-slate-500 hover:text-[#25b591] hover:bg-[#4EF2C8]/10"
                             onClick={() => {
                               setEditPsych({
                                 ...p,
                                 commission: p.zhiCommission?.toString() || '0'
                               });
                               setIsEditOpen(true);
                             }}
                           >
                              <Edit2 className="w-3 h-3 mr-1" /> Editar
                           </Button>
                        </div>
                     </div>

                     <div className="grid grid-cols-2 gap-y-1 gap-x-4 ml-14 mb-4">
                        <div className="text-[11px] text-slate-500"><span className="font-semibold text-slate-700">Ubicación:</span> {p.city || p.country ? `${p.city || ''} ${p.country || ''}`.trim() : 'N/A'}</div>
                        <div className="text-[11px] text-slate-500"><span className="font-semibold text-slate-700">Modalidad:</span> {p.modality || 'No Definida'}</div>
                        <div className="text-[11px] text-slate-500"><span className="font-semibold text-slate-700">Tarifa:</span> {p.price || '--'}</div>
                        <div className="text-[11px] text-emerald-600"><span className="font-semibold text-emerald-700">Comisión Zhi:</span> {p.zhiCommission !== undefined ? `${p.zhiCommission}%` : '0%'}</div>
                        <div className="text-[11px] text-slate-500 col-span-2 mt-1"><span className="font-semibold text-slate-700">Registro:</span> {joinDate}</div>
                     </div>

                     <div className="flex gap-2 ml-14">
                        {status === 'pending' && (
                           <>
                              <Button
                                 onClick={() => updateVerification(p.uid, 'verified')}
                                 className="h-9 text-xs font-semibold flex-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border-none"
                              >
                                 <CheckCircle className="w-4 h-4 mr-1.5" /> Aprobar
                              </Button>
                              <Button
                                 variant="outline"
                                 onClick={() => updateVerification(p.uid, 'rejected')}
                                 className="h-9 text-xs font-semibold px-4 border-red-200 text-red-600 bg-red-50 hover:bg-red-100"
                              >
                                 Rechazar
                              </Button>
                           </>
                        )}
                        
                        {isAccepted && (
                           <Button
                              variant="outline"
                              onClick={() => updateVerification(p.uid, 'suspended')}
                              className="h-9 text-xs font-semibold w-full border-slate-200 text-slate-600 bg-slate-50 hover:bg-slate-100"
                           >
                              <ShieldAlert className="w-4 h-4 mr-1.5 text-amber-500" /> Suspender
                           </Button>
                        )}

                        {(isRejected || isSuspended) && (
                           <Button
                              onClick={() => updateVerification(p.uid, 'verified')}
                              className="h-9 text-xs font-semibold w-full bg-slate-900 hover:bg-slate-800 text-white"
                           >
                              Reactivar Cuenta
                           </Button>
                        )}
                     </div>
                  </CardContent>
               </Card>
            )
         })}
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
         <DialogContent className="sm:max-w-md w-[95vw] rounded-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
               <DialogTitle className="text-xl font-bold text-slate-800">Editar Perfil del Psicólogo</DialogTitle>
            </DialogHeader>
            {editPsych && (
            <form onSubmit={handleUpdatePsychologist} className="space-y-3 mt-2">
               <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Nombre Completo</label>
                  <Input required value={editPsych.name} onChange={e => setEditPsych({...editPsych, name: e.target.value})} />
               </div>
               <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Foto (URL)</label>
                  <Input value={editPsych.photoURL || ''} onChange={e => setEditPsych({...editPsych, photoURL: e.target.value})} />
               </div>
               <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase">Correo Electrónico (No editable)</label>
                  <Input disabled value={editPsych.email} className="bg-slate-50 text-slate-500" />
               </div>
               <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                     <label className="text-xs font-bold text-slate-500 uppercase">Tarifa</label>
                     <Input value={editPsych.price || ''} onChange={e => setEditPsych({...editPsych, price: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                     <label className="text-xs font-bold text-slate-500 uppercase">Comisión Zhi (%)</label>
                     <Input type="number" min="0" max="100" value={editPsych.commission} onChange={e => setEditPsych({...editPsych, commission: e.target.value})} />
                  </div>
               </div>
               <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Especialidades</label>
                  <Input value={editPsych.specialties || ''} onChange={e => setEditPsych({...editPsych, specialties: e.target.value})} />
               </div>
               <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1 col-span-1">
                     <label className="text-xs font-bold text-slate-500 uppercase">País</label>
                     <Input value={editPsych.country || ''} onChange={e => setEditPsych({...editPsych, country: e.target.value})} />
                  </div>
                  <div className="space-y-1 col-span-2">
                     <label className="text-xs font-bold text-slate-500 uppercase">Ciudad</label>
                     <Input value={editPsych.city || ''} onChange={e => setEditPsych({...editPsych, city: e.target.value})} />
                  </div>
               </div>
               <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Modalidad</label>
                  <Input value={editPsych.modality || ''} onChange={e => setEditPsych({...editPsych, modality: e.target.value})} />
               </div>
               <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Descripción / Bio</label>
                  <Input value={editPsych.bio || ''} onChange={e => setEditPsych({...editPsych, bio: e.target.value})} />
               </div>
               
               <div className="pt-4 flex gap-2 w-full">
                  <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)} className="flex-1">Cancelar</Button>
                  <Button type="submit" disabled={isUpdating} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white">
                     {isUpdating ? "Guardando..." : "Guardar Cambios"}
                  </Button>
               </div>
            </form>
            )}
         </DialogContent>
      </Dialog>
    </div>
  );
}
