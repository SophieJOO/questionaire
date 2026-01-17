// 슬랙 줄바꿈 테스트 스크립트
import { readFileSync } from 'fs';

// .env.local 파일 수동 파싱
function loadEnv() {
    try {
        const envContent = readFileSync('.env.local', 'utf-8');
        const lines = envContent.split('\n');
        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith('#')) {
                const [key, ...valueParts] = trimmed.split('=');
                if (key && valueParts.length > 0) {
                    const value = valueParts.join('=').replace(/^["']|["']$/g, '');
                    process.env[key.trim()] = value.trim();
                }
            }
        }
    } catch (error) {
        console.error('❌ .env.local 파일을 읽을 수 없습니다:', error.message);
    }
}

loadEnv();

async function testSlackLineBreaks() {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;

    if (!webhookUrl) {
        console.error('❌ SLACK_WEBHOOK_URL이 설정되지 않았습니다.');
        return;
    }

    console.log('📤 슬랙으로 테스트 메시지 전송 중...\n');

    // 다양한 줄바꿈 패턴 테스트
    const blocks = [
        {
            type: "header",
            text: {
                type: "plain_text",
                text: "🧪 줄바꿈 테스트 메시지",
                emoji: true
            }
        },
        {
            type: "section",
            text: {
                type: "mrkdwn",
                text: "*테스트 1: 일반 줄바꿈 (\\n)*\n첫 번째 줄\n두 번째 줄\n세 번째 줄"
            }
        },
        {
            type: "section",
            text: {
                type: "mrkdwn",
                text: "*테스트 2: 이중 줄바꿈 (\\n\\n)*\n\n첫 번째 문단\n\n두 번째 문단\n\n세 번째 문단"
            }
        },
        {
            type: "section",
            text: {
                type: "mrkdwn",
                text: "*테스트 3: 리스트 형식*\n• 항목 1\n• 항목 2\n• 항목 3"
            }
        },
        {
            type: "section",
            text: {
                type: "mrkdwn",
                text: `*테스트 4: 코드 블록 내 줄바꿈*
\`\`\`
첫 번째 줄
두 번째 줄
세 번째 줄
네 번째 줄
\`\`\``
            }
        },
        {
            type: "section",
            fields: [
                {
                    type: "mrkdwn",
                    text: "*필드 1*\n값 1-1\n값 1-2"
                },
                {
                    type: "mrkdwn",
                    text: "*필드 2*\n값 2-1\n값 2-2"
                }
            ]
        },
        {
            type: "section",
            text: {
                type: "mrkdwn",
                text: "*테스트 5: 복합 포맷*\n*굵게* / _기울임_ / ~취소선~\n`인라인 코드`\n> 인용문 첫 줄\n> 인용문 둘째 줄"
            }
        },
        {
            type: "divider"
        },
        {
            type: "context",
            elements: [
                {
                    type: "mrkdwn",
                    text: `⏰ 테스트 시간: ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`
                }
            ]
        }
    ];

    try {
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                blocks,
                text: '줄바꿈 테스트 메시지'
            })
        });

        if (response.ok) {
            console.log('✅ 슬랙 메시지 전송 성공!');
            console.log('📱 슬랙 채널에서 줄바꿈이 제대로 표시되는지 확인해주세요.\n');
            console.log('테스트 항목:');
            console.log('  1. 일반 줄바꿈 (\\n)');
            console.log('  2. 이중 줄바꿈 (\\n\\n)');
            console.log('  3. 리스트 형식');
            console.log('  4. 코드 블록 내 줄바꿈');
            console.log('  5. 필드 내 줄바꿈');
            console.log('  6. 복합 포맷 + 줄바꿈');
        } else {
            const errorText = await response.text();
            console.error('❌ 슬랙 전송 실패:', response.status, response.statusText);
            console.error('응답:', errorText);
        }
    } catch (error) {
        console.error('❌ 오류 발생:', error.message);
    }
}

testSlackLineBreaks();
