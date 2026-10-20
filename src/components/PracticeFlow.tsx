'use client';

import React, { useState, useEffect } from 'react';
import {
  Volume2,
  Mic,
  MicOff,
  CheckCircle2,
  Sparkles,
  LifeBuoy,
  Clock,
  ArrowRight,
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  Award,
  RotateCcw,
  Wand2,
  MessageSquare,
  Layers,
  GraduationCap,
} from 'lucide-react';
import {
  Lesson,
  EvaluationResult,
  SavedPhrase,
} from '@/types/lesson';
import { useSpeech } from '@/hooks/useSpeech';
import {
  compareTranscriptWithTarget,
  ComparisonSummary,
} from '@/lib/speechUtils';
import { AppSettings } from '@/lib/storage';
import { evaluateSpeakingClientSide } from '@/lib/aiEvaluator';

interface PracticeFlowProps {
  lesson: Lesson;
  settings: AppSettings;
  savedPhrases: SavedPhrase[];
  onToggleSavePhrase: (phrase: Omit<SavedPhrase, 'addedAt'>) => void;
  onCompleteLesson: (
    lessonId: number,
    lessonTitle: string,
    score: number,
    transcriptSummary: string,
    naturalUpgrade: string
  ) => void;
  onOpenLibrary: () => void;
}

type LevelTab = 1 | 2 | 3 | 4 | 5;

