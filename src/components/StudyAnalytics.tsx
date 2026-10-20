'use client';

import React from 'react';
import {
  Flame,
  Clock,
  Trophy,
  TrendingUp,
  CheckCircle2,
  PlusCircle,
  Sparkles,
  History,
  Volume2,
} from 'lucide-react';
import { UserProgress } from '@/types/lesson';
import {
  getCurrentWeekStudyStats,
  getLocalDateKey,
} from '@/lib/storage';

interface StudyAnalyticsProps {
  progress: UserProgress;
  dailyGoalMinutes: number;
  onAddBonusMinutes: (minutes: number) => void;
  onSpeak: (text: string, rate?: 0.8 | 1.0) => void;
}

export default function StudyAnalytics({
  progress,
  dailyGoalMinutes,
  onAddBonusMinutes,
  onSpeak,
}: StudyAnalyticsProps) {
  const todayKey = getLocalDateKey();
  const todaySeconds = progress.studySecondsByDate?.[todayKey] || 0;
  const todayMinutes = Math.round((todaySeconds / 60) * 10) / 10;
  const todayWholeMins = Math.floor(todaySeconds / 60);
  const todayRemSecs = todaySeconds % 60;

  const goalSecs = Math.max(1, dailyGoalMinutes) * 60;
  const dailyPercent = Math.min(100, Math.round((todaySeconds / goalSecs) * 100));

  // SVG Ring geometry
  const radius = 74;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset =
    circumference - (dailyPercent / 100) * circumference;

  // Weekly stats (Monday -> Sunday)
  const weekStats = getCurrentWeekStudyStats(
    progress.studySecondsByDate || {}
  );
  const totalWeekSeconds = weekStats.reduce((acc, d) => acc + d.seconds, 0);
  const totalWeekMinutes = Math.round((totalWeekSeconds / 60) * 10) / 10;
  const maxBarMinutes = Math.max(
    dailyGoalMinutes * 1.25,
    ...weekStats.map((d) => d.minutes),
    15
  );

  const averageScore =
    progress.history.length > 0
      ? Math.round(
          progress.history.reduce((s, h) => s + h.score, 0) /
            progress.history.length
        )
      : 88;

  return (
    <div className="space-y-6 pb-8">
      {/* Top Streak & Weekly Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-3xl p-5 border border-stone-200/90 shadow-xs flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-100 text-[#D97706] flex items-center justify-center shrink-0">
            <Flame className="w-8 h-8 fill-amber-500 text-amber-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-500">
              Chuỗi ngày học (Streak)
            </p>
            <p className="text-2xl font-extrabold text-slate-900">
              {progress.streakDays} ngày 🔥
            </p>
            <p className="text-xs text-[#0F766E] font-medium mt-0.5">
              Duy trì thói quen đều đặn
            </p>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-stone-200/90 shadow-xs flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-teal-50 text-[#0F766E] flex items-center justify-center shrink-0">
            <Clock className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-500">
              Tổng thời gian tuần này
            </p>
            <p className="text-2xl font-extrabold text-slate-900">
              {totalWeekMinutes} phút
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              Mục tiêu tuần: {dailyGoalMinutes * 7} phút
            </p>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-stone-200/90 shadow-xs flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 text-[#1E3A8A] flex items-center justify-center shrink-0">
            <Trophy className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-500">
              Điểm phát âm trung bình
            </p>
            <p className="text-2xl font-extrabold text-slate-900">
              {averageScore}/100
            </p>
            <p className="text-xs text-[#1E3A8A] font-medium mt-0.5">
              Đã hoàn thành {progress.completedLessonIds.length}/7 bài
            </p>
          </div>
        </div>
      </div>

      {/* Main Analytics Grid: Daily Progress Ring + Weekly Bar Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 1. Daily Progress Ring Card */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-6 sm:p-7 border border-stone-200/90 shadow-xs flex flex-col items-center justify-between text-center space-y-4">
          <div className="w-full flex items-center justify-between">
            <span className="text-sm font-extrabold uppercase tracking-wider text-[#0F766E]">
              Tiến độ hôm nay
            </span>
            <span className="px-3 py-1 rounded-full bg-stone-100 text-slate-700 text-xs font-bold">
              Mục tiêu: {dailyGoalMinutes} phút/ngày
            </span>
          </div>

          {/* Circular Progress Ring */}
          <div className="relative w-48 h-48 flex items-center justify-center my-2">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 180 180">
              <circle
                cx="90"
                cy="90"
                r={radius}
                fill="transparent"
                stroke="#E7E5E4"
                strokeWidth="14"
              />
              <circle
                cx="90"
                cy="90"
                r={radius}
                fill="transparent"
                stroke={dailyPercent >= 100 ? '#0F766E' : '#D97706'}
                strokeWidth="14"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-700 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-extrabold text-slate-900">
                {todayWholeMins}p {String(todayRemSecs).padStart(2, '0')}s
              </span>
              <span className="text-sm font-bold text-slate-500 mt-0.5">
                Đạt {dailyPercent}% mục tiêu
              </span>
              {dailyPercent >= 100 && (
                <span className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-[#0F766E] bg-teal-50 px-2.5 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Hoàn thành!
                </span>
              )}
            </div>
          </div>

          <p className="text-base text-slate-600 leading-relaxed">
            Bộ đếm thời gian <strong>Active Timer</strong> đang tự động ghi nhận
            mỗi giây Thầy/Cô mở bài học và luyện nói trên ứng dụng.
          </p>

          <button
            type="button"
            onClick={() => onAddBonusMinutes(5)}
            className="w-full py-3 px-4 rounded-2xl bg-stone-100 hover:bg-stone-200 text-slate-800 font-bold text-sm transition inline-flex items-center justify-center gap-2"
          >
            <PlusCircle className="w-4 h-4 text-[#0F766E]" />
            <span>+ Cộng thêm 5 phút tự ôn tập ngoài giờ</span>
          </button>
        </div>

        {/* 2. Weekly Bar Chart (Thứ Hai -> Chủ Nhật) */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-7 border border-stone-200/90 shadow-xs flex flex-col justify-between space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="text-sm font-extrabold uppercase tracking-wider text-[#1E3A8A] flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4" />
                <span>Biểu đồ Thời gian học trong tuần</span>
              </span>
              <h3 className="text-xl font-bold text-slate-900 mt-1">
                Thứ Hai đến Chủ Nhật ({totalWeekMinutes} phút)
              </h3>
            </div>
            <div className="flex items-center gap-3 text-xs font-bold">
              <span className="inline-flex items-center gap-1.5 text-[#D97706]">
                <span className="w-3 h-3 rounded-sm bg-[#D97706] inline-block" />
                Hôm nay ({todayMinutes}p)
              </span>
              <span className="inline-flex items-center gap-1.5 text-[#0F766E]">
                <span className="w-3 h-3 rounded-sm bg-[#0F766E] inline-block" />
                Các ngày trong tuần
              </span>
            </div>
          </div>

          {/* 7-Day Column Chart */}
          <div className="pt-6 pb-2 px-2">
            <div className="grid grid-cols-7 gap-2.5 sm:gap-4 items-end h-52 border-b border-stone-200 pb-3 relative">
              {weekStats.map((day) => {
                const heightPercent = Math.max(
                  8,
                  Math.min(100, Math.round((day.minutes / maxBarMinutes) * 100))
                );
                const metGoal = day.minutes >= dailyGoalMinutes;

                return (
                  <div
                    key={day.dateKey}
                    className="flex flex-col items-center justify-end h-full group"
                  >
                    <span
                      className={`text-xs sm:text-sm font-extrabold mb-1.5 ${
                        day.isToday
                          ? 'text-[#D97706]'
                          : day.minutes > 0
                          ? 'text-slate-800'
                          : 'text-slate-400'
                      }`}
                    >
                      {day.minutes > 0 ? `${day.minutes}p` : '0p'}
                    </span>
                    <div className="w-full max-w-[44px] h-40 bg-stone-100 rounded-2xl flex items-end overflow-hidden p-1">
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className={`w-full rounded-xl transition-all duration-500 ${
                          day.isToday
                            ? 'bg-gradient-to-t from-[#D97706] to-amber-400 shadow-sm'
                            : metGoal
                            ? 'bg-[#0F766E]'
                            : day.minutes > 0
                            ? 'bg-teal-500/75'
                            : 'bg-stone-200'
                        }`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Day Labels Row */}
            <div className="grid grid-cols-7 gap-2.5 sm:gap-4 pt-3 text-center">
              {weekStats.map((day) => (
                <div key={day.dateKey} className="flex flex-col items-center">
                  <span
                    className={`text-sm font-extrabold ${
                      day.isToday
                        ? 'text-[#D97706] bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200'
                        : 'text-slate-700'
                    }`}
                  >
                    {day.dayShort}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#FAF8F5] rounded-2xl p-4 border border-stone-200/80 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5 text-sm text-slate-700">
              <Sparkles className="w-5 h-5 text-[#D97706] shrink-0" />
              <span>
                Chỉ cần duy trì <strong>{dailyGoalMinutes} phút/ngày</strong>,
                sau 1 tháng Thầy/Cô sẽ tích lũy hơn{' '}
                <strong>7.5 giờ nói tiếng Anh thực chiến</strong>!
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Pronunciation Score & AI Natural Upgrade History */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-stone-200/90 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5">
          <History className="w-6 h-6 text-[#0F766E]" />
          <h3 className="text-xl font-bold text-slate-900">
            Nhật ký Điểm Phát âm & Câu Nâng cấp B1 (Natural Upgrades)
          </h3>
        </div>

        {progress.history.length === 0 ? (
          <p className="text-slate-500 text-base py-6 text-center">
            Hoàn thành bài luyện tập hôm nay để lưu điểm phát âm và câu nâng cấp
            từ AI tại đây.
          </p>
        ) : (
          <div className="space-y-3">
            {progress.history.map((h) => (
              <div
                key={h.id}
                className="p-5 rounded-2xl bg-[#FAF8F5] border border-stone-200/90 space-y-2.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="font-bold text-slate-900 text-lg">
                      {h.lessonTitle}
                    </span>
                    <span className="ml-2 text-xs text-slate-500">
                      ({h.date})
                    </span>
                  </div>
                  <span className="px-3.5 py-1 rounded-full bg-emerald-100 text-emerald-900 font-extrabold text-sm">
                    Điểm phát âm: {h.score}/100
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-white border border-stone-200 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-extrabold text-[#0F766E] uppercase tracking-wider">
                      ✨ Câu Natural Upgrade (Chuẩn văn phong Giáo viên bản xứ):
                    </span>
                    <button
                      type="button"
                      onClick={() => onSpeak(h.naturalUpgrade, 0.8)}
                      className="px-3 py-1 rounded-lg bg-teal-50 text-[#0F766E] font-bold text-xs hover:bg-teal-100 transition inline-flex items-center gap-1"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>Nghe 0.8x</span>
                    </button>
                  </div>
                  <p className="text-base sm:text-lg font-bold text-slate-900 leading-relaxed">
                    “{h.naturalUpgrade}”
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
