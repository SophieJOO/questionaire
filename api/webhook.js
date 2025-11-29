/**
 * Tally Webhook 수신 엔드포인트
 * Vercel Serverless Function
 */

export default async function handler(req, res) {
  // CORS 헤더
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    return res.status(200).json({ status: 'ok', message: '환자 설문 AI 분석 서버 작동 중' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Tally webhook received');

    const tallyData = req.body;
    const patientData = parseTallyData(tallyData);
    console.log('Parsed patient:', patientData.name);

    const analysis = await analyzeWithGemini(patientData);
    console.log('Analysis complete');

    const chartOutput = formatChart(patientData, analysis);

    // 원장용 상세 분석 슬랙 전송
    await sendToSlack(patientData, analysis, chartOutput);
    console.log('Slack sent');

    // 직원용 간단 알림 슬랙 전송
    await sendToStaffSlack(patientData);
    console.log('Staff slack sent');

    return res.status(200).json({
      success: true,
      message: '설문 분석 완료',
      patient: patientData.name,
      constitution: analysis.constitution?.type
    });

  } catch (error) {
    console.error('Webhook error:', error);

    try {
      await sendErrorToSlack(error.message);
    } catch (e) {
      console.error('Slack error notification failed:', e);
    }

    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

async function sendErrorToSlack(errorMessage) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) return;

  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: `⚠️ 설문 분석 오류: ${errorMessage}`
    })
  });
}

// ========== PARSER ==========

