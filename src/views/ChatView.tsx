import React, { useState, useEffect, useRef } from "react";
import {
  Send,
  Plus,
  Trash2,
  Sparkles,
  Bot,
  User as UserIcon,
  BookOpen,
  FileText,
  HelpCircle,
  ExternalLink,
  ChevronDown,
  RefreshCw,
  Copy,
  Check,
  Zap,
  Cpu,
  GraduationCap,
  Lightbulb,
  Target,
  Code2,
  Sliders,
  Eraser,
  Layers,
  Globe,
  Search,
} from "lucide-react";
import Markdown from "react-markdown";
import type { Chat, ChatMessage, DocumentItem, RagSource, ChatRoleConfig, ChatModelOption } from "../types.js";
import { api } from "../api.js";

interface ChatViewProps {
  initialDocumentId?: string;
  onNavigate: (view: string, targetId?: string) => void;
}

const DEFAULT_ROLES = [
  {
    id: "tutor",
    name: "Study Tutor",
    description: "Patient, structured step-by-step guidance with examples.",
    icon: GraduationCap,
    badge: "General",
    badgeColor: "bg-indigo-100 text-indigo-700",
  },
  {
    id: "socratic",
    name: "Socratic Coach",
    description: "Guides inquiry with probing questions to build critical thinking.",
    icon: Lightbulb,
    badge: "Complex",
    badgeColor: "bg-amber-100 text-amber-700",
  },
  {
    id: "exam_coach",
    name: "Exam Drillmaster",
    description: "High-yield test facts, common traps, mnemonics & practice drills.",
    icon: Target,
    badge: "Exams",
    badgeColor: "bg-emerald-100 text-emerald-700",
  },
  {
    id: "simplifier",
    name: "Feynman Simplifier",
    description: "ELI5 concept breakdown with real-world analogies and zero jargon.",
    icon: Sparkles,
    badge: "Fast / ELI5",
    badgeColor: "bg-purple-100 text-purple-700",
  },
  {
    id: "stem_coder",
    name: "STEM & Code Mentor",
    description: "Math proofs, algorithmic logic, Big-O complexity & code review.",
    icon: Code2,
    badge: "Complex STEM",
    badgeColor: "bg-blue-100 text-blue-700",
  },
];

const MODEL_TIERS = [
  {
    id: "auto",
    name: "Auto Complexity Router",
    tag: "Auto",
    desc: "Pro for complex STEM, Lite for quick lookups, Flash for general tasks",
  },
  {
    id: "gemini-3.5-flash",
    name: "Gemini 3.5 Flash",
    tag: "General",
    desc: "Balanced tutor for structured lessons & review",
  },
  {
    id: "gemini-3.1-pro-preview",
    name: "Gemini 3.1 Pro",
    tag: "Complex",
    desc: "Deep reasoning for mathematical proofs & STEM",
  },
  {
    id: "gemini-3.1-flash-lite",
    name: "Gemini 3.1 Flash Lite",
    tag: "Fast",
    desc: "Ultra-low latency for instant definitions & quick recall",
  },
];

