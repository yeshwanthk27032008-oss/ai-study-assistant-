import { getGeminiClient, GEMINI_MODELS } from "./gemini.js";

export interface TopicExplanation {
  topic: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  simpleExplanation: string;
  realWorldAnalogy: string;
  stepByStepExplanation: string[];
  example: {
    scenario: string;
    codeOrMath?: string;
    walkthrough: string;
  };
  commonMistakes: string[];
  quickRevision: string[];
}

export async function explainTopic(
  topic: string,
  difficulty: "Beginner" | "Intermediate" | "Advanced" = "Intermediate"
): Promise<TopicExplanation> {
  const ai = getGeminiClient();

  if (!ai) {
    return {
      topic,
      difficulty,
      simpleExplanation: `${topic} is an organized way of structuring information and actions so that decisions or searches can be performed efficiently without redundant work.`,
      realWorldAnalogy: "Think of a phonebook or a library index card system: instead of checking every book in the entire library, you jump directly to the right category and shelf.",
      stepByStepExplanation: [
        "1. Identify the input criteria or starting state.",
        "2. Evaluate comparison thresholds at each decision point.",
        "3. Traverse the branch that reduces the problem size by half or toward convergence.",
        "4. Terminate when the goal item is located or boundaries are reached.",
      ],
      example: {
        scenario: `Looking up an element in a structured collection of numbers [2, 5, 8, 12, 16, 23, 38, 56, 72, 91]`,
        codeOrMath: `function search(arr, target) {\n  let low = 0, high = arr.length - 1;\n  while (low <= high) {\n    let mid = Math.floor((low + high) / 2);\n    if (arr[mid] === target) return mid;\n    if (arr[mid] < target) low = mid + 1;\n    else high = mid - 1;\n  }\n  return -1;\n}`,
        walkthrough: "We inspect the middle value (16). Since target (23) is greater, we eliminate the lower half completely and focus on [23, 38, 56, 72, 91].",
      },
      commonMistakes: [
        "Off-by-one errors in boundary condition checks (e.g. <= vs <).",
        "Assuming inputs are pre-sorted when they might not be.",
        "Integer overflow when calculating midpoint in low-level languages.",
      ],
      quickRevision: [
        "Key rule: Each step cuts the remaining problem space.",
        "Complexity: O(log n) time, O(1) space.",
        "Requirement: Underlying data must maintain sorted or ordered invariant.",
      ],
    };
  }

  const prompt = `You are a master educator, computer scientist, and empathetic tutor.
Explain the topic: "${topic}"
Target Level: "${difficulty}"

Structure your response strictly as a JSON object adhering to this schema:
{
  "topic": "${topic}",
  "difficulty": "${difficulty}",
  "simpleExplanation": "Clear, student-friendly explanation avoiding unnecessary jargon first.",
  "realWorldAnalogy": "A memorable real-world analogy that makes the concept click instantly.",
  "stepByStepExplanation": [
    "Step 1: ...",
    "Step 2: ...",
    "Step 3: ...",
    "Step 4: ..."
  ],
  "example": {
    "scenario": "A clear, concrete example problem or scenario.",
    "codeOrMath": "Formatted code, mathematical formula, or pseudo-code (if applicable).",
    "walkthrough": "Step-by-step breakdown of how the example operates."
  },
  "commonMistakes": [
    "Mistake 1 and why students make it",
    "Mistake 2 and how to avoid it",
    "Mistake 3"
  ],
  "quickRevision": [
    "Key takeaway 1",
    "Key takeaway 2",
    "Key takeaway 3"
  ]
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
      topic,
      difficulty,
      simpleExplanation: parsed.simpleExplanation || `Explanation of ${topic}.`,
      realWorldAnalogy: parsed.realWorldAnalogy || "Think of an organized filing cabinet.",
      stepByStepExplanation: Array.isArray(parsed.stepByStepExplanation) ? parsed.stepByStepExplanation : [],
      example: parsed.example || { scenario: "Basic sample", walkthrough: "Applied step-by-step." },
      commonMistakes: Array.isArray(parsed.commonMistakes) ? parsed.commonMistakes : [],
      quickRevision: Array.isArray(parsed.quickRevision) ? parsed.quickRevision : [],
    };
  } catch (err) {
    console.error("Topic explainer error:", err);
    return {
      topic,
      difficulty,
      simpleExplanation: `Explanation of ${topic}.`,
      realWorldAnalogy: "Analogy describing the topic.",
      stepByStepExplanation: ["Step 1: Understand foundation", "Step 2: Apply principles", "Step 3: Test results"],
      example: { scenario: "Sample application", walkthrough: "Follow core rules." },
      commonMistakes: ["Failing to test edge cases."],
      quickRevision: ["Review foundational principles."],
    };
  }
}
