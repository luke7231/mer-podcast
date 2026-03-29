import React, { createContext, useContext, useRef, useState, useCallback, useEffect } from 'react';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SPEEDS } from '../constants';

const PlayerContext = createContext(null);

const RESUME_KEY = 'mer_podcast_resume';
const SAVE_INTERVAL_MS = 5000;

export function PlayerProvider({ children }) {
  const soundRef = useRef(null);
  const saveTimerRef = useRef(null);

  const [currentEpisode, setCurrentEpisode] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [position, setPosition] = useState(0);   // ms
  const [duration, setDuration] = useState(0);   // ms
  const [speedIndex, setSpeedIndex] = useState(0);

  // 재생 상태 업데이트 콜백
  const onPlaybackStatusUpdate = useCallback((status) => {
    if (!status.isLoaded) {
      if (status.error) {
        setError('오디오 재생 오류가 발생했습니다.');
        setIsLoading(false);
      }
      return;
    }
    setError(null);
    setIsPlaying(status.isPlaying);
    setPosition(status.positionMillis || 0);
    setDuration(status.durationMillis || 0);

    if (status.didJustFinish) {
      setIsPlaying(false);
      setPosition(0);
      // 완료된 에피소드 이어듣기 데이터 삭제
      AsyncStorage.removeItem(RESUME_KEY).catch(() => {});
    }
  }, []);

  // 재생 위치 주기적 저장
  const startSavingPosition = useCallback((episode) => {
    if (saveTimerRef.current) clearInterval(saveTimerRef.current);
    saveTimerRef.current = setInterval(() => {
      setPosition((pos) => {
        AsyncStorage.setItem(RESUME_KEY, JSON.stringify({ postId: episode.postId, position: pos })).catch(() => {});
        return pos;
      });
    }, SAVE_INTERVAL_MS);
  }, []);

  const stopSavingPosition = useCallback(() => {
    if (saveTimerRef.current) {
      clearInterval(saveTimerRef.current);
      saveTimerRef.current = null;
    }
  }, []);

  // 언마운트 시 오디오 정리
  useEffect(() => {
    return () => {
      stopSavingPosition();
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {});
        soundRef.current = null;
      }
    };
  }, [stopSavingPosition]);

  // 새 에피소드 재생
  const playEpisode = useCallback(async (episode, resumePositionMs = 0) => {
    setIsLoading(true);
    setError(null);
    stopSavingPosition();
    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }

      await Audio.setAudioModeAsync({
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });

      const { sound } = await Audio.Sound.createAsync(
        { uri: episode.audioUrl },
        {
          shouldPlay: true,
          rate: SPEEDS[speedIndex],
          positionMillis: resumePositionMs,
          progressUpdateIntervalMillis: 500,
        },
        onPlaybackStatusUpdate
      );

      soundRef.current = sound;
      setCurrentEpisode(episode);
      setPosition(resumePositionMs);
      startSavingPosition(episode);
    } catch (err) {
      setError('오디오를 불러오지 못했습니다. 다시 시도해주세요.');
    } finally {
      setIsLoading(false);
    }
  }, [speedIndex, onPlaybackStatusUpdate, startSavingPosition, stopSavingPosition]);

  // 앱 시작 시 이어듣기 데이터 복원
  const restoreResume = useCallback(async (episodes) => {
    try {
      const raw = await AsyncStorage.getItem(RESUME_KEY);
      if (!raw) return;
      const { postId, position: savedPos } = JSON.parse(raw);
      const episode = episodes.find((e) => e.postId === postId);
      if (episode && savedPos > 5000) {
        // 5초 이상 남은 경우에만 복원
        await playEpisode(episode, savedPos);
      }
    } catch {
      // 복원 실패는 무시
    }
  }, [playEpisode]);

  // 재생 / 일시정지 토글
  const togglePlay = useCallback(async () => {
    if (!soundRef.current) return;
    if (isPlaying) {
      await soundRef.current.pauseAsync();
    } else {
      await soundRef.current.playAsync();
    }
  }, [isPlaying]);

  // 앞/뒤로 N초 이동
  const seek = useCallback(async (deltaMs) => {
    if (!soundRef.current) return;
    const next = Math.max(0, Math.min(position + deltaMs, duration));
    await soundRef.current.setPositionAsync(next);
  }, [position, duration]);

  // 진행바로 특정 위치 이동
  const seekTo = useCallback(async (posMs) => {
    if (!soundRef.current) return;
    await soundRef.current.setPositionAsync(posMs);
  }, []);

  // 재생 배속 변경
  const cycleSpeed = useCallback(async () => {
    const nextIndex = (speedIndex + 1) % SPEEDS.length;
    setSpeedIndex(nextIndex);
    if (soundRef.current) {
      await soundRef.current.setRateAsync(SPEEDS[nextIndex], true);
    }
  }, [speedIndex]);

  const value = {
    currentEpisode,
    isPlaying,
    isLoading,
    error,
    position,
    duration,
    speed: SPEEDS[speedIndex],
    playEpisode,
    restoreResume,
    togglePlay,
    seek,
    seekTo,
    cycleSpeed,
  };

  return (
    <PlayerContext.Provider value={value}>
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  return useContext(PlayerContext);
}
