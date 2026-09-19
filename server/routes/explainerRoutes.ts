import { Router } from "express";
import { requireAuth, type AuthRequest } from "../auth.js";
import { explainTopic } from "../ai/explainer.js";
import { prisma } from "../db.js";

const router = Router();

// Explain topic
router.post("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { topic, difficulty } = req.body;
    if (!topic || !topic.trim()) {
      return res.status(400).json({ error: "Topic is required" });
    }

    const level = ["Beginner", "Intermediate", "Advanced"].includes(difficulty)
      ? difficulty
      : req.user!.preferredExplanationLevel || "Intermediate";

    const explanation = await explainTopic(topic.trim(), level);

    // Increment topics completed or active time
    await prisma.progress.updateMany({
      where: { userId: req.user!.id },
      data: {
        lastActiveDate: new Date(),
      },
    });

    return res.json({ explanation });
  } catch (err) {
    console.error("Explainer error:", err);
    return res.status(500).json({ error: "Failed to explain topic" });
  }
});

export default router;
