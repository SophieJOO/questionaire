/**
 * Gemini AI 분석 모듈
 */

export async function analyzeWithGemini(patientData) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY 환경변수가 설정되지 않았습니다');
  }

  const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
  const prompt = buildAnalysisPrompt(patientData);

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
      },
      safetySettings: [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
      ]
    })
  });

  const result = await response.json();

  if (result.error) {
    throw new Error('Gemini API 오류: ' + result.error.message);
  }

  if (!result.candidates || result.candidates.length === 0) {
    throw new Error('Gemini API: 응답이 없습니다');
  }

  const analysisText = result.candidates[0].content.parts[0].text;
  return parseAnalysisResponse(analysisText);
}

function buildAnalysisPrompt(data) {
  return `당신은 한의학 전문가입니다. 아래 환자의 설문 데이터를 바탕으로 체질과 예상 질환을 분석해주세요.

## 환자 설문 데이터

### 기본 정보
- 이름: ${data.name || '미입력'}
- 성별: ${data.gender || '미입력'}
- 나이: ${data.age || '미입력'}세
- 직업: ${data.occupation || '미입력'}
- 키: ${data.height || '미입력'}cm
- 체중: ${data.weight || '미입력'}kg

### 주소 (주요 호소 증상)
1. 1순위 증상: ${data.mainSymptom1 || '미입력'}
2. 2순위 증상: ${data.mainSymptom2 || '없음'}
3. 3순위 증상: ${data.mainSymptom3 || '없음'}

### 현재 복용약/건강식품
${data.currentMedication || '없음'}

### 병력/수술력
${data.medicalHistory || '없음'}

### 한열(寒熱) 관련
- 추위 민감도: ${data.coldSensitivity || '미입력'}
- 차가운 부위: ${data.coldAreas || '없음'}
- 추위 vs 더위: ${data.coldVsHeat || '미입력'}
- 더위 민감도: ${data.heatSensitivity || '미입력'}
- 열 달아오름 상황: ${data.heatFlushSituation || '없음'}

### 땀(汗)
- 땀 양: ${data.sweatAmount || '미입력'}
- 땀 많은 부위: ${data.sweatAreas || '없음'}
- 땀 후 상태: ${data.sweatEffect || '미입력'}

### 음수(飮水)
- 하루 물 섭취량: ${data.waterIntake || '미입력'}L
- 선호 물 온도: ${data.waterTemperature || '미입력'}
- 갈증/구강건조: ${data.thirst || '없음'}

### 체력
- 체력 수준: ${data.stamina || '미입력'}

### 기호식품
- 선호 맛: ${data.tastePreference || '없음'}
- 음주 빈도: ${data.alcoholFrequency || '미입력'}
- 음주량: ${data.alcoholAmount || '미입력'}
- 흡연: ${data.smoking || '미입력'}

### 식욕/소화
- 하루 식사 횟수: ${data.mealsPerDay || '미입력'}끼
- 식욕: ${data.appetite || '미입력'}
- 식사량: ${data.eatingAmount || '미입력'}
- 소화 기능: ${data.digestion || '미입력'}
- 입맛: ${data.tasteInMouth || '미입력'}
- 울렁거림: ${data.nausea || '미입력'}

### 대변
- 배변 빈도: ${data.bowelFrequency || '미입력'}
- 변 상태: ${data.stoolConsistency || '미입력'}
- 변비 관련: ${data.constipation || '없음'}
- 가스/방귀: ${data.gas || '없음'}
- 설사: ${data.diarrhea || '미입력'}

### 소변
- 주간 소변 횟수: ${data.urinationDay || '미입력'}회
- 야간 소변 횟수: ${data.urinationNight || '미입력'}회
- 소변 증상: ${data.urinationSymptoms || '없음'}
- 부종: ${data.edema || '미입력'}

### 수면
- 수면 시간: ${data.sleepHours || '미입력'}시간
- 수면의 질: ${data.sleepQuality || '미입력'}
- 수면 문제: ${data.sleepProblems || '없음'}
- 꿈: ${data.dreams || '미입력'}

### 두통/현훈
- 두통: ${data.headache || '미입력'}
- 두통 부위: ${data.headacheLocation || '없음'}
- 어지러움: ${data.dizziness || '미입력'}

### 정신/감정
- 스트레스: ${data.stress || '미입력'}
- 불안: ${data.anxiety || '미입력'}
- 우울: ${data.depression || '미입력'}

### 흉만/심번/매핵
- 가슴 답답함: ${data.chestTightness || '미입력'}
- 가슴 두근거림: ${data.palpitation || '미입력'}
- 목 이물감: ${data.throatDiscomfort || '미입력'}

### 여성건강 (해당시)
- 생리 유무: ${data.menstruation || '미입력'}
- 생리 주기: ${data.menstrualCycle || '미입력'}
- 생리량: ${data.menstrualAmount || '미입력'}
- 생리통: ${data.menstrualPain || '미입력'}

---

위 데이터를 바탕으로 다음을 분석해주세요:

1. **사상체질**: 태양인, 태음인, 소양인, 소음인 중 추정
2. **팔강변증**: 음양/표리/한열/허실
3. **장부변증**: 관련 장부 허실 상태
4. **예상 질환**: 한의학적 병증
5. **형색성정**: 예상되는 형/색/성/정

반드시 아래 JSON 형식으로만 응답해주세요:
{
  "constitution": {
    "type": "체질명",
    "confidence": "높음/중간/낮음",
    "rationale": "근거"
  },
  "eightPrinciples": {
    "yinYang": "음/양",
    "exteriorInterior": "표/리",
    "coldHeat": "한/열",
    "deficiencyExcess": "허/실"
  },
  "organAnalysis": {
    "pattern": "장부변증 패턴"
  },
  "expectedConditions": ["예상 질환1", "예상 질환2"],
  "formColorNatureEmotion": {
    "form": "형",
    "color": "색",
    "nature": "성",
    "emotion": "정"
  },
  "chartSummary": {
    "headache": "두통 요약",
    "dizziness": "현훈 요약",
    "thirst": "구갈 요약",
    "bitterMouth": "구고 요약",
    "chestFullness": "흉만 요약",
    "irritability": "심번 요약",
    "throatObstruction": "매핵 요약",
    "appetite": "식욕 요약",
    "digestion": "소화 요약",
    "bowel": "대변 요약",
    "urination": "소변 요약",
    "belching": "트림 요약",
    "flatulence": "방귀 요약",
    "menstruation": "생리 요약",
    "sweating": "한출 요약",
    "sleep": "수면 요약",
    "edema": "부종 요약",
    "coldHeat": "한열 요약"
  },
  "recommendedPrescriptions": ["추천 처방1", "추천 처방2"],
  "additionalObservations": ["관찰사항1"]
}`;
}

function parseAnalysisResponse(responseText) {
  try {
    let jsonText = responseText;

    // ```json ... ``` 블록 제거
    const jsonBlockMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonBlockMatch) {
      jsonText = jsonBlockMatch[1];
    } else {
      const codeBlockMatch = responseText.match(/```\s*([\s\S]*?)\s*```/);
      if (codeBlockMatch) {
        jsonText = codeBlockMatch[1];
      }
    }

    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('JSON 형식을 찾을 수 없습니다');
  } catch (error) {
    console.error('JSON 파싱 오류:', error.message);
    return {
      rawAnalysis: responseText,
      parseError: true
    };
  }
}
