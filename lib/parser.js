/**
 * Tally Webhook 데이터 파싱
 */

export function parseTallyData(tallyData) {
  const data = {};

  // Tally webhook 구조: { eventId, eventType, createdAt, data: { responseId, submissionId, respondentId, formId, formName, fields: [...] } }
  const formName = tallyData.data?.formName || '';
  const fields = tallyData.data?.fields || [];

  // 설문 유형 (폼 이름에서 추출)
  data.surveyType = getSurveyType(formName);

  // 필드 매핑
  fields.forEach(field => {
    const label = field.label || '';
    const value = extractValue(field);

    if (!value) return;

    // 기본 정보
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

    // 주소 (증상)
    else if (label.includes('1순위') || label.includes('치료받고 싶은 증상')) {
      data.mainSymptom1 = value;
    } else if (label.includes('2순위')) {
      data.mainSymptom2 = value;
    } else if (label.includes('3순위')) {
      data.mainSymptom3 = value;
    }

    // 복용약/병력
    else if (label.includes('복용') && (label.includes('약') || label.includes('건강식품'))) {
      data.currentMedication = value;
    } else if (label.includes('병') || label.includes('수술')) {
      data.medicalHistory = value;
    }

    // 한열
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

    // 땀
    else if (label.includes('땀') && label.includes('어느 정도')) {
      data.sweatAmount = value;
    } else if (label.includes('땀') && label.includes('부위')) {
      data.sweatAreas = value;
    } else if (label.includes('땀') && (label.includes('운동') || label.includes('목욕') || label.includes('사우나'))) {
      data.sweatEffect = value;
    }

    // 음수
    else if (label.includes('물') && label.includes('섭취량')) {
      data.waterIntake = value;
    } else if (label.includes('물') && label.includes('온도')) {
      data.waterTemperature = value;
    } else if (label.includes('갈증') || label.includes('구강 건조')) {
      data.thirst = value;
    }

    // 체력
    else if (label.includes('체력')) {
      data.stamina = value;
    }

    // 기호
    else if (label.includes('맛') && label.includes('좋아하')) {
      data.tastePreference = value;
    } else if (label.includes('술') && label.includes('자주')) {
      data.alcoholFrequency = value;
    } else if (label.includes('술') && label.includes('얼마나')) {
      data.alcoholAmount = value;
    } else if (label.includes('담배')) {
      data.smoking = value;
    }

    // 식욕/소화
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

    // 대변
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

    // 소변
    else if (label.includes('소변') && label.includes('낮')) {
      data.urinationDay = value;
    } else if (label.includes('소변') && label.includes('밤')) {
      data.urinationNight = value;
    } else if (label.includes('소변') && label.includes('증상')) {
      data.urinationSymptoms = value;
    } else if (label.includes('붓') && label.includes('증상')) {
      data.edema = value;
    }

    // 수면
    else if (label.includes('수면') && label.includes('시간')) {
      data.sleepHours = value;
    } else if (label.includes('수면') && label.includes('질')) {
      data.sleepQuality = value;
    } else if (label.includes('수면') && label.includes('문제')) {
      data.sleepProblems = value;
    } else if (label.includes('꿈')) {
      data.dreams = value;
    }

    // 두통/현훈
    else if (label.includes('두통') && !label.includes('부위')) {
      data.headache = value;
    } else if (label.includes('두통') && label.includes('부위')) {
      data.headacheLocation = value;
    } else if (label.includes('어지러')) {
      data.dizziness = value;
    }

    // 정신/감정
    else if (label.includes('스트레스')) {
      data.stress = value;
    } else if (label.includes('불안')) {
      data.anxiety = value;
    } else if (label.includes('우울')) {
      data.depression = value;
    }

    // 흉만/심번/매핵
    else if (label.includes('가슴') && label.includes('답답')) {
      data.chestTightness = value;
    } else if (label.includes('가슴') && label.includes('두근')) {
      data.palpitation = value;
    } else if (label.includes('목') && label.includes('걸린')) {
      data.throatDiscomfort = value;
    }

    // 여성건강
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

/**
 * Tally 필드에서 값 추출
 */
function extractValue(field) {
  // 다양한 필드 타입 처리
  if (field.value !== undefined && field.value !== null && field.value !== '') {
    // 배열인 경우 조인
    if (Array.isArray(field.value)) {
      return field.value.join(', ');
    }
    return String(field.value);
  }

  // options가 있는 경우 (선택형)
  if (field.options && field.options.length > 0) {
    const selected = field.options.filter(opt => opt.id === field.value);
    if (selected.length > 0) {
      return selected.map(opt => opt.text).join(', ');
    }
  }

  return null;
}

/**
 * 폼 이름에서 설문 유형 추출
 */
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
