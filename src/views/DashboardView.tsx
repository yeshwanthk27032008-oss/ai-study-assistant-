import React, { useState, useEffect } from "react";
import {
  Flame,
  Clock,
  BookOpen,
  Target,
  Sparkles,
  Upload,
  MessageSquare,
  Layers,
  HelpCircle,
  Lightbulb,
  FileText,
  ArrowRight,
  CheckCircle2,
  Circle,
  Calendar,
  Zap,
} from "lucide-react";
import type { User, DocumentItem, StudyPlan, ProgressData } from "../types.js";
import { api } from "../api.js";

interface DashboardViewProps {
  user: User | null;
  onNavigate: (view: string, targetId?: string) => void;
  onLoadDemo: () => void;
}

export function DashboardView({ user, onNavigate, onLoadDemo }: DashboardViewProps) {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [studyPlans, setStudyPlans] = useState<StudyPlan[]>([]);
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, [user]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [docsRes, plansRes, progRes] = await Promise.all([
        api.documents.list().catch(() => ({ documents: [] })),
        api.studyPlans.list().catch(() => ({ studyPlans: [] })),
        api.progress.get().catch(() => null),
      ]);
      setDocuments(docsRes.documents || []);
      setStudyPlans(plansRes.studyPlans || []);
      if (progRes) setProgress(progRes);
    } catch (err) {
      console.error("Load dashboard error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleTask = async (taskId: string, currentVal: boolean) => {
    try {
      await api.studyPlans.toggleTask(taskId, !currentVal);
      // Reload plans & progress
      const [plansRes, progRes] = await Promise.all([
        api.studyPlans.list(),
        api.progress.get().catch(() => null),
      ]);
      setStudyPlans(plansRes.studyPlans || []);
      if (progRes) setProgress(progRes);
    } catch (err) {
      console.error("Toggle task error:", err);
    }
  };

  const streakDays = progress?.progress?.streakDays || 1;
  const totalHours = progress?.progress?.totalHoursStudied || 0;
  const topicsCompleted = progress?.progress?.topicsCompleted || documents.length;
  const quizAverage = progress?.progress?.quizAverage || 85;

  // Extract all pending/upcoming tasks from active plans
  const activePlan = studyPlans[0];
  const pendingTasks = activePlan?.tasks || [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-700 via-blue-700 to-sky-600 text-white p-6 sm:p-8 shadow-xl shadow-indigo-100">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5 text-yellow-300 fill-yellow-300" />
            <span>AI Study Assistant Active</span>
          </div>

          <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight">
            Welcome back, {user ? user.name.split(" ")[0] : "Scholar"}!
          </h1>
          <p className="text-sm text-indigo-100 mt-1.5 leading-relaxed">
            Upload course materials to generate instant summaries, smart flashcards, practice quizzes, and get grounded answers with exact source citations.
          </p>

          <div className="flex flex-wrap items-center gap-3 mt-5">
            <button
              onClick={() => onNavigate("documents")}
              className="px-4 py-2 bg-white text-indigo-700 hover:bg-indigo-50 rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-2 cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              Upload Study Material
            </button>
            <button
              onClick={() => onNavigate("chat")}
              className="px-4 py-2 bg-white/15 hover:bg-white/25 text-white rounded-xl text-xs font-semibold backdrop-blur transition-all flex items-center gap-2 cursor-pointer border border-white/20"
            >
              <MessageSquare className="w-4 h-4" />
              Ask AI Question
            </button>
            {documents.length === 0 && (
              <button
                onClick={onLoadDemo}
                className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-2 cursor-pointer"
              >
                <Zap className="w-4 h-4 fill-slate-950" />
                Load Sample DSA Material
              </button>
            )}
          </div>
        </div>

        {/* Decorative background visual */}
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* 4 Core Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        <div className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-700">Study Streak</p>
            <p className="font-display text-2xl font-black text-slate-900 mt-1">
              {streakDays} <span className="text-xs font-normal text-slate-600">days</span>
            </p>
            <p className="text-[11px] text-amber-800 font-medium mt-1 flex items-center gap-1">
              <Flame className="w-3 h-3 text-amber-500 fill-amber-500" /> Keep the momentum!
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-500">
            <Flame className="w-6 h-6 fill-amber-400" />
          </div>
        </div>

        <div className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-700">Hours Studied</p>
            <p className="font-display text-2xl font-black text-slate-900 mt-1">
              {totalHours} <span className="text-xs font-normal text-slate-600">hrs</span>
            </p>
            <p className="text-[11px] text-sky-800 font-medium mt-1 flex items-center gap-1">
              <Clock className="w-3 h-3 text-sky-500" /> Pomodoro tracked
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-sky-50 border border-sky-200/60 flex items-center justify-center text-sky-600">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-700">Topics Mastered</p>
            <p className="font-display text-2xl font-black text-slate-900 mt-1">
              {topicsCompleted} <span className="text-xs font-normal text-slate-600">modules</span>
            </p>
            <p className="text-[11px] text-emerald-800 font-medium mt-1 flex items-center gap-1">
              <BookOpen className="w-3 h-3 text-emerald-500" /> Active comprehension
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200/60 flex items-center justify-center text-emerald-600">
            <BookOpen className="w-6 h-6" />
          </div>
        </div>

        <div className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-700">Quiz Average</p>
            <p className="font-display text-2xl font-black text-slate-900 mt-1">
              {quizAverage}%
            </p>
            <p className="text-[11px] text-indigo-800 font-medium mt-1 flex items-center gap-1">
              <Target className="w-3 h-3 text-indigo-500" /> Retention benchmark
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200/60 flex items-center justify-center text-indigo-600">
            <Target className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Grid: Study Materials + Daily Plan */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 cols): Recent Study Materials */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-600" />
              <h2 className="font-display font-bold text-base text-slate-900">
                Your Study Materials
              </h2>
            </div>
            <button
              onClick={() => onNavigate("documents")}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
            >
              <span>View all ({documents.length})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {documents.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-dashed border-slate-300">
              <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Upload className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">No documents uploaded yet</h3>
              <p className="text-xs text-slate-700 max-w-sm mx-auto mt-1 mb-4">
                Upload course lecture notes, textbooks, or syllabus PDFs to start using AI Question Answering with source citations.
              </p>
              <div className="flex justify-center gap-3">
                <button
                  onClick={() => onNavigate("documents")}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                >
                  Upload File
                </button>
                <button
                  onClick={onLoadDemo}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Load Demo DSA Notes
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {documents.slice(0, 4).map((doc) => (
                <div
                  key={doc.id}
                  className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:border-indigo-200 hover:shadow-md transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0 font-bold text-xs uppercase">
                      {doc.fileType}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-slate-900 truncate">{doc.title}</h4>
                      <p className="text-[11px] text-slate-700 mt-0.5 line-clamp-1">
                        {doc.summary || "Ready for active study and grounded AI question answering."}
                      </p>
                      <div className="flex items-center gap-3 text-[10px] text-slate-600 mt-1">
                        <span>{doc.pageCount} Pages</span>
                        <span>•</span>
                        <span>{doc._count?.chunks || doc.pageCount * 3} Chunks Indexed</span>
                        <span>•</span>
                        <span className="text-emerald-700 font-medium">Ready</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end border-t sm:border-t-0 pt-2 sm:pt-0">
                    <button
                      onClick={() => onNavigate("chat", doc.id)}
                      title="Ask questions grounded in this document"
                      className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>RAG Chat</span>
                    </button>
                    <button
                      onClick={() => onNavigate("flashcards")}
                      title="Practice or generate flashcards"
                      className="px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>Cards</span>
                    </button>
                    <button
                      onClick={() => onNavigate("quiz", doc.id)}
                      title="Take practice quiz"
                      className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <HelpCircle className="w-3.5 h-3.5" />
                      <span>Quiz</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Quick Study Action Modules */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <button
              onClick={() => onNavigate("explainer")}
              className="p-3.5 bg-gradient-to-br from-amber-50 to-orange-50/50 rounded-2xl border border-amber-200/60 text-left hover:shadow-md transition-all group cursor-pointer"
            >
              <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center mb-2 shadow-xs group-hover:scale-105 transition-transform">
                <Lightbulb className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-slate-900">Topic Explainer</h3>
              <p className="text-[11px] text-slate-600 mt-0.5">
                Break down tough concepts with real-world analogies and steps.
              </p>
            </button>

            <button
              onClick={() => onNavigate("notes")}
              className="p-3.5 bg-gradient-to-br from-emerald-50 to-teal-50/50 rounded-2xl border border-emerald-200/60 text-left hover:shadow-md transition-all group cursor-pointer"
            >
              <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center mb-2 shadow-xs group-hover:scale-105 transition-transform">
                <FileText className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-slate-900">Smart Notes</h3>
              <p className="text-[11px] text-slate-600 mt-0.5">
                Generate structured definitions, key formulas, and exam tips.
              </p>
            </button>

            <button
              onClick={() => onNavigate("quiz")}
              className="p-3.5 bg-gradient-to-br from-purple-50 to-indigo-50/50 rounded-2xl border border-purple-200/60 text-left hover:shadow-md transition-all group cursor-pointer"
            >
              <div className="w-8 h-8 rounded-xl bg-purple-500 text-white flex items-center justify-center mb-2 shadow-xs group-hover:scale-105 transition-transform">
                <Target className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-slate-900">MCQ Generator</h3>
              <p className="text-[11px] text-slate-600 mt-0.5">
                Create multiple choice test questions with comprehensive answer keys.
              </p>
            </button>
          </div>
        </div>

        {/* Right Column: Daily Study Plan & Tasks */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-600" />
              <h2 className="font-display font-bold text-base text-slate-900">
                Daily Study Schedule
              </h2>
            </div>
            <button
              onClick={() => onNavigate("planner")}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
            >
              <span>Planner</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
            {activePlan ? (
              <>
                <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 truncate">{activePlan.examName}</h4>
                    <p className="text-[11px] text-slate-700">Target: {activePlan.targetHoursPerDay} hrs/day</p>
                  </div>
                  <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                    {activePlan.progressPercent}% Done
                  </span>
                </div>

                <div className="space-y-2 max-h-[360px] overflow-y-auto">
                  {pendingTasks.map((task) => (
                    <div
                      key={task.id}
                      onClick={() => handleToggleTask(task.id, task.isCompleted)}
                      className={`p-2.5 rounded-xl border transition-all flex items-start gap-2.5 cursor-pointer ${
                        task.isCompleted
                          ? "bg-slate-50/80 border-slate-200 text-slate-600"
                          : "bg-white hover:bg-slate-50 border-slate-200 text-slate-800 shadow-xs"
                      }`}
                    >
                      <button className="mt-0.5 text-indigo-600 shrink-0">
                        {task.isCompleted ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 fill-emerald-100" />
                        ) : (
                          <Circle className="w-4 h-4 text-slate-600" />
                        )}
                      </button>
                      <div className="min-w-0 flex-1">
                        <p
                          className={`text-xs font-semibold truncate ${
                            task.isCompleted ? "line-through text-slate-600" : "text-slate-900"
                          }`}
                        >
                          {task.topic}
                        </p>
                        <div className="flex items-center gap-2 text-[10px] text-slate-600 mt-0.5">
                          <span className="font-medium text-indigo-600">{task.subject}</span>
                          <span>•</span>
                          <span>
                            {task.startTime} - {task.endTime}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="py-6 text-center">
                <Calendar className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-800">No active study plan</p>
                <p className="text-[11px] text-slate-700 mt-1 mb-3">
                  Let AI generate a customized exam study schedule for your subjects.
                </p>
                <button
                  onClick={() => onNavigate("planner")}
                  className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition-colors cursor-pointer"
                >
                  Create Study Plan
                </button>
              </div>
            )}
          </div>

          {/* Active Recall Banner */}
          <div className="p-4 bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-2xl shadow-md">
            <div className="flex items-center gap-2 mb-1.5">
              <Zap className="w-4 h-4 text-yellow-400 fill-yellow-400" />
              <span className="text-xs font-bold">Spaced Repetition Drill</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed mb-3">
              Daily active recall strengthens synaptic pathways and doubles long-term retention.
            </p>
            <button
              onClick={() => onNavigate("flashcards")}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
            >
              Start 5-Minute Drill
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
