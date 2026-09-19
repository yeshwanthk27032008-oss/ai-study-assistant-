import React, { useState } from "react";
import {
  Settings as SettingsIcon,
  User as UserIcon,
  Sparkles,
  Shield,
  Save,
  CheckCircle,
  Database,
  Cpu,
  Brain,
} from "lucide-react";
import type { User } from "../types.js";
import { api } from "../api.js";

interface SettingsViewProps {
  user: User | null;
  onUpdateUser: (updated: User) => void;
  onLoadDemo: () => void;
}

export function SettingsView({ user, onUpdateUser, onLoadDemo }: SettingsViewProps) {
  const [name, setName] = useState(user?.name || "");
  const [level, setLevel] = useState(user?.preferredExplanationLevel || "Normal");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await api.progress.updateSettings({
        name: name.trim() || undefined,
        preferredExplanationLevel: level,
      });
      onUpdateUser(res.user);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      alert(err.message || "Failed to update settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <div className="flex items-center gap-2">
          <SettingsIcon className="w-5 h-5 text-indigo-600" />
          <h1 className="font-display text-xl sm:text-2xl font-black text-slate-900">
            Account & Preferences
          </h1>
        </div>
        <p className="text-xs text-slate-700 mt-0.5">
          Configure AI explanation depth, user profile, and verify study infrastructure.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Profile Card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
          <h3 className="font-display font-bold text-sm text-slate-900 flex items-center gap-2">
            <UserIcon className="w-4 h-4 text-indigo-600" />
            <span>Student Profile</span>
          </h3>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
              <input
                type="email"
                disabled
                value={user?.email || "student@studymate.ai"}
                className="w-full px-3 py-2 text-xs bg-slate-100 border border-slate-200 rounded-xl text-slate-600 cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        {/* AI Explanation Depth Preference */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
          <h3 className="font-display font-bold text-sm text-slate-900 flex items-center gap-2">
            <Brain className="w-4 h-4 text-amber-500" />
            <span>Default AI Explanation Depth</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              {
                id: "Simple",
                label: "Simple (ELI5)",
                desc: "Everyday analogies, zero jargon, perfect for first-time intuition.",
              },
              {
                id: "Normal",
                label: "College / Standard",
                desc: "Balanced academic rigor, standard terminology, step-by-step logic.",
              },
              {
                id: "Detailed",
                label: "Technical Deep Dive",
                desc: "Full mathematical formulas, edge cases, algorithmic complexity.",
              },
            ].map((item) => (
              <div
                key={item.id}
                onClick={() => setLevel(item.id as "Detailed" | "Normal" | "Simple")}
                className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                  level === item.id
                    ? "bg-indigo-50 border-indigo-500 shadow-xs"
                    : "bg-white hover:bg-slate-50 border-slate-200"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`text-xs font-bold ${
                      level === item.id ? "text-indigo-700" : "text-slate-900"
                    }`}
                  >
                    {item.label}
                  </span>
                  {level === item.id && (
                    <CheckCircle className="w-4 h-4 text-indigo-600 fill-indigo-100" />
                  )}
                </div>
                <p className="text-[11px] text-slate-600 leading-snug">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? "Saving Changes..." : "Save Preferences"}</span>
          </button>

          {saved && (
            <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
              <CheckCircle className="w-4 h-4" /> Preferences saved!
            </span>
          )}
        </div>
      </form>

      {/* AI System Status & Architecture */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 space-y-4 shadow-xl">
        <h3 className="font-display font-bold text-sm text-slate-100 flex items-center gap-2">
          <Cpu className="w-4 h-4 text-sky-400" />
          <span>Production AI Architecture & Models</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 bg-white/5 rounded-xl border border-white/10">
            <p className="font-bold text-sky-300">LLM Reasoning</p>
            <p className="text-slate-300 text-[11px] mt-0.5">gemini-3.8-flash</p>
            <p className="text-[10px] text-slate-400 mt-1">Grounded RAG synthesis</p>
          </div>

          <div className="p-3 bg-white/5 rounded-xl border border-white/10">
            <p className="font-bold text-emerald-300">Semantic Vectors</p>
            <p className="text-slate-300 text-[11px] mt-0.5">gemini-embedding-2-preview</p>
            <p className="text-[10px] text-slate-400 mt-1">Cosine similarity index</p>
          </div>

          <div className="p-3 bg-white/5 rounded-xl border border-white/10">
            <p className="font-bold text-purple-300">Spaced Repetition</p>
            <p className="text-slate-300 text-[11px] mt-0.5">SM-2 Algorithm</p>
            <p className="text-[10px] text-slate-400 mt-1">Dynamic review intervals</p>
          </div>
        </div>

        <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
          <span>Database: SQLite via Prisma ORM</span>
          <button
            onClick={onLoadDemo}
            className="text-amber-400 hover:text-amber-300 font-bold transition-colors cursor-pointer"
          >
            Reload Sample DSA Data
          </button>
        </div>
      </div>
    </div>
  );
}
