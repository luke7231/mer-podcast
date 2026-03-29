const textToSpeech = require('@google-cloud/text-to-speech');
const fs = require('fs');
const path = require('path');

const client = new textToSpeech.TextToSpeechClient();

const AUDIO_DIR = path.join(__dirname, '..', 'audio');
const MAX_BYTES = 4800; // Google TTS 한 요청 최대 5000 bytes (여유분 확보)

/**
 * 텍스트를 Google Cloud TTS로 MP3 변환 후 저장
 * @param {string} text - 변환할 텍스트
 * @param {string} filename - 저장할 파일명 (확장자 포함, 예: 20240101_12345.mp3)
 * @returns {Promise<string>} 저장된 파일 경로
 */
async function convertTextToMp3(text, filename) {
  if (!fs.existsSync(AUDIO_DIR)) {
    fs.mkdirSync(AUDIO_DIR, { recursive: true });
  }

  const filePath = path.join(AUDIO_DIR, filename);
  const chunks = splitTextIntoChunks(text);

  const audioBuffers = [];
  for (const chunk of chunks) {
    const buffer = await synthesizeChunk(chunk);
    audioBuffers.push(buffer);
  }

  // 모든 청크를 하나의 MP3 파일로 합치기
  const combined = Buffer.concat(audioBuffers);
  fs.writeFileSync(filePath, combined);

  return filePath;
}

/**
 * 단일 텍스트 청크를 TTS로 변환
 */
async function synthesizeChunk(text) {
  const request = {
    input: { text },
    voice: {
      languageCode: 'ko-KR',
      name: 'ko-KR-Wavenet-B',
      ssmlGender: 'FEMALE',
    },
    audioConfig: {
      audioEncoding: 'MP3',
      speakingRate: 1.1,  // 약간 빠르게 (운전 중 듣기에 적합)
      pitch: 0,
    },
  };

  const [response] = await client.synthesizeSpeech(request);
  return response.audioContent;
}

/**
 * 텍스트를 TTS 바이트 제한에 맞게 문단 단위로 분할
 * @param {string} text
 * @returns {string[]}
 */
function splitTextIntoChunks(text) {
  const paragraphs = text.split('\n').filter(p => p.trim().length > 0);
  const chunks = [];
  let currentChunk = '';

  for (const para of paragraphs) {
    const candidate = currentChunk ? currentChunk + '\n' + para : para;
    if (Buffer.byteLength(candidate, 'utf8') > MAX_BYTES) {
      if (currentChunk) {
        chunks.push(currentChunk);
        currentChunk = para;
      } else {
        // 단일 문단이 너무 긴 경우 문장 단위로 추가 분할
        const sentences = splitLongParagraph(para);
        chunks.push(...sentences.slice(0, -1));
        currentChunk = sentences[sentences.length - 1] || '';
      }
    } else {
      currentChunk = candidate;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk);
  }

  return chunks.filter(c => c.trim().length > 0);
}

/**
 * 단일 문단을 문장 단위로 분할 (마침표, 느낌표, 물음표 기준)
 */
function splitLongParagraph(para) {
  const sentences = para.match(/[^.!?]+[.!?]+/g) || [para];
  const chunks = [];
  let current = '';

  for (const s of sentences) {
    const candidate = current + s;
    if (Buffer.byteLength(candidate, 'utf8') > MAX_BYTES) {
      if (current) chunks.push(current);
      current = s;
    } else {
      current = candidate;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

/**
 * 파일 크기를 바이트 단위로 반환
 */
function getFileSize(filePath) {
  return fs.statSync(filePath).size;
}

/**
 * MP3 파일 크기로 재생 시간 추정 (128kbps 기준)
 * @param {number} bytes
 * @returns {string} "HH:MM:SS" 또는 "MM:SS" 형식
 */
function estimateDuration(bytes) {
  const totalSec = Math.round(bytes / (128 * 1000 / 8));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * 날짜 + postId 기반 파일명 생성
 */
function makeFilename(postId, pubDate) {
  const d = new Date(pubDate);
  const dateStr = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  return `${dateStr}_${postId}.mp3`;
}

module.exports = { convertTextToMp3, getFileSize, makeFilename, estimateDuration };
