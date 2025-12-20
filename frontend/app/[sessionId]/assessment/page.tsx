"use client";
import React, { useCallback, useEffect, useState } from "react";
import { CheckCircle, CircleCheck } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useInterviewStore } from "@/lib/store/interviewStore";
import { useParams, useRouter } from "next/navigation";
import { useFormStore } from "@/lib/store/formStore";
import { submitFinalInterviewAPI } from "@/lib/api";
import { downloadFeedbackPdf } from "@/lib/downloadAssessment";
import Image from "next/image";
import { ConfirmDialog } from "../ConfirmDialog";
import Lottie from "lottie-react";
import feedbackLoading from "@/public/assets/lottie/feedback-loading.json";

function FinalAssessment() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params?.sessionId as string;
  const { resetForm: resetInterviewSetup, formData } = useFormStore();
  const {
    overallFeedback,
    resetStore: resetInterviewStore,
    setOverallFeedback,
    setInterviewComplete,
    setInterviewStarted,
    questionCount,
    maxQuestions,
    stopSpeaking,
  } = useInterviewStore();
  const [loading, setLoading] = useState(true);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState<boolean>(false);

  const getFinalAssessment = useCallback(async () => {
    if (!sessionId) {
      console.error("Session ID not found.");
      setLoading(false);
      return;
    }

    try {
      const overallData = await submitFinalInterviewAPI(sessionId);

      if (
        !overallData?.overallFeedback ||
        (overallData.status && overallData.status === "error")
      ) {
        console.error("Error fetching final assessment data:", overallData);
        return;
      }

      console.log("final assessment data", overallData);
      setInterviewComplete(true);
      setOverallFeedback(overallData?.overallFeedback);
      setLoading(false);
    } catch (error) {
      console.log("Error getting next question:", error);
      setLoading(false);
    }
  }, [sessionId, setInterviewComplete, setOverallFeedback, setLoading]);

  useEffect(() => {
    getFinalAssessment();
  }, [getFinalAssessment]);

  const startNewInterview = async () => {
    resetInterviewStore();
    resetInterviewSetup();
    setInterviewStarted(false);
    stopSpeaking();
    router.replace("/");
  };

  const handleDownload = async () => {
    try {
      setDownloadLoading(true);
      await downloadFeedbackPdf(overallFeedback, formData);
    } catch (error) {
      console.error("Download failed:", error);
    } finally {
      setDownloadLoading(false);
    }
  };

  useEffect(() => {
    history.pushState(null, "", window.location.href);

    const handlePopState = () => {
      setOpenDialog(true);
      history.pushState(null, "", window.location.href);
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  if (loading) {
    return (
      <div className="bg-background flex flex-col items-center justify-center h-screen w-screen pt-20">
        <Lottie
          animationData={feedbackLoading}
          loop
          autoplay
          className="w-[480px] h-[480px]"
        />
        <p className="text-sm sm:text-base font-medium leading-relaxed text-white">
          Generating your final assessment...
        </p>
        <p className="text-sm sm:text-base font-medium leading-relaxed text-gray-400">
          please wait a few seconds.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-background flex flex-col items-center w-screen pt-20 p-2">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row gap-4 items-center sm:justify-between">
          <div className="flex items-center space-x-2">
            <Image
              src="/assets/svg/Checklist.svg"
              alt="Wave SVG"
              width={32}
              height={32}
            />
            <h1 className="text-xl sm:text-3xl text-white">Interview Assessment</h1>
          </div>
          <div className="flex items-center space-x-2">
            <CircleCheck className="w-6 h-6 text-white fill-green-500" />
            <h1 className="text-base sm:text-xl font-medium text-white">
              Progress: Question {questionCount} of {maxQuestions}
            </h1>
          </div>
        </div>

        <div className="border-2 border-white/10 bg-white/5 backdrop-blur-md py-3 sm:py-9 px-2 sm:px-4 rounded-3xl">
          <div className="px-4 flex items-center justify-between">
            <p className="text-xl leading-relaxed">
              <span className="text-white text-sm sm:text-base">
                Overall Score:{" "}
              </span>
              <span className="text-blue-400 text-sm sm:text-base">
                {overallFeedback?.overall_score}/100%
              </span>
            </p>
            {overallFeedback?.response_depth && (
              <div className="text-sm sm:text-base text-center flex items-center juctify-center font-medium text-green-400 border border-green-400 rounded-full px-2 sm:px-3.5 space-x-2">
                <span className="text-3xl">•</span>
                <p>{overallFeedback?.response_depth}</p>
              </div>
            )}
          </div>

          <div className="bg-white/5 rounded-2xl px-4 mt-2 sm:mt-9 mb-2 sm:mb-6">
            <p className="text-sm sm:text-base font-semibold leading-relaxed text-gray-300">
              Summary:
            </p>
            <p className="text-sm sm:text-base font-medium leading-relaxed text-gray-400">
              {overallFeedback?.summary}
            </p>
          </div>

          <div className="px-4 space-y-2 sm:space-y-4">
            <p className="text-sm sm:text-base font-medium leading-relaxed text-white">
              💡 Clarity of Motivation:
              {overallFeedback?.coaching_scores?.clarity_of_motivation}
            </p>
            <p className="text-sm sm:text-base font-medium leading-relaxed text-white">
              🎯 Career Goal Alignment:
              {overallFeedback?.coaching_scores?.career_goal_alignment}
            </p>
            <p className="text-sm sm:text-base font-medium leading-relaxed text-white">
              📖 Specificity of Learning:
              {overallFeedback?.coaching_scores?.specificity_of_learning}
            </p>
          </div>
        </div>

        <div className="border-2 border-white/10 bg-white/5 backdrop-blur-md pt-3 sm:py-9 px-2 sm:px-8 rounded-3xl">
          <div className="border-b border-white/10 border-dashed sm:pb-4">
            <p className="text-lg sm:text-xl leading-relaxed text-white text-center">
              📋 Question-wise Feedback
            </p>
          </div>

          <div className="space-y-4">
            <Accordion
              type="single"
              collapsible
              className="w-full"
              defaultValue="0"
            >
              {(overallFeedback?.questions_analysis || []).map(
                (section, index) => {
                  return (
                    <AccordionItem
                      value={index.toString()}
                      key={index}
                      className="bg-white/5 mt-2 sm:mt-6 rounded-3xl px-2 sm:px-6 border-white/10"
                    >
                      <AccordionTrigger className="text-sm font-medium text-white">
                        Q{index + 1}: {section.question}
                      </AccordionTrigger>
                      <AccordionContent className="flex flex-col gap-2 sm:gap-4 text-balance">
                        <div className="flex items-start space-x-3">
                          <p className="text-sm leading-relaxed text-gray-300">
                            <span className="font-semibold text-white">
                              🗨️ Your Answer:&nbsp;
                            </span>
                            {section.response}
                          </p>
                        </div>
                        <div className="flex items-start space-x-3">
                          <p className="text-sm leading-relaxed text-red-400">
                            <span className="font-semibold text-white">🧠 Feedback:</span>{" "}
                            {section.feedback}
                          </p>
                        </div>
                        {section.strengths.length > 0 && (
                          <div className="flex items-start space-x-3 mb-2">
                            <p className="text-white">✅ Strengths: </p>
                            <div className="flex flex-wrap gap-2">
                              {section.strengths?.map(
                                (item: string, idx: number) => (
                                  <span
                                    key={`strength-${idx}`}
                                    className="bg-green-500/20 text-green-400 border border-green-500/30 sm:px-3 py-1 text-xs rounded-full font-medium"
                                  >
                                    {item}
                                  </span>
                                )
                              )}
                            </div>
                          </div>
                        )}

                        {section.improvements.length > 0 && (
                          <div className="flex items-start space-x-3 mb-2">
                            <p className="text-nowrap text-white">⚠️ Improvements: </p>
                            <div className="flex flex-wrap gap-2">
                              {section.improvements?.map(
                                (item: string, idx: number) => (
                                  <span
                                    key={`improvement-${idx}`}
                                    className="text-red-400 sm:px-3 py-1 text-xs font-medium"
                                  >
                                    {item}
                                  </span>
                                )
                              )}
                            </div>
                          </div>
                        )}
                        <div className="flex items-start space-x-3">
                          <div className="flex items-start space-x-3 bg-blue-500/20 border border-blue-500/30 px-3.5 py-1.5 rounded-full">
                            <p className="text-sm leading-relaxed text-blue-400">
                              <span className="text-white font-semibold">
                                📊 Score:{" "}
                              </span>
                              {section.score}/10
                            </p>
                          </div>
                          <div className="flex items-start space-x-3 bg-blue-500/20 border border-blue-500/30 px-3.5 py-1.5 rounded-full">
                            <p className="text-sm leading-relaxed text-blue-400">
                              <span className="text-white font-semibold">
                                🎓 Depth:{" "}
                              </span>
                              {section.response_depth}
                            </p>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                }
              )}
            </Accordion>
          </div>
        </div>

        <div className="border-2 border-white/10 bg-white/5 backdrop-blur-md py-3 sm:py-9 px-2 sm:px-8 rounded-3xl">
          <div className="flex items-start space-x-3">
            <CheckCircle className="w-4 h-4 text-purple-400 mt-1 flex-shrink-0" />
            <p className="text-sm leading-relaxed text-gray-300">
              {overallFeedback?.closure_message}
            </p>
          </div>
        </div>
      </div>
      <div className="max-w-4xl mx-auto w-full py-3 my-2 flex justify-between space-x-6 ">
        <button
          onClick={handleDownload}
          disabled={downloadLoading}
          className="py-2 w-full bg-white/5 hover:bg-white/10 text-blue-400 border border-blue-500/30 rounded-md cursor-pointer transition-all disabled:opacity-50 disabled:cursor-wait"
        >
          {downloadLoading ? "Downloading..." : "Download Report"}
        </button>
        <button
          onClick={startNewInterview}
          className="py-2 w-full bg-blue-600 hover:bg-blue-500 text-white rounded-md cursor-pointer transition-all shadow-lg shadow-blue-500/20"
        >
          Start New Interview
        </button>
      </div>
      <ConfirmDialog openDialogue={openDialog} setOpenDialog={setOpenDialog} />
    </div>
  );
}

export default FinalAssessment;
