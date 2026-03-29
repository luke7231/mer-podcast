import React, { createContext, useContext, useRef, useState, useCallback } from 'react';
import { Audio } from 'expo-av';
import { SPEEDS } from '../constants';

const PlayerContext = createContext(null);

export function PlayerProvider({ children }) {
  const soundRef = useRef(null);

  const [currentEpisode, setCurrentEpisode] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [position, setPosition] = useState(0);   // ms
  const [duration, setDuration] = useState(0);   // ms
  const [speedIndex, setSpeedIndex] = useState(0); // index into SPEEDS

  // 재생 상태 업데이트 콜백
  const onPlaybackStatusUpdate = useCallback((status) => {
    if (!status.isLoaded) return;
    setIsPlaying(status.isPlaying);
    setPosition(status.positionMillis || 0);
    setDuration(status.durationMillis || 0);

    // 에피소드 끝까지 재생 완료
    if (status.didJustFinish) {
      setIsPlaying(false);
      setPosition(0);
    }
  }, []);

  // 새 에피소드 재생
  const playEpisode = useCallback(async (episode) => {
    setIsLoading(true);
    try {
      // 기존 사운드 정리
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }

      // 백그라운드 오디오 모드 설정
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
          progressUpdateIntervalMillis: 500,
        },
        onPlaybackStatusUpdate
      );

      soundRef.current = sound;
      setCurrentEpisode(episode);
      setPosition(0);
    } catch (err) {
      console.error('[Player] 재생 오류:', err.message);
    } finally {
      setIsLoading(false);
    }
  }, [speedIndex, onPlaybackStatusUpdate]);

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
    position,
    duration,
    speed: SPEEDS[speedIndex],
    playEpisode,
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
