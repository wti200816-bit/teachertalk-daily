import { NextRequest, NextResponse } from 'next/server';
import { EvaluationResult } from '@/types/lesson';

interface EvaluateRequestBody {
  lessonTitle: string;
  question: string;
  modelResponse: string;
  modelResponseVi: string;
  userTranscript: string;
  level1Score?: number;
  provider?: 'gemini' | 'openai';
  apiKey?: string;
}

const PRONUNCIATION_DICTIONARY: Record<
  string,
  { ipa: string; vietnamese: string; advice: string }
> = {
  appreciate: {
    ipa: '/əˈpriː.ʃi.eɪt/',
    vietnamese: 'trân trọng, đánh giá cao',
    advice: 'Nhấn trọng âm ở âm tiết thứ 2 (-pre-) và phát âm rõ âm /ʃ/ ở giữa từ.',
  },
  effort: {
    ipa: '/ˈɛf.ərt/',
    vietnamese: 'sự nỗ lực, cố gắng',
    advice: 'Nhấn trọng âm vào âm tiết đầu /ˈɛf/, tránh đọc thành "ê-phọt".',
  },
  progress: {
    ipa: '/ˈprɑː.ɡrɛs/',
    vietnamese: 'sự tiến bộ',
    advice: 'Khi là danh từ, trọng âm rơi vào âm tiết đầu /ˈprɑː/, nhớ bật âm cuối /s/.',
  },
  attention: {
    ipa: '/əˈtɛn.ʃən/',
    vietnamese: 'sự chú ý',
    advice: 'Nhấn vào âm tiết thứ hai /-tɛn-/ và thả nhẹ âm cuối /-ʃən/.',
  },
  schedule: {
    ipa: '/ˈskɛdʒ.uːl/',
    vietnamese: 'lịch trình, thời khóa biểu',
    advice: 'Mở đầu bằng cụm phụ âm /sk/, âm giữa là /dʒ/ nhẹ nhàng.',
  },
  colleagues: {
    ipa: '/ˈkɑː.liːɡz/',
    vietnamese: 'đồng nghiệp',
    advice: 'Trọng âm ở âm đầu /ˈkɑː/, kéo dài âm /iː/ ở âm tiết thứ hai và có âm cuối /z/.',
  },
  environment: {
    ipa: '/ɪnˈvaɪ.rən.mənt/',
    vietnamese: 'môi trường',
    advice: 'Nhấn trọng âm vào âm /-vaɪ-/, đọc lướt nhẹ âm /-rən-/.',
  },
  authentic: {
    ipa: '/ɔːˈθɛn.tɪk/',
    vietnamese: 'đích thực, chuẩn bản địa',
    advice: 'Đặt đầu lưỡi giữa hai hàm răng để phát âm chuẩn âm /θ/ ở "th".',
  },
  encourage: {
    ipa: '/ɪnˈkɜːr.ɪdʒ/',
    vietnamese: 'khích lệ, động viên',
    advice: 'Nhấn vào âm /-kɜːr-/ và kết thúc bằng âm môi /dʒ/.',
  },
  mistakes: {
    ipa: '/mɪˈsteɪks/',
    vietnamese: 'những lỗi sai',
    advice: 'Nhấn âm thứ hai /-steɪks/ và đừng quên tổ hợp âm cuối /ks/.',
  },
};

