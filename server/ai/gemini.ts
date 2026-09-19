import { GoogleGenAI } from "@google/genai";

let aiClient: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    console.warn("GEMINI_API_KEY is not configured. AI requests will use fallback mock generators.");
    return null;
  }

  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }

  return aiClient;
}

export const GEMINI_MODELS = {
  TEXT: "gemini-3.8-flash",
  GENERAL: "gemini-3.5-flash",
  COMPLEX: "gemini-3.1-pro-preview",
  FAST: "gemini-3.1-flash-lite",
  EMBEDDINGS: "gemini-embedding-2-preview",
};
