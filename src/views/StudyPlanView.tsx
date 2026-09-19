import React, { useState, useEffect } from "react";
import {
  Calendar,
  Sparkles,
  Plus,
  CheckCircle2,
  Circle,
  Clock,
  Trash2,
  BookOpen,
  Target,
  ArrowRight,
} from "lucide-react";
import type { StudyPlan, StudyTask } from "../types.js";
import { api } from "../api.js";

interface StudyPlanViewProps {
  onNavigate: (view: string, targetId?: string) => void;
}

export function StudyPlanView({ onNavigate }: StudyPlanViewProps) {
  const [plans, setPlans] = useState<StudyPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<StudyPlan | null>(null);
  const [loading, setLoading] = useState(true);

  // Generate modal state
  const [showGenModal, setShowGenModal] = useState(false);
  const [examName, setExamName] = useState("");
  const [examDate, setExamDate] = useState("");
  const [subjectsText, setSubjectsText] = useState("");
  const [targetHours, setTargetHours] = useState(3);
  const [currentLevel, setCurrentLevel] = useState("Intermediate");
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      setLoading(true);
      const res = await api.studyPlans.list();
      setPlans(res.studyPlans || []);
      if (res.studyPlans && res.studyPlans.length > 0) {
        setSelectedPlan(res.studyPlans[0]);
      }
    } catch (err) {
      console.error("Load study plans error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleTask = async (taskId: string, currentVal: boolean) => {
    try {
      await api.studyPlans.toggleTask(taskId, !currentVal);
      // Reload plans to get recalculated progress percentage
      const res = await api.studyPlans.list();
      setPlans(res.studyPlans || []);
      const updated = res.studyPlans.find((p) => p.id === selectedPlan?.id);
      if (updated) setSelectedPlan(updated);
    } catch (err) {
      console.error("Toggle task error:", err);
    }
  };

  const handleGeneratePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!examName.trim()) {
      alert("Please provide the exam or course name");
      return;
    }

    const subjects = subjectsText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      setGenerating(true);
      const res = await api.studyPlans.generate({
        examName: examName.trim(),
        examDate: examDate || undefined,
        subjects: subjects.length > 0 ? subjects : ["Core Concepts", "Problem Solving", "Mock Exams"],
        targetHoursPerDay: Number(targetHours) || 3,
        currentLevel,
      });

      setShowGenModal(false);
      setExamName("");
      setSubjectsText("");
      await loadPlans();
      setSelectedPlan(res.studyPlan);
    } catch (err: any) {
      alert(err.message || "Failed to generate study plan");
    } finally {
      setGenerating(false);
    }
  };

  const handleDeletePlan = async (id: string) => {
    if (!confirm("Are you sure you want to delete this study plan?")) return;
    try {
      await api.studyPlans.delete(id);
      const updated = plans.filter((p) => p.id !== id);
      setPlans(updated);
      setSelectedPlan(updated.length > 0 ? updated[0] : null);
    } catch (err) {
      console.error("Delete plan error:", err);
    }
  };

  // Group tasks by Day
  const tasksByDay: Record<number, StudyTask[]> = {};
  if (selectedPlan?.tasks) {
    selectedPlan.tasks.forEach((t) => {
      const day = t.dayNumber || 1;
      if (!tasksByDay[day]) tasksByDay[day] = [];
      tasksByDay[day].push(t);
    });
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-600" />
            <h1 className="font-display text-xl sm:text-2xl font-black text-slate-900">
              Personalized Study Planner
            </h1>
          </div>
          <p className="text-xs text-slate-700 mt-0.5">
            AI-structured study timetable engineered around your target exam date and hours.
          </p>
        </div>

        <button
          onClick={() => setShowGenModal(true)}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
        >
          <Sparkles className="w-4 h-4" />
          <span>New AI Study Plan</span>
        </button>
      </div>

      {/* Main Container */}
      {loading ? (
        <div className="py-12 text-center text-xs text-slate-700">Loading your study plans...</div>
      ) : plans.length === 0 ? (
        <div className="py-12 text-center bg-white rounded-2xl border border-slate-200 p-8 space-y-3">
          <Calendar className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">No active study plans</h3>
          <p className="text-xs text-slate-700 max-w-sm mx-auto">
            Input your upcoming test, syllabus topics, and daily available study time to create an optimized schedule.
          </p>
          <button
            onClick={() => setShowGenModal(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 cursor-pointer shadow-xs"
          >
            Create My AI Study Plan
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Plan Selector & Progress Banner */}
          {selectedPlan && (
            <div className="p-6 bg-gradient-to-r from-indigo-800 via-blue-800 to-indigo-900 text-white rounded-3xl shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-[10px] font-bold uppercase tracking-wider">
                  Target Exam Schedule
                </span>
                <h2 className="font-display font-black text-xl sm:text-2xl">
                  {selectedPlan.examName}
                </h2>
                <div className="flex items-center gap-3 text-xs text-indigo-200 pt-1">
                  <span>Target: {selectedPlan.targetHoursPerDay} hrs/day</span>
                  <span>•</span>
                  <span>Level: {selectedPlan.currentLevel}</span>
                  {selectedPlan.examDate && (
                    <>
                      <span>•</span>
                      <span>Exam Date: {new Date(selectedPlan.examDate).toLocaleDateString()}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Progress Ring / Gauge */}
              <div className="bg-white/10 backdrop-blur p-4 rounded-2xl border border-white/20 text-center shrink-0 min-w-[140px]">
                <p className="text-[10px] font-bold uppercase text-indigo-200">Completion</p>
                <p className="font-display font-black text-3xl mt-0.5">
                  {selectedPlan.progressPercent}%
                </p>
                <div className="w-full bg-white/20 rounded-full h-1.5 mt-2 overflow-hidden">
                  <div
                    className="bg-emerald-400 h-full transition-all duration-300"
                    style={{ width: `${selectedPlan.progressPercent}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Plan Switcher if user has multiple plans */}
          {plans.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <span className="text-xs font-bold text-slate-700">Plans:</span>
              {plans.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPlan(p)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                    selectedPlan?.id === p.id
                      ? "bg-indigo-600 text-white"
                      : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
                  }`}
                >
                  {p.examName}
                </button>
              ))}
            </div>
          )}

          {/* Daily Schedule Checklist */}
          {selectedPlan && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-bold text-base text-slate-900">
                  Study Timeline & Action Items
                </h3>
                <button
                  onClick={() => handleDeletePlan(selectedPlan.id)}
                  className="text-xs font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Plan</span>
                </button>
              </div>

              <div className="space-y-4">
                {Object.keys(tasksByDay).map((dayKey) => {
                  const dayNum = Number(dayKey);
                  const tasks = tasksByDay[dayNum] || [];
                  const dayCompleted = tasks.every((t) => t.isCompleted);

                  return (
                    <div
                      key={dayNum}
                      className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-3"
                    >
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-xs font-bold">
                            Day {dayNum}
                          </span>
                          <span className="text-xs font-semibold text-slate-700">
                            {tasks.length} study block{tasks.length > 1 ? "s" : ""}
                          </span>
                        </div>

                        {dayCompleted && (
                          <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 fill-emerald-100" />
                            <span>Day Completed!</span>
                          </span>
                        )}
                      </div>

                      <div className="space-y-2">
                        {tasks.map((task) => (
                          <div
                            key={task.id}
                            onClick={() => handleToggleTask(task.id, task.isCompleted)}
                            className={`p-3 rounded-xl border transition-all flex items-start justify-between gap-3 cursor-pointer ${
                              task.isCompleted
                                ? "bg-slate-50/70 border-slate-200 text-slate-600"
                                : "bg-white hover:bg-slate-50 border-slate-200 text-slate-900 shadow-2xs"
                            }`}
                          >
                            <div className="flex items-start gap-2.5 min-w-0">
                              <button className="mt-0.5 text-indigo-600 shrink-0">
                                {task.isCompleted ? (
                                  <CheckCircle2 className="w-4 h-4 text-emerald-500 fill-emerald-100" />
                                ) : (
                                  <Circle className="w-4 h-4 text-slate-600" />
                                )}
                              </button>
                              <div>
                                <p
                                  className={`text-xs font-bold ${
                                    task.isCompleted ? "line-through text-slate-600" : "text-slate-900"
                                  }`}
                                >
                                  {task.topic}
                                </p>
                                <div className="flex items-center gap-2 text-[11px] text-slate-600 mt-0.5">
                                  <span className="font-semibold text-indigo-600">
                                    {task.subject}
                                  </span>
                                  <span>•</span>
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {task.startTime} - {task.endTime} ({task.durationMinutes}m)
                                  </span>
                                </div>
                              </div>
                            </div>

                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                task.isCompleted
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-slate-100 text-slate-700"
                              }`}
                            >
                              {task.isCompleted ? "Done" : "Pending"}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* AI Generate Plan Modal */}
      {showGenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <h3 className="font-bold text-sm text-slate-900">Create AI Study Schedule</h3>
              </div>
              <button
                onClick={() => setShowGenModal(false)}
                className="text-slate-600 hover:text-slate-800"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleGeneratePlan} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Exam or Course Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Computer Science Finals / Algorithms Midterm"
                  value={examName}
                  onChange={(e) => setExamName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Target Exam Date (Optional)
                </label>
                <input
                  type="date"
                  value={examDate}
                  onChange={(e) => setExamDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Syllabus Modules / Subjects (Comma separated)
                </label>
                <textarea
                  rows={2}
                  placeholder="Arrays, Linked Lists, Binary Trees, Graphs, Sorting Algorithms"
                  value={subjectsText}
                  onChange={(e) => setSubjectsText(e.target.value)}
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Study Hours / Day
                  </label>
                  <select
                    value={targetHours}
                    onChange={(e) => setTargetHours(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value={1}>1 hour</option>
                    <option value={2}>2 hours</option>
                    <option value={3}>3 hours</option>
                    <option value={4}>4 hours</option>
                    <option value={6}>6 hours (Intensive)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Current Level
                  </label>
                  <select
                    value={currentLevel}
                    onChange={(e) => setCurrentLevel(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={generating}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                <span>{generating ? "Building Custom Timetable..." : "Generate Study Plan"}</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
