import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';
import { analyzePatient } from './analyzer.js';
import { formatChart } from './chartFormatter.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(join(__dirname, '../public')));

// Tally Webhook 수신 엔드포인트
app.post('/webhook/tally', async (req, res) => {
  try {
    console.log('Tally webhook received:', JSON.stringify(req.body, null, 2));

    const tallyData = req.body;
    const parsedData = parseTallyResponse(tallyData);

    // AI 분석 수행
    const analysis = await analyzePatient(parsedData);

    // 차트 형식으로 포맷팅
    const chartOutput = formatChart(parsedData, analysis);

    // 결과 저장 (실제 환경에서는 DB에 저장)
    console.log('Chart Output:\n', chartOutput);

    res.status(200).json({
      success: true,
      message: '설문 데이터가 성공적으로 처리되었습니다.',
      chartOutput
    });
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 수동 데이터 입력 엔드포인트
app.post('/api/analyze', async (req, res) => {
  try {
    const patientData = req.body;

    // AI 분석 수행
    const analysis = await analyzePatient(patientData);

    // 차트 형식으로 포맷팅
    const chartOutput = formatChart(patientData, analysis);

    res.json({
      success: true,
      analysis,
      chartOutput
    });
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 메인 페이지
app.get('/', (req, res) => {
  res.sendFile(join(__dirname, '../public/index.html'));
});

// Tally 응답 파싱 함수
function parseTallyResponse(tallyData) {
  const fields = tallyData.data?.fields || [];
  const parsed = {};

  // Tally 필드 매핑
  const fieldMapping = {
    // 기본 정보
    'question_name': 'name',
    'question_sex': 'gender',
    'question_job': 'occupation',
    'question_symptom1': 'mainSymptom1',
    'question_symptom2': 'mainSymptom2',
    'question_symptom3': 'mainSymptom3',
    'question_medication': 'currentMedication',
    'question_history': 'medicalHistory',

    // 한열 관련
    'question_cold_sensitivity': 'coldSensitivity',
    'question_cold_areas': 'coldAreas',
    'question_cold_symptoms': 'coldSymptoms',
    'question_heat_sensitivity': 'heatSensitivity',
    'question_heat_symptoms': 'heatSymptoms',
    'question_cold_vs_heat': 'coldVsHeat',

    // 땀
    'question_sweat_amount': 'sweatAmount',
    'question_sweat_areas': 'sweatAreas',
    'question_sweat_effect': 'sweatEffect',

    // 음수
    'question_water_intake': 'waterIntake',
    'question_water_temp': 'waterTemperature',
    'question_thirst': 'thirst',

    // 체력
    'question_stamina': 'stamina',

    // 기호
    'question_taste_preference': 'tastePreference',
    'question_alcohol_frequency': 'alcoholFrequency',
    'question_alcohol_amount': 'alcoholAmount',
    'question_alcohol_symptoms': 'alcoholSymptoms',
    'question_smoking': 'smoking',

    // 식욕/소화
    'question_meals_per_day': 'mealsPerDay',
    'question_appetite': 'appetite',
    'question_eating_amount': 'eatingAmount',
    'question_digestion': 'digestion',
    'question_taste_in_mouth': 'tasteInMouth',
    'question_digestion_symptoms': 'digestionSymptoms',
    'question_nausea': 'nausea',

    // 대변
    'question_bowel_frequency': 'bowelFrequency',
    'question_stool_consistency': 'stoolConsistency',
    'question_constipation': 'constipation',
    'question_gas': 'gas',
    'question_diarrhea': 'diarrhea',

    // 소변
    'question_urination_day': 'urinationDay',
    'question_urination_night': 'urinationNight',
    'question_urination_symptoms': 'urinationSymptoms',
    'question_edema': 'edema',

    // 수면
    'question_sleep_hours': 'sleepHours',
    'question_sleep_quality': 'sleepQuality',
    'question_sleep_problems': 'sleepProblems',

    // 두통/현훈
    'question_headache': 'headache',
    'question_headache_location': 'headacheLocation',
    'question_dizziness': 'dizziness',

    // 정신/감정
    'question_stress': 'stress',
    'question_anxiety': 'anxiety',
    'question_depression': 'depression',

    // 여성건강
    'question_menstruation': 'menstruation',
    'question_menstrual_cycle': 'menstrualCycle',
    'question_menstrual_symptoms': 'menstrualSymptoms'
  };

  fields.forEach(field => {
    const key = fieldMapping[field.key] || field.key;
    parsed[key] = field.value;
  });

  return parsed;
}

app.listen(PORT, () => {
  console.log(`🏥 환자 설문 분석 서버가 포트 ${PORT}에서 실행 중입니다.`);
  console.log(`📋 웹 인터페이스: http://localhost:${PORT}`);
  console.log(`🔗 Tally Webhook URL: http://your-server:${PORT}/webhook/tally`);
});
