import { UserProgress, SavedPhrase, PracticeHistoryItem } from '@/types/lesson';

const PROGRESS_KEY = 'teachertalk_progress_v2';
const SETTINGS_KEY = 'teachertalk_settings_v2';

export interface AppSettings {
  provider: 'gemini' | 'openai';
  apiKey: string;
  teacherName: string;
  subject: string;
  dailyGoalMinutes: number;
}

export function getLocalDateKey(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function createInitialStudySeconds(): Record<string, number> {
  const today = new Date();
  const oneDayMs = 24 * 60 * 60 * 1000;
  const yesterday = new Date(today.getTime() - oneDayMs);
  const twoDaysAgo = new Date(today.getTime() - 2 * oneDayMs);

  return {
    [getLocalDateKey(twoDaysAgo)]: 15 * 60, // 15 mins
    [getLocalDateKey(yesterday)]: 16 * 60, // 16 mins
    [getLocalDateKey(today)]: 6 * 60, // 6 mins started today
  };
}

const DEFAULT_PROGRESS: UserProgress = {
  streakDays: 3,
  lastPracticeDate: null,
  completedLessonIds: [1],
  history: [
    {
      id: 'init-hist-1',
      lessonId: 1,
      lessonTitle: 'Khởi động lớp học & Khích lệ học sinh tích cực',
      date: new Date().toLocaleDateString('vi-VN'),
      score: 88,
      transcriptSummary:
        'In my class, I always praise my students effort so they feel confident to speak up.',
      naturalUpgrade:
        'From my perspective as a teacher, praising students for their daily effort creates a safe and encouraging classroom environment.',
    },
  ],
  savedPhrases: [
    {
      id: 'd1-p1',
      english: "Let's settle down and get ready for today's lesson.",
      ipa: "/lɛts ˈsɛt.əl daʊn ænd ɡɛt ˈrɛd.i fɔːr təˈdeɪz ˈlɛs.ən/",
      vietnamese: 'Cả lớp ổn định chỗ ngồi và chuẩn bị cho bài học hôm nay nhé.',
      lessonId: 1,
      addedAt: new Date().toISOString(),
    },
    {
      id: 'd2-p1',
      english:
        'Your child has made steady progress in communication skills this semester.',
      ipa: '/jʊər tʃaɪld hæz meɪd ˈstɛd.i ˈprɑː.ɡrɛs ɪn kəˌmjuː.nɪˈkeɪ.ʃən skɪlz ðɪs səˈmɛs.tər/',
      vietnamese:
        'Con đã có sự tiến bộ vững vàng về kỹ năng giao tiếp trong học kỳ này.',
      lessonId: 2,
      addedAt: new Date().toISOString(),
    },
  ],
  studySecondsByDate: createInitialStudySeconds(),
};

const DEFAULT_SETTINGS: AppSettings = {
  provider: 'gemini',
  apiKey: '',
  teacherName: 'Cô Thanh Lan',
  subject: 'Giáo viên THPT (30–40 tuổi)',
  dailyGoalMinutes: 15,
};

export function loadProgress(): UserProgress {
  if (typeof window === 'undefined') return DEFAULT_PROGRESS;
  try {
    const raw = window.localStorage.getItem(PROGRESS_KEY);
    if (!raw) return DEFAULT_PROGRESS;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_PROGRESS,
      ...parsed,
      studySecondsByDate: {
        ...createInitialStudySeconds(),
        ...(parsed.studySecondsByDate || {}),
      },
    };
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

export function addStudySecondsToday(secondsToAdd: number): UserProgress {
  const current = loadProgress();
  const todayKey = getLocalDateKey();
  const prevSeconds = current.studySecondsByDate?.[todayKey] || 0;
  const nextSeconds = prevSeconds + secondsToAdd;

  let newStreak = current.streakDays;
  let lastPracticeDate = current.lastPracticeDate;

  // If user crosses 60 seconds today and hasn't updated streak today
  if (nextSeconds >= 60 && current.lastPracticeDate !== todayKey) {
    newStreak = Math.max(1, current.streakDays);
    lastPracticeDate = todayKey;
  }

  const updated: UserProgress = {
    ...current,
    streakDays: newStreak,
    lastPracticeDate,
    studySecondsByDate: {
      ...(current.studySecondsByDate || {}),
      [todayKey]: nextSeconds,
    },
  };

  saveProgress(updated);
  return updated;
}

export interface DayStudyStat {
  dayShort: string;
  dayFull: string;
  dateKey: string;
  minutes: number;
  seconds: number;
  isToday: boolean;
}

/**
 * Returns Monday -> Sunday study stats for the current week
 */
export function getCurrentWeekStudyStats(
  studySecondsByDate: Record<string, number>
): DayStudyStat[] {
  const now = new Date();
  const todayKey = getLocalDateKey(now);
  // getDay(): 0 is Sunday, 1 is Monday ... 6 is Saturday
  const currentDayOfWeek = now.getDay();
  const diffToMonday = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;

  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);

  const labels = [
    { short: 'T2', full: 'Thứ Hai' },
    { short: 'T3', full: 'Thứ Ba' },
    { short: 'T4', full: 'Thứ Tư' },
    { short: 'T5', full: 'Thứ Năm' },
    { short: 'T6', full: 'Thứ Sáu' },
    { short: 'T7', full: 'Thứ Bảy' },
    { short: 'CN', full: 'Chủ Nhật' },
  ];

  return labels.map((label, idx) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + idx);
    const dateKey = getLocalDateKey(d);
    const seconds = studySecondsByDate[dateKey] || 0;
    const minutes = Math.round((seconds / 60) * 10) / 10;

    return {
      dayShort: label.short,
      dayFull: label.full,
      dateKey,
      minutes,
      seconds,
      isToday: dateKey === todayKey,
    };
  });
}

export function recordCompletedLesson(
  lessonId: number,
  lessonTitle: string,
  score: number,
  transcriptSummary: string,
  naturalUpgrade: string
): UserProgress {
  const current = loadProgress();
  const todayStr = getLocalDateKey();

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

  const prevTodaySeconds = current.studySecondsByDate?.[todayStr] || 0;

  const updated: UserProgress = {
    ...current,
    streakDays: newStreak,
    lastPracticeDate: todayStr,
    completedLessonIds,
    history: [newItem, ...current.history].slice(0, 20),
    studySecondsByDate: {
      ...(current.studySecondsByDate || {}),
      [todayStr]: Math.max(prevTodaySeconds, 10 * 60),
    },
  };

  saveProgress(updated);
  return updated;
}

export function toggleSavedPhrase(
  phrase: Omit<SavedPhrase, 'addedAt'>
): UserProgress {
  const current = loadProgress();
  const exists = current.savedPhrases.some((p) => p.id === phrase.id);
  const savedPhrases = exists
    ? current.savedPhrases.filter((p) => p.id !== phrase.id)
    : [
        { ...phrase, addedAt: new Date().toISOString() },
        ...current.savedPhrases,
      ];

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
