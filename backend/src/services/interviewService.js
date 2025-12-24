import {
  AIMessage,
  HumanMessage,
  SystemMessage,
} from "@langchain/core/messages";
import { InterviewSession } from "../models/interviewSession.js";
import { AIService } from "./aiService.js";
import { AppError } from "../utils/AppError.js";

export class InterviewService {
  constructor() {
    this.aiService = new AIService();
  }

  async startInterview(
    companyName,
    jobRole,
    inputType,
    jobDescription,
    skills,
    interviewType,
    domain,
    hrRoundType
  ) {

    let sessionData = {
      companyName,
      interviewType,
      chatHistory: [],
      status: "active",
      currentStep: "questioning",
    };

    if (interviewType === "domain-specific") {
      sessionData = {
        ...sessionData,
        jobRole,
        inputType,
        jobDescription,
        skills,
        domain,
      };
    }

    if (interviewType === "HR") {
      sessionData = {
        ...sessionData,
        hrRoundType,
      };
    }
    const newSession = new InterviewSession(sessionData);

    const savedSession = await newSession.save();

    return { sessionId: savedSession._id.toString() };
  }


  async getNextQuestion(sessionId) {
    const session = await InterviewSession.findById(sessionId);
    if (!session) throw new Error("Session not found");

    if (session.status === "completed") {
      throw new AppError(
        "Interview is already completed, can not get next question",
        400
      );
    }

    let response;

    if (session.interviewType === "HR") {
      const hrChain = await this.aiService.createHRInterviewChain(
        session.hrRoundType
      );

      response = await hrChain.invoke({
        input: "Generate the next HR interview question based on conversation history.",
        chat_history: session.chatHistory.map((msg) =>
          msg.role === "human"
            ? new HumanMessage(msg.content)
            : new AIMessage(msg.content)
        ),
      });

      session.chatHistory.push({ role: "ai", content: response.content });
      await session.save();
      return response.content;
    } else {
      let conversationChain;
      if (session.inputType === "skills-based") {
        conversationChain = await this.aiService.createInterviewChainSkillsBased(
          session.skills,
          session.interviewType,
          session.domain
        );
      } else {
        conversationChain = await this.aiService.createInterviewChain(
          session.jobDescription,
          session.interviewType,
          session.domain
        );
      }

      response = await conversationChain.invoke({
        input: "Generate the next question based on the conversation history.",
        chat_history: session.chatHistory.map((msg) =>
          msg.role === "human"
            ? new HumanMessage(msg.content)
            : new AIMessage(msg.content)
        ),
      });

      const answerContent =
        session.inputType === "skills-based" ? response.content : response.answer;

      session.chatHistory.push({ role: "ai", content: answerContent });
      await session.save();

      return answerContent;
    }
  }

  async getIntroQuestion(sessionId) {
    const session = await InterviewSession.findById(sessionId);
    if (!session) throw new Error("Session not found");
    if (session.chatHistory.length > 0)
      throw new Error("Intro question can only be asked at the beginning.");

    const input =
      "Start the interview with an introductory greeting and first question.";

    let response;
    let data;

    // interviewtype === HR -> hrRoundType

    if (session.interviewType === "HR") {
      response = await this.aiService.askHRIntroQuestion(
        session.companyName,
        session.hrRoundType,
        input
      );
      data = response.content;
    } else {
      if (session.inputType === "skills-based") {
        // Skills-based flow
        response = await this.aiService.askIntroQuestionSkillsBased(
          session.skills,
          session.interviewType,
          session.domain,
          session.companyName,
          session.chatHistory,
          session.jobRole,
          input
        );
        data = response.content;
      } else {
        // JD-based flow
        response = await this.aiService.askIntroQuestion(
          session.jobDescription,
          session.interviewType,
          session.domain,
          session.companyName,
          session.chatHistory,
          session.jobRole,
          input
        );
        data = response.answer;
      }
    }

    session.chatHistory.push({ role: "ai", content: data });
    await session.save();

    return data;
  }

  async postAnswer(sessionId, answer) {
    const session = await InterviewSession.findById(sessionId);
    if (!session) throw new Error("Session not found");

    if (session.status === "completed") {
      throw new AppError(
        "Interview is already completed, can not post answer",
        400
      );
    }

    session.chatHistory.push({ role: "human", content: answer });

    const feedbackResponse = await this.aiService.generateFeedback(
      answer,
      session.interviewType,
      session.chatHistory.map((msg) =>
        msg.role === "human"
          ? new HumanMessage(msg.content)
          : new AIMessage(msg.content)
      ),
      session.jobRole,
      session.domain
    );

    session.currentStep = "feedback";
    session.lastFeedback = feedbackResponse.content;
    await session.save();

    return { feedback: feedbackResponse.content };
  }

