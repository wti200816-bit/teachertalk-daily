'use client';

import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  Share,
  PlusSquare,
  Download,
  CheckCircle2,
  X,
  Sparkles,
} from 'lucide-react';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

interface PwaInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  deferredPrompt: BeforeInstallPromptEvent | null;
  onTriggerAndroidInstall: () => Promise<void>;
  isInstalled: boolean;
}

export default function PwaInstallModal({
  isOpen,
  onClose,
  deferredPrompt,
  onTriggerAndroidInstall,
  isInstalled,
}: PwaInstallModalProps) {
  const [selectedOs, setSelectedOs] = useState<'ios' | 'android'>('ios');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const ua = window.navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(ua)) {
      setSelectedOs('ios');
    } else if (deferredPrompt || /android/.test(ua)) {
      setSelectedOs('android');
    }
  }, [deferredPrompt]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-xs p-0 sm:p-4">
      <div className="bg-[#FAF8F5] rounded-t-3xl sm:rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-stone-200 animate-in slide-in-from-bottom-4 duration-200 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-stone-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#0F766E] text-white flex items-center justify-center shadow-sm">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-900">
                📲 Tải App về Điện thoại
              </h2>
              <p className="text-sm text-slate-600">
                Mở nhanh 1 chạm từ Màn hình chính như ứng dụng gốc
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-slate-500 hover:bg-stone-200/70 transition"
            aria-label="Đóng"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* OS Switcher */}
        <div className="grid grid-cols-2 gap-2.5 mt-5 bg-stone-200/70 p-1.5 rounded-2xl">
          <button
            type="button"
            onClick={() => setSelectedOs('ios')}
            className={`py-2.5 px-3 rounded-xl font-bold text-base transition ${
              selectedOs === 'ios'
                ? 'bg-white text-[#1E3A8A] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            🍎 iPhone / iPad (iOS)
          </button>
          <button
            type="button"
            onClick={() => setSelectedOs('android')}
            className={`py-2.5 px-3 rounded-xl font-bold text-base transition ${
              selectedOs === 'android'
                ? 'bg-white text-[#0F766E] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            🤖 Android / Chrome
          </button>
        </div>

        {selectedOs === 'ios' ? (
          <div className="mt-5 space-y-4">
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 text-base leading-relaxed">
              Trên <strong>iPhone / iPad (trình duyệt Safari)</strong>, Thầy/Cô
              chỉ cần làm <strong>2 bước đơn giản</strong> dưới đây để đưa biểu
              tượng <strong>TeacherTalk</strong> ra màn hình chính:
            </div>

            {/* Visual Step 1 */}
            <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-xs space-y-3">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-[#1E3A8A] text-white font-extrabold text-base flex items-center justify-center shrink-0">
                  1
                </span>
                <h3 className="text-lg font-bold text-slate-900">
                  Bấm nút “Chia sẻ” (Share) ở dưới trình duyệt
                </h3>
              </div>
              <p className="text-base text-slate-600 pl-11">
                Nhìn xuống thanh công cụ dưới đáy màn hình Safari và bấm vào
                biểu tượng hình vuông có mũi tên hướng lên:
              </p>
              {/* Illustrated Browser Bottom Bar */}
              <div className="ml-11 bg-slate-100 rounded-2xl p-3.5 border border-slate-200 flex items-center justify-around">
                <span className="text-slate-400 font-bold text-lg">‹</span>
                <span className="text-slate-400 font-bold text-lg">›</span>
                <div className="px-4 py-2 rounded-xl bg-[#1E3A8A] text-white font-bold text-sm flex items-center gap-2 shadow-md ring-4 ring-blue-200">
                  <Share className="w-5 h-5" />
                  <span>Chia sẻ (Share)</span>
                </div>
                <span className="text-slate-400 text-sm">📖</span>
                <span className="text-slate-400 text-sm">❐</span>
              </div>
            </div>

            {/* Visual Step 2 */}
            <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-xs space-y-3">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-[#0F766E] text-white font-extrabold text-base flex items-center justify-center shrink-0">
                  2
                </span>
                <h3 className="text-lg font-bold text-slate-900">
                  Chọn “Thêm vào MH chính” (Add to Home Screen)
                </h3>
              </div>
              <p className="text-base text-slate-600 pl-11">
                Cuộn nhẹ bảng menu lên và chạm vào dòng dưới đây, sau đó bấm{' '}
                <strong>Thêm (Add)</strong> ở góc trên bên phải:
              </p>
              <div className="ml-11 bg-slate-50 rounded-2xl p-3.5 border border-teal-300 flex items-center justify-between">
                <span className="font-bold text-slate-900 text-base">
                  Thêm vào MH chính (Add to Home Screen)
                </span>
                <div className="w-9 h-9 rounded-xl bg-[#0F766E] text-white flex items-center justify-center">
                  <PlusSquare className="w-5 h-5" />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            {isInstalled ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center space-y-2">
                <CheckCircle2 className="w-12 h-12 text-emerald-700 mx-auto" />
                <h3 className="text-xl font-bold text-emerald-950">
                  Ứng dụng đã được cài đặt trên thiết bị!
                </h3>
                <p className="text-base text-emerald-800">
                  Thầy/Cô có thể mở TeacherTalk Daily trực tiếp từ màn hình
                  chính bất cứ lúc nào.
                </p>
              </div>
            ) : deferredPrompt ? (
              <div className="bg-white rounded-2xl p-6 border border-stone-200 text-center space-y-4">
                <div className="w-16 h-16 rounded-3xl bg-teal-50 text-[#0F766E] flex items-center justify-center mx-auto">
                  <Download className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xl font-bold text-slate-900">
                    Sẵn sàng cài đặt 1 chạm trên Android / Chrome
                  </h3>
                  <p className="text-base text-slate-600">
                    Bấm nút bên dưới để thêm biểu tượng{' '}
                    <strong>TeacherTalk Daily</strong> ra màn hình chính điện
                    thoại của Thầy/Cô.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onTriggerAndroidInstall}
                  className="w-full py-4 px-6 rounded-2xl bg-[#0F766E] hover:bg-teal-800 text-white font-extrabold text-lg shadow-md transition flex items-center justify-center gap-2.5"
                >
                  <Download className="w-6 h-6" />
                  <span>Cài đặt App ngay bây giờ</span>
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-5 border border-stone-200 space-y-3">
                <div className="flex items-center gap-2 text-[#0F766E] font-bold text-lg">
                  <Sparkles className="w-5 h-5" />
                  <span>Hướng dẫn cài đặt nhanh trên Chrome (Android):</span>
                </div>
                <ol className="space-y-3 text-base text-slate-700 list-decimal list-inside">
                  <li>
                    Bấm vào biểu tượng <strong>3 dấu chấm dọc (⋮)</strong> ở góc
                    trên bên phải trình duyệt Chrome.
                  </li>
                  <li>
                    Chọn mục{' '}
                    <strong>“Cài đặt ứng dụng” (Install app)</strong> hoặc{' '}
                    <strong>“Thêm vào màn hình chính”</strong>.
                  </li>
                  <li>
                    Bấm <strong>Cài đặt</strong> để hoàn tất — App sẽ hiển thị
                    toàn màn hình rất đẹp mắt!
                  </li>
                </ol>
              </div>
            )}
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-stone-200">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-base transition"
          >
            Đã hiểu • Quay lại luyện nói
          </button>
        </div>
      </div>
    </div>
  );
}
