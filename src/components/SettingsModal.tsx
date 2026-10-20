'use client';

import React, { useState } from 'react';
import { X, KeyRound, CheckCircle2, Sparkles, ShieldCheck, User } from 'lucide-react';
import { AppSettings, saveSettings } from '@/lib/storage';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSettings: AppSettings;
  onSave: (updated: AppSettings) => void;
}

export default function SettingsModal({
  isOpen,
  onClose,
  initialSettings,
  onSave,
}: SettingsModalProps) {
  const [provider, setProvider] = useState<'gemini' | 'openai'>(
    initialSettings.provider
  );
  const [apiKey, setApiKey] = useState<string>(initialSettings.apiKey);
  const [teacherName, setTeacherName] = useState<string>(
    initialSettings.teacherName
  );
  const [subject, setSubject] = useState<string>(initialSettings.subject);
  const [savedNotice, setSavedNotice] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: AppSettings = {
      provider,
      apiKey: apiKey.trim(),
      teacherName: teacherName.trim() || 'Thầy/Cô',
      subject: subject.trim() || 'Giáo viên',
      dailyGoalMinutes: initialSettings.dailyGoalMinutes || 15,
    };
    saveSettings(updated);
    onSave(updated);
    setSavedNotice(true);
    setTimeout(() => {
      setSavedNotice(false);
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 md:p-8 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center">
              <KeyRound className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Cài đặt & Kết nối AI
              </h2>
              <p className="text-sm text-slate-500">
                Cá nhân hóa hồ sơ giáo viên và cấu hình API Key
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
            aria-label="Đóng"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSave} className="mt-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Danh xưng của Thầy/Cô
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  value={teacherName}
                  onChange={(e) => setTeacherName(e.target.value)}
                  placeholder="VD: Cô Thanh Lan"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-600 text-base"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Cấp học / Bộ môn
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="VD: Giáo viên THPT"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-600 text-base"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Nền tảng AI Chấm & Nâng cấp câu (Cuối bài học)
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setProvider('gemini')}
                className={`py-3 px-4 rounded-xl border text-left transition flex items-center justify-between ${
                  provider === 'gemini'
                    ? 'border-teal-600 bg-teal-50/70 text-teal-900 font-semibold'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span>Google Gemini</span>
                <Sparkles className="w-4 h-4 text-teal-600" />
              </button>
              <button
                type="button"
                onClick={() => setProvider('openai')}
                className={`py-3 px-4 rounded-xl border text-left transition flex items-center justify-between ${
                  provider === 'openai'
                    ? 'border-teal-600 bg-teal-50/70 text-teal-900 font-semibold'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span>OpenAI (GPT-4o)</span>
                <Sparkles className="w-4 h-4 text-amber-600" />
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              {provider === 'gemini' ? 'Gemini API Key' : 'OpenAI API Key'} (Tùy chọn)
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={
                provider === 'gemini'
                  ? 'Nhập khóa AIzaSy... (hoặc để trống dùng AI Coach mặc định)'
                  : 'Nhập khóa sk-... (hoặc để trống dùng AI Coach mặc định)'
              }
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-600 font-mono text-sm"
            />
            <div className="mt-2.5 flex items-start gap-2 text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100">
              <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
              <span>
                API Key được lưu an toàn trực tiếp trên trình duyệt của Thầy/Cô (
                <code>localStorage</code>). Ngay cả khi để trống, ứng dụng vẫn tích hợp
                sẵn <strong>Smart Pedagogical Coach</strong> để nhận xét và nâng cấp câu
                mẫu B1.
              </span>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 transition"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-semibold shadow-sm transition flex items-center gap-2"
            >
              {savedNotice ? (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  Đã lưu cài đặt!
                </>
              ) : (
                'Lưu thiết lập'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