function parseTallyData(tallyData) {
  const data = {};
  const formName = tallyData.data?.formName || '';
  const formId = tallyData.data?.formId || '';
  const responseId = tallyData.data?.responseId || '';
  const fields = tallyData.data?.fields || [];

  data.surveyType = getSurveyType(formName);
  data.formId = formId;
  data.responseId = responseId;

  // Tally 응답 URL 생성
  if (formId && responseId) {
    data.tallyResponseUrl = `https://tally.so/r/${formId}`;
  }

  // 원본 응답 저장 (라벨: 값 형태)
  data.rawResponses = [];
  fields.forEach(field => {
    const label = field.label || '';
    const value = extractValue(field);
    if (label && value) {
      data.rawResponses.push({ label, value });
    }
  });

  fields.forEach(field => {
    const label = field.label || '';
    const value = extractValue(field);

    if (!value) return;

    if (label.includes('성함') || label.includes('이름') || label.includes('성명')) {
      data.name = value;
    } else if (label.includes('성별') || label.includes('남/녀') || label.includes('남녀')) {
      data.gender = value;
    } else if (label.includes('나이') || label.includes('연령') || label.includes('만 ') || label.includes('출생')) {
      data.age = value;
    } else if (label.includes('직업') || label.includes('직종') || label.includes('하시는 일')) {
      data.occupation = value;
    } else if (label.includes('학년')) {
      data.grade = value;
      data.occupation = value + ' 학생'; // 직업 필드에도 학생으로 표시
    }
    // 청소년용: 부모 키 (성장 예측용)
    else if (label.includes('아버지') && label.includes('키')) {
      data.fatherHeight = value;
    } else if (label.includes('어머니') && label.includes('키')) {
      data.motherHeight = value;
    }
    // 청소년용: 본인 키/체중
    else if ((label.includes('키') || label.includes('신장')) && !label.includes('트림') && !label.includes('아버지') && !label.includes('어머니')) {
      data.height = value;
    } else if (label.includes('체중') || label.includes('몸무게')) {
      data.weight = value;
    }
    // 청소년용: 성장 진료
    else if (label.includes('성장') && (label.includes('관심') || label.includes('진료'))) {
      data.growthInterest = value;
    }
    else if (label.includes('1순위') || label.includes('치료받고 싶은 증상')) {
      data.mainSymptom1 = value;
    } else if (label.includes('2순위')) {
      data.mainSymptom2 = value;
    } else if (label.includes('3순위')) {
      data.mainSymptom3 = value;
    }
    else if (label.includes('복용') && (label.includes('약') || label.includes('건강식품'))) {
      data.currentMedication = value;
    } else if (label.includes('병') || label.includes('수술')) {
      data.medicalHistory = value;
    }
    else if (label.includes('추위') && label.includes('어느 정도')) {
      data.coldSensitivity = value;
    } else if (label.includes('부위') && label.includes('차갑')) {
      data.coldAreas = value;
    } else if (label.includes('추위') && label.includes('관련') && label.includes('증상')) {
      data.coldSymptoms = value;
    } else if (label.includes('아랫배') || (label.includes('하복부') && label.includes('증상'))) {
      data.lowerAbdomenSymptoms = value;
    } else if (label.includes('추위') && label.includes('더위') && label.includes('중')) {
      data.coldVsHeat = value;
    } else if (label.includes('더위') && label.includes('어느 정도')) {
      data.heatSensitivity = value;
    } else if (label.includes('더위') && label.includes('관련') && label.includes('증상')) {
      data.heatSymptoms = value;
    } else if (label.includes('열') && label.includes('달아오르')) {
      data.heatFlushSituation = value;
    }
    else if (label.includes('땀') && label.includes('어느 정도')) {
      data.sweatAmount = value;
    } else if (label.includes('땀') && label.includes('부위')) {
      data.sweatAreas = value;
    } else if (label.includes('땀') && (label.includes('운동') || label.includes('목욕') || label.includes('사우나'))) {
      data.sweatEffect = value;
    }
    else if (label.includes('물') && label.includes('섭취량')) {
      data.waterIntake = value;
    } else if (label.includes('물') && label.includes('온도')) {
      data.waterTemperature = value;
    } else if (label.includes('갈증') || label.includes('구강 건조')) {
      data.thirst = value;
    }
    else if (label.includes('체력')) {
      data.stamina = value;
    }
    else if (label.includes('맛') && label.includes('좋아하')) {
      data.tastePreference = value;
    } else if (label.includes('술') && label.includes('자주')) {
      data.alcoholFrequency = value;
    } else if (label.includes('술') && label.includes('얼마나')) {
      data.alcoholAmount = value;
    } else if (label.includes('술') && label.includes('증상')) {
      data.alcoholSymptoms = value;
    } else if (label.includes('담배') || label.includes('흡연')) {
      data.smoking = value;
    } else if (label.includes('하루') && (label.includes('개비') || label.includes('갑'))) {
      data.smokingAmount = value;
    }
    else if (label.includes('식사') && label.includes('몇 끼')) {
      data.mealsPerDay = value;
    } else if (label.includes('끼니') && (label.includes('거르') || label.includes('챙기'))) {
      data.skippedMeals = value;
    } else if (label.includes('아침') && (label.includes('거르') || label.includes('챙기'))) {
      data.skippedMeals = value;
    } else if (label.includes('식사') && label.includes('시간')) {
      data.mealTimes = value;
    } else if (label.includes('식욕')) {
      data.appetite = value;
    } else if (label.includes('먹는 양') || label.includes('식사량')) {
      data.eatingAmount = value;
    } else if (label.includes('소화') && label.includes('기능')) {
      data.digestion = value;
    } else if (label.includes('입맛')) {
      data.tasteInMouth = value;
    } else if (label.includes('소화') && label.includes('증상')) {
      data.digestiveSymptoms = value;
    } else if (label.includes('식도') || label.includes('역류') || label.includes('속쓰림')) {
      data.stomachSymptoms = value;
    } else if (label.includes('울렁') || label.includes('메슥')) {
      data.nausea = value;
    } else if (label.includes('증상') && label.includes('상황') && (label.includes('소화') || label.includes('위'))) {
      data.digestiveTrigger = value;
    }
    else if (label.includes('대변') && (label.includes('며칠') || label.includes('몇번') || label.includes('빈도'))) {
      data.bowelFrequency = value;
    } else if (label.includes('대변') && label.includes('상태')) {
      data.stoolConsistency = value;
    } else if (label.includes('대변') && label.includes('증상')) {
      data.bowelSymptoms = value;
    } else if (label.includes('변비')) {
      data.constipation = value;
    } else if (label.includes('가스') || label.includes('방귀')) {
      data.gas = value;
    } else if (label.includes('설사') && label.includes('빈도')) {
      data.diarrheaFrequency = value;
    } else if (label.includes('설사') && (label.includes('유발') || label.includes('상황'))) {
      data.diarrheaTriggers = value;
    } else if (label.includes('설사') && label.includes('정도')) {
      data.diarrheaSeverity = value;
    } else if (label.includes('설사')) {
      data.diarrhea = value;
    }
    else if (label.includes('소변') && label.includes('낮')) {
      data.urinationDay = value;
    } else if (label.includes('소변') && label.includes('밤')) {
      data.urinationNight = value;
    } else if (label.includes('소변') && label.includes('증상')) {
      data.urinationSymptoms = value;
    } else if (label.includes('붓') && label.includes('증상')) {
      data.edema = value;
    }
    else if (label.includes('수면') && label.includes('시간')) {
      data.sleepHours = value;
    } else if (label.includes('취침') || (label.includes('잠') && label.includes('드는'))) {
      data.bedTime = value;
    } else if (label.includes('기상') || (label.includes('일어나') && label.includes('시간'))) {
      data.wakeTime = value;
    } else if (label.includes('수면') && label.includes('질')) {
      data.sleepQuality = value;
    } else if (label.includes('수면') && (label.includes('문제') || label.includes('장애'))) {
      data.sleepProblems = value;
    } else if (label.includes('입면') || (label.includes('잠') && label.includes('들기'))) {
      data.sleepOnset = value;
    } else if (label.includes('중간') && label.includes('깸')) {
      data.sleepInterruption = value;
    } else if (label.includes('꿈')) {
      data.dreams = value;
    }
    else if (label.includes('두통') && !label.includes('부위')) {
      data.headache = value;
    } else if (label.includes('두통') && label.includes('부위')) {
      data.headacheLocation = value;
    } else if (label.includes('어지러')) {
      data.dizziness = value;
    }
    // 두부/안구 관련
    else if (label.includes('안구') || label.includes('눈') && (label.includes('불편') || label.includes('피로') || label.includes('건조') || label.includes('침침') || label.includes('충혈'))) {
      data.eyeDiscomfort = value;
    } else if (label.includes('이명') || label.includes('귀') && label.includes('울림')) {
      data.tinnitus = value;
    }
    else if (label.includes('스트레스')) {
      data.stress = value;
    } else if (label.includes('불안')) {
      data.anxiety = value;
    } else if (label.includes('우울')) {
      data.depression = value;
    }
    else if (label.includes('가슴') && label.includes('답답')) {
      data.chestTightness = value;
    } else if (label.includes('가슴') && label.includes('두근')) {
      data.palpitation = value;
    } else if (label.includes('목') && (label.includes('걸린') || label.includes('이물') || label.includes('막힌'))) {
      data.throatDiscomfort = value;
    } else if (label.includes('삼키') || label.includes('연하')) {
      data.swallowingDifficulty = value;
    }
    // 여성건강 확장
    else if (label.includes('생리') && label.includes('하고 계신')) {
      data.menstruation = value;
    } else if (label.includes('생리') && label.includes('주기')) {
      data.menstrualCycle = value;
    } else if (label.includes('생리') && label.includes('량')) {
      data.menstrualAmount = value;
    } else if (label.includes('생리통')) {
      data.menstrualPain = value;
    } else if (label.includes('마지막') && label.includes('생리')) {
      data.lastMenstruation = value;
    } else if (label.includes('출산') || label.includes('분만')) {
      data.childbirthHistory = value;
    } else if (label.includes('유산') || label.includes('임신') && label.includes('중단')) {
      data.miscarriageHistory = value;
    } else if (label.includes('임신') && (label.includes('횟수') || label.includes('경험'))) {
      data.pregnancyHistory = value;
    } else if (label.includes('폐경') || label.includes('완경')) {
      data.menopause = value;
    } else if (label.includes('대하') || label.includes('냉') || label.includes('질분비물')) {
      data.vaginalDischarge = value;
    }
    // 컨디션/패턴/기타 증상
    else if (label.includes('나빠질 때') || label.includes('패턴') || label.includes('악화')) {
      data.worseningPattern = value;
    } else if (label.includes('컨디션') || label.includes('좌우') || label.includes('중요한 요소')) {
      data.conditionFactor = value;
    } else if (label.includes('기타') || label.includes('특이') || label.includes('알아주') || label.includes('자유롭게')) {
      data.otherSymptoms = value;
    }
    // ===== 청소년 특화 항목 =====
    // 집중력/학업
    else if (label.includes('집중') || label.includes('주의력')) {
      data.concentration = value;
    } else if (label.includes('학업') || label.includes('공부') || label.includes('성적')) {
      data.academicPerformance = value;
    } else if (label.includes('산만') || label.includes('ADHD') || label.includes('과잉')) {
      data.hyperactivity = value;
    }
    // 야뇨증 (소아청소년)
    else if (label.includes('야뇨') || (label.includes('밤') && label.includes('오줌')) || label.includes('이불')) {
      data.bedwetting = value;
    }
    // 성장 관련 상세
    else if (label.includes('성장판') || label.includes('골연령')) {
      data.growthPlate = value;
    } else if (label.includes('성조숙') || label.includes('조숙증')) {
      data.precociousPuberty = value;
    } else if (label.includes('2차') && label.includes('성징')) {
      data.secondarySexCharacteristics = value;
    }
    // 초경 (여학생)
    else if (label.includes('초경') || (label.includes('처음') && label.includes('생리'))) {
      data.menarche = value;
    }
    // 비염/아토피/알레르기 (소아청소년 흔한 질환)
    else if (label.includes('비염') || label.includes('코막힘') || label.includes('콧물')) {
      data.rhinitis = value;
    } else if (label.includes('아토피') || label.includes('피부염')) {
      data.atopy = value;
    } else if (label.includes('알레르기') || label.includes('알러지')) {
      data.allergy = value;
    } else if (label.includes('천식') || label.includes('기관지')) {
      data.asthma = value;
    }
    // 게임/스마트폰 (청소년 생활습관)
    else if (label.includes('게임') || label.includes('스마트폰') || label.includes('핸드폰') || label.includes('미디어')) {
      data.screenTime = value;
    }
    // 운동/신체활동
    else if (label.includes('운동') && (label.includes('빈도') || label.includes('자주') || label.includes('하루'))) {
      data.exerciseFrequency = value;
    } else if (label.includes('운동') && label.includes('종류')) {
      data.exerciseType = value;
    }
  });

  return data;
}

