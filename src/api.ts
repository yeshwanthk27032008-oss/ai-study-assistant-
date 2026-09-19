import type {
  User,
  DocumentItem,
  Chat,
  ChatMessage,
  ChatRoleConfig,
  ChatModelOption,
  NoteItem,
  Flashcard,
  Quiz,
  QuizAttempt,
  StudyPlan,
  StudyTask,
  TopicExplanation,
  ProgressData,
} from "./types.js";

const TOKEN_KEY = "studymate_token";

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

let demoAuthPromise: Promise<string | null> | null = null;

export async function ensureToken(): Promise<string | null> {
  const existing = getStoredToken();
  if (existing) return existing;

  if (!demoAuthPromise) {
    demoAuthPromise = fetch("/api/auth/demo-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (data.token) {
          setStoredToken(data.token);
          return data.token;
        }
        return null;
      })
      .catch((err) => {
        console.error("Auto demo-login failed:", err);
        return null;
      })
      .finally(() => {
        demoAuthPromise = null;
      });
  }
  return demoAuthPromise;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const isAuthEndpoint =
    endpoint.startsWith("/api/auth/login") ||
    endpoint.startsWith("/api/auth/register") ||
    endpoint.startsWith("/api/auth/demo-login");

  let token = getStoredToken();
  if (!token && !isAuthEndpoint) {
    token = await ensureToken();
  }

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // If body is not FormData, add application/json
  if (options.body && !(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  let response = await fetch(endpoint, {
    ...options,
    headers,
  });

  // If 401 and not an explicit auth endpoint, try refreshing demo token once
  if (response.status === 401 && !isAuthEndpoint) {
    setStoredToken(null);
    const refreshedToken = await ensureToken();
    if (refreshedToken) {
      headers["Authorization"] = `Bearer ${refreshedToken}`;
      response = await fetch(endpoint, {
        ...options,
        headers,
      });
    }
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `Request failed: ${response.statusText}`);
  }

  return data as T;
}

