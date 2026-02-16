/**
 * 统计页面
 * 数据可视化展示
 */

import React from 'react';
import { View, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { Text, Card, Surface } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LineChart, PieChart } from 'react-native-chart-kit';
import { useAppStore, selectMasteredCount, selectTotalLearned, selectTodayStats } from '../store';
import { getRiskLevel } from '../types';

const screenWidth = Dimensions.get('window').width;

// 图表配置
const chartConfig = {
  backgroundGradientFrom: '#fff',
  backgroundGradientTo: '#fff',
  color: (opacity = 1) => `rgba(255, 107, 53, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(102, 102, 102, ${opacity})`,
  strokeWidth: 2,
  propsForDots: {
    r: '5',
    strokeWidth: '2',
    stroke: '#FF6B35',
  },
  decimalPlaces: 0,
};

// 记忆强度曲线图（7天趋势）- Y轴范围0-100
function MemoryStrengthChart({ data }: { data: number[] }) {
  const labels = ['6天前', '5天前', '4天前', '3天前', '2天前', '昨天', '今天'];
  const chartData = data.length > 0 ? data : [0, 0, 0, 0, 0, 0, 0];
  
  return (
    <View style={styles.chartContainer}>
      <LineChart
        data={{
          labels: labels,
          datasets: [
            { data: chartData },
            // 隐藏数据集，强制 Y 轴范围 0-100
            { data: [100], withDots: false, color: () => 'transparent' },
          ],
        }}
        width={screenWidth - 64}
        height={180}
        chartConfig={{
          ...chartConfig,
          propsForLabels: {
            fontSize: 11,
          },
        }}
        bezier
        style={styles.chart}
        fromZero
        segments={5}
        yAxisSuffix=""
        yAxisLabel=""
        formatYLabel={(value) => Math.round(Number(value)).toString()}
      />
    </View>
  );
}

// 遗忘风险饼图
function RiskPieChart({
  data,
}: {
  data: { high: number; medium: number; low: number; mastered: number };
}) {
  const total = data.high + data.medium + data.low + data.mastered;
  
  if (total === 0) {
    return (
      <View style={styles.emptyChart}>
        <Text variant="bodyMedium" style={{ color: '#888' }}>
          暂无数据
        </Text>
      </View>
    );
  }
  
  const pieData = [
    {
      name: '高风险',
      count: data.high,
      color: '#E53935',
      legendFontColor: '#666',
      legendFontSize: 12,
    },
    {
      name: '中风险',
      count: data.medium,
      color: '#FFA000',
      legendFontColor: '#666',
      legendFontSize: 12,
    },
    {
      name: '低风险',
      count: data.low,
      color: '#21A179',
      legendFontColor: '#666',
      legendFontSize: 12,
    },
    {
      name: '已掌握',
      count: data.mastered,
      color: '#1E88E5',
      legendFontColor: '#666',
      legendFontSize: 12,
    },
  ].filter(item => item.count > 0);
  
  return (
    <View style={styles.chartContainer}>
      <PieChart
        data={pieData}
        width={screenWidth - 64}
        height={200}
        chartConfig={chartConfig}
        accessor="count"
        backgroundColor="transparent"
        paddingLeft="15"
        absolute
      />
    </View>
  );
}

// 简单的进度环组件
function ProgressRing({
  progress,
  size = 120,
  strokeWidth = 12,
  color = '#FF6B35',
}: {
  progress: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
}) {
  const percentage = Math.round(progress * 100);
  
  return (
    <View style={[styles.ring, { width: size, height: size }]}>
      <View style={[styles.ringOuter, { width: size, height: size, borderWidth: strokeWidth, borderColor: '#e0e0e0' }]}>
        <View style={styles.ringInner}>
          <Text variant="headlineMedium" style={styles.ringText}>
            {percentage}%
          </Text>
        </View>
      </View>
    </View>
  );
}

