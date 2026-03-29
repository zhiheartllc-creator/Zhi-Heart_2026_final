'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useRef } from 'react';
import { Camera, User, LogOut, BriefcaseMedical, MapPin, BadgeDollarSign, HeartHandshake, Languages, FileText } from 'lucide-react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { updateProfile } from 'firebase/auth';
import { LoadingAnimation } from '@/components/loading-animation';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';

export default function PsychologistProfile() {
  const { user, userProfile, loading, signOut } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [specialties, setSpecialties] = useState('');
  const [modality, setModality] = useState('');
  const [price, setPrice] = useState('');
  const [languages, setLanguages] = useState('');
  const [country, setCountry] = useState('');
  const [isAcceptingPatients, setIsAcceptingPatients] = useState(true);
  
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  useEffect(() => {
    if (!user || userProfile?.role !== 'psychologist') return;
    
    setName(user.displayName || userProfile?.name || '');

    const fetchProfile = async () => {
      try {
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.bio) setBio(data.bio);
          if (data.specialties) setSpecialties(data.specialties);
          if (data.modality) setModality(data.modality);
          if (data.price) setPrice(data.price);
          if (data.languages) setLanguages(data.languages);
          if (data.country) setCountry(data.country);
          if (data.isAcceptingPatients !== undefined) setIsAcceptingPatients(data.isAcceptingPatients);
        }
      } catch (error) {
        console.error("Error fetching doc:", error);
      } finally {
        setIsLoadingProfile(false);
      }
    };

    fetchProfile();
  }, [user, userProfile]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate size (e.g. max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({ variant: "destructive", title: "Archivo muy grande", description: "La foto debe ser menor a 5MB." });
      return;
    }

    setIsUploadingImage(true);
    try {
      const storageRef = ref(storage, `profile_images/${user.uid}_${Date.now()}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);

      // Update Firebase Auth profile
      await updateProfile(user, { photoURL: downloadURL });
      
      // Update Firestore user document
      await updateDoc(doc(db, 'users', user.uid), { photoURL: downloadURL });

      toast({ title: "Foto actualizada", description: "Tu foto de perfil ha sido cambiada." });
      
      // Force a slight state update to refresh the image if next/image caches it
      router.refresh(); 
    } catch (error) {
       console.error("Error uploading image:", error);
       toast({ variant: "destructive", title: "Error", description: "No se pudo subir la foto." });
    } finally {
       setIsUploadingImage(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      // ... same save logic ...
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        name, bio, specialties, modality, price, languages, country, isAcceptingPatients
      });
      
      toast({ title: "Perfil Actualizado", description: "Tu información profesional se ha guardado correctamente." });
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "No se pudieron guardar los cambios." });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    // ... same logout
    try { await signOut(); router.push('/login'); } catch (e) { toast({ variant: "destructive", title: "Error", description: "Inténtalo de nuevo." }); }
  };

  if (loading || isLoadingProfile) return <LoadingAnimation />;

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 relative pb-20">
      
      <div className="bg-[#1e3a5f] pt-12 pb-24 px-6 relative">
         <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-slate-50 to-transparent" />
         <h1 className="text-2xl font-bold text-white mb-2">Mi Perfil Profesional</h1>
         <p className="text-indigo-200 text-sm">Gestiona la información que verán los usuarios.</p>
      </div>

      <div className="px-5 -mt-16 relative z-10 w-full max-w-2xl mx-auto space-y-6">
         
         <div className="flex flex-col items-center">
            <div className="relative">
               <Avatar className="h-28 w-28 border-4 border-white shadow-xl bg-slate-100">
                  <AvatarImage src={user?.photoURL || undefined} alt={name} className="object-cover" />
                  <AvatarFallback className="text-3xl font-bold text-slate-300">
                     <User size={40} />
                  </AvatarFallback>
               </Avatar>
               <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/png, image/jpeg, image/webp" 
                  onChange={handleImageUpload}
               />
               <button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingImage}
                  className="absolute bottom-0 right-0 bg-slate-900 text-white p-2 rounded-full shadow-lg border-2 border-white hover:bg-slate-800 transition-colors disabled:opacity-50"
               >
                  <Camera className="w-4 h-4" />
               </button>
            </div>
            {isUploadingImage && <p className="text-xs text-indigo-500 mt-2 font-medium animate-pulse">Subiendo foto...</p>}
         </div>

         <Card className="border-none shadow-sm rounded-2xl">
            <CardContent className="p-5">
               <div className="flex items-center justify-between mb-4">
                  <div>
                     <h3 className="font-bold text-slate-900">Aceptar nuevos pacientes</h3>
                     <p className="text-xs text-slate-500">Hazte visible en el directorio de Zhi.</p>
                  </div>
                  <Switch checked={isAcceptingPatients} onCheckedChange={setIsAcceptingPatients} />
               </div>
            </CardContent>
         </Card>

         <div className="space-y-4">
            <div className="space-y-1.5">
               <label className="text-xs font-bold text-slate-500 uppercase ml-1 flex items-center gap-1.5">
                 <User className="w-3.5 h-3.5" /> Nombre y Título
               </label>
               <Input 
                 value={name} 
                 onChange={(e) => setName(e.target.value)}
                 placeholder="Ej. Dr. Carlos Mendoza"
                 className="bg-white border-slate-200 shadow-sm rounded-xl h-12"
               />
            </div>

            <div className="space-y-1.5">
               <label className="text-xs font-bold text-slate-500 uppercase ml-1 flex items-center gap-1.5">
                 <MapPin className="w-3.5 h-3.5" /> Ciudad / País
               </label>
               <Input 
                 value={country} 
                 onChange={(e) => setCountry(e.target.value)}
                 placeholder="Ej. Caracas, VE"
                 className="bg-white border-slate-200 shadow-sm rounded-xl h-12"
               />
            </div>

            <div className="space-y-1.5">
               <label className="text-xs font-bold text-slate-500 uppercase ml-1 flex items-center gap-1.5">
                 <BriefcaseMedical className="w-3.5 h-3.5" /> Especialidades
               </label>
               <Input 
                 value={specialties} 
                 onChange={(e) => setSpecialties(e.target.value)}
                 placeholder="Ej. Ansiedad, Terapia de Pareja"
                 className="bg-white border-slate-200 shadow-sm rounded-xl h-12"
               />
            </div>

            <div className="grid grid-cols-2 gap-3">
               <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase ml-1 flex items-center gap-1.5">
                    <HeartHandshake className="w-3.5 h-3.5" /> Modalidad
                  </label>
                  <Input 
                    value={modality} 
                    onChange={(e) => setModality(e.target.value)}
                    placeholder="Online / Presencial"
                    className="bg-white border-slate-200 shadow-sm rounded-xl h-12"
                  />
               </div>
               <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase ml-1 flex items-center gap-1.5">
                    <BadgeDollarSign className="w-3.5 h-3.5" /> Tarifa (USD)
                  </label>
                  <Input 
                    value={price} 
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="Ej. $40 / sesión"
                    className="bg-white border-slate-200 shadow-sm rounded-xl h-12"
                  />
               </div>
            </div>

            <div className="space-y-1.5">
               <label className="text-xs font-bold text-slate-500 uppercase ml-1 flex items-center gap-1.5">
                 <Languages className="w-3.5 h-3.5" /> Idiomas
               </label>
               <Input 
                 value={languages} 
                 onChange={(e) => setLanguages(e.target.value)}
                 placeholder="Ej. Español, Inglés"
                 className="bg-white border-slate-200 shadow-sm rounded-xl h-12"
               />
            </div>

            <div className="space-y-1.5">
               <label className="text-xs font-bold text-slate-500 uppercase ml-1 flex items-center gap-1.5">
                 <FileText className="w-3.5 h-3.5" /> Biografía Breve
               </label>
               <Textarea 
                 value={bio} 
                 onChange={(e) => setBio(e.target.value)}
                 placeholder="Escribe un breve resumen de tu enfoque y experiencia para los pacientes..."
                 className="bg-white border-slate-200 shadow-sm rounded-xl min-h-[120px] resize-none"
               />
            </div>
         </div>

         <div className="pt-6 pb-8 space-y-4">
            <Button 
               onClick={handleSave}
               disabled={isSaving}
               className="w-full bg-[#4EF2C8] hover:bg-[#3ce5bb] text-slate-900 font-bold py-6 rounded-2xl shadow-sm text-base"
            >
               {isSaving ? "Guardando..." : "Guardar Cambios"}
            </Button>

            <Button 
               variant="ghost" 
               className="w-full text-red-500 hover:text-red-600 hover:bg-red-50 py-6 rounded-2xl" 
               onClick={handleLogout}
            >
               <LogOut className="w-5 h-5 mr-2" />
               Cerrar Sesión
            </Button>
         </div>

      </div>
    </div>
  );
}
