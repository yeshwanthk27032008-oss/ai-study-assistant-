import React, { useState, useEffect } from "react";
import { Search, X, FolderOpen, FileText, Layers, HelpCircle, ArrowRight } from "lucide-react";
import { api } from "../api.js";

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (view: string, targetId?: string) => void;
}

export function GlobalSearchModal({ isOpen, onClose, onNavigate }: GlobalSearchModalProps) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{
    documents: any[];
    notes: any[];
    flashcards: any[];
    quizzes: any[];
  }>({
    documents: [],
    notes: [],
    flashcards: [],
    quizzes: [],
  });

  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      setResults({ documents: [], notes: [], flashcards: [], quizzes: [] });
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!query.trim()) {
      setResults({ documents: [], notes: [], flashcards: [], quizzes: [] });
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.progress.search(query.trim());
        setResults(res);
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  const totalResults =
    results.documents.length +
    results.notes.length +
    results.flashcards.length +
    results.quizzes.length;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Search Input Bar */}
        <div className="p-4 border-b border-slate-200 flex items-center gap-3">
          <Search className="w-5 h-5 text-indigo-600 shrink-0" />
          <input
            autoFocus
            type="text"
            placeholder="Search documents, notes, flashcards, quizzes..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full text-sm text-slate-800 placeholder-slate-600 focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="p-1 rounded text-slate-600 hover:text-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd
            onClick={onClose}
            className="px-2 py-0.5 text-[10px] font-mono bg-slate-100 text-slate-600 rounded border border-slate-200 cursor-pointer"
          >
            ESC
          </kbd>
        </div>

        {/* Results Container */}
        <div className="max-h-[60vh] overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="py-8 text-center text-xs text-slate-600">Searching your study repository...</div>
          ) : query && totalResults === 0 ? (
            <div className="py-8 text-center text-xs text-slate-600">
              No results found for "{query}". Try another keyword or load the demo material.
            </div>
          ) : !query ? (
            <div className="py-8 text-center text-xs text-slate-600">
              Type to search across documents, smart notes, flashcard decks, and practice quizzes.
            </div>
          ) : (
            <>
              {/* Documents */}
              {results.documents.length > 0 && (
                <div>
                  <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <FolderOpen className="w-3.5 h-3.5 text-blue-600" />
                    <span>Study Materials ({results.documents.length})</span>
                  </div>
                  <div className="space-y-1">
                    {results.documents.map((doc) => (
                      <button
                        key={doc.id}
                        onClick={() => {
                          onNavigate("documents", doc.id);
                          onClose();
                        }}
                        className="w-full text-left p-2.5 rounded-xl hover:bg-slate-50 border border-slate-100 flex items-center justify-between group transition-colors cursor-pointer"
                      >
                        <div className="truncate">
                          <p className="text-xs font-semibold text-slate-900 group-hover:text-indigo-600 truncate">
                            {doc.title}
                          </p>
                          <p className="text-[11px] text-slate-600 truncate">{doc.summary || doc.fileName}</p>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {results.notes.length > 0 && (
                <div>
                  <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Smart Notes ({results.notes.length})</span>
                  </div>
                  <div className="space-y-1">
                    {results.notes.map((note) => (
                      <button
                        key={note.id}
                        onClick={() => {
                          onNavigate("notes", note.id);
                          onClose();
                        }}
                        className="w-full text-left p-2.5 rounded-xl hover:bg-slate-50 border border-slate-100 flex items-center justify-between group transition-colors cursor-pointer"
                      >
                        <div className="truncate">
                          <p className="text-xs font-semibold text-slate-900 group-hover:text-emerald-600 truncate">
                            {note.title}
                          </p>
                          <p className="text-[11px] text-slate-600 truncate">{note.overview || note.content}</p>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Flashcards */}
              {results.flashcards.length > 0 && (
                <div>
                  <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-purple-600" />
                    <span>Flashcards ({results.flashcards.length})</span>
                  </div>
                  <div className="space-y-1">
                    {results.flashcards.map((fc) => (
                      <button
                        key={fc.id}
                        onClick={() => {
                          onNavigate("flashcards");
                          onClose();
                        }}
                        className="w-full text-left p-2.5 rounded-xl hover:bg-slate-50 border border-slate-100 flex items-center justify-between group transition-colors cursor-pointer"
                      >
                        <div className="truncate">
                          <p className="text-xs font-semibold text-slate-900 group-hover:text-purple-600 truncate">
                            {fc.front}
                          </p>
                          <p className="text-[11px] text-slate-600 truncate">Deck: {fc.deckTitle} • {fc.difficulty}</p>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-purple-600 group-hover:translate-x-0.5 transition-all shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quizzes */}
              {results.quizzes.length > 0 && (
                <div>
                  <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
                    <span>Quizzes ({results.quizzes.length})</span>
                  </div>
                  <div className="space-y-1">
                    {results.quizzes.map((q) => (
                      <button
                        key={q.id}
                        onClick={() => {
                          onNavigate("quiz", q.id);
                          onClose();
                        }}
                        className="w-full text-left p-2.5 rounded-xl hover:bg-slate-50 border border-slate-100 flex items-center justify-between group transition-colors cursor-pointer"
                      >
                        <div className="truncate">
                          <p className="text-xs font-semibold text-slate-900 group-hover:text-amber-600 truncate">
                            {q.title}
                          </p>
                          <p className="text-[11px] text-slate-600 truncate">Subject: {q.subject} • Difficulty: {q.difficulty}</p>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-amber-600 group-hover:translate-x-0.5 transition-all shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