function buildSmartFallbackEvaluation(body: EvaluateRequestBody): EvaluationResult {
  const transcript = (body.userTranscript || '').trim();
  const wordCount = transcript ? transcript.split(/\s+/).length : 0;

  // Pick 2 helpful words from the transcript or lesson context
  const lowerText = `${transcript} ${body.modelResponse}`.toLowerCase();
  const matchedWords = Object.keys(PRONUNCIATION_DICTIONARY).filter((w) =>
    lowerText.includes(w)
  );

  const selectedWords =
    matchedWords.length >= 2
      ? matchedWords.slice(0, 2)
      : ['appreciate', 'encourage'];

  const pronunciationFixes = selectedWords.map((word) => ({
    word,
    ipa: PRONUNCIATION_DICTIONARY[word].ipa,
    vietnamese: PRONUNCIATION_DICTIONARY[word].vietnamese,
    advice: PRONUNCIATION_DICTIONARY[word].advice,
  }));

  const baseScore = wordCount >= 20 ? 88 : wordCount >= 8 ? 82 : 76;
  const overallScore = body.level1Score
    ? Math.round((baseScore + body.level1Score) / 2)
    : baseScore;

  const fluencyPraise =
    wordCount >= 18
      ? `Thầy/Cô diễn đạt rất mạch lạc và tự tin (${wordCount} từ)! Cách triển khai ý có mở đầu và lập luận rõ ràng, thể hiện đúng phong thái điềm đạm của một nhà giáo giàu kinh nghiệm.`
      : `Thầy/Cô đã hoàn thành trọn vẹn lượt nói với ý tứ rất rõ ràng và ấm áp! Chỉ cần nối dài thêm các cụm liên từ như "From my experience" hoặc "Because of that", phần chia sẻ sẽ càng trôi chảy hơn nữa.`;

  return {
    overallScore,
    fluencyPraise,
    pronunciationFixes,
    naturalUpgrade: {
      originalIntent:
        transcript ||
        'Chia sẻ quan điểm của giáo viên về chủ đề bài học ngày hôm nay.',
      upgradedSentence: body.modelResponse,
      vietnameseMeaning: body.modelResponseVi,
      whyItWorks:
        'Câu nâng cấp sử dụng các cụm Collocations mức B1+ tự nhiên, giọng điệu ấm áp, lịch sự và giàu tính sư phạm của giáo viên bản xứ độ tuổi 30–40.',
    },
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as EvaluateRequestBody;
    const apiKey =
      body.apiKey?.trim() ||
      process.env.GEMINI_API_KEY ||
      process.env.OPENAI_API_KEY ||
      '';
    const provider = body.provider || 'gemini';

    if (!apiKey) {
      return NextResponse.json({
        source: 'smart-coach',
        evaluation: buildSmartFallbackEvaluation(body),
      });
    }

    const systemPrompt = `Bạn là một Huấn luyện viên Giao tiếp Tiếng Anh Sư phạm (AI Coach) tận tâm dành cho giáo viên Việt Nam độ tuổi 30-40 đang luyện từ A2 lên B1.
Chủ đề bài học: "${body.lessonTitle}"
Câu hỏi mở (Level 4): "${body.question}"
Đoạn nói của giáo viên (Transcript): "${body.userTranscript || '(Giáo viên vừa luyện đọc mẫu)'}"

Hãy trả về kết quả đánh giá dưới dạng JSON hợp lệ (không bọc trong markdown block nếu không cần thiết) theo đúng cấu trúc sau:
{
  "overallScore": <số nguyên từ 75 đến 98>,
  "fluencyPraise": "<Lời khen khích lệ bằng tiếng Việt ấm áp, lịch sự, tập trung khen sự trôi chảy, ý tưởng sư phạm và nỗ lực của thầy/cô>",
  "pronunciationFixes": [
    {
      "word": "<Từ tiếng Anh số 1 cần lưu ý phát âm>",
      "ipa": "<Phiên âm IPA chuẩn>",
      "vietnamese": "<Nghĩa tiếng Việt ngắn gọn>",
      "advice": "<Mẹo chỉnh khẩu hình/trọng âm bằng tiếng Việt dễ hiểu>"
    },
    {
      "word": "<Từ tiếng Anh số 2 cần lưu ý phát âm>",
      "ipa": "<Phiên âm IPA chuẩn>",
      "vietnamese": "<Nghĩa tiếng Việt ngắn gọn>",
      "advice": "<Mẹo chỉnh khẩu hình/trọng âm bằng tiếng Việt dễ hiểu>"
    }
  ],
  "naturalUpgrade": {
    "originalIntent": "<Tóm tắt lại câu/ý của giáo viên vừa nói>",
    "upgradedSentence": "<Viết lại ý của giáo viên (2-3 câu tiếng Anh) theo văn phong tự nhiên, lịch sự, chững chạc của giáo viên bản xứ tuổi 30-40 ở trình độ B1+>",
    "vietnameseMeaning": "<Dịch nghĩa tiếng Việt tự nhiên của câu nâng cấp>",
    "whyItWorks": "<Giải thích ngắn gọn bằng tiếng Việt vì sao cách diễn đạt này tự nhiên và lịch sự hơn>"
  }
}`;

    if (provider === 'openai') {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'system',
              content:
                'You are a warm, supportive English speaking coach for Vietnamese teachers. Always respond in valid JSON.',
            },
            { role: 'user', content: systemPrompt },
          ],
          temperature: 0.6,
        }),
      });

      if (!response.ok) {
        return NextResponse.json({
          source: 'smart-coach-fallback',
          evaluation: buildSmartFallbackEvaluation(body),
        });
      }

      const data = await response.json();
      const rawContent = data?.choices?.[0]?.message?.content || '';
      const parsed = JSON.parse(rawContent) as EvaluationResult;

      return NextResponse.json({
        source: 'openai',
        evaluation: parsed,
      });
    }

    // Default: Gemini API
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(
      apiKey
    )}`;

    const geminiRes = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: systemPrompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.6,
        },
      }),
    });

    if (!geminiRes.ok) {
      return NextResponse.json({
        source: 'smart-coach-fallback',
        evaluation: buildSmartFallbackEvaluation(body),
      });
    }

    const geminiData = await geminiRes.json();
    const rawText =
      geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const cleanedJson = rawText.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleanedJson) as EvaluationResult;

    return NextResponse.json({
      source: 'gemini',
      evaluation: parsed,
    });
  } catch {
    return NextResponse.json({
      source: 'smart-coach-fallback',
      evaluation: buildSmartFallbackEvaluation({
        lessonTitle: 'Daily Practice',
        question: '',
        modelResponse:
          'From my experience as a teacher, creating a warm and supportive classroom helps students build confidence every single day.',
        modelResponseVi:
          'Từ kinh nghiệm đứng lớp của tôi, việc tạo ra một lớp học ấm áp và giàu sự khích lệ giúp học sinh xây dựng sự tự tin mỗi ngày.',
        userTranscript: '',
      }),
    });
  }
}
