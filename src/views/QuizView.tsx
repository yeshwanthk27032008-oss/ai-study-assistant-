import React, { useState, useEffect } from "react";
import {
  HelpCircle,
  Sparkles,
  Play,
  CheckCircle,
  XCircle,
  RotateCcw,
  Clock,
  ArrowRight,
  ArrowLeft,
  Trash2,
  BookOpen,
  Award,
  Zap,
} from "lucide-react";
import type { Quiz, QuizAttempt, DocumentItem } from "../types.js";
import { api } from "../api.js";

interface QuizViewProps {
  initialQuizId?: string;
  onNavigate: (view: string, targetId?: string) => void;
}

export function QuizView({ initialQuizId, onNavigate }: QuizViewProps) {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Active taking mode state
  const [isTakingQuiz, setIsTakingQuiz] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [attemptResult, setAttemptResult] = useState<{
    score: number;
    total: number;
    percentage: number;
  } | null>(null);

  // Generate quiz modal state
  const [showGenModal, setShowGenModal] = useState(false);
  const [genDocId, setGenDocId] = useState("");
  const [genTopic, setGenTopic] = useState("");
  const [genSubject, setGenSubject] = useState("");
  const [genDifficulty, setGenDifficulty] = useState("Medium");
  const [genCount, setGenCount] = useState(5);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    loadQuizzes();
  }, []);

  const loadQuizzes = async () => {
    try {
      setLoading(true);
      const [qRes, docsRes] = await Promise.all([
        api.quizzes.list(),
        api.documents.list(),
      ]);
      setQuizzes(qRes.quizzes || []);
      setDocuments(docsRes.documents || []);

      if (initialQuizId) {
        const found = qRes.quizzes.find((q) => q.id === initialQuizId);
        if (found) startQuiz(found);
      }
    } catch (err) {
      console.error("Load quizzes error:", err);
    } finally {
      setLoading(false);
    }
  };

  const startQuiz = (quiz: Quiz) => {
    setActiveQuiz(quiz);
    setAnswers({});
    setCurrentQuestionIndex(0);
    setIsSubmitted(false);
    setAttemptResult(null);
    setIsTakingQuiz(true);
  };

  const handleSelectAnswer = (questionId: string, choice: string) => {
    if (isSubmitted) return;
    setAnswers((prev) => ({
      ...prev,
      [questionId]: choice,
    }));
  };

  const handleSubmitQuiz = async () => {
    if (!activeQuiz) return;
    try {
      const res = await api.quizzes.submitAttempt(activeQuiz.id, answers);
      setAttemptResult({
        score: res.score,
        total: res.totalQuestions,
        percentage: res.percentage,
      });
      setIsSubmitted(true);
      // Reload quizzes for attempts count
      api.quizzes.list().then((r) => setQuizzes(r.quizzes || []));
    } catch (err: any) {
      alert(err.message || "Failed to submit quiz attempt");
    }
  };

  const handleGenerateQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!genDocId && !genTopic.trim()) {
      alert("Please select a study document or specify a topic");
      return;
    }

    try {
      setGenerating(true);
      const res = await api.quizzes.generate({
        documentId: genDocId || undefined,
        topic: genTopic.trim() || undefined,
        subject: genSubject.trim() || undefined,
        difficulty: genDifficulty,
        questionCount: Number(genCount) || 5,
      });

      setShowGenModal(false);
      setGenTopic("");
      setGenDocId("");
      await loadQuizzes();
      startQuiz(res.quiz);
    } catch (err: any) {
      alert(err.message || "Failed to generate quiz");
    } finally {
      setGenerating(false);
    }
  };

  const handleDeleteQuiz = async (id: string) => {
    if (!confirm("Are you sure you want to delete this quiz?")) return;
    try {
      await api.quizzes.delete(id);
      setQuizzes((prev) => prev.filter((q) => q.id !== id));
      if (activeQuiz?.id === id) {
        setIsTakingQuiz(false);
        setActiveQuiz(null);
      }
    } catch (err) {
      console.error("Delete quiz error:", err);
    }
  };

  const currentQ = activeQuiz?.questions?.[currentQuestionIndex];
  const totalQuestions = activeQuiz?.questions?.length || 0;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-amber-600" />
            <h1 className="font-display text-xl sm:text-2xl font-black text-slate-900">
              Quizzes & MCQ Practice
            </h1>
          </div>
          <p className="text-xs text-slate-700 mt-0.5">
            AI-generated multiple choice questions with comprehensive explanations.
          </p>
        </div>

        <button
          onClick={() => setShowGenModal(true)}
          className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
        >
          <Sparkles className="w-4 h-4" />
          <span>Generate New Quiz</span>
        </button>
      </div>

      {/* Quiz Practice Stage */}
      {isTakingQuiz && activeQuiz ? (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-lg p-6 sm:p-10 space-y-6">
          {/* Header Bar */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <button
                onClick={() => setIsTakingQuiz(false)}
                className="text-xs font-bold text-slate-600 hover:text-slate-800 flex items-center gap-1 cursor-pointer mb-1"
              >
                <ArrowLeft className="w-4 h-4" /> Exit Quiz
              </button>
              <h2 className="font-display font-bold text-base text-slate-900">{activeQuiz.title}</h2>
            </div>

            {!isSubmitted && (
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-100 text-amber-900">
                Question {currentQuestionIndex + 1} of {totalQuestions}
              </span>
            )}
          </div>

          {/* Results Screen after submission */}
          {isSubmitted && attemptResult ? (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="p-6 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 rounded-3xl text-white text-center shadow-lg">
                <Award className="w-12 h-12 mx-auto mb-2 text-yellow-200" />
                <h3 className="font-display font-black text-2xl">
                  {attemptResult.percentage >= 80 ? "Outstanding Mastery! 🎯" : "Good Effort! Keep Reviewing 💡"}
                </h3>
                <p className="font-display font-black text-4xl mt-2">
                  {attemptResult.score} / {attemptResult.total}
                </p>
                <p className="text-xs text-amber-100 mt-1">
                  Score: {attemptResult.percentage}% • Difficulty: {activeQuiz.difficulty}
                </p>
              </div>

              {/* Review Question by Question with in-depth explanations */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Detailed Question Analysis & Answers
                </h4>

                {activeQuiz.questions?.map((q, idx) => {
                  const userAnswer = answers[q.id];
                  const isCorrect = userAnswer === q.correctAnswer;
                  return (
                    <div
                      key={q.id}
                      className={`p-4 rounded-2xl border ${
                        isCorrect ? "bg-emerald-50/40 border-emerald-200" : "bg-rose-50/40 border-rose-200"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-bold text-slate-900">
                          {idx + 1}. {q.prompt}
                        </p>
                        {isCorrect ? (
                          <span className="flex items-center gap-1 text-xs font-bold text-emerald-600">
                            <CheckCircle className="w-4 h-4" /> Correct
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs font-bold text-rose-600">
                            <XCircle className="w-4 h-4" /> Incorrect
                          </span>
                        )}
                      </div>

                      <div className="mt-3 space-y-1 text-xs">
                        <p className="text-slate-700">
                          <span className="font-semibold">Your Answer:</span>{" "}
                          <span className={isCorrect ? "text-emerald-700 font-bold" : "text-rose-700 font-bold"}>
                            {userAnswer || "Not answered"}
                          </span>
                        </p>
                        {!isCorrect && (
                          <p className="text-slate-700">
                            <span className="font-semibold">Correct Answer:</span>{" "}
                            <span className="text-emerald-700 font-bold">{q.correctAnswer}</span>
                          </p>
                        )}
                      </div>

                      {q.explanation && (
                        <div className="mt-3 p-3 bg-white rounded-xl border border-slate-200 text-xs text-slate-700 leading-relaxed">
                          <span className="font-bold text-slate-900">Explanation: </span>
                          {q.explanation}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-center gap-3 pt-2">
                <button
                  onClick={() => startQuiz(activeQuiz)}
                  className="px-4 py-2 bg-amber-600 text-white rounded-xl text-xs font-bold hover:bg-amber-700 shadow-xs cursor-pointer"
                >
                  Retake Quiz
                </button>
                <button
                  onClick={() => setIsTakingQuiz(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200 cursor-pointer"
                >
                  Return to Quizzes List
                </button>
              </div>
            </div>
          ) : currentQ ? (
            /* Active Question Taking UI */
            <div className="space-y-6">
              {/* Question Text */}
              <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-amber-700 px-2 py-0.5 rounded bg-amber-100 mb-2 inline-block">
                  {currentQ.type}
                </span>
                <p className="font-display font-bold text-base text-slate-900 leading-relaxed">
                  {currentQ.prompt}
                </p>
              </div>

              {/* Options list */}
              <div className="space-y-2.5">
                {currentQ.options?.map((opt, i) => {
                  const isSelected = answers[currentQ.id] === opt;
                  return (
                    <button
                      key={i}
                      onClick={() => handleSelectAnswer(currentQ.id, opt)}
                      className={`w-full text-left p-3.5 rounded-2xl border text-xs font-medium transition-all cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? "bg-amber-50 border-amber-500 text-amber-950 font-bold shadow-xs"
                          : "bg-white hover:bg-slate-50 border-slate-200 text-slate-800"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                            isSelected
                              ? "bg-amber-600 text-white"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {String.fromCharCode(65 + i)}
                        </span>
                        <span>{opt}</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Navigation Controls */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <button
                  disabled={currentQuestionIndex === 0}
                  onClick={() => setCurrentQuestionIndex((i) => Math.max(0, i - 1))}
                  className="px-3.5 py-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-xl hover:bg-slate-100 disabled:opacity-40 flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Previous
                </button>

                {currentQuestionIndex + 1 < totalQuestions ? (
                  <button
                    onClick={() => setCurrentQuestionIndex((i) => Math.min(totalQuestions - 1, i + 1))}
                    className="px-4 py-2 bg-amber-600 text-white rounded-xl text-xs font-bold hover:bg-amber-700 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <span>Next Question</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    onClick={handleSubmitQuiz}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>Submit & Grade Quiz</span>
                  </button>
                )}
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        /* Regular Quizzes List */
        <div className="space-y-4">
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-700">Loading quizzes...</div>
          ) : quizzes.length === 0 ? (
            <div className="py-12 text-center bg-white rounded-2xl border border-slate-200 p-8">
              <HelpCircle className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-slate-800">No quizzes generated yet</h3>
              <p className="text-xs text-slate-700 mt-1 mb-4">
                Generate an interactive MCQ quiz based on your course materials or any topic.
              </p>
              <button
                onClick={() => setShowGenModal(true)}
                className="px-4 py-2 bg-amber-600 text-white rounded-xl text-xs font-bold hover:bg-amber-700 cursor-pointer shadow-xs"
              >
                Generate Practice Quiz
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {quizzes.map((quiz) => (
                <div
                  key={quiz.id}
                  className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:border-amber-300 hover:shadow-md transition-all p-5 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-600 mb-2">
                      <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-100">
                        {quiz.subject}
                      </span>
                      <span className="text-slate-600">Level: {quiz.difficulty}</span>
                    </div>

                    <h3 className="font-bold text-sm text-slate-900 line-clamp-1">{quiz.title}</h3>
                    <p className="text-xs text-slate-700 mt-1 line-clamp-2">
                      {quiz.description || "Practice test questions designed for active recall & exam prep."}
                    </p>

                    <div className="flex items-center gap-3 text-[11px] text-slate-600 mt-3 pt-3 border-t border-slate-100">
                      <span>{quiz.questions?.length || 5} Questions</span>
                      <span>•</span>
                      <span>{quiz.attempts?.length || 0} Attempts logged</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100">
                    <button
                      onClick={() => startQuiz(quiz)}
                      className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                    >
                      <Play className="w-3.5 h-3.5 fill-white" />
                      <span>Take Quiz</span>
                    </button>

                    <button
                      onClick={() => handleDeleteQuiz(quiz.id)}
                      className="p-1.5 text-slate-600 hover:text-rose-600 transition-colors"
                      title="Delete quiz"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* AI Generate Quiz Modal */}
      {showGenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <h3 className="font-bold text-sm text-slate-900">Generate Practice Quiz</h3>
              </div>
              <button
                onClick={() => setShowGenModal(false)}
                className="text-slate-600 hover:text-slate-800"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleGenerateQuiz} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Source Study Document (Optional)
                </label>
                <select
                  value={genDocId}
                  onChange={(e) => setGenDocId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20"
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
                  placeholder="e.g. Stacks, Queues, and Binary Search Trees"
                  value={genTopic}
                  onChange={(e) => setGenTopic(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Difficulty</label>
                  <select
                    value={genDifficulty}
                    onChange={(e) => setGenDifficulty(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Questions</label>
                  <select
                    value={genCount}
                    onChange={(e) => setGenCount(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value={5}>5 Questions</option>
                    <option value={10}>10 Questions</option>
                    <option value={15}>15 Questions</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={generating}
                className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                <span>{generating ? "Drafting Questions with AI..." : "Create Quiz"}</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
