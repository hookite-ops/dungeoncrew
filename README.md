# 던전 크루 (DUNGEON CREW)

픽셀 탑뷰 로그라이크 슈팅 게임. 최대 4명이 방 코드로 모여 던전을 함께 공략합니다.

- `public/` — 게임 (APK 안에도 이 폴더가 그대로 들어감)
- `server.js` — 멀티플레이 중계 서버 + 웹 버전 서빙 (WebSocket `/ws`)
- 게임 주소: https://dungeoncrew-394173969859.asia-northeast3.run.app

## Cloud Run (서울, 저장소 연결 자동 배포)
`main`에 push하면 자동 배포됩니다. 서비스는 처음 한 번만 만들고, 아래 설정을 꼭 맞춥니다.

```
gcloud run services update dungeoncrew --region asia-northeast3 --max-instances 1 --min-instances 0 --concurrency 250 --timeout 3600 --session-affinity --port 8080
```

- 최대 인스턴스 1: 2대 이상이면 같은 방 코드로도 못 만납니다.
- 타임아웃 3600: 기본값(5분)이면 게임 중 연결이 끊깁니다.
