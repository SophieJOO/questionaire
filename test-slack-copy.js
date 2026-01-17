// Slack 줄바꿈 테스트 - 실제 줄바꿈 vs 이스케이프 문자
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

async function testSlackCopyPaste() {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;

    if (!webhookUrl) {
        console.error('❌ SLACK_WEBHOOK_URL이 설정되지 않았습니다.');
        return;
    }

    console.log('📤 슬랙 복사-붙여넣기 테스트 메시지 전송 중...\n');

    // 테스트 데이터
    const testData = [
        { label: '이름', value: '홍길동' },
        { label: '나이', value: '35세' },
        { label: '주소', value: '서울시 강남구' },
        { label: '증상', value: '두통, 어지러움' },
        { label: '기간', value: '3개월' }
    ];

    // 방법 1: 이스케이프된 \n 사용 (현재 방식 - 문제 있음)
    let text1 = '';
    for (const item of testData) {
        text1 += `[${item.label}] ${item.value}\\n`;
    }

    // 방법 2: 실제 줄바꿈 문자 사용 (해결책)
    let text2 = '';
    for (const item of testData) {
        text2 += `[${item.label}] ${item.value}
`;
    }

    const blocks = [
        {
            type: "header",
            text: {
                type: "plain_text",
                text: "🧪 복사-붙여넣기 테스트",
                emoji: true
            }
        },
        {
            type: "section",
            text: {
                type: "mrkdwn",
                text: "*❌ 방법 1: 이스케이프된 \\\\n 사용 (문제)*\n코드 블록에서 복사하면 줄바꿈이 사라집니다."
            }
        },
        {
            type: "section",
            text: {
                type: "mrkdwn",
                text: "```" + text1 + "```"
            }
        },
        {
            type: "divider"
        },
        {
            type: "section",
            text: {
                type: "mrkdwn",
                text: "*✅ 방법 2: 실제 줄바꿈 문자 사용 (해결)*\n코드 블록에서 복사해도 줄바꿈이 유지됩니다."
            }
        },
        {
            type: "section",
            text: {
                type: "mrkdwn",
                text: `\`\`\`
${text2}\`\`\``
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
                    text: "💡 방법 2의 코드 블록을 복사해서 메모장에 붙여넣어 보세요!"
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
                text: '복사-붙여넣기 테스트'
            })
        });

        if (response.ok) {
            console.log('✅ 테스트 메시지 전송 성공!');
            console.log('\n📋 테스트 방법:');
            console.log('  1. Slack에서 "방법 1" 코드 블록을 복사해서 메모장에 붙여넣기');
            console.log('  2. Slack에서 "방법 2" 코드 블록을 복사해서 메모장에 붙여넣기');
            console.log('  3. 방법 2에서만 줄바꿈이 제대로 유지되는 것을 확인하세요!');
        } else {
            const errorText = await response.text();
            console.error('❌ 전송 실패:', response.status, response.statusText);
            console.error('응답:', errorText);
        }
    } catch (error) {
        console.error('❌ 오류 발생:', error.message);
    }
}

testSlackCopyPaste();
