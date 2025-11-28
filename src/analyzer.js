import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';

dotenv.config();

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

/**
 * 환자 설문 데이터를 AI로 분석하여 체질과 예상질환을 도출
 */
export async function analyzePatient(patientData) {
  const prompt = buildAnalysisPrompt(patientData);

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    const analysisText = response.content[0].text;
    return parseAnalysisResponse(analysisText);
  } catch (error) {
    console.error('AI Analysis error:', error);
    throw new Error('AI 분석 중 오류가 발생했습니다: ' + error.message);
  }
}

/**
 * 분석 프롬프트 생성
 */
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
- 차가운 부위: ${Array.isArray(data.coldAreas) ? data.coldAreas.join(', ') : data.coldAreas || '없음'}
- 한증 증상: ${Array.isArray(data.coldSymptoms) ? data.coldSymptoms.join(', ') : data.coldSymptoms || '없음'}
- 아랫배 증상: ${data.lowerAbdomenSymptoms || '없음'}
- 추위 vs 더위: ${data.coldVsHeat || '미입력'}
- 더위 민감도: ${data.heatSensitivity || '미입력'}
- 열증 증상: ${Array.isArray(data.heatSymptoms) ? data.heatSymptoms.join(', ') : data.heatSymptoms || '없음'}
- 열이 달아오르는 상황: ${data.heatFlushSituation || '없음'}

### 땀(汗)
- 땀 양: ${data.sweatAmount || '미입력'}
- 땀 많은 부위: ${Array.isArray(data.sweatAreas) ? data.sweatAreas.join(', ') : data.sweatAreas || '없음'}
- 땀 후 상태: ${data.sweatEffect || '미입력'}

### 음수(飮水)
- 하루 물 섭취량: ${data.waterIntake || '미입력'}L
- 선호 물 온도: ${data.waterTemperature || '미입력'}
- 갈증/구강건조: ${Array.isArray(data.thirst) ? data.thirst.join(', ') : data.thirst || '없음'}

### 체력
- 체력 수준: ${data.stamina || '미입력'}

### 기호식품
- 선호 맛: ${Array.isArray(data.tastePreference) ? data.tastePreference.join(', ') : data.tastePreference || '없음'}
- 음주 빈도: ${data.alcoholFrequency || '미입력'}
- 음주량: ${data.alcoholAmount || '미입력'}
- 음주 관련 증상: ${Array.isArray(data.alcoholSymptoms) ? data.alcoholSymptoms.join(', ') : data.alcoholSymptoms || '없음'}
- 흡연: ${data.smoking || '미입력'}
- 흡연량: ${data.smokingAmount || '미입력'}갑/일

### 식욕/소화
- 하루 식사 횟수: ${data.mealsPerDay || '미입력'}끼
- 식사 시간: ${Array.isArray(data.mealTimes) ? data.mealTimes.join(', ') : data.mealTimes || '미입력'}
- 식욕: ${data.appetite || '미입력'}
- 식사량: ${data.eatingAmount || '미입력'}
- 소화 기능: ${data.digestion || '미입력'}
- 입맛: ${data.tasteInMouth || '미입력'}
- 소화 증상: ${Array.isArray(data.digestionSymptoms) ? data.digestionSymptoms.join(', ') : data.digestionSymptoms || '없음'}
- 울렁거림: ${data.nausea || '미입력'}
- 울렁거림 상황: ${data.nauseaSituation || '없음'}

### 대변
- 배변 빈도: ${data.bowelFrequency || '미입력'}
- 변 상태: ${data.stoolConsistency || '미입력'}
- 변비 관련: ${Array.isArray(data.constipation) ? data.constipation.join(', ') : data.constipation || '없음'}
- 가스/방귀: ${Array.isArray(data.gas) ? data.gas.join(', ') : data.gas || '없음'}
- 설사: ${data.diarrhea || '미입력'}
- 설사 상황: ${Array.isArray(data.diarrheaTriggers) ? data.diarrheaTriggers.join(', ') : data.diarrheaTriggers || '없음'}

### 소변
- 주간 소변 횟수: ${data.urinationDay || '미입력'}회
- 야간 소변 횟수: ${data.urinationNight || '미입력'}회
- 소변 증상: ${Array.isArray(data.urinationSymptoms) ? data.urinationSymptoms.join(', ') : data.urinationSymptoms || '없음'}
- 부종: ${data.edema || '미입력'}
- 부종 부위: ${data.edemaAreas || '없음'}
- 부종 시간: ${data.edemaTime || '없음'}

