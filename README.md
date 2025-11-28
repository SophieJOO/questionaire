# 환자 설문 AI 분석 시스템

아현재한의원 환자 사전 설문 분석 시스템입니다. Tally 설문지 결과를 AI로 분석하여 체질과 예상질환을 사전에 파악합니다.

## 기능

- **Tally 설문 연동**: Webhook을 통해 설문 결과 자동 수신
- **AI 체질 분석**: 사상체질(태양/태음/소양/소음) 추정
- **예상 질환 분석**: 팔강변증, 장부변증 기반 분석
- **차트 자동 생성**: EMR에 바로 붙여넣을 수 있는 형식

## 설치

```bash
npm install
```

## 환경 설정

`.env` 파일 생성:

```
ANTHROPIC_API_KEY=your_api_key_here
PORT=3000
```

## 실행

```bash
npm start
# 또는 개발 모드
npm run dev
```

## Tally Webhook 설정

1. Tally 설문지 설정에서 Integrations > Webhooks 선택
2. Webhook URL: `https://your-server.com/webhook/tally`
3. 저장

## 설문지 링크

- 성인용: https://tally.so/r/3XVKVO
- 청소년용: (준비 중)
- 다이어트 전용: (준비 중)
- 자동차보험용: (준비 중)

## 차트 출력 형식

```
___/M/32세/회사원
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
[구갈] (-)
...
[처방] 진료 후 결정
```

## 기술 스택

- Node.js / Express
- Anthropic Claude API
- Tally Forms (설문)
