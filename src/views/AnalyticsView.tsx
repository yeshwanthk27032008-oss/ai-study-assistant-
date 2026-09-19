import React, { useState, useEffect } from "react";
import {
  BarChart3,
  Flame,
  Clock,
  Target,
  BookOpen,
  Award,
  Layers,
  HelpCircle,
  Plus,
  TrendingUp,
  Calendar,
} from "lucide-react";
import type { ProgressData } from "../types.js";
import { api } from "../api.js";

export function AnalyticsView() {
  const [data, setData] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);

  // Log session modal state
  const [showLogModal, setShowLogModal] = useState(false);
  const [logMins, setLogMins] = useState(30);
  const [logTopic, setLogTopic] = useState("");
  const [logType, setLogType] = useState("Self Study");
  const [logging, setLogging] = useState(false);

  useEffect(() => {
    loadProgress();
  }, []);

  const loadProgress = async () => {
    try {
      setLoading(true);
      const res = await api.progress.get();
      setData(res);
    } catch (err) {
      console.error("Load progress error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogSession = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLogging(true);
      await api.progress.logSession(Number(logMins) || 25, logTopic || undefined, logType);
      setShowLogModal(false);
      setLogTopic("");
      await loadProgress();
    } catch (err: any) {
      alert(err.message || "Failed to log session");
    } finally {
      setLogging(false);
    }
  };

  const streakDays = data?.progress?.streakDays || 1;
  const totalHours = data?.progress?.totalHoursStudied || 0;
  const quizAvg = data?.progress?.quizAverage || 85;
  const topicsDone = data?.progress?.topicsCompleted || 0;

  // Mock days of week bar data for active study visualization
  const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const weeklyHours = [1.5, 2.0, 0.75, 3.2, 2.5, 4.0, totalHours > 0 ? 1.8 : 0.5];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-600" />
            <h1 className="font-display text-xl sm:text-2xl font-black text-slate-900">
              Study Analytics & Mastery
            </h1>
          </div>
          <p className="text-xs text-slate-700 mt-0.5">
            Quantitative metrics on study consistency, spaced repetition recall, and exam readiness.
          </p>
        </div>

        <button
          onClick={() => setShowLogModal(true)}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Log Study Session</span>
        </button>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-700">Streak Record</span>
            <Flame className="w-5 h-5 text-amber-500 fill-amber-400" />
          </div>
          <p className="font-display font-black text-3xl text-slate-900">{streakDays} Days</p>
          <p className="text-[11px] text-amber-800 mt-1 font-medium">Daily consistency multiplier</p>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-700">Total Hours</span>
            <Clock className="w-5 h-5 text-sky-500" />
          </div>
          <p className="font-display font-black text-3xl text-slate-900">{totalHours} Hours</p>
          <p className="text-[11px] text-sky-800 mt-1 font-medium">Deep focus recorded</p>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-700">Quiz Accuracy</span>
            <Target className="w-5 h-5 text-indigo-500" />
          </div>
          <p className="font-display font-black text-3xl text-slate-900">{quizAvg}%</p>
          <p className="text-[11px] text-indigo-800 mt-1 font-medium">Active recall score</p>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-700">Mastered Items</span>
            <Award className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="font-display font-black text-3xl text-slate-900">{topicsDone}</p>
          <p className="text-[11px] text-emerald-800 mt-1 font-medium">Verified retention</p>
        </div>
      </div>

      {/* Main Charts & Activity Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly Hours Bar Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display font-bold text-sm text-slate-900">
                Weekly Study Time Distribution
              </h3>
              <p className="text-[11px] text-slate-700">Hours spent per day across focus blocks</p>
            </div>
            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">
              This Week
            </span>
          </div>

          <div className="h-48 flex items-end justify-between gap-3 pt-6 px-2 border-b border-slate-100">
            {daysOfWeek.map((day, i) => {
              const h = weeklyHours[i];
              const pct = Math.min(100, Math.round((h / 4) * 100));
              return (
                <div key={day} className="flex-1 flex flex-col items-center gap-2 group">
                  <span className="text-[10px] font-bold text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity">
                    {h}h
                  </span>
                  <div className="w-full max-w-[36px] bg-slate-100 rounded-t-lg h-32 flex items-end overflow-hidden">
                    <div
                      className="w-full bg-gradient-to-t from-indigo-600 to-sky-500 rounded-t-lg transition-all duration-500 group-hover:from-indigo-700 group-hover:to-sky-400"
                      style={{ height: `${pct}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-semibold text-slate-600">{day}</span>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between text-xs text-slate-700 pt-1">
            <span>Goal: 2.5 hrs/day</span>
            <span className="font-semibold text-emerald-600 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" /> +18% vs last week
            </span>
          </div>
        </div>

        {/* Repetition Retention Status */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
          <h3 className="font-display font-bold text-sm text-slate-900">
            Spaced Repetition Decay Curve
          </h3>
          <p className="text-[11px] text-slate-700 leading-relaxed">
            Ebbinghaus forgetting curve modeling predicts 85% of retained material stays in long-term memory when reviewed within 3 days.
          </p>

          <div className="space-y-3 pt-2">
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span>Immediate Recall</span>
                <span className="text-emerald-600">95%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div className="bg-emerald-500 h-2 rounded-full" style={{ width: "95%" }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span>3-Day Recall</span>
                <span className="text-indigo-600">82%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div className="bg-indigo-600 h-2 rounded-full" style={{ width: "82%" }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span>7-Day Mastery</span>
                <span className="text-amber-600">76%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div className="bg-amber-500 h-2 rounded-full" style={{ width: "76%" }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Study Sessions Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
        <h3 className="font-display font-bold text-sm text-slate-900">
          Recent Logged Study Sessions
        </h3>

        {data?.sessions && data.sessions.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {data.sessions.map((s) => (
              <div key={s.id} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <p className="font-bold text-slate-900">{s.topic}</p>
                  <p className="text-[11px] text-slate-600">Type: {s.sessionType}</p>
                </div>
                <div className="text-right">
                  <span className="font-bold text-indigo-600">{s.durationMinutes} mins</span>
                  <p className="text-[10px] text-slate-600">
                    {new Date(s.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-700 py-4 text-center">
            No study sessions logged yet. Use the Pomodoro focus timer or click "Log Study Session" above!
          </p>
        )}
      </div>

      {/* Log Session Modal */}
      {showLogModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-sm text-slate-900">Log Study Session</h3>
              <button
                onClick={() => setShowLogModal(false)}
                className="text-slate-600 hover:text-slate-800"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleLogSession} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Topic / Subject Studied
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Graph BFS & Dijkstra Shortest Path"
                  value={logTopic}
                  onChange={(e) => setLogTopic(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Duration (Minutes)
                </label>
                <input
                  type="number"
                  min="5"
                  max="360"
                  value={logMins}
                  onChange={(e) => setLogMins(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Study Method</label>
                <select
                  value={logType}
                  onChange={(e) => setLogType(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                >
                  <option value="Self Study">Self Study / Textbook Reading</option>
                  <option value="Pomodoro">Pomodoro Focus Timer</option>
                  <option value="Flashcards">Flashcard Spaced Repetition</option>
                  <option value="Quiz Practice">Quiz Practice</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={logging}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
              >
                {logging ? "Recording..." : "Save Session"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
