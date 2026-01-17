# Slack 줄바꿈 문제 해결 가이드

## 문제 상황
Slack에서 코드 블록의 내용을 복사해서 메모장이나 차트 프로그램에 붙여넣으면 줄바꿈이 사라지는 문제

## 원인
`api/webhook.js` 파일의 `formatRawResponsesChunks` 함수(1252번 줄)에서 **이스케이프된 문자열** `\\n`을 사용하고 있어서, 실제 줄바꿈 문자가 아닌 백슬래시+n 두 글자가 들어가고 있습니다.

## 해결 방법

### 📝 수정할 파일
`api/webhook.js` 파일의 **1252번 줄**

### 🔍 현재 코드 (문제)
```javascript
const line = `[${item.label}] ${item.value}\\n`;
```

### ✅ 수정할 코드 (해결)
```javascript
const line = `[${item.label}] ${item.value}
`;
```

**중요**: 템플릿 리터럴(백틱) 안에 **실제 줄바꿈**을 넣어야 합니다!

### 📋 수정 단계

1. VSCode에서 `api/webhook.js` 파일 열기
2. `Ctrl+G`를 눌러서 1252번 줄로 이동
3. 해당 줄을 찾습니다:
   ```javascript
   const line = `[${item.label}] ${item.value}\\n`;
   ```
4. `\\n`을 삭제하고 **Enter 키**를 눌러 실제 줄바꿈을 넣습니다
5. 백틱(`)과 세미콜론(;)을 다음 줄에 입력합니다

### 최종 결과
```javascript
  for (const item of rawResponses) {
    const line = `[${item.label}] ${item.value}
`;
```

## 테스트 방법

1. 수정 후 파일 저장
2. 테스트 스크립트 실행:
   ```bash
   node test-slack-copy.js
   ```
3. Slack에서 "방법 2" 코드 블록을 복사
4. 메모장에 붙여넣기
5. 줄바꿈이 제대로 유지되는지 확인! ✅

## 백업
수정 전에 파일을 백업해두는 것을 권장합니다:
```bash
copy api\webhook.js api\webhook.js.backup
```