export const api = {
  // Auth
  auth: {
    register: (name: string, email: string, pass: string) =>
      request<{ user: User; token: string }>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ name, email, password: pass }),
      }),
    login: (email: string, pass: string) =>
      request<{ user: User; token: string }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password: pass }),
      }),
    demoLogin: () =>
      request<{ user: User; token: string }>("/api/auth/demo-login", {
        method: "POST",
      }),
    me: () => request<{ user: User }>("/api/auth/me"),
    logout: () =>
      request<{ success: boolean }>("/api/auth/logout", {
        method: "POST",
      }),
  },

  // Documents
  documents: {
    list: (params?: { search?: string; fileType?: string; status?: string }) => {
      const q = new URLSearchParams(params as any).toString();
      return request<{ documents: DocumentItem[] }>(`/api/documents${q ? `?${q}` : ""}`);
    },
    get: (id: string) => request<{ document: DocumentItem }>(`/api/documents/${id}`),
    upload: (file: File, title?: string) => {
      const formData = new FormData();
      formData.append("file", file);
      if (title) formData.append("title", title);
      return request<{ document: DocumentItem }>("/api/documents/upload", {
        method: "POST",
        body: formData,
      });
    },
    loadDemo: () =>
      request<{ document: DocumentItem; message: string }>("/api/documents/demo", {
        method: "POST",
      }),
    summarize: (id: string) =>
      request<{ summary: any }>(`/api/documents/${id}/summarize`, {
        method: "POST",
      }),
    rename: (id: string, title: string) =>
      request<{ document: DocumentItem }>(`/api/documents/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ title }),
      }),
    delete: (id: string) =>
      request<{ success: boolean }>(`/api/documents/${id}`, {
        method: "DELETE",
      }),
  },

  // Chats & RAG
  chats: {
    list: () => request<{ chats: Chat[] }>("/api/chats"),
    getConfig: () =>
      request<{ roles: ChatRoleConfig[]; models: ChatModelOption[] }>("/api/chats/config"),
    create: (title?: string, documentId?: string, systemRole?: string, model?: string) =>
      request<{ chat: Chat }>("/api/chats", {
        method: "POST",
        body: JSON.stringify({ title, documentId, systemRole, model }),
      }),
    update: (
      id: string,
      data: { systemRole?: string; model?: string; title?: string; documentId?: string | null }
    ) =>
      request<{ chat: Chat }>(`/api/chats/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    get: (id: string) => request<{ chat: Chat }>(`/api/chats/${id}`),
    sendMessage: (
      id: string,
      content: string,
      options?: {
        documentId?: string;
        systemRole?: string;
        model?: string;
        useGoogleSearch?: boolean;
      }
    ) =>
      request<{ userMessage: ChatMessage; assistantMessage: ChatMessage }>(
        `/api/chats/${id}/message`,
        {
          method: "POST",
          body: JSON.stringify({
            content,
            documentId: options?.documentId,
            systemRole: options?.systemRole,
            model: options?.model,
            useGoogleSearch: options?.useGoogleSearch,
          }),
        }
      ),
    clear: (id: string) =>
      request<{ success: boolean }>(`/api/chats/${id}/clear`, {
        method: "POST",
      }),
    delete: (id: string) =>
      request<{ success: boolean }>(`/api/chats/${id}`, {
        method: "DELETE",
      }),
  },

  // Notes
  notes: {
    list: (params?: { search?: string; documentId?: string; favoriteOnly?: boolean }) => {
      const q = new URLSearchParams(params as any).toString();
      return request<{ notes: NoteItem[] }>(`/api/notes${q ? `?${q}` : ""}`);
    },
    create: (data: { title: string; content?: string; documentId?: string; tags?: string }) =>
      request<{ note: NoteItem }>("/api/notes", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    generate: (data: { documentId?: string; topic?: string; level?: string }) =>
      request<{ note: NoteItem }>("/api/notes/generate", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<NoteItem>) =>
      request<{ note: NoteItem }>(`/api/notes/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<{ success: boolean }>(`/api/notes/${id}`, {
        method: "DELETE",
      }),
  },

  // Flashcards
  flashcards: {
    list: (params?: { deckTitle?: string; documentId?: string }) => {
      const q = new URLSearchParams(params as any).toString();
      return request<{ flashcards: Flashcard[]; decks: string[] }>(
        `/api/flashcards${q ? `?${q}` : ""}`
      );
    },
    generate: (data: {
      documentId?: string;
      topic?: string;
      deckTitle?: string;
      count?: number;
    }) =>
      request<{ flashcards: Flashcard[] }>("/api/flashcards/generate", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    review: (data: {
      flashcardId: string;
      rating: "Again" | "Hard" | "Good" | "Easy";
      timeSpentMs?: number;
    }) =>
      request<{ flashcard: Flashcard; nextReview: string }>("/api/flashcards/review", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    create: (data: {
      front: string;
      back: string;
      deckTitle?: string;
      difficulty?: string;
      documentId?: string;
    }) =>
      request<{ flashcard: Flashcard }>("/api/flashcards", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<{ success: boolean }>(`/api/flashcards/${id}`, {
        method: "DELETE",
      }),
  },

  // Quizzes & MCQs
  quizzes: {
    list: () => request<{ quizzes: Quiz[] }>("/api/quizzes"),
    generate: (data: {
      documentId?: string;
      topic?: string;
      subject?: string;
      difficulty?: string;
      questionCount?: number;
      types?: string[];
    }) =>
      request<{ quiz: Quiz }>("/api/quizzes/generate", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    get: (id: string) => request<{ quiz: Quiz }>(`/api/quizzes/${id}`),
    submitAttempt: (id: string, answers: Record<string, string>) =>
      request<{
        attempt: QuizAttempt;
        score: number;
        totalQuestions: number;
        percentage: number;
      }>(`/api/quizzes/${id}/attempt`, {
        method: "POST",
        body: JSON.stringify({ answers }),
      }),
    delete: (id: string) =>
      request<{ success: boolean }>(`/api/quizzes/${id}`, {
        method: "DELETE",
      }),
  },

  // Topic Explainer
  explainer: {
    explain: (topic: string, difficulty?: string) =>
      request<{ explanation: TopicExplanation }>("/api/explain", {
        method: "POST",
        body: JSON.stringify({ topic, difficulty }),
      }),
  },

  // Study Plan
  studyPlans: {
    list: () => request<{ studyPlans: StudyPlan[] }>("/api/study-plans"),
    generate: (data: {
      examName: string;
      examDate?: string;
      subjects: string[];
      targetHoursPerDay: number;
      currentLevel: string;
    }) =>
      request<{ studyPlan: StudyPlan }>("/api/study-plans/generate", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    toggleTask: (taskId: string, isCompleted?: boolean) =>
      request<{ task: StudyTask }>(`/api/study-plans/tasks/${taskId}`, {
        method: "PATCH",
        body: JSON.stringify({ isCompleted }),
      }),
    delete: (id: string) =>
      request<{ success: boolean }>(`/api/study-plans/${id}`, {
        method: "DELETE",
      }),
  },

  // Progress & Analytics
  progress: {
    get: () => request<ProgressData>("/api/progress"),
    logSession: (durationMinutes: number, topic?: string, sessionType?: string) =>
      request<{ session: any; progress: any }>("/api/progress/session", {
        method: "POST",
        body: JSON.stringify({ durationMinutes, topic, sessionType }),
      }),
    search: (query: string) =>
      request<{
        documents: any[];
        notes: any[];
        flashcards: any[];
        quizzes: any[];
      }>(`/api/progress/search?q=${encodeURIComponent(query)}`),
    updateSettings: (data: {
      name?: string;
      preferredExplanationLevel?: string;
      theme?: string;
    }) =>
      request<{ user: User }>("/api/progress/settings", {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
  },
};
