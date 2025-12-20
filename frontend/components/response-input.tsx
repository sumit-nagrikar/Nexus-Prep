"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { getNextQuestionAPI, reviseAnswerAPI } from "@/lib/api";
import { useInterviewStore } from "@/lib/store/interviewStore";
import { useParams, useRouter } from "next/navigation";
import { ResponseInputProps } from "@/types";
import Image from "next/image";
import { Textarea } from "./ui/textarea";
import { Pause, Loader, Mic } from "lucide-react";

const maxAnswerLength = 1499;
const minAnswerLength = 140;

const answerProgressColor = (length: number) => {
  if (length < minAnswerLength) {
    return <span className="text-yellow-500 text-xs">{length}/{minAnswerLength} (min)</span>
  }
  return <span className="text-green-500 text-xs">{length}/{maxAnswerLength}</span>
}

export function ResponseInput({
  onSubmitText,
  onStartRecording,
  onStopRecording,
  isTranscribing,
  isRecording,
  isAISpeaking,
  isWaiting,
  speakTextWithTTS,
  isLatestFeedback,
  textResponse,
  setTextResponse,
}: ResponseInputProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const {
    addMessage: setConversation,
    interviewComplete,
    questionCount,
    incrementQuestionCount,
    maxQuestions,
  } = useInterviewStore();

  const [countdown, setCountdown] = useState<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const params = useParams();
  const sessionId = params?.sessionId as string;

  const handleSubmit = useCallback(() => {
    if (textResponse?.trim()) {
      onSubmitText(textResponse);
      setTextResponse("");
    }
  }, [textResponse, onSubmitText, setTextResponse]);

  const handleReviseQuestion = useCallback(async () => {
    setLoading(true);
    try {
      const data = await reviseAnswerAPI(sessionId);
      setConversation({
        role: "ai",
        content: data.question,
        isFeedback: false,
      });
      speakTextWithTTS(data.question);
    } catch (error) {
      console.error("Error revising answer:", error);
    } finally {
      setLoading(false);
    }
  }, [sessionId, setConversation, speakTextWithTTS]);

  const getNextQuestion = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getNextQuestionAPI(sessionId);
      incrementQuestionCount();
      setConversation({
        role: "ai",
        content: data?.question,
        isFeedback: false,
      });
      speakTextWithTTS(data?.question);
    } catch (error) {
      console.error("Error getting next question:", error);
    } finally {
      setLoading(false);
    }
  }, [sessionId, incrementQuestionCount, setConversation, speakTextWithTTS]);

  const handleStartRecording = () => {
    if (isRecording) {
      return;
    }
    setCountdown(60);
    onStartRecording();

    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev && prev > 1) {
          return prev - 1;
        } else {
          handleStopRecording();
          return 0;
        }
      });
    }, 1000);
  };

  const handleStopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setCountdown(null);
    onStopRecording();
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        if (textResponse?.trim() && textResponse?.length > minAnswerLength) {
          handleSubmit();
        } else {
          event.preventDefault();
          inputRef.current?.focus();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [textResponse, handleSubmit]);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = `${inputRef.current.scrollHeight}px`;
    }
  }, [textResponse]);

  if (!sessionId) return null;

  return (
    <div className="w-full flex flex-col sm:py-2 px-2">
      {!interviewComplete && isLatestFeedback ? (
        <div className="w-full flex sm:flex-row flex-col items-center justify-center gap-4 sm:p-5 md:p-0 pb-2 sm:pb-0 glass-card p-4 rounded-xl border-blue-500/20">
          <p className="text-white text-sm sm:text-base font-medium text-center">
            Review your feedback. Would you like to try again?
          </p>
          <div className="flex flex-row gap-3">
            <Button
              onClick={handleReviseQuestion}
              disabled={isAISpeaking || loading}
              className="bg-blue-600 hover:bg-blue-500 text-white rounded-lg shadow-lg shadow-blue-500/20"
            >
              Retry Answer
            </Button>
            <Button
              onClick={() => {
                if (maxQuestions === questionCount) {
                  router.replace(`/${sessionId}/assessment`);
                } else {
                  getNextQuestion();
                }
              }}
              disabled={isAISpeaking || loading}
              variant="outline"
              className="border-white/10 hover:bg-white/10 text-white"
            >
              {maxQuestions === questionCount ? "Finish Interview" : "Next Question"}
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex-1 flex gap-2 relative">
            <div className="absolute inset-0 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 shadow-xl" />
            <Textarea
              placeholder={
                isAISpeaking
                  ? "AI is analyzing..."
                  : isRecording
                    ? "Listening to you..."
                    : isTranscribing
                      ? "Processing audio..."
                      : "Type your answer here..."
              }
              ref={inputRef}
              value={textResponse}
              onChange={(e) => setTextResponse(e.target.value)}
              onPaste={(e) => e.preventDefault()}
              minLength={minAnswerLength}
              maxLength={maxAnswerLength}
              rows={1}
              style={{
                height: "auto",
                maxHeight: "7rem",
                overflowY: "auto",
              }}
              className="relative z-10 w-full min-h-[60px] max-h-[150px] bg-transparent border-none focus:ring-0 text-white placeholder:text-gray-500 resize-none p-4 pr-32 custom-scrollbar"
            />

            <div className="absolute bottom-2 right-2 z-20 flex items-center gap-2">
              <Button
                onClick={isRecording ? handleStopRecording : handleStartRecording}
                variant="ghost"
                disabled={isAISpeaking || isWaiting || isTranscribing}
                className={`w-10 h-10 rounded-full p-0 flex items-center justify-center transition-all duration-300 ${isRecording
                  ? "bg-red-500/20 text-red-500 hover:bg-red-500/30 animate-pulse"
                  : "bg-white/5 text-blue-400 hover:bg-white/10"
                  }`}
              >
                {isRecording ? (
                  <Pause size={18} />
                ) : isTranscribing ? (
                  <Loader className="w-4 h-4 animate-spin" />
                ) : (
                  <Mic size={18} />
                )}
              </Button>

              <Button
                onClick={isRecording ? handleStopRecording : handleSubmit}
                disabled={
                  isWaiting ||
                  isAISpeaking ||
                  isRecording ||
                  isTranscribing ||
                  !textResponse?.trim() ||
                  textResponse?.length < minAnswerLength
                }
                className="w-10 h-10 rounded-full bg-blue-600 hover:bg-blue-500 text-white p-0 flex items-center justify-center shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Image
                  src="/assets/svg/send.svg"
                  alt="send"
                  height={18}
                  width={18}
                  className="brightness-0 invert"
                />
              </Button>
            </div>
          </div>

          <div className="flex justify-end gap-2 px-2 mt-1">
            {isRecording && (
              <span className="text-red-400 text-xs font-mono animate-pulse">
                {`${Math.floor((countdown || 0) / 60).toString().padStart(2, "0")}:${((countdown || 0) % 60).toString().padStart(2, "0")}`}
              </span>
            )}

            {!isRecording && textResponse.length > 0 && answerProgressColor(textResponse.length)}
          </div>
        </>
      )}
    </div>
  );
}
