'use client';

import React, { useState, useEffect } from 'react';
import {
  Flame,
  Trophy,
  BookOpen,
  Settings,
  Volume2,
  BookmarkCheck,
  Play,
  CheckCircle2,
  Sparkles,
  Calendar,
  Clock,
  Trash2,
  GraduationCap,
  History,
} from 'lucide-react';
import lessonsData from '@/data/lessons.json';
import { Lesson, UserProgress, SavedPhrase } from '@/types/lesson';
import {
  loadProgress,
  recordCompletedLesson,
  toggleSavedPhrase,
  loadSettings,
  AppSettings,
} from '@/lib/storage';
import { useSpeech } from '@/hooks/useSpeech';
import PracticeFlow from '@/components/PracticeFlow';
import SettingsModal from '@/components/SettingsModal';

const lessons = lessonsData as Lesson[];

export default function HomePage() {
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [progress, setProgress] = useState<UserProgress>({
    streakDays: 3,
    lastPracticeDate: null,
    completedLessonIds: [],
    history: [],
    savedPhrases: [],
  });
  const [settings, setSettings] = useState<AppSettings>({
    provider: 'gemini',
    apiKey: '',
    teacherName: 'Cô Thanh Lan',
    subject: 'Giáo viên THPT',
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  const { speak } = useSpeech();

  useEffect(() => {
    setProgress(loadProgress());
    setSettings(loadSettings());
  }, []);

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

  const averageScore =
    progress.history.length > 0
      ? Math.round(
          progress.history.reduce((sum, item) => sum + item.score, 0) /
            progress.history.length
        )
      : 86;

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <div
            onClick={() => setSelectedLesson(null)}
            className="flex items-center gap-3.5 cursor-pointer"
          >
            <div className="w-12 h-12 rounded-2xl bg-teal-700 text-white flex items-center justify-center shadow-sm">
              <GraduationCap className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-extrabold text-slate-900 tracking-tight">
                  TeacherTalk Daily
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200 text-xs font-bold">
                  A2 → B1
                </span>
              </div>
              <p className="text-sm text-slate-500">
                15 phút luyện nói tiếng Anh mỗi ngày dành cho Giáo viên Việt Nam
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Streak Pill */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 font-bold text-base">
              <Flame className="w-5 h-5 text-amber-500 fill-amber-500" />
              <span>{progress.streakDays} ngày liên tiếp</span>
            </div>

            {/* Settings Button */}
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-base transition"
            >
              <Settings className="w-5 h-5 text-slate-600" />
              <span className="hidden sm:inline">Cài đặt AI Key</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8">
        {selectedLesson ? (
          <PracticeFlow
            lesson={selectedLesson}
            settings={settings}
            savedPhrases={progress.savedPhrases}
            onToggleSavePhrase={handleToggleSavePhrase}
            onCompleteLesson={handleCompleteLesson}
            onBackToDashboard={() => setSelectedLesson(null)}
          />
        ) : (
          <div className="space-y-8">
            {/* Welcome & Daily Summary Banner */}
            <section className="bg-gradient-to-br from-teal-900 via-teal-800 to-slate-900 text-white rounded-3xl p-6 md:p-9 shadow-lg">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
                <div className="lg:col-span-2 space-y-3">
                  <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-teal-700/80 text-teal-100 text-sm font-semibold border border-teal-500/40">
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>
                      Xin chào {settings.teacherName} ({settings.subject})
                    </span>
                  </span>
                  <h1 className="text-2xl md:text-4xl font-extrabold leading-tight">
                    Mỗi ngày 15 phút — Tự tin giao tiếp sư phạm & đời sống ở tuổi
                    30–40
                  </h1>
                  <p className="text-teal-100 text-base md:text-lg leading-relaxed max-w-2xl">
                    Lộ trình 4 bước từ dễ đến khó: Nghe nhại cụm từ (Shadowing) →
                    Khung câu trả lời (Sentence Frames) → Đóng vai tình huống →
                    Chia sẻ tự do 2 phút cùng AI sửa lỗi.
                  </p>
                  <div className="pt-2 flex flex-wrap items-center gap-3">
                    <button
                      onClick={() => setSelectedLesson(lessons[0])}
                      className="px-6 py-3.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-base shadow-md transition inline-flex items-center gap-2"
                    >
                      <Play className="w-5 h-5 fill-slate-950" />
                      <span>Vào học ngay Bài Ngày 1</span>
                    </button>
                    <button
                      onClick={() => setIsSettingsOpen(true)}
                      className="px-5 py-3.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-semibold text-base border border-white/20 transition"
                    >
                      {settings.apiKey
                        ? '✅ Đã kết nối API Key riêng'
                        : '⚙️ Cấu hình Gemini / OpenAI Key'}
                    </button>
                  </div>
                </div>

                {/* Quick Stats Cards */}
                <div className="grid grid-cols-2 gap-3.5">
                  <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-4 border border-white/15">
                    <div className="flex items-center gap-2 text-teal-200 text-sm font-medium">
                      <BookOpen className="w-4 h-4" />
                      <span>Bài đã hoàn thành</span>
                    </div>
                    <p className="text-3xl font-extrabold mt-2">
                      {progress.completedLessonIds.length}/7
                    </p>
                    <p className="text-xs text-teal-200 mt-1">
                      Lộ trình 7 ngày đầu tiên
                    </p>
                  </div>

                  <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-4 border border-white/15">
                    <div className="flex items-center gap-2 text-amber-200 text-sm font-medium">
                      <Trophy className="w-4 h-4" />
                      <span>Điểm phát âm TB</span>
                    </div>
                    <p className="text-3xl font-extrabold mt-2">
                      {averageScore}
                      <span className="text-lg font-normal text-teal-200">
                        /100
                      </span>
                    </p>
                    <p className="text-xs text-teal-200 mt-1">
                      Mức độ trôi chảy A2 → B1
                    </p>
                  </div>

                  <div className="col-span-2 bg-white/10 backdrop-blur-xs rounded-2xl p-4 border border-white/15 flex items-center justify-between">
                    <div>
                      <p className="text-sm text-teal-200 font-medium">
                        Cụm từ đã lưu ôn tập
                      </p>
                      <p className="text-2xl font-extrabold mt-0.5">
                        {progress.savedPhrases.length} cụm từ sư phạm
                      </p>
                    </div>
                    <BookmarkCheck className="w-8 h-8 text-amber-300" />
                  </div>
                </div>
              </div>
            </section>

            {/* 7-Day Daily Lesson Cards */}
            <section className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
                    <Calendar className="w-6 h-6 text-teal-700" />
                    <span>Lộ trình 7 Ngày Luyện Nói Thực Tế (A2 → B1)</span>
                  </h2>
                  <p className="text-base text-slate-600 mt-0.5">
                    Chọn một bài học hàng ngày (Daily Card) để bắt đầu 4 cấp độ
                    luyện tập
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {lessons.map((lesson) => {
                  const isCompleted = progress.completedLessonIds.includes(
                    lesson.id
                  );
                  return (
                    <div
                      key={lesson.id}
                      className={`bg-white rounded-3xl p-6 border transition flex flex-col justify-between shadow-xs hover:shadow-md ${
                        isCompleted
                          ? 'border-emerald-300 bg-emerald-50/15'
                          : 'border-slate-200/90 hover:border-teal-300'
                      }`}
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="px-3 py-1 rounded-full bg-teal-50 text-teal-800 border border-teal-200 font-bold text-xs uppercase tracking-wider">
                            {lesson.dayLabel} • {lesson.category}
                          </span>
                          {isCompleted ? (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Đã hoàn thành
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500">
                              <Clock className="w-3.5 h-3.5" />
                              {lesson.durationMinutes} phút
                            </span>
                          )}
                        </div>

                        <h3 className="text-xl font-bold text-slate-900 leading-snug">
                          {lesson.vietnameseTitle}
                        </h3>
                        <p className="text-sm font-semibold text-teal-700">
                          {lesson.title}
                        </p>
                        <p className="text-base text-slate-600 leading-relaxed">
                          {lesson.description}
                        </p>

                        {/* Preview Collocations */}
                        <div className="pt-2 flex flex-wrap gap-1.5">
                          {lesson.level1.map((p) => (
                            <span
                              key={p.id}
                              className="text-xs font-medium px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700"
                            >
                              • {p.collocation}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="pt-5 mt-5 border-t border-slate-100">
                        <button
                          onClick={() => setSelectedLesson(lesson)}
                          className={`w-full py-3 px-4 rounded-2xl font-bold text-base transition flex items-center justify-center gap-2 ${
                            isCompleted
                              ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                              : 'bg-teal-700 hover:bg-teal-800 text-white shadow-xs'
                          }`}
                        >
                          <Play className="w-4 h-4 fill-current" />
                          <span>
                            {isCompleted
                              ? 'Luyện tập lại (4 Cấp độ)'
                              : 'Bắt đầu bài học (15 phút)'}
                          </span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Bottom Grid: Saved Phrases to Review & Practice Score History */}
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
              {/* Saved Phrases Review Box */}
              <div className="bg-white rounded-3xl p-6 md:p-7 border border-slate-200/90 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <BookmarkCheck className="w-6 h-6 text-amber-600" />
                    <h3 className="text-xl font-bold text-slate-900">
                      Sổ tay Cụm từ cần ôn tập ({progress.savedPhrases.length})
                    </h3>
                  </div>
                </div>

                {progress.savedPhrases.length === 0 ? (
                  <p className="text-slate-500 text-base py-6 text-center">
                    Thầy/Cô có thể bấm nút <strong>“Lưu cụm từ”</strong> ở mỗi
                    bài học để lưu các câu giao tiếp tâm đắc vào đây.
                  </p>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                    {progress.savedPhrases.map((item) => (
                      <div
                        key={item.id}
                        className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-lg font-bold text-slate-900">
                            “{item.english}”
                          </p>
                          <button
                            onClick={() => handleToggleSavePhrase(item)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 transition"
                            title="Xóa khỏi danh sách ôn tập"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <p className="text-sm font-mono text-teal-800">
                          {item.ipa}
                        </p>
                        <p className="text-base text-slate-600">
                          🇻🇳 {item.vietnamese}
                        </p>
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            onClick={() => speak(item.english, 0.8)}
                            className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-teal-50 hover:text-teal-800 transition inline-flex items-center gap-1"
                          >
                            <Volume2 className="w-3.5 h-3.5 text-teal-600" />
                            <span>Nghe 0.8x</span>
                          </button>
                          <button
                            onClick={() => speak(item.english, 1.0)}
                            className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-teal-50 hover:text-teal-800 transition inline-flex items-center gap-1"
                          >
                            <Volume2 className="w-3.5 h-3.5 text-teal-700" />
                            <span>Nghe 1.0x</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Pronunciation & AI Upgrade History */}
              <div className="bg-white rounded-3xl p-6 md:p-7 border border-slate-200/90 shadow-xs space-y-4">
                <div className="flex items-center gap-2.5">
                  <History className="w-6 h-6 text-teal-700" />
                  <h3 className="text-xl font-bold text-slate-900">
                    Lịch sử Điểm Phát âm & Câu Nâng cấp AI
                  </h3>
                </div>

                {progress.history.length === 0 ? (
                  <div className="py-8 text-center space-y-2">
                    <p className="text-slate-500 text-base">
                      Chưa có lịch sử bài tập được lưu.
                    </p>
                    <p className="text-sm text-slate-400">
                      Sau khi hoàn thành bài học và nhận đánh giá từ AI, điểm
                      phát âm và câu Natural Upgrade của Thầy/Cô sẽ lưu tại đây.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                    {progress.history.map((h) => (
                      <div
                        key={h.id}
                        className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 text-base">
                            {h.lessonTitle}
                          </span>
                          <span className="px-3 py-0.5 rounded-full bg-emerald-100 text-emerald-900 font-bold text-sm">
                            {h.score}/100 điểm
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">
                          Ngày luyện: {h.date}
                        </p>
                        <div className="p-3 rounded-xl bg-white border border-slate-200/80">
                          <p className="text-xs font-bold text-teal-800 uppercase mb-1">
                            ✨ Câu Natural Upgrade từ AI:
                          </p>
                          <p className="text-sm font-medium text-slate-800">
                            “{h.naturalUpgrade}”
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>
        )}
      </main>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        initialSettings={settings}
        onSave={(updated) => setSettings(updated)}
      />
    </div>
  );
}
