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
  onBackToDashboard: () => void;
}

type LevelTab = 1 | 2 | 3 | 4 | 5;

export default function PracticeFlow({
  lesson,
  settings,
  savedPhrases,
  onToggleSavePhrase,
  onCompleteLesson,
  onBackToDashboard,
}: PracticeFlowProps) {
  const [activeLevel, setActiveLevel] = useState<LevelTab>(1);

  // Speech hook
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

  // Level 1 state: active phrase index & comparisons per phrase id
  const [activePhraseIdx, setActivePhraseIdx] = useState<number>(0);
  const [level1Comparisons, setLevel1Comparisons] = useState<
    Record<string, ComparisonSummary>
  >({});
  const [level1Transcripts, setLevel1Transcripts] = useState<
    Record<string, string>
  >({});

  // Level 2 state: selected option index for each slot
  const [selectedSlots, setSelectedSlots] = useState<Record<string, number>>({
    slot1: 0,
    slot2: 0,
    slot3: 0,
  });
  const [level2Comparison, setLevel2Comparison] =
    useState<ComparisonSummary | null>(null);
  const [level2Transcript, setLevel2Transcript] = useState<string>('');

  // Level 3 state: active turn index (0, 1, 2), rescue revealed per turn, transcripts per turn
  const [activeTurnIdx, setActiveTurnIdx] = useState<number>(0);
  const [rescuedTurns, setRescuedTurns] = useState<Record<number, boolean>>({});
  const [level3Transcripts, setLevel3Transcripts] = useState<
    Record<number, string>
  >({});
  const [level3Comparisons, setLevel3Comparisons] = useState<
    Record<number, ComparisonSummary>
  >({});

  // Level 4 state: timer mode ('idle' | 'prep' | 'speaking' | 'done')
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

  // Build assembled sentence for Level 2
  const assembledLevel2Sentence = React.useMemo(() => {
    let sentence = lesson.level2.sentenceFrame;
    lesson.level2.slots.forEach((slot) => {
      const idx = selectedSlots[slot.id] ?? 0;
      const chosen = slot.options[idx]?.en || slot.options[0].en;
      sentence = sentence.replace(`[${slot.id}]`, chosen);
    });
    return sentence;
  }, [lesson.level2, selectedSlots]);

  // Sync live transcript into the active level's state
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

  // Countdown timer effect for Level 4
  useEffect(() => {
    if (timerPhase !== 'prep' && timerPhase !== 'speaking') return;

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          if (timerPhase === 'prep') {
            // Transition automatically from 30s prep to 90s speaking
            setTimerPhase('speaking');
            startListening(level4Transcript);
            return lesson.level4.speakSeconds;
          } else {
            // Speaking finished
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

  // Stop listening/speaking when switching tabs
  const switchTab = (tab: LevelTab) => {
    stopListening();
    stopSpeaking();
    setErrorMessage(null);
    setTranscript('');
    setActiveLevel(tab);
  };

  // Simulate speech helper (for quiet environment or Edge fallback)
  const handleSimulateSpeech = (sampleText: string) => {
    stopListening();
    setErrorMessage(null);
    setTranscript(sampleText);
  };

  // Submit for AI Evaluation at the end of Level 4
  const handleRunEvaluation = async () => {
    stopListening();
    stopSpeaking();
    setIsEvaluating(true);
    setActiveLevel(5);

    const l1Scores = Object.values(level1Comparisons).map((c) => c.accuracy);
    const avgL1Score =
      l1Scores.length > 0
        ? Math.round(l1Scores.reduce((a, b) => a + b, 0) / l1Scores.length)
        : 85;

    const combinedTranscript =
      level4Transcript.trim() ||
      Object.values(level3Transcripts).join(' ').trim() ||
      level2Transcript.trim() ||
      lesson.level4.modelResponse;

    try {
      const response = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lessonTitle: lesson.title,
          question: lesson.level4.question,
          modelResponse: lesson.level4.modelResponse,
          modelResponseVi: lesson.level4.modelResponseVi,
          userTranscript: combinedTranscript,
          level1Score: avgL1Score,
          provider: settings.provider,
          apiKey: settings.apiKey,
        }),
      });

      const data = await response.json();
      const result = data.evaluation as EvaluationResult;
      setEvaluation(result);
      setEvalSource(data.source || 'smart-coach');

      onCompleteLesson(
        lesson.id,
        lesson.vietnameseTitle,
        result.overallScore,
        combinedTranscript,
        result.naturalUpgrade.upgradedSentence
      );
    } catch {
      // Fallback
    } finally {
      setIsEvaluating(false);
    }
  };

  const isPhraseSaved = (id: string) =>
    savedPhrases.some((item) => item.id === id);

  const currentPhrase = lesson.level1[activePhraseIdx];
  const currentL1Comparison = level1Comparisons[currentPhrase.id];
  const currentL1Transcript = level1Transcripts[currentPhrase.id] || '';

  const currentTurn = lesson.level3.turns[activeTurnIdx];
  const currentL3Comparison = level3Comparisons[activeTurnIdx];
  const currentL3Transcript = level3Transcripts[activeTurnIdx] || '';

  return (
    <div className="max-w-4xl mx-auto">
      {/* Top Lesson Header */}
      <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-200/80 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <button
            onClick={onBackToDashboard}
            className="inline-flex items-center gap-2 text-slate-600 hover:text-teal-700 font-medium text-base transition"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Quay lại Danh sách bài học</span>
          </button>
          <div className="flex items-center gap-2">
            <span className="px-3.5 py-1 rounded-full bg-teal-50 text-teal-800 font-semibold text-sm border border-teal-200">
              {lesson.dayLabel} • {lesson.category}
            </span>
            <span className="px-3.5 py-1 rounded-full bg-amber-50 text-amber-800 font-semibold text-sm border border-amber-200">
              {lesson.cefrLevel} • {lesson.durationMinutes} phút
            </span>
          </div>
        </div>

        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 leading-snug">
          {lesson.vietnameseTitle}
        </h1>
        <p className="text-base md:text-lg text-teal-700 font-medium mt-1">
          {lesson.title}
        </p>

        {/* 4-Step Sequential Navigation Bar */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5 mt-6 pt-6 border-t border-slate-100">
          {[
            {
              step: 1 as LevelTab,
              label: 'Level 1 • Dễ',
              sub: 'Shadowing & Cụm từ',
              icon: Layers,
            },
            {
              step: 2 as LevelTab,
              label: 'Level 2 • Vừa',
              sub: 'Khung câu Q&A',
              icon: MessageSquare,
            },
            {
              step: 3 as LevelTab,
              label: 'Level 3 • Khá',
              sub: 'Hội thoại 3 lượt',
              icon: LifeBuoy,
            },
            {
              step: 4 as LevelTab,
              label: 'Level 4 • Khó',
              sub: 'Phản xạ 2 phút',
              icon: Clock,
            },
            {
              step: 5 as LevelTab,
              label: 'AI Tổng kết',
              sub: 'Sửa lỗi & Nâng cấp',
              icon: Sparkles,
            },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = activeLevel === item.step;
            return (
              <button
                key={item.step}
                onClick={() =>
                  item.step === 5 ? handleRunEvaluation() : switchTab(item.step)
                }
                className={`p-3.5 rounded-2xl border text-left transition flex flex-col justify-between ${
                  isActive
                    ? 'bg-teal-700 text-white border-teal-700 shadow-md'
                    : 'bg-slate-50/80 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span
                    className={`text-xs font-bold uppercase tracking-wider ${
                      isActive ? 'text-teal-100' : 'text-teal-700'
                    }`}
                  >
                    {item.label}
                  </span>
                  <Icon
                    className={`w-4 h-4 ${
                      isActive ? 'text-amber-300' : 'text-slate-400'
                    }`}
                  />
                </div>
                <span
                  className={`text-sm font-semibold leading-tight ${
                    isActive ? 'text-white' : 'text-slate-800'
                  }`}
                >
                  {item.sub}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* LEVEL 1: SHADOWING & CHUNKING */}
      {activeLevel === 1 && (
        <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-200/80 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <span className="text-sm font-bold uppercase tracking-wider text-teal-700">
                Cấp độ 1 • Shadowing & Chunking (Dễ)
              </span>
              <h2 className="text-xl md:text-2xl font-bold text-slate-900 mt-1">
                Nghe mẫu và đọc theo 3 câu giao tiếp cốt lõi
              </h2>
            </div>

            {/* Phrase Switcher (1 / 2 / 3) */}
            <div className="flex items-center gap-2">
              {lesson.level1.map((p, idx) => {
                const done = (level1Comparisons[p.id]?.accuracy ?? 0) >= 60;
                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      stopListening();
                      setTranscript('');
                      setActivePhraseIdx(idx);
                    }}
                    className={`px-4 py-2 rounded-xl font-bold text-base transition flex items-center gap-1.5 ${
                      activePhraseIdx === idx
                        ? 'bg-teal-700 text-white shadow-sm'
                        : done
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <span>Câu {idx + 1}</span>
                    {done && <CheckCircle2 className="w-4 h-4" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Phrase Card */}
          <div className="bg-slate-50 rounded-2xl p-6 md:p-8 border border-slate-200/90 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-teal-100/80 text-teal-900 text-sm font-semibold">
                Cụm từ trọng tâm (Collocation):{' '}
                <strong className="underline decoration-teal-500">
                  {currentPhrase.collocation}
                </strong>
              </span>

              <button
                onClick={() =>
                  onToggleSavePhrase({
                    id: currentPhrase.id,
                    english: currentPhrase.english,
                    ipa: currentPhrase.ipa,
                    vietnamese: currentPhrase.vietnamese,
                    lessonId: lesson.id,
                  })
                }
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-sm font-semibold border transition ${
                  isPhraseSaved(currentPhrase.id)
                    ? 'bg-amber-50 text-amber-800 border-amber-300'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {isPhraseSaved(currentPhrase.id) ? (
                  <>
                    <BookmarkCheck className="w-4 h-4 text-amber-600" />
                    <span>Đã lưu ôn tập</span>
                  </>
                ) : (
                  <>
                    <Bookmark className="w-4 h-4" />
                    <span>Lưu cụm từ</span>
                  </>
                )}
              </button>
            </div>

            {/* Big Clear English Sentence */}
            <p className="text-2xl md:text-3xl font-bold text-slate-900 leading-relaxed">
              “{currentPhrase.english}”
            </p>

            {/* IPA & Vietnamese Translation */}
            <div className="space-y-1.5 pt-1">
              <p className="text-lg font-mono text-teal-800 bg-white inline-block px-3.5 py-1 rounded-xl border border-slate-200">
                {currentPhrase.ipa}
              </p>
              <p className="text-lg md:text-xl text-slate-700 font-medium pt-1">
                🇻🇳 {currentPhrase.vietnamese}
              </p>
              <p className="text-sm md:text-base text-slate-600 bg-amber-50/90 border border-amber-200/80 rounded-xl p-3 mt-2">
                💡 <strong>Mẹo phát âm cho Thầy/Cô:</strong> {currentPhrase.tip}
              </p>
            </div>

            {/* Speed Audio Controls & Record Controls */}
            <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-slate-200/80">
              <button
                onClick={() =>
                  speak(currentPhrase.english, 0.8, `${currentPhrase.id}-0.8`)
                }
                className={`inline-flex items-center gap-2 px-5 py-3 rounded-2xl font-semibold text-base border transition ${
                  speakingTag === `${currentPhrase.id}-0.8`
                    ? 'bg-teal-700 text-white border-teal-700'
                    : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-100'
                }`}
              >
                <Volume2 className="w-5 h-5 text-teal-600 shrink-0" />
                <span>Nghe mẫu Chậm (0.8x)</span>
              </button>

              <button
                onClick={() =>
                  speak(currentPhrase.english, 1.0, `${currentPhrase.id}-1.0`)
                }
                className={`inline-flex items-center gap-2 px-5 py-3 rounded-2xl font-semibold text-base border transition ${
                  speakingTag === `${currentPhrase.id}-1.0`
                    ? 'bg-teal-700 text-white border-teal-700'
                    : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-100'
                }`}
              >
                <Volume2 className="w-5 h-5 text-teal-700 shrink-0" />
                <span>Nghe mẫu Chuẩn (1.0x)</span>
              </button>

              <button
                onClick={() =>
                  isListening ? stopListening() : startListening()
                }
                className={`inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-base shadow-sm transition ${
                  isListening
                    ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse'
                    : 'bg-teal-700 hover:bg-teal-800 text-white'
                }`}
              >
                {isListening ? (
                  <>
                    <MicOff className="w-5 h-5" />
                    <span>Đang thu âm... (Bấm để dừng)</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-5 h-5" />
                    <span>Thu âm giọng đọc</span>
                  </>
                )}
              </button>

              <button
                onClick={() => handleSimulateSpeech(currentPhrase.english)}
                className="inline-flex items-center gap-1.5 px-4 py-3 rounded-2xl text-sm font-medium text-slate-600 hover:text-slate-900 bg-white border border-dashed border-slate-300 hover:border-slate-400 transition"
                title="Thử nghiệm nhanh nếu đang ở nơi không tiện bật Micro"
              >
                <Wand2 className="w-4 h-4 text-amber-600" />
                <span>Giả lập đọc mẫu</span>
              </button>
            </div>
          </div>

          {errorMessage && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-base">
              ⚠️ {errorMessage}
            </div>
          )}

          {/* Word-by-word Green / Orange Comparison Result */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-lg font-bold text-slate-900">
                Kết quả đối chiếu phát âm từng từ:
              </h3>
              <div className="flex items-center gap-4 text-sm font-semibold">
                <span className="inline-flex items-center gap-1.5 text-emerald-700">
                  <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
                  Màu xanh: Đọc đúng
                </span>
                <span className="inline-flex items-center gap-1.5 text-amber-700">
                  <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />
                  Màu cam: Cần đọc lại (Bấm vào từ để nghe)
                </span>
              </div>
            </div>

            {currentL1Comparison ? (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2.5 pt-1">
                  {currentL1Comparison.words.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => speak(item.cleanWord, 0.8)}
                      title="Bấm để nghe lại từ này ở tốc độ 0.8x"
                      className={`px-3.5 py-2 rounded-xl text-xl font-bold border transition ${
                        item.status === 'correct'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                          : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100 underline decoration-wavy decoration-amber-500'
                      }`}
                    >
                      {item.word}
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-slate-100 text-base">
                  <p className="text-slate-600">
                    Giọng đọc nhận diện được:{' '}
                    <span className="font-semibold text-slate-900 italic">
                      “{currentL1Transcript}”
                    </span>
                  </p>
                  <span className="px-4 py-1.5 rounded-full bg-teal-50 text-teal-900 font-bold border border-teal-200">
                    Độ khớp: {currentL1Comparison.accuracy}% (
                    {currentL1Comparison.matchedCount}/
                    {currentL1Comparison.totalCount} từ)
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-slate-500 text-base py-2">
                Thầy/Cô hãy bấm <strong>“Thu âm giọng đọc”</strong> (hoặc nhập vào
                ô dưới đây) để hệ thống tô màu xanh các từ phát âm chuẩn và màu
                cam các từ cần luyện lại nhé.
              </p>
            )}

            {/* Manual input fallback for teachers practicing in quiet staff room */}
            <div className="pt-2">
              <input
                type="text"
                value={currentL1Transcript}
                onChange={(e) => {
                  const val = e.target.value;
                  setLevel1Transcripts((prev) => ({
                    ...prev,
                    [currentPhrase.id]: val,
                  }));
                  setLevel1Comparisons((prev) => ({
                    ...prev,
                    [currentPhrase.id]: compareTranscriptWithTarget(
                      currentPhrase.english,
                      val
                    ),
                  }));
                }}
                placeholder="Hoặc gõ/chỉnh sửa chuỗi văn bản nhận diện tại đây..."
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-base text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() =>
                setActivePhraseIdx((prev) => Math.max(0, prev - 1))
              }
              disabled={activePhraseIdx === 0}
              className="px-5 py-3 rounded-2xl border border-slate-200 text-slate-700 font-semibold disabled:opacity-40 hover:bg-slate-50 transition"
            >
              ← Câu trước
            </button>

            {activePhraseIdx < lesson.level1.length - 1 ? (
              <button
                onClick={() => {
                  stopListening();
                  setTranscript('');
                  setActivePhraseIdx((prev) => prev + 1);
                }}
                className="px-6 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-semibold transition inline-flex items-center gap-2"
              >
                <span>Sang Câu {activePhraseIdx + 2}</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={() => switchTab(2)}
                className="px-6 py-3 rounded-2xl bg-teal-700 hover:bg-teal-800 text-white font-bold shadow-sm transition inline-flex items-center gap-2"
              >
                <span>Sang Cấp độ 2: Khung câu Q&A</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* LEVEL 2: GUIDED Q&A (SENTENCE FRAMES) */}
      {activeLevel === 2 && (
        <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-200/80 space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <span className="text-sm font-bold uppercase tracking-wider text-teal-700">
              Cấp độ 2 • Guided Q&A (Vừa)
            </span>
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 mt-1">
              Ghép cụm từ vào Khung câu (Sentence Frame) và đọc to
            </h2>
          </div>

          {/* AI Question Box */}
          <div className="bg-teal-50/70 border border-teal-200 rounded-2xl p-6 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-bold uppercase tracking-wider text-teal-800">
                🤖 Câu hỏi từ AI Coach:
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    speak(lesson.level2.aiQuestion, 0.8, 'l2-q-0.8')
                  }
                  className="px-3.5 py-1.5 rounded-xl bg-white text-teal-800 border border-teal-200 text-sm font-semibold hover:bg-teal-100 transition inline-flex items-center gap-1.5"
                >
                  <Volume2 className="w-4 h-4" />
                  <span>0.8x</span>
                </button>
                <button
                  onClick={() =>
                    speak(lesson.level2.aiQuestion, 1.0, 'l2-q-1.0')
                  }
                  className="px-3.5 py-1.5 rounded-xl bg-white text-teal-800 border border-teal-200 text-sm font-semibold hover:bg-teal-100 transition inline-flex items-center gap-1.5"
                >
                  <Volume2 className="w-4 h-4" />
                  <span>1.0x</span>
                </button>
              </div>
            </div>
            <p className="text-xl md:text-2xl font-bold text-slate-900">
              “{lesson.level2.aiQuestion}”
            </p>
            <p className="text-base md:text-lg text-slate-600">
              🇻🇳 {lesson.level2.aiQuestionVi}
            </p>
          </div>

          {/* 3 Interactive Vocabulary Slots */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-900">
              Bước 1: Chọn 3 mảnh ghép từ vựng phù hợp với thực tế của Thầy/Cô
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {lesson.level2.slots.map((slot, sIdx) => (
                <div
                  key={slot.id}
                  className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2.5"
                >
                  <p className="text-sm font-bold text-teal-800 uppercase tracking-wide">
                    Ô trống {sIdx + 1}: [{slot.label}]
                  </p>
                  <div className="space-y-2">
                    {slot.options.map((opt, oIdx) => {
                      const isChosen = (selectedSlots[slot.id] ?? 0) === oIdx;
                      return (
                        <button
                          key={oIdx}
                          onClick={() =>
                            setSelectedSlots((prev) => ({
                              ...prev,
                              [slot.id]: oIdx,
                            }))
                          }
                          className={`w-full text-left p-3 rounded-xl border transition ${
                            isChosen
                              ? 'bg-teal-700 text-white border-teal-700 shadow-sm'
                              : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-100'
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

          {/* Assembled Sentence Frame Ready to Speak */}
          <div className="bg-amber-50/60 rounded-2xl p-6 border border-amber-200/90 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold uppercase tracking-wider text-amber-900">
                Bước 2: Khung câu trả lời hoàn chỉnh của Thầy/Cô
              </span>
              <span className="text-xs font-medium text-amber-800">
                Sentence Frame B1
              </span>
            </div>

            <p className="text-2xl md:text-3xl font-bold text-slate-900 leading-relaxed">
              “{assembledLevel2Sentence}”
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={() =>
                  speak(assembledLevel2Sentence, 0.8, 'l2-ans-0.8')
                }
                className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-white border border-slate-300 text-slate-800 font-semibold hover:bg-slate-100 transition"
              >
                <Volume2 className="w-5 h-5 text-teal-600" />
                <span>Nghe câu ghép (0.8x)</span>
              </button>

              <button
                onClick={() =>
                  speak(assembledLevel2Sentence, 1.0, 'l2-ans-1.0')
                }
                className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-white border border-slate-300 text-slate-800 font-semibold hover:bg-slate-100 transition"
              >
                <Volume2 className="w-5 h-5 text-teal-700" />
                <span>Nghe câu ghép (1.0x)</span>
              </button>

              <button
                onClick={() =>
                  isListening ? stopListening() : startListening()
                }
                className={`inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-base shadow-sm transition ${
                  isListening
                    ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse'
                    : 'bg-teal-700 hover:bg-teal-800 text-white'
                }`}
              >
                {isListening ? (
                  <>
                    <MicOff className="w-5 h-5" />
                    <span>Dừng thu âm</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-5 h-5" />
                    <span>Thu âm câu trả lời</span>
                  </>
                )}
              </button>

              <button
                onClick={() => handleSimulateSpeech(assembledLevel2Sentence)}
                className="inline-flex items-center gap-1.5 px-4 py-3 rounded-2xl text-sm font-medium text-slate-600 bg-white border border-dashed border-slate-300 hover:border-slate-400 transition"
              >
                <Wand2 className="w-4 h-4 text-amber-600" />
                <span>Giả lập giọng đọc</span>
              </button>
            </div>
          </div>

          {/* Level 2 Word Comparison */}
          {level2Comparison && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-900 text-lg">
                  Đánh giá câu trả lời của Thầy/Cô:
                </h4>
                <span className="px-3.5 py-1 rounded-full bg-emerald-50 text-emerald-800 font-bold text-sm border border-emerald-200">
                  Độ khớp: {level2Comparison.accuracy}%
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {level2Comparison.words.map((w, i) => (
                  <button
                    key={i}
                    onClick={() => speak(w.cleanWord, 0.8)}
                    className={`px-3 py-1.5 rounded-xl text-lg font-bold border ${
                      w.status === 'correct'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        : 'bg-amber-50 text-amber-800 border-amber-300'
                    }`}
                  >
                    {w.word}
                  </button>
                ))}
              </div>
              <p className="text-sm text-slate-500">
                Văn bản thu âm: “{level2Transcript}”
              </p>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => switchTab(1)}
              className="px-5 py-3 rounded-2xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition"
            >
              ← Quay lại Cấp độ 1
            </button>
            <button
              onClick={() => switchTab(3)}
              className="px-6 py-3 rounded-2xl bg-teal-700 hover:bg-teal-800 text-white font-bold shadow-sm transition inline-flex items-center gap-2"
            >
              <span>Sang Cấp độ 3: Hội thoại Tình huống</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* LEVEL 3: SITUATIONAL ROLE-PLAY (3 TURNS + RESCUE BUTTON) */}
      {activeLevel === 3 && (
        <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-200/80 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <span className="text-sm font-bold uppercase tracking-wider text-teal-700">
                Cấp độ 3 • Situational Role-play (Khá)
              </span>
              <h2 className="text-xl md:text-2xl font-bold text-slate-900 mt-1">
                Đối thoại 3 lượt theo tình huống thực tế
              </h2>
            </div>

            <div className="flex items-center gap-2">
              {lesson.level3.turns.map((t, idx) => (
                <button
                  key={t.turnNumber}
                  onClick={() => {
                    stopListening();
                    setTranscript('');
                    setActiveTurnIdx(idx);
                  }}
                  className={`px-4 py-2 rounded-xl font-bold text-base transition ${
                    activeTurnIdx === idx
                      ? 'bg-teal-700 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Lượt {t.turnNumber}/3
                </button>
              ))}
            </div>
          </div>

          {/* Scenario Banner */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 flex items-start gap-3">
            <GraduationCap className="w-6 h-6 text-teal-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-slate-900 text-base">
                Bối cảnh: {lesson.level3.scenario}
              </p>
              <p className="text-sm text-slate-600 mt-0.5">
                Người đối thoại: <strong>{lesson.level3.partnerRole}</strong>
              </p>
            </div>
          </div>

          {/* Partner AI Line */}
          <div className="bg-teal-50/60 rounded-2xl p-6 border border-teal-200 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-bold text-teal-900 uppercase tracking-wide">
                🗣️ {lesson.level3.partnerRole} (Lượt {currentTurn.turnNumber}):
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    speak(currentTurn.aiLine, 0.8, `l3-ai-${activeTurnIdx}-0.8`)
                  }
                  className="px-3.5 py-1.5 rounded-xl bg-white border border-teal-200 text-teal-800 text-sm font-semibold hover:bg-teal-100 transition inline-flex items-center gap-1"
                >
                  <Volume2 className="w-4 h-4" />
                  <span>Nghe 0.8x</span>
                </button>
                <button
                  onClick={() =>
                    speak(currentTurn.aiLine, 1.0, `l3-ai-${activeTurnIdx}-1.0`)
                  }
                  className="px-3.5 py-1.5 rounded-xl bg-white border border-teal-200 text-teal-800 text-sm font-semibold hover:bg-teal-100 transition inline-flex items-center gap-1"
                >
                  <Volume2 className="w-4 h-4" />
                  <span>Nghe 1.0x</span>
                </button>
              </div>
            </div>

            <p className="text-xl md:text-2xl font-bold text-slate-900 leading-relaxed">
              “{currentTurn.aiLine}”
            </p>
            <p className="text-base md:text-lg text-slate-600">
              🇻🇳 {currentTurn.aiLineVi}
            </p>
          </div>

          {/* Teacher Response Zone with Keywords + Rescue Button */}
          <div className="bg-white rounded-2xl p-6 border-2 border-slate-200 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Lượt đáp lại của Thầy/Cô:
                </h3>
                <p className="text-base text-slate-600 mt-0.5">
                  {currentTurn.hintVi}
                </p>
              </div>

              <button
                onClick={() =>
                  setRescuedTurns((prev) => ({
                    ...prev,
                    [activeTurnIdx]: !prev[activeTurnIdx],
                  }))
                }
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm border transition ${
                  rescuedTurns[activeTurnIdx]
                    ? 'bg-amber-100 text-amber-900 border-amber-300'
                    : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-300 shadow-xs'
                }`}
              >
                <LifeBuoy className="w-4 h-4 text-amber-600" />
                <span>
                  {rescuedTurns[activeTurnIdx]
                    ? 'Ẩn câu Cứu trợ'
                    : '🆘 Cứu trợ (Hiện nguyên câu tiếng Anh)'}
                </span>
              </button>
            </div>

            {/* 3-4 Keywords Pills */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Từ khóa gợi ý (Keywords):
              </p>
              <div className="flex flex-wrap gap-2.5">
                {currentTurn.keywords.map((kw, i) => (
                  <button
                    key={i}
                    onClick={() => speak(kw, 0.8)}
                    className="px-4 py-2 rounded-xl bg-teal-50 text-teal-900 border border-teal-200 font-bold text-lg hover:bg-teal-100 transition inline-flex items-center gap-2"
                  >
                    <span>🔑 {kw}</span>
                    <Volume2 className="w-4 h-4 text-teal-600" />
                  </button>
                ))}
              </div>
            </div>

            {/* Rescue Full Sentence Box (Only revealed when "Cứu trợ" is clicked) */}
            {rescuedTurns[activeTurnIdx] && (
              <div className="bg-amber-50/90 rounded-2xl p-5 border border-amber-300 space-y-2 animate-in fade-in duration-200">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-900">
                    ✨ Câu cứu trợ hoàn chỉnh (Thầy/Cô có thể nghe & đọc theo):
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        speak(
                          currentTurn.rescueSentence,
                          0.8,
                          `l3-res-${activeTurnIdx}-0.8`
                        )
                      }
                      className="px-3 py-1 rounded-lg bg-white border border-amber-300 text-amber-900 text-xs font-bold hover:bg-amber-100"
                    >
                      Nghe 0.8x
                    </button>
                    <button
                      onClick={() =>
                        speak(
                          currentTurn.rescueSentence,
                          1.0,
                          `l3-res-${activeTurnIdx}-1.0`
                        )
                      }
                      className="px-3 py-1 rounded-lg bg-white border border-amber-300 text-amber-900 text-xs font-bold hover:bg-amber-100"
                    >
                      Nghe 1.0x
                    </button>
                  </div>
                </div>
                <p className="text-xl md:text-2xl font-bold text-slate-900">
                  “{currentTurn.rescueSentence}”
                </p>
                <p className="text-base text-slate-700">
                  🇻🇳 {currentTurn.rescueSentenceVi}
                </p>
              </div>
            )}

            {/* Record Controls for Level 3 */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={() =>
                  isListening ? stopListening() : startListening()
                }
                className={`inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-base shadow-sm transition ${
                  isListening
                    ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse'
                    : 'bg-teal-700 hover:bg-teal-800 text-white'
                }`}
              >
                {isListening ? (
                  <>
                    <MicOff className="w-5 h-5" />
                    <span>Dừng thu âm</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-5 h-5" />
                    <span>Thu âm lượt nói {currentTurn.turnNumber}</span>
                  </>
                )}
              </button>

              <button
                onClick={() => handleSimulateSpeech(currentTurn.rescueSentence)}
                className="inline-flex items-center gap-1.5 px-4 py-3 rounded-2xl text-sm font-medium text-slate-600 bg-slate-50 border border-dashed border-slate-300 hover:border-slate-400 transition"
              >
                <Wand2 className="w-4 h-4 text-amber-600" />
                <span>Giả lập lượt nói</span>
              </button>
            </div>

            {currentL3Transcript && (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <p className="text-base text-slate-800">
                  <strong>Câu phản hồi của Thầy/Cô:</strong> “
                  {currentL3Transcript}”
                </p>
                {currentL3Comparison && (
                  <p className="text-sm text-teal-800 font-semibold">
                    Độ khớp với câu gợi ý: {currentL3Comparison.accuracy}%
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() =>
                activeTurnIdx > 0
                  ? setActiveTurnIdx((prev) => prev - 1)
                  : switchTab(2)
              }
              className="px-5 py-3 rounded-2xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition"
            >
              ← {activeTurnIdx > 0 ? 'Lượt trước' : 'Về Cấp độ 2'}
            </button>

            {activeTurnIdx < lesson.level3.turns.length - 1 ? (
              <button
                onClick={() => {
                  stopListening();
                  setTranscript('');
                  setActiveTurnIdx((prev) => prev + 1);
                }}
                className="px-6 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-semibold transition inline-flex items-center gap-2"
              >
                <span>Sang Lượt hội thoại {activeTurnIdx + 2}</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={() => switchTab(4)}
                className="px-6 py-3 rounded-2xl bg-teal-700 hover:bg-teal-800 text-white font-bold shadow-sm transition inline-flex items-center gap-2"
              >
                <span>Sang Cấp độ 4: Thử thách 2 Phút</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* LEVEL 4: THE 2-MINUTE TEACHER */}
      {activeLevel === 4 && (
        <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-200/80 space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <span className="text-sm font-bold uppercase tracking-wider text-teal-700">
              Cấp độ 4 • The 2-Minute Teacher (Khó)
            </span>
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 mt-1">
              {lesson.level4.promptTitle} (30s Chuẩn bị + 90s Nói tự do)
            </h2>
          </div>

          {/* Open Question Prompt */}
          <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-bold uppercase tracking-wider text-teal-800">
                🎯 Chủ đề chia sẻ tự do:
              </span>
              <button
                onClick={() => speak(lesson.level4.question, 0.8, 'l4-q')}
                className="px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-100 inline-flex items-center gap-1.5"
              >
                <Volume2 className="w-4 h-4 text-teal-700" />
                <span>Nghe câu hỏi (0.8x)</span>
              </button>
            </div>
            <p className="text-xl md:text-2xl font-bold text-slate-900">
              “{lesson.level4.question}”
            </p>
            <p className="text-base md:text-lg text-slate-600">
              🇻🇳 {lesson.level4.questionVi}
            </p>

            <div className="pt-3 border-t border-slate-200/80">
              <p className="text-sm font-bold text-slate-700 mb-2">
                Gợi ý dàn ý 3 bước giúp Thầy/Cô nói mạch lạc trong 90 giây:
              </p>
              <ul className="space-y-1.5 text-base text-slate-700">
                {lesson.level4.guidingPoints.map((pt, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-800 font-bold text-xs flex items-center justify-center shrink-0 mt-1">
                      {i + 1}
                    </span>
                    <span>{pt}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* 30s Prep & 90s Recording Countdown Widget */}
          <div className="bg-teal-900 text-white rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2 text-center md:text-left">
              <span className="inline-block px-3.5 py-1 rounded-full bg-teal-800 text-teal-200 text-xs font-bold uppercase tracking-wider">
                {timerPhase === 'idle' && 'Sẵn sàng bấm giờ'}
                {timerPhase === 'prep' &&
                  '⏳ Đang đếm ngược 30 giây Chuẩn bị ý tưởng'}
                {timerPhase === 'speaking' &&
                  '🎙️ Đang thu âm 90 giây Chia sẻ tự do'}
                {timerPhase === 'done' && '✅ Đã hoàn thành thời gian chia sẻ'}
              </span>
              <div className="text-4xl md:text-5xl font-extrabold tracking-tight font-mono">
                {Math.floor(secondsLeft / 60)}:
                {String(secondsLeft % 60).padStart(2, '0')}
              </div>
              <p className="text-teal-100 text-sm md:text-base max-w-md">
                {timerPhase === 'prep'
                  ? 'Thầy/Cô hãy nhẩm trước các từ khóa. Khi hết 30 giây, Micro sẽ tự động bật.'
                  : 'Đừng lo lắng về ngữ pháp nhỏ — sự trôi chảy và truyền cảm hứng mới là điều quan trọng nhất!'}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3">
              {timerPhase === 'idle' && (
                <>
                  <button
                    onClick={() => {
                      setSecondsLeft(lesson.level4.prepSeconds);
                      setTimerPhase('prep');
                    }}
                    className="px-5 py-3.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-base transition inline-flex items-center gap-2"
                  >
                    <Clock className="w-5 h-5" />
                    <span>Bắt đầu 30s Chuẩn bị</span>
                  </button>
                  <button
                    onClick={() => {
                      setSecondsLeft(lesson.level4.speakSeconds);
                      setTimerPhase('speaking');
                      startListening(level4Transcript);
                    }}
                    className="px-6 py-3.5 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-base border border-teal-400 transition inline-flex items-center gap-2"
                  >
                    <Mic className="w-5 h-5" />
                    <span>Thu âm ngay (90s)</span>
                  </button>
                </>
              )}

              {timerPhase === 'prep' && (
                <button
                  onClick={() => {
                    setSecondsLeft(lesson.level4.speakSeconds);
                    setTimerPhase('speaking');
                    startListening(level4Transcript);
                  }}
                  className="px-6 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-base transition inline-flex items-center gap-2"
                >
                  <Mic className="w-5 h-5" />
                  <span>Đã sẵn sàng • Nói ngay!</span>
                </button>
              )}

              {timerPhase === 'speaking' && (
                <button
                  onClick={() => {
                    stopListening();
                    setTimerPhase('done');
                  }}
                  className="px-6 py-3.5 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-base animate-pulse transition inline-flex items-center gap-2"
                >
                  <MicOff className="w-5 h-5" />
                  <span>Dừng thu âm</span>
                </button>
              )}

              <button
                onClick={() => {
                  stopListening();
                  setTimerPhase('idle');
                  setSecondsLeft(lesson.level4.prepSeconds);
                }}
                className="p-3.5 rounded-2xl bg-teal-800 hover:bg-teal-700 text-teal-100 transition"
                title="Đặt lại đồng hồ"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Transcript Textarea + Quick Demo Fill */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="font-bold text-slate-800 text-base">
                Nội dung bài nói của Thầy/Cô (Transcript):
              </label>
              <button
                onClick={() => {
                  setLevel4Transcript(lesson.level4.modelResponse);
                  setTimerPhase('done');
                }}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-teal-700 hover:text-teal-900"
              >
                <Wand2 className="w-4 h-4 text-amber-600" />
                <span>Điền đoạn nói mẫu để thử nghiệm AI Sửa lỗi</span>
              </button>
            </div>
            <textarea
              rows={4}
              value={level4Transcript}
              onChange={(e) => setLevel4Transcript(e.target.value)}
              placeholder="Nội dung giọng đọc của Thầy/Cô sẽ tự động hiển thị tại đây khi thu âm, hoặc Thầy/Cô có thể gõ/chỉnh sửa trực tiếp..."
              className="w-full p-4 rounded-2xl border border-slate-200 text-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
            <button
              onClick={() => switchTab(3)}
              className="px-5 py-3 rounded-2xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition"
            >
              ← Quay lại Cấp độ 3
            </button>

            <button
              onClick={handleRunEvaluation}
              className="px-7 py-4 rounded-2xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-lg shadow-md transition inline-flex items-center gap-2.5"
            >
              <Sparkles className="w-5 h-5 text-amber-300" />
              <span>Hoàn thành & Nhận đánh giá từ AI</span>
            </button>
          </div>
        </div>
      )}

      {/* LEVEL 5: SMART AI EVALUATION & NATURAL UPGRADE */}
      {activeLevel === 5 && (
        <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-200/80 space-y-6">
          {isEvaluating || !evaluation ? (
            <div className="py-16 text-center space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-teal-50 text-teal-700 flex items-center justify-center mx-auto animate-bounce">
                <Sparkles className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900">
                AI Coach đang phân tích giọng đọc và nâng cấp câu cho Thầy/Cô...
              </h3>
              <p className="text-slate-500 text-base">
                Quá trình này chỉ mất khoảng vài giây.
              </p>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div className="flex items-center gap-3.5">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-extrabold text-2xl">
                    {evaluation.overallScore}
                  </div>
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-teal-700">
                      Báo cáo Sửa lỗi Thông minh • Nguồn:{' '}
                      {evalSource === 'gemini'
                        ? 'Google Gemini AI'
                        : evalSource === 'openai'
                        ? 'OpenAI GPT'
                        : 'Smart Pedagogical Coach'}
                    </span>
                    <h2 className="text-2xl font-bold text-slate-900">
                      Chúc mừng Thầy/Cô đã hoàn thành bài luyện 15 phút hôm nay!
                    </h2>
                  </div>
                </div>

                <button
                  onClick={onBackToDashboard}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm transition"
                >
                  Lưu kết quả & Về trang chủ
                </button>
              </div>

              {/* 1. Encouraging Fluency Praise */}
              <div className="bg-emerald-50/80 rounded-2xl p-6 border border-emerald-200 space-y-2">
                <div className="flex items-center gap-2 text-emerald-900 font-bold text-lg">
                  <Award className="w-6 h-6 text-emerald-700" />
                  <span>1. Lời khen khích lệ độ trôi chảy (Fluency Praise)</span>
                </div>
                <p className="text-lg text-slate-800 leading-relaxed">
                  {evaluation.fluencyPraise}
                </p>
              </div>

              {/* 2. Top 2 Words to Adjust Pronunciation */}
              <div className="space-y-3">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Volume2 className="w-5 h-5 text-amber-600" />
                  <span>
                    2. Top 2 từ vựng cần tinh chỉnh phát âm (Kèm nút nghe chuẩn)
                  </span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {evaluation.pronunciationFixes.map((fix, idx) => (
                    <div
                      key={idx}
                      className="bg-amber-50/60 rounded-2xl p-5 border border-amber-200 space-y-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <span className="text-2xl font-extrabold text-slate-900">
                            {fix.word}
                          </span>
                          <span className="ml-2 text-base font-mono text-teal-800 bg-white px-2.5 py-0.5 rounded-lg border border-amber-200">
                            {fix.ipa}
                          </span>
                        </div>
                        <button
                          onClick={() =>
                            onToggleSavePhrase({
                              id: `fix-${lesson.id}-${fix.word}`,
                              english: fix.word,
                              ipa: fix.ipa,
                              vietnamese: fix.vietnamese,
                              lessonId: lesson.id,
                            })
                          }
                          className="p-2 rounded-xl bg-white border border-amber-200 text-amber-800 hover:bg-amber-100 transition"
                          title="Lưu từ này vào Sổ tay ôn tập"
                        >
                          <Bookmark className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-base font-medium text-slate-700">
                        Nghĩa: <strong>{fix.vietnamese}</strong>
                      </p>
                      <p className="text-sm text-slate-600 bg-white p-3 rounded-xl border border-amber-100">
                        💡 {fix.advice}
                      </p>
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={() =>
                            speak(fix.word, 0.8, `fix-${idx}-0.8`)
                          }
                          className="px-4 py-2 rounded-xl bg-white border border-amber-300 text-amber-900 font-semibold text-sm hover:bg-amber-100 transition inline-flex items-center gap-1.5"
                        >
                          <Volume2 className="w-4 h-4 text-teal-700" />
                          <span>Nghe chuẩn 0.8x</span>
                        </button>
                        <button
                          onClick={() =>
                            speak(fix.word, 1.0, `fix-${idx}-1.0`)
                          }
                          className="px-4 py-2 rounded-xl bg-white border border-amber-300 text-amber-900 font-semibold text-sm hover:bg-amber-100 transition inline-flex items-center gap-1.5"
                        >
                          <Volume2 className="w-4 h-4 text-teal-700" />
                          <span>Nghe chuẩn 1.0x</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 3. Natural Upgrade (30-40yo Native Teacher Style) */}
              <div className="bg-teal-50/70 rounded-2xl p-6 border border-teal-200 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-teal-900 font-bold text-lg">
                    <Sparkles className="w-6 h-6 text-teal-700" />
                    <span>
                      3. Natural Upgrade (Văn phong giáo viên bản xứ tuổi 30–40)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        speak(
                          evaluation.naturalUpgrade.upgradedSentence,
                          0.8,
                          'up-0.8'
                        )
                      }
                      className="px-4 py-2 rounded-xl bg-white border border-teal-200 text-teal-900 font-semibold text-sm hover:bg-teal-100 transition inline-flex items-center gap-1.5"
                    >
                      <Volume2 className="w-4 h-4" />
                      <span>Nghe mẫu 0.8x</span>
                    </button>
                    <button
                      onClick={() =>
                        speak(
                          evaluation.naturalUpgrade.upgradedSentence,
                          1.0,
                          'up-1.0'
                        )
                      }
                      className="px-4 py-2 rounded-xl bg-teal-700 text-white font-semibold text-sm hover:bg-teal-800 transition inline-flex items-center gap-1.5"
                    >
                      <Volume2 className="w-4 h-4" />
                      <span>Nghe mẫu 1.0x</span>
                    </button>
                  </div>
                </div>

                <p className="text-xl md:text-2xl font-bold text-slate-900 leading-relaxed bg-white p-5 rounded-2xl border border-teal-100">
                  “{evaluation.naturalUpgrade.upgradedSentence}”
                </p>

                <p className="text-base md:text-lg text-slate-700">
                  🇻🇳 <strong>Tạm dịch:</strong>{' '}
                  {evaluation.naturalUpgrade.vietnameseMeaning}
                </p>

                <p className="text-sm text-teal-800 bg-teal-100/60 p-3.5 rounded-xl">
                  ✨ <strong>Điểm đắt giá của cách diễn đạt này:</strong>{' '}
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
