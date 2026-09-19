import { getGeminiClient, GEMINI_MODELS } from "./gemini.js";

export interface GeneratedNote {
  title: string;
  overview: string;
  keyConcepts: string[];
  definitions: Array<{ term: string; explanation: string }>;
  examples: Array<{ title: string; description: string }>;
  importantPoints: string[];
  examTips: string[];
  content: string; // Full markdown content
}

export async function generateStudyNotes(options: {
  topicOrText: string;
  sourceTitle?: string;
  level?: string;
}): Promise<GeneratedNote> {
  const { topicOrText, sourceTitle = "Study Material", level = "Normal" } = options;
  const sample = topicOrText.slice(0, 12000);
  const ai = getGeminiClient();

  if (!ai) {
    return {
      title: `Study Notes: ${sourceTitle}`,
      overview: `Structured study notes on ${sourceTitle}. These notes provide a clear, comprehensive breakdown of core mechanisms, definitions, and exam strategies.`,
      keyConcepts: [
        "Core theoretical foundation and motivation",
        "Step-by-step analytical mechanisms",
        "Common edge cases and error handling",
        "Synthesis of theory and practical exercises",
      ],
      definitions: [
        { term: "Primary Concept", explanation: "The central thesis or rule governing this topic." },
        { term: "Heuristic", explanation: "A practical approach or rule of thumb for problem solving." },
      ],
      examples: [
        { title: "Standard Problem", description: "Applying the primary formula step-by-step on a basic test scenario." },
        { title: "Edge Case Scenario", description: "Testing boundary conditions where values approach zero or infinity." },
      ],
      importantPoints: [
        "Always define variables and state assumptions first.",
        "Check units and boundary parameters before finalizing results.",
        "Remember that theoretical bounds often assume optimal conditions.",
      ],
      examTips: [
        "Common exam trap: confusing worst-case with average-case.",
        "Highlight key definitions in your written response to secure partial marks.",
      ],
      content: `# Study Notes: ${sourceTitle}\n\n## Overview\nThese structured notes cover the foundational ideas, key definitions, and high-yield exam insights.\n\n## Key Concepts\n- Foundational theory and motivation\n- Step-by-step problem-solving\n- Edge cases and bounds\n\n## Important Points\n1. Check assumptions.\n2. Verify boundary values.\n3. State explicit steps.`,
    };
  }

  const prompt = `You are a distinguished academic note-taker and university tutor.
Generate comprehensive, structured study notes on "${sourceTitle}" based on this content/topic:
"${sample}"
Target Student Level: ${level}

Return a STRICT JSON object matching this schema:
{
  "title": "Clear, informative note title",
  "overview": "Thorough 2-paragraph conceptual overview",
  "keyConcepts": ["Concept 1", "Concept 2", "Concept 3", "Concept 4"],
  "definitions": [
    {"term": "Term", "explanation": "Detailed explanation"}
  ],
  "examples": [
    {"title": "Example Problem / Case Study", "description": "Step-by-step walkthrough of how to solve it"}
  ],
  "importantPoints": ["Crucial takeaways every student must remember"],
  "examTips": ["Specific tips for answering test questions on this topic"],
  "content": "Rich markdown representation of the entire notes with headers, bold text, bullet points, and code/math blocks where helpful"
}`;

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
      title: parsed.title || `Study Notes: ${sourceTitle}`,
      overview: parsed.overview || "",
      keyConcepts: Array.isArray(parsed.keyConcepts) ? parsed.keyConcepts : [],
      definitions: Array.isArray(parsed.definitions) ? parsed.definitions : [],
      examples: Array.isArray(parsed.examples) ? parsed.examples : [],
      importantPoints: Array.isArray(parsed.importantPoints) ? parsed.importantPoints : [],
      examTips: Array.isArray(parsed.examTips) ? parsed.examTips : [],
      content: parsed.content || parsed.overview || "",
    };
  } catch (err) {
    console.error("Notes generation error:", err);
    return {
      title: `Study Notes: ${sourceTitle}`,
      overview: `Notes generated for ${sourceTitle}.`,
      keyConcepts: ["Fundamental Concepts", "Methods and Practice"],
      definitions: [{ term: "Concept", explanation: "Core idea discussed in the material." }],
      examples: [],
      importantPoints: ["Understand the central concepts thoroughly."],
      examTips: ["Practice with past exam questions."],
      content: `# Study Notes: ${sourceTitle}\n\nReview the material thoroughly.`,
    };
  }
}
