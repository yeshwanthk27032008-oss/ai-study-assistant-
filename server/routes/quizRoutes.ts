import { Router } from "express";
import { prisma } from "../db.js";
import { requireAuth, type AuthRequest } from "../auth.js";
import { generateQuiz } from "../ai/quiz.js";

const router = Router();

// List quizzes
router.get("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const quizzes = await prisma.quiz.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: "desc" },
      include: {
        document: {
          select: { id: true, title: true },
        },
        attempts: {
          where: { userId: req.user!.id },
          orderBy: { completedAt: "desc" },
          take: 3,
        },
        _count: { select: { questions: true, attempts: true } },
      },
    });

    return res.json({ quizzes });
  } catch (err) {
    console.error("List quizzes error:", err);
    return res.status(500).json({ error: "Failed to load quizzes" });
  }
});

// AI Generate Quiz / MCQ
router.post("/generate", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { documentId, topic, subject, difficulty, questionCount, types } = req.body;

    let sourceText = topic || "";
    let subj = subject || "Computer Science";
    let title = topic || `${subj} Assessment`;

    if (documentId) {
      const doc = await prisma.document.findFirst({
        where: { id: documentId, userId: req.user!.id },
      });
      if (doc) {
        sourceText = doc.rawText || doc.title;
        title = `${doc.title} Quiz`;
        subj = doc.title;
      }
    }

    if (!sourceText.trim()) {
      return res.status(400).json({ error: "Please specify a document or topic for the quiz" });
    }

    const count = Math.min(Math.max(Number(questionCount) || 5, 2), 15);
    const questions = await generateQuiz({
      topicOrText: sourceText,
      subject: subj,
      difficulty: difficulty || "Medium",
      questionCount: count,
      questionTypes: types || ["mcq", "true_false"],
    });

    const quiz = await prisma.quiz.create({
      data: {
        userId: req.user!.id,
        documentId: documentId || null,
        title,
        topic: topic || subj,
        subject: subj,
        difficulty: difficulty || "Medium",
        questionCount: questions.length,
      },
    });

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      await prisma.quizQuestion.create({
        data: {
          quizId: quiz.id,
          question: q.question,
          type: q.type,
          options: JSON.stringify(q.options),
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          orderIndex: i,
        },
      });
    }

    const fullQuiz = await prisma.quiz.findUnique({
      where: { id: quiz.id },
      include: {
        questions: {
          orderBy: { orderIndex: "asc" },
        },
      },
    });

    return res.status(201).json({
      quiz: {
        ...fullQuiz,
        questions: fullQuiz?.questions.map((q) => ({
          ...q,
          options: JSON.parse(q.options),
        })),
      },
    });
  } catch (err) {
    console.error("Generate quiz error:", err);
    return res.status(500).json({ error: "Failed to generate quiz" });
  }
});

// Get quiz detail & questions
router.get("/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const quiz = await prisma.quiz.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
      include: {
        questions: {
          orderBy: { orderIndex: "asc" },
        },
        attempts: {
          orderBy: { completedAt: "desc" },
          take: 5,
        },
      },
    });

    if (!quiz) return res.status(404).json({ error: "Quiz not found" });

    const parsedQuestions = quiz.questions.map((q) => ({
      ...q,
      options: JSON.parse(q.options),
    }));

    return res.json({
      quiz: {
        ...quiz,
        questions: parsedQuestions,
      },
    });
  } catch (err) {
    console.error("Get quiz error:", err);
    return res.status(500).json({ error: "Failed to load quiz" });
  }
});

// Submit Quiz Attempt
router.post("/:id/attempt", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { answers } = req.body; // Map or object { [questionId]: string }
    const quiz = await prisma.quiz.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
      include: { questions: true },
    });

    if (!quiz) return res.status(404).json({ error: "Quiz not found" });

    let score = 0;
    const totalQuestions = quiz.questions.length;
    const evaluatedAnswers: any[] = [];

    quiz.questions.forEach((q) => {
      const userAnswer = answers ? String(answers[q.id] || "").trim() : "";
      const isCorrect =
        userAnswer.toLowerCase() === q.correctAnswer.trim().toLowerCase();
      if (isCorrect) score += 1;

      evaluatedAnswers.push({
        questionId: q.id,
        question: q.question,
        userAnswer,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        isCorrect,
      });
    });

    const attempt = await prisma.quizAttempt.create({
      data: {
        quizId: quiz.id,
        userId: req.user!.id,
        score,
        totalQuestions,
        answers: JSON.stringify(evaluatedAnswers),
      },
    });

    // Update user's overall quiz average in progress table
    const allAttempts = await prisma.quizAttempt.findMany({
      where: { userId: req.user!.id },
      select: { score: true, totalQuestions: true },
    });

    let totalScore = 0;
    let totalMax = 0;
    allAttempts.forEach((a) => {
      totalScore += a.score;
      totalMax += a.totalQuestions;
    });
    const quizAverage = totalMax > 0 ? Math.round((totalScore / totalMax) * 1000) / 10 : 0;

    await prisma.progress.updateMany({
      where: { userId: req.user!.id },
      data: {
        quizAverage,
        lastActiveDate: new Date(),
      },
    });

    return res.status(201).json({
      attempt: {
        ...attempt,
        answers: evaluatedAnswers,
      },
      score,
      totalQuestions,
      percentage: totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0,
    });
  } catch (err) {
    console.error("Submit quiz attempt error:", err);
    return res.status(500).json({ error: "Failed to submit attempt" });
  }
});

// Delete quiz
router.delete("/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const quiz = await prisma.quiz.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
    });
    if (!quiz) return res.status(404).json({ error: "Quiz not found" });

    await prisma.quiz.delete({ where: { id: quiz.id } });
    return res.json({ success: true });
  } catch (err) {
    console.error("Delete quiz error:", err);
    return res.status(500).json({ error: "Failed to delete quiz" });
  }
});

export default router;
