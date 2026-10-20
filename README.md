# TeacherTalk Daily 🎓🗣️

**TeacherTalk Daily** là nền tảng luyện nói tiếng Anh hàng ngày (**15 phút/ngày**) được thiết kế riêng cho **giáo viên Việt Nam độ tuổi 30–40** đang nâng trình độ giao tiếp từ **A2 lên B1**.

---

## ✨ Tính năng cốt lõi (4 Cấp độ trong 1 Bài học)

1. **Level 1 — Shadowing & Chunking (Dễ):**
   - Luyện 3 câu ngắn chứa cụm từ cố định (Collocations) theo chủ đề sư phạm & đời sống, kèm nghĩa tiếng Việt, phiên âm IPA và mẹo phát âm.
   - Nghe máy đọc mẫu ở tốc độ **0.8x (Chậm)** và **1.0x (Chuẩn)** bằng `Web Speech API` (`SpeechSynthesis`).
   - Ghi âm giọng đọc (`SpeechRecognition`) và đối chiếu tự động: **tô màu xanh** các từ đọc đúng và **tô màu cam** các từ cần đọc lại.

2. **Level 2 — Guided Q&A (Vừa):**
   - AI đặt 1 câu hỏi ngắn thực tế.
   - Hiển thị **Khung câu trả lời (Sentence Frame)** có 3 chỗ trống kèm bộ gợi ý từ vựng để giáo viên ghép câu cá nhân hóa và đọc to.

3. **Level 3 — Situational Role-play (Khá):**
   - Hội thoại 3 lượt nói với AI theo tình huống thực tế (trao đổi với đồng nghiệp nước ngoài, gặp phụ huynh, nhắc nhở học sinh, đi du lịch...).
   - Ban đầu chỉ hiển thị **3–4 từ khóa (Keywords)**. Khi bấm nút **🆘 Cứu trợ**, hệ thống mới hiện nguyên câu tiếng Anh hoàn chỉnh để đọc theo.

4. **Level 4 — The 2-Minute Teacher (Khó):**
   - Đưa ra 1 câu hỏi mở sư phạm/đời sống kèm dàn ý 3 ý.
   - Tích hợp đồng hồ đếm ngược **30 giây chuẩn bị** và **90 giây thu âm tự do**.

5. **Sửa lỗi Thông minh với AI (`/api/evaluate`):**
   - Kết nối trực tiếp với **Google Gemini API** hoặc **OpenAI API** (nhập API Key trên giao diện Cài đặt, lưu trong `localStorage`) kèm chế độ **Smart Pedagogical Coach** dự phòng.
   - Trả về: **Lời khen khích lệ độ trôi chảy**, **Top 2 từ cần chỉnh phát âm** (kèm nút nghe chuẩn 0.8x/1.0x) và **1 câu Natural Upgrade** chuẩn văn phong giáo viên bản xứ tuổi 30–40.

---

## 🛠️ Tech Stack

- **Framework:** Next.js (App Router, TypeScript) + Tailwind CSS + Lucide Icons
- **Voice Processing:** `Web Speech API` (`SpeechRecognition` & `SpeechSynthesis`)
- **AI Evaluation:** Next.js Route Handler (`/api/evaluate`) + Gemini / OpenAI API
- **Storage:** `localStorage` (Lưu chuỗi ngày học Streak, Lịch sử điểm phát âm và Sổ tay cụm từ cần ôn tập)

---

## 🚀 Hướng dẫn chạy Local

```bash
cd teachertalk-daily
npm install
npm run dev
```

Mở trình duyệt (khuyến nghị **Google Chrome**) tại địa chỉ `http://localhost:3000`.
