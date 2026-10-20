export interface ShadowingPhrase {
  id: string;
  english: string;
  collocation: string;
  ipa: string;
  vietnamese: string;
  tip: string;
}

export interface SlotOption {
  en: string;
  vi: string;
}

export interface FrameSlot {
  id: string;
  label: string;
  options: SlotOption[];
}

export interface GuidedQA {
  aiQuestion: string;
  aiQuestionVi: string;
  sentenceFrame: string;
  slots: FrameSlot[];
  sampleAnswer: string;
  sampleAnswerVi: string;
}

export interface RolePlayTurn {
  turnNumber: number;
  aiLine: string;
  aiLineVi: string;
  keywords: string[];
  hintVi: string;
  rescueSentence: string;
  rescueSentenceVi: string;
}

export interface RolePlay {
  scenario: string;
  partnerRole: string;
  turns: RolePlayTurn[];
}

export interface TwoMinuteTeacher {
  promptTitle: string;
  question: string;
  questionVi: string;
  prepSeconds: number;
  speakSeconds: number;
  guidingPoints: string[];
  modelResponse: string;
  modelResponseVi: string;
}

export interface Lesson {
  id: number;
  dayLabel: string;
  title: string;
  vietnameseTitle: string;
  category: string;
  cefrLevel: string;
  durationMinutes: number;
  description: string;
  level1: ShadowingPhrase[];
  level2: GuidedQA;
  level3: RolePlay;
  level4: TwoMinuteTeacher;
}

export interface PronunciationFix {
  word: string;
  ipa: string;
  vietnamese: string;
  advice: string;
}

export interface EvaluationResult {
  overallScore: number;
  fluencyPraise: string;
  pronunciationFixes: PronunciationFix[];
  naturalUpgrade: {
    originalIntent: string;
    upgradedSentence: string;
    vietnameseMeaning: string;
    whyItWorks: string;
  };
}

export interface SavedPhrase {
  id: string;
  english: string;
  ipa: string;
  vietnamese: string;
  lessonId: number;
  addedAt: string;
}

export interface PracticeHistoryItem {
  id: string;
  lessonId: number;
  lessonTitle: string;
  date: string;
  score: number;
  transcriptSummary: string;
  naturalUpgrade: string;
}

export interface UserProgress {
  streakDays: number;
  lastPracticeDate: string | null;
  completedLessonIds: number[];
  history: PracticeHistoryItem[];
  savedPhrases: SavedPhrase[];
  studySecondsByDate: Record<string, number>;
}
