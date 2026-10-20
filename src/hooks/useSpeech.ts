'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      [altIndex: number]: {
        transcript: string;
      };
    };
  };
}

export function useSpeech() {
  const [isSupported, setIsSupported] = useState<boolean>(true);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [speakingTag, setSpeakingTag] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const finalTranscriptRef = useRef<string>('');
  const preferredVoiceRef = useRef<SpeechSynthesisVoice | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Setup SpeechSynthesis voice selection
    const loadVoices = () => {
      if (!('speechSynthesis' in window)) return;
      const voices = window.speechSynthesis.getVoices();
      const englishVoices = voices.filter((v) => v.lang.startsWith('en'));
      const preferred =
        englishVoices.find((v) => v.name.includes('Google US English')) ||
        englishVoices.find((v) => v.name.includes('Natural')) ||
        englishVoices.find((v) => v.name.includes('Aria') || v.name.includes('Jenny')) ||
        englishVoices.find((v) => v.lang === 'en-US') ||
        englishVoices[0] ||
        null;
      preferredVoiceRef.current = preferred;
    };

    loadVoices();
    if ('speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    // 2. Check SpeechRecognition compatibility (Chrome / Edge)
    const win = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionInstance;
      webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
    };
    const SpeechRecognitionConstructor =
      win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRecognitionConstructor) {
      setIsSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const speak = useCallback((text: string, rate: 0.8 | 1.0 = 1.0, tag?: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    window.speechSynthesis.cancel();

    const cleanText = text.replace(/\[slot\d+\]/g, '...');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'en-US';
    utterance.rate = rate;
    utterance.pitch = 1.0;

    if (preferredVoiceRef.current) {
      utterance.voice = preferredVoiceRef.current;
    }

    const activeTag = tag || `${text}-${rate}`;
    setSpeakingTag(activeTag);

    utterance.onend = () => {
      setSpeakingTag(null);
    };
    utterance.onerror = () => {
      setSpeakingTag(null);
    };

    window.speechSynthesis.speak(utterance);
  }, []);

  const stopSpeaking = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setSpeakingTag(null);
    }
  }, []);

  const startListening = useCallback((initialText = '') => {
    setErrorMessage(null);
    if (typeof window === 'undefined') return;

    // Stop any ongoing TTS first so mic doesn't record speaker output
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setSpeakingTag(null);
    }

    const win = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionInstance;
      webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
    };
    const SpeechRecognitionConstructor =
      win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRecognitionConstructor) {
      setIsSupported(false);
      setErrorMessage(
        'Trình duyệt hiện tại chưa hỗ trợ nhận diện giọng nói. Thầy/Cô vui lòng mở trên Google Chrome hoặc dùng nút "Giả lập giọng đọc" bên dưới nhé.'
      );
      return;
    }

    try {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }

      const recognition = new SpeechRecognitionConstructor();
      recognition.lang = 'en-US';
      recognition.continuous = true;
      recognition.interimResults = true;

      finalTranscriptRef.current = initialText ? initialText + ' ' : '';
      setTranscript(initialText);

      recognition.onresult = (event: SpeechRecognitionEventLike) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const piece = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscriptRef.current += piece + ' ';
          } else {
            interim += piece;
          }
        }
        setTranscript((finalTranscriptRef.current + interim).trim());
      };

      recognition.onerror = (event: { error: string }) => {
        if (event.error === 'no-speech') {
          setErrorMessage('Chưa nghe rõ giọng đọc. Thầy/Cô hãy nói gần micro hơn nhé.');
        } else if (event.error === 'not-allowed') {
          setErrorMessage(
            'Trình duyệt chưa được cấp quyền Micro. Hãy bấm biểu tượng ổ khóa trên thanh địa chỉ để cho phép Micro hoặc dùng chế độ Giả lập.'
          );
        } else if (event.error === 'language-not-supported' || event.error === 'network') {
          setErrorMessage(
            'Dịch vụ giọng nói trên trình duyệt này đang bị giới hạn (thường gặp trên một số bản Edge). Thầy/Cô có thể dùng Google Chrome hoặc nhập/giả lập giọng đọc ngay bên dưới.'
          );
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
      setIsListening(true);
    } catch {
      setErrorMessage('Không thể khởi động Micro. Vui lòng thử lại hoặc dùng chế độ Giả lập.');
      setIsListening(false);
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }
    setIsListening(false);
  }, []);

  return {
    isSupported,
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
  };
}
