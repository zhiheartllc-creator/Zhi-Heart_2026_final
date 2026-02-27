"use client";

import Lottie from "lottie-react";
import animationData from "@/lib/lottie-animation.json";

export function LoadingAnimation() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
      <div className="w-32 h-32 mb-4">
        <Lottie animationData={animationData} loop={true} />
      </div>
      <p className="text-muted-foreground animate-pulse text-sm font-medium">
        Preparando tu espacio...
      </p>
    </div>
  );
}