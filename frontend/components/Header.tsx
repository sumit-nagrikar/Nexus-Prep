"use client";
import { useFormStore } from "@/lib/store/formStore";
import { useInterviewStore } from "@/lib/store/interviewStore";

export default function Header() {
  const { formData } = useFormStore();
  const { interviewStarted } = useInterviewStore();

  return (
    <header className="fixed w-full top-0 z-50 transition-all duration-300 pointer-events-none">
      <div className="absolute inset-0 bg-background/50 backdrop-blur-xl border-b border-white/10 pointer-events-auto" />
      <div className="relative w-full max-w-7xl mx-auto flex items-center justify-between py-4 px-6 pointer-events-auto">
        <div className="flex items-center gap-2 group cursor-pointer">
          <div className="relative w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/20 group-hover:shadow-purple-500/40 transition-all duration-300">
            <span className="text-white font-bold text-lg">N</span>
          </div>
          <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">
            NexusPrep
          </span>
        </div>

        {interviewStarted && (
          <div className="hidden sm:flex items-center gap-3 px-4 py-1.5 rounded-full bg-white/5 border border-white/10">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm font-medium text-gray-300">
              {formData.companyName} • {formData.jobRole}
            </span>
          </div>
        )}
      </div>
    </header>
  );
}
