import { Router } from "express";
import { prisma } from "../db.js";
import { requireAuth, type AuthRequest } from "../auth.js";
import { generatePersonalizedStudyPlan } from "../ai/studyPlan.js";

const router = Router();

// Get active study plans
router.get("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const plans = await prisma.studyPlan.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: "desc" },
      include: {
        tasks: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    const parsedPlans = plans.map((p: any) => {
      let subjects = [];
      try {
        if (p.subjects) subjects = JSON.parse(p.subjects);
      } catch {}

      const totalTasks = p.tasks?.length || 0;
      const completedTasks = p.tasks?.filter((t: any) => t.isCompleted).length || 0;
      const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      return {
        ...p,
        subjects,
        totalTasks,
        completedTasks,
        progressPercent,
      };
    });

    return res.json({ studyPlans: parsedPlans });
  } catch (err) {
    console.error("Get study plans error:", err);
    return res.status(500).json({ error: "Failed to load study plans" });
  }
});

// Generate AI study plan
router.post("/generate", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { examName, examDate, subjects, targetHoursPerDay, currentLevel } = req.body;

    if (!examName) {
      return res.status(400).json({ error: "Exam name is required" });
    }

    const subjs = Array.isArray(subjects) && subjects.length > 0 ? subjects : ["Core Syllabus"];
    const hours = Math.min(Math.max(Number(targetHoursPerDay) || 2, 0.5), 12);
    const level = currentLevel || "Intermediate";

    const generated = await generatePersonalizedStudyPlan({
      examName,
      examDate: examDate || "Upcoming Exam",
      subjects: subjs,
      targetHoursPerDay: hours,
      currentLevel: level,
    });

    const plan = await prisma.studyPlan.create({
      data: {
        userId: req.user!.id,
        title: generated.title,
        examName,
        examDate: examDate ? new Date(examDate) : null,
        targetHoursPerDay: hours,
        currentLevel: level,
        subjects: JSON.stringify(subjs),
      },
    });

    for (const task of generated.tasks) {
      await prisma.studyTask.create({
        data: {
          studyPlanId: plan.id,
          dayNumber: (task as any).dayNumber || 1,
          dayOfWeek: task.dayOfWeek,
          subject: task.subject,
          topic: task.topic,
          startTime: task.startTime,
          endTime: task.endTime,
          durationMinutes: (task as any).durationMinutes || 60,
        },
      });
    }

    const fullPlan = await prisma.studyPlan.findUnique({
      where: { id: plan.id },
      include: { tasks: true },
    });

    return res.status(201).json({
      studyPlan: {
        ...fullPlan,
        subjects: subjs,
        totalTasks: fullPlan?.tasks.length || 0,
        completedTasks: 0,
        progressPercent: 0,
      },
    });
  } catch (err) {
    console.error("Generate study plan error:", err);
    return res.status(500).json({ error: "Failed to generate study plan" });
  }
});

// Toggle task completion
router.patch("/tasks/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { isCompleted } = req.body;
    const task = await prisma.studyTask.findUnique({
      where: { id: req.params.id },
      include: {
        studyPlan: true,
      },
    });

    if (!task || task.studyPlan.userId !== req.user!.id) {
      return res.status(404).json({ error: "Task not found" });
    }

    const updatedTask = await prisma.studyTask.update({
      where: { id: task.id },
      data: {
        isCompleted: isCompleted ?? !task.isCompleted,
        completedAt: (isCompleted ?? !task.isCompleted) ? new Date() : null,
      },
    });

    // Update study streak if completing
    if (updatedTask.isCompleted) {
      await prisma.progress.updateMany({
        where: { userId: req.user!.id },
        data: {
          topicsCompleted: { increment: 1 },
          lastActiveDate: new Date(),
        },
      });
    }

    return res.json({ task: updatedTask });
  } catch (err) {
    console.error("Toggle task error:", err);
    return res.status(500).json({ error: "Failed to update task" });
  }
});

// Delete study plan
router.delete("/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const plan = await prisma.studyPlan.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
    });
    if (!plan) return res.status(404).json({ error: "Study plan not found" });

    await prisma.studyPlan.delete({ where: { id: plan.id } });
    return res.json({ success: true });
  } catch (err) {
    console.error("Delete study plan error:", err);
    return res.status(500).json({ error: "Failed to delete study plan" });
  }
});

export default router;
