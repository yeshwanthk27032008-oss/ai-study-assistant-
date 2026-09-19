import React, { useState, useEffect } from "react";
import { Navbar } from "./components/Navbar.js";
import { Sidebar } from "./components/Sidebar.js";
import { AuthModal } from "./components/AuthModal.js";
import { GlobalSearchModal } from "./components/GlobalSearchModal.js";

import { DashboardView } from "./views/DashboardView.js";
import { DocumentsView } from "./views/DocumentsView.js";
import { ChatView } from "./views/ChatView.js";
import { NotesView } from "./views/NotesView.js";
import { FlashcardsView } from "./views/FlashcardsView.js";
import { QuizView } from "./views/QuizView.js";
import { ExplainerView } from "./views/ExplainerView.js";
import { StudyPlanView } from "./views/StudyPlanView.js";
import { AnalyticsView } from "./views/AnalyticsView.js";
import { SettingsView } from "./views/SettingsView.js";

import { api, setStoredToken, getStoredToken } from "./api.js";
import type { User } from "./types.js";
import { Menu, Sparkles } from "lucide-react";

export function App() {
  const [user, setUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState("dashboard");
  const [targetId, setTargetId] = useState<string | undefined>(undefined);

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // App metrics for sidebar badges
  const [counts, setCounts] = useState<{
    documents?: number;
    notes?: number;
    flashcards?: number;
    quizzes?: number;
  }>({});
  const [streakDays, setStreakDays] = useState(1);
  const [hoursStudied, setHoursStudied] = useState(0);

  useEffect(() => {
    initAuth();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchModalOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const initAuth = async () => {
    try {
      const token = getStoredToken();
      if (token) {
        try {
          const res = await api.auth.me();
          setUser(res.user);
        } catch (tokenErr) {
          console.warn("Stored token invalid or expired, falling back to demo login:", tokenErr);
          const demoRes = await api.auth.demoLogin();
          setStoredToken(demoRes.token);
          setUser(demoRes.user);
        }
      } else {
        // Automatically perform demo-login so the applet is immediately interactive out of the box!
        const demoRes = await api.auth.demoLogin();
        setStoredToken(demoRes.token);
        setUser(demoRes.user);
      }
      refreshStats();
    } catch (err) {
      console.error("Init auth error:", err);
    }
  };

  const refreshStats = async () => {
    try {
      const [docsRes, notesRes, fcRes, qRes, progRes] = await Promise.all([
        api.documents.list().catch(() => ({ documents: [] })),
        api.notes.list().catch(() => ({ notes: [] })),
        api.flashcards.list().catch(() => ({ flashcards: [], decks: [] })),
        api.quizzes.list().catch(() => ({ quizzes: [] })),
        api.progress.get().catch(() => null),
      ]);

      setCounts({
        documents: docsRes.documents?.length || 0,
        notes: notesRes.notes?.length || 0,
        flashcards: fcRes.flashcards?.length || 0,
        quizzes: qRes.quizzes?.length || 0,
      });

      if (progRes) {
        setStreakDays(progRes.progress?.streakDays || 1);
        setHoursStudied(progRes.progress?.totalHoursStudied || 0);
      }
    } catch (err) {
      console.error("Refresh stats error:", err);
    }
  };

  const handleNavigate = (view: string, id?: string) => {
    setCurrentView(view);
    setTargetId(id);
    window.scrollTo({ top: 0, behavior: "smooth" });
    refreshStats();
  };

  const handleLogout = async () => {
    await api.auth.logout().catch(() => {});
    setStoredToken(null);
    setUser(null);
    initAuth();
  };

  const handleLoadDemo = async () => {
    try {
      await api.documents.loadDemo();
      await refreshStats();
      setCurrentView("documents");
    } catch (err: any) {
      alert(err.message || "Failed to load demo");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col selection:bg-indigo-500 selection:text-white font-sans antialiased">
      {/* Top Navigation */}
      <Navbar
        user={user}
        streakDays={streakDays}
        onOpenSearch={() => setSearchModalOpen(true)}
        onOpenAuth={() => setAuthModalOpen(true)}
        onLogout={handleLogout}
        onDemoLoaded={refreshStats}
        onNavigate={handleNavigate}
      />

      {/* Mobile Top Navigation Sub-bar */}
      <div className="lg:hidden bg-white border-b border-slate-200 px-4 py-2 flex items-center justify-between">
        <button
          onClick={() => setMobileSidebarOpen(true)}
          className="flex items-center gap-2 p-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-lg"
        >
          <Menu className="w-4 h-4 text-indigo-600" />
          <span>Menu</span>
        </button>

        <span className="text-xs font-bold text-indigo-600 capitalize">
          {currentView === "documents"
            ? "Study Materials"
            : currentView === "chat"
            ? "AI Study Chat"
            : currentView === "notes"
            ? "Smart Notes"
            : currentView === "flashcards"
            ? "Flashcards"
            : currentView === "quiz"
            ? "Quizzes & MCQs"
            : currentView === "explainer"
            ? "Topic Explainer"
            : currentView === "planner"
            ? "Study Planner"
            : currentView === "analytics"
            ? "Progress & Analytics"
            : currentView === "settings"
            ? "Settings"
            : "Dashboard"}
        </span>
      </div>

      <div className="flex-1 flex">
        {/* Left Sidebar */}
        <Sidebar
          currentView={currentView}
          onNavigate={handleNavigate}
          counts={counts}
          streakDays={streakDays}
          hoursStudied={hoursStudied}
          isMobileOpen={mobileSidebarOpen}
          onCloseMobile={() => setMobileSidebarOpen(false)}
        />

        {/* Main Content Area */}
        <main className="flex-1 lg:pl-64 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {currentView === "dashboard" && (
            <DashboardView
              user={user}
              onNavigate={handleNavigate}
              onLoadDemo={handleLoadDemo}
            />
          )}

          {currentView === "documents" && (
            <DocumentsView
              initialDocumentId={targetId}
              onNavigate={handleNavigate}
              onLoadDemo={handleLoadDemo}
            />
          )}

          {currentView === "chat" && (
            <ChatView
              initialDocumentId={targetId}
              onNavigate={handleNavigate}
            />
          )}

          {currentView === "notes" && (
            <NotesView
              initialNoteId={targetId}
              onNavigate={handleNavigate}
            />
          )}

          {currentView === "flashcards" && (
            <FlashcardsView onNavigate={handleNavigate} />
          )}

          {currentView === "quiz" && (
            <QuizView
              initialQuizId={targetId}
              onNavigate={handleNavigate}
            />
          )}

          {currentView === "explainer" && (
            <ExplainerView onNavigate={handleNavigate} />
          )}

          {currentView === "planner" && (
            <StudyPlanView onNavigate={handleNavigate} />
          )}

          {currentView === "analytics" && <AnalyticsView />}

          {currentView === "settings" && (
            <SettingsView
              user={user}
              onUpdateUser={setUser}
              onLoadDemo={handleLoadDemo}
            />
          )}
        </main>
      </div>

      {/* Global Modals */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={(u) => {
          setUser(u);
          refreshStats();
        }}
      />

      <GlobalSearchModal
        isOpen={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
        onNavigate={handleNavigate}
      />
    </div>
  );
}

export default App;
