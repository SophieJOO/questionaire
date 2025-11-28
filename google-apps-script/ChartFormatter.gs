/**
 * 차트 포맷팅 함수들
 */

function formatChart(patientData, analysis) {
  const today = new Date().toLocaleDateString('ko-KR');

  // BMI 계산
  const height = parseFloat(patientData.height) || 0;
  const weight = parseFloat(patientData.weight) || 0;
  const bmi = height > 0 ? (weight / Math.pow(height / 100, 2)).toFixed(1) : '-';

  // 형색성정
  const fcne = analysis.formColorNatureEmotion || {};
  const formColorNatureEmotion = [fcne.form, fcne.color, fcne.nature, fcne.emotion]
    .filter(Boolean).join(' / ') || '추후 확인';

  // 차트 요약
  const cs = analysis.chartSummary || {};

  // 체질/변증 정보
  const constitution = analysis.constitution || {};
  const ep = analysis.eightPrinciples || {};

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

  return chart;
}

// 증상명 추출
function extractSymptomName(symptomText) {
  if (!symptomText) return '';
  const match = symptomText.toString().match(/^([^0-9년개월주일]+)/);
  return match ? match[1].trim() : symptomText.split(/[0-9]/)[0].trim() || symptomText;
}

// 발병시기 추출
function extractOnset(symptomText) {
  if (!symptomText) return '';
  const durationMatch = symptomText.toString().match(/(\d+\s*(?:년|개월|주|일|달))/);
  return durationMatch ? durationMatch[1] : '';
}

// 양상 추출
function extractMode(symptomText) {
  if (!symptomText) return '';
  const parts = symptomText.toString().split(/\d+\s*(?:년|개월|주|일|달)\s*/);
  return parts.length > 1 ? parts[1].trim() : '';
}

// 부증 포맷팅 함수들
function formatHeadache(data) {
  if (!data.headache || data.headache === '없다' || data.headache === '없음') return '(-)';
  let result = data.headache;
  if (data.headacheLocation) result += ', ' + data.headacheLocation;
  return result;
}

function formatDizziness(data) {
  if (!data.dizziness || data.dizziness === '없다' || data.dizziness === '없음') return '(-)';
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

function formatBelching(data) {
  // 소화 증상에서 트림 확인
  if (data.digestionSymptoms && data.digestionSymptoms.includes('트림')) {
    return '(+) 잦음';
  }
  return '(-)';
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