// 风险分布柱状图
function RiskDistribution({
  data,
}: {
  data: { high: number; medium: number; low: number; mastered: number };
}) {
  const total = data.high + data.medium + data.low + data.mastered;
  
  const items = [
    { label: '高风险', count: data.high, color: '#E53935' },
    { label: '中风险', count: data.medium, color: '#FFA000' },
    { label: '低风险', count: data.low, color: '#21A179' },
    { label: '已掌握', count: data.mastered, color: '#1E88E5' },
  ];
  
  return (
    <View style={styles.riskContainer}>
      {items.map(item => (
        <View key={item.label} style={styles.riskItem}>
          <View style={styles.riskBarContainer}>
            <View
              style={[
                styles.riskBar,
                {
                  height: total > 0 ? (item.count / total) * 80 : 0,
                  backgroundColor: item.color,
                },
              ]}
            />
          </View>
          <Text variant="bodySmall" style={styles.riskLabel}>
            {item.label}
          </Text>
          <Text variant="bodySmall" style={styles.riskCount}>
            {item.count}
          </Text>
        </View>
      ))}
    </View>
  );
}

// 周趋势图
function WeeklyTrend({ data }: { data: number[] }) {
  const days = ['一', '二', '三', '四', '五', '六', '日'];
  const maxValue = Math.max(...data, 1);
  
  return (
    <View style={styles.trendContainer}>
      {data.map((value, index) => (
        <View key={index} style={styles.trendItem}>
          <View style={styles.trendBarContainer}>
            <View
              style={[
                styles.trendBar,
                { height: (value / maxValue) * 60 },
              ]}
            />
          </View>
          <Text variant="bodySmall" style={styles.trendDay}>
            {days[index]}
          </Text>
        </View>
      ))}
    </View>
  );
}

