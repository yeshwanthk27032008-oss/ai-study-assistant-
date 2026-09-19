import { Router } from "express";
import { prisma } from "../db.js";
import { requireAuth, type AuthRequest } from "../auth.js";
import { generateChatResponse, CHAT_ROLES, type ChatRoleType, GEMINI_MODELS } from "../ai/chat.js";

const router = Router();

// Return available chatbot roles and model tiers
router.get("/config", requireAuth, async (_req, res) => {
  return res.json({
    roles: Object.entries(CHAT_ROLES).map(([id, info]) => ({
      id,
      name: info.name,
      description: info.description,
      defaultComplexity: info.defaultComplexity,
    })),
    models: [
      {
        id: "auto",
        name: "Auto Complexity Router",
        description: "Automatically selects Pro for complex STEM, Lite for quick facts, Flash for general tasks",
      },
      {
        id: "gemini-3.5-flash",
        name: "Gemini 3.5 Flash (General Tasks)",
        description: "Balanced, high-accuracy study assistant for structured lessons and review",
      },
      {
        id: "gemini-3.1-pro-preview",
        name: "Gemini 3.1 Pro (Complex Tasks)",
        description: "Deep analytical reasoning for mathematical proofs, STEM, and code",
      },
      {
        id: "gemini-3.1-flash-lite",
        name: "Gemini 3.1 Flash Lite (Fast Tasks)",
        description: "Ultra-low latency for instant definitions, flash review, and quick lookups",
      },
      {
        id: "gemini-3.8-flash",
        name: "Gemini 3.8 Flash (Text Standard)",
        description: "Latest generation general reasoning model",
      },
    ],
  });
});

// List user chats
router.get("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const chats = await prisma.chat.findMany({
      where: { userId: req.user!.id },
      orderBy: { updatedAt: "desc" },
      include: {
        document: {
          select: { id: true, title: true, fileName: true },
        },
        _count: { select: { messages: true } },
      },
    });
    return res.json({ chats });
  } catch (err) {
    console.error("List chats error:", err);
    return res.status(500).json({ error: "Failed to load chats" });
  }
});

// Create new chat
router.post("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { title, documentId, systemRole, model } = req.body;
    const chat = await prisma.chat.create({
      data: {
        userId: req.user!.id,
        title: title || "New Study Session",
        documentId: documentId || null,
        systemRole: systemRole || "tutor",
        model: model || "gemini-3.5-flash",
      },
      include: {
        document: {
          select: { id: true, title: true, fileName: true },
        },
      },
    });
    return res.status(201).json({ chat });
  } catch (err) {
    console.error("Create chat error:", err);
    return res.status(500).json({ error: "Failed to create chat" });
  }
});

// Update chat settings (e.g. system role or model)
router.patch("/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { systemRole, model, title, documentId } = req.body;
    const existing = await prisma.chat.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
    });
    if (!existing) return res.status(404).json({ error: "Chat not found" });

    const updated = await prisma.chat.update({
      where: { id: existing.id },
      data: {
        ...(systemRole ? { systemRole } : {}),
        ...(model ? { model } : {}),
        ...(title ? { title } : {}),
        ...(documentId !== undefined ? { documentId: documentId || null } : {}),
      },
      include: {
        document: {
          select: { id: true, title: true, fileName: true },
        },
      },
    });

    return res.json({ chat: updated });
  } catch (err) {
    console.error("Update chat error:", err);
    return res.status(500).json({ error: "Failed to update chat" });
  }
});

// Get chat with messages
router.get("/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const chat = await prisma.chat.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
      include: {
        document: {
          select: { id: true, title: true, fileName: true },
        },
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!chat) {
      return res.status(404).json({ error: "Chat not found" });
    }

    // Parse sources JSON (supporting document RAG sources and Google Search grounding sources)
    const parsedMessages = chat.messages.map((m) => {
      let docSources: any[] = [];
      let webSources: any[] = [];
      let webSearchQueries: string[] = [];
      let isSearchGrounded = false;

      if (m.sources) {
        try {
          const parsed = JSON.parse(m.sources);
          if (Array.isArray(parsed)) {
            docSources = parsed;
          } else if (parsed && typeof parsed === "object") {
            docSources = parsed.docSources || [];
            webSources = parsed.webSources || [];
            webSearchQueries = parsed.webSearchQueries || [];
            isSearchGrounded = Boolean(parsed.isSearchGrounded || (webSources && webSources.length > 0));
          }
        } catch {
          docSources = [];
        }
      }

      return {
        ...m,
        sources: docSources.length > 0 ? docSources : null,
        webSources: webSources.length > 0 ? webSources : null,
        webSearchQueries: webSearchQueries.length > 0 ? webSearchQueries : null,
        isSearchGrounded,
      };
    });

    return res.json({ chat: { ...chat, messages: parsedMessages } });
  } catch (err) {
    console.error("Get chat error:", err);
    return res.status(500).json({ error: "Failed to load chat" });
  }
});