  async getTopSkills(domain, jobRole) {
  const response = await this.aiService.generateRecommendedSkills(domain, jobRole);
  const raw = response.content;

  // 1. Try to extract JSON array safely
  const arrayMatch = raw.match(/\[[\s\S]*?\]/);

  if (arrayMatch) {
    try {
      return JSON.parse(arrayMatch[0]);
    } catch (e) {
      console.warn("JSON array parse failed, falling back:", e.message);
    }
  }

  // 2. Hard fallback (never break API)
  console.warn("Using fallback skills due to invalid LLM output");

  return [
    "JavaScript",
    "Node.js",
    "Express.js",
    "MongoDB",
    "REST APIs",
    "Git",
  ];
}


  async reviseAnswer(sessionId) {
    const session = await InterviewSession.findById(sessionId);
    if (!session) throw new Error("Session not found");

    if (session.status === "completed") {
      throw new AppError(
        "Interview is already completed, can not revise answer",
        400
      );
    }

    const lastMessage = session.chatHistory.pop();
    if (!lastMessage || lastMessage.role !== "human")
      throw new AppError("No recent human answer to revise.", 400);

    session.currentStep = "revise";
    await session.save();

    const lastQuestion = session.chatHistory
      .filter((m) => m.role === "ai")
      .slice(-1)[0]?.content;
    return { question: lastQuestion };
  }

  async submitInterview(sessionId) {
    const session = await InterviewSession.findById(sessionId);
    if (!session) throw new AppError("Session not found", 400);

    if (session.status === "completed" && session.overallFeedback) {
      console.log("Interview already completed, returning cached feedback");
      return {
        feedback: session.overallFeedback,
        status: session.status,
      };
    }

    if (session.status === "submitting") {
      throw new AppError("Interview submission is already in progress", 400);
    }

    session.status = "submitting";
    await session.save();

    try {
      const feedback = await this.getFinalFeedback(sessionId);

      if (!feedback || !feedback.success) {
        console.warn("Final feedback generation failed, using fallback");
      }

      session.overallFeedback = feedback.result;
      session.status = "completed";
      await session.save();

      return {
        feedback: feedback.result,
        status: session.status,
      };
    } catch (error) {
      session.status = "active";
      await session.save();
      throw error;
    }
  }

  async getFinalFeedback(sessionId) {
    const session = await InterviewSession.findById(sessionId);
    if (!session) throw new AppError("Session not found", 400);

    try {
      const chatHistory = session.chatHistory;
      const qaPairs = [];

      for (let i = 0; i < chatHistory.length - 1; i += 2) {
        const aiMsg = chatHistory[i];
        const humanMsg = chatHistory[i + 1];

        if (aiMsg?.role === "ai" && humanMsg?.role === "human") {
          qaPairs.push(
            `Q${qaPairs.length + 1}: ${aiMsg.content}\nA${qaPairs.length + 1
            }: ${humanMsg.content}`
          );
        }
      }

      const qnaContext = qaPairs.join("\n\n");

      const result = await this.aiService.generateFinalAssessment([
        new SystemMessage(
          `You are a JSON generator for interview feedback. Below are question-answer pairs. You must evaluate all of them.`
        ),
        new HumanMessage(qnaContext),
      ]);

      // if (!result.result?.questions_analysis || result.result.questions_analysis.length < 5) {
      //   console.warn("Incomplete Q&A detected:", result.result.questions_analysis?.length);
      // }

      const overAllScore = await this.calculateOverallScore(
        result?.result.questions_analysis,
        result?.result.coaching_scores
      );
      const level = await this.getLevel(overAllScore);

      result.result.overall_score = overAllScore;
      result.result.level = level;

      return result;
    } catch (err) {
      console.error("AI feedback generation error:", err.message);

      return {
        success: false,
        result: {
          overall_score: 50,
          level: "Basic",
          summary: "Technical error occurred during assessment generation.",
          questions_analysis: [],
          coaching_scores: {
            clarity_of_motivation: 3,
            specificity_of_learning: 3,
            career_goal_alignment: 3,
          },
          recommendations: [
            "Please retake the interview for proper assessment.",
          ],
          closure_message:
            "Thank you for your participation. Please try again later.",
        },
      };
    }
  }

  async getInterviewStatus(sessionId) {
    const session = await InterviewSession.findById(sessionId);
    if (!session) throw new Error("Session not found");

    return session.status;
  }

  async calculateOverallScore(questions, coaching) {
    if (!Array.isArray(questions)) {
      throw new Error("Invalid questions array");
    }

    const totalQuestionScore = questions.reduce((sum, q) => sum + q.score, 0);
    const maxQuestionScore = questions.length * 10;

    const coachingTotal =
      coaching.clarity_of_motivation +
      coaching.specificity_of_learning +
      coaching.career_goal_alignment;

    const weightedQuestion = (totalQuestionScore / maxQuestionScore) * 80;
    const weightedCoaching = (coachingTotal / 15) * 20;

    const finalScore = Math.round(weightedQuestion + weightedCoaching);
    return finalScore;
  }

  async getLevel(score) {
    if (score < 50) return "Basic";
    if (score < 80) return "Competent";
    return "High-Caliber";
  }
}
