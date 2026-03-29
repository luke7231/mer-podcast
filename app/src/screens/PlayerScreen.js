import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePlayer } from '../context/PlayerContext';
import { COLORS, SKIP_SECONDS } from '../constants';

function formatMs(ms) {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function PlayerScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const {
    currentEpisode, isPlaying, isLoading,
    position, duration, speed,
    togglePlay, seek, seekTo, cycleSpeed,
  } = usePlayer();

  if (!currentEpisode) {
    navigation.goBack();
    return null;
  }

  const progress = duration > 0 ? position / duration : 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }]}>
      {/* 상단 닫기 */}
      <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.closeIcon}>∨</Text>
      </TouchableOpacity>

      {/* 앨범 아트 (플레이스홀더) */}
      <View style={styles.artwork}>
        <Text style={styles.artworkEmoji}>🎙️</Text>
      </View>

      {/* 제목 */}
      <Text style={styles.title} numberOfLines={3}>{currentEpisode.title}</Text>
      <Text style={styles.blog}>ranto28 경제 블로그</Text>

      {/* 슬라이더 */}
      <View style={styles.sliderWrap}>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={duration || 1}
          value={position}
          minimumTrackTintColor={COLORS.primary}
          maximumTrackTintColor={COLORS.border}
          thumbTintColor={COLORS.primary}
          onSlidingComplete={seekTo}
        />
        <View style={styles.timeRow}>
          <Text style={styles.timeText}>{formatMs(position)}</Text>
          <Text style={styles.timeText}>{formatMs(duration)}</Text>
        </View>
      </View>

      {/* 컨트롤 버튼 */}
      <View style={styles.controls}>
        {/* -15초 */}
        <TouchableOpacity style={styles.skipBtn} onPress={() => seek(-SKIP_SECONDS * 1000)}>
          <Text style={styles.skipIcon}>↩</Text>
          <Text style={styles.skipLabel}>{SKIP_SECONDS}</Text>
        </TouchableOpacity>

        {/* 재생/일시정지 */}
        <TouchableOpacity style={styles.playBtn} onPress={togglePlay}>
          {isLoading ? (
            <ActivityIndicator color="#fff" size="large" />
          ) : (
            <Text style={styles.playIcon}>{isPlaying ? '⏸' : '▶'}</Text>
          )}
        </TouchableOpacity>

        {/* +15초 */}
        <TouchableOpacity style={styles.skipBtn} onPress={() => seek(SKIP_SECONDS * 1000)}>
          <Text style={styles.skipIcon}>↪</Text>
          <Text style={styles.skipLabel}>{SKIP_SECONDS}</Text>
        </TouchableOpacity>
      </View>

      {/* 배속 */}
      <TouchableOpacity style={styles.speedBtn} onPress={cycleSpeed}>
        <Text style={styles.speedText}>{speed.toFixed(1)}x</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  closeBtn: {
    alignSelf: 'center',
    marginBottom: 16,
    padding: 8,
  },
  closeIcon: {
    fontSize: 24,
    color: COLORS.textSecondary,
  },
  artwork: {
    width: 200,
    height: 200,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  artworkEmoji: {
    fontSize: 72,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 8,
  },
  blog: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 32,
  },
  sliderWrap: {
    width: '100%',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -8,
  },
  timeText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 32,
    gap: 32,
  },
  skipBtn: {
    alignItems: 'center',
    width: 56,
    height: 56,
    justifyContent: 'center',
  },
  skipIcon: {
    fontSize: 28,
    color: COLORS.text,
  },
  skipLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: -4,
  },
  playBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  playIcon: {
    color: '#fff',
    fontSize: 28,
  },
  speedBtn: {
    marginTop: 32,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  speedText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
});
