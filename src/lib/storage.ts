import { UserProgress, SavedPhrase, PracticeHistoryItem } from '@/types/lesson';

const PROGRESS_KEY = 'teachertalk_progress_v1';
const SETTINGS_KEY = 'teachertalk_settings_v1';

export interface AppSettings {
  provider: 'gemini' | 'openai';
  apiKey: string;
  teacherName: string;
  subject: string;
}

const DEFAULT_PROGRESS: UserProgress = {
  streakDays: 3,
  lastPracticeDate: null,
  completedLessonIds: [],
  history: [],
  savedPhrases: [
    {
      id: 'init-1',
      english: "Let's settle down and get ready for today's lesson.",
      ipa: "/lɛts ˈsɛt.əl daʊn ænd ɡɛt ˈrɛd.i fɔːr təˈdeɪz ˈlɛs.ən/",
      vietnamese: 'Cả lớp ổn định chỗ ngồi và chuẩn bị cho bài học hôm nay nhé.',
      lessonId: 1,
      addedAt: new Date().toISOString(),
    },
  ],
};

const DEFAULT_SETTINGS: AppSettings = {
  provider: 'gemini',
  apiKey: '',
  teacherName: 'Cô Thanh Lan',
  subject: 'Giáo viên THPT',
};

export function loadProgress(): UserProgress {
  if (typeof window === 'undefined') return DEFAULT_PROGRESS;
  try {
    const raw = window.localStorage.getItem(PROGRESS_KEY);
    if (!raw) return DEFAULT_PROGRESS;
    return { ...DEFAULT_PROGRESS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PROGRESS;
  }
}

export function saveProgress(progress: UserProgress): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  } catch {
    // ignore storage errors
  }
}

export function recordCompletedLesson(
  lessonId: number,
  lessonTitle: string,
  score: number,
  transcriptSummary: string,
  naturalUpgrade: string
): UserProgress {
  const current = loadProgress();
  const todayStr = new Date().toISOString().split('T')[0];

  let newStreak = current.streakDays;
  if (current.lastPracticeDate !== todayStr) {
    newStreak = current.streakDays + 1;
  }

  const completedLessonIds = current.completedLessonIds.includes(lessonId)
    ? current.completedLessonIds
    : [...current.completedLessonIds, lessonId];

  const newItem: PracticeHistoryItem = {
    id: `hist-${Date.now()}`,
    lessonId,
    lessonTitle,
    date: new Date().toLocaleDateString('vi-VN'),
    score,
    transcriptSummary,
    naturalUpgrade,
  };

  const updated: UserProgress = {
    ...current,
    streakDays: newStreak,
    lastPracticeDate: todayStr,
    completedLessonIds,
    history: [newItem, ...current.history].slice(0, 20),
  };

  saveProgress(updated);
  return updated;
}

export function toggleSavedPhrase(phrase: Omit<SavedPhrase, 'addedAt'>): UserProgress {
  const current = loadProgress();
  const exists = current.savedPhrases.some((p) => p.id === phrase.id);
  const savedPhrases = exists
    ? current.savedPhrases.filter((p) => p.id !== phrase.id)
    : [{ ...phrase, addedAt: new Date().toISOString() }, ...current.savedPhrases];

  const updated: UserProgress = {
    ...current,
    savedPhrases,
  };
  saveProgress(updated);
  return updated;
}

export function loadSettings(): AppSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // ignore
  }
}
