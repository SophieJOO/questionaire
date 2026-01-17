// 간단한 문자열 치환으로 수정
import { readFileSync, writeFileSync } from 'fs';

const filePath = './api/webhook.js';

console.log('📝 webhook.js 파일 수정 중...\n');

try {
    // 파일 읽기
    let content = readFileSync(filePath, 'utf-8');

    // 백업
    writeFileSync(filePath + '.backup', content, 'utf-8');
    console.log('✅ 백업 완료: api/webhook.js.backup\n');

    // 문제가 되는 줄 찾기
    const searchString = '    const line = `[${item.label}] ${item.value}\\\\n`;';

    if (content.includes(searchString)) {
        // 실제 줄바꿈이 포함된 문자열로 교체
        const replaceString = '    const line = `[${item.label}] ${item.value}\n`;';
        content = content.replace(searchString, replaceString);

        writeFileSync(filePath, content, 'utf-8');
        console.log('✅ 수정 완료!');
        console.log('   변경 내용: formatRawResponsesChunks 함수');
        console.log('   이스케이프된 \\\\n → 실제 줄바꿈 문자\n');
        console.log('💡 이제 Slack에서 복사한 텍스트를 메모장에 붙여넣으면');
        console.log('   줄바꿈이 제대로 유지됩니다!');
    } else {
        console.log('⚠️  해당 문자열을 찾을 수 없습니다.');
        console.log('   수동 수정이 필요합니다:');
        console.log('   파일: api/webhook.js');
        console.log('   라인: 1252');
        console.log('   찾기: const line = `[${item.label}] ${item.value}\\\\n`;');
        console.log('   변경: const line = `[${item.label}] ${item.value}');
        console.log('`;');
        console.log('   (템플릿 리터럴 안에 실제 줄바꿈 포함)');
    }

} catch (error) {
    console.error('❌ 오류:', error.message);
}
