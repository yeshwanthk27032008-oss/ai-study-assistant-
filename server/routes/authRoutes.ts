import { Router } from "express";
import { prisma } from "../db.js";
import { hashPassword, comparePassword, signToken, requireAuth, type AuthRequest } from "../auth.js";
import { seedDemoDocumentForUser } from "../demoData.js";

const router = Router();

// Register new student account
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, email, and password are required" });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (existingUser) {
      return res.status(400).json({ error: "An account with this email already exists" });
    }

    const passwordHash = hashPassword(password);
    const user = await prisma.user.create({
      data: {
        name: String(name).trim(),
        email: cleanEmail,
        passwordHash,
        progress: {
          create: {
            streakDays: 1,
            totalHoursStudied: 0,
            topicsCompleted: 0,
            flashcardsReviewed: 0,
            quizAverage: 0,
          },
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        preferredExplanationLevel: true,
        theme: true,
      },
    });

    const token = signToken(user);
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    return res.status(201).json({ user, token });
  } catch (err: any) {
    console.error("Register error:", err);
    return res.status(500).json({ error: "Registration failed. Please try again." });
  }
});

// Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (!user || !comparePassword(password, user.passwordHash)) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      preferredExplanationLevel: user.preferredExplanationLevel,
      theme: user.theme,
    };

    const token = signToken(safeUser);
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    return res.json({ user: safeUser, token });
  } catch (err: any) {
    console.error("Login error:", err);
    return res.status(500).json({ error: "Login failed. Please try again." });
  }
});

// Demo login for hackathon judges & instant preview
router.post("/demo-login", async (req, res) => {
  try {
    const demoEmail = "student@studymate.ai";
    let user = await prisma.user.findUnique({
      where: { email: demoEmail },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          name: "Alex Rivera",
          email: demoEmail,
          passwordHash: hashPassword("StudyMate2026!"),
          preferredExplanationLevel: "Normal",
        },
      });
    }

    // Seed demo materials, flashcards, quizzes, study plans
    await seedDemoDocumentForUser(user.id);

    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      preferredExplanationLevel: user.preferredExplanationLevel,
      theme: user.theme,
    };

    const token = signToken(safeUser);
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    return res.json({ user: safeUser, token });
  } catch (err: any) {
    console.error("Demo login error:", err);
    return res.status(500).json({ error: "Demo login failed" });
  }
});

// Current User Session
router.get("/me", requireAuth, async (req: AuthRequest, res) => {
  return res.json({ user: req.user });
});

// Logout
router.post("/logout", (req, res) => {
  res.clearCookie("token");
  return res.json({ success: true });
});

export default router;
