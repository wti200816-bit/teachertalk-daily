'use client';

import React, { useState, useEffect } from 'react';
import {
  Flame,
  BookOpen,
  Settings,
  Volume2,
  BookmarkCheck,
  Play,
  CheckCircle2,
  Sparkles,
  Clock,
  Trash2,
  GraduationCap,
  BarChart3,
  Mic,
  Smartphone,
  KeyRound,
  ShieldCheck,
  User,
} from 'lucide-react';
import lessonsData from '@/data/lessons.json';
import { Lesson, UserProgress, SavedPhrase } from '@/types/lesson';
import {
  loadProgress,
  recordCompletedLesson,
  toggleSavedPhrase,
  loadSettings,
  saveSettings,
  addStudySecondsToday,
  getLocalDateKey,
  AppSettings,
} from '@/lib/storage';
import { useSpeech } from '@/hooks/useSpeech';
import PracticeFlow from '@/components/PracticeFlow';
import StudyAnalytics from '@/components/StudyAnalytics';
import PwaInstallModal, {
  BeforeInstallPromptEvent,
} from '@/components/PwaInstallModal';

const lessons = lessonsData as Lesson[];

type BottomNavTab = 'today' | 'analytics' | 'library' | 'settings';

export default function HomePage() {
  const [activeNav, setActiveNav] = useState<BottomNavTab>('today');
  const [selectedLesson, setSelectedLesson] = useState<Lesson>(lessons[0]);
  const [progress, setProgress] = useState<UserProgress>(() => loadProgress());
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());

  // Settings form state
  const [providerInput, setProviderInput] = useState<'gemini' | 'openai'>(
    'gemini'
  );
  const [apiKeyInput, setApiKeyInput] = useState<string>('');
  const [teacherNameInput, setTeacherNameInput] =
    useState<string>('Cô Thanh Lan');
  const [subjectInput, setSubjectInput] = useState<string>('Giáo viên THPT');
  const [goalMinutesInput, setGoalMinutesInput] = useState<number>(15);
  const [savedBanner, setSavedBanner] = useState<boolean>(false);

  // PWA Install state
  const [isPwaModalOpen, setIsPwaModalOpen] = useState<boolean>(false);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isPwaInstalled, setIsPwaInstalled] = useState<boolean>(false);

  const { speak } = useSpeech();

  // 1. Load initial progress/settings & register Service Worker + beforeinstallprompt
  useEffect(() => {
    const loadedProg = loadProgress();
    const loadedSet = loadSettings();
    setProgress(loadedProg);
    setSettings(loadedSet);
    setProviderInput(loadedSet.provider);
    setApiKeyInput(loadedSet.apiKey);
    setTeacherNameInput(loadedSet.teacherName);
    setSubjectInput(loadedSet.subject);
    setGoalMinutesInput(loadedSet.dailyGoalMinutes || 15);

    if (typeof window !== 'undefined') {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js').catch(() => {});
      }

      const handleBeforeInstallPrompt = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e as BeforeInstallPromptEvent);
      };

      const handleAppInstalled = () => {
        setIsPwaInstalled(true);
        setDeferredPrompt(null);
      };

      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.addEventListener('appinstalled', handleAppInstalled);

      return () => {
        window.removeEventListener(
          'beforeinstallprompt',
          handleBeforeInstallPrompt
        );
        window.removeEventListener('appinstalled', handleAppInstalled);
      };
    }
  }, []);

  // 2. Active Study Time Tracker: Automatically counts active seconds every 5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        const updated = addStudySecondsToday(5);
        setProgress(updated);
      }
    }, 5000);

    return () => clearInterval(timer);
  }, []);

  const handleTriggerAndroidInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      setIsPwaInstalled(true);
      setDeferredPrompt(null);
    }
  };

  const handleToggleSavePhrase = (phrase: Omit<SavedPhrase, 'addedAt'>) => {
    const updated = toggleSavedPhrase(phrase);
    setProgress(updated);
  };

  const handleCompleteLesson = (
    lessonId: number,
    lessonTitle: string,
    score: number,
    transcriptSummary: string,
    naturalUpgrade: string
  ) => {
    const updated = recordCompletedLesson(
      lessonId,
      lessonTitle,
      score,
      transcriptSummary,
      naturalUpgrade
    );
    setProgress(updated);
  };

  const handleAddBonusMinutes = (mins: number) => {
    const updated = addStudySecondsToday(mins * 60);
    setProgress(updated);
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: AppSettings = {
      provider: providerInput,
      apiKey: apiKeyInput.trim(),
      teacherName: teacherNameInput.trim() || 'Thầy/Cô',
      subject: subjectInput.trim() || 'Giáo viên',
      dailyGoalMinutes: Number(goalMinutesInput) || 15,
    };
    saveSettings(updated);
    setSettings(updated);
    setSavedBanner(true);
    setTimeout(() => setSavedBanner(false), 2500);
  };

  const todayKey = getLocalDateKey();
  const todaySeconds = progress.studySecondsByDate?.[todayKey] || 0;
  const todayMinutesFormatted = `${Math.floor(todaySeconds / 60)}p ${String(
    todaySeconds % 60
  ).padStart(2, '0')}s`;
  const dailyGoal = settings.dailyGoalMinutes || 15;
  const dailyPercent = Math.min(
    100,
    Math.round((todaySeconds / (dailyGoal * 60)) * 100)
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F5] pb-24">
      {/* Warm Educational Minimalist Top Header */}
      <header className="sticky top-0 z-30 bg-[#FAF8F5]/95 backdrop-blur-md border-b border-stone-200/90">
        <div className="max-w-4xl mx-auto px-4 py-3.5 flex items-center justify-between gap-2">
          <div
            onClick={() => setActiveNav('today')}
            className="flex items-center gap-3 cursor-pointer"
          >
            <div className="w-11 h-11 rounded-2xl bg-[#0F766E] text-white flex items-center justify-center shadow-xs shrink-0">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
                  TeacherTalk Daily
                </span>
                <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full bg-teal-50 text-[#0F766E] border border-teal-200 text-xs font-extrabold">
                  A2 → B1
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 font-medium">
                {settings.teacherName} • Hôm nay đã học:{' '}
                <strong className="text-[#0F766E]">
                  {todayMinutesFormatted}
                </strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Streak Badge */}
            <button
              type="button"
              onClick={() => setActiveNav('analytics')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 font-extrabold text-sm hover:bg-amber-100 transition"
              title="Xem thống kê thời gian học"
            >
              <Flame className="w-4 h-4 text-[#D97706] fill-amber-500" />
              <span>{progress.streakDays} ngày</span>
            </button>

            {/* Prominent Install App to Phone Button */}
            <button
              type="button"
              onClick={() => setIsPwaModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-[#1E3A8A] hover:bg-blue-900 text-white font-bold text-xs sm:text-sm shadow-xs transition"
            >
              <Smartphone className="w-4 h-4 text-amber-300 shrink-0" />
              <span>📲 Tải App</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 pt-5">
        {/* TAB 1: HỌC HÔM NAY (TODAY'S PRACTICE) */}
        {activeNav === 'today' && (
          <div className="space-y-5">
            {/* Compact Daily Goal Progress Strip */}
            <div className="bg-gradient-to-r from-[#0F766E] via-teal-800 to-[#1E3A8A] text-white rounded-3xl p-5 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-teal-100 text-xs sm:text-sm font-bold uppercase tracking-wider">
                  <Clock className="w-4 h-4 text-amber-300" />
                  <span>
                    Thời gian luyện nói hôm nay: {todayMinutesFormatted} /{' '}
                    {dailyGoal} phút ({dailyPercent}%)
                  </span>
                </div>
                <p className="text-lg sm:text-xl font-extrabold">
                  Chào {settings.teacherName}! Cùng hoàn thành 4 bước luyện nói
                  hôm nay nhé.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveNav('analytics')}
                  className="px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold text-sm border border-white/20 transition inline-flex items-center gap-1.5"
                >
                  <BarChart3 className="w-4 h-4 text-amber-300" />
                  <span>Xem Biểu đồ Tuần</span>
                </button>
              </div>
            </div>

            {/* 4-Level Practice Flow */}
            <PracticeFlow
              lesson={selectedLesson}
              settings={settings}
              savedPhrases={progress.savedPhrases}
              onToggleSavePhrase={handleToggleSavePhrase}
              onCompleteLesson={handleCompleteLesson}
              onOpenLibrary={() => setActiveNav('library')}
            />
          </div>
        )}

        {/* TAB 2: THỐNG KÊ (STUDY TIME TRACKER & ANALYTICS) */}
        {activeNav === 'analytics' && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="text-xs font-extrabold uppercase tracking-wider text-[#0F766E]">
                  Study Time Tracker & Analytics
                </span>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                  Thống kê Thời gian học & Tiến độ A2 → B1
                </h1>
              </div>
            </div>

            <StudyAnalytics
              progress={progress}
              dailyGoalMinutes={dailyGoal}
              onAddBonusMinutes={handleAddBonusMinutes}
              onSpeak={(text, rate) => speak(text, rate || 0.8)}
            />
          </div>
        )}

        {/* TAB 3: KHO BÀI HỌC (7-DAY LESSONS & SAVED PHRASES) */}
        {activeNav === 'library' && (
          <div className="space-y-8 pb-8">
            <div className="space-y-1">
              <span className="text-xs font-extrabold uppercase tracking-wider text-[#0F766E]">
                7-Day Curriculum & Phrasebook
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                Kho 7 Bài học Sư phạm & Sổ tay Cụm từ
              </h1>
              <p className="text-base text-slate-600">
                Chọn bất kỳ chủ đề nào dưới đây để bắt đầu lộ trình luyện nói 4
                cấp độ.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {lessons.map((lesson) => {
                const isCompleted = progress.completedLessonIds.includes(
                  lesson.id
                );
                const isCurrent = selectedLesson.id === lesson.id;

                return (
                  <div
                    key={lesson.id}
                    className={`bg-white rounded-3xl p-6 border transition flex flex-col justify-between shadow-xs ${
                      isCurrent
                        ? 'border-2 border-[#0F766E] ring-2 ring-teal-100'
                        : isCompleted
                        ? 'border-emerald-300'
                        : 'border-stone-200/90'
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-3 py-1 rounded-full bg-teal-50 text-[#0F766E] border border-teal-200 font-extrabold text-xs uppercase">
                          {lesson.dayLabel} • {lesson.category}
                        </span>
                        {isCompleted ? (
                          <span className="inline-flex items-center gap-1 text-xs font-extrabold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Đã hoàn thành
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-500">
                            <Clock className="w-3.5 h-3.5" />
                            {lesson.durationMinutes} phút
                          </span>
                        )}
                      </div>

                      <h3 className="text-xl font-extrabold text-slate-900 leading-snug">
                        {lesson.vietnameseTitle}
                      </h3>
                      <p className="text-sm font-bold text-[#0F766E]">
                        {lesson.title}
                      </p>
                      <p className="text-base text-slate-600 leading-relaxed">
                        {lesson.description}
                      </p>

                      <div className="pt-1 flex flex-wrap gap-1.5">
                        {lesson.level1.map((p) => (
                          <span
                            key={p.id}
                            className="text-xs font-bold px-2.5 py-1 rounded-lg bg-[#FAF8F5] border border-stone-200 text-slate-700"
                          >
                            • {p.collocation}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="pt-5 mt-5 border-t border-stone-100">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedLesson(lesson);
                          setActiveNav('today');
                        }}
                        className="w-full py-3.5 px-4 rounded-2xl bg-[#0F766E] hover:bg-teal-800 text-white font-extrabold text-base transition flex items-center justify-center gap-2"
                      >
                        <Play className="w-4 h-4 fill-current" />
                        <span>Mở bài học này (4 Cấp độ)</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Saved Phrases Section */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-stone-200/90 shadow-xs space-y-4">
              <div className="flex items-center gap-2.5">
                <BookmarkCheck className="w-6 h-6 text-[#D97706]" />
                <h2 className="text-xl font-extrabold text-slate-900">
                  Sổ tay Cụm từ cần ôn tập ({progress.savedPhrases.length})
                </h2>
              </div>

              {progress.savedPhrases.length === 0 ? (
                <p className="text-slate-500 text-base py-4">
                  Chưa có cụm từ nào được lưu. Thầy/Cô hãy bấm “Lưu cụm từ”
                  trong lúc học để ôn lại tại đây nhé.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-3.5">
                  {progress.savedPhrases.map((item) => (
                    <div
                      key={item.id}
                      className="p-5 rounded-2xl bg-[#FAF8F5] border border-stone-200 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xl font-extrabold text-slate-900">
                          “{item.english}”
                        </p>
                        <button
                          type="button"
                          onClick={() => handleToggleSavePhrase(item)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 transition"
                          title="Xóa"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-sm font-mono text-[#0F766E]">
                        {item.ipa}
                      </p>
                      <p className="text-base text-slate-700 font-medium">
                        🇻🇳 {item.vietnamese}
                      </p>
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => speak(item.english, 0.8)}
                          className="px-3.5 py-1.5 rounded-xl bg-white border border-stone-300 text-slate-800 text-xs font-extrabold hover:bg-teal-50 inline-flex items-center gap-1"
                        >
                          <Volume2 className="w-3.5 h-3.5 text-[#0F766E]" />
                          <span>Nghe 0.8x</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => speak(item.english, 1.0)}
                          className="px-3.5 py-1.5 rounded-xl bg-[#0F766E] text-white text-xs font-extrabold hover:bg-teal-800 inline-flex items-center gap-1"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                          <span>Nghe 1.0x</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: CÀI ĐẶT (SETTINGS & PWA INSTALL CARD) */}
        {activeNav === 'settings' && (
          <div className="space-y-6 pb-8">
            <div>
              <span className="text-xs font-extrabold uppercase tracking-wider text-[#0F766E]">
                Personalization & Direct AI Key
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                Cài đặt Cá nhân & Tải App về Điện thoại
              </h1>
            </div>

            {/* Card 1: Install PWA to Phone */}
            <div className="bg-gradient-to-br from-[#1E3A8A] to-[#0F766E] text-white rounded-3xl p-6 sm:p-7 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-white/15 text-amber-300 text-xs font-extrabold uppercase">
                  Progressive Web App (PWA)
                </span>
                <h2 className="text-xl sm:text-2xl font-extrabold">
                  📲 Cài đặt TeacherTalk Daily ra Màn hình chính
                </h2>
                <p className="text-teal-100 text-base max-w-xl">
                  Hỗ trợ cả <strong>Android (Chrome 1 chạm)</strong> và{' '}
                  <strong>iPhone / iPad (iOS Safari)</strong> giúp Thầy/Cô mở
                  app luyện nói toàn màn hình cực kỳ tiện lợi mỗi ngày.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsPwaModalOpen(true)}
                className="px-6 py-3.5 rounded-2xl bg-[#D97706] hover:bg-amber-600 text-white font-extrabold text-base shadow-md transition shrink-0 inline-flex items-center gap-2"
              >
                <Smartphone className="w-5 h-5" />
                <span>Mở Hướng dẫn Tải App</span>
              </button>
            </div>

            {/* Card 2: Direct Gemini API & Profile Form */}
            <form
              onSubmit={handleSaveSettings}
              className="bg-white rounded-3xl p-6 sm:p-7 border border-stone-200/90 shadow-xs space-y-5"
            >
              <div className="flex items-center gap-3 pb-4 border-b border-stone-100">
                <div className="w-11 h-11 rounded-2xl bg-teal-50 text-[#0F766E] flex items-center justify-center">
                  <KeyRound className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900">
                    Hồ sơ Giáo viên & Kết nối Google Gemini API
                  </h2>
                  <p className="text-sm text-slate-500">
                    Chạy trực tiếp trên trình duyệt (Client-side), tương thích
                    vĩnh viễn với GitHub Pages
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-800 mb-1.5">
                    Danh xưng của Thầy/Cô
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      value={teacherNameInput}
                      onChange={(e) => setTeacherNameInput(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#FAF8F5] border border-stone-300 text-slate-900 font-semibold text-base"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-800 mb-1.5">
                    Cấp dạy / Bộ môn
                  </label>
                  <input
                    type="text"
                    value={subjectInput}
                    onChange={(e) => setSubjectInput(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#FAF8F5] border border-stone-300 text-slate-900 font-semibold text-base"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-800 mb-1.5">
                    Mục tiêu mỗi ngày (phút)
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={60}
                    value={goalMinutesInput}
                    onChange={(e) =>
                      setGoalMinutesInput(Number(e.target.value))
                    }
                    className="w-full px-4 py-2.5 rounded-xl bg-[#FAF8F5] border border-stone-300 text-slate-900 font-extrabold text-base"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-800 mb-2">
                  Chọn Nền tảng AI Phân tích Giọng nói
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setProviderInput('gemini')}
                    className={`py-3.5 px-4 rounded-2xl border text-left transition flex items-center justify-between ${
                      providerInput === 'gemini'
                        ? 'border-[#0F766E] bg-teal-50/70 text-[#0F766E] font-extrabold'
                        : 'border-stone-200 text-slate-700 hover:bg-stone-50 font-semibold'
                    }`}
                  >
                    <span>Google Gemini API (Khuyên dùng)</span>
                    <Sparkles className="w-4 h-4 text-[#0F766E]" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setProviderInput('openai')}
                    className={`py-3.5 px-4 rounded-2xl border text-left transition flex items-center justify-between ${
                      providerInput === 'openai'
                        ? 'border-[#1E3A8A] bg-blue-50/70 text-[#1E3A8A] font-extrabold'
                        : 'border-stone-200 text-slate-700 hover:bg-stone-50 font-semibold'
                    }`}
                  >
                    <span>OpenAI (GPT-4o mini)</span>
                    <Sparkles className="w-4 h-4 text-[#D97706]" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-800 mb-1.5">
                  {providerInput === 'gemini'
                    ? 'Google Gemini API Key'
                    : 'OpenAI API Key'}{' '}
                  (Lưu riêng tư trên máy của Thầy/Cô)
                </label>
                <input
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder={
                    providerInput === 'gemini'
                      ? 'Nhập khóa AIzaSy... (Lấy miễn phí tại aistudio.google.com)'
                      : 'Nhập khóa sk-...'
                  }
                  className="w-full px-4 py-3 rounded-xl bg-[#FAF8F5] border border-stone-300 text-slate-900 font-mono text-sm"
                />
                <div className="mt-3 flex items-start gap-2.5 text-sm text-slate-600 bg-[#FAF8F5] p-4 rounded-2xl border border-stone-200">
                  <ShieldCheck className="w-5 h-5 text-[#0F766E] shrink-0 mt-0.5" />
                  <span>
                    Khóa API được lưu trực tiếp trong <code>localStorage</code>{' '}
                    trên điện thoại/máy tính của Thầy/Cô và gọi thẳng tới{' '}
                    <strong>Google Gemini API</strong>, không qua bất kỳ máy chủ
                    trung gian nào. Nếu để trống, ứng dụng vẫn tự động kích hoạt{' '}
                    <strong>Smart Pedagogical Coach</strong> tích hợp sẵn.
                  </span>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="submit"
                  className="px-7 py-3.5 rounded-2xl bg-[#0F766E] hover:bg-teal-800 text-white font-extrabold text-base shadow-sm transition inline-flex items-center gap-2"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  <span>
                    {savedBanner
                      ? 'Đã lưu cài đặt thành công!'
                      : 'Lưu thiết lập'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        )}
      </main>

      {/* Mobile-First Fixed Bottom Navigation Bar (4 Tabs) */}
      <nav
        aria-label="Điều hướng chính"
        className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-stone-200 shadow-lg"
      >
        <div className="max-w-lg mx-auto grid grid-cols-4 px-2 py-1.5">
          {[
            {
              id: 'today' as BottomNavTab,
              label: 'Học hôm nay',
              icon: Mic,
            },
            {
              id: 'analytics' as BottomNavTab,
              label: 'Thống kê',
              icon: BarChart3,
            },
            {
              id: 'library' as BottomNavTab,
              label: 'Kho bài học',
              icon: BookOpen,
            },
            {
              id: 'settings' as BottomNavTab,
              label: 'Cài đặt',
              icon: Settings,
            },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeNav === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveNav(tab.id)}
                className={`py-2 px-1 rounded-2xl flex flex-col items-center justify-center gap-1 transition ${
                  isSelected
                    ? 'text-[#0F766E] font-extrabold bg-teal-50/80'
                    : 'text-slate-500 hover:text-slate-900 font-semibold'
                }`}
              >
                <Icon
                  className={`w-6 h-6 ${
                    isSelected ? 'text-[#0F766E]' : 'text-slate-400'
                  }`}
                />
                <span className="text-xs sm:text-sm leading-none">
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* PWA Install Guide Modal (Android & iOS Safari) */}
      <PwaInstallModal
        isOpen={isPwaModalOpen}
        onClose={() => setIsPwaModalOpen(false)}
        deferredPrompt={deferredPrompt}
        onTriggerAndroidInstall={handleTriggerAndroidInstall}
        isInstalled={isPwaInstalled}
      />
    </div>
  );
}