### 수면
- 수면 시간: ${data.sleepHours || '미입력'}시간
- 수면의 질: ${data.sleepQuality || '미입력'}
- 수면 문제: ${Array.isArray(data.sleepProblems) ? data.sleepProblems.join(', ') : data.sleepProblems || '없음'}
- 꿈: ${data.dreams || '미입력'}

### 두통
- 두통 유무: ${data.headache || '미입력'}
- 두통 부위: ${data.headacheLocation || '없음'}
- 두통 양상: ${data.headachePattern || '없음'}
- 두통 정도: ${data.headacheIntensity || '미입력'}

### 현훈(어지러움)
- 어지러움: ${data.dizziness || '미입력'}
- 어지러움 양상: ${data.dizzinessPattern || '없음'}

### 정신/감정
- 스트레스: ${data.stress || '미입력'}
- 스트레스 원인: ${data.stressCause || '없음'}
- 불안: ${data.anxiety || '미입력'}
- 우울: ${data.depression || '미입력'}
- 기타 정신 증상: ${Array.isArray(data.mentalSymptoms) ? data.mentalSymptoms.join(', ') : data.mentalSymptoms || '없음'}

### 흉만/심번/매핵기
- 가슴 답답함: ${data.chestTightness || '미입력'}
- 가슴 두근거림: ${data.palpitation || '미입력'}
- 목 이물감: ${data.throatDiscomfort || '미입력'}

### 여성건강 (해당시)
- 생리 유무: ${data.menstruation || '미입력'}
- 생리 주기: ${data.menstrualCycle || '미입력'}
- 생리량: ${data.menstrualAmount || '미입력'}
- 생리통: ${data.menstrualPain || '미입력'}
- 생리 증상: ${Array.isArray(data.menstrualSymptoms) ? data.menstrualSymptoms.join(', ') : data.menstrualSymptoms || '없음'}

---

## 분석 요청

위 데이터를 바탕으로 다음 항목들을 분석해주세요:

1. **사상체질 분석**: 태양인, 태음인, 소양인, 소음인 중 가장 가능성 높은 체질과 그 근거
2. **팔강변증**: 음양, 표리, 한열, 허실 관점에서의 분석
3. **장부변증**: 관련된 장부의 허실 상태 분석
4. **예상 질환/증후군**: 한의학적 관점에서 예상되는 병증
5. **주의 관찰 사항**: 진료 시 추가로 확인해야 할 사항
6. **형색성정 분석**: 예상되는 형(形), 색(色), 성(性), 정(情) 특성

응답은 다음 JSON 형식으로 해주세요:
{
  "constitution": {
    "type": "체질명",
    "confidence": "높음/중간/낮음",
    "rationale": "근거 설명"
  },
  "eightPrinciples": {
    "yinYang": "음/양",
    "exteriorInterior": "표/리",
    "coldHeat": "한/열",
    "deficiencyExcess": "허/실",
    "summary": "종합 설명"
  },
  "organAnalysis": {
    "affected": ["관련 장부 목록"],
    "pattern": "장부변증 패턴",
    "description": "상세 설명"
  },
  "expectedConditions": ["예상 질환1", "예상 질환2"],
  "additionalObservations": ["관찰사항1", "관찰사항2"],
  "formColorNatureEmotion": {
    "form": "형 특성",
    "color": "색 특성",
    "nature": "성 특성",
    "emotion": "정 특성"
  },
  "chartSummary": {
    "headache": "두통 관련 요약",
    "dizziness": "현훈 관련 요약",
    "thirst": "구갈 관련 요약",
    "bitterMouth": "구고 관련 요약",
    "chestFullness": "흉만 관련 요약",
    "irritability": "심번 관련 요약",
    "throatObstruction": "매핵 관련 요약",
    "appetite": "식욕 관련 요약",
    "digestion": "소화 관련 요약",
    "bowel": "대변 관련 요약",
    "urination": "소변 관련 요약",
    "belching": "트림 관련 요약",
    "flatulence": "방귀 관련 요약",
    "menstruation": "생리 관련 요약",
    "sweating": "한출 관련 요약",
    "sleep": "수면 관련 요약",
    "edema": "부종 관련 요약",
    "coldHeat": "한열 관련 요약"
  },
  "recommendedPrescriptions": ["추천 처방 후보1", "추천 처방 후보2"]
}`;
}

/**
 * AI 응답 파싱
 */
function parseAnalysisResponse(responseText) {
  try {
    // JSON 블록 추출
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('JSON 형식을 찾을 수 없습니다');
  } catch (error) {
    console.error('JSON parsing error:', error);
    // 파싱 실패 시 원본 텍스트 반환
    return {
      rawAnalysis: responseText,
      parseError: true
    };
  }
}
