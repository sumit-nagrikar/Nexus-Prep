import { ChatOpenAI } from "@langchain/openai";
import { HuggingFaceInferenceEmbeddings } from "@langchain/community/embeddings/hf";

export const createModel = () => {
  return new ChatOpenAI({
    apiKey: process.env.GROQ_API_KEY,
    model: "llama-3.1-8b-instant",
    temperature: 0.4,
    configuration: {
      baseURL: "https://api.groq.com/openai/v1",
    },
  });
};

export const createEmbeddings = () => {
  return new HuggingFaceInferenceEmbeddings({
    apiKey: process.env.HF_API_KEY,
    model: "sentence-transformers/all-MiniLM-L6-v2",
  });
};
