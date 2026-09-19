import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import path from "path";
import { createServer as createViteServer } from "vite";

import authRoutes from "./server/routes/authRoutes.js";
import documentRoutes from "./server/routes/documentRoutes.js";
import chatRoutes from "./server/routes/chatRoutes.js";
import noteRoutes from "./server/routes/noteRoutes.js";
import flashcardRoutes from "./server/routes/flashcardRoutes.js";
import quizRoutes from "./server/routes/quizRoutes.js";
import studyPlanRoutes from "./server/routes/studyPlanRoutes.js";
import explainerRoutes from "./server/routes/explainerRoutes.js";
import progressRoutes from "./server/routes/progressRoutes.js";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Basic Middlewares
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));
  app.use(cookieParser());

  // API Health Check
  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      service: "StudyMate AI Full-Stack Platform",
    });
  });

  // Mount API Routers
  app.use("/api/auth", authRoutes);
  app.use("/api/documents", documentRoutes);
  app.use("/api/chats", chatRoutes);
  app.use("/api/notes", noteRoutes);
  app.use("/api/flashcards", flashcardRoutes);
  app.use("/api/quizzes", quizRoutes);
  app.use("/api/study-plans", studyPlanRoutes);
  app.use("/api/explain", explainerRoutes);
  app.use("/api/progress", progressRoutes);

  // Fallback 404 for unhandled /api requests so it doesn't fall through to index.html
  app.all("/api/*", (req, res) => {
    res.status(404).json({ error: `API endpoint not found: ${req.method} ${req.path}` });
  });

  // Vite Middleware (Development) or Static File Server (Production)
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`StudyMate AI server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Fatal server start error:", err);
});
