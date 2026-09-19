import React from "react";
import {
  LayoutDashboard,
  FolderOpen,
  MessageSquare,
  FileEdit,
  Layers,
  HelpCircle,
  Lightbulb,
  Calendar,
  BarChart3,
  Settings,
  Flame,
  Clock,
  Sparkles,
  ChevronRight,
} from "lucide-react";

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  counts?: {
    documents?: number;
    notes?: number;
    flashcards?: number;
    quizzes?: number;
  };
  streakDays?: number;
  hoursStudied?: number;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export function Sidebar({
  currentView,
  onNavigate,
  counts,
  streakDays = 1,
  hoursStudied = 0,
  isMobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const navItems = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: "documents",
      label: "Study Materials",
      icon: FolderOpen,
      badge: counts?.documents,
    },
    {
      id: "chat",
      label: "AI Study Chat",
      icon: MessageSquare,
      badge: "RAG",
      badgeColor: "bg-indigo-100 text-indigo-700",
    },
    {
      id: "notes",
      label: "Smart Notes",
      icon: FileEdit,
      badge: counts?.notes,
    },
    {
      id: "flashcards",
      label: "Flashcards",
      icon: Layers,
      badge: counts?.flashcards,
    },
    {
      id: "quiz",
      label: "Quizzes & MCQs",
      icon: HelpCircle,
      badge: counts?.quizzes,
    },
    {
      id: "explainer",
      label: "Topic Explainer",
      icon: Lightbulb,
      badge: "AI",
      badgeColor: "bg-amber-100 text-amber-700",
    },
    {
      id: "planner",
      label: "Study Planner",
      icon: Calendar,
      badge: null,
    },
    {
      id: "analytics",
      label: "Progress & Stats",
      icon: BarChart3,
      badge: null,
    },
    {
      id: "settings",
      label: "Settings",
      icon: Settings,
      badge: null,
    },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 lg:hidden"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed top-14 bottom-0 left-0 z-40 w-64 bg-white border-r border-slate-200 transition-transform duration-200 ease-in-out lg:translate-x-0 flex flex-col justify-between ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Navigation list */}
        <div className="p-3.5 space-y-1 overflow-y-auto">
          <div className="px-3 py-1 text-[11px] font-bold tracking-wider uppercase text-slate-600">
            Study Workspace
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id);
                  onCloseMobile();
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all group cursor-pointer ${
                  isActive
                    ? "bg-indigo-50 text-indigo-700 font-semibold shadow-xs"
                    : "text-slate-700 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isActive ? "text-indigo-600" : "text-slate-600 group-hover:text-slate-700"
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </div>

                {item.badge !== null && item.badge !== undefined && (
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      item.badgeColor || (isActive ? "bg-indigo-200/70 text-indigo-800" : "bg-slate-100 text-slate-700")
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Bottom Study Habit Summary Card */}
        <div className="p-3.5 border-t border-slate-100">
          <div className="p-3 bg-gradient-to-br from-indigo-50 via-sky-50 to-blue-50/50 rounded-2xl border border-indigo-100/80">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>Daily Motivation</span>
              </div>
              <span className="text-[10px] font-semibold px-1.5 py-0.2 bg-white text-indigo-700 rounded-md border border-indigo-100">
                {streakDays}d Streak
              </span>
            </div>

            <p className="text-[11px] text-slate-600 leading-relaxed mb-2.5">
              "Consistency beats intensity. Small daily study sessions compound over time."
            </p>

            <div className="flex items-center justify-between text-[11px] text-slate-700 pt-2 border-t border-indigo-100/60 font-medium">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-sky-600" /> {hoursStudied}h Studied
              </span>
              <span className="flex items-center gap-1 text-amber-600">
                <Flame className="w-3 h-3" /> Active
              </span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
