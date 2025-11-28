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

    await sendToSlack(patientData, analysis, chartOutput);
    console.log('Slack sent');

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
  const fields = tallyData.data?.fields || [];

  data.surveyType = getSurveyType(formName);

  fields.forEach(field => {
    const label = field.label || '';
    const value = extractValue(field);

    if (!value) return;

    if (label.includes('성함') || label.includes('이름')) {
      data.name = value;
    } else if (label.includes('성별')) {
      data.gender = value;
    } else if (label.includes('나이')) {
      data.age = value;
    } else if (label.includes('직업')) {
      data.occupation = value;
    } else if (label.includes('키') && !label.includes('트림')) {
      data.height = value;
    } else if (label.includes('체중') || label.includes('몸무게')) {
      data.weight = value;
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
    } else if (label.includes('추위') && label.includes('더위') && label.includes('중')) {
      data.coldVsHeat = value;
    } else if (label.includes('더위') && label.includes('어느 정도')) {
      data.heatSensitivity = value;
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
    } else if (label.includes('담배')) {
      data.smoking = value;
    }
    else if (label.includes('식사') && label.includes('몇 끼')) {
      data.mealsPerDay = value;
    } else if (label.includes('식욕')) {
      data.appetite = value;
    } else if (label.includes('먹는 양') || label.includes('식사량')) {
      data.eatingAmount = value;
    } else if (label.includes('소화') && label.includes('기능')) {
      data.digestion = value;
    } else if (label.includes('입맛')) {
      data.tasteInMouth = value;
    } else if (label.includes('울렁') || label.includes('메슥')) {
      data.nausea = value;
    }
    else if (label.includes('대변') && (label.includes('며칠') || label.includes('몇번'))) {
      data.bowelFrequency = value;
    } else if (label.includes('대변') && label.includes('상태')) {
      data.stoolConsistency = value;
    } else if (label.includes('변비')) {
      data.constipation = value;
    } else if (label.includes('가스') || label.includes('방귀')) {
      data.gas = value;
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
    } else if (label.includes('수면') && label.includes('질')) {
      data.sleepQuality = value;
    } else if (label.includes('수면') && label.includes('문제')) {
      data.sleepProblems = value;
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
    } else if (label.includes('목') && label.includes('걸린')) {
      data.throatDiscomfort = value;
    }
    else if (label.includes('생리') && label.includes('하고 계신')) {
      data.menstruation = value;
    } else if (label.includes('생리') && label.includes('주기')) {
      data.menstrualCycle = value;
    } else if (label.includes('생리') && label.includes('량')) {
      data.menstrualAmount = value;
    } else if (label.includes('생리통')) {
      data.menstrualPain = value;
    }
  });

  return data;
}

