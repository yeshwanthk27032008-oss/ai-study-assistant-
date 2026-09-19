import { Router } from "express";
import multer from "multer";
import path from "path";
import { prisma } from "../db.js";
import { requireAuth, type AuthRequest } from "../auth.js";
import { extractTextFromBuffer, chunkAndEmbedDocument } from "../docProcessor.js";
import { generateDocumentSummary } from "../ai/summarizer.js";
import { seedDemoDocumentForUser } from "../demoData.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB max
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if ([".pdf", ".docx", ".txt", ".md"].includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Supported formats are PDF, DOCX, and TXT"));
    }
  },
});

const router = Router();

// List user documents
router.get("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { search, fileType, status } = req.query;
    const where: any = { userId: req.user!.id };

    if (search && typeof search === "string" && search.trim()) {
      where.OR = [
        { title: { contains: search } },
        { fileName: { contains: search } },
      ];
    }

    if (fileType && typeof fileType === "string" && fileType !== "all") {
      where.fileType = fileType;
    }

    if (status && typeof status === "string" && status !== "all") {
      where.status = status;
    }

    const docs = await prisma.document.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        fileName: true,
        fileType: true,
        fileSize: true,
        pageCount: true,
        status: true,
        summary: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { chunks: true, flashcards: true, quizzes: true, notes: true },
        },
      },
    });

    return res.json({ documents: docs });
  } catch (err) {
    console.error("Fetch documents error:", err);
    return res.status(500).json({ error: "Failed to load documents" });
  }
});

// Seed demo document
router.post("/demo", requireAuth, async (req: AuthRequest, res) => {
  try {
    const doc = await seedDemoDocumentForUser(req.user!.id);
    return res.json({ document: doc, message: "Demo study document loaded successfully" });
  } catch (err) {
    console.error("Seed demo error:", err);
    return res.status(500).json({ error: "Failed to seed demo document" });
  }
});

// Upload document
router.post("/upload", requireAuth, upload.single("file"), async (req: AuthRequest, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Please upload a file (.pdf, .docx, or .txt)" });
    }

    const { originalname, buffer, size } = req.file;
    const ext = path.extname(originalname).toLowerCase().replace(".", "");
    const fileType = ext === "doc" ? "docx" : ext;
    const title = req.body.title || originalname;

    // Create document record with "Processing" status
    const doc = await prisma.document.create({
      data: {
        userId: req.user!.id,
        title,
        fileName: originalname,
        fileType,
        fileSize: size,
        status: "Processing",
      },
    });

    // Real document processing pipeline
    try {
      const { rawText, pageCount, pages } = await extractTextFromBuffer(buffer, fileType);

      // Save chunks and generate embeddings
      await chunkAndEmbedDocument(doc.id, pages);

      // Auto-generate AI summary
      const summaryResult = await generateDocumentSummary(rawText, title);

      const updatedDoc = await prisma.document.update({
        where: { id: doc.id },
        data: {
          rawText,
          pageCount,
          status: "Ready",
          summary: summaryResult.overview,
          keyConcepts: JSON.stringify(summaryResult.keyConcepts),
          examTips: JSON.stringify(summaryResult.examPoints),
        },
      });

      // Increment topics completed progress
      await prisma.progress.updateMany({
        where: { userId: req.user!.id },
        data: {
          topicsCompleted: { increment: 1 },
          lastActiveDate: new Date(),
        },
      });

      return res.status(201).json({ document: updatedDoc });
    } catch (procErr: any) {
      console.error("Processing document error:", procErr);
      await prisma.document.update({
        where: { id: doc.id },
        data: { status: "Failed" },
      });
      return res.status(500).json({ error: "Failed to process document content" });
    }
  } catch (err: any) {
    console.error("Upload error:", err);
    return res.status(500).json({ error: err.message || "Upload failed" });
  }
});

// Get document detail
router.get("/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const doc = await prisma.document.findFirst({
      where: {
        id: req.params.id,
        userId: req.user!.id,
      },
      include: {
        chunks: {
          orderBy: { chunkIndex: "asc" },
          select: {
            id: true,
            chunkIndex: true,
            pageNumber: true,
            content: true,
          },
        },
        _count: {
          select: { flashcards: true, quizzes: true, notes: true, chats: true },
        },
      },
    });

    if (!doc) {
      return res.status(404).json({ error: "Document not found" });
    }

    return res.json({ document: doc });
  } catch (err) {
    console.error("Get document error:", err);
    return res.status(500).json({ error: "Failed to retrieve document" });
  }
});

// Generate AI summary for an existing document
router.post("/:id/summarize", requireAuth, async (req: AuthRequest, res) => {
  try {
    const doc = await prisma.document.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
    });

    if (!doc) {
      return res.status(404).json({ error: "Document not found" });
    }

    const summary = await generateDocumentSummary(doc.rawText || doc.title, doc.title);

    await prisma.document.update({
      where: { id: doc.id },
      data: {
        summary: summary.overview,
        keyConcepts: JSON.stringify(summary.keyConcepts),
        examTips: JSON.stringify(summary.examPoints),
      },
    });

    return res.json({ summary });
  } catch (err) {
    console.error("Summarize error:", err);
    return res.status(500).json({ error: "Failed to generate summary" });
  }
});

// Rename document
router.patch("/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { title } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: "Title is required" });
    }

    const doc = await prisma.document.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
    });

    if (!doc) {
      return res.status(404).json({ error: "Document not found" });
    }

    const updated = await prisma.document.update({
      where: { id: doc.id },
      data: { title: title.trim() },
    });

    return res.json({ document: updated });
  } catch (err) {
    console.error("Update document error:", err);
    return res.status(500).json({ error: "Failed to update document" });
  }
});

// Delete document
router.delete("/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const doc = await prisma.document.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
    });

    if (!doc) {
      return res.status(404).json({ error: "Document not found" });
    }

    await prisma.document.delete({
      where: { id: doc.id },
    });

    return res.json({ success: true, message: "Document deleted" });
  } catch (err) {
    console.error("Delete document error:", err);
    return res.status(500).json({ error: "Failed to delete document" });
  }
});

export default router;
