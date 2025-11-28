/**
 * 아현재한의원 환자 설문 AI 분석 시스템
 * Google Apps Script 버전
 *
 * Tally Form → Google Sheets → Gemini AI 분석 → Slack 전송
 */

// ============================================
// 설정 (여기에 본인의 키를 입력하세요)
// ============================================
const CONFIG = {
  GEMINI_API_KEY: 'YOUR_GEMINI_API_KEY_HERE',  // Google AI Studio API 키
  SLACK_WEBHOOK_URL: 'YOUR_SLACK_WEBHOOK_URL_HERE',  // Slack Incoming Webhook URL
  GEMINI_MODEL: 'gemini-1.5-flash',  // 사용할 Gemini 모델 (gemini-1.5-pro, gemini-1.5-flash)

  // 제외할 시트 이름 (분석하지 않을 시트)
  EXCLUDED_SHEETS: ['설정', '통계', 'Sheet1', '시트1'],
};

// ============================================
// 메인 트리거 함수 - 새 응답 시 자동 실행
// ============================================
function onFormSubmit(e) {
  try {
    // 변경된 시트 자동 감지
    let sheet;
    let lastRow;

    if (e && e.range) {
      // 트리거 이벤트에서 시트 정보 가져오기
      sheet = e.range.getSheet();
      lastRow = e.range.getRow();
    } else {
      // 수동 실행 시 활성 시트의 마지막 행
      sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
      lastRow = sheet.getLastRow();
    }

    const sheetName = sheet.getName();

    // 제외할 시트인지 확인
    if (CONFIG.EXCLUDED_SHEETS.includes(sheetName)) {
      Logger.log('제외된 시트: ' + sheetName);
      return;
    }

    // 데이터가 있는지 확인
    if (lastRow < 2) {
      Logger.log('데이터가 없습니다.');
      return;
    }

    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const values = sheet.getRange(lastRow, 1, 1, sheet.getLastColumn()).getValues()[0];

    // 데이터 파싱 (시트 이름도 포함)
    const patientData = parseSheetData(headers, values);
    patientData.surveyType = sheetName;  // 설문 유형 (시트 이름)

    // AI 분석 수행
    const analysis = analyzeWithGemini(patientData);

    // 차트 포맷팅
    const chartOutput = formatChart(patientData, analysis);

    // Slack 전송 (설문 유형 포함)
    sendToSlack(patientData, analysis, chartOutput);

    // 분석 결과를 시트에도 기록 (선택사항)
    recordAnalysis(sheet, lastRow, analysis);

    Logger.log('분석 완료: ' + patientData.name + ' (시트: ' + sheetName + ')');

  } catch (error) {
    Logger.log('오류 발생: ' + error.message);
    sendErrorToSlack(error.message);
  }
}

// ============================================
// 수동 실행 함수 (테스트용) - 현재 활성 시트에서 실행
// ============================================
function testAnalysis() {
  // 현재 활성화된 시트에서 테스트
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const sheetName = sheet.getName();
  const lastRow = sheet.getLastRow();

  Logger.log('테스트 시트: ' + sheetName + ', 마지막 행: ' + lastRow);

  if (lastRow < 2) {
    Logger.log('데이터가 없습니다. 시트에 설문 데이터를 먼저 추가해주세요.');
    return;
  }

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const values = sheet.getRange(lastRow, 1, 1, sheet.getLastColumn()).getValues()[0];

  const patientData = parseSheetData(headers, values);
  patientData.surveyType = sheetName;
  Logger.log('파싱된 데이터: ' + JSON.stringify(patientData));

  const analysis = analyzeWithGemini(patientData);
  Logger.log('분석 결과: ' + JSON.stringify(analysis));

  const chartOutput = formatChart(patientData, analysis);
  Logger.log('차트 출력:\n' + chartOutput);

  sendToSlack(patientData, analysis, chartOutput);
}