function extractValue(field) {
  if (field.value !== undefined && field.value !== null && field.value !== '') {
    if (Array.isArray(field.value)) {
      return field.value.join(', ');
    }
    return String(field.value);
  }
  if (field.options && field.options.length > 0) {
    const selected = field.options.filter(opt => opt.id === field.value);
    if (selected.length > 0) {
      return selected.map(opt => opt.text).join(', ');
    }
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
2. **변증**: 한의학적 변증 패턴 (예: 간비기울, 간울기체, 기음양허, 비위허한, 심비양허, 간신음허, 담음, 어혈, 기체혈어 등)
3. **예상 질환**: 한의학적 병증
4. **형색성정**: 예상되는 형/색/성/정

반드시 아래 JSON 형식으로만 응답해주세요:
{
  "constitution": {
    "type": "체질명",
    "confidence": "높음/중간/낮음",
    "rationale": "근거"
  },
  "patternDiagnosis": {
    "primary": "주요 변증 (예: 간비기울)",
    "secondary": "부차 변증 (해당시)",
    "rationale": "변증 근거"
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
  const height = parseFloat(patientData.height) || 0;
  const weight = parseFloat(patientData.weight) || 0;
  const bmi = height > 0 ? (weight / Math.pow(height / 100, 2)).toFixed(1) : '-';

  const fcne = analysis.formColorNatureEmotion || {};
  const formColorNatureEmotion = [fcne.form, fcne.color, fcne.nature, fcne.emotion]
    .filter(Boolean).join(' / ') || '추후 확인';

  const cs = analysis.chartSummary || {};

  const chart = `${patientData.name || '___'}/${patientData.gender === '남성' ? 'M' : patientData.gender === '여성' ? 'F' : '_'}/${patientData.age || '__'}세/${patientData.occupation || '___'}
${height || '___'}cm/${weight || '___'}kg BMI ${bmi}
BP ___/___ mmHg  PR ___회/분
형색성정: ${formColorNatureEmotion}

[주소]
#1. ${extractSymptomName(patientData.mainSymptom1)}
o/s) ${extractOnset(patientData.mainSymptom1)}
mode) ${extractMode(patientData.mainSymptom1)}
${patientData.mainSymptom2 ? `
#2. ${extractSymptomName(patientData.mainSymptom2)}
o/s) ${extractOnset(patientData.mainSymptom2)}
mode) ${extractMode(patientData.mainSymptom2)}` : ''}
${patientData.mainSymptom3 ? `
#3. ${extractSymptomName(patientData.mainSymptom3)}
o/s) ${extractOnset(patientData.mainSymptom3)}
mode) ${extractMode(patientData.mainSymptom3)}` : ''}

po med) ${patientData.currentMedication || '없음'}
p/h) ${patientData.medicalHistory || '없음'}
f/h) 추후 확인

[부증]
[두통] ${cs.headache || formatHeadache(patientData)}
[현훈] ${cs.dizziness || formatDizziness(patientData)}
[구갈] ${cs.thirst || formatThirst(patientData)}
[구고] ${cs.bitterMouth || formatBitterMouth(patientData)}
[흉만] ${cs.chestFullness || formatChestFullness(patientData)}
[심번] ${cs.irritability || formatIrritability(patientData)}
[매핵] ${cs.throatObstruction || formatThroatObstruction(patientData)}
[식욕] ${cs.appetite || formatAppetite(patientData)}
[소화] ${cs.digestion || formatDigestion(patientData)}
[대변] ${cs.bowel || formatBowel(patientData)}
[소변] ${cs.urination || formatUrination(patientData)}
[트림] ${cs.belching || '(-)'}
[방귀] ${cs.flatulence || formatFlatulence(patientData)}
[생리] ${cs.menstruation || formatMenstruation(patientData)}
[한출] ${cs.sweating || formatSweating(patientData)}
[수면] ${cs.sleep || formatSleep(patientData)}
[부종] ${cs.edema || formatEdema(patientData)}
[한열] ${cs.coldHeat || formatColdHeat(patientData)}
[복진]
[첨언] ${(analysis.additionalObservations || []).join(' / ') || ''}
[처방]`;

  return chart;
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

function formatHeadache(data) {
  if (!data.headache || data.headache === '없다') return '(-)';
  let result = data.headache;
  if (data.headacheLocation) result += ', ' + data.headacheLocation;
  return result;
}

function formatDizziness(data) {
  if (!data.dizziness || data.dizziness === '없다') return '(-)';
  return data.dizziness;
}

function formatThirst(data) {
  if (!data.thirst || data.thirst === '해당 없음') {
    let result = '(-)';
    if (data.waterIntake) result = `물 ${data.waterIntake}L/일`;
    if (data.waterTemperature) result += ` (${data.waterTemperature})`;
    return result;
  }
  let result = data.thirst;
  if (data.waterIntake) result += ` / 물 ${data.waterIntake}L/일`;
  return result;
}

function formatBitterMouth(data) {
  return data.tasteInMouth === '쓰다' ? '(+)' : '(-)';
}

function formatChestFullness(data) {
  if (!data.chestTightness || data.chestTightness === '없다') return '(-)';
  return '(+) ' + data.chestTightness;
}

function formatIrritability(data) {
  if (!data.palpitation || data.palpitation === '없다') return '(-)';
  return '(+) ' + data.palpitation;
}

function formatThroatObstruction(data) {
  if (!data.throatDiscomfort || data.throatDiscomfort === '없다') return '(-)';
  return '(+) ' + data.throatDiscomfort;
}

function formatAppetite(data) {
  const parts = [];
  if (data.appetite) parts.push(data.appetite);
  if (data.eatingAmount) parts.push('식사량 ' + data.eatingAmount);
  if (data.mealsPerDay) parts.push(data.mealsPerDay + '끼/일');
  return parts.join(', ') || '';
}