export function ChatView({ initialDocumentId, onNavigate }: ChatViewProps) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string>(initialDocumentId || "all");
  const [inputPrompt, setInputPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Active Role & Model
  const [currentRole, setCurrentRole] = useState<string>("tutor");
  const [currentModel, setCurrentModel] = useState<string>("auto");
  const [useGoogleSearch, setUseGoogleSearch] = useState<boolean>(false);

  // Active citation inspection modal
  const [inspectedSource, setInspectedSource] = useState<RagSource | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadInitial();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeChat?.messages, sending]);

  const loadInitial = async () => {
    try {
      setLoading(true);
      const [chatsRes, docsRes] = await Promise.all([
        api.chats.list(),
        api.documents.list(),
      ]);
      setChats(chatsRes.chats || []);
      setDocuments(docsRes.documents || []);

      if (chatsRes.chats && chatsRes.chats.length > 0) {
        if (initialDocumentId) {
          const docChat = chatsRes.chats.find((c) => c.documentId === initialDocumentId);
          if (docChat) {
            await selectChat(docChat.id);
          } else {
            await createNewChat(initialDocumentId);
          }
        } else {
          await selectChat(chatsRes.chats[0].id);
        }
      } else {
        await createNewChat(initialDocumentId);
      }
    } catch (err) {
      console.error("Load chat error:", err);
    } finally {
      setLoading(false);
    }
  };

  const selectChat = async (id: string) => {
    try {
      const res = await api.chats.get(id);
      setActiveChat(res.chat);
      setSelectedDocId(res.chat.documentId || "all");
      if (res.chat.systemRole) setCurrentRole(res.chat.systemRole);
      if (res.chat.model) setCurrentModel(res.chat.model);
    } catch (err) {
      console.error("Select chat error:", err);
    }
  };

  const createNewChat = async (docId?: string) => {
    try {
      const targetDoc = documents.find((d) => d.id === docId);
      const title = targetDoc ? `Chat: ${targetDoc.title.slice(0, 20)}` : "New Study Session";
      const res = await api.chats.create(
        title,
        docId && docId !== "all" ? docId : undefined,
        currentRole,
        currentModel
      );
      setChats((prev) => [res.chat, ...prev]);
      setActiveChat(res.chat);
      setSelectedDocId(docId || "all");
    } catch (err) {
      console.error("Create chat error:", err);
    }
  };

  const handleRoleChange = async (newRole: string) => {
    setCurrentRole(newRole);
    if (activeChat) {
      try {
        await api.chats.update(activeChat.id, { systemRole: newRole });
        setActiveChat((prev) => (prev ? { ...prev, systemRole: newRole } : null));
      } catch (err) {
        console.error("Failed to update chat role:", err);
      }
    }
  };

  const handleModelChange = async (newModel: string) => {
    setCurrentModel(newModel);
    if (activeChat) {
      try {
        await api.chats.update(activeChat.id, { model: newModel });
        setActiveChat((prev) => (prev ? { ...prev, model: newModel } : null));
      } catch (err) {
        console.error("Failed to update chat model:", err);
      }
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputPrompt).trim();
    if (!text || !activeChat || sending) return;

    setInputPrompt("");
    setSending(true);

    try {
      const docParam = selectedDocId !== "all" ? selectedDocId : undefined;
      const res = await api.chats.sendMessage(activeChat.id, text, {
        documentId: docParam,
        systemRole: currentRole,
        model: useGoogleSearch ? "gemini-3.5-flash" : currentModel,
        useGoogleSearch,
      });

      setActiveChat((prev) => {
        if (!prev) return null;
        const currentMsgs = prev.messages || [];
        return {
          ...prev,
          messages: [...currentMsgs, res.userMessage, res.assistantMessage],
        };
      });

      // Update chat title in sidebar list if needed
      setChats((prev) =>
        prev.map((c) => (c.id === activeChat.id ? { ...c, title: text.slice(0, 30) } : c))
      );
    } catch (err: any) {
      alert(err.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const handleClearChat = async () => {
    if (!activeChat) return;
    if (!confirm("Clear all messages in this conversation?")) return;
    try {
      await api.chats.clear(activeChat.id);
      setActiveChat((prev) => (prev ? { ...prev, messages: [] } : null));
    } catch (err) {
      console.error("Clear chat error:", err);
    }
  };

  const handleDeleteChat = async (chatId: string) => {
    try {
      await api.chats.delete(chatId);
      const updated = chats.filter((c) => c.id !== chatId);
      setChats(updated);
      if (activeChat?.id === chatId) {
        if (updated.length > 0) {
          selectChat(updated[0].id);
        } else {
          createNewChat();
        }
      }
    } catch (err) {
      console.error("Delete chat error:", err);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Questions tailored to the active role
  const getRoleQuestions = () => {
    switch (currentRole) {
      case "socratic":
        return [
          "Can you help me understand why Binary Search requires sorted data?",
          "Guide me through deriving the quadratic formula from first principles.",
          "Why do we need normalization in relational databases?",
        ];
      case "exam_coach":
        return [
          "What are the top 3 high-yield exam traps on Dynamic Programming?",
          "Give me a rapid 2-minute drill on ACID database properties.",
          "What mnemonics help remember the OSI 7-layer model?",
        ];
      case "simplifier":
        return [
          "Explain what Big-O notation means using a kitchen recipe analogy.",
          "Explain how neural networks learn like you're talking to a 10-year-old.",
          "Explain virtual memory using a library desk analogy.",
        ];
      case "stem_coder":
        return [
          "Prove the time complexity of QuickSort average vs worst case with math.",
          "Analyze the space and time complexity of Dijkstra's algorithm with a min-heap.",
          "Derive the backpropagation gradient descent equations for a 2-layer network.",
        ];
      default: // tutor
        return [
          "What is the difference between an Array and a Linked List in memory?",
          "Explain the invariant of a Binary Search Tree (BST) and search time.",
          "What data structure is used to implement Breadth-First Search (BFS)?",
        ];
    }
  };

  const activeRoleData = DEFAULT_ROLES.find((r) => r.id === currentRole) || DEFAULT_ROLES[0];
  const ActiveRoleIcon = activeRoleData.icon;

  return (
    <div className="h-[calc(100vh-5.5rem)] flex flex-col lg:flex-row gap-4 max-w-7xl mx-auto">
      {/* Left Column: Chat History & Context Selector */}
      <div className="w-full lg:w-72 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col overflow-hidden shrink-0">
        <div className="p-3.5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Bot className="w-4 h-4 text-indigo-600" />
            <span className="text-xs font-bold text-slate-800">Study Sessions</span>
          </div>
          <button
            onClick={() => createNewChat(selectedDocId !== "all" ? selectedDocId : undefined)}
            className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Chat</span>
          </button>
        </div>

        {/* Target Document Grounding Selector */}
        <div className="p-3 bg-slate-50 border-b border-slate-100">
          <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
            Ground Answers in:
          </label>
          <select
            value={selectedDocId}
            onChange={(e) => setSelectedDocId(e.target.value)}
            className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="all">🔍 All Uploaded Materials</option>
            {documents.map((d) => (
              <option key={d.id} value={d.id}>
                📄 {d.title} ({d.pageCount}p)
              </option>
            ))}
          </select>
          <p className="text-[10px] text-slate-500 mt-1">
            Multi-turn chat embeds verified page citations from chunks.
          </p>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {chats.map((chat) => {
            const isCurrent = activeChat?.id === chat.id;
            return (
              <div
                key={chat.id}
                className={`group flex items-center justify-between p-2.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                  isCurrent
                    ? "bg-indigo-50 text-indigo-700 font-semibold"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                <div onClick={() => selectChat(chat.id)} className="truncate flex-1 pr-2">
                  <p className="truncate">{chat.title}</p>
                  <p className="text-[10px] text-slate-500 font-normal">
                    {new Date(chat.updatedAt).toLocaleDateString()}
                  </p>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteChat(chat.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 rounded transition-opacity"
                  title="Delete chat"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Column: Chat Conversation Canvas */}
      <div className="flex-1 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col overflow-hidden">
        {/* Chat Canvas Top Header */}
        <div className="p-3 px-5 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-sky-600 text-white flex items-center justify-center shadow-xs">
              <ActiveRoleIcon className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-bold text-slate-900 truncate">
                  {activeChat?.title || "AI Study Companion"}
                </h2>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${activeRoleData.badgeColor}`}>
                  {activeRoleData.name}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 line-clamp-1">
                {activeRoleData.description}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Clear conversation messages button */}
            {activeChat?.messages && activeChat.messages.length > 0 && (
              <button
                onClick={handleClearChat}
                title="Clear message history"
                className="px-2 py-1 text-xs font-medium text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg border border-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Eraser className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Clear</span>
              </button>
            )}

            <button
              onClick={() => onNavigate("notes")}
              title="Open Smart Notes"
              className="px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors hidden sm:flex items-center gap-1 cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Notes</span>
            </button>
          </div>
        </div>

        {/* System Instruction Roles & Model Selection Bar */}
        <div className="px-5 py-2.5 bg-white border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Chatbot Specific Role Selector */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1 mr-1">
              <Sliders className="w-3 h-3 text-indigo-600" />
              Role:
            </span>
            {DEFAULT_ROLES.map((role) => {
              const Icon = role.icon;
              const isSelected = currentRole === role.id;
              return (
                <button
                  key={role.id}
                  onClick={() => handleRoleChange(role.id)}
                  title={role.description}
                  className={`px-2.5 py-1 rounded-lg font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                    isSelected
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  <span>{role.name}</span>
                </button>
              );
            })}
          </div>

          {/* Model & Google Search Bar */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Google Search Grounding Toggle */}
            <button
              type="button"
              onClick={() => setUseGoogleSearch(!useGoogleSearch)}
              className={`px-2.5 py-1 rounded-lg font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer border ${
                useGoogleSearch
                  ? "bg-emerald-600 text-white border-emerald-700 shadow-xs ring-2 ring-emerald-400/30"
                  : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300"
              }`}
              title="Ground answers with live Google Search data using gemini-3.5-flash"
            >
              <Globe className={`w-3.5 h-3.5 ${useGoogleSearch ? "text-white" : "text-emerald-600"}`} />
              <span>Google Search</span>
              <span
                className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${
                  useGoogleSearch
                    ? "bg-emerald-700 text-emerald-100"
                    : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                }`}
              >
                gemini-3.5-flash
              </span>
            </button>

            {/* Gemini Model Tier Selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <Cpu className="w-3 h-3 text-indigo-600" />
                Model:
              </span>
              <select
                value={useGoogleSearch ? "gemini-3.5-flash" : currentModel}
                onChange={(e) => {
                  if (useGoogleSearch && e.target.value !== "gemini-3.5-flash") {
                    setUseGoogleSearch(false);
                  }
                  handleModelChange(e.target.value);
                }}
                className="px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                {MODEL_TIERS.map((tier) => (
                  <option key={tier.id} value={tier.id}>
                    {tier.name} [{tier.tag}]
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Scrollable Message Stream */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {activeChat?.messages && activeChat.messages.length > 0 ? (
            activeChat.messages.map((msg) => {
              const isUser = msg.role === "user";
              return (
                <div
                  key={msg.id}
                  className={`flex gap-3 max-w-3xl ${isUser ? "ml-auto justify-end" : "mr-auto"}`}
                >
                  {!isUser && (
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-sky-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs mt-0.5">
                      <ActiveRoleIcon className="w-4 h-4" />
                    </div>
                  )}

                  <div className="space-y-2 max-w-2xl">
                    <div
                      className={`p-4 rounded-2xl text-xs leading-relaxed ${
                        isUser
                          ? "bg-indigo-600 text-white rounded-tr-xs"
                          : "bg-slate-50 border border-slate-200 text-slate-800 rounded-tl-xs shadow-2xs"
                      }`}
                    >
                      {isUser ? (
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      ) : (
                        <div className="study-markdown">
                          <Markdown>{msg.content}</Markdown>
                        </div>
                      )}
                    </div>

                    {/* Meta info bar for Assistant message */}
                    {!isUser && (
                      <div className="flex flex-wrap items-center gap-2 pt-0.5">
                        {/* Model badge */}
                        {msg.model && (
                          <span className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-[9px] font-mono text-slate-600 flex items-center gap-1">
                            <Cpu className="w-2.5 h-2.5 text-indigo-500" />
                            {msg.model.replace("models/", "")}
                          </span>
                        )}

                        {/* Google Search Grounding Badge */}
                        {(msg.isSearchGrounded || (msg.webSources && msg.webSources.length > 0)) && (
                          <span className="px-1.5 py-0.5 bg-emerald-50 border border-emerald-200 rounded text-[9px] font-bold text-emerald-800 flex items-center gap-1">
                            <Globe className="w-2.5 h-2.5 text-emerald-600" />
                            Google Search Grounded
                          </span>
                        )}

                        {/* Google Search Queries */}
                        {msg.webSearchQueries && msg.webSearchQueries.length > 0 && (
                          <span className="text-[9px] text-slate-500 italic hidden sm:inline">
                            Query: {msg.webSearchQueries.map((q) => `"${q}"`).join(", ")}
                          </span>
                        )}

                        {/* Grounded Source Citations */}
                        {msg.sources && msg.sources.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-0.5">
                              <BookOpen className="w-3 h-3 text-indigo-600" />
                              Doc Citations:
                            </span>
                            {msg.sources.map((src, i) => (
                              <button
                                key={i}
                                onClick={() => setInspectedSource(src)}
                                className="px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-md text-[10px] font-bold transition-colors cursor-pointer flex items-center gap-1"
                              >
                                <span>Page {src.pageNumber}</span>
                                <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Copy button */}
                        <button
                          onClick={() => handleCopy(msg.content, msg.id)}
                          className="text-[10px] text-slate-500 hover:text-slate-700 flex items-center gap-1 transition-colors ml-auto"
                        >
                          {copiedId === msg.id ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-600" /> Copied
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" /> Copy
                            </>
                          )}
                        </button>

                        {/* Clickable Web Sources from Google Search Grounding */}
                        {msg.webSources && msg.webSources.length > 0 && (
                          <div className="w-full mt-2 pt-2 border-t border-slate-200/80 flex flex-wrap items-center gap-1.5">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1 mr-0.5">
                              <Globe className="w-3 h-3 text-emerald-600" />
                              Web Sources:
                            </span>
                            {msg.webSources.map((src, i) => (
                              <a
                                key={i}
                                href={src.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2 py-0.5 bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200 hover:border-emerald-300 rounded-md text-[10px] font-medium transition-colors shadow-2xs group"
                                title={src.url}
                              >
                                <span className="max-w-[180px] sm:max-w-[260px] truncate">{src.title}</span>
                                <ExternalLink className="w-2.5 h-2.5 text-slate-400 group-hover:text-emerald-600 shrink-0" />
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {isUser && (
                    <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs mt-0.5">
                      <UserIcon className="w-4 h-4" />
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="py-8 text-center max-w-lg mx-auto">
              <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-xs">
                <ActiveRoleIcon className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">
                {activeRoleData.name} Ready
              </h3>
              <p className="text-xs text-slate-600 mt-1 mb-5 leading-relaxed">
                {activeRoleData.description} Maintains full multi-turn conversation history and grounds answers in your course materials.
              </p>

              {/* Dynamic Suggested Questions based on Active Role */}
              <div className="space-y-2 text-left">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">
                  Try asking ({activeRoleData.name}):
                </p>
                <div className="flex flex-col gap-1.5">
                  {getRoleQuestions().map((q, i) => (
                    <button
                      key={i}
                      onClick={() => handleSendMessage(q)}
                      className="text-left p-2.5 bg-slate-50 hover:bg-indigo-50 hover:border-indigo-200 border border-slate-200 rounded-xl text-xs text-slate-700 hover:text-indigo-700 transition-all cursor-pointer flex items-center justify-between group"
                    >
                      <span className="truncate">{q}</span>
                      <Sparkles className="w-3.5 h-3.5 text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2" />
                    </button>
                  ))}
                </div>

                {/* Google Search Grounding Suggested Questions */}
                <div className="pt-2">
                  <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider text-center flex items-center justify-center gap-1">
                    <Globe className="w-3 h-3 text-emerald-600" />
                    Live Web Research (gemini-3.5-flash):
                  </p>
                  <div className="flex flex-col gap-1.5 mt-1.5">
                    {[
                      "Search Google: Recent breakthroughs in quantum computing & superconducting qubits",
                      "Search Google: Latest advancements in CRISPR and gene therapy in 2025/2026",
                      "Search Google: Key new features in Python 3.12 and 3.13",
                    ].map((q, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          setUseGoogleSearch(true);
                          handleSendMessage(q);
                        }}
                        className="text-left p-2.5 bg-emerald-50/50 hover:bg-emerald-50 hover:border-emerald-300 border border-emerald-200/80 rounded-xl text-xs text-slate-800 hover:text-emerald-900 transition-all cursor-pointer flex items-center justify-between group"
                      >
                        <span className="truncate">{q}</span>
                        <Globe className="w-3.5 h-3.5 text-emerald-600 shrink-0 ml-2" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {sending && (
            <div className="flex gap-3 items-center text-xs text-slate-600 max-w-md">
              <div className={`w-8 h-8 rounded-xl ${useGoogleSearch ? "bg-emerald-600" : "bg-indigo-600"} text-white flex items-center justify-center shrink-0 animate-spin`}>
                {useGoogleSearch ? <Globe className="w-4 h-4" /> : <RefreshCw className="w-4 h-4" />}
              </div>
              <span className="animate-pulse font-medium">
                {useGoogleSearch
                  ? "Searching Google with gemini-3.5-flash & grounding answer with verified sources..."
                  : currentRole === "stem_coder"
                  ? "Deriving proof and analyzing algorithmic complexity..."
                  : currentRole === "socratic"
                  ? "Formulating Socratic guidance and probing question..."
                  : currentRole === "simplifier"
                  ? "Distilling intuitive analogies..."
                  : "Formulating grounded answer with verified citations..."}
              </span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-3 sm:p-4 border-t border-slate-200 bg-white">
          {useGoogleSearch && (
            <div className="mb-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-800">
              <div className="flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-emerald-600" />
                <span className="font-semibold">Google Search Grounding Active</span>
                <span className="text-[10px] text-emerald-700 hidden sm:inline">— querying live web data with gemini-3.5-flash</span>
              </div>
              <button
                type="button"
                onClick={() => setUseGoogleSearch(false)}
                className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 underline cursor-pointer"
              >
                Disable
              </button>
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className={`flex items-center gap-2 bg-slate-50 border rounded-2xl p-1.5 pl-3 transition-all ${
              useGoogleSearch
                ? "border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-600"
                : "border-slate-200 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500"
            }`}
          >
            <button
              type="button"
              onClick={() => setUseGoogleSearch(!useGoogleSearch)}
              title={useGoogleSearch ? "Google Search Grounding is ON" : "Turn ON Google Search Grounding"}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                useGoogleSearch
                  ? "bg-emerald-600 text-white shadow-2xs"
                  : "text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"
              }`}
            >
              <Globe className="w-4 h-4" />
            </button>

            <input
              type="text"
              placeholder={
                useGoogleSearch
                  ? "Search Google & ask gemini-3.5-flash (e.g. 'Latest research in quantum computing')..."
                  : `Ask ${activeRoleData.name} anything (e.g. 'Explain BST balance rule')...`
              }
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              disabled={sending}
              className="flex-1 text-xs bg-transparent text-slate-800 placeholder-slate-400 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!inputPrompt.trim() || sending}
              className={`p-2 rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-40 text-white ${
                useGoogleSearch ? "bg-emerald-600 hover:bg-emerald-700" : "bg-indigo-600 hover:bg-indigo-700"
              }`}
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
          <div className="flex items-center justify-between text-[10px] text-slate-600 mt-1.5 px-1">
            <span>Role: <strong className="text-slate-700">{activeRoleData.name}</strong> • Multi-turn active</span>
            <span>
              Model: <strong className="text-slate-700">{useGoogleSearch ? "Gemini 3.5 Flash (Google Search)" : (MODEL_TIERS.find(m => m.id === currentModel)?.name || currentModel)}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Inspected Source Modal */}
      {inspectedSource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg p-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-600" />
                <h3 className="font-bold text-xs text-slate-900">
                  Grounded Citation: Page {inspectedSource.pageNumber}
                </h3>
              </div>
              <button
                onClick={() => setInspectedSource(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs leading-relaxed text-slate-800 font-mono max-h-72 overflow-y-auto">
              "{inspectedSource.text}"
            </div>

            <div className="mt-4 flex items-center justify-between">
              <span className="text-[10px] text-slate-500">
                Document: {inspectedSource.documentTitle || "Study Material"}
              </span>
              <button
                onClick={() => {
                  const docId = inspectedSource.documentId;
                  setInspectedSource(null);
                  onNavigate("documents", docId);
                }}
                className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 cursor-pointer"
              >
                Open Full Document
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
