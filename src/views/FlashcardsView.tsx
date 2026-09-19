import React, { useState, useEffect } from "react";
import {
  Layers,
  Sparkles,
  Plus,
  RotateCw,
  CheckCircle,
  Clock,
  ArrowLeft,
  ArrowRight,
  Trash2,
  BookOpen,
  Zap,
  Check,
  Flame,
} from "lucide-react";
import type { Flashcard, DocumentItem } from "../types.js";
import { api } from "../api.js";

interface FlashcardsViewProps {
  onNavigate: (view: string, targetId?: string) => void;
}

export function FlashcardsView({ onNavigate }: FlashcardsViewProps) {
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [decks, setDecks] = useState<string[]>([]);
  const [selectedDeck, setSelectedDeck] = useState<string>("all");
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Review Mode state
  const [isReviewMode, setIsReviewMode] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<number>(Date.now());

  // Generate modal state
  const [showGenModal, setShowGenModal] = useState(false);
  const [genDocId, setGenDocId] = useState("");
  const [genTopic, setGenTopic] = useState("");
  const [genDeck, setGenDeck] = useState("");
  const [genCount, setGenCount] = useState(10);
  const [generating, setGenerating] = useState(false);

  // Manual create modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newFront, setNewFront] = useState("");
  const [newBack, setNewBack] = useState("");
  const [newDeck, setNewDeck] = useState("");
  const [newDifficulty, setNewDifficulty] = useState("Medium");

  useEffect(() => {
    loadFlashcards();
  }, [selectedDeck]);

  const loadFlashcards = async () => {
    try {
      setLoading(true);
      const [cardsRes, docsRes] = await Promise.all([
        api.flashcards.list({ deckTitle: selectedDeck !== "all" ? selectedDeck : undefined }),
        api.documents.list(),
      ]);
      setFlashcards(cardsRes.flashcards || []);
      setDecks(cardsRes.decks || []);
      setDocuments(docsRes.documents || []);
    } catch (err) {
      console.error("Load flashcards error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartReview = () => {
    if (flashcards.length === 0) return;
    setCurrentIndex(0);
    setIsFlipped(false);
    setSessionCompleted(false);
    setSessionStartTime(Date.now());
    setIsReviewMode(true);
  };

  const handleRating = async (rating: "Again" | "Hard" | "Good" | "Easy") => {
    const currentCard = flashcards[currentIndex];
    if (!currentCard) return;

    try {
      await api.flashcards.review({
        flashcardId: currentCard.id,
        rating,
        timeSpentMs: Date.now() - sessionStartTime,
      });

      if (currentIndex + 1 < flashcards.length) {
        setIsFlipped(false);
        setCurrentIndex((i) => i + 1);
        setSessionStartTime(Date.now());
      } else {
        setSessionCompleted(true);
        // Log study progress
        api.progress.logSession(10, selectedDeck !== "all" ? selectedDeck : "Flashcards", "Flashcards").catch(console.error);
      }
    } catch (err) {
      console.error("Review rating error:", err);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!genDocId && !genTopic.trim()) {
      alert("Please choose a study document or specify a topic");
      return;
    }

    try {
      setGenerating(true);
      await api.flashcards.generate({
        documentId: genDocId || undefined,
        topic: genTopic.trim() || undefined,
        deckTitle: genDeck.trim() || undefined,
        count: Number(genCount) || 10,
      });

      setShowGenModal(false);
      setGenTopic("");
      setGenDocId("");
      await loadFlashcards();
    } catch (err: any) {
      alert(err.message || "Failed to generate flashcards");
    } finally {
      setGenerating(false);
    }
  };

  const handleCreateManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFront.trim() || !newBack.trim()) return;

    try {
      await api.flashcards.create({
        front: newFront.trim(),
        back: newBack.trim(),
        deckTitle: newDeck.trim() || "General",
        difficulty: newDifficulty,
      });

      setShowCreateModal(false);
      setNewFront("");
      setNewBack("");
      await loadFlashcards();
    } catch (err: any) {
      alert(err.message || "Failed to create card");
    }
  };

  const handleDeleteCard = async (id: string) => {
    try {
      await api.flashcards.delete(id);
      setFlashcards((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      console.error("Delete flashcard error:", err);
    }
  };

  const activeCard = flashcards[currentIndex];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-purple-600" />
            <h1 className="font-display text-xl sm:text-2xl font-black text-slate-900">
              Flashcards & Active Recall
            </h1>
          </div>
          <p className="text-xs text-slate-700 mt-0.5">
            Spaced repetition flashcards with SM-2 algorithm intervals for long-term retention.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {!isReviewMode && flashcards.length > 0 && (
            <button
              onClick={handleStartReview}
              className="flex-1 sm:flex-none px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Zap className="w-4 h-4 fill-white" />
              <span>Practice Review ({flashcards.length})</span>
            </button>
          )}

          <button
            onClick={() => setShowGenModal(true)}
            className="px-3.5 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Generate</span>
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors cursor-pointer"
            title="Add Single Flashcard Manually"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Review Mode Interactive Stage */}
      {isReviewMode ? (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-lg p-6 sm:p-10 space-y-6">
          {/* Top Progress & Exit */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsReviewMode(false)}
                className="text-xs font-bold text-slate-600 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" /> Exit Session
              </button>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                Card {currentIndex + 1} of {flashcards.length}
              </span>
            </div>

            <div className="w-36 bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                className="bg-purple-600 h-full transition-all duration-300"
                style={{ width: `${((currentIndex + 1) / flashcards.length) * 100}%` }}
              />
            </div>
          </div>

          {sessionCompleted ? (
            <div className="py-12 text-center max-w-md mx-auto space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center shadow-md">
                <CheckCircle className="w-8 h-8" />
              </div>
              <h2 className="font-display font-black text-xl text-slate-900">
                Session Complete! 🎉
              </h2>
              <p className="text-xs text-slate-700 leading-relaxed">
                You've successfully reviewed all {flashcards.length} flashcards in this deck. Repetition intervals have been updated based on your recall accuracy.
              </p>
              <div className="flex justify-center gap-3 pt-2">
                <button
                  onClick={handleStartReview}
                  className="px-4 py-2 bg-purple-600 text-white rounded-xl text-xs font-bold hover:bg-purple-700 cursor-pointer shadow-xs"
                >
                  Review Again
                </button>
                <button
                  onClick={() => setIsReviewMode(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200 cursor-pointer"
                >
                  Back to Deck View
                </button>
              </div>
            </div>
          ) : activeCard ? (
            <div className="space-y-6">
              {/* 3D Flip Card */}
              <div
                onClick={() => setIsFlipped(!isFlipped)}
                className="relative w-full min-h-[280px] sm:min-h-[320px] rounded-3xl border-2 border-slate-200/90 shadow-md bg-gradient-to-br from-white to-slate-50/50 p-8 flex flex-col justify-between cursor-pointer hover:border-purple-300 transition-all group"
              >
                <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                  <span className="uppercase tracking-wider font-mono">
                    {isFlipped ? "Answer / Back" : "Question / Front"}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                    {activeCard.difficulty}
                  </span>
                </div>

                <div className="text-center py-6">
                  <p className="font-display text-lg sm:text-xl font-bold text-slate-900 leading-relaxed">
                    {isFlipped ? activeCard.back : activeCard.front}
                  </p>
                </div>

                <div className="text-center text-[11px] text-slate-600 flex items-center justify-center gap-1">
                  <RotateCw className="w-3.5 h-3.5 group-hover:rotate-180 transition-transform" />
                  <span>Click to flip card</span>
                </div>
              </div>

              {/* Spaced Repetition Rating Controls (Shows when flipped) */}
              {isFlipped && (
                <div className="space-y-2 animate-in fade-in duration-200">
                  <p className="text-center text-xs font-bold text-slate-700">
                    How well did you recall this?
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <button
                      onClick={() => handleRating("Again")}
                      className="p-3 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-800 text-center transition-colors cursor-pointer"
                    >
                      <p className="text-xs font-bold">Again</p>
                      <p className="text-[10px] text-rose-600 mt-0.5">&lt; 10 min</p>
                    </button>

                    <button
                      onClick={() => handleRating("Hard")}
                      className="p-3 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 text-center transition-colors cursor-pointer"
                    >
                      <p className="text-xs font-bold">Hard</p>
                      <p className="text-[10px] text-amber-600 mt-0.5">1 Day</p>
                    </button>

                    <button
                      onClick={() => handleRating("Good")}
                      className="p-3 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-800 text-center transition-colors cursor-pointer"
                    >
                      <p className="text-xs font-bold">Good</p>
                      <p className="text-[10px] text-blue-600 mt-0.5">3 Days</p>
                    </button>

                    <button
                      onClick={() => handleRating("Easy")}
                      className="p-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-center transition-colors cursor-pointer"
                    >
                      <p className="text-xs font-bold">Easy</p>
                      <p className="text-[10px] text-emerald-600 mt-0.5">7 Days</p>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      ) : (
        /* Regular Deck & Cards Grid View */
        <div className="space-y-4">
          {/* Deck Filters */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            <button
              onClick={() => setSelectedDeck("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                selectedDeck === "all"
                  ? "bg-slate-900 text-white"
                  : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              All Decks ({flashcards.length})
            </button>
            {decks.map((deck) => (
              <button
                key={deck}
                onClick={() => setSelectedDeck(deck)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                  selectedDeck === deck
                    ? "bg-purple-600 text-white"
                    : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                {deck}
              </button>
            ))}
          </div>

          {/* Cards Grid */}
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-700">Loading flashcards...</div>
          ) : flashcards.length === 0 ? (
            <div className="py-12 text-center bg-white rounded-2xl border border-slate-200 p-8">
              <Layers className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-slate-800">No flashcards found</h3>
              <p className="text-xs text-slate-700 mt-1 mb-4">
                Generate a deck of flashcards from your study materials or create your own.
              </p>
              <button
                onClick={() => setShowGenModal(true)}
                className="px-4 py-2 bg-purple-600 text-white rounded-xl text-xs font-bold hover:bg-purple-700 cursor-pointer shadow-xs"
              >
                Generate Flashcards with AI
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {flashcards.map((card) => (
                <div
                  key={card.id}
                  className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:border-purple-300 hover:shadow-md transition-all p-4 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-600 mb-2">
                      <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-100 truncate max-w-[150px]">
                        {card.deckTitle}
                      </span>
                      <span>Repetitions: {card.repetitions}</span>
                    </div>

                    <p className="text-xs font-bold text-slate-900 line-clamp-2 leading-relaxed">
                      Q: {card.front}
                    </p>

                    <p className="text-xs text-slate-700 mt-2 line-clamp-3 leading-relaxed border-t border-slate-100 pt-2">
                      A: {card.back}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100 text-[10px] text-slate-600">
                    <span>Interval: {card.interval}d</span>
                    <button
                      onClick={() => handleDeleteCard(card.id)}
                      className="p-1 text-slate-600 hover:text-rose-600 transition-colors"
                      title="Delete card"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* AI Generate Flashcards Modal */}
      {showGenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <h3 className="font-bold text-sm text-slate-900">AI Flashcard Generator</h3>
              </div>
              <button
                onClick={() => setShowGenModal(false)}
                className="text-slate-600 hover:text-slate-800"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleGenerate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  From Study Material (Optional)
                </label>
                <select
                  value={genDocId}
                  onChange={(e) => setGenDocId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                >
                  <option value="">None (Use custom topic)</option>
                  {documents.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Or Custom Topic / Chapter
                </label>
                <input
                  type="text"
                  placeholder="e.g. Tree Traversal, Graph Algorithms"
                  value={genTopic}
                  onChange={(e) => setGenTopic(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Deck Name</label>
                <input
                  type="text"
                  placeholder="e.g. Data Structures & Algorithms"
                  value={genDeck}
                  onChange={(e) => setGenDeck(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Number of Cards: {genCount}
                </label>
                <input
                  type="range"
                  min="5"
                  max="20"
                  value={genCount}
                  onChange={(e) => setGenCount(Number(e.target.value))}
                  className="w-full accent-purple-600"
                />
              </div>

              <button
                type="submit"
                disabled={generating}
                className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                <span>{generating ? "Generating Cards with AI..." : "Generate Flashcards"}</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Manual Create Card Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-sm text-slate-900">Add Single Flashcard</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-600 hover:text-slate-800"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateManual} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Front (Question / Prompt)
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="e.g. What is the time complexity of QuickSort in the average case?"
                  value={newFront}
                  onChange={(e) => setNewFront(e.target.value)}
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Back (Answer / Explanation)
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. O(n log n). The worst-case is O(n^2) when poor pivots are chosen."
                  value={newBack}
                  onChange={(e) => setNewBack(e.target.value)}
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Deck Title</label>
                <input
                  type="text"
                  placeholder="e.g. Computer Science Fundamentals"
                  value={newDeck}
                  onChange={(e) => setNewDeck(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
              >
                Save Flashcard
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