export default function PracticeFlow({
  lesson,
  settings,
  savedPhrases,
  onToggleSavePhrase,
  onCompleteLesson,
  onOpenLibrary,
}: PracticeFlowProps) {
  const [activeLevel, setActiveLevel] = useState<LevelTab>(1);

  const {
    isListening,
    transcript,
    setTranscript,
    errorMessage,
    setErrorMessage,
    speakingTag,
    speak,
    stopSpeaking,
    startListening,
    stopListening,
  } = useSpeech();

  // Level 1 state
  const [activePhraseIdx, setActivePhraseIdx] = useState<number>(0);
  const [level1Comparisons, setLevel1Comparisons] = useState<
    Record<string, ComparisonSummary>
  >({});
  const [level1Transcripts, setLevel1Transcripts] = useState<
    Record<string, string>
  >({});

  // Level 2 state
  const [selectedSlots, setSelectedSlots] = useState<Record<string, number>>({
    slot1: 0,
    slot2: 0,
    slot3: 0,
  });
  const [level2Comparison, setLevel2Comparison] =
    useState<ComparisonSummary | null>(null);
  const [level2Transcript, setLevel2Transcript] = useState<string>('');

  // Level 3 state
  const [activeTurnIdx, setActiveTurnIdx] = useState<number>(0);
  const [rescuedTurns, setRescuedTurns] = useState<Record<number, boolean>>({});
  const [level3Transcripts, setLevel3Transcripts] = useState<
    Record<number, string>
  >({});
  const [level3Comparisons, setLevel3Comparisons] = useState<
    Record<number, ComparisonSummary>
  >({});

  // Level 4 state
  const [timerPhase, setTimerPhase] = useState<
    'idle' | 'prep' | 'speaking' | 'done'
  >('idle');
  const [secondsLeft, setSecondsLeft] = useState<number>(
    lesson.level4.prepSeconds
  );
  const [level4Transcript, setLevel4Transcript] = useState<string>('');

  // Final AI Evaluation state
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const [evalSource, setEvalSource] = useState<string>('');

  // Reset level 1 index when lesson changes
  useEffect(() => {
    setActiveLevel(1);
    setActivePhraseIdx(0);
    setActiveTurnIdx(0);
    setTimerPhase('idle');
    setSecondsLeft(lesson.level4.prepSeconds);
    setEvaluation(null);
  }, [lesson.id, lesson.level4.prepSeconds]);

  const assembledLevel2Sentence = React.useMemo(() => {
    let sentence = lesson.level2.sentenceFrame;
    lesson.level2.slots.forEach((slot) => {
      const idx = selectedSlots[slot.id] ?? 0;
      const chosen = slot.options[idx]?.en || slot.options[0].en;
      sentence = sentence.replace(`[${slot.id}]`, chosen);
    });
    return sentence;
  }, [lesson.level2, selectedSlots]);

  useEffect(() => {
    if (!transcript) return;

    if (activeLevel === 1) {
      const currentPhrase = lesson.level1[activePhraseIdx];
      if (!currentPhrase) return;
      setLevel1Transcripts((prev) => ({
        ...prev,
        [currentPhrase.id]: transcript,
      }));
      const summary = compareTranscriptWithTarget(
        currentPhrase.english,
        transcript
      );
      setLevel1Comparisons((prev) => ({
        ...prev,
        [currentPhrase.id]: summary,
      }));
    } else if (activeLevel === 2) {
      setLevel2Transcript(transcript);
      const summary = compareTranscriptWithTarget(
        assembledLevel2Sentence,
        transcript
      );
      setLevel2Comparison(summary);
    } else if (activeLevel === 3) {
      const currentTurn = lesson.level3.turns[activeTurnIdx];
      if (!currentTurn) return;
      setLevel3Transcripts((prev) => ({
        ...prev,
        [activeTurnIdx]: transcript,
      }));
      const summary = compareTranscriptWithTarget(
        currentTurn.rescueSentence,
        transcript
      );
      setLevel3Comparisons((prev) => ({
        ...prev,
        [activeTurnIdx]: summary,
      }));
    } else if (activeLevel === 4) {
      setLevel4Transcript(transcript);
    }
  }, [
    transcript,
    activeLevel,
    activePhraseIdx,
    activeTurnIdx,
    assembledLevel2Sentence,
    lesson,
  ]);

  useEffect(() => {
    if (timerPhase !== 'prep' && timerPhase !== 'speaking') return;

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          if (timerPhase === 'prep') {
            setTimerPhase('speaking');
            startListening(level4Transcript);
            return lesson.level4.speakSeconds;
          } else {
            stopListening();
            setTimerPhase('done');
            return 0;
          }
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [
    timerPhase,
    lesson.level4.speakSeconds,
    startListening,
    stopListening,
    level4Transcript,
  ]);

  const switchTab = (tab: LevelTab) => {
    stopListening();
    stopSpeaking();
    setErrorMessage(null);
    setTranscript('');
    setActiveLevel(tab);
  };

  const handleSimulateSpeech = (sampleText: string) => {
    stopListening();
    setErrorMessage(null);
    setTranscript(sampleText);
  };

  const handleRunEvaluation = async () => {
    stopListening();
    stopSpeaking();
    setIsEvaluating(true);
    setActiveLevel(5);

    const l1Scores = Object.values(level1Comparisons).map((c) => c.accuracy);
    const avgL1Score =
      l1Scores.length > 0
        ? Math.round(l1Scores.reduce((a, b) => a + b, 0) / l1Scores.length)
        : 86;

    const combinedTranscript =
      level4Transcript.trim() ||
      Object.values(level3Transcripts).join(' ').trim() ||
      level2Transcript.trim() ||
      lesson.level4.modelResponse;

    try {
      const data = await evaluateSpeakingClientSide({
        lessonTitle: lesson.title,
        question: lesson.level4.question,
        modelResponse: lesson.level4.modelResponse,
        modelResponseVi: lesson.level4.modelResponseVi,
        userTranscript: combinedTranscript,
        level1Score: avgL1Score,
        provider: settings.provider,
        apiKey: settings.apiKey,
      });

      setEvaluation(data.evaluation);
      setEvalSource(data.source);

      onCompleteLesson(
        lesson.id,
        lesson.vietnameseTitle,
        data.evaluation.overallScore,
        combinedTranscript,
        data.evaluation.naturalUpgrade.upgradedSentence
      );
    } finally {
      setIsEvaluating(false);
    }
  };

  const isPhraseSaved = (id: string) =>
    savedPhrases.some((item) => item.id === id);

  const currentPhrase = lesson.level1[activePhraseIdx] || lesson.level1[0];
  const currentL1Comparison = level1Comparisons[currentPhrase.id];
  const currentL1Transcript = level1Transcripts[currentPhrase.id] || '';

  const currentTurn =
    lesson.level3.turns[activeTurnIdx] || lesson.level3.turns[0];
  const currentL3Comparison = level3Comparisons[activeTurnIdx];
  const currentL3Transcript = level3Transcripts[activeTurnIdx] || '';

  // Reusable Thumb-Friendly Big Microphone Dock
  const renderThumbMicDock = (sampleToSimulate: string, label: string) => (
    <div className="bg-gradient-to-b from-[#FAF8F5] to-stone-100/90 rounded-3xl p-5 sm:p-6 border-2 border-stone-200/90 flex flex-col items-center text-center space-y-3.5 shadow-xs">
      {/* Pulse & Soundwave Animation Indicator */}
      <div className="relative flex items-center justify-center">
        {isListening && (
          <>
            <span className="absolute w-24 h-24 rounded-full bg-rose-500/25 animate-ping" />
            <span className="absolute w-28 h-28 rounded-full bg-rose-500/15 animate-pulse" />
          </>
        )}
        <button
          type="button"
          onClick={() => (isListening ? stopListening() : startListening())}
          className={`relative z-10 w-20 h-20 sm:w-22 sm:h-22 rounded-full flex flex-col items-center justify-center shadow-xl transition-transform active:scale-95 ${
            isListening
              ? 'bg-rose-600 hover:bg-rose-700 text-white ring-4 ring-rose-200'
              : 'bg-[#0F766E] hover:bg-teal-800 text-white ring-4 ring-teal-100'
          }`}
          aria-label={label}
        >
          {isListening ? (
            <MicOff className="w-9 h-9" />
          ) : (
            <Mic className="w-9 h-9" />
          )}
        </button>
      </div>

      {/* Animated Soundwave Bars while speaking */}
      {isListening ? (
        <div className="space-y-1">
          <div className="flex items-center justify-center gap-1.5 h-5">
            <span className="w-1.5 h-3 bg-rose-500 rounded-full animate-bounce" />
            <span className="w-1.5 h-5 bg-rose-600 rounded-full animate-pulse" />
            <span className="w-1.5 h-4 bg-rose-500 rounded-full animate-bounce" />
            <span className="w-1.5 h-5 bg-rose-600 rounded-full animate-pulse" />
            <span className="w-1.5 h-3 bg-rose-500 rounded-full animate-bounce" />
          </div>
          <p className="text-base font-extrabold text-rose-700">
            Đang lắng nghe giọng đọc của Thầy/Cô... (Chạm để dừng)
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          <p className="text-lg font-extrabold text-slate-900">{label}</p>
          <p className="text-sm text-slate-500">
            Chạm nút Micro lớn bằng ngón cái để bắt đầu nói
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={() => handleSimulateSpeech(sampleToSimulate)}
        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-[#D97706] bg-amber-50 hover:bg-amber-100 border border-amber-200 transition"
      >
        <Wand2 className="w-4 h-4" />
        <span>Giả lập giọng đọc mẫu (Nếu đang ở nơi yên tĩnh)</span>
      </button>
    </div>
  );

  return (
    <div className="space-y-5 pb-8">
      {/* Top Lesson Banner */}
      <div className="bg-white rounded-3xl p-5 sm:p-7 shadow-xs border border-stone-200/90">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <span className="px-3.5 py-1 rounded-full bg-teal-50 text-[#0F766E] font-extrabold text-xs sm:text-sm border border-teal-200">
              {lesson.dayLabel} • {lesson.category}
            </span>
            <span className="px-3 py-1 rounded-full bg-amber-50 text-[#D97706] font-extrabold text-xs sm:text-sm border border-amber-200">
              {lesson.cefrLevel}
            </span>
          </div>

          <button
            type="button"
            onClick={onOpenLibrary}
            className="inline-flex items-center gap-1.5 text-sm font-bold text-[#1E3A8A] hover:underline"
          >
            <span>Đổi bài học khác (7 Ngày)</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-900 leading-snug">
          {lesson.vietnameseTitle}
        </h1>
        <p className="text-base sm:text-lg text-[#0F766E] font-semibold mt-0.5">
          {lesson.title}
        </p>

        {/* 4-Step Sequential Level Pills */}
        <div className="grid grid-cols-5 gap-1.5 sm:gap-2.5 mt-5 pt-4 border-t border-stone-100">
          {[
            {
              step: 1 as LevelTab,
              short: 'Lv.1',
              title: 'Shadowing',
              icon: Layers,
            },
            {
              step: 2 as LevelTab,
              short: 'Lv.2',
              title: 'Khung câu',
              icon: MessageSquare,
            },
            {
              step: 3 as LevelTab,
              short: 'Lv.3',
              title: 'Hội thoại',
              icon: LifeBuoy,
            },
            {
              step: 4 as LevelTab,
              short: 'Lv.4',
              title: 'Nói 2 Phút',
              icon: Clock,
            },
            {
              step: 5 as LevelTab,
              short: 'AI',
              title: 'Sửa lỗi',
              icon: Sparkles,
            },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = activeLevel === item.step;
            return (
              <button
                key={item.step}
                type="button"
                onClick={() =>
                  item.step === 5 ? handleRunEvaluation() : switchTab(item.step)
                }
                className={`p-2.5 sm:p-3 rounded-2xl border text-center sm:text-left transition flex flex-col items-center sm:items-start justify-between ${
                  isActive
                    ? 'bg-[#0F766E] text-white border-[#0F766E] shadow-sm'
                    : 'bg-[#FAF8F5] hover:bg-stone-100 text-slate-700 border-stone-200'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span
                    className={`text-xs font-extrabold uppercase ${
                      isActive ? 'text-teal-100' : 'text-[#0F766E]'
                    }`}
                  >
                    {item.short}
                  </span>
                  <Icon
                    className={`w-3.5 h-3.5 hidden sm:block ${
                      isActive ? 'text-amber-300' : 'text-slate-400'
                    }`}
                  />
                </div>
                <span
                  className={`text-xs sm:text-sm font-bold mt-1 leading-tight ${
                    isActive ? 'text-white' : 'text-slate-800'
                  }`}
                >
                  {item.title}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* LEVEL 1: SHADOWING & CHUNKING */}
      {activeLevel === 1 && (
        <div className="bg-white rounded-3xl p-5 sm:p-7 shadow-xs border border-stone-200/90 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 pb-4">
            <div>
              <span className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-[#0F766E]">
                Level 1 • Shadowing & Chunking (Dễ)
              </span>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 mt-0.5">
                Nghe mẫu (0.8x / 1.0x) và đọc nhại lại 3 câu chủ điểm
              </h2>
            </div>

            <div className="flex items-center gap-2">
              {lesson.level1.map((p, idx) => {
                const done = (level1Comparisons[p.id]?.accuracy ?? 0) >= 60;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      stopListening();
                      setTranscript('');
                      setActivePhraseIdx(idx);
                    }}
                    className={`px-3.5 py-2 rounded-xl font-extrabold text-sm sm:text-base transition flex items-center gap-1.5 ${
                      activePhraseIdx === idx
                        ? 'bg-[#1E3A8A] text-white shadow-xs'
                        : done
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-stone-100 text-slate-700 hover:bg-stone-200'
                    }`}
                  >
                    <span>Câu {idx + 1}</span>
                    {done && <CheckCircle2 className="w-4 h-4" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Warm Educational Phrase Card */}
          <div className="bg-[#FAF8F5] rounded-3xl p-5 sm:p-7 border border-stone-200/90 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-teal-100/80 text-[#0F766E] text-sm font-bold">
                Collocation:{' '}
                <strong className="underline">
                  {currentPhrase.collocation}
                </strong>
              </span>

              <button
                type="button"
                onClick={() =>
                  onToggleSavePhrase({
                    id: currentPhrase.id,
                    english: currentPhrase.english,
                    ipa: currentPhrase.ipa,
                    vietnamese: currentPhrase.vietnamese,
                    lessonId: lesson.id,
                  })
                }
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-sm font-bold border transition ${
                  isPhraseSaved(currentPhrase.id)
                    ? 'bg-amber-50 text-[#D97706] border-amber-300'
                    : 'bg-white text-slate-700 border-stone-200 hover:bg-stone-100'
                }`}
              >
                {isPhraseSaved(currentPhrase.id) ? (
                  <>
                    <BookmarkCheck className="w-4 h-4 text-[#D97706]" />
                    <span>Đã lưu Sổ tay</span>
                  </>
                ) : (
                  <>
                    <Bookmark className="w-4 h-4" />
                    <span>Lưu cụm từ</span>
                  </>
                )}
              </button>
            </div>

            {/* Extra Large Ergonomic Sentence */}
            <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-relaxed tracking-tight">
              “{currentPhrase.english}”
            </p>

            <div className="space-y-2">
              <p className="text-base sm:text-lg font-mono text-[#0F766E] bg-white inline-block px-3.5 py-1.5 rounded-xl border border-stone-200">
                {currentPhrase.ipa}
              </p>
              <p className="text-lg sm:text-xl text-slate-800 font-semibold leading-relaxed">
                🇻🇳 {currentPhrase.vietnamese}
              </p>
              <p className="text-base text-slate-700 bg-amber-50/90 border border-amber-200/80 rounded-2xl p-3.5">
                💡 <strong>Mẹo phát âm:</strong> {currentPhrase.tip}
              </p>
            </div>

            {/* 0.8x and 1.0x Listen Buttons */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() =>
                  speak(currentPhrase.english, 0.8, `${currentPhrase.id}-0.8`)
                }
                className={`py-3.5 px-4 rounded-2xl font-bold text-base border transition flex items-center justify-center gap-2 ${
                  speakingTag === `${currentPhrase.id}-0.8`
                    ? 'bg-[#1E3A8A] text-white border-[#1E3A8A]'
                    : 'bg-white text-slate-800 border-stone-300 hover:bg-stone-100'
                }`}
              >
                <Volume2 className="w-5 h-5 text-[#0F766E] shrink-0" />
                <span>Nghe Chậm (0.8x)</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  speak(currentPhrase.english, 1.0, `${currentPhrase.id}-1.0`)
                }
                className={`py-3.5 px-4 rounded-2xl font-bold text-base border transition flex items-center justify-center gap-2 ${
                  speakingTag === `${currentPhrase.id}-1.0`
                    ? 'bg-[#1E3A8A] text-white border-[#1E3A8A]'
                    : 'bg-white text-slate-800 border-stone-300 hover:bg-stone-100'
                }`}
              >
                <Volume2 className="w-5 h-5 text-[#1E3A8A] shrink-0" />
                <span>Nghe Chuẩn (1.0x)</span>
              </button>
            </div>
          </div>

          {/* Thumb-Friendly Microphone Dock */}
          {renderThumbMicDock(
            currentPhrase.english,
            `Thu âm Câu ${activePhraseIdx + 1}/3`
          )}

          {errorMessage && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 text-base">
              ⚠️ {errorMessage}
            </div>
          )}

          {/* Green / Orange Word Comparison Result */}
          <div className="bg-[#FAF8F5] rounded-2xl p-5 sm:p-6 border border-stone-200 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-lg font-extrabold text-slate-900">
                Đối chiếu giọng đọc từng từ:
              </h3>
              <div className="flex items-center gap-3 text-xs sm:text-sm font-bold">
                <span className="inline-flex items-center gap-1.5 text-emerald-800">
                  <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
                  Xanh: Đọc đúng
                </span>
                <span className="inline-flex items-center gap-1.5 text-[#D97706]">
                  <span className="w-3 h-3 rounded-full bg-[#D97706] inline-block" />
                  Cam: Cần đọc lại (Chạm để nghe)
                </span>
              </div>
            </div>

            {currentL1Comparison ? (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {currentL1Comparison.words.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => speak(item.cleanWord, 0.8)}
                      className={`px-3.5 py-2 rounded-xl text-lg sm:text-xl font-extrabold border transition ${
                        item.status === 'correct'
                          ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                          : 'bg-amber-50 text-amber-900 border-amber-300 underline decoration-wavy decoration-amber-500'
                      }`}
                    >
                      {item.word}
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-stone-200 text-base">
                  <p className="text-slate-700">
                    Nhận diện:{' '}
                    <span className="font-bold text-slate-900 italic">
                      “{currentL1Transcript}”
                    </span>
                  </p>
                  <span className="px-4 py-1 rounded-full bg-teal-50 text-[#0F766E] font-extrabold border border-teal-200">
                    Đạt {currentL1Comparison.accuracy}% (
                    {currentL1Comparison.matchedCount}/
                    {currentL1Comparison.totalCount} từ)
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-slate-600 text-base">
                Chạm nút Micro màu xanh bên trên và đọc to câu mẫu để kiểm tra
                các từ màu xanh (đúng) và màu cam (cần đọc lại).
              </p>
            )}
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() =>
                setActivePhraseIdx((prev) => Math.max(0, prev - 1))
              }
              disabled={activePhraseIdx === 0}
              className="px-5 py-3.5 rounded-2xl border border-stone-300 text-slate-700 font-bold disabled:opacity-40 hover:bg-stone-100 transition inline-flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Câu trước</span>
            </button>

            {activePhraseIdx < lesson.level1.length - 1 ? (
              <button
                type="button"
                onClick={() => {
                  stopListening();
                  setTranscript('');
                  setActivePhraseIdx((prev) => prev + 1);
                }}
                className="px-6 py-3.5 rounded-2xl bg-[#1E3A8A] hover:bg-blue-900 text-white font-bold transition inline-flex items-center gap-2"
              >
                <span>Sang Câu {activePhraseIdx + 2}</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => switchTab(2)}
                className="px-6 py-3.5 rounded-2xl bg-[#0F766E] hover:bg-teal-800 text-white font-extrabold shadow-sm transition inline-flex items-center gap-2"
              >
                <span>Sang Level 2: Khung câu Q&A</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* LEVEL 2: GUIDED Q&A */}
      {activeLevel === 2 && (
        <div className="bg-white rounded-3xl p-5 sm:p-7 shadow-xs border border-stone-200/90 space-y-6">
          <div className="border-b border-stone-100 pb-4">
            <span className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-[#0F766E]">
              Level 2 • Guided Q&A (Vừa)
            </span>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 mt-0.5">
              Ghép ý cá nhân vào Khung câu (Sentence Frame) và đọc to
            </h2>
          </div>

          <div className="bg-teal-50/70 border border-teal-200 rounded-2xl p-5 sm:p-6 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-extrabold uppercase tracking-wider text-[#0F766E]">
                🤖 Câu hỏi từ AI Coach:
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    speak(lesson.level2.aiQuestion, 0.8, 'l2-q-0.8')
                  }
                  className="px-3.5 py-1.5 rounded-xl bg-white text-[#0F766E] border border-teal-200 text-sm font-bold hover:bg-teal-100 transition inline-flex items-center gap-1"
                >
                  <Volume2 className="w-4 h-4" />
                  <span>0.8x</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    speak(lesson.level2.aiQuestion, 1.0, 'l2-q-1.0')
                  }
                  className="px-3.5 py-1.5 rounded-xl bg-white text-[#1E3A8A] border border-teal-200 text-sm font-bold hover:bg-teal-100 transition inline-flex items-center gap-1"
                >
                  <Volume2 className="w-4 h-4" />
                  <span>1.0x</span>
                </button>
              </div>
            </div>
            <p className="text-xl sm:text-2xl font-extrabold text-slate-900 leading-relaxed">
              “{lesson.level2.aiQuestion}”
            </p>
            <p className="text-base sm:text-lg text-slate-700">
              🇻🇳 {lesson.level2.aiQuestionVi}
            </p>
          </div>

          {/* 3 Interactive Slots */}
          <div className="space-y-3">
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
              1. Chạm chọn từ vựng cho 3 ô trống:
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {lesson.level2.slots.map((slot, sIdx) => (
                <div
                  key={slot.id}
                  className="bg-[#FAF8F5] rounded-2xl p-4 border border-stone-200 space-y-2.5"
                >
                  <p className="text-xs font-extrabold text-[#0F766E] uppercase tracking-wider">
                    Mảnh ghép {sIdx + 1}: [{slot.label}]
                  </p>
                  <div className="space-y-2">
                    {slot.options.map((opt, oIdx) => {
                      const isChosen = (selectedSlots[slot.id] ?? 0) === oIdx;
                      return (
                        <button
                          key={oIdx}
                          type="button"
                          onClick={() =>
                            setSelectedSlots((prev) => ({
                              ...prev,
                              [slot.id]: oIdx,
                            }))
                          }
                          className={`w-full text-left p-3.5 rounded-xl border transition ${
                            isChosen
                              ? 'bg-[#0F766E] text-white border-[#0F766E] shadow-xs'
                              : 'bg-white text-slate-800 border-stone-200 hover:bg-stone-100'
                          }`}
                        >
                          <p className="font-bold text-base leading-snug">
                            {opt.en}
                          </p>
                          <p
                            className={`text-sm mt-0.5 ${
                              isChosen ? 'text-teal-100' : 'text-slate-500'
                            }`}
                          >
                            {opt.vi}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Assembled Sentence Frame */}
          <div className="bg-amber-50/70 rounded-2xl p-5 sm:p-6 border border-amber-200 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-extrabold uppercase tracking-wider text-[#D97706]">
                2. Câu trả lời hoàn chỉnh của Thầy/Cô:
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    speak(assembledLevel2Sentence, 0.8, 'l2-ans-0.8')
                  }
                  className="px-3.5 py-1.5 rounded-xl bg-white border border-amber-300 text-slate-800 font-bold text-sm hover:bg-amber-100 inline-flex items-center gap-1.5"
                >
                  <Volume2 className="w-4 h-4 text-[#0F766E]" />
                  <span>Nghe 0.8x</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    speak(assembledLevel2Sentence, 1.0, 'l2-ans-1.0')
                  }
                  className="px-3.5 py-1.5 rounded-xl bg-white border border-amber-300 text-slate-800 font-bold text-sm hover:bg-amber-100 inline-flex items-center gap-1.5"
                >
                  <Volume2 className="w-4 h-4 text-[#1E3A8A]" />
                  <span>Nghe 1.0x</span>
                </button>
              </div>
            </div>

            <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-relaxed">
              “{assembledLevel2Sentence}”
            </p>
          </div>

          {/* Thumb-Friendly Mic Dock */}
          {renderThumbMicDock(
            assembledLevel2Sentence,
            'Thu âm đọc to Khung câu trả lời'
          )}

          {level2Comparison && (
            <div className="bg-[#FAF8F5] rounded-2xl p-5 border border-stone-200 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-slate-900 text-lg">
                  Kết quả đọc khung câu:
                </h4>
                <span className="px-3.5 py-1 rounded-full bg-emerald-100 text-emerald-900 font-extrabold text-sm">
                  Độ khớp: {level2Comparison.accuracy}%
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {level2Comparison.words.map((w, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => speak(w.cleanWord, 0.8)}
                    className={`px-3 py-1.5 rounded-xl text-lg font-bold border ${
                      w.status === 'correct'
                        ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                        : 'bg-amber-50 text-amber-900 border-amber-300'
                    }`}
                  >
                    {w.word}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => switchTab(1)}
              className="px-5 py-3.5 rounded-2xl border border-stone-300 text-slate-700 font-bold hover:bg-stone-100 transition"
            >
              ← Về Level 1
            </button>
            <button
              type="button"
              onClick={() => switchTab(3)}
              className="px-6 py-3.5 rounded-2xl bg-[#0F766E] hover:bg-teal-800 text-white font-extrabold shadow-sm transition inline-flex items-center gap-2"
            >
              <span>Sang Level 3: Đóng vai</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* LEVEL 3: SITUATIONAL ROLE-PLAY */}
      {activeLevel === 3 && (
        <div className="bg-white rounded-3xl p-5 sm:p-7 shadow-xs border border-stone-200/90 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 pb-4">
            <div>
              <span className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-[#0F766E]">
                Level 3 • Situational Role-play (Khá)
              </span>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 mt-0.5">
                Hội thoại 3 lượt theo tình huống sư phạm
              </h2>
            </div>

            <div className="flex items-center gap-2">
              {lesson.level3.turns.map((t, idx) => (
                <button
                  key={t.turnNumber}
                  type="button"
                  onClick={() => {
                    stopListening();
                    setTranscript('');
                    setActiveTurnIdx(idx);
                  }}
                  className={`px-3.5 py-2 rounded-xl font-extrabold text-sm sm:text-base transition ${
                    activeTurnIdx === idx
                      ? 'bg-[#1E3A8A] text-white shadow-xs'
                      : 'bg-stone-100 text-slate-700 hover:bg-stone-200'
                  }`}
                >
                  Lượt {t.turnNumber}/3
                </button>
              ))}
            </div>
          </div>

          <div className="bg-[#FAF8F5] rounded-2xl p-4 border border-stone-200 flex items-start gap-3">
            <GraduationCap className="w-6 h-6 text-[#0F766E] shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-slate-900 text-base">
                Tình huống: {lesson.level3.scenario}
              </p>
              <p className="text-sm text-slate-600 mt-0.5">
                Người đối thoại: <strong>{lesson.level3.partnerRole}</strong>
              </p>
            </div>
          </div>

          {/* Partner Line */}
          <div className="bg-teal-50/70 rounded-2xl p-5 sm:p-6 border border-teal-200 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-extrabold text-[#0F766E] uppercase">
                🗣️ {lesson.level3.partnerRole} (Lượt {currentTurn.turnNumber}):
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    speak(currentTurn.aiLine, 0.8, `l3-ai-${activeTurnIdx}-0.8`)
                  }
                  className="px-3 py-1.5 rounded-xl bg-white border border-teal-200 text-[#0F766E] text-sm font-bold"
                >
                  0.8x
                </button>
                <button
                  type="button"
                  onClick={() =>
                    speak(currentTurn.aiLine, 1.0, `l3-ai-${activeTurnIdx}-1.0`)
                  }
                  className="px-3 py-1.5 rounded-xl bg-white border border-teal-200 text-[#1E3A8A] text-sm font-bold"
                >
                  1.0x
                </button>
              </div>
            </div>

            <p className="text-xl sm:text-2xl font-extrabold text-slate-900 leading-relaxed">
              “{currentTurn.aiLine}”
            </p>
            <p className="text-base sm:text-lg text-slate-700">
              🇻🇳 {currentTurn.aiLineVi}
            </p>
          </div>

          {/* Keywords + Rescue Button */}
          <div className="bg-[#FAF8F5] rounded-2xl p-5 sm:p-6 border border-stone-200 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">
                  Từ khóa gợi ý cho Thầy/Cô:
                </h3>
                <p className="text-base text-slate-700 mt-0.5">
                  {currentTurn.hintVi}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setRescuedTurns((prev) => ({
                    ...prev,
                    [activeTurnIdx]: !prev[activeTurnIdx],
                  }))
                }
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-extrabold text-sm bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-300 transition"
              >
                <LifeBuoy className="w-4 h-4 text-[#D97706]" />
                <span>
                  {rescuedTurns[activeTurnIdx]
                    ? 'Ẩn câu Cứu trợ'
                    : '🆘 Cứu trợ (Xem nguyên câu)'}
                </span>
              </button>
            </div>

            <div className="flex flex-wrap gap-2.5">
              {currentTurn.keywords.map((kw, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => speak(kw, 0.8)}
                  className="px-4 py-2.5 rounded-xl bg-white text-[#1E3A8A] border border-stone-300 font-extrabold text-base sm:text-lg hover:bg-teal-50 transition inline-flex items-center gap-2"
                >
                  <span>🔑 {kw}</span>
                  <Volume2 className="w-4 h-4 text-[#0F766E]" />
                </button>
              ))}
            </div>

            {rescuedTurns[activeTurnIdx] && (
              <div className="bg-amber-50 rounded-2xl p-5 border border-amber-300 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-extrabold uppercase text-[#D97706]">
                    ✨ Câu cứu trợ hoàn chỉnh:
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        speak(
                          currentTurn.rescueSentence,
                          0.8,
                          `l3-res-${activeTurnIdx}-0.8`
                        )
                      }
                      className="px-3 py-1 rounded-lg bg-white border border-amber-300 text-amber-950 text-xs font-bold"
                    >
                      Nghe 0.8x
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        speak(
                          currentTurn.rescueSentence,
                          1.0,
                          `l3-res-${activeTurnIdx}-1.0`
                        )
                      }
                      className="px-3 py-1 rounded-lg bg-white border border-amber-300 text-amber-950 text-xs font-bold"
                    >
                      Nghe 1.0x
                    </button>
                  </div>
                </div>
                <p className="text-xl sm:text-2xl font-extrabold text-slate-900">
                  “{currentTurn.rescueSentence}”
                </p>
                <p className="text-base text-slate-700">
                  🇻🇳 {currentTurn.rescueSentenceVi}
                </p>
              </div>
            )}
          </div>

          {renderThumbMicDock(
            currentTurn.rescueSentence,
            `Thu âm Lượt đối thoại ${currentTurn.turnNumber}/3`
          )}

          {currentL3Transcript && (
            <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-stone-200 space-y-1.5">
              <p className="text-base text-slate-800">
                <strong>Câu Thầy/Cô vừa nói:</strong> “{currentL3Transcript}”
              </p>
              {currentL3Comparison && (
                <p className="text-sm text-[#0F766E] font-bold">
                  Độ khớp ý & từ vựng: {currentL3Comparison.accuracy}%
                </p>
              )}
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() =>
                activeTurnIdx > 0
                  ? setActiveTurnIdx((prev) => prev - 1)
                  : switchTab(2)
              }
              className="px-5 py-3.5 rounded-2xl border border-stone-300 text-slate-700 font-bold hover:bg-stone-100 transition"
            >
              ← {activeTurnIdx > 0 ? 'Lượt trước' : 'Về Level 2'}
            </button>

            {activeTurnIdx < lesson.level3.turns.length - 1 ? (
              <button
                type="button"
                onClick={() => {
                  stopListening();
                  setTranscript('');
                  setActiveTurnIdx((prev) => prev + 1);
                }}
                className="px-6 py-3.5 rounded-2xl bg-[#1E3A8A] hover:bg-blue-900 text-white font-bold transition inline-flex items-center gap-2"
              >
                <span>Sang Lượt {activeTurnIdx + 2}</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => switchTab(4)}
                className="px-6 py-3.5 rounded-2xl bg-[#0F766E] hover:bg-teal-800 text-white font-extrabold shadow-sm transition inline-flex items-center gap-2"
              >
                <span>Sang Level 4: Nói 2 Phút</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* LEVEL 4: THE 2-MINUTE TEACHER */}
      {activeLevel === 4 && (
        <div className="bg-white rounded-3xl p-5 sm:p-7 shadow-xs border border-stone-200/90 space-y-6">
          <div className="border-b border-stone-100 pb-4">
            <span className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-[#0F766E]">
              Level 4 • The 2-Minute Teacher (Khó)
            </span>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 mt-0.5">
              {lesson.level4.promptTitle} (30s Suy nghĩ + 90s Nói tự do)
            </h2>
          </div>

          <div className="bg-[#FAF8F5] rounded-2xl p-5 sm:p-6 border border-stone-200 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-extrabold uppercase tracking-wider text-[#1E3A8A]">
                🎯 Chủ đề mở:
              </span>
              <button
                type="button"
                onClick={() => speak(lesson.level4.question, 0.8, 'l4-q')}
                className="px-3.5 py-1.5 rounded-xl bg-white border border-stone-200 text-slate-800 text-sm font-bold inline-flex items-center gap-1.5"
              >
                <Volume2 className="w-4 h-4 text-[#0F766E]" />
                <span>Nghe câu hỏi (0.8x)</span>
              </button>
            </div>
            <p className="text-xl sm:text-2xl font-extrabold text-slate-900 leading-relaxed">
              “{lesson.level4.question}”
            </p>
            <p className="text-base sm:text-lg text-slate-700">
              🇻🇳 {lesson.level4.questionVi}
            </p>

            <div className="pt-3 border-t border-stone-200">
              <p className="text-sm font-extrabold text-slate-800 mb-2">
                Gợi ý 3 ý giúp Thầy/Cô triển khai trong 90 giây:
              </p>
              <ul className="space-y-2 text-base text-slate-700">
                {lesson.level4.guidingPoints.map((pt, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-teal-100 text-[#0F766E] font-extrabold text-xs flex items-center justify-center shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <span>{pt}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* 30s Prep & 90s Speaking Timer + Ergonomic Mic */}
          <div className="bg-gradient-to-br from-[#0F766E] to-[#1E3A8A] text-white rounded-3xl p-6 flex flex-col items-center text-center space-y-4 shadow-md">
            <span className="px-4 py-1 rounded-full bg-white/15 text-teal-100 text-xs font-extrabold uppercase tracking-wider">
              {timerPhase === 'idle' && 'Đồng hồ Phản xạ 2 Phút'}
              {timerPhase === 'prep' && '⏳ 30 giây Chuẩn bị ý tưởng'}
              {timerPhase === 'speaking' && '🎙️ 90 giây Đang thu âm tự do'}
              {timerPhase === 'done' && '✅ Đã hoàn thành lượt chia sẻ'}
            </span>

            <div className="text-5xl font-extrabold font-mono tracking-tight">
              {Math.floor(secondsLeft / 60)}:
              {String(secondsLeft % 60).padStart(2, '0')}
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
              {timerPhase === 'idle' && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setSecondsLeft(lesson.level4.prepSeconds);
                      setTimerPhase('prep');
                    }}
                    className="px-5 py-3.5 rounded-2xl bg-[#D97706] hover:bg-amber-600 text-white font-extrabold text-base shadow-sm transition inline-flex items-center gap-2"
                  >
                    <Clock className="w-5 h-5" />
                    <span>Bắt đầu 30s Chuẩn bị</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSecondsLeft(lesson.level4.speakSeconds);
                      setTimerPhase('speaking');
                      startListening(level4Transcript);
                    }}
                    className="px-6 py-3.5 rounded-2xl bg-white text-[#0F766E] hover:bg-teal-50 font-extrabold text-base shadow-sm transition inline-flex items-center gap-2"
                  >
                    <Mic className="w-5 h-5" />
                    <span>Nói ngay (90s)</span>
                  </button>
                </>
              )}

              {timerPhase === 'prep' && (
                <button
                  type="button"
                  onClick={() => {
                    setSecondsLeft(lesson.level4.speakSeconds);
                    setTimerPhase('speaking');
                    startListening(level4Transcript);
                  }}
                  className="px-6 py-3.5 rounded-2xl bg-white text-[#0F766E] font-extrabold text-base transition inline-flex items-center gap-2"
                >
                  <Mic className="w-5 h-5" />
                  <span>Bỏ qua chuẩn bị • Bắt đầu nói!</span>
                </button>
              )}

              {timerPhase === 'speaking' && (
                <button
                  type="button"
                  onClick={() => {
                    stopListening();
                    setTimerPhase('done');
                  }}
                  className="px-7 py-4 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-lg animate-pulse ring-4 ring-rose-300 transition inline-flex items-center gap-2"
                >
                  <MicOff className="w-6 h-6" />
                  <span>Đang thu âm... (Chạm để dừng)</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  stopListening();
                  setTimerPhase('idle');
                  setSecondsLeft(lesson.level4.prepSeconds);
                }}
                className="p-3.5 rounded-2xl bg-white/15 hover:bg-white/25 text-white transition"
                title="Đặt lại đồng hồ"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="font-extrabold text-slate-900 text-base">
                Đoạn chia sẻ của Thầy/Cô (Transcript):
              </label>
              <button
                type="button"
                onClick={() => {
                  setLevel4Transcript(lesson.level4.modelResponse);
                  setTimerPhase('done');
                }}
                className="inline-flex items-center gap-1.5 text-sm font-bold text-[#D97706] hover:underline"
              >
                <Wand2 className="w-4 h-4" />
                <span>Điền đoạn mẫu để thử nghiệm AI Sửa lỗi</span>
              </button>
            </div>
            <textarea
              rows={4}
              value={level4Transcript}
              onChange={(e) => setLevel4Transcript(e.target.value)}
              placeholder="Nội dung giọng đọc sẽ tự động hiện tại đây khi nói, hoặc Thầy/Cô có thể nhập trực tiếp..."
              className="w-full p-4 rounded-2xl bg-[#FAF8F5] border border-stone-300 text-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={() => switchTab(3)}
              className="px-5 py-3.5 rounded-2xl border border-stone-300 text-slate-700 font-bold hover:bg-stone-100 transition"
            >
              ← Về Level 3
            </button>

            <button
              type="button"
              onClick={handleRunEvaluation}
              className="px-7 py-4 rounded-2xl bg-[#0F766E] hover:bg-teal-800 text-white font-extrabold text-lg shadow-md transition inline-flex items-center gap-2.5"
            >
              <Sparkles className="w-5 h-5 text-amber-300" />
              <span>Gửi AI Phân tích & Nâng cấp câu</span>
            </button>
          </div>
        </div>
      )}

      {/* LEVEL 5: AI EVALUATION REPORT */}
      {activeLevel === 5 && (
        <div className="bg-white rounded-3xl p-5 sm:p-7 shadow-xs border border-stone-200/90 space-y-6">
          {isEvaluating || !evaluation ? (
            <div className="py-14 text-center space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-teal-50 text-[#0F766E] flex items-center justify-center mx-auto animate-bounce">
                <Sparkles className="w-8 h-8" />
              </div>
              <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                Gemini AI Coach đang phân tích bài nói của Thầy/Cô...
              </h3>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-100 pb-5">
                <div className="flex items-center gap-3.5">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-900 flex items-center justify-center font-extrabold text-2xl">
                    {evaluation.overallScore}
                  </div>
                  <div>
                    <span className="text-xs font-extrabold uppercase tracking-wider text-[#0F766E]">
                      Đánh giá AI • Nguồn:{' '}
                      {evalSource === 'gemini'
                        ? 'Google Gemini API'
                        : evalSource === 'openai'
                        ? 'OpenAI API'
                        : 'Smart Pedagogical Coach'}
                    </span>
                    <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                      Hoàn thành xuất sắc bài luyện hôm nay!
                    </h2>
                  </div>
                </div>
              </div>

              {/* 1. Fluency Praise */}
              <div className="bg-emerald-50/80 rounded-2xl p-5 sm:p-6 border border-emerald-200 space-y-2">
                <div className="flex items-center gap-2 text-emerald-950 font-extrabold text-lg">
                  <Award className="w-6 h-6 text-[#0F766E]" />
                  <span>1. Lời khen khích lệ độ trôi chảy</span>
                </div>
                <p className="text-lg text-slate-800 leading-relaxed">
                  {evaluation.fluencyPraise}
                </p>
              </div>

              {/* 2. Top 2 Pronunciation Fixes */}
              <div className="space-y-3">
                <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                  <Volume2 className="w-5 h-5 text-[#D97706]" />
                  <span>
                    2. Top 2 từ cần chỉnh phát âm (Chạm để nghe chuẩn)
                  </span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {evaluation.pronunciationFixes.map((fix, idx) => (
                    <div
                      key={idx}
                      className="bg-[#FAF8F5] rounded-2xl p-5 border border-amber-200 space-y-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <span className="text-2xl font-extrabold text-slate-900">
                            {fix.word}
                          </span>
                          <span className="ml-2 text-base font-mono text-[#0F766E] bg-white px-2.5 py-0.5 rounded-lg border border-stone-200">
                            {fix.ipa}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            onToggleSavePhrase({
                              id: `fix-${lesson.id}-${fix.word}`,
                              english: fix.word,
                              ipa: fix.ipa,
                              vietnamese: fix.vietnamese,
                              lessonId: lesson.id,
                            })
                          }
                          className="p-2 rounded-xl bg-white border border-stone-200 text-slate-700 hover:bg-amber-50"
                          title="Lưu từ này"
                        >
                          <Bookmark className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-base font-semibold text-slate-800">
                        Nghĩa: <strong>{fix.vietnamese}</strong>
                      </p>
                      <p className="text-sm text-slate-700 bg-white p-3 rounded-xl border border-stone-200">
                        💡 {fix.advice}
                      </p>
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() =>
                            speak(fix.word, 0.8, `fix-${idx}-0.8`)
                          }
                          className="px-4 py-2 rounded-xl bg-white border border-stone-300 text-slate-800 font-bold text-sm hover:bg-teal-50 inline-flex items-center gap-1.5"
                        >
                          <Volume2 className="w-4 h-4 text-[#0F766E]" />
                          <span>Nghe 0.8x</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            speak(fix.word, 1.0, `fix-${idx}-1.0`)
                          }
                          className="px-4 py-2 rounded-xl bg-[#0F766E] text-white font-bold text-sm hover:bg-teal-800 inline-flex items-center gap-1.5"
                        >
                          <Volume2 className="w-4 h-4" />
                          <span>Nghe 1.0x</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 3. Natural Upgrade */}
              <div className="bg-teal-50/80 rounded-2xl p-5 sm:p-6 border border-teal-200 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-[#0F766E] font-extrabold text-lg">
                    <Sparkles className="w-6 h-6" />
                    <span>
                      3. Natural Upgrade (Văn phong Giáo viên bản xứ 30–40 tuổi)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        speak(
                          evaluation.naturalUpgrade.upgradedSentence,
                          0.8,
                          'up-0.8'
                        )
                      }
                      className="px-3.5 py-2 rounded-xl bg-white border border-teal-200 text-[#0F766E] font-bold text-sm inline-flex items-center gap-1.5"
                    >
                      <Volume2 className="w-4 h-4" />
                      <span>0.8x</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        speak(
                          evaluation.naturalUpgrade.upgradedSentence,
                          1.0,
                          'up-1.0'
                        )
                      }
                      className="px-3.5 py-2 rounded-xl bg-[#0F766E] text-white font-bold text-sm inline-flex items-center gap-1.5"
                    >
                      <Volume2 className="w-4 h-4" />
                      <span>1.0x</span>
                    </button>
                  </div>
                </div>

                <p className="text-xl sm:text-2xl font-extrabold text-slate-900 leading-relaxed bg-white p-5 rounded-2xl border border-teal-100">
                  “{evaluation.naturalUpgrade.upgradedSentence}”
                </p>

                <p className="text-base sm:text-lg text-slate-800">
                  🇻🇳 <strong>Tạm dịch:</strong>{' '}
                  {evaluation.naturalUpgrade.vietnameseMeaning}
                </p>

                <p className="text-sm text-teal-950 bg-teal-100/70 p-3.5 rounded-xl">
                  ✨ <strong>Điểm đắt giá:</strong>{' '}
                  {evaluation.naturalUpgrade.whyItWorks}
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
