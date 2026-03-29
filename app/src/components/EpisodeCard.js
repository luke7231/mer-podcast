import React from 'react';
import { TouchableOpacity, Text, View, StyleSheet, ActivityIndicator } from 'react-native';
import { COLORS } from '../constants';
import { usePlayer } from '../context/PlayerContext';

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

export default function EpisodeCard({ episode }) {
  const { currentEpisode, isPlaying, isLoading, playEpisode } = usePlayer();
  const isActive = currentEpisode?.postId === episode.postId;

  const handlePress = () => {
    if (!isActive) {
      playEpisode(episode);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.card, isActive && styles.activeCard]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        {isActive && (isLoading ? (
          <ActivityIndicator size="small" color={COLORS.primary} style={styles.icon} />
        ) : (
          <View style={[styles.playingDot, isPlaying && styles.playingDotActive]} />
        ))}
        <View style={styles.textWrap}>
          <Text style={[styles.title, isActive && styles.activeTitle]} numberOfLines={2}>
            {episode.title}
          </Text>
          <Text style={styles.date}>
            {formatDate(episode.pubDate)}{episode.duration ? `  ·  ${episode.duration}` : ''}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  activeCard: {
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 10,
  },
  playingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.border,
    marginRight: 10,
  },
  playingDotActive: {
    backgroundColor: COLORS.primary,
  },
  textWrap: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    lineHeight: 22,
  },
  activeTitle: {
    color: COLORS.primary,
  },
  date: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
});
