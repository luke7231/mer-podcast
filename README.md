# mer-podcast

네이버 블로그 포스트를 자동으로 팟캐스트로 변환해주는 서버입니다.

매일 지정한 블로거의 새 포스팅을 감지하여 Google Cloud TTS로 음성 변환 후 팟캐스트 RSS 피드로 제공합니다.

## 요구사항

- Node.js 18 이상
- Google Cloud 계정 및 Text-to-Speech API 활성화
- VPS 또는 항상 켜져있는 서버

## 설치

```bash
# 저장소 클론
git clone <repo-url>
cd mer-podcast

# 의존성 설치
npm install

# 환경변수 설정
cp .env.example .env
# .env 파일을 열어 값 설정
```

## Google Cloud TTS 설정

1. [Google Cloud Console](https://console.cloud.google.com/)에서 프로젝트 생성
2. Text-to-Speech API 활성화
3. 서비스 계정 생성 후 JSON 키 다운로드
4. `.env`의 `GOOGLE_APPLICATION_CREDENTIALS`에 키 파일 경로 입력

## 환경변수 (.env)

| 변수 | 설명 | 예시 |
|------|------|------|
| `GOOGLE_APPLICATION_CREDENTIALS` | GCP 서비스 계정 키 경로 | `/home/user/gcp-key.json` |
| `BASE_URL` | 서버 공개 URL | `https://your-server.com` |
| `PORT` | 서버 포트 | `3000` |
| `BLOG_ID` | 네이버 블로그 ID | `ranto28` |
| `CRON_SCHEDULE` | 스케줄 (cron) | `0 7 * * *` |

## 실행

```bash
# 서버 시작 (자동 스케줄 포함)
npm start

# 즉시 새 포스트 확인 및 변환
npm run run-now
```

## 팟캐스트 구독

서버 실행 후 아래 RSS URL을 팟캐스트 앱에 추가합니다:

```
http://your-server.com:3000/rss
```

### 앱별 구독 방법

- **Apple Podcasts**: 라이브러리 → ... → URL로 팟캐스트 추가
- **Spotify**: 지원 안 함 (Pocket Casts, Overcast 등 RSS 지원 앱 권장)
- **Pocket Casts**: + 버튼 → URL로 팟캐스트 추가
- **Castro**: 탐색 → URL 구독

## 파일 구조

```
mer-podcast/
├── src/
│   ├── scraper.js    # 네이버 블로그 RSS 파싱 + 본문 스크래핑
│   ├── tts.js        # Google Cloud TTS 변환
│   ├── feed.js       # 팟캐스트 RSS XML 생성
│   └── server.js     # Express 서버 + cron 스케줄러
├── audio/            # 생성된 MP3 파일
├── data/
│   └── feed.json     # 처리된 에피소드 목록
├── .env.example
└── package.json
```

## systemd로 서비스 등록 (VPS)

```ini
# /etc/systemd/system/mer-podcast.service
[Unit]
Description=mer-podcast
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/home/your-user/mer-podcast
ExecStart=/usr/bin/node src/server.js
Restart=on-failure
EnvironmentFile=/home/your-user/mer-podcast/.env

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable mer-podcast
sudo systemctl start mer-podcast
```
