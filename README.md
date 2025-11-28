# 환자 설문 AI 분석 시스템

아현재한의원 환자 사전 설문 분석 시스템입니다. Tally 설문지 결과를 AI로 분석하여 체질과 예상질환을 사전에 파악합니다.

## 워크플로우

```
Tally Form (환자 설문 작성)
      ↓
Google Sheets (자동 저장)
      ↓
Google Apps Script (AI 분석 트리거)
      ↓
Slack (차트 + 분석 결과 자동 전송)
```

## 기능

- **Tally → Google Sheets 연동**: 설문 결과 자동 저장
- **AI 체질 분석**: 사상체질(태양/태음/소양/소음) 추정
- **예상 질환 분석**: 팔강변증, 장부변증 기반 분석
- **차트 자동 생성**: EMR에 바로 붙여넣을 수 있는 형식
- **Slack 자동 전송**: 새 설문 접수 시 즉시 알림

## 구성 요소

### 1. Google Apps Script (권장)
서버 없이 Google Sheets에서 직접 실행

```
google-apps-script/
├── Code.gs              # 메인 코드 (트리거, AI 분석)
├── ChartFormatter.gs    # 차트 포맷팅
├── SlackSender.gs       # Slack 전송
└── SETUP_GUIDE.md       # 상세 설정 가이드
```

👉 **[설정 가이드 보기](google-apps-script/SETUP_GUIDE.md)**

### 2. Node.js 서버 (대안)
자체 서버를 운영하는 경우

```
src/
├── server.js           # Express 서버
├── analyzer.js         # AI 분석 모듈
└── chartFormatter.js   # 차트 포맷팅
```

## 빠른 시작 (Google Apps Script)

1. Google Sheets 생성 → 시트 이름을 `설문응답`으로 변경
2. Tally 설문지에서 Google Sheets 연동 설정
3. [Slack Webhook 생성](https://api.slack.com/apps)
4. [Anthropic API 키 발급](https://console.anthropic.com)
5. Google Sheets → 확장 프로그램 → Apps Script
6. `google-apps-script/` 폴더의 코드 복사
7. CONFIG에 API 키와 Webhook URL 입력
8. 트리거 설정 (변경 시 → onFormSubmit 실행)

## 설문지 링크

- 성인용: https://tally.so/r/3XVKVO
- 청소년용: (준비 중)
- 다이어트 전용: (준비 중)
- 자동차보험용: (준비 중)

## 차트 출력 형식

```
홍길동/M/35세/회사원
170cm/70kg BMI 24.2
BP ___/___ mmHg  PR ___회/분
형색성정: 중등신 / 면황 / 급성 / 다혈질

[주소]
#1. 두통
o/s) 3개월
mode) 스트레스 시 악화

po med) 없음
p/h) 없음
f/h) 추후 확인

[부증]
[두통] (+) 전두부, 박동성
[현훈] (-)
[구갈] 물 2L/일 (상온수)
[구고] (-)
[흉만] (-)
[심번] (-)
[매핵] (-)
[식욕] 보통, 3끼/일
[소화] 보통
[대변] 하루 한번, 보통
[소변] 주간 6회
[트림] (-)
[방귀] (-)
[생리] N/A
[한출] 보통
[수면] 7시간, 보통
[부종] (-)
[한열] 추위를 더 탄다
[복진]
[첨언]
[처방]
```

## Slack 알림 예시

새 설문이 접수되면 Slack으로 다음 정보가 전송됩니다:

- 환자 기본 정보
- 추정 체질 및 신뢰도
- 주호소
- 팔강변증 결과
- 예상 질환
- 추천 처방 후보
- 복사용 차트

## 기술 스택

- Google Apps Script
- Anthropic Claude API
- Tally Forms
- Slack Incoming Webhooks
- Google Sheets
