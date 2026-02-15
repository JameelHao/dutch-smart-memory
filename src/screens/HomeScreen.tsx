/**
 * 首页
 * 显示学习概览和快速入口
 */

import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Button, Card, ProgressBar, Surface } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore, selectMasteredCount, selectTotalLearned } from '../store';

export default function HomeScreen({ navigation }: any) {
  const masteredCount = useAppStore(selectMasteredCount);
  const totalLearned = useAppStore(selectTotalLearned);
  const words = useAppStore(state => state.words);
  
  const todayProgress = 0.35; // TODO: 从实际数据计算
  
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* 头部欢迎 */}
        <View style={styles.header}>
          <Text variant="headlineMedium" style={styles.greeting}>
            🇳🇱 Hallo!
          </Text>
          <Text variant="bodyLarge" style={styles.subtitle}>
            准备好学习荷兰语了吗？
          </Text>
        </View>
        
        {/* 今日进度卡片 */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium">今日进度</Text>
            <View style={styles.progressSection}>
              <ProgressBar
                progress={todayProgress}
                style={styles.progressBar}
                color="#FF6B35"
              />
              <Text variant="bodySmall" style={styles.progressText}>
                {Math.round(todayProgress * 100)}% 完成
              </Text>
            </View>
          </Card.Content>
        </Card>
        
        {/* 统计卡片 */}
        <View style={styles.statsRow}>
          <Surface style={styles.statCard} elevation={1}>
            <Text variant="headlineMedium" style={styles.statNumber}>
              {masteredCount}
            </Text>
            <Text variant="bodySmall">已掌握</Text>
          </Surface>
          
          <Surface style={styles.statCard} elevation={1}>
            <Text variant="headlineMedium" style={styles.statNumber}>
              {totalLearned}
            </Text>
            <Text variant="bodySmall">学习中</Text>
          </Surface>
          
          <Surface style={styles.statCard} elevation={1}>
            <Text variant="headlineMedium" style={styles.statNumber}>
              {words.length}
            </Text>
            <Text variant="bodySmall">总单词</Text>
          </Surface>
        </View>
        
        {/* 开始学习按钮 */}
        <Button
          mode="contained"
          onPress={() => navigation.navigate('Learn')}
          style={styles.startButton}
          contentStyle={styles.startButtonContent}
          labelStyle={styles.startButtonLabel}
        >
          开始今日学习
        </Button>
        
        {/* 提示卡片 */}
        <Card style={styles.tipCard}>
          <Card.Content>
            <Text variant="titleSmall">💡 学习小贴士</Text>
            <Text variant="bodySmall" style={styles.tipText}>
              每天坚持学习 10-15 分钟，比一次性学习很久更有效！
              利用碎片时间，养成学习习惯。
            </Text>
          </Card.Content>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  greeting: {
    fontWeight: 'bold',
    color: '#1E3A5F',
  },
  subtitle: {
    color: '#666',
    marginTop: 4,
  },
  card: {
    marginBottom: 16,
  },
  progressSection: {
    marginTop: 12,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
  },
  progressText: {
    marginTop: 8,
    textAlign: 'right',
    color: '#666',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    marginHorizontal: 4,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  statNumber: {
    fontWeight: 'bold',
    color: '#FF6B35',
  },
  startButton: {
    marginBottom: 24,
    borderRadius: 12,
  },
  startButtonContent: {
    paddingVertical: 8,
  },
  startButtonLabel: {
    fontSize: 18,
  },
  tipCard: {
    backgroundColor: '#FFF8E1',
  },
  tipText: {
    marginTop: 8,
    color: '#666',
    lineHeight: 20,
  },
});
