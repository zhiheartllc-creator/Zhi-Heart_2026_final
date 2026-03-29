const fs = require('fs');

let content = fs.readFileSync('c:/Zhi-Heart_2026_final/src/app/contact/page.tsx', 'utf-8');

const cardRegex = /<Card className="p-5 md:p-6 bg-white shadow-sm border border-slate-100 rounded-2xl">\s*<div className="flex items-center gap-4 mb-5">.*?<\/Card>/s;

const newCardUsage = `          <div className="space-y-4">
            {acceptedPsychologists.map(psych => renderAssignedCard({
               id: psych.uid,
               name: psych.name || 'Profesional Registrado',
               specialties: psych.specialties || 'Psicólogo Clínico',
               bio: psych.bio || 'Este profesional no ha añadido una biografía todavía.',
               photoURL: psych.photoURL || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=600&auto=format&fit=crop',
               isDefault: false
            }))}
            {renderAssignedCard(drAngarita)}
          </div>`;

content = content.replace(cardRegex, newCardUsage);

const returnRegex = /  return \(\s*<div className="flex flex-col min-h-screen/s;

const injectCode = `  const acceptedRequests = userRequests.filter(r => r.status === 'accepted');
  const acceptedPsychologists = psychologists.filter(p => acceptedRequests.some(r => r.psychologistId === p.uid));

  const drAngarita = {
    id: 'mock-psychologist-id-1',
    name: 'Dr. Angarita',
    specialties: 'Psicólogo Clínico, Esp. en Terapia Cognitivo-Conductual',
    bio: 'Con más de 10 años de experiencia, el Dr. Angarita se especializa en ayudar a adultos a manejar la ansiedad, el estrés y procesos de cambio. Su enfoque se basa en la empatía y en proporcionar herramientas prácticas para el día a día.',
    photoURL: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=600&auto=format&fit=crop',
    isDefault: true
  };

  const renderAssignedCard = (psych: { id: string, name: string, specialties: string, bio: string, photoURL: string, isDefault?: boolean }) => (
    <Card key={psych.id} className="p-5 md:p-6 bg-white shadow-sm border border-slate-100 rounded-2xl mb-4">
      <div className="flex items-center gap-4 mb-5">
        <div className="relative w-24 h-24 rounded-full overflow-hidden border-4 border-slate-50 shrink-0 shadow-sm bg-slate-100">
          <Image 
            src={psych.photoURL} 
            alt={psych.name} 
            fill 
            className="object-cover" 
          />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-slate-900">{psych.name}</h3>
          <p className="text-sm text-slate-400 font-medium mt-1">{psych.specialties}</p>
        </div>
      </div>
      
      <p className="text-sm text-slate-500 mb-6 leading-relaxed">
        {psych.bio}
      </p>
      
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Dialog>
          <DialogTrigger asChild>
            <Button className="w-full bg-[#112240] hover:bg-[#0a1526] text-white rounded-xl shadow-sm h-11 relative">
              {!userProfileData?.isPremium && <Lock className="w-3 h-3 absolute top-2 right-2 text-white/50" />}
              <MessageSquare className="w-4 h-4 mr-2" />
              Enviar Mensaje
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md bg-white rounded-3xl p-6">
            {userProfileData?.isPremium ? (
              <>
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold flex items-center gap-2 text-[#1e3a5f]">
                    <MessageSquare className="w-5 h-5 text-blue-500" />
                    Mensaje Directo
                  </DialogTitle>
                  <DialogDescription className="text-slate-500 mt-2">
                    Inicia una conversación privada con {psych.name}. (Función de ejemplo)
                  </DialogDescription>
                </DialogHeader>
                <div className="mt-4 bg-slate-50 border border-slate-100 p-4 rounded-xl flex items-center gap-3">
                  <div className="bg-blue-100 p-2 rounded-full"><Clock className="w-5 h-5 text-blue-600" /></div>
                  <div className="text-sm text-slate-700">El tiempo promedio de respuesta es de 2 a 4 horas laborables.</div>
                </div>
              </>
            ) : (
              <>
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold flex items-center gap-2 text-[#1e3a5f]">
                    <Lock className="w-5 h-5 text-purple-500" />
                    Función Premium
                  </DialogTitle>
                  <DialogDescription className="text-slate-500 mt-2">
                    El contacto directo con especialistas es un beneficio exclusivo de Zhi Premium.
                  </DialogDescription>
                </DialogHeader>
                <div className="mt-6">
                  <Button onClick={() => window.location.href = '/premium'} className="w-full bg-[#4EF2C8] hover:bg-[#3ce5bb] text-slate-900 font-bold h-12 rounded-xl">
                    Desbloquear Premium
                  </Button>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        <Dialog>
          <DialogTrigger asChild>
            <Button className="w-full bg-[#4EF2C8] hover:bg-[#3ce5bb] text-slate-900 border-none rounded-xl shadow-sm h-11 font-medium">
              <HistoryIcon className="w-4 h-4 mr-2" />
              Historial Compartido
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md bg-white rounded-3xl p-6">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold flex items-center gap-2 text-[#1e3a5f]">
                <HistoryIcon className="w-5 h-5 text-[#25b591]" />
                Historial Compartido
              </DialogTitle>
              <DialogDescription className="text-slate-500 mt-2">
                Estos son los resúmenes y sesiones de chat que has compartido con tu terapeuta.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 space-y-3 max-h-[300px] overflow-y-auto pr-2">
              {sharedHistory.length > 0 ? (
                sharedHistory.map((entry: any) => {
                  let dateObj = new Date();
                  if (entry.date?.toDate) dateObj = entry.date.toDate();
                  else if (typeof entry.date === 'string' || entry.date) dateObj = new Date(entry.date);
                  
                  return (
                    <div key={entry.id} className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-sm flex justify-between items-center">
                      <span className="font-medium text-slate-700 truncate mr-2">{entry.title || 'Conversación'}</span>
                      <span className="text-slate-400 text-xs shrink-0">{format(dateObj, 'd MMM yyyy', { locale: es })}</span>
                    </div>
                  )
                })
              ) : (
                <div className="text-center p-4 bg-slate-50 rounded-lg border border-slate-100">
                  <p className="text-sm text-slate-500">Aún no has compartido ninguna conversación.</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl shadow-sm h-11 relative">
              {!userProfileData?.isPremium && <Lock className="w-3 h-3 absolute top-2 right-2 text-slate-400" />}
              <CalendarPlus className="w-4 h-4 mr-2" />
              Agendar Cita
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md bg-white rounded-3xl p-6">
            {userProfileData?.isPremium ? (
              <>
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold flex items-center gap-2 text-[#1e3a5f]">
                    <CalendarPlus className="w-5 h-5 text-indigo-500" />
                    Próxima Cita
                  </DialogTitle>
                  <DialogDescription className="text-slate-500 mt-2">
                     Aún no tienes citas agendadas con {psych.name}. (Función de ejemplo)
                  </DialogDescription>
                </DialogHeader>
                <div className="mt-4 flex flex-col items-center justify-center p-6 bg-slate-50 border border-slate-100 rounded-xl">
                  <Calendar className="w-10 h-10 text-slate-300 mb-2" />
                  {psych.isDefault ? (
                    <>
                      <p className="text-sm text-slate-500 text-center mb-4">Envía una solicitud para iniciar un proceso terapéutico.</p>
                      <Button 
                        onClick={() => handleRequestPsychologist(psych.id, psych.name)}
                        disabled={isRequesting === psych.id}
                        className="w-full bg-[#4EF2C8] hover:bg-[#3ce5bb] text-slate-900 font-bold"
                      >
                        {isRequesting === psych.id ? 'Enviando...' : \`Enviar Solicitud a \${psych.name}\`}
                      </Button>
                    </>
                  ) : (
                     <p className="text-sm text-slate-500 text-center mb-4">Pronto podrás agendar tus citas directamente aquí.</p>
                  )}
                </div>
              </>
            ) : (
              <>
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold flex items-center gap-2 text-[#1e3a5f]">
                    <Lock className="w-5 h-5 text-purple-500" />
                    Función Premium
                  </DialogTitle>
                  <DialogDescription className="text-slate-500 mt-2">
                    El agendamiento de citas en línea es un beneficio exclusivo de Zhi Premium.
                  </DialogDescription>
                </DialogHeader>
                <div className="mt-6">
                  <Button onClick={() => window.location.href = '/premium'} className="w-full bg-[#4EF2C8] hover:bg-[#3ce5bb] text-slate-900 font-bold h-12 rounded-xl">
                    Desbloquear Premium
                  </Button>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Card>
  );

  return (
    <div className="flex flex-col min-h-screen`;

content = content.replace(returnRegex, injectCode);

fs.writeFileSync('c:/Zhi-Heart_2026_final/src/app/contact/page.tsx', content, 'utf-8');
console.log('Update Complete!');
