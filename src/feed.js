const RSS = require('rss');
const fs = require('fs');
const path = require('path');

const FEED_PATH = path.join(__dirname, '..', 'data', 'feed.json');
const AUDIO_DIR = path.join(__dirname, '..', 'audio');
const MAX_EPISODES = parseInt(process.env.MAX_EPISODES || '30', 10);

/**
 * 처리된 에피소드 목록 로드 (없으면 빈 배열)
 * @returns {Array}
 */
function loadEpisodes() {
  if (!fs.existsSync(FEED_PATH)) return [];
  try {
    return JSON.parse(fs.readFileSync(FEED_PATH, 'utf8'));
  } catch {
    return [];
  }
}

/**
 * 에피소드 목록 저장
 */
function saveEpisodes(episodes) {
  const dataDir = path.dirname(FEED_PATH);
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(FEED_PATH, JSON.stringify(episodes, null, 2), 'utf8');
}

/**
 * 새 에피소드를 목록에 추가하고 저장
 * @param {{postId, title, link, pubDate, filename, fileSize}} episode
 */
function addEpisode(episode) {
  const episodes = loadEpisodes();
  // 중복 방지
  if (episodes.find(e => e.postId === episode.postId)) return;
  episodes.unshift(episode); // 최신 포스트를 앞에

  // 최대 에피소드 수 초과 시 오래된 것부터 정리
  while (episodes.length > MAX_EPISODES) {
    const oldest = episodes.pop();
    const audioFile = path.join(AUDIO_DIR, oldest.filename);
    if (fs.existsSync(audioFile)) {
      try {
        fs.unlinkSync(audioFile);
        console.log(`[정리] 오래된 에피소드 삭제: ${oldest.filename}`);
      } catch (err) {
        console.error(`[정리] 파일 삭제 실패: ${oldest.filename}`, err.message);
      }
    }
  }

  saveEpisodes(episodes);
}

/**
 * 처리된 postId 목록 반환
 */
function getProcessedIds() {
  return loadEpisodes().map(e => e.postId);
}

/**
 * 팟캐스트 RSS XML 생성
 * @param {string} baseUrl - 서버 공개 URL (예: https://your-server.com)
 * @returns {string} RSS XML 문자열
 */
function generateRssXml(baseUrl) {
  const blogId = process.env.BLOG_ID || 'ranto28';
  const episodes = loadEpisodes();

  const feed = new RSS({
    title: `${blogId} 경제 팟캐스트`,
    description: `네이버 블로그 ${blogId}의 포스트를 팟캐스트로 자동 변환`,
    feed_url: `${baseUrl}/rss`,
    site_url: `https://blog.naver.com/${blogId}`,
    image_url: `${baseUrl}/cover.jpg`,
    language: 'ko',
    pubDate: episodes.length ? new Date(episodes[0].pubDate) : new Date(),
    ttl: 60,
    custom_namespaces: {
      itunes: 'http://www.itunes.com/dtds/podcast-1.0.dtd',
    },
    custom_elements: [
      { 'itunes:author': blogId },
      { 'itunes:subtitle': '경제 블로그 팟캐스트' },
      { 'itunes:summary': `네이버 블로그 ${blogId}의 경제 포스트를 TTS로 변환한 팟캐스트` },
      { 'itunes:explicit': 'no' },
      {
        'itunes:category': [
          { _attr: { text: 'Business' } },
          { 'itunes:category': { _attr: { text: 'Investing' } } },
        ],
      },
    ],
  });

  for (const ep of episodes) {
    const audioUrl = `${baseUrl}/audio/${ep.filename}`;
    feed.item({
      title: ep.title,
      description: ep.title,
      url: ep.link,
      guid: ep.postId,
      date: new Date(ep.pubDate),
      enclosure: {
        url: audioUrl,
        size: ep.fileSize,
        type: 'audio/mpeg',
      },
      custom_elements: [
        { 'itunes:title': ep.title },
        { 'itunes:summary': ep.title },
        { 'itunes:duration': ep.duration || '' },
        { 'itunes:explicit': 'no' },
      ],
    });
  }

  return feed.xml({ indent: true });
}

module.exports = { addEpisode, getProcessedIds, generateRssXml, loadEpisodes };
