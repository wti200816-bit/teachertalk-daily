# TeacherTalk Daily 🎓🗣️

**TeacherTalk Daily** là nền tảng luyện nói tiếng Anh hàng ngày (**15 phút/ngày**) được thiết kế riêng cho **giáo viên Việt Nam độ tuổi 30–40** đang nâng trình độ giao tiếp từ **A2 lên B1**.

🌐 **Link Web Vĩnh Viễn (GitHub Pages):** [https://wti200816-bit.github.io/teachertalk-daily/](https://wti200816-bit.github.io/teachertalk-daily/)

---

## ✨ Tính năng nổi bật

1. **Giao diện Mobile-First "Warm Educational Minimalist" (Dành cho độ tuổi 30–40):**
   - Nền kem ấm dịu mắt (`#FAF8F5`), màu chủ đạo Xanh Lá Sage (`#0F766E`) & Xanh Navy (`#1E3A8A`), điểm nhấn Cam Hổ Phách (`#D97706`).
   - Cỡ chữ lớn, rõ ràng, thanh điều hướng đáy (**Bottom Navigation Bar**) 4 tab: `Học hôm nay`, `Thống kê`, `Kho bài học`, `Cài đặt`.
   - **Nút Micro lớn công thái học** ở nửa dưới màn hình kèm hiệu ứng sóng âm (`pulse` & `soundwave`).

2. **Thống kê Thời gian học (Study Time Tracker & Analytics):**
   - **Active Timer:** Tự động đếm số giây/phút thực tế luyện nói mỗi ngày và lưu theo ngày (`YYYY-MM-DD`) vào `localStorage`.
   - **Progress Ring (Trong ngày):** Vòng tròn tiến độ hiển thị số phút đã học hôm nay so với mục tiêu (mặc định 15 phút/ngày).
   - **Weekly Bar Chart (Trong tuần):** Biểu đồ cột trực quan từ Thứ Hai đến Chủ Nhật, tổng số phút cả tuần và chuỗi ngày học liên tiếp (**Streak 🔥**).

3. **Tải App về Điện thoại (PWA - Progressive Web App):**
   - Tích hợp `manifest.json`, bộ icon `192x192`, `512x512`, `apple-touch-icon.png`, iOS meta tags và Service Worker (`sw.js`).
   - Nút **"📲 Tải App"** hỗ trợ cài đặt 1 chạm trên Android/Chrome (`beforeinstallprompt`) và bảng hướng dẫn trực quan 2 bước cho iPhone/iPad (iOS Safari).

4. **Lộ trình 4 Cấp độ Luyện nói & Direct Gemini AI (Client-side):**
   - **Level 1 (Shadowing):** Nghe mẫu `0.8x / 1.0x`, thu âm và tô màu xanh từ đọc đúng, màu cam từ cần đọc lại.
   - **Level 2 (Guided Q&A):** Khung câu trả lời (Sentence Frame) có 3 ô trống kèm gợi ý từ vựng.
   - **Level 3 (Situational Role-play):** Hội thoại 3 lượt với Keywords gợi ý và nút **🆘 Cứu trợ**.
   - **Level 4 (The 2-Minute Teacher):** Đồng hồ đếm ngược 30s suy nghĩ + 90s nói tự do, tích hợp **Google Gemini API trực tiếp từ trình duyệt** (không cần Backend Server) để khen ngợi, chỉ ra Top 2 từ cần sửa phát âm và gợi ý 1 câu **Natural Upgrade**.
