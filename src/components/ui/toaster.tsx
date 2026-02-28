"use client"

import { useToast } from "@/hooks/use-toast"
import { AnimatePresence, motion } from "framer-motion"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

export function Toaster() {
  const { toasts, dismiss } = useToast()

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px] pointer-events-none gap-2">
      <AnimatePresence>
        {toasts.map((toast) => {
          const { id, title, description, action, open } = toast
          if (!open) return null;

          return (
            <motion.div
              key={id}
              initial={{ opacity: 0, y: -50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="pointer-events-auto bg-white/95 backdrop-blur-xl border-none shadow-xl rounded-2xl p-4 w-full"
            >
              <div className="flex gap-4">
                <div className="flex-1 space-y-1">
                  {title && <h3 className="text-sm font-semibold tracking-tight">{title}</h3>}
                  {description && (
                    <div className="text-sm opacity-90">
                      {description}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => dismiss(id)}
                  className="rounded-full p-1 opacity-50 hover:opacity-100 hover:bg-slate-100 transition-all flex-shrink-0 h-fit"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