function extractValue(field) {
  // 디버그: 필드 구조 로깅
  console.log(`Field [${field.label}]:`, JSON.stringify(field).substring(0, 200));

  // 1. options가 있고 value가 옵션 ID인 경우 (버튼/라디오/드롭다운)
  if (field.options && Array.isArray(field.options) && field.options.length > 0) {
    // value가 옵션 ID인 경우 해당 옵션의 text 반환
    if (field.value) {
      const selectedOption = field.options.find(opt => opt.id === field.value);
      if (selectedOption) {
        return selectedOption.text || selectedOption.name || String(field.value);
      }
    }
    // value가 배열인 경우 (다중 선택)
    if (Array.isArray(field.value)) {
      const selectedTexts = field.value.map(val => {
        const opt = field.options.find(o => o.id === val);
        return opt ? (opt.text || opt.name) : val;
      });
      return selectedTexts.join(', ');
    }
  }

  // 2. 직접 값이 있는 경우 (텍스트 입력, 숫자 등)
  if (field.value !== undefined && field.value !== null && field.value !== '') {
    if (Array.isArray(field.value)) {
      return field.value.join(', ');
    }
    return String(field.value);
  }

  // 3. answer 필드가 있는 경우
  if (field.answer !== undefined && field.answer !== null && field.answer !== '') {
    if (Array.isArray(field.answer)) {
      return field.answer.join(', ');
    }
    return String(field.answer);
  }

  // 4. text 필드가 있는 경우
  if (field.text) {
    return String(field.text);
  }

  return null;
}

function getSurveyType(formName) {
  if (!formName) return '일반';
  const name = formName.toLowerCase();
  if (name.includes('성인') || name.includes('adult')) return '성인';
  if (name.includes('청소년') || name.includes('teen')) return '청소년';
  if (name.includes('다이어트') || name.includes('diet')) return '다이어트';
  if (name.includes('자보') || name.includes('자동차') || name.includes('보험')) return '자동차보험';
  if (name.includes('소아') || name.includes('아동') || name.includes('child')) return '소아';
  return formName;
}

// ========== ANALYZER ==========

async function analyzeWithGemini(patientData) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY 환경변수가 설정되지 않았습니다');
  }

  const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
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
- 추위 관련 증상: ${data.coldSymptoms || '없음'}
- 아랫배 증상: ${data.lowerAbdomenSymptoms || '없음'}
- 추위 vs 더위: ${data.coldVsHeat || '미입력'}
- 더위 민감도: ${data.heatSensitivity || '미입력'}
- 더위 관련 증상: ${data.heatSymptoms || '없음'}
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
- 음주 관련 증상: ${data.alcoholSymptoms || '없음'}
- 흡연: ${data.smoking || '미입력'}
- 하루 흡연량: ${data.smokingAmount || '미입력'}

### 식욕/소화
- 하루 식사 횟수: ${data.mealsPerDay || '미입력'}끼
- 거르는 끼니: ${data.skippedMeals || '없음'}
- 식사 시간대: ${data.mealTimes || '미입력'}
- 식욕: ${data.appetite || '미입력'}
- 식사량: ${data.eatingAmount || '미입력'}
- 소화 기능: ${data.digestion || '미입력'}
- 입맛: ${data.tasteInMouth || '미입력'}
- 소화 관련 증상: ${data.digestiveSymptoms || '없음'}
- 식도/위 증상: ${data.stomachSymptoms || '없음'}
- 울렁거림: ${data.nausea || '미입력'}
- 증상 발생 상황: ${data.digestiveTrigger || '없음'}

### 대변
- 배변 빈도: ${data.bowelFrequency || '미입력'}
- 변 상태: ${data.stoolConsistency || '미입력'}
- 대변 관련 증상: ${data.bowelSymptoms || '없음'}
- 변비 관련: ${data.constipation || '없음'}
- 가스/방귀: ${data.gas || '없음'}
- 설사 빈도: ${data.diarrheaFrequency || '미입력'}
- 설사 유발 상황: ${data.diarrheaTriggers || '없음'}
- 설사 정도: ${data.diarrheaSeverity || '미입력'}

### 소변
- 주간 소변 횟수: ${data.urinationDay || '미입력'}회
- 야간 소변 횟수: ${data.urinationNight || '미입력'}회
- 소변 증상: ${data.urinationSymptoms || '없음'}
- 부종: ${data.edema || '미입력'}

### 수면
- 수면 시간: ${data.sleepHours || '미입력'}시간
- 취침 시간: ${data.bedTime || '미입력'}
- 기상 시간: ${data.wakeTime || '미입력'}
- 수면의 질: ${data.sleepQuality || '미입력'}
- 입면 문제: ${data.sleepOnset || '없음'}
- 중간에 깸: ${data.sleepInterruption || '없음'}
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
- 초경 시기: ${data.menarche || '미입력'}

### 소아청소년 특화 정보 (해당시)
- 학년: ${data.grade || '미입력'}
- 아버지 키: ${data.fatherHeight || '미입력'}cm
- 어머니 키: ${data.motherHeight || '미입력'}cm
- 성장 진료 관심: ${data.growthInterest || '미입력'}
- 성장판/골연령: ${data.growthPlate || '미입력'}
- 성조숙증 여부: ${data.precociousPuberty || '미입력'}
- 2차 성징: ${data.secondarySexCharacteristics || '미입력'}
- 집중력: ${data.concentration || '미입력'}
- 학업/성적: ${data.academicPerformance || '미입력'}
- 과잉행동/산만함: ${data.hyperactivity || '미입력'}
- 야뇨증: ${data.bedwetting || '미입력'}
- 비염: ${data.rhinitis || '미입력'}
- 아토피: ${data.atopy || '미입력'}
- 알레르기: ${data.allergy || '미입력'}
- 천식: ${data.asthma || '미입력'}
- 게임/스마트폰 사용: ${data.screenTime || '미입력'}
- 운동 빈도: ${data.exerciseFrequency || '미입력'}
- 운동 종류: ${data.exerciseType || '미입력'}

