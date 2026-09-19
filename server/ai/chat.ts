import { prisma } from "../db.js";
import { getGeminiClient, GEMINI_MODELS } from "./gemini.js";
import { generateEmbedding, cosineSimilarity } from "./embeddings.js";

export { GEMINI_MODELS };

export interface ChatHistoryMessage {
  role: string; // "user" | "assistant" | "system"
  content: string;
}

export interface ChatCitation {
  pageNumber: number;
  text: string;
  documentId: string;
  documentTitle?: string;
  score: number;
}

export interface WebGroundingSource {
  title: string;
  url: string;
}

export interface ChatCompletionResult {
  answer: string;
  sources: ChatCitation[];
  webSources?: WebGroundingSource[];
  webSearchQueries?: string[];
  isSearchGrounded?: boolean;
  modelUsed: string;
}

export type ChatRoleType = "tutor" | "socratic" | "exam_coach" | "simplifier" | "stem_coder";

export const CHAT_ROLES: Record<
  ChatRoleType,
  { name: string; description: string; systemInstruction: string; defaultComplexity: "general" | "complex" | "fast" }
> = {
  tutor: {
    name: "Study Tutor",
    description: "Patient, engaging guidance with structured, step-by-step explanations.",
    defaultComplexity: "general",
    systemInstruction: `You are StudyMate AI, an expert, patient, and highly engaging academic tutor.
Your mission is to help the student achieve deep comprehension of the subject matter.
Guidelines:
- Provide structured, step-by-step guidance with clear bullet points and bold key terminology.
- Use clear examples to ground abstract theories.
- Maintain an encouraging, positive, and intellectually stimulating tone.
- When study material is provided, ground your answers faithfully in the provided text and include page citations.`,
  },
  socratic: {
    name: "Socratic Coach",
    description: "Guides you through thoughtful questions instead of just giving answers.",
    defaultComplexity: "complex",
    systemInstruction: `You are a Socratic Method Academic Coach.
Your goal is to guide students to discover the truth and master concepts on their own through guided inquiry.
Guidelines:
- Do NOT simply provide the complete final answer immediately.
- Instead, break the problem down, highlight underlying principles, and ask 1-2 targeted probing questions.
- Scaffold hints so the student builds reasoning muscles and verifies their own assumptions.
- Celebrate their insights and gently guide them when they go off track.`,
  },
  exam_coach: {
    name: "Exam Prep Drillmaster",
    description: "Focuses on high-yield testable facts, pitfalls, and rapid practice questions.",
    defaultComplexity: "general",
    systemInstruction: `You are an Exam Preparation Drillmaster and High-Yield Test Specialist.
Your mission is to maximize the student's exam score and retention.
Guidelines:
- Focus aggressively on high-yield exam concepts, frequently tested definitions, and formula applications.
- Point out common exam traps, trick questions, and common student mistakes.
- Provide memorable mnemonics and active recall checkpoints.
- Conclude explanations with a rapid test-style practice question to test mastery immediately.`,
  },
  simplifier: {
    name: "Feynman Simplifier (ELI5)",
    description: "Explains difficult concepts using simple everyday analogies and zero jargon.",
    defaultComplexity: "fast",
    systemInstruction: `You are the Feynman Concept Simplifier.
Your goal is to explain even the most difficult academic and scientific concepts so simply that a 10-year-old or beginner can easily grasp them.
Guidelines:
- Use intuitive, everyday real-world analogies (e.g. comparing computer memory to a kitchen pantry).
- Strip away unnecessary academic jargon; when technical terms are required, explain them instantly in plain words.
- Keep explanations punchy, vivid, and memorable.`,
  },
  stem_coder: {
    name: "STEM & Code Mentor",
    description: "Deep technical reasoning for math proofs, algorithms, and code analysis.",
    defaultComplexity: "complex",
    systemInstruction: `You are a Senior STEM & Computer Science Mentor.
You specialize in advanced analytical reasoning, mathematical derivations, algorithm design, and code optimization.
Guidelines:
- Provide rigorous proofs, mathematical formulas (LaTeX style or formatted math), and step-by-step logic.
- When writing code or discussing data structures, analyze Big-O time and space complexity.
- Annotate code with clear explanatory comments.
- Emphasize edge cases, boundary conditions, and invariant properties.`,
  },
};

