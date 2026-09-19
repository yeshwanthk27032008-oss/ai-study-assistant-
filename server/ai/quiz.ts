import { getGeminiClient, GEMINI_MODELS } from "./gemini.js";

export interface GeneratedQuestion {
  question: string;
  type: "mcq" | "true_false" | "short_answer";
  options: string[]; // for MCQ: 4 options; for true_false: ["True", "False"]
  correctAnswer: string;
  explanation: string;
}

export async function generateQuiz(options: {
  topicOrText: string;
  subject?: string;
  difficulty?: "Easy" | "Medium" | "Hard";
  questionCount?: number;
  questionTypes?: Array<"mcq" | "true_false" | "short_answer">;
}): Promise<GeneratedQuestion[]> {
  const {
    topicOrText,
    subject = "Computer Science",
    difficulty = "Medium",
    questionCount = 5,
    questionTypes = ["mcq", "true_false"],
  } = options;

  const sample = topicOrText.slice(0, 12000);
  const ai = getGeminiClient();

  if (!ai) {
    const fallback: GeneratedQuestion[] = [
      {
        question: `What is the fundamental objective of ${subject}?`,
        type: "mcq",
        options: [
          "To optimize system resource efficiency and solve computational problems",
          "To eliminate all physical hardware constraints",
          "To write code without documentation or testing",
          "To store data without any indexing or organization",
        ],
        correctAnswer: "To optimize system resource efficiency and solve computational problems",
        explanation: "The discipline focuses on structured problem solving, resource optimization, and architectural correctness.",
      },
      {
        question: "True or False: Constant time O(1) operations always execute faster in real-world clock time than O(log n) operations for all possible inputs.",
        type: "true_false",
        options: ["True", "False"],
        correctAnswer: "False",
        explanation: "Asymptotic notation hides constant factors. An O(1) operation with a huge constant factor can take longer than an O(log n) operation for small input sizes.",
      },
      {
        question: "Which data structure operates on a Last-In, First-Out (LIFO) protocol?",
        type: "mcq",
        options: ["Queue", "Stack", "Binary Heap", "Hash Table"],
        correctAnswer: "Stack",
        explanation: "A stack pushes and pops elements exclusively from its top end, enforcing LIFO ordering.",
      },
      {
        question: "In relational database design, what ensures entity integrity?",
        type: "mcq",
        options: [
          "Every table must have a primary key and its values cannot be null",
          "Foreign keys must match an existing row",
          "Indexes must be rebuilt on every insertion",
          "All attributes must be numeric",
        ],
        correctAnswer: "Every table must have a primary key and its values cannot be null",
        explanation: "Entity integrity dictates that primary keys uniquely distinguish each row and cannot contain null values.",
      },
      {
        question: "True or False: In a balanced binary search tree, search operations take worst-case O(log n) time.",
        type: "true_false",
        options: ["True", "False"],
        correctAnswer: "True",
        explanation: "Because self-balancing mechanisms (e.g. AVL or Red-Black trees) maintain tree height bounded by O(log n), search, insert, and delete all remain O(log n).",
      },
    ];
    return fallback.slice(0, questionCount);
  }

  const prompt = `You are a university professor designing an examination quiz.
Subject: "${subject}"
Difficulty: "${difficulty}"
Number of questions: ${questionCount}
Allowed question types: ${questionTypes.join(", ")}
Source content / topic:
"${sample}"

Create challenging, accurate questions that test conceptual understanding rather than trivia.
For "mcq", provide exactly 4 distinct options with one correct answer.
For "true_false", provide options ["True", "False"].
For "short_answer", provide a 1-3 word clear expected answer.

Return a STRICT JSON array of question objects:
[
  {
    "question": "Clear question text",
    "type": "mcq" | "true_false" | "short_answer",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": "Exact string of correct option",
    "explanation": "Clear explanation of why this answer is correct and why other options are incorrect"
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
      return parsed.slice(0, questionCount).map((q) => ({
        question: String(q.question || "Quiz question"),
        type: ["mcq", "true_false", "short_answer"].includes(q.type) ? q.type : "mcq",
        options: Array.isArray(q.options) && q.options.length > 0 ? q.options : ["Option A", "Option B", "Option C", "Option D"],
        correctAnswer: String(q.correctAnswer || (q.options ? q.options[0] : "True")),
        explanation: String(q.explanation || "Correct answer based on the study text."),
      }));
    }
  } catch (err) {
    console.error("Quiz generation error:", err);
  }

  return [
    {
      question: `Key concept in ${subject}?`,
      type: "mcq",
      options: ["Correct principle", "Distractor 1", "Distractor 2", "Distractor 3"],
      correctAnswer: "Correct principle",
      explanation: "This represents the foundational concept discussed in your material.",
    },
  ];
}