// Post message to chat & run Multi-turn Gemini Chat with role instructions, model tiering & Google Search grounding
router.post("/:id/message", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { content, documentId, systemRole, model, useGoogleSearch } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ error: "Message content cannot be empty" });
    }

    const chat = await prisma.chat.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
    });

    if (!chat) {
      return res.status(404).json({ error: "Chat not found" });
    }

    // Effective document ID and role configuration
    const targetDocId = documentId !== undefined ? documentId : (chat.documentId || undefined);
    const activeRole = (systemRole || chat.systemRole || "tutor") as ChatRoleType;
    const activeModel = model || chat.model || "gemini-3.5-flash";

    // 1. Save user message
    const userMessage = await prisma.chatMessage.create({
      data: {
        chatId: chat.id,
        role: "user",
        content: content.trim(),
      },
    });

    // Check message count to generate smart title if first message
    const msgCount = await prisma.chatMessage.count({ where: { chatId: chat.id } });
    if (msgCount <= 1) {
      const generatedTitle = content.trim().slice(0, 35) + (content.length > 35 ? "..." : "");
      await prisma.chat.update({
        where: { id: chat.id },
        data: {
          title: generatedTitle,
          documentId: targetDocId && targetDocId !== "all" ? targetDocId : chat.documentId,
          systemRole: activeRole,
          model: activeModel,
        },
      });
    }

    // 2. Perform Multi-turn Gemini Chat completion with conversation history, role instruction, and optional Google Search grounding
    const result = await generateChatResponse({
      userId: req.user!.id,
      chatId: chat.id,
      message: content.trim(),
      roleType: activeRole,
      preferredModel: activeModel,
      documentId: targetDocId,
      explanationLevel: req.user!.preferredExplanationLevel,
      useGoogleSearch: Boolean(useGoogleSearch),
    });

    const sourcesPayload = {
      docSources: result.sources,
      webSources: result.webSources || [],
      webSearchQueries: result.webSearchQueries || [],
      isSearchGrounded: Boolean(result.isSearchGrounded),
    };

    // 3. Save assistant message with sources and exact model used
    const assistantMessage = await prisma.chatMessage.create({
      data: {
        chatId: chat.id,
        role: "assistant",
        content: result.answer,
        sources:
          result.sources.length > 0 || (result.webSources && result.webSources.length > 0)
            ? JSON.stringify(sourcesPayload)
            : null,
        model: result.modelUsed,
      },
    });

    // Touch chat updatedAt
    await prisma.chat.update({
      where: { id: chat.id },
      data: { updatedAt: new Date() },
    });

    return res.json({
      userMessage,
      assistantMessage: {
        ...assistantMessage,
        sources: result.sources,
        webSources: result.webSources || [],
        webSearchQueries: result.webSearchQueries || [],
        isSearchGrounded: Boolean(result.isSearchGrounded),
      },
    });
  } catch (err) {
    console.error("Send message error:", err);
    return res.status(500).json({ error: "Failed to send message" });
  }
});

// Clear messages in chat
router.post("/:id/clear", requireAuth, async (req: AuthRequest, res) => {
  try {
    const chat = await prisma.chat.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
    });
    if (!chat) return res.status(404).json({ error: "Chat not found" });

    await prisma.chatMessage.deleteMany({
      where: { chatId: chat.id },
    });

    return res.json({ success: true });
  } catch (err) {
    console.error("Clear chat error:", err);
    return res.status(500).json({ error: "Failed to clear chat" });
  }
});

// Delete chat
router.delete("/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const chat = await prisma.chat.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
    });
    if (!chat) return res.status(404).json({ error: "Chat not found" });

    await prisma.chatMessage.delete({
      where: { id: chat.id },
    });

    return res.json({ success: true });
  } catch (err) {
    console.error("Delete chat error:", err);
    return res.status(500).json({ error: "Failed to delete chat" });
  }
});

export default router;
