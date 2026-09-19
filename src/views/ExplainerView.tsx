import React, { useState } from "react";
import {
  Lightbulb,
  Sparkles,
  ArrowRight,
  BookOpen,
  AlertTriangle,
  Zap,
  Layers,
  HelpCircle,
  FileText,
  Copy,
  Check,
} from "lucide-react";
import type { TopicExplanation } from "../types.js";
import { api } from "../api.js";

interface ExplainerViewProps {
  onNavigate: (view: string, targetId?: string) => void;
}

export function ExplainerView({ onNavigate }: ExplainerViewProps) {
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState<"Simple" | "Normal" | "Detailed">("Normal");
  const [loading, setLoading] = useState(false);
  const [explanation, setExplanation] = useState<TopicExplanation | null>(null);
  const [copied, setCopied] = useState(false);

  const sampleTopics = [
    "Recursion and Call Stack",
    "Binary Search Tree Invariants",
    "Dijkstra's Algorithm vs Bellman-Ford",
    "Database Normalization (1NF to BCNF)",
    "Virtual Memory & Paging",
  ];

  const handleExplain = async (targetTopic?: string) => {
    const q = (targetTopic || topic).trim();
    if (!q || loading) return;

    if (targetTopic) setTopic(targetTopic);
    setLoading(true);

    try {
      const res = await api.explainer.explain(q, difficulty);
      setExplanation(res.explanation);
    } catch (err: any) {
      alert(err.message || "Failed to generate explanation");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!explanation) return;
    const steps = explanation.stepByStep || explanation.stepByStepExplanation || [];
    const text = `${explanation.topic}\n\n${explanation.simpleExplanation}\n\nAnalogy:\n${explanation.analogy || explanation.realWorldAnalogy || ""}\n\nSteps:\n${steps.join("\n")}\n\nQuick Revision:\n${(explanation.quickRevision || []).join("\n")}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Header */}
      <div>
        <div className="flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-amber-500" />
          <h1 className="font-display text-xl sm:text-2xl font-black text-slate-900">
            Topic Explainer
          </h1>
        </div>
        <p className="text-xs text-slate-700 mt-0.5">
          Break down any complex technical concept with vivid analogies, step-by-step logic, and exam pitfalls.
        </p>
      </div>

      {/* Input Stage */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-5 sm:p-6 space-y-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleExplain();
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              What topic or concept is confusing you?
            </label>
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl p-1.5 pl-3 focus-within:ring-2 focus-within:ring-amber-500/20 focus-within:border-amber-500">
              <input
                type="text"
                placeholder="e.g. How does Quicksort partitioning actually work?"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="flex-1 text-xs bg-transparent text-slate-800 placeholder-slate-600 focus:outline-none"
              />
              <button
                type="submit"
                disabled={!topic.trim() || loading}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{loading ? "Explaining..." : "Explain"}</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-600 uppercase mr-1">Depth:</span>
              {(["Simple", "Normal", "Detailed"] as const).map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setDifficulty(lvl)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    difficulty === lvl
                      ? "bg-amber-100 text-amber-900 border border-amber-300 font-bold"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {lvl === "Simple" ? "ELI5 (Simple)" : lvl === "Normal" ? "College Level" : "Technical Deep Dive"}
                </button>
              ))}
            </div>

            {/* Quick chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
              {sampleTopics.slice(0, 3).map((st, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleExplain(st)}
                  className="px-2 py-0.5 bg-slate-50 hover:bg-amber-50 border border-slate-200 rounded-md text-[10px] text-slate-700 hover:text-amber-800 transition-colors whitespace-nowrap cursor-pointer"
                >
                  {st}
                </button>
              ))}
            </div>
          </div>
        </form>
      </div>

      {/* Explanation Results Canvas */}
      {loading ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center animate-spin">
            <Sparkles className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-sm text-slate-900">Synthesizing intuitive breakdown...</h3>
          <p className="text-xs text-slate-700 max-w-sm mx-auto">
            Generating plain-English explanations, real-world analogies, step-by-step logic, and high-yield exam takeaways.
          </p>
        </div>
      ) : explanation ? (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Header Card */}
          <div className="p-6 bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 rounded-3xl text-white shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-[10px] font-bold uppercase tracking-wider">
                {explanation.difficulty} Explanation
              </span>
              <h2 className="font-display font-black text-xl sm:text-2xl mt-1.5">
                {explanation.topic}
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="px-3 py-1.5 bg-white/15 hover:bg-white/25 rounded-xl text-xs font-semibold backdrop-blur transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "Copied" : "Copy"}</span>
              </button>
            </div>
          </div>

          {/* 1. Simple Plain-English Explanation */}
          <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-indigo-600" />
              Plain-English Essence
            </h3>
            <p className="text-xs text-slate-800 leading-relaxed sm:text-sm">
              {explanation.simpleExplanation}
            </p>
          </div>

          {/* 2. Real-World Analogy */}
          <div className="p-5 bg-gradient-to-br from-amber-50 to-orange-50/50 rounded-2xl border border-amber-200/70 shadow-xs space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
              <Lightbulb className="w-4 h-4 text-amber-600 fill-amber-300" />
              The Mental Analogy
            </h3>
            <p className="text-xs text-amber-950 leading-relaxed font-medium">
              {explanation.analogy}
            </p>
          </div>

          {/* 3. Step-by-Step Breakdown */}
          <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-sky-600" />
              Step-by-Step Mechanism
            </h3>
            <div className="space-y-2">
              {(explanation.stepByStep || explanation.stepByStepExplanation || []).map((step, i) => (
                <div key={i} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <span className="leading-relaxed">{step}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 4. Practical Real-World Example */}
          <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Concrete Example & Walkthrough
            </h3>
            <div className="p-3.5 bg-slate-900 text-emerald-300 font-mono text-xs rounded-xl overflow-x-auto leading-relaxed whitespace-pre-wrap">
              {explanation.realWorldExample}
            </div>
          </div>

          {/* 5. Common Mistakes to Avoid */}
          {explanation.commonMistakes && explanation.commonMistakes.length > 0 && (
            <div className="p-5 bg-rose-50/50 rounded-2xl border border-rose-200/70 shadow-xs space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-rose-900 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                Exam Pitfalls & Common Misconceptions
              </h3>
              <ul className="space-y-1.5 text-xs text-rose-950">
                {explanation.commonMistakes.map((m, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-rose-600 font-bold">•</span>
                    <span>{m}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 6. Quick Revision Summary */}
          {explanation.quickRevision && explanation.quickRevision.length > 0 && (
            <div className="p-5 bg-indigo-50/50 rounded-2xl border border-indigo-100 shadow-xs space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-900 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                30-Second Quick Revision Recap
              </h3>
              <ul className="space-y-1.5 text-xs text-indigo-950">
                {explanation.quickRevision.map((qr, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-indigo-600 font-bold">✓</span>
                    <span className="font-medium">{qr}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Bottom Next Step Actions */}
          <div className="p-4 bg-white rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-bold text-slate-800">
              Turn this concept into active study materials:
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onNavigate("flashcards")}
                className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Create Flashcards</span>
              </button>
              <button
                onClick={() => onNavigate("quiz")}
                className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Quiz Me on This</span>
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
