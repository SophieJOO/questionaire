/**
 * 환자 데이터와 AI 분석 결과를 차트 형식으로 포맷팅
 */
export function formatChart(patientData, analysis) {
  const today = new Date().toLocaleDateString('ko-KR');

  // BMI 계산
  const height = parseFloat(patientData.height) || 0;
  const weight = parseFloat(patientData.weight) || 0;
  const bmi = height > 0 ? (weight / ((height / 100) ** 2)).toFixed(1) : '-';

  // 형색성정 포맷팅
  const fcne = analysis.formColorNatureEmotion || {};
  const formColorNatureEmotion = [
    fcne.form || '',
    fcne.color || '',
    fcne.nature || '',
    fcne.emotion || ''
  ].filter(Boolean).join(' / ') || '추후 확인';

  // 차트 요약 데이터
  const cs = analysis.chartSummary || {};

  // 주소 포맷팅
  const mainSymptom1 = patientData.mainSymptom1 || '';
  const mainSymptom2 = patientData.mainSymptom2 || '';
  const mainSymptom3 = patientData.mainSymptom3 || '';

  // 예상 체질 및 변증
  const constitution = analysis.constitution || {};
  const eightPrinciples = analysis.eightPrinciples || {};

  // 차트 템플릿 생성
  const chart = `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 환자 차트 (AI 사전분석) - ${today}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${patientData.name || '___'}/${patientData.gender === '남성' ? 'M' : patientData.gender === '여성' ? 'F' : '_'}/${patientData.age || '__'}세/${patientData.occupation || '___'}
${height || '___'}cm/${weight || '___'}kg BMI ${bmi}
BP ___/___ mmHg  PR ___회/분
형색성정: ${formColorNatureEmotion}

━━━ 체질 및 변증 (AI 분석) ━━━
◆ 추정 체질: ${constitution.type || '미분석'} (신뢰도: ${constitution.confidence || '-'})
◆ 팔강변증: ${eightPrinciples.yinYang || '-'}/${eightPrinciples.exteriorInterior || '-'}/${eightPrinciples.coldHeat || '-'}/${eightPrinciples.deficiencyExcess || '-'}
◆ 장부: ${analysis.organAnalysis?.pattern || '-'}
◆ 예상질환: ${(analysis.expectedConditions || []).join(', ') || '-'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[주소]
#1. ${extractSymptomName(mainSymptom1)}
o/s) ${extractOnset(mainSymptom1)}
mode) ${extractMode(mainSymptom1)}

${mainSymptom2 ? `#2. ${extractSymptomName(mainSymptom2)}
o/s) ${extractOnset(mainSymptom2)}
mode) ${extractMode(mainSymptom2)}
` : ''}
${mainSymptom3 ? `#3. ${extractSymptomName(mainSymptom3)}
o/s) ${extractOnset(mainSymptom3)}
mode) ${extractMode(mainSymptom3)}
` : ''}
po med) ${patientData.currentMedication || '없음'}
p/h) ${patientData.medicalHistory || '없음'}
f/h) ${patientData.familyHistory || '추후 확인'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[부증]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
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
[트림] ${cs.belching || formatBelching(patientData)}
[방귀] ${cs.flatulence || formatFlatulence(patientData)}
[생리] ${cs.menstruation || formatMenstruation(patientData)}
[한출] ${cs.sweating || formatSweating(patientData)}
[수면] ${cs.sleep || formatSleep(patientData)}
[부종] ${cs.edema || formatEdema(patientData)}
[한열] ${cs.coldHeat || formatColdHeat(patientData)}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[복진] 추후 확인
[첨언] ${(analysis.additionalObservations || []).join(' / ') || '추후 확인'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[처방] ${(analysis.recommendedPrescriptions || []).join(', ') || '진료 후 결정'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

※ AI 분석 근거:
${constitution.rationale || '상세 분석 필요'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

  return chart;
}

// 증상에서 이름 추출
function extractSymptomName(symptomText) {
  if (!symptomText) return '';
  // 기간 정보 제거하고 증상명만 추출
  const match = symptomText.match(/^([^0-9년개월주일]+)/);
  return match ? match[1].trim() : symptomText.split(/[0-9]/)[0].trim() || symptomText;
}

// 증상에서 발병시기 추출
function extractOnset(symptomText) {
  if (!symptomText) return '';
  const durationMatch = symptomText.match(/(\d+\s*(?:년|개월|주|일|달))/);
  return durationMatch ? durationMatch[1] : '추후 확인';
}

// 증상에서 양상 추출
function extractMode(symptomText) {
  if (!symptomText) return '';
  // 기간 이후의 설명 추출
  const parts = symptomText.split(/\d+\s*(?:년|개월|주|일|달)\s*/);
  return parts.length > 1 ? parts[1].trim() : '추후 확인';
}

// 각 항목별 포맷팅 함수들
function formatHeadache(data) {
  if (!data.headache || data.headache === '없다' || data.headache === '없음') {
    return '(-)';
  }
  const parts = [];
  if (data.headache) parts.push(data.headache);
  if (data.headacheLocation) parts.push(`부위: ${data.headacheLocation}`);
  if (data.headachePattern) parts.push(`양상: ${data.headachePattern}`);
  return parts.join(', ') || '추후 확인';
}

function formatDizziness(data) {
  if (!data.dizziness || data.dizziness === '없다' || data.dizziness === '없음') {
    return '(-)';
  }
  return data.dizziness + (data.dizzinessPattern ? `, ${data.dizzinessPattern}` : '');
}

function formatThirst(data) {
  const thirst = Array.isArray(data.thirst) ? data.thirst : [];
  if (thirst.length === 0 || thirst.includes('해당 없음')) {
    return `(-)`;
  }
  let result = thirst.join(', ');
  if (data.waterIntake) result += ` / 물 ${data.waterIntake}L/일`;
  if (data.waterTemperature) result += ` (${data.waterTemperature})`;
  return result || '추후 확인';
}

function formatBitterMouth(data) {
  if (data.tasteInMouth === '쓰다') {
    return '(+) 구고 있음';
  }
  return '(-)';
}

function formatChestFullness(data) {
  if (data.chestTightness && data.chestTightness !== '없다') {
    return `(+) ${data.chestTightness}`;
  }
  return '(-)';
}

function formatIrritability(data) {
  if (data.palpitation && data.palpitation !== '없다') {
    return `(+) ${data.palpitation}`;
  }
  return '(-)';
}

function formatThroatObstruction(data) {
  if (data.throatDiscomfort && data.throatDiscomfort !== '없다') {
    return `(+) ${data.throatDiscomfort}`;
  }
  const symptoms = Array.isArray(data.digestionSymptoms) ? data.digestionSymptoms : [];
  if (symptoms.some(s => s.includes('목') || s.includes('걸려'))) {
    return '(+) 목 이물감';
  }
  return '(-)';
}

function formatAppetite(data) {
  const parts = [];
  if (data.appetite) parts.push(data.appetite);
  if (data.eatingAmount) parts.push(`식사량 ${data.eatingAmount}`);
  if (data.mealsPerDay) parts.push(`${data.mealsPerDay}끼/일`);
  return parts.join(', ') || '추후 확인';
}

function formatDigestion(data) {
  const parts = [];
  if (data.digestion) parts.push(data.digestion);
  const symptoms = Array.isArray(data.digestionSymptoms) ? data.digestionSymptoms : [];
  if (symptoms.length > 0 && !symptoms.includes('해당 없음')) {
    parts.push(symptoms.join(', '));
  }
  if (data.nausea && data.nausea !== '없다') {
    parts.push(`오심 ${data.nausea}`);
  }
  return parts.join(' / ') || '추후 확인';
}

function formatBowel(data) {
  const parts = [];
  if (data.bowelFrequency) parts.push(data.bowelFrequency);
  if (data.stoolConsistency) parts.push(data.stoolConsistency);

  const constipation = Array.isArray(data.constipation) ? data.constipation : [];
  if (constipation.length > 0 && !constipation.includes('해당 없음')) {
    parts.push('변비(+)');
  }

  if (data.diarrhea && data.diarrhea !== '거의 안 한다') {
    parts.push(`설사 ${data.diarrhea}`);
  }

  return parts.join(', ') || '추후 확인';
}

function formatUrination(data) {
  const parts = [];
  if (data.urinationDay) parts.push(`주간 ${data.urinationDay}회`);
  if (data.urinationNight && parseInt(data.urinationNight) > 0) {
    parts.push(`야간뇨 ${data.urinationNight}회`);
  }

  const symptoms = Array.isArray(data.urinationSymptoms) ? data.urinationSymptoms : [];
  if (symptoms.length > 0 && !symptoms.includes('해당 없음')) {
    parts.push(symptoms.join(', '));
  }

  return parts.join(', ') || '추후 확인';
}

function formatBelching(data) {
  const symptoms = Array.isArray(data.digestionSymptoms) ? data.digestionSymptoms : [];
  if (symptoms.some(s => s.includes('트림'))) {
    return '(+) 잦음';
  }
  return '(-)';
}

function formatFlatulence(data) {
  const gas = Array.isArray(data.gas) ? data.gas : [];
  if (gas.length === 0 || gas.includes('해당 없음')) {
    return '(-)';
  }
  return `(+) ${gas.join(', ')}`;
}

function formatMenstruation(data) {
  if (data.gender === '남성') return 'N/A';
  if (!data.menstruation || data.menstruation === '없음' || data.menstruation === '폐경') {
    return data.menstruation || 'N/A';
  }

  const parts = [];
  if (data.menstrualCycle) parts.push(`주기 ${data.menstrualCycle}`);
  if (data.menstrualAmount) parts.push(`양 ${data.menstrualAmount}`);
  if (data.menstrualPain) parts.push(`통증 ${data.menstrualPain}`);

  const symptoms = Array.isArray(data.menstrualSymptoms) ? data.menstrualSymptoms : [];
  if (symptoms.length > 0) {
    parts.push(symptoms.join(', '));
  }

  return parts.join(', ') || '추후 확인';
}

function formatSweating(data) {
  const parts = [];
  if (data.sweatAmount) parts.push(data.sweatAmount);

  const areas = Array.isArray(data.sweatAreas) ? data.sweatAreas : [];
  if (areas.length > 0) {
    parts.push(`부위: ${areas.join(', ')}`);
  }

  if (data.sweatEffect) parts.push(`땀 후: ${data.sweatEffect}`);

  return parts.join(' / ') || '추후 확인';
}

function formatSleep(data) {
  const parts = [];
  if (data.sleepHours) parts.push(`${data.sleepHours}시간`);
  if (data.sleepQuality) parts.push(data.sleepQuality);

  const problems = Array.isArray(data.sleepProblems) ? data.sleepProblems : [];
  if (problems.length > 0 && !problems.includes('해당 없음')) {
    parts.push(problems.join(', '));
  }

  if (data.dreams) parts.push(`꿈: ${data.dreams}`);

  return parts.join(', ') || '추후 확인';
}

function formatEdema(data) {
  if (!data.edema || data.edema === '거의 안 붓는다') {
    return '(-)';
  }

  const parts = [data.edema];
  if (data.edemaAreas) parts.push(`부위: ${data.edemaAreas}`);
  if (data.edemaTime) parts.push(`시간: ${data.edemaTime}`);

  return parts.join(', ');
}

function formatColdHeat(data) {
  const parts = [];

  // 추위/더위 비교
  if (data.coldVsHeat) {
    parts.push(data.coldVsHeat);
  }

  // 추위 관련
  if (data.coldSensitivity && data.coldSensitivity !== '추위를 안 탄다') {
    parts.push(`한: ${data.coldSensitivity}`);
    const coldAreas = Array.isArray(data.coldAreas) ? data.coldAreas : [];
    if (coldAreas.length > 0) {
      parts.push(`(${coldAreas.join(', ')})`);
    }
  }

  // 더위 관련
  if (data.heatSensitivity && data.heatSensitivity !== '더위를 안 탄다') {
    parts.push(`열: ${data.heatSensitivity}`);
    const heatSymptoms = Array.isArray(data.heatSymptoms) ? data.heatSymptoms : [];
    if (heatSymptoms.length > 0 && !heatSymptoms.includes('해당 없음')) {
      parts.push(`(${heatSymptoms.join(', ')})`);
    }
  }

  return parts.join(' / ') || '추후 확인';
}

/**
 * 간단한 텍스트 전용 차트 (복사용)
 */
export function formatSimpleChart(patientData, analysis) {
  const height = parseFloat(patientData.height) || 0;
  const weight = parseFloat(patientData.weight) || 0;
  const bmi = height > 0 ? (weight / ((height / 100) ** 2)).toFixed(1) : '-';

  const fcne = analysis.formColorNatureEmotion || {};
  const cs = analysis.chartSummary || {};

  return `${patientData.name || '___'}/${patientData.gender === '남성' ? 'M' : patientData.gender === '여성' ? 'F' : '_'}/${patientData.age || '__'}세/${patientData.occupation || '___'}
