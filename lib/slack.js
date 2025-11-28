/**
 * Slack 메시지 전송 모듈
 */

export async function sendToSlack(patientData, analysis, chartOutput) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) {
    throw new Error('SLACK_WEBHOOK_URL 환경변수가 설정되지 않았습니다');
  }

  const constitution = analysis.constitution || {};
  const ep = analysis.eightPrinciples || {};
  const surveyTypeLabel = getSurveyTypeLabel(patientData.surveyType);

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
        { type: "mrkdwn", text: `*신뢰도:*\n${constitution.confidence || '-'}` }
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
        text: `*⚖️ 팔강변증*\n${ep.yinYang || '-'}/${ep.exteriorInterior || '-'}/${ep.coldHeat || '-'}/${ep.deficiencyExcess || '-'}`
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