### 컨디션 패턴 및 특이사항 (변증 참고용 - 중요)
- 몸 상태 나빠질 때 패턴: ${data.worseningPattern || '미입력'}
- 컨디션 좌우 요소: ${data.conditionFactor || '미입력'}
- 기타 특이 증상: ${data.otherSymptoms || '없음'}

---

위 데이터를 바탕으로 다음을 종합적으로 분석해주세요. 특히 "컨디션 패턴 및 특이사항" 내용을 변증 도출에 중요하게 참고해주세요:

1. **사상체질**: 태양인, 태음인, 소양인, 소음인 중 추정 (설문 내 한열/소화/정신 상태 등 종합 고려)
2. **변증**: 한의학적 변증 패턴 (예: 간비기울, 간울기체, 기음양허, 비위허한, 심비양허, 간신음허, 담음, 어혈, 기체혈어 등)
3. **변증 상세 설명**: 해당 변증의 병리기전, 주요 증상, 환자 증상과의 연관성을 상세히 설명
4. **예상 질환**: 한의학적 병증 및 양방 진단 참고명
5. **치료 방향**: 치법(治法)과 치료 전략 (예: 소간해울, 건비화담, 자음강화 등)
6. **추천 처방**: 주요 처방과 그 선택 근거
7. **침구 치료**: 추천 경혈과 자침 방법 (예: 태충, 합곡, 족삼리 등)
8. **생활 지도**: 생활습관 개선 권고사항 (수면, 운동, 스트레스 관리 등)
9. **식이 요법**: 권장 음식과 피해야 할 음식
10. **주의사항**: 치료 및 생활 시 특별히 주의할 점
11. **예후**: 예상 치료 기간 및 경과, 호전 가능성
12. **소아청소년 성장 분석** (해당시): 부모 키 기반 예상 최종 키, 현재 성장 상태 평가, 성장 촉진을 위한 한의학적 접근법

반드시 아래 JSON 형식으로만 응답해주세요:
{
  "constitution": {
    "type": "체질명",
    "confidence": "높음/중간/낮음",
    "rationale": "체질 판단 근거를 상세히 기술"
  },
  "patternDiagnosis": {
    "primary": "주요 변증 (예: 간비기울)",
    "secondary": "부차 변증 (해당시)",
    "rationale": "변증 근거",
    "pathology": "해당 변증의 병리기전과 환자 증상 연관성 상세 설명"
  },
  "expectedConditions": {
    "korean": ["한의학적 병증1", "병증2"],
    "western": ["양방 참고 진단명1", "진단명2"]
  },
  "treatmentStrategy": {
    "principle": "치법 (예: 소간해울, 건비익기)",
    "direction": "전체 치료 방향 설명",
    "priority": "우선 치료 대상 (주소 vs 변증)"
  },
  "recommendedPrescriptions": [
    {
      "name": "처방명",
      "rationale": "선택 근거"
    }
  ],
  "acupuncture": {
    "mainPoints": ["주요 경혈1", "경혈2"],
    "supplementPoints": ["보조 경혈1", "경혈2"],
    "technique": "자침 기법 (보법/사법, 유침 시간 등)",
    "rationale": "선혈 근거"
  },
  "lifestyleGuidance": {
    "sleep": "수면 관련 권고",
    "exercise": "운동 권고",
    "stress": "스트레스 관리 방법",
    "others": "기타 생활 습관"
  },
  "dietaryAdvice": {
    "recommended": ["권장 음식1", "음식2"],
    "avoid": ["피해야 할 음식1", "음식2"],
    "rationale": "식이 권고 근거"
  },
  "precautions": ["주의사항1", "주의사항2"],
  "prognosis": {
    "duration": "예상 치료 기간",
    "outlook": "예후 전망",
    "factors": "호전/악화에 영향을 미치는 요인"
  },
  "growthAnalysis": {
    "predictedHeight": "부모 키 기반 예상 최종 키 (MPH±5cm)",
    "currentStatus": "현재 성장 상태 평가",
    "growthPotential": "남은 성장 가능성",
    "recommendations": "성장 촉진을 위한 한의학적 권고 (침구, 한약, 생활습관)",
    "precociousPubertyRisk": "성조숙증 위험도 평가 (해당시)"
  }
}`;
}

function parseAnalysisResponse(responseText) {
  try {
    let jsonText = responseText;
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

// ========== CHART FORMATTER ==========

function formatChart(patientData, analysis) {
  const data = patientData;
  const height = parseFloat(data.height) || 0;
  const weight = parseFloat(data.weight) || 0;
  const bmi = height > 0 ? (weight / Math.pow(height / 100, 2)).toFixed(1) : '-';
  const gender = data.gender === '남성' ? 'M' : data.gender === '여성' ? 'F' : '_';

  const pattern = analysis.patternDiagnosis || {};
  const constitution = analysis.constitution || {};

  // 변증 문자열
  let patternStr = pattern.primary || '-';
  if (pattern.secondary) patternStr += ' / ' + pattern.secondary;

  // 청소년용 추가 정보
  const isTeen = data.grade || data.fatherHeight || data.motherHeight || data.growthInterest;
  const teenInfo = isTeen ? formatTeenInfo(data, analysis) : '';

  const chart = `${data.name || '___'}/${gender}/${data.age || '__'}세/${data.occupation || '___'}
${height || '___'}cm/${weight || '___'}kg BMI ${bmi}
BP ___/___ mmHg  PR ___회/분
추정체질: ${constitution.type || '-'} / 변증: ${patternStr}
${teenInfo}
[주소]
#1. ${extractSymptomName(data.mainSymptom1)}
o/s) ${extractOnset(data.mainSymptom1)}
mode) ${extractMode(data.mainSymptom1)}
${data.mainSymptom2 ? `#2. ${extractSymptomName(data.mainSymptom2)}
o/s) ${extractOnset(data.mainSymptom2)}
mode) ${extractMode(data.mainSymptom2)}` : ''}
${data.mainSymptom3 ? `#3. ${extractSymptomName(data.mainSymptom3)}` : ''}

po med) ${data.currentMedication || '없음'}
p/h) ${data.medicalHistory || '없음'}
f/h) 추후 확인