// ============================================
// 시트 데이터 파싱
// ============================================
function parseSheetData(headers, values) {
  const data = {};

  // Tally 필드명 → 내부 변수명 매핑
  const fieldMapping = {
    // 기본 정보
    '성함을 입력해주세요': 'name',
    '성별을 선택해주세요': 'gender',
    '나이를 입력해주세요': 'age',
    '직업을 입력해주세요': 'occupation',
    '키를 입력해주세요': 'height',
    '체중을 입력해주세요': 'weight',

    // 주소
    '가장 치료받고 싶은 증상 1순위는 무엇인가요?': 'mainSymptom1',
    '2순위 증상이 있다면 적어주세요': 'mainSymptom2',
    '3순위 증상이 있다면 적어주세요': 'mainSymptom3',
    '현재 복용 중인 약이나 건강식품이 있나요?': 'currentMedication',
    '과거 또는 현재 앓고 있는 병이나 수술 이력이 있나요?': 'medicalHistory',

    // 한열
    '추위를 어느 정도 타시나요?': 'coldSensitivity',
    '어떤 부위가 차갑나요?': 'coldAreas',
    '추위와 더위 중 무엇을 더 타나요?': 'coldVsHeat',
    '더위를 어느 정도 타시나요?': 'heatSensitivity',
    '열이 달아오르는 상황이 있다면 언제인가요?': 'heatFlushSituation',

    // 땀
    '땀이 어느 정도 나나요?': 'sweatAmount',
    '땀이 많이 나는 부위는 어디인가요?': 'sweatAreas',
    '운동, 목욕, 사우나로 땀을 빼고 나면 어떤가요?': 'sweatEffect',

    // 음수
    '하루 물 섭취량은 얼마나 되나요?': 'waterIntake',
    '주로 어떤 온도의 물을 마시나요?': 'waterTemperature',
    '갈증이나 구강 건조 증상이 있나요?': 'thirst',

    // 체력
    '나의 체력 수준은?': 'stamina',

    // 기호
    '다음 중 특별히 좋아하는 맛이 있나요?': 'tastePreference',
    '술은 얼마나 자주 마시나요?': 'alcoholFrequency',
    '한 번에 얼마나 마시나요?': 'alcoholAmount',
    '담배를 피우시나요?': 'smoking',

    // 식욕/소화
    '하루 식사는 몇 끼 하시나요?': 'mealsPerDay',
    '평소 식욕은 어떤가요?': 'appetite',
    '먹는 양은 어느 정도인가요?': 'eatingAmount',
    '평소 위(윗배) 소화 기능은 어떤가요?': 'digestion',
    '최근 식사 시 입맛이 어떤가요?': 'tasteInMouth',
    '울렁거리거나 메슥거리는 느낌이 있나요?': 'nausea',

    // 대변
    '대변은 며칠에 몇번 보시나요?': 'bowelFrequency',
    '대변의 상태는 보통 어떤가요?': 'stoolConsistency',
    '대변 관련 해당하는 것을 선택해주세요': 'constipation',
    '배에 가스가 차거나 방귀가 많나요?': 'gas',
    '설사를 자주 하시나요?': 'diarrhea',

    // 소변
    '낮에 깨어있을 때 소변은 몇 번 보시나요?': 'urinationDay',
    '밤에 자다가 일어나서 소변을 보시나요?': 'urinationNight',
    '소변 관련 증상이 있나요?': 'urinationSymptoms',
    '붓는 증상이 있나요?': 'edema',

    // 수면
    '평균 수면 시간은 몇 시간인가요?': 'sleepHours',
    '수면의 질은 어떤가요?': 'sleepQuality',
    '수면 관련 증상이 있나요?': 'sleepProblems',
    '꿈을 많이 꾸나요?': 'dreams',

    // 두통/현훈
    '두통이 있나요?': 'headache',
    '두통 부위는 어디인가요?': 'headacheLocation',
    '어지러움이 있나요?': 'dizziness',

    // 정신/감정
    '평소 스트레스는 어느 정도인가요?': 'stress',
    '불안감이 있나요?': 'anxiety',
    '우울감이 있나요?': 'depression',

    // 흉만/심번
    '가슴이 답답한 증상이 있나요?': 'chestTightness',
    '가슴이 두근거리는 증상이 있나요?': 'palpitation',
    '목에 뭔가 걸린 느낌이 있나요?': 'throatDiscomfort',

    // 여성건강
    '생리를 하고 계신가요?': 'menstruation',
    '생리 주기는 어떤가요?': 'menstrualCycle',
    '생리량은 어떤가요?': 'menstrualAmount',
    '생리통이 있나요?': 'menstrualPain',
  };

  headers.forEach((header, index) => {
    const cleanHeader = header.toString().trim();
    const key = fieldMapping[cleanHeader] || cleanHeader;
    const value = values[index];

    if (value !== undefined && value !== '') {
      data[key] = value;
    }
  });

  return data;
}

// ============================================
// Google Gemini AI 분석
// ============================================
function analyzeWithGemini(patientData) {
  const prompt = buildAnalysisPrompt(patientData);

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${CONFIG.GEMINI_MODEL}:generateContent?key=${CONFIG.GEMINI_API_KEY}`;

  const payload = {
    contents: [
      {
        parts: [
          {
            text: prompt
          }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 8192,
    },
    safetySettings: [
      {
        category: "HARM_CATEGORY_HARASSMENT",
        threshold: "BLOCK_NONE"
      },
      {
        category: "HARM_CATEGORY_HATE_SPEECH",
        threshold: "BLOCK_NONE"
      },
      {
        category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
        threshold: "BLOCK_NONE"
      },
      {
        category: "HARM_CATEGORY_DANGEROUS_CONTENT",
        threshold: "BLOCK_NONE"
      }
    ]
  };

  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(url, options);
  const result = JSON.parse(response.getContentText());

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

반드시 아래 JSON 형식으로만 응답해주세요. 다른 텍스트 없이 JSON만 출력하세요:
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
    // JSON 블록 추출 (```json ... ``` 형식 처리)
    let jsonText = responseText;

    // ```json ... ``` 블록 제거
    const jsonBlockMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonBlockMatch) {
      jsonText = jsonBlockMatch[1];
    } else {
      // ``` ... ``` 블록 제거
      const codeBlockMatch = responseText.match(/```\s*([\s\S]*?)\s*```/);
      if (codeBlockMatch) {
        jsonText = codeBlockMatch[1];
      }
    }

    // JSON 객체 추출
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('JSON 형식을 찾을 수 없습니다');
  } catch (error) {
    Logger.log('JSON 파싱 오류: ' + error.message);
    Logger.log('원본 응답: ' + responseText);
    return {
      rawAnalysis: responseText,
      parseError: true
    };
  }
}
