import { BottomNavBar } from "@/components/bottom-nav-bar";
import { PsychologistNavBar } from "@/components/psychologist-nav-bar";

export default function PsychologistLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50 relative">
      <div className="flex-1 pb-20">
        {children}
      </div>
      <PsychologistNavBar />
    </div>
  );
}