[부증]
[두통] ${formatHeadache(data)}
[현훈] ${formatDizziness(data)}
[구갈] ${formatThirst(data)}
[구고] ${data.tasteInMouth === '쓰다' ? '(+)' : '(-)'}
[흉만] ${formatChestFullness(data)}
[심번] ${formatIrritability(data)}
[매핵] ${formatThroatObstruction(data)}
[식욕] ${formatAppetite(data)}
[소화] ${formatDigestion(data)}
[대변] ${formatBowel(data)}
[소변] ${formatUrination(data)}
[트림] (-)
[방귀] ${data.gas && data.gas !== '해당 없음' ? '(+) ' + data.gas : '(-)'}
[생리] ${formatMenstruation(data)}
[한출] ${formatSweating(data)}
[수면] ${formatSleep(data)}
[부종] ${formatEdema(data)}
[한열] ${formatColdHeat(data)}
[정서] ${formatMental(data)}
${isTeen ? formatTeenSymptoms(data) : ''}[복진]
[첨언] ${formatAdditionalNotes(data, analysis)}
[처방]`;

  return chart;
}

// ===== 청소년 특화 포맷 함수 =====

function formatTeenInfo(data, analysis) {
  const parts = [];

  // 부모 키 정보
  if (data.fatherHeight || data.motherHeight) {
    const fh = data.fatherHeight || '?';
    const mh = data.motherHeight || '?';
    parts.push(`부모키: 父${fh}cm/母${mh}cm`);
  }

  // 성장 예측 (AI 분석 결과)
  const growth = analysis.growthAnalysis || {};
  if (growth.predictedHeight) {
    parts.push(`예상키: ${growth.predictedHeight}`);
  }

  // 성장 관심
  if (data.growthInterest === '있다' || data.growthInterest === '예') {
    parts.push('성장진료희망(+)');
  }

  return parts.length > 0 ? '\n' + parts.join(' / ') + '\n' : '';
}

function formatTeenSymptoms(data) {
  let result = '';

  // 비염/아토피/알레르기
  const allergyParts = [];
  if (data.rhinitis && data.rhinitis !== '없음' && data.rhinitis !== '해당 없음') {
    allergyParts.push('비염(+)');
  }
  if (data.atopy && data.atopy !== '없음' && data.atopy !== '해당 없음') {
    allergyParts.push('아토피(+)');
  }
  if (data.allergy && data.allergy !== '없음' && data.allergy !== '해당 없음') {
    allergyParts.push('알레르기: ' + data.allergy);
  }
  if (data.asthma && data.asthma !== '없음' && data.asthma !== '해당 없음') {
    allergyParts.push('천식(+)');
  }
  if (allergyParts.length > 0) {
    result += `[알레르기] ${allergyParts.join(' / ')}\n`;
  }

  // 집중력/학업
  const focusParts = [];
  if (data.concentration) focusParts.push('집중력: ' + data.concentration);
  if (data.hyperactivity && data.hyperactivity !== '없음' && data.hyperactivity !== '해당 없음') {
    focusParts.push('과잉행동(+)');
  }
  if (focusParts.length > 0) {
    result += `[집중력] ${focusParts.join(' / ')}\n`;
  }

  // 야뇨
  if (data.bedwetting && data.bedwetting !== '없음' && data.bedwetting !== '해당 없음') {
    result += `[야뇨] (+) ${data.bedwetting}\n`;
  }

  // 성장/2차성징
  const growthParts = [];
  if (data.growthPlate) growthParts.push('성장판: ' + data.growthPlate);
  if (data.precociousPuberty && data.precociousPuberty !== '없음' && data.precociousPuberty !== '해당 없음') {
    growthParts.push('성조숙증 의심');
  }
  if (data.secondarySexCharacteristics) growthParts.push('2차성징: ' + data.secondarySexCharacteristics);
  if (data.menarche) growthParts.push('초경: ' + data.menarche);
  if (growthParts.length > 0) {
    result += `[성장] ${growthParts.join(' / ')}\n`;
  }

  // 생활습관 (청소년)
  const lifestyleParts = [];
  if (data.screenTime) lifestyleParts.push('미디어: ' + data.screenTime);
  if (data.exerciseFrequency) lifestyleParts.push('운동: ' + data.exerciseFrequency);
  if (lifestyleParts.length > 0) {
    result += `[생활] ${lifestyleParts.join(' / ')}\n`;
  }

  return result;
}

// ===== 포맷 함수들 (기존 포맷 + 세부사항 강화) =====

function formatHeadache(data) {
  const parts = [];
  if (data.headache && data.headache !== '없다') {
    parts.push(data.headache);
    if (data.headacheLocation) parts.push('부위: ' + data.headacheLocation);
  }
  if (data.eyeDiscomfort && data.eyeDiscomfort !== '없다' && data.eyeDiscomfort !== '해당 없음') {
    parts.push('안구: ' + data.eyeDiscomfort);
  }
  if (data.tinnitus && data.tinnitus !== '없다' && data.tinnitus !== '해당 없음') {
    parts.push('이명(+)');
  }
  return parts.length > 0 ? parts.join(' / ') : '(-)';
}

function formatDizziness(data) {
  if (!data.dizziness || data.dizziness === '없다') return '(-)';
  return data.dizziness;
}

function formatThirst(data) {
  const parts = [];
  if (data.thirst && data.thirst !== '해당 없음') parts.push('(+)');
  if (data.waterIntake) parts.push('물 ' + data.waterIntake + 'L/일');
  if (data.waterTemperature) parts.push(data.waterTemperature);
  return parts.length > 0 ? parts.join(' / ') : '(-)';
}

function formatChestFullness(data) {
  if (!data.chestTightness || data.chestTightness === '없다') return '(-)';
  return '(+) ' + data.chestTightness;
}

function formatIrritability(data) {
  const parts = [];
  if (data.palpitation && data.palpitation !== '없다') {
    parts.push('심계: ' + data.palpitation);
  }
  if (data.stress) parts.push('스트레스 ' + data.stress);
  return parts.length > 0 ? parts.join(' / ') : '(-)';
}

function formatThroatObstruction(data) {
  const parts = [];
  if (data.throatDiscomfort && data.throatDiscomfort !== '없다' && data.throatDiscomfort !== '해당 없음') {
    parts.push(data.throatDiscomfort);
  }
  if (data.swallowingDifficulty && data.swallowingDifficulty !== '없다' && data.swallowingDifficulty !== '해당 없음') {
    parts.push('연하곤란(+)');
  }
  return parts.length > 0 ? '(+) ' + parts.join(' / ') : '(-)';
}

function formatAppetite(data) {
  const parts = [];
  if (data.appetite) parts.push(data.appetite);
  if (data.eatingAmount) parts.push(data.eatingAmount);
  if (data.mealsPerDay) parts.push(data.mealsPerDay + '끼/일');
  if (data.skippedMeals && data.skippedMeals !== '해당 없음') {
    parts.push('결식: ' + data.skippedMeals);
  }
  if (data.tastePreference) parts.push('선호: ' + data.tastePreference);
  return parts.join(' / ') || '(-)';
}

function formatDigestion(data) {
  const parts = [];
  if (data.digestion) parts.push(data.digestion);
  if (data.digestiveSymptoms && data.digestiveSymptoms !== '해당 없음') {
    parts.push(data.digestiveSymptoms);
  }
  if (data.stomachSymptoms && data.stomachSymptoms !== '해당 없음') {
    parts.push(data.stomachSymptoms);
  }
  if (data.nausea && data.nausea !== '없다' && data.nausea !== '해당 없음') {
    parts.push('오심(+)');
  }
  if (data.digestiveTrigger) {
    parts.push('유발: ' + data.digestiveTrigger);
  }
  return parts.join(' / ') || '(-)';
}

function formatBowel(data) {
  const parts = [];
  if (data.bowelFrequency) parts.push(data.bowelFrequency);
  if (data.stoolConsistency) parts.push(data.stoolConsistency);
  if (data.bowelSymptoms && data.bowelSymptoms !== '해당 없음') {
    parts.push(data.bowelSymptoms);
  }
  if (data.constipation && data.constipation !== '해당 없음') parts.push('변비(+)');
  if (data.diarrheaFrequency && data.diarrheaFrequency !== '거의 안 한다') {
    parts.push('설사 ' + data.diarrheaFrequency);
  }
  if (data.diarrheaTriggers && data.diarrheaTriggers !== '해당 없음') {
    parts.push('유발: ' + data.diarrheaTriggers);
  }
  return parts.join(' / ') || '(-)';
}

function formatUrination(data) {
  const parts = [];
  if (data.urinationDay) parts.push('주간 ' + data.urinationDay + '회');
  if (data.urinationNight && parseInt(data.urinationNight) > 0) {
    parts.push('야간뇨 ' + data.urinationNight + '회');
  }
  if (data.urinationSymptoms && data.urinationSymptoms !== '해당 없음') {
    parts.push(data.urinationSymptoms);
  }
  return parts.join(' / ') || '(-)';
}

function formatMenstruation(data) {
  if (data.gender === '남성') return 'N/A';

  const parts = [];

  if (data.menopause && data.menopause !== '아니오') {
    parts.push('폐경');
  } else if (data.menstruation === '폐경' || data.menstruation === '없음') {
    parts.push(data.menstruation);
  } else {
    if (data.lastMenstruation) parts.push('LMP ' + data.lastMenstruation);
    if (data.menstrualCycle) parts.push('주기 ' + data.menstrualCycle);
    if (data.menstrualAmount) parts.push('양 ' + data.menstrualAmount);
    if (data.menstrualPain && data.menstrualPain !== '없음') parts.push('통증 ' + data.menstrualPain);
  }

  if (data.childbirthHistory) parts.push('출산 ' + data.childbirthHistory);
  if (data.miscarriageHistory && data.miscarriageHistory !== '없음' && data.miscarriageHistory !== '해당 없음') {
    parts.push('유산 ' + data.miscarriageHistory);
  }
  if (data.vaginalDischarge && data.vaginalDischarge !== '없음' && data.vaginalDischarge !== '해당 없음') {
    parts.push('대하(+)');
  }

  return parts.length > 0 ? parts.join(' / ') : '-';
}

function formatSweating(data) {
  const parts = [];
  if (data.sweatAmount) parts.push(data.sweatAmount);
  if (data.sweatAreas) parts.push('부위: ' + data.sweatAreas);
  if (data.sweatEffect) parts.push('땀 후 ' + data.sweatEffect);
  return parts.join(' / ') || '(-)';
}

function formatSleep(data) {
  const parts = [];
  // 수면 시간 (취침~기상)
  if (data.bedTime && data.wakeTime) {
    parts.push(data.bedTime + '~' + data.wakeTime);
  } else if (data.sleepHours) {
    parts.push(data.sleepHours + '시간');
  }
  if (data.sleepQuality) parts.push(data.sleepQuality);
  if (data.sleepOnset && data.sleepOnset !== '해당 없음') {
    parts.push('입면: ' + data.sleepOnset);
  }
  if (data.sleepInterruption && data.sleepInterruption !== '해당 없음') {
    parts.push('중간깸(+)');
  }
  if (data.sleepProblems && data.sleepProblems !== '해당 없음') {
    parts.push(data.sleepProblems);
  }
  if (data.dreams) parts.push('꿈: ' + data.dreams);
  return parts.join(' / ') || '(-)';
}

function formatEdema(data) {
  if (!data.edema || data.edema === '거의 안 붓는다' || data.edema === '해당 없음') return '(-)';
  return '(+) ' + data.edema;
}

function formatColdHeat(data) {
  const parts = [];
  if (data.coldVsHeat) parts.push(data.coldVsHeat);
  if (data.coldSensitivity && data.coldSensitivity !== '추위를 안 탄다') {
    parts.push('한: ' + data.coldSensitivity);
    if (data.coldAreas) parts.push('(' + data.coldAreas + ')');
  }
  if (data.coldSymptoms && data.coldSymptoms !== '해당 없음') {
    parts.push('한증: ' + data.coldSymptoms);
  }
  if (data.lowerAbdomenSymptoms && data.lowerAbdomenSymptoms !== '해당 없음') {
    parts.push('하복부: ' + data.lowerAbdomenSymptoms);
  }
  if (data.heatSensitivity && data.heatSensitivity !== '더위를 안 탄다') {
    parts.push('열: ' + data.heatSensitivity);
  }
  if (data.heatSymptoms && data.heatSymptoms !== '해당 없음') {
    parts.push('열증: ' + data.heatSymptoms);
  }
  if (data.heatFlushSituation) {
    parts.push('상열: ' + data.heatFlushSituation);
  }
  return parts.join(' / ') || '(-)';
}

function formatMental(data) {
  const parts = [];
  if (data.stress) parts.push('스트레스 ' + data.stress);
  if (data.anxiety && data.anxiety !== '없다' && data.anxiety !== '해당 없음') {
    parts.push('불안(+)');
  }
  if (data.depression && data.depression !== '없다' && data.depression !== '해당 없음') {
    parts.push('우울(+)');
  }
  return parts.length > 0 ? parts.join(' / ') : '(-)';
}

function formatAdditionalNotes(data, analysis) {
  const parts = [];

  // 기호품
  if (data.alcoholFrequency && data.alcoholFrequency !== '안 마신다') {
    let alcohol = '음주 ' + data.alcoholFrequency;
    if (data.alcoholAmount) alcohol += ' ' + data.alcoholAmount;
    parts.push(alcohol);
  }
  if (data.alcoholSymptoms && data.alcoholSymptoms !== '해당 없음') {
    parts.push('음주증상: ' + data.alcoholSymptoms);
  }
  if (data.smoking && data.smoking !== '안 피운다' && data.smoking !== '비흡연') {
    let smoke = '흡연 ' + data.smoking;
    if (data.smokingAmount) smoke += ' ' + data.smokingAmount;
    parts.push(smoke);
  }

  // 환자 컨디션 패턴
  if (data.worseningPattern && data.worseningPattern !== '없음' && data.worseningPattern !== '해당 없음') {
    parts.push('악화패턴: ' + data.worseningPattern);
  }
  if (data.conditionFactor && data.conditionFactor !== '없음' && data.conditionFactor !== '해당 없음') {
    parts.push('컨디션요소: ' + data.conditionFactor);
  }
  if (data.otherSymptoms && data.otherSymptoms !== '없음' && data.otherSymptoms !== '해당 없음') {
    parts.push('기타: ' + data.otherSymptoms);
  }

  // AI 변증 근거
  if (analysis.patternDiagnosis && analysis.patternDiagnosis.rationale) {
    parts.push('변증근거: ' + analysis.patternDiagnosis.rationale);
  }

  return parts.join(' / ') || '';
}

function extractSymptomName(symptomText) {
  if (!symptomText) return '';
  const match = String(symptomText).match(/^([^0-9년개월주일]+)/);
  return match ? match[1].trim() : String(symptomText).split(/[0-9]/)[0].trim() || symptomText;
}

function extractOnset(symptomText) {
  if (!symptomText) return '';
  const durationMatch = String(symptomText).match(/(\d+\s*(?:년|개월|주|일|달))/);
  return durationMatch ? durationMatch[1] : '';
}

function extractMode(symptomText) {
  if (!symptomText) return '';
  const parts = String(symptomText).split(/\d+\s*(?:년|개월|주|일|달)\s*/);
  return parts.length > 1 ? parts[1].trim() : '';
}

// ========== SLACK ==========

function formatRawResponses(rawResponses) {
  if (!rawResponses || rawResponses.length === 0) {
    return '응답 데이터 없음';
  }

  let text = '';
  for (const item of rawResponses) {
    const line = `[${item.label}] ${item.value}\n`;
    // Slack 블록 텍스트 제한 (약 2900자)
    if (text.length + line.length > 2800) {
      text += '... (이하 생략)';
      break;
    }
    text += line;
  }
  return text.trim();
}

async function sendToSlack(patientData, analysis, chartOutput) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) {
    throw new Error('SLACK_WEBHOOK_URL 환경변수가 설정되지 않았습니다');
  }

  const constitution = analysis.constitution || {};
  const pattern = analysis.patternDiagnosis || {};
  const treatment = analysis.treatmentStrategy || {};
  const acupuncture = analysis.acupuncture || {};
  const lifestyle = analysis.lifestyleGuidance || {};
  const diet = analysis.dietaryAdvice || {};
  const prognosis = analysis.prognosis || {};
  const surveyTypeLabel = getSurveyTypeLabel(patientData.surveyType);

  // 변증 표시 문자열 생성
  let patternText = pattern.primary || '-';
  if (pattern.secondary) {
    patternText += ` / ${pattern.secondary}`;
  }

  // 예상 질환 문자열 (새 구조 대응)
  let conditionsText = '';
  if (analysis.expectedConditions) {
    if (Array.isArray(analysis.expectedConditions)) {
      conditionsText = analysis.expectedConditions.join(', ');
    } else {
      const korean = analysis.expectedConditions.korean || [];
      const western = analysis.expectedConditions.western || [];
      if (korean.length > 0) conditionsText += `한의: ${korean.join(', ')}`;
      if (western.length > 0) conditionsText += ` | 양방참고: ${western.join(', ')}`;
    }
  }

  // 추천 처방 문자열 (새 구조 대응)
  let prescriptionsText = '';
  if (analysis.recommendedPrescriptions) {
    if (Array.isArray(analysis.recommendedPrescriptions)) {
      const items = analysis.recommendedPrescriptions.map(p => {
        if (typeof p === 'string') return p;
        return p.name ? `${p.name} (${p.rationale || ''})` : '';
      }).filter(Boolean);
      prescriptionsText = items.join('\n');
    }
  }

  // 침구 치료 문자열
  let acuText = '';
  if (acupuncture.mainPoints && acupuncture.mainPoints.length > 0) {
    acuText += `주혈: ${acupuncture.mainPoints.join(', ')}`;
  }
  if (acupuncture.supplementPoints && acupuncture.supplementPoints.length > 0) {
    acuText += `\n보조혈: ${acupuncture.supplementPoints.join(', ')}`;
  }
  if (acupuncture.technique) {
    acuText += `\n기법: ${acupuncture.technique}`;
  }
  if (acupuncture.rationale) {
    acuText += `\n근거: ${acupuncture.rationale}`;
  }

  // 생활 지도 문자열
  let lifestyleText = '';
  if (lifestyle.sleep) lifestyleText += `수면: ${lifestyle.sleep}\n`;
  if (lifestyle.exercise) lifestyleText += `운동: ${lifestyle.exercise}\n`;
  if (lifestyle.stress) lifestyleText += `스트레스: ${lifestyle.stress}\n`;
  if (lifestyle.others) lifestyleText += `기타: ${lifestyle.others}`;
  lifestyleText = lifestyleText.trim();

  // 식이 요법 문자열
  let dietText = '';
  if (diet.recommended && diet.recommended.length > 0) {
    dietText += `권장: ${diet.recommended.join(', ')}\n`;
  }
  if (diet.avoid && diet.avoid.length > 0) {
    dietText += `금기: ${diet.avoid.join(', ')}`;
  }
  dietText = dietText.trim();

  // 주의사항 문자열
  const precautionsText = (analysis.precautions || []).join('\n') || '-';

  // 예후 문자열
  let prognosisText = '';
  if (prognosis.duration) prognosisText += `기간: ${prognosis.duration}\n`;
  if (prognosis.outlook) prognosisText += `전망: ${prognosis.outlook}\n`;
  if (prognosis.factors) prognosisText += `영향요인: ${prognosis.factors}`;
  prognosisText = prognosisText.trim();

  // 성장 분석 문자열 (청소년용)
  const growth = analysis.growthAnalysis || {};
  const isTeen = patientData.grade || patientData.fatherHeight || patientData.motherHeight || patientData.growthInterest;
  let growthText = '';
  if (isTeen && (growth.predictedHeight || growth.currentStatus || growth.recommendations)) {
    if (patientData.fatherHeight || patientData.motherHeight) {
      growthText += `부모키: 父${patientData.fatherHeight || '?'}cm / 母${patientData.motherHeight || '?'}cm\n`;
    }
    if (growth.predictedHeight) growthText += `예상 최종키: ${growth.predictedHeight}\n`;
    if (growth.currentStatus) growthText += `현재 상태: ${growth.currentStatus}\n`;
    if (growth.growthPotential) growthText += `성장 가능성: ${growth.growthPotential}\n`;
    if (growth.precociousPubertyRisk) growthText += `성조숙증 위험: ${growth.precociousPubertyRisk}\n`;
    if (growth.recommendations) growthText += `권고: ${growth.recommendations}`;
    growthText = growthText.trim();
  }

  // 원본 응답 텍스트 생성 (최대 2900자로 제한 - Slack 블록 제한)
  const rawResponseText = formatRawResponses(patientData.rawResponses || []);

  const blocks = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `📋 새 환자 설문 접수 [${surveyTypeLabel}]`,
        emoji: true
      }
    },
    {
      type: "section",
      fields: [
        { type: "mrkdwn", text: `*환자명:*\n${patientData.name || '미입력'}` },
        { type: "mrkdwn", text: `*성별/나이:*\n${patientData.gender || '-'} / ${patientData.age || '-'}세` },
        { type: "mrkdwn", text: `*추정 체질:*\n${constitution.type || '분석 중'}` },
        { type: "mrkdwn", text: `*변증:*\n${patternText}` }
      ]
    },
    // Tally 원본 보기 링크
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: patientData.tallyResponseUrl
          ? `📎 <${patientData.tallyResponseUrl}|Tally 설문 폼 열기>`
          : '📎 Tally 링크 없음'
      }
    },
    { type: "divider" },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*🎯 주호소*\n\`\`\`${patientData.mainSymptom1 || '미입력'}\`\`\``
      }
    },
    { type: "divider" },
    // ===== 변증 분석 =====
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*⚖️ 변증 분석*\n• 변증: ${patternText}\n• 근거: ${pattern.rationale || '-'}`
      }
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*📖 병리기전*\n${pattern.pathology || '상세 분석 필요'}`
      }
    },
    { type: "divider" },
    // ===== 체질 분석 =====
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*🧬 체질 분석*\n• 추정체질: ${constitution.type || '-'} (신뢰도: ${constitution.confidence || '-'})\n• 근거: ${constitution.rationale || '-'}`
      }
    },
    { type: "divider" },
    // ===== 치료 전략 =====
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*🎯 치료 방향*\n• 치법: ${treatment.principle || '-'}\n• 방향: ${treatment.direction || '-'}\n• 우선순위: ${treatment.priority || '-'}`
      }
    },
    { type: "divider" },
    // ===== 예상 질환 및 처방 =====
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*🏥 예상 질환*\n${conditionsText || '분석 필요'}`
      }
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*💊 추천 처방*\n${prescriptionsText || '진료 후 결정'}`
      }
    },
    { type: "divider" },
    // ===== 침구 치료 =====
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*🪡 침구 치료*\n${acuText || '상세 분석 필요'}`
      }
    },
    { type: "divider" },
    // ===== 생활 지도 =====
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*🏃 생활 지도*\n${lifestyleText || '-'}`
      }
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*🥗 식이 요법*\n${dietText || '-'}`
      }
    },
    { type: "divider" },
    // ===== 주의사항 및 예후 =====
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*⚠️ 주의사항*\n${precautionsText}`
      }
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*📈 예후*\n${prognosisText || '-'}`
      }
    },
    { type: "divider" },
    // ===== 차트 =====
    {
      type: "section",
      text: { type: "mrkdwn", text: "*📄 차트 (복사용)*" }
    },
    {
      type: "section",
      text: { type: "mrkdwn", text: "```" + chartOutput + "```" }
    },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `⏰ ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })} | Gemini AI 분석 완료`
        }
      ]
    },
    { type: "divider" },
    {
      type: "section",
      text: { type: "mrkdwn", text: "*📋 설문 원본 응답*" }
    },
    {
      type: "section",
      text: { type: "mrkdwn", text: "```" + rawResponseText + "```" }
    }
  ];

  // 청소년 성장 분석 섹션 추가 (해당시)
  if (isTeen && growthText) {
    // 예후 섹션 다음에 성장 분석 섹션 삽입
    const prognosisIndex = blocks.findIndex(b =>
      b.type === 'section' && b.text && b.text.text && b.text.text.includes('📈 예후')
    );
    if (prognosisIndex !== -1) {
      const growthBlocks = [
        { type: "divider" },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*📏 성장 분석 (소아청소년)*\n${growthText}`
          }
        }
      ];
      blocks.splice(prognosisIndex + 1, 0, ...growthBlocks);
    }
  }

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      blocks,
      text: `새 환자 설문: ${patientData.name || '미입력'} - ${patientData.mainSymptom1 || '증상 미입력'}`
    })
  });

  if (!response.ok) {
    throw new Error('Slack 전송 실패: ' + response.statusText);
  }
}

