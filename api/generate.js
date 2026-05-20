export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST만 허용됩니다' });
  }

  const { content, style } = req.body;

  if (!content) {
    return res.status(400).json({ error: '콘텐츠를 입력해주세요' });
  }

  const prompt = `아래 형식의 JSON만 응답해주세요. 마크다운 코드블록 없이 순수 JSON만 출력하세요.

[요청] 마크웨이 쇼츠 카드뉴스 생성 (스타일: ${style || 'modern'})

[규칙]
1. 카드 수는 콘텐츠에 맞게 AI가 3~10장 사이에서 최적으로 결정
2. 해시태그는 가장 효과적인 것만 정확히 5개, 배열로 출력

[콘텐츠]
${content}

[출력 형식]
{
  "cardCount": 결정한카드수,
  "cards": [
    {"type":"cover","tag":"카테고리(10자이내)","title":"제목(18자이내)","subtitle":"부제목(25자이내)","emoji":"이모지"},
    {"type":"content","tag":"소제목(8자이내)","title":"포인트(15자이내)","body":"설명(45자이내)","emoji":"이모지"},
    ...(본문 카드들),
    {"type":"outro","tag":"마무리","title":"요약(15자이내)","body":"CTA문구(30자이내)","emoji":"이모지","account":"@marqueeway_shorts"}
  ],
  "caption": "인스타그램 게시물 설명 이모지포함 3~4문장",
  "hashtags": ["#핵심태그1","#핵심태그2","#핵심태그3","#핵심태그4","#핵심태그5"]
}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || 'API 오류');
    }

    const data = await response.json();
    const rawText = data.content.map(b => b.text || '').join('');
    const cleaned = rawText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const s = cleaned.indexOf('{');
    const e = cleaned.lastIndexOf('}');
    if (s < 0 || e < 0) throw new Error('JSON 파싱 실패');

    const parsed = JSON.parse(cleaned.substring(s, e + 1));
    return res.status(200).json(parsed);

  } catch (error) {
    console.error('API 오류:', error);
    return res.status(500).json({ error: error.message });
  }
}
