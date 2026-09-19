import { Router } from "express";
import { prisma } from "../db.js";
import { requireAuth, type AuthRequest } from "../auth.js";

const router = Router();

// Get progress overview & analytics
router.get("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;

    // Get or create progress row
    let progress = await prisma.progress.findUnique({
      where: { userId },
    });

    if (!progress) {
      progress = await prisma.progress.create({
        data: {
          userId,
          streakDays: 1,
          totalHoursStudied: 0,
          topicsCompleted: 0,
          flashcardsReviewed: 0,
          quizAverage: 0,
        },
      });
    }

    // Counts across system
    const [docCount, noteCount, flashcardCount, quizCount, chatCount] = await Promise.all([
      prisma.document.count({ where: { userId } }),
      prisma.note.count({ where: { userId } }),
      prisma.flashcard.count({ where: { userId } }),
      prisma.quiz.count({ where: { userId } }),
      prisma.chat.count({ where: { userId } }),
    ]);

    // Fetch sessions from past 7 days for study chart
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const sessions = await prisma.studySession.findMany({
      where: {
        userId,
        date: { gte: sevenDaysAgo },
      },
      orderBy: { date: "asc" },
    });

    // Aggregate by day of week
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const dailyStudyData = days.map((day) => ({ day, hours: 0, sessions: 0 }));

    sessions.forEach((s) => {
      const dayName = days[new Date(s.date).getDay()];
      const entry = dailyStudyData.find((d) => d.day === dayName);
      if (entry) {
        entry.hours = Math.round((entry.hours + s.durationMinutes / 60) * 10) / 10;
        entry.sessions += 1;
      }
    });

    // Recent quiz performance
    const recentAttempts = await prisma.quizAttempt.findMany({
      where: { userId },
      orderBy: { completedAt: "desc" },
      take: 5,
      include: {
        quiz: { select: { title: true, subject: true, difficulty: true } },
      },
    });

    return res.json({
      progress,
      counts: {
        documents: docCount,
        notes: noteCount,
        flashcards: flashcardCount,
        quizzes: quizCount,
        chats: chatCount,
      },
      dailyStudyData,
      recentAttempts,
    });
  } catch (err) {
    console.error("Get progress error:", err);
    return res.status(500).json({ error: "Failed to load progress data" });
  }
});

// Log study session (e.g. Pomodoro timer or manual study log)
router.post("/session", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { durationMinutes, topic, sessionType } = req.body;
    const mins = Math.max(1, Number(durationMinutes) || 25);
    const userId = req.user!.id;

    const session = await prisma.studySession.create({
      data: {
        userId,
        durationMinutes: mins,
        topic: topic || "Focus Study",
        sessionType: sessionType || "Pomodoro",
      },
    });

    const hoursAdded = Math.round((mins / 60) * 100) / 100;
    const updated = await prisma.progress.update({
      where: { userId },
      data: {
        totalHoursStudied: { increment: hoursAdded },
        lastActiveDate: new Date(),
      },
    });

    return res.status(201).json({ session, progress: updated });
  } catch (err) {
    console.error("Log session error:", err);
    return res.status(500).json({ error: "Failed to log study session" });
  }
});

// Global search across documents, notes, flashcards, quizzes
router.get("/search", requireAuth, async (req: AuthRequest, res) => {
  try {
    const q = String(req.query.q || "").trim();
    if (!q) {
      return res.json({ documents: [], notes: [], flashcards: [], quizzes: [] });
    }

    const userId = req.user!.id;

    const [documents, notes, flashcards, quizzes] = await Promise.all([
      prisma.document.findMany({
        where: {
          userId,
          OR: [{ title: { contains: q } }, { fileName: { contains: q } }, { summary: { contains: q } }],
        },
        select: { id: true, title: true, fileName: true, summary: true, createdAt: true },
        take: 5,
      }),
      prisma.note.findMany({
        where: {
          userId,
          OR: [{ title: { contains: q } }, { content: { contains: q } }, { overview: { contains: q } }],
        },
        select: { id: true, title: true, overview: true, createdAt: true },
        take: 5,
      }),
      prisma.flashcard.findMany({
        where: {
          userId,
          OR: [{ front: { contains: q } }, { back: { contains: q } }, { deckTitle: { contains: q } }],
        },
        select: { id: true, front: true, back: true, deckTitle: true, difficulty: true },
        take: 5,
      }),
      prisma.quiz.findMany({
        where: {
          userId,
          OR: [{ title: { contains: q } }, { topic: { contains: q } }, { subject: { contains: q } }],
        },
        select: { id: true, title: true, topic: true, subject: true, difficulty: true },
        take: 5,
      }),
    ]);

    return res.json({ documents, notes, flashcards, quizzes });
  } catch (err) {
    console.error("Global search error:", err);
    return res.status(500).json({ error: "Search failed" });
  }
});

// Profile / preferences update
router.patch("/settings", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { name, preferredExplanationLevel, theme } = req.body;
    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        ...(name && { name: String(name).trim() }),
        ...(preferredExplanationLevel && { preferredExplanationLevel }),
        ...(theme && { theme }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        preferredExplanationLevel: true,
        theme: true,
      },
    });

    return res.json({ user });
  } catch (err) {
    console.error("Update settings error:", err);
    return res.status(500).json({ error: "Failed to update settings" });
  }
});

export default router;
