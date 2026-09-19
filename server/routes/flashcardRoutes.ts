import { Router } from "express";
import { prisma } from "../db.js";
import { requireAuth, type AuthRequest } from "../auth.js";
import { generateFlashcards, calculateNextReview } from "../ai/flashcards.js";

const router = Router();

// List flashcards
router.get("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { deckTitle, documentId } = req.query;
    const where: any = { userId: req.user!.id };

    if (deckTitle && typeof deckTitle === "string" && deckTitle !== "all") {
      where.deckTitle = deckTitle;
    }
    if (documentId && typeof documentId === "string") {
      where.documentId = documentId;
    }

    const flashcards = await prisma.flashcard.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        document: {
          select: { id: true, title: true },
        },
      },
    });

    // Extract unique decks
    const allDecks = await prisma.flashcard.findMany({
      where: { userId: req.user!.id },
      distinct: ["deckTitle"],
      select: { deckTitle: true },
    });

    return res.json({
      flashcards,
      decks: allDecks.map((d) => d.deckTitle),
    });
  } catch (err) {
    console.error("List flashcards error:", err);
    return res.status(500).json({ error: "Failed to load flashcards" });
  }
});

// AI Generate Flashcards
router.post("/generate", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { documentId, topic, deckTitle, count } = req.body;

    let sourceText = topic || "";
    let deck = deckTitle || "General Studies";

    if (documentId) {
      const doc = await prisma.document.findFirst({
        where: { id: documentId, userId: req.user!.id },
      });
      if (doc) {
        sourceText = doc.rawText || doc.title;
        deck = deckTitle || doc.title.replace(/\.[^/.]+$/, "");
      }
    }

    if (!sourceText.trim()) {
      return res.status(400).json({ error: "Please provide a document or a topic to generate flashcards" });
    }

    const cards = await generateFlashcards({
      topicOrText: sourceText,
      count: Math.min(Math.max(Number(count) || 6, 2), 20),
      deckTitle: deck,
    });

    const createdCards = [];
    for (const card of cards) {
      const fc = await prisma.flashcard.create({
        data: {
          userId: req.user!.id,
          documentId: documentId || null,
          deckTitle: deck,
          front: card.front,
          back: card.back,
          difficulty: card.difficulty,
        },
      });
      createdCards.push(fc);
    }

    return res.status(201).json({ flashcards: createdCards });
  } catch (err) {
    console.error("Generate flashcards error:", err);
    return res.status(500).json({ error: "Failed to generate flashcards" });
  }
});

// Record Spaced Repetition Review
router.post("/review", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { flashcardId, rating, timeSpentMs } = req.body;

    if (!flashcardId || !rating) {
      return res.status(400).json({ error: "flashcardId and rating (Again, Hard, Good, Easy) are required" });
    }

    const card = await prisma.flashcard.findFirst({
      where: { id: flashcardId, userId: req.user!.id },
    });

    if (!card) return res.status(404).json({ error: "Flashcard not found" });

    // Calculate updated interval, repetitions, and ease factor
    const sm2 = calculateNextReview(
      rating as "Again" | "Hard" | "Good" | "Easy",
      card.repetitions,
      card.interval,
      card.easeFactor
    );

    // Save review record
    await prisma.flashcardReview.create({
      data: {
        flashcardId: card.id,
        userId: req.user!.id,
        rating,
        timeSpentMs: timeSpentMs || 0,
      },
    });

    // Update card
    const updatedCard = await prisma.flashcard.update({
      where: { id: card.id },
      data: {
        repetitions: sm2.repetitions,
        interval: sm2.interval,
        easeFactor: sm2.easeFactor,
        lastReviewedAt: new Date(),
        nextReviewAt: sm2.nextReviewAt,
      },
    });

    // Update user progress analytics
    await prisma.progress.updateMany({
      where: { userId: req.user!.id },
      data: {
        flashcardsReviewed: { increment: 1 },
        lastActiveDate: new Date(),
      },
    });

    return res.json({ flashcard: updatedCard, nextReview: sm2.nextReviewAt });
  } catch (err) {
    console.error("Review flashcard error:", err);
    return res.status(500).json({ error: "Failed to record review" });
  }
});

// Create single manual flashcard
router.post("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { front, back, deckTitle, difficulty, documentId } = req.body;
    if (!front || !back) {
      return res.status(400).json({ error: "Front and back are required" });
    }

    const card = await prisma.flashcard.create({
      data: {
        userId: req.user!.id,
        deckTitle: deckTitle || "General",
        front: front.trim(),
        back: back.trim(),
        difficulty: difficulty || "Medium",
        documentId: documentId || null,
      },
    });

    return res.status(201).json({ flashcard: card });
  } catch (err) {
    console.error("Create flashcard error:", err);
    return res.status(500).json({ error: "Failed to create flashcard" });
  }
});

// Delete flashcard
router.delete("/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const card = await prisma.flashcard.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
    });
    if (!card) return res.status(404).json({ error: "Flashcard not found" });

    await prisma.flashcard.delete({ where: { id: card.id } });
    return res.json({ success: true });
  } catch (err) {
    console.error("Delete flashcard error:", err);
    return res.status(500).json({ error: "Failed to delete flashcard" });
  }
});

export default router;
