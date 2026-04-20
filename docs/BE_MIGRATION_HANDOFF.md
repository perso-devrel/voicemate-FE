# BE_MIGRATION_HANDOFF.md

> **용도:** `voicemate-BE-v2` 레포에서 새 Claude Code 세션을 열고 번역/더빙 파이프라인을 개편할 때의 인수인계 문서.
> **작성일:** 2026-04-20
> **작성 컨텍스트:** `voicemate_FE` 세션에서 "번역 품질 저하" 원인 진단 중 도출.

---

## 1. 문제 요약

### 관찰된 증상
- 영어 → 한국어 메시지 전송 시 번역 품질이 매우 저하됨
- **실제 사례:**
  - 원문: `"My name is Seonho. What's your name?"`
  - 번역/더빙 결과: `"선호야. 이름은?"`
- 문제점: 반말 기본 출력 + 문장 공격적 축약 + 소개팅(초면) 맥락 무시.

### 기대 결과
- `"제 이름은 선호입니다. 성함이 어떻게 되시나요?"` 수준의 자연스러운 존댓말 번역
- 음성 더빙은 발신자의 클론 보이스로 타겟 언어 합성

---

## 2. 근본 원인 분석

### 원인 1 — ElevenLabs Dubbing API의 길이 강제 압축 (핵심)
- Dubbing API는 **영상 더빙용**으로 설계됨 → 원본 오디오 duration에 맞춰 번역 출력 길이를 강제로 줄임
- 영어(2초) → 한국어(정상 4초 이상)인데 2초에 욱여넣기 위해 "제 이름은"의 "제"부터 탈락
- 한국어는 음절당 정보량이 영어 대비 낮아 이 현상이 특히 심각

### 원인 2 — 존댓말/반말 제어 불가
- Dubbing API에 formality 파라미터 없음
- 모델이 기본 **반말**로 생성 + 축약 과정에서 존칭 조사가 추가로 탈락

### 원인 3 — 문맥 부재
- 메시지마다 독립적으로 더빙 → 이전 메시지 톤과 일관성 없음 (존댓말 ↔ 반말 튐 발생 가능)

### 원인 4 — 파이프라인 구조적 한계
현재 동작 흐름 (`docs/requirements.md:146-147` 기준):

```
원문 텍스트
  ↓ [ElevenLabs TTS] (원문 언어, 보낸이 voice_id)
원문 언어 오디오
  ↓ [ElevenLabs Dubbing API]
  │   - 내부 STT로 텍스트 재추출 (원문 손실 위험)
  │   - 번역 (품질 제어 불가)
  │   - 타겟 언어 TTS (길이 강제 압축)
  ↓
타겟 언어 오디오 + translated_text
```

- **문제**: TTS → STT → 번역 → TTS 3중 변환. 정보 손실 + 원본 텍스트를 Dubbing에 직접 전달할 수 없음
- **ElevenLabs Dubbing API 제약**: 입력으로 미디어 파일만 받음 (텍스트 입력 엔드포인트 없음)

---

## 3. 제안하는 새 파이프라인

### 목표 구조

```
원문 텍스트
  ↓ [Gemini 2.5 Flash] — 시스템 프롬프트: 소개팅/존댓말/초면 컨텍스트
번역된 텍스트
  ↓ [ElevenLabs TTS — eleven_multilingual_v2 + 보낸이 voice_id]
타겟 언어 오디오
```

### 핵심 변경점
1. **ElevenLabs Dubbing API 제거** — `POST /v1/dubbing` 호출 경로 삭제
2. **Gemini API 도입** — 번역만 담당, 시스템 프롬프트로 품질 제어
3. **TTS 모델 변경** — `eleven_multilingual_v2` (29개 언어, 클론 voice 유지)
4. **Dubbing 폴링 로직 제거** — 기존엔 Dubbing이 비동기라 작업 상태 폴링이 필요했지만, TTS는 동기 응답 → 단순화 가능

---

## 4. 구현 상세

### 4.1 Gemini 번역 함수

**패키지:**
```bash
npm install @google/generative-ai
```

**환경변수:**
```
GEMINI_API_KEY=<Google AI Studio에서 발급>
```

**번역 함수 (예시):**
```ts
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const SYSTEM_PROMPT = `You translate chat messages between strangers on a dating app.

Rules:
- Preserve meaning fully. Do NOT abbreviate or shorten.
- Use polite/formal tone:
  - Korean: 존댓말 (습니다/세요체)
  - Japanese: です/ます
  - Chinese: 您 (respectful pronoun)
- Keep proper nouns in their original or properly romanized form.
- Do NOT respond to the content — only translate.
- Return valid JSON only.

