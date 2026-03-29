const axios = require('axios');
const cheerio = require('cheerio');

const BLOG_ID = process.env.BLOG_ID || 'ranto28';
const RSS_URL = `https://rss.blog.naver.com/${BLOG_ID}`;

/**
 * Naver 블로그 RSS에서 최신 포스트 목록을 가져옴
 * @returns {Promise<Array<{id, title, link, pubDate}>>}
 */
async function fetchRecentPosts() {
  const response = await axios.get(RSS_URL, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; mer-podcast/1.0)' },
    timeout: 10000,
  });

  const $ = cheerio.load(response.data, { xmlMode: true });
  const posts = [];

  $('item').each((_, el) => {
    const link = $(el).find('link').text().trim() || $(el).find('link').next().text().trim();
    const postId = extractPostId(link);
    if (!postId) return;

    posts.push({
      id: postId,
      title: $(el).find('title').text().trim(),
      link,
      pubDate: new Date($(el).find('pubDate').text().trim()),
    });
  });

  return posts;
}

/**
 * 포스트 URL에서 포스트 ID 추출
 * 예: https://blog.naver.com/ranto28/223456789 → 223456789
 */
function extractPostId(url) {
  const match = url.match(/\/(\d{5,})(?:\?|$)/);
  return match ? match[1] : null;
}

/**
 * 특정 포스트의 본문 텍스트를 스크래핑
 * @param {string} postUrl
 * @returns {Promise<string>}
 */
async function fetchPostText(postUrl) {
  // 네이버 블로그는 iframe 내부에 실제 콘텐츠가 있음
  // postUrl: https://blog.naver.com/ranto28/12345 → frame URL로 변환
  const frameUrl = convertToFrameUrl(postUrl);

  const response = await axios.get(frameUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Referer: 'https://blog.naver.com/',
    },
    timeout: 15000,
  });

  const $ = cheerio.load(response.data);
  let text = '';

  // 스마트에디터 ONE (신형)
  if ($('.se-main-container').length) {
    $('.se-main-container').find('p, h1, h2, h3, h4').each((_, el) => {
      const t = $(el).text().trim();
      if (t) text += t + '\n';
    });
  }
  // 구형 에디터
  else if ($('#postViewArea').length) {
    text = $('#postViewArea').text();
  }
  // 폴백: body 전체
  else {
    $('script, style, nav, header, footer').remove();
    text = $('body').text();
  }

  return cleanText(text);
}

/**
 * 블로그 포스트 URL을 iframe(frame) URL로 변환
 * https://blog.naver.com/ranto28/12345
 * → https://blog.naver.com/PostView.naver?blogId=ranto28&logNo=12345
 */
function convertToFrameUrl(url) {
  const match = url.match(/blog\.naver\.com\/([^/]+)\/(\d+)/);
  if (match) {
    return `https://blog.naver.com/PostView.naver?blogId=${match[1]}&logNo=${match[2]}&redirect=Dlog&widgetTypeCall=true`;
  }
  return url;
}

/**
 * 텍스트 정리: HTML 엔티티, 과도한 공백 제거
 */
function cleanText(text) {
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/[\r\n]{3,}/g, '\n\n')  // 3줄 이상 공백 → 2줄
    .replace(/[ \t]{2,}/g, ' ')       // 연속 공백 제거
    .replace(/[^\uAC00-\uD7A3\u1100-\u11FF\u3130-\u318Fa-zA-Z0-9\s.,!?%\-\(\)\[\]""'':\n]/g, ' ') // 불필요 특수문자 제거
    .trim();
}

module.exports = { fetchRecentPosts, fetchPostText };
