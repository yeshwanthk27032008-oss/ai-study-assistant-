export interface User {
  id: string;
  name: string;
  email: string;
  preferredExplanationLevel: "Simple" | "Normal" | "Detailed";
  theme?: string;
}

export interface DocumentChunk {
  id: string;
  chunkIndex: number;
  pageNumber: number;
  content: string;
}

export interface DocumentItem {
  id: string;
  title: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  pageCount: number;
  status: "Processing" | "Ready" | "Failed";
  summary?: string | null;
  keyConcepts?: string | null;
  examTips?: string | null;
  rawText?: string | null;
  createdAt: string;
  updatedAt: string;
  chunks?: DocumentChunk[];
  _count?: {
    chunks: number;
    flashcards: number;
    quizzes: number;
    notes: number;
  };
}

export interface RagSource {
  pageNumber: number;
  text: string;
  documentId: string;
  documentTitle?: string;
  score?: number;
}

export interface WebGroundingSource {
  title: string;
  url: string;
}

export interface ChatMessage {
  id: string;
  chatId: string;
  role: "user" | "assistant" | "system";
  content: string;
  sources?: RagSource[] | null;
  webSources?: WebGroundingSource[] | null;
  webSearchQueries?: string[] | null;
  isSearchGrounded?: boolean;
  model?: string | null;
  createdAt: string;
}

export interface Chat {
  id: string;
  title: string;
  documentId?: string | null;
  systemRole?: string;
  model?: string;
  createdAt: string;
  updatedAt: string;
  document?: {
    id: string;
    title: string;
    fileName: string;
  } | null;
  messages?: ChatMessage[];
  _count?: {
    messages: number;
  };
}

export interface ChatRoleConfig {
  id: string;
  name: string;
  description: string;
  defaultComplexity: "general" | "complex" | "fast";
}

export interface ChatModelOption {
  id: string;
  name: string;
  description: string;
}

export interface NoteDefinition {
  term: string;
  explanation: string;
}

export interface NoteExample {
  title: string;
  description: string;
}

export interface NoteItem {
  id: string;
  title: string;
  overview?: string | null;
  content: string;
  isFavorite: boolean;
  tags?: string | null;
  documentId?: string | null;
  createdAt: string;
  updatedAt: string;
  keyConcepts?: string[];
  definitions?: NoteDefinition[];
  examples?: NoteExample[];
  examTips?: string[];
  document?: {
    id: string;
    title: string;
    fileName: string;
  } | null;
}

export interface Flashcard {
  id: string;
  deckTitle: string;
  front: string;
  back: string;
  difficulty: "Easy" | "Medium" | "Hard";
  repetitions: number;
  interval: number;
  easeFactor: number;
  lastReviewedAt?: string | null;
  nextReviewAt?: string | null;
  documentId?: string | null;
  document?: {
    id: string;
    title: string;
  } | null;
}

export interface QuizQuestion {
  id: string;
  question: string;
  prompt?: string;
  type: "mcq" | "true_false" | "short_answer";
  options: string[];
  correctAnswer: string;
  explanation: string;
  orderIndex: number;
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  score: number;
  totalQuestions: number;
  completedAt: string;
  answers: Array<{
    questionId: string;
    question: string;
    userAnswer: string;
    correctAnswer: string;
    explanation: string;
    isCorrect: boolean;
  }>;
  quiz?: {
    title: string;
    subject: string;
    difficulty: string;
  };
}

export interface Quiz {
  id: string;
  title: string;
  description?: string;
  topic?: string | null;
  subject: string;
  difficulty: "Easy" | "Medium" | "Hard";
  questionCount: number;
  documentId?: string | null;
  createdAt: string;
  questions?: QuizQuestion[];
  attempts?: QuizAttempt[];
  _count?: {
    questions: number;
    attempts: number;
  };
}

export interface StudyTask {
  id: string;
  studyPlanId: string;
  dayNumber?: number;
  dayOfWeek: string;
  subject: string;
  topic: string;
  startTime: string;
  endTime: string;
  durationMinutes?: number;
  isCompleted: boolean;
  completedAt?: string | null;
}

export interface StudyPlan {
  id: string;
  title: string;
  examName: string;
  examDate?: string | null;
  targetHoursPerDay: number;
  currentLevel: string;
  subjects: string[];
  createdAt: string;
  tasks: StudyTask[];
  totalTasks: number;
  completedTasks: number;
  progressPercent: number;
}

export interface TopicExplanation {
  topic: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced" | "Simple" | "Normal" | "Detailed";
  simpleExplanation: string;
  realWorldAnalogy?: string;
  analogy?: string;
  stepByStepExplanation?: string[];
  stepByStep?: string[];
  example?: {
    scenario: string;
    codeOrMath?: string;
    walkthrough: string;
  };
  realWorldExample?: string;
  commonMistakes: string[];
  quickRevision: string[];
}

export interface UserProgress {
  streakDays: number;
  totalHoursStudied: number;
  topicsCompleted: number;
  flashcardsReviewed: number;
  quizAverage: number;
  lastActiveDate: string;
}

export interface ProgressData {
  progress: UserProgress;
  counts: {
    documents: number;
    notes: number;
    flashcards: number;
    quizzes: number;
    chats: number;
  };
  dailyStudyData: Array<{
    day: string;
    hours: number;
    sessions: number;
  }>;
  recentAttempts: QuizAttempt[];
  sessions?: Array<{
    id: string;
    durationMinutes: number;
    topic?: string;
    sessionType: string;
    createdAt: string;
  }>;
}