Output schema:
{ "translation": string, "detected_source_language": string }`;

export async function translateMessage(params: {
  text: string;
  sourceLanguage: string;
  targetLanguage: string;
  previousMessages?: { role: 'sender' | 'receiver'; text: string }[];
}): Promise<{ translation: string; detectedSourceLanguage: string }> {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: SYSTEM_PROMPT,
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.3,
    },
    safetySettings: [
      { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
      { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
      { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
      { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
    ],
  });

  const contextBlock = params.previousMessages?.length
    ? `\n\nRecent conversation (for tone consistency):\n${params.previousMessages
        .slice(-4)
        .map((m) => `${m.role}: ${m.text}`)
        .join('\n')}`
    : '';

  const userPrompt = `Source language: ${params.sourceLanguage}
Target language: ${params.targetLanguage}
Text to translate: ${JSON.stringify(params.text)}${contextBlock}`;

  const result = await model.generateContent(userPrompt);
  const raw = result.response.text();
  const parsed = JSON.parse(raw) as {
    translation: string;
    detected_source_language: string;
  };

  return {
    translation: parsed.translation,
    detectedSourceLanguage: parsed.detected_source_language,
  };
}
```

### 4.2 TTS 함수 (교체)

Dubbing API 호출 대신 ElevenLabs **Text-to-Speech** 엔드포인트 직접 호출:

```
POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}
Headers:
  xi-api-key: <ELEVENLABS_API_KEY>
  Content-Type: application/json
Body:
  {
    "text": "<번역된 텍스트>",
    "model_id": "eleven_multilingual_v2",
    "voice_settings": {
      "stability": 0.5,
      "similarity_boost": 0.75,
      "style": 0.0,
      "use_speaker_boost": true
    }
  }
Response: audio/mpeg (바이너리)
```

- 반환된 오디오를 Supabase Storage의 `audio` 버킷에 업로드
- 업로드된 URL을 `messages.audio_url`에 저장

### 4.3 메시지 처리 워커 변경

기존 워커에서 바꿔야 할 로직 (경로는 BE 레포 직접 확인 필요):

```
[Before]
async function processMessage(messageId) {
  const msg = await db.getMessage(messageId);
  const sourceAudio = await elevenlabs.tts(msg.original_text, msg.sender.voice_id);
  if (msg.sender.language === msg.receiver.language) {
    await uploadAndSave(sourceAudio, messageId);
  } else {
    const dubbed = await elevenlabs.dubbing(sourceAudio, msg.sender.language, msg.receiver.language);
    await uploadAndSave(dubbed.audio, messageId, dubbed.transcript);
  }
}

[After]
async function processMessage(messageId) {
  const msg = await db.getMessage(messageId);
  let textToSynthesize = msg.original_text;
  let translatedText: string | null = null;

  if (msg.sender.language !== msg.receiver.language) {
    const recent = await db.getRecentMessages(msg.match_id, 4);
    const { translation } = await gemini.translateMessage({
      text: msg.original_text,
      sourceLanguage: msg.sender.language,
      targetLanguage: msg.receiver.language,
      previousMessages: recent,
    });
    textToSynthesize = translation;
    translatedText = translation;
  }

  const audio = await elevenlabs.tts({
    text: textToSynthesize,
    voiceId: msg.sender.elevenlabs_voice_id,
    modelId: 'eleven_multilingual_v2',
  });

  await uploadAndSave(audio, messageId, translatedText);
  // translatedText가 null이면 messages.translated_text도 null 유지 (같은 언어 케이스)
}
```

### 4.4 DB 스키마는 변경 없음
`messages` 테이블의 `translated_text`, `translated_language`, `audio_url`, `audio_status` 필드는 그대로 사용 가능. FE는 수정 불필요.

---

## 5. 고려사항 및 리스크

### 5.1 Gemini 안전 필터
- 기본 필터가 엄격 → 소개팅 대화에서 오탐 가능성 (예: 플러팅 메시지가 `SEXUALLY_EXPLICIT`로 차단)
- `BLOCK_ONLY_HIGH`로 완화 필수 (§4.1 코드 참조)
- `BLOCK_NONE`은 너무 공격적이므로 베타 런칭 후 로그 보며 조정 권장

### 5.2 JSON 파싱 실패 대비
- Gemini가 간혹 JSON 포맷 위반 출력 가능
- `responseMimeType: 'application/json'` + `responseSchema` 설정으로 강제
- 파싱 실패 시 **원문 그대로 TTS** 폴백 (또는 `audio_status: 'failed'` 설정)

