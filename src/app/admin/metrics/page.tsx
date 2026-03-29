'use client';

import { useState, useEffect } from 'react';
import { collection, query, getDocs, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent } from '@/components/ui/card';
import { LoadingAnimation } from '@/components/loading-animation';
import { BarChart3, TrendingUp, Users, Activity, LineChart as ChartIcon } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function AdminMetricsPage() {
  const { userProfile, loading } = useAuth();
  
  const [metrics, setMetrics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Mock data for the chart to simulate daily activity (conversations)
  const chartData = [
    { name: 'Lun', convos: 120 },
    { name: 'Mar', convos: 154 },
    { name: 'Mié', convos: 145 },
    { name: 'Jue', convos: 180 },
    { name: 'Vie', convos: 210 },
    { name: 'Sáb', convos: 250 },
    { name: 'Dom', convos: 230 },
  ];

  const fetchMetrics = async () => {
    setIsLoading(true);
    try {
      const usersRef = collection(db, 'users');
      
      const allUsersSnap = await getDocs(query(usersRef));
      const totalUsers = allUsersSnap.size;

      const premiumQ = query(usersRef, where('isPremium', '==', true));
      const premiumSnap = await getDocs(premiumQ);
      const totalPremium = premiumSnap.size;

      const psychQ = query(usersRef, where('role', '==', 'psychologist'));
      const psychSnap = await getDocs(psychQ);
      const totalPsychologists = psychSnap.size;

      const conversionRate = totalUsers > 0 ? ((totalPremium / totalUsers) * 100).toFixed(1) : 0;

      const reqRef = collection(db, 'requests');
      const reqSnap = await getDocs(query(reqRef));
      const totalRequests = reqSnap.size;

      setMetrics({
         totalUsers,
         totalPremium,
         totalPsychologists,
         conversionRate,
         totalRequests
      });

    } catch (error) {
      console.error("Error fetching metrics:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!userProfile || userProfile.role !== 'admin') return;
    fetchMetrics();
  }, [userProfile]);

  if (loading || (isLoading && !metrics)) return <LoadingAnimation />;

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 relative pb-20">
      <div className="bg-[#112240] pt-10 pb-16 px-6 sticky top-0 z-20 shadow-sm border-b border-indigo-900">
         <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-400" />
            Métricas de Negocio
         </h1>
      </div>

      <div className="px-3 -mt-6 space-y-4 relative z-10 w-full max-w-4xl mx-auto">
         
         {/* Top KPIs */}
         <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
               <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                  <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center mb-2">
                     <Users className="w-4 h-4" />
                  </div>
                  <h3 className="text-xl font-extrabold text-slate-800">{metrics?.totalUsers}</h3>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Usuarios</p>
               </CardContent>
            </Card>
            
            <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
               <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                  <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center mb-2">
                     <TrendingUp className="w-4 h-4" />
                  </div>
                  <h3 className="text-xl font-extrabold text-slate-800">{metrics?.conversionRate}%</h3>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tasa Conversión</p>
               </CardContent>
            </Card>

            <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
               <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                  <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-500 flex items-center justify-center mb-2">
                     <Activity className="w-4 h-4" />
                  </div>
                  <h3 className="text-xl font-extrabold text-slate-800">{metrics?.totalRequests}</h3>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Solicitudes P.</p>
               </CardContent>
            </Card>

            <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
               <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                  <div className="w-8 h-8 rounded-full bg-purple-50 text-purple-500 flex items-center justify-center mb-2">
                     <ChartIcon className="w-4 h-4" />
                  </div>
                  <h3 className="text-xl font-extrabold text-slate-800">{metrics?.totalPremium}</h3>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Activos Premium</p>
               </CardContent>
            </Card>
         </div>

         {/* Chart Section */}
         <Card className="border-none shadow-sm rounded-2xl mt-4">
            <CardContent className="p-5">
               <div className="flex items-center justify-between mb-6">
                  <div>
                     <h3 className="font-bold text-slate-800">Interacciones con Zhi (IA)</h3>
                     <p className="text-xs text-slate-500 font-medium">Volumen de conversaciones en los últimos 7 días</p>
                  </div>
               </div>
               
               <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                     <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: -20 }}>
                        <Line type="monotone" dataKey="convos" stroke="#4EF2C8" strokeWidth={3} dot={{ r: 4, fill: "#112240" }} />
                        <CartesianGrid stroke="#f1f5f9" strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                        <Tooltip 
                           contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}
                           labelStyle={{ fontWeight: 'bold', color: '#1e293b', marginBottom: '4px' }}
                           itemStyle={{ color: '#0f172a', fontWeight: 'bold' }}
                        />
                     </LineChart>
                  </ResponsiveContainer>
               </div>
            </CardContent>
         </Card>

      </div>
    </div>
  );
}
