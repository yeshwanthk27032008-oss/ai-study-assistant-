import { Router } from "express";
import { prisma } from "../db.js";
import { requireAuth, type AuthRequest } from "../auth.js";
import { generateStudyNotes } from "../ai/notes.js";

const router = Router();

// List notes
router.get("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { search, documentId, favoriteOnly } = req.query;
    const where: any = { userId: req.user!.id };

    if (search && typeof search === "string" && search.trim()) {
      where.OR = [
        { title: { contains: search } },
        { content: { contains: search } },
      ];
    }

    if (documentId && typeof documentId === "string") {
      where.documentId = documentId;
    }

    if (favoriteOnly === "true") {
      where.isFavorite = true;
    }

    const notes = await prisma.note.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      include: {
        document: {
          select: { id: true, title: true, fileName: true },
        },
      },
    });

    const parsedNotes = notes.map((n) => {
      let keyConcepts = [];
      let definitions = [];
      let examples = [];
      let examTips = [];

      try { if (n.keyConcepts) keyConcepts = JSON.parse(n.keyConcepts); } catch {}
      try { if (n.definitions) definitions = JSON.parse(n.definitions); } catch {}
      try { if (n.examples) examples = JSON.parse(n.examples); } catch {}
      try { if (n.examTips) examTips = JSON.parse(n.examTips); } catch {}

      return {
        ...n,
        keyConcepts,
        definitions,
        examples,
        examTips,
      };
    });

    return res.json({ notes: parsedNotes });
  } catch (err) {
    console.error("List notes error:", err);
    return res.status(500).json({ error: "Failed to load notes" });
  }
});

// Create note manually
router.post("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { title, content, documentId, tags } = req.body;
    if (!title) {
      return res.status(400).json({ error: "Note title is required" });
    }

    const note = await prisma.note.create({
      data: {
        userId: req.user!.id,
        title: title.trim(),
        content: content || "",
        documentId: documentId || null,
        tags: tags || null,
      },
    });

    return res.status(201).json({ note });
  } catch (err) {
    console.error("Create note error:", err);
    return res.status(500).json({ error: "Failed to create note" });
  }
});

// AI Generate Study Notes
router.post("/generate", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { documentId, topic, level } = req.body;

    let sourceText = topic || "";
    let sourceTitle = topic || "Study Notes";

    if (documentId) {
      const doc = await prisma.document.findFirst({
        where: { id: documentId, userId: req.user!.id },
      });
      if (doc) {
        sourceText = doc.rawText || doc.title;
        sourceTitle = doc.title;
      }
    }

    if (!sourceText.trim()) {
      return res.status(400).json({ error: "Please provide a document or a topic to generate notes for" });
    }

    const generated = await generateStudyNotes({
      topicOrText: sourceText,
      sourceTitle,
      level: level || req.user!.preferredExplanationLevel,
    });

    const note = await prisma.note.create({
      data: {
        userId: req.user!.id,
        documentId: documentId || null,
        title: generated.title,
        overview: generated.overview,
        content: generated.content,
        keyConcepts: JSON.stringify(generated.keyConcepts),
        definitions: JSON.stringify(generated.definitions),
        examples: JSON.stringify(generated.examples),
        examTips: JSON.stringify(generated.examTips),
      },
    });

    return res.status(201).json({
      note: {
        ...note,
        keyConcepts: generated.keyConcepts,
        definitions: generated.definitions,
        examples: generated.examples,
        examTips: generated.examTips,
      },
    });
  } catch (err) {
    console.error("Generate notes error:", err);
    return res.status(500).json({ error: "Failed to generate AI notes" });
  }
});

// Update note
router.put("/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { title, content, isFavorite, tags } = req.body;
    const note = await prisma.note.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
    });

    if (!note) return res.status(404).json({ error: "Note not found" });

    const updated = await prisma.note.update({
      where: { id: note.id },
      data: {
        ...(title !== undefined && { title }),
        ...(content !== undefined && { content }),
        ...(isFavorite !== undefined && { isFavorite }),
        ...(tags !== undefined && { tags }),
      },
    });

    return res.json({ note: updated });
  } catch (err) {
    console.error("Update note error:", err);
    return res.status(500).json({ error: "Failed to update note" });
  }
});

// Delete note
router.delete("/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const note = await prisma.note.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
    });
    if (!note) return res.status(404).json({ error: "Note not found" });

    await prisma.note.delete({ where: { id: note.id } });
    return res.json({ success: true });
  } catch (err) {
    console.error("Delete note error:", err);
    return res.status(500).json({ error: "Failed to delete note" });
  }
});

export default router;
