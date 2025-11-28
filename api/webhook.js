/**
 * Tally Webhook 수신 엔드포인트
 * Vercel Serverless Function
 *
 * URL: https://your-app.vercel.app/api/webhook
 */

import { analyzeWithGemini } from '../lib/analyzer.js';
import { sendToSlack } from '../lib/slack.js';
import { formatChart } from '../lib/chart.js';
import { parseTallyData } from '../lib/parser.js';

export default async function handler(req, res) {
  // POST 요청만 허용
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Tally webhook received');

    const tallyData = req.body;

    // Tally 데이터 파싱
    const patientData = parseTallyData(tallyData);
    console.log('Parsed patient:', patientData.name);

    // Gemini AI 분석
    const analysis = await analyzeWithGemini(patientData);
    console.log('Analysis complete');

    // 차트 포맷팅
    const chartOutput = formatChart(patientData, analysis);

    // Slack 전송
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

    // 에러도 Slack으로 알림
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
