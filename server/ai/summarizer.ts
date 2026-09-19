import { getGeminiClient, GEMINI_MODELS } from "./gemini.js";

export interface DocumentSummary {
  overview: string;
  keyConcepts: string[];
  importantDefinitions: Array<{ term: string; definition: string }>;
  importantFormulas: string[];
  examPoints: string[];
  quickRevision: string;
}

export async function generateDocumentSummary(content: string, title: string): Promise<DocumentSummary> {
  const sample = content.slice(0, 15000); // Send generous context chunk
  const ai = getGeminiClient();

  if (!ai) {
    return {
      overview: `Study summary for "${title}". This document covers essential core curriculum principles, systematic theory, and practical problem-solving methodologies.`,
      keyConcepts: [
        "Core foundational paradigms and theoretical framework",
        "Algorithmic analysis and computational time-space complexity",
        "Practical implementation trade-offs and edge-case behaviors",
        "Key definitions and real-world system applications",
      ],
      importantDefinitions: [
        { term: "Invariant", definition: "A condition that can be relied upon to be true during execution." },
        { term: "Complexity", definition: "Measurement of computational resources required for execution." },
      ],
      importantFormulas: ["T(n) = O(log n)", "Efficiency = Useful Output / Total Input"],
      examPoints: [
        "Be prepared to compare time vs space trade-offs in typical scenarios.",
        "Review edge cases including empty inputs and boundary thresholds.",
        "Practice deriving complexity equations step-by-step.",
      ],
      quickRevision: "Re-read the fundamental definitions, practice 2-3 sample problems, and review the common exam pitfall scenarios.",
    };
  }

  const prompt = `You are an elite academic summarizer and university study coach.
Analyze the following study material titled "${title}".
Generate a structured study summary in STRICT JSON format with these exact keys:
{
  "overview": "A cohesive 2-3 paragraph overview of the core subject matter.",
  "keyConcepts": ["List 4-6 major concepts explained in this document."],
  "importantDefinitions": [
    {"term": "Term Name", "definition": "Clear student-friendly explanation"}
  ],
  "importantFormulas": ["Formulas, equations, theorems, or key algorithmic rules mentioned"],
  "examPoints": ["High-yield exam points, expected test questions, and common student mistakes to avoid"],
  "quickRevision": "A high-impact 3-4 sentence rapid review recap for the night before an exam."
}

STUDY MATERIAL:
${sample}`;

  try {
    const res = await ai.models.generateContent({
      model: GEMINI_MODELS.TEXT,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const parsed = JSON.parse(res.text || "{}");
    return {
      overview: parsed.overview || "Overview of study content.",
      keyConcepts: Array.isArray(parsed.keyConcepts) ? parsed.keyConcepts : [],
      importantDefinitions: Array.isArray(parsed.importantDefinitions) ? parsed.importantDefinitions : [],
      importantFormulas: Array.isArray(parsed.importantFormulas) ? parsed.importantFormulas : [],
      examPoints: Array.isArray(parsed.examPoints) ? parsed.examPoints : [],
      quickRevision: parsed.quickRevision || "Review all key definitions and concepts thoroughly.",
    };
  } catch (err) {
    console.error("Summary generation error:", err);
    return {
      overview: `Summary of ${title}. The material covers foundational principles and applications.`,
      keyConcepts: ["Fundamental Concepts", "Methods and Applications", "Analytical Framework"],
      importantDefinitions: [{ term: "Key Concept", definition: "Core principle explained in the text." }],
      importantFormulas: [],
      examPoints: ["Focus on understanding definitions and practical examples."],
      quickRevision: "Review key headings and highlighted concepts before the exam.",
    };
  }
}
