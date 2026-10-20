import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-jakarta',
});

export const metadata: Metadata = {
  title: 'TeacherTalk Daily — Luyện nói Tiếng Anh 15 phút/ngày cho Giáo viên Việt Nam',
  description:
    'Nền tảng luyện nói tiếng Anh hàng ngày (A2 lên B1) dành riêng cho giáo viên Việt Nam độ tuổi 30-40 với 4 cấp độ thực hành và AI sửa lỗi thông minh.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={`${jakarta.variable} antialiased`}>
      <body className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans selection:bg-teal-100 selection:text-teal-900">
        {children}
      </body>
    </html>
  );
}
