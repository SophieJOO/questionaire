/**
 * Slack 메시지 전송 함수들
 */

function sendToSlack(patientData, analysis, chartOutput) {
  const constitution = analysis.constitution || {};
  const ep = analysis.eightPrinciples || {};

  // Slack Block Kit 메시지 구성
  const blocks = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: "📋 새 환자 설문 접수",
        emoji: true
      }
    },
    {
      type: "section",
      fields: [
        {
          type: "mrkdwn",
          text: `*환자명:*\n${patientData.name || '미입력'}`
        },
        {
          type: "mrkdwn",
          text: `*성별/나이:*\n${patientData.gender || '-'} / ${patientData.age || '-'}세`
        },
        {
          type: "mrkdwn",
          text: `*추정 체질:*\n${constitution.type || '분석 중'}`
        },
        {
          type: "mrkdwn",
          text: `*신뢰도:*\n${constitution.confidence || '-'}`
        }
      ]
    },
    {
      type: "divider"
    },
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
    {
      type: "divider"
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*📝 체질 분석 근거*\n${constitution.rationale || '상세 분석 필요'}`
      }
    },
    {
      type: "divider"
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: "*📄 차트 (복사용)*"
      }
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: "```" + chartOutput + "```"
      }
    },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `⏰ ${new Date().toLocaleString('ko-KR')} | AI 분석 완료`
        }
      ]
    }
  ];

  const payload = {
    blocks: blocks,
    text: `새 환자 설문: ${patientData.name || '미입력'} - ${patientData.mainSymptom1 || '증상 미입력'}`
  };

  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(CONFIG.SLACK_WEBHOOK_URL, options);

  if (response.getResponseCode() !== 200) {
    throw new Error('Slack 전송 실패: ' + response.getContentText());
  }

  Logger.log('Slack 전송 완료');
}

/**
 * 에러 발생 시 Slack으로 알림
 */
function sendErrorToSlack(errorMessage) {
  const payload = {
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: "⚠️ 설문 분석 오류 발생",
          emoji: true
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "```" + errorMessage + "```"
        }
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `⏰ ${new Date().toLocaleString('ko-KR')}`
          }
        ]
      }
    ],
    text: '설문 분석 오류: ' + errorMessage
  };

  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  try {
    UrlFetchApp.fetch(CONFIG.SLACK_WEBHOOK_URL, options);
  } catch (e) {
    Logger.log('Slack 에러 전송 실패: ' + e.message);
  }
}

/**
 * 간단한 텍스트 메시지 전송 (테스트용)
 */
function sendSimpleMessage(message) {
  const payload = {
    text: message
  };

  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  UrlFetchApp.fetch(CONFIG.SLACK_WEBHOOK_URL, options);
}

/**
 * 분석 결과를 시트에 기록
 */
function recordAnalysis(sheet, row, analysis) {
  // 분석 결과 열 찾기 또는 생성
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  let analysisCol = headers.indexOf('AI분석결과') + 1;
  if (analysisCol === 0) {
    // 새 열 추가
    analysisCol = sheet.getLastColumn() + 1;
    sheet.getRange(1, analysisCol).setValue('AI분석결과');
  }

  let constitutionCol = headers.indexOf('추정체질') + 1;
  if (constitutionCol === 0) {
    constitutionCol = sheet.getLastColumn() + 1;
    sheet.getRange(1, constitutionCol).setValue('추정체질');
  }

  let conditionsCol = headers.indexOf('예상질환') + 1;
  if (conditionsCol === 0) {
    conditionsCol = sheet.getLastColumn() + 1;
    sheet.getRange(1, conditionsCol).setValue('예상질환');
  }

  // 값 기록
  const constitution = analysis.constitution || {};
  sheet.getRange(row, constitutionCol).setValue(constitution.type || '');
  sheet.getRange(row, conditionsCol).setValue((analysis.expectedConditions || []).join(', '));
  sheet.getRange(row, analysisCol).setValue(JSON.stringify(analysis));

  Logger.log('시트에 분석 결과 기록 완료');
}