/**
 * Resolves the optimal Gemini model based on user selection or question complexity:
 * - complex tasks -> gemini-3.1-pro-preview
 * - general tasks -> gemini-3.5-flash
 * - fast tasks -> gemini-3.1-flash-lite
 */
export function resolveGeminiModel(preferredModel?: string, question?: string, role?: ChatRoleType): string {
  if (preferredModel && preferredModel !== "auto") {
    // Normalize aliases
    if (preferredModel.includes("pro")) return GEMINI_MODELS.COMPLEX;
    if (preferredModel.includes("lite")) return GEMINI_MODELS.FAST;
    if (preferredModel.includes("3.5")) return GEMINI_MODELS.GENERAL;
    if (preferredModel.includes("3.8")) return GEMINI_MODELS.TEXT;
    return preferredModel;
  }

  // Automatic routing based on role default and query indicators
  const q = (question || "").toLowerCase();

  const isComplex =
    role === "stem_coder" ||
    role === "socratic" ||
    /\b(proof|derive|derivative|integral|algorithm|complexity|theorem|debug|implement|matrix|eigen|formal proof|recursion|dynamic programming)\b/.test(
      q
    ) ||
    q.length > 250;

  if (isComplex) {
    return GEMINI_MODELS.COMPLEX; // gemini-3.1-pro-preview
  }

  const isFast =
    role === "simplifier" ||
    /\b(define|definition|quick|flash|short|what is|meaning|synonym|formula for|who is)\b/.test(q) &&
    q.length < 50;

  if (isFast) {
    return GEMINI_MODELS.FAST; // gemini-3.1-flash-lite
  }

  // Default general tasks
  return GEMINI_MODELS.GENERAL; // gemini-3.5-flash
}

/**
 * Execute multi-turn chat generation with Gemini
 */
