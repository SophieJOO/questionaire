# 환자 설문 AI 분석 시스템

아현재한의원 환자 사전 설문 분석 시스템입니다. Tally 설문지 결과를 Gemini AI로 분석하여 체질과 예상질환을 사전에 파악합니다.

## 워크플로우 (Vercel 방식 - 권장)

```
Tally Form (환자 설문 작성)
      ↓
Vercel 서버 (Webhook 수신)
      ↓
Gemini AI (체질/질환 분석)
      ↓
Slack (차트 + 분석 결과 자동 전송)
```

**장점**: 설문지 몇 개를 만들든 **한 번만 설정**하면 끝!

## 기능

- **Tally Webhook 연동**: 설문 제출 시 자동 분석
- **AI 체질 분석**: 사상체질(태양/태음/소양/소음) 추정
- **예상 질환 분석**: 팔강변증, 장부변증 기반 분석
- **차트 자동 생성**: EMR에 바로 붙여넣을 수 있는 형식
- **Slack 자동 전송**: 새 설문 접수 시 즉시 알림

## 프로젝트 구조

```
/api
  └── webhook.js       # Tally Webhook 엔드포인트
/lib
  ├── analyzer.js      # Gemini AI 분석
  ├── chart.js         # 차트 포맷팅
  ├── parser.js        # Tally 데이터 파싱
  └── slack.js         # Slack 전송
/google-apps-script    # (대안) Google Apps Script 버전
vercel.json            # Vercel 설정
DEPLOY_GUIDE.md        # 배포 가이드
```

## 빠른 시작 (Vercel)

### 1. Vercel 배포
1. [Vercel](https://vercel.com)에서 GitHub 계정으로 로그인
2. 이 저장소 Import
3. 환경변수 설정:
   - `GEMINI_API_KEY`: Google AI Studio에서 발급
   - `SLACK_WEBHOOK_URL`: Slack Incoming Webhook URL
4. Deploy 클릭

### 2. Tally Webhook 설정
각 설문지에서:
1. Integrations → Webhooks
2. URL 입력: `https://your-app.vercel.app/api/webhook`
3. 저장

**끝!** 이제 설문이 제출되면 자동으로 Slack에 분석 결과가 전송됩니다.

👉 **[상세 배포 가이드 보기](DEPLOY_GUIDE.md)**

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

```
📋 새 환자 설문 접수 [성인]
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

📄 차트 (복사용)
...
```

## 비용

| 서비스 | 비용 |
|--------|------|
| Vercel | 무료 |
| Gemini API | 무료 (일 1,500회) |
| Slack | 무료 |

## 기술 스택

- Vercel Serverless Functions
- Google Gemini API
- Tally Forms Webhook
- Slack Incoming Webhooks
