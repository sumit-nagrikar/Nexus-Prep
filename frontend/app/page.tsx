"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { InterviewSetupForm } from "@/components/interview-setup-form";
import { Sparkles, ArrowRight, Brain, Zap, Target } from "lucide-react";
import { useInterviewStore } from "@/lib/store/interviewStore";
import type { InterviewSetupData } from "@/types";

export default function LandingPage() {
  const [showSetup, setShowSetup] = useState(false);
  const [loading, setLoading] = useState(false);
  const { resetStore, addMessage, incrementQuestionCount } = useInterviewStore();
  const router = useRouter();

  const handleSubmit = async (data: InterviewSetupData) => {
    setLoading(true);
    resetStore(); // Reset store before starting a new session
    try {
      // Transform frontend data to match backend schema
      const backendData: Record<string, unknown> = {
        companyName: data.companyName,
        interviewType: data.interviewCategory, // "HR" or "domain-specific"
      };

      // For HR interviews, add hrRoundType
      if (data.interviewCategory === "HR") {
        backendData.hrRoundType = data.interviewType.toLowerCase(); // "screening", "behavioral", etc.
      }

      // For domain-specific interviews, add domain, jobRole, and inputType
      if (data.interviewCategory === "domain-specific") {
        backendData.domain = data.domain;
        backendData.jobRole = data.jobRole;
        backendData.inputType = data.inputType;

        if (data.inputType === "job-description") {
          backendData.jobDescription = data.jobDescription;
        } else if (data.inputType === "skills-based") {
          backendData.skills = data.skills;
        }
      }

      const response = await fetch("https://nexus-prep-server.onrender.com/api/interviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(backendData),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to start interview");
      }

      const { sessionId, question } = await response.json();

      if (!sessionId) {
        throw new Error("No session ID received from server");
      }

      // Initialize the conversation with the intro question
      if (question) {
        addMessage({ role: "ai", content: question });
        incrementQuestionCount();
      }

      router.push(`/${sessionId}`);
    } catch (error) {
      console.error("Error starting interview:", error);
      alert(error instanceof Error ? error.message : "Failed to start interview. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full relative overflow-hidden flex flex-col items-center justify-center p-4">
      {/* Background Ambience */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-purple-600/30 rounded-full blur-[120px] animate-pulse-fast pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-blue-600/30 rounded-full blur-[120px] animate-pulse-fast pointer-events-none delay-1000" />

      {!showSetup ? (
        <div className="max-w-4xl mx-auto flex flex-col items-center text-center space-y-8 animate-in fade-in zoom-in duration-500">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-medium text-gray-300">
              Next-Gen AI Interview Prep
            </span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
            Master Your <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 animate-gradient">
              Dream Job
            </span>
          </h1>

          <p className="text-lg md:text-xl text-gray-400 max-w-2xl">
            Simulate real-world interviews with our advanced AI. Get instant
            feedback, improve your answers, and boost your confidence.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 mt-8">
            <button
              onClick={() => setShowSetup(true)}
              className="group relative px-8 py-4 bg-white text-black font-bold rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:shadow-[0_0_30px_rgba(255,255,255,0.5)] transition-all duration-300 overflow-hidden"
            >
              <span className="relative z-10 flex items-center gap-2">
                Start Interview <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-gray-100 to-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
            <button className="px-8 py-4 bg-white/5 hover:bg-white/10 text-white font-medium rounded-xl border border-white/10 backdrop-blur-md transition-all">
              Watch Demo
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 text-left">
            {[
              { icon: Brain, title: "Smart AI", desc: "Adapts to your responses in real-time." },
              { icon: Target, title: "Role Specific", desc: "Tailored for your specific job role." },
              { icon: Zap, title: "Instant Feedback", desc: "Get detailed analytics instantly." },
            ].map((feature, i) => (
              <div key={i} className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-colors">
                <feature.icon className="w-8 h-8 text-blue-400 mb-3" />
                <h3 className="text-lg font-semibold text-white">{feature.title}</h3>
                <p className="text-sm text-gray-400">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="w-full max-w-4xl animate-in slide-in-from-bottom-10 fade-in duration-500">
          <div className="mb-6 flex items-center gap-2">
            <button onClick={() => setShowSetup(false)} className="text-gray-400 hover:text-white transition-colors">
              &larr; Back to Home
            </button>
          </div>
          <InterviewSetupForm onSubmit={handleSubmit} loading={loading} />
        </div>
      )}
    </div>
  );
}
