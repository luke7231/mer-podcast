import React, { useEffect, useState, useCallback } from 'react';
import {
  FlatList, Text, View, StyleSheet,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import EpisodeCard from '../components/EpisodeCard';
import MiniPlayer from '../components/MiniPlayer';
import { fetchEpisodes } from '../utils/api';
import { COLORS } from '../constants';
import { usePlayer } from '../context/PlayerContext';

export default function EpisodeListScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { currentEpisode } = usePlayer();

  const [episodes, setEpisodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    setError(null);
    try {
      const data = await fetchEpisodes();
      setEpisodes(data);
    } catch (e) {
      setError('에피소드를 불러오지 못했습니다.\n서버 연결을 확인해주세요.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openPlayer = () => {
    if (currentEpisode) navigation.navigate('Player');
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
        <Text style={styles.retryBtn} onPress={() => load()}>다시 시도</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>mer-podcast</Text>
        <Text style={styles.headerSub}>ranto28 경제 블로그</Text>
      </View>

      <FlatList
        data={episodes}
        keyExtractor={(item) => item.postId}
        renderItem={({ item }) => <EpisodeCard episode={item} />}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(true)}
            tintColor={COLORS.primary}
          />
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>에피소드가 없습니다.</Text>
        }
      />

      <MiniPlayer onPress={openPlayer} />
      <View style={{ height: insets.bottom }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
  },
  headerSub: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  list: {
    paddingVertical: 8,
  },
  errorText: {
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 22,
  },
  retryBtn: {
    color: COLORS.primary,
    fontWeight: '600',
    fontSize: 15,
  },
  emptyText: {
    textAlign: 'center',
    color: COLORS.textSecondary,
    marginTop: 40,
  },
});
