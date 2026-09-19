import { prisma } from "../db.js";
import { getGeminiClient, GEMINI_MODELS } from "./gemini.js";
import { generateEmbedding, cosineSimilarity } from "./embeddings.js";

export interface RagSource {
  pageNumber: number;
  text: string;
  documentId: string;
  documentTitle?: string;
  score: number;
}

export interface RagResult {
  answer: string;
  sources: RagSource[];
}

/**
 * Executes a full RAG retrieval pipeline against user's documents
 */
export async function answerWithRag(options: {
  userId: string;
  question: string;
  documentId?: string;
  explanationLevel?: string;
  conversationHistory?: Array<{ role: string; content: string }>;
}): Promise<RagResult> {
  const { userId, question, documentId, explanationLevel = "Normal", conversationHistory = [] } = options;

  // 1. Generate query embedding
  const queryVec = await generateEmbedding(question);

  // 2. Fetch candidate chunks from DB
  const chunkWhere: any = {
    document: {
      userId,
      status: "Ready",
    },
  };
  if (documentId) {
    chunkWhere.documentId = documentId;
  }

  const chunks = await prisma.documentChunk.findMany({
    where: chunkWhere,
    include: {
      document: {
        select: { id: true, title: true, fileName: true },
      },
    },
    take: 100, // retrieve up to 100 candidate chunks to rank
  });

  if (chunks.length === 0) {
    // If no documents exist or no chunks, answer as general study tutor or inform student
    if (documentId) {
      return {
        answer: "I couldn't find that information in your uploaded study material because this document has no readable text chunks.",
        sources: [],
      };
    }
    // General study chat without document attachment
    return answerGeneralStudyQuestion(question, explanationLevel, conversationHistory);
  }

  // 3. Score chunks using semantic cosine similarity + keyword overlap
  const scoredChunks = chunks.map((chunk) => {
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
    const qWords = question.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
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

  // Sort descending by relevance score
  scoredChunks.sort((a, b) => b.score - a.score);

  // Take top 4 most relevant chunks
  const topChunks = scoredChunks.slice(0, 4);

  // Extract source citations
  const sources: RagSource[] = topChunks.map((item) => ({
    pageNumber: item.chunk.pageNumber,
    text: item.chunk.content.slice(0, 250) + (item.chunk.content.length > 250 ? "..." : ""),
    documentId: item.chunk.documentId,
    documentTitle: item.chunk.document.title || item.chunk.document.fileName,
    score: Math.round(item.score * 100) / 100,
  }));

  // Build grounded context text
  const contextBlock = topChunks
    .map(
      (item, idx) =>
        `[Source #${idx + 1} - ${item.chunk.document.title || item.chunk.document.fileName}, Page ${item.chunk.pageNumber}]:\n"${item.chunk.content}"`
    )
    .join("\n\n");

  const ai = getGeminiClient();
  if (!ai) {
    // Graceful fallback for offline demo mode
    const bestChunk = topChunks[0]?.chunk;
    return {
      answer: bestChunk
        ? `Based on your study material (Page ${bestChunk.pageNumber}):\n\n${bestChunk.content.slice(0, 400)}...\n\n[Source: Page ${bestChunk.pageNumber}]`
        : "I couldn't find that information in your uploaded study material.",
      sources,
    };
  }

  const prompt = `You are StudyMate AI, an expert, patient, and engaging personal AI study companion.
The student is asking a question about their uploaded study materials.

CRITICAL INSTRUCTIONS:
1. Base your answer directly and accurately on the provided Study Material Context below.
2. If the answer is not available or cannot be reasonably deduced from the uploaded material, clearly say:
   "I couldn't find that information in your uploaded study material."
3. Do NOT fabricate or hallucinate document-specific facts.
4. When citing facts, include clear inline references like [Source: Page X].
5. Explanation level requested: ${explanationLevel}. Adapt vocabulary, analogies, and step-by-step depth accordingly.
6. Provide a clean, structured response with bullet points, bold key terms, or code/math blocks if appropriate.

STUDY MATERIAL CONTEXT:
${contextBlock}

RECENT CONVERSATION:
${conversationHistory.slice(-4).map((m) => `${m.role.toUpperCase()}: ${m.content}`).join("\n")}

STUDENT QUESTION:
${question}`;

  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODELS.TEXT,
      contents: prompt,
      config: {
        temperature: 0.2, // Lower temperature for faithful grounded RAG
      },
    });

    const answer = response.text || "I couldn't find that information in your uploaded study material.";
    return {
      answer,
      sources,
    };
  } catch (err: any) {
    console.error("Gemini RAG generation error:", err);
    return {
      answer: `Based on your uploaded material (Page ${topChunks[0]?.chunk.pageNumber}): ${topChunks[0]?.chunk.content.slice(0, 300)}... [Source: Page ${topChunks[0]?.chunk.pageNumber}]`,
      sources,
    };
  }
}

/**
 * General AI study companion answer (when no documents are queried)
 */
export async function answerGeneralStudyQuestion(
  question: string,
  explanationLevel = "Normal",
  conversationHistory: Array<{ role: string; content: string }> = []
): Promise<RagResult> {
  const ai = getGeminiClient();
  if (!ai) {
    return {
      answer: `Here is a study explanation for "${question}":\n\n• Key Concept: Focused understanding of the core definitions and principles.\n• Practice Tip: Try breaking this problem into smaller sub-problems and testing yourself with active recall.`,
      sources: [],
    };
  }

  const prompt = `You are StudyMate AI, a friendly, encouraging personal AI study companion.
Help the student with their study question.
Target Explanation Level: ${explanationLevel} (Simple = beginner with analogies; Normal = balanced high-school/college level; Detailed = rigorous, in-depth academic level).

RECENT CONVERSATION:
${conversationHistory.slice(-4).map((m) => `${m.role.toUpperCase()}: ${m.content}`).join("\n")}

QUESTION:
${question}`;

  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODELS.TEXT,
      contents: prompt,
    });
    return {
      answer: response.text || "I'm here to help you study! What concept would you like to review?",
      sources: [],
    };
  } catch (err: any) {
    console.error("Gemini general chat error:", err);
    return {
      answer: "I'm here to help you study! Please try asking your question again or specify a topic.",
      sources: [],
    };
  }
}