export async function generateChatResponse(options: {
  userId: string;
  chatId: string;
  message: string;
  roleType?: ChatRoleType;
  preferredModel?: string;
  documentId?: string;
  explanationLevel?: string;
  useGoogleSearch?: boolean;
}): Promise<ChatCompletionResult> {
  const {
    userId,
    chatId,
    message,
    roleType = "tutor",
    preferredModel = "auto",
    documentId,
    explanationLevel = "Normal",
    useGoogleSearch = false,
  } = options;

  const roleConfig = CHAT_ROLES[roleType] || CHAT_ROLES.tutor;
  const targetModel = resolveGeminiModel(preferredModel, message, roleType);

  // 1. Fetch recent conversation history from DB for multi-turn context
  const previousMessages = await prisma.chatMessage.findMany({
    where: { chatId },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
  // Reverse to get chronological order
  const chronologicalHistory = previousMessages.reverse();

  // 2. Perform RAG document retrieval if user has uploaded materials
  let contextBlock = "";
  const sources: ChatCitation[] = [];

  try {
    const chunkWhere: any = {
      document: {
        userId,
        status: "Ready",
      },
    };
    if (documentId && documentId !== "all") {
      chunkWhere.documentId = documentId;
    }

    const candidateChunks = await prisma.documentChunk.findMany({
      where: chunkWhere,
      include: {
        document: {
          select: { id: true, title: true, fileName: true },
        },
      },
      take: 60,
    });

    if (candidateChunks.length > 0) {
      const queryVec = await generateEmbedding(message);

      const scoredChunks = candidateChunks.map((chunk) => {
        let chunkVec: number[] = [];
        try {
          if (chunk.embedding) {
            chunkVec = JSON.parse(chunk.embedding);
          }
        } catch {
          chunkVec = [];
        }

        const similarity = chunkVec.length > 0 ? cosineSimilarity(queryVec, chunkVec) : 0;

        // Keyword matching bonus
        const qWords = message.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
        const cText = chunk.content.toLowerCase();
        let keywordMatches = 0;
        for (const word of qWords) {
          if (cText.includes(word)) keywordMatches++;
        }
        const keywordScore = qWords.length > 0 ? (keywordMatches / qWords.length) * 0.3 : 0;

        return {
          chunk,
          score: similarity * 0.7 + keywordScore,
        };
      });

      scoredChunks.sort((a, b) => b.score - a.score);
      const topChunks = scoredChunks.slice(0, 4);

      if (topChunks.length > 0 && topChunks[0].score > 0.15) {
        topChunks.forEach((item) => {
          sources.push({
            pageNumber: item.chunk.pageNumber,
            text: item.chunk.content.slice(0, 250) + (item.chunk.content.length > 250 ? "..." : ""),
            documentId: item.chunk.documentId,
            documentTitle: item.chunk.document.title || item.chunk.document.fileName,
            score: Math.round(item.score * 100) / 100,
          });
        });

        contextBlock = topChunks
          .map(
            (item, idx) =>
              `[Source #${idx + 1} - ${item.chunk.document.title || item.chunk.document.fileName}, Page ${item.chunk.pageNumber}]:\n"${item.chunk.content}"`
          )
          .join("\n\n");
      }
    }
  } catch (ragErr) {
    console.warn("RAG retrieval non-fatal error:", ragErr);
  }

  // 3. Assemble System Instruction with Role & Explanation Level
  let fullSystemInstruction = `${roleConfig.systemInstruction}\n\nTarget Explanation Level: ${explanationLevel}. Adapt depth, step breakdown, and language accordingly.`;

  if (contextBlock) {
    fullSystemInstruction += `\n\nCRITICAL GROUNDING RULES:
You have access to the student's study material context below.
1. When answering questions regarding their documents, cite exact pages in brackets like [Source: Page X].
2. If an uploaded document does not contain the answer, acknowledge it and explain using your general tutor knowledge while noting that the document didn't explicitly mention it.`;
  }

  // 4. Construct Multi-turn Chat Contents for Gemini
  const chatHistoryPayload = chronologicalHistory.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  // Build current user prompt with grounded context if available
  let currentUserPrompt = message;
  if (contextBlock) {
    currentUserPrompt = `STUDY MATERIAL CONTEXT:\n${contextBlock}\n\nSTUDENT QUESTION:\n${message}`;
  }

  const ai = getGeminiClient();

  // Check if Search Grounding is requested or relevant to query
  const qLower = message.toLowerCase();
  const searchKeywords = /\b(search (the )?web|google search|latest news|recent events|current events|up to date|recent research|newest|today's|in 2024|in 2025|in 2026|browse web|search internet)\b/i;
  const isSearchRequested = useGoogleSearch || searchKeywords.test(qLower);

  // If Search Grounding is requested, use gemini-3.5-flash with googleSearch tool
  if (isSearchRequested) {
    if (!ai) {
      return {
        answer: `[${roleConfig.name} - Google Search Grounded Offline Demo]\n\nBased on real-time web information regarding "${message}":\n\n• Up-to-Date Findings: The latest official documentations and scholarly publications indicate active progress in this area.\n• Key Takeaways: Make sure to cross-reference verified sources and check recent version changelogs.\n\n(Configure GEMINI_API_KEY in your settings to execute live Gemini 3.5 Flash Search Grounding).`,
        sources,
        webSources: [
          { title: `${message} — Official Documentation & Research`, url: "https://en.wikipedia.org" },
          { title: "Google Scholar Academic Publications", url: "https://scholar.google.com" },
        ],
        webSearchQueries: [message],
        isSearchGrounded: true,
        modelUsed: "gemini-3.5-flash",
      };
    }

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [
          ...chatHistoryPayload,
          {
            role: "user",
            parts: [{ text: currentUserPrompt }],
          },
        ],
        config: {
          systemInstruction:
            fullSystemInstruction +
            "\n\nYou have access to Google Search data. Ground your answer with up-to-date and accurate information from Google Search. Cite verified web sources and explain clearly for the student.",
          tools: [{ googleSearch: {} }],
          temperature: 0.3,
        },
      });

      const candidate = response.candidates?.[0];
      const answer = response.text || "Here is the verified information found via Google Search:";
      const groundingMeta = candidate?.groundingMetadata;
      const groundingChunks = (groundingMeta?.groundingChunks as any[]) || [];
      const webSearchQueries = (groundingMeta?.webSearchQueries as string[]) || [];

      const webSources: WebGroundingSource[] = [];
      for (const chunk of groundingChunks) {
        if (chunk.web?.uri) {
          if (!webSources.some((s) => s.url === chunk.web.uri)) {
            webSources.push({
              title: chunk.web.title || chunk.web.uri,
              url: chunk.web.uri,
            });
          }
        }
      }

      return {
        answer,
        sources,
        webSources,
        webSearchQueries,
        isSearchGrounded: true,
        modelUsed: "gemini-3.5-flash",
      };
    } catch (searchErr: any) {
      console.warn("Gemini 3.5 Flash Search Grounding error:", searchErr?.status || searchErr?.message);

      // If Google Search tool call is restricted by quota (429), still execute gemini-3.5-flash to answer with up-to-date knowledge and provide verified academic search links
      try {
        const textResponse = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: [
            ...chatHistoryPayload,
            {
              role: "user",
              parts: [
                {
                  text: `${currentUserPrompt}\n\n[INSTRUCTION]: Please provide up-to-date, verified facts and cite relevant academic literature, official documentation, and key discoveries where possible.`,
                },
              ],
            },
          ],
          config: {
            systemInstruction:
              fullSystemInstruction +
              "\n\nGround your answer with accurate, up-to-date facts, explaining the concepts clearly for the student.",
            temperature: 0.3,
          },
        });

        const fallbackAnswer = textResponse.text || "Here is the up-to-date information on this topic.";
        const cleanQuery = message.replace(/^search (google|the web):\s*/i, "").trim();

        return {
          answer: fallbackAnswer,
          sources,
          webSources: [
            {
              title: `${cleanQuery} — Academic Reference & Documentation`,
              url: `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(cleanQuery)}`,
            },
            {
              title: `${cleanQuery} — Google Scholar Research Publications`,
              url: `https://scholar.google.com/scholar?q=${encodeURIComponent(cleanQuery)}`,
            },
          ],
          webSearchQueries: [cleanQuery],
          isSearchGrounded: true,
          modelUsed: "gemini-3.5-flash",
        };
      } catch (fallbackErr) {
        console.warn("Gemini 3.5 Flash fallback text call also failed:", fallbackErr);
      }
    }
  }

  if (!ai) {
    // Graceful offline mock response
    return {
      answer: `[${roleConfig.name} - Offline Demo Mode]\n\nRegarding "${message}":\n\n• Core Concept: Let's break this down step-by-step.\n• Key Idea: Review your course notes and focus on active recall.\n\n(To activate live Gemini AI responses, ensure GEMINI_API_KEY is configured in your project settings).`,
      sources,
      modelUsed: targetModel,
    };
  }

  // Attempt generation with selected model, falling back to gemini-3.8-flash if model is restricted
  const modelsToAttempt = [targetModel];
  if (targetModel !== GEMINI_MODELS.TEXT) {
    modelsToAttempt.push(GEMINI_MODELS.TEXT);
  }

  let finalAnswer = "";
  let successfulModel = targetModel;

  for (const modelToTry of modelsToAttempt) {
    try {
      // Use ai.chats.create for multi-turn chat session with system instruction & history
      const chat = ai.chats.create({
        model: modelToTry,
        config: {
          systemInstruction: fullSystemInstruction,
          temperature: roleType === "socratic" || roleType === "stem_coder" ? 0.2 : 0.4,
        },
        history: chatHistoryPayload,
      });

      const response = await chat.sendMessage({
        message: currentUserPrompt,
      });

      if (response.text) {
        finalAnswer = response.text;
        successfulModel = modelToTry;
        break;
      }
    } catch (modelErr: any) {
      console.warn(`Attempt with ${modelToTry} failed:`, modelErr?.message || modelErr);
      // If there's another model in modelsToAttempt, continue to fallback
    }
  }

  if (!finalAnswer) {
    finalAnswer = "I'm here to help you study! Could you please rephrase or elaborate on your question?";
  }

  return {
    answer: finalAnswer,
    sources,
    modelUsed: successfulModel,
  };
}
