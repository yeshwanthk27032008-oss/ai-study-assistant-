import React, { useState, useEffect } from "react";
import {
  FileText,
  Plus,
  Sparkles,
  Search,
  Star,
  Trash2,
  Copy,
  Check,
  BookOpen,
  Zap,
  Lightbulb,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import Markdown from "react-markdown";
import type { NoteItem, DocumentItem } from "../types.js";
import { api } from "../api.js";

interface NotesViewProps {
  initialNoteId?: string;
  onNavigate: (view: string, targetId?: string) => void;
}

export function NotesView({ initialNoteId, onNavigate }: NotesViewProps) {
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [selectedNote, setSelectedNote] = useState<NoteItem | null>(null);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // Generate modal state
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genDocId, setGenDocId] = useState<string>("");
  const [genTopic, setGenTopic] = useState("");
  const [genLevel, setGenLevel] = useState("Normal");

  useEffect(() => {
    loadNotes();
  }, [search]);

  const loadNotes = async () => {
    try {
      setLoading(true);
      const [notesRes, docsRes] = await Promise.all([
        api.notes.list({ search: search || undefined }),
        api.documents.list(),
      ]);
      setNotes(notesRes.notes || []);
      setDocuments(docsRes.documents || []);

      if (notesRes.notes && notesRes.notes.length > 0) {
        if (initialNoteId) {
          const match = notesRes.notes.find((n) => n.id === initialNoteId);
          setSelectedNote(match || notesRes.notes[0]);
        } else if (!selectedNote) {
          setSelectedNote(notesRes.notes[0]);
        }
      }
    } catch (err) {
      console.error("Load notes error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateNotes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!genDocId && !genTopic.trim()) {
      alert("Please select a document or enter a study topic");
      return;
    }

    try {
      setGenerating(true);
      const res = await api.notes.generate({
        documentId: genDocId || undefined,
        topic: genTopic.trim() || undefined,
        level: genLevel,
      });

      setShowGenerateModal(false);
      setGenTopic("");
      setGenDocId("");
      await loadNotes();
      setSelectedNote(res.note);
    } catch (err: any) {
      alert(err.message || "Failed to generate notes");
    } finally {
      setGenerating(false);
    }
  };

  const handleToggleFavorite = async (note: NoteItem) => {
    try {
      const res = await api.notes.update(note.id, { isFavorite: !note.isFavorite });
      setNotes((prev) => prev.map((n) => (n.id === note.id ? { ...n, isFavorite: res.note.isFavorite } : n)));
      if (selectedNote?.id === note.id) {
        setSelectedNote((prev) => (prev ? { ...prev, isFavorite: res.note.isFavorite } : null));
      }
    } catch (err) {
      console.error("Toggle favorite error:", err);
    }
  };

  const handleDeleteNote = async (id: string) => {
    if (!confirm("Delete this study note?")) return;
    try {
      await api.notes.delete(id);
      const updated = notes.filter((n) => n.id !== id);
      setNotes(updated);
      if (selectedNote?.id === id) {
        setSelectedNote(updated.length > 0 ? updated[0] : null);
      }
    } catch (err) {
      console.error("Delete note error:", err);
    }
  };

  const handleCopyContent = () => {
    if (!selectedNote) return;
    navigator.clipboard.writeText(selectedNote.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="h-[calc(100vh-5.5rem)] flex flex-col lg:flex-row gap-4 max-w-7xl mx-auto">
      {/* Left Column: Notes List & Controls */}
      <div className="w-full lg:w-80 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col overflow-hidden shrink-0">
        <div className="p-3.5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-bold text-slate-800">Study Notes</span>
          </div>
          <button
            onClick={() => setShowGenerateModal(true)}
            className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Generate</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-2.5 border-b border-slate-100">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-600 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
        </div>

        {/* Notes List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
          {notes.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-700">
              No notes yet. Click <strong>AI Generate</strong> to create structured notes from your materials.
            </div>
          ) : (
            notes.map((note) => {
              const isCurrent = selectedNote?.id === note.id;
              return (
                <div
                  key={note.id}
                  onClick={() => setSelectedNote(note)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    isCurrent
                      ? "bg-emerald-50/70 border-emerald-300 text-emerald-950 shadow-xs"
                      : "bg-white hover:bg-slate-50 border-slate-200 text-slate-800"
                  }`}
                >
                  <div className="flex items-start justify-between gap-1.5">
                    <h4 className="text-xs font-bold truncate flex-1">{note.title}</h4>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleFavorite(note);
                      }}
                      className={`p-0.5 ${note.isFavorite ? "text-amber-500 fill-amber-500" : "text-slate-600 hover:text-amber-500"}`}
                    >
                      <Star className={`w-3.5 h-3.5 ${note.isFavorite ? "fill-amber-400 text-amber-500" : ""}`} />
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-700 mt-1 line-clamp-2 leading-relaxed">
                    {note.overview || note.content}
                  </p>
                  <div className="flex items-center justify-between text-[10px] text-slate-600 mt-2 pt-1.5 border-t border-slate-100">
                    <span>{new Date(note.updatedAt).toLocaleDateString()}</span>
                    {note.document && (
                      <span className="truncate max-w-[120px] text-indigo-600 font-medium">
                        📄 {note.document.title}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Column: Note Reader & Breakdown Canvas */}
      <div className="flex-1 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col overflow-hidden">
        {selectedNote ? (
          <>
            {/* Note Canvas Header */}
            <div className="p-4 px-6 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                    Structured Study Notes
                  </span>
                  {selectedNote.document && (
                    <span className="text-[10px] text-indigo-700 font-medium">
                      Source: {selectedNote.document.title}
                    </span>
                  )}
                </div>
                <h2 className="font-display font-bold text-base text-slate-900 truncate mt-1">
                  {selectedNote.title}
                </h2>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyContent}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-600" />
                      <span>Copy Notes</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => handleDeleteNote(selectedNote.id)}
                  title="Delete Note"
                  className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Note Structured Sections */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* 1. Overview */}
              {selectedNote.overview && (
                <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-900 mb-1 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    Overview & Synthesis
                  </h3>
                  <p className="text-xs text-slate-700 leading-relaxed">{selectedNote.overview}</p>
                </div>
              )}

              {/* 2. Key Concepts */}
              {selectedNote.keyConcepts && selectedNote.keyConcepts.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-indigo-600" />
                    Key Concepts
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {selectedNote.keyConcepts.map((c, i) => (
                      <div key={i} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 flex items-start gap-2">
                        <span className="w-4 h-4 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        <span>{c}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 3. Important Definitions */}
              {selectedNote.definitions && selectedNote.definitions.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 flex items-center gap-1.5">
                    <Lightbulb className="w-4 h-4 text-amber-500" />
                    Important Definitions
                  </h3>
                  <div className="space-y-2">
                    {selectedNote.definitions.map((d, i) => (
                      <div key={i} className="p-3 bg-white border border-slate-200 rounded-xl text-xs shadow-2xs">
                        <span className="font-bold text-indigo-600">{d.term}: </span>
                        <span className="text-slate-700">{d.explanation}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 4. Examples & Walkthroughs */}
              {selectedNote.examples && selectedNote.examples.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-sky-500" />
                    Practical Examples
                  </h3>
                  <div className="space-y-2">
                    {selectedNote.examples.map((ex, i) => (
                      <div key={i} className="p-3 bg-sky-50/40 border border-sky-100 rounded-xl text-xs space-y-1">
                        <p className="font-bold text-sky-900">{ex.title}</p>
                        <p className="text-slate-700 leading-relaxed">{ex.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 5. Exam Tips */}
              {selectedNote.examTips && selectedNote.examTips.length > 0 && (
                <div className="p-4 bg-amber-50/80 rounded-2xl border border-amber-200/70">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-amber-900 mb-2 flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-amber-600 fill-amber-300" />
                    High-Yield Exam Tips
                  </h3>
                  <ul className="space-y-1 text-xs text-amber-950">
                    {selectedNote.examTips.map((tip, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-amber-600 font-bold">•</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 6. Full Markdown Content */}
              <div className="pt-4 border-t border-slate-200">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Complete Study Material Notes
                </h3>
                <div className="study-markdown p-4 bg-slate-50/60 rounded-2xl border border-slate-200 text-xs">
                  <Markdown>{selectedNote.content}</Markdown>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <FileText className="w-12 h-12 text-slate-600 mb-3" />
            <h3 className="text-sm font-bold text-slate-800">No note selected</h3>
            <p className="text-xs text-slate-700 max-w-sm mt-1 mb-4">
              Select an existing study note on the left or generate brand new structured notes from your course material.
            </p>
            <button
              onClick={() => setShowGenerateModal(true)}
              className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors shadow-xs cursor-pointer"
            >
              Generate AI Notes
            </button>
          </div>
        )}
      </div>

      {/* AI Generate Notes Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <h3 className="font-bold text-sm text-slate-900">Generate Structured Study Notes</h3>
              </div>
              <button
                onClick={() => setShowGenerateModal(false)}
                className="text-slate-600 hover:text-slate-800"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleGenerateNotes} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Source Study Document (Optional)
                </label>
                <select
                  value={genDocId}
                  onChange={(e) => setGenDocId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="">None (Specify Topic below)</option>
                  {documents.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.title} ({d.pageCount} pages)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Or Specific Topic / Subject
                </label>
                <input
                  type="text"
                  placeholder="e.g. Asymptotic Complexity and Sorting Algorithms"
                  value={genTopic}
                  onChange={(e) => setGenTopic(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Academic Depth Level
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {["Simple", "Normal", "Detailed"].map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setGenLevel(lvl)}
                      className={`py-1.5 text-xs font-semibold rounded-xl border transition-colors cursor-pointer ${
                        genLevel === lvl
                          ? "bg-emerald-600 text-white border-emerald-600"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={generating}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                <span>{generating ? "Synthesizing Notes with AI..." : "Generate Notes"}</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
