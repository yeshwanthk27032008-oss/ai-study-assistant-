import { getGeminiClient, GEMINI_MODELS } from "./gemini.js";

export interface GeneratedTask {
  dayOfWeek: string;
  subject: string;
  topic: string;
  startTime: string;
  endTime: string;
}

export interface GeneratedPlan {
  title: string;
  overview: string;
  tasks: GeneratedTask[];
}

export async function generatePersonalizedStudyPlan(options: {
  examName: string;
  examDate: string;
  subjects: string[];
  targetHoursPerDay: number;
  currentLevel: string;
}): Promise<GeneratedPlan> {
  const { examName, examDate, subjects, targetHoursPerDay, currentLevel } = options;
  const ai = getGeminiClient();

  if (!ai) {
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    const subjs = subjects.length > 0 ? subjects : ["Core Syllabus", "Problem Solving"];
    const defaultTasks: GeneratedTask[] = [];

    days.forEach((day, dIdx) => {
      const s1 = subjs[dIdx % subjs.length];
      const s2 = subjs[(dIdx + 1) % subjs.length];

      defaultTasks.push({
        dayOfWeek: day,
        subject: s1,
        topic: `Fundamental Principles & Active Practice in ${s1}`,
        startTime: "06:00 PM",
        endTime: "07:15 PM",
      });

      if (targetHoursPerDay >= 2) {
        defaultTasks.push({
          dayOfWeek: day,
          subject: s2,
          topic: `Applied Problem Solving & Mock Questions in ${s2}`,
          startTime: "07:30 PM",
          endTime: "08:45 PM",
        });
      }
    });

    return {
      title: `${examName} Comprehensive Preparation Plan`,
      overview: `A structured ${targetHoursPerDay} hour/day study plan tailored for ${currentLevel} students preparing for ${examName} by ${examDate}.`,
      tasks: defaultTasks,
    };
  }

  const prompt = `You are a high-performance academic strategist and tutor.
Design a personalized 7-day recurring daily study schedule for a student.

PARAMETERS:
- Exam Name: "${examName}"
- Target Exam Date: "${examDate}"
- Subjects: ${subjects.join(", ")}
- Available Study Hours Per Day: ${targetHoursPerDay} hours
- Student Current Level: ${currentLevel} (Beginner, Intermediate, Advanced)

INSTRUCTIONS:
1. Generate high-yield study blocks for each day of the week (Monday through Sunday).
2. Schedule specific, realistic times (e.g. "06:00 PM" to "07:15 PM") with short 10-15 minute rest intervals.
3. Balance theoretical reading, practice problem-solving, and active recall review.
4. Total daily duration should match approximately ${targetHoursPerDay} hours per day.

Return a STRICT JSON object matching this schema:
{
  "title": "${examName} Master Study Plan",
  "overview": "2-3 sentences explaining the strategy and pacing of this weekly schedule",
  "tasks": [
    {
      "dayOfWeek": "Monday",
      "subject": "Subject Name",
      "topic": "Specific actionable topic / module to master",
      "startTime": "06:00 PM",
      "endTime": "07:15 PM"
    }
  ]
}`;

  try {
    const res = await ai.models.generateContent({
      model: GEMINI_MODELS.TEXT,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const parsed = JSON.parse(res.text || "{}");
    return {
      title: parsed.title || `${examName} Study Plan`,
      overview: parsed.overview || `Weekly study plan for ${examName}.`,
      tasks: Array.isArray(parsed.tasks) && parsed.tasks.length > 0 ? parsed.tasks : [],
    };
  } catch (err) {
    console.error("Study plan generation error:", err);
    return {
      title: `${examName} Study Plan`,
      overview: `Personalized study plan for ${examName}.`,
      tasks: [
        {
          dayOfWeek: "Monday",
          subject: subjects[0] || "General",
          topic: "Core syllabus overview and diagnostic review",
          startTime: "06:00 PM",
          endTime: "07:30 PM",
        },
      ],
    };
  }
}
