import { getGeminiClient, GEMINI_MODELS } from "./gemini.js";

export interface GeneratedFlashcard {
  front: string;
  back: string;
  difficulty: "Easy" | "Medium" | "Hard";
}

export async function generateFlashcards(options: {
  topicOrText: string;
  count?: number;
  deckTitle?: string;
}): Promise<GeneratedFlashcard[]> {
  const { topicOrText, count = 8, deckTitle = "General" } = options;
  const sample = topicOrText.slice(0, 12000);
  const ai = getGeminiClient();

  if (!ai) {
    return [
      {
        front: `What is the primary concept of ${deckTitle}?`,
        back: "It is the foundational principle that structures the logic, behavior, and organization of this study domain.",
        difficulty: "Easy",
      },
      {
        front: "Explain the difference between worst-case and average-case complexity.",
        back: "Worst-case complexity represents the maximum resource consumption for any input of size N (upper bound), whereas average-case represents the expected cost over a uniform distribution of typical inputs.",
        difficulty: "Medium",
      },
      {
        front: "What is a common pitfall when solving recursion problems?",
        back: "Failing to define a clear base case, or making recursive calls that do not strictly converge toward the base case, leading to stack overflow.",
        difficulty: "Medium",
      },
      {
        front: "Define idempotent operation.",
        back: "An operation that can be applied multiple times without changing the result beyond the initial application (e.g., f(f(x)) = f(x)).",
        difficulty: "Hard",
      },
      {
        front: "How does caching improve system performance?",
        back: "By storing expensive computation or database query results in fast memory (e.g. RAM/Redis), reducing latency and load on origin resources.",
        difficulty: "Easy",
      },
    ];
  }

  const prompt = `You are a cognitive science study coach specializing in active recall and spaced repetition flashcards.
Generate exactly ${count} high-impact flashcards from the following study material.
Deck: "${deckTitle}"
Content:
"${sample}"

Rules:
1. "front" must be a concise, precise question, definition trigger, or problem prompt.
2. "back" must be a clear, unambiguous, high-yield explanation or answer (2-4 sentences max).
3. Vary the difficulty across "Easy", "Medium", and "Hard".
4. Return a STRICT JSON array of objects:
[
  {
    "front": "Question or prompt",
    "back": "Clear, precise answer",
    "difficulty": "Easy" | "Medium" | "Hard"
  }
]`;

  try {
    const res = await ai.models.generateContent({
      model: GEMINI_MODELS.TEXT,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const parsed = JSON.parse(res.text || "[]");
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map((c) => ({
        front: String(c.front || "Question"),
        back: String(c.back || "Answer"),
        difficulty: ["Easy", "Medium", "Hard"].includes(c.difficulty) ? c.difficulty : "Medium",
      }));
    }
  } catch (err) {
    console.error("Flashcard generation error:", err);
  }

  return [
    {
      front: `Key Concept in ${deckTitle}`,
      back: "Review definitions and primary mechanisms from your study notes.",
      difficulty: "Medium",
    },
  ];
}

/**
 * Updates SM-2 spaced repetition parameters based on student rating
 * Ratings: "Again" (fail), "Hard", "Good", "Easy"
 */
export function calculateNextReview(
  rating: "Again" | "Hard" | "Good" | "Easy",
  currentRepetitions: number,
  currentInterval: number,
  currentEaseFactor: number
) {
  let repetitions = currentRepetitions;
  let interval = currentInterval;
  let easeFactor = currentEaseFactor;

  // Grade mapping: Again = 1, Hard = 3, Good = 4, Easy = 5
  let grade = 4;
  if (rating === "Again") grade = 1;
  else if (rating === "Hard") grade = 3;
  else if (rating === "Good") grade = 4;
  else if (rating === "Easy") grade = 5;

  if (grade < 3) {
    repetitions = 0;
    interval = 1;
  } else {
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }
    repetitions += 1;
  }

  // SM-2 formula: EF' = EF + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02))
  easeFactor = easeFactor + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02));
  if (easeFactor < 1.3) easeFactor = 1.3;

  const nextReviewAt = new Date();
  nextReviewAt.setDate(nextReviewAt.getDate() + interval);

  return {
    repetitions,
    interval,
    easeFactor: Math.round(easeFactor * 100) / 100,
    nextReviewAt,
  };
}
