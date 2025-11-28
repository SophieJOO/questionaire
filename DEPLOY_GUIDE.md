# Vercel 배포 가이드

Tally → Vercel 서버 → Gemini AI → Slack 자동 전송

---

## 전체 흐름

```
1. 환자가 Tally 설문 작성
         ↓
2. Tally가 Vercel 서버로 데이터 전송 (Webhook)
         ↓
3. Vercel 서버에서 Gemini AI로 분석
         ↓
4. Slack으로 차트 + 분석 결과 전송
```

---

## 1단계: GitHub에 코드 업로드

이미 GitHub 저장소가 있다면 이 단계 건너뛰기

```bash
# 저장소 생성 후
git remote add origin https://github.com/your-username/questionaire.git
git push -u origin main
```

---

## 2단계: Vercel 배포

### 2.1 Vercel 가입 및 연결
1. [Vercel](https://vercel.com) 접속
2. **Continue with GitHub** 클릭 (GitHub 계정으로 로그인)
3. **Add New...** → **Project** 클릭
4. GitHub 저장소 목록에서 `questionaire` 선택
5. **Import** 클릭

### 2.2 환경변수 설정
Import 화면에서 **Environment Variables** 섹션:

| Name | Value |
|------|-------|
| `GEMINI_API_KEY` | AIzaSy... (Google AI Studio에서 발급) |
| `SLACK_WEBHOOK_URL` | https://hooks.slack.com/services/... |
| `GEMINI_MODEL` | gemini-1.5-flash |

### 2.3 배포
- **Deploy** 클릭
- 1~2분 후 배포 완료
- URL 확인: `https://your-app.vercel.app`

---

## 3단계: Tally Webhook 설정

### 3.1 각 설문지에서 Webhook 설정
1. Tally 설문지 편집 화면
2. **Integrations** 탭 클릭
3. **Webhooks** 선택
4. **Endpoint URL** 입력:
   ```
   https://your-app.vercel.app/api/webhook
   ```
5. **Connect** 클릭

### 3.2 여러 설문지 연결
- 성인 설문지 → 같은 Webhook URL 등록
- 청소년 설문지 → 같은 Webhook URL 등록
- 다이어트 설문지 → 같은 Webhook URL 등록
- **모든 설문지가 같은 URL을 사용!**

---

## 4단계: 테스트

1. Tally 설문지에서 테스트 응답 제출
2. Slack 채널에서 메시지 확인
3. 문제 발생 시 Vercel 대시보드에서 로그 확인:
   - Vercel → 프로젝트 → **Deployments** → **Functions**

---

## API 키 발급 방법

### Gemini API 키 (무료)
1. [Google AI Studio](https://aistudio.google.com/apikey) 접속
2. Google 계정 로그인
3. **Get API Key** 클릭
4. 키 복사 (`AIzaSy...` 형태)

### Slack Webhook URL
1. [Slack API](https://api.slack.com/apps) 접속
2. **Create New App** → **From scratch**
3. App 이름 입력, Workspace 선택
4. **Incoming Webhooks** → On
5. **Add New Webhook to Workspace**
6. 채널 선택 → URL 복사

---

## 환경변수 변경 방법

Vercel 대시보드에서:
1. 프로젝트 선택
2. **Settings** → **Environment Variables**
3. 변수 수정 후 **Save**
4. **Deployments** → **Redeploy** (최신 배포 선택)

---

## 문제 해결

### ❌ Webhook이 작동하지 않음
- Tally Webhook URL이 정확한지 확인
- URL 끝에 `/api/webhook` 있는지 확인
- Vercel 로그 확인

### ❌ Slack 메시지가 안 옴
- `SLACK_WEBHOOK_URL` 환경변수 확인
- Slack App이 채널에 추가되어 있는지 확인

### ❌ AI 분석 오류
- `GEMINI_API_KEY` 환경변수 확인
- Google AI Studio에서 API 사용량 확인

### ❌ 로그 확인 방법
1. Vercel 대시보드 → 프로젝트
2. **Deployments** 탭
3. 최신 배포 클릭
4. **Functions** 탭에서 로그 확인

---

## 비용

| 서비스 | 비용 |
|--------|------|
| Vercel | 무료 (Hobby Plan) |
| Gemini API | 무료 (일 1,500회) |
| Slack | 무료 |
| Tally | 무료/유료 |

---

## 장점

1. **한 번 설정으로 끝**: 설문지 추가해도 Webhook URL만 등록
2. **서버 관리 불필요**: Vercel이 자동 관리
3. **자동 배포**: GitHub 푸시하면 자동 업데이트
4. **무료**: 대부분의 사용량에서 무료
