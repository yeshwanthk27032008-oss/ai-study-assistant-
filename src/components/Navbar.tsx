import React, { useState, useEffect } from "react";
import {
  Search,
  Sparkles,
  Flame,
  Clock,
  Play,
  Pause,
  RotateCcw,
  User as UserIcon,
  LogOut,
  CheckCircle,
  Brain,
  FileText,
} from "lucide-react";
import type { User } from "../types.js";
import { api } from "../api.js";

interface NavbarProps {
  user: User | null;
  streakDays: number;
  onOpenSearch: () => void;
  onOpenAuth: () => void;
  onLogout: () => void;
  onDemoLoaded?: () => void;
  onNavigate: (view: string) => void;
}

export function Navbar({
  user,
  streakDays,
  onOpenSearch,
  onOpenAuth,
  onLogout,
  onDemoLoaded,
  onNavigate,
}: NavbarProps) {
  // Pomodoro timer state
  const [timerSeconds, setTimerSeconds] = useState(25 * 60);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerOpen, setTimerOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [loadingDemo, setLoadingDemo] = useState(false);
  const [demoNotice, setDemoNotice] = useState<string | null>(null);

  useEffect(() => {
    let interval: any = null;
    if (timerRunning && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev - 1);
      }, 1000);
    } else if (timerSeconds === 0 && timerRunning) {
      setTimerRunning(false);
      // Auto-log 25 min study session
      api.progress.logSession(25, "Pomodoro Focus Study", "Pomodoro").catch(console.error);
      alert("🎉 Focus session completed! Great job! 25 minutes added to your study progress.");
      setTimerSeconds(25 * 60);
    }
    return () => clearInterval(interval);
  }, [timerRunning, timerSeconds]);

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handleLoadDemo = async () => {
    try {
      setLoadingDemo(true);
      await api.documents.loadDemo();
      setDemoNotice("Sample DSA study material loaded!");
      setTimeout(() => setDemoNotice(null), 4000);
      if (onDemoLoaded) onDemoLoaded();
      onNavigate("documents");
    } catch (err: any) {
      alert(err.message || "Failed to load demo document");
    } finally {
      setLoadingDemo(false);
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200 px-4 lg:px-8 py-2.5 flex items-center justify-between">
      {/* Brand & Tagline */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => onNavigate("dashboard")}
          className="flex items-center gap-2.5 group text-left cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-blue-600 to-sky-500 flex items-center justify-center text-white shadow-md shadow-indigo-200 group-hover:scale-105 transition-transform">
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-display font-bold text-lg tracking-tight text-slate-900">
                StudyMate<span className="text-indigo-600"> AI</span>
              </span>
              <span className="text-[10px] uppercase font-semibold tracking-wider px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                Companion
              </span>
            </div>
            <p className="text-[11px] text-slate-700 hidden sm:block">
              Your Personal AI-Powered Study Companion
            </p>
          </div>
        </button>
      </div>

      {/* Center: Search & Demo Badge */}
      <div className="flex items-center gap-2 sm:gap-4 flex-1 max-w-md mx-3 lg:mx-8">
        <button
          onClick={onOpenSearch}
          className="w-full flex items-center gap-2.5 px-3 py-1.5 text-xs text-slate-700 bg-slate-50 hover:bg-slate-100 hover:text-slate-900 border border-slate-200 rounded-lg transition-colors cursor-pointer"
        >
          <Search className="w-3.5 h-3.5 text-slate-600" />
          <span className="flex-1 text-left truncate">Search materials, notes, flashcards...</span>
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-white border border-slate-200 rounded text-slate-700">
            ⌘K
          </kbd>
        </button>

        {/* 1-Click Hackathon Sample Data Button */}
        <button
          onClick={handleLoadDemo}
          disabled={loadingDemo}
          title="Instantly load sample Data Structures & Algorithms document with pre-indexed pages and quiz for testing"
          className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg whitespace-nowrap transition-colors cursor-pointer shadow-xs disabled:opacity-50"
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-600 fill-indigo-200 animate-pulse" />
          <span>{loadingDemo ? "Loading..." : "Load Demo DSA Material"}</span>
        </button>
      </div>

      {/* Right: Study Tools & Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Streak Counter */}
        <div
          title={`${streakDays} Day Study Streak! Keep going!`}
          className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-900 border border-amber-200/80 rounded-full text-xs font-semibold"
        >
          <Flame className="w-4 h-4 text-amber-500 fill-amber-500 animate-bounce" />
          <span>{streakDays}d Streak</span>
        </div>

        {/* Pomodoro Focus Timer Dropdown */}
        <div className="relative">
          <button
            onClick={() => setTimerOpen(!timerOpen)}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
              timerRunning
                ? "bg-emerald-50 text-emerald-700 border-emerald-300 animate-pulse"
                : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span className="font-mono font-semibold">{formatTime(timerSeconds)}</span>
          </button>

          {timerOpen && (
            <div className="absolute right-0 mt-2 w-64 p-3.5 bg-white rounded-xl shadow-xl border border-slate-200 z-50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-800">Focus Timer (Pomodoro)</span>
                <span className="text-[10px] text-slate-600">25m Block</span>
              </div>
              <div className="text-center my-3">
                <span className="font-mono text-3xl font-extrabold text-slate-900 tracking-wider">
                  {formatTime(timerSeconds)}
                </span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => setTimerRunning(!timerRunning)}
                  className="flex-1 py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                >
                  {timerRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  {timerRunning ? "Pause" : "Start"}
                </button>
                <button
                  onClick={() => {
                    setTimerRunning(false);
                    setTimerSeconds(25 * 60);
                  }}
                  className="p-1.5 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
                  title="Reset to 25 mins"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Profile / Auth Button */}
        {user ? (
          <div className="relative">
            <button
              onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              className="flex items-center gap-2 p-1 pl-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-full text-xs font-medium text-slate-800 transition-colors cursor-pointer"
            >
              <span className="hidden sm:inline font-semibold">{user.name.split(" ")[0]}</span>
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-500 to-sky-500 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                {user.name.charAt(0).toUpperCase()}
              </div>
            </button>

            {userDropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 p-2 bg-white rounded-xl shadow-xl border border-slate-200 z-50">
                <div className="px-3 py-2 border-b border-slate-100">
                  <p className="text-xs font-bold text-slate-900 truncate">{user.name}</p>
                  <p className="text-[11px] text-slate-600 truncate">{user.email}</p>
                  <span className="inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100 font-medium">
                    Level: {user.preferredExplanationLevel || "Normal"}
                  </span>
                </div>
                <div className="py-1">
                  <button
                    onClick={() => {
                      setUserDropdownOpen(false);
                      onNavigate("settings");
                    }}
                    className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 rounded-md transition-colors"
                  >
                    Account & Preferences
                  </button>
                  <button
                    onClick={() => {
                      setUserDropdownOpen(false);
                      onNavigate("analytics");
                    }}
                    className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 rounded-md transition-colors"
                  >
                    Study Analytics
                  </button>
                  <button
                    onClick={() => {
                      setUserDropdownOpen(false);
                      onLogout();
                    }}
                    className="w-full text-left px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-md transition-colors flex items-center gap-1.5 font-medium"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={onOpenAuth}
            className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            Sign In
          </button>
        )}
      </div>

      {/* Floating Demo Notice */}
      {demoNotice && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 text-xs animate-bounce border border-slate-700">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>{demoNotice}</span>
        </div>
      )}
    </header>
  );
}