function formatDigestion(data) {
  const parts = [];
  if (data.digestion) parts.push(data.digestion);
  if (data.nausea && data.nausea !== '없다') parts.push('오심 ' + data.nausea);
  return parts.join(' / ') || '';
}

function formatBowel(data) {
  const parts = [];
  if (data.bowelFrequency) parts.push(data.bowelFrequency);
  if (data.stoolConsistency) parts.push(data.stoolConsistency);
  if (data.constipation && data.constipation !== '해당 없음') parts.push('변비(+)');
  if (data.diarrhea && data.diarrhea !== '거의 안 한다') parts.push('설사 ' + data.diarrhea);
  return parts.join(', ') || '';
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
  return parts.join(', ') || '';
}

function formatFlatulence(data) {
  if (!data.gas || data.gas === '해당 없음') return '(-)';
  return '(+) ' + data.gas;
}

function formatMenstruation(data) {
  if (data.gender === '남성') return 'N/A';
  if (!data.menstruation || data.menstruation === '없음' || data.menstruation === '폐경') {
    return data.menstruation || 'N/A';
  }
  const parts = [];
  if (data.menstrualCycle) parts.push('주기 ' + data.menstrualCycle);
  if (data.menstrualAmount) parts.push('양 ' + data.menstrualAmount);
  if (data.menstrualPain) parts.push('통증 ' + data.menstrualPain);
  return parts.join(', ') || '';
}

function formatSweating(data) {
  const parts = [];
  if (data.sweatAmount) parts.push(data.sweatAmount);
  if (data.sweatAreas) parts.push('부위: ' + data.sweatAreas);
  if (data.sweatEffect) parts.push('땀 후: ' + data.sweatEffect);
  return parts.join(' / ') || '';
}

function formatSleep(data) {
  const parts = [];
  if (data.sleepHours) parts.push(data.sleepHours + '시간');
  if (data.sleepQuality) parts.push(data.sleepQuality);
  if (data.sleepProblems && data.sleepProblems !== '해당 없음') parts.push(data.sleepProblems);
  if (data.dreams) parts.push('꿈: ' + data.dreams);
  return parts.join(', ') || '';
}

function formatEdema(data) {
  if (!data.edema || data.edema === '거의 안 붓는다') return '(-)';
  return '(+) ' + data.edema;
}

function formatColdHeat(data) {
  const parts = [];
  if (data.coldVsHeat) parts.push(data.coldVsHeat);
  if (data.coldSensitivity && data.coldSensitivity !== '추위를 안 탄다') {
    parts.push('한: ' + data.coldSensitivity);
    if (data.coldAreas) parts.push('(' + data.coldAreas + ')');
  }
  if (data.heatSensitivity && data.heatSensitivity !== '더위를 안 탄다') {
    parts.push('열: ' + data.heatSensitivity);
  }
  return parts.join(' / ') || '';
}

// ========== SLACK ==========

async function sendToSlack(patientData, analysis, chartOutput) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) {
    throw new Error('SLACK_WEBHOOK_URL 환경변수가 설정되지 않았습니다');
  }

  const constitution = analysis.constitution || {};
  const pattern = analysis.patternDiagnosis || {};
  const surveyTypeLabel = getSurveyTypeLabel(patientData.surveyType);

  // 변증 표시 문자열 생성
  let patternText = pattern.primary || '-';
  if (pattern.secondary) {
    patternText += ` / ${pattern.secondary}`;
  }

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
    { type: "divider" },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*🎯 주호소*\n\`\`\`${patientData.mainSymptom1 || '미입력'}\`\`\``
      }
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*⚖️ 변증 근거*\n${pattern.rationale || '분석 필요'}`
      }
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*🏥 예상 질환*\n${(analysis.expectedConditions || []).join(', ') || '분석 필요'}`
      }
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*💊 추천 처방 후보*\n${(analysis.recommendedPrescriptions || []).join(', ') || '진료 후 결정'}`
      }
    },
    { type: "divider" },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*📝 체질 분석 근거*\n${constitution.rationale || '상세 분석 필요'}`
      }
    },
    { type: "divider" },
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
    }
  ];

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
