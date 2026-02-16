/**
 * Dutch Smart Memory - App Entry Point
 * 荷兰语智能记忆系统
 */

import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Provider as PaperProvider, MD3LightTheme } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Screens (to be implemented)
import HomeScreen from './src/screens/HomeScreen';
import LearnScreen from './src/screens/LearnScreen';
import StatsScreen from './src/screens/StatsScreen';
import SettingsScreen from './src/screens/SettingsScreen';

// Data and Store
import wordsData from './src/data/words.json';
import { useAppStore } from './src/store';
import { Platform } from 'react-native';
import {
  initDatabase,
  importWords as dbImportWords,
  getWordCount,
  getAllWords as dbGetAllWords,
  getAllRecords,
  loadSettings,
} from './src/services/database';
import type { Word } from './src/types';
import { webLoadRecords, webLoadSettings } from './src/services/webStorage';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// 自定义主题
const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#FF6B35', // 荷兰橙色
    secondary: '#1E3A5F',
    tertiary: '#21A179',
  },
};

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: '#888',
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: '首页',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="home-variant" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Learn"
        component={LearnScreen}
        options={{
          tabBarLabel: '学习',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="book-open-page-variant" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Stats"
        component={StatsScreen}
        options={{
          tabBarLabel: '统计',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="chart-line" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: '设置',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="cog-outline" color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  const loadWords = useAppStore(state => state.loadWords);
  const loadRecords = useAppStore(state => state.loadRecords);
  const updateSettings = useAppStore(state => state.updateSettings);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    async function bootstrap() {
      // Web 平台不支持 SQLite，使用 JSON + localStorage
      if (Platform.OS === 'web') {
        loadWords(wordsData as Word[]);
        const savedRecords = webLoadRecords();
        if (savedRecords.length > 0) {
          loadRecords(savedRecords);
        }
        const savedSettings = webLoadSettings();
        if (Object.keys(savedSettings).length > 0) {
          updateSettings(savedSettings);
        }
        setIsReady(true);
        return;
      }

      try {
        // 1. 初始化数据库 (native only)
        await initDatabase();

        // 2. 如果数据库为空，从 JSON 导入单词
        const count = await getWordCount();
        if (count === 0) {
          await dbImportWords(wordsData as Word[]);
        }

        // 3. 从数据库加载单词和学习记录
        const [words, records, settings] = await Promise.all([
          dbGetAllWords(),
          getAllRecords(),
          loadSettings(),
        ]);

        loadWords(words);
        loadRecords(records);
        if (Object.keys(settings).length > 0) {
          updateSettings(settings);
        }
      } catch (err) {
        console.error('Database init failed, falling back to JSON:', err);
        loadWords(wordsData as Word[]);
      } finally {
        setIsReady(true);
      }
    }

    bootstrap();
  }, [loadWords, loadRecords, updateSettings]);

  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Main" component={MainTabs} />
            {/* 可以添加更多全屏页面 */}
          </Stack.Navigator>
          <StatusBar style="auto" />
        </NavigationContainer>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