### 5.3 고유명사 처리
- "Seonho" 같은 로마자 이름을 한국어로 번역 시 "선호"로 변환할지 그대로 둘지 정책 필요
- 현 프롬프트는 "원형 유지 또는 적절한 로마자화"로 모호 → 실제 테스트로 결정

### 5.4 비용 시뮬레이션
Gemini 2.5 Flash 기준 (2026-04 시세):
- 입력: $0.30 / 1M tokens
- 출력: $2.50 / 1M tokens
- 메시지당 평균 ~80 tokens (시스템 프롬프트 포함) × 1,000 메시지 = **$0.20~0.30 수준**
- Dubbing API 대비 여전히 수 배~십 배 저렴
- 비용 더 줄이려면 `gemini-2.5-flash-lite` ($0.10 / $0.40) 고려 가능

### 5.5 레이턴시
- Gemini 2.5 Flash: 200~500ms
- ElevenLabs TTS: 500~2000ms
- 합계 평균 **1~2초** → 기존 Dubbing(5~30초) 대비 대폭 개선
- `audio_status: 'processing'` 노출 시간 단축 → UX 개선

### 5.6 기존 Dubbing 폴링 로직 제거
- ElevenLabs Dubbing은 비동기 job이라 완료 폴링 필요했을 가능성
- TTS는 동기 응답 → 큐/워커 구조를 단순화할 여지 있음
- 단, Supabase Storage 업로드 중 실패 시 재시도 로직은 유지 필요

### 5.7 기존 메시지 데이터 마이그레이션
- 이미 저장된 `audio_url`(Dubbing 결과)은 그대로 보존
- 새 파이프라인은 신규 메시지부터 적용
- 원하면 백필 스크립트로 기존 메시지 재번역 가능 (비용 고려)

---

## 6. 구현 체크리스트 (BE 세션에서 할 일)

- [ ] `voicemate-BE-v2` 레포에서 현재 Dubbing 호출부 위치 파악 (`grep -r dubbing`, `grep -r elevenlabs`)
- [ ] 메시지 처리 워커/큐 구조 확인 (Supabase Edge Functions? Node.js 백엔드? BullMQ?)
- [ ] `@google/generative-ai` 설치
- [ ] `GEMINI_API_KEY` 환경변수 추가 (로컬 `.env` + 배포 환경)
- [ ] `src/services/translation.ts` (또는 유사 위치) 신규 생성 — §4.1 코드 기반
- [ ] `src/services/elevenlabs.ts`에 `tts()` 함수 추가 / Dubbing 함수 제거 (또는 deprecate)
- [ ] 메시지 처리 워커 수정 — §4.3 로직으로 교체
- [ ] 단위 테스트: 같은 언어 / 다른 언어 / Gemini 에러 / TTS 에러 케이스
- [ ] 통합 테스트: 실제 메시지 전송 → 번역 품질 눈 검증
  - 테스트 케이스 최소 예시:
    - `"My name is Seonho. What's your name?"` (en→ko) → 존댓말 확인
    - `"안녕하세요, 반갑습니다."` (ko→ja) → です/ます체 확인
    - `"昨日は楽しかったです"` (ja→en) → 자연스러운 영어 확인
- [ ] 모니터링/로깅 추가 — 번역 실패율, 평균 레이턴시
- [ ] `docs/requirements.md` 업데이트 — 파이프라인 설명 변경
- [ ] `voicemate-FE/docs/BE_DEPENDENCIES.md §2` 업데이트 요청 (FE 팀에 공유)

---

## 7. 새 Claude 세션 시작 프롬프트 템플릿

BE 레포에서 Claude Code를 새로 열고 아래를 복사해 첫 메시지로 보내세요:

```
voicemate-BE-v2의 번역/더빙 파이프라인을 개편하려고 해.

배경 및 상세 계획은 voicemate_FE 레포의 docs/BE_MIGRATION_HANDOFF.md에
정리되어 있어. 먼저 그 문서를 읽어줘:
C:\Users\sejin\Documents\voicemate_FE\docs\BE_MIGRATION_HANDOFF.md

그 다음 이 레포에서 현재 ElevenLabs Dubbing API를 호출하는 위치를 찾고,
핸드오프 문서 §6의 체크리스트를 기반으로 작업 계획을 세워줘.

먼저 분석만 하고, 구현 전에 계획을 보여줘.
```

---

## 변경 이력

| 날짜 | 내용 | 담당 |
|------|------|------|
| 2026-04-20 | 초기 작성 (번역 품질 이슈 진단 + Gemini 전환 제안) | FE 세션 |
| 2026-04-20 | BE 구현 완료 확인 후 모델명 `gemini-2.0-flash` → `gemini-2.5-flash`로 갱신 (2.0 Flash는 신규 유저에게 제공 종료) | FE 세션 |
