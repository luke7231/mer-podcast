require('dotenv').config();
const express = require('express');
const cron = require('node-cron');
const path = require('path');
const fs = require('fs');

const { fetchRecentPosts, fetchPostText } = require('./scraper');
const { convertTextToMp3, getFileSize, makeFilename, estimateDuration } = require('./tts');
const { addEpisode, getProcessedIds, generateRssXml, loadEpisodes } = require('./feed');

const PORT = process.env.PORT || 3000;
const BASE_URL = (process.env.BASE_URL || `http://localhost:${PORT}`).replace(/\/$/, '');

// 환경변수 검증
function validateEnv() {
  const gcpCreds = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!gcpCreds) {
    console.warn('[경고] GOOGLE_APPLICATION_CREDENTIALS 환경변수가 설정되지 않았습니다. TTS 변환이 실패합니다.');
  } else if (!require('fs').existsSync(gcpCreds)) {
    console.warn(`[경고] GCP 자격증명 파일을 찾을 수 없습니다: ${gcpCreds}`);
  }

  if (BASE_URL.includes('localhost') || BASE_URL.includes('127.0.0.1')) {
    console.warn('[경고] BASE_URL이 로컬 주소입니다. 팟캐스트 앱에서 오디오 파일에 접근할 수 없을 수 있습니다.');
    console.warn('       .env에서 BASE_URL을 서버의 공개 주소로 설정하세요. 예: BASE_URL=https://your-server.com');
  }
}

validateEnv();
const CRON_SCHEDULE = process.env.CRON_SCHEDULE || '0 7 * * *'; // 매일 오전 7시

const app = express();

// 오디오 파일 정적 서빙
app.use('/audio', express.static(path.join(__dirname, '..', 'audio')));

// 팟캐스트 RSS 피드
app.get('/rss', (req, res) => {
  try {
    const xml = generateRssXml(BASE_URL);
    res.set('Content-Type', 'application/rss+xml; charset=utf-8');
    res.send(xml);
  } catch (err) {
    console.error('[RSS] 생성 오류:', err.message);
    res.status(500).send('RSS 생성 오류');
  }
});

// 앱용 에피소드 JSON API
app.get('/episodes', (req, res) => {
  try {
    const episodes = loadEpisodes().map(ep => ({
      ...ep,
      audioUrl: `${BASE_URL}/audio/${ep.filename}`,
    }));
    res.json(episodes);
  } catch (err) {
    console.error('[API] episodes 오류:', err.message);
    res.status(500).json({ error: '에피소드 목록 오류' });
  }
});

// 상태 확인
app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

/**
 * 새 포스트를 확인하고 TTS 변환 후 피드에 추가
 */
async function processNewPosts() {
  console.log(`[${new Date().toISOString()}] 새 포스트 확인 중...`);

  let posts;
  try {
    posts = await fetchRecentPosts();
  } catch (err) {
    console.error('[Scraper] RSS 가져오기 실패:', err.message);
    return;
  }

  const processedIds = getProcessedIds();
  const newPosts = posts.filter(p => !processedIds.includes(p.id));

  if (newPosts.length === 0) {
    console.log('[Scraper] 새 포스트 없음.');
    return;
  }

  console.log(`[Scraper] 새 포스트 ${newPosts.length}개 발견.`);

  for (const post of newPosts) {
    console.log(`[처리중] "${post.title}" (${post.id})`);

    let text;
    try {
      text = await fetchPostText(post.link);
    } catch (err) {
      console.error(`[Scraper] 포스트 본문 스크래핑 실패 (${post.id}):`, err.message);
      continue;
    }

    if (!text || text.length < 50) {
      console.warn(`[Scraper] 본문이 너무 짧거나 비어있음 (${post.id}), 건너뜀.`);
      continue;
    }

    const filename = makeFilename(post.id, post.pubDate);

    try {
      const filePath = await convertTextToMp3(text, filename);
      const fileSize = getFileSize(filePath);
      const duration = estimateDuration(fileSize);

      addEpisode({
        postId: post.id,
        title: post.title,
        link: post.link,
        pubDate: post.pubDate,
        filename,
        fileSize,
        duration,
      });

      console.log(`[TTS] 완료: ${filename} (${(fileSize / 1024 / 1024).toFixed(1)} MB)`);
    } catch (err) {
      console.error(`[TTS] 변환 실패 (${post.id}):`, err.message);

      // 실패한 오디오 파일 정리
      const audioDir = path.join(__dirname, '..', 'audio');
      const failedFile = path.join(audioDir, filename);
      if (fs.existsSync(failedFile)) fs.unlinkSync(failedFile);
    }
  }

  console.log('[완료] 포스트 처리 완료.');
}

// 서버 시작
app.listen(PORT, () => {
  console.log(`[서버] http://localhost:${PORT} 에서 실행 중`);
  console.log(`[RSS] ${BASE_URL}/rss`);
  console.log(`[스케줄] ${CRON_SCHEDULE} (cron)`);
});

// 자동 스케줄러 등록
cron.schedule(CRON_SCHEDULE, processNewPosts, {
  timezone: 'Asia/Seoul',
});

// --run-now 플래그가 있으면 즉시 실행
if (process.argv.includes('--run-now')) {
  console.log('[수동 실행] 즉시 포스트 확인...');
  processNewPosts();
}
