import React, { useState, useEffect, useRef } from "react";
import {
  Upload,
  FileText,
  Trash2,
  Edit2,
  Sparkles,
  MessageSquare,
  Layers,
  HelpCircle,
  FileEdit,
  Search,
  Filter,
  CheckCircle,
  AlertCircle,
  Clock,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  X,
  Zap,
} from "lucide-react";
import type { DocumentItem } from "../types.js";
import { api } from "../api.js";

interface DocumentsViewProps {
  initialDocumentId?: string;
  onNavigate: (view: string, targetId?: string) => void;
  onLoadDemo: () => void;
}

export function DocumentsView({
  initialDocumentId,
  onNavigate,
  onLoadDemo,
}: DocumentsViewProps) {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);

  // Selected document detail modal
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null);
  const [activeTab, setActiveTab] = useState<"summary" | "pages" | "chunks">("summary");
  const [currentPage, setCurrentPage] = useState(1);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadDocuments();
  }, [search, typeFilter]);

  useEffect(() => {
    if (initialDocumentId && documents.length > 0) {
      const found = documents.find((d) => d.id === initialDocumentId);
      if (found) {
        openDocumentDetail(found.id);
      }
    }
  }, [initialDocumentId, documents.length]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const res = await api.documents.list({
        search: search || undefined,
        fileType: typeFilter !== "all" ? typeFilter : undefined,
      });
      setDocuments(res.documents || []);
    } catch (err) {
      console.error("Load documents error:", err);
    } finally {
      setLoading(false);
    }
  };

  const openDocumentDetail = async (id: string) => {
    try {
      const res = await api.documents.get(id);
      setSelectedDoc(res.document);
      setTitleInput(res.document.title);
      setCurrentPage(1);
    } catch (err) {
      console.error("Open document error:", err);
    }
  };

  const handleFileUpload = async (file: File) => {
    try {
      setIsUploading(true);
      setUploadProgress(`Processing ${file.name}: extracting text, chunking & generating vector embeddings...`);
      const res = await api.documents.upload(file);
      setUploadProgress(null);
      await loadDocuments();
      openDocumentDetail(res.document.id);
    } catch (err: any) {
      alert(err.message || "Failed to process document");
      setUploadProgress(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleRename = async () => {
    if (!selectedDoc || !titleInput.trim()) return;
    try {
      const res = await api.documents.rename(selectedDoc.id, titleInput.trim());
      setSelectedDoc((prev) => (prev ? { ...prev, title: res.document.title } : null));
      setEditingTitle(false);
      loadDocuments();
    } catch (err: any) {
      alert(err.message || "Failed to rename document");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this study document?")) return;
    try {
      await api.documents.delete(id);
      if (selectedDoc?.id === id) setSelectedDoc(null);
      loadDocuments();
    } catch (err: any) {
      alert(err.message || "Failed to delete");
    }
  };

  // Parse summary JSON components if available
  let keyConcepts: string[] = [];
  let examTips: string[] = [];
  try {
    if (selectedDoc?.keyConcepts) keyConcepts = JSON.parse(selectedDoc.keyConcepts);
  } catch {}
  try {
    if (selectedDoc?.examTips) examTips = JSON.parse(selectedDoc.examTips);
  } catch {}

  // Filter chunks for current page
  const pageChunks = selectedDoc?.chunks?.filter((c) => c.pageNumber === currentPage) || [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-xl sm:text-2xl font-black text-slate-900">
            Study Materials
          </h1>
          <p className="text-xs text-slate-700 mt-0.5">
            Upload course PDFs, DOCX, or TXT notes. Everything is indexed for RAG retrieval and citations.
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            onClick={onLoadDemo}
            className="flex-1 sm:flex-none px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/80 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            <span>Load Sample DSA Notes</span>
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex-1 sm:flex-none px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Upload className="w-4 h-4" />
            <span>{isUploading ? "Uploading..." : "Upload File"}</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.txt,.md"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFileUpload(e.target.files[0]);
              }
            }}
          />
        </div>
      </div>

      {/* Drag & Drop Zone */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className="p-6 border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-indigo-50/30 hover:bg-indigo-50/50 rounded-2xl text-center cursor-pointer transition-colors"
      >
        <div className="w-12 h-12 mx-auto mb-2 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center shadow-xs">
          <Upload className="w-6 h-6" />
        </div>
        <p className="text-xs font-bold text-slate-800">
          Click to upload or drag & drop course material
        </p>
        <p className="text-[11px] text-slate-600 mt-1">
          Supports PDF (with page indexing), DOCX, and TXT files up to 25MB
        </p>
        {uploadProgress && (
          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-xs font-medium animate-pulse">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{uploadProgress}</span>
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-slate-600 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search documents by title or topic..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {["all", "pdf", "docx", "txt"].map((type) => (
            <button
              key={type}
              onClick={() => setTypeFilter(type)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer whitespace-nowrap ${
                typeFilter === type
                  ? "bg-slate-900 text-white"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Documents Grid */}
      {loading ? (
        <div className="py-12 text-center text-xs text-slate-700">Loading study materials...</div>
      ) : documents.length === 0 ? (
        <div className="py-12 text-center bg-white rounded-2xl border border-slate-200 p-8">
          <BookOpen className="w-10 h-10 text-slate-600 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-800">No documents found</h3>
          <p className="text-xs text-slate-700 mt-1 mb-4">
            Upload your first syllabus, textbook chapter, or click the button below to load the DSA demo material.
          </p>
          <button
            onClick={onLoadDemo}
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 cursor-pointer shadow-xs"
          >
            Load Sample Material
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:border-indigo-300 hover:shadow-md transition-all p-5 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-100">
                    {doc.fileType}
                  </span>
                  <div className="flex items-center gap-1 text-[11px] text-emerald-700 font-semibold">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Indexed</span>
                  </div>
                </div>

                <h3
                  onClick={() => openDocumentDetail(doc.id)}
                  className="font-bold text-sm text-slate-900 hover:text-indigo-600 transition-colors cursor-pointer line-clamp-1"
                >
                  {doc.title}
                </h3>

                <p className="text-xs text-slate-700 mt-1 line-clamp-3 leading-relaxed">
                  {doc.summary || "Extracted and prepared for AI active recall, spaced repetition flashcards, and RAG questions."}
                </p>

                <div className="flex items-center gap-3 text-[11px] text-slate-600 mt-3 pt-3 border-t border-slate-100">
                  <span>{doc.pageCount} Pages</span>
                  <span>•</span>
                  <span>{Math.round(doc.fileSize / 1024)} KB</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between gap-2 pt-4 mt-4 border-t border-slate-100">
                <button
                  onClick={() => openDocumentDetail(doc.id)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                >
                  View Details
                </button>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onNavigate("chat", doc.id)}
                    title="Ask AI questions with RAG citations"
                    className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 transition-colors"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onNavigate("flashcards")}
                    title="Generate Flashcards"
                    className="p-1.5 rounded-lg text-purple-600 hover:bg-purple-50 transition-colors"
                  >
                    <Layers className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onNavigate("quiz", doc.id)}
                    title="Generate Quiz"
                    className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 transition-colors"
                  >
                    <HelpCircle className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(doc.id)}
                    title="Delete document"
                    className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Document Detail & Reader Slideover / Modal */}
      {selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between gap-3 bg-slate-50/50">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                  {selectedDoc.fileType}
                </div>
                {editingTitle ? (
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      type="text"
                      value={titleInput}
                      onChange={(e) => setTitleInput(e.target.value)}
                      className="text-sm font-bold text-slate-900 border border-indigo-500 rounded-lg px-2 py-1 focus:outline-none w-full"
                    />
                    <button
                      onClick={handleRename}
                      className="px-2.5 py-1 bg-indigo-600 text-white rounded-lg text-xs font-bold"
                    >
                      Save
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 min-w-0">
                    <h2 className="font-display font-bold text-sm sm:text-base text-slate-900 truncate">
                      {selectedDoc.title}
                    </h2>
                    <button
                      onClick={() => setEditingTitle(true)}
                      className="p-1 text-slate-600 hover:text-slate-700"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              <button
                onClick={() => setSelectedDoc(null)}
                className="p-2 rounded-xl text-slate-600 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Subheader & Tab Switcher */}
            <div className="px-5 py-2.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 bg-white">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab("summary")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    activeTab === "summary"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  AI Study Summary
                </button>
                <button
                  onClick={() => setActiveTab("pages")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    activeTab === "pages"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  Document Pages ({selectedDoc.pageCount})
                </button>
                <button
                  onClick={() => setActiveTab("chunks")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    activeTab === "chunks"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  Semantic Chunks ({selectedDoc.chunks?.length || 0})
                </button>
              </div>

              {/* 1-Click Launch Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const docId = selectedDoc.id;
                    setSelectedDoc(null);
                    onNavigate("chat", docId);
                  }}
                  className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Ask in Chat</span>
                </button>
                <button
                  onClick={() => {
                    setSelectedDoc(null);
                    onNavigate("flashcards");
                  }}
                  className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Flashcards</span>
                </button>
                <button
                  onClick={() => {
                    const docId = selectedDoc.id;
                    setSelectedDoc(null);
                    onNavigate("quiz", docId);
                  }}
                  className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>Quiz</span>
                </button>
              </div>
            </div>

            {/* Modal Body Content */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6">
              {activeTab === "summary" && (
                <div className="space-y-6">
                  {/* Overview Block */}
                  <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-900 mb-1.5 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-indigo-600" />
                      Executive Overview
                    </h3>
                    <p className="text-xs text-slate-700 leading-relaxed">
                      {selectedDoc.summary || "Summary generated from uploaded textbook chapters and lecture slides."}
                    </p>
                  </div>

                  {/* Key Concepts Grid */}
                  {keyConcepts.length > 0 && (
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-1.5">
                        <BookOpen className="w-4 h-4 text-blue-600" />
                        Core Concepts & Invariants
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {keyConcepts.map((kc, i) => (
                          <div
                            key={i}
                            className="p-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 shadow-2xs flex items-start gap-2"
                          >
                            <span className="w-5 h-5 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                              {i + 1}
                            </span>
                            <span className="leading-snug">{kc}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Exam Tips Block */}
                  {examTips.length > 0 && (
                    <div className="p-4 bg-amber-50/60 rounded-2xl border border-amber-200/70">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-amber-900 mb-2 flex items-center gap-1.5">
                        <Zap className="w-4 h-4 text-amber-600 fill-amber-300" />
                        High-Yield Exam Focus Points & Common Traps
                      </h3>
                      <ul className="space-y-1.5 text-xs text-amber-950">
                        {examTips.map((tip, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-amber-600 font-bold">•</span>
                            <span>{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "pages" && (
                <div className="space-y-4">
                  {/* Page Paginator */}
                  <div className="flex items-center justify-between bg-slate-50 p-2 rounded-xl border border-slate-200">
                    <button
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      className="px-3 py-1 text-xs font-semibold bg-white border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-40 flex items-center gap-1"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" /> Previous
                    </button>
                    <span className="text-xs font-bold text-slate-800">
                      Page {currentPage} of {selectedDoc.pageCount}
                    </span>
                    <button
                      disabled={currentPage >= selectedDoc.pageCount}
                      onClick={() => setCurrentPage((p) => Math.min(selectedDoc.pageCount, p + 1))}
                      className="px-3 py-1 text-xs font-semibold bg-white border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-40 flex items-center gap-1"
                    >
                      Next <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Page Text Viewer */}
                  <div className="p-4 bg-white border border-slate-200 rounded-2xl text-xs leading-relaxed text-slate-800 whitespace-pre-wrap font-mono max-h-96 overflow-y-auto">
                    {pageChunks.length > 0
                      ? pageChunks.map((c) => c.content).join("\n\n")
                      : selectedDoc.rawText?.slice(0, 3000) || "No text available for this page."}
                  </div>
                </div>
              )}

              {activeTab === "chunks" && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-700 mb-2">
                    These semantic text chunks are embedded and queried during RAG question answering to provide grounded responses with page citations.
                  </p>
                  {selectedDoc.chunks && selectedDoc.chunks.length > 0 ? (
                    selectedDoc.chunks.map((chunk) => (
                      <div
                        key={chunk.id}
                        className="p-3.5 bg-slate-50/80 border border-slate-200 rounded-xl space-y-1.5"
                      >
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                          <span className="text-indigo-600">Chunk #{chunk.chunkIndex + 1}</span>
                          <span className="px-2 py-0.5 bg-white rounded border border-slate-200">
                            Page {chunk.pageNumber}
                          </span>
                        </div>
                        <p className="text-xs text-slate-800 leading-relaxed font-sans">{chunk.content}</p>
                      </div>
                    ))
                  ) : (
                    <div className="py-6 text-center text-xs text-slate-600">No chunks indexed.</div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
