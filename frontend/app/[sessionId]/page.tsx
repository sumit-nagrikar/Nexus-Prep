"use client";

import { useEffect, useRef, useState } from "react";
import { FeedbackDisplay } from "@/components/feedback-display";
import { VideoCall } from "@/components/video-call";
import { AudioRecorder } from "@/components/audio-recorder";
import { ResponseInput } from "@/components/response-input";
import { useParams } from "next/navigation";
import { submitAnswerAPI } from "@/lib/api";
import { useFormStore } from "@/lib/store/formStore";
import { useInterviewStore } from "@/lib/store/interviewStore";
import { speakTextWithTTS } from "@/lib/audioApi";
import { ConfirmDialog } from "./ConfirmDialog";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { SkipForward, MessageSquare } from "lucide-react";

export default function AIInterviewSystem() {
  const { formData: interviewSetup } = useFormStore();
  const {
    conversation,
    addMessage: setConversation,
    overallFeedback,
    interviewComplete,
    isAISpeaking,
    questionCount,
    maxQuestions,
    stopSpeaking,
  } = useInterviewStore();
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isWaiting, setIsWaiting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const params = useParams();
  const sessionId = params?.sessionId as string;
  const [openDialog, setOpenDialog] = useState<boolean>(false);
  const [textResponse, setTextResponse] = useState("");

  const { startRecording, stopRecording } = AudioRecorder({
    onTranscription: (text) => {
      setTextResponse((prev) => prev + text);
      setIsTranscribing(false);
    },
    isRecording,
    onRecordingStart: () => setIsRecording(true),
    onRecordingStop: () => {
      setIsRecording(false);
      setIsTranscribing(true);
    },
  });

  const handleUserResponse = async (userResponse: string) => {
    if (!interviewSetup) return;

    if (!sessionId) {
      console.error("Session ID not found.");
      return;
    }

    const newConversation = { role: "user" as const, content: userResponse };
    setConversation(newConversation);
    setIsWaiting(true);

    try {
      const data = await submitAnswerAPI(sessionId, userResponse);

      setConversation({ role: "ai", content: data.feedback, isFeedback: true });
      await speakTextWithTTS(data.feedback);
    } catch (error) {
      console.error("Error getting AI response:", error);
    } finally {
      setIsWaiting(false);
    }
  };

  const hasSpokenIntro = useRef(false);

  useEffect(() => {
    // Speak first question if it's the beginning of the interview
    if (conversation.length === 1 && conversation[0].role === "ai" && !isAISpeaking && !hasSpokenIntro.current) {
      hasSpokenIntro.current = true;
      speakTextWithTTS(conversation[0].content);
    }
  }, [conversation, isAISpeaking]);

  useEffect(() => {
    scrollRef?.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation, overallFeedback]);

  useEffect(() => {
    history.pushState(null, "", window.location.href);

    const handlePopState = () => {
      setOpenDialog(true);
      history.pushState(null, "", window.location.href);
    };

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      setOpenDialog(true);
    };

    window.addEventListener("popstate", handlePopState);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  return (
    <div className="w-full h-screen pt-20 flex flex-col p-4 bg-background overflow-hidden">
      {/* Mobile progress */}
      <div className="mb-4 sm:hidden flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md shrink-0">
        <span className="text-sm font-medium text-gray-300">Question {questionCount} of {maxQuestions}</span>
        <div className="flex gap-1">
          {[...Array(maxQuestions)].map((_, i) => (
            <div key={i} className={`h-1.5 w-4 rounded-full ${i < questionCount ? "bg-green-500" : "bg-gray-700"}`} />
          ))}
        </div>
      </div>

      <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0 overflow-hidden">
        {/* Left Panel: Video & Info */}
        <div className="hidden lg:flex lg:col-span-4 flex-col gap-4 h-full min-h-0">
          <div className="shrink-0">
            <VideoCall />
          </div>

          <div className="flex-1 glass-card p-6 rounded-2xl flex flex-col gap-4 border-white/5 overflow-hidden">
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Interview Session</h3>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs border border-blue-500/20">
                  {interviewSetup?.jobRole || "Software Engineer"}
                </span>
                <span className="px-3 py-1 rounded-full bg-purple-500/10 text-purple-400 text-xs border border-purple-500/20">
                  {interviewSetup?.companyName || "Tech Corp"}
                </span>
              </div>
            </div>

            <div className="mt-auto shrink-0">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">Progress</span>
                <span className="text-sm text-white font-medium">{Math.round((questionCount / maxQuestions) * 100)}%</span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-500 to-purple-500 h-full transition-all duration-500" style={{ width: `${(questionCount / maxQuestions) * 100}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel: Chat Interface */}
        <div className="lg:col-span-8 flex flex-col h-full glass-card rounded-2xl overflow-hidden border-white/5 relative">
          {/* Header */}
          <div className="p-4 border-b border-white/5 bg-black/20 flex items-center justify-between backdrop-blur-xl z-20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-white">Interview Assistant</h2>
                <p className="text-xs text-gray-400">Powered by NexusAI</p>
              </div>
            </div>

            <Button
              variant="ghost"
              onClick={() => setOpenDialog(true)}
              className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
            >
              End Session
            </Button>
          </div>

          {/* Chat Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar relative">
            {/* Background Grid */}
            <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-5 pointer-events-none" />

            {conversation.map((message, index) => {
              const isLast = index === conversation.length - 1;
              if (message?.isFeedback) {
                return <FeedbackDisplay key={index} feedback={message.content} isLastMessage={isLast} />;
              }

              const isAI = message.role === "ai";

              return (
                <div key={index} className={`flex gap-4 ${isAI ? "" : "flex-row-reverse"}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isAI ? "bg-blue-600" : "bg-purple-600"}`}>
                    <Image
                      src={isAI ? "/assets/svg/interviewAi.svg" : "/assets/images/maleAvatar.jpg"}
                      alt={message.role}
                      width={20}
                      height={20}
                      className="rounded-full"
                    />
                  </div>

                  <div className={`flex flex-col gap-1 max-w-[80%] ${isAI ? "items-start" : "items-end"}`}>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-400">{isAI ? "AI Interviewer" : "You"}</span>
                      {isAI && isLast && isAISpeaking && (
                        <button onClick={stopSpeaking} className="flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300 transition-colors">
                          <SkipForward className="w-3 h-3" /> Skip
                        </button>
                      )}
                    </div>

                    <div className={`p-4 rounded-2xl text-sm leading-relaxed ${isAI
                      ? "bg-white/5 border border-white/10 text-gray-200 rounded-tl-none"
                      : "bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-tr-none shadow-lg shadow-blue-500/10"
                      }`}>
                      {message.content}
                    </div>
                  </div>
                </div>
              )
            })}
            <div ref={scrollRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-white/5 bg-black/20 backdrop-blur-xl z-20">
            {!interviewComplete && (
              <ResponseInput
                onSubmitText={handleUserResponse}
                onStartRecording={startRecording}
                onStopRecording={stopRecording}
                isTranscribing={isTranscribing}
                isRecording={isRecording}
                isAISpeaking={isAISpeaking}
                isWaiting={isWaiting}
                speakTextWithTTS={speakTextWithTTS}
                isLatestFeedback={conversation.length > 0 ? conversation[conversation.length - 1]?.isFeedback ?? false : false}
                textResponse={textResponse}
                setTextResponse={setTextResponse}
              />
            )}
          </div>
        </div>

        {/* Mobile Tabs */}
        <div className="lg:hidden">
          {/* Logic for mobile tabs if needed, but the grid layout usually stacks.
                For now, we just let it stack or hide video on mobile if preferred.
                The previous code used Tabs, let's keep it simple for now or revive Tabs if requested.
                Given the complexity, a stack is better. Visuals first.
            */}
        </div>
      </div>

      <ConfirmDialog openDialogue={openDialog} setOpenDialog={setOpenDialog} />
    </div>
  );
}