function getSurveyTypeLabel(surveyType) {
  if (!surveyType) return '일반';
  const name = surveyType.toLowerCase();
  if (name.includes('성인') || name.includes('adult')) return '성인';
  if (name.includes('청소년') || name.includes('teen')) return '청소년';
  if (name.includes('다이어트') || name.includes('diet')) return '다이어트';
  if (name.includes('자보') || name.includes('자동차') || name.includes('보험')) return '자동차보험';
  if (name.includes('소아') || name.includes('아동') || name.includes('child')) return '소아';
  return surveyType;
}

// ========== 직원용 간단 알림 ==========

async function sendToStaffSlack(patientData) {
  const webhookUrl = process.env.SLACK_STAFF_WEBHOOK_URL;
  if (!webhookUrl) {
    console.log('SLACK_STAFF_WEBHOOK_URL 미설정 - 직원 알림 생략');
    return;
  }

  const surveyTypeLabel = getSurveyTypeLabel(patientData.surveyType);
  const timestamp = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });

  // 청소년 성장 진료 표시
  const isTeen = patientData.grade || patientData.fatherHeight || patientData.motherHeight;
  const growthNote = (isTeen && patientData.growthInterest === '있다') ? ' 📏 성장진료' : '';

  // 주호소 요약 (40자 제한)
  let symptomSummary = patientData.mainSymptom1 || '미입력';
  if (symptomSummary.length > 40) {
    symptomSummary = symptomSummary.substring(0, 40) + '...';
  }

  // 부모 키 정보 (청소년용)
  let parentHeightInfo = '';
  if (patientData.fatherHeight || patientData.motherHeight) {
    const fh = patientData.fatherHeight || '미입력';
    const mh = patientData.motherHeight || '미입력';
    parentHeightInfo = `📏 부모키: 아버지 ${fh}cm / 어머니 ${mh}cm`;
  }

  const blocks = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `📋 *새 설문 접수* [${surveyTypeLabel}]${growthNote}\n*${patientData.name || '이름 미입력'}* (${patientData.gender || '-'}/${patientData.age || '-'}세)`
      }
    },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `주호소: ${symptomSummary}`
        }
      ]
    }
  ];

  // 부모 키 정보가 있으면 추가
  if (parentHeightInfo) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: parentHeightInfo
      }
    });
  }

  // 타임스탬프
  blocks.push({
    type: "context",
    elements: [
      {
        type: "mrkdwn",
        text: `⏰ ${timestamp}`
      }
    ]
  });

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        blocks,
        text: `새 설문 접수: ${patientData.name || '미입력'} [${surveyTypeLabel}]`
      })
    });

    if (!response.ok) {
      console.error('직원 Slack 전송 실패:', response.statusText);
    }
  } catch (error) {
    console.error('직원 Slack 전송 오류:', error.message);
    // 직원 알림 실패는 전체 프로세스를 중단하지 않음
  }
}
