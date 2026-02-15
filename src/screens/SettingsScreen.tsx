/**
 * 设置页面
 */

import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, List, Switch, Divider, RadioButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore } from '../store';

export default function SettingsScreen() {
  const settings = useAppStore(state => state.settings);
  const updateSettings = useAppStore(state => state.updateSettings);
  
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <Text variant="headlineSmall" style={styles.pageTitle}>
          设置
        </Text>
        
        {/* 学习设置 */}
        <Text variant="titleSmall" style={styles.sectionTitle}>
          学习设置
        </Text>
        
        <List.Item
          title="每日新词数量"
          description={`每天学习 ${settings.dailyNewWords} 个新单词`}
          left={props => <List.Icon {...props} icon="book-open-variant" />}
        />
        
        <View style={styles.radioGroup}>
          <RadioButton.Group
            onValueChange={value => updateSettings({ dailyNewWords: parseInt(value) })}
            value={settings.dailyNewWords.toString()}
          >
            <View style={styles.radioRow}>
              <RadioButton.Item label="5 个（轻松）" value="5" />
              <RadioButton.Item label="7 个（适中）" value="7" />
              <RadioButton.Item label="10 个（挑战）" value="10" />
            </View>
          </RadioButton.Group>
        </View>
        
        <Divider style={styles.divider} />
        
        {/* 语音设置 */}
        <Text variant="titleSmall" style={styles.sectionTitle}>
          语音设置
        </Text>
        
        <List.Item
          title="语音播放速度"
          description={`${settings.speechRate}x`}
          left={props => <List.Icon {...props} icon="play-speed" />}
        />
        
        <List.Item
          title="音效"
          description="答题反馈音效"
          left={props => <List.Icon {...props} icon="volume-high" />}
          right={() => (
            <Switch
              value={settings.soundEnabled}
              onValueChange={value => updateSettings({ soundEnabled: value })}
            />
          )}
        />
        
        <Divider style={styles.divider} />
        
        {/* 通知设置 */}
        <Text variant="titleSmall" style={styles.sectionTitle}>
          通知设置
        </Text>
        
        <List.Item
          title="学习提醒"
          description="每日学习提醒通知"
          left={props => <List.Icon {...props} icon="bell" />}
          right={() => (
            <Switch
              value={settings.notificationsEnabled}
              onValueChange={value => updateSettings({ notificationsEnabled: value })}
            />
          )}
        />
        
        <List.Item
          title="提醒时间"
          description={settings.reminderTime}
          left={props => <List.Icon {...props} icon="clock" />}
        />
        
        <Divider style={styles.divider} />
        
        {/* 数据管理 */}
        <Text variant="titleSmall" style={styles.sectionTitle}>
          数据管理
        </Text>
        
        <List.Item
          title="导出学习数据"
          description="导出为 JSON 文件"
          left={props => <List.Icon {...props} icon="export" />}
          onPress={() => {/* TODO */}}
        />
        
        <List.Item
          title="重置学习进度"
          description="清除所有学习记录"
          left={props => <List.Icon {...props} icon="refresh" color="#E53935" />}
          onPress={() => {/* TODO: 确认对话框 */}}
        />
        
        <Divider style={styles.divider} />
        
        {/* 关于 */}
        <Text variant="titleSmall" style={styles.sectionTitle}>
          关于
        </Text>
        
        <List.Item
          title="版本"
          description="v0.1.0"
          left={props => <List.Icon {...props} icon="information" />}
        />
        
        <List.Item
          title="开源许可"
          description="MIT License"
          left={props => <List.Icon {...props} icon="license" />}
        />
        
        <View style={styles.footer}>
          <Text variant="bodySmall" style={styles.footerText}>
            🇳🇱 Dutch Smart Memory
          </Text>
          <Text variant="bodySmall" style={styles.footerText}>
            基于动态难度模型的智能单词学习
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  pageTitle: {
    fontWeight: 'bold',
    color: '#1E3A5F',
    padding: 16,
    paddingBottom: 8,
  },
  sectionTitle: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  radioGroup: {
    paddingHorizontal: 8,
  },
  radioRow: {
    flexDirection: 'column',
  },
  divider: {
    marginTop: 8,
  },
  footer: {
    padding: 32,
    alignItems: 'center',
  },
  footerText: {
    color: '#888',
    marginBottom: 4,
  },
});