${height || '___'}cm/${weight || '___'}kg BMI ${bmi}
BP ___/___ mmHg  PR ___회/분
형색성정: ${fcne.form || ''} ${fcne.color || ''} ${fcne.nature || ''} ${fcne.emotion || ''}

[주소]
#1. ${extractSymptomName(patientData.mainSymptom1)}
o/s) ${extractOnset(patientData.mainSymptom1)}
mode) ${extractMode(patientData.mainSymptom1)}

${patientData.mainSymptom2 ? `#2. ${extractSymptomName(patientData.mainSymptom2)}
o/s) ${extractOnset(patientData.mainSymptom2)}
mode) ${extractMode(patientData.mainSymptom2)}
` : ''}
po med) ${patientData.currentMedication || '없음'}
p/h) ${patientData.medicalHistory || '없음'}
f/h) ${patientData.familyHistory || '추후 확인'}

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
[트림] ${cs.belching || formatBelching(patientData)}
[방귀] ${cs.flatulence || formatFlatulence(patientData)}
[생리] ${cs.menstruation || formatMenstruation(patientData)}
[한출] ${cs.sweating || formatSweating(patientData)}
[수면] ${cs.sleep || formatSleep(patientData)}
[부종] ${cs.edema || formatEdema(patientData)}
[한열] ${cs.coldHeat || formatColdHeat(patientData)}
[복진]
[첨언] ${(analysis.additionalObservations || []).join(' / ') || ''}
[처방]`;
}
