# 환자 설문 AI 분석 시스템 설정 가이드

Tally Form → Google Sheets → Gemini AI 분석 → Slack 자동 전송

---

## 1단계: Google Sheets 준비

### 1.1 새 스프레드시트 생성
1. [Google Sheets](https://sheets.google.com) 접속
2. 새 스프레드시트 생성
3. 시트 이름을 `설문응답`으로 변경 (하단 탭 더블클릭)

---

## 2단계: Tally → Google Sheets 연동

### 2.1 Tally 설문지에서 연동 설정
1. Tally 설문지 편집 화면 접속
2. 상단 **Integrations** 클릭
3. **Google Sheets** 선택
4. Google 계정 연결
5. 위에서 만든 스프레드시트 선택
6. 시트 이름 `설문응답` 선택
7. **Connect** 클릭

> ✅ 이제 설문 응답이 자동으로 Google Sheets에 저장됩니다.

---

## 3단계: Slack Webhook 설정

### 3.1 Slack App 생성
1. [Slack API](https://api.slack.com/apps) 접속
2. **Create New App** → **From scratch**
3. App 이름: `환자설문알림`
4. Workspace 선택 후 **Create App**

### 3.2 Incoming Webhook 활성화
1. 좌측 메뉴 **Incoming Webhooks** 클릭
2. **Activate Incoming Webhooks** → On
3. 하단 **Add New Webhook to Workspace** 클릭
4. 알림 받을 채널 선택 (예: #환자설문)
5. **Allow** 클릭
6. **Webhook URL** 복사 (나중에 사용)

```
https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX
```

---

## 4단계: Google AI Studio API 키 발급 (Gemini)

### 4.1 API 키 생성
1. [Google AI Studio](https://aistudio.google.com/apikey) 접속
2. Google 계정으로 로그인
3. **Get API Key** 또는 **API 키 만들기** 클릭
4. 새 프로젝트 선택 또는 기존 프로젝트 선택
5. **Create API key in new project** 클릭
6. 생성된 API 키 복사

```
AIzaSy________________________________________________
```

> 💡 Gemini API는 무료 사용량이 넉넉합니다 (분당 60회, 일 1,500회)

### 4.2 사용 가능한 모델
- `gemini-1.5-flash`: 빠르고 경제적 (권장)
- `gemini-1.5-pro`: 더 정확하지만 느림

---

## 5단계: Google Apps Script 설정

### 5.1 Apps Script 열기
1. Google Sheets에서 **확장 프로그램** → **Apps Script** 클릭
2. 새 Apps Script 프로젝트가 열림

### 5.2 코드 복사
1. 기존 `Code.gs` 내용을 모두 삭제
2. 이 저장소의 `Code.gs` 내용을 복사하여 붙여넣기
3. 좌측 **+** 버튼 → **스크립트** 클릭하여 새 파일 생성
4. 파일명: `ChartFormatter` → `ChartFormatter.gs` 내용 붙여넣기
5. 파일명: `SlackSender` → `SlackSender.gs` 내용 붙여넣기

### 5.3 API 키 설정
`Code.gs` 상단의 CONFIG 부분 수정:

```javascript
const CONFIG = {
  GEMINI_API_KEY: 'AIzaSy_여기에_실제_키_입력',  // Google AI Studio API 키
  SLACK_WEBHOOK_URL: 'https://hooks.slack.com/services/여기에_실제_URL_입력',
  SHEET_NAME: '설문응답',
  GEMINI_MODEL: 'gemini-1.5-flash',  // 또는 'gemini-1.5-pro'
};
```

### 5.4 저장
- **Ctrl+S** 또는 💾 아이콘 클릭

---

## 6단계: 트리거 설정 (자동 실행)

### 6.1 트리거 생성
1. Apps Script 좌측 메뉴 **⏰ 트리거** 클릭
2. 우측 하단 **+ 트리거 추가** 클릭
3. 다음과 같이 설정:
   - 실행할 함수: `onFormSubmit`
   - 이벤트 소스: `스프레드시트에서`
   - 이벤트 유형: `변경 시` 또는 `양식 제출 시`
4. **저장** 클릭
5. Google 계정 권한 승인

> 💡 "양식 제출 시"가 없으면 "변경 시"를 선택하세요.

---

## 7단계: 테스트

### 7.1 수동 테스트
1. Tally 설문지에서 테스트 응답 제출
2. Google Sheets에 데이터가 추가되는지 확인
3. Apps Script에서 `testAnalysis` 함수 실행:
   - ▶️ 버튼 옆 드롭다운에서 `testAnalysis` 선택
   - ▶️ 실행 클릭
4. Slack 채널에서 메시지 확인

### 7.2 로그 확인
- Apps Script에서 **실행** → **실행 로그** 확인
- 오류 발생 시 상세 내용 확인 가능

---

## 문제 해결

### ❌ "API 키가 잘못되었습니다"
- Google AI Studio에서 API 키가 활성화되어 있는지 확인
- 키 앞뒤 공백 제거
- `AIzaSy`로 시작하는지 확인

### ❌ "Gemini API: 응답이 없습니다"
- 프롬프트가 너무 긴 경우 발생할 수 있음
- `GEMINI_MODEL`을 `gemini-1.5-pro`로 변경해보기

### ❌ "Slack 전송 실패"
- Webhook URL이 올바른지 확인
- Slack App이 채널에 추가되어 있는지 확인

### ❌ "시트를 찾을 수 없습니다"
- 시트 이름이 `설문응답`인지 확인 (대소문자 구분)
- CONFIG의 SHEET_NAME 값 확인

### ❌ 트리거가 실행되지 않음
- 트리거 설정 확인
- Google 계정 권한 승인 확인
- Apps Script 실행 로그 확인

---

## Slack 메시지 예시

```
📋 새 환자 설문 접수
━━━━━━━━━━━━━━━━━━━━━━━━
환자명: 홍길동
성별/나이: 남성 / 35세
추정 체질: 소음인
신뢰도: 중간

🎯 주호소
두통 3개월, 스트레스 받으면 심해짐

⚖️ 팔강변증
음/리/한/허

🏥 예상 질환
기허두통, 간기울결

💊 추천 처방 후보
보중익기탕, 소요산

📝 체질 분석 근거
추위를 많이 타고, 소화기능이 약하며...

📄 차트 (복사용)
홍길동/M/35세/회사원
170cm/70kg BMI 24.2
...
```

---

## Gemini vs Claude 비교

| 항목 | Gemini | Claude |
|------|--------|--------|
| 무료 사용량 | 분당 60회, 일 1,500회 | 없음 |
| 속도 | 빠름 (flash 모델) | 보통 |
| 한국어 | 양호 | 우수 |
| 비용 | 무료 ~ 저렴 | 유료 |

> 💡 대부분의 경우 Gemini 1.5 Flash로 충분합니다.

---

## 추가 설정 (선택사항)

### 특정 시간에만 알림 받기
트리거를 "시간 기반"으로 설정하여 특정 시간에만 실행 가능

### 여러 채널에 전송
`SlackSender.gs`에서 여러 Webhook URL로 전송하도록 수정 가능

### 분석 결과 시트 저장
기본적으로 분석 결과가 시트에 자동 저장됨
- `추정체질` 열
- `예상질환` 열
- `AI분석결과` 열 (JSON 형식)

### 모델 변경
더 정확한 분석이 필요하면 CONFIG에서 모델 변경:
```javascript
GEMINI_MODEL: 'gemini-1.5-pro',  // 더 정확하지만 느림
```