export default function StatsScreen() {
  const records = useAppStore(state => state.records);
  const masteredCount = useAppStore(selectMasteredCount);
  const totalLearned = useAppStore(selectTotalLearned);
  const words = useAppStore(state => state.words);
  const dailyStats = useAppStore(state => state.dailyStats);
  const todayStats = useAppStore(selectTodayStats);

  // 计算风险分布
  const riskDistribution = { high: 0, medium: 0, low: 0, mastered: 0 };
  records.forEach(record => {
    const level = getRiskLevel(record.memoryStrength);
    riskDistribution[level]++;
  });

  // 从 dailyStats 生成最近 7 天的学习单词数趋势
  const weeklyData = React.useMemo(() => {
    const result: number[] = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const stat = dailyStats.find(s => s.date === dateStr);
      result.push(stat?.wordsReviewed ?? 0);
    }
    return result;
  }, [dailyStats]);

  // 计算平均记忆强度
  let avgStrength = 0;
  if (records.size > 0) {
    let total = 0;
    records.forEach(r => total += r.memoryStrength);
    avgStrength = total / records.size;
  }

  // 从 dailyStats 生成 7 天记忆强度趋势
  const strengthTrend = React.useMemo(() => {
    const result: number[] = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const stat = dailyStats.find(s => s.date === dateStr);
      if (i === 0) {
        // 今天用实时计算的值
        result.push(Math.round(avgStrength));
      } else {
        result.push(stat?.avgStrength ?? 0);
      }
    }
    return result;
  }, [dailyStats, avgStrength]);

  // 连续学习天数
  const streakDays = todayStats?.streakDays ?? (dailyStats.length > 0 ? dailyStats[0].streakDays : 0);
  
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text variant="headlineSmall" style={styles.pageTitle}>
          学习统计
        </Text>
        
        {/* 总览卡片 */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.cardTitle}>
              学习总览
            </Text>
            <View style={styles.overviewRow}>
              <ProgressRing progress={totalLearned / Math.max(words.length, 1)} />
              <View style={styles.overviewStats}>
                <View style={styles.overviewItem}>
                  <Text variant="headlineSmall" style={styles.statValue}>
                    {masteredCount}
                  </Text>
                  <Text variant="bodySmall">已掌握</Text>
                </View>
                <View style={styles.overviewItem}>
                  <Text variant="headlineSmall" style={styles.statValue}>
                    {totalLearned}
                  </Text>
                  <Text variant="bodySmall">学习中</Text>
                </View>
                <View style={styles.overviewItem}>
                  <Text variant="headlineSmall" style={styles.statValue}>
                    {words.length - totalLearned}
                  </Text>
                  <Text variant="bodySmall">待学习</Text>
                </View>
              </View>
            </View>
          </Card.Content>
        </Card>
        
        {/* 平均记忆强度 */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.cardTitle}>
              平均记忆强度
            </Text>
            <View style={styles.strengthContainer}>
              <Text variant="displaySmall" style={styles.strengthValue}>
                {Math.round(avgStrength)}
              </Text>
              <Text variant="bodyMedium" style={styles.strengthUnit}>
                / 100
              </Text>
            </View>
            <View style={styles.strengthBar}>
              <View
                style={[
                  styles.strengthFill,
                  { width: `${avgStrength}%` },
                ]}
              />
            </View>
          </Card.Content>
        </Card>
        
        {/* 记忆强度曲线 */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.cardTitle}>
              记忆强度趋势（近7天）
            </Text>
            <MemoryStrengthChart data={strengthTrend} />
          </Card.Content>
        </Card>
        
        {/* 遗忘风险饼图 */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.cardTitle}>
              遗忘风险分布
            </Text>
            <RiskPieChart data={riskDistribution} />
          </Card.Content>
        </Card>
        
        {/* 本周学习趋势 */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.cardTitle}>
              本周学习趋势
            </Text>
            <WeeklyTrend data={weeklyData} />
          </Card.Content>
        </Card>
        
        {/* 连续学习天数 */}
        <Surface style={styles.streakCard} elevation={1}>
          <Text variant="displaySmall" style={styles.streakNumber}>
            {streakDays}
          </Text>
          <Text variant="bodyMedium">连续学习天数</Text>
        </Surface>
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
  pageTitle: {
    fontWeight: 'bold',
    color: '#1E3A5F',
    marginBottom: 16,
  },
  card: {
    marginBottom: 16,
    borderRadius: 12,
  },
  cardTitle: {
    marginBottom: 16,
    color: '#1E3A5F',
  },
  overviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ring: {
    marginRight: 24,
  },
  ringOuter: {
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ringInner: {
    alignItems: 'center',
  },
  ringText: {
    fontWeight: 'bold',
    color: '#FF6B35',
  },
  overviewStats: {
    flex: 1,
  },
  overviewItem: {
    marginBottom: 12,
  },
  statValue: {
    fontWeight: 'bold',
    color: '#1E3A5F',
  },
  strengthContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  strengthValue: {
    fontWeight: 'bold',
    color: '#FF6B35',
  },
  strengthUnit: {
    color: '#888',
    marginLeft: 4,
  },
  strengthBar: {
    height: 12,
    backgroundColor: '#e0e0e0',
    borderRadius: 6,
    overflow: 'hidden',
  },
  strengthFill: {
    height: '100%',
    backgroundColor: '#FF6B35',
    borderRadius: 6,
  },
  riskContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 120,
  },
  riskItem: {
    alignItems: 'center',
  },
  riskBarContainer: {
    height: 80,
    justifyContent: 'flex-end',
  },
  riskBar: {
    width: 40,
    borderRadius: 4,
    minHeight: 4,
  },
  riskLabel: {
    marginTop: 8,
    color: '#666',
  },
  riskCount: {
    fontWeight: 'bold',
    color: '#1E3A5F',
  },
  trendContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 100,
  },
  trendItem: {
    alignItems: 'center',
  },
  trendBarContainer: {
    height: 60,
    justifyContent: 'flex-end',
  },
  trendBar: {
    width: 24,
    backgroundColor: '#FF6B35',
    borderRadius: 4,
    minHeight: 4,
  },
  trendDay: {
    marginTop: 8,
    color: '#666',
  },
  streakCard: {
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  streakNumber: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  chartContainer: {
    alignItems: 'center',
    marginHorizontal: -16,
  },
  chart: {
    borderRadius: 8,
  },
  emptyChart: {
    height: 150,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
